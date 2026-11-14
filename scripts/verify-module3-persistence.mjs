import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import connectDB from '../src/lib/db.js';
import Answer from '../src/models/Answer.js';
import AnswerFeedback from '../src/models/AnswerFeedback.js';
import Doubt from '../src/models/Doubt.js';
import KnowledgeBookmark from '../src/models/KnowledgeBookmark.js';
import KnowledgeEntry from '../src/models/KnowledgeEntry.js';
import ModerationLog from '../src/models/ModerationLog.js';
import Notification from '../src/models/Notification.js';
import Report from '../src/models/Report.js';

const TEST_ID = `MODULE3_VERIFY_${randomUUID().replaceAll('-', '')}`;
const database = process.env.MONGODB_DB?.trim();
const host = process.env.MONGODB_URI?.match(/^mongodb\+srv:\/\/([^/?]+)/i)?.[1]?.split('@').at(-1)?.toLowerCase();
if (!process.argv.includes('--confirm-module3-test')) throw new Error('Pass --confirm-module3-test to create temporary persistence records.');
if (process.env.NODE_ENV === 'production' || process.env.VERCEL || database !== 'Doubt' || host !== 'cluster28.b2j4hk4.mongodb.net')
    throw new Error('This verification is restricted to the configured non-production Doubt database.');

const id = () => new mongoose.Types.ObjectId();
const student = id(), helper = id(), moderator = id();
const doubtTestId = `${TEST_ID}_DOUBT`, answerTestId = `${TEST_ID}_ANSWER`;
let doubt, answer, entry, report;

async function verify() {
    await connectDB();
    assert.equal(mongoose.connection.db.databaseName, database);
    doubt = await Doubt.create({
        developmentTestId: doubtTestId, title: 'Module 3 persistence verification',
        description: `Temporary database smoke test ${TEST_ID}.`, course: 'OS', topic: 'Deadlocks',
        author: student, status: 'VERIFIED',
    });
    answer = await Answer.create({
        developmentTestId: answerTestId, doubt: doubt._id, helper, content: `Temporary answer ${TEST_ID}.`,
        status: 'VERIFIED', verifiedBy: moderator,
        moderationHistory: [{ moderator, action: 'VERIFIED', createdAt: new Date() }],
    });

    const entryValues = {
        answer: answer._id, doubt: doubt._id, verifiedBy: moderator, verifiedAt: new Date(),
        title: doubt.title, course: doubt.course, topic: doubt.topic, question: doubt.description,
        answerContent: answer.content, status: 'ARCHIVED', archivedBy: moderator, archivedAt: new Date(), archiveReason: TEST_ID,
    };
    entry = await KnowledgeEntry.findOneAndUpdate({ answer: answer._id }, { $setOnInsert: entryValues }, { upsert: true, returnDocument: 'after' });
    await KnowledgeEntry.findOneAndUpdate({ answer: answer._id }, { $setOnInsert: entryValues }, { upsert: true, returnDocument: 'after' });
    assert.equal(await KnowledgeEntry.countDocuments({ answer: answer._id }), 1, 'verified answer publication must be unique');

    await Doubt.findByIdAndUpdate(doubt._id, [
        { $set: { ratings: { $concatArrays: [{ $filter: { input: { $ifNull: ['$ratings', []] }, as: 'rating', cond: { $ne: ['$$rating.user', student] } } }, [{ user: student, value: 5, updatedAt: new Date() }]] } } },
        { $set: { ratingCount: { $size: '$ratings' }, ratingAverage: { $round: [{ $avg: { $map: { input: '$ratings', as: 'rating', in: '$$rating.value' } } }, 2] } } },
    ], { updatePipeline: true });
    const rating = await Doubt.findById(doubt._id).select('ratingCount ratingAverage').lean();
    assert.equal(rating.ratingCount, 1);
    assert.equal(rating.ratingAverage, 5);

    await AnswerFeedback.create({ answer: answer._id, user: student, helpful: true });
    await assert.rejects(AnswerFeedback.create({ answer: answer._id, user: student, helpful: false }), (error) => error.code === 11000);
    await KnowledgeBookmark.create({ user: student, entry: entry._id });
    await assert.rejects(KnowledgeBookmark.create({ user: student, entry: entry._id }), (error) => error.code === 11000);
    const notification = { recipient: student, type: 'ANSWER_VERIFIED', doubt: doubt._id, answer: answer._id, message: 'Temporary notification test.', href: `/doubts/${doubt._id}`, dedupeKey: `${TEST_ID}:${student}` };
    await Notification.updateOne({ recipient: student, dedupeKey: notification.dedupeKey }, { $setOnInsert: notification }, { upsert: true });
    await Notification.updateOne({ recipient: student, dedupeKey: notification.dedupeKey }, { $setOnInsert: notification }, { upsert: true });
    assert.equal(await Notification.countDocuments({ recipient: student, dedupeKey: notification.dedupeKey }), 1);
    await Notification.updateOne({ recipient: student, dedupeKey: `${TEST_ID}:${student}` }, { $set: { readAt: new Date() } });
    assert.ok(await Notification.exists({ recipient: student, dedupeKey: `${TEST_ID}:${student}`, readAt: { $ne: null } }));

    report = await Report.create({ targetType: 'doubt', target: doubt._id, reporter: student, reasonCategory: 'OTHER', reason: 'Temporary persistence test', details: TEST_ID });
    await assert.rejects(Report.create({ targetType: 'doubt', target: doubt._id, reporter: student, reasonCategory: 'OTHER', reason: 'Temporary duplicate', details: TEST_ID }), (error) => error.code === 11000);
    await ModerationLog.create({ entityType: 'answer', entityId: answer._id, action: 'VERIFIED', moderator, idempotencyKey: `${TEST_ID}:moderation` });
    await Answer.findOneAndUpdate({ _id: answer._id, status: 'VERIFIED' }, { $set: { status: 'REVISION_REQUESTED' }, $push: { revisions: { content: answer.content, editedBy: helper } } });
    await Answer.findOneAndUpdate({ _id: answer._id, status: 'REVISION_REQUESTED' }, { $set: { content: `Revised ${TEST_ID}`, status: 'PENDING' } });
    assert.equal((await Answer.findById(answer._id).lean()).revisions.length, 1);
    console.log(JSON.stringify({ database, checks: ['knowledge upsert uniqueness', 'rating aggregation', 'unique helpful votes', 'personal bookmarks', 'notification read state', 'duplicate report prevention', 'moderation audit', 'answer revision persistence'], cleanup: 'temporary records removed in finally' }, null, 2));
}

try {
    await verify();
} finally {
    try {
        const cleanup = await Promise.allSettled([
            Notification.deleteMany({ recipient: student, dedupeKey: `${TEST_ID}:${student}` }),
            AnswerFeedback.deleteMany({ answer: answer?._id, user: student }),
            KnowledgeBookmark.deleteMany({ user: student, entry: entry?._id }),
            Report.deleteOne({ _id: report?._id, details: TEST_ID }),
            ModerationLog.deleteMany({ idempotencyKey: `${TEST_ID}:moderation` }),
            KnowledgeEntry.deleteOne({ _id: entry?._id, answer: answer?._id, archiveReason: TEST_ID }),
            Answer.deleteOne({ _id: answer?._id, developmentTestId: answerTestId }),
            Doubt.deleteOne({ _id: doubt?._id, developmentTestId: doubtTestId }),
        ]);
        const cleanupErrors = cleanup.filter((result) => result.status === 'rejected');
        if (cleanupErrors.length) throw new AggregateError(cleanupErrors.map(({ reason }) => reason), 'Temporary Module 3 records could not all be removed.');
        const residue = await Promise.all([
            Doubt.countDocuments({ developmentTestId: doubtTestId }),
            Answer.countDocuments({ developmentTestId: answerTestId }),
            KnowledgeEntry.countDocuments({ answer: answer?._id, archiveReason: TEST_ID }),
            Report.countDocuments({ _id: report?._id, details: TEST_ID }),
            ModerationLog.countDocuments({ idempotencyKey: `${TEST_ID}:moderation` }),
            Notification.countDocuments({ recipient: student, dedupeKey: `${TEST_ID}:${student}` }),
            AnswerFeedback.countDocuments({ answer: answer?._id, user: student }),
            KnowledgeBookmark.countDocuments({ user: student, entry: entry?._id }),
        ]);
        if (residue.some(Boolean)) throw new Error(`Temporary Module 3 cleanup left records behind: ${residue.join(', ')}`);
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    }
}
