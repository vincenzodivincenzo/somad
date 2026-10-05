-- SOMAD · lista de espera (CRM)
-- Pega este archivo entero en Supabase → SQL Editor → Run.
-- Antes de ejecutar, cambia CAMBIA-ESTA-CLAVE por una clave larga (es la "clave de lista de espera" del panel).

create schema if not exists private;

create table if not exists private.settings (
  key   text primary key,
  value text not null
);

insert into private.settings (key, value)
values ('admin_key', 'CAMBIA-ESTA-CLAVE')
on conflict (key) do update set value = excluded.value;

-- true cuando la petición trae la cabecera x-admin-key correcta
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce(current_setting('request.headers', true)::json ->> 'x-admin-key', '') <> ''
     and coalesce(current_setting('request.headers', true)::json ->> 'x-admin-key', '')
         = (select value from private.settings where key = 'admin_key');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text,
  phone        text,
  level        text,
  interest     text,
  people       int default 1,
  message      text,
  consent      boolean not null default false,
  source       text default 'web',
  status       text not null default 'nuevo',   -- nuevo | contactado | reservado | descartado
  notes        text,
  contacted_at timestamptz,
  updated_at   timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;

drop policy if exists "web insert" on public.leads;
create policy "web insert" on public.leads
  for insert to anon, authenticated
  with check (
    char_length(name) between 2 and 120
    and coalesce(char_length(message), 0) <= 2000
    and status = 'nuevo'
    and consent = true
  );

drop policy if exists "admin select" on public.leads;
create policy "admin select" on public.leads for select to anon, authenticated using (public.is_admin());

drop policy if exists "admin update" on public.leads;
create policy "admin update" on public.leads for update to anon, authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete" on public.leads;
create policy "admin delete" on public.leads for delete to anon, authenticated using (public.is_admin());

grant usage on schema public to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to anon, authenticated;

-- ───────── Reservas
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  trip_id      text not null,
  trip_title   text not null,
  trip_date    text,
  name         text not null,
  email        text,
  phone        text,
  level        text,
  people       int not null default 1,
  message      text,
  consent      boolean not null default false,
  status       text not null default 'solicitada',  -- solicitada | confirmada | pagada | cancelada
  notes        text,
  updated_at   timestamptz not null default now()
);

create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists bookings_trip_idx on public.bookings (trip_id);

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
for each row execute function public.touch_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "web insert" on public.bookings;
create policy "web insert" on public.bookings
  for insert to anon, authenticated
  with check (
    char_length(name) between 2 and 120
    and char_length(trip_id) between 1 and 120
    and people between 1 and 20
    and coalesce(char_length(message), 0) <= 2000
    and status = 'solicitada'
    and consent = true
  );

drop policy if exists "admin select" on public.bookings;
create policy "admin select" on public.bookings for select to anon, authenticated using (public.is_admin());
drop policy if exists "admin update" on public.bookings;
create policy "admin update" on public.bookings for update to anon, authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.bookings;
create policy "admin delete" on public.bookings for delete to anon, authenticated using (public.is_admin());

grant insert on public.bookings to anon, authenticated;
grant select, update, delete on public.bookings to anon, authenticated;

-- Plazas ocupadas por viaje (sólo el agregado; lo usa la web para mostrar "X plazas libres")
create or replace function public.trip_counts()
returns table (trip_id text, taken bigint)
language sql
stable
security definer
set search_path = public
as $$
  select trip_id, coalesce(sum(people), 0)::bigint
  from public.bookings
  where status <> 'cancelada'
  group by trip_id;
$$;
grant execute on function public.trip_counts() to anon, authenticated;
