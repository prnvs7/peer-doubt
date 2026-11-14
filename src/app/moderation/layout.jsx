import ModerationNav from '@/components/moderation/ModerationNav';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';

export default async function ModerationLayout({ children }) {
    const { error, status } = await requireRole('cr', 'faculty');
    if (error) redirect(status === 401 ? '/login' : '/doubts/mine');

    return (
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-pencil">Academic quality</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Moderation desk</h1>
                </div>
                <p className="text-sm text-graphite">CR and faculty workspace</p>
            </div>
            <ModerationNav />
            <div className="pt-6">{children}</div>
        </div>
    );
}
