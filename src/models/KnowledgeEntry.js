import mongoose from 'mongoose';

const knowledgeEntrySchema = new mongoose.Schema(
    {
        answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true, unique: true },
        doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        verifiedAt: { type: Date, required: true, default: Date.now },
        title: { type: String, required: true, trim: true },
        course: { type: String, required: true, index: true },
        topic: { type: String, required: true, index: true },
        question: { type: String, required: true },
        answerContent: { type: String, required: true },
        helpfulCount: { type: Number, default: 0, min: 0 },
        viewCount: { type: Number, default: 0, min: 0 },
        status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE', index: true },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archivedAt: Date,
        archiveReason: { type: String, trim: true, maxlength: 1000, default: '' },
    },
    { timestamps: true }
);

knowledgeEntrySchema.index({ course: 1, topic: 1, verifiedAt: -1 });
knowledgeEntrySchema.index({ status: 1, verifiedAt: -1 });
knowledgeEntrySchema.index({ status: 1, helpfulCount: -1, verifiedAt: -1 });
knowledgeEntrySchema.index({ status: 1, viewCount: -1, verifiedAt: -1 });
knowledgeEntrySchema.index({ title: 'text', question: 'text', answerContent: 'text', topic: 'text' });

export default mongoose.models.KnowledgeEntry || mongoose.model('KnowledgeEntry', knowledgeEntrySchema);
