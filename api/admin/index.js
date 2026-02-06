import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';

async function handleUsers(req, res, admin, decoded, storeId) {
    const uid = String(req.body?.uid || '').trim();
    if (!uid) {
        return res.status(400).json({ error: 'Missing UID' });
    }

    let action = String(req.body?.action || '').trim().toLowerCase();
    if (!action) {
        action = req.body?.email || req.body?.password ? 'update' : 'delete';
    }

    if (action === 'delete') {
        try {
            await admin.auth().deleteUser(uid);
        } catch (authError) {
            if (authError?.code !== 'auth/user-not-found') throw authError;
        }
        return res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    }

    if (action === 'update') {
        const email = req.body?.email ? String(req.body.email).trim() : '';
        const password = req.body?.password ? String(req.body.password) : '';

        const updateData = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No hay cambios para aplicar' });
        }

        try {
            await admin.auth().updateUser(uid, updateData);
        } catch (authError) {
            if (authError?.code === 'auth/user-not-found') {
                return res.status(200).json({
                    success: true,
                    warning: 'Usuario no encontrado en Auth. Solo se actualizarán datos en Firestore.',
                    authUpdated: false,
                });
            }
            throw authError;
        }

        return res.status(200).json({
            success: true,
            message: 'Usuario actualizado correctamente en Auth',
            authUpdated: true,
        });
    }

    return res.status(400).json({ error: 'Acción inválida' });
}

async function dumpCollection(db, collectionPath) {
    const snap = await db.collection(collectionPath).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

async function handleExport(req, res, admin, decoded, storeId) {
    const COLLECTIONS = [
        'products', 'orders', 'users', 'usernames', 'promos', 'coupons',
        'suppliers', 'purchases', 'expenses', 'investments', 'homeBanners', 'carts',
    ];

    const db = admin.firestore();
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
        if (size >= BATCH_LIMIT) await commit();
    }
    await commit();
    return committed;
}

async function handleImport(req, res, admin, decoded, storeId) {
    const backup = req.body?.backup || req.body;
    if (!backup || typeof backup !== 'object') {
        return res.status(400).json({ error: 'Missing backup' });
    }

    const db = admin.firestore();
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
            const id = String(item?.id || '').trim();
            const data = item?.data && typeof item.data === 'object' ? item.data : null;
            if (id && data) writes.push({ ref: db.doc(`${dataPath}/${collectionName}/${id}`), data });
        }
    }

    const written = await commitBatchedWrites(db, writes);
    return res.status(200).json({ success: true, storeId, written });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.email) return res.status(401).json({ error: 'Unauthorized' });

    const storeId = getStoreIdFromRequest(req);
    if (!(await isAdminEmail(decoded.email, storeId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const base = `http://${req?.headers?.host || 'localhost'}`;
    const url = new URL(String(req?.url || ''), base);
    const action = String(url.searchParams.get('action') || '').trim();

    try {
        const admin = getAdmin();
        if (action === 'users') return await handleUsers(req, res, admin, decoded, storeId);
        if (action === 'export') return await handleExport(req, res, admin, decoded, storeId);
        if (action === 'import') return await handleImport(req, res, admin, decoded, storeId);

        return res.status(400).json({ error: 'Invalid admin action' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Internal error' });
    }
}
