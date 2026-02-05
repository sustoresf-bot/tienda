import { getAdmin, verifyIdTokenFromRequest } from '../_firebaseAdmin.js';
import { getStoreIdFromRequest } from '../_authz.js';

function stripLegacySensitiveFields(data) {
    const cleaned = { ...(data || {}) };
    delete cleaned.password;
    delete cleaned._adminVerified;
    return cleaned;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const emailLower = decoded.email.toLowerCase();

        const usersCol = db.collection(`artifacts/${storeId}/public/data/users`);
        const uidRef = usersCol.doc(decoded.uid);
        const uidSnap = await uidRef.get();
        if (uidSnap.exists) {
            return res.status(200).json({ migrated: false });
        }

        const legacySnap = await usersCol.where('emailLower', '==', emailLower).limit(5).get();
        const legacyDoc = legacySnap.docs.find((d) => d.id !== decoded.uid);
        if (!legacyDoc) {
            return res.status(200).json({ migrated: false });
        }

        const legacyData = stripLegacySensitiveFields(legacyDoc.data());
        const nowIso = new Date().toISOString();

        const batch = db.batch();
        batch.set(uidRef, { ...legacyData, email: decoded.email, emailLower, updatedAt: nowIso, migratedFrom: legacyDoc.id }, { merge: true });
        batch.delete(legacyDoc.ref);

        const usernameLower = String(legacyData.usernameLower || '').trim().toLowerCase();
        if (usernameLower) {
            const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
            const usernameSnap = await usernameRef.get();
            if (!usernameSnap.exists) {
                batch.set(usernameRef, { uid: decoded.uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        await batch.commit();
        return res.status(200).json({ migrated: true });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
