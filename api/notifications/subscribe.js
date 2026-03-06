import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';
import {
    buildSubscriptionId,
    normalizePushSubscription,
    resolveStaffRole,
    hasWebPushConfig,
} from '../../lib/webPush.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!hasWebPushConfig()) {
        return res.status(503).json({ error: 'Push notifications not configured' });
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

    const subscription = normalizePushSubscription(req.body?.subscription);
    if (!subscription) {
        return res.status(400).json({ error: 'Invalid subscription payload' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const nowIso = new Date().toISOString();
        const subscriptionId = buildSubscriptionId(subscription.endpoint);
        const ref = db.doc(`artifacts/${storeId}/public/data/pushSubscriptions/${subscriptionId}`);
        await ref.set({
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
            userId: decoded.uid,
            email: String(decoded.email || '').trim().toLowerCase(),
            role,
            userAgent: String(req.headers?.['user-agent'] || '').slice(0, 350),
            platform: String(req.body?.platform || '').slice(0, 80),
            disabled: false,
            createdAt: nowIso,
            updatedAt: nowIso,
        }, { merge: true });

        return res.status(200).json({ success: true, subscriptionId });
    } catch (error) {
        return res.status(500).json({ error: error?.message || 'Internal error' });
    }
}
