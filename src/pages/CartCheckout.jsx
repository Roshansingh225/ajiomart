import { CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency } from '../lib/catalog.js';
import { STORE_PHONE, STORE_WHATSAPP_NUMBER } from '../lib/contact.js';

const emptyShipping = {
  customerName: '',
  customerPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
};

export default function CartCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    cartItems,
    cartTotal,
    products,
    productsLoading,
    updateQuantity,
    removeFromCart,
    createOrder,
  } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [shipping, setShipping] = useState(emptyShipping);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pinLookupStatus, setPinLookupStatus] = useState('');
  const [successState, setSuccessState] = useState(null);

  const cartQuantities = new Map();
  cartItems.forEach((item) => {
    cartQuantities.set(item.id, (cartQuantities.get(item.id) || 0) + Number(item.quantity || 0));
  });
  const inventoryIssues = productsLoading
    ? []
    : [...cartQuantities.entries()].flatMap(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);
        if (!product || product.active === false) {
          return [{ id: productId, name: product?.name || 'A product', available: 0, requested: quantity }];
        }
        if (Number(product.stock) < quantity) {
          return [{ id: productId, name: product.name, available: Number(product.stock), requested: quantity }];
        }
        return [];
      });

  useEffect(() => {
    setShipping((current) => ({
      ...current,
      customerName: current.customerName || user?.name || '',
      customerPhone: current.customerPhone || user?.phone || '',
    }));
  }, [user]);

  useEffect(() => {
    const postalCode = shipping.postalCode;
    if (!/^\d{6}$/.test(postalCode)) {
      setPinLookupStatus('');
      return undefined;
    }

    const controller = new AbortController();
    setPinLookupStatus('Checking PIN code...');

    async function lookupPostalCode() {
      try {
        const response = await fetch(`https://api.pincodeapi.in/api/v1/pincode/${postalCode}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('PIN lookup is unavailable.');

        const result = await response.json();
        const postOffices = result?.success ? result.data?.post_offices : null;
        if (!postOffices?.length) {
          setPinLookupStatus('PIN code not found. Enter city and state manually.');
          return;
        }

        const office = postOffices.find((item) => item.delivery_status === 'Delivery') || postOffices[0];
        const city = office.district || '';
        const state = office.state || '';
        if (controller.signal.aborted) return;
        setShipping((current) =>
          current.postalCode === postalCode
            ? { ...current, city: city || current.city, state: state || current.state }
            : current,
        );
        setPinLookupStatus([city, state].filter(Boolean).join(', '));
      } catch (error) {
        if (!controller.signal.aborted) setPinLookupStatus('Could not look up this PIN. Enter city and state manually.');
      }
    }

    lookupPostalCode();
    return () => controller.abort();
  }, [shipping.postalCode]);

  function updateShipping(field, value) {
    if (field === 'postalCode') {
      const postalCode = value.replace(/\D/g, '').slice(0, 6);
      setShipping((current) => ({ ...current, postalCode, city: '', state: '' }));
      return;
    }

    setShipping((current) => ({ ...current, [field]: value }));
  }

  function validateShipping() {
    const requiredFields = [
      ['customerName', 'Full name'],
      ['customerPhone', 'Phone'],
      ['addressLine1', 'Address line 1'],
      ['city', 'City'],
      ['state', 'State'],
      ['postalCode', 'PIN code'],
    ];

    const missing = requiredFields.find(([field]) => !shipping[field].trim());
    if (missing) {
      setStatus(`${missing[1]} is required for delivery.`);
      return false;
    }

    if (!/^\d{6}$/.test(shipping.postalCode)) {
      setStatus('Enter a valid 6-digit PIN code.');
      return false;
    }

    return true;
  }

  async function checkout() {
    if (submitting) return;
    try {
      if (!user) {
        setStatus('Login to place your Ajiomart order.');
        window.setTimeout(() => navigate('/auth'), 650);
        return;
      }
      if (productsLoading) {
        setStatus('Checking product availability. Please wait a moment.');
        return;
      }
      if (inventoryIssues.length) {
        setStatus('Update your cart quantities before placing the order.');
        return;
      }
      if (!validateShipping()) return;

      setSubmitting(true);
      setStatus('Creating your order...');
      const order = await createOrder({ user, shipping, paymentMethod });
      setSuccessState(order);
      setStatus('');
      window.setTimeout(() => navigate('/orders'), 1800);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const whatsappText = encodeURIComponent(
    `Hello Ajiomart, I need help with my cart: ${cartItems.map((item) => `${item.quantity} x ${item.name}`).join(', ')}. Total ${formatCurrency(cartTotal)}.`,
  );

  return (
    <section className="page checkout-layout">
      <div>
        <div className="page-heading">
          <p className="eyebrow">Cart</p>
          <h1>Your Ajiomart bag.</h1>
        </div>

        {!cartItems.length && (
          <div className="empty-state">
            <p>Your cart is ready for dresses, makeup, skincare, shoes, and more.</p>
            <Link className="button primary" to="/shop">
              Browse shop
            </Link>
          </div>
        )}

        <div className="cart-list">
          {cartItems.map((item) => {
            const product = products.find((entry) => entry.id === item.id);
            const itemProductQuantity = cartQuantities.get(item.id) || 0;
            const stockLimitReached = !product || product.active === false || itemProductQuantity >= Number(product.stock);

            return (
              <article className="cart-item" key={item.cartKey}>
                <img src={item.imageUrl} alt={item.name} />
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.color} / {item.size}
                  </p>
                  <strong>{formatCurrency(item.price)}</strong>
                  {!productsLoading && product && (
                    <small className={Number(product.stock) === 0 ? 'cart-stock-note out-of-stock-note' : 'cart-stock-note'}>
                      {Number(product.stock) === 0 ? 'Out of stock' : `${product.stock} available`}
                    </small>
                  )}
                  <div className="quantity-stepper">
                    <button type="button" disabled={submitting} onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} aria-label={`Decrease ${item.name}`}>
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button type="button" disabled={submitting || productsLoading || stockLimitReached} onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} aria-label={`Increase ${item.name}`}>
                      +
                    </button>
                  </div>
                </div>
                <button className="icon-button" disabled={submitting} onClick={() => removeFromCart(item.cartKey)} aria-label={`Remove ${item.name}`}>
                  <Trash2 />
                </button>
              </article>
            );
          })}
        </div>
        {!!inventoryIssues.length && (
          <div className="stock-warning" role="alert">
            <strong>Some items are no longer available in that quantity.</strong>
            {inventoryIssues.map((issue) => (
              <p key={issue.id}>
                {issue.name}: {issue.available} available, {issue.requested} in your bag. Reduce the quantity or remove it.
              </p>
            ))}
          </div>
        )}
      </div>

      <aside className="checkout-card">
        <p className="eyebrow">Checkout</p>
        <h2>{formatCurrency(cartTotal)}</h2>
        <div className="shipping-form">
          <label>
            Full name
            <input value={shipping.customerName} onChange={(event) => updateShipping('customerName', event.target.value)} placeholder="Ananya Sharma" />
          </label>
          <label>
            Phone
            <input value={shipping.customerPhone} onChange={(event) => updateShipping('customerPhone', event.target.value)} placeholder={`+91 ${STORE_PHONE}`} />
          </label>
          <label>
            Address line 1
            <input value={shipping.addressLine1} onChange={(event) => updateShipping('addressLine1', event.target.value)} placeholder="House no, street, area" />
          </label>
          <label>
            Address line 2
            <input value={shipping.addressLine2} onChange={(event) => updateShipping('addressLine2', event.target.value)} placeholder="Apartment, floor, optional" />
          </label>
          <label>
            PIN code
            <input
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              value={shipping.postalCode}
              onChange={(event) => updateShipping('postalCode', event.target.value)}
              placeholder="110001"
            />
            {pinLookupStatus && <small className="pin-lookup-status" role="status">{pinLookupStatus}</small>}
          </label>
          <div className="checkout-grid">
            <label>
              City / district
              <input value={shipping.city} onChange={(event) => updateShipping('city', event.target.value)} placeholder="Delhi" />
            </label>
            <label>
              State
              <input value={shipping.state} onChange={(event) => updateShipping('state', event.target.value)} placeholder="Delhi" />
            </label>
          </div>
          <label>
            Landmark
            <input value={shipping.landmark} onChange={(event) => updateShipping('landmark', event.target.value)} placeholder="Near metro station" />
          </label>
        </div>
        <label>
          Payment method
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option>UPI</option>
            <option>Card</option>
            <option>Cash on Delivery</option>
          </select>
        </label>
        <button className="button primary full" disabled={!cartItems.length || submitting || productsLoading || inventoryIssues.length > 0} onClick={checkout}>
          {submitting ? 'Placing order...' : productsLoading ? 'Checking stock...' : paymentMethod === 'Cash on Delivery' ? 'Place COD Order' : `Pay with ${paymentMethod}`}
        </button>
        <a className="button secondary full" href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> WhatsApp support
        </a>
        {status && <p className="status-note">{status}</p>}
      </aside>

      {successState && (
        <div className="modal-backdrop">
          <section className="order-success-modal">
            <div className="success-ring">
              <CheckCircle2 size={48} />
            </div>
            <p className="eyebrow">Order placed</p>
            <h2>Your Ajiomart order is confirmed.</h2>
            <p>Order {successState.id.slice(0, 12)} is now visible in your order history.</p>
          </section>
        </div>
      )}
    </section>
  );
}
