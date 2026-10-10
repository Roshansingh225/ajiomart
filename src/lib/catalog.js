export const STORAGE_KEYS = {
  products: 'ajiomart-products',
  orders: 'ajiomart-orders',
  cart: 'ajiomart-cart',
  users: 'ajiomart-users',
  session: 'ajiomart-session',
};

export const categories = [
  'Dresses',
  'Co-ords',
  'Makeup',
  'Skincare',
  'Fragrance',
  'Handbags',
  'Footwear',
  'Accessories',
];

export const orderStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export const demoUsers = [
  {
    id: 'admin-demo',
    name: 'Ajiomart Admin',
    email: 'admin@ajiomart.com',
    password: 'admin123',
    phone: '+91 98765 00001',
    role: 'admin',
  },
  {
    id: 'customer-demo',
    name: 'Meera Kapoor',
    email: 'customer@ajiomart.com',
    password: 'customer123',
    phone: '+91 98765 00002',
    role: 'customer',
  },
];

export const initialProducts = [
  {
    id: 'linen-wrap-dress',
    name: 'Linen Wrap Midi Dress',
    category: 'Dresses',
    price: 3499,
    originalPrice: 4299,
    stock: 18,
    rating: 4.8,
    badge: 'Bestseller',
    colors: ['Ivory', 'Rose', 'Sage'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    imageUrls: [
      'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'A softly structured midi dress with a tie waist, breathable linen blend, and a graceful day-to-dinner shape.',
  },
  {
    id: 'satin-evening-dress',
    name: 'Satin Evening Slip Dress',
    category: 'Dresses',
    price: 4999,
    originalPrice: 6299,
    stock: 9,
    rating: 4.7,
    badge: 'Party Edit',
    colors: ['Plum', 'Champagne', 'Black'],
    sizes: ['S', 'M', 'L'],
    imageUrls: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Fluid satin, fine straps, and a bias silhouette made for evenings, receptions, and dressed-up plans.',
  },
  {
    id: 'city-coord-set',
    name: 'City Tailored Co-ord Set',
    category: 'Co-ords',
    price: 4299,
    originalPrice: 5299,
    stock: 14,
    rating: 4.6,
    badge: 'New',
    colors: ['Taupe', 'Navy', 'Cocoa'],
    sizes: ['XS', 'S', 'M', 'L'],
    imageUrls: [
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'A tailored sleeveless vest and wide-leg trouser set designed for office days, travel, and polished weekends.',
  },
  {
    id: 'glow-serum-kit',
    name: 'Radiance Serum Ritual Kit',
    category: 'Skincare',
    price: 2199,
    originalPrice: 2799,
    stock: 26,
    rating: 4.9,
    badge: 'Glow Pick',
    colors: ['Daily Glow'],
    sizes: ['30 ml'],
    imageUrls: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'A lightweight serum and hydration duo for brighter-looking skin before makeup or bedtime.',
  },
  {
    id: 'velvet-lip-set',
    name: 'Velvet Matte Lip Wardrobe',
    category: 'Makeup',
    price: 1699,
    originalPrice: 2299,
    stock: 31,
    rating: 4.8,
    badge: 'Shade Set',
    colors: ['Nude', 'Berry', 'Coral', 'Brick'],
    sizes: ['Set of 4'],
    imageUrls: [
      'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Four smooth matte lip shades with a soft-focus finish for workdays, brunch, and evening looks.',
  },
  {
    id: 'compact-crossbody',
    name: 'Compact Crossbody Bag',
    category: 'Handbags',
    price: 2899,
    originalPrice: 3599,
    stock: 20,
    rating: 4.5,
    badge: 'Everyday',
    colors: ['Tan', 'Olive', 'Black'],
    sizes: ['One size'],
    imageUrls: [
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'A clean crossbody with structured panels, zip pockets, and a strap that moves easily from day to night.',
  },
  {
    id: 'cloud-sneakers',
    name: 'Cloud Walk Sneakers',
    category: 'Footwear',
    price: 3199,
    originalPrice: 3999,
    stock: 17,
    rating: 4.6,
    badge: 'Comfort',
    colors: ['White', 'Blush', 'Graphite'],
    sizes: ['36', '37', '38', '39', '40'],
    imageUrls: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Lightweight sneakers with cushioned soles for shopping days, commutes, and casual dresses.',
  },
  {
    id: 'signature-fragrance',
    name: 'Bloom Mist Eau de Parfum',
    category: 'Fragrance',
    price: 2499,
    originalPrice: 3299,
    stock: 12,
    rating: 4.7,
    badge: 'Fresh',
    colors: ['Floral Amber'],
    sizes: ['50 ml'],
    imageUrls: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'A bright floral fragrance with amber warmth, made to feel fresh at first spray and soft by evening.',
  },
];

export function makeId(prefix = 'ajiomart') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function getProductImages(product) {
  if (!product) return [];
  const fromList = Array.isArray(product.imageUrls) ? product.imageUrls.filter(Boolean) : [];
  const fallback = product.imageUrl ? [product.imageUrl] : [];
  return [...new Set([...fromList, ...fallback])];
}

export function normalizeProduct(product) {
  if (!product) return product;
  const imageUrls = getProductImages(product);
  return {
    ...product,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    price: Number(product.price || 0),
    originalPrice: Number(product.originalPrice || product.price || 0),
    stock: Number(product.stock || 0),
  };
}

export function normalizeProducts(products = []) {
  return products.map(normalizeProduct);
}

export function prettyStatus(status = 'placed') {
  return status
    .split('-')
    .join(' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
