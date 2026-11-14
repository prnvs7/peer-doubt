'use client';
import { useCallback, useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';

const STATES = ['OPEN', 'RESOLVED', 'DISMISSED'];

function ReportedContent({ report }) {
    const item = report.targetContent;
    if (!item) return <p className="text-sm text-margin">The reported content is no longer available.</p>;
    if (item.kind === 'doubt') return <div className="rounded-xl bg-paper p-4"><p className="text-xs font-bold uppercase tracking-wide text-graphite">Reported doubt · {item.course} · {item.topic}</p><h3 className="mt-2 font-bold">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.description}</p></div>;
    return <div className="rounded-xl bg-paper p-4"><p className="text-xs font-bold uppercase tracking-wide text-graphite">Reported answer · {item.helper?.name || 'Helper'}{item.doubt ? ` · ${item.doubt.course} · ${item.doubt.topic}` : ''}</p>{item.doubt && <p className="mt-2 text-sm font-semibold">On: {item.doubt.title}</p>}<p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.content}</p></div>;
}

export default function ReportQueue() {
    const [status, setStatus] = useState('OPEN');
    const [type, setType] = useState('all');
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [notes, setNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = useCallback(async () => {
        setLoading(true); setError('');
        const params = new URLSearchParams({ status, page: String(page), limit: '20' });
        if (type !== 'all') params.set('type', type);
        try {
            const res = await fetch(`/api/reports?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not load reports.');
            setItems(json.items || []);
            setPagination(json.pagination || { page, pages: 1, total: json.items?.length || 0 });
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [status, type, page]);

    useEffect(() => {
        const timer = setTimeout(() => { load(); }, 0);
        return () => clearTimeout(timer);
    }, [load]);

    async function decide(report, decision) {
        setBusy(report._id); setError(''); setMessage('');
        try {
            const res = await fetch(`/api/reports/${report._id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision, note: notes[report._id] || '' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not save report decision.');
            if (decision === 'FLAG') {
                setMessage('Content flagged for additional review. The report remains open.');
                await load();
            } else {
                setItems((current) => current.filter((item) => item._id !== report._id));
                setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
                if (items.length === 1 && page > 1) setPage((current) => current - 1);
                setMessage(decision === 'RESOLVE' ? 'Report resolved and moderator decision recorded.' : 'Report dismissed and moderator decision recorded.');
            }
        } catch (err) { setError(err.message); }
        finally { setBusy(''); }
    }

    return <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Reported content</h2><p className="mt-1 text-sm text-graphite">Review the original material and report context before recording a decision.</p></div><button type="button" onClick={load} className="btn-quiet">Refresh</button></div>
        <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="report-status">Report status</label><select id="report-status" className="field w-auto min-w-40" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{STATES.map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select>
            <label className="sr-only" htmlFor="report-type">Report content type</label><select id="report-type" className="field w-auto min-w-40" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="all">All content</option><option value="doubt">Doubts</option><option value="answer">Answers</option></select>
        </div>
        {message && <p className="rounded-xl border border-verified/30 bg-verified/10 p-3 text-sm text-verified" role="status">{message}</p>}
        {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-3 text-sm text-margin" role="alert">{error}</p>}
        {loading && <div className="card h-48 animate-pulse" aria-label="Loading reports" />}
        {!loading && !error && !items.length && <div className="card px-5 py-12 text-center"><h3 className="font-bold">No {status.toLowerCase()} reports</h3><p className="mt-1 text-sm text-graphite">Change the filters to review other reports.</p></div>}
        {!loading && items.map((report) => <article key={report._id} className="card space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={report.status} /><span className="text-xs font-semibold uppercase tracking-wide text-graphite">{report.targetType}</span></div><h3 className="mt-3 text-lg font-bold">{report.reason}</h3><p className="mt-1 text-sm text-graphite">Reported by {report.reporter?.name || 'Student'} · {new Date(report.createdAt).toLocaleString()}</p></div>{report.handledBy && <p className="text-xs text-graphite">Reviewed by {report.handledBy.name}</p>}</div>
            {report.details && <p className="rounded-xl border border-rule p-3 text-sm leading-6">{report.details}</p>}
            <ReportedContent report={report} />
            {report.targetContent?.flaggedForReview && <p className="rounded-lg bg-margin/10 p-3 text-xs font-semibold text-margin">Flagged for additional review</p>}
            {report.decisionHistory?.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-semibold text-graphite">Decision history ({report.decisionHistory.length})</summary><ul className="mt-2 space-y-1 text-xs text-graphite">{report.decisionHistory.map((entry, index) => <li key={`${entry.action}-${index}`}>{entry.action} · {entry.moderator?.name || 'Moderator'} · {entry.reason || 'No note'} · {new Date(entry.createdAt).toLocaleString()}</li>)}</ul></details>}
            {report.status === 'OPEN' && <div className="space-y-2 border-t border-rule pt-4"><label className="text-sm font-semibold" htmlFor={`report-note-${report._id}`}>Decision note <span className="font-normal text-graphite">(optional)</span></label><textarea id={`report-note-${report._id}`} className="field" rows={2} maxLength={1000} placeholder="Document the reason for your decision" value={notes[report._id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [report._id]: event.target.value }))} /><div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn-quiet" disabled={!!busy} onClick={() => decide(report, 'DISMISS')}>{busy === report._id ? 'Saving…' : 'Dismiss report'}</button>{!report.targetContent?.flaggedForReview && <button type="button" className="btn-quiet" disabled={!!busy} onClick={() => decide(report, 'FLAG')}>Flag for review</button>}<button type="button" className="btn-primary" disabled={!!busy} onClick={() => decide(report, 'RESOLVE')}>{busy === report._id ? 'Saving…' : 'Resolve report'}</button></div></div>}
        </article>)}
        {!loading && pagination.pages > 1 && <div className="flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {pagination.pages} · {pagination.total} reports</span><button type="button" className="btn-quiet" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
    </div>;
}
