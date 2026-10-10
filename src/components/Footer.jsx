import { Instagram, Mail, MapPin, MessageCircle, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const whatsappNumber = '919999888877';

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Sparkles size={20} />
            </span>
            <span>Ajiomart</span>
          </Link>
          <p>Fashion, beauty, and daily style essentials curated for confident wardrobes and glowing routines.</p>
          <div className="footer-socials">
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
              <MessageCircle size={18} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Visit Instagram">
              <Instagram size={18} />
            </a>
          </div>
        </div>

        <div>
          <h3>Shop</h3>
          <Link to="/shop">Dresses</Link>
          <Link to="/shop">Makeup</Link>
          <Link to="/shop">Skincare</Link>
          <Link to="/shop">Handbags</Link>
        </div>

        <div>
          <h3>Care</h3>
          <Link to="/cart">Checkout</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/auth">Login</Link>
          <Link to="/privacy">Privacy</Link>
        </div>

        <div>
          <h3>Contact</h3>
          <p>
            <MapPin size={16} /> Delhi, India
          </p>
          <p>
            <Phone size={16} /> +91 99998 88877
          </p>
          <p>
            <Mail size={16} /> care@ajiomart.com
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>Copyright {new Date().getFullYear()} Ajiomart.</span>
        <span>Fresh fashion and beauty for everyday plans.</span>
      </div>
    </footer>
  );
}
