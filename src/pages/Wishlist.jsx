import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';

export default function Wishlist() {
  const { wishlistProducts, wishlistIds, productsLoading } = useStore();
  const savedCount = productsLoading ? wishlistIds.length : wishlistProducts.length;

  return (
    <section className="page wishlist-page">
      <div className="page-heading">
        <p className="eyebrow"><Heart size={14} /> Your saved edit</p>
        <h1>Pieces to come back to.</h1>
        <p>{savedCount} {savedCount === 1 ? 'piece' : 'pieces'} saved</p>
      </div>

      {productsLoading && wishlistIds.length > wishlistProducts.length ? (
        <p role="status">Loading your saved pieces...</p>
      ) : wishlistProducts.length ? (
        <div className="product-grid">
          {wishlistProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state wishlist-empty-state">
          <Heart size={28} />
          <h2>Nothing saved just yet.</h2>
          <p>Tap the heart on a piece you love and it will be waiting here.</p>
          <Link className="button primary" to="/shop">Explore the shop</Link>
        </div>
      )}
    </section>
  );
}
