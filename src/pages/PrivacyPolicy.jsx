import { Link } from 'react-router-dom';

const effectiveDate = 'October 6, 2026';

export default function PrivacyPolicy() {
  return (
    <section className="page narrow legal-page">
      <div className="page-heading">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy Policy for Ajiomart</h1>
        <p>Effective Date: {effectiveDate}</p>
      </div>

      <div className="legal-sections">
        <article>
          <p>
            Ajiomart collects only the information needed to run a fashion and cosmetics shopping experience, including
            account details, cart activity, delivery information, and order history.
          </p>
        </article>
        <article>
          <h2>Information We Use</h2>
          <ul>
            <li>Name, email address, phone number, and delivery address</li>
            <li>Products ordered, selected sizes, selected shades, and payment method</li>
            <li>Delivery status, courier partner, tracking number, and support notes</li>
          </ul>
        </article>
        <article>
          <h2>How We Use It</h2>
          <ul>
            <li>Create and manage your account</li>
            <li>Save your cart, orders, delivery details, and tracking updates</li>
            <li>Improve product selection across fashion, cosmetics, and accessories</li>
            <li>Respond to account, order, payment, and delivery support requests</li>
          </ul>
        </article>
        <article>
          <h2>Browser Storage</h2>
          <p>
            When Supabase is not configured, locally created accounts, products, cart items, and orders are stored in
            this browser. With Supabase configured, your cart is saved to your account and syncs across signed-in
            devices. Wishlist preferences remain in this browser.
          </p>
        </article>
        <article>
          <h2>Contact</h2>
          <p>
            For privacy requests, contact <a href="mailto:care@ajiomart.com">care@ajiomart.com</a>.
          </p>
          <p>
            Return to <Link to="/">Ajiomart</Link>.
          </p>
        </article>
      </div>
    </section>
  );
}
