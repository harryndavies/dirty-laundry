# Dirty Laundry

Housework, but make it fun. A mobile-first app that turns a household's to-do list into a game:
points, leaderboards, streaks and a little bit of chaos. It works for flatshares, couples and
families.

**Use it:** [app.dirtylaundry.club](https://app.dirtylaundry.club) ·
**About:** [dirtylaundry.club](https://dirtylaundry.club) ·
**Marketing site:** [`site/`](site)

1. Create a group and invite your housemates with a share link.
2. Add chores and give each one points. Scrubbing the oven is worth more than wiping a counter.
3. Agree a fair split (say 40/35/25), so everyone is scored against their own share.
4. Do a chore, mark it done (optionally with a photo) and collect the points and reactions.
5. Watch the leaderboard, the weekly report and the monthly champion.

**Stack:** React 19, TypeScript, Vite, React Router, TanStack Query, Supabase (Postgres, Auth,
Realtime, Storage, Edge Functions), Tailwind CSS v4, shadcn/Base UI, Framer Motion, Capacitor 8
(iOS), Stripe.

---

## Features

- **Chores and points:** one-off or recurring chores, grouped by area (Kitchen, Bathroom,
  Garden…), with starter packs for student flats, family homes and couples.
- **Leaderboard, streaks and "last active":** a gentle nudge when someone has gone quiet.
- **Fair share:** the group agrees each person's share, and reports score you against yours.
  "Whose turn" suggestions take the split into account.
- **Weekly report, monthly champion and monthly prizes:** each person picks the prize they want
  if they win.
- **Chore roulette:** can't decide? Spin the wheel.
- **Bounties:** boost a chore's points to bribe someone into doing the gross one. You can't claim
  your own bounty.
- **Team completions:** did it together? Tag your partner and you both score.
- **Activity log:** photo proof, emoji reactions and undo.
- **Nudges:** one tap to poke someone about a chore.
- **Group goals:** a weekly points target for the whole household.
- **The houseplant:** a group mascot that flowers when chores get done and wilts when they
  don't.
- **Wrapped:** a year in review, with your signature chore, longest streak and best day.
- **Families:** a **kid** role (can complete chores, can't edit them) and **pocket money**,
  where kids earn real money for points (a Pro feature).
- **Push notifications and reminders:** Web Push in the browser, APNs on iOS, plus per-chore
  reminder times.
- **Sign-in options:** email and password, Sign in with Apple, or a guest account. Guests can
  add an email later to keep their account.
- **Account deletion** from the Profile tab, which removes the profile, points, completions and
  photos.

### Pro

Pro is a one-off purchase per group through Stripe Checkout, and it unlocks pocket money. The
`stripe-webhook` function marks the group as Pro (`groups.is_pro`).

---

## Run it locally

You need Node 20+ and a Supabase project (the hosted free tier is fine).

```bash
npm install
cp .env.example .env.local   # then fill in the two values below
npm run dev                  # http://localhost:5173
```

`.env.local`:

| Variable                 | Value                                         |
| ------------------------ | --------------------------------------------- |
| `VITE_SUPABASE_URL`      | your project's API URL                        |
| `VITE_SUPABASE_ANON_KEY` | your project's anon (publishable) key         |

### Database

The SQL in the repo root is the history of how the hosted database was built. Run the scripts
in the Supabase SQL editor in this order:

1. `supabase-schema.sql`: core tables (profiles, groups, members, chores, completions,
   invitations), triggers and RLS
2. `supabase-push-subscriptions.sql`
3. `supabase-chore-reminders.sql`
4. `supabase-pro-migration.sql`
5. `seed-demo.sql` (optional): a demo family with Mum, Dad, Lily and Jake

The repo doesn't yet include scripts for the `nudges`, `reactions` and `payouts` tables. They
were created directly in the hosted project. To recreate the full schema elsewhere, export it
from a project that already has them:

```bash
npx supabase db dump --schema public > schema.sql
```

### Scripts

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Vite dev server                      |
| `npm run build`   | type-check, then build to `dist/`    |
| `npm run lint`    | ESLint                               |
| `npm run preview` | serve the production build           |

---

## How it fits together

```
src/
  pages/               Chores, Leaderboard, Activity, Roulette, Weekly report, Group,
                       Profile, Plant, Wrapped, Auth, Reset password
  components/
    ui/                Avatar, BottomSheet, ConfirmDialog, Toast, Spinner, Button, Input, …
    layout/            AppShell, BottomNav, SideNav, ProtectedRoute
  context/             AuthContext, GroupContext, ThemeContext
  lib/
    hooks/             data hooks: useChores, useActivity, useLeaderboard, useFairTurn,
                       usePocketMoney, usePlantState, …
    supabase.ts        Supabase client
    database.types.ts  generated types
supabase/functions/    Edge Functions (Deno)
ios/                   Capacitor iOS project (bundle id club.dirtylaundry.app)
site/                  the dirtylaundry.club marketing site (Astro), see site/README.md
```

- **Data:** custom hooks wrap TanStack Query. Query keys follow `['resource', group?.id]`, and
  mutations invalidate the queries they affect. Group data stays live through Supabase Realtime.
- **Auth:** Supabase Auth with email/password, Sign in with Apple and anonymous (guest)
  accounts. `AuthContext` provides `user`, `session` and `profile`.
- **Groups and roles:** each user belongs to one group, with the role `admin`, `member` or
  `kid`. Kids get a reduced interface.
- **Security:** every table in the SQL scripts has row level security, so members can only see
  and change their own group's data.

### Edge Functions

| Function           | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `send-push`        | sends Web Push (VAPID) and iOS (APNs) notifications            |
| `send-reminders`   | sends chore reminders at each chore's reminder day and time    |
| `weekly-champion`  | announces the week's top scorer                                |
| `monthly-champion` | crowns the monthly champion and their prize                    |
| `create-checkout`  | starts a Stripe Checkout session for Pro                       |
| `stripe-webhook`   | marks a group as Pro once payment succeeds                     |
| `delete-account`   | permanently deletes a user's account and data                  |
| `public-stats`     | anonymous totals (chores completed, households, points)        |

Their secrets are set with `npx supabase secrets set …`:

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`
- **Web Push:** `VAPID_PRIVATE_KEY`
- **iOS push:** `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_HOST`

The scheduled functions (reminders and champions) are triggered by cron jobs set up in the
Supabase dashboard. Step-by-step guides are in `TODO-stripe-setup.md` and
`TODO-apple-signin-setup.md`.

---

## iOS

The same web app ships as a native iOS app via Capacitor:

```bash
npm run build && npx cap sync ios && npx cap open ios
```

Then build and run from Xcode. App Store Connect copy and reviewer notes are in
`APP-STORE-SUBMISSION.md`.

## Deploy

This one repo feeds two Vercel projects:

| Vercel project      | Root directory | Serves                  |
| ------------------- | -------------- | ----------------------- |
| `chorequest`        | `/`            | `app.dirtylaundry.club` |
| `whoseturn-landing` | `site`         | `dirtylaundry.club`     |

Each one only rebuilds when its own files change. The app skips builds that only touch `site/`,
and the site skips builds that touch nothing in `site/`.

The web app is a static SPA on Vercel. `vercel.json` rewrites every route to `index.html`.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, deploy the Edge Functions with
`npx supabase functions deploy`, and point Stripe's webhook at the `stripe-webhook` function's
URL.
