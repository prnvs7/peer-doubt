import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import ModerationLog from '@/models/ModerationLog';
import Report from '@/models/Report';
import User from '@/models/User';
import { parsePagination, validObjectId } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

const MANAGED_ROLES = ['student', 'helper', 'cr', 'faculty'];
const updateSchema = z.object({
    roles: z.array(z.enum(MANAGED_ROLES)).min(1).optional(),
    isSuspended: z.boolean().optional(),
    note: z.string().trim().min(3).max(1000),
}).refine((value) => value.roles !== undefined || value.isSuspended !== undefined, { message: 'Choose an account change' });

export async function GET(req) {
    const { session, error, status } = await requireRole('admin');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const q = url.searchParams.get('q')?.trim().slice(0, 80);
    const role = url.searchParams.get('role');
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (role && MANAGED_ROLES.includes(role)) filter.roles = role;
    const [users, total] = await Promise.all([
        User.find(filter).select('name email roles isSuspended helperProfile createdAt').sort({ name: 1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
    ]);
    const ids = users.map((user) => user._id);
    const [answers, doubts, reports, logs] = await Promise.all([
        Answer.aggregate([{ $match: { helper: { $in: ids } } }, { $group: { _id: '$helper', count: { $sum: 1 } } }]),
        Doubt.aggregate([{ $match: { author: { $in: ids } } }, { $group: { _id: '$author', count: { $sum: 1 } } }]),
        Report.aggregate([{ $match: { reporter: { $in: ids } } }, { $group: { _id: '$reporter', count: { $sum: 1 } } }]),
        ModerationLog.find({ moderator: { $in: ids } }).select('moderator action createdAt').sort({ createdAt: -1 }).lean(),
    ]);
    const counts = (items) => new Map(items.map((item) => [item._id.toString(), item.count]));
    const answerCounts = counts(answers), doubtCounts = counts(doubts), reportCounts = counts(reports);
    const activity = new Map();
    for (const item of logs) {
        const key = item.moderator.toString();
        const current = activity.get(key) || { moderationActions: 0, lastModerationAt: item.createdAt };
        current.moderationActions += 1;
        activity.set(key, current);
    }
    return Response.json({
        items: users.map((user) => ({ ...user, activity: {
            answers: answerCounts.get(user._id.toString()) || 0,
            doubts: doubtCounts.get(user._id.toString()) || 0,
            reports: reportCounts.get(user._id.toString()) || 0,
            ...(activity.get(user._id.toString()) || { moderationActions: 0, lastModerationAt: null }),
        } })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        viewerId: session.user.id,
    });
}

export async function PATCH(req) {
    const { session, error, status } = await requireRole('admin');
    if (error) return Response.json({ msg: error }, { status });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });
    const userId = body.userId;
    if (!validObjectId(userId)) return Response.json({ msg: 'User not found' }, { status: 404 });
    if (userId === session.user.id) return Response.json({ msg: 'You cannot change your own access' }, { status: 403 });
    await connectDB();
    const transaction = await mongoose.startSession();
    try {
        let changed;
        await transaction.withTransaction(async () => {
            const target = await User.findById(userId).select('roles isSuspended').session(transaction).lean();
            if (!target) throw Object.assign(new Error('User not found'), { status: 404 });
            if (target.roles?.includes('admin')) throw Object.assign(new Error('Administrator accounts are provisioned separately and cannot be edited here'), { status: 403 });
            const update = {};
            if (parsed.data.roles) update.roles = [...new Set(parsed.data.roles)];
            if (parsed.data.isSuspended !== undefined) update.isSuspended = parsed.data.isSuspended;
            changed = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, session: transaction }).select('name roles isSuspended').lean();
            await ModerationLog.create([{
                entityType: 'user', entityId: userId, action: 'USER_ACCESS_UPDATED', moderator: session.user.id,
                reason: parsed.data.note, relatedEntity: userId, relatedEntityType: 'user',
            }], { session: transaction });
        });
        return Response.json({ ok: true, user: changed });
    } catch (err) {
        return Response.json({ msg: err.status ? err.message : 'Could not save account changes' }, { status: err.status || 500 });
    } finally { await transaction.endSession(); }
}
