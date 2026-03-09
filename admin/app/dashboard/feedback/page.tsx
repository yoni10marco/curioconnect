import { createAdminClient } from '@/lib/supabase-admin';

export default async function FeedbackPage() {
    const supabase = createAdminClient();

    const { data: feedbacks } = await supabase
        .from('feedbacks')
        .select('id, content, created_at, user_id, profiles(username)')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
                <p className="text-gray-500 text-sm mt-1">{feedbacks?.length ?? 0} submissions — only visible to admins.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {feedbacks && feedbacks.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                        {feedbacks.map(fb => {
                            const profile = fb.profiles as { username: string | null } | null;
                            return (
                                <li key={fb.id} className="px-6 py-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-gray-500">
                                                    {profile?.username ?? 'Anonymous'}
                                                </span>
                                            </div>
                                            <p className="text-gray-800 text-sm leading-relaxed">{fb.content}</p>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(fb.created_at).toLocaleDateString()}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <p className="text-gray-400 text-sm">No feedback submissions yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
