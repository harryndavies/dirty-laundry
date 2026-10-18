import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceCall } from '../_shared/auth.ts'

// Run this once a month at 00:00 UTC on the 1st.
// Cron: 0 0 1 * *
//
// Finds the top scorer for the previous calendar month in each group and
// sends a push notification to all group members.

Deno.serve(async (req) => {
  // Scheduled job: only callable with the service role key.
  if (!isServiceCall(req)) return new Response('Forbidden', { status: 403 })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Last month's range: [first day of last month, first day of this month)
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthLabel = monthNames[lastMonthStart.getUTCMonth()]

    const { data: completions, error } = await supabase
      .from('completions')
      .select('group_id, user_id, points_earned')
      .gte('completed_at', lastMonthStart.toISOString())
      .lt('completed_at', monthStart.toISOString())

    if (error) throw error
    if (!completions?.length) {
      return new Response(JSON.stringify({ message: 'No completions last month' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const groups = new Map<string, Map<string, number>>()
    for (const c of completions) {
      if (!groups.has(c.group_id)) groups.set(c.group_id, new Map())
      const userMap = groups.get(c.group_id)!
      userMap.set(c.user_id, (userMap.get(c.user_id) ?? 0) + c.points_earned)
    }

    let totalSent = 0

    for (const [groupId, userPoints] of groups) {
      let championId = ''
      let maxPoints = 0
      for (const [userId, points] of userPoints) {
        if (points > maxPoints) {
          maxPoints = points
          championId = userId
        }
      }

      if (!championId || maxPoints === 0) continue

      const { data: champion } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', championId)
        .single()

      const { data: championMember } = await supabase
        .from('group_members')
        .select('monthly_prize')
        .eq('group_id', groupId)
        .eq('user_id', championId)
        .single()

      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (!members?.length) continue

      const name = champion?.display_name ?? 'Someone'
      const prize = championMember?.monthly_prize?.trim() || null

      const messages = prize
        ? [
            { title: `${monthLabel}'s champion! 👑`, body: `${name} won ${monthLabel} with ${maxPoints} pts and claims: ${prize}` },
            { title: 'Champion crowned 🏆', body: `${name} topped ${monthLabel} (${maxPoints} pts) and walks away with ${prize}.` },
            { title: 'Prize unlocked 🎁', body: `${name} earned ${maxPoints} pts in ${monthLabel} — prize: ${prize}.` },
          ]
        : [
            { title: `${monthLabel}'s champion! 👑`, body: `${name} smashed ${monthLabel} with ${maxPoints} pts. Legendary.` },
            { title: 'Monthly MVP 🏆', body: `${name} topped ${monthLabel}'s leaderboard with ${maxPoints} pts!` },
            { title: 'New month, new winner 🎉', body: `${name} took ${monthLabel} with ${maxPoints} pts. Who's next?` },
            { title: 'Champion crowned 👑', body: `${name} won ${monthLabel} with ${maxPoints} pts. Well deserved!` },
          ]

      const pick = messages[Math.floor(Math.random() * messages.length)]
      const payload = {
        title: pick.title,
        body: pick.body,
        url: '/leaderboard',
      }

      for (const m of members) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ toUserId: m.user_id, payload }),
        })
        if (response.ok) totalSent++
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
