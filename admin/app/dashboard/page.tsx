import { createAdminClient } from '@/lib/supabase-admin';

export default async function DashboardOverview() {
    const supabase = createAdminClient();

    const [
        { count: userCount },
        { count: feedbackCount },
        { count: newsCount },
        { data: recentUsers },
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('feedbacks').select('*', { count: 'exact', head: true }),
        supabase.from('news_messages').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('id, username, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const stats = [
        { label: 'Total Users', value: userCount ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-700' },
        { label: 'Feedbacks', value: feedbackCount ?? 0, icon: '💬', color: 'bg-purple-50 text-purple-700' },
        { label: 'News Broadcasts', value: newsCount ?? 0, icon: '📰', color: 'bg-green-50 text-green-700' },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                <p className="text-gray-500 text-sm mt-1">Welcome to the CurioConnect admin dashboard.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-5 mb-10">
                {stats.map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-xl mb-3 ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent users */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Registrations</h2>
                </div>
                <ul className="divide-y divide-gray-50">
                    {(recentUsers ?? []).map(user => (
                        <li key={user.id} className="flex items-center justify-between px-6 py-3">
                            <span className="text-sm font-medium text-gray-800">{user.username ?? 'Unknown'}</span>
                            <span className="text-xs text-gray-400">{new Date(user.created_at).toLocaleDateString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
