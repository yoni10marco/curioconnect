import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { DailyLesson } from '../lib/types';
import { useAuthStore } from './useAuthStore';
import { cancelTodayNotifications } from '../lib/notifications';
import { consumeFromQueue, triggerRefillIfNeeded } from '../lib/lessonQueue';

interface LessonState {
    lesson: DailyLesson | null;
    loading: boolean;
    error: string | null;
    fetchOrGenerateLesson: (slot?: 1 | 2) => Promise<void>;
    checkTodayLesson: () => Promise<void>;
    completeLesson: () => Promise<void>;
    resetLesson: () => void;
    unlockBonusLesson: () => Promise<void>;
}

// Always ensure quiz_data is a parsed JS array, never a raw JSON string
function normalizeLesson(lesson: DailyLesson): DailyLesson {
    if (!lesson) return lesson;
    let quiz_data = lesson.quiz_data;
    if (!Array.isArray(quiz_data)) {
        try {
            quiz_data = JSON.parse(quiz_data as unknown as string);
        } catch {
            quiz_data = [];
        }
    }
    return { ...lesson, quiz_data };
}

export const useLessonStore = create<LessonState>((set) => ({
    lesson: null,
    loading: false,
    error: null,

    resetLesson: () => set({ lesson: null, error: null }),

    unlockBonusLesson: async () => {
        const { updateProfile } = useAuthStore.getState();
        const _d = new Date();
        const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
        await updateProfile({ bonus_lesson_date: todayStr });
    },

    checkTodayLesson: async () => {
        let { session } = useAuthStore.getState();
        if (!session) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
        }
        if (!session) return;

        const _d = new Date();
        const today = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;
        const { data: existing } = await supabase
            .from('daily_lessons')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('created_at', today)
            .eq('lesson_slot', 1)
            .single();

        if (existing) {
            set({ lesson: normalizeLesson(existing as DailyLesson) });
        }
    },

    fetchOrGenerateLesson: async (slot: 1 | 2 = 1) => {
        set({ loading: true, error: null });

        let { session, profile } = useAuthStore.getState();

        // Get a fresh session — AsyncStorage may not have hydrated the client yet
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session ?? session;

        if (!session) {
            set({ loading: false, error: 'Not authenticated. Please log in again.' });
            return;
        }

        const accessToken = session.access_token;

        // Profile may not be loaded yet (race condition after login) — fetch it
        if (!profile) {
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            if (profileData) {
                useAuthStore.getState().fetchProfile(session.user.id);
                profile = profileData;
            }
        }

        const _now = new Date();
        const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

        // 1. Check if lesson already exists for today (for this slot)
        const { data: existing } = await supabase
            .from('daily_lessons')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('created_at', today)
            .eq('lesson_slot', slot)
            .single();

        if (existing) {
            set({ lesson: normalizeLesson(existing as DailyLesson), loading: false });
            return;
        }

        // 2. Try to consume from the pre-generated lesson queue
        try {
            const consumed = await consumeFromQueue(session.user.id, today, slot);
            if (consumed) {
                set({ lesson: normalizeLesson(consumed), loading: false });

                // Background: refill queue if running low
                triggerRefillIfNeeded(
                    accessToken,
                    session.user.id,
                    profile?.difficulty_level ?? 'adult'
                );
                return;
            }
        } catch {
            // Queue consumption failed — fall through to on-demand generation
        }

        // 3. Fallback: on-demand generation (queue empty or not yet populated)
        const { data: allTopics } = await supabase.from('topics').select('*');
        const topicPool = allTopics ?? [];
        const randomTopic = topicPool.length > 0 ? topicPool[Math.floor(Math.random() * topicPool.length)] : null;

        const { data: interests } = await supabase
            .from('user_interests')
            .select('*')
            .eq('user_id', session.user.id);

        const randomInterest = interests && interests.length > 0
            ? interests[Math.floor(Math.random() * interests.length)]
            : null;

        try {
            const { data, error } = await supabase.functions.invoke('generate-lesson', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: {
                    topic_name: randomTopic?.name ?? 'Science',
                    interest_name: randomInterest?.interest_name ?? 'general knowledge',
                    user_id: session.user.id,
                    access_token: accessToken,
                    difficulty_level: profile?.difficulty_level ?? 'adult',
                    force_new: false,
                    lesson_slot: slot,
                },
            });

            if (error) throw error;
            if (!data?.lesson) throw new Error('No lesson returned from server');
            set({ lesson: normalizeLesson(data.lesson as DailyLesson), loading: false });

            // Also trigger queue refill in background since queue was empty
            triggerRefillIfNeeded(
                accessToken,
                session.user.id,
                profile?.difficulty_level ?? 'adult'
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to generate lesson.';
            set({ loading: false, error: message });
        }
    },

    completeLesson: async () => {
        const { lesson } = useLessonStore.getState();
        const { session, profile } = useAuthStore.getState();

        if (!lesson || !session || !profile) return;

        const isReplaying = lesson.is_completed;

        // Cancel today's notifications — lesson is done
        await cancelTodayNotifications();

        // Calculate streak
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        let newStreak = 1;
        if (profile.last_lesson_date === yesterdayStr) {
            newStreak = (profile.streak_count ?? 0) + 1;
        } else if (profile.last_lesson_date === todayStr) {
            newStreak = profile.streak_count ?? 1; // Already counted today
        }

        const xpToAdd = isReplaying ? 0 : 30;

        // Atomically: mark lesson complete + update XP/streak (prevents double-tap double XP)
        const { data: wasCompleted } = await supabase.rpc('complete_lesson_atomic', {
            lesson_id: lesson.id,
            xp_amount: xpToAdd,
            new_streak: newStreak,
            today_date: todayStr,
        });

        // Update local state
        set({ lesson: normalizeLesson({ ...lesson, is_completed: true }) });

        // Re-fetch profile to get authoritative XP/streak from DB
        await useAuthStore.getState().fetchProfile(session.user.id);

        // Referral reward: trigger once on the referred user's first lesson completion
        if (wasCompleted && !isReplaying && profile.referred_by_user_id && !profile.referral_reward_given) {
            const { data } = await supabase.functions.invoke('apply-referral-reward', {
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: { user_id: session.user.id },
            });
            if (data?.rewarded) {
                await useAuthStore.getState().fetchProfile(session.user.id);
                Alert.alert('Referral Bonus! 🎉', 'You and your friend each earned +100 XP and +1 streak freeze!');
            }
        }
    },
}));
