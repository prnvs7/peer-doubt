import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

export async function POST(_req, { params }) {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Not found' }, { status: 404 });

    await connectDB();
    const me = await User.findById(session.user.id).select('helperProfile').lean();
    const courses = me?.helperProfile?.courses || [];
    if (!me?.helperProfile?.isWilling || courses.length === 0)
        return Response.json({ msg: 'Turn on helper availability first' }, { status: 403 });

    const doubt = await Doubt.findOneAndUpdate(
        {
            _id: id,
            status: 'OPEN',
            flaggedForReview: { $ne: true },
            author: { $ne: session.user.id },
            course: { $in: courses },
        },
        { $set: { status: 'CLAIMED', assignedHelper: session.user.id } },
        { new: true }
    );

    if (!doubt)
        return Response.json({ msg: 'Someone already took this doubt, or it is outside your courses.' }, { status: 409 });
    return Response.json({ ok: true, doubt });
}
