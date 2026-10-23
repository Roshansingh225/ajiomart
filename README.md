# Ajiomart

A fresh fashion and cosmetics ecommerce website built with React and Vite.

## Features

- Fashion and beauty storefront for dresses, cosmetics, handbags, footwear, and accessories
- Product search, filters, product detail galleries, cart, checkout, and order history
- Account signup and login with Supabase Auth, with browser storage available when Supabase is not configured
- Admin panel for product management, order status updates, tracking details, and sales overview
- Persistent cart and locally stored data when Supabase is not configured

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

This Vite app supports the `NEXT_PUBLIC_` names above and will use Supabase Auth, products, orders, and admin updates when they are present. Without them, account, product, and order data use browser storage.

## Supabase SQL

Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor to create:

- `profiles`, `products`, `orders`, and `order_items`
- admin helper functions and auth profile trigger
- row-level security policies
- public `product-images` storage bucket
- seeded fashion, cosmetics, skincare, handbag, footwear, and fragrance products

For an existing Supabase setup, run [supabase/fix-orders-user-profile.sql](./supabase/fix-orders-user-profile.sql) once if checkout reports `orders_user_id_fkey`. It adds missing profile rows for existing Auth users and leaves existing roles untouched.

After creating an admin user in Supabase Auth, promote it:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@ajiomart.com';
```

## Delhivery Shipping

Run [supabase/delhivery-shipping.sql](./supabase/delhivery-shipping.sql) in the Supabase SQL Editor after the schema and Razorpay SQL. Deploy the `delhivery-create-shipment` and `delhivery-track-shipment` Edge Functions. Set the following as Supabase Edge Function secrets only; never add the Delhivery API token to `.env.local`, Vercel browser variables, or frontend code:

```txt
DELHIVERY_API_TOKEN=<Delhivery API token>
DELHIVERY_ENV=production
DELHIVERY_CLIENT_NAME=<exact registered Delhivery client name>
DELHIVERY_PICKUP_LOCATION=<exact registered warehouse name, including case>
```

Deploy with `npx supabase functions deploy delhivery-create-shipment delhivery-track-shipment --project-ref <project-ref>`.

If seller identity/GST is not already configured in Delhivery, also set `DELHIVERY_SELLER_NAME`, `DELHIVERY_SELLER_ADDRESS`, and `DELHIVERY_SELLER_GSTIN` as Edge Function secrets. In Admin, add an HSN code to each product and enter packed weight and parcel dimensions on each order before creating its live shipment. Add an E-way bill for orders above ₹50,000. The shipment button is admin-only and asks for confirmation. Customers and admins can refresh Delhivery scan history from order tracking.
