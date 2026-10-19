import { Check, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { formatCurrency, getProductImages } from '../lib/catalog.js';
import { STORE_WHATSAPP_NUMBER } from '../lib/contact.js';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { products, cartItems, addToCart, wishlistIds, toggleWishlist, cartLoading, cartSaving, cartReady } = useStore();
  const product = products.find((item) => item.id === id);
  const isWishlisted = product ? wishlistIds.includes(product.id) : false;
  const isOutOfStock = product ? Number(product.stock) <= 0 : false;
  const quantityInCart = product
    ? cartItems.filter((item) => item.id === product.id).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0;
  const atStockLimit = product && quantityInCart >= Number(product.stock) && quantityInCart > 0;
  const images = getProductImages(product);
  const [activeImage, setActiveImage] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [added, setAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveImage(product.imageUrl);
      setSize(product.sizes?.[0] || 'One size');
      setColor(product.colors?.[0] || 'Default');
    }
  }, [product]);

  if (!product) {
    return (
      <section className="page">
        <p className="error">Product not found.</p>
        <Link className="button primary" to="/shop">
          Back to shop
        </Link>
      </section>
    );
  }

  async function handleAdd() {
    if (!user) {
      navigate('/auth', {
        state: {
          from: `${location.pathname}${location.search}`,
          pendingCart: { productId: product.id, quantity: 1, size, color },
        },
      });
      return;
    }
    if (added || atStockLimit) {
      navigate('/cart');
      return;
    }
    setIsAdding(true);
    try {
      if (await addToCart(product, 1, { size, color })) setAdded(true);
    } finally {
      setIsAdding(false);
    }
  }

  const whatsappText = encodeURIComponent(`Hello Ajiomart, I am interested in ${product.name}.`);

  return (
    <section className="page detail-layout">
      <div className="detail-gallery">
        <img className="detail-image" src={activeImage || product.imageUrl} alt={product.name} />
        {images.length > 1 && (
          <div className="detail-thumbnails">
            {images.map((imageUrl, index) => (
              <button
                type="button"
                key={`${imageUrl}-${index}`}
                className={imageUrl === activeImage ? 'detail-thumb active' : 'detail-thumb'}
                onClick={() => setActiveImage(imageUrl)}
                aria-label={`View image ${index + 1} of ${product.name}`}
              >
                <img src={imageUrl} alt={`${product.name} view ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="detail-copy">
        <p className="eyebrow">{product.category}</p>
        <h1>{product.name}</h1>
        <div className="rating-line">
          <Star size={17} fill="currentColor" /> {product.rating} customer rating
        </div>
        <p>{product.description}</p>
        <div className="detail-price-row">
          <strong className="detail-price">{formatCurrency(product.price)}</strong>
          {product.originalPrice > product.price && <span>{formatCurrency(product.originalPrice)}</span>}
        </div>

        <div className="option-block">
          <strong>Color</strong>
          <div className="chip-row">
            {product.colors?.map((item) => (
              <button key={item} className={color === item ? 'chip active' : 'chip'} onClick={() => setColor(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="option-block">
          <strong>Size</strong>
          <div className="chip-row">
            {product.sizes?.map((item) => (
              <button key={item} className={size === item ? 'chip active' : 'chip'} onClick={() => setSize(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <p className={isOutOfStock ? 'stock-note out-of-stock-note' : 'stock-note'}>
          {isOutOfStock ? 'Out of stock' : `${product.stock} available`}
        </p>
        <div className="button-row">
          <button className={added ? 'button primary added-to-cart' : 'button primary'} onClick={handleAdd} disabled={isOutOfStock || authLoading || cartLoading || !cartReady || cartSaving || isAdding}>
            {isOutOfStock ? (
              'Out of stock'
            ) : isAdding ? (
              'Saving to your cart...'
            ) : added || atStockLimit ? (
              <>
                <Check size={18} /> Go to cart
              </>
            ) : (
              <>
                <ShoppingBag size={18} /> Add to cart
              </>
            )}
          </button>
          <button
            className={isWishlisted ? 'button secondary saved-action' : 'button secondary'}
            type="button"
            aria-pressed={isWishlisted}
            onClick={() => toggleWishlist(product.id)}
          >
            <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} /> {isWishlisted ? 'Saved' : 'Save'}
          </button>
          <a className="button secondary" href={`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${whatsappText}`} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> WhatsApp
          </a>
        </div>
        <Link to="/shop" className="back-link">
          Back to shop
        </Link>
      </div>
    </section>
  );
}
