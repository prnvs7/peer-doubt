import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { requireRole } from '@/lib/session';
import { validObjectId } from '@/lib/moderation';

export async function PATCH(_req, { params }) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Notification not found' }, { status: 404 });
    await connectDB();
    const item = await Notification.findOneAndUpdate(
        { _id: id, recipient: session.user.id, readAt: null },
        { $set: { readAt: new Date() } }, { new: true }
    ).lean();
    return Response.json({ ok: true, changed: Boolean(item) });
}
