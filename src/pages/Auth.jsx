import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { STORE_PHONE } from '../lib/contact.js';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');

  if (user) return <Navigate to="/shop" replace />;

  function update(field, value) {
    const nextValue = field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((current) => ({ ...current, [field]: nextValue }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setMessage('One moment...');
      if (mode === 'signup') {
        await signUp(form);
        setMessage('Your Ajiomart account is ready.');
      } else {
        await signIn(form);
        setMessage('Welcome back to Ajiomart.');
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
