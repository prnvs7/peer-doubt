import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        roles: { type: [String], default: ['student'] }, // admin is provisioned by an administrator; public registration cannot assign it.
        isSuspended: { type: Boolean, default: false, index: true },
        helperProfile: {
            courses: { type: [String], default: [] },
            topics: { type: [String], default: [] },
            isWilling: { type: Boolean, default: false },
            reputation: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

userSchema.index({ name: 'text', email: 'text' });

export default mongoose.models.User || mongoose.model('User', userSchema);
