'use client';
import { useEffect, useState } from 'react';

export default function HelperInsights() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        fetch('/api/helper/analytics').then(async (response) => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.msg || 'Could not load contribution insights.');
            if (active) setData(result);
        }).catch((err) => active && setError(err.message));
        return () => { active = false; };
    }, []);

    if (error) return <p className="card p-4 text-sm text-margin" role="alert">{error}</p>;
    if (!data) return <div className="card h-28 animate-pulse" aria-label="Loading contribution insights" />;
    const { stats, contributionHistory } = data;
    const metrics = [
        ['Answers', stats.total], ['Verified', stats.verified], ['Rejected', stats.rejected], ['Helpful votes', stats.helpfulVotes], ['Not helpful', stats.unhelpfulVotes], ['Verification rate', `${stats.verificationRate}%`],
    ];
    return <section className="card space-y-4 p-4 sm:p-5" aria-label="Your contribution insights">
        <div><h2 className="font-bold">Your contribution insights</h2><p className="mt-1 text-xs text-graphite">Counts are calculated from your submitted answers and student feedback.</p></div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{metrics.map(([label, value]) => <div key={label} className={`metric-tile rounded-lg p-3 ${Number.parseFloat(value) > 0 ? 'metric-tile-active' : ''}`}><dt className="text-xs text-graphite">{label}</dt><dd className="mt-1 text-xl font-bold">{value}</dd></div>)}</dl>
        <div><h3 className="text-xs font-bold uppercase tracking-wide text-graphite">Answer contributions by month</h3>{contributionHistory.length ? <ol className="mt-2 flex flex-wrap gap-2">{contributionHistory.map((item) => <li key={item._id} className="month-pill rounded-full px-3 py-1 text-xs">{item._id}: {item.answers}</li>)}</ol> : <p className="mt-2 text-sm text-graphite">Your answer history will appear here.</p>}</div>
    </section>;
}
