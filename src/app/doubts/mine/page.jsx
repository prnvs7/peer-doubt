import Link from 'next/link';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import DoubtCard from '@/components/DoubtCard';

async function MyDoubtsContent() {
    const session = await getServerSession(authOptions);
    await connectDB();
    const doubts = JSON.parse(
        JSON.stringify(await Doubt.find({ author: session.user.id }).sort({ createdAt: -1 }).lean())
    );

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="eyebrow-gradient text-xs font-bold uppercase tracking-[0.16em]">Your class workspace</p><h1 className="display-heading-gradient mt-1 text-2xl font-bold tracking-tight">My doubts</h1></div>
                {doubts.length > 0 && <Link href="/doubts/new" className="btn-primary text-sm">
                    <span aria-hidden="true">+</span> New doubt
                </Link>}
            </div>
            {doubts.length === 0 && <section className="card empty-doubt-card relative isolate overflow-hidden border-slate-900/5 px-5 py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_32px_-8px_rgba(15,23,42,0.06)] sm:px-8">
                <div className="empty-doubt-glow" aria-hidden="true" />
                <div className="relative">
                    <span className="empty-doubt-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M5.25 7.75A3.5 3.5 0 0 1 8.75 4.25h10.5a3.5 3.5 0 0 1 3.5 3.5v7a3.5 3.5 0 0 1-3.5 3.5h-6.1l-4.9 4v-4H8.75a3.5 3.5 0 0 1-3.5-3.5z" fill="currentColor" opacity=".18" />
                            <path d="M14 9.1a2.35 2.35 0 1 1 2.18 3.2c-.94.2-1.68.88-1.68 1.85v.3M14.5 17.65h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </span>
                    <h2 className="mt-5 font-bold tracking-tight">Start with a question</h2>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-graphite">Your doubts and their progress will be collected here.</p>
                    <Link href="/doubts/new" className="btn-primary mt-6">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        Ask your first doubt
                    </Link>
                </div>
            </section>}
            {doubts.length > 0 && <ul className="space-y-3">{doubts.map((d) => <DoubtCard key={d._id} doubt={d} />)}</ul>}
        </div>
    );
}

export default function MyDoubtsPage() {
    return <Suspense fallback={<div className="card h-48 animate-pulse" aria-label="Loading your doubts" />}><MyDoubtsContent /></Suspense>;
}
