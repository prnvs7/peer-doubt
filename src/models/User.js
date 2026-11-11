import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        roles: { type: [String], default: ['student'] }, // student | helper | cr | faculty
        helperProfile: {
            courses: { type: [String], default: [] },
            topics: { type: [String], default: [] },
            isWilling: { type: Boolean, default: false },
            reputation: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', userSchema);