import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = createAdminClient();

    const [
        { data: profile },
        { data: interests },
        { data: lessons },
        { data: { user: authUser } },
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('user_interests').select('interest_name').eq('user_id', id),
        supabase.from('daily_lessons').select('id, title, is_completed, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.auth.admin.getUserById(id),
    ]);

    if (!profile) notFound();

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-6">
                <Link href="/dashboard/users" className="text-sm text-gray-500 hover:text-gray-700">← Back to Users</Link>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-8">{profile.username ?? 'Unknown User'}</h1>

            <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Profile info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Email</dt>
                            <dd className="font-medium text-gray-900">{authUser?.email ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">XP</dt>
                            <dd className="font-medium text-xp">{profile.total_xp} XP</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Streak</dt>
                            <dd className="font-medium">{profile.streak_count} 🔥</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Difficulty</dt>
                            <dd className="font-medium capitalize">{profile.difficulty_level}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Age</dt>
                            <dd className="font-medium">{profile.age ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Job Title</dt>
                            <dd className="font-medium">{profile.job_title ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Admin Role</dt>
                            <dd className="font-medium">{profile.admin_role ?? 'User'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Joined</dt>
                            <dd className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </div>

                {/* Interests */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="font-semibold text-gray-900 mb-4">Interests</h2>
                    {interests && interests.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {interests.map(i => (
                                <span key={i.interest_name} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">{i.interest_name}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">No interests selected.</p>
                    )}
                </div>
            </div>

            {/* Lesson history */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Lesson History</h2>
                </div>
                {lessons && lessons.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                        {lessons.map(lesson => (
                            <li key={lesson.id} className="flex items-center justify-between px-6 py-3">
                                <span className="text-sm text-gray-800">{lesson.title}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lesson.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {lesson.is_completed ? 'Completed' : 'In progress'}
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(lesson.created_at).toLocaleDateString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-6 py-4 text-sm text-gray-400">No lessons yet.</p>
                )}
            </div>
        </div>
    );
}
