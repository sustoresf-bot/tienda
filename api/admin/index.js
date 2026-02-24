import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';

const SANITIZE_COLLECTIONS = [
    'products', 'orders', 'users', 'usernames', 'promos', 'coupons',
    'suppliers', 'purchases', 'expenses', 'investments', 'homeBanners', 'carts',
];

const cp1252Special = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
    [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
    [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
    [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

function isPlainObject(value) {
    return value != null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

function isSuspiciousChunk(chunk) {
    for (const ch of chunk) {
        const cp = ch.codePointAt(0);
        if (cp === 0xC2 || cp === 0xC3 || cp === 0xE2 || cp === 0xF0 || cp === 0xFFFD) return true;
        if (cp >= 0x80 && cp <= 0x9F) return true;
    }
    return false;
}

function chunkToCp1252Bytes(chunk) {
    const bytes = [];
    for (const ch of chunk) {
        const cp = ch.codePointAt(0);
        if (cp <= 0x7F || (cp >= 0xA0 && cp <= 0xFF) || (cp >= 0x80 && cp <= 0x9F)) {
            bytes.push(cp & 0xFF);
            continue;
        }
        const mapped = cp1252Special.get(cp);
        if (mapped == null) return null;
        bytes.push(mapped);
    }
    return Buffer.from(bytes);
}

function sanitizeStringValue(value) {
    const next = String(value).replace(/[^\x00-\x7F]+/g, (chunk) => {
        if (!isSuspiciousChunk(chunk)) return chunk;
        const bytes = chunkToCp1252Bytes(chunk);
        if (!bytes) return chunk;
        const decoded = bytes.toString('utf8');
        return decoded.includes('\uFFFD') ? chunk : decoded;
    });
    return { value: next, changed: next !== value };
}

function sanitizeValue(value) {
    if (typeof value === 'string') {
        const sanitized = sanitizeStringValue(value);
        return {
            value: sanitized.value,
            changed: sanitized.changed,
            updatedStrings: sanitized.changed ? 1 : 0,
        };
    }

    if (Array.isArray(value)) {
        let changed = false;
        let updatedStrings = 0;
        const out = value.map((entry) => {
            const sanitized = sanitizeValue(entry);
            changed = changed || sanitized.changed;
            updatedStrings += sanitized.updatedStrings;
            return sanitized.value;
        });
        return { value: changed ? out : value, changed, updatedStrings };
    }

    if (isPlainObject(value)) {
        let changed = false;
        let updatedStrings = 0;
        const out = {};
        for (const [key, entry] of Object.entries(value)) {
            const sanitized = sanitizeValue(entry);
            out[key] = sanitized.value;
            changed = changed || sanitized.changed;
            updatedStrings += sanitized.updatedStrings;
        }
        return { value: changed ? out : value, changed, updatedStrings };
    }

    return { value, changed: false, updatedStrings: 0 };
}

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

async function handleListUsers(req, res, admin, decoded, storeId) {
    const db = admin.firestore();
    const snap = await db.collection(`artifacts/${storeId}/public/data/users`).get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ users });
}

async function dumpCollection(db, collectionPath) {
    const snap = await db.collection(collectionPath).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

async function handleExport(req, res, admin, decoded, storeId) {
    const db = admin.firestore();
    const nowIso = new Date().toISOString();
    const basePath = `artifacts/${storeId}/public`;
    const dataPath = `${basePath}/data`;

    const [settingsSnap, publicConfigSnap] = await Promise.all([
        db.doc(`${dataPath}/settings/config`).get(),
        db.doc(`${basePath}/config`).get(),
    ]);

    const collections = {};
    for (const name of SANITIZE_COLLECTIONS) {
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

async function handleSanitizeText(req, res, admin, decoded, storeId) {
    const db = admin.firestore();
    const basePath = `artifacts/${storeId}/public`;
    const dataPath = `${basePath}/data`;
    const writes = [];
    let scannedDocs = 0;
    let updatedDocs = 0;
    let updatedStrings = 0;

    const sanitizeSnapshot = (snap) => {
        if (!snap.exists) return;
        scannedDocs++;
        const data = snap.data() || {};
        const sanitized = sanitizeValue(data);
        if (!sanitized.changed) return;
        writes.push({ ref: snap.ref, data: sanitized.value });
        updatedDocs++;
        updatedStrings += sanitized.updatedStrings;
    };

    const [settingsSnap, publicConfigSnap] = await Promise.all([
        db.doc(`${dataPath}/settings/config`).get(),
        db.doc(`${basePath}/config`).get(),
    ]);
    sanitizeSnapshot(settingsSnap);
    sanitizeSnapshot(publicConfigSnap);

    for (const collectionName of SANITIZE_COLLECTIONS) {
        const collectionSnap = await db.collection(`${dataPath}/${collectionName}`).get();
        for (const snap of collectionSnap.docs) sanitizeSnapshot(snap);
    }

    const written = writes.length > 0 ? await commitBatchedWrites(db, writes) : 0;
    return res.status(200).json({
        success: true,
        storeId,
        scannedDocs,
        updatedDocs,
        updatedStrings,
        written,
    });
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
        if (action === 'list-users') return await handleListUsers(req, res, admin, decoded, storeId);
        if (action === 'export') return await handleExport(req, res, admin, decoded, storeId);
        if (action === 'import') return await handleImport(req, res, admin, decoded, storeId);
        if (action === 'sanitize-text') return await handleSanitizeText(req, res, admin, decoded, storeId);

        return res.status(400).json({ error: 'Invalid admin action' });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Internal error' });
    }
}
