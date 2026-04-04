-- Run this in the Supabase SQL Editor to add reminder fields to chores

alter table public.chores
  add column if not exists reminder_day smallint default null,
  add column if not exists reminder_time time default null;

-- reminder_day: 0=Sunday, 1=Monday, ..., 6=Saturday (JS getDay() convention)
-- reminder_time: e.g. '19:00' for 7pm

comment on column public.chores.reminder_day is '0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat';
comment on column public.chores.reminder_time is 'Time of day to send reminder, e.g. 19:00';
