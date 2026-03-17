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

### Android Build

```bash
# Prebuild (regenerates android/ directory — destroys customizations!)
npx expo prebuild --platform android --clean

# Release APK
cd android && ./gradlew app:assembleRelease

# Release AAB (for Google Play)
cd android && ./gradlew app:bundleRelease
```

**After every `expo prebuild --clean`**, you MUST re-apply these customizations to `android/`:
1. Restore `android/app/upload-keystore.jks` (not in git — keep a backup outside the repo)
2. Create `android/local.properties` with `sdk.dir=<path-to-Android-SDK>`
3. In `android/app/build.gradle`: set `debuggableVariants = []`, add release signing config, set `signingConfig signingConfigs.release` in release buildType
4. In `android/build.gradle`: set targetSdkVersion default to `'35'`
5. In `android/app/src/main/AndroidManifest.xml`: add `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-2213890156530970~8173572553"/>` inside `<application>`

**Current release config:**
- Version: 1.0.1 / versionCode 2 (set in `app.json` AND `android/app/build.gradle`)
- API level 35 (targetSdk & compileSdk) — required by Google Play
- Signed with `upload-keystore.jks` (password: `CurioConnect`, alias: `upload`)
- Package: `com.curioconnect.app`

## Architecture Overview

CurioConnect is a React Native + Expo app ("Duolingo for everything") — a gamified AI-powered learning platform. Backend is entirely Supabase (Auth, PostgreSQL, Edge Functions).

### Tech Stack
- **React Native 0.76.9 + Expo v52** — cross-platform (iOS, Android, Web)
- **Supabase** — auth, database (PostgreSQL with RLS), Edge Functions (Deno)
- **Zustand** — global state management
- **React Navigation native-stack** — navigation
- **Google Gemini 3.1 Flash Lite Preview** (`gemini-3.1-flash-lite-preview`) — lesson generation and interest discovery via Edge Functions
- **Expo Notifications** — daily push notifications (morning + evening)
- **Google Mobile Ads** (`react-native-google-mobile-ads@^14.2.4`) — rewarded ads for streak freeze, double XP, bonus lesson
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
- `addXp` uses `increment_xp` Postgres RPC for atomic server-side increment (no read-modify-write race)
- `addStreakFreeze` uses `increment_streak_freeze` RPC with max-cap guard
- `updateProfile` uses optimistic local update with rollback on DB failure
- **Streak freeze**: `checkAndResetStreak` delegates to `check_and_reset_streak` Postgres RPC which counts the actual multi-day gap and consumes one freeze per missed day. If not enough freezes to cover the gap, streak resets to 0 and all remaining freezes are consumed
- `checkAndResetStreak` is called on app launch (initial session + auth state changes) in `RootNavigator`, so streaks are always evaluated on open — not only when the Dashboard is focused

**[src/store/useLessonStore.ts](src/store/useLessonStore.ts)** — daily lesson lifecycle
- `fetchOrGenerateLesson` → checks DB for today's lesson → tries consuming from `lesson_queue` → falls back to on-demand `generate-lesson` Edge Function
- `quiz_data` is stored as JSONB in DB; format is an array of page objects: `[{text, questions}, ...]`
- XP: 30 XP on first completion, 0 XP on replay; +20 XP per correct quiz answer (UI only)
- `completeLesson()` uses `complete_lesson_atomic` RPC — idempotent: only awards XP/streak on first completion, no-ops on replay or double-tap

**[src/lib/lessonQueue.ts](src/lib/lessonQueue.ts)** — lesson queue management
- `consumeFromQueue` → uses `consume_queue_lesson` RPC to atomically claim next queue item + insert into `daily_lessons` in a single transaction
- `triggerRefillIfNeeded` → fire-and-forget call to `generate-lesson-batch` if queue < 5
- `buildLessonPairs` → round-robin topic+interest pairing for batch generation

### Ads (Google AdMob)
Configured in [src/lib/ads.ts](src/lib/ads.ts) and [src/hooks/useRewardedAd.ts](src/hooks/useRewardedAd.ts):
- AdMob app ID: `ca-app-pub-2213890156530970~8173572553` (must be in AndroidManifest.xml — app crashes on launch without it)
- Three rewarded ad placements: streak freeze, double XP, bonus lesson
- `MobileAds().initialize()` called at module load (wrapped in try-catch)
- Ad hooks use dynamic import and are no-op on web
- `expo-crypto` is a required dependency (used by Supabase auth internally) — must be `~14.0.x` for Expo 52 compatibility (v55+ requires Expo 53)

### Push Notifications
Implemented in [src/lib/notifications.ts](src/lib/notifications.ts):
- **Morning** (8:00 AM): "Ready to learn? 📚" daily reminder
- **Evening** (9:00 PM): "One lesson away! ✨" streak nudge
- Scheduled for the current day only; rescheduled on each new day (handled in `RootNavigator` on app focus)
- Canceled when lesson is completed or user signs out
- Disabled on web platform
- Notification IDs persisted in AsyncStorage
- **Expo 52 trigger format**: `{ type: 'date', date: <Date> }` (not just `{ date: <Date> }`)

### Supabase Setup

**Client**: [src/lib/supabase.ts](src/lib/supabase.ts) — initialized with AsyncStorage for session persistence. Credentials come from `Constants.expoConfig.extra` (set in [app.json](app.json)).

**Auth Configuration (Supabase Dashboard):**
- Google OAuth enabled (Web application client — Supabase handles the callback)
- **Automatic account linking is OFF** — email/password and Google accounts with the same email are treated as separate users; do NOT suggest enabling it
- Redirect URLs: `curioconnect://` (mobile), `http://localhost:19006` (web dev)
- `signInWithGoogle` uses `window.location.origin` as redirect on web, `makeRedirectUri({ scheme: 'curioconnect' })` on native

**Edge Functions** (in `supabase/functions/`):
- `generate-lesson` — on-demand single lesson generation via Gemini 3.1 Flash Lite Preview; produces multi-page format (4-6 pages, 2 quiz questions each)
- `generate-lesson-batch` — pre-generates up to 25 lessons in chunks of 5 per Gemini call; same multi-page format as `generate-lesson`; called fire-and-forget from onboarding and queue refill
- `sync-lesson-queue` — reactive sync when interests/difficulty change; deletes stale lessons, regenerates to fill queue back to 25
- `get-leaderboard` — fetches top 100 users from `leaderboard_profiles` view sorted by XP or `effective_streak`; the view computes streak validity at read time via `get_effective_streak()` so stale streaks (user hasn't opened app) show as 0
- `discover-interests` — analyzes a free-text user prompt via Gemini 3.1 Flash Lite Preview (single call: moderation + discovery); adds up to 3 new interests per call; max 25 interests total per user; deduplicates against existing interests

**Edge Function deployment**: All functions must be deployed with `--no-verify-jwt` (or `verify_jwt: false` via MCP) because they handle auth internally via `adminSupabase.auth.getUser(token)`. The Supabase gateway's JWT check would block valid requests otherwise. All client-side calls must include manual `Authorization: Bearer ${session.access_token}` headers.

**Key Tables:**
- `profiles` — `id, username, total_xp, streak_count, last_lesson_date, difficulty_level, age, job_title, streak_freeze_count (default 1), admin_role ('full_admin' | 'read_only_admin' | null), last_difficulty_change, last_interest_change, created_at`
- `user_interests` — many-to-one with profiles (`id, user_id, interest_name`)
- `topics` — 50+ academic topics for lesson generation (`id, name, category`)
- `daily_lessons` — quiz_data (JSONB, pages format), interest_name, one per user per day per slot; unique index on `(user_id, created_at, lesson_slot)`
- `lesson_queue` — pre-generated lessons waiting to be served (`id, user_id, topic_name, interest_name, title, content_markdown, quiz_data (JSONB pages format), queue_position, generated_at`); RLS: users can SELECT and DELETE own rows; Edge Functions insert via service role
- `news_messages` — broadcast news sent from admin dashboard
- `user_news_reads` — per-user read tracking for news messages
- `feedbacks` — user-submitted feedback (`id, user_id, content, created_at`); insert-only RLS for users; admin reads via service role key

All tables use RLS; users can only access their own rows.

**Postgres RPCs** (called via `supabase.rpc()`, all `SECURITY DEFINER`):
- `increment_xp(uid, amount)` — atomic XP addition; no read-modify-write race
- `increment_streak_freeze(uid, max_freeze)` — atomic freeze add; returns new count; rejects if already at cap
- `consume_streak_freeze(uid, today_date)` — atomic freeze decrement + last_lesson_date update
- `check_and_reset_streak(uid, today_date)` — server-side multi-day gap logic: counts missed days, consumes one freeze per day, resets streak if insufficient freezes
- `complete_lesson_atomic(lesson_id, xp_amount, new_streak, today_date)` — idempotent lesson completion; only updates if `is_completed = false`; prevents double-tap double XP
- `consume_queue_lesson(p_user_id, p_today, p_slot)` — atomic queue claim via `DELETE ... FOR UPDATE SKIP LOCKED`; returns inserted daily_lesson as JSONB
- `save_user_interests(p_user_id, p_interests)` — transactional delete + re-insert of user interests
- `get_effective_streak(streak_count, freeze_count, last_lesson_date)` — pure function computing streak validity at read time (used by `leaderboard_profiles` view)

**Views:**
- `leaderboard_profiles` — extends `profiles` with computed `effective_streak` column for accurate leaderboard ranking

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
- Primary: `#00D4FF` (electric cyan), Primary dark: `#0088CC`, Accent: `#FF6B35` (electric orange), XP: `#FFB800` (electric gold), Streak: `#FF3D71` (neon pink), Danger: `#FF3B30`
- Background: `#F0F4F8` (cool off-white), Text dark: `#0F172A` (dark slate), Border: `#E2E8F0`
- Icons use `Ionicons` from `@expo/vector-icons` instead of emojis for a cleaner look
- Font sizes: xs (11) → title (34); weights: regular → heavy (800)
- Spacing: xs (4px) → xxl (48px); border radius: sm (8) → full (9999)

### Layout Direction
App is forced to LTR globally via `I18nManager.allowRTL(false)` / `I18nManager.forceRTL(false)` in [App.tsx](App.tsx). Do not add per-element RTL workarounds.

### Quiz Animations
[src/components/QuizModal.tsx](src/components/QuizModal.tsx) includes three animation sub-components (no external deps):
- `SparkleEffect` — 12 particles burst on correct answer
- `ConfettiEffect` — 40 falling pieces on lesson completion
- `ShimmerButton` — pulsing button with shimmer sweep

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

### Expo 52 Caveats
- Font weight key is `FONTS.weights.semibold` (lowercase b), not `semiBold`
- Notification triggers require `type` field: `{ type: 'date', date }` or `{ type: 'calendar', ... }`
- `react-native-google-mobile-ads` must be v14.x (v16+ requires Kotlin 2.2, Expo 52 ships Kotlin 1.9.25)
- `expo-crypto` must be v14.x (`~14.0.0`) — v55+ requires Expo 53's gradle plugin

### Google Play Release
- Privacy policy hosted on GitHub Pages
- App targets ages 13+ (COPPA/data safety implications)
- Hebrew (`he-IL`) store listing in addition to English (`en-US`)
- Version tracking: `src/lib/version.ts`, `app.json`, and `android/app/build.gradle` must all be updated together
