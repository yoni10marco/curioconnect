import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { MAX_FREEZE } from '../lib/ads';
import { cancelAllNotifications } from '../lib/notifications';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, username: string, referralCode?: string) => Promise<{ error: string | null }>;
    signInWithGoogle: (referralCode?: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    addXp: (amount: number) => Promise<void>;
    addStreakFreeze: () => Promise<void>;
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

    signInWithGoogle: async (referralCode?) => {
        set({ loading: true });
        const redirectTo = Platform.OS === 'web'
            ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:19006')
            : makeRedirectUri({ scheme: 'curioconnect' });

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data.url) {
            set({ loading: false });
            return { error: error?.message ?? 'Failed to initiate Google sign-in' };
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') {
            set({ loading: false });
            return { error: null }; // user cancelled — not an error
        }

        const params = new URLSearchParams(result.url.split('#')[1] ?? '');
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken || !refreshToken) {
            set({ loading: false });
            return { error: 'Authentication failed. Please try again.' };
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        });
        if (sessionError) {
            set({ loading: false });
            return { error: sessionError.message };
        }

        const userId = sessionData.session?.user.id;
        if (!userId) {
            set({ loading: false });
            return { error: 'No user returned from Google.' };
        }

        // Check if this is a new user (no profile yet)
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();

        if (!existingProfile) {
            const meta = sessionData.session?.user.user_metadata ?? {};
            const googleName: string =
                meta.full_name ?? meta.name ?? sessionData.session?.user.email?.split('@')[0] ?? 'user';

            let referrerId: string | null = null;
            if (referralCode?.trim()) {
                try {
                    const { data: rpcData } = await supabase.rpc('get_user_by_referral_code', {
                        code: referralCode.trim(),
                    });
                    if (typeof rpcData === 'string' && rpcData !== userId) {
                        referrerId = rpcData;
                    }
                } catch {
                    // Referral lookup failed — proceed anyway
                }
            }

            await supabase.from('profiles').upsert({
                id: userId,
                username: googleName,
                ...(referrerId ? { referred_by_user_id: referrerId } : {}),
            });
        }

        set({ loading: false });
        return { error: null };
    },

    signOut: async () => {
        await cancelAllNotifications();
        await supabase.auth.signOut();
        set({ session: null, profile: null });
    },

    updateProfile: async (updates) => {
        const { session, profile } = get();
        if (!session || !profile) return;
        // Optimistic update for instant UI feedback
        const prev = profile;
        set({ profile: { ...profile, ...updates } as Profile });
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id)
            .select()
            .single();
        if (error) {
            // Rollback to previous state on failure
            set({ profile: prev });
        } else if (data) {
            // Confirm with authoritative server data
            set({ profile: data as Profile });
        }
    },

    addStreakFreeze: async () => {
        const { session, profile } = get();
        if (!session || !profile) return;
        const current = profile.streak_freeze_count ?? 0;
        if (current >= MAX_FREEZE) return;
        // Optimistic update
        set({ profile: { ...profile, streak_freeze_count: current + 1 } });
        const { data, error } = await supabase.rpc('increment_streak_freeze', {
            uid: session.user.id,
            max_freeze: MAX_FREEZE,
        });
        if (error || data === null) {
            // Rollback — DB rejected (already at max or failure)
            set({ profile: { ...profile, streak_freeze_count: current } });
        } else {
            // Confirm with server value
            set({ profile: { ...get().profile!, streak_freeze_count: data } });
        }
    },

    addXp: async (amount: number) => {
        const { session, profile } = get();
        if (!session || !profile) return;
        // Optimistic update
        set({ profile: { ...profile, total_xp: (profile.total_xp ?? 0) + amount } });
        const { error } = await supabase.rpc('increment_xp', {
            uid: session.user.id,
            amount,
        });
        if (error) {
            // Rollback on failure
            set({ profile: { ...profile } });
        }
    },

    checkAndResetStreak: async () => {
        const { session, profile } = get();
        if (!session || !profile || !profile.last_lesson_date) return;

        const _d = new Date();
        const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`;

        // Server-side RPC handles multi-day gap logic:
        // - Counts missed days between last_lesson_date and today
        // - Consumes one freeze per missed day
        // - Resets streak to 0 if not enough freezes to cover the gap
        const { error } = await supabase.rpc('check_and_reset_streak', {
            uid: session.user.id,
            today_date: todayStr,
        });

        if (!error) {
            // Re-fetch profile to reflect any changes (freeze consumed or streak reset)
            await get().fetchProfile(session.user.id);
        }
    },
}));
