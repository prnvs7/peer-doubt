import mongoose from 'mongoose';

export const STATUSES = ['OPEN', 'CLAIMED', 'ANSWERED', 'VERIFIED', 'DUPLICATE', 'REJECTED'];

const doubtSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 150 },
        description: { type: String, required: true, maxlength: 5000 },
        course: { type: String, required: true },
        topic: { type: String, required: true },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        isAnonymous: { type: Boolean, default: false },
        status: { type: String, enum: STATUSES, default: 'OPEN' },
        assignedHelper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt' },
    },
    { timestamps: true }
);

doubtSchema.index({ title: 'text', description: 'text' });
doubtSchema.index({ author: 1, createdAt: -1 });

export default mongoose.models.Doubt || mongoose.model('Doubt', doubtSchema);