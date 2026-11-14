import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import { recordModerationAction, validObjectId } from '@/lib/moderation';
import { notifyUsers } from '@/lib/notifications';
import { requireRole } from '@/lib/session';

const schema = z.object({ decision: z.enum(['CONFIRM', 'DISMISS']), originalDoubtId: z.string(), reason: z.string().trim().max(1000).optional().default('') });

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Doubt not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });
    if (!validObjectId(parsed.data.originalDoubtId) || parsed.data.originalDoubtId === id)
        return Response.json({ msg: 'Choose a different original doubt' }, { status: 400 });

    await connectDB();
    let transaction;
    try {
        transaction = await mongoose.startSession();
        let result;
        await transaction.withTransaction(async () => {
            const [candidate, original] = await Promise.all([
                Doubt.findById(id).session(transaction),
                Doubt.findById(parsed.data.originalDoubtId).session(transaction),
            ]);
            if (!candidate || !original) throw Object.assign(new Error('Doubt not found'), { status: 404 });
            if (original.status === 'DUPLICATE' || original.status === 'REJECTED')
                throw Object.assign(new Error('Original doubt is unavailable or already linked as a duplicate'), { status: 409 });

            if (parsed.data.decision === 'CONFIRM') {
                if (candidate.status === 'DUPLICATE' && candidate.duplicateOf?.toString() !== original._id.toString())
                    throw Object.assign(new Error('This doubt is already linked to another original'), { status: 409 });
                if (candidate.status === 'REJECTED') throw Object.assign(new Error('A rejected doubt cannot be linked as a duplicate'), { status: 409 });
                if (candidate.status !== 'DUPLICATE') {
                    const changed = await Doubt.findOneAndUpdate(
                        { _id: id, status: { $nin: ['DUPLICATE', 'REJECTED'] } },
                        { $set: { status: 'DUPLICATE', duplicateOf: original._id } },
                        { new: true, session: transaction }
                    );
                    if (!changed) throw Object.assign(new Error('Doubt changed during review. Refresh and try again.'), { status: 409 });
                    result = { author: candidate.author, title: original.title, candidate: candidate._id, original: original._id, changed: true };
                    // A write to both records makes reciprocal duplicate decisions conflict in MongoDB.
                    const lockedOriginal = await Doubt.findOneAndUpdate(
                        { _id: original._id, status: { $nin: ['DUPLICATE', 'REJECTED'] } },
                        { $inc: { duplicateLinkCount: 1 } }, { session: transaction }
                    );
                    if (!lockedOriginal) throw Object.assign(new Error('Original doubt changed during review. Refresh and try again.'), { status: 409 });
                } else {
                    result = { author: candidate.author, title: original.title, candidate: candidate._id, original: original._id, changed: false };
                }
                await recordModerationAction({
                    entityType: 'doubt', entityId: candidate._id, action: 'DUPLICATE_CONFIRMED', moderator: session.user.id,
                    reason: parsed.data.reason, relatedEntity: original._id, relatedEntityType: 'doubt',
                    idempotencyKey: `duplicate:${candidate._id}:${original._id}:confirmed`, session: transaction,
                });
            } else {
                await recordModerationAction({
                    entityType: 'doubt', entityId: candidate._id, action: 'DUPLICATE_DISMISSED', moderator: session.user.id,
                    reason: parsed.data.reason, relatedEntity: original._id, relatedEntityType: 'doubt',
                    idempotencyKey: `duplicate:${candidate._id}:${original._id}:dismissed`, session: transaction,
                });
                result = { candidate: candidate._id, original: original._id, dismissed: true };
            }
        });

        if (parsed.data.decision === 'CONFIRM' && result.changed) {
            try {
                await notifyUsers([result.author], {
                    type: 'DUPLICATE_CONFIRMED', doubt: result.candidate,
                    message: `Your question was linked as a duplicate of “${result.title}”.`, href: `/doubts/${result.candidate}`,
                    dedupeKey: `duplicate:${result.candidate}:${result.original}:author`,
                });
            } catch (notifyError) { console.error('DUPLICATE_NOTIFICATION_FAILED', { name: notifyError?.name || 'Error' }); }
        }
        return Response.json(parsed.data.decision === 'CONFIRM'
            ? { ok: true, status: 'DUPLICATE', originalDoubtId: result.original }
            : { ok: true, dismissed: true });
    } catch (err) {
        if (err.status) return Response.json({ msg: err.message }, { status: err.status });
        if (err instanceof mongoose.mongo.MongoServerError && err.hasErrorLabel?.('TransientTransactionError'))
            return Response.json({ msg: 'Another duplicate review changed this doubt. Refresh and try again.' }, { status: 409 });
        console.error('DUPLICATE_REVIEW_FAILED', { name: err?.name || 'Error', code: err?.code || 'UNKNOWN' });
        return Response.json({ msg: 'Could not save this duplicate decision' }, { status: 500 });
    } finally { if (transaction) await transaction.endSession(); }
}
