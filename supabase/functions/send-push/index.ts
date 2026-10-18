import { adminClient, callerUserId, isServiceCall } from '../_shared/auth.ts'
import webpush from 'https://esm.sh/web-push@3.6.7'

const VAPID_PUBLIC_KEY = 'BEJx_b9XKVAgVEp8kaBSnLuTD16wvPNBdtcOULw8S6ZPqwTZ-GEbImYXWXmCf25auu4qwFbI-acwbr8qKYiBWF0'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

const APNS_KEY_P8     = Deno.env.get('APNS_KEY_P8')
const APNS_KEY_ID     = Deno.env.get('APNS_KEY_ID')
const APNS_TEAM_ID    = Deno.env.get('APNS_TEAM_ID') ?? '4S99657ND4'
const APNS_BUNDLE_ID  = Deno.env.get('APNS_BUNDLE_ID') ?? 'club.dirtylaundry.app'
// 'production' (App Store) or 'sandbox' (TestFlight is also production now; use sandbox only for Xcode-installed dev builds)
const APNS_HOST       = Deno.env.get('APNS_HOST') ?? 'api.push.apple.com'

webpush.setVapidDetails('mailto:hello@dirtylaundry.club', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

// ----- APNs JWT (ES256, regenerated lazily and cached for ~50 min) -----

let cachedApnsJwt: { token: string; exp: number } | null = null

async function importP8(p8: string): Promise<CryptoKey> {
  const pem = p8
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    der.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
}

function b64url(input: string | Uint8Array): string {
  const str = typeof input === 'string' ? input : String.fromCharCode(...input)
  return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedApnsJwt && cachedApnsJwt.exp > now + 60) return cachedApnsJwt.token
  if (!APNS_KEY_P8 || !APNS_KEY_ID) throw new Error('APNs key not configured')

  const header = b64url(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID, typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }))
  const signingInput = `${header}.${payload}`

  const key = await importP8(APNS_KEY_P8)
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput))
  )
  const token = `${signingInput}.${b64url(sig)}`

  // Apple requires JWTs be regenerated every 20-60 minutes
  cachedApnsJwt = { token, exp: now + 50 * 60 }
  return token
}

async function sendApns(deviceToken: string, payload: { title: string; body: string; url?: string }): Promise<{ ok: boolean; status: number; reason?: string }> {
  const jwt = await getApnsJwt()

  const aps = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
    },
    url: payload.url,
  }

  const res = await fetch(`https://${APNS_HOST}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
    },
    body: JSON.stringify(aps),
  })

  if (res.ok) return { ok: true, status: res.status }
  const body = await res.text().catch(() => '')
  let reason: string | undefined
  try { reason = JSON.parse(body).reason } catch { reason = body }
  return { ok: false, status: res.status, reason }
}

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const { toUserId, payload: rawPayload } = await req.json()
    const supabase = adminClient()

    // Only other functions (service key) or a signed-in housemate may send.
    if (!isServiceCall(req)) {
      const caller = await callerUserId(req, supabase)
      if (!caller) return reply({ error: 'unauthorised' }, 401)
      const { data: shared } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in('user_id', [caller, toUserId])
      const groupsOf = (id: string) => new Set((shared ?? []).filter(r => r.user_id === id).map(r => r.group_id))
      const callerGroups = groupsOf(caller)
      const sharesHousehold = [...groupsOf(toUserId)].some(g => callerGroups.has(g))
      if (!sharesHousehold) return reply({ error: 'forbidden' }, 403)
    }

    // Plain text only, and links may only point inside the app.
    const payload = {
      title: String(rawPayload?.title ?? '').slice(0, 120),
      body: String(rawPayload?.body ?? '').slice(0, 300),
      url: typeof rawPayload?.url === 'string' && /^\/(?!\/)/.test(rawPayload.url) ? rawPayload.url : '/',
    }
    if (!toUserId || !payload.title) return reply({ error: 'bad request' }, 400)

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('platform, endpoint, keys_p256dh, keys_auth, device_token')
      .eq('user_id', toUserId)

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json', ...cors } })
    }

    let sent = 0
    for (const sub of subscriptions) {
      try {
        if (sub.platform === 'ios' && sub.device_token) {
          const result = await sendApns(sub.device_token, payload)
          if (result.ok) {
            sent++
          } else if (result.status === 410 || result.reason === 'BadDeviceToken' || result.reason === 'Unregistered') {
            await supabase.from('push_subscriptions').delete().eq('device_token', sub.device_token)
          } else {
            console.error(`APNs failed ${result.status}: ${result.reason}`)
          }
        } else if (sub.endpoint) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh!, auth: sub.keys_auth! } },
            JSON.stringify(payload)
          )
          sent++
        }
      } catch (err: any) {
        if (err.statusCode === 410 && sub.endpoint) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        console.error(`Push failed: ${err.message}`)
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json', ...cors } })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } })
  }
})
