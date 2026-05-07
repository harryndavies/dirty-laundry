import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'
import { isNativeIOS } from './platform'

const VAPID_PUBLIC_KEY = 'BEJx_b9XKVAgVEp8kaBSnLuTD16wvPNBdtcOULw8S6ZPqwTZ-GEbImYXWXmCf25auu4qwFbI-acwbr8qKYiBWF0'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

async function subscribeToPushIOS(userId: string): Promise<boolean> {
  console.log('[push] requesting iOS permissions')
  const perm = await PushNotifications.requestPermissions()
  console.log('[push] permission result:', perm.receive)
  if (perm.receive !== 'granted') return false

  let resolveToken!: (token: string) => void
  let rejectToken!: (err: Error) => void
  const tokenPromise = new Promise<string>((resolve, reject) => {
    resolveToken = resolve
    rejectToken = reject
  })

  // Attach listeners BEFORE calling register() so we can't miss the event.
  const regListener = await PushNotifications.addListener('registration', t => {
    console.log('[push] APNs token received')
    resolveToken(t.value)
  })
  const errListener = await PushNotifications.addListener('registrationError', e => {
    console.error('[push] registrationError:', e.error)
    rejectToken(new Error(e.error))
  })

  console.log('[push] calling register()')
  await PushNotifications.register()

  // Safety timeout in case neither event fires
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('APNs registration timeout (15s)')), 15000)
  )

  try {
    const token = await Promise.race([tokenPromise, timeoutPromise])
    console.log('[push] saving token to Supabase')
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        platform: 'ios',
        device_token: token,
        endpoint: null,
        keys_p256dh: null,
        keys_auth: null,
      },
      { onConflict: 'device_token' }
    )
    if (error) {
      console.error('[push] supabase upsert error:', error)
      return false
    }
    console.log('[push] saved')
    return true
  } catch (err) {
    console.error('[push] subscribe failed:', err)
    return false
  } finally {
    regListener.remove()
    errListener.remove()
  }
}

async function subscribeToPushWeb(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  const sub = subscription.toJSON()

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      platform: 'web',
      endpoint: sub.endpoint!,
      keys_p256dh: sub.keys!.p256dh!,
      keys_auth: sub.keys!.auth!,
      device_token: null,
    },
    { onConflict: 'endpoint' }
  )

  return true
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  return isNativeIOS ? subscribeToPushIOS(userId) : subscribeToPushWeb(userId)
}

let iosListenersAttached = false

export function initIOSPushListeners() {
  if (!isNativeIOS || iosListenersAttached) return
  iosListenersAttached = true

  PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const url = (action.notification.data?.url as string | undefined) ?? '/'
    try {
      window.location.assign(url)
    } catch {
      // Ignore — fall back to current view
    }
  })
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (isNativeIOS) {
    // No public API to "unregister" APNs in Capacitor; just drop the row.
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('platform', 'ios')
    return
  }

  const registration = await navigator.serviceWorker?.ready
  const subscription = await registration?.pushManager?.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await subscription.unsubscribe()
    await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint)
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (isNativeIOS) {
    const perm = await PushNotifications.checkPermissions()
    return perm.receive === 'granted'
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

export async function sendPushToUser(
  toUserId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const session = (await supabase.auth.getSession()).data.session

  await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? supabaseAnonKey}`,
    },
    body: JSON.stringify({ toUserId, payload }),
  })
}
