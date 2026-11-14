import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import AnswerFeedback from '@/models/AnswerFeedback';
import { requireRole } from '@/lib/session';

export async function GET() {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    const helper = session.user.id;
    const helperId = new mongoose.Types.ObjectId(helper);
    const since = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
    const [summary, answerIds, history] = await Promise.all([
        Answer.aggregate([{ $match: { helper: helperId } }, { $group: { _id: null, total: { $sum: 1 }, verified: { $sum: { $cond: [{ $eq: ['$status', 'VERIFIED'] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $in: ['$status', ['PENDING', 'SUBMITTED', 'PENDING_REVIEW', 'ACCEPTED', 'REVISION_REQUESTED']] }, 1, 0] } } } }]),
        Answer.find({ helper }).select('_id').lean(),
        Answer.aggregate([
            { $match: { helper: helperId, createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, answers: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
    ]);
    const ids = answerIds.map((answer) => answer._id);
    const [helpfulVotes, unhelpfulVotes] = await Promise.all([
        AnswerFeedback.countDocuments({ answer: { $in: ids }, helpful: true }),
        AnswerFeedback.countDocuments({ answer: { $in: ids }, helpful: false }),
    ]);
    const totals = summary[0] || { total: 0, verified: 0, rejected: 0, pending: 0 };
    return Response.json({
        stats: { ...totals, helpfulVotes, unhelpfulVotes, verificationRate: totals.total ? Math.round((totals.verified / totals.total) * 100) : 0 },
        contributionHistory: history,
    });
}
