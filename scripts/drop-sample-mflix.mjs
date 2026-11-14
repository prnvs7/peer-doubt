import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { BSON, MongoClient } from 'mongodb';

const TARGET_DATABASE = 'sample_mflix';
const PROJECT_DATABASE = 'Doubt';
const EXPECTED_HOST = 'cluster28.b2j4hk4.mongodb.net';
const EXPECTED_COLLECTIONS = new Set(['comments', 'embedded_movies', 'movies', 'sessions', 'theaters', 'users']);
const PROJECT_COLLECTIONS = new Set(['doubts', 'answers', 'knowledgeentries', 'reports', 'moderationlogs']);
const PROJECT_FIELDS = new Set([
    'passwordHash', 'roles', 'helperProfile', 'assignedHelper', 'developmentTestId', 'author',
    'helper', 'doubt', 'isAnonymous', 'duplicateOf', 'ratings', 'ratingAverage', 'verifiedBy',
    'moderationHistory', 'targetType', 'decisionHistory', 'idempotencyKey', 'answerContent',
    'course', 'topic', 'moderator', 'reporter',
]);

function atlasHost(uri) {
    const scheme = uri.match(/^mongodb\+srv:\/\//i)?.[0];
    if (!scheme) throw new Error('MONGODB_URI must use the existing Atlas SRV connection.');
    const authority = uri.slice(scheme.length).split(/[/?#]/, 1)[0];
    return authority.slice(authority.lastIndexOf('@') + 1).toLowerCase();
}

function sha256File(path) {
    return new Promise((resolveHash, reject) => {
        const hash = createHash('sha256');
        const input = createReadStream(path);
        input.on('error', reject);
        input.on('data', (chunk) => hash.update(chunk));
        input.on('end', () => resolveHash(hash.digest('hex')));
    });
}

async function verifyEjsonGzip(path) {
    const input = createReadStream(path).pipe(createGunzip());
    const lines = createInterface({ input, crlfDelay: Infinity });
    let count = 0;
    for await (const line of lines) {
        if (!line) continue;
        BSON.EJSON.parse(line);
        count += 1;
    }
    return count;
}

async function assertNoProjectFields(collection, collectionName) {
    const projection = { _id: 0, ...Object.fromEntries([...PROJECT_FIELDS].map((field) => [field, 1])) };
    for await (const document of collection.find({}, { projection, batchSize: 1000 })) {
        const fields = Object.keys(document);
        if (fields.length) throw new Error(`Collection ${collectionName} has project-shaped fields; database removal stopped.`);
    }
}

async function verifyBackup(backupDirectory, host) {
    const manifestPath = join(backupDirectory, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (!manifest.verified || manifest.database !== TARGET_DATABASE || manifest.clusterHost !== host) {
        throw new Error('The backup manifest is not verified for this Atlas database.');
    }
    const backupAgeMs = Date.now() - Date.parse(manifest.createdAt);
    if (!Number.isFinite(backupAgeMs) || backupAgeMs < 0 || backupAgeMs > 24 * 60 * 60 * 1000) {
        throw new Error('The verified backup is older than 24 hours or has an invalid timestamp.');
    }

    const metadataPath = join(backupDirectory, manifest.metadataFile);
    if (basename(manifest.metadataFile) !== manifest.metadataFile
        || await sha256File(metadataPath) !== manifest.metadataSha256) {
        throw new Error('The collection metadata backup failed checksum verification.');
    }
    BSON.EJSON.parse(await readFile(metadataPath, 'utf8'));

    for (const collection of manifest.collections) {
        if (basename(collection.file) !== collection.file || !EXPECTED_COLLECTIONS.has(collection.name)) {
            throw new Error('The backup contains an unexpected collection path or name.');
        }
        const filePath = join(backupDirectory, collection.file);
        if (await sha256File(filePath) !== collection.sha256) {
            throw new Error(`The backup checksum failed for ${collection.name}.`);
        }
        const fileInfo = await stat(filePath);
        if (fileInfo.size !== collection.bytes) throw new Error(`The backup size check failed for ${collection.name}.`);
        if (await verifyEjsonGzip(filePath) !== collection.documents) {
            throw new Error(`The backup document check failed for ${collection.name}.`);
        }
    }
    return manifest;
}

async function main() {
    if (!process.argv.includes('--confirm-drop-sample-mflix')) {
        throw new Error('Pass --confirm-drop-sample-mflix to remove the backed-up sample_mflix database.');
    }
    const backupArgument = process.argv.find((value) => value.startsWith('--backup-directory='));
    if (!backupArgument) throw new Error('Provide --backup-directory with the verified local backup path.');

    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI is required.');
    if (process.env.MONGODB_DB?.trim() !== PROJECT_DATABASE) {
        throw new Error(`MONGODB_DB must remain ${PROJECT_DATABASE} while removing sample_mflix.`);
    }
    const host = atlasHost(uri);
    if (host !== EXPECTED_HOST) throw new Error('The URI does not target the verified existing Atlas host.');

    const backupDirectory = resolve(backupArgument.slice('--backup-directory='.length));
    const manifest = await verifyBackup(backupDirectory, host);
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000 });
    try {
        await client.connect();
        const admin = client.db('admin').admin();
        const visibleDatabases = await admin.listDatabases({ nameOnly: true, authorizedDatabases: true });
        const wasVisible = visibleDatabases.databases.some(({ name }) => name === TARGET_DATABASE);
        const database = client.db(TARGET_DATABASE);
        const collectionInfo = await database.listCollections({}, { nameOnly: false }).toArray();
        const names = collectionInfo.map(({ name }) => name).sort();
        const backupNames = manifest.collections.map(({ name }) => name).sort();

        if (!wasVisible || names.length !== backupNames.length || names.some((name, index) => name !== backupNames[index])) {
            throw new Error('The live sample_mflix collection set no longer matches the verified backup.');
        }
        const unexpectedNames = names.filter((name) => !EXPECTED_COLLECTIONS.has(name) || PROJECT_COLLECTIONS.has(name));
        if (unexpectedNames.length) throw new Error('The live database contains an unexpected or project collection.');

        for (const saved of manifest.collections) {
            const collection = database.collection(saved.name);
            if (await collection.countDocuments({}) !== saved.documents) {
                throw new Error(`The live document count changed for ${saved.name}; database removal stopped.`);
            }
            await assertNoProjectFields(collection, saved.name);
        }

        const dropResult = await database.dropDatabase();
        const remainingCollections = await database.listCollections({}, { nameOnly: true }).toArray();
        const after = await admin.listDatabases({ nameOnly: true, authorizedDatabases: true });
        const stillListed = after.databases.some(({ name }) => name === TARGET_DATABASE);
        if (remainingCollections.length || stillListed || !dropResult?.ok) {
            throw new Error('Atlas did not confirm that sample_mflix was fully removed.');
        }

        console.log(JSON.stringify({
            status: 'DROPPED AFTER VERIFIED BACKUP',
            clusterHost: host,
            database: TARGET_DATABASE,
            collectionsRemoved: backupNames,
            documentsBackedUp: manifest.collections.reduce((sum, collection) => sum + collection.documents, 0),
            backupDirectory,
            verifiedAbsentAfterDrop: true,
            projectDatabasePreserved: PROJECT_DATABASE,
        }, null, 2));
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error('sample_mflix removal failed; no other database was targeted.');
    console.error(JSON.stringify({ name: error?.name || 'Error', code: error?.code || undefined, codeName: error?.codeName || undefined }));
    process.exitCode = 1;
});
