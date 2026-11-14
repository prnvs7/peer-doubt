import mongoose from 'mongoose';
import connectDB from '../src/lib/db.js';
import User from '../src/models/User.js';
import Doubt from '../src/models/Doubt.js';
import Answer from '../src/models/Answer.js';

const marker = 'PEER_DOUBT_MODULE3_TEST_001';

async function inspect() {
    await connectDB();
    const [helper, moderator, student, markedDoubt, markedAnswer, previousScenario, titleCollision, collections, counts] = await Promise.all([
        User.findOne({ roles: 'helper', 'helperProfile.isWilling': true, 'helperProfile.courses': 'OS' }).select('_id').lean(),
        User.findOne({ roles: { $in: ['cr', 'faculty'] } }).select('_id roles').lean(),
        User.findOne({ roles: 'student' }).select('_id').lean(),
        Doubt.collection.findOne({ developmentTestId: marker }, { projection: { _id: 1, status: 1, assignedHelper: 1 } }),
        Answer.collection.findOne({ developmentTestId: marker }, { projection: { _id: 1, status: 1, doubt: 1, helper: 1 } }),
        Doubt.collection.findOne({ title: '[DEV TEST] P23 - Deadlock prevention in OS' }, { projection: { _id: 1, status: 1 } }),
        Doubt.collection.findOne({ title: 'Understanding Deadlock Prevention in Operating Systems' }, { projection: { _id: 1, status: 1 } }),
        mongoose.connection.db.listCollections().toArray(),
        Promise.all([
            User.countDocuments(),
            Doubt.countDocuments(),
            Answer.countDocuments(),
            mongoose.connection.db.collection('knowledgeentries').countDocuments(),
            mongoose.connection.db.collection('reports').countDocuments(),
            mongoose.connection.db.collection('moderationlogs').countDocuments(),
        ]),
    ]);

    console.log(JSON.stringify({
        database: mongoose.connection.db.databaseName,
        collections: collections.map((collection) => collection.name).sort(),
        projectRecordCounts: {
            users: counts[0],
            doubts: counts[1],
            answers: counts[2],
            knowledgeentries: counts[3],
            reports: counts[4],
            moderationlogs: counts[5],
        },
        helperId: helper?._id?.toString() || null,
        moderatorId: moderator?._id?.toString() || null,
        moderatorRoles: moderator?.roles || [],
        studentId: student?._id?.toString() || null,
        markedDoubt: markedDoubt ? { id: markedDoubt._id.toString(), status: markedDoubt.status } : null,
        markedAnswer: markedAnswer ? { id: markedAnswer._id.toString(), doubtId: markedAnswer.doubt?.toString(), status: markedAnswer.status } : null,
        previousAttempt: previousScenario ? { id: previousScenario._id.toString(), status: previousScenario.status } : null,
        exactTitleCollision: titleCollision ? { id: titleCollision._id.toString(), status: titleCollision.status } : null,
    }, null, 2));
}

inspect()
    .catch((error) => {
        console.error('Atlas inspection could not complete.');
        if (error.message) {
            const configuredUri = process.env.MONGODB_URI?.trim();
            const safeMessage = configuredUri ? error.message.replaceAll(configuredUri, '[redacted connection string]') : error.message;
            console.error(safeMessage);
        }
        if (error.name) console.error(`Database error type: ${error.name}${error.code ? ` (${error.code})` : ''}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
