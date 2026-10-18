import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>,
  )

  const timestamp = parts['t']
  const expectedSig = parts['v1']
  if (!timestamp || !expectedSig) return false

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computedSig === expectedSig
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 })
    }

    const valid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)
    if (!valid) {
      console.error('Invalid Stripe signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const groupId = session.metadata?.group_id || session.client_reference_id

      if (!groupId) {
        console.error('No group_id in session metadata or client_reference_id')
        return new Response('OK', { status: 200 })
      }

      const paymentId = session.payment_intent || session.id

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const { error } = await supabase
        .from('groups')
        .update({ is_pro: true, stripe_payment_id: paymentId })
        .eq('id', groupId)

      if (error) {
        console.error('Failed to update group:', error)
        return new Response('Database error', { status: 500 })
      }

      console.log(`Group ${groupId} upgraded to Pro (payment: ${paymentId})`)
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
