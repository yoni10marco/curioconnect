import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import SendNewsForm from '@/components/SendNewsForm';

export default async function NewsPage() {
    const supabase = createAdminClient();
    const headersList = await headers();
    const isFullAdmin = headersList.get('x-admin-role') === 'full_admin';

    const { data: messages } = await supabase
        .from('news_messages')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">News Broadcasts</h1>
                <p className="text-gray-500 text-sm mt-1">Messages sent to all users&apos; mailboxes.</p>
            </div>

            {isFullAdmin && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                    <h2 className="font-semibold text-gray-900 mb-4">Send New Broadcast</h2>
                    <SendNewsForm />
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Past Broadcasts ({messages?.length ?? 0})</h2>
                </div>
                {messages && messages.length > 0 ? (
                    <ul className="divide-y divide-gray-50">
                        {messages.map(msg => (
                            <li key={msg.id} className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{msg.title}</p>
                                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">{msg.content}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-6 py-4 text-sm text-gray-400">No news broadcasts yet.</p>
                )}
            </div>
        </div>
    );
}
