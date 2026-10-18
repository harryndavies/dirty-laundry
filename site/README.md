# Dirty Laundry: marketing site

The landing site for [Dirty Laundry](https://dirtylaundry.club), the app that turns housework
into a game for flatshares, couples and families.

**Live:** [dirtylaundry.club](https://dirtylaundry.club) ·
**The app:** [app.dirtylaundry.club](https://app.dirtylaundry.club) ·
**App source:** [the rest of this repo](..)

It's a static [Astro](https://astro.build) site with no framework JavaScript and no tracking. It
uses the same playful brutalist look as the app: chunky borders, hard shadows and IBM Plex Mono.

## Pages

| Page           | What's on it                                                              |
| -------------- | ------------------------------------------------------------------------- |
| `/`            | the pitch, in sections (see below)                                       |
| `/faq`         | common questions                                                          |
| `/privacy`     | privacy policy                                                            |
| `/terms`       | terms of use                                                              |

The home page runs in order:

1. **Why housework sucks:** boring, invisible, overwhelming.
2. **How it works:** create a group, add chores, set the split, do the thing, watch the
   leaderboard.
3. **See it in action:** mock-ups of the chores list, leaderboard and activity log.
4. **What people are saying.**
5. **Features:** scores, streaks, nudges, roulette, reports, bounties, photo proof, push
   notifications and more.
6. **Not everyone has the same free time:** the fair-share split.
7. **Works for families too:** the kid role, prizes and photo proof.
8. **Built for brains that struggle with chores:** decision fatigue, getting started, dopamine.
9. **Ready to make housework fun?:** the final call to action, linking into the app.

## Run it locally

You need Node 20+. The site lives in `site/` of the app repo and has its own `package.json`.

```bash
cd site
npm install
npm run dev       # http://localhost:4321
```

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | dev server with hot reload           |
| `npm run build`   | build the static site into `dist/`   |
| `npm run preview` | serve the built site                 |

## Structure

```
src/pages/
  index.astro     the landing page (markup, styles and a little inline script)
  faq.astro
  privacy.astro
  terms.astro
public/           favicon and logo
```

Each page is self-contained, with styles in the page itself, so there's no shared component
library to learn.

## Deploy

Hosted on Vercel as the `dirty-laundry-site` project: framework preset **Astro**, Root Directory
`site`, output `dist/`. It only rebuilds when something in `site/` changes. The custom domain
`dirtylaundry.club` points at it. There are no environment variables.
