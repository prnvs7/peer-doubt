import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

export async function GET(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
        return Response.json({ msg: 'Not found' }, { status: 404 });

    await connectDB();
    const doubt = await Doubt.findById(id).populate('author', 'name').lean();
    if (!doubt) return Response.json({ msg: 'Not found' }, { status: 404 });

    const isOwner = doubt.author._id.toString() === session.user.id;
    if (doubt.isAnonymous && !isOwner) doubt.author = { name: 'Anonymous' };
    return Response.json(doubt);
}