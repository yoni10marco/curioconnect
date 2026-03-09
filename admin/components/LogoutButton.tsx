'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createBrowserSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm font-medium"
        >
            <span>🚪</span>
            <span>Sign out</span>
        </button>
    );
}
