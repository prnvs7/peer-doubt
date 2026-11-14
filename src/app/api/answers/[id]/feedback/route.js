import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import AnswerFeedback from '@/models/AnswerFeedback';
import Doubt from '@/models/Doubt';
import KnowledgeEntry from '@/models/KnowledgeEntry';
import User from '@/models/User';
import { notifyUsers } from '@/lib/notifications';
import { requireRole } from '@/lib/session';
import { validObjectId } from '@/lib/moderation';

export async function GET(_req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Answer not found' }, { status: 404 });
    await connectDB();
    const answer = await Answer.findOne({ _id: id, status: 'VERIFIED', flaggedForReview: { $ne: true } }).select('helper doubt').lean();
    const doubt = answer && await Doubt.exists({ _id: answer.doubt, flaggedForReview: { $ne: true }, status: { $nin: ['DUPLICATE', 'REJECTED'] } });
    if (!answer || !doubt) return Response.json({ msg: 'Answer not found' }, { status: 404 });
    const [helpful, unhelpful, own] = await Promise.all([
        AnswerFeedback.countDocuments({ answer: id, helpful: true }),
        AnswerFeedback.countDocuments({ answer: id, helpful: false }),
        AnswerFeedback.findOne({ answer: id, user: session.user.id }).select('helpful').lean(),
    ]);
    return Response.json({ helpful, unhelpful, vote: own?.helpful ?? null, canVote: answer.helper.toString() !== session.user.id });
}

export async function PUT(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Answer not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    if (typeof body?.helpful !== 'boolean') return Response.json({ msg: 'Choose helpful or not helpful' }, { status: 400 });

    await connectDB();
    const answer = await Answer.findOne({ _id: id, status: 'VERIFIED', flaggedForReview: { $ne: true } }).select('helper doubt').lean();
    const doubt = answer && await Doubt.exists({ _id: answer.doubt, flaggedForReview: { $ne: true }, status: { $nin: ['DUPLICATE', 'REJECTED'] } });
    if (!answer || !doubt) return Response.json({ msg: 'Only visible verified answers can receive feedback' }, { status: 404 });
    if (answer.helper.toString() === session.user.id) return Response.json({ msg: 'You cannot rate your own answer' }, { status: 403 });

    let prior;
    let saved = false;
    let oldVote;
    for (let attempt = 0; attempt < 4 && !saved; attempt += 1) {
        prior = await AnswerFeedback.findOne({ answer: id, user: session.user.id }).lean();
        if (prior?.helpful === body.helpful) break;
        oldVote = prior?.helpful;
        if (!prior) {
            try {
                await AnswerFeedback.create({ answer: id, user: session.user.id, helpful: body.helpful });
                saved = true;
                prior = null;
            } catch (err) {
                if (err?.code !== 11000) throw err;
            }
        } else {
            const updated = await AnswerFeedback.findOneAndUpdate(
                { _id: prior._id, revision: prior.revision || 0 },
                { $set: { helpful: body.helpful }, $inc: { revision: 1 } }, { new: true }
            );
            if (updated) saved = true;
        }
    }
    if (saved) {
        const delta = oldVote === undefined ? (body.helpful ? 1 : 0) : Number(body.helpful) - Number(oldVote);
        if (delta) await KnowledgeEntry.updateOne(
            { answer: id, status: 'ACTIVE' },
            [{ $set: { helpfulCount: { $max: [0, { $add: [{ $ifNull: ['$helpfulCount', 0] }, delta] }] } } }]
        );
        if (oldVote === undefined || oldVote !== body.helpful) {
            const helper = await User.findById(answer.helper).select('_id').lean();
            await notifyUsers([helper?._id], {
                type: 'ANSWER_FEEDBACK', doubt: answer.doubt, answer: id,
                message: `A student marked your verified answer as ${body.helpful ? 'helpful' : 'not helpful'}.`,
                href: `/doubts/${answer.doubt}#answer-${id}`,
                dedupeKey: `answer:${id}:feedback:${session.user.id}:${Date.now()}`,
            });
        }
    }
    const [helpful, unhelpful, own] = await Promise.all([
        AnswerFeedback.countDocuments({ answer: id, helpful: true }),
        AnswerFeedback.countDocuments({ answer: id, helpful: false }),
        AnswerFeedback.findOne({ answer: id, user: session.user.id }).select('helpful').lean(),
    ]);
    return Response.json({ helpful, unhelpful, vote: own?.helpful ?? null });
}
