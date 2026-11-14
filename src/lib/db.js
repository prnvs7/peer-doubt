import mongoose from 'mongoose';

const cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

function getDatabaseName(uri) {
    const configured = process.env.MONGODB_DB?.trim();
    if (configured) return configured;

    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/i);
    const fromUri = match?.[1] ? decodeURIComponent(match[1]) : '';
    return fromUri || 'Doubt';
}

export default async function connectDB() {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error('MONGODB_URI is required to connect to the application database.');

    if (cached.conn?.readyState === 1) return cached.conn;
    if (cached.conn && cached.conn.readyState !== 1) {
        cached.conn = null;
        cached.promise = null;
    }
    if (cached.promise) return cached.promise;

    cached.promise = mongoose
        .connect(uri, {
            dbName: getDatabaseName(uri),
            serverSelectionTimeoutMS: 10_000,
            connectTimeoutMS: 10_000,
        })
        .then((connection) => {
            cached.conn = connection;
            return connection;
        })
        .catch((error) => {
            cached.conn = null;
            cached.promise = null;
            throw error;
        });

    return cached.promise;
}
