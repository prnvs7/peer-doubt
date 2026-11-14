import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import Report from '@/models/Report';
import { parsePagination } from '@/lib/moderation';
import { requireRole } from '@/lib/session';
import { z } from 'zod';

const submissionSchema = z.object({
    targetType: z.enum(['doubt', 'answer']),
    target: z.string().regex(/^[a-f\d]{24}$/i),
    reasonCategory: z.enum(['INCORRECT', 'HARASSMENT', 'SPAM', 'PRIVACY', 'DUPLICATE', 'OTHER']),
    details: z.string().trim().max(2000).optional().default(''),
});
const REASONS = { INCORRECT: 'Incorrect or misleading content', HARASSMENT: 'Harassment or abuse', SPAM: 'Spam or unrelated content', PRIVACY: 'Privacy concern', DUPLICATE: 'Duplicate question', OTHER: 'Other' };

export async function POST(req) {
    const { session, error, status } = await requireRole();
    if (error) return Response.json({ msg: error }, { status });

    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ msg: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) return Response.json({ msg: parsed.error.issues[0].message }, { status: 400 });

    await connectDB();
    const { targetType, target, details } = parsed.data;
    const exists = targetType === 'doubt'
        ? await Doubt.exists({ _id: target })
        : await Answer.exists({ _id: target });
    if (!exists) return Response.json({ msg: 'Reported content was not found' }, { status: 404 });

    const recentReports = await Report.countDocuments({ reporter: session.user.id, createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) } });
    if (recentReports >= 6) return Response.json({ msg: 'Report limit reached. Please wait before submitting another report.' }, { status: 429 });

    const existing = await Report.findOne({ targetType, target, reporter: session.user.id, status: 'OPEN' }).select('_id');
    if (existing) return Response.json({ msg: 'You already have an open report for this content' }, { status: 409 });

    try {
        const report = await Report.create({ targetType, target, reporter: session.user.id, reasonCategory: parsed.data.reasonCategory, reason: REASONS[parsed.data.reasonCategory], details });
        return Response.json({ ok: true, id: report._id }, { status: 201 });
    } catch (createError) {
        if (createError?.code === 11000) return Response.json({ msg: 'You already have an open report for this content' }, { status: 409 });
        throw createError;
    }
}

export async function GET(req) {
    const { error, status } = await requireRole('cr', 'faculty');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();
    const url = new URL(req.url);
    const { page, limit, skip } = parsePagination(url.searchParams);
    const reportStatus = url.searchParams.get('status');
    const targetType = url.searchParams.get('type');
    const filter = {};
    if (reportStatus && !['OPEN', 'RESOLVED', 'DISMISSED'].includes(reportStatus)) return Response.json({ msg: 'Unknown report status' }, { status: 400 });
    if (targetType && !['doubt', 'answer'].includes(targetType)) return Response.json({ msg: 'Unknown reported content type' }, { status: 400 });
    if (reportStatus) filter.status = reportStatus;
    if (targetType) filter.targetType = targetType;

    const [reports, total] = await Promise.all([
        Report.find(filter)
            .populate('reporter', 'name')
            .populate('handledBy', 'name')
            .populate('decisionHistory.moderator', 'name')
            .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Report.countDocuments(filter),
    ]);
    const doubtIds = reports.filter((item) => item.targetType === 'doubt').map((item) => item.target);
    const answerIds = reports.filter((item) => item.targetType === 'answer').map((item) => item.target);
    const [doubts, answers] = await Promise.all([
        Doubt.find({ _id: { $in: doubtIds } }).select('title description course topic status flaggedForReview').lean(),
        Answer.find({ _id: { $in: answerIds } }).populate('doubt', 'title course topic').populate('helper', 'name').select('content body status doubt helper flaggedForReview').lean(),
    ]);
    const targets = new Map([
        ...doubts.map((item) => [item._id.toString(), { kind: 'doubt', ...item }]),
        ...answers.map((item) => [item._id.toString(), { kind: 'answer', ...item, content: item.content || item.body || '' }]),
    ]);
    const items = reports.map((report) => ({ ...report, targetContent: targets.get(report.target.toString()) || null }));
    return Response.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
