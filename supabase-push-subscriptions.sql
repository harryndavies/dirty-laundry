-- Run this in the Supabase SQL Editor to create the push_subscriptions table

create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  keys_p256dh text not null,
  keys_auth text not null,
  created_at timestamptz default now()
);

-- RLS policies
alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow the edge function (service role) to read all subscriptions
create policy "Service role can read all subscriptions"
  on public.push_subscriptions for select
  using (auth.role() = 'service_role');

-- Index for fast lookups by user
create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);
