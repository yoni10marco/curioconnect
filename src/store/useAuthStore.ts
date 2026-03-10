import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { cancelAllNotifications } from '../lib/notifications';

interface AuthState {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, username: string, referralCode?: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    addXp: (amount: number) => Promise<void>;
    checkAndResetStreak: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    profile: null,
    loading: false,
    initialized: false,

    setSession: (session) => set({ session, initialized: true }),

    fetchProfile: async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (!error && data) {
            set({ profile: data as Profile });
        }
    },

    signIn: async (email, password) => {
        set({ loading: true });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        set({ loading: false });
        return { error: error?.message ?? null };
    },

    signUp: async (email, password, username, referralCode?) => {
        set({ loading: true });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } },
        });
        if (!error && data.user) {
            // Look up referrer first (before creating profile so we can do it in one upsert)
            let referrerId: string | null = null;
            if (referralCode?.trim()) {
                try {
                    const { data: rpcData } = await supabase.rpc('get_user_by_referral_code', {
                        code: referralCode.trim(),
                    });
                    // rpcData is a UUID string or null
                    if (typeof rpcData === 'string' && rpcData !== data.user.id) {
                        referrerId = rpcData;
                    }
                } catch {
                    // Referral lookup failed — proceed with signup anyway
                }
            }

            // Create profile (trigger auto-generates referral_code)
            await supabase.from('profiles').upsert({
                id: data.user.id,
                username,
                ...(referrerId ? { referred_by_user_id: referrerId } : {}),
            });
        }
        set({ loading: false });
        return { error: error?.message ?? null };
    },

    signOut: async () => {
        await cancelAllNotifications();
        await supabase.auth.signOut();
        set({ session: null, profile: null });
    },

    updateProfile: async (updates) => {
        const { session, profile } = get();
        if (!session) return;
        const { data } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id)
            .select()
            .single();
        // Always update in-memory state — use server data if available, else merge locally
        set({ profile: (data ?? (profile ? { ...profile, ...updates } : null)) as Profile | null });
    },

    addXp: async (amount: number) => {
        const { profile, updateProfile } = get();
        if (profile) {
            await updateProfile({ total_xp: (profile.total_xp ?? 0) + amount });
        }
    },

    checkAndResetStreak: async () => {
        const { profile, updateProfile } = get();
        if (!profile || !profile.last_lesson_date) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        if (profile.last_lesson_date !== todayStr && profile.last_lesson_date !== yesterdayStr) {
            if ((profile.streak_freeze_count ?? 0) >= 1) {
                // Consume 1 freeze; update last_lesson_date to today so streak remains valid
                await updateProfile({
                    streak_freeze_count: profile.streak_freeze_count - 1,
                    last_lesson_date: todayStr,
                });
            } else {
                await updateProfile({ streak_count: 0 });
            }
        }
    },
}));
