import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import Report from '@/models/Report';
import ModerationLog from '@/models/ModerationLog';
import KnowledgeEntry from '@/models/KnowledgeEntry';
import { getDuplicateSuggestions } from '@/lib/duplicate-suggestions';
import { requireRole } from '@/lib/session';

export async function GET() {
    const { error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeKnowledge = [
        { $match: { $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] } },
        { $lookup: { from: 'answers', let: { answerId: '$answer' }, pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$answerId'] }, { $eq: ['$status', 'VERIFIED'] }, { $ne: ['$flaggedForReview', true] }] } } },
            { $project: { _id: 1 } },
        ], as: 'validAnswer' } },
        { $lookup: { from: 'doubts', let: { doubtId: '$doubt' }, pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$doubtId'] }, { $ne: ['$flaggedForReview', true] }, { $not: [{ $in: ['$status', ['DUPLICATE', 'REJECTED']] }] }] } } },
            { $project: { _id: 1 } },
        ], as: 'validDoubt' } },
        { $match: { 'validAnswer.0': { $exists: true }, 'validDoubt.0': { $exists: true } } },
    ];
    const [pendingAnswers, verifiedAnswers, rejectedAnswers, openReports, verifiedThisWeek, duplicateDoubts, potentialDuplicatePairs, recentActivity, resolvedReports, verification, activity, knowledgeByCourse, knowledgeByTopic] = await Promise.all([
        Answer.countDocuments({ status: { $in: ['PENDING', 'SUBMITTED', 'PENDING_REVIEW', 'ACCEPTED'] } }),
        Answer.countDocuments({ status: 'VERIFIED' }),
        Answer.countDocuments({ status: 'REJECTED' }),
        Report.countDocuments({ status: 'OPEN' }),
        Answer.countDocuments({ status: 'VERIFIED', moderationHistory: { $elemMatch: { action: 'VERIFIED', createdAt: { $gte: since } } } }),
        Doubt.countDocuments({ status: 'DUPLICATE' }),
        getDuplicateSuggestions().then((items) => items.length),
        ModerationLog.find({ entityType: { $ne: 'user' } }).populate('moderator', 'name').sort({ createdAt: -1 }).limit(6).lean(),
        Report.countDocuments({ status: 'RESOLVED' }),
        Answer.aggregate([
            { $match: { status: 'VERIFIED' } }, { $unwind: '$moderationHistory' },
            { $match: { 'moderationHistory.action': 'VERIFIED' } },
            { $group: { _id: '$_id', duration: { $first: { $subtract: ['$moderationHistory.createdAt', '$createdAt'] } } } },
            { $group: { _id: null, averageMs: { $avg: '$duration' } } },
        ]),
        ModerationLog.aggregate([
            { $match: { createdAt: { $gte: monthAgo }, entityType: { $ne: 'user' } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        KnowledgeEntry.aggregate([...activeKnowledge, { $group: { _id: '$course', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        KnowledgeEntry.aggregate([...activeKnowledge, { $group: { _id: '$topic', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);

    return Response.json({ stats: {
        pendingAnswers, verifiedAnswers, rejectedAnswers, openReports, verifiedThisWeek, duplicateDoubts, potentialDuplicatePairs,
        resolvedReports, averageVerificationHours: verification[0]?.averageMs ? Math.round(verification[0].averageMs / 360000) / 10 : null,
        knowledgeEntries: knowledgeByCourse.reduce((sum, item) => sum + item.count, 0),
    }, activity, knowledgeByCourse, knowledgeByTopic, recentActivity });
}
