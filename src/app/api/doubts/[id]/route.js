import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';
import { COURSES } from '@/lib/courses';

const updateSchema = z.object({
    title: z.string().trim().min(5).max(150),
    description: z.string().trim().min(10).max(5000),
    course: z.string(),
    topic: z.string(),
    isAnonymous: z.boolean(),
});

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

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
        return Response.json({ msg: 'Not found' }, { status: 404 });

    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
        return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });
    if (!COURSES[parsed.data.course]?.includes(parsed.data.topic))
        return Response.json({ msg: 'Invalid course/topic' }, { status: 400 });

    await connectDB();
    const current = await Doubt.findById(id).select('author status').lean();
    if (!current) return Response.json({ msg: 'Not found' }, { status: 404 });
    if (current.author.toString() !== session.user.id)
        return Response.json({ msg: 'Only the person who asked can edit this doubt' }, { status: 403 });
    if (current.status !== 'OPEN')
        return Response.json({ msg: 'A doubt can only be edited while it is open' }, { status: 409 });

    const updated = await Doubt.findOneAndUpdate(
        { _id: id, author: session.user.id, status: 'OPEN' },
        { $set: parsed.data },
        { new: true, runValidators: true }
    ).lean();
    if (!updated)
        return Response.json({ msg: 'This doubt changed while you were editing it. Refresh and try again.' }, { status: 409 });
    return Response.json(updated);
}
