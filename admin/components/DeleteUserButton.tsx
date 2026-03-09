'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`Delete "${username}"? This cannot be undone.`)) return;
        setLoading(true);
        await fetch(`/api/users/${userId}`, { method: 'DELETE' });
        setLoading(false);
        router.refresh();
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
        >
            {loading ? '…' : 'Delete'}
        </button>
    );
}
