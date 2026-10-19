import { LogIn, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { STORE_PHONE } from '../lib/contact.js';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const { products, productsLoading, cartReady, addToCart } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');
  const resumeStarted = useRef(false);
  const pendingCart = location.state?.pendingCart;
  const requestedDestination = location.state?.from;
  const destination = typeof requestedDestination === 'string' && requestedDestination.startsWith('/') && !requestedDestination.startsWith('//')
    ? requestedDestination
    : '/shop';

  useEffect(() => {
    if (!user) {
      resumeStarted.current = false;
      return;
    }
    if (!pendingCart || !cartReady || productsLoading || resumeStarted.current) return;
    resumeStarted.current = true;
    const product = products.find((item) => item.id === pendingCart.productId);

    if (!product) {
      setMessage('You are signed in, but this product is no longer available.');
      navigate(destination, { replace: true });
      return;
    }

    setMessage('Adding your item to the saved cart...');
    addToCart(product, Number(pendingCart.quantity) || 1, {
      size: pendingCart.size,
      color: pendingCart.color,
    }).then((saved) => {
      if (saved) {
        navigate('/cart', { replace: true });
        return;
      }
      setMessage('You are signed in, but the item could not be added. Please try again.');
      navigate(destination, { replace: true });
    });
  }, [user, pendingCart, cartReady, productsLoading, products, addToCart, navigate, destination]);

  if (user && !pendingCart) return <Navigate to={destination} replace />;
  if (user && pendingCart) {
    return <section className="page" role="status">{message || 'Preparing your account cart...'}</section>;
  }

  function update(field, value) {
    const nextValue = field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setMessage('One moment...');
      if (mode === 'signup') {
        const result = await signUp(form);
        if (result?.role) {
          if (pendingCart) setMessage('Account created. Adding your item to the saved cart...');
          else navigate(destination, { replace: true });
          return;
        }
        setMessage('Check your email to confirm your account, then log in to continue.');
      } else {
        await signIn(form);
        if (pendingCart) setMessage('Signed in. Adding your item to the saved cart...');
        else navigate(destination, { replace: true });
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="page auth-layout">
      <div className="auth-card">
        <p className="eyebrow">Secure access</p>
        <h1>{mode === 'signup' ? 'Create your Ajiomart account.' : 'Enter your Ajiomart wardrobe.'}</h1>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            <LogIn size={16} /> Login
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            <UserPlus size={16} /> Signup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-grid">
          {mode === 'signup' && (
            <>
              <label>
                Name
                <input value={form.name} onChange={(event) => update('name', event.target.value)} />
              </label>
              <label>
                Mobile number
                <span className="phone-input-row">
                  <span className="phone-prefix">+91</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    minLength={10}
                    placeholder={STORE_PHONE}
                    required
                  />
                </span>
              </label>
            </>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} />
          </label>
          <button className="button primary full" type="submit">
            {mode === 'signup' ? 'Create account' : 'Login'}
          </button>
        </form>

        {message && <p className="status-note">{message}</p>}
      </div>
    </section>
  );
}
