import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim();
    const dni = String(req.body?.dni || '').trim();
    const phone = String(req.body?.phone || '').trim();

    if (name.length < 3) return res.status(400).json({ error: 'Nombre inválido' });
    if (username.length < 3) return res.status(400).json({ error: 'Usuario inválido' });
    if (dni.length < 6) return res.status(400).json({ error: 'DNI inválido' });
    if (phone.length < 8) return res.status(400).json({ error: 'Teléfono inválido' });

    const storeId = getStoreIdFromRequest(req);
    const usernameLower = username.toLowerCase();
    const emailLower = decoded.email.toLowerCase();

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();

        const userRef = db.doc(`artifacts/${storeId}/public/data/users/${decoded.uid}`);
        const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);

        const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailLower.replace(/[.#$/\[\]]/g, '_')}`);

        const [userSnap, usernameSnap, emailSnap] = await Promise.all([userRef.get(), usernameRef.get(), emailRef.get()]);
        if (usernameSnap.exists) {
            const existing = usernameSnap.data() || {};
            if ((existing.uid || '') !== decoded.uid) {
                return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
            }
        }
        if (emailSnap.exists) {
            const existing = emailSnap.data() || {};
            if ((existing.uid || '') !== decoded.uid) {
                return res.status(409).json({ error: 'Este email ya está registrado en otra cuenta' });
            }
        }

        const nowIso = new Date().toISOString();
        const profile = {
            name,
            email: decoded.email,
            emailLower,
            username,
            usernameLower,
            dni,
            phone,
            role: (userSnap.exists ? userSnap.data()?.role : null) || 'user',
            updatedAt: nowIso,
            createdAt: userSnap.exists ? (userSnap.data()?.createdAt || nowIso) : nowIso,
        };

        const batch = db.batch();
        batch.set(userRef, profile, { merge: true });
        batch.set(usernameRef, { uid: decoded.uid, emailLower, updatedAt: nowIso, createdAt: usernameSnap.exists ? (usernameSnap.data()?.createdAt || nowIso) : nowIso }, { merge: true });
        batch.set(emailRef, { uid: decoded.uid, emailLower, updatedAt: nowIso, createdAt: emailSnap.exists ? (emailSnap.data()?.createdAt || nowIso) : nowIso }, { merge: true });
        await batch.commit();

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}
