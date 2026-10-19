-- Run once in the Supabase SQL Editor after schema.sql.
-- Orders and inventory changes are committed atomically by this function.

alter table public.orders
  add column if not exists subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  add column if not exists discount numeric(12, 2) not null default 0 check (discount >= 0),
  add column if not exists cod_charges numeric(12, 2) not null default 0 check (cod_charges >= 0);

update public.orders
set subtotal = total
where subtotal = 0 and total > 0;

create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_address_line1 text,
  p_address_line2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_landmark text,
  p_payment_method text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2) := 0;
  v_cod_charges numeric(12, 2) := 20;
  v_total numeric(12, 2);
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  insert into public.profiles (id)
  values (v_user_id)
  on conflict (id) do nothing;

  if coalesce(trim(p_customer_name), '') = ''
    or coalesce(trim(p_customer_phone), '') = ''
    or coalesce(trim(p_address_line1), '') = ''
    or coalesce(trim(p_city), '') = ''
    or coalesce(trim(p_state), '') = ''
    or p_postal_code is null
    or p_postal_code !~ '^[0-9]{6}$' then
    raise exception 'INVALID_SHIPPING_DETAILS' using errcode = '22023';
  end if;

  if p_payment_method is distinct from 'Cash on Delivery' then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'INVALID_ORDER_ITEMS' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    where item.product_id is null or item.quantity is null or item.quantity <= 0
  ) then
    raise exception 'INVALID_ORDER_ITEMS' using errcode = '22023';
  end if;

  perform product.id
  from public.products as product
  join (
    select item.product_id, sum(item.quantity)::bigint as quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) as requested on requested.product_id = product.id
  order by product.id
  for update of product;

  if exists (
    select 1
    from (
      select item.product_id, sum(item.quantity)::bigint as quantity
      from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
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
  into v_subtotal
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  join public.products as product on product.id = item.product_id;

  v_total := v_subtotal + v_cod_charges;

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
    subtotal,
    discount,
    cod_charges,
    total,
    payment_method
  )
  values (
    v_user_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_address_line1),
    nullif(trim(p_address_line2), ''),
    trim(p_city),
    trim(p_state),
    p_postal_code,
    nullif(trim(p_landmark), ''),
    v_subtotal,
    v_discount,
    v_cod_charges,
    v_total,
    p_payment_method
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
  from jsonb_to_recordset(p_items) as item(
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
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) as requested
  where product.id = requested.product_id;

  delete from public.cart_items
  where user_id = v_user_id;

  select jsonb_build_object(
    'order', to_jsonb(v_order),
    'order_items', coalesce(
      (
        select jsonb_agg(to_jsonb(order_item) order by order_item.created_at, order_item.id)
        from public.order_items as order_item
        where order_item.order_id = v_order.id
      ),
      '[]'::jsonb
    ),
    'stocks', coalesce(
      (
        select jsonb_agg(jsonb_build_object('id', product.id, 'stock', product.stock) order by product.id)
        from public.products as product
        where product.id in (
          select item.product_id
          from jsonb_to_recordset(p_items) as item(product_id uuid)
        )
      ),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.place_order(text, text, text, text, text, text, text, text, text, jsonb) from public;
revoke all on function public.place_order(text, text, text, text, text, text, text, text, text, jsonb) from anon;
grant execute on function public.place_order(text, text, text, text, text, text, text, text, text, jsonb) to authenticated;

drop policy if exists "Users can insert own orders" on public.orders;
drop policy if exists "Users can insert order items for own orders" on public.order_items;
