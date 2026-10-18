-- Scheduled jobs: reminders and the weekly/monthly champions.
--
-- pg_cron runs each job inside the database and pg_net calls the Edge Function.
-- The functions' URL and the shared cron secret live in Vault, never in the
-- repo; see the README ("Scheduled jobs") for the one-off setup. Until both
-- secrets exist the jobs do nothing, so a fresh local database is quiet.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create function private.call_function(p_name text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets
  where name = 'dirty_laundry_functions_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets
  where name = 'dirty_laundry_cron_secret';
  if v_url is null or v_secret is null then
    raise notice 'call_function(%): Vault secrets not set, skipping', p_name;
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;
revoke all on function private.call_function(text) from public, anon, authenticated;

-- Times are UTC. Reminders match chores in the current 15-minute window;
-- 20:00 UTC on Sunday is 8pm (winter) or 9pm (summer) in the UK.
select cron.schedule('dirty-laundry-send-reminders', '*/15 * * * *',
  $$select private.call_function('send-reminders')$$);
select cron.schedule('dirty-laundry-weekly-champion', '0 20 * * 0',
  $$select private.call_function('weekly-champion')$$);
select cron.schedule('dirty-laundry-monthly-champion', '5 0 1 * *',
  $$select private.call_function('monthly-champion')$$);
