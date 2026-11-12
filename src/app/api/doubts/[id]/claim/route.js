import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

export async function POST(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Not found' }, { status: 404 });

    await connectDB();
    const me = await User.findById(session.user.id).lean();
    if (!me.helperProfile?.isWilling)
        return Response.json({ msg: 'Turn on helper availability first' }, { status: 403 });

    const doubt = await Doubt.findOneAndUpdate(
        {
            _id: id,
            status: 'OPEN',
            author: { $ne: session.user.id },
            course: { $in: me.helperProfile.courses },
        },
        { status: 'CLAIMED', assignedHelper: session.user.id, claimedAt: new Date() },
        { new: true }
    );

    if (!doubt)
        return Response.json({ msg: 'Someone already took this doubt, or it is outside your courses.' }, { status: 409 });
    return Response.json({ id: doubt._id });
}