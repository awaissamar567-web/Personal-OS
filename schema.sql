-- PERSONAL OS SUPABASE SCHEMA (BYPASSING SUPABASE AUTH)

-- 1. health_logs
create table health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  date date not null,
  weight_kg numeric,
  body_fat_pct numeric,
  sleep_hours numeric,
  water_ml integer,
  calories integer,
  steps integer,
  gym_workout boolean default false,
  mood integer check (mood between 1 and 10),
  energy integer check (energy between 1 and 10),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- 2. wealth_logs
create table wealth_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  month date not null,
  net_worth numeric,
  monthly_income numeric,
  business_revenue numeric,
  savings numeric,
  investments numeric,
  expenses numeric,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, month)
);

-- 3. work_logs
create table work_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  date date not null,
  deep_work_hours numeric,
  tasks_completed integer,
  focus_score integer check (focus_score between 1 and 10),
  learning_hours numeric,
  weekly_goals_met boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- 4. habits
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  name text not null,
  category text,
  frequency text default 'daily',
  color text,
  active boolean default true,
  created_at timestamptz default now()
);

-- 5. habit_logs
create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  habit_id uuid references habits(id) on delete cascade not null,
  date date not null,
  completed boolean default false,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

-- 6. journal_entries
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  date date not null,
  type text check (type in ('morning', 'night')),
  content text,
  wins text,
  mistakes text,
  mood integer check (mood between 1 and 10),
  progress_score integer check (progress_score between 1 and 10),
  created_at timestamptz default now(),
  unique(user_id, date, type)
);

-- 7. goals
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  title text not null,
  description text,
  category text,
  timeframe text check (timeframe in ('daily','weekly','monthly','quarterly','1yr','5yr')),
  target_date date,
  progress integer default 0 check (progress between 0 and 100),
  status text default 'active' check (status in ('active','completed','paused')),
  created_at timestamptz default now()
);

-- 8. books
create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  title text not null,
  author text,
  status text default 'reading' check (status in ('want','reading','done')),
  rating integer check (rating between 1 and 5),
  notes text,
  date_finished date,
  created_at timestamptz default now()
);

-- 9. bucket_list
create table bucket_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  item text not null,
  category text,
  completed boolean default false,
  completed_date date,
  created_at timestamptz default now()
);

-- 10. manifesto
create table manifesto (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  content text,
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 11. ai_chat_history
create table ai_chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  role text check (role in ('user','assistant')),
  content text,
  created_at timestamptz default now()
);

-- 12. people (Relationship CRM)
create table people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  name text not null,
  relationship_type text check (relationship_type in ('family','friend','professional','partner','other')),
  last_interaction_date date,
  notes text,
  birthday date,
  anniversary date,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) is disabled for local/private single-operator setup
alter table health_logs disable row level security;
alter table wealth_logs disable row level security;
alter table work_logs disable row level security;
alter table habits disable row level security;
alter table habit_logs disable row level security;
alter table journal_entries disable row level security;
alter table goals disable row level security;
alter table books disable row level security;
alter table bucket_list disable row level security;
alter table manifesto disable row level security;
alter table ai_chat_history disable row level security;
alter table people disable row level security;
