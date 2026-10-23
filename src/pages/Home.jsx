import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { useStore } from '../context/StoreContext.jsx';

const categoryTiles = [
  {
    title: 'Dresses',
    copy: 'Fluid silhouettes, made for your kind of occasion.',
    category: 'Dresses',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
    className: 'category-tile-dresses',
    index: '01',
  },
  {
    title: 'Makeup',
    copy: 'Color and care, down to the finishing touch.',
    category: 'Makeup',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85',
    className: 'category-tile-beauty',
    index: '02',
  },
  {
    title: 'Handbags',
    copy: 'The pieces that make the look your own.',
    category: 'Handbags',
    image: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&w=1200&q=85',
    className: 'category-tile-accessories',
    index: '03',
  },
  {
    title: 'Jewellery',
    copy: 'A little shine, made to feel like your own.',
    category: 'Jewellery',
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=85',
    className: 'category-tile-jewellery',
    index: '04',
  },
];

const lookbookStories = [
  {
    category: 'Dresses',
    title: 'Poolside colour',
    note: 'Light layers. Long afternoons.',
    image: '/ajiomart-lookbook-poolside.jpg',
    number: '01',
  },
  {
    category: 'Skincare',
    title: 'The everyday ritual',
    note: 'A slower start, just for you.',
    image: '/ajiomart-lookbook-ritual.jpg',
    number: '02',
  },
  {
    category: 'Handbags',
    title: 'Ready when you are',
    note: 'One last detail. Then, out the door.',
    image: '/ajiomart-lookbook-handbag.jpg',
    number: '03',
  },
  {
    category: 'Jewellery',
    title: 'The finishing touch',
    note: 'Small details. Entirely your signature.',
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1600&q=85',
    number: '04',
  },
];

export default function Home() {
  const { products, productsLoading, productError } = useStore();
  const heroRef = useRef(null);
  const carouselRef = useRef(null);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [activeLookbookIndex, setActiveLookbookIndex] = useState(0);
  const featured = products.slice(0, 6);
  const activeLookbook = lookbookStories[activeLookbookIndex];

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const updateProgress = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = hero.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
        hero.style.setProperty('--hero-scale', String(1 + progress * 0.1));
        hero.style.setProperty('--hero-fade', String(1 - progress * 0.6));
        hero.style.setProperty('--hero-shift', `${progress * 18}px`);
      });
    };

    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('reveal-visible'));
      return undefined;
    }

    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('motion-ready');
    };
  }, []);

  function scrollCarousel(direction) {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.querySelector('.product-card');
    const gap = Number.parseFloat(window.getComputedStyle(carousel).gap) || 0;
    const distance = card ? card.offsetWidth + gap : carousel.clientWidth * 0.8;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    carousel.scrollBy({ left: distance * direction, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function updateCarouselActive(event) {
    const carousel = event.currentTarget;
    const card = carousel.querySelector('.carousel-card');
    if (!card) return;
    const gap = Number.parseFloat(window.getComputedStyle(carousel).gap) || 0;
    const nextIndex = Math.round(carousel.scrollLeft / (card.offsetWidth + gap));
    setActiveProductIndex((current) => (current === nextIndex ? current : nextIndex));
  }

  function carouselCardClass(index) {
    const offset = index - activeProductIndex;
    if (offset === 0) return 'carousel-card carousel-active';
    if (offset === -1) return 'carousel-card carousel-before';
    if (offset === 1) return 'carousel-card carousel-after';
    return 'carousel-card carousel-away';
  }

  return (
    <>
      <section className="hero cinematic-hero" ref={heroRef}>
        <div className="hero-media" aria-hidden="true">
          <img
            src="/ajiomart-colour-campaign.jpg"
            alt=""
            fetchPriority="high"
          />
        </div>
        <div className="hero-topline">
          <span>The Ajiomart colour edit</span>
          <span>Fashion / Beauty / Jewellery / 2026</span>
        </div>
        <div className="hero-content">
          <p className="eyebrow">New season / Ajiomart</p>
          <h1>Dress in<br /><em>full colour.</em></h1>
          <p>Expressive fashion, beauty, and jewellery for every mood, moment, and mirror.</p>
          <div className="hero-actions">
            <Link className="button hero-button" to="/shop">
              Explore the edit <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <p className="hero-side-note">Colour for every version of you</p>
        <div className="hero-bottomline">
          <div className="hero-promises">
            <span><Sparkles size={16} /><span><strong>Style + beauty + jewellery</strong>One considered edit</span></span>
            <span><Heart size={16} /><span><strong>Made for expression</strong>Find your own colour</span></span>
          </div>
          <span className="hero-scroll-cue">Scroll to explore <ArrowDownRight size={17} /></span>
        </div>
      </section>

      <div className="editorial-ribbon" aria-label="Ajiomart fashion, beauty, and jewellery">
        <span><Sparkles size={16} /> The colour issue</span>
        <i />
        <span>Wear it your way</span>
        <i />
        <span>Beauty and jewellery in every detail</span>
        <i />
        <span><Heart size={15} /> Made to move with you</span>
      </div>

      <section className="section featured-section" data-reveal>
        <div className="section-heading inline-heading featured-heading">
          <div>
            <p className="eyebrow">The Ajiomart signatures</p>
            <h2>Made to<br /><em>be noticed.</em></h2>
          </div>
          <div className="featured-heading-right">
            <Link className="text-link" to="/shop">Explore the edit <ArrowRight size={17} /></Link>
            <div className="carousel-controls" aria-label="Featured products carousel controls">
              <button className="icon-button" type="button" onClick={() => scrollCarousel(-1)} aria-label="Previous products">
                <ChevronLeft size={20} />
              </button>
              <button className="icon-button" type="button" onClick={() => scrollCarousel(1)} aria-label="Next products">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
        {featured.length > 0 ? (
          <div className="product-carousel" ref={carouselRef} onScroll={updateCarouselActive} aria-label="Featured Ajiomart products">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} className={carouselCardClass(index)} />
            ))}
          </div>
        ) : (
          <div className="home-products-empty" role="status">
            <p>
              {productsLoading
                ? 'Loading the latest edit...'
                : productError
                  ? 'The latest edit could not be loaded right now.'
                  : 'The latest edit is being prepared.'}
            </p>
            {!productsLoading && !productError && <Link className="text-link" to="/shop">Visit the shop <ArrowRight size={16} /></Link>}
            {productError && <span className="small-note">{productError}</span>}
          </div>
        )}
      </section>

      <section className="section category-showcase home-categories">
        <div className="section-heading editorial-heading" data-reveal>
          <div>
            <p className="eyebrow">A good place to begin</p>
            <h2>Find your<br /><em>kind of feeling.</em></h2>
          </div>
          <p className="heading-aside">From the first layer to the final detail, make room for a little more you.</p>
        </div>
        <div className="category-grid editorial-category-grid">
          {categoryTiles.map((tile) => (
            <Link
              className={`category-tile editorial-category-tile ${tile.className}`}
              to={`/shop?category=${encodeURIComponent(tile.category)}`}
              key={tile.title}
              data-reveal
            >
              <img src={tile.image} alt={tile.title} loading="lazy" decoding="async" />
              <span className="category-index">{tile.index} / {String(categoryTiles.length).padStart(2, '0')}</span>
              <span className="category-copy">
                <strong>{tile.title}</strong>
                <small>{tile.copy}</small>
                <span className="category-arrow"><ArrowUpRight size={19} /></span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="lookbook-section" id="lookbook" aria-label="Ajiomart seasonal lookbook" data-reveal>
        <div
          className="lookbook-canvas"
          style={{ '--lookbook-image': `url("${activeLookbook.image}")` }}
        >
          <p className="lookbook-kicker">Ajiomart / Lookbook 2026</p>
          <div className="lookbook-main-copy" key={activeLookbook.number}>
            <p>{activeLookbook.category} / The story</p>
            <h2>{activeLookbook.title}</h2>
            <span>{activeLookbook.note}</span>
            <Link to={`/shop?category=${encodeURIComponent(activeLookbook.category)}`}>
              Shop the story <ArrowUpRight size={17} />
            </Link>
          </div>
          <span className="lookbook-side-note">Dress for the feeling</span>
          <div className="lookbook-navigation">
            <div className="lookbook-arrows">
              <button
                className="icon-button"
                type="button"
                aria-label="Previous lookbook story"
                onClick={() => setActiveLookbookIndex((index) => (index + lookbookStories.length - 1) % lookbookStories.length)}
              >
                <ChevronLeft size={19} />
              </button>
              <span>{String(activeLookbookIndex + 1).padStart(2, '0')} / {String(lookbookStories.length).padStart(2, '0')}</span>
              <button
                className="icon-button"
                type="button"
                aria-label="Next lookbook story"
                onClick={() => setActiveLookbookIndex((index) => (index + 1) % lookbookStories.length)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div className="lookbook-thumbnails" aria-label="Choose a lookbook story">
              {lookbookStories.map((story, index) => (
                <button
                  key={story.number}
                  className={index === activeLookbookIndex ? 'lookbook-thumbnail is-active' : 'lookbook-thumbnail'}
                  type="button"
                  aria-label={`Show ${story.category} story`}
                  aria-pressed={index === activeLookbookIndex}
                  onClick={() => setActiveLookbookIndex(index)}
                >
                  <img src={story.image} alt="" loading="lazy" decoding="async" />
                  <span>{story.category}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="lookbook-instruction">Choose a story to explore</p>
        </div>
      </section>

      <section className="section brand-story-section" id="story">
        <div className="brand-story-image" data-reveal>
          <img
            src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1500&q=85"
            alt="A considered selection of beauty essentials"
            loading="lazy"
            decoding="async"
          />
          <span>Beauty, in your own rhythm.</span>
        </div>
        <div className="brand-story-copy" data-reveal>
          <p className="eyebrow">Stories behind the seams</p>
          <h2>Wear what<br /><em>moves you.</em></h2>
          <p>Every piece starts with a feeling. Find the clothes, colours, jewellery, and little rituals that make getting ready feel like your own.</p>
          <Link className="text-link" to="/shop">Explore fashion, beauty & jewellery <ArrowRight size={17} /></Link>
          <div className="brand-story-signoff">Ajiomart <span>Curated for your everyday.</span></div>
        </div>
      </section>

      <section className="home-service-strip" data-reveal>
        <div><Sparkles size={19} /><span><strong>Style + beauty + jewellery</strong>One thoughtful edit</span></div>
        <div><Truck size={20} /><span><strong>Order tracking</strong>From dispatch to doorstep</span></div>
        <Link to="/shop">Find your next favourite <ArrowRight size={17} /></Link>
      </section>
    </>
  );
}
