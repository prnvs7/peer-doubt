import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';
import { COURSES } from '@/lib/courses';

const schema = z.object({
    title: z.string().min(5).max(150),
    description: z.string().min(10).max(5000),
    course: z.string(),
    topic: z.string(),
    isAnonymous: z.boolean().optional(),
});

export async function POST(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success)
        return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    const { course, topic } = parsed.data;
    if (!COURSES[course]?.includes(topic))
        return Response.json({ msg: 'Invalid course/topic' }, { status: 400 });

    await connectDB();
    const doubt = await Doubt.create({ ...parsed.data, author: session.user.id });
    return Response.json(doubt, { status: 201 });
}

export async function GET(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    await connectDB();
    const doubts = await Doubt.find({ author: session.user.id }).sort({ createdAt: -1 });
    return Response.json(doubts);
}