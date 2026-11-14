import connectDB from '@/lib/db';
import KnowledgeEntry from '@/models/KnowledgeEntry';
import KnowledgeBookmark from '@/models/KnowledgeBookmark';
import { COURSES } from '@/lib/courses';
import { parsePagination } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

export async function GET(req) {
    const { error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    try {
    await connectDB();

    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const course = url.searchParams.get('course')?.trim();
    const topic = url.searchParams.get('topic')?.trim();
    const query = url.searchParams.get('q')?.trim().slice(0, 100);
    const filter = { $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] };
    if (course) filter.course = course;
    if (topic) filter.topic = topic;
    if (query) filter.$text = { $search: query };
    const sortBy = url.searchParams.get('sort') || 'newest';
    if (!['relevance', 'newest', 'helpful', 'views'].includes(sortBy)) return Response.json({ msg: 'Unknown sort order' }, { status: 400 });
    const sort = sortBy === 'relevance' && query ? { score: { $meta: 'textScore' }, verifiedAt: -1 } : sortBy === 'helpful'
        ? { helpfulCount: -1, verifiedAt: -1 } : sortBy === 'views' ? { viewCount: -1, verifiedAt: -1 } : { verifiedAt: -1 };
    const pipeline = [
        { $match: filter },
        { $lookup: { from: 'answers', let: { answerId: '$answer' }, pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$answerId'] }, { $eq: ['$status', 'VERIFIED'] }, { $ne: ['$flaggedForReview', true] }] } } },
            { $project: { _id: 1 } },
        ], as: 'eligibleAnswer' } },
        { $lookup: { from: 'doubts', let: { doubtId: '$doubt' }, pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$_id', '$$doubtId'] }, { $ne: ['$flaggedForReview', true] }, { $not: [{ $in: ['$status', ['DUPLICATE', 'REJECTED']] }] }] } } },
            { $project: { _id: 1 } },
        ], as: 'eligibleDoubt' } },
        { $match: { 'eligibleAnswer.0': { $exists: true }, 'eligibleDoubt.0': { $exists: true } } },
        { $facet: {
            items: [
                { $sort: sort }, { $skip: skip }, { $limit: limit },
                { $lookup: { from: 'users', localField: 'verifiedBy', foreignField: '_id', pipeline: [{ $project: { name: 1 } }], as: 'verifiedByUser' } },
                { $set: { verifiedBy: { $arrayElemAt: ['$verifiedByUser', 0] } } },
                { $project: { eligibleAnswer: 0, eligibleDoubt: 0, verifiedByUser: 0, score: 0 } },
            ],
            total: [{ $count: 'value' }],
        } },
    ];
    const [result] = await KnowledgeEntry.aggregate(pipeline);
    const items = result.items || [];
    const entryIds = items.map((item) => item._id);
    const bookmarks = await KnowledgeBookmark.find({ user: session.user.id, entry: { $in: entryIds } }).select('entry').lean();
    const bookmarked = new Set(bookmarks.map((item) => item.entry.toString()));
    const total = result.total?.[0]?.value || 0;
    const available = { $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] };
    const [courses, topics] = await Promise.all([
        KnowledgeEntry.distinct('course', available),
        KnowledgeEntry.distinct('topic', course ? { ...available, course } : available),
    ]);
    return Response.json({ items: items.map((item) => ({ ...item, bookmarked: bookmarked.has(item._id.toString()) })), pagination: { page, limit, total, pages: Math.ceil(total / limit) }, filters: { courses: courses.length ? courses : Object.keys(COURSES), topics: topics.length ? topics : (course ? COURSES[course] || [] : [...new Set(Object.values(COURSES).flat())]) } });
    } catch (error) {
        console.error('KNOWLEDGE_SEARCH_FAILED', { name: error?.name || 'Error', code: error?.code || 'UNKNOWN' });
        return Response.json({ msg: 'Could not search verified knowledge. Please try again.' }, { status: 500 });
    }
}
