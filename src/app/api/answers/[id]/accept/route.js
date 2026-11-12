import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import User from '@/models/User';
import { requireRole } from '@/lib/session';

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Not found' }, { status: 404 });

    await connectDB();
    const answer = await Answer.findById(id);
    if (!answer) return Response.json({ msg: 'Not found' }, { status: 404 });

    const doubt = await Doubt.findById(answer.doubt);
    if (doubt.author.toString() !== session.user.id)
        return Response.json({ msg: 'Only the person who asked can accept' }, { status: 403 });
    if (answer.status !== 'SUBMITTED')
        return Response.json({ msg: 'Already handled' }, { status: 409 });

    answer.status = 'ACCEPTED';
    await answer.save();
    await User.findByIdAndUpdate(answer.helper, { $inc: { 'helperProfile.reputation': 10 } });
    return Response.json({ msg: 'Accepted' });
}