// Who is calling an Edge Function?
//  * another function or a scheduler, with the service role key: trusted;
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
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const token = bearer(req)
  return key.length > 0 && token.length === key.length && token === key
}

/** The signed-in user making the request, or null. */
export async function callerUserId(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = bearer(req)
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error || !data.user ? null : data.user.id
}
