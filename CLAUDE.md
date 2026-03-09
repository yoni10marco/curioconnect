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
```

No lint or test commands are configured in package.json.

## Architecture Overview

CurioConnect is a React Native + Expo app ("Duolingo for everything") — a gamified AI-powered learning platform. Backend is entirely Supabase (Auth, PostgreSQL, Edge Functions).

### Tech Stack
- **React Native + Expo v51** — cross-platform (iOS, Android, Web)
- **Supabase** — auth, database (PostgreSQL with RLS), Edge Functions (Deno)
- **Zustand** — global state management
- **React Navigation native-stack** — navigation
- **OpenAI GPT-4o** — lesson generation via Edge Functions

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

**[src/store/useLessonStore.ts](src/store/useLessonStore.ts)** — daily lesson lifecycle
- `fetchOrGenerateLesson` → checks DB for today's lesson → picks random topic + user interest → calls `generate-lesson` Edge Function → stores result
- `quiz_data` is stored as JSON string in DB and parsed on load
- XP: 30 XP on first completion, 0 XP on replay

### Supabase Setup

**Client**: [src/lib/supabase.ts](src/lib/supabase.ts) — initialized with AsyncStorage for session persistence. Credentials come from `Constants.expoConfig.extra` (set in [app.json](app.json)).

**Edge Functions** (in `supabase/functions/`):
- `generate-lesson` — calls OpenAI, requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars
- `get-leaderboard` — fetches top 100 users using service role key

**Key Tables:**
- `profiles` — XP, streak, difficulty_level, age, job_title
- `user_interests` — many-to-one with profiles
- `topics` — 50+ academic topics for lesson generation
- `daily_lessons` — markdown content + quiz_data (JSON), one per user per day
- `news_messages` — broadcast news with per-user read tracking

All tables use RLS; users can only access their own rows.

### Design System
Tokens defined in [src/lib/theme.ts](src/lib/theme.ts):
- Primary: `#58CC02` (green), XP gold: `#FFC800`, Streak orange: `#FF9600`
- Font sizes: xs → title; weights: regular → heavy
- Spacing: xs (4px) → xxl (48px)

### TypeScript
Strict mode enabled. Shared types/interfaces in [src/lib/types.ts](src/lib/types.ts).
