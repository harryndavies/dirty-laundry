export interface TourStep {
  target: string | null // data-tour attribute value, null = no spotlight
  title: string
  description: string
  color: string
  action: 'next' | 'tap' // 'next' = manual button, 'tap' = user taps the element
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'WELCOME TO DIRTY LAUNDRY',
    description:
      'Your group chore tracker. Complete chores, earn points, and climb the leaderboard. Let\u2019s get you set up!',
    color: 'bg-brutal-yellow',
    action: 'next',
  },
  {
    target: 'chore-packs',
    title: 'PICK A STARTER PACK',
    description:
      'Tap a pack below to add a set of chores for your household. You can always edit them later.',
    color: 'bg-brutal-lime',
    action: 'tap',
  },
  {
    target: 'chore-add',
    title: 'ADD YOUR OWN',
    description:
      'Tap the + button to create a custom chore. Set a name, points, area, and reminders.',
    color: 'bg-brutal-blue',
    action: 'tap',
  },
  {
    target: 'chore-complete',
    title: 'COMPLETE A CHORE',
    description:
      'Nice! Now tap the green tick on a chore to mark it as done and earn your first points.',
    color: 'bg-brutal-lime',
    action: 'tap',
  },
  {
    target: 'header-actions',
    title: 'QUICK ACTIONS',
    description:
      'Use Focus mode to tackle one chore at a time, or spin the Roulette to pick a random one.',
    color: 'bg-brutal-pink',
    action: 'next',
  },
  {
    target: 'bottom-nav',
    title: 'EXPLORE THE APP',
    description:
      'Check Scores for the leaderboard, Log for recent activity, and Group to invite your housemates.',
    color: 'bg-brutal-orange',
    action: 'next',
  },
  {
    target: null,
    title: 'YOU\u2019RE ALL SET!',
    description: 'You\u2019re ready to go. Get cleaning and start climbing the leaderboard!',
    color: 'bg-brutal-yellow',
    action: 'next',
  },
]
