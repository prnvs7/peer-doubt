import ModerationLog from '@/models/ModerationLog';

export async function recordModerationAction({
    entityType,
    entityId,
    action,
    moderator,
    reasonCategory,
    reason = '',
    relatedEntity,
    relatedEntityType,
    idempotencyKey,
    session,
}) {
    if (idempotencyKey) {
        return ModerationLog.findOneAndUpdate(
            { idempotencyKey },
            {
                $setOnInsert: {
                    entityType,
                    entityId,
                    action,
                    moderator,
                    reasonCategory,
                    reason,
                    relatedEntity,
                    relatedEntityType,
                    idempotencyKey,
                },
            },
            { upsert: true, new: true, session }
        );
    }

    const log = new ModerationLog({
        entityType,
        entityId,
        action,
        moderator,
        reasonCategory,
        reason,
        relatedEntity,
        relatedEntityType,
    });
    return session ? log.save({ session }) : log.save();
}

export function parsePagination(searchParams) {
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
}

export function validObjectId(value) {
    return /^[a-f\d]{24}$/i.test(value || '');
}
