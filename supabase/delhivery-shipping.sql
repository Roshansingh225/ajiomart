-- Run after schema.sql and razorpay-payments.sql.
-- Shipment creation and tracking are performed by authenticated Edge Functions.

alter table public.products
  add column if not exists hsn_code text not null default '';

alter table public.orders
  add column if not exists delhivery_status text,
  add column if not exists delhivery_tracking_events jsonb not null default '[]'::jsonb,
  add column if not exists package_weight_g integer,
  add column if not exists package_length_cm numeric(8, 2),
  add column if not exists package_width_cm numeric(8, 2),
  add column if not exists package_height_cm numeric(8, 2),
  add column if not exists e_waybill text;

alter table public.orders
  drop constraint if exists orders_delhivery_tracking_events_array_check,
  add constraint orders_delhivery_tracking_events_array_check
    check (jsonb_typeof(delhivery_tracking_events) = 'array');

alter table public.orders
  drop constraint if exists orders_package_dimensions_positive_check,
  add constraint orders_package_dimensions_positive_check
    check (
      (package_weight_g is null or package_weight_g > 0)
      and (package_length_cm is null or package_length_cm > 0)
      and (package_width_cm is null or package_width_cm > 0)
      and (package_height_cm is null or package_height_cm > 0)
    );
