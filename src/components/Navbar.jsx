import { Menu, Search, ShoppingBag, Sparkles, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const lastCount = useRef(0);
  const { user, isAdmin, signOut } = useAuth();
  const { cartCount } = useStore();

  useEffect(() => {
    if (cartCount > lastCount.current) {
      setCartBump(true);
      window.setTimeout(() => setCartBump(false), 550);
    }
    lastCount.current = cartCount;
  }, [cartCount]);

  const links = [
    ['Home', '/'],
    ['Shop', '/shop'],
  ];

  if (user) links.push(['Orders', '/orders']);
  if (isAdmin) links.push(['Admin', '/admin']);

  async function handleSignOut() {
    await signOut();
    setOpen(false);
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/" onClick={() => setOpen(false)}>
        <span className="brand-mark">
          <Sparkles size={20} />
        </span>
        <span>Ajiomart</span>
      </Link>

      <button className="icon-button menu-toggle" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
        {open ? <X /> : <Menu />}
      </button>

      <nav className={open ? 'nav-links open' : 'nav-links'}>
        {links.map(([label, href]) => (
          <NavLink key={href} to={href} onClick={() => setOpen(false)}>
            {label}
          </NavLink>
        ))}
        <NavLink className="search-link" to="/shop" onClick={() => setOpen(false)}>
          <Search size={17} />
          <span>Find pieces</span>
        </NavLink>
        <Link className={cartBump ? 'cart-link cart-bump' : 'cart-link'} to="/cart" onClick={() => setOpen(false)}>
          <ShoppingBag size={18} />
          <span>{cartCount}</span>
        </Link>
        {user ? (
          <button className="text-button" onClick={handleSignOut}>
            Sign out
          </button>
        ) : (
          <NavLink className="nav-cta" to="/auth" onClick={() => setOpen(false)}>
            <UserRound size={17} />
            Login
          </NavLink>
        )}
      </nav>
    </header>
  );
}
