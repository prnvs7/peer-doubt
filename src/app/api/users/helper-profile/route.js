import { z } from 'zod';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { requireRole } from '@/lib/session';
import { COURSES } from '@/lib/courses';

const schema = z.object({
    courses: z.array(z.string()),
    topics: z.array(z.string()),
    isWilling: z.boolean(),
});

export async function GET() {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    await connectDB();
    const user = await User.findById(session.user.id).lean();
    return Response.json(user?.helperProfile ?? { courses: [], topics: [], isWilling: false });
}

export async function PATCH(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ msg: 'Invalid profile' }, { status: 400 });

    const courses = parsed.data.courses.filter((c) => COURSES[c]);
    const topics = parsed.data.topics.filter((t) => courses.some((c) => COURSES[c].includes(t)));

    await connectDB();
    await User.findByIdAndUpdate(session.user.id, {
        $set: {
            'helperProfile.courses': courses,
            'helperProfile.topics': topics,
            'helperProfile.isWilling': parsed.data.isWilling,
        },
    });
    return Response.json({ msg: 'Saved' });
}