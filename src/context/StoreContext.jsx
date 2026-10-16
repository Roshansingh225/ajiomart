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
  }

  function updateQuantity(cartKey, quantity) {
    setCartItems((current) =>
      current
        .map((item) => (item.cartKey === cartKey ? { ...item, quantity: Number(quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
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
    const payload = prepareProduct(product);

    if (supabase) {
      const dbPayload = productToDbProduct(payload);
      const query = product.id
        ? supabase.from('products').update(dbPayload).eq('id', product.id)
        : supabase.from('products').insert(dbPayload);

      const { data, error } = await query.select('*').single();
      if (error) throw error;

      const saved = dbProductToProduct(data);
      await refreshProducts();
      return saved;
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

    if (supabase) {
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          user_id: orderUser.id,
          customer_name: shipping.customerName,
          customer_phone: shipping.customerPhone,
          address_line1: shipping.addressLine1,
          address_line2: shipping.addressLine2 || null,
          city: shipping.city,
          state: shipping.state,
          postal_code: shipping.postalCode,
          landmark: shipping.landmark || null,
          total,
          payment_method: paymentMethod,
        })
        .select('*')
        .single();

      if (error) throw error;

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        selected_color: item.color,
        selected_size: item.size,
        quantity: item.quantity,
        price: item.price,
        image_url: item.imageUrl,
      }));

      const { error: itemError } = await supabase.from('order_items').insert(orderItems);
      if (itemError) throw itemError;

      const { data: savedOrder, error: savedOrderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', order.id)
        .single();

      if (savedOrderError) throw savedOrderError;

      const nextOrder = dbOrderToOrder(savedOrder);
      setOrders((current) => [nextOrder, ...current]);
      clearCart();
      return nextOrder;
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

    setOrders((current) => [order, ...current]);
    clearCart();
    return order;
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
