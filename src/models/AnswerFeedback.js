import mongoose from 'mongoose';

const answerFeedbackSchema = new mongoose.Schema({
    answer: { type: mongoose.Schema.Types.ObjectId, ref: 'Answer', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    helpful: { type: Boolean, required: true },
    revision: { type: Number, default: 0 },
}, { timestamps: true });

answerFeedbackSchema.index({ answer: 1, user: 1 }, { unique: true });
answerFeedbackSchema.index({ answer: 1, helpful: 1 });

export default mongoose.models.AnswerFeedback || mongoose.model('AnswerFeedback', answerFeedbackSchema);
