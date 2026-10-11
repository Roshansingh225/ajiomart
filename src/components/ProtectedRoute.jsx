import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, isAdmin, loading, usingSupabase } = useAuth();

  if (loading) return <section className="page narrow"><p>Preparing your Ajiomart account...</p></section>;

  if (!user) return <Navigate to="/auth" replace />;

  if (adminOnly && !isAdmin) {
    return (
      <section className="page narrow access-card">
        <p className="eyebrow">Admin access</p>
        <h1>Admin role required.</h1>
        <p>
          {usingSupabase
            ? 'Promote this Supabase user to admin in the profiles table, then sign in again.'
            : 'Sign in with the Ajiomart admin demo account to manage products, orders, and tracking.'}
        </p>
        {usingSupabase ? (
          <pre>{`update public.profiles
set role = 'admin'
where email = '${user.email || 'admin@ajiomart.com'}';`}</pre>
        ) : (
          <div className="demo-credential">
            <strong>admin@ajiomart.com</strong>
            <span>admin123</span>
          </div>
        )}
        <div className="button-row">
          <Link className="button primary" to="/auth">
            Go to login
          </Link>
          <Link className="button secondary" to="/shop">
            Back to shop
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
