import mongoose from 'mongoose';
import { z } from 'zod';
import connectDB from '@/lib/db';
import Doubt from '@/models/Doubt';
import Answer from '@/models/Answer';
import User from '@/models/User';
import { notifyUsers } from '@/lib/notifications';
import { requireRole } from '@/lib/session';

const schema = z.object({
    content: z.string().trim().min(10, 'Write at least 10 characters').max(10000).optional(),
    body: z.string().trim().min(10, 'Write at least 10 characters').max(8000).optional(),
}).refine((answer) => Boolean(answer.content || answer.body), {
    message: 'Write an explanation before submitting.',
});

export async function POST(req, { params }) {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ msg: 'Not found' }, { status: 404 });

    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    await connectDB();
    const doubt = await Doubt.findOneAndUpdate(
        { _id: id, status: 'CLAIMED', assignedHelper: session.user.id, flaggedForReview: { $ne: true } },
        { $set: { status: 'ANSWERED' } }
    );
    if (!doubt) return Response.json({ msg: 'You need to take this doubt before answering it.' }, { status: 403 });

    try {
        const content = parsed.data.content || parsed.data.body;
        const answer = await Answer.create({ doubt: id, helper: session.user.id, content });
        try {
            const moderators = await User.find({ roles: { $in: ['cr', 'faculty'] }, isSuspended: { $ne: true } }).select('_id').lean();
            await notifyUsers([doubt.author, ...moderators.map((user) => user._id)], {
                type: 'ANSWER_SUBMITTED', doubt: id, answer: answer._id,
                message: 'A helper submitted an answer for review.', href: `/doubts/${id}#answer-${answer._id}`,
                dedupeKey: `answer:${answer._id}:submitted`,
            });
        } catch (notifyError) { console.error('ANSWER_SUBMISSION_NOTIFICATION_FAILED', { name: notifyError?.name || 'Error' }); }
        return Response.json(answer, { status: 201 });
    } catch (error) {
        await Doubt.updateOne(
            { _id: id, status: 'ANSWERED', assignedHelper: session.user.id },
            { $set: { status: 'CLAIMED' } }
        );
        console.error('ANSWER_SUBMISSION_FAILED', {
            name: error?.name || 'Error',
            code: error?.code || 'UNKNOWN',
        });
        return Response.json({ msg: 'Could not save your answer. Please try again.' }, { status: 500 });
    }
}
