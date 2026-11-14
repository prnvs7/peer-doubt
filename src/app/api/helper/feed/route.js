import connectDB from '@/lib/db';
import User from '@/models/User';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

export async function GET() {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });

    await connectDB();
    const me = await User.findById(session.user.id).lean();
    const profile = me.helperProfile;
    if (!profile?.isWilling || !profile.courses?.length)
        return Response.json({ ready: false, doubts: [] });

    const doubts = await Doubt.find({
        status: 'OPEN',
        flaggedForReview: { $ne: true },
        course: { $in: profile.courses },
        author: { $ne: session.user.id },
    })
        .select('title description course topic createdAt')
        .sort({ createdAt: 1 })
        .lean();

    // doubts in the helper's chosen topics first, then oldest first
    doubts.sort((a, b) => {
        const am = profile.topics.includes(a.topic) ? 0 : 1;
        const bm = profile.topics.includes(b.topic) ? 0 : 1;
        return am - bm;
    });

    return Response.json({
        ready: true,
        doubts: doubts.map((d) => ({ ...d, description: d.description.slice(0, 160) })),
    });
}
