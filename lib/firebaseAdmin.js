import admin from 'firebase-admin';
import fs from 'fs';

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

function initializeFirebaseAdmin() {
    if (admin.apps.length) return;

    try {
        const serviceAccountFromFile = tryReadServiceAccountFromFile();
        const serviceAccountFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
        const serviceAccountFromSplit = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        };

        const serviceAccount = serviceAccountFromFile || serviceAccountFromEnv || serviceAccountFromSplit;

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
