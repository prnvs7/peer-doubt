import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import ModerationLog from '@/models/ModerationLog';
import { requireRole } from '@/lib/session';
import { notifyUsers } from '@/lib/notifications';
import { validObjectId } from '@/lib/moderation';

const schema = z.object({ note: z.string().trim().min(3).max(1000) });
const PENDING = ['PENDING', 'SUBMITTED', 'PENDING_REVIEW', 'ACCEPTED'];

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Answer not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    let transaction;
    try {
        await connectDB();
        transaction = await mongoose.startSession();
        let result;
        await transaction.withTransaction(async () => {
            const answer = await Answer.findById(id).session(transaction).populate({ path: 'doubt', options: { session: transaction } });
            if (!answer || !answer.doubt) throw Object.assign(new Error('Answer not found'), { status: 404 });
            if (answer.helper.toString() === session.user.id) throw Object.assign(new Error('You cannot review your own answer'), { status: 403 });
            if (!PENDING.includes(answer.status)) throw Object.assign(new Error('Only pending answers can be sent back'), { status: 409 });
            if (answer.reviewAssignedTo && answer.reviewAssignedTo.toString() !== session.user.id) throw Object.assign(new Error('This review is assigned to another moderator'), { status: 409 });
            const changed = await Answer.findOneAndUpdate(
                { _id: id, status: answer.status, $or: [{ reviewAssignedTo: null }, { reviewAssignedTo: session.user.id }] },
                { $set: { status: 'REVISION_REQUESTED' }, $push: { moderationHistory: { moderator: session.user.id, action: 'REVISION_REQUESTED', reason: parsed.data.note } } },
                { new: true, session: transaction }
            );
            if (!changed) throw Object.assign(new Error('Answer changed during review. Refresh and try again.'), { status: 409 });
            await ModerationLog.create([{
                entityType: 'answer', entityId: answer._id, action: 'REVISION_REQUESTED', moderator: session.user.id,
                reason: parsed.data.note, relatedEntity: answer.doubt._id, relatedEntityType: 'doubt',
                idempotencyKey: `answer:${id}:revision:${changed.updatedAt.getTime()}`,
            }], { session: transaction });
            result = { helper: answer.helper, doubt: answer.doubt._id };
        });
        try {
            await notifyUsers([result.helper], {
                type: 'REVISION_REQUESTED', doubt: result.doubt, answer: id,
                message: `A moderator requested a correction: ${parsed.data.note}`,
                href: `/doubts/${result.doubt}#answer-${id}`, dedupeKey: `answer:${id}:revision-request:${Date.now()}`,
            });
        } catch (notifyError) { console.error('REVISION_NOTIFICATION_FAILED', { name: notifyError?.name || 'Error' }); }
        return Response.json({ ok: true, status: 'REVISION_REQUESTED' });
    } catch (err) {
        return Response.json({ msg: err.status ? err.message : 'Could not request a correction' }, { status: err.status || 500 });
    } finally { if (transaction) await transaction.endSession(); }
}
