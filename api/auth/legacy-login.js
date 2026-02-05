import crypto from 'crypto';
import { getAdmin } from '../_firebaseAdmin.js';
import { getStoreIdFromRequest } from '../_authz.js';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitMemory = new Map();

function getClientKey(req) {
    const fwd = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || String(req.socket?.remoteAddress || 'unknown');
}

function isHexSha256(str) {
    return typeof str === 'string' && /^[a-f0-9]{64}$/i.test(str);
}

function dayNumberFromDate(value) {
    const ms = typeof value === 'number' ? value : Date.parse(String(value || ''));
    if (!Number.isFinite(ms)) return null;
    return Math.floor(ms / 86400000);
}

function sha256Hex(value) {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function verifyLegacyPassword({ passwordInput, storedPassword, legacyData, legacyMeta }) {
    if (!storedPassword) return false;

    if (!isHexSha256(storedPassword)) {
        return String(storedPassword) === String(passwordInput);
    }

    const base = 'tienda_secure_2024';
    const candidates = [];

    const joinDay = dayNumberFromDate(legacyData?.joinDate) ?? dayNumberFromDate(legacyData?.createdAt) ?? dayNumberFromDate(legacyData?.lastLogin);
    if (joinDay != null) candidates.push(joinDay);

    const createDay = dayNumberFromDate(legacyMeta?.createTime);
    if (createDay != null) candidates.push(createDay);

    const today = Math.floor(Date.now() / 86400000);
    candidates.push(today);

    const uniqueDays = Array.from(new Set(candidates));
    const daysToTry = [];
    uniqueDays.forEach((d) => {
        for (let delta = -2; delta <= 2; delta++) daysToTry.push(d + delta);
    });

    for (const day of daysToTry) {
        const salt = `${base}_${day}`;
        const attempt = sha256Hex(String(passwordInput) + salt);
        if (attempt === storedPassword.toLowerCase()) return true;
    }

    return false;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const storeId = getStoreIdFromRequest(req);
    const clientKey = getClientKey(req);
    const now = Date.now();
    const record = rateLimitMemory.get(clientKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + RATE_LIMIT_WINDOW_MS;
    }
    record.count++;
    rateLimitMemory.set(clientKey, record);
    if (record.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
    }

    const identifier = String(req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');
    if (!identifier || !password) {
        return res.status(400).json({ error: 'Faltan credenciales' });
    }

    const isEmail = identifier.includes('@');
    const normalized = identifier.toLowerCase();

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const usersCol = db.collection(`artifacts/${storeId}/public/data/users`);

        const querySnap = isEmail
            ? await usersCol.where('emailLower', '==', normalized).limit(5).get()
            : await usersCol.where('usernameLower', '==', normalized).limit(5).get();

        const legacyDoc = querySnap.docs.find((d) => d.data()?.password);
        if (!legacyDoc) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const legacyData = legacyDoc.data() || {};
        const storedPassword = legacyData.password;

        const ok = verifyLegacyPassword({
            passwordInput: password,
            storedPassword,
            legacyData,
            legacyMeta: { createTime: legacyDoc.createTime?.toDate?.()?.toISOString?.() || null },
        });

        if (!ok) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const emailLower = String(legacyData.emailLower || legacyData.email || '').trim().toLowerCase();
        if (!emailLower || !emailLower.includes('@')) {
            return res.status(500).json({ error: 'Cuenta legacy inválida' });
        }

        let userRecord = null;
        try {
            userRecord = await adminSdk.auth().getUserByEmail(emailLower);
        } catch (e) {
            if (e?.code !== 'auth/user-not-found') throw e;
        }

        if (!userRecord) {
            userRecord = await adminSdk.auth().createUser({ email: emailLower, password });
        } else {
            await adminSdk.auth().updateUser(userRecord.uid, { password });
        }

        const uid = userRecord.uid;
        const nowIso = new Date().toISOString();

        const uidRef = usersCol.doc(uid);
        const dataToCopy = { ...legacyData };
        delete dataToCopy.password;
        delete dataToCopy._adminVerified;
        delete dataToCopy.id;

        const batch = db.batch();
        batch.set(uidRef, { ...dataToCopy, email: emailLower, emailLower, updatedAt: nowIso, migratedFrom: legacyDoc.id }, { merge: true });

        if (legacyDoc.id !== uid) {
            batch.delete(legacyDoc.ref);
        }

        const usernameLower = String(dataToCopy.usernameLower || '').trim().toLowerCase();
        if (usernameLower) {
            const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
            const usernameSnap = await usernameRef.get();
            if (!usernameSnap.exists) {
                batch.set(usernameRef, { uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        await batch.commit();

        const token = await adminSdk.auth().createCustomToken(uid);
        return res.status(200).json({ token });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
