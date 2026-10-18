-- complete_chore, undo_completion and mark_paid.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.uid(p_letter text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0000-00000000000' || p_letter)::uuid;
$$;
create function pg_temp.as_user(p_letter text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', pg_temp.uid(p_letter), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;
create temp table ctx (k text primary key, v text);
grant select, insert on ctx to authenticated;
create function pg_temp.v(p_k text) returns text language sql stable as $$ select v from ctx where k = p_k $$;
create function pg_temp.points(p_letter text) returns int language sql stable security definer as $$
  select total_points from public.group_members where user_id = pg_temp.uid(p_letter)
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- Ana (owner) and Ben (member) share a flat; Xan lives elsewhere.
insert into auth.users (id, email) values
  (pg_temp.uid('a'), 'ana@test.local'), (pg_temp.uid('b'), 'ben@test.local'), (pg_temp.uid('d'), 'xan@test.local');
insert into public.groups (id, name, created_by) values ('10000000-0000-0000-0000-000000000001', 'Flat', pg_temp.uid('a'));
insert into public.group_members (group_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', pg_temp.uid('a'), 'owner'),
  ('10000000-0000-0000-0000-000000000001', pg_temp.uid('b'), 'member');
insert into public.chores (id, group_id, name, points, base_points, is_persistent, created_by) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Bins', 20, 20, true, pg_temp.uid('a')),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Oven', 40, 40, false, pg_temp.uid('a'));
insert into ctx values ('g', '10000000-0000-0000-0000-000000000001'), ('bins', '20000000-0000-0000-0000-000000000001'),
  ('oven', '20000000-0000-0000-0000-000000000002');

-- --- complete_chore -------------------------------------------------------
select pg_temp.as_user('b');
insert into ctx select 'c1', (public.complete_chore(pg_temp.v('bins')::uuid))->>'completion_id';
reset role;
select is(pg_temp.points('b'), 20, 'completing a chore awards its points');

select pg_temp.as_user('b');
select public.complete_chore(pg_temp.v('oven')::uuid, pg_temp.uid('a'));
reset role;
select is(pg_temp.points('b'), 60, 'doing it together: you score');
select is(pg_temp.points('a'), 40, 'doing it together: your partner scores too (this never worked before)');
select is((select count(*)::int from public.chores where id = pg_temp.v('oven')::uuid), 0,
  'a one-off chore disappears once done');

-- Bounties
select pg_temp.as_user('b');
update public.chores set points = 50, boosted_by = pg_temp.uid('b') where id = pg_temp.v('bins')::uuid;
select is((public.complete_chore(pg_temp.v('bins')::uuid))->>'points_earned', '20',
  'your own bounty only pays the base points');
reset role;
select is((select points from public.chores where id = pg_temp.v('bins')::uuid), 20,
  'the bounty is used up afterwards');

select pg_temp.as_user('b');
select throws_ok($$ select public.complete_chore(pg_temp.v('bins')::uuid, pg_temp.uid('d')) $$, 'not_in_group',
  'you can only team up with someone in your household');
select throws_ok($$ select public.complete_chore(pg_temp.v('bins')::uuid, null,
  'https://x.supabase.co/storage/v1/object/public/completion-photos/' || pg_temp.v('g') || '/' || pg_temp.uid('a') || '/p.jpg') $$,
  'invalid_photo', 'photos must be your own upload');
select lives_ok($$ select public.complete_chore(pg_temp.v('bins')::uuid, null,
  'https://x.supabase.co/storage/v1/object/public/completion-photos/' || pg_temp.v('g') || '/' || pg_temp.uid('b') || '/p.jpg') $$,
  'your own photo is accepted');
reset role;
select pg_temp.as_user('d');
select throws_ok($$ select public.complete_chore(pg_temp.v('bins')::uuid) $$, 'chore_not_found',
  'outsiders cannot complete your chores');
reset role;

-- --- undo_completion -------------------------------------------------------
select pg_temp.as_user('a');
select throws_ok($$ select public.undo_completion(pg_temp.v('c1')::uuid) $$, 'not_allowed',
  'you cannot undo someone else''s completion');
reset role;
select pg_temp.as_user('b');
select lives_ok($$ select public.undo_completion(pg_temp.v('c1')::uuid) $$, 'you can undo your own');
reset role;
select is(pg_temp.points('b'), 100 - 20, '...which takes its points back (100 before the undo)');

-- --- mark_paid -------------------------------------------------------------
select pg_temp.as_user('b');
select throws_ok($$ select public.mark_paid((select id from public.group_members where user_id = pg_temp.uid('a')), 100, 10) $$,
  'not_allowed', 'only the owner can pay people');
reset role;

select * from finish();
rollback;
