import { z } from 'zod';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import User from '@/models/User';
import { notifyUsers } from '@/lib/notifications';
import { requireRole } from '@/lib/session';
import { validObjectId } from '@/lib/moderation';

const schema = z.object({ content: z.string().trim().min(10).max(10000) });

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Answer not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    await connectDB();
    const answer = await Answer.findOne({ _id: id, helper: session.user.id, status: 'REVISION_REQUESTED' }).lean();
    if (!answer) return Response.json({ msg: 'This answer is not awaiting a revision from you' }, { status: 409 });
    const updated = await Answer.findOneAndUpdate(
        { _id: id, helper: session.user.id, status: 'REVISION_REQUESTED' },
        { $set: { content: parsed.data.content, status: 'PENDING' }, $push: { revisions: { content: answer.content || answer.body || '', editedBy: session.user.id } } },
        { new: true }
    );
    if (!updated) return Response.json({ msg: 'Answer changed during editing. Refresh and try again.' }, { status: 409 });
    const doubt = await Doubt.findById(answer.doubt).select('author').lean();
    try {
        const moderators = await User.find({ roles: { $in: ['cr', 'faculty'] }, isSuspended: { $ne: true } }).select('_id').lean();
        await notifyUsers(moderators.map((user) => user._id), {
            type: 'ANSWER_SUBMITTED', doubt: answer.doubt, answer: id,
            message: 'A helper submitted a revised answer for review.', href: `/doubts/${answer.doubt}#answer-${id}`,
            dedupeKey: `answer:${id}:revision:${updated.updatedAt.getTime()}`,
        });
        if (doubt?.author) await notifyUsers([doubt.author], {
            type: 'ANSWER_SUBMITTED', doubt: answer.doubt, answer: id,
            message: 'A helper revised an answer to your question. It is back in moderation review.',
            href: `/doubts/${answer.doubt}#answer-${id}`, dedupeKey: `answer:${id}:revision-owner:${updated.updatedAt.getTime()}`,
        });
    } catch (notifyError) { console.error('ANSWER_REVISION_NOTIFICATION_FAILED', { name: notifyError?.name || 'Error' }); }
    return Response.json({ ok: true, status: 'PENDING' });
}
