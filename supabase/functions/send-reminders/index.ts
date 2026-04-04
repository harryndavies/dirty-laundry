import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This function should be invoked on a cron schedule (e.g. every 15 minutes)
// via Supabase Dashboard > Edge Functions > Schedules
//
// Cron: */15 * * * * (every 15 minutes)
//
// It checks for chores with reminders matching the current day and time window,
// then sends push notifications to all group members via the send-push function.

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Current time in UTC — users set times assuming UK time for now
    // For a more robust setup, store timezone per group
    const now = new Date()
    // Adjust to UK time (UTC+0 in winter, UTC+1 in summer)
    const ukOffset = getUKOffset(now)
    const ukNow = new Date(now.getTime() + ukOffset * 60 * 60 * 1000)

    const currentDay = ukNow.getUTCDay() // 0=Sun, 1=Mon, etc.
    const currentHour = ukNow.getUTCHours()
    const currentMinute = ukNow.getUTCMinutes()

    // Build a time window: match reminders within the current 15-minute window
    const windowStart = `${String(currentHour).padStart(2, '0')}:${String(Math.floor(currentMinute / 15) * 15).padStart(2, '0')}`
    const nextSlot = Math.floor(currentMinute / 15) * 15 + 15
    const windowEndHour = nextSlot >= 60 ? currentHour + 1 : currentHour
    const windowEndMin = nextSlot >= 60 ? 0 : nextSlot
    const windowEnd = `${String(windowEndHour).padStart(2, '0')}:${String(windowEndMin).padStart(2, '0')}`

    // Find chores with reminders for today in this time window
    const { data: chores, error } = await supabase
      .from('chores')
      .select('id, name, points, group_id, reminder_time')
      .eq('reminder_day', currentDay)
      .gte('reminder_time', windowStart)
      .lt('reminder_time', windowEnd)

    if (error) throw error
    if (!chores?.length) {
      return new Response(JSON.stringify({ message: 'No reminders due', checked: `${windowStart}-${windowEnd} day=${currentDay}` }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Group chores by group_id
    const choresByGroup = new Map<string, typeof chores>()
    for (const chore of chores) {
      const existing = choresByGroup.get(chore.group_id) ?? []
      existing.push(chore)
      choresByGroup.set(chore.group_id, existing)
    }

    let totalSent = 0

    for (const [groupId, groupChores] of choresByGroup) {
      // Get all members with push subscriptions in this group
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (!members?.length) continue

      // Get push subscriptions for these members
      const userIds = members.map(m => m.user_id)
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('user_id, endpoint, keys_p256dh, keys_auth')
        .in('user_id', userIds)

      if (!subscriptions?.length) continue

      // Build notification message
      const choreNames = groupChores.map(c => c.name).join(', ')
      const payload = {
        title: 'Chore reminder!',
        body: groupChores.length === 1
          ? `Time to do: ${choreNames}`
          : `${groupChores.length} chores due: ${choreNames}`,
        url: '/chores',
      }

      // Send via the send-push function for each user
      for (const userId of [...new Set(subscriptions.map(s => s.user_id))]) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ toUserId: userId, payload }),
        })
        if (response.ok) totalSent++
      }
    }

    return new Response(JSON.stringify({ sent: totalSent, choresMatched: chores.length }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Determine UK UTC offset (handles BST)
function getUKOffset(date: Date): number {
  const year = date.getUTCFullYear()
  // BST: last Sunday of March to last Sunday of October
  const marchLast = new Date(Date.UTC(year, 2, 31))
  const bstStart = new Date(Date.UTC(year, 2, 31 - marchLast.getUTCDay(), 1, 0))
  const octLast = new Date(Date.UTC(year, 9, 31))
  const bstEnd = new Date(Date.UTC(year, 9, 31 - octLast.getUTCDay(), 1, 0))
  return date >= bstStart && date < bstEnd ? 1 : 0
}
