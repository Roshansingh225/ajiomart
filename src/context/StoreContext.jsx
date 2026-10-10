import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  initialProducts,
  makeId,
  normalizeProduct,
  normalizeProducts,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from '../lib/catalog.js';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [products, setProducts] = useState(() =>
    normalizeProducts(readStorage(STORAGE_KEYS.products, initialProducts)),
  );
  const [orders, setOrders] = useState(() => readStorage(STORAGE_KEYS.orders, []));
  const [cartItems, setCartItems] = useState(() => readStorage(STORAGE_KEYS.cart, []));

  useEffect(() => writeStorage(STORAGE_KEYS.products, products), [products]);
  useEffect(() => writeStorage(STORAGE_KEYS.orders, orders), [orders]);
  useEffect(() => writeStorage(STORAGE_KEYS.cart, cartItems), [cartItems]);

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

  function saveProduct(product) {
    const payload = normalizeProduct({
      ...product,
      id: product.id || makeId('product'),
      colors: Array.isArray(product.colors) ? product.colors : String(product.colors || '').split(',').map((item) => item.trim()).filter(Boolean),
      sizes: Array.isArray(product.sizes) ? product.sizes : String(product.sizes || '').split(',').map((item) => item.trim()).filter(Boolean),
      imageUrls: Array.isArray(product.imageUrls)
        ? product.imageUrls
        : String(product.imageUrls || '').split('\n').map((item) => item.trim()).filter(Boolean),
    });

    setProducts((current) => {
      const exists = current.some((item) => item.id === payload.id);
      if (exists) return current.map((item) => (item.id === payload.id ? payload : item));
      return [payload, ...current];
    });

    return payload;
  }

  function deleteProduct(id) {
    setProducts((current) => current.filter((product) => product.id !== id));
  }

  function createOrder({ user, shipping, paymentMethod }) {
    if (!user) throw new Error('Sign in to place your Ajiomart order.');
    if (!cartItems.length) throw new Error('Your cart is empty.');

    const order = {
      id: makeId('order'),
      userId: user.id,
      customerName: shipping.customerName,
      customerPhone: shipping.customerPhone,
      address: shipping,
      items: cartItems,
      total: cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
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

  function updateOrder(orderId, updates) {
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

  function deleteOrder(orderId) {
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  const cartTotal = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const value = useMemo(
    () => ({
      products,
      orders,
      cartItems,
      cartTotal,
      cartCount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      saveProduct,
      deleteProduct,
      createOrder,
      updateOrder,
      deleteOrder,
    }),
    [products, orders, cartItems, cartTotal, cartCount],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
