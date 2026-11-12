import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema(
    {
        doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },
        helper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true, maxlength: 8000 },
        status: { type: String, enum: ['SUBMITTED', 'ACCEPTED', 'VERIFIED', 'REJECTED'], default: 'SUBMITTED' },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

export default mongoose.models.Answer || mongoose.model('Answer', answerSchema);