import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { validObjectId } from '@/lib/moderation';

export async function requireRole(...allowed) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !validObjectId(session.user.id))
        return { error: 'Not logged in', status: 401 };

    await connectDB();
    const user = await User.findById(session.user.id).select('roles isSuspended').lean();
    if (!user) return { error: 'Not logged in', status: 401 };
    if (user.isSuspended) return { error: 'This account is suspended', status: 403 };

    // Read current roles from the shared database so a stale JWT cannot keep
    // moderation access after a moderator role has been removed.
    session.user.roles = user.roles || [];
    if (allowed.length && !session.user.roles.some((r) => allowed.includes(r)))
        return { error: 'Forbidden', status: 403 };
    return { session };
}
