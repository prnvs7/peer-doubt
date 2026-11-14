import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import StatusTimeline from '@/components/StatusTimeLine';

import StatusBadge from '@/components/StatusBadge';

const PROBLEMS = [
    {
        problem: 'A doubt posted at midnight is buried by morning.',
        fix: 'Every doubt has a status you can follow: open, being answered, answered, verified.',
    },
    {
        problem: 'The classmate who could explain it never sees the message.',
        fix: 'Helpers choose the courses and topics they are confident in, and only see matching doubts.',
    },
    {
        problem: 'The same question gets asked again every semester.',
        fix: 'Similar doubts appear while you type, and verified answers are saved in a searchable library.',
    },
];

const STEPS = [
    {
        title: 'Ask',
        text: 'Pick the course and topic, describe where you are stuck, and post. You can stay anonymous.',
        dot: 'bg-marker',
    },
    {
        title: 'A helper takes it',
        text: 'Classmates who signed up for that topic see your doubt, and one of them takes it.',
        dot: 'bg-[#9db4ea]',
    },
    {
        title: 'Get an answer',
        text: 'The helper explains it step by step. You read it and accept it if it cleared things up.',
        dot: 'bg-white',
    },
    {
        title: 'Verified',
        text: 'Your CR or faculty checks the answer. Verified answers move into the library.',
        dot: 'bg-[#6fcb9f]',
    },
];

const ROLES = [
    {
        title: 'Students',
        text: 'Ask without digging through a group chat. Follow each doubt from open to verified, and see similar questions before you post.',
        border: 'border-marker',
    },
    {
        title: 'Helpers',
        text: 'Choose the courses and topics you can explain well. Take a doubt, write the answer, and earn reputation when the asker accepts it.',
        border: 'border-pencil',
    },
    {
        title: 'CRs and faculty',
        text: 'Review answers before they become reference material. Verify the good ones, send weak ones back, and link repeated questions as duplicates.',
        border: 'border-verified',
    },
];

const LIBRARY = [
    { title: 'Why does Dijkstra fail with negative edges?', meta: 'Graph Algorithms in DAA' },
    { title: 'When does a deadlock occur?', meta: 'Deadlocks in OS' },
    { title: 'Why does 3NF still allow some redundancy?', meta: 'Normalization in DBMS' },
];

async function LandingContent() {
    const session = await getServerSession(authOptions);
    if (session) redirect('/doubts/mine');

    return (
        <>
            {/* Hero */}
            <section className="landing-hero">
                <div className="mx-auto grid max-w-5xl items-center gap-14 px-5 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
                    <div>
                        <h1 className="text-[clamp(2.4rem,6vw,4.25rem)] font-bold leading-[1.03] tracking-tight">
                            Stuck at <span className="headline-mark">2 a.m.?</span> Someone in your class <span className="headline-accent">already got it.</span>
                        </h1>
                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-graphite">
                            Peer Doubt gives your class one place to ask doubts, find classmates who can explain them,
                            and keep every verified answer for the next person who gets stuck.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/register" className="btn-primary px-6 py-3 text-base">Ask your first doubt</Link>
                            <Link href="#library" className="btn-quiet px-6 py-3 text-base">Browse solved doubts <span aria-hidden="true" className="ml-1">→</span></Link>
                        </div>
                        <p className="mt-4 text-sm text-graphite">
                            Answers are checked by your CR or faculty before they join the library.
                        </p>
                    </div>

                    <div className="relative">
                        <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-md bg-marker/80" />
                        <div className="hero-badge absolute -right-5 -top-5 z-10 hidden rounded-full bg-white px-3 py-2 text-xs font-medium text-ink shadow-md md:block">
                            ⚡ Avg. response: 6 mins
                        </div>
                        <div className="hero-badge absolute -bottom-5 -left-5 z-10 hidden rounded-full bg-verified px-3 py-2 text-xs font-medium text-white shadow-md md:block">
                            ✓ Verified by Prof. Sharma
                        </div>
                        <div className="hero-card margin-sheet relative rounded-md border border-rule py-7 pl-14 pr-6">
                            <StatusTimeline status="VERIFIED" />
                            <h2 className="mt-7 text-xl font-semibold leading-snug">When does Dijkstra&rsquo;s algorithm fail?</h2>
                            <p className="mt-1 text-sm text-graphite">Graph Algorithms in DAA, asked at 2:14 a.m.</p>
                            <div className="mt-5 border-l-4 border-ink/80 bg-paper py-3 pl-4 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pencil text-xs font-semibold text-white" aria-hidden="true">R</span>
                                    <div>
                                        <p className="text-sm font-medium">Answered by Rohan</p>
                                        <p className="text-xs text-graphite">4 mins ago</p>
                                    </div>
                                </div>
                                <p className="mt-1 font-serif text-[15px] leading-relaxed">
                                    It breaks when an edge has a negative weight. A node Dijkstra has already finalised can still
                                    get a shorter path later. Use Bellman-Ford for graphs with negative edges.
                                </p>
                            </div>
                            <p className="mt-4 text-xs text-graphite">Example doubt</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem and fix */}
            <section className="border-y border-rule bg-sheet">
                <div className="mx-auto max-w-5xl px-5 py-16">
                    <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
                        Class groups bury questions. Peer Doubt keeps them.
                    </h2>
                    <dl className="mt-10 border-t border-rule">
                        {PROBLEMS.map((p) => (
                            <div key={p.problem} className="grid gap-3 border-b border-rule py-6 md:grid-cols-2 md:gap-12">
                                <dt className="text-graphite">{p.problem}</dt>
                                <dd className="border-l-4 border-verified pl-4 font-medium">{p.fix}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* How it works */}
            <section className="bg-ink text-paper">
                <div className="mx-auto max-w-5xl px-5 py-16">
                    <h2 className="max-w-xl text-3xl font-semibold tracking-tight">
                        From doubt to verified answer in four steps
                    </h2>
                    <ol className="mt-10 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
                        {STEPS.map((s, i) => (
                            <li key={s.title}>
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full font-semibold text-ink ${s.dot}`}>
                                    {i + 1}
                                </span>
                                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-paper/75">{s.text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Roles */}
            <section className="bg-pencil/10">
                <div className="mx-auto max-w-5xl px-5 py-16">
                    <h2 className="max-w-xl text-3xl font-semibold tracking-tight">
                        Made for everyone in the class
                    </h2>
                    <div className="mt-10 grid gap-10 md:grid-cols-3">
                        {ROLES.map((r) => (
                            <div key={r.title} className={`border-t-4 pt-5 ${r.border}`}>
                                <h3 className="text-xl font-semibold">{r.title}</h3>
                                <p className="mt-2 leading-relaxed text-ink/80">{r.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Library */}
            <section id="library" className="bg-sheet">
                <div className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-2">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">Every verified answer stays</h2>
                        <p className="mt-4 max-w-md leading-relaxed text-graphite">
                            Once a CR or faculty member verifies an answer, it is saved to the class library. Search it by
                            course and topic before you ask, so the next student does not have to wait for the same answer.
                        </p>
                    </div>
                    <div className="margin-sheet rounded-md border border-rule py-3 pl-14 pr-5">
                        <ul>
                            {LIBRARY.map((l) => (
                                <li key={l.title} className="flex items-start justify-between gap-3 border-b border-rule py-3 last:border-b-0">
                                    <div>
                                        <p className="font-medium">{l.title}</p>
                                        <p className="text-sm text-graphite">{l.meta}</p>
                                    </div>
                                    <StatusBadge status="VERIFIED" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Final call to action */}
            <section className="bg-marker">
                <div className="mx-auto max-w-5xl px-5 py-16 text-center">
                    <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Bring your next doubt here</h2>
                    <p className="mx-auto mt-3 max-w-md text-ink/80">
                        Create an account with your college email and post your first doubt in a minute.
                    </p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <Link href="/register" className="btn-primary px-6 py-3 text-base">Create account</Link>
                        <Link href="/login" className="btn-quiet px-6 py-3 text-base">Log in</Link>
                    </div>
                </div>
            </section>

            <footer className="border-t border-rule bg-sheet">
                <div className="mx-auto max-w-5xl px-5 py-6 text-sm text-graphite">
                    Peer Doubt. Class doubts, answered by classmates and checked by your CR.
                </div>
            </footer>
        </>
    );
}

export default function Landing() {
    return <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-sheet" aria-label="Loading Peer Doubt" />}><LandingContent /></Suspense>;
}
