'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateUserButton() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username }),
        });
        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
            setError(data.error ?? 'Failed to create user');
            return;
        }

        setOpen(false);
        setEmail(''); setPassword(''); setUsername('');
        router.refresh();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
                + Create User
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Create New User</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setOpen(false)}
                                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60">
                                    {loading ? 'Creating…' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
