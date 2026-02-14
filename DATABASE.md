# Database Schema

Run these in Supabase SQL Editor to set up the database.

## Core Tables

```sql
-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- User profile information
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  temperature_unit text default 'C' check (temperature_unit in ('C', 'F')),
  measurement_system text default 'metric' check (measurement_system in ('metric', 'imperial')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- MEAL PLANS TABLE
-- Stores saved meal configurations
-- ============================================
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  serve_time timestamptz,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index meal_plans_user_id_idx on public.meal_plans(user_id);
create index meal_plans_is_active_idx on public.meal_plans(user_id, is_active) where is_active = true;

-- ============================================
-- MEAL ITEMS TABLE
-- Individual items within a meal plan
-- ============================================
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  name text not null,
  cook_time_minutes int not null,
  prep_time_minutes int default 0,
  rest_time_minutes int default 0,
  temperature int,
  temperature_unit text default 'C' check (temperature_unit in ('C', 'F')),
  cooking_method text default 'oven' check (cooking_method in ('oven', 'hob', 'grill', 'microwave', 'air_fryer', 'slow_cooker', 'steamer', 'bbq', 'other')),
  instructions text,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index meal_items_meal_plan_id_idx on public.meal_items(meal_plan_id);

-- ============================================
-- RECIPES TABLE
-- User's saved recipe collection
-- ============================================
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  ingredients jsonb default '[]'::jsonb,
  instructions text,
  prep_time_minutes int,
  cook_time_minutes int,
  total_time_minutes int generated always as (coalesce(prep_time_minutes, 0) + coalesce(cook_time_minutes, 0)) stored,
  servings int default 4,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  cuisine text,
  course text,
  source_url text,
  source_name text,
  image_url text,
  tags text[] default '{}',
  is_favourite boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index recipes_user_id_idx on public.recipes(user_id);
create index recipes_is_favourite_idx on public.recipes(user_id, is_favourite) where is_favourite = true;
create index recipes_tags_idx on public.recipes using gin(tags);

-- ============================================
-- CHAT SESSIONS TABLE
-- ============================================
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New Chat',
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index chat_sessions_user_id_idx on public.chat_sessions(user_id);
```

## Row Level Security Policies

```sql
-- Enable RLS on all tables
alter table public.meal_plans enable row level security;
alter table public.meal_items enable row level security;
alter table public.recipes enable row level security;
alter table public.chat_sessions enable row level security;

-- Meal Plans
create policy "Users can view own meal plans" on public.meal_plans
  for select using (auth.uid() = user_id);
create policy "Users can insert own meal plans" on public.meal_plans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own meal plans" on public.meal_plans
  for update using (auth.uid() = user_id);
create policy "Users can delete own meal plans" on public.meal_plans
  for delete using (auth.uid() = user_id);

-- Meal Items (access via meal plan ownership)
create policy "Users can view own meal items" on public.meal_items
  for select using (
    exists (select 1 from public.meal_plans where meal_plans.id = meal_items.meal_plan_id and meal_plans.user_id = auth.uid())
  );
create policy "Users can insert own meal items" on public.meal_items
  for insert with check (
    exists (select 1 from public.meal_plans where meal_plans.id = meal_items.meal_plan_id and meal_plans.user_id = auth.uid())
  );
create policy "Users can update own meal items" on public.meal_items
  for update using (
    exists (select 1 from public.meal_plans where meal_plans.id = meal_items.meal_plan_id and meal_plans.user_id = auth.uid())
  );
create policy "Users can delete own meal items" on public.meal_items
  for delete using (
    exists (select 1 from public.meal_plans where meal_plans.id = meal_items.meal_plan_id and meal_plans.user_id = auth.uid())
  );

-- Recipes
create policy "Users can view own recipes" on public.recipes
  for select using (auth.uid() = user_id);
create policy "Users can insert own recipes" on public.recipes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on public.recipes
  for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on public.recipes
  for delete using (auth.uid() = user_id);

-- Chat Sessions
create policy "Users can view own chat sessions" on public.chat_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own chat sessions" on public.chat_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own chat sessions" on public.chat_sessions
  for update using (auth.uid() = user_id);
create policy "Users can delete own chat sessions" on public.chat_sessions
  for delete using (auth.uid() = user_id);
```

## Triggers & Functions

```sql
-- Ensure only one active meal plan per user
create or replace function public.ensure_single_active_meal_plan()
returns trigger as $$
begin
  if NEW.is_active = true then
    update public.meal_plans
    set is_active = false
    where user_id = NEW.user_id and id != NEW.id and is_active = true;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger single_active_meal_plan_trigger
  before insert or update on public.meal_plans
  for each row execute function public.ensure_single_active_meal_plan();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger update_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute function public.update_updated_at_column();

create trigger update_recipes_updated_at
  before update on public.recipes
  for each row execute function public.update_updated_at_column();

create trigger update_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.update_updated_at_column();

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();
```

## Supabase Storage

Create a storage bucket for recipe images:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `recipe-images`
3. Set it to **Public** (so images can be displayed without auth)
4. Add RLS policy to allow authenticated users to upload:

```sql
-- Allow authenticated users to upload to recipe-images bucket
create policy "Users can upload recipe images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'recipe-images');

-- Allow public read access
create policy "Public read access for recipe images"
on storage.objects for select
to public
using (bucket_id = 'recipe-images');

-- Allow users to delete their own uploads
create policy "Users can delete own recipe images"
on storage.objects for delete
to authenticated
using (bucket_id = 'recipe-images');
```

### Profile Pictures Bucket

Create a storage bucket for profile pictures:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `profile-pictures`
3. Set it to **Public**
4. Add RLS policies:

```sql
-- Allow authenticated users to upload profile pictures (in their own folder)
create policy "Users can upload profile pictures"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
create policy "Public read access for profile pictures"
on storage.objects for select
to public
using (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
create policy "Users can update own profile pictures"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own profile pictures
create policy "Users can delete own profile pictures"
on storage.objects for delete
to authenticated
using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = auth.uid()::text);
```
