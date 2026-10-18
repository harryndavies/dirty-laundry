-- Stage 1 security rules, tested against the real policies and triggers.
-- People: Ana (owner), Ben (member), Kit (kid), Xan (stranger, not in the household).
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

-- Sign in as someone (claims for auth.uid()) and act as the client role.
create function pg_temp.as_user(p_letter text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.uid(p_letter), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create function pg_temp.uid(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-00000000000' || p_letter)::uuid;
$$;
create temp table ctx (k text primary key, v text);
grant select, insert on ctx to authenticated;
create function pg_temp.v(p_k text) returns text language sql stable as $$ select v from ctx where k = p_k $$;
create function pg_temp.points(p_letter text) returns int language sql stable security definer as $$
  select total_points from public.group_members where user_id = pg_temp.uid(p_letter)
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Users (the auth trigger creates their profiles).
insert into auth.users (id, email) values
  (pg_temp.uid('a'), 'ana@test.local'), (pg_temp.uid('b'), 'ben@test.local'),
  (pg_temp.uid('c'), 'kit@test.local'), (pg_temp.uid('d'), 'xan@test.local');

-- Ana creates a household the way the app does.
select pg_temp.as_user('a');
with g as (insert into public.groups (name, created_by) values ('Flat 4', pg_temp.uid('a')) returning id)
insert into ctx select 'group', id from g;
insert into public.group_members (group_id, user_id, role) values (pg_temp.v('group')::uuid, pg_temp.uid('a'), 'owner');
insert into ctx select 'code', invite_code from public.groups where id = pg_temp.v('group')::uuid;
reset role;

-- --- Joining ------------------------------------------------------------
select pg_temp.as_user('d');
select is((select count(*)::int from public.groups), 0, 'a stranger cannot list households');
select throws_ok($$ insert into public.group_members (group_id, user_id, role)
  values (pg_temp.v('group')::uuid, pg_temp.uid('d'), 'member') $$, '42501', NULL,
  'a stranger cannot add themselves to a household directly');
select throws_ok($$ select public.join_group_by_code('NOPE1234') $$, 'invalid_code', 'a wrong code is rejected');
reset role;

select pg_temp.as_user('b');
select lives_ok($$ select public.join_group_by_code(lower(pg_temp.v('code'))) $$, 'the right code joins (case-insensitive)');
select throws_ok($$ select public.join_group_by_code(pg_temp.v('code')) $$, 'already_member', 'joining twice is refused');
reset role;
select pg_temp.as_user('c');
select public.join_group_by_code(pg_temp.v('code'));
reset role;

-- --- Roles ----------------------------------------------------------------
select pg_temp.as_user('a');
select lives_ok($$ update public.group_members set role = 'kid' where user_id = pg_temp.uid('c') $$,
  'the owner can make someone a kid');
select throws_ok($$ update public.group_members set role = 'owner' where user_id = pg_temp.uid('b') $$,
  'not_allowed', 'nobody can be made an owner');
reset role;
select pg_temp.as_user('b');
select throws_ok($$ update public.group_members set role = 'kid' where user_id = pg_temp.uid('b') $$,
  'not_allowed', 'members cannot change roles, even their own');
update public.group_members set role = 'owner' where user_id = pg_temp.uid('a');
reset role;
select is((select role from public.group_members where user_id = pg_temp.uid('a')), 'owner',
  'a member''s update to someone else''s row does nothing');

-- --- Chores and points ------------------------------------------------------
select pg_temp.as_user('a');
with c as (
  insert into public.chores (group_id, name, points, base_points, is_persistent, created_by)
  values (pg_temp.v('group')::uuid, 'Bins', 20, 20, true, pg_temp.uid('a')) returning id
)
insert into ctx select 'chore', id from c;
reset role;

select pg_temp.as_user('c');
select throws_ok($$ insert into public.chores (group_id, name, points, base_points, created_by)
  values (pg_temp.v('group')::uuid, 'Kid chore', 5, 5, pg_temp.uid('c')) $$, '42501', NULL,
  'kids cannot add chores');
reset role;

select pg_temp.as_user('b');
insert into public.completions (chore_id, user_id, group_id, points_earned)
  values (pg_temp.v('chore')::uuid, pg_temp.uid('b'), pg_temp.v('group')::uuid, 9999);
reset role;
select is(pg_temp.points('b'), 20, 'points come from the chore, not from what the app sends');

select pg_temp.as_user('b');
select throws_ok($$ update public.group_members set total_points = 5000 where user_id = pg_temp.uid('b') $$,
  'not_allowed', 'you cannot raise your own points');
select lives_ok($$ update public.group_members set total_points = 10 where user_id = pg_temp.uid('b') $$,
  'you can lower your own points (undo)');
update public.group_members set total_points = 0 where user_id = pg_temp.uid('a');
reset role;
select is(pg_temp.points('a'), 0, 'you cannot touch someone else''s points') ;

-- Bounty: Ben boosts the chore, so Ben only gets the base points; Ana gets the boost.
select pg_temp.as_user('b');
update public.chores set points = 50, boosted_by = pg_temp.uid('b') where id = pg_temp.v('chore')::uuid;
insert into public.completions (chore_id, user_id, group_id, points_earned)
  values (pg_temp.v('chore')::uuid, pg_temp.uid('b'), pg_temp.v('group')::uuid, 50);
reset role;
select is(pg_temp.points('b'), 30, 'you cannot claim your own bounty (base points only)');
select pg_temp.as_user('a');
insert into public.completions (chore_id, user_id, group_id, points_earned)
  values (pg_temp.v('chore')::uuid, pg_temp.uid('a'), pg_temp.v('group')::uuid, 0);
reset role;
select is(pg_temp.points('a'), 50, 'someone else completing a bounty gets the boosted points');

select pg_temp.as_user('b');
select throws_ok($$ update public.chores set points = 100000 where id = pg_temp.v('chore')::uuid $$,
  '23514', NULL, 'chores cannot be worth absurd points');
select throws_ok($$ update public.completions set points_earned = 999 where user_id = pg_temp.uid('b') $$,
  'not_allowed', 'a completion''s points cannot be edited afterwards');
select lives_ok($$ update public.completions set photo_url = null where user_id = pg_temp.uid('b') $$,
  'you can still remove the photo from your completion');
reset role;

-- --- Pro and pocket money ---------------------------------------------------
select pg_temp.as_user('a');
select throws_ok($$ update public.groups set is_pro = true where id = pg_temp.v('group')::uuid $$,
  'not_allowed', 'owners cannot switch Pro on themselves');
select throws_ok($$ update public.groups set pocket_money_rate = 10 where id = pg_temp.v('group')::uuid $$,
  'pro_required', 'pocket money needs Pro');
select lives_ok($$ update public.groups set weekly_goal = 300 where id = pg_temp.v('group')::uuid $$,
  'owners can still change normal settings');
reset role;
update public.groups set is_pro = true where id = pg_temp.v('group')::uuid; -- the Stripe webhook (trusted)
select pg_temp.as_user('a');
select lives_ok($$ update public.groups set pocket_money_rate = 10 where id = pg_temp.v('group')::uuid $$,
  'once Pro, the owner can turn on pocket money');
reset role;

-- --- Payouts ------------------------------------------------------------------
select pg_temp.as_user('b');
select throws_ok($$ insert into public.payouts (group_id, user_id, paid_by, amount_pence, points)
  values (pg_temp.v('group')::uuid, pg_temp.uid('c'), pg_temp.uid('b'), 100, 10) $$, '42501', NULL,
  'only the owner can log a payout');
reset role;
select pg_temp.as_user('a');
select lives_ok($$ insert into public.payouts (group_id, user_id, paid_by, amount_pence, points)
  values (pg_temp.v('group')::uuid, pg_temp.uid('c'), pg_temp.uid('a'), 100, 10) $$,
  'the owner can pay a kid');
select throws_ok($$ insert into public.payouts (group_id, user_id, paid_by, amount_pence, points)
  values (pg_temp.v('group')::uuid, pg_temp.uid('d'), pg_temp.uid('a'), 100, 10) $$, '42501', NULL,
  'payouts only go to people in the household');
reset role;

-- --- Privacy ------------------------------------------------------------------
select pg_temp.as_user('d');
select is((select count(*)::int from public.profiles), 1, 'a stranger only sees their own profile');
select is((select count(*)::int from public.completions) + (select count(*)::int from public.reactions), 0,
  'a stranger sees no completions or reactions');
reset role;
select pg_temp.as_user('b');
select is((select count(*)::int from public.profiles), 3, 'housemates see each other''s profiles');
select throws_ok($$ insert into public.nudges (group_id, from_user_id, to_user_id)
  values (pg_temp.v('group')::uuid, pg_temp.uid('b'), pg_temp.uid('d')) $$, '42501', NULL,
  'you can only nudge people in your household');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('completion-photos', pg_temp.v('group') || '/' || pg_temp.uid('a') || '/x.jpg') $$, '42501', NULL,
  'photos only go into your own folder');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('completion-photos', pg_temp.v('group') || '/' || pg_temp.uid('b') || '/x.jpg') $$,
  'uploading your own photo still works');
reset role;

select * from finish();
rollback;
