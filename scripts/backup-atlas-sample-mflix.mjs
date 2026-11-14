import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';
import { BSON, MongoClient } from 'mongodb';

const DATABASE = 'sample_mflix';
const EXPECTED_HOST = 'cluster28.b2j4hk4.mongodb.net';
const EXPECTED_COLLECTIONS = new Set(['comments', 'embedded_movies', 'movies', 'sessions', 'theaters', 'users']);
const PROJECT_COLLECTIONS = new Set(['doubts', 'answers', 'knowledgeentries', 'reports', 'moderationlogs']);
const PROJECT_FIELDS = new Set([
    'passwordHash', 'roles', 'helperProfile', 'assignedHelper', 'developmentTestId', 'author',
    'helper', 'doubt', 'isAnonymous', 'duplicateOf', 'ratings', 'ratingAverage', 'verifiedBy',
    'moderationHistory', 'targetType', 'decisionHistory', 'idempotencyKey', 'answerContent',
    'course', 'topic', 'moderator', 'reporter',
]);
let backupDirectory;

function assertNoProjectFields(document, collectionName) {
    const projectFields = Object.keys(document || {}).filter((key) => PROJECT_FIELDS.has(key));
    if (projectFields.length) {
        throw new Error(`Collection ${collectionName} contains project-shaped fields; manual review is required.`);
    }
}

function atlasHost(uri) {
    const scheme = uri.match(/^mongodb\+srv:\/\//i)?.[0];
    if (!scheme) throw new Error('MONGODB_URI must use the existing Atlas SRV connection.');
    const authority = uri.slice(scheme.length).split(/[/?#]/, 1)[0];
    return authority.slice(authority.lastIndexOf('@') + 1).toLowerCase();
}

function sha256File(path) {
    return new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const input = createReadStream(path);
        input.on('error', reject);
        input.on('data', (chunk) => hash.update(chunk));
        input.on('end', () => resolve(hash.digest('hex')));
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

async function main() {
    if (!process.argv.includes('--confirm-backup')) {
        throw new Error('Pass --confirm-backup to export the sample_mflix database to a local backup.');
    }

    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI is required.');
    const host = atlasHost(uri);
    if (host !== EXPECTED_HOST) throw new Error('The URI does not target the verified existing Atlas host.');

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000 });
    try {
        await client.connect();
        const database = client.db(DATABASE);
        const collections = await database.listCollections({}, { nameOnly: false }).toArray();
        const names = collections.map(({ name }) => name).sort();
        const unexpected = names.filter((name) => !EXPECTED_COLLECTIONS.has(name));
        if (unexpected.length || [...names].some((name) => PROJECT_COLLECTIONS.has(name))) {
            throw new Error(`sample_mflix has collections outside the recognized movie-demo structure: ${unexpected.join(', ') || 'project collection detected'}.`);
        }
        if (!names.length) throw new Error('sample_mflix is already empty; nothing was backed up.');

        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const root = join(tmpdir(), 'unstuck-atlas-backups');
        backupDirectory = join(root, `${DATABASE}_${stamp}`);
        await mkdir(backupDirectory, { recursive: true, mode: 0o700 });

        const manifestCollections = [];
        const metadata = [];
        for (const info of collections) {
            if (info.type && info.type !== 'collection') {
                throw new Error(`Collection ${info.name} is a ${info.type}; export stopped before database removal.`);
            }

            const collection = database.collection(info.name);
            const expectedCount = await collection.countDocuments({});
            const indexes = await collection.listIndexes().toArray();
            const file = `${info.name}.ejsonl.gz`;
            const path = join(backupDirectory, file);
            let copiedCount = 0;
            const documents = (async function* exportDocuments() {
                for await (const document of collection.find({}, { batchSize: 500 })) {
                    assertNoProjectFields(document, info.name);
                    copiedCount += 1;
                    yield `${BSON.EJSON.stringify(document, { relaxed: false })}\n`;
                }
            }());

            await pipeline(Readable.from(documents), createGzip({ level: 6 }), createWriteStream(path, { flags: 'wx' }));

            const countAfterExport = await collection.countDocuments({});
            if (copiedCount !== expectedCount || countAfterExport !== expectedCount) {
                throw new Error(`Collection ${info.name} changed during backup; removal is not safe.`);
            }

            const verifiedCount = await verifyEjsonGzip(path);
            if (verifiedCount !== expectedCount) throw new Error(`Backup verification count failed for ${info.name}.`);

            const digest = await sha256File(path);
            const fileInfo = await stat(path);
            manifestCollections.push({ name: info.name, file, documents: expectedCount, bytes: fileInfo.size, sha256: digest });
            metadata.push({ name: info.name, options: info.options || {}, indexes });
        }

        const metadataPath = join(backupDirectory, 'collection-metadata.ejson.json');
        await writeFile(metadataPath, BSON.EJSON.stringify(metadata, { relaxed: false, space: 2 }), { flag: 'wx', mode: 0o600 });
        const metadataHash = await sha256File(metadataPath);
        const manifest = {
            database: DATABASE,
            clusterHost: host,
            createdAt: new Date().toISOString(),
            metadataFile: 'collection-metadata.ejson.json',
            metadataSha256: metadataHash,
            collections: manifestCollections,
            verified: true,
        };
        await writeFile(join(backupDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });

        // Re-read the manifest and metadata so later drop tooling has a validated inventory.
        const savedManifest = JSON.parse(await readFile(join(backupDirectory, 'manifest.json'), 'utf8'));
        if (savedManifest.clusterHost !== host || savedManifest.database !== DATABASE || !savedManifest.verified) {
            throw new Error('Backup manifest verification failed.');
        }
        if (await sha256File(metadataPath) !== savedManifest.metadataSha256) throw new Error('Backup metadata checksum verification failed.');

        console.log(JSON.stringify({
            status: 'BACKUP VERIFIED',
            database: DATABASE,
            clusterHost: host,
            backupDirectory,
            collections: manifestCollections.map(({ name, documents, bytes }) => ({ name, documents, bytes })),
            metadata: 'options and index definitions included',
            documentFormat: 'MongoDB Extended JSON, gzip compressed, parsed back successfully',
        }, null, 2));
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error('Atlas backup failed; no database data was changed.');
    const safeMessage = typeof error?.message === 'string'
        ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s'\"]+/gi, '[MongoDB URI redacted]')
        : undefined;
    console.error(JSON.stringify({
        name: error?.name || 'Error',
        code: error?.code || undefined,
        codeName: error?.codeName || undefined,
        message: safeMessage,
        partialBackupDirectory: backupDirectory,
    }));
    process.exitCode = 1;
});
