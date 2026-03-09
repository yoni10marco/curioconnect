import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/users — create a new user (full_admin only)
export async function POST(req: NextRequest) {
    const serverClient = await createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('admin_role').eq('id', user.id).single();
    if (profile?.admin_role !== 'full_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password, username } = await req.json();
    if (!email || !password) {
        return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

    const { error: profileError } = await admin.from('profiles').insert({
        id: newUser.user.id,
        username: username || null,
        total_xp: 0,
        streak_count: 0,
        difficulty_level: 'beginner',
        streak_freeze_count: 1,
    });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
