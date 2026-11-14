'use client';

import { useEffect, useState } from 'react';

const LABELS = {
    VERIFIED: 'Verified answer',
    REJECTED: 'Rejected answer',
    REVISION_REQUESTED: 'Requested answer revision',
    RECONSIDERED: 'Reconsidered rejected answer',
    RESOLVED: 'Resolved report',
    DISMISSED: 'Dismissed report',
    FLAGGED: 'Flagged content for review',
    DUPLICATE_CONFIRMED: 'Confirmed duplicate',
    DUPLICATE_DISMISSED: 'Dismissed duplicate suggestion',
    KNOWLEDGE_ARCHIVED: 'Archived knowledge',
    USER_ACCESS_UPDATED: 'Updated user access',
};

export default function ModerationHistory() {
    const [type, setType] = useState('all');
    const [action, setAction] = useState('all');
    const [moderator, setModerator] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [moderators, setModerators] = useState([]);
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true);
            setError('');
            const params = new URLSearchParams({ page: String(page), limit: '25' });
            if (type !== 'all') params.set('type', type);
            if (action !== 'all') params.set('action', action);
            if (moderator) params.set('moderator', moderator);
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            try {
                const response = await fetch(`/api/moderation/history?${params}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || 'Could not load history.');
                if (active) {
                    setItems(data.items || []);
                    setModerators(data.moderators || []);
                    setPages(Math.max(1, data.pagination?.pages || 1));
                }
            } catch (loadError) {
                if (active) setError(loadError.message);
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [type, action, moderator, from, to, page]);

    return <div className="space-y-5">
        <div><h2 className="text-xl font-bold">Moderation history</h2><p className="mt-1 text-sm text-graphite">Filter previous decisions by moderator, action and date.</p></div>
        <section aria-label="History filters" className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1 text-xs font-semibold text-graphite">Content type
                <select className="field" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="all">All content</option><option value="answer">Answers</option><option value="doubt">Doubts</option><option value="report">Reports</option><option value="knowledge">Knowledge</option><option value="user">User access</option></select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-graphite">Action
                <select className="field" value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option value="all">All actions</option>{Object.entries(LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-graphite">Moderator
                <select className="field" value={moderator} onChange={(event) => { setModerator(event.target.value); setPage(1); }}><option value="">All moderators</option>{moderators.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}</select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-graphite">From
                <input className="field" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-graphite">Through
                <input className="field" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
            </label>
        </section>
        {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-3 text-sm text-margin" role="alert">{error}</p>}
        <div className="card overflow-hidden">
            {loading ? <div className="space-y-3 p-5" aria-label="Loading moderation history">{[1, 2, 3].map((key) => <div className="h-14 animate-pulse rounded-lg bg-paper" key={key} />)}</div> : !items.length ? <div className="px-5 py-12 text-center"><h3 className="font-bold">No decisions found</h3><p className="mt-1 text-sm text-graphite">Try changing the history filters.</p></div> : <ol className="divide-y divide-rule">
                {items.map((item) => <li key={item._id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                    <div>
                        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-marker px-2.5 py-1 text-xs font-bold">{item.entityType}</span><p className="font-semibold">{LABELS[item.action] || item.action}</p></div>
                        <p className="mt-2 text-sm text-graphite">{item.moderator?.name || 'Moderator'}{item.reason ? ` · ${item.reason}` : ' · No note recorded'}</p>
                        <p className="mt-1 text-xs text-graphite">Record {item.entityId.toString()}</p>
                    </div>
                    <time className="shrink-0 text-xs text-graphite" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </li>)}
            </ol>}
        </div>
        {!loading && pages > 1 && <div className="flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {pages}</span><button type="button" className="btn-quiet" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
    </div>;
}
