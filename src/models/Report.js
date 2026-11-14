import mongoose from 'mongoose';

const decisionSchema = new mongoose.Schema(
    {
        moderator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: { type: String, enum: ['FLAGGED', 'RESOLVED', 'DISMISSED'], required: true },
        reason: { type: String, trim: true, maxlength: 1000, default: '' },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const reportSchema = new mongoose.Schema(
    {
        targetType: { type: String, enum: ['doubt', 'answer'], required: true, index: true },
        target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reasonCategory: { type: String, enum: ['INCORRECT', 'HARASSMENT', 'SPAM', 'PRIVACY', 'DUPLICATE', 'OTHER'], default: 'OTHER' },
        reason: { type: String, required: true, trim: true, maxlength: 120 },
        details: { type: String, trim: true, maxlength: 2000, default: '' },
        status: { type: String, enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN', index: true },
        handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decisionNote: { type: String, trim: true, maxlength: 1000, default: '' },
        resolvedAt: Date,
        decisionHistory: { type: [decisionSchema], default: [] },
    },
    { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ status: 1, targetType: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, targetType: 1, target: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, target: 1 }, { unique: true, partialFilterExpression: { status: 'OPEN' }, name: 'unique_open_content_report' });

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
