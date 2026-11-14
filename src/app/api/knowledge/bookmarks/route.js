import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import KnowledgeBookmark from '@/models/KnowledgeBookmark';
import { parsePagination } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

export async function GET(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    const { page, limit, skip } = parsePagination(new URL(req.url).searchParams);
    const user = new mongoose.Types.ObjectId(session.user.id);
    const [result] = await KnowledgeBookmark.aggregate([
        { $match: { user } },
        { $lookup: { from: 'knowledgeentries', localField: 'entry', foreignField: '_id', pipeline: [
            { $match: { $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] } },
            { $lookup: { from: 'answers', let: { answerId: '$answer' }, pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$_id', '$$answerId'] }, { $eq: ['$status', 'VERIFIED'] }, { $ne: ['$flaggedForReview', true] }] } } },
                { $project: { _id: 1 } },
            ], as: 'eligibleAnswer' } },
            { $lookup: { from: 'doubts', let: { doubtId: '$doubt' }, pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$_id', '$$doubtId'] }, { $ne: ['$flaggedForReview', true] }, { $not: [{ $in: ['$status', ['DUPLICATE', 'REJECTED']] }] }] } } },
                { $project: { _id: 1 } },
            ], as: 'eligibleDoubt' } },
            { $match: { 'eligibleAnswer.0': { $exists: true }, 'eligibleDoubt.0': { $exists: true } } },
            { $project: { eligibleAnswer: 0, eligibleDoubt: 0 } },
        ], as: 'knowledge' } },
        { $unwind: '$knowledge' },
        { $sort: { createdAt: -1 } },
        { $facet: {
            items: [
                { $skip: skip }, { $limit: limit }, { $replaceRoot: { newRoot: '$knowledge' } },
                { $lookup: { from: 'users', localField: 'verifiedBy', foreignField: '_id', pipeline: [{ $project: { name: 1 } }], as: 'verifiedByUser' } },
                { $set: { verifiedBy: { $arrayElemAt: ['$verifiedByUser', 0] }, bookmarked: true } },
                { $project: { verifiedByUser: 0 } },
            ],
            total: [{ $count: 'value' }],
        } },
    ]);
    const total = result?.total?.[0]?.value || 0;
    return Response.json({ items: result?.items || [], pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
