import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import KnowledgeEntry from '@/models/KnowledgeEntry';
import KnowledgeBookmark from '@/models/KnowledgeBookmark';
import ModerationLog from '@/models/ModerationLog';
import { z } from 'zod';
import { validObjectId } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

export async function GET(_req, { params }) {
    const { error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    await connectDB();
    const entry = await KnowledgeEntry.findOne({ _id: id, $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] }).populate('verifiedBy', 'name').populate('doubt', 'title description course topic status flaggedForReview createdAt').lean();
    if (!entry) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    const answer = await Answer.findOne({ _id: entry.answer, status: 'VERIFIED' }).select('content body helper createdAt flaggedForReview').populate('helper', 'name').lean();
    if (!answer) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    const canReviewFlagged = session.user.roles?.some((role) => ['cr', 'faculty', 'admin'].includes(role));
    if ((answer.flaggedForReview || entry.doubt?.flaggedForReview || ['DUPLICATE', 'REJECTED'].includes(entry.doubt?.status)) && !canReviewFlagged)
        return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    const [viewed, bookmarked] = await Promise.all([
        KnowledgeEntry.findOneAndUpdate({ _id: id, $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] }, { $inc: { viewCount: 1 } }, { new: true }).select('viewCount').lean(),
        KnowledgeBookmark.exists({ user: session.user.id, entry: id }),
    ]);
    if (!viewed) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    if (!viewed) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    const candidates = await KnowledgeEntry.find({ _id: { $ne: id }, course: entry.course, topic: entry.topic, $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] })
        .sort({ helpfulCount: -1, verifiedAt: -1 }).limit(4).select('title course topic verifiedAt helpfulCount answer doubt').lean();
    const [validAnswers, validDoubts] = await Promise.all([
        Answer.distinct('_id', { _id: { $in: candidates.map((item) => item.answer) }, status: 'VERIFIED', flaggedForReview: { $ne: true } }),
        Doubt.distinct('_id', { _id: { $in: candidates.map((item) => item.doubt) }, flaggedForReview: { $ne: true }, status: { $nin: ['DUPLICATE', 'REJECTED'] } }),
    ]);
    const answerIds = new Set(validAnswers.map(String));
    const doubtIds = new Set(validDoubts.map(String));
    const related = candidates.filter((item) => answerIds.has(item.answer.toString()) && doubtIds.has(item.doubt.toString()));
    return Response.json({ ...entry, viewCount: viewed.viewCount, bookmarked: Boolean(bookmarked), canArchive: session.user.roles?.some((role) => ['faculty', 'admin'].includes(role)), answer: { ...answer, content: answer.content || answer.body || '' }, related });
}

const archiveSchema = z.object({ reason: z.string().trim().min(3).max(1000) });

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole('faculty', 'admin');
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = archiveSchema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });
    await connectDB();
    const entry = await KnowledgeEntry.findOneAndUpdate(
        { _id: id, $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] },
        { $set: { status: 'ARCHIVED', archivedBy: session.user.id, archivedAt: new Date(), archiveReason: parsed.data.reason } },
        { new: true }
    ).lean();
    if (!entry) return Response.json({ msg: 'Entry is unavailable or already archived' }, { status: 409 });
    await ModerationLog.create({
        entityType: 'knowledge', entityId: entry._id, action: 'KNOWLEDGE_ARCHIVED', moderator: session.user.id,
        reason: parsed.data.reason, relatedEntity: entry.answer, relatedEntityType: 'answer',
        idempotencyKey: `knowledge:${entry._id}:archived`,
    });
    return Response.json({ ok: true, status: 'ARCHIVED' });
}
