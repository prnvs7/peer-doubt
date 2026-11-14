import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI?.trim();
const configuredDatabase = process.env.MONGODB_DB?.trim() || 'Doubt';
const RELEVANT_DATABASES = [...new Set([configuredDatabase, 'Doubt', 'peer_doubt_app', 'test', 'sample_mflix'])];

function getAtlasHosts(connectionString) {
    const scheme = connectionString.match(/^mongodb(?:\+srv)?:\/\//i)?.[0];
    if (!scheme) return [];
    const authority = connectionString.slice(scheme.length).split(/[/?#]/, 1)[0];
    const hosts = authority.slice(authority.lastIndexOf('@') + 1);
    return hosts.split(',').filter(Boolean);
}

if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
}

async function inspectDatabase(dbName, client) {
    const db = client.db(dbName);
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionDetails = await Promise.all(collections.map(async ({ name }) => {
        try {
            const count = await db.collection(name).countDocuments({});
            return { name, documents: count };
        } catch (error) {
            return { name, documents: null, error: error.codeName || error.code || 'count unavailable' };
        }
    }));
    return { database: dbName, exists: collections.length > 0, collections: collectionDetails };
}

async function main() {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 10_000 });
    try {
        await client.connect();
        let visibleDatabaseNames = null;
        try {
            const result = await client.db('admin').admin().listDatabases({ nameOnly: true, authorizedDatabases: true });
            visibleDatabaseNames = result.databases.map(({ name }) => name);
        } catch {
            // Restricted application users may not have cluster-wide listDatabases privileges.
        }

        const databases = [];
        for (const name of RELEVANT_DATABASES) {
            try {
                databases.push(await inspectDatabase(name, client));
            } catch (error) {
                databases.push({ database: name, accessible: false, error: error.codeName || error.code || error.name });
            }
        }
        console.log(JSON.stringify({
            clusterHosts: getAtlasHosts(uri),
            configuredDatabase,
            visibleDatabaseNames,
            databases,
        }, null, 2));
    } finally {
        await client.close();
    }
}

main().catch((error) => {
    console.error('Atlas inspection failed; no database data was changed.');
    console.error(`Error type: ${error.name || 'DatabaseError'}${error.code ? ` (${error.code})` : ''}`);
    process.exitCode = 1;
});
