import mongoose from 'mongoose';

export const ANSWER_STATUSES = ['PENDING', 'SUBMITTED', 'PENDING_REVIEW', 'ACCEPTED', 'REVISION_REQUESTED', 'VERIFIED', 'REJECTED'];

const moderationEntrySchema = new mongoose.Schema(
    {
        moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: { type: String, enum: ['VERIFIED', 'REJECTED', 'REVISION_REQUESTED', 'RECONSIDERED'], required: true },
        reasonCategory: { type: String, enum: ['INCORRECT', 'INCOMPLETE', 'OFF_TOPIC', 'SPAM_INAPPROPRIATE', 'OTHER'] },
        reason: { type: String, trim: true, maxlength: 1000, default: '' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const revisionSchema = new mongoose.Schema({
    content: { type: String, required: true, maxlength: 10000 },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

const answerSchema = new mongoose.Schema(
    {
        doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
        helper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        developmentTestId: { type: String, trim: true, unique: true, sparse: true },
        content: { type: String, trim: true, maxlength: 10000, required() { return !this.body; } },
        body: { type: String, trim: true, maxlength: 8000, required() { return !this.content; } },
        status: { type: String, enum: ANSWER_STATUSES, default: 'PENDING', index: true },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        moderationHistory: { type: [moderationEntrySchema], default: [] },
        revisions: { type: [revisionSchema], default: [] },
        reviewAssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewAssignedAt: Date,
        flaggedForReview: { type: Boolean, default: false, index: true },
        flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        flaggedAt: Date,
    },
    { timestamps: true }
);

answerSchema.index({ status: 1, createdAt: -1 });
answerSchema.index({ doubt: 1, createdAt: 1 });

export default mongoose.models.Answer || mongoose.model('Answer', answerSchema);
