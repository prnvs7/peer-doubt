'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const ROLES = ['student', 'helper', 'cr', 'faculty'];

export default function UserManagement() {
    const [items, setItems] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [viewerId, setViewerId] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (q.trim()) params.set('q', q.trim());
            const response = await fetch(`/api/admin/users?${params}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not load users.');
            setItems(data.items || []); setPagination(data.pagination); setViewerId(data.viewerId);
            setDrafts(Object.fromEntries((data.items || []).map((user) => [user._id, { roles: user.roles || [], isSuspended: user.isSuspended || false, note: '' }])));
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [q, page]);

    useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);

    function update(userId, key, value) {
        setDrafts((current) => ({ ...current, [userId]: { ...current[userId], [key]: value } }));
    }

    async function save(user) {
        const draft = drafts[user._id];
        setBusy(user._id); setError(''); setMessage('');
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, ...draft }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not save account changes.');
            setMessage(`Updated access for ${user.name}.`);
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(''); }
    }

    return <div className="space-y-5">
        <header><p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Authorized administration</p><h1 className="mt-1 text-3xl font-bold">User access</h1><p className="mt-2 text-sm text-graphite">Provision CR and faculty roles, manage helper eligibility, and suspend accounts. Every change is recorded.</p><Link className="mt-3 inline-block text-sm font-semibold text-pencil hover:underline" href="/admin/audit">View access audit history</Link></header>
        <label className="block max-w-xl text-sm font-semibold">Find a user<input className="field mt-1" type="search" maxLength={80} value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} placeholder="Name or email" /></label>
        {message && <p className="rounded-lg bg-verified/10 p-3 text-sm text-verified" role="status">{message}</p>}
        {error && <p className="rounded-lg bg-margin/10 p-3 text-sm text-margin" role="alert">{error}</p>}
        {loading && <div className="card h-36 animate-pulse" aria-label="Loading users" />}
        {!loading && !error && !items.length && <div className="card p-8 text-sm text-graphite">No users found.</div>}
        {!loading && items.map((user) => {
            const draft = drafts[user._id] || { roles: user.roles || [], isSuspended: user.isSuspended, note: '' };
            const disabled = user._id === viewerId || user.roles?.includes('admin');
            return <article key={user._id} className="card space-y-4 p-4 sm:p-5">
                <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{user.name}</h2><p className="text-sm text-graphite">{user.email} · Joined {new Date(user.createdAt).toLocaleDateString()}</p><p className="mt-2 text-xs text-graphite">Helper opt-in: {user.helperProfile?.isWilling ? `Available in ${(user.helperProfile.courses || []).join(', ')}` : 'Not opted in'}</p><p className="mt-1 text-xs text-graphite">Activity: {user.activity.doubts} doubts, {user.activity.answers} answers, {user.activity.reports} reports, {user.activity.moderationActions} moderation actions</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.isSuspended ? 'bg-margin/10 text-margin' : 'bg-verified/10 text-verified'}`}>{draft.isSuspended ? 'Suspended' : 'Active'}</span></header>
                <fieldset disabled={disabled || busy === user._id} className="grid gap-3 sm:grid-cols-2">
                    <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-graphite">Roles</legend>
                    {ROLES.map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.roles.includes(role)} onChange={(event) => update(user._id, 'roles', event.target.checked ? [...new Set([...draft.roles, role])] : draft.roles.filter((item) => item !== role))} />{role.toUpperCase()}</label>)}
                </fieldset>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isSuspended} disabled={disabled || busy === user._id} onChange={(event) => update(user._id, 'isSuspended', event.target.checked)} />Suspend sign-in and API access</label>
                {!disabled && <><label className="block text-xs font-semibold text-graphite">Audit note<textarea className="field mt-1" minLength={3} maxLength={1000} value={draft.note} onChange={(event) => update(user._id, 'note', event.target.value)} placeholder="Why is this access change needed?" /></label><button type="button" className="btn-primary" disabled={busy === user._id || draft.note.trim().length < 3} onClick={() => save(user)}>{busy === user._id ? 'Saving…' : 'Save access changes'}</button></>}
            </article>;
        })}
        {!loading && pagination.pages > 1 && <div className="flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {pagination.pages} / {pagination.total} users</span><button type="button" className="btn-quiet" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </div>;
}
