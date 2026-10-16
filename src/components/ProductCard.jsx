import { Check, Heart, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency } from '../lib/catalog.js';

export default function ProductCard({ product, className = '' }) {
  const navigate = useNavigate();
  const { addToCart, wishlistIds, toggleWishlist } = useStore();
  const [added, setAdded] = useState(false);
  const isWishlisted = wishlistIds.includes(product.id);

  function handleAdd() {
    if (added) {
      navigate('/cart');
      return;
    }

    addToCart(product);
    setAdded(true);
  }

  return (
    <article className={`product-card ${className} ${added ? 'just-added' : ''}`.trim()}>
      <Link to={`/shop/${product.id}`} className="product-image-wrap">
        <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" />
        {product.badge && <span className="product-badge">{product.badge}</span>}
      </Link>
      <div className="product-card-body">
        <div className="product-meta-line">
          <p className="eyebrow">{product.category}</p>
          <span>
            <Star size={14} fill="currentColor" /> {product.rating}
          </span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-card-footer">
          <div>
            <strong>{formatCurrency(product.price)}</strong>
            {product.originalPrice > product.price && <span>{formatCurrency(product.originalPrice)}</span>}
          </div>
          <div className="product-actions">
            <button
              className={isWishlisted ? 'icon-button wishlist-button is-saved' : 'icon-button wishlist-button'}
              type="button"
              aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
              aria-pressed={isWishlisted}
              onClick={() => toggleWishlist(product.id)}
            >
              <Heart size={17} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            <button className={added ? 'added' : ''} onClick={handleAdd}>
              {added ? (
                <>
                  <Check size={16} /> Cart
                </>
              ) : (
                <>
                  <ShoppingBag size={16} /> Add
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
