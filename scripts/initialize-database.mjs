import mongoose from 'mongoose';
import connectDB from '../src/lib/db.js';

const EXPECTED_DATABASE = 'Doubt';
const EXPECTED_ATLAS_HOST = 'cluster28.b2j4hk4.mongodb.net';

function getAtlasHost(uri) {
    const scheme = uri.match(/^mongodb\+srv:\/\//i)?.[0];
    if (!scheme) throw new Error('MONGODB_URI must use the existing Atlas SRV connection.');

    const authority = uri.slice(scheme.length).split(/[/?#]/, 1)[0];
    return authority.slice(authority.lastIndexOf('@') + 1).toLowerCase();
}

function errorDetails(error) {
    return {
        name: error?.name || 'Error',
        code: error?.code || error?.cause?.code || undefined,
        codeName: error?.codeName || undefined,
    };
}

async function collectionNames(database) {
    return (await database.listCollections({}, { nameOnly: true }).toArray())
        .map(({ name }) => name)
        .sort();
}

async function indexNames(database, collectionName) {
    return (await database.collection(collectionName).listIndexes().toArray())
        .map(({ name }) => name)
        .sort();
}

async function main() {
    const uri = process.env.MONGODB_URI?.trim();
    const configuredDatabase = process.env.MONGODB_DB?.trim();
    if (!uri) throw new Error('MONGODB_URI is required.');
    if (configuredDatabase !== EXPECTED_DATABASE) {
        throw new Error(`MONGODB_DB must be ${EXPECTED_DATABASE} for this initialization.`);
    }

    const atlasHost = getAtlasHost(uri);
    if (atlasHost !== EXPECTED_ATLAS_HOST) {
        throw new Error('MONGODB_URI does not target the verified existing Atlas host.');
    }

    // Initialization is explicit below; prevent model compilation from starting
    // implicit collection/index work before the script can report it.
    mongoose.set('autoCreate', false);
    mongoose.set('autoIndex', false);

    const [User, Doubt, Answer, AnswerFeedback, KnowledgeEntry, KnowledgeBookmark, Notification, Report, ModerationLog] = await Promise.all([
        import('../src/models/User.js'),
        import('../src/models/Doubt.js'),
        import('../src/models/Answer.js'),
        import('../src/models/AnswerFeedback.js'),
        import('../src/models/KnowledgeEntry.js'),
        import('../src/models/KnowledgeBookmark.js'),
        import('../src/models/Notification.js'),
        import('../src/models/Report.js'),
        import('../src/models/ModerationLog.js'),
    ]).then((models) => models.map(({ default: Model }) => Model));

    const models = [User, Doubt, Answer, AnswerFeedback, KnowledgeEntry, KnowledgeBookmark, Notification, Report, ModerationLog];
    await connectDB();

    const connection = mongoose.connection;
    if (connection.db.databaseName !== EXPECTED_DATABASE) {
        throw new Error('Mongoose connected to an unexpected database; initialization stopped.');
    }

    const beforeCollections = await collectionNames(connection.db);
    const results = [];

    for (const Model of models) {
        const collectionName = Model.collection.collectionName;
        const existed = beforeCollections.includes(collectionName);
        if (!existed) {
            try {
                await Model.createCollection();
            } catch (error) {
                if (error?.code !== 48 && error?.codeName !== 'NamespaceExists') throw error;
            }
        }

        const beforeIndexes = await indexNames(connection.db, collectionName);
        await Model.createIndexes();
        const afterIndexes = await indexNames(connection.db, collectionName);

        results.push({
            model: Model.modelName,
            collection: collectionName,
            status: existed ? 'ALREADY EXISTS' : 'CREATED',
            indexesCreated: afterIndexes.filter((name) => !beforeIndexes.includes(name)),
            indexesPresent: afterIndexes,
        });
    }

    const afterCollections = await collectionNames(connection.db);
    const expectedCollections = models.map((Model) => Model.collection.collectionName).sort();
    const missingCollections = expectedCollections.filter((name) => !afterCollections.includes(name));
    if (missingCollections.length) {
        throw new Error(`Initialization verification failed for: ${missingCollections.join(', ')}.`);
    }

    console.log(JSON.stringify({
        clusterHost: atlasHost,
        database: connection.db.databaseName,
        connection: 'Mongoose connected',
        collections: results,
        existingUnmodeledCollectionsPreserved: beforeCollections.filter((name) => !expectedCollections.includes(name)),
        finalCollections: afterCollections,
        documentsInserted: 0,
        documentsDeleted: 0,
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('Database initialization failed; existing documents were not deleted or overwritten.');
        console.error(JSON.stringify(errorDetails(error)));
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    });
