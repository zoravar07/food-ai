-- hungryvar database schema
-- Run this in Supabase: SQL Editor -> New Query -> paste -> Run

-- Weekly plans: one row per week, storing the generated plan as JSON
create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  plan jsonb not null,
  targets jsonb not null,
  budget_cap numeric default 65,
  created_at timestamptz default now()
);

-- Meal logs: what actually happened (eaten / skipped / ate out / swapped)
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  slot text not null,                -- Breakfast | Lunch | Snack | Shake | Dinner
  status text not null,              -- eaten | skipped | ate_out | swapped
  meal_name text,
  kcal numeric,
  protein numeric,
  note text,
  created_at timestamptz default now(),
  unique (log_date, slot)
);

-- Grocery shops: history of what was bought each week
create table if not exists grocery_shops (
  id uuid primary key default gen_random_uuid(),
  shop_date date not null,
  items jsonb not null,              -- [{id, name, toBuy, unit, estCost, purchased}]
  estimated_total numeric,
  actual_total numeric,
  created_at timestamptz default now()
);

-- Pantry: what's currently in the kitchen, so next week's list nets it off
create table if not exists pantry (
  ingredient_id text primary key,
  name text not null,
  quantity numeric not null default 0,
  unit text default 'g',
  purchased_on date,
  updated_at timestamptz default now()
);

-- Custom items the user adds to the shopping list themselves
create table if not exists custom_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity text,
  recurring boolean default false,
  added_at timestamptz default now()
);

-- Saved supplements (whey etc) — set calories once, reuse daily
create table if not exists supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kcal numeric not null,
  protein numeric not null,
  serving text,
  active boolean default true
);

-- One-time start-of-term pantry staples checklist
create table if not exists staples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  bought boolean default false
);

-- Seed the default whey entry (editable in the app)
insert into supplements (name, kcal, protein, serving)
select 'Whey protein', 120, 24, '1 scoop'
where not exists (select 1 from supplements);

-- Seed start-of-term staples
insert into staples (name, category)
select * from (values
  ('Olive oil','Oils'), ('Sesame oil','Oils'), ('Vegetable/rapeseed oil','Oils'),
  ('Salt','Seasoning'), ('Black pepper','Seasoning'), ('Garlic powder','Seasoning'),
  ('Onion powder','Seasoning'), ('Paprika','Seasoning'), ('Cumin','Seasoning'),
  ('Chilli flakes','Seasoning'), ('Chilli powder','Seasoning'), ('Cinnamon','Seasoning'),
  ('Mixed herbs','Seasoning'), ('Curry powder','Seasoning'),
  ('Soy sauce','Sauces'), ('Sriracha / hot sauce','Sauces'), ('Tahini','Sauces'),
  ('Honey','Sauces'), ('Peanut butter','Sauces'), ('Mustard','Sauces'),
  ('Curry paste','Sauces'), ('Teriyaki sauce','Sauces'), ('Salsa','Sauces'),
  ('Stock cubes','Basics'), ('Lemon juice','Basics'), ('Vinegar','Basics'),
  ('Plain flour','Basics'), ('Breadcrumbs / panko','Basics'), ('Popcorn kernels','Basics')
) as t(name, category)
where not exists (select 1 from staples);

-- Items you already have enough of — kept off the shopping list until you untick them
create table if not exists have_enough (
  ingredient_id text primary key,
  marked_at timestamptz default now()
);

-- Allow multiple plan versions per week so old ones stay browsable
alter table weeks drop constraint if exists weeks_week_start_key;

-- Store estimated carbs/fat for meals eaten out
alter table meal_logs add column if not exists carbs numeric;
alter table meal_logs add column if not exists fat numeric;

-- ============ v2: profile, pantry, rules ============

-- Editable profile (replaces the hardcoded sampleProfile)
create table if not exists profile (
  id int primary key default 1,
  age int, height_cm numeric, weight_kg numeric, sex text,
  training_days int, goal text, budget_cap numeric,
  meals_per_day int default 4, max_cook_minutes int default 30,
  dislikes text[], notes text,
  updated_at timestamptz default now()
);

insert into profile (id, age, height_cm, weight_kg, sex, training_days, goal, budget_cap, dislikes)
select 1, 19, 185, 72.5, 'male', 5, 'mild_cut', 65, array['corn']
where not exists (select 1 from profile where id = 1);

-- Pantry v2: countable amounts, category, low flag
alter table pantry add column if not exists category text default 'fresh';
alter table pantry add column if not exists low boolean default false;
alter table pantry add column if not exists display text;

-- Standing rules ("burger on Fridays") and one-off cravings ("Thai this week")
create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'standing',   -- standing | craving
  text text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============ v3: shop state ============
-- Dates already say which week a plan is for. What they cannot say is whether
-- that week's shop has actually happened, and the Sunday rollover, the mid-week
-- craving flow and the stale-pantry check all need to know.
--   draft    - generated, not shopped for yet
--   active   - shopped for, being eaten from
--   archived - superseded by a newer plan for the same week
alter table weeks add column if not exists status text default 'draft';
alter table weeks add column if not exists shopped_at timestamptz;

-- Plans that predate this column: keep the newest per week in play and archive
-- the rest. Whether an old week was shopped is not knowable in retrospect, so
-- nothing is marked active here — the app sets that on the next "Groceries done".
update weeks w
set status = 'archived'
where exists (
  select 1 from weeks n
  where n.week_start = w.week_start and n.created_at > w.created_at
);

create index if not exists weeks_status_idx on weeks (status, week_start desc);

-- ============ v4: weeks start on Sunday ============
-- Sunday is shop day, so it is day one of the week being shopped for rather
-- than the tail of the week before. Every week_start written from here on is a
-- Sunday; rows written under the old Monday scheme can never match a lookup
-- again, so retire them rather than leaving them reporting as live shops.
--
-- Nothing else is affected: meal_logs are keyed by log_date, pantry and
-- have_enough by ingredient, grocery_shops by shop_date. Only saved plans are
-- lost, and those regenerate in under a second.
update weeks
set status = 'archived'
where status <> 'archived'
  and extract(dow from week_start) <> 0;   -- 0 = Sunday

-- ============ v5: first shop ============
-- Before the first shop there is no anchor and no active week: the kitchen is
-- empty by definition, so nothing can have run out and there is nothing to
-- reconcile. This holds the date he expects to shop, purely so the app can say
-- "your first shop is in X days" instead of sitting there looking confused.
alter table profile add column if not exists first_shop_date date;

-- ============ v6: accounts ============
-- Until now every table had one policy: "anon full access", ALL, using(true).
-- RLS was enabled and permitted everything, which is the same as off but harder
-- to notice — and the anon key is inlined in the JS bundle, so anyone who opened
-- devtools could read and write the lot.
--
-- This is single-user auth, not multi-user: one account, real policies. The
-- schema is shaped so adding a second person later is a sign-up form rather
-- than another migration.

alter table profile       add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table weeks         add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table meal_logs     add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table pantry        add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table grocery_shops add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table custom_items  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table rules         add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table have_enough   add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Free-text food preferences, so the prompt stops hardcoding one person's tastes.
alter table profile add column if not exists food_notes text;

-- Keys that would collide the moment a second account existed: two people can't
-- both own chicken, or both log Tuesday lunch.
alter table pantry       drop constraint if exists pantry_pkey;
alter table pantry       add  constraint pantry_pkey primary key (user_id, ingredient_id);
alter table have_enough  drop constraint if exists have_enough_pkey;
alter table have_enough  add  constraint have_enough_pkey primary key (user_id, ingredient_id);
alter table meal_logs    drop constraint if exists meal_logs_log_date_slot_key;
create unique index if not exists meal_logs_user_date_slot on meal_logs (user_id, log_date, slot);
create unique index if not exists profile_user_key on profile (user_id);

-- The old blanket policies go. Reads and writes are scoped to the signed-in
-- user; the `user_id is null` arm is transitional, so rows written before there
-- were accounts stay visible and can be claimed on first sign-in. It comes out
-- in v7 once that's done.
do $$
declare tbl text;
begin
  foreach tbl in array array['profile','weeks','meal_logs','pantry','grocery_shops','custom_items','rules','have_enough']
  loop
    execute format('drop policy if exists %I on %I', 'anon full access', tbl);
    execute format('drop policy if exists %I on %I', 'owner access', tbl);
    execute format(
      'create policy %I on %I for all to authenticated using (user_id = auth.uid() or user_id is null) with check (user_id = auth.uid() or user_id is null)',
      'owner access', tbl);
  end loop;
end $$;

-- Seed lists stay shared for now: they hold no personal data and there is one
-- account. Scoping them per-user is a multi-user follow-up, not a security fix.
do $$
declare tbl text;
begin
  foreach tbl in array array['staples','supplements']
  loop
    execute format('drop policy if exists %I on %I', 'anon full access', tbl);
    execute format('drop policy if exists %I on %I', 'shared read-write', tbl);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', 'shared read-write', tbl);
  end loop;
end $$;
