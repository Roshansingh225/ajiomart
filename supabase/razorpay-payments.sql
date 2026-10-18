-- Run after schema.sql and stock-management.sql.
-- Online orders are created only after the Razorpay payment is verified server-side.

alter table public.orders
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check
  check (payment_method in ('UPI', 'Card', 'Cash on Delivery', 'Online Payment'));

alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders
  add constraint orders_payment_status_check
  check (payment_status in ('not_required', 'paid'));

create unique index if not exists orders_razorpay_payment_id_key
  on public.orders (razorpay_payment_id)
  where razorpay_payment_id is not null;

create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  amount bigint not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  shipping jsonb not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'completed', 'refund_pending')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.payment_sessions enable row level security;

create or replace function public.enforce_order_payment_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.payment_method = 'Cash on Delivery' then
    if new.payment_status <> 'not_required'
      or new.razorpay_order_id is not null
      or new.razorpay_payment_id is not null then
      raise exception 'INVALID_COD_PAYMENT_STATE' using errcode = '23514';
    end if;
  elsif new.payment_method = 'Online Payment' then
    if new.payment_status <> 'paid'
      or new.razorpay_order_id is null
      or new.razorpay_payment_id is null then
      raise exception 'PAYMENT_NOT_VERIFIED' using errcode = '23514';
    end if;
  else
    raise exception 'UNSUPPORTED_PAYMENT_METHOD' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_payment_state on public.orders;
create trigger orders_enforce_payment_state
before insert on public.orders
for each row execute function public.enforce_order_payment_state();

create or replace function public.complete_razorpay_order(
  p_session_id uuid,
  p_razorpay_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.payment_sessions%rowtype;
  v_order public.orders%rowtype;
  v_total numeric(12, 2);
  v_result jsonb;
begin
  select * into v_session
  from public.payment_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'PAYMENT_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_session.status = 'completed' then
    if v_session.razorpay_payment_id <> p_razorpay_payment_id then
      raise exception 'PAYMENT_SESSION_ALREADY_COMPLETED' using errcode = '23505';
    end if;

    select * into v_order from public.orders where id = v_session.order_id;
    select jsonb_build_object(
      'order', to_jsonb(v_order),
      'order_items', coalesce(
        (select jsonb_agg(to_jsonb(item) order by item.created_at, item.id)
         from public.order_items as item where item.order_id = v_order.id),
        '[]'::jsonb
      ),
      'stocks', coalesce(
        (select jsonb_agg(jsonb_build_object('id', product.id, 'stock', product.stock) order by product.id)
         from public.products as product
         where product.id in (
           select item.product_id
           from public.order_items as item where item.order_id = v_order.id
         )),
        '[]'::jsonb
      )
    ) into v_result;
    return v_result;
  end if;

  if v_session.status <> 'pending' or p_razorpay_payment_id is null then
    raise exception 'PAYMENT_SESSION_NOT_PENDING' using errcode = '22023';
  end if;

  insert into public.profiles (id)
  values (v_session.user_id)
  on conflict (id) do nothing;

  if jsonb_array_length(v_session.items) = 0 or exists (
    select 1
    from jsonb_to_recordset(v_session.items) as item(product_id uuid, quantity integer)
    where item.product_id is null or item.quantity is null or item.quantity <= 0
  ) then
    raise exception 'INVALID_ORDER_ITEMS' using errcode = '22023';
  end if;

  perform product.id
  from public.products as product
  join (
    select item.product_id, sum(item.quantity)::bigint as quantity
    from jsonb_to_recordset(v_session.items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) as requested on requested.product_id = product.id
  order by product.id
  for update of product;

  if exists (
    select 1
    from (
      select item.product_id, sum(item.quantity)::bigint as quantity
      from jsonb_to_recordset(v_session.items) as item(product_id uuid, quantity integer)
      group by item.product_id
    ) as requested
    left join public.products as product on product.id = requested.product_id
    where product.id is null
      or product.active is not true
      or product.stock < requested.quantity
  ) then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  select coalesce(sum(product.price * item.quantity), 0)::numeric(12, 2)
  into v_total
  from jsonb_to_recordset(v_session.items) as item(product_id uuid, quantity integer)
  join public.products as product on product.id = item.product_id;

  if round(v_total * 100)::bigint <> v_session.amount then
    raise exception 'PAYMENT_AMOUNT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.orders (
    user_id,
    customer_name,
    customer_phone,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    landmark,
    total,
    payment_method,
    payment_status,
    razorpay_order_id,
    razorpay_payment_id,
    status,
    tracking_note
  )
  values (
    v_session.user_id,
    trim(v_session.shipping ->> 'customer_name'),
    trim(v_session.shipping ->> 'customer_phone'),
    trim(v_session.shipping ->> 'address_line1'),
    nullif(trim(v_session.shipping ->> 'address_line2'), ''),
    trim(v_session.shipping ->> 'city'),
    trim(v_session.shipping ->> 'state'),
    v_session.shipping ->> 'postal_code',
    nullif(trim(v_session.shipping ->> 'landmark'), ''),
    v_total,
    'Online Payment',
    'paid',
    v_session.razorpay_order_id,
    p_razorpay_payment_id,
    'confirmed',
    'Payment received. Your order is confirmed and will be packed soon.'
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    category,
    selected_color,
    selected_size,
    quantity,
    price,
    image_url
  )
  select
    v_order.id,
    product.id,
    product.name,
    product.category,
    item.selected_color,
    item.selected_size,
    item.quantity,
    product.price,
    product.image_urls[1]
  from jsonb_to_recordset(v_session.items) as item(
    product_id uuid,
    quantity integer,
    selected_color text,
    selected_size text
  )
  join public.products as product on product.id = item.product_id;

  update public.products as product
  set stock = product.stock - requested.quantity
  from (
    select item.product_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(v_session.items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) as requested
  where product.id = requested.product_id;

  update public.payment_sessions
  set status = 'completed',
      razorpay_payment_id = p_razorpay_payment_id,
      order_id = v_order.id
  where id = v_session.id;

  select jsonb_build_object(
    'order', to_jsonb(v_order),
    'order_items', coalesce(
      (select jsonb_agg(to_jsonb(item) order by item.created_at, item.id)
       from public.order_items as item where item.order_id = v_order.id),
      '[]'::jsonb
    ),
    'stocks', coalesce(
      (select jsonb_agg(jsonb_build_object('id', product.id, 'stock', product.stock) order by product.id)
       from public.products as product
       where product.id in (
         select item.product_id
         from jsonb_to_recordset(v_session.items) as item(product_id uuid)
       )),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.complete_razorpay_order(uuid, text) from public;
revoke all on function public.complete_razorpay_order(uuid, text) from anon;
revoke all on function public.complete_razorpay_order(uuid, text) from authenticated;
grant execute on function public.complete_razorpay_order(uuid, text) to service_role;
