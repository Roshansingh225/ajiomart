import { lazy, Suspense, useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StyleAssistant from './components/StyleAssistant.jsx';
import Auth from './pages/Auth.jsx';
import CartCheckout from './pages/CartCheckout.jsx';
import Home from './pages/Home.jsx';
import Orders from './pages/Orders.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Shop from './pages/Shop.jsx';
import Wishlist from './pages/Wishlist.jsx';

const Admin = lazy(() => import('./pages/Admin.jsx'));

export default function App() {
  const location = useLocation();

  useLayoutEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.key, location.hash]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="route-transition" key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:id" element={<ProductDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/cart" element={<CartCheckout />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <Suspense fallback={<div className="page" role="status">Loading dashboard...</div>}>
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              </Suspense>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <StyleAssistant />
      <Footer />
    </div>
  );
}
