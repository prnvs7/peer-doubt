'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COURSES } from '@/lib/courses';

export default function EditDoubtForm({ doubt }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        title: doubt.title,
        description: doubt.description,
        course: doubt.course,
        topic: doubt.topic,
        isAnonymous: doubt.isAnonymous,
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`/api/doubts/${doubt.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not update this doubt.');
            setEditing(false);
            router.refresh();
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return <button type="button" className="btn-quiet" onClick={() => setEditing(true)}>Edit doubt</button>;
    }

    return (
        <form onSubmit={save} className="card space-y-4 p-4">
            {error && <p role="alert" className="text-sm text-margin">{error}</p>}
            <label className="block space-y-1.5 text-sm font-semibold">
                Title
                <input className="field" minLength={5} maxLength={150} required value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold">
                    Course
                    <select className="field" required value={form.course}
                        onChange={(event) => setForm((current) => ({ ...current, course: event.target.value, topic: '' }))}>
                        {Object.keys(COURSES).map((course) => <option key={course} value={course}>{course}</option>)}
                    </select>
                </label>
                <label className="space-y-1.5 text-sm font-semibold">
                    Topic
                    <select className="field" required value={form.topic}
                        onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}>
                        <option value="">Choose a topic</option>
                        {(COURSES[form.course] || []).map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                    </select>
                </label>
            </div>
            <label className="block space-y-1.5 text-sm font-semibold">
                Description
                <textarea className="field min-h-32 resize-y" minLength={10} maxLength={5000} required value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="flex items-center gap-2 text-sm text-graphite">
                <input type="checkbox" checked={form.isAnonymous}
                    onChange={(event) => setForm((current) => ({ ...current, isAnonymous: event.target.checked }))} />
                Post anonymously
            </label>
            <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
                <button type="button" className="btn-quiet" disabled={saving} onClick={() => { setError(''); setEditing(false); }}>Cancel</button>
            </div>
        </form>
    );
}
