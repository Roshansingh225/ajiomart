import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  initialProducts,
  makeId,
  normalizeProduct,
  normalizeProducts,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from '../lib/catalog.js';
import {
  dbOrderToOrder,
  dbProductToProduct,
  hasSupabaseConfig,
  productToDbProduct,
  supabase,
} from '../lib/supabase.js';
import { calculateOrderPricing } from '../lib/orderPricing.js';
import {
  MAX_LOCAL_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_SIZE,
  PRODUCT_IMAGE_MIME_TYPES,
} from '../lib/productImages.js';

const StoreContext = createContext(null);

function splitList(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitImageUrls(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || 'ajiomart-product')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function prepareProduct(product) {
  return normalizeProduct({
    ...product,
    id: product.id || makeId('product'),
    slug: product.slug || slugify(product.name),
    colors: splitList(product.colors),
    sizes: splitList(product.sizes),
    imageUrls: splitImageUrls(product.imageUrls),
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function orderUpdatesToDb(updates) {
  const payload = {};

  if ('status' in updates) payload.status = updates.status;
  if ('courierPartner' in updates) payload.courier_partner = updates.courierPartner;
  if ('trackingNumber' in updates) payload.tracking_number = updates.trackingNumber || null;
  if ('trackingUrl' in updates) payload.tracking_url = updates.trackingUrl || null;
  if ('trackingNote' in updates) payload.tracking_note = updates.trackingNote || '';

  return payload;
}

async function fetchSupabaseProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return normalizeProducts((data || []).map(dbProductToProduct));
}

async function fetchSupabaseOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbOrderToOrder);
}

export function StoreProvider({ children }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const userId = user?.id || null;
  const [products, setProducts] = useState(() =>
    hasSupabaseConfig ? [] : normalizeProducts(readStorage(STORAGE_KEYS.products, initialProducts)),
  );
  const [orders, setOrders] = useState(() => (hasSupabaseConfig ? [] : readStorage(STORAGE_KEYS.orders, [])));
  const [storedCartItems, setStoredCartItems] = useState(() =>
    !hasSupabaseConfig && userId ? readStorage(`${STORAGE_KEYS.cart}:${userId}`, []) : [],
  );
  const [cartOwnerId, setCartOwnerId] = useState(() => (!hasSupabaseConfig ? userId : null));
  const [wishlistIds, setWishlistIds] = useState(() => readStorage(STORAGE_KEYS.wishlist, []));
  const [productsLoading, setProductsLoading] = useState(hasSupabaseConfig);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(hasSupabaseConfig);
  const [cartSaving, setCartSaving] = useState(false);
  const [cartError, setCartError] = useState('');
  const [storeError, setStoreError] = useState('');
  const [productError, setProductError] = useState('');
  const cartMutationRef = useRef(false);
  const activeUserIdRef = useRef(userId);
  activeUserIdRef.current = userId;
  const cartItems = cartOwnerId === userId ? storedCartItems : [];

  useEffect(() => {
    if (!hasSupabaseConfig) writeStorage(STORAGE_KEYS.products, products);
  }, [products]);

  useEffect(() => {
    if (!hasSupabaseConfig) writeStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => {
    if (!hasSupabaseConfig && userId && cartOwnerId === userId) {
      writeStorage(`${STORAGE_KEYS.cart}:${userId}`, storedCartItems);
    }
  }, [storedCartItems, cartOwnerId, userId]);
  useEffect(() => writeStorage(STORAGE_KEYS.wishlist, wishlistIds), [wishlistIds]);

  useEffect(() => {
    if (!supabase) return;

    refreshProducts();
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) {
      setCartLoading(true);
      return undefined;
    }

    if (!userId) {
      setStoredCartItems([]);
      setCartOwnerId(null);
      setCartLoading(false);
      setCartError('');
      return undefined;
    }

    let cancelled = false;
    setCartLoading(true);
    setCartError('');

    if (!supabase) {
      setStoredCartItems(readStorage(`${STORAGE_KEYS.cart}:${userId}`, []));
      setCartOwnerId(userId);
      setCartLoading(false);
      return undefined;
    }

    async function loadAccountCart() {
      try {
        const [catalog, cartResult] = await Promise.all([
          fetchSupabaseProducts(),
          supabase
            .from('cart_items')
            .select('product_id, selected_color, selected_size, quantity')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
        ]);

        if (cartResult.error) throw cartResult.error;
        if (cancelled) return;

        const productsById = new Map(catalog.map((product) => [product.id, product]));
        const nextCart = (cartResult.data || []).flatMap((row) => {
          const product = productsById.get(row.product_id);
          if (!product) return [];

          const size = row.selected_size || product.sizes?.[0] || 'One size';
          const color = row.selected_color || product.colors?.[0] || 'Default';
          return [{
            cartKey: `${product.id}-${size}-${color}`,
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: Number(row.quantity),
            size,
            color,
          }];
        });

        setProducts(catalog);
        setStoredCartItems(nextCart);
        setCartOwnerId(userId);
      } catch (error) {
        if (cancelled) return;
        setStoredCartItems([]);
        setCartOwnerId(userId);
        setCartError(`Could not load your saved cart: ${error.message}`);
      } finally {
        if (!cancelled) setCartLoading(false);
      }
    }

    loadAccountCart();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  useEffect(() => {
    if (!supabase || authLoading) return;

    if (!user) {
      setOrders([]);
      return;
    }

    refreshOrders();
  }, [user?.id, isAdmin, authLoading]);

  async function refreshProducts() {
    if (!supabase) return products;

    try {
      setProductsLoading(true);
      setProductError('');
      setStoreError('');
      const nextProducts = await fetchSupabaseProducts();
      setProducts(nextProducts);
      const productsById = new Map(nextProducts.map((product) => [product.id, product]));
      setStoredCartItems((current) => current.map((item) => {
        const product = productsById.get(item.id);
        if (!product) return item;
        return {
          ...item,
          name: product.name,
          category: product.category,
          price: product.price,
          imageUrl: product.imageUrl || item.imageUrl,
        };
      }));
      return nextProducts;
    } catch (error) {
      setProductError(error.message);
      setStoreError(error.message);
      setProducts([]);
      return [];
    } finally {
      setProductsLoading(false);
    }
  }

  async function refreshOrders() {
    if (!supabase) return orders;

    try {
      setOrdersLoading(true);
      setStoreError('');
      const nextOrders = await fetchSupabaseOrders();
      setOrders(nextOrders);
      return nextOrders;
    } catch (error) {
      setStoreError(error.message);
      return [];
    } finally {
      setOrdersLoading(false);
    }
  }

  async function addToCart(product, quantity = 1, choices = {}) {
    if (!userId || authLoading || cartLoading || cartOwnerId !== userId || cartMutationRef.current) {
      return false;
    }

    const cleanProduct = normalizeProduct(product);
    const size = choices.size || cleanProduct.sizes?.[0] || 'One size';
    const color = choices.color || cleanProduct.colors?.[0] || 'Default';
    const key = `${cleanProduct.id}-${size}-${color}`;
    const availableStock = Number(products.find((item) => item.id === cleanProduct.id)?.stock ?? cleanProduct.stock);
    const availableProduct = products.find((item) => item.id === cleanProduct.id);
    const quantityInCart = cartItems
      .filter((item) => item.id === cleanProduct.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (
      !Number.isInteger(quantity) || quantity <= 0 ||
      !Number.isFinite(availableStock) || availableProduct?.active === false ||
      quantityInCart + quantity > availableStock
    ) return false;

    const existing = cartItems.find((item) => item.cartKey === key);
    const nextItem = {
      cartKey: key,
      id: cleanProduct.id,
      name: cleanProduct.name,
      category: cleanProduct.category,
      price: cleanProduct.price,
      imageUrl: cleanProduct.imageUrl,
      quantity: Number(existing?.quantity || 0) + quantity,
      size,
      color,
    };

    cartMutationRef.current = true;
    setCartSaving(true);
    setCartError('');
    try {
      if (supabase) {
        const { error } = await supabase.from('cart_items').upsert({
          user_id: userId,
          product_id: cleanProduct.id,
          selected_size: size,
          selected_color: color,
          quantity: nextItem.quantity,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,product_id,selected_size,selected_color' });
        if (error) throw error;
      }
      if (activeUserIdRef.current !== userId) return false;
      setStoredCartItems((current) => {
        const found = current.some((item) => item.cartKey === key);
        return found
          ? current.map((item) => (item.cartKey === key ? nextItem : item))
          : [...current, nextItem];
      });
      return true;
    } catch (error) {
      setCartError(`Could not save this item to your account: ${error.message}`);
      return false;
    } finally {
      cartMutationRef.current = false;
      setCartSaving(false);
    }
  }

  async function updateQuantity(cartKey, quantity) {
    if (!userId || cartLoading || cartOwnerId !== userId || cartMutationRef.current) return false;
    const nextQuantity = Math.floor(Number(quantity));
    const item = cartItems.find((entry) => entry.cartKey === cartKey);
    if (!item || !Number.isFinite(nextQuantity)) return false;
    if (nextQuantity > item.quantity) {
      const product = products.find((entry) => entry.id === item.id);
      const otherQuantity = cartItems
        .filter((entry) => entry.id === item.id && entry.cartKey !== cartKey)
        .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      const maxQuantity = Math.max(0, Number(product?.stock || 0) - otherQuantity);
      if (nextQuantity > maxQuantity) return false;
    }

    cartMutationRef.current = true;
    setCartSaving(true);
    setCartError('');
    try {
      if (supabase) {
        const query = supabase.from('cart_items').delete()
          .eq('user_id', userId)
          .eq('product_id', item.id)
          .eq('selected_size', item.size)
          .eq('selected_color', item.color);
        if (nextQuantity <= 0) {
          const { error } = await query;
          if (error) throw error;
        } else {
          const { error } = await supabase.from('cart_items').upsert({
            user_id: userId,
            product_id: item.id,
            selected_size: item.size,
            selected_color: item.color,
            quantity: nextQuantity,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,product_id,selected_size,selected_color' });
          if (error) throw error;
        }
      }
      if (activeUserIdRef.current !== userId) return false;
      setStoredCartItems((current) => nextQuantity <= 0
        ? current.filter((entry) => entry.cartKey !== cartKey)
        : current.map((entry) => entry.cartKey === cartKey ? { ...entry, quantity: nextQuantity } : entry));
      return true;
    } catch (error) {
      setCartError(`Could not update your saved cart: ${error.message}`);
      return false;
    } finally {
      cartMutationRef.current = false;
      setCartSaving(false);
    }
  }

  function removeFromCart(cartKey) {
    return updateQuantity(cartKey, 0);
  }

  async function clearCart() {
    if (supabase && userId) {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
      if (error) setCartError(`Order placed, but your saved cart could not be cleared: ${error.message}`);
    }
    setStoredCartItems([]);
  }

  function toggleWishlist(productId) {
    setWishlistIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  const wishlistProducts = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id)),
    [products, wishlistIds],
  );

  async function saveProduct(product) {
    const hasImageItems = Array.isArray(product.imageItems);
    const imageItems = hasImageItems ? product.imageItems : [];
    const productInput = { ...product };
    delete productInput.imageItems;

    if (imageItems.length > MAX_PRODUCT_IMAGES) {
      throw new Error(`Choose no more than ${MAX_PRODUCT_IMAGES} product images.`);
    }

    const existingImageUrls = hasImageItems
      ? imageItems.filter((item) => !item.file).map((item) => item.url).filter(Boolean)
      : productInput.imageUrls;
    const payload = prepareProduct({ ...productInput, imageUrls: existingImageUrls });
    const imageFiles = imageItems.filter((item) => item.file);

    for (const { file } of imageFiles) {
      if (!PRODUCT_IMAGE_MIME_TYPES[file.type]) {
        throw new Error('Use JPG, PNG, WEBP, or AVIF product images.');
      }
      if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
        throw new Error('Each product image must be 5 MB or smaller.');
      }
    }

    if (supabase) {
      const storage = supabase.storage.from('product-images');
      const uploadedPaths = [];
      let data;

      try {
        const uploadedUrls = new Map();
        for (const item of imageFiles) {
          const extension = PRODUCT_IMAGE_MIME_TYPES[item.file.type];
          const path = `${payload.id}/${makeId('image')}.${extension}`;
          const { error: uploadError } = await storage.upload(path, item.file, {
            cacheControl: '3600',
            contentType: item.file.type,
            upsert: false,
          });
          if (uploadError) throw uploadError;

          uploadedPaths.push(path);
          uploadedUrls.set(item.id, storage.getPublicUrl(path).data.publicUrl);
        }

        const imageUrls = hasImageItems
          ? imageItems.map((item) => (item.file ? uploadedUrls.get(item.id) : item.url)).filter(Boolean)
          : payload.imageUrls;
        const dbPayload = productToDbProduct({ ...payload, imageUrls });
        const query = product.id
          ? supabase.from('products').update(dbPayload).eq('id', product.id)
          : supabase.from('products').insert(dbPayload);

        const result = await query.select('*').single();
        if (result.error) throw result.error;
        data = result.data;
      } catch (error) {
        if (uploadedPaths.length) {
          try {
            await storage.remove(uploadedPaths);
          } catch {
            // Preserve the original upload or product-save error.
          }
        }
        throw error;
      }

      const saved = dbProductToProduct(data);
      await refreshProducts();
      return saved;
    }

    const localImageBytes = imageFiles.reduce((total, item) => total + item.file.size, 0);
    if (localImageBytes > MAX_LOCAL_PRODUCT_IMAGE_BYTES) {
      throw new Error('Without Supabase Storage, keep the total new image size under 1.5 MB.');
    }

    if (imageFiles.length) {
      const localUrls = new Map();
      await Promise.all(imageFiles.map(async (item) => {
        localUrls.set(item.id, await readFileAsDataUrl(item.file));
      }));
      payload.imageUrls = imageItems
        .map((item) => (item.file ? localUrls.get(item.id) : item.url))
        .filter(Boolean);
    }

    setProducts((current) => {
      const exists = current.some((item) => item.id === payload.id);
      if (exists) return current.map((item) => (item.id === payload.id ? payload : item));
      return [payload, ...current];
    });

    return payload;
  }

  async function deleteProduct(id) {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await refreshProducts();
      return;
    }

    setProducts((current) => current.filter((product) => product.id !== id));
  }

  async function createOrder({ user: orderUser, shipping, paymentMethod }) {
    if (!orderUser) throw new Error('Sign in to place your Ajiomart order.');
    if (!cartItems.length) throw new Error('Your cart is empty.');

    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const pricing = calculateOrderPricing(subtotal, paymentMethod);
    const requestedQuantities = new Map();
    cartItems.forEach((item) => {
      requestedQuantities.set(item.id, (requestedQuantities.get(item.id) || 0) + Number(item.quantity || 0));
    });

    if (supabase) {
      const { data: orderResult, error } = await supabase.rpc('place_order', {
        p_customer_name: shipping.customerName,
        p_customer_phone: shipping.customerPhone,
        p_address_line1: shipping.addressLine1,
        p_address_line2: shipping.addressLine2 || null,
        p_city: shipping.city,
        p_state: shipping.state,
        p_postal_code: shipping.postalCode,
        p_landmark: shipping.landmark || null,
        p_payment_method: paymentMethod,
        p_items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          selected_color: item.color,
          selected_size: item.size,
        })),
      });

      if (error) {
        if (error.code === 'P0001' && error.message.includes('INSUFFICIENT_STOCK')) {
          await refreshProducts();
          throw new Error('Stock changed while you were checking out. Review the cart quantities and try again.');
        }
        throw error;
      }

      const nextOrder = dbOrderToOrder({
        ...orderResult.order,
        order_items: orderResult.order_items,
      });
      const stockUpdates = new Map(orderResult.stocks.map((item) => [item.id, Number(item.stock)]));
      setProducts((current) =>
        current.map((product) =>
          stockUpdates.has(product.id) ? { ...product, stock: stockUpdates.get(product.id) } : product,
        ),
      );
      setOrders((current) => [nextOrder, ...current]);
      await clearCart();
      return nextOrder;
    }

    const inventoryIssue = [...requestedQuantities.entries()].find(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      return !product || product.active === false || Number(product.stock) < quantity;
    });
    if (inventoryIssue) {
      const product = products.find((item) => item.id === inventoryIssue[0]);
      const available = Number(product?.stock || 0);
      throw new Error(
        product
          ? `Only ${available} ${product.name} left in stock. Reduce the quantity or remove it from your cart.`
          : 'A product in your cart is no longer available. Remove it and try again.',
      );
    }

    const order = {
      id: makeId('order'),
      userId: orderUser.id,
      customerName: shipping.customerName,
      customerPhone: shipping.customerPhone,
      address: shipping,
      items: cartItems,
      ...pricing,
      paymentMethod,
      status: 'placed',
      courierPartner: 'Ajiomart Express',
      trackingNumber: '',
      trackingUrl: '',
      trackingNote: 'Order placed. Packing will begin soon.',
      createdAt: new Date().toISOString(),
    };

    setProducts((current) =>
      current.map((product) => ({
        ...product,
        stock: Math.max(0, Number(product.stock || 0) - (requestedQuantities.get(product.id) || 0)),
      })),
    );
    setOrders((current) => [order, ...current]);
    await clearCart();
    return order;
  }

  async function completeOnlineOrder(orderResult) {
    if (!orderResult?.order) throw new Error('Payment was verified, but the order details were not returned.');

    const nextOrder = dbOrderToOrder({
      ...orderResult.order,
      order_items: orderResult.order_items || [],
    });
    const stockUpdates = new Map((orderResult.stocks || []).map((item) => [item.id, Number(item.stock)]));
    setProducts((current) =>
      current.map((product) =>
        stockUpdates.has(product.id) ? { ...product, stock: stockUpdates.get(product.id) } : product,
      ),
    );
    setOrders((current) => [nextOrder, ...current.filter((order) => order.id !== nextOrder.id)]);
    await clearCart();
    return nextOrder;
  }

  async function updateOrder(orderId, updates) {
    if (supabase) {
      const { error } = await supabase.from('orders').update(orderUpdatesToDb(updates)).eq('id', orderId);
      if (error) throw error;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : order,
      ),
    );
  }

  async function deleteOrder(orderId) {
    if (supabase) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
    }

    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(
    () => ({
      products,
      orders,
      cartItems,
      wishlistIds,
      wishlistProducts,
      cartTotal,
      cartCount,
      productsLoading,
      ordersLoading,
      cartLoading,
      cartSaving,
      cartError,
      storeError,
      productError,
      usingSupabase: hasSupabaseConfig,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      toggleWishlist,
      saveProduct,
      deleteProduct,
      createOrder,
      completeOnlineOrder,
      updateOrder,
      deleteOrder,
      refreshProducts,
      refreshOrders,
    }),
    [products, orders, cartItems, wishlistIds, wishlistProducts, cartTotal, cartCount, productsLoading, ordersLoading, cartLoading, cartSaving, cartError, cartOwnerId, userId, authLoading, storeError, productError],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
