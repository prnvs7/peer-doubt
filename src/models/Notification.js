import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ANSWER_SUBMITTED', 'ANSWER_VERIFIED', 'ANSWER_REJECTED', 'REVISION_REQUESTED', 'REPORT_RESOLVED', 'DUPLICATE_CONFIRMED', 'ANSWER_FEEDBACK'], required: true },
    doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt' },
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer' },
    message: { type: String, required: true, trim: true, maxlength: 240 },
    href: { type: String, required: true, match: /^\/(?!\/)/ },
    readAt: Date,
    dedupeKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
