import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function requireRole(...allowed) {
    const session = await getServerSession(authOptions);
    if (!session) return { error: 'Not logged in', status: 401 };
    if (allowed.length && !session.user.roles.some((r) => allowed.includes(r)))
        return { error: 'Forbidden', status: 403 };
    return { session };
}