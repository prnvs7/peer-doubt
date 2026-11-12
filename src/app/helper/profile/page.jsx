'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COURSES } from '@/lib/courses';

export default function HelperProfile() {
    const [profile, setProfile] = useState(null);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/users/helper-profile')
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(setProfile)
            .catch(() => setError('Could not load your profile. Try refreshing the page.'));
    }, []);

    if (!profile) return <p className="text-graphite">Loading...</p>;

    const toggle = (key, value) => {
        setSaved(false);
        const list = profile[key];
        setProfile({
            ...profile,
            [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
        });
    };

    async function save() {
        setError('');
        const res = await fetch('/api/users/helper-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                courses: profile.courses, topics: profile.topics, isWilling: profile.isWilling,
            }),
        });
        if (res.ok) setSaved(true);
        else setError('Could not save. Try again.');
    }

    return (
        <div>
            <h1 className="text-3xl font-semibold tracking-tight">Helper profile</h1>
            <p className="mt-1 mb-6 text-graphite">Choose what you can explain well. You will only see doubts from these courses.</p>

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
                    <button onClick={save} className="btn">Save profile</button>
                    <span role="status" className="text-sm text-verified">{saved && 'Profile saved.'}</span>
                    {error && <span role="alert" className="text-sm text-margin">{error}</span>}
                    {saved && <Link href="/helper" className="text-sm underline underline-offset-4">See open doubts</Link>}
                </div>
            </div>
        </div>
    );
}