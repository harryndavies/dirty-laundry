-- Stage 2: data integrity and server-side actions.
--
-- * Columns that must always be set become NOT NULL (production has no gaps).
-- * iOS push registration works (it needed a unique device_token).
-- (Roles were already limited to owner / member / kid by group_members_role_check.)
-- * complete_chore, undo_completion and mark_paid do in one transaction what the
--   app used to do in several separate writes. complete_chore also fixes team
--   completions: the partner's completion was always refused by the insert
--   policy, so partners never actually got their points.
-- The direct writes stay allowed (and guarded) so the shipped iOS app keeps working.

alter table public.group_members alter column group_id set not null, alter column user_id set not null;
alter table public.chores alter column group_id set not null;
alter table public.completions
  alter column group_id set not null,
  alter column user_id set not null,
  alter column completed_at set not null;
alter table public.nudges
  alter column group_id set not null,
  alter column from_user_id set not null,
  alter column to_user_id set not null;
alter table public.reactions alter column completion_id set not null, alter column user_id set not null;
alter table public.invitations alter column group_id set not null;

-- iOS registers its device with upsert(..., { onConflict: 'device_token' }), which
-- needs a plain unique constraint on device_token. Production had none, so no iOS
-- device could ever register for push. (Web rows have no token; NULLs don't clash.)
drop index if exists public.push_subscriptions_device_token_key;
alter table public.push_subscriptions
  add constraint push_subscriptions_device_token_key unique (device_token);

-- Every row already gets a timestamp by default; make that a guarantee.
alter table public.chores alter column created_at set not null;
alter table public.groups alter column created_at set not null;
alter table public.invitations alter column created_at set not null;
alter table public.nudges alter column created_at set not null;
alter table public.payouts alter column created_at set not null;
alter table public.profiles alter column created_at set not null;
alter table public.push_subscriptions alter column created_at set not null;
alter table public.reactions alter column created_at set not null;

-- The existing completion triggers use unqualified table names and inherit the
-- caller's search_path; pin it so they also work when called from functions
-- that run with an empty search_path (as complete_chore does).
alter function public.handle_completion() set search_path = public;
alter function public.handle_one_time_chore() set search_path = public;
alter function public.set_updated_at() set search_path = public;

-- What finishing a chore is worth for someone: its current points, except on a
-- bounty they boosted themselves, where they only get the base points.
create function private.completion_points(p_chore public.chores, p_user uuid)
returns integer
language sql immutable
set search_path = ''
as $$
  select case
    when p_chore.boosted_by = p_user and p_chore.points > coalesce(p_chore.base_points, p_chore.points)
      then coalesce(p_chore.base_points, p_chore.points)
    else coalesce(p_chore.points, 0)
  end
$$;

-- The direct-insert trigger now shares that rule.
create or replace function private.set_completion_points()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_chore public.chores;
begin
  if not private.is_client() then
    return new;
  end if;
  select * into v_chore from public.chores where id = new.chore_id and group_id = new.group_id;
  if not found then
    raise exception 'chore_not_found';
  end if;
  new.points_earned := private.completion_points(v_chore, new.user_id);
  new.completed_at := now();
  if new.with_user_id is not null and not exists (
    select 1 from public.group_members where group_id = new.group_id and user_id = new.with_user_id
  ) then
    raise exception 'not_in_group';
  end if;
  return new;
end;
$$;

-- A photo URL is only accepted if it points into the caller's own folder of
-- this household in the completion-photos bucket.
create function private.is_own_photo_url(p_url text, p_group_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select p_url is null
    or position('/completion-photos/' || p_group_id || '/' || auth.uid() || '/' in p_url) > 0
$$;

create function public.complete_chore(
  p_chore_id uuid,
  p_with_user_id uuid default null,
  p_photo_url text default null,
  p_photo_before_url text default null
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_chore public.chores;
  v_points integer;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_chore from public.chores where id = p_chore_id for update;
  if not found or not private.is_member(v_chore.group_id) then
    raise exception 'chore_not_found';
  end if;
  if p_with_user_id is not null and (p_with_user_id = v_me or not exists (
    select 1 from public.group_members where group_id = v_chore.group_id and user_id = p_with_user_id
  )) then
    raise exception 'not_in_group';
  end if;
  if not private.is_own_photo_url(p_photo_url, v_chore.group_id)
    or not private.is_own_photo_url(p_photo_before_url, v_chore.group_id) then
    raise exception 'invalid_photo';
  end if;

  v_points := private.completion_points(v_chore, v_me);
  v_id := gen_random_uuid();

  -- Yours, plus your partner's if you did it together, in ONE statement: the
  -- one-off-chore trigger deletes the chore after the statement, not between rows.
  insert into public.completions
    (id, chore_id, user_id, group_id, points_earned, completed_at, chore_name, photo_url, photo_before_url, with_user_id)
  select v_id, v_chore.id, v_me, v_chore.group_id, v_points, now(), v_chore.name,
         p_photo_url, p_photo_before_url, p_with_user_id
  union all
  select gen_random_uuid(), v_chore.id, p_with_user_id, v_chore.group_id,
         private.completion_points(v_chore, p_with_user_id), now(), v_chore.name, null, null, v_me
  where p_with_user_id is not null;

  -- A bounty is used up once claimed. (One-off chores are deleted by their trigger.)
  update public.chores set points = base_points, boosted_by = null
  where id = v_chore.id and points is distinct from base_points;

  return jsonb_build_object('completion_id', v_id, 'points_earned', v_points);
end;
$$;

-- Takes back your own completion and its points, in one step.
create function public.undo_completion(p_completion_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_c public.completions;
begin
  select * into v_c from public.completions where id = p_completion_id for update;
  if not found or v_c.user_id is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;
  update public.group_members
  set total_points = greatest(0, total_points - v_c.points_earned)
  where group_id = v_c.group_id and user_id = v_c.user_id;
  delete from public.completions where id = v_c.id;
end;
$$;

-- The owner pays someone their pocket money: record the payout and move their
-- "paid up to" date in one step.
create function public.mark_paid(p_member_id uuid, p_amount_pence integer, p_points integer)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_m public.group_members;
begin
  select * into v_m from public.group_members where id = p_member_id for update;
  if not found or not private.is_owner(v_m.group_id) then
    raise exception 'not_allowed';
  end if;
  if p_amount_pence is null or p_amount_pence < 0 or p_points is null or p_points < 0 then
    raise exception 'invalid_amount';
  end if;
  update public.group_members set paid_up_to = now() where id = v_m.id;
  insert into public.payouts (group_id, user_id, paid_by, amount_pence, points)
  values (v_m.group_id, v_m.user_id, auth.uid(), p_amount_pence, p_points);
end;
$$;

revoke execute on function private.completion_points(public.chores, uuid) from public, anon, authenticated;
-- The direct-insert trigger runs as the signed-in user and needs the (pure) points rule.
grant execute on function private.completion_points(public.chores, uuid) to authenticated;
revoke execute on function private.is_own_photo_url(text, uuid) from public, anon, authenticated;
revoke execute on function public.complete_chore(uuid, uuid, text, text) from public, anon;
revoke execute on function public.undo_completion(uuid) from public, anon;
revoke execute on function public.mark_paid(uuid, integer, integer) from public, anon;
grant execute on function public.complete_chore(uuid, uuid, text, text) to authenticated;
grant execute on function public.undo_completion(uuid) to authenticated;
grant execute on function public.mark_paid(uuid, integer, integer) to authenticated;
