-- Life OS Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- TASKS
-- ============================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  status text not null default 'today' check (status in ('today', 'upcoming', 'backlog', 'done')),
  due_date date,
  tags text[] default '{}',
  notes text default '',
  "order" integer default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.tasks enable row level security;
create policy "Users can manage their own tasks" on public.tasks
  for all using (auth.uid() = user_id);

-- ============================================
-- GOALS
-- ============================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  category text not null default 'Personal',
  target_date date,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  linked_task_ids uuid[] default '{}',
  notes text default '',
  parent_id uuid references public.goals(id) on delete set null,
  "order" integer default 0,
  created_at timestamptz default now()
);

alter table public.goals enable row level security;
create policy "Users can manage their own goals" on public.goals
  for all using (auth.uid() = user_id);

-- ============================================
-- LIFE EVENTS
-- ============================================
create table public.life_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  title text not null,
  description text default '',
  mood text not null default 'neutral' check (mood in ('amazing', 'good', 'neutral', 'tough', 'difficult')),
  photo_url text,
  created_at timestamptz default now()
);

alter table public.life_events enable row level security;
create policy "Users can manage their own life events" on public.life_events
  for all using (auth.uid() = user_id);

-- ============================================
-- VISION BOARD ITEMS
-- ============================================
create table public.vision_board_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('image', 'text')),
  content text not null,
  x float default 0,
  y float default 0,
  width float default 200,
  height float default 200,
  rotation float default 0,
  board_id text default 'default',
  created_at timestamptz default now()
);

alter table public.vision_board_items enable row level security;
create policy "Users can manage their own vision board items" on public.vision_board_items
  for all using (auth.uid() = user_id);

-- ============================================
-- CUSTOM PAGES
-- ============================================
create table public.custom_pages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled',
  icon text default '📄',
  content text default '',
  template text not null default 'blank' check (template in ('blank', 'notes', 'database', 'kanban')),
  pinned boolean default false,
  "order" integer default 0,
  created_at timestamptz default now()
);

alter table public.custom_pages enable row level security;
create policy "Users can manage their own pages" on public.custom_pages
  for all using (auth.uid() = user_id);

-- ============================================
-- WIDGETS (Dashboard configuration)
-- ============================================
create table public.widgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  "order" integer default 0,
  collapsed boolean default false
);

alter table public.widgets enable row level security;
create policy "Users can manage their own widgets" on public.widgets
  for all using (auth.uid() = user_id);

-- ============================================
-- USER SETTINGS (theme, vision text, etc.)
-- ============================================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'dark',
  five_year_vision text default '',
  non_negotiables text default '',
  sidebar_collapsed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;
create policy "Users can manage their own settings" on public.user_settings
  for all using (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
create index idx_tasks_user_status on public.tasks(user_id, status);
create index idx_tasks_user_due on public.tasks(user_id, due_date);
create index idx_goals_user on public.goals(user_id);
create index idx_life_events_user_date on public.life_events(user_id, date desc);
create index idx_vision_board_user on public.vision_board_items(user_id, board_id);
create index idx_custom_pages_user on public.custom_pages(user_id);
