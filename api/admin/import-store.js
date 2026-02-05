import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';

function normalizeBackup(body) {
    if (!body) return null;
    if (body.backup && typeof body.backup === 'object') return body.backup;
    return body;
}

async function commitBatchedWrites(db, writes) {
    const BATCH_LIMIT = 400;
    let batch = db.batch();
    let size = 0;
    let committed = 0;

    const commit = async () => {
        if (size === 0) return;
        await batch.commit();
        committed += size;
        batch = db.batch();
        size = 0;
    };

    for (const w of writes) {
        batch.set(w.ref, w.data, { merge: true });
        size++;
        if (size >= BATCH_LIMIT) {
            await commit();
        }
    }
    await commit();
    return committed;
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

    const backup = normalizeBackup(req.body);
    if (!backup || typeof backup !== 'object') {
        return res.status(400).json({ error: 'Missing backup' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();

        const basePath = `artifacts/${storeId}/public`;
        const dataPath = `${basePath}/data`;

        const writes = [];

        if (backup.settingsConfig && typeof backup.settingsConfig === 'object') {
            writes.push({ ref: db.doc(`${dataPath}/settings/config`), data: backup.settingsConfig });
        }
        if (backup.publicConfig && typeof backup.publicConfig === 'object') {
            writes.push({ ref: db.doc(`${basePath}/config`), data: backup.publicConfig });
        }

        const collections = backup.collections && typeof backup.collections === 'object' ? backup.collections : {};
        for (const [collectionName, docs] of Object.entries(collections)) {
            if (!Array.isArray(docs)) continue;
            for (const item of docs) {
                if (!item || typeof item !== 'object') continue;
                const id = String(item.id || '').trim();
                const data = item.data && typeof item.data === 'object' ? item.data : null;
                if (!id || !data) continue;
                writes.push({ ref: db.doc(`${dataPath}/${collectionName}/${id}`), data });
            }
        }

        const written = await commitBatchedWrites(db, writes);
        return res.status(200).json({ success: true, storeId, written });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
