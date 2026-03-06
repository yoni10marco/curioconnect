import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';

interface AuthState {
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
    setSession: (session: Session | null) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
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

    signUp: async (email, password, username) => {
        set({ loading: true });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } },
        });
        if (!error && data.user) {
            // Ensure profile exists
            await supabase.from('profiles').upsert({ id: data.user.id, username });
        }
        set({ loading: false });
        return { error: error?.message ?? null };
    },

    signOut: async () => {
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
}));
