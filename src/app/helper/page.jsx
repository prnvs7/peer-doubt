import HelperWorkspace from '@/components/helper/HelperWorkspace';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';

export const metadata = { title: 'Help classmates' };

export default async function HelperPage() {
    const { error, status } = await requireRole('helper');
    if (error) redirect(status === 401 ? '/login' : '/doubts/mine');

    return <HelperWorkspace />;
}
