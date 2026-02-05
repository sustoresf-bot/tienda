import fs from 'fs';

function parseServiceAccountFromEnv() {
    const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function getFirebaseAdminConfigStatus() {
    const fromEnv = parseServiceAccountFromEnv();
    const fromSplit = {
        projectId: String(process.env.FIREBASE_PROJECT_ID || '').trim(),
        clientEmail: String(process.env.FIREBASE_CLIENT_EMAIL || '').trim(),
        privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').trim(),
    };
    const hasEnvJson = !!(fromEnv?.project_id || fromEnv?.projectId) && !!(fromEnv?.client_email || fromEnv?.clientEmail) && !!(fromEnv?.private_key || fromEnv?.privateKey);
    const hasSplit = !!fromSplit.projectId && !!fromSplit.clientEmail && !!fromSplit.privateKey;
    const filePath = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
    const hasFile = !!filePath;
    const fileExists = hasFile ? fs.existsSync(filePath) : false;
    return {
        hasEnvJson,
        hasSplit,
        hasFile,
        fileExists,
    };
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const status = getFirebaseAdminConfigStatus();
    return res.status(200).json({
        ok: true,
        nodeEnv: String(process.env.NODE_ENV || ''),
        firebaseAdmin: {
            configured: status.hasEnvJson || status.hasSplit || status.fileExists,
            ...status,
        },
    });
}
