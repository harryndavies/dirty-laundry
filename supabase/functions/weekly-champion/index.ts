import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isServiceCall } from '../_shared/auth.ts'

// Run this once a week (e.g. Sunday at 9pm UK time)
// Cron: 0 21 * * 0 (if using UTC, adjust for BST)
//
// Finds the top scorer for the past week in each group and sends
// a push notification to all group members.

Deno.serve(async (req) => {
  // Scheduled job: only callable with the service role key.
  if (!isServiceCall(req)) return new Response('Forbidden', { status: 403 })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate this week's range (Monday 00:00 to now)
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const monday = new Date(now)
    monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setUTCHours(0, 0, 0, 0)

    // Get all completions this week grouped by group and user
    const { data: completions, error } = await supabase
      .from('completions')
      .select('group_id, user_id, points_earned')
      .gte('completed_at', monday.toISOString())

    if (error) throw error
    if (!completions?.length) {
      return new Response(JSON.stringify({ message: 'No completions this week' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Aggregate points by group → user
    const groups = new Map<string, Map<string, number>>()
    for (const c of completions) {
      if (!groups.has(c.group_id)) groups.set(c.group_id, new Map())
      const userMap = groups.get(c.group_id)!
      userMap.set(c.user_id, (userMap.get(c.user_id) ?? 0) + c.points_earned)
    }

    let totalSent = 0

    for (const [groupId, userPoints] of groups) {
      // Find the champion
      let championId = ''
      let maxPoints = 0
      for (const [userId, points] of userPoints) {
        if (points > maxPoints) {
          maxPoints = points
          championId = userId
        }
      }

      if (!championId || maxPoints === 0) continue

      // Get champion's name
      const { data: champion } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', championId)
        .single()

      // Get all members
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)

      if (!members?.length) continue

      const name = champion?.display_name ?? 'Someone'
      const messages = [
        {
          title: 'Weekly champion! 👑',
          body: `${name} smashed it this week with ${maxPoints} pts. Nice one!`,
        },
        {
          title: "This week's MVP 🏆",
          body: `${name} topped the leaderboard with ${maxPoints} pts!`,
        },
        {
          title: 'What a week! 🔥',
          body: `${name} earned ${maxPoints} pts this week. Legendary effort.`,
        },
        {
          title: 'Champion crowned 👑',
          body: `${name} takes the top spot with ${maxPoints} pts. Well deserved!`,
        },
        {
          title: "Look who's winning! 🎉",
          body: `${name} led the way this week — ${maxPoints} pts. Keep it up!`,
        },
      ]
      const pick = messages[Math.floor(Math.random() * messages.length)]
      const payload = {
        title: pick.title,
        body: pick.body,
        url: '/report',
      }

      for (const m of members) {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
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
