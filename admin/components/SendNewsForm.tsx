'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SendNewsForm() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        const res = await fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error ?? 'Failed to send news');
            return;
        }

        setTitle('');
        setContent('');
        setSuccess(true);
        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">News broadcast sent successfully!</div>}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Breaking: New feature launched..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                <textarea
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={4}
                    placeholder="Write your message here..."
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
                {loading ? 'Sending…' : 'Broadcast to All Users'}
            </button>
        </form>
    );
}
