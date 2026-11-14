import Doubt from '@/models/Doubt';
import ModerationLog from '@/models/ModerationLog';
import { compareDoubts } from '@/lib/similarity';

export async function getDuplicateSuggestions(candidateLimit = 240) {
    const doubts = await Doubt.find({ status: { $nin: ['DUPLICATE', 'REJECTED'] } })
        .sort({ createdAt: -1 }).limit(candidateLimit).lean();
    const ids = doubts.map((doubt) => doubt._id);
    const dismissed = await ModerationLog.find({ action: 'DUPLICATE_DISMISSED', entityId: { $in: ids } })
        .select('entityId relatedEntity').lean();
    const dismissedPairs = new Set(dismissed.map((item) => `${item.entityId}:${item.relatedEntity}`));
    const suggestions = [];

    for (let leftIndex = 0; leftIndex < doubts.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < doubts.length; rightIndex += 1) {
            const left = doubts[leftIndex];
            const right = doubts[rightIndex];
            if (left.course !== right.course && left.topic !== right.topic) continue;
            const { score, signals } = compareDoubts(left, right);
            if (score < 28) continue;
            const older = new Date(left.createdAt) <= new Date(right.createdAt) ? left : right;
            const newer = older._id.toString() === left._id.toString() ? right : left;
            if (dismissedPairs.has(`${newer._id}:${older._id}`)) continue;
            suggestions.push({ candidate: newer, original: older, score, signals });
        }
    }

    return suggestions.sort((a, b) => b.score - a.score);
}
