# App Store Submission Kit — Dirty Laundry

Copy-paste reference for App Store Connect. Bundle ID: `club.dirtylaundry.app`.

## 1. Listing fields

**App name** (30 char)
```
Dirty Laundry
```

**Subtitle** (30 char)
```
Household chores, gamified
```

**Promotional text** (170 char — editable without re-review)
```
Turn your flat's chore wars into a fair, fun game. Points, leaderboards, roulette, and a kid-friendly role for families. Built with ADHD brains in mind.
```

**Description** (4000 char)
```
Dirty Laundry turns household chores into a game your whole group actually wants to play. Flatmates, partners, parents, kids — whoever shares your space — agree on the chores, split the load, and earn points for the stuff nobody wants to do.

GROUPS THAT ACTUALLY WORK
One person creates a group and shares an invite link. Everyone joins in seconds. Chores, completions, and scores live in one place, visible to everyone. No more "I did it last week" debates.

POINTS AND LEADERBOARDS
Every chore has a point value. Harder chores are worth more. Boost any chore with a bounty to make it extra tempting. The chore of the day is worth double. Check the leaderboard to see who's pulling their weight — and who's not.

FAIR FOR EVERYONE
Some people are busier than others. Set a chore split — each person gets a percentage share based on their availability. The weekly reports score you against your own share, not everyone else's. So a 25% share who hits their target is doing just as well as a 50% share who hits theirs.

BUILT FOR ADHD BRAINS
Decision paralysis is real. "Just Do One" mode picks a single chore for you so you can stop overthinking. Chore Roulette spins the wheel when nobody can agree who does what. Points, streaks, and reactions give your brain the dopamine hit it needs. Reminders act as your external memory.

KIDS AS FIRST-CLASS MEMBERS
Parents can set members as "kids". Kids can join with just a name — no email needed. They can complete chores and earn points on the leaderboard, but can't add chores or change group settings. Parents stay in control.

PROOF PHOTOS
Upload a photo as proof of completion. Great for the "did you actually do it?" conversations. Photos stay inside your group.

NO ADS. NO TRACKING.
We don't sell your data, show ads, or use analytics. The core app is free forever. Your data lives only inside your group.

PRIVACY
We use Supabase for storage (EU, on AWS). No ads, no analytics, no tracking. Full details at dirtylaundry.club/privacy. You can delete your account from inside the app at any time.

Made with good intentions and a messy flat.
```

**Keywords** (100 char — comma-separated)
```
chores,household,family,flatmate,tasks,kids,gamified,adhd,leaderboard,roommate,todo,chart
```

**URLs**
- Support URL: `https://dirtylaundry.club/faq`
- Marketing URL: `https://dirtylaundry.club/`
- Privacy Policy URL: `https://dirtylaundry.club/privacy`
- EULA: use Apple's standard, OR supply `https://dirtylaundry.club/terms`

**Other**
- Category: Productivity (primary) / Lifestyle (secondary)
- Price: Free (no IAP on iOS — Pro is web-only)
- Age rating: 4+
- Third-party content: No
- Sign in with Apple: Yes, offered as the primary auth method on iOS (email/password and guest accounts also available)
- Copyright: `© 2026 Harry Davies`

## 2. Privacy nutrition label

All data is **Linked to User**, **NOT Used for Tracking**.

| Category | Data Type | Used For |
|---|---|---|
| Contact Info | Email Address | App Functionality, Account Management |
| Contact Info | Name | App Functionality |
| User Content | Photos or Videos | App Functionality |
| User Content | Other User Content (chores, group data) | App Functionality |
| Identifiers | User ID | App Functionality |

Tracking: **No**. Everything else: **Not collected**.

## 3. App Review Information

**Sign-in required**: Yes, but reviewer can use the guest flow (no credentials needed).

**Notes to reviewer**:
```
Sign-in: three options on the auth screen. Easiest for review is Sign in with Apple. Alternatively tap "Sign up" → "Just use a name" for an anonymous guest account, or use email/password. Create a group, add a few chores, and tap a chore to complete it.

Account deletion (Guideline 5.1.1(v)): Profile tab → DELETE ACCOUNT at the bottom. Permanently deletes the account, profile, points, completions, and uploaded photos via a Supabase edge function using the service role key.

Camera/Photo permissions: used only for optional "proof of completion" photos attached to a chore. Photos are visible only to members of the user's group.

Anonymous auth: "kid" accounts and quick starts use anonymous accounts. Users can later add an email/password from Profile to save their account.

No background location, no tracking SDKs, no analytics.
```

## 4. Screenshots

Size required: **6.7" iPhone** (1290×2796). 3–10 images. Apple auto-generates smaller sizes.

How to capture: open iPhone 15 Pro Max simulator, run the app, `cmd+S` to save to Desktop.

Suggested shots:
1. Chores list (populated)
2. Completing a chore with confetti
3. Leaderboard
4. Chore Roulette mid-spin
5. Weekly report
6. Group screen showing a family with kid roles

## 5. Build & upload

1. `npx cap sync ios` (picks up Info.plist + icon changes)
2. Open `ios/App/App.xcworkspace` in Xcode
3. App target → General → set **Version** (`1.0.0`) and **Build** (`1`)
4. Signing & Capabilities → tick "Automatically manage signing", pick team
5. Product → Archive
6. Window → Organizer → select archive → Distribute App → App Store Connect → Upload
7. Wait ~10 min for App Store Connect processing
8. Attach the build to the version, Submit for Review

## 6. Still outstanding before submission

- [ ] Apple Developer Program membership ($99/yr)
- [ ] App Store Connect app record created for `club.dirtylaundry.app`
- [ ] Privacy + Terms + FAQ pages deployed to dirtylaundry.club (committed — awaiting deploy)
- [ ] `delete-account` edge function deployed (DONE)
- [ ] Throwaway-account end-to-end test of Delete Account flow
- [ ] Screenshots captured
- [ ] Archive + upload build
