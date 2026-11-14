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
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Your class workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight">My doubts</h1></div>
                <Link href="/doubts/new" className="btn-primary text-sm">
                    + New doubt
                </Link>
            </div>
            {doubts.length === 0 && <div className="card px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-marker text-xl" aria-hidden="true">?</span><h2 className="mt-4 font-bold">Start with a question</h2><p className="mt-1 text-sm text-graphite">Your doubts and their progress will be collected here.</p><Link href="/doubts/new" className="btn-primary mt-5">Ask your first doubt</Link></div>}
            {doubts.length > 0 && <ul className="space-y-3">{doubts.map((d) => <DoubtCard key={d._id} doubt={d} />)}</ul>}
        </div>
    );
}

export default function MyDoubtsPage() {
    return <Suspense fallback={<div className="card h-48 animate-pulse" aria-label="Loading your doubts" />}><MyDoubtsContent /></Suspense>;
}
