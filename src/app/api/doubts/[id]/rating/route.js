import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { requireRole } from '@/lib/session';

const schema = z.object({ rating: z.number().int().min(1).max(5) });

export async function PUT(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Doubt not found' }, { status: 404 });

    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: 'Choose a rating from 1 to 5 stars' }, { status: 400 });

    await connectDB();
    const doubt = await Doubt.findById(id).select('author status flaggedForReview').lean();
    if (!doubt) return Response.json({ msg: 'Doubt not found' }, { status: 404 });
    if (doubt.author.toString() === session.user.id)
        return Response.json({ msg: 'You cannot rate your own doubt' }, { status: 403 });
    if (!['ANSWERED', 'VERIFIED'].includes(doubt.status))
        return Response.json({ msg: 'You can rate this question after a helper submits an answer' }, { status: 409 });
    if (doubt.flaggedForReview)
        return Response.json({ msg: 'Ratings are paused while moderators review this question' }, { status: 409 });

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const updatedAt = new Date();
    const updated = await Doubt.findByIdAndUpdate(
        id,
        [
            {
                $set: {
                    ratings: {
                        $concatArrays: [
                            {
                                $filter: {
                                    input: { $ifNull: ['$ratings', []] },
                                    as: 'entry',
                                    cond: { $ne: ['$$entry.user', userId] },
                                },
                            },
                            [{ user: userId, value: parsed.data.rating, updatedAt }],
                        ],
                    },
                },
            },
            {
                $set: {
                    ratingCount: { $size: '$ratings' },
                    ratingAverage: {
                        $round: [
                            { $avg: { $map: { input: '$ratings', as: 'entry', in: '$$entry.value' } } },
                            2,
                        ],
                    },
                },
            },
        ],
        { new: true, projection: { ratings: 1, ratingAverage: 1, ratingCount: 1 } }
    ).lean();

    if (!updated) return Response.json({ msg: 'Doubt not found' }, { status: 404 });
    const ownRating = updated?.ratings?.find((entry) => entry.user.toString() === session.user.id)?.value;
    return Response.json({ rating: ownRating, average: updated.ratingAverage, count: updated.ratingCount });
}
