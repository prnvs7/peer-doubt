import mongoose from 'mongoose';
import connectDB from '../src/lib/db.js';
import Answer from '../src/models/Answer.js';
import AnswerFeedback from '../src/models/AnswerFeedback.js';
import Doubt from '../src/models/Doubt.js';
import KnowledgeEntry from '../src/models/KnowledgeEntry.js';
import KnowledgeBookmark from '../src/models/KnowledgeBookmark.js';
import ModerationLog from '../src/models/ModerationLog.js';
import Notification from '../src/models/Notification.js';
import Report from '../src/models/Report.js';
import {
    assertDevelopmentSeedAllowed,
    TEST_ANSWER,
    TEST_DESCRIPTION,
    TEST_ID,
    TEST_TITLE,
} from './development-scenario.mjs';

async function cleanup() {
    const database = assertDevelopmentSeedAllowed();
    await connectDB();
    if (mongoose.connection.db.databaseName !== database) {
        throw new Error('Connected database does not match the configured database; no records were changed.');
    }

    const doubts = await Doubt.find({ developmentTestId: TEST_ID, title: TEST_TITLE, description: TEST_DESCRIPTION })
        .select('_id')
        .limit(2)
        .lean();
    if (doubts.length === 0) {
        console.log(`No marked development scenario exists in ${database}; nothing was deleted.`);
        return;
    }
    if (doubts.length !== 1) throw new Error('More than one marked test doubt exists; cleanup stopped without deleting anything.');

    const doubtId = doubts[0]._id;
    const answers = await Answer.find({ doubt: doubtId }).select('_id content developmentTestId').lean();
    if (answers.some((answer) => answer.content !== TEST_ANSWER || answer.developmentTestId !== TEST_ID)) {
        throw new Error('The test doubt has non-test answers; cleanup stopped without deleting anything.');
    }
    if (answers.length > 1) throw new Error('More than one answer is attached to the test doubt; cleanup stopped without deleting anything.');

    const answerIds = answers.map((answer) => answer._id);
    const referencedByReport = await Report.exists({
        $or: [
            { targetType: 'doubt', target: doubtId },
            { targetType: 'answer', target: { $in: answerIds } },
        ],
    });
    if (referencedByReport) {
        throw new Error('A report refers to the test content; resolve that report before cleaning up. No records were deleted.');
    }

    const entries = await KnowledgeEntry.find({ $or: [{ doubt: doubtId }, { answer: { $in: answerIds } }] }).select('_id').lean();
    const entryIds = entries.map((entry) => entry._id);
    await Promise.all([
        KnowledgeBookmark.deleteMany({ entry: { $in: entryIds } }),
        Notification.deleteMany({ $or: [{ doubt: doubtId }, { answer: { $in: answerIds } }] }),
        AnswerFeedback.deleteMany({ answer: { $in: answerIds } }),
        KnowledgeEntry.deleteMany({ _id: { $in: entryIds } }),
    ]);
    await ModerationLog.deleteMany({
        $or: [
            { entityType: 'doubt', entityId: doubtId },
            { entityType: 'answer', entityId: { $in: answerIds } },
        ],
    });
    if (answerIds.length) await Answer.deleteMany({ _id: { $in: answerIds }, doubt: doubtId, developmentTestId: TEST_ID, content: TEST_ANSWER });
    await Doubt.deleteOne({ _id: doubtId, developmentTestId: TEST_ID, title: TEST_TITLE, description: TEST_DESCRIPTION });
    console.log(`Removed the marked development doubt, its test answer, and generated knowledge/audit records from ${database}. User records were not changed.`);
}

cleanup()
    .catch((error) => {
        console.error(error.message || 'Development cleanup failed.');
        if (error.name && !error.message?.startsWith('More than') && !error.message?.startsWith('The test doubt') && !error.message?.startsWith('A report')) {
            console.error(`Database error type: ${error.name}${error.code ? ` (${error.code})` : ''}`);
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
