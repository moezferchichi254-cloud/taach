-- Taach: first migration (Supabase / Postgres 15+)
-- Second-hand & vintage marketplace, Tunisia first.
--
-- Conventions
--   ids        uuid, gen_random_uuid()
--   times      timestamptz, UTC; shown in Africa/Tunis in the app
--   money      bigint MILLIMES (1 TND = 1000 millimes) + currency 'TND'
--   access     Postgres row level security. Clients (the Expo app) use the anon
--              key + the user's JWT. Anything that moves money or changes an
--              order's state runs in Edge Functions with the service role, or in
--              the security definer functions at the bottom of this file.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- unaccent() is not immutable, so wrap it for use in indexes and triggers.
create or replace function public.f_unaccent(text) returns text
  language sql immutable parallel safe strict
  as $$ select public.unaccent('public.unaccent', $1) $$;

create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------- members

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  display_name text,
  avatar_path text,
  bio text check (char_length(bio) <= 500),
  phone text unique,                         -- E.164, verified by OTP at sign up
  governorate text,                          -- one of Tunisia's 24 gouvernorats
  city text,
  locale text not null default 'fr' check (locale in ('fr','en','ar')),
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  id_verified_at timestamptz,                -- CIN checked, needed before payouts
  holiday_mode boolean not null default false,
  is_admin boolean not null default false,
  banned_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  delegation text,                           -- délégation / mu'tamadiya
  city text not null,
  governorate text not null,
  postcode text check (postcode ~ '^[0-9]{4}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.addresses (user_id);
create unique index addresses_one_default on public.addresses (user_id) where is_default;
create trigger addresses_touch before update on public.addresses
  for each row execute function public.touch_updated_at();

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index on public.follows (followed_id);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

create table public.push_tokens (
  token text primary key,                    -- Expo push token
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios','android')),
  created_at timestamptz not null default now()
);
create index on public.push_tokens (user_id);

-- ---------------------------------------------------------------- catalogue

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique,
  name_fr text not null,
  name_en text not null,
  name_ar text,
  position integer not null default 0,
  min_photos smallint not null default 1 check (min_photos between 1 and 20),
  size_group text,                           -- null = no size for this category
  -- which extra attributes the listing form shows, e.g.
  -- [{"key":"era","type":"enum","values":["pre-1950","1950s",...]},{"key":"author","type":"text"}]
  attribute_schema jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.categories (parent_id, position);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create index brands_name_trgm on public.brands using gin (public.f_unaccent(lower(name)) gin_trgm_ops);

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  size_group text not null,                  -- 'women_tops', 'shoes_eu', ...
  label text not null,
  position integer not null default 0,
  unique (size_group, label)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '' check (char_length(description) <= 3000),
  category_id uuid not null references public.categories(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,   -- null = no brand
  size_id uuid references public.sizes(id) on delete set null,
  condition text not null check (condition in
    ('new_with_tags','new_without_tags','very_good','good','satisfactory')),
  is_vintage boolean not null default false,
  colours text[] not null default '{}' check (cardinality(colours) <= 2),
  materials text[] not null default '{}' check (cardinality(materials) <= 3),
  attributes jsonb not null default '{}',    -- validated against category.attribute_schema in the API
  price_millimes bigint not null check (price_millimes >= 1000),   -- 1 TND minimum
  currency text not null default 'TND' check (currency = 'TND'),
  parcel_size text not null check (parcel_size in ('small','medium','large')),
  allow_hand_delivery boolean not null default false,
  status text not null default 'active' check (status in
    ('draft','active','reserved','sold','hidden','removed')),
  favourite_count integer not null default 0,
  view_count integer not null default 0,
  bumped_until timestamptz,
  search_vector tsvector,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.items (seller_id, status, created_at desc);
create index on public.items (category_id, status, created_at desc);
create index on public.items (brand_id);
create index on public.items (size_id);
create index items_feed on public.items (created_at desc) where status = 'active';
create index items_price on public.items (price_millimes) where status = 'active';
create index items_bumped on public.items (bumped_until) where status = 'active' and bumped_until is not null;
create index items_search on public.items using gin (search_vector);
create index items_title_trgm on public.items using gin (public.f_unaccent(lower(title)) gin_trgm_ops);
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

create or replace function public.items_search_vector() returns trigger
  language plpgsql as $$
begin
  -- 'simple' config: works for French and English without stemming surprises.
  new.search_vector :=
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(new.title,''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(new.description,''))), 'C');
  return new;
end $$;
create trigger items_search_vector before insert or update of title, description on public.items
  for each row execute function public.items_search_vector();

create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,                -- Supabase Storage, bucket 'item-photos'
  position smallint not null check (position between 0 and 19),
  width integer, height integer,
  created_at timestamptz not null default now(),
  unique (item_id, position)
);

create table public.favourites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index on public.favourites (item_id);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text,
  filters jsonb not null default '{}',
  alerts_on boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.saved_searches (user_id);
create index saved_searches_alerts on public.saved_searches (last_notified_at) where alerts_on;

create table public.bundle_discounts (
  seller_id uuid not null references public.profiles(id) on delete cascade,
  min_items smallint not null check (min_items between 2 and 10),
  percent smallint not null check (percent between 1 and 80),
  primary key (seller_id, min_items)
);

-- ---------------------------------------------------------------- messaging & offers

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  buyer_read_at timestamptz,
  seller_read_at timestamptz,
  created_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);
create unique index conversations_one_per_item
  on public.conversations (item_id, buyer_id) where item_id is not null;
create index on public.conversations (buyer_id, last_message_at desc);
create index on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,   -- null = system message
  kind text not null default 'text' check (kind in ('text','image','offer','order_event','system')),
  body text check (char_length(body) <= 2000),
  payload jsonb not null default '{}',       -- offer_id / order_id / image path
  flagged boolean not null default false,    -- e.g. phone number or "pay me outside the app"
  created_at timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  item_ids uuid[] not null check (cardinality(item_ids) between 1 and 20),
  list_price_millimes bigint not null,       -- snapshot of the price(s) when the offer was made
  amount_millimes bigint not null,
  currency text not null default 'TND' check (currency = 'TND'),
  parent_offer_id uuid references public.offers(id) on delete set null,   -- counter-offer chain
  status text not null default 'pending' check (status in
    ('pending','accepted','declined','countered','expired','used')),
  expires_at timestamptz not null default now() + interval '48 hours',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (amount_millimes > 0 and amount_millimes <= list_price_millimes),
  check (amount_millimes * 10 >= list_price_millimes * 6)   -- at most 40% below
);
create index on public.offers (conversation_id, created_at);
create index offers_pending on public.offers (expires_at) where status = 'pending';

-- ---------------------------------------------------------------- orders, delivery, money

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  offer_id uuid references public.offers(id) on delete set null,
  items_millimes bigint not null check (items_millimes > 0),
  bundle_discount_millimes bigint not null default 0 check (bundle_discount_millimes >= 0),
  buyer_fee_millimes bigint not null check (buyer_fee_millimes >= 0),
  shipping_millimes bigint not null check (shipping_millimes >= 0),
  total_millimes bigint not null,
  currency text not null default 'TND' check (currency = 'TND'),
  payment_method text not null check (payment_method in ('cod','konnect','flouci')),
  delivery_method text not null check (delivery_method in ('courier','hand')),
  shipping_address jsonb,                    -- snapshot; null for hand delivery
  status text not null default 'pending' check (status in (
    'pending',          -- online payment started, not confirmed yet
    'confirmed',        -- paid online, or COD order accepted: seller must ship
    'shipped',          -- courier picked it up
    'delivered',        -- delivered (COD: cash collected by the courier)
    'completed',        -- buyer confirmed, or the 2-day window passed
    'cancelled',        -- before shipping (seller late, buyer/seller cancelled, payment failed)
    'refused',          -- COD buyer refused at the door; parcel returns to the seller
    'disputed',         -- claim open
    'refunded')),
  ship_by timestamptz,                       -- confirmed_at + 5 days
  confirmed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  completes_at timestamptz,                  -- delivered_at + 2 days unless a claim is opened
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id),
  check (total_millimes = items_millimes - bundle_discount_millimes + buyer_fee_millimes + shipping_millimes),
  check (delivery_method = 'hand' or shipping_address is not null)
);
create index on public.orders (buyer_id, created_at desc);
create index on public.orders (seller_id, created_at desc);
create index on public.orders (offer_id);
create index orders_ship_by on public.orders (ship_by) where status = 'confirmed';
create index orders_completes on public.orders (completes_at) where status = 'delivered';
create index orders_pending on public.orders (created_at) where status = 'pending';
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  price_millimes bigint not null,            -- snapshot
  title text not null,                       -- snapshot
  is_active boolean not null default true,   -- false once the order is cancelled/refused/refunded
  primary key (order_id, item_id)
);
-- The race guard: an item can belong to at most one live order.
create unique index order_items_one_live_order on public.order_items (item_id) where is_active;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null check (provider in ('cod','konnect','flouci')),
  provider_ref text,                         -- Konnect paymentRef / Flouci payment_id / courier COD ref
  amount_millimes bigint not null,
  currency text not null default 'TND' check (currency = 'TND'),
  status text not null default 'initiated' check (status in
    ('initiated','succeeded','failed','collected','remitted','refunded')),
  raw jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index on public.payments (order_id);
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  carrier text not null,                     -- adapter key: 'aramex', 'local_courier', 'manual'
  pickup_address jsonb not null,             -- seller address snapshot: the courier collects from the seller
  tracking_number text,
  label_url text,
  cod_amount_millimes bigint not null default 0,
  status text not null default 'created' check (status in
    ('created','pickup_scheduled','picked_up','in_transit','out_for_delivery',
     'delivered','refused','returned','lost','exception')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (carrier, tracking_number)
);
create trigger shipments_touch before update on public.shipments
  for each row execute function public.touch_updated_at();

create table public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status text not null,
  description text,
  occurred_at timestamptz not null,
  raw jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.shipment_events (shipment_id, occurred_at);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (reason in ('not_received','damaged','not_as_described','counterfeit','other')),
  description text not null check (char_length(description) between 10 and 2000),
  photo_paths text[] not null default '{}',
  status text not null default 'open' check (status in
    ('open','seller_responded','return_requested','return_shipped','refunded','rejected','escalated')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger claims_touch before update on public.claims
  for each row execute function public.touch_updated_at();

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_user_id uuid references public.profiles(id) on delete set null,   -- null = automatic
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('buyer_to_seller','seller_to_buyer')),
  stars smallint not null check (stars between 1 and 5),
  body text check (char_length(body) <= 1000),
  is_automatic boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, role)                    -- one per side per order
);
create index on public.feedback (to_user_id, created_at desc);
create trigger feedback_touch before update on public.feedback
  for each row execute function public.touch_updated_at();

-- Seller money. Balance = sum of entries; never stored as a mutable number.
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  payout_id uuid,
  kind text not null check (kind in ('sale','refund_reversal','payout','adjustment')),
  amount_millimes bigint not null,           -- + credit, - debit
  state text not null check (state in ('pending','available')),
  available_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, kind)                    -- an order credits a seller once
);
create index on public.ledger_entries (user_id, created_at desc);

create table public.payout_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('bank_rib','d17','flouci_wallet')),
  holder_name text not null,
  account_ref text not null,                 -- RIB (20 digits) or wallet phone; encrypt at rest
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.payout_methods (user_id);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  payout_method_id uuid not null references public.payout_methods(id) on delete restrict,
  amount_millimes bigint not null check (amount_millimes > 0),
  currency text not null default 'TND' check (currency = 'TND'),
  status text not null default 'requested' check (status in ('requested','processing','paid','failed')),
  reference text,                            -- bank transfer reference
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null
);
create index on public.payouts (user_id, requested_at desc);
create index payouts_open on public.payouts (requested_at) where status in ('requested','processing');
alter table public.ledger_entries
  add constraint ledger_payout_fk foreign key (payout_id) references public.payouts(id) on delete restrict;
create index on public.ledger_entries (payout_id);
create index on public.ledger_entries (order_id);

create table public.id_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cin_front_path text not null,              -- private bucket, admins only
  cin_back_path text not null,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index on public.id_verifications (user_id);
create index id_verifications_pending on public.id_verifications (created_at) where status = 'pending';

-- ---------------------------------------------------------------- safety, promotion, plumbing

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('item','user','message')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.reports (target_type, target_id);
create index reports_open on public.reports (created_at) where status = 'open';

create table public.bumps (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  days smallint not null check (days in (3,7)),
  price_millimes bigint not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on public.bumps (item_id);
create index on public.bumps (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                        -- 'message','offer','order_update','favourite','saved_search',...
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- Webhooks arrive twice. Store every event id; process only once.
create table public.webhook_events (
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- Balance, derived from the ledger.
create or replace view public.wallet_balances with (security_invoker = true) as
  select user_id,
    coalesce(sum(amount_millimes) filter (where state = 'pending'), 0)   as pending_millimes,
    coalesce(sum(amount_millimes) filter (where state = 'available'), 0) as available_millimes
  from public.ledger_entries group by user_id;

-- Keep favourite_count in step.
create or replace function public.favourites_count() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update items set favourite_count = favourite_count + 1 where id = new.item_id;
  else
    update items set favourite_count = greatest(favourite_count - 1, 0) where id = old.item_id;
  end if;
  return null;
end $$;
create trigger favourites_count after insert or delete on public.favourites
  for each row execute function public.favourites_count();

-- Keep the seller rating in step (only feedback about sellers counts).
create or replace function public.refresh_rating() returns trigger
  language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.to_user_id, old.to_user_id);
begin
  update profiles p set
    rating_avg = coalesce((select round(avg(stars)::numeric, 2) from feedback
                           where to_user_id = target and role = 'buyer_to_seller'), 0),
    rating_count = (select count(*) from feedback where to_user_id = target and role = 'buyer_to_seller')
  where p.id = target;
  return null;
end $$;
create trigger feedback_rating after insert or update or delete on public.feedback
  for each row execute function public.refresh_rating();

-- Create a profile row when someone signs up.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, phone)
  values (new.id, 'u' || right(replace(new.id::text, '-', ''), 29), new.phone);   -- unique; user picks a real one at onboarding
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security

alter table public.profiles          enable row level security;
alter table public.addresses         enable row level security;
alter table public.follows           enable row level security;
alter table public.blocks            enable row level security;
alter table public.push_tokens       enable row level security;
alter table public.categories        enable row level security;
alter table public.brands            enable row level security;
alter table public.sizes             enable row level security;
alter table public.items             enable row level security;
alter table public.item_photos       enable row level security;
alter table public.favourites        enable row level security;
alter table public.saved_searches    enable row level security;
alter table public.bundle_discounts  enable row level security;
alter table public.conversations     enable row level security;
alter table public.messages          enable row level security;
alter table public.offers            enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.payments          enable row level security;
alter table public.shipments         enable row level security;
alter table public.shipment_events   enable row level security;
alter table public.claims            enable row level security;
alter table public.feedback          enable row level security;
alter table public.ledger_entries    enable row level security;
alter table public.payout_methods    enable row level security;
alter table public.payouts           enable row level security;
alter table public.id_verifications  enable row level security;
alter table public.reports           enable row level security;
alter table public.bumps             enable row level security;
alter table public.notifications     enable row level security;
alter table public.webhook_events    enable row level security;   -- no policies: service role only

-- Public catalogue
create policy "read categories" on public.categories for select using (true);
create policy "read brands"     on public.brands     for select using (true);
create policy "read sizes"      on public.sizes      for select using (true);

-- Profiles: public read (no phone: expose through a view in the API), self update
create policy "read profiles" on public.profiles for select using (deleted_at is null and banned_at is null);
create policy "update own profile" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = false and id_verified_at is not distinct from
              (select id_verified_at from public.profiles where id = auth.uid()));

-- Own rows only
create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push tokens" on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favourites" on public.favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved searches" on public.saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own blocks" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "own notifications read" on public.notifications for select using (user_id = auth.uid());
create policy "own notifications mark read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own payout methods" on public.payout_methods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own ledger" on public.ledger_entries for select using (user_id = auth.uid());
create policy "own payouts" on public.payouts for select using (user_id = auth.uid());
create policy "own id verification read" on public.id_verifications for select using (user_id = auth.uid());
create policy "submit id verification" on public.id_verifications for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy "file a report" on public.reports for insert with check (reporter_id = auth.uid());

create policy "read follows" on public.follows for select using (true);
create policy "own follows" on public.follows for insert with check (follower_id = auth.uid());
create policy "unfollow" on public.follows for delete using (follower_id = auth.uid());

create policy "read bundle discounts" on public.bundle_discounts for select using (true);
create policy "own bundle discounts" on public.bundle_discounts for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

-- Items: anyone sees live items; sellers see and edit their own.
-- Sellers cannot set status to reserved/sold themselves: that happens through orders.
create policy "read items" on public.items for select
  using (status in ('active','reserved','sold') or seller_id = auth.uid());
create policy "create own items" on public.items for insert
  with check (seller_id = auth.uid() and status in ('draft','active') and bumped_until is null);
create policy "edit own items" on public.items for update
  using (seller_id = auth.uid() and status in ('draft','active','hidden'))
  with check (seller_id = auth.uid() and status in ('draft','active','hidden'));

create policy "read item photos" on public.item_photos for select
  using (exists (select 1 from public.items i where i.id = item_id
                 and (i.status in ('active','reserved','sold') or i.seller_id = auth.uid())));
create policy "own item photos" on public.item_photos for all
  using (exists (select 1 from public.items i where i.id = item_id and i.seller_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.seller_id = auth.uid()));

-- Conversations & messages: the two participants only.
create policy "participants read conversations" on public.conversations for select
  using (auth.uid() in (buyer_id, seller_id));
create policy "buyer starts conversation" on public.conversations for insert
  with check (buyer_id = auth.uid() and not public.is_blocked_between(buyer_id, seller_id));
create policy "participants mark read" on public.conversations for update
  using (auth.uid() in (buyer_id, seller_id)) with check (auth.uid() in (buyer_id, seller_id));

create policy "participants read messages" on public.messages for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and auth.uid() in (c.buyer_id, c.seller_id)));
create policy "participants send text" on public.messages for insert
  with check (sender_id = auth.uid() and kind in ('text','image')
    and exists (select 1 from public.conversations c where c.id = conversation_id
                and auth.uid() in (c.buyer_id, c.seller_id)
                and not public.is_blocked_between(c.buyer_id, c.seller_id)));

create policy "participants read offers" on public.offers for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and auth.uid() in (c.buyer_id, c.seller_id)));
-- Offers are created and answered through make_offer / respond_offer (below), not direct inserts.

-- Orders and everything under them: buyer and seller read; writes only via Edge Functions.
create policy "parties read orders" on public.orders for select
  using (auth.uid() in (buyer_id, seller_id) or public.is_admin());
create policy "parties read order items" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)));
create policy "parties read shipments" on public.shipments for select
  using (exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)));
create policy "parties read shipment events" on public.shipment_events for select
  using (exists (select 1 from public.shipments s join public.orders o on o.id = s.order_id
                 where s.id = shipment_id and auth.uid() in (o.buyer_id, o.seller_id)));
create policy "buyer reads payments" on public.payments for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "parties read claims" on public.claims for select
  using (exists (select 1 from public.orders o where o.id = order_id and auth.uid() in (o.buyer_id, o.seller_id)));

-- Feedback: public; written once per side, after completion (checked in leave_feedback).
create policy "read feedback" on public.feedback for select using (true);
create policy "edit own feedback" on public.feedback for update
  using (from_user_id = auth.uid()) with check (from_user_id = auth.uid() and is_automatic = false);
create policy "delete own feedback" on public.feedback for delete using (from_user_id = auth.uid());

create policy "read bumps of own items" on public.bumps for select using (user_id = auth.uid());

-- ---------------------------------------------------------------- core functions (callable from the app)

-- Make an offer on one item or a bundle from the same seller.
create or replace function public.make_offer(p_item_ids uuid[], p_amount_millimes bigint, p_parent uuid default null)
  returns public.offers
  language plpgsql security definer set search_path = public as $$
declare
  v_seller uuid; v_list bigint; v_conv uuid; v_offer offers; v_buyer uuid;
begin
  select min(seller_id::text)::uuid, sum(price_millimes) into v_seller, v_list
    from items where id = any(p_item_ids) and status = 'active';
  if v_seller is null or (select count(distinct seller_id) from items where id = any(p_item_ids)) <> 1
     or (select count(*) from items where id = any(p_item_ids) and status = 'active') <> cardinality(p_item_ids) then
    raise exception 'items_unavailable';
  end if;

  if p_parent is null then
    v_buyer := auth.uid();                                      -- buyer opens
    if v_buyer = v_seller then raise exception 'own_item'; end if;
  else
    select c.buyer_id into v_buyer from offers o join conversations c on c.id = o.conversation_id
      where o.id = p_parent and o.status = 'pending' and auth.uid() in (c.buyer_id, c.seller_id)
        and o.from_user_id <> auth.uid();
    if v_buyer is null then raise exception 'cannot_counter'; end if;
    update offers set status = 'countered', responded_at = now() where id = p_parent;
  end if;
  if is_blocked_between(v_buyer, v_seller) then raise exception 'blocked'; end if;

  insert into conversations (item_id, buyer_id, seller_id)
    values (p_item_ids[1], v_buyer, v_seller)
    on conflict (item_id, buyer_id) where item_id is not null do update set last_message_at = now()
    returning id into v_conv;

  insert into offers (conversation_id, from_user_id, item_ids, list_price_millimes, amount_millimes, parent_offer_id)
    values (v_conv, auth.uid(), p_item_ids, v_list, p_amount_millimes, p_parent)
    returning * into v_offer;

  insert into messages (conversation_id, sender_id, kind, payload)
    values (v_conv, auth.uid(), 'offer', jsonb_build_object('offer_id', v_offer.id));
  return v_offer;
end $$;

create or replace function public.respond_offer(p_offer uuid, p_accept boolean)
  returns public.offers
  language plpgsql security definer set search_path = public as $$
declare v offers;
begin
  update offers o set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
    from conversations c
    where o.id = p_offer and c.id = o.conversation_id and o.status = 'pending'
      and o.expires_at > now() and o.from_user_id <> auth.uid()
      and auth.uid() in (c.buyer_id, c.seller_id)
    returning o.* into v;
  if v.id is null then raise exception 'cannot_respond'; end if;
  insert into messages (conversation_id, sender_id, kind, payload)
    values (v.conversation_id, null, 'system', jsonb_build_object('offer_id', v.id, 'status', v.status));
  return v;
end $$;

-- Buyer confirms everything is fine: completes the order and releases the money.
create or replace function public.confirm_received(p_order uuid)
  returns public.orders
  language plpgsql security definer set search_path = public as $$
declare v orders;
begin
  select * into v from orders where id = p_order and buyer_id = auth.uid() and status = 'delivered' for update;
  if v.id is null then raise exception 'cannot_complete'; end if;
  perform public.complete_order(p_order);
  select * into v from orders where id = p_order;
  return v;
end $$;

-- Shared by confirm_received and the auto-complete job.
create or replace function public.complete_order(p_order uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v orders;
begin
  update orders set status = 'completed', completed_at = now()
    where id = p_order and status = 'delivered' returning * into v;
  if v.id is null then return; end if;
  -- the seller gets the items price minus any bundle discount; fee and shipping stay with the platform
  insert into ledger_entries (user_id, order_id, kind, amount_millimes, state, available_at)
    values (v.seller_id, v.id, 'sale', v.items_millimes - v.bundle_discount_millimes,
            case when v.payment_method = 'cod' then 'pending' else 'available' end,
            case when v.payment_method = 'cod' then null else now() end)
    on conflict (order_id, kind) do nothing;
  -- for COD, the entry becomes 'available' when the courier's cash remittance is reconciled
end $$;

create or replace function public.leave_feedback(p_order uuid, p_stars smallint, p_body text)
  returns public.feedback
  language plpgsql security definer set search_path = public as $$
declare o orders; f feedback; v_role text; v_to uuid;
begin
  select * into o from orders where id = p_order and status = 'completed' and auth.uid() in (buyer_id, seller_id);
  if o.id is null then raise exception 'cannot_review'; end if;
  if auth.uid() = o.buyer_id then v_role := 'buyer_to_seller'; v_to := o.seller_id;
  else v_role := 'seller_to_buyer'; v_to := o.buyer_id; end if;
  insert into feedback (order_id, from_user_id, to_user_id, role, stars, body)
    values (o.id, auth.uid(), v_to, v_role, p_stars, p_body)
    on conflict (order_id, role) do update   -- replaces automatic feedback
      set from_user_id = excluded.from_user_id, stars = excluded.stars, body = excluded.body,
          is_automatic = false
      where feedback.is_automatic
    returning * into f;
  if f.id is null then raise exception 'already_reviewed'; end if;
  return f;
end $$;

-- Lock down: these functions are for signed-in users only.
revoke execute on function public.make_offer(uuid[], bigint, uuid) from public, anon;
revoke execute on function public.respond_offer(uuid, boolean) from public, anon;
revoke execute on function public.confirm_received(uuid) from public, anon;
revoke execute on function public.leave_feedback(uuid, smallint, text) from public, anon;
revoke execute on function public.complete_order(uuid) from public, anon, authenticated;
grant execute on function public.make_offer(uuid[], bigint, uuid) to authenticated;
grant execute on function public.respond_offer(uuid, boolean) to authenticated;
grant execute on function public.confirm_received(uuid) to authenticated;
grant execute on function public.leave_feedback(uuid, smallint, text) to authenticated;
