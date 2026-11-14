import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
    {
        entityType: { type: String, enum: ['answer', 'doubt', 'report', 'knowledge', 'user'], required: true, index: true },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        action: { type: String, required: true, index: true },
        moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reasonCategory: { type: String, enum: ['INCORRECT', 'INCOMPLETE', 'OFF_TOPIC', 'SPAM_INAPPROPRIATE', 'OTHER'] },
        reason: { type: String, trim: true, maxlength: 1000, default: '' },
        relatedEntity: { type: mongoose.Schema.Types.ObjectId },
        relatedEntityType: { type: String, enum: ['answer', 'doubt', 'report', 'knowledge', 'user'] },
        idempotencyKey: { type: String, unique: true, sparse: true },
    },
    { timestamps: true }
);

moderationLogSchema.index({ createdAt: -1 });
moderationLogSchema.index({ moderator: 1, createdAt: -1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.models.ModerationLog || mongoose.model('ModerationLog', moderationLogSchema);
