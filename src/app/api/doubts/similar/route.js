import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

export async function GET(req) {
    const { error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const q = new URL(req.url).searchParams.get('q')?.trim();
    if (!q || q.length < 3) return Response.json([]);

    await connectDB();
    const results = await Doubt.find(
        { $text: { $search: q }, status: { $nin: ['REJECTED', 'DUPLICATE'] } },
        { score: { $meta: 'textScore' }, title: 1, course: 1, topic: 1, status: 1 }
    )
        .sort({ score: { $meta: 'textScore' } })
        .limit(5);

    return Response.json(results);
}