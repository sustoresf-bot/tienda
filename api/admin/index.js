import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';
import { emailToDocKey, isStrictUsername, normalizeStrictUsername, normalizeUsernameForKey } from '../../lib/userIdentity.js';

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

function mapPublicAdminError(error) {
    return String(error?.message || 'Internal error');
}

function createApiError(status, message, code = null) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

function hasOwn(body, key) {
    return Object.prototype.hasOwnProperty.call(body || {}, key);
}

function readOptionalBodyField(body, key) {
    return hasOwn(body, key) ? body[key] : undefined;
}

function getRoleValue(value, fallback = 'user') {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized || fallback;
}

async function syncUserProfileAndIndexes({ db, storeId, uid, body, actorEmail }) {
    const userRef = db.doc(`artifacts/${storeId}/public/data/users/${uid}`);
    const nowIso = new Date().toISOString();

    return await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const existing = userSnap.exists ? (userSnap.data() || {}) : {};

        const requestedEmail = readOptionalBodyField(body, 'email');
        const requestedName = readOptionalBodyField(body, 'name');
        const requestedUsername = readOptionalBodyField(body, 'username');
        const requestedDni = readOptionalBodyField(body, 'dni');
        const requestedPhone = readOptionalBodyField(body, 'phone');
        const requestedRole = readOptionalBodyField(body, 'role');

        const emailLower = (requestedEmail != null
            ? String(requestedEmail).trim().toLowerCase()
            : String(existing.emailLower || existing.email || '').trim().toLowerCase());
        if (!emailLower || !emailLower.includes('@')) {
            throw createApiError(400, 'Email invalido', 'invalid_email');
        }

        let usernameLower = '';
        if (requestedUsername != null) {
            const strictUsername = normalizeStrictUsername(requestedUsername);
            if (!strictUsername || !isStrictUsername(strictUsername)) {
                throw createApiError(400, 'Usuario invalido. Usa 3-32 caracteres: letras, numeros, punto, guion o guion bajo.', 'invalid_username');
            }
            usernameLower = strictUsername;
        } else {
            const strictFromExisting = normalizeStrictUsername(existing.usernameLower || existing.username || '');
            if (strictFromExisting) {
                usernameLower = strictFromExisting;
            } else {
                usernameLower = normalizeUsernameForKey(existing.usernameLower || existing.username || '');
            }
            if (!usernameLower) usernameLower = `user_${String(uid).slice(0, 8).toLowerCase()}`;
        }

        const emailKey = emailToDocKey(emailLower);
        const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
        const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailKey}`);
        const [usernameSnap, emailSnap] = await Promise.all([
            tx.get(usernameRef),
            tx.get(emailRef),
        ]);

        if (usernameSnap.exists && String(usernameSnap.data()?.uid || '') !== uid) {
            throw createApiError(409, 'El nombre de usuario ya esta en uso', 'username_taken');
        }
        if (emailSnap.exists && String(emailSnap.data()?.uid || '') !== uid) {
            throw createApiError(409, 'Este email ya esta registrado en otra cuenta', 'email_taken');
        }

        const previousUsernameLower = normalizeUsernameForKey(existing.usernameLower || existing.username || '');
        const previousEmailKey = emailToDocKey(existing.emailLower || existing.email || '');

        const nextName = requestedName != null ? String(requestedName).trim() : String(existing.name || '').trim();
        const nextDni = requestedDni != null ? String(requestedDni).trim() : String(existing.dni || '').trim();
        const nextPhone = requestedPhone != null ? String(requestedPhone).trim() : String(existing.phone || '').trim();
        const nextRole = requestedRole != null ? getRoleValue(requestedRole, 'user') : getRoleValue(existing.role, 'user');

        if (requestedName != null && nextName.length < 3) {
            throw createApiError(400, 'Nombre invalido', 'invalid_name');
        }
        if (requestedDni != null && nextDni.length < 6) {
            throw createApiError(400, 'DNI invalido', 'invalid_dni');
        }
        if (requestedPhone != null && nextPhone.length < 8) {
            throw createApiError(400, 'Telefono invalido', 'invalid_phone');
        }
        if (!nextRole) {
            throw createApiError(400, 'Rol invalido', 'invalid_role');
        }

        const profile = {
            updatedAt: nowIso,
            createdAt: existing.createdAt || nowIso,
            email: emailLower,
            emailLower,
            username: usernameLower,
            usernameLower,
            role: nextRole,
            lastModifiedBy: String(actorEmail || '').trim().toLowerCase() || null,
        };
        if (nextName) profile.name = nextName;
        if (nextDni) profile.dni = nextDni;
        if (nextPhone) profile.phone = nextPhone;

        tx.set(userRef, profile, { merge: true });
        tx.set(usernameRef, {
            uid,
            emailLower,
            createdAt: usernameSnap.exists ? (usernameSnap.data()?.createdAt || nowIso) : nowIso,
            updatedAt: nowIso,
        }, { merge: true });
        tx.set(emailRef, {
            uid,
            emailLower,
            createdAt: emailSnap.exists ? (emailSnap.data()?.createdAt || nowIso) : nowIso,
            updatedAt: nowIso,
        }, { merge: true });

        if (previousUsernameLower && previousUsernameLower !== usernameLower) {
            const oldUsernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${previousUsernameLower}`);
            const oldUsernameSnap = await tx.get(oldUsernameRef);
            if (oldUsernameSnap.exists && String(oldUsernameSnap.data()?.uid || '') === uid) {
                tx.delete(oldUsernameRef);
            }
        }

        if (previousEmailKey && previousEmailKey !== emailKey) {
            const oldEmailRef = db.doc(`artifacts/${storeId}/public/data/emails/${previousEmailKey}`);
            const oldEmailSnap = await tx.get(oldEmailRef);
            if (oldEmailSnap.exists && String(oldEmailSnap.data()?.uid || '') === uid) {
                tx.delete(oldEmailRef);
            }
        }

        return { id: uid, ...existing, ...profile };
    });
}

async function deleteUserProfileAndIndexes({ db, storeId, uid }) {
    const userRef = db.doc(`artifacts/${storeId}/public/data/users/${uid}`);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const userData = userSnap.exists ? (userSnap.data() || {}) : {};
        const usernameLower = normalizeUsernameForKey(userData.usernameLower || userData.username || '');
        const emailKey = emailToDocKey(userData.emailLower || userData.email || '');

        if (usernameLower) {
            const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
            const usernameSnap = await tx.get(usernameRef);
            if (usernameSnap.exists && String(usernameSnap.data()?.uid || '') === uid) {
                tx.delete(usernameRef);
            }
        }

        if (emailKey) {
            const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailKey}`);
            const emailSnap = await tx.get(emailRef);
            if (emailSnap.exists && String(emailSnap.data()?.uid || '') === uid) {
                tx.delete(emailRef);
            }
        }

        tx.delete(userRef);
    });
}

async function handleUsers(req, res, admin, decoded, storeId) {
    const uid = String(req.body?.uid || '').trim();
    if (!uid) {
        return res.status(400).json({ error: 'Missing UID' });
    }

    let action = String(req.body?.action || '').trim().toLowerCase();
    if (!action) {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const hasProfileOrAuthUpdates =
            hasOwn(body, 'name') ||
            hasOwn(body, 'username') ||
            hasOwn(body, 'email') ||
            hasOwn(body, 'phone') ||
            hasOwn(body, 'dni') ||
            hasOwn(body, 'role') ||
            hasOwn(body, 'password');

        if (hasProfileOrAuthUpdates) {
            action = 'update';
        }
    }
    if (!action) {
        return res.status(400).json({ error: 'Missing action. Usa "update" o "delete".' });
    }

    if (action === 'delete') {
        const db = admin.firestore();
        try {
            await admin.auth().deleteUser(uid);
        } catch (authError) {
            if (authError?.code !== 'auth/user-not-found') throw authError;
        }
        await deleteUserProfileAndIndexes({ db, storeId, uid });
        return res.status(200).json({ success: true, message: 'Usuario eliminado exitosamente.' });
    }

    if (action === 'update') {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const db = admin.firestore();
        const email = req.body?.email ? String(req.body.email).trim() : '';
        const password = req.body?.password ? String(req.body.password) : '';

        const updateData = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;
        if (password && password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres', code: 'invalid_password' });
        }

        const hasProfileUpdates =
            hasOwn(body, 'name') ||
            hasOwn(body, 'username') ||
            hasOwn(body, 'email') ||
            hasOwn(body, 'phone') ||
            hasOwn(body, 'dni') ||
            hasOwn(body, 'role');

        if (Object.keys(updateData).length === 0 && !hasProfileUpdates) {
            return res.status(400).json({ error: 'No hay cambios para aplicar' });
        }

        let authUpdated = null;
        let warning = null;
        try {
            if (Object.keys(updateData).length > 0) {
                await admin.auth().updateUser(uid, updateData);
                authUpdated = true;
            }
        } catch (authError) {
            if (authError?.code === 'auth/user-not-found') {
                authUpdated = false;
                warning = 'Usuario no encontrado en Auth. Solo se actualizaran datos en Firestore.';
            } else {
                throw authError;
            }
        }

        let profile = null;
        if (hasProfileUpdates) {
            profile = await syncUserProfileAndIndexes({
                db,
                storeId,
                uid,
                body,
                actorEmail: decoded.email,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Usuario actualizado correctamente',
            authUpdated,
            ...(warning ? { warning } : {}),
            ...(profile ? { profile } : {}),
        });
    }

    return res.status(400).json({ error: 'Accion invalida' });
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

    const base = `http://${req?.headers?.host || 'localhost'}`;
    const url = new URL(String(req?.url || ''), base);
    const action = String(url.searchParams.get('action') || '').trim();

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.email) return res.status(401).json({ error: 'Unauthorized' });

    const storeId = getStoreIdFromRequest(req);
    if (!(await isAdminEmail(decoded.email, storeId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const admin = getAdmin();
        if (action === 'users') return await handleUsers(req, res, admin, decoded, storeId);
        if (action === 'list-users') return await handleListUsers(req, res, admin, decoded, storeId);
        if (action === 'export') return await handleExport(req, res, admin, decoded, storeId);
        if (action === 'import') return await handleImport(req, res, admin, decoded, storeId);
        if (action === 'sanitize-text') return await handleSanitizeText(req, res, admin, decoded, storeId);

        return res.status(400).json({ error: 'Invalid admin action' });
    } catch (error) {
        return res.status(Number(error?.status) || 500).json({
            error: mapPublicAdminError(error),
            code: error?.code || null,
        });
    }
}
