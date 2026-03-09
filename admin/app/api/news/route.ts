import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/news — broadcast a news message (full_admin only)
export async function POST(req: NextRequest) {
    const serverClient = await createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('admin_role').eq('id', user.id).single();
    if (profile?.admin_role !== 'full_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content } = await req.json();
    if (!title || !content) {
        return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const { error } = await admin.from('news_messages').insert({ title, content });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
