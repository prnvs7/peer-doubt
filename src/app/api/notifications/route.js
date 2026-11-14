import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { parsePagination } from '@/lib/moderation';
import { requireRole } from '@/lib/session';

export async function GET(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    const { page, limit, skip } = parsePagination(new URL(req.url).searchParams);
    const filter = { recipient: session.user.id };
    const [items, total, unread] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ ...filter, readAt: null }),
    ]);
    return Response.json({ items, unread, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function PATCH() {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    await Notification.updateMany({ recipient: session.user.id, readAt: null }, { $set: { readAt: new Date() } });
    return Response.json({ ok: true });
}
