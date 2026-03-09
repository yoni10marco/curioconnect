import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// PATCH /api/users/[id] — update streak, xp, freeze (full_admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const serverClient = await createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: callerProfile } = await admin.from('profiles').select('admin_role').eq('id', user.id).single();
    if (callerProfile?.admin_role !== 'full_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, number> = {};
    if (typeof body.total_xp === 'number') updates.total_xp = body.total_xp;
    if (typeof body.streak_count === 'number') updates.streak_count = body.streak_count;
    if (typeof body.streak_freeze_count === 'number') updates.streak_freeze_count = body.streak_freeze_count;
    if (typeof body.discover_weekly_limit === 'number') updates.discover_weekly_limit = Math.max(0, body.discover_weekly_limit);

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await admin.from('profiles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
}

// DELETE /api/users/[id] — delete a user (full_admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const serverClient = await createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('admin_role').eq('id', user.id).single();
    if (profile?.admin_role !== 'full_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true });
}
