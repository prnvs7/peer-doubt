import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';
import { COURSES } from '@/lib/courses';

export async function GET(req) {
    const { error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim().slice(0, 250);
    const course = url.searchParams.get('course')?.trim();
    const topic = url.searchParams.get('topic')?.trim();
    if (!q || q.length < 3) return Response.json([]);
    if (course && !Object.hasOwn(COURSES, course)) return Response.json({ msg: 'Unknown course' }, { status: 400 });
    if (topic && !(course ? COURSES[course] : Object.values(COURSES).flat()).includes(topic))
        return Response.json({ msg: 'Unknown topic' }, { status: 400 });

    await connectDB();
    const filter = { $text: { $search: q }, status: { $nin: ['REJECTED', 'DUPLICATE'] }, flaggedForReview: { $ne: true } };
    if (course) filter.course = course;
    if (topic) filter.topic = topic;
    const results = await Doubt.find(
        filter,
        { score: { $meta: 'textScore' }, title: 1, course: 1, topic: 1, status: 1 }
    )
        .sort({ score: { $meta: 'textScore' } })
        .limit(5);

    return Response.json(results);
}
