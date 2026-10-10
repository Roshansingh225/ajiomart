import { LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [message, setMessage] = useState('');

  if (user) return <Navigate to="/shop" replace />;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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

  function fillDemo(email, password) {
    setForm((current) => ({ ...current, email, password }));
    setMode('login');
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
                Phone
                <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+91 98765 43210" />
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

        <div className="demo-login-grid">
          <button type="button" onClick={() => fillDemo('admin@ajiomart.com', 'admin123')}>
            <strong>Admin demo</strong>
            <span>admin@ajiomart.com</span>
          </button>
          <button type="button" onClick={() => fillDemo('customer@ajiomart.com', 'customer123')}>
            <strong>Customer demo</strong>
            <span>customer@ajiomart.com</span>
          </button>
        </div>

        {message && <p className="status-note">{message}</p>}
      </div>
    </section>
  );
}
