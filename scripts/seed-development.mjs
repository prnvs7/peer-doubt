import mongoose from 'mongoose';
import connectDB from '../src/lib/db.js';
import User from '../src/models/User.js';
import Doubt from '../src/models/Doubt.js';
import Answer from '../src/models/Answer.js';
import {
    assertDevelopmentSeedAllowed,
    COURSE,
    TEST_ANSWER,
    TEST_DESCRIPTION,
    TEST_ID,
    TEST_TAGS,
    TEST_TITLE,
    TOPIC,
} from './development-scenario.mjs';

const PROJECT_COLLECTIONS = new Set([
    'users',
    'doubts',
    'answers',
    'answerfeedbacks',
    'knowledgeentries',
    'knowledgebookmarks',
    'notifications',
    'reports',
    'moderationlogs',
]);

function reportScenario({ inserted, database, doubt, answer }) {
    console.log(JSON.stringify({
        inserted,
        database,
        collections: ['users', 'doubts', 'answers'],
        testId: TEST_ID,
        doubtId: doubt?._id?.toString() || null,
        answerId: answer?._id?.toString() || null,
        doubtStatus: doubt?.status || null,
        answerStatus: answer?.status || null,
        linkedAnswerCount: doubt ? 1 : 0,
    }, null, 2));
}

async function validateExisting(database, doubt, answer) {
    if (doubt.title !== TEST_TITLE
        || doubt.description !== TEST_DESCRIPTION
        || doubt.course !== COURSE
        || doubt.topic !== TOPIC
        || JSON.stringify([...(doubt.tags || [])].sort()) !== JSON.stringify([...TEST_TAGS].sort())
        || doubt.developmentTestId !== TEST_ID) {
        throw new Error('The marked doubt does not match this scenario; no records were changed.');
    }

    const [author, assignedHelper, linkedAnswers] = await Promise.all([
        User.findOne({ _id: doubt.author, roles: 'student' }).select('_id').lean(),
        User.findOne({
            _id: doubt.assignedHelper,
            roles: 'helper',
            'helperProfile.isWilling': true,
            'helperProfile.courses': COURSE,
        }).select('_id').lean(),
        Answer.find({ doubt: doubt._id }).lean(),
    ]);
    if (!author || !assignedHelper)
        throw new Error('The marked doubt no longer references valid student/helper accounts; no records were changed.');
    if (linkedAnswers.length > 1) {
        throw new Error('More than one answer is linked to the marked doubt; no records were changed.');
    }

    if (!answer && linkedAnswers.length === 0 && doubt.status === 'ANSWERED' && doubt.assignedHelper) {
        answer = await Answer.create({
            doubt: doubt._id,
            helper: assignedHelper._id,
            developmentTestId: TEST_ID,
            content: TEST_ANSWER,
            status: 'PENDING',
        });
        reportScenario({ inserted: true, database, doubt, answer });
        return;
    }

    if (!answer || linkedAnswers.length !== 1 || linkedAnswers[0]._id.toString() !== answer._id.toString()) {
        throw new Error('The marked doubt and answer are incomplete or inconsistent; no records were changed.');
    }
    if (answer.developmentTestId !== TEST_ID
        || answer.doubt.toString() !== doubt._id.toString()
        || answer.helper.toString() !== doubt.assignedHelper?.toString()
        || answer.content !== TEST_ANSWER) {
        throw new Error('The marked answer does not match its doubt/helper/content; no records were changed.');
    }

    reportScenario({
        inserted: false,
        database,
        doubt,
        answer,
    });
}

async function seed() {
    const database = assertDevelopmentSeedAllowed();
    await connectDB();
    if (mongoose.connection.db.databaseName !== database) {
        throw new Error('Connected database does not match the configured database; no records were changed.');
    }
    const currentCollections = await mongoose.connection.db.listCollections().toArray();
    const unexpectedCollections = currentCollections
        .map((collection) => collection.name)
        .filter((name) => !name.startsWith('system.') && !PROJECT_COLLECTIONS.has(name));
    const populatedUnexpectedCollections = [];
    for (const name of unexpectedCollections) {
        if (await mongoose.connection.db.collection(name).countDocuments() > 0) {
            populatedUnexpectedCollections.push(name);
        }
    }
    if (populatedUnexpectedCollections.length) {
        throw new Error(`Target database contains populated non-project collections (${populatedUnexpectedCollections.join(', ')}); no records were changed. Back up and inspect before cleanup.`);
    }

    const [markedDoubts, markedAnswers, legacyScenario, titleCollision] = await Promise.all([
        Doubt.find({ developmentTestId: TEST_ID }).limit(2),
        Answer.find({ developmentTestId: TEST_ID }).limit(2),
        Doubt.findOne({
            title: { $in: ['[DEV TEST] P23 - Deadlock prevention in OS', 'Understanding Deadlock Prevention in Operating Systems'] },
            developmentTestId: { $ne: TEST_ID },
        }).select('_id'),
        Doubt.findOne({ title: TEST_TITLE, developmentTestId: { $ne: TEST_ID } }).select('_id'),
    ]);
    if (markedDoubts.length > 1 || markedAnswers.length > 1) {
        throw new Error('Multiple records already use the test identifier; no records were changed.');
    }
    const markedDoubt = markedDoubts[0] || null;
    const markedAnswer = markedAnswers[0] || null;

    if (legacyScenario && !markedDoubt) {
        throw new Error('A prior P23 development doubt already exists. No second scenario was inserted.');
    }
    if (titleCollision && !markedDoubt) {
        throw new Error('A doubt already uses the requested title without the test identifier; no records were changed.');
    }
    if (markedAnswer && !markedDoubt) {
        throw new Error('A marked test answer exists without its doubt; no records were changed.');
    }

    if (markedDoubt) {
        const moderator = await User.findOne({
            roles: { $in: ['cr', 'faculty'] },
            _id: { $ne: markedDoubt.assignedHelper },
        }).select('_id roles').lean();
        if (!moderator) throw new Error('No existing CR or faculty account can review this helper\'s answer; no records were changed.');
        await validateExisting(database, markedDoubt, markedAnswer);
        return;
    }

    const helper = await User.findOne({
        roles: 'helper',
        'helperProfile.isWilling': true,
        'helperProfile.courses': COURSE,
    }).select('_id').lean();
    if (!helper) throw new Error('No existing willing OS helper account was found; no records were inserted.');
    const moderator = await User.findOne({
        roles: { $in: ['cr', 'faculty'] },
        _id: { $ne: helper._id },
    }).select('_id roles').lean();
    if (!moderator) throw new Error('No existing CR or faculty account was found; no records were inserted.');

    const author = await User.findOne({
        roles: 'student',
        _id: { $nin: [helper._id, moderator._id] },
    }).select('_id').lean();
    if (!author) throw new Error('No existing student account can author the test doubt; no records were inserted.');

    const doubt = await Doubt.create({
        developmentTestId: TEST_ID,
        title: TEST_TITLE,
        description: TEST_DESCRIPTION,
        course: COURSE,
        topic: TOPIC,
        tags: TEST_TAGS,
        author: author._id,
        isAnonymous: false,
        status: 'ANSWERED',
        assignedHelper: helper._id,
    });

    let answer;
    try {
        answer = await Answer.create({
            developmentTestId: TEST_ID,
            doubt: doubt._id,
            helper: helper._id,
            content: TEST_ANSWER,
            status: 'PENDING',
        });
    } catch (error) {
        throw new Error(`Doubt ${doubt._id} was inserted, but its answer was not confirmed. Rerun the idempotent seed after fixing the database issue. (${error.name || 'Database error'})`);
    }

    reportScenario({ inserted: true, database, doubt, answer });
}

seed()
    .catch((error) => {
        console.error(error.message || 'Development seeding failed.');
        if (error.name && error.name !== 'Error') {
            console.error(`Database error type: ${error.name}${error.code ? ` (${error.code})` : ''}`);
        }
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
