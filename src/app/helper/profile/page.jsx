'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { COURSES } from '@/lib/courses';

export default function HelperProfile() {
    const { update } = useSession();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [helperEnabled, setHelperEnabled] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        async function loadProfile() {
            try {
                const response = await fetch('/api/users/helper-profile');
                const data = await response.json();
                if (!response.ok) throw new Error(data.msg || 'Could not load your profile.');
                if (active) setProfile(data);
            } catch (loadError) {
                if (active) setError(loadError.message || 'Could not load your profile. Try refreshing the page.');
            } finally {
                if (active) setLoading(false);
            }
        }
        loadProfile();
        return () => { active = false; };
    }, []);

    if (loading) return <div className="card h-40 animate-pulse" aria-label="Loading helper profile" />;
    if (!profile) return <div className="card space-y-3 p-5"><p className="text-sm text-margin" role="alert">{error || 'Could not load your profile.'}</p><button type="button" className="btn-quiet" onClick={() => window.location.reload()}>Try again</button></div>;

    const toggle = (key, value) => {
        setSaved(false);
        const list = profile[key];
        const nextList = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
        const nextTopics = key === 'courses'
            ? profile.topics.filter((topic) => nextList.some((course) => COURSES[course].includes(topic)))
            : nextList;
        setProfile({
            ...profile,
            [key]: nextList,
            ...(key === 'courses' ? { topics: nextTopics } : {}),
        });
    };

    async function save() {
        setError('');
        setSaving(true);
        try {
            const response = await fetch('/api/users/helper-profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courses: profile.courses, topics: profile.topics, isWilling: profile.isWilling,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'Could not save. Try again.');
            setHelperEnabled(data.helperEnabled);
            setSaved(true);
            await update();
        } catch (saveError) {
            setError(saveError.message || 'Could not save. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Peer contribution</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Helper profile</h1>
            <p className="mt-2 mb-6 max-w-2xl text-sm leading-6 text-graphite">Choose the courses you can explain and turn on availability when you are ready. Enabling helper access adds the Helper workspace to your navigation; moderation permissions remain restricted to CRs and faculty.</p>

            <div className="margin-sheet space-y-6 rounded-md border border-rule py-8 pl-14 pr-5 sm:pl-16 sm:pr-8">
                <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={profile.isWilling}
                        onChange={(e) => { setSaved(false); setProfile({ ...profile, isWilling: e.target.checked }); }} />
                    <span>
                        I&rsquo;m available to answer doubts
                        <span className="block text-sm text-graphite">Turn this off any time to stop seeing new doubts.</span>
                    </span>
                </label>

                {Object.entries(COURSES).map(([course, topics]) => {
                    const on = profile.courses.includes(course);
                    return (
                        <fieldset key={course} className="border-t border-rule pt-4">
                            <legend className="sr-only">{course}</legend>
                            <label className="flex items-center gap-2 font-medium">
                                <input type="checkbox" checked={on} onChange={() => toggle('courses', course)} />
                                {course}
                            </label>
                            {on && (
                                <div className="mt-2 ml-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                                    {topics.map((t) => (
                                        <label key={t} className="flex items-center gap-1.5">
                                            <input type="checkbox" checked={profile.topics.includes(t)} onChange={() => toggle('topics', t)} />
                                            {t}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    );
                })}

                <div className="flex items-center gap-4">
                    <button type="button" onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save helper profile'}</button>
                    <span role="status" className="text-sm text-verified">{saved && (helperEnabled ? 'Profile saved. Helper access is ready.' : 'Profile saved.')}</span>
                    {error && <span role="alert" className="text-sm text-margin">{error}</span>}
                    {saved && helperEnabled && <Link href="/helper" className="text-sm font-semibold text-pencil underline underline-offset-4">Open helper workspace</Link>}
                </div>
            </div>
        </div>
    );
}
