-- Repair profiles for Auth users created before the profile trigger was active.
-- Existing profile data and roles are preserved.
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
