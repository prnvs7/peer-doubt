import mongoose from 'mongoose';

export const STATUSES = ['OPEN', 'CLAIMED', 'ANSWERED', 'VERIFIED', 'DUPLICATE', 'REJECTED'];

const doubtSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, required: true, maxlength: 5000 },
        course: { type: String, required: true },
        topic: { type: String, required: true },
        tags: {
            type: [{ type: String, trim: true, maxlength: 40 }],
            default: [],
            validate: {
                validator: (tags) => tags.length <= 8
                    && new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length,
                message: 'A doubt can have at most 8 unique tags.',
            },
        },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isAnonymous: { type: Boolean, default: false },
        status: { type: String, enum: STATUSES, default: 'OPEN' },
        assignedHelper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        developmentTestId: { type: String, trim: true, unique: true, sparse: true },
        duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt' },
        duplicateLinkCount: { type: Number, default: 0, min: 0 },
        flaggedForReview: { type: Boolean, default: false, index: true },
        flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        flaggedAt: Date,
        ratings: {
            type: [{
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                value: { type: Number, required: true, min: 1, max: 5 },
                updatedAt: { type: Date, default: Date.now },
            }],
            default: [],
        },
        ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
        ratingCount: { type: Number, min: 0, default: 0 },
    },
    { timestamps: true }
);

doubtSchema.index({ title: 'text', description: 'text' });
doubtSchema.index({ author: 1, createdAt: -1 });
doubtSchema.index({ course: 1, topic: 1, createdAt: -1 });
doubtSchema.index({ status: 1, createdAt: -1 });
doubtSchema.index({ 'ratings.user': 1 });

export default mongoose.models.Doubt || mongoose.model('Doubt', doubtSchema);
