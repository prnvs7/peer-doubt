'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function ago(date) {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${Math.max(mins, 1)} min`;
    const hrs = Math.floor(mins / 60);
    return hrs < 24 ? `${hrs} h` : `${Math.floor(hrs / 24)} d`;
}

export default function HelperFeed() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState('');

    const load = () => fetch('/api/helper/feed').then((r) => r.json()).then(setData);
    useEffect(() => { load(); }, []);

    async function claim(id) {
        setBusy(id);
        setError('');
        const res = await fetch(`/api/doubts/${id}/claim`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        setBusy(null);
        if (res.ok) return router.push(`/doubts/${id}`);
        setError(body.msg || 'Could not take this doubt.');
        load();
    }

    if (!data) return <p className="text-graphite">Loading...</p>;

    return (
        <div>
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Open doubts</h1>
                    <p className="mt-1 text-graphite">Oldest first, with your chosen topics on top.</p>
                </div>
                <Link href="/helper/profile" className="btn-quiet">Helper profile</Link>
            </div>

            {error && <p role="alert" className="mb-3 text-sm text-margin">{error}</p>}

            {!data.ready ? (
                <div className="margin-sheet rounded-md border border-rule py-10 pl-16 pr-8">
                    <p className="font-medium">Set up your helper profile first</p>
                    <p className="mt-1 max-w-sm text-graphite">Pick your courses and turn on availability to see doubts you can answer.</p>
                    <Link href="/helper/profile" className="btn mt-4">Set up profile</Link>
                </div>
            ) : data.doubts.length === 0 ? (
                <p className="text-graphite">No open doubts in your courses right now.</p>
            ) : (
                <ul className="border-t border-rule">
                    {data.doubts.map((d) => (
                        <li key={d._id} className="flex items-start justify-between gap-4 border-b border-rule px-2 py-4">
                            <div className="min-w-0">
                                <h2 className="font-medium">{d.title}</h2>
                                <p className="mt-0.5 text-sm text-graphite">{d.topic} in {d.course}, waiting {ago(d.createdAt)}</p>
                                <p className="mt-2 max-w-prose font-serif text-[15px] leading-relaxed text-ink/80">{d.description}</p>
                            </div>
                            <button onClick={() => claim(d._id)} disabled={busy === d._id} className="btn shrink-0">
                                {busy === d._id ? 'Taking...' : 'Take this doubt'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}