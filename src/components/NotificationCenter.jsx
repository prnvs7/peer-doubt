'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

export default function NotificationCenter() {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const response = await fetch(`/api/notifications?page=${page}&limit=30`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not load notifications.');
            setItems(data.items || []);
            setUnread(data.unread || 0);
            setPages(Math.max(1, data.pagination?.pages || 1));
            setError('');
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => {
        const initial = setTimeout(load, 0);
        const timer = setInterval(load, 45000);
        return () => { clearTimeout(initial); clearInterval(timer); };
    }, [load]);

    async function markRead(id) {
        const response = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
        if (!response.ok) return load();
        setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item));
        setUnread((count) => Math.max(0, count - 1));
    }

    async function markAllRead() {
        const response = await fetch('/api/notifications', { method: 'PATCH' });
        if (response.ok) {
            const readAt = new Date().toISOString();
            setItems((current) => current.map((item) => ({ ...item, readAt })));
            setUnread(0);
        } else load();
    }

    return <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Updates</p><h1 className="mt-1 text-3xl font-bold">Notifications</h1><p className="mt-2 text-sm text-graphite" aria-live="polite">{unread} unread</p></div><button type="button" className="btn-quiet" disabled={!unread} onClick={markAllRead}>Mark all read</button></header>
        {error && <div className="card p-4 text-sm text-margin" role="alert">{error}<button type="button" className="ml-3 font-semibold underline" onClick={load}>Retry</button></div>}
        {loading && <div className="card h-36 animate-pulse" aria-label="Loading notifications" />}
        {!loading && !error && !items.length && <div className="card p-10 text-center"><h2 className="font-bold">You’re all caught up</h2><p className="mt-1 text-sm text-graphite">Updates about answers and moderation will appear here.</p></div>}
        {!loading && items.length > 0 && <><ol className="card divide-y divide-rule">
            {items.map((item) => <li key={item._id} className={`flex gap-4 p-4 sm:p-5 ${item.readAt ? '' : 'bg-marker/20'}`}>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? 'bg-rule' : 'bg-pencil'}`} aria-label={item.readAt ? 'Read' : 'Unread'} />
                <div className="min-w-0 flex-1"><p className="text-sm leading-6">{item.message}</p><p className="mt-1 text-xs text-graphite">{new Date(item.createdAt).toLocaleString()}</p><div className="mt-3 flex gap-4 text-sm font-semibold"><Link href={item.href} className="text-pencil hover:underline" onClick={() => !item.readAt && markRead(item._id)}>Open update <span aria-hidden="true">→</span></Link>{!item.readAt && <button type="button" className="text-graphite hover:text-ink" onClick={() => markRead(item._id)}>Mark read</button>}</div></div>
            </li>)}
        </ol>{pages > 1 && <div className="flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {pages}</span><button type="button" className="btn-quiet" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}</>}
    </div>;
}
