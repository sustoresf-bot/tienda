import { getAdmin } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const username = String(req.body?.username || '').trim().toLowerCase();
    if (!username) {
        return res.status(400).json({ error: 'Missing username' });
    }

    try {
        const storeId = getStoreIdFromRequest(req);
        const adminSdk = getAdmin();
        const snap = await adminSdk.firestore().doc(`artifacts/${storeId}/public/data/usernames/${username}`).get();
        if (!snap.exists) {
            return res.status(404).json({ error: 'Username not found' });
        }
        const data = snap.data() || {};
        return res.status(200).json({ email: data.emailLower || data.email || null, uid: data.uid || null });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
