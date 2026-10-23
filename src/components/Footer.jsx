import { ArrowUp, HeartHandshake, Instagram, Mail, MessageCircle, Phone, Shirt, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { STORE_PHONE, STORE_WHATSAPP_NUMBER } from '../lib/contact.js';
import Brand from './Brand.jsx';

export default function Footer() {
  const whatsappUrl = `https://wa.me/${STORE_WHATSAPP_NUMBER}`;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-intro">
          <div>
            <span className="footer-eyebrow">THE AJIOMART EDIT</span>
            <h2>Feel good in what you wear.</h2>
          </div>
          <p>Fresh fashion, beauty, and jewellery finds for all the little plans that make up your day.</p>
        </div>

        <div className="footer-main">
          <div className="footer-brand">
            <Brand />
            <p>Style, beauty, jewellery, and daily essentials selected to make getting ready feel like you.</p>
            <div className="footer-socials">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
                <MessageCircle size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Visit Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <nav className="footer-column" aria-label="Explore categories">
            <h3>Explore</h3>
            <Link to="/shop?category=Dresses">Dresses</Link>
            <Link to="/shop?category=Co-ords">Co-ords</Link>
            <Link to="/shop?category=Makeup">Makeup</Link>
            <Link to="/shop?category=Jewellery">Jewellery</Link>
            <Link to="/shop?category=Skincare">Skincare</Link>
            <Link to="/shop?category=Footwear">Footwear</Link>
          </nav>

          <nav className="footer-column" aria-label="Your Ajiomart">
            <h3>Your Ajiomart</h3>
            <Link to="/shop">Shop all</Link>
            <Link to="/orders">My orders</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Your bag</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>

          <div className="footer-contact">
            <h3>Here to help</h3>
            <p className="footer-contact-note">A question about a look or an order? Drop us a message.</p>
            <a className="footer-contact-link" href={whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              <span>WhatsApp us</span>
              <strong>+91 {STORE_PHONE}</strong>
            </a>
            <a className="footer-contact-link" href={`tel:+91${STORE_PHONE}`}>
              <Phone size={17} />
              <span>Call us</span>
              <strong>+91 {STORE_PHONE}</strong>
            </a>
            <a className="footer-email" href="mailto:care@ajiomart.com">
              <Mail size={16} /> care@ajiomart.com
            </a>
          </div>
        </div>

        <div className="footer-service-strip">
          <div>
            <Shirt size={20} />
            <span><strong>Style for every day</strong><small>Find your next favorite</small></span>
          </div>
          <div>
            <Sparkles size={20} />
            <span><strong>Style, beauty & jewellery</strong><small>One happy little edit</small></span>
          </div>
          <div>
            <HeartHandshake size={20} />
            <span><strong>A real person, right here</strong><small>Message us whenever</small></span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Copyright {new Date().getFullYear()} Ajiomart. Made for your everyday.</span>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top <ArrowUp size={16} />
          </button>
        </div>
      </div>
    </footer>
  );
}
