create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text unique,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (
    category in ('Dresses', 'Co-ords', 'Makeup', 'Skincare', 'Fragrance', 'Handbags', 'Footwear', 'Accessories')
  ),
  price numeric(12, 2) not null check (price >= 0),
  original_price numeric(12, 2) check (original_price is null or original_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  rating numeric(2, 1) not null default 4.5 check (rating >= 0 and rating <= 5),
  badge text,
  colors text[] not null default '{}'::text[],
  sizes text[] not null default '{}'::text[],
  image_urls text[] not null default '{}'::text[],
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  landmark text,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  cod_charges numeric(12, 2) not null default 0 check (cod_charges >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  payment_method text not null check (payment_method in ('UPI', 'Card', 'Cash on Delivery', 'Online Payment')),
  status text not null default 'placed' check (
    status in ('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')
  ),
  courier_partner text not null default 'Ajiomart Express',
  tracking_number text,
  tracking_url text,
  tracking_note text not null default 'Order placed. Packing will begin soon.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  category text,
  selected_color text,
  selected_size text,
  quantity integer not null check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  selected_color text not null,
  selected_size text not null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id, selected_size, selected_color)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone),
    'customer'
  )
  on conflict (id) do update
  set
    name = coalesce(excluded.name, public.profiles.name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Older Auth accounts may predate the profile trigger. Backfill them so
-- orders.user_id always points to an existing public.profiles row.
insert into public.profiles (id, name, email, phone, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'name', ''),
  email,
  coalesce(raw_user_meta_data ->> 'phone', phone),
  'customer'
from auth.users
on conflict (id) do update
set
  name = case
    when public.profiles.name = '' then excluded.name
    else public.profiles.name
  end,
  email = coalesce(public.profiles.email, excluded.email),
  phone = coalesce(public.profiles.phone, excluded.phone);

create or replace function public.admin_delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can delete orders';
  end if;

  delete from public.orders
  where id = p_order_id;
end;
$$;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = 'customer');

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
on public.profiles for select
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
using (active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
on public.orders for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
on public.orders for select
using (auth.uid() = user_id);

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders for select
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete orders" on public.orders;
create policy "Admins can delete orders"
on public.orders for delete
using (public.is_admin(auth.uid()));

drop policy if exists "Users can insert order items for own orders" on public.order_items;
create policy "Users can insert order items for own orders"
on public.order_items for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own order items" on public.order_items;
create policy "Users can view own order items"
on public.order_items for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all order items" on public.order_items;
create policy "Admins can view all order items"
on public.order_items for select
using (public.is_admin(auth.uid()));

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items"
on public.order_items for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "Users can manage own cart" on public.cart_items;
create policy "Users can manage own cart"
on public.cart_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update, delete on public.cart_items to authenticated;

drop policy if exists "Public product image access" on storage.objects;
create policy "Public product image access"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins can manage product images" on storage.objects;
create policy "Admins can manage product images"
on storage.objects for all
using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

insert into public.products (
  slug,
  name,
  category,
  price,
  original_price,
  stock,
  rating,
  badge,
  colors,
  sizes,
  image_urls,
  description
)
values
(
  'linen-wrap-dress',
  'Linen Wrap Midi Dress',
  'Dresses',
  3499,
  4299,
  18,
  4.8,
  'Bestseller',
  array['Ivory', 'Rose', 'Sage'],
  array['XS', 'S', 'M', 'L', 'XL'],
  array[
    'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=80'
  ],
  'A softly structured midi dress with a tie waist, breathable linen blend, and a graceful day-to-dinner shape.'
),
(
  'satin-evening-dress',
  'Satin Evening Slip Dress',
  'Dresses',
  4999,
  6299,
  9,
  4.7,
  'Party Edit',
  array['Plum', 'Champagne', 'Black'],
  array['S', 'M', 'L'],
  array[
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1400&q=80'
  ],
  'Fluid satin, fine straps, and a bias silhouette made for evenings, receptions, and dressed-up plans.'
),
(
  'city-coord-set',
  'City Tailored Co-ord Set',
  'Co-ords',
  4299,
  5299,
  14,
  4.6,
  'New',
  array['Taupe', 'Navy', 'Cocoa'],
  array['XS', 'S', 'M', 'L'],
  array[
    'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1400&q=80'
  ],
  'A tailored sleeveless vest and wide-leg trouser set designed for office days, travel, and polished weekends.'
),
(
  'glow-serum-kit',
  'Radiance Serum Ritual Kit',
  'Skincare',
  2199,
  2799,
  26,
  4.9,
  'Glow Pick',
  array['Daily Glow'],
  array['30 ml'],
  array[
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1400&q=80'
  ],
  'A lightweight serum and hydration duo for brighter-looking skin before makeup or bedtime.'
),
(
  'velvet-lip-set',
  'Velvet Matte Lip Wardrobe',
  'Makeup',
  1699,
  2299,
  31,
  4.8,
  'Shade Set',
  array['Nude', 'Berry', 'Coral', 'Brick'],
  array['Set of 4'],
  array[
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=80'
  ],
  'Four smooth matte lip shades with a soft-focus finish for workdays, brunch, and evening looks.'
),
(
  'compact-crossbody',
  'Compact Crossbody Bag',
  'Handbags',
  2899,
  3599,
  20,
  4.5,
  'Everyday',
  array['Tan', 'Olive', 'Black'],
  array['One size'],
  array[
    'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80'
  ],
  'A clean crossbody with structured panels, zip pockets, and a strap that moves easily from day to night.'
),
(
  'cloud-sneakers',
  'Cloud Walk Sneakers',
  'Footwear',
  3199,
  3999,
  17,
  4.6,
  'Comfort',
  array['White', 'Blush', 'Graphite'],
  array['36', '37', '38', '39', '40'],
  array[
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1400&q=80'
  ],
  'Lightweight sneakers with cushioned soles for shopping days, commutes, and casual dresses.'
),
(
  'signature-fragrance',
  'Bloom Mist Eau de Parfum',
  'Fragrance',
  2499,
  3299,
  12,
  4.7,
  'Fresh',
  array['Floral Amber'],
  array['50 ml'],
  array[
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=80'
  ],
  'A bright floral fragrance with amber warmth, made to feel fresh at first spray and soft by evening.'
)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  original_price = excluded.original_price,
  stock = excluded.stock,
  rating = excluded.rating,
  badge = excluded.badge,
  colors = excluded.colors,
  sizes = excluded.sizes,
  image_urls = excluded.image_urls,
  description = excluded.description,
  active = true,
  updated_at = now();

-- After creating an admin user through Supabase Auth, promote it with:
-- update public.profiles set role = 'admin' where email = 'admin@ajiomart.com';
