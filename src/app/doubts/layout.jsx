import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';

export default async function Layout({ children }) {
    const { error, status } = await requireRole();
    if (error) redirect(status === 401 ? '/login' : '/doubts/mine');
    return <div className="mx-auto max-w-4xl px-5 py-8">{children}</div>;
}
