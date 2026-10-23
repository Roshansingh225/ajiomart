import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { categories } from '../lib/catalog.js';
import { useSearchParams } from 'react-router-dom';

export default function Shop() {
  const { products, productsLoading, productError } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(() => {
    const initialCategory = searchParams.get('category');
    return categories.includes(initialCategory) ? initialCategory : 'All';
  });
  const [sort, setSort] = useState('featured');

  useEffect(() => {
    const selectedCategory = searchParams.get('category');
    setCategory(categories.includes(selectedCategory) ? selectedCategory : 'All');
  }, [searchParams]);

  const visibleCategories = useMemo(
    () => ['All', ...categories],
    [],
  );

  const filtered = useMemo(() => {
    const nextProducts = products.filter((product) => {
      const haystack = [product.name, product.category, product.description, product.badge].join(' ').toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesCategory = category === 'All' || product.category === category;
      return matchesQuery && matchesCategory;
    });

    return [...nextProducts].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price;
      if (sort === 'price-high') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return 0;
    });
  }, [products, query, category, sort]);

  function selectCategory(item) {
    setCategory(item);
    const nextParams = new URLSearchParams(searchParams);
    if (item === 'All') nextParams.delete('category');
    else nextParams.set('category', item);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <section className="page">
      <div className="page-heading">
        <p className="eyebrow">Shop Ajiomart</p>
        <h1>Fashion, beauty, jewellery, and style pieces for your day.</h1>
      </div>

      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dresses, makeup, jewellery..." />
        </label>
        <div className="filter-row">
          <div className="chip-row">
          {visibleCategories.map((item) => (
              <button className={category === item ? 'chip active' : 'chip'} key={item} onClick={() => selectCategory(item)}>
                {item}
              </button>
            ))}
          </div>
          <label className="sort-control">
            <SlidersHorizontal size={17} />
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="featured">Featured</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>
      </div>

      {productsLoading && <p role="status">Loading the Ajiomart edit...</p>}
      {productError && <p className="error" role="alert">We couldn't load the shop right now. {productError}</p>}
      {!productsLoading && !productError && !filtered.length && (
        <p>{category === 'Jewellery' && !query ? 'The jewellery edit is being curated. Check back soon.' : 'No products matched your search.'}</p>
      )}
      <div className="product-grid">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
