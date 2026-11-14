import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';

export default async function AdminLayout({ children }) {
    const { error, status } = await requireRole('admin');
    if (error) redirect(status === 401 ? '/login' : '/doubts/mine');
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>;
}
