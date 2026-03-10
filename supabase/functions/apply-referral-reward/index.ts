import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_FREEZE = 3;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Validate JWT to confirm caller identity
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();
    if (user_id !== user.id) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch new user's profile
    const { data: newUser, error: newUserErr } = await admin
      .from('profiles')
      .select('referred_by_user_id, referral_reward_given, total_xp, streak_freeze_count')
      .eq('id', user_id)
      .single();

    if (newUserErr || !newUser) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'profile_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newUser.referred_by_user_id || newUser.referral_reward_given) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'not_eligible' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const referrerId = newUser.referred_by_user_id;

    // Fetch referrer's profile
    const { data: referrer, error: referrerErr } = await admin
      .from('profiles')
      .select('total_xp, streak_freeze_count')
      .eq('id', referrerId)
      .single();

    if (referrerErr || !referrer) {
      return new Response(JSON.stringify({ rewarded: false, reason: 'referrer_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update new user: +100 XP, +1 freeze (capped at MAX_FREEZE), mark reward given
    await admin.from('profiles').update({
      total_xp: (newUser.total_xp ?? 0) + 100,
      streak_freeze_count: Math.min((newUser.streak_freeze_count ?? 0) + 1, MAX_FREEZE),
      referral_reward_given: true,
    }).eq('id', user_id);

    // Update referrer: +100 XP, +1 freeze (capped at MAX_FREEZE)
    await admin.from('profiles').update({
      total_xp: (referrer.total_xp ?? 0) + 100,
      streak_freeze_count: Math.min((referrer.streak_freeze_count ?? 0) + 1, MAX_FREEZE),
    }).eq('id', referrerId);

    return new Response(JSON.stringify({ rewarded: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ rewarded: false, reason: 'internal_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
