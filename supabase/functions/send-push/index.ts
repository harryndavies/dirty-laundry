import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = 'BEJx_b9XKVAgVEp8kaBSnLuTD16wvPNBdtcOULw8S6ZPqwTZ-GEbImYXWXmCf25auu4qwFbI-acwbr8qKYiBWF0'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = 'mailto:hello@dirtylaundry.app'

// Web Push requires specific crypto operations — we use the web-push-utils approach
// that works in Deno/Edge Functions without Node dependencies

async function importKey(base64: string, type: 'public' | 'private') {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))

  if (type === 'private') {
    return crypto.subtle.importKey('pkcs8', wrapP256Private(raw), { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])
  }
  return crypto.subtle.importKey('raw', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

// Wrap a raw 32-byte P-256 private key in PKCS8 DER
function wrapP256Private(raw: Uint8Array): ArrayBuffer {
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ])
  const pkcs8Middle = new Uint8Array([0xa1, 0x44, 0x03, 0x42, 0x00])
  // We need the public key too — derive it
  const result = new Uint8Array(pkcs8Header.length + 32)
  result.set(pkcs8Header)
  result.set(raw, pkcs8Header.length)
  return result.buffer
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function createVapidJwt(audience: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { aud: audience, exp: now + 86400, sub: VAPID_SUBJECT }

  const enc = new TextEncoder()
  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)))
  const unsigned = `${headerB64}.${payloadB64}`

  const key = await importKey(VAPID_PRIVATE_KEY, 'private')
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(unsigned)
  )

  // Convert DER signature to raw r||s format
  const sig = derToRaw(new Uint8Array(signature))
  return `${unsigned}.${base64urlEncode(sig)}`
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (der.length === 64) return der

  // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
  let offset = 2
  const rLen = der[offset + 1]
  const r = der.slice(offset + 2, offset + 2 + rLen)
  offset = offset + 2 + rLen
  const sLen = der[offset + 1]
  const s = der.slice(offset + 2, offset + 2 + sLen)

  const raw = new Uint8Array(64)
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32))
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32))
  return raw
}

async function encryptPayload(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: string
) {
  const padding = '='.repeat((4 - (subscription.keys_p256dh.length % 4)) % 4)
  const p256dhB64 = (subscription.keys_p256dh + padding).replace(/-/g, '+').replace(/_/g, '/')
  const clientPublicKey = Uint8Array.from(atob(p256dhB64), c => c.charCodeAt(0))

  const authPadding = '='.repeat((4 - (subscription.keys_auth.length % 4)) % 4)
  const authB64 = (subscription.keys_auth + authPadding).replace(/-/g, '+').replace(/_/g, '/')
  const authSecret = Uint8Array.from(atob(authB64), c => c.charCodeAt(0))

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)

  // Import client public key
  const clientKey = await crypto.subtle.importKey('raw', clientPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, localKeyPair.privateKey, 256)

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF for auth info
  const enc = new TextEncoder()
  const authInfo = new Uint8Array([...enc.encode('WebPush: info\0'), ...clientPublicKey, ...new Uint8Array(localPublicKey)])
  const ikmKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits'])

  // PRK from auth
  const prkKey = await crypto.subtle.importKey('raw', authSecret, 'HKDF', false, ['deriveBits'])
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: authInfo }, ikmKey, 256)

  // Derive content encryption key
  const cekInfo = new Uint8Array([...enc.encode('Content-Encoding: aes128gcm\0')])
  const cekKeyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo }, cekKeyMaterial, 128)

  // Derive nonce
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0')])
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, cekKeyMaterial, 96)

  // Encrypt
  const paddedPayload = new Uint8Array([...enc.encode(payload), 2]) // 2 = padding delimiter
  const cek = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, paddedPayload)

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = new Uint8Array([0, 0, 0x10, 0]) // record size 4096
  const keyId = new Uint8Array(localPublicKey)
  const idLen = new Uint8Array([keyId.length])

  const body = new Uint8Array(16 + 4 + 1 + keyId.length + encrypted.byteLength)
  body.set(salt, 0)
  body.set(rs, 16)
  body.set(idLen, 20)
  body.set(keyId, 21)
  body.set(new Uint8Array(encrypted), 21 + keyId.length)

  return { body, localPublicKey: new Uint8Array(localPublicKey) }
}

async function sendWebPush(
  subscription: { endpoint: string; keys_p256dh: string; keys_auth: string },
  payload: object
): Promise<Response> {
  const payloadStr = JSON.stringify(payload)
  const { body } = await encryptPayload(subscription, payloadStr)

  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const jwt = await createVapidJwt(audience)

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { toUserId, payload } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_p256dh, keys_auth')
      .eq('user_id', toUserId)

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendWebPush(sub, payload))
    )

    // Clean up expired subscriptions (410 Gone)
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled' && result.value.status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscriptions[i].endpoint)
      }
    }

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
