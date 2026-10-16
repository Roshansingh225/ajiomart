import { ArrowRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import Brand from './Brand.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const lastCount = useRef(0);
  const { pathname, hash } = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const { cartCount, wishlistProducts } = useStore();
  const onHome = pathname === '/';

  useEffect(() => {
    if (cartCount > lastCount.current) {
      setCartBump(true);
      window.setTimeout(() => setCartBump(false), 550);
    }
    lastCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    if (pathname !== '/' || !hash) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);

  const links = [
    ['Home', '/'],
    ['Shop', '/shop'],
    ['Collections', '/shop?category=Dresses'],
    ['Lookbook', '/#lookbook'],
    ['About', '/#story'],
  ];

  async function handleSignOut() {
    await signOut();
    setOpen(false);
  }

  return (
    <>
      <div className="promo-strip">
        <span>New season / The colour issue</span>
        <Link to="/shop">Explore the Ajiomart edit <ArrowRight size={14} /></Link>
        <span>Fashion / Beauty / Everyday</span>
      </div>
      <header className={`site-header${onHome ? ' home-navbar' : ''}`}>
        <Brand onClick={() => setOpen(false)} />

        <button
          className="icon-button menu-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>

        <nav className={open ? 'nav-links open' : 'nav-links'}>
          <div className="nav-links-main">
            {links.map(([label, href]) => (
              <NavLink
                key={href}
                to={href}
                onClick={(event) => {
                  setOpen(false);
                  const id = href.split('#')[1];
                  if (id && pathname === '/') {
                    event.preventDefault();
                    document.getElementById(id)?.scrollIntoView({
                      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    });
                    window.history.replaceState(null, '', href);
                  }
                }}
              >
                {label}
              </NavLink>
            ))}
            {user && <NavLink to="/orders" onClick={() => setOpen(false)}>Orders</NavLink>}
            {isAdmin && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>}
          </div>
          <div className="nav-actions">
            <NavLink className="search-link" to="/shop" onClick={() => setOpen(false)} aria-label="Search products" title="Search products">
              <Search size={18} /><span>Search</span>
            </NavLink>
            <NavLink className="wishlist-link" to="/wishlist" onClick={() => setOpen(false)} aria-label={`Wishlist, ${wishlistProducts.length} items`} title="Wishlist">
              <Heart size={18} /><span className="nav-label">Wishlist</span><span className="nav-count">{wishlistProducts.length}</span>
            </NavLink>
            <Link
              className={cartBump ? 'cart-link cart-bump' : 'cart-link'}
              to="/cart"
              onClick={() => setOpen(false)}
              aria-label={`Shopping bag, ${cartCount} items`}
              title="Shopping bag"
            >
              <ShoppingBag size={18} /><span className="nav-label">Bag</span><span className="nav-count">{cartCount}</span>
            </Link>
            {user ? (
              <button className="text-button" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <NavLink className="nav-cta" to="/auth" onClick={() => setOpen(false)} aria-label="Login" title="Login">
                <UserRound size={18} /><span>Login</span>
              </NavLink>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
