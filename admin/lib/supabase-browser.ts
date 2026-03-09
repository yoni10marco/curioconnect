'use client';

import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client using the anon key (for login form only)
export function createBrowserSupabaseClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
