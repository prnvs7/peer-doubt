import { readFile, writeFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';

const envPath = new URL('../.env.local', import.meta.url);

function encodeCredentialPart(value) {
    let decoded;
    try {
        decoded = decodeURIComponent(value);
    } catch {
        decoded = value;
    }
    return encodeURIComponent(decoded).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeUri(uri) {
    const scheme = uri.match(/^(mongodb(?:\+srv)?:\/\/)/i)?.[1];
    if (!scheme) throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://.');

    const remainder = uri.slice(scheme.length);
    const authorityEnd = remainder.search(/[/?#]/);
    const authority = authorityEnd === -1 ? remainder : remainder.slice(0, authorityEnd);
    const suffix = authorityEnd === -1 ? '' : remainder.slice(authorityEnd);
    const at = authority.lastIndexOf('@');
    if (at <= 0 || at === authority.length - 1) throw new Error('MONGODB_URI must contain credentials and an Atlas host.');

    const userInfo = authority.slice(0, at);
    const separator = userInfo.indexOf(':');
    if (separator <= 0 || separator === userInfo.length - 1) throw new Error('MONGODB_URI must contain a username and password.');

    const username = userInfo.slice(0, separator);
    const password = userInfo.slice(separator + 1);
    const host = authority.slice(at + 1);
    if (/[<>]/.test(username + password + host) || /example|placeholder|your[-_]/i.test(host)) {
        throw new Error('MONGODB_URI still contains placeholder text; no file was changed.');
    }

    return `${scheme}${encodeCredentialPart(username)}:${encodeCredentialPart(password)}@${host}${suffix}`;
}

async function normalizeEnvironmentUri() {
    const original = await readFile(envPath, 'utf8');
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const lines = original.split(/\r?\n/);
    const lineIndex = lines.findIndex((line) => /^\s*MONGODB_URI\s*=/.test(line));
    if (lineIndex === -1) throw new Error('MONGODB_URI is missing from .env.local.');

    const line = lines[lineIndex];
    const equals = line.indexOf('=');
    const prefix = line.slice(0, equals + 1);
    const rawValue = line.slice(equals + 1).trim();
    const quote = rawValue.startsWith('"') && rawValue.endsWith('"')
        ? '"'
        : rawValue.startsWith("'") && rawValue.endsWith("'") ? "'" : '';
    const uri = quote ? rawValue.slice(1, -1) : rawValue;
    const normalized = normalizeUri(uri);

    // Constructing the driver validates URI syntax without connecting or printing its contents.
    const client = new MongoClient(normalized);
    await client.close();

    lines[lineIndex] = `${prefix}${quote}${normalized}${quote}`;
    const finalContents = lines.join(newline);
    await writeFile(envPath, finalContents, 'utf8');
    console.log('MONGODB_URI syntax normalized and driver-validated. Credentials were not printed.');
}

normalizeEnvironmentUri().catch((error) => {
    console.error(error.message || 'Could not normalize MONGODB_URI.');
    process.exitCode = 1;
});
