import admin from 'firebase-admin';

function initializeFirebaseAdmin() {
    if (admin.apps.length) return;

    try {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };

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

