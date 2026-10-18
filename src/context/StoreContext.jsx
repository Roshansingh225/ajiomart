import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  const [products, setProducts] = useState(() =>
    hasSupabaseConfig ? [] : normalizeProducts(readStorage(STORAGE_KEYS.products, initialProducts)),
  );
  const [orders, setOrders] = useState(() => (hasSupabaseConfig ? [] : readStorage(STORAGE_KEYS.orders, [])));
  const [cartItems, setCartItems] = useState(() => readStorage(STORAGE_KEYS.cart, []));
  const [wishlistIds, setWishlistIds] = useState(() => readStorage(STORAGE_KEYS.wishlist, []));
  const [productsLoading, setProductsLoading] = useState(hasSupabaseConfig);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [productError, setProductError] = useState('');

  useEffect(() => {
    if (!hasSupabaseConfig) writeStorage(STORAGE_KEYS.products, products);
  }, [products]);

  useEffect(() => {
    if (!hasSupabaseConfig) writeStorage(STORAGE_KEYS.orders, orders);
  }, [orders]);

  useEffect(() => writeStorage(STORAGE_KEYS.cart, cartItems), [cartItems]);
  useEffect(() => writeStorage(STORAGE_KEYS.wishlist, wishlistIds), [wishlistIds]);

  useEffect(() => {
    if (!supabase) return;

    refreshProducts();
  }, [isAdmin]);

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

  function addToCart(product, quantity = 1, choices = {}) {
    const cleanProduct = normalizeProduct(product);
    const key = `${cleanProduct.id}-${choices.size || 'one'}-${choices.color || 'default'}`;
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

    setCartItems((current) => {
      const existing = current.find((item) => item.cartKey === key);
      if (existing) {
        return current.map((item) =>
          item.cartKey === key ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [
        ...current,
        {
          cartKey: key,
          id: cleanProduct.id,
          name: cleanProduct.name,
          category: cleanProduct.category,
          price: cleanProduct.price,
          imageUrl: cleanProduct.imageUrl,
          quantity,
          size: choices.size || cleanProduct.sizes?.[0] || 'One size',
          color: choices.color || cleanProduct.colors?.[0] || 'Default',
        },
      ];
    });

    return true;
  }

  function updateQuantity(cartKey, quantity) {
    const nextQuantity = Math.floor(Number(quantity));
    if (!Number.isFinite(nextQuantity)) return;

    setCartItems((current) => {
      const item = current.find((entry) => entry.cartKey === cartKey);
      if (!item) return current;
      if (nextQuantity <= 0) return current.filter((entry) => entry.cartKey !== cartKey);

      if (nextQuantity > item.quantity) {
        const product = products.find((entry) => entry.id === item.id);
        const otherQuantity = current
          .filter((entry) => entry.id === item.id && entry.cartKey !== cartKey)
          .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
        const maxQuantity = Math.max(0, Number(product?.stock || 0) - otherQuantity);
        if (nextQuantity > maxQuantity) return current;
      }

      return current.map((entry) =>
        entry.cartKey === cartKey ? { ...entry, quantity: nextQuantity } : entry,
      );
    });
  }

  function removeFromCart(cartKey) {
    setCartItems((current) => current.filter((item) => item.cartKey !== cartKey));
  }

  function clearCart() {
    setCartItems([]);
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

    const total = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
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
      clearCart();
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
      total,
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
    clearCart();
    return order;
  }

  function completeOnlineOrder(orderResult) {
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
    clearCart();
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
    [products, orders, cartItems, wishlistIds, wishlistProducts, cartTotal, cartCount, productsLoading, ordersLoading, storeError, productError],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
