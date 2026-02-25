import admin from 'firebase-admin';
import fs from 'fs';

function decodeEscapedEnvString(value) {
    return String(value || '')
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

export function parseServiceAccountFromEnvValue(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) return null;

    const attempts = [raw];
    if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
    ) {
        attempts.push(raw.slice(1, -1));
    }

    for (const candidate of attempts) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch { }
    }

    // Fallback for escaped single-line .env content like:
    // "{\n  "type": "service_account", ... }"
    const unwrapped = attempts[attempts.length - 1];
    const pairPattern = /"([^"\\]+)"\s*:\s*"((?:\\.|[^"\\])*)"/g;
    const out = {};
    let match;
    while ((match = pairPattern.exec(unwrapped)) != null) {
        const key = String(match[1] || '').trim();
        if (!key) continue;
        out[key] = decodeEscapedEnvString(match[2]);
    }

    const hasRequired = !!(out.project_id || out.projectId) &&
        !!(out.client_email || out.clientEmail) &&
        !!(out.private_key || out.privateKey);
    return hasRequired ? out : null;
}

function tryReadServiceAccountFromFile() {
    const filePath = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
    if (!filePath) return null;
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function normalizeServiceAccount(input) {
    if (!input || typeof input !== 'object') return null;
    const projectId = input.projectId || input.project_id || null;
    const clientEmail = input.clientEmail || input.client_email || null;
    let privateKey = input.privateKey || input.private_key || null;
    if (typeof privateKey === 'string') privateKey = privateKey.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) return null;
    return { projectId, clientEmail, privateKey };
}

function initializeFirebaseAdmin() {
    if (admin.apps.length) return;

    try {
        const rawFromFile = tryReadServiceAccountFromFile();
        const rawFromEnv = parseServiceAccountFromEnvValue(process.env.FIREBASE_SERVICE_ACCOUNT);
        const rawFromSplit = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        const serviceAccount =
            normalizeServiceAccount(rawFromFile) ||
            normalizeServiceAccount(rawFromEnv) ||
            normalizeServiceAccount(rawFromSplit);

        if (serviceAccount?.projectId && serviceAccount?.clientEmail && serviceAccount?.privateKey) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            return;
        }

        admin.initializeApp();
    } catch (error) {
        admin.initializeApp();
    }
}

export function getAdmin() {
    initializeFirebaseAdmin();
    return admin;
}

export async function verifyIdTokenFromRequest(req) {
    const header = req.headers?.authorization || req.headers?.Authorization || '';
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
    if (!token) return null;

    const adminSdk = getAdmin();
    try {
        return await adminSdk.auth().verifyIdToken(token);
    } catch {
        return null;
    }
}
