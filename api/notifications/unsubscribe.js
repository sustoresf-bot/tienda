import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';
import { buildSubscriptionId, resolveStaffRole } from '../../lib/webPush.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    const role = await resolveStaffRole({ decoded, storeId });
    if (!role) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const endpoint = String(req.body?.endpoint || '').trim();
    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const subscriptionId = buildSubscriptionId(endpoint);
        const ref = db.doc(`artifacts/${storeId}/public/data/pushSubscriptions/${subscriptionId}`);
        await ref.set({
            disabled: true,
            disabledAt: new Date().toISOString(),
            disabledBy: decoded.uid,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error?.message || 'Internal error' });
    }
}
