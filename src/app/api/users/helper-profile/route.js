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

async function getHelperProfileSession() {
    const result = await requireRole();
    if (result.error) return result;
    if (!result.session.user.roles?.some((role) => ['student', 'helper'].includes(role))) {
        return { error: 'Only students can manage a helper profile', status: 403 };
    }
    return result;
}

export async function GET() {
    const { session, error, status } = await getHelperProfileSession();
    if (error) return Response.json({ msg: error }, { status });

    await connectDB();
    const user = await User.findById(session.user.id).select('helperProfile').lean();
    return Response.json(user?.helperProfile ?? { courses: [], topics: [], isWilling: false });
}

export async function PATCH(req) {
    const { session, error, status } = await getHelperProfileSession();
    if (error) return Response.json({ msg: error }, { status });

    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: 'Invalid profile' }, { status: 400 });

    const { courses, topics, isWilling } = parsed.data;
    if (courses.some((course) => !COURSES[course])) {
        return Response.json({ msg: 'Choose a course from the available list' }, { status: 400 });
    }
    if (topics.some((topic) => !courses.some((course) => COURSES[course].includes(topic)))) {
        return Response.json({ msg: 'Choose topics from your selected courses' }, { status: 400 });
    }
    if (isWilling && courses.length === 0) {
        return Response.json({ msg: 'Choose at least one course before becoming available' }, { status: 400 });
    }

    await connectDB();
    const update = {
        $set: {
            'helperProfile.courses': courses,
            'helperProfile.topics': topics,
            'helperProfile.isWilling': isWilling,
        },
    };
    if (isWilling) update.$addToSet = { roles: 'helper' };

    const user = await User.findByIdAndUpdate(session.user.id, update, { new: true })
        .select('roles helperProfile')
        .lean();
    return Response.json({ msg: 'Saved', helperEnabled: user?.roles?.includes('helper') || false });
}
