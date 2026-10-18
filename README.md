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
- **Families:** a **kid** role that can complete chores but not edit them.
- **Push notifications and reminders:** Web Push in the browser, APNs on iOS, plus per-chore
  reminder times.
- **Sign-in options:** email and password, Sign in with Apple, or a guest account. Guests can
  add an email later to keep their account.
- **Account deletion** from the Profile tab, which removes the profile, points, completions and
  photos.

### Pro (not launched)

Pro is planned as a one-off purchase per group through Stripe Checkout, unlocking **pocket
money**: kids earn real money for their points. It was hidden for the v1 launch (`5ef932d`).
The database side is live and guarded (only the Stripe webhook can set `groups.is_pro`, and
pocket money requires Pro), but nothing in the app shows it, and `create-checkout` and
`stripe-webhook` are not deployed. To launch it, render `ProPaywall`, deploy both functions and
set the Stripe secrets (see `TODO-stripe-setup.md`).

---

## Run it locally

You need Node 20+ and Docker (for the local Supabase stack).

```bash
npm install
npm run db:start                                 # local Supabase: migrations + demo data
cp .env.localdb.example .env.localdb.local
npm run dev:local                                # http://localhost:5175, against the local stack
```

Join as a guest and enter the invite code **DEMO2026** to land in the demo household.

To run against a hosted project instead, copy `.env.example` to `.env.local`, fill in the
project's URL and anon key, and use `npm run dev`. The app refuses to start if either is missing.

### Database

The schema lives in `supabase/migrations/`, starting from a baseline taken from production.
Change it with a new migration, never by hand in the dashboard:

```bash
npx supabase migration new <name>   # write the SQL
npm run db:reset                    # rebuild the local database from scratch
npm run db:types                    # regenerate src/lib/database.types.ts
npm run test:db                     # run the database tests
npx supabase db push                # apply to the linked production project
```

Security lives in the database, not the app:

- **Row level security** on every table limits people to their own household.
- **Triggers** guard what a client may change. Points always come from the chore, only you can
  lower your own points (undo), roles are set by the owner, and Pro can only be switched on by
  the Stripe webhook.
- **Functions** do the multi-step actions in one transaction: `complete_chore` (including team
  completions and bounties), `undo_completion`, `mark_paid` and `join_group_by_code`.

### Tests and checks

| Script                 | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm test`             | unit and component tests (Vitest, Testing Library)              |
| `npm run test:db`      | database tests (pgTAP): the security rules and the functions    |
| `npm run typecheck`    | TypeScript                                                      |
| `npm run lint`         | ESLint, including the React hooks rules                         |
| `npm run format`       | Prettier                                                        |
| `npm run build`        | type-check, then build to `dist/`                               |

GitHub Actions runs all of these on every push and pull request (`.github/workflows/ci.yml`).

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
                       usePlantState, …
    report.ts          the weekly/monthly report maths
    supabase.ts        Supabase client (env checked by env.ts)
    database.types.ts  generated types (npm run db:types)
    db.ts              row type names, with roles checked by Zod
supabase/migrations/   the schema, as migrations
supabase/tests/        pgTAP database tests
supabase/functions/    Edge Functions (Deno)
ios/                   Capacitor iOS project (bundle id club.dirtylaundry.app)
site/                  the dirtylaundry.club marketing site (Astro), see site/README.md
```

- **Data:** custom hooks wrap TanStack Query. Query keys follow `['resource', group?.id]`, and
  mutations invalidate the queries they affect. Group data stays live through Supabase Realtime.
- **Auth:** Supabase Auth with email/password, Sign in with Apple and anonymous (guest)
  accounts. `AuthContext` provides `user`, `session` and `profile`.
- **Groups and roles:** each user belongs to one group, as its `owner`, a `member` or a `kid`.
  Kids can complete chores but not manage them, and the database enforces that too.

### Edge Functions

| Function           | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `send-push`        | sends Web Push (VAPID) and iOS (APNs) notifications            |
| `send-reminders`   | sends chore reminders at each chore's reminder day and time    |
| `weekly-champion`  | announces the week's top scorer                                |
| `monthly-champion` | crowns the monthly champion and their prize                    |
| `create-checkout`  | starts a Stripe Checkout session for Pro (not deployed yet)    |
| `stripe-webhook`   | marks a group as Pro once payment succeeds (not deployed yet)  |
| `delete-account`   | permanently deletes a user's account and data                  |
| `public-stats`     | anonymous totals (chores completed, households, points)        |

Their secrets are set with `npx supabase secrets set …`:

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `APP_URL`
- **Web Push:** `VAPID_PRIVATE_KEY`
- **iOS push:** `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_HOST`

`send-push` accepts the service role key or a signed-in member sending to someone in their own
household.

### Scheduled jobs

`pg_cron` runs them inside the database (see the `schedules` migration), and each job calls its
function through `pg_net` with a shared secret in the `x-cron-secret` header:

| Job                | When (UTC)               |
| ------------------ | ------------------------ |
| `send-reminders`   | every 15 minutes         |
| `weekly-champion`  | Sundays at 20:00         |
| `monthly-champion` | 00:05 on the 1st         |

The jobs do nothing until two Vault secrets exist, and the functions reject any call without the
same secret. One-off setup for a project:

```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1', 'dirty_laundry_functions_url');
select vault.create_secret('<secret>', 'dirty_laundry_cron_secret');
```

```bash
npx supabase secrets set CRON_SECRET=<secret>
```

See what ran with `select * from cron.job_run_details order by start_time desc limit 20;` and
the functions' replies in `net._http_response`. Step-by-step guides are in `TODO-stripe-setup.md` and
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
| `dirty-laundry`     | `/`            | `app.dirtylaundry.club` |
| `dirty-laundry-site` | `site`        | `dirtylaundry.club`     |

Each one only rebuilds when its own files change. The app skips builds that only touch `site/`,
and the site skips builds that touch nothing in `site/`.

The web app is a static SPA on Vercel. `vercel.json` rewrites every route to `index.html`.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, deploy the Edge Functions with
`npx supabase functions deploy`, and point Stripe's webhook at the `stripe-webhook` function's
URL.
