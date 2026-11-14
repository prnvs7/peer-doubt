'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptButton({ answerId }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function accept() {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/answers/${answerId}/accept`, { method: 'PATCH' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not accept this answer.');
            router.refresh();
        } catch (acceptError) {
            setError(acceptError.message);
        } finally {
            setLoading(false);
        }
    }

    return <>
        <button onClick={accept} disabled={loading} className="btn-quiet">
            {loading ? 'Accepting...' : 'This helped, accept answer'}
        </button>
        {error && <p role="alert" className="text-sm text-margin">{error}</p>}
    </>;
}