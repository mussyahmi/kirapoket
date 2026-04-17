# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Turbopack enabled)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite is configured.

Deployment: `firebase deploy --only hosting,firestore` (manual, no CI).

## Architecture

KiraPoket is a personal expense tracking PWA for Malaysian users, built on **Next.js App Router** with **Firebase** (Auth + Firestore) and **Tailwind CSS 4** + shadcn UI.

### Route groups

- `/` — Landing/login page (`src/app/page.tsx`)
- `/(app)/` — All protected routes; auth guard lives in `src/app/(app)/layout.tsx`
  - `home` — Dashboard showing current salary cycle summary
  - `transactions`, `transactions/new`, `transactions/edit`
  - `accounts`, `categories`, `budget`, `debts`, `settings`
  - `admin` — Read-only impersonation panel for admins
- `/changelog` — App changelog

### State management

Two React Contexts are the entire data layer — no Redux, no SWR, no server actions:

- **`AuthContext`** (`src/contexts/AuthContext.tsx`) — Firebase Auth session, Google OAuth, account deletion
- **`AppContext`** (`src/contexts/AppContext.tsx`) — All user data (accounts, categories, transactions, debts, user profile). Exposes refresh/create/edit/delete for each entity plus admin impersonation (`isImpersonating`, `impersonate(uid)`).

All Firestore reads/writes are in `src/lib/firestore.ts`. Types are in `src/lib/types.ts`.

### Data model key points

- **Salary cycle** — configurable salary day + grace days; drives the home dashboard date range
- **Categories** — 3-level hierarchy; level-1 roots are always Needs / Wants / Savings
- **Budget types** — per-category, either `cycle` (full salary period) or `daily`
- **Activity log** — every significant action is written to a Firestore `activities` collection

### Notable config

- Path alias `@/*` → `src/*` (tsconfig)
- `NEXT_PUBLIC_APP_VERSION` is injected from `package.json` at build time (`next.config.ts`)
- Firebase project: `kira-poket` (`.firebaserc`)
- App version lives in `package.json`; bump it before committing a release
