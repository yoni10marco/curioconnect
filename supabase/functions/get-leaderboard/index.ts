import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { activeTab } = await req.json();

        // Use the SERVICE_ROLE_KEY to bypass Row Level Security on the profiles table
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Identify the current user from the Authorization header
        const authHeader = req.headers.get('Authorization') ?? '';
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        const currentUserId = user?.id ?? null;

        // Use the leaderboard_profiles view which computes effective_streak at read time
        // so users with stale streaks (haven't opened the app) don't appear at the top
        const column = activeTab === 'xp' ? 'total_xp' : 'effective_streak';

        // Fetch users, filtering by the active tab's metric
        // XP tab: show anyone with XP or streak; Streak tab: only users with effective_streak > 0
        let query = supabaseAdmin
            .from('leaderboard_profiles')
            .select('id, username, total_xp, streak_count, effective_streak')
            .order(column, { ascending: false })
            .limit(100);

        if (activeTab === 'xp') {
            query = query.gt('total_xp', 0);
        } else {
            query = query.gt('effective_streak', 0);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        let result = data ?? [];

        // If the current user is not in the list (0 XP + 0 streak), fetch and append them
        if (currentUserId && !result.find((u: any) => u.id === currentUserId)) {
            const { data: currentUser } = await supabaseAdmin
                .from('leaderboard_profiles')
                .select('id, username, total_xp, streak_count, effective_streak')
                .eq('id', currentUserId)
                .single();

            if (currentUser) {
                result = [...result, currentUser];
            }
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error("Leaderboard Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
