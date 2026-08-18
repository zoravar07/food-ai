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
