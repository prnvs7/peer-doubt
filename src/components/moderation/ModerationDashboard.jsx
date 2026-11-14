'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const STAT_CARDS = [
    { key: 'pendingAnswers', label: 'Answers to review', href: '/moderation/answers', accent: 'text-pencil' },
    { key: 'verifiedAnswers', label: 'Verified answers', href: '/moderation/answers?status=VERIFIED', accent: 'text-verified' },
    { key: 'rejectedAnswers', label: 'Rejected answers', href: '/moderation/answers?status=REJECTED', accent: 'text-margin' },
    { key: 'openReports', label: 'Open reports', href: '/moderation/reports', accent: 'text-margin' },
    { key: 'verifiedThisWeek', label: 'Verified this week', href: '/moderation/history', accent: 'text-verified' },
    { key: 'resolvedReports', label: 'Reports resolved', href: '/moderation/reports', accent: 'text-verified' },
    { key: 'averageVerificationHours', label: 'Average review time (hours)', href: '/moderation/history', accent: 'text-pencil' },
    { key: 'knowledgeEntries', label: 'Active knowledge entries', href: '/knowledge', accent: 'text-pencil' },
    { key: 'potentialDuplicatePairs', label: 'Possible duplicate pairs', href: '/moderation/duplicates', accent: 'text-pencil' },
    { key: 'duplicateDoubts', label: 'Linked duplicates', href: '/moderation/duplicates', accent: 'text-graphite' },
];

const ACTION_LABELS = {
    VERIFIED: 'Verified an answer', REJECTED: 'Rejected an answer', RESOLVED: 'Resolved a report',
    DISMISSED: 'Dismissed a report', DUPLICATE_CONFIRMED: 'Linked a duplicate', DUPLICATE_DISMISSED: 'Dismissed a match',
    REVISION_REQUESTED: 'Requested an answer correction', RECONSIDERED: 'Reopened an answer', FLAGGED: 'Flagged content for review', KNOWLEDGE_ARCHIVED: 'Archived knowledge',
};

export default function ModerationDashboard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true); setError('');
        try {
            const res = await fetch('/api/moderation/stats');
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not load moderation overview.');
            setData(json);
        } catch (err) { setError(err.message); }
        finally { setRefreshing(false); }
    }, []);

    useEffect(() => {
        const initial = setTimeout(load, 0);
        const interval = setInterval(load, 60000);
        return () => { clearTimeout(initial); clearInterval(interval); };
    }, [load]);

    return (
        <div className="space-y-7">
            <section className="card flex flex-col justify-between gap-5 overflow-hidden p-5 sm:flex-row sm:items-center sm:p-7">
                <div>
                    <p className="text-sm font-semibold text-pencil">Review with context</p>
                    <h2 className="mt-1 max-w-xl text-xl font-bold tracking-tight sm:text-2xl">Good answers become shared class knowledge.</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-graphite">Check the explanation against the original doubt, record your decision, and keep the library useful for the next student.</p>
                </div>
                <Link href="/moderation/answers" className="btn-primary shrink-0">Open answer queue <span aria-hidden="true">→</span></Link>
            </section>

            {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-4 text-sm text-margin" role="alert">{error}</p>}
            <div className="flex justify-end"><button type="button" className="btn-quiet" onClick={load} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh statistics'}</button></div>
            <section aria-label="Moderation statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {STAT_CARDS.map((stat) => (
                    <Link key={stat.key} href={stat.href} className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--ui-shadow)]">
                        <p className="text-sm font-medium text-graphite">{stat.label}</p>
                        <p className={`mt-3 text-3xl font-bold tracking-tight ${stat.accent}`}>
                            {data ? (data.stats[stat.key] ?? '—') : <span className="inline-block h-9 w-12 animate-pulse rounded bg-rule" aria-label="Loading" />}
                        </p>
                    </Link>
                ))}
            </section>

            {data && <section className="grid gap-5 lg:grid-cols-2" aria-label="Moderation and knowledge analytics">
                <div className="card p-5 sm:p-6"><h2 className="text-lg font-bold">Moderation activity</h2><p className="mt-1 text-sm text-graphite">Recorded decisions over the last 30 days.</p>{data.activity?.length ? <div className="mt-5 flex h-36 items-end gap-1 border-b border-rule">{data.activity.map((day) => { const peak = Math.max(...data.activity.map((entry) => entry.count)); return <div key={day._id} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${day._id}: ${day.count} actions`}><span className="sr-only">{day._id}: {day.count} actions</span><div className="rounded-t bg-pencil/80" style={{ height: `${Math.max(8, (day.count / peak) * 100)}%` }} /><time className="mt-1 truncate text-center text-[9px] text-graphite">{day._id.slice(5)}</time></div>; })}</div> : <p className="mt-5 rounded-lg bg-paper p-4 text-sm text-graphite">No moderation activity in this period.</p>}</div>
                <div className="card p-5 sm:p-6"><h2 className="text-lg font-bold">Knowledge by course and topic</h2><p className="mt-1 text-sm text-graphite">Currently published entries from the database.</p>{data.knowledgeByCourse?.length ? <ul className="mt-4 space-y-3">{data.knowledgeByCourse.map((course) => { const peak = Math.max(...data.knowledgeByCourse.map((entry) => entry.count)); return <li key={course._id}><div className="flex justify-between text-sm"><span>{course._id}</span><span className="font-semibold">{course.count}</span></div><div className="mt-1 h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-verified" style={{ width: `${(course.count / peak) * 100}%` }} /></div></li>; })}</ul> : <p className="mt-5 rounded-lg bg-paper p-4 text-sm text-graphite">Verified answers will build the course distribution here.</p>}{data.knowledgeByTopic?.length > 0 && <ul aria-label="Top knowledge topics" className="mt-4 flex flex-wrap gap-2">{data.knowledgeByTopic.map((topic) => <li key={topic._id} className="rounded-full bg-paper px-3 py-1 text-xs">{topic._id}: {topic.count}</li>)}</ul>}</div>
            </section>}

            <section className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                <div className="card p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div><h2 className="text-lg font-bold">Recent moderation</h2><p className="mt-1 text-sm text-graphite">A record of decisions by your team.</p></div>
                        <Link href="/moderation/history" className="text-sm font-semibold text-pencil hover:underline">View history</Link>
                    </div>
                    {data?.recentActivity?.length ? <ul className="mt-4 divide-y divide-rule">
                        {data.recentActivity.map((item) => <li key={item._id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                            <div><p className="text-sm font-semibold">{ACTION_LABELS[item.action] || item.action}</p><p className="mt-1 text-xs text-graphite">{item.moderator?.name || 'Moderator'} · {item.entityType}</p></div>
                            <time className="text-xs text-graphite" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString()}</time>
                        </li>)}
                    </ul> : data ? <div className="mt-5 rounded-xl bg-paper p-5 text-sm text-graphite">No moderation activity yet. Completed reviews will appear here.</div> : <div className="mt-5 h-36 animate-pulse rounded-xl bg-paper" aria-label="Loading recent activity" />}
                </div>
                <div className="card p-5 sm:p-6">
                    <h2 className="text-lg font-bold">Your review paths</h2>
                    <p className="mt-1 text-sm text-graphite">Choose the work that needs attention.</p>
                    <ul className="mt-4 space-y-2">
                        {[
                            ['/moderation/answers', 'Review answers', 'Check helper explanations before they are verified.'],
                            ['/moderation/duplicates', 'Compare similar doubts', 'Confirm a repeated question or dismiss the suggestion.'],
                            ['/moderation/reports', 'Resolve reports', 'Review reported content and document the decision.'],
                            ['/knowledge', 'Browse the library', 'Search verified answers available to students.'],
                        ].map(([href, label, hint]) => <li key={href}><Link href={href} className="group flex items-center justify-between gap-3 rounded-xl p-3 transition hover:bg-paper">
                            <span><span className="block text-sm font-semibold group-hover:text-pencil">{label}</span><span className="mt-1 block text-xs leading-5 text-graphite">{hint}</span></span><span className="text-graphite" aria-hidden="true">↗</span>
                        </Link></li>)}
                    </ul>
                </div>
            </section>
        </div>
    );
}
