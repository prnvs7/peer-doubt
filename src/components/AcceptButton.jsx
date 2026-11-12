'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptButton({ answerId }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function accept() {
        setLoading(true);
        await fetch(`/api/answers/${answerId}/accept`, { method: 'PATCH' });
        setLoading(false);
        router.refresh();
    }

    return (
        <button onClick={accept} disabled={loading} className="btn-quiet">
            {loading ? 'Accepting...' : 'This helped, accept answer'}
        </button>
    );
}