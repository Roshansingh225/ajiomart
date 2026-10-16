import { ArrowRight, Brush, Palette, ShieldCheck, Shirt, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';

const categoryTiles = [
  {
    title: 'Dresses',
    copy: 'Midi, satin, linen, and statement silhouettes.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Cosmetics',
    copy: 'Makeup, skincare, fragrance, and glow essentials.',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Accessories',
    copy: 'Bags, shoes, and details that finish the look.',
    image: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=1200&q=80',
  },
];

export default function Home() {
  const { products } = useStore();
  const featured = products.slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Fashion, beauty, and finishing touches</p>
          <h1>Ajiomart</h1>
          <p>Curated dresses, cosmetics, bags, shoes, and accessories for everyday plans and standout moments.</p>
          <div className="hero-actions">
            <Link className="button primary" to="/shop">
              Shop new edit <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" to="/auth">
              Private login
            </Link>
          </div>
        </div>
      </section>

      <section className="section promise-grid">
        <article>
          <Shirt />
          <h3>Ready Looks</h3>
          <p>Shop outfits, makeup, and accessories that work together from the first tap.</p>
        </article>
        <article>
          <Brush />
          <h3>Beauty Pairings</h3>
          <p>Skincare and color picks sit beside fashion pieces so styling feels natural.</p>
        </article>
        <article>
          <Truck />
          <h3>Order Tracking</h3>
          <p>Track placed orders from packing to delivery through your Ajiomart account.</p>
        </article>
      </section>

      <section className="section category-showcase">
        <div className="section-heading">
          <p className="eyebrow">Shop by mood</p>
          <h2>Build the whole look in one place.</h2>
        </div>
        <div className="category-grid">
          {categoryTiles.map((tile) => (
            <Link className="category-tile" to="/shop" key={tile.title}>
              <img src={tile.image} alt={tile.title} />
              <span>
                <strong>{tile.title}</strong>
                <small>{tile.copy}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section split-feature">
        <img
          src="https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1400&q=80"
          alt="Fashion collection in a boutique"
        />
        <div>
          <p className="eyebrow">The Ajiomart edit</p>
          <h2>Dresses with glow-ready beauty on the same shelf.</h2>
          <p>
            Pair breathable dresses with compact bags, comfortable shoes, skincare rituals, lip shades, and fragrance
            without jumping between stores.
          </p>
          <div className="button-row">
            <Link className="button primary" to="/shop">
              Explore collection
            </Link>
            <Link className="button secondary" to="/admin">
              Admin panel
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading inline-heading">
          <div>
            <p className="eyebrow">Trending now</p>
            <h2>Fresh picks for the week.</h2>
          </div>
          <Link className="text-link" to="/shop">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="section trust-band">
        <div>
          <Palette />
          <strong>Fashion plus beauty</strong>
          <span>Curated capsules across apparel, cosmetics, and accessories.</span>
        </div>
        <div>
          <ShieldCheck />
          <strong>Store management</strong>
          <span>Manage products, stock, order status, and delivery tracking.</span>
        </div>
      </section>
    </>
  );
}
