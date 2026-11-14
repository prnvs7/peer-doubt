'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import HelperInsights from '@/components/helper/HelperInsights';

export default function HelperWorkspace() {
    const [available, setAvailable] = useState([]);
    const [assigned, setAssigned] = useState([]);
    const [ready, setReady] = useState(false);
    const [answers, setAnswers] = useState({});
    const [busy, setBusy] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/helper/doubts');
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not load helper work.');
            setReady(data.ready !== false);
            setAvailable(data.available || []);
            setAssigned(data.assigned || []);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { load(); }, 0);
        return () => clearTimeout(timer);
    }, [load]);

    async function claim(doubtId) {
        setBusy(doubtId);
        setError('');
        setMessage('');
        try {
            const response = await fetch(`/api/doubts/${doubtId}/claim`, { method: 'POST' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not claim this doubt.');
            setMessage('Doubt claimed. Add your explanation when you are ready.');
            await load();
        } catch (claimError) {
            setError(claimError.message);
        } finally {
            setBusy('');
        }
    }

    async function submitAnswer(event, doubtId) {
        event.preventDefault();
        setBusy(doubtId);
        setError('');
        setMessage('');
        try {
            const needsRevision = assigned.find((item) => item._id === doubtId)?.myAnswer?.status === 'REVISION_REQUESTED';
            const answer = assigned.find((item) => item._id === doubtId)?.myAnswer;
            const response = await fetch(needsRevision ? `/api/answers/${answer._id}` : `/api/doubts/${doubtId}/answers`, {
                method: needsRevision ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: answers[doubtId] || '' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not submit your answer.');
            setAnswers((current) => ({ ...current, [doubtId]: '' }));
            setMessage(needsRevision ? 'Revision submitted for moderator review.' : 'Answer submitted for moderator review.');
            await load();
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setBusy('');
        }
    }

    return <div className="space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="eyebrow-gradient text-xs font-bold uppercase tracking-[0.16em]">unStuck helper workspace</p><h1 className="display-heading-gradient mt-1 text-2xl font-bold tracking-tight">Help a classmate get unstuck</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-graphite">Claim one open question, explain your reasoning, and send it to a CR or faculty member for review.</p></div>
            <button type="button" className="btn-quiet" onClick={load}>Refresh</button>
        </header>
        {message && <p className="rounded-xl border border-verified/30 bg-verified/10 p-3 text-sm text-verified" role="status">{message}</p>}
        {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-3 text-sm text-margin" role="alert">{error}</p>}

        <HelperInsights />

        {!loading && !error && !ready && (
            <section className="card space-y-3 p-5">
                <h2 className="font-bold">Set up your helper profile</h2>
                <p className="text-sm text-graphite">Choose your courses and turn on availability to see questions you can answer.</p>
                <Link href="/helper/profile" className="btn-primary w-fit">Open helper profile</Link>
            </section>
        )}

        <section className="space-y-3">
            <div><h2 className="text-lg font-bold">Your claimed questions</h2><p className="mt-1 text-sm text-graphite">Answers stay attached to the original doubt for moderation.</p></div>
            {loading && <div className="card h-32 animate-pulse" aria-label="Loading claimed questions" />}
            {!loading && assigned.length === 0 && <div className="card p-5 text-sm text-graphite">You have no active claims. Choose an open question below to begin.</div>}
            {!loading && assigned.map((doubt) => <article key={doubt._id} className="card workspace-item-card space-y-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-pencil">{doubt.course} · {doubt.topic} · by {doubt.author?.name || 'Student'}</p><h3 className="mt-1 text-lg font-bold">{doubt.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-graphite">{doubt.description}</p></div><StatusBadge status={doubt.status} /></div>
                {doubt.myAnswer && <div className="inner-answer-card rounded-xl p-4"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-wide text-graphite">Your latest answer</p><StatusBadge status={doubt.myAnswer.status} /></div>{doubt.myAnswer.flaggedForReview ? <p className="mt-2 text-sm text-graphite">This answer is hidden while the moderation team reviews a report.</p> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{doubt.myAnswer.content}</p>}</div>}
                {(doubt.status === 'CLAIMED' || doubt.myAnswer?.status === 'REVISION_REQUESTED') && <form className="space-y-3 border-t border-rule pt-4" onSubmit={(event) => submitAnswer(event, doubt._id)}>
                    {doubt.myAnswer?.status === 'REVISION_REQUESTED' && <p className="rounded-lg bg-marker/30 p-3 text-sm">Revision requested: {doubt.myAnswer.moderationHistory?.at(-1)?.reason || 'Please improve this answer.'}</p>}
                    <label className="block space-y-1.5 text-sm font-semibold">{doubt.myAnswer?.status === 'REVISION_REQUESTED' ? 'Revise your explanation' : 'Your explanation'}<textarea className="field min-h-32 resize-y" minLength={10} maxLength={10000} required value={answers[doubt._id] ?? (doubt.myAnswer?.status === 'REVISION_REQUESTED' ? doubt.myAnswer.content : '')} onChange={(event) => setAnswers((current) => ({ ...current, [doubt._id]: event.target.value }))} placeholder="Explain the idea step by step. Include what makes the answer correct." /></label>
                    <button type="submit" className="btn-primary" disabled={busy === doubt._id}>{busy === doubt._id ? 'Submitting…' : doubt.myAnswer?.status === 'REVISION_REQUESTED' ? 'Submit revision' : 'Submit for review'}</button>
                </form>}
                {doubt.status === 'ANSWERED' && <p className="text-sm text-graphite">Your answer is waiting for moderator review.</p>}
                <Link href={`/doubts/${doubt._id}`} className="inline-block text-sm font-semibold text-pencil hover:underline">View question</Link>
            </article>)}
        </section>

        <section className="space-y-3">
            <div><h2 className="text-lg font-bold">Open questions</h2><p className="mt-1 text-sm text-graphite">A claim is reserved for you so two helpers do not answer the same question at once.</p></div>
            {!loading && available.length === 0 && <div className="card p-5 text-sm text-graphite">No open questions are waiting right now.</div>}
            {!loading && available.map((doubt) => <article key={doubt._id} className="card workspace-item-card space-y-4 p-4 sm:p-5">
                <div><p className="text-xs font-semibold text-pencil">{doubt.course} · {doubt.topic} · by {doubt.author?.name || 'Student'}</p><h3 className="mt-1 text-lg font-bold">{doubt.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-graphite">{doubt.description}</p></div>
                <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/doubts/${doubt._id}`} className="text-sm font-semibold text-pencil hover:underline">Open doubt</Link><button type="button" className="btn-primary" disabled={!!busy} onClick={() => claim(doubt._id)}>{busy === doubt._id ? 'Claiming…' : 'Claim this doubt'}</button></div>
            </article>)}
        </section>
    </div>;
}
