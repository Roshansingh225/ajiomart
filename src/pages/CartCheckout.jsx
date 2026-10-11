import { CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency } from '../lib/catalog.js';

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
  const { cartItems, cartTotal, updateQuantity, removeFromCart, createOrder } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [shipping, setShipping] = useState(emptyShipping);
  const [status, setStatus] = useState('');
  const [successState, setSuccessState] = useState(null);

  useEffect(() => {
    setShipping((current) => ({
      ...current,
      customerName: current.customerName || user?.name || '',
      customerPhone: current.customerPhone || user?.phone || '',
    }));
  }, [user]);

  function updateShipping(field, value) {
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

    return true;
  }

  async function checkout() {
    try {
      if (!user) {
        setStatus('Login to place your Ajiomart order.');
        window.setTimeout(() => navigate('/auth'), 650);
        return;
      }
      if (!validateShipping()) return;

      setStatus('Creating your order...');
      const order = await createOrder({ user, shipping, paymentMethod });
      setSuccessState(order);
      setStatus('');
      window.setTimeout(() => navigate('/orders'), 1800);
    } catch (error) {
      setStatus(error.message);
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
          {cartItems.map((item) => (
            <article className="cart-item" key={item.cartKey}>
              <img src={item.imageUrl} alt={item.name} />
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.color} / {item.size}
                </p>
                <strong>{formatCurrency(item.price)}</strong>
                <div className="quantity-stepper">
                  <button type="button" onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} aria-label={`Decrease ${item.name}`}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} aria-label={`Increase ${item.name}`}>
                    +
                  </button>
                </div>
              </div>
              <button className="icon-button" onClick={() => removeFromCart(item.cartKey)} aria-label={`Remove ${item.name}`}>
                <Trash2 />
              </button>
            </article>
          ))}
        </div>
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
            <input value={shipping.customerPhone} onChange={(event) => updateShipping('customerPhone', event.target.value)} placeholder="+91 98765 43210" />
          </label>
          <label>
            Address line 1
            <input value={shipping.addressLine1} onChange={(event) => updateShipping('addressLine1', event.target.value)} placeholder="House no, street, area" />
          </label>
          <label>
            Address line 2
            <input value={shipping.addressLine2} onChange={(event) => updateShipping('addressLine2', event.target.value)} placeholder="Apartment, floor, optional" />
          </label>
          <div className="checkout-grid">
            <label>
              City
              <input value={shipping.city} onChange={(event) => updateShipping('city', event.target.value)} placeholder="Delhi" />
            </label>
            <label>
              State
              <input value={shipping.state} onChange={(event) => updateShipping('state', event.target.value)} placeholder="Delhi" />
            </label>
          </div>
          <div className="checkout-grid">
            <label>
              PIN code
              <input value={shipping.postalCode} onChange={(event) => updateShipping('postalCode', event.target.value)} placeholder="110001" />
            </label>
            <label>
              Landmark
              <input value={shipping.landmark} onChange={(event) => updateShipping('landmark', event.target.value)} placeholder="Near metro station" />
            </label>
          </div>
        </div>
        <label>
          Payment method
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option>UPI</option>
            <option>Card</option>
            <option>Cash on Delivery</option>
          </select>
        </label>
        <button className="button primary full" disabled={!cartItems.length} onClick={checkout}>
          {paymentMethod === 'Cash on Delivery' ? 'Place COD Order' : `Pay with ${paymentMethod}`}
        </button>
        <a className="button secondary full" href={`https://wa.me/919999888877?text=${whatsappText}`} target="_blank" rel="noreferrer">
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
