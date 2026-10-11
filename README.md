# Ajiomart

A fresh fashion and cosmetics ecommerce website built with React and Vite.

## Features

- Fashion and beauty storefront for dresses, cosmetics, handbags, footwear, and accessories
- Product search, filters, product detail galleries, cart, checkout, and order history
- Local demo authentication with admin and customer accounts
- Admin panel for product management, order status updates, tracking details, and sales overview
- Persistent demo data through browser localStorage

## Demo Login

Admin:

```txt
admin@ajiomart.com
admin123
```

Customer:

```txt
customer@ajiomart.com
customer123
```

## Run

```bash
npm install
npm run dev
```

## Supabase Environment

Create `.env.local` with your Supabase browser-safe values:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://dsvtddkfgkszwjfhgavo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Q3ajjZiPhk3ZFHmTyqnuyQ_S-f2JOcu
```

This Vite app supports the `NEXT_PUBLIC_` names above and will use Supabase Auth, products, orders, and admin updates when they are present. Without them, it falls back to local demo storage.

## Supabase SQL

Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor to create:

- `profiles`, `products`, `orders`, and `order_items`
- admin helper functions and auth profile trigger
- row-level security policies
- public `product-images` storage bucket
- seeded fashion, cosmetics, skincare, handbag, footwear, and fragrance products

After creating an admin user in Supabase Auth, promote it:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@ajiomart.com';
```
