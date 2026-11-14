'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import KnowledgeSaveButton from '@/components/knowledge/KnowledgeSaveButton';
import ArchiveKnowledgeButton from '@/components/knowledge/ArchiveKnowledgeButton';

export default function KnowledgeDetail({ id }) {
    const [entry, setEntry] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        fetch(`/api/knowledge/${id}`).then(async (res) => {
            const json = await res.json();
            if (!res.ok) throw new Error(json.msg || 'Could not load this knowledge entry.');
            if (active) setEntry(json);
        }).catch((err) => active && setError(err.message)).finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [id]);

    return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/knowledge" className="text-sm font-semibold text-pencil hover:underline">Back to Knowledge Library</Link>
        {loading && <div className="card mt-5 h-96 animate-pulse" aria-label="Loading knowledge entry" />}
        {error && !loading && <div className="card mt-5 p-6"><h1 className="text-xl font-bold">Entry unavailable</h1><p role="alert" className="mt-2 text-sm text-margin">{error}</p></div>}
        {entry && <article className="mt-5 space-y-5">
            <header className="card p-5 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3"><StatusBadge status="VERIFIED" /><span className="text-sm text-graphite">Reviewed {new Date(entry.verifiedAt).toLocaleDateString()}</span></div>
                <p className="mt-5 text-sm font-bold text-pencil">{entry.course} / {entry.topic}</p>
                <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">{entry.title}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3"><KnowledgeSaveButton id={entry._id} saved={entry.bookmarked} /><span className="text-xs text-graphite">{entry.helpfulCount || 0} helpful votes / {entry.viewCount || 0} views</span>{entry.canArchive && <ArchiveKnowledgeButton id={entry._id} />}</div>
            </header>
            <section className="card p-5 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.12em] text-graphite">The question</p><p className="mt-3 whitespace-pre-wrap text-base leading-7">{entry.doubt?.description || entry.question}</p>{entry.doubt?._id && <Link href={`/doubts/${entry.doubt._id}`} className="mt-4 inline-block text-sm font-semibold text-pencil hover:underline">Open the original question</Link>}</section>
            <section className="card p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-graphite">Verified explanation</p><p className="text-xs text-graphite">Answered by {entry.answer?.helper?.name || 'a peer helper'}</p></div><p className="mt-4 whitespace-pre-wrap text-base leading-7">{entry.answer?.content || entry.answerContent}</p></section>
            <p className="px-1 text-sm text-graphite">Verified by {entry.verifiedBy?.name || 'a moderator'} on {new Date(entry.verifiedAt).toLocaleString()}</p>
            {entry.related?.length > 0 && <section className="card p-5"><h2 className="font-bold">Related questions</h2><ul className="mt-3 divide-y divide-rule">{entry.related.map((item) => <li key={item._id} className="py-3"><Link className="font-semibold text-pencil hover:underline" href={`/knowledge/${item._id}`}>{item.title}</Link><p className="mt-1 text-xs text-graphite">{item.course} / {item.topic} / {item.helpfulCount || 0} helpful votes</p></li>)}</ul></section>}
        </article>}
    </div>;
}
