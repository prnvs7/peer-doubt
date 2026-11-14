import connectDB from '@/lib/db';
import Answer from '@/models/Answer';
import Doubt from '@/models/Doubt';
import User from '@/models/User';
import { requireRole } from '@/lib/session';

export async function GET() {
    const { session, error, status } = await requireRole('helper');
    if (error) return Response.json({ msg: error }, { status });
    await connectDB();

    const user = await User.findById(session.user.id).select('helperProfile').lean();
    const profile = user?.helperProfile;
    if (!profile?.isWilling || !profile.courses?.length)
        return Response.json({ ready: false, available: [], assigned: [] });

    const [available, assigned] = await Promise.all([
        Doubt.find({
            status: 'OPEN',
            flaggedForReview: { $ne: true },
            author: { $ne: session.user.id },
            course: { $in: profile.courses },
        })
            .populate('author', 'name')
            .sort({ createdAt: 1 })
            .limit(30)
            .lean(),
        Doubt.find({ assignedHelper: session.user.id, status: { $in: ['CLAIMED', 'ANSWERED'] }, flaggedForReview: { $ne: true } })
            .populate('author', 'name')
            .sort({ updatedAt: -1 })
            .limit(30)
            .lean(),
    ]);

    const answerIds = assigned.map((doubt) => doubt._id);
    const answers = await Answer.find({ doubt: { $in: answerIds }, helper: session.user.id })
        .sort({ createdAt: -1 })
        .lean();
    const latestAnswer = new Map();
    for (const answer of answers) {
        const key = answer.doubt.toString();
        if (!latestAnswer.has(key)) latestAnswer.set(key, answer);
    }

    available.sort((a, b) => {
        const aTopic = profile.topics?.includes(a.topic) ? 0 : 1;
        const bTopic = profile.topics?.includes(b.topic) ? 0 : 1;
        return aTopic - bTopic || new Date(a.createdAt) - new Date(b.createdAt);
    });

    return Response.json({
        ready: true,
        available: available.map((doubt) => ({
            ...doubt,
            author: doubt.isAnonymous ? { name: 'Anonymous' } : doubt.author,
        })),
        assigned: assigned.map((doubt) => ({
            ...doubt,
            author: doubt.isAnonymous ? { name: 'Anonymous' } : doubt.author,
            myAnswer: (() => {
                const answer = latestAnswer.get(doubt._id.toString());
                return answer ? { ...answer, content: answer.flaggedForReview ? '' : (answer.content || answer.body || ''), flaggedForReview: Boolean(answer.flaggedForReview) } : null;
            })(),
        })),
    });
}
