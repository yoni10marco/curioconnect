# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
npx expo start --web

# Admin dashboard (separate Next.js app)
cd admin && npm run dev
```

No lint or test commands are configured in package.json.

## Architecture Overview

CurioConnect is a React Native + Expo app ("Duolingo for everything") — a gamified AI-powered learning platform. Backend is entirely Supabase (Auth, PostgreSQL, Edge Functions).

### Tech Stack
- **React Native + Expo v51** — cross-platform (iOS, Android, Web)
- **Supabase** — auth, database (PostgreSQL with RLS), Edge Functions (Deno)
- **Zustand** — global state management
- **React Navigation native-stack** — navigation
- **Google Gemini 2.5 Flash** — lesson generation and interest discovery via Edge Functions
- **Expo Notifications** — daily push notifications (morning + evening)
- **Next.js 14** — admin dashboard (separate app in `/admin`)

### Navigation Flow
Three stacked navigators managed in [src/navigation/index.tsx](src/navigation/index.tsx):
1. **AuthNavigator** — Login screen (unauthenticated)
2. **OnboardingNavigator** — Interest selection (authenticated, no profile yet)
3. **AppNavigator** — 9 main screens (Dashboard, LessonReader, Profile, Leaderboard, LearningJourney, KnowledgeLibrary, News, Feedback, About)

Transition between navigators is driven by session + profile state in `useAuthStore`.

### State Management
Two Zustand stores:

**[src/store/useAuthStore.ts](src/store/useAuthStore.ts)** — session, profile, XP, streaks
- `signIn/signUp/signOut`, `updateProfile`, `addXp`, `checkAndResetStreak`
- Streak resets if `last_lesson_date` is neither today nor yesterday
- **Streak freeze**: if `streak_freeze_count >= 1`, consumes one freeze instead of resetting streak to 0

**[src/store/useLessonStore.ts](src/store/useLessonStore.ts)** — daily lesson lifecycle
- `fetchOrGenerateLesson` → checks DB for today's lesson → picks random topic + user interest → calls `generate-lesson` Edge Function → stores result
- `quiz_data` is stored as JSON string in DB and parsed on load
- XP: 30 XP on first completion, 0 XP on replay; +20 XP per correct quiz answer (UI only)
- `completeLesson()` marks lesson done, cancels scheduled notifications, updates streak

### Push Notifications
Implemented in [src/lib/notifications.ts](src/lib/notifications.ts):
- **Morning** (8:00 AM): "Ready to learn? 📚" daily reminder
- **Evening** (9:00 PM): "One lesson away! ✨" streak nudge
- Scheduled for the current day only; rescheduled on each new day (handled in `RootNavigator` on app focus)
- Canceled when lesson is completed or user signs out
- Disabled on web platform
- Notification IDs persisted in AsyncStorage

### Supabase Setup

**Client**: [src/lib/supabase.ts](src/lib/supabase.ts) — initialized with AsyncStorage for session persistence. Credentials come from `Constants.expoConfig.extra` (set in [app.json](app.json)).

**Edge Functions** (in `supabase/functions/`):
- `generate-lesson` — calls Gemini 2.5 Flash (`GEMINI_API_KEY`), requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- `get-leaderboard` — fetches top 100 users sorted by XP or streak using service role key; takes `activeTab` param (`'xp'` | `'streak_count'`)
- `discover-interests` — analyzes a free-text user prompt via Gemini 2.5 Flash (single call: moderation + discovery); adds up to 3 new interests per call; max 25 interests total per user; deduplicates against existing interests

**Key Tables:**
- `profiles` — `id, username, total_xp, streak_count, last_lesson_date, difficulty_level, age, job_title, streak_freeze_count (default 1), admin_role ('full_admin' | 'read_only_admin' | null), created_at`
- `user_interests` — many-to-one with profiles (`id, user_id, interest_name`)
- `topics` — 50+ academic topics for lesson generation (`id, name, category`)
- `daily_lessons` — markdown content + quiz_data (JSON string), one per user per day
- `news_messages` — broadcast news sent from admin dashboard
- `user_news_reads` — per-user read tracking for news messages
- `feedbacks` — user-submitted feedback (`id, user_id, content, created_at`); insert-only RLS for users; admin reads via service role key

All tables use RLS; users can only access their own rows.

### Admin Dashboard (`/admin`)
Separate Next.js 14 app with Tailwind CSS and Supabase SSR.

**Routes:**
- `/login` — admin login
- `/dashboard` — overview (user count, feedback count, news count, recent users)
- `/dashboard/users` — user list and management
- `/dashboard/users/[id]` — edit individual user stats
- `/dashboard/news` — broadcast news (full_admin can send; all admins can view)
- `/dashboard/feedback` — view all user feedback

**Roles** (enforced in middleware):
- `full_admin` — full read/write access
- `read_only_admin` — read-only access

### Design System
Tokens defined in [src/lib/theme.ts](src/lib/theme.ts):
- Primary: `#58CC02` (green), XP gold: `#FFC800`, Streak orange: `#FF9600`, Danger: `#FF4B4B`
- Font sizes: xs (11) → title (34); weights: regular → heavy (800)
- Spacing: xs (4px) → xxl (48px); border radius: sm (8) → full (9999)

### Date Formatting Convention
**Never use `new Date().toISOString().split('T')[0]` for local date strings** — `toISOString()` outputs UTC, which produces the wrong date for users in UTC+ timezones (e.g. UTC+2 users get yesterday's date before 2 AM).

Always use local date components instead:
```ts
const d = new Date();
const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

### TypeScript
Strict mode enabled. Shared types/interfaces in [src/lib/types.ts](src/lib/types.ts).

Key types: `Profile`, `UserInterest`, `Topic`, `QuizQuestion`, `PageData`, `DailyLesson`, `NewsMessage`, `Feedback`.
