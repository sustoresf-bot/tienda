import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';

const COLLECTIONS = [
    'products',
    'orders',
    'users',
    'usernames',
    'promos',
    'coupons',
    'suppliers',
    'purchases',
    'expenses',
    'investments',
    'homeBanners',
    'carts',
];

async function dumpCollection(db, collectionPath) {
    const snap = await db.collection(collectionPath).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    if (!(await isAdminEmail(decoded.email, storeId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();

        const nowIso = new Date().toISOString();
        const basePath = `artifacts/${storeId}/public`;
        const dataPath = `${basePath}/data`;

        const [settingsSnap, publicConfigSnap] = await Promise.all([
            db.doc(`${dataPath}/settings/config`).get(),
            db.doc(`${basePath}/config`).get(),
        ]);

        const collections = {};
        for (const name of COLLECTIONS) {
            collections[name] = await dumpCollection(db, `${dataPath}/${name}`);
        }

        return res.status(200).json({
            storeId,
            exportedAt: nowIso,
            exportedBy: decoded.email,
            settingsConfig: settingsSnap.exists ? settingsSnap.data() : null,
            publicConfig: publicConfigSnap.exists ? publicConfigSnap.data() : null,
            collections,
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
