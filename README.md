# meal-log

A web app for logging meals and food spending, built with every design decision recorded as an ADR.

**[meal-log-sandy.vercel.app](https://meal-log-sandy.vercel.app/)**

**Status: in development.** Design is complete; implementation has just started — the live page is a stage 1 placeholder confirming the deploy path and PWA install.

---

## The problem

I kept failing to track what I ate and what I spent on food.

- A receipt-scanning app missed every payment that produced no receipt (contactless, card, QR payments).
- A Google Sheet worked for exactly one month. The friction was not writing the record — it was having to create the row, type the date, and fix the formatting every single time.

My previous app ([my-task-app](https://github.com/hiroppy-udon/my-task-app)) failed for a different reason, and that reason shaped this project more than the tracking problem did.

## What went wrong last time

my-task-app was built without defined requirements. It worked, I published it, and then I stopped opening it.

I mapped the causes and found the main one: **I rushed to finish because I had no portfolio, so I never defined the requirements or validated the UI.** Not laziness, not a bad framework choice — undefined requirements.

Two consequences for this project:

1. **I kept the same stack (React + Vite + Supabase) on purpose.** Changing tools would not have fixed anything. The difference this time is the design work, not the technology. See [decision #49](docs/判断の記録.md).
2. **Laziness is not something I try to fix.** Any countermeasure that depends on willpower is rejected by default. The design has to work for someone who will skip a day.

## How it works

Three screens, four tables.

| Screen | Purpose |
|---|---|
| Today | Enter and edit. Tap a cell, type in place — no separate input screen |
| Records | Read back. The Today screen stacked vertically, with a selectable range |
| Chart | Notice change. Food spending per day / week / month |

A day is a **fixed sequence of slots** — wake, breakfast, lunch, dinner, snack, sleep — not a timeline of events. Nothing is sorted; the order is the shape of the day. That single framing decided the layout of every screen.

Days count as "recorded" only when all four meal slots are filled, and **"skipped" is itself a recorded value**. That distinguishes "I didn't eat lunch" from "I forgot to log lunch" — without it, the streak counter cannot be computed.

### Data model

```
records   id / user / date / time / kind / amount / note
meals     record_id / slot / cooked_or_eaten_out
menus     id / record_id / name
devices   id / user / endpoint / registered_at
```

Common table plus per-kind tables (class table inheritance). Adding sleep logs, cleaning logs, or exercise logs later means adding a row to `kind` and one new table — `records` is never touched. The one requirement that drove the whole design: **new record types must be addable without breaking what exists.**

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite | Most Japanese-language material available, and Supabase's own docs are React-first — so I can get unstuck without asking an AI to write it for me |
| Backend | Supabase | Postgres (the table design loads as designed), auth and row-level security included |
| Notifications | Supabase Cron + Edge Functions + Web Push | |
| Hosting | Vercel | |
| Install | PWA, added to the home screen | Required for Web Push on iOS |

Not an App Store app: the review guideline on minimum functionality conflicts with building incrementally, and Apple explicitly tells wrapped web apps to ship as web apps instead. Not Google Play either — my phone is an iPhone, so I could not use my own app daily, which breaks the one condition the whole project depends on.

## Documentation

Written in Japanese — these are working documents I read while building, not a showcase.

| File | Contents |
|---|---|
| [docs/仕様.md](docs/仕様.md) | The spec. What gets built |
| [docs/判断の記録.md](docs/判断の記録.md) | **57 decisions, each with the options I rejected and why** |
| [docs/実装.md](docs/実装.md) | Build order, with testable completion criteria per stage |
| [docs/進行状況.md](docs/進行状況.md) | Progress and open questions |
| [docs/requirements.md](docs/requirements.md) | Full history, including how the thinking changed |

The decision log is the part worth reading. A sample:

- **#39, #46** — iOS web push is reported to stop working without warning. Rather than designing around that, notifications are demoted to a secondary channel and the screen you see on open carries the real weight.
- **#57** — "no login" and "public demo URL" turned out to be incompatible. The anon key ships in the browser; without row-level security anyone with the URL can read, edit, and delete the records. Row-level security needs an identity to compare against, so login moved into scope.
- **#42** — A decision I got wrong. I had excluded self-hosting on a criterion I invented and attributed to a source that never said it. Recorded as an error rather than quietly corrected.

## Measuring whether it worked

The Google Sheet lasted one month before I abandoned it. That is the baseline.

The app shows three numbers — total days recorded, days this month, and current streak with the personal best alongside it. The streak carries its best-ever value specifically so that breaking it does not erase the sense of having accumulated anything.

**Target: beat one month.**

## Build order

```
[0] Repository + documentation          <- done
[1] Empty app deployed, installable
[2] Tables + login                      <- thin end-to-end slice
[3] Today screen                        <- the core; daily use starts here
[4] Streak counters
[5] Records screen + tabs
[6] Spending table -> chart
[7] Meal stability
[8] Notifications
```

Stage 2 is the point where something goes end-to-end: screen, login, write, store, read, screen. Stage 3 is where the app becomes usable, and where the one-month clock starts.

Notifications come last on purpose. Since they are a secondary channel by design, learning early that they fail would change nothing about stages 2–7 — and putting them first would delay the day the measurement begins.
