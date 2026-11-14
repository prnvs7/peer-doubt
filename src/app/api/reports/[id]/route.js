import { z } from 'zod';
import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import Report from '@/models/Report';
import { recordModerationAction, validObjectId } from '@/lib/moderation';
import { notifyUsers } from '@/lib/notifications';
import { requireRole } from '@/lib/session';

const schema = z.object({ decision: z.enum(['RESOLVE', 'DISMISS', 'FLAG']), note: z.string().trim().max(1000).optional().default('') });

export async function PATCH(req, { params }) {
    const { session, error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    const { id } = await params;
    if (!validObjectId(id)) return Response.json({ msg: 'Report not found' }, { status: 404 });
    let body;
    try { body = await req.json(); } catch { return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    await connectDB();
    const report = await Report.findById(id);
    if (!report) return Response.json({ msg: 'Report not found' }, { status: 404 });
    if (report.status !== 'OPEN') return Response.json({ msg: 'This report has already been reviewed' }, { status: 409 });

    if (parsed.data.decision === 'FLAG') {
        const alreadyFlagged = report.decisionHistory.some((entry) => entry.action === 'FLAGGED');
        if (alreadyFlagged) return Response.json({ ok: true, status: 'OPEN', flagged: true });
        const updated = await Report.findOneAndUpdate(
            { _id: id, status: 'OPEN', 'decisionHistory.action': { $ne: 'FLAGGED' } },
            { $set: { handledBy: session.user.id, decisionNote: parsed.data.note }, $push: { decisionHistory: { moderator: session.user.id, action: 'FLAGGED', reason: parsed.data.note } } },
            { new: true }
        );
        if (!updated) return Response.json({ msg: 'Report changed during review. Refresh and try again.' }, { status: 409 });
        const Target = report.targetType === 'doubt' ? Doubt : Answer;
        const target = await Target.findByIdAndUpdate(report.target, { $set: { flaggedForReview: true, flaggedBy: session.user.id, flaggedAt: new Date() } }, { new: true }).select('_id').lean();
        if (!target) return Response.json({ msg: 'Reported content is no longer available' }, { status: 404 });
        const currentReport = await Report.findById(id).select('status').lean();
        if (currentReport?.status !== 'OPEN') {
            const otherOpen = await Report.exists({ _id: { $ne: id }, targetType: report.targetType, target: report.target, status: 'OPEN' });
            if (!otherOpen) await Target.updateOne({ _id: report.target }, { $set: { flaggedForReview: false }, $unset: { flaggedBy: 1, flaggedAt: 1 } });
        }
        await recordModerationAction({
            entityType: 'report', entityId: report._id, action: 'FLAGGED', moderator: session.user.id,
            reason: parsed.data.note, relatedEntity: report.target, relatedEntityType: report.targetType,
            idempotencyKey: `report:${report._id}:flagged`,
        });
        return Response.json({ ok: true, status: currentReport?.status || 'OPEN', flagged: currentReport?.status === 'OPEN' });
    }

    const nextStatus = parsed.data.decision === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED';
    const updated = await Report.findOneAndUpdate(
        { _id: id, status: 'OPEN' },
        {
            $set: { status: nextStatus, handledBy: session.user.id, decisionNote: parsed.data.note, resolvedAt: new Date() },
            $push: { decisionHistory: { moderator: session.user.id, action: nextStatus, reason: parsed.data.note } },
        },
        { new: true }
    );
    if (!updated) return Response.json({ msg: 'Report changed during review. Refresh and try again.' }, { status: 409 });

    const otherOpen = await Report.exists({ _id: { $ne: id }, targetType: report.targetType, target: report.target, status: 'OPEN' });
    if (!otherOpen) {
        const Target = report.targetType === 'doubt' ? Doubt : Answer;
        await Target.updateOne({ _id: report.target }, { $set: { flaggedForReview: false }, $unset: { flaggedBy: 1, flaggedAt: 1 } });
    }
    await recordModerationAction({
        entityType: 'report', entityId: updated._id, action: nextStatus, moderator: session.user.id,
        reason: parsed.data.note, relatedEntity: updated.target, relatedEntityType: updated.targetType,
        idempotencyKey: `report:${updated._id}:${nextStatus.toLowerCase()}`,
    });
    try {
        const linkedAnswer = report.targetType === 'answer' ? await Answer.findById(report.target).select('doubt').lean() : null;
        const linkedDoubt = report.targetType === 'doubt' ? report.target : linkedAnswer?.doubt;
        await notifyUsers([updated.reporter], {
            type: 'REPORT_RESOLVED', doubt: report.targetType === 'doubt' ? report.target : undefined,
            answer: report.targetType === 'answer' ? report.target : undefined,
            message: `Your report was ${nextStatus.toLowerCase()}.${parsed.data.note ? ` ${parsed.data.note}` : ''}`,
            href: linkedDoubt ? `/doubts/${linkedDoubt}` : '/notifications',
            dedupeKey: `report:${report._id}:${nextStatus.toLowerCase()}`,
        });
    } catch (notifyError) { console.error('REPORT_DECISION_NOTIFICATION_FAILED', { name: notifyError?.name || 'Error' }); }
    return Response.json({ ok: true, status: updated.status });
}
