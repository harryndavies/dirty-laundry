// Who is calling an Edge Function?
//  * another function, with the service role key: trusted;
//  * the database's scheduled jobs, with the cron secret: trusted;
//  * a signed-in user, with their access token;
//  * anyone else: rejected.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

function bearer(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
}

/** True when the request carries the service role key (other functions, schedulers). */
export function isServiceCall(req: Request): boolean {
  return sameSecret(bearer(req), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
}

function sameSecret(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** True when a scheduled job (pg_cron, see the schedules migration) is calling. */
export function isCronCall(req: Request): boolean {
  return sameSecret(req.headers.get('x-cron-secret') ?? '', Deno.env.get('CRON_SECRET') ?? '')
}

/** Scheduled functions accept the service role key or the cron secret. */
export function isTrustedCall(req: Request): boolean {
  return isServiceCall(req) || isCronCall(req)
}

/** The signed-in user making the request, or null. */
export async function callerUserId(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = bearer(req)
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error || !data.user ? null : data.user.id
}
