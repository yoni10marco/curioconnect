import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { DailyLesson } from '../lib/types';
import { useAuthStore } from './useAuthStore';

interface LessonState {
    lesson: DailyLesson | null;
    loading: boolean;
    error: string | null;
    fetchOrGenerateLesson: () => Promise<void>;
    completeLesson: () => Promise<void>;
    resetLesson: () => void;
}

export const useLessonStore = create<LessonState>((set) => ({
    lesson: null,
    loading: false,
    error: null,

    resetLesson: () => set({ lesson: null, error: null }),

    fetchOrGenerateLesson: async () => {
        set({ loading: true, error: null });

        const { session, profile } = useAuthStore.getState();
        if (!session || !profile) {
            set({ loading: false, error: 'Not authenticated' });
            return;
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
            set({ lesson: existing as DailyLesson, loading: false });
            return;
        }

        // 2. Pick a random topic not in user history
        const { data: usedTopics } = await supabase
            .from('daily_lessons')
            .select('topic_id')
            .eq('user_id', session.user.id);

        const usedTopicIds = (usedTopics ?? []).map((l: { topic_id: string }) => l.topic_id).filter(Boolean);

        const { data: allTopics } = await supabase.from('topics').select('*');
        const availableTopics = (allTopics ?? []).filter((t: { id: string }) => !usedTopicIds.includes(t.id));
        const topicPool = availableTopics.length > 0 ? availableTopics : allTopics ?? [];
        const randomTopic = topicPool[Math.floor(Math.random() * topicPool.length)];

        // 3. Pick a random user interest
        const { data: interests } = await supabase
            .from('user_interests')
            .select('*')
            .eq('user_id', session.user.id);

        const randomInterest = interests && interests.length > 0
            ? interests[Math.floor(Math.random() * interests.length)]
            : null;

        // 4. Call Edge Function to generate lesson
        try {
            const { data, error } = await supabase.functions.invoke('generate-lesson', {
                body: {
                    topic_name: randomTopic?.name ?? 'Science',
                    interest_name: randomInterest?.interest_name ?? 'general knowledge',
                    user_id: session.user.id,
                    difficulty_level: profile.difficulty_level ?? 'adult',
                },
            });

            if (error) throw error;
            set({ lesson: data.lesson as DailyLesson, loading: false });
        } catch (err) {
            set({ loading: false, error: 'Failed to generate lesson. Please try again.' });
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

        // Update XP + streak
        await updateProfile({
            total_xp: (profile.total_xp ?? 0) + 50,
            streak_count: newStreak,
            last_lesson_date: todayStr,
        });

        set({ lesson: { ...lesson, is_completed: true } });
    },
}));
