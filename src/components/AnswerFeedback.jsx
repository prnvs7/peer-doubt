'use client';
import { useEffect, useState } from 'react';

export default function AnswerFeedback({ answerId }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let active = true;
        fetch(`/api/answers/${answerId}/feedback`).then(async (response) => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Could not load answer feedback.');
            if (active) setData(result);
        }).catch((err) => active && setError(err.message));
        return () => { active = false; };
    }, [answerId]);

    async function vote(helpful) {
        setBusy(true); setError('');
        try {
            const response = await fetch(`/api/answers/${answerId}/feedback`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ helpful }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Could not save your feedback.');
            setData((current) => ({ ...current, ...result }));
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    return <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3" aria-label="Answer helpfulness">
        <span className="mr-1 text-xs font-semibold text-graphite">Was this answer helpful?</span>
        <button type="button" className={`btn-quiet min-h-8 px-2.5 text-xs ${data?.vote === true ? 'border-pencil text-pencil' : ''}`} disabled={!data?.canVote || busy} aria-pressed={data?.vote === true} onClick={() => vote(true)}>Yes {data ? `(${data.helpful})` : ''}</button>
        <button type="button" className={`btn-quiet min-h-8 px-2.5 text-xs ${data?.vote === false ? 'border-pencil text-pencil' : ''}`} disabled={!data?.canVote || busy} aria-pressed={data?.vote === false} onClick={() => vote(false)}>No {data ? `(${data.unhelpful})` : ''}</button>
        {data?.canVote === false && <span className="text-xs text-graphite">Helpers cannot vote on their own answers.</span>}
        {error && <span role="alert" className="text-xs text-margin">{error}</span>}
    </div>;
}
