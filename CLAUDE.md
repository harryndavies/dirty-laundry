# Dirty Laundry (ChoreQuest)

Group chore management app with gamification (points, leaderboards, roulette). Mobile-first with Capacitor iOS support.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **State:** TanStack React Query (server state) + React Context (auth, group, theme)
- **Styling:** Tailwind CSS 4 — brutalist design system (`brutal-black`, `brutal-white`, `brutal-lime`, `brutal-blue`, `brutal-yellow`, etc.)
- **Mobile:** Capacitor 8 (iOS), app ID `club.dirtylaundry.app`
- **Icons:** Lucide React

## Commands

- `npm run dev` — start dev server
- `npm run build` — typecheck + production build
- `npm run lint` — ESLint

## Project Structure

```
src/
├── pages/           # Route pages (ChoresPage, LeaderboardPage, ActivityPage, etc.)
├── components/
│   ├── ui/          # Reusable UI (Avatar, BottomSheet, ConfirmDialog, Toast, Spinner, Button, Input)
│   └── layout/      # AppShell, BottomNav, SideNav, ProtectedRoute
├── context/         # AuthContext, GroupContext, ThemeContext
├── lib/
│   ├── hooks/       # Data hooks (useChores, useActivity, useLeaderboard, useFairTurn, usePocketMoney, etc.)
│   ├── supabase.ts  # Supabase client
│   └── database.types.ts  # Generated Supabase types
```

## Key Patterns

- **Data fetching:** Custom hooks wrapping `useQuery`/`useMutation` from TanStack Query. Query keys follow `['resource', group?.id]` pattern. Mutations invalidate related queries.
- **Path alias:** `@/` maps to `src/`
- **Routing:** React Router in `App.tsx`. Public routes: `/auth`, `/reset-password`. Protected routes wrapped in `AppShell`: `/chores`, `/leaderboard`, `/activity`, `/roulette`, `/report`, `/group`, `/profile`. Default redirect to `/chores`.
- **Auth:** Supabase Auth with email/password + anonymous accounts. `AuthContext` provides `user`, `session`, `profile`.
- **Groups:** Users belong to one group. `GroupContext` provides `group`, `members`, `userMember`. Realtime subscriptions on group data.
- **Roles:** Group members have roles (`admin`, `member`, `kid`). Kids get restricted UI (no edit/delete, see pocket money instead).
- **Mobile interactions:** Swipe gestures on chore cards (right = edit, left = assign). Touch tracking uses refs to avoid async state issues.

## Database Tables

`profiles`, `groups`, `group_members`, `chores`, `completions`, `invitations`, `nudges`, `push_subscriptions`, `reactions`, `payouts`

## Environment

Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
