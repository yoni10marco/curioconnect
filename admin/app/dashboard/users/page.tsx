import { headers } from 'next/headers';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-admin';
import CreateUserButton from '@/components/CreateUserButton';
import DeleteUserButton from '@/components/DeleteUserButton';

export default async function UsersPage() {
    const supabase = createAdminClient();
    const headersList = await headers();
    const adminRole = headersList.get('x-admin-role') ?? '';
    const isFullAdmin = adminRole === 'full_admin';

    // Fetch all profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, total_xp, streak_count, streak_freeze_count, difficulty_level, age, job_title, created_at, admin_role, referred_by_user_id, last_lesson_date')
        .order('created_at', { ascending: false });

    // Fetch auth emails via admin API
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = Object.fromEntries(authUsers.map(u => [u.id, u.email]));
    const usernameMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.username]));

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                    <p className="text-gray-500 text-sm mt-1">{profiles?.length ?? 0} registered users</p>
                </div>
                {isFullAdmin && <CreateUserButton />}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">XP</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Streak</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Freezes</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Level</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Age</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Job</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Lesson</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                                <th className="text-left px-4 py-3 font-semibold text-gray-600">Invited by</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(profiles ?? []).map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <Link href={`/dashboard/users/${profile.id}`} className="font-medium text-gray-900 hover:text-primary">
                                            {profile.username ?? '—'}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{emailMap[profile.id] ?? '—'}</td>
                                    <td className="px-4 py-3 font-medium text-xp">{profile.total_xp} XP</td>
                                    <td className="px-4 py-3">{profile.streak_count} 🔥</td>
                                    <td className="px-4 py-3">{profile.streak_freeze_count} 🧊</td>
                                    <td className="px-4 py-3 capitalize">{profile.difficulty_level}</td>
                                    <td className="px-4 py-3">{profile.age ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-500">{profile.job_title ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        {profile.admin_role ? (
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${profile.admin_role === 'full_admin' ? 'bg-primary/15 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                                                {profile.admin_role === 'full_admin' ? 'Full Admin' : 'Read Only'}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">User</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{profile.last_lesson_date ? new Date(profile.last_lesson_date).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3 text-gray-400">{new Date(profile.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {profile.referred_by_user_id ? (
                                            <Link href={`/dashboard/users/${profile.referred_by_user_id}`} className="hover:text-primary">
                                                {usernameMap[profile.referred_by_user_id] ?? '—'}
                                            </Link>
                                        ) : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {isFullAdmin && (
                                            <DeleteUserButton userId={profile.id} username={profile.username ?? 'this user'} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
