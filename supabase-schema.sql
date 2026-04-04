-- ============================================
-- ChoreQuest Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null default '#FF2D9B',
  created_at timestamptz default now()
);

-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default upper(substring(gen_random_uuid()::text, 1, 8)),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Group members
create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  total_points int not null default 0,
  unique(group_id, user_id)
);

-- Chores
create table chores (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  points int not null default 10,
  is_persistent boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Completions
create table completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid references chores(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  points_earned int not null,
  completed_at timestamptz default now()
);

-- Invitations
create table invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  token text unique not null default gen_random_uuid()::text,
  created_at timestamptz default now()
);

-- ============================================
-- Triggers
-- ============================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment points on completion
create or replace function handle_completion()
returns trigger as $$
begin
  update group_members
  set total_points = total_points + new.points_earned
  where user_id = new.user_id and group_id = new.group_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_completion_insert
  after insert on completions
  for each row execute function handle_completion();

-- Delete one-time chore after completion
create or replace function handle_one_time_chore()
returns trigger as $$
begin
  delete from chores
  where id = new.chore_id
    and is_persistent = false;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_completion_cleanup
  after insert on completions
  for each row execute function handle_one_time_chore();

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table chores enable row level security;
alter table completions enable row level security;
alter table invitations enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Groups: members can read their groups
create policy "groups_read" on groups for select using (
  exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "groups_insert" on groups for insert with check (auth.uid() = created_by);

-- Group members: members can read their group's members
create policy "group_members_read" on group_members for select using (
  exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
);
create policy "group_members_insert" on group_members for insert with check (auth.uid() = user_id);

-- Chores: group members can read, insert, and delete own
create policy "chores_read" on chores for select using (
  exists (select 1 from group_members where group_id = chores.group_id and user_id = auth.uid())
);
create policy "chores_insert" on chores for insert with check (
  exists (select 1 from group_members where group_id = chores.group_id and user_id = auth.uid())
);
create policy "chores_delete" on chores for delete using (auth.uid() = created_by);

-- Completions: group members can read and insert
create policy "completions_read" on completions for select using (
  exists (select 1 from group_members where group_id = completions.group_id and user_id = auth.uid())
);
create policy "completions_insert" on completions for insert with check (
  auth.uid() = user_id and
  exists (select 1 from group_members where group_id = completions.group_id and user_id = auth.uid())
);

-- Invitations: group members can read/insert
create policy "invitations_read" on invitations for select using (
  exists (select 1 from group_members where group_id = invitations.group_id and user_id = auth.uid())
  or invited_email = (select email from auth.users where id = auth.uid())
);
create policy "invitations_insert" on invitations for insert with check (
  exists (select 1 from group_members where group_id = invitations.group_id and user_id = auth.uid())
);

-- ============================================
-- Enable Realtime
-- ============================================

alter publication supabase_realtime add table chores;
alter publication supabase_realtime add table completions;
alter publication supabase_realtime add table group_members;
