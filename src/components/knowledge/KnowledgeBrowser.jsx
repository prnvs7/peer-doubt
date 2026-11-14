'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import KnowledgeSaveButton from '@/components/knowledge/KnowledgeSaveButton';

export default function KnowledgeBrowser({ initialFilters = { q: '', course: '', topic: '' }, initialSort = 'newest', initialPage = '' }) {
    const [filters, setFilters] = useState(initialFilters);
    const [page, setPage] = useState(() => Math.max(1, Number.parseInt(initialPage, 10) || 1));
    const [sort, setSort] = useState(['relevance', 'newest', 'helpful', 'views'].includes(initialSort) ? initialSort : 'newest');
    const [data, setData] = useState({ items: [], filters: { courses: [], topics: [] }, pagination: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true); setError('');
            const params = new URLSearchParams({ page: String(page), limit: '24', sort });
            if (filters.q.trim()) params.set('q', filters.q.trim());
            if (filters.course) params.set('course', filters.course);
            if (filters.topic) params.set('topic', filters.topic);
            try {
                const res = await fetch(`/api/knowledge?${params}`, { signal: controller.signal });
                const json = await res.json();
                if (!res.ok) throw new Error(json.msg || 'Could not load the knowledge library.');
                if (active) setData(json);
            } catch (err) { if (active && err.name !== 'AbortError') setError(err.message); }
            finally { if (active) setLoading(false); }
        }, 180);
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [filters, page, sort]);

    useEffect(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
        if (sort !== 'newest') params.set('sort', sort);
        if (page > 1) params.set('page', String(page));
        const query = params.toString();
        window.history.replaceState(window.history.state, '', query ? `/knowledge?${query}` : '/knowledge');
    }, [filters, page, sort]);

    function setFilter(key, value) {
        setPage(1);
        setFilters((current) => ({ ...current, [key]: value, ...(key === 'course' ? { topic: '' } : {}) }));
        if (key === 'q' && value.trim() && sort === 'newest') setSort('relevance');
        if (key === 'q' && !value.trim() && sort === 'relevance') setSort('newest');
    }

    return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-7 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Verified class knowledge</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Knowledge library</h1><p className="mt-3 text-base leading-7 text-graphite">Search explanations that have been reviewed by a CR or faculty member. Filter by course and topic to find a useful starting point.</p></header>
        <section aria-label="Search and filter verified answers" className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <label className="sm:col-span-2 lg:col-span-1"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-graphite">Search</span><span className="relative block"><span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite">⌕</span><input className="field pl-9" type="search" maxLength={100} value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Question, topic or keyword" /></span></label>
            <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-graphite">Course</span><select className="field" value={filters.course} onChange={(event) => setFilter('course', event.target.value)}><option value="">All courses</option>{(data.filters?.courses || []).map((course) => <option key={course} value={course}>{course}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-graphite">Topic</span><select className="field" value={filters.topic} onChange={(event) => setFilter('topic', event.target.value)}><option value="">All topics</option>{(data.filters?.topics || []).map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label>
            <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-graphite">Sort by</span><select className="field" value={sort} onChange={(event) => { setPage(1); setSort(event.target.value); }}><option value="relevance" disabled={!filters.q.trim()}>Relevance</option><option value="newest">Recently verified</option><option value="helpful">Most helpful</option><option value="views">Most viewed</option></select></label>
        </section>
        <div className="mb-3 flex min-h-6 items-center justify-between text-sm text-graphite"><span>{loading ? 'Searching…' : `${data.pagination?.total || 0} verified ${data.pagination?.total === 1 ? 'answer' : 'answers'}`}</span>{filters.q || filters.course || filters.topic ? <button type="button" className="font-semibold text-pencil hover:underline" onClick={() => { setPage(1); setFilters({ q: '', course: '', topic: '' }); setSort('newest'); }}>Clear filters</button> : null}</div>
        {error && <p className="rounded-xl border border-margin/30 bg-margin/10 p-4 text-sm text-margin" role="alert">{error}</p>}
        {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading knowledge library">{[1, 2, 3].map((item) => <div key={item} className="card h-56 animate-pulse" />)}</div> : null}
        {!loading && !error && !data.items.length && <div className="card px-5 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-marker text-xl" aria-hidden="true">⌕</span><h2 className="mt-4 font-bold">No matching answers</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-graphite">Try a broader search or clear one of the filters. Verified answers will appear here as moderators publish them.</p></div>}
        {!loading && data.items.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((entry) => <article key={entry._id} className="card flex h-full flex-col p-5 transition hover:border-pencil/40 hover:shadow-[var(--ui-shadow)]">
                <div className="flex items-center justify-between gap-2"><StatusBadge status="VERIFIED" /><KnowledgeSaveButton id={entry._id} saved={entry.bookmarked} /><span className="text-xs text-graphite">{new Date(entry.verifiedAt).toLocaleDateString()}</span></div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-pencil">{entry.course} · {entry.topic}</p>
                <h2 className="mt-2 text-lg font-bold leading-snug">{entry.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-graphite">{entry.answerContent}</p>
                <Link href={`/knowledge/${entry._id}`} className="mt-auto inline-flex pt-5 text-sm font-bold text-pencil hover:underline">Read full explanation <span className="ml-1" aria-hidden="true">→</span></Link>
            </article>)}
        </div>}
        {!loading && !error && (data.pagination?.pages || 0) > 1 && <div className="mt-6 flex items-center justify-between"><button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span className="text-sm text-graphite">Page {page} of {data.pagination.pages}</span><button type="button" className="btn-quiet" disabled={page >= data.pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}
    </div>;
}
