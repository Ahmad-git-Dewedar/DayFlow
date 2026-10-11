# DayFlow

**Plan your day, build your flow.** DayFlow is a calm daily planner that puts
tasks, time-blocks, habits and focus sessions in one place. It runs entirely in
the browser: no account and no server. Your data stays on your device.

## Features

- **Today**: a task list and a time-blocked timeline side by side. Drag blocks
  to move them, drag the bottom edge to resize, click an empty slot to plan
  something, or use `Alt + ↑/↓` (add `Shift` to resize). It also shows daily
  progress, a one-click "move overdue to today", and habit check-ins.
- **Quick add** understands natural input such as `Write report 2pm 45m #work`
  (time, length and project).
- **Tasks**: Inbox, Overdue, Today, Upcoming (grouped by day) and Completed,
  with search and per-project views.
- **Projects** in five colors that stay distinguishable for colorblind users
  (validated across every pair, in light and dark mode).
- **Habits**: weekly check-in grid, current and best streaks, and weekly targets
  for habits you don't need every day. Archive or delete with undo.
- **Focus**: a timer linked to a task, with pause, resume, +5 min and finish
  early. It keeps running across pages and reloads, shows the countdown in the
  tab title, chimes when done, and can send an optional desktop notification.
- **Insights**: weekly focus time vs. your goal, tasks completed, focus by
  project and habit targets, with week-over-week changes. Every chart has a
  table view.
- **Settings**: theme (system/light/dark), daily focus goal, default focus
  length, week start, JSON backup export/import, sample data, and delete all.

## Stack

- Vite + React 18 + TypeScript (strict)
- Tailwind CSS v4, with design tokens taken from the DayFlow logo
- React Router, with each page lazy-loaded
- Vitest for unit tests
- No animation, icon or chart libraries. Motion is CSS-only and respects
  `prefers-reduced-motion`.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run lint
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

DayFlow is a single-page app. If you deploy `dist/` to a static host, configure
it to serve `index.html` for unknown paths so deep links like `/habits` work.

## How it's built

```
src/
  lib/
    store/        state: types, pure reducer, input validation, sample data, provider
    dates.ts      local-time "YYYY-MM-DD" date math (DST-safe)
    stats.ts      streaks, focus and completion aggregates
    quickAdd.ts   natural-language quick-add parser
    *.test.ts     unit tests
  components/     app shell, timeline, task/project editors, charts, UI primitives
  pages/          Today, Tasks, Habits, Focus, Insights, Settings
  styles/         design tokens, light/dark themes, base styles
```

- **State**: one `useReducer` store with a pure reducer. Ids and timestamps are
  created outside it. State is saved to `localStorage` and synced across open
  tabs.
- **Untrusted input**: data loaded from storage or an imported file is
  validated field by field, so a corrupt record is dropped instead of crashing
  the app.
- **Focus timer**: stored as timestamps rather than a ticking counter, so it
  survives navigation and reloads, and a session that ran out while the tab was
  closed is logged when you come back.
- **Accessibility**: native `<dialog>` modals (focus trap, Esc), labelled
  controls, keyboard access to the timeline, live-region toasts, a
  skip-to-content link, and a table view for every chart.
