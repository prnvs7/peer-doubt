'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

function DoubtPreview({ doubt, title }) {
    return <div className="rounded-xl border border-rule bg-sheet p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-graphite">{title}</p>
        <h3 className="mt-2 font-bold leading-snug">{doubt.title}</h3>
        <p className="mt-1 text-xs font-semibold text-pencil">{doubt.course} · {doubt.topic}</p>
        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-graphite">{doubt.description}</p>
        <Link href={`/doubts/${doubt._id}`} className="mt-3 inline-block text-sm font-semibold text-pencil hover:underline">Open doubt ↗</Link>
    </div>;
}

export default function DuplicateQueue() {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`/api/moderation/duplicates?page=${page}&limit=20`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not load duplicate suggestions.');
            setItems(json.items || []);
            setPagination(json.pagination || { page, pages: 1, total: json.items?.length || 0 });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [page]);
    useEffect(() => {
        const timer = setTimeout(() => { load(); }, 0);
        return () => clearTimeout(timer);
    }, [load]);

    async function decide(item, decision) {
        setBusy(item.candidate._id); setError(''); setMessage('');
        try {
            const res = await fetch(`/api/doubts/${item.candidate._id}/duplicate`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, originalDoubtId: item.original._id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not save duplicate decision.');
            const matchesDecision = (suggestion) => decision === 'CONFIRM'
                ? suggestion.candidate._id === item.candidate._id
                : suggestion.candidate._id === item.candidate._id && suggestion.original._id === item.original._id;
            const removedCount = items.filter(matchesDecision).length;
            setItems((current) => current.filter((suggestion) => !matchesDecision(suggestion)));
            setPagination((current) => ({ ...current, total: Math.max(0, current.total - removedCount) }));
            if (items.length === removedCount && page > 1) setPage((current) => current - 1);
            setMessage(decision === 'CONFIRM' ? 'Duplicate linked. The original doubt and its answers remain available.' : 'Suggestion dismissed and recorded.');
        } catch (err) { setError(err.message); }
        finally { setBusy(''); }
    }

    return <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Potential duplicates</h2><p className="mt-1 text-sm text-graphite">Suggestions compare wording, topic and course. A moderator makes the final call.</p></div><div className="flex items-center gap-3"><span className="text-sm text-graphite">{pagination.total} suggestions</span><button type="button" onClick={load} className="btn-quiet">Refresh</button></div></div>
        {message && <p className="rounded-xl border border-verified/30 bg-verified/10 p-3 text-sm text-verified" role="status">{message}</p>}
        {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-3 text-sm text-margin" role="alert">{error}</p>}
        {loading && <div className="card h-60 animate-pulse" aria-label="Loading duplicate suggestions" />}
        {!loading && !error && items.length === 0 && <div className="card px-5 py-12 text-center"><h3 className="font-bold">No likely matches</h3><p className="mt-1 text-sm text-graphite">As more doubts arrive, related questions will be suggested here.</p></div>}
        {!loading && items.map((item) => <article key={`${item.candidate._id}-${item.original._id}`} className="card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">Possible repeated question</p><p className="mt-1 text-xs text-graphite">Matched signals: {item.signals.join(' · ') || 'Shared academic context'}</p></div><span className="rounded-full bg-marker px-3 py-1 text-sm font-bold text-ink">{item.score}% match</span></div>
            <div className="grid gap-3 lg:grid-cols-2"><DoubtPreview doubt={item.original} title="Earlier question · suggested original" /><DoubtPreview doubt={item.candidate} title="Newer question · candidate" /></div>
            <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" className="btn-quiet" onClick={() => decide(item, 'DISMISS')} disabled={!!busy}>Dismiss suggestion</button><button type="button" className="btn-primary" onClick={() => decide(item, 'CONFIRM')} disabled={!!busy}>{busy === item.candidate._id ? 'Saving…' : 'Link as duplicate'}</button></div>
        </article>)}
        {!loading && pagination.pages > 1 && <div className="flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {pagination.pages}</span><button type="button" className="btn-quiet" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
    </div>;
}
