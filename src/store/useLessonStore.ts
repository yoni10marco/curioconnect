import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { DailyLesson } from '../lib/types';
import { useAuthStore } from './useAuthStore';
import { cancelTodayNotifications } from '../lib/notifications';

interface LessonState {
    lesson: DailyLesson | null;
    loading: boolean;
    error: string | null;
    fetchOrGenerateLesson: () => Promise<void>;
    checkTodayLesson: () => Promise<void>;
    completeLesson: () => Promise<void>;
    resetLesson: () => void;
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

    checkTodayLesson: async () => {
        let { session } = useAuthStore.getState();
        if (!session) {
            const { data } = await supabase.auth.getSession();
            session = data.session;
        }
        if (!session) return;

        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
            .from('daily_lessons')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('created_at', today)
            .single();

        if (existing) {
            set({ lesson: normalizeLesson(existing as DailyLesson) });
        }
    },

    fetchOrGenerateLesson: async () => {
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

        const today = new Date().toISOString().split('T')[0];

        // 1. Check if lesson already exists for today
        const { data: existing } = await supabase
            .from('daily_lessons')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('created_at', today)
            .single();

        if (existing) {
            set({ lesson: normalizeLesson(existing as DailyLesson), loading: false });
            return;
        }


        // 2. Pick a purely random topic from all topics
        const { data: allTopics } = await supabase.from('topics').select('*');
        const topicPool = allTopics ?? [];
        const randomTopic = topicPool.length > 0 ? topicPool[Math.floor(Math.random() * topicPool.length)] : null;

        // 3. Pick a random user interest
        const { data: interests } = await supabase
            .from('user_interests')
            .select('*')
            .eq('user_id', session.user.id);

        const randomInterest = interests && interests.length > 0
            ? interests[Math.floor(Math.random() * interests.length)]
            : null;

        // 4. Call Edge Function — pass token in both header AND body (verify_jwt is now off, function validates internally)
        try {
            const { data, error } = await supabase.functions.invoke('generate-lesson', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: {
                    topic_name: randomTopic?.name ?? 'Science',
                    interest_name: randomInterest?.interest_name ?? 'general knowledge',
                    user_id: session.user.id,
                    access_token: accessToken, // belt-and-suspenders for web
                    difficulty_level: profile?.difficulty_level ?? 'adult',
                    force_new: false,
                },
            });

            if (error) throw error;
            if (!data?.lesson) throw new Error('No lesson returned from server');
            set({ lesson: normalizeLesson(data.lesson as DailyLesson), loading: false });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to generate lesson.';
            set({ loading: false, error: message });
        }
    },

    completeLesson: async () => {
        const { lesson } = useLessonStore.getState();
        const { session, profile, updateProfile } = useAuthStore.getState();

        if (!lesson || !session || !profile) return;

        // Mark lesson as completed
        await supabase
            .from('daily_lessons')
            .update({ is_completed: true })
            .eq('id', lesson.id);

        // Cancel today's notifications — lesson is done
        await cancelTodayNotifications();

        // Calculate streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = 1;
        if (profile.last_lesson_date === yesterdayStr) {
            newStreak = (profile.streak_count ?? 0) + 1;
        } else if (profile.last_lesson_date === todayStr) {
            newStreak = profile.streak_count ?? 1; // Already counted today
        }

        const isReplaying = lesson.is_completed;
        const xpToAdd = isReplaying ? 0 : 30;

        // Update XP + streak
        await updateProfile({
            total_xp: (profile.total_xp ?? 0) + xpToAdd,
            streak_count: newStreak,
            last_lesson_date: todayStr,
        });

        set({ lesson: normalizeLesson({ ...lesson, is_completed: true }) });

        // Referral reward: trigger once on the referred user's first lesson completion
        if (!isReplaying && profile.referred_by_user_id && !profile.referral_reward_given) {
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
