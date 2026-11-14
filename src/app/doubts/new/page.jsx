'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COURSES } from '@/lib/courses';

export default function NewDoubt() {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '', description: '', course: '', topic: '', tags: '', isAnonymous: false,
    });
    const [similar, setSimilar] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Debounced similar-doubt search
    useEffect(() => {
        const q = `${form.title} ${form.description}`.trim().slice(0, 250);
        if (q.length < 3) return;

        let cancelled = false;
        const t = setTimeout(async () => {
            const params = new URLSearchParams({ q });
            if (form.course) params.set('course', form.course);
            if (form.topic) params.set('topic', form.topic);
            const res = await fetch(`/api/doubts/similar?${params}`);
            if (res.ok && !cancelled) setSimilar(await res.json());
        }, 500);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [form.title, form.description, form.course, form.topic]);

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fetch('/api/doubts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...form,
                tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
            }),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.msg);
        router.push(`/doubts/${data._id}`);
    }

    const set = (k) => (e) => {
        const value = e.target.value;
        setForm((current) => ({ ...current, [k]: value }));
        if (['title', 'description', 'course', 'topic'].includes(k)) setSimilar([]);
    };

    return (
        <form onSubmit={onSubmit} className="card mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Ask the class</p><h1 className="mt-1 text-2xl font-bold tracking-tight">What are you stuck on?</h1><p className="mt-2 text-sm leading-6 text-graphite">Add enough detail for a classmate to understand where you need help.</p></div>
            {error && <p role="alert" className="rounded-lg bg-margin/10 p-3 text-sm text-margin">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold">Course<select className="field mt-1.5" value={form.course} required
                    onChange={(e) => { setForm({ ...form, course: e.target.value, topic: '' }); setSimilar([]); }}>
                    <option value="">Course</option>
                    {Object.keys(COURSES).map((c) => <option key={c}>{c}</option>)}
                </select></label>
                <label className="space-y-1.5 text-sm font-semibold">Topic<select className="field mt-1.5" value={form.topic} required
                    onChange={set('topic')} disabled={!form.course}>
                    <option value="">Topic</option>
                    {(COURSES[form.course] || []).map((t) => <option key={t}>{t}</option>)}
                </select></label>
            </div>

            <label className="block space-y-1.5 text-sm font-semibold">Short title<input className="field" placeholder="e.g. Why does Dijkstra fail with negative edges?" maxLength={150}
                value={form.title} onChange={set('title')} required />
            </label>

            {similar.length > 0 && (
                <div className="rounded-xl border border-pencil/30 bg-marker/50 p-4 text-sm">
                    <p className="mb-2 font-medium">Similar doubts already exist. Check these first:</p>
                    <ul className="space-y-2">
                        {similar.map((d) => (
                            <li key={d._id}>
                                <Link href={`/doubts/${d._id}`} target="_blank" className="font-semibold text-pencil underline underline-offset-2">{d.title}</Link>
                                <span className="text-graphite"> · {d.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <label className="block space-y-1.5 text-sm font-semibold">Explain the question<textarea className="field min-h-40 resize-y" maxLength={5000} placeholder="What have you tried? Where does the explanation stop making sense?"
                value={form.description} onChange={set('description')} required />
            </label>

            <label className="block space-y-1.5 text-sm font-semibold">Tags
                <input className="field" placeholder="Deadlock, resource allocation" value={form.tags} onChange={set('tags')} />
                <span className="block text-xs font-normal text-graphite">Separate up to 8 tags with commas.</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-graphite">
                <input className="h-4 w-4 accent-pencil" type="checkbox" checked={form.isAnonymous}
                    onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
                Post anonymously
            </label>

            <button disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : 'Submit doubt'}
            </button>
        </form>
    );
}
