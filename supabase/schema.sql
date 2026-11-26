-- Smart Deals initial database schema (Saudi Arabia first)
create extension if not exists pgcrypto;

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_ar text not null,
  name_en text not null,
  currency_code text not null,
  currency_symbol text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true,
  unique(country_id, name_en)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id),
  name text not null,
  website_url text,
  logo_url text,
  source_type text not null default 'manual' check (source_type in ('manual','affiliate_api','feed','permitted_crawler')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id),
  city_id uuid references public.cities(id),
  store_id uuid not null references public.stores(id),
  category_id uuid references public.categories(id),
  title text not null,
  description text,
  image_url text,
  product_url text,
  current_price numeric(12,2),
  old_price numeric(12,2),
  currency_code text not null default 'SAR',
  discount_percent numeric(5,2),
  starts_at timestamptz,
  ends_at timestamptz,
  source_url text,
  source_type text not null default 'manual' check (source_type in ('manual','affiliate_api','feed','permitted_crawler')),
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','expired')),
  is_verified boolean not null default false,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_prices check (current_price is null or current_price >= 0),
  constraint valid_old_price check (old_price is null or old_price >= 0)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id),
  store_id uuid not null references public.stores(id),
  code text,
  title text not null,
  description text,
  discount_text text,
  terms text,
  coupon_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'pending_review' check (status in ('pending_review','published','rejected','expired')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  price numeric(12,2) not null,
  currency_code text not null,
  observed_at timestamptz not null default now(),
  source_url text
);

create index if not exists offers_public_listing_idx on public.offers(country_id, status, ends_at);
create index if not exists offers_category_idx on public.offers(category_id, status);
create index if not exists coupons_public_listing_idx on public.coupons(country_id, status, ends_at);
create index if not exists price_history_offer_date_idx on public.price_history(offer_id, observed_at desc);

alter table public.countries enable row level security;
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.offers enable row level security;
alter table public.coupons enable row level security;
alter table public.price_history enable row level security;

create policy "active countries are public" on public.countries for select using (is_active = true);
create policy "active cities are public" on public.cities for select using (is_active = true);
create policy "active categories are public" on public.categories for select using (is_active = true);
create policy "active stores are public" on public.stores for select using (is_active = true);
create policy "published valid offers are public" on public.offers for select using (
  status = 'published' and (ends_at is null or ends_at > now())
);
create policy "published valid coupons are public" on public.coupons for select using (
  status = 'published' and (ends_at is null or ends_at > now())
);
create policy "price history for published offers is public" on public.price_history for select using (
  exists (select 1 from public.offers o where o.id = offer_id and o.status = 'published')
);

-- No public insert/update/delete policies are intentionally provided.
-- Admin writes must be implemented server-side after role/auth checks.
insert into public.countries(code,name_ar,name_en,currency_code,currency_symbol)
values ('SA','السعودية','Saudi Arabia','SAR','ر.س')
on conflict (code) do nothing;

insert into public.categories(slug,name_ar,name_en,sort_order) values
('groceries','مواد غذائية','Groceries',1),
('electronics','إلكترونيات','Electronics',2),
('home','المنزل والمطبخ','Home & Kitchen',3),
('fashion','الأزياء','Fashion',4),
('beauty','الجمال والعناية','Beauty',5),
('travel','السفر','Travel',6),
('services','خدمات واشتراكات','Services',7),
('automotive','السيارات','Automotive',8),
('sports','رياضة وترفيه','Sports & Leisure',9),
('other','أخرى','Other',10)
on conflict (slug) do nothing;
