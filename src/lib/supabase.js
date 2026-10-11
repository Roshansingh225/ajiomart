import { createClient } from '@supabase/supabase-js';
import { normalizeProduct } from './catalog.js';

const supabaseUrl =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function dbProductToProduct(product) {
  if (!product) return product;

  return normalizeProduct({
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    originalPrice: product.original_price,
    stock: product.stock,
    rating: product.rating,
    badge: product.badge,
    colors: product.colors || [],
    sizes: product.sizes || [],
    imageUrls: product.image_urls || [],
    description: product.description,
    active: product.active,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  });
}

export function productToDbProduct(product) {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: Number(product.price || 0),
    original_price: Number(product.originalPrice || product.price || 0),
    stock: Number(product.stock || 0),
    rating: Number(product.rating || 4.5),
    badge: product.badge || null,
    colors: product.colors || [],
    sizes: product.sizes || [],
    image_urls: product.imageUrls || [],
    description: product.description || '',
    active: product.active ?? true,
  };
}

export function dbOrderToOrder(order) {
  if (!order) return order;

  return {
    id: order.id,
    userId: order.user_id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    address: {
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      addressLine1: order.address_line1,
      addressLine2: order.address_line2 || '',
      city: order.city,
      state: order.state,
      postalCode: order.postal_code,
      landmark: order.landmark || '',
    },
    items: (order.order_items || []).map((item) => ({
      cartKey: item.id,
      id: item.product_id,
      name: item.product_name,
      category: item.category,
      color: item.selected_color,
      size: item.selected_size,
      quantity: item.quantity,
      price: Number(item.price || 0),
      imageUrl: item.image_url,
    })),
    total: Number(order.total || 0),
    paymentMethod: order.payment_method,
    status: order.status,
    courierPartner: order.courier_partner,
    trackingNumber: order.tracking_number || '',
    trackingUrl: order.tracking_url || '',
    trackingNote: order.tracking_note || '',
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}
