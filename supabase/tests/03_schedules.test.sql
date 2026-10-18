-- The scheduled jobs exist, and only the database itself can trigger them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select is((select count(*)::int from cron.job where jobname = 'dirty-laundry-send-reminders' and schedule = '*/15 * * * *'),
  1, 'reminders run every 15 minutes');
select is((select count(*)::int from cron.job where jobname = 'dirty-laundry-weekly-champion'), 1, 'the weekly champion is scheduled');
select is((select count(*)::int from cron.job where jobname = 'dirty-laundry-monthly-champion'), 1, 'the monthly champion is scheduled');

-- (Checked as a privilege: calling a refused function from a SET ROLE session
-- crashes this local Postgres image. Through the API it is refused normally.)
select ok(not has_function_privilege('authenticated', 'private.call_function(text)', 'execute')
  and not has_function_privilege('anon', 'private.call_function(text)', 'execute'),
  'app users cannot trigger a scheduled job');

select * from finish();
rollback;
