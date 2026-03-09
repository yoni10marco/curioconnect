'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    userId: string;
    initialXp: number;
    initialStreak: number;
    initialFreeze: number;
    initialDiscoverLimit: number;
};

export default function EditUserStatsButton({ userId, initialXp, initialStreak, initialFreeze, initialDiscoverLimit }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [xp, setXp] = useState(String(initialXp));
    const [streak, setStreak] = useState(String(initialStreak));
    const [freeze, setFreeze] = useState(String(initialFreeze));
    const [discoverLimit, setDiscoverLimit] = useState(String(initialDiscoverLimit));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                total_xp: Number(xp),
                streak_count: Number(streak),
                streak_freeze_count: Number(freeze),
                discover_weekly_limit: Number(discoverLimit),
            }),
        });
        setLoading(false);
        if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? 'Failed to update');
            return;
        }
        setOpen(false);
        router.refresh();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
                Edit Stats
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Edit User Stats</h2>

                        {error && (
                            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">AI Discover Limit (per week) ✨</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={discoverLimit}
                                    onChange={e => setDiscoverLimit(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">XP</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={xp}
                                    onChange={e => setXp(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Streak 🔥</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={streak}
                                    onChange={e => setStreak(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Freeze Credits 🧊</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={freeze}
                                    onChange={e => setFreeze(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark disabled:opacity-60 transition-colors"
                            >
                                {loading ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
