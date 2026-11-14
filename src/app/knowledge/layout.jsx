import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/session';

export default async function KnowledgeLayout({ children }) {
    const { error, status } = await requireRole();
    if (error) redirect(status === 401 ? '/login' : '/doubts/mine');
    return children;
}
