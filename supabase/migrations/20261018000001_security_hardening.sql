-- Stage 1 security hardening.
--
-- Closes holes in the live policies while keeping the shipped app working:
--  * households could be listed (and joined) by anyone with the public key;
--  * any user could update any member row in any household (points, roles…);
--  * points were taken from whatever the client sent;
--  * Pro could be switched on by a group owner without paying;
--  * anyone could log payouts into any household;
--  * every profile and reaction was readable by anyone.
--
-- Rules for "the client" apply to the anon and authenticated roles only.
-- Database functions (owned by postgres) and Edge Functions using the service
-- role are trusted, so triggers such as handle_completion keep working.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Is the current request coming from the browser/app (not a trusted function)?
create function private.is_client()
returns boolean
language sql stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated')
$$;

create function private.is_member(p_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  )
$$;

create function private.is_owner(p_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'owner'
  )
$$;

-- Adults (owner or member) can manage chores; kids can only complete them.
create function private.is_adult(p_group_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role in ('owner', 'member')
  )
$$;

-- Does the current user share a household with p_user?
create function private.shares_group(p_user uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

revoke all on function private.is_client() from public;
revoke all on function private.is_member(uuid) from public;
revoke all on function private.is_owner(uuid) from public;
revoke all on function private.is_adult(uuid) from public;
revoke all on function private.shares_group(uuid) from public;
grant execute on function private.is_client() to anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
grant execute on function private.is_adult(uuid) to authenticated;
grant execute on function private.shares_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------

-- No more "anyone can read any household with an invite code".
drop policy if exists "groups_read" on public.groups;
create policy "groups_read" on public.groups for select to authenticated
  using (private.is_member(id) or created_by = auth.uid());

-- Joining by invite code goes through this function instead of a public lookup.
create function public.join_group_by_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_group from public.groups
  where invite_code = upper(btrim(coalesce(p_code, '')));
  if not found then
    raise exception 'invalid_code';
  end if;
  if exists (select 1 from public.group_members where group_id = v_group.id and user_id = auth.uid()) then
    raise exception 'already_member';
  end if;
  insert into public.group_members (group_id, user_id, role) values (v_group.id, auth.uid(), 'member');
  return to_jsonb(v_group);
end;
$$;
revoke execute on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;

-- Pro and payment fields can only be set by the Stripe webhook (service role);
-- pocket money needs Pro, as the app already says.
create function private.guard_groups_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_client() then
    return new;
  end if;
  if new.is_pro is distinct from old.is_pro
    or new.stripe_payment_id is distinct from old.stripe_payment_id
    or new.created_by is distinct from old.created_by
    or new.invite_code is distinct from old.invite_code then
    raise exception 'not_allowed';
  end if;
  if new.pocket_money_rate is not null and new.pocket_money_rate is distinct from old.pocket_money_rate
    and not new.is_pro then
    raise exception 'pro_required';
  end if;
  return new;
end;
$$;
create trigger guard_groups_update before update on public.groups
  for each row execute function private.guard_groups_update();

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------

-- Was "USING (true)": anyone could edit any member of any household.
drop policy if exists "group_members_update" on public.group_members;
create policy "group_members_update" on public.group_members for update to authenticated
  using (user_id = auth.uid() or private.is_owner(group_id))
  with check (user_id = auth.uid() or private.is_owner(group_id));

-- Clients only insert themselves as the owner of a household they just created;
-- everyone else joins through join_group_by_code.
drop policy if exists "group_members_insert" on public.group_members;
create policy "group_members_insert" on public.group_members for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'owner'
    and exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- What each person may change on a member row:
--  * owner: someone else's role (member <-> kid), chore share, paid-up-to;
--  * yourself: your monthly prize and savings goal, and lowering your own points (undo);
--  * owner or yourself: monthly prize, savings goal.
create function private.guard_group_members_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_self boolean;
  v_owner boolean;
begin
  if not private.is_client() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.total_points := 0;
    return new;
  end if;

  v_self := old.user_id = auth.uid();
  v_owner := private.is_owner(old.group_id);

  if new.id is distinct from old.id or new.group_id is distinct from old.group_id
    or new.user_id is distinct from old.user_id then
    raise exception 'not_allowed';
  end if;

  -- Points only ever go down from the client, and only your own (undo).
  if new.total_points is distinct from old.total_points
    and (not v_self or new.total_points > old.total_points or new.total_points < 0) then
    raise exception 'not_allowed';
  end if;

  if new.role is distinct from old.role
    and (not v_owner or v_self or old.role = 'owner' or new.role not in ('member', 'kid')) then
    raise exception 'not_allowed';
  end if;

  if (new.chore_share is distinct from old.chore_share or new.paid_up_to is distinct from old.paid_up_to)
    and not v_owner then
    raise exception 'not_allowed';
  end if;

  if (new.monthly_prize is distinct from old.monthly_prize
      or new.savings_goal is distinct from old.savings_goal
      or new.savings_goal_name is distinct from old.savings_goal_name)
    and not (v_self or v_owner) then
    raise exception 'not_allowed';
  end if;

  return new;
end;
$$;
create trigger guard_group_members_write before insert or update on public.group_members
  for each row execute function private.guard_group_members_write();

-- ---------------------------------------------------------------------------
-- Chores and completions
-- ---------------------------------------------------------------------------

-- Generous ceilings (the app's stepper has no maximum; live data peaks at 150).
alter table public.chores
  add constraint chores_points_range check (points is null or points between 0 and 1000),
  add constraint chores_base_points_range check (base_points is null or base_points between 0 and 500);

-- Kids complete chores; adults manage them (the app already hides this from kids).
drop policy if exists "chores_insert" on public.chores;
create policy "chores_insert" on public.chores for insert to authenticated
  with check (private.is_adult(group_id));
drop policy if exists "chores_update" on public.chores;
create policy "chores_update" on public.chores for update to authenticated
  using (private.is_member(group_id))
  with check (private.is_member(group_id));

-- The database decides what a completion is worth: the chore's current points,
-- except on your own bounty, where you only get the base points.
create function private.set_completion_points()
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
  new.points_earned := case
    when v_chore.boosted_by = auth.uid() and v_chore.points > coalesce(v_chore.base_points, v_chore.points)
      then coalesce(v_chore.base_points, v_chore.points)
    else coalesce(v_chore.points, 0)
  end;
  new.completed_at := now();
  if new.with_user_id is not null and not exists (
    select 1 from public.group_members where group_id = new.group_id and user_id = new.with_user_id
  ) then
    raise exception 'not_in_group';
  end if;
  return new;
end;
$$;
create trigger set_completion_points before insert on public.completions
  for each row execute function private.set_completion_points();

-- After the fact, clients may only add or remove the photos on their completion.
create function private.guard_completions_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_client() then
    return new;
  end if;
  if (to_jsonb(new) - 'photo_url' - 'photo_before_url') is distinct from
     (to_jsonb(old) - 'photo_url' - 'photo_before_url') then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$$;
create trigger guard_completions_update before update on public.completions
  for each row execute function private.guard_completions_update();

-- ---------------------------------------------------------------------------
-- Payouts, nudges, reactions, profiles
-- ---------------------------------------------------------------------------

drop policy if exists "payouts_insert" on public.payouts;
create policy "payouts_insert" on public.payouts for insert to authenticated
  with check (
    paid_by = auth.uid() and private.is_owner(group_id)
    and exists (select 1 from public.group_members m where m.group_id = payouts.group_id and m.user_id = payouts.user_id)
    and amount_pence >= 0 and points >= 0
  );

drop policy if exists "nudges_insert" on public.nudges;
create policy "nudges_insert" on public.nudges for insert to authenticated
  with check (
    from_user_id = auth.uid() and private.is_member(group_id)
    and exists (select 1 from public.group_members m where m.group_id = nudges.group_id and m.user_id = nudges.to_user_id)
  );

drop policy if exists "reactions_read" on public.reactions;
create policy "reactions_read" on public.reactions for select to authenticated
  using (exists (
    select 1 from public.completions c where c.id = completion_id and private.is_member(c.group_id)
  ));
drop policy if exists "reactions_insert" on public.reactions;
create policy "reactions_insert" on public.reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.completions c where c.id = completion_id and private.is_member(c.group_id))
  );

-- Profiles: yourself and the people you share a household with.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated
  using (id = auth.uid() or private.shares_group(id));

-- ---------------------------------------------------------------------------
-- Photo uploads: only into your own folder of a household you belong to.
-- (Reads stay public for now; the shipped app shows photos by public URL.)
-- ---------------------------------------------------------------------------
drop policy if exists "completion_photos_insert" on storage.objects;
create policy "completion_photos_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'completion-photos'
    and (storage.foldername(name))[2] = auth.uid()::text
    and private.is_member(((storage.foldername(name))[1])::uuid)
  );
