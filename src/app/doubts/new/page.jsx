'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COURSES } from '@/lib/courses';

export default function NewDoubt() {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '', description: '', course: '', topic: '', isAnonymous: false,
    });
    const [similar, setSimilar] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Debounced similar-doubt search
    useEffect(() => {
        if (form.title.trim().length < 3) return;

        let cancelled = false;
        const t = setTimeout(async () => {
            const res = await fetch(`/api/doubts/similar?q=${encodeURIComponent(form.title)}`);
            if (res.ok && !cancelled) setSimilar(await res.json());
        }, 500);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [form.title]);

    async function onSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const res = await fetch('/api/doubts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        setLoading(false);
        if (!res.ok) return setError(data.msg);
        router.push(`/doubts/${data._id}`);
    }

    const set = (k) => (e) => {
        const value = e.target.value;
        setForm((current) => ({ ...current, [k]: value }));
        if (k === 'title') setSimilar([]);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <h1 className="text-2xl font-semibold">Ask a doubt</h1>
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3">
                <select className="border p-2 rounded flex-1" value={form.course} required
                    onChange={(e) => setForm({ ...form, course: e.target.value, topic: '' })}>
                    <option value="">Course</option>
                    {Object.keys(COURSES).map((c) => <option key={c}>{c}</option>)}
                </select>
                <select className="border p-2 rounded flex-1" value={form.topic} required
                    onChange={set('topic')} disabled={!form.course}>
                    <option value="">Topic</option>
                    {(COURSES[form.course] || []).map((t) => <option key={t}>{t}</option>)}
                </select>
            </div>

            <input className="w-full border p-2 rounded" placeholder="Doubt title (short)"
                value={form.title} onChange={set('title')} required />

            {similar.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm">
                    <p className="font-medium mb-1">Similar doubts already exist. Check these first:</p>
                    <ul className="list-disc ml-5">
                        {similar.map((d) => (
                            <li key={d._id}>
                                <Link href={`/doubts/${d._id}`} target="_blank" className="underline">{d.title}</Link>
                                <span className="text-gray-500"> ({d.status})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <textarea className="w-full border p-2 rounded h-40" placeholder="Explain your doubt in detail"
                value={form.description} onChange={set('description')} required />

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAnonymous}
                    onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
                Post anonymously
            </label>

            <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit doubt'}
            </button>
        </form>
    );
}
