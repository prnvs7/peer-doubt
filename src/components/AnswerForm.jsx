'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnswerForm({ doubtId }) {
    const router = useRouter();
    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fetch(`/api/doubts/${doubtId}/answers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body }),
        });
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        if (!res.ok) return setError(data.msg || 'Could not post your answer.');
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="answer" className="block font-medium">Your explanation</label>
            {error && <p role="alert" className="text-sm text-margin">{error}</p>}
            <textarea id="answer" className="field h-52 font-serif text-base leading-relaxed"
                placeholder="Explain it step by step, as you would to a friend."
                value={body} onChange={(e) => setBody(e.target.value)} required />
            <button className="btn" disabled={loading}>{loading ? 'Posting...' : 'Post answer'}</button>
        </form>
    );
}