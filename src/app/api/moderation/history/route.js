import connectDB from '@/lib/db';
import ModerationLog from '@/models/ModerationLog';
import User from '@/models/User';
import { parsePagination, validObjectId } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

const ACTIONS = ['VERIFIED', 'REJECTED', 'REVISION_REQUESTED', 'RECONSIDERED', 'RESOLVED', 'DISMISSED', 'FLAGGED', 'DUPLICATE_CONFIRMED', 'DUPLICATE_DISMISSED', 'KNOWLEDGE_ARCHIVED', 'USER_ACCESS_UPDATED'];

export async function GET(req) {
    const { session, error, status } = await requireRole('cr', 'faculty', 'admin');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();

    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const type = url.searchParams.get('type');
    const filter = {};
    const types = ['answer', 'doubt', 'report', 'knowledge', 'user'];
    if (type && !types.includes(type)) return Response.json({ msg: 'Unknown history type' }, { status: 400 });
    if (type === 'user' && !session.user.roles.includes('admin')) return Response.json({ msg: 'Forbidden' }, { status: 403 });
    if (type) filter.entityType = type;
    else if (!session.user.roles.includes('admin')) filter.entityType = { $ne: 'user' };

    const moderator = url.searchParams.get('moderator');
    if (moderator) {
        if (!validObjectId(moderator)) return Response.json({ msg: 'Invalid moderator filter' }, { status: 400 });
        filter.moderator = moderator;
    }
    const action = url.searchParams.get('action');
    if (action && !ACTIONS.includes(action)) return Response.json({ msg: 'Unknown history action' }, { status: 400 });
    if (action) filter.action = action;

    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const createdAt = {};
    if (from) {
        const date = new Date(from);
        if (Number.isNaN(date.getTime())) return Response.json({ msg: 'Invalid start date' }, { status: 400 });
        createdAt.$gte = date;
    }
    if (to) {
        const date = new Date(to);
        if (Number.isNaN(date.getTime())) return Response.json({ msg: 'Invalid end date' }, { status: 400 });
        date.setUTCHours(23, 59, 59, 999);
        createdAt.$lte = date;
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;

    const [items, total, moderatorIds] = await Promise.all([
        ModerationLog.find(filter).populate('moderator', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        ModerationLog.countDocuments(filter),
        ModerationLog.distinct('moderator'),
    ]);
    const moderators = await User.find({ _id: { $in: moderatorIds } }).select('name').sort({ name: 1 }).lean();
    return Response.json({ items, moderators, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
