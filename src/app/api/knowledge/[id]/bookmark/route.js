import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import KnowledgeBookmark from '@/models/KnowledgeBookmark';
import KnowledgeEntry from '@/models/KnowledgeEntry';
import { requireRole } from '@/lib/session';
import { validObjectId } from '@/lib/moderation';

export async function PUT(req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Knowledge entry not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    if (typeof body?.saved !== 'boolean') return Response.json({ msg: 'Choose whether to save or remove this entry' }, { status: 400 });
    await connectDB();
    const entry = await KnowledgeEntry.findOne({ _id: id, $or: [{ status: 'ACTIVE' }, { status: { $exists: false } }] }).select('answer').lean();
    const answer = entry && await Answer.findOne({ _id: entry.answer, status: 'VERIFIED', flaggedForReview: { $ne: true } }).select('doubt').lean();
    const doubt = answer && await Doubt.exists({ _id: answer.doubt, flaggedForReview: { $ne: true }, status: { $nin: ['DUPLICATE', 'REJECTED'] } });
    if (!entry || !answer || !doubt)
        return Response.json({ msg: 'Only verified knowledge can be saved' }, { status: 404 });
    if (body.saved) {
        await KnowledgeBookmark.updateOne({ user: session.user.id, entry: id }, { $setOnInsert: { user: session.user.id, entry: id } }, { upsert: true });
    } else {
        await KnowledgeBookmark.deleteOne({ user: session.user.id, entry: id });
    }
    return Response.json({ saved: body.saved });
}
