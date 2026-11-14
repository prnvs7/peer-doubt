import mongoose from 'mongoose';

const knowledgeBookmarkSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entry: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeEntry', required: true },
}, { timestamps: true });

knowledgeBookmarkSchema.index({ user: 1, entry: 1 }, { unique: true });
knowledgeBookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.KnowledgeBookmark || mongoose.model('KnowledgeBookmark', knowledgeBookmarkSchema);
