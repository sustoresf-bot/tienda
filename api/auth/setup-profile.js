import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';
import { emailToDocKey, normalizeStrictUsername, normalizeUsernameForKey } from '../../lib/userIdentity.js';
import { resolveIdentityRequirements, validateIdentityFields } from '../../lib/auth-requirements.js';

function createApiError(status, message, code) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const name = String(req.body?.name || '').trim();
    const requestedUsername = String(req.body?.username || '').trim();
    const username = normalizeStrictUsername(requestedUsername);
    const dni = String(req.body?.dni || '').trim();
    const phone = String(req.body?.phone || '').trim();

    if (name.length < 3) {
        return res.status(400).json({ error: 'Nombre invalido' });
    }
    if (!username) {
        return res.status(400).json({
            error: 'Usuario invalido. Usa 3-32 caracteres: letras, numeros, punto, guion o guion bajo.',
        });
    }

    const storeId = getStoreIdFromRequest(req);
    const usernameLower = normalizeUsernameForKey(username);
    const emailLower = decoded.email.toLowerCase();
    const emailKey = emailToDocKey(emailLower);

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();

        const settingsRef = db.doc(`artifacts/${storeId}/public/data/settings/config`);
        const settingsSnap = await settingsRef.get();
        const identityRequirements = resolveIdentityRequirements(settingsSnap.exists ? settingsSnap.data() : null);
        const identityValidation = validateIdentityFields({
            dni,
            phone,
            requireDni: identityRequirements.requireDni,
            requirePhone: identityRequirements.requirePhone,
        });

        if (!identityValidation.ok) {
            return res.status(400).json({
                error: identityValidation.message,
                code: identityValidation.code,
            });
        }

        const userRef = db.doc(`artifacts/${storeId}/public/data/users/${decoded.uid}`);
        const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
        const nowIso = new Date().toISOString();

        await db.runTransaction(async (tx) => {
            const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailKey}`);
            const [userSnap, usernameSnap, emailSnap] = await Promise.all([
                tx.get(userRef),
                tx.get(usernameRef),
                tx.get(emailRef),
            ]);

            if (usernameSnap.exists) {
                const existing = usernameSnap.data() || {};
                if ((existing.uid || '') !== decoded.uid) {
                    throw createApiError(409, 'El nombre de usuario ya esta en uso', 'username_taken');
                }
            }
            if (emailSnap.exists) {
                const existing = emailSnap.data() || {};
                if ((existing.uid || '') !== decoded.uid) {
                    throw createApiError(409, 'Este email ya esta registrado en otra cuenta', 'email_taken');
                }
            }

            const previousData = userSnap.exists ? (userSnap.data() || {}) : {};
            const previousUsernameLower = normalizeUsernameForKey(previousData.usernameLower || previousData.username || '');
            const previousEmailLower = String(previousData.emailLower || previousData.email || '').trim().toLowerCase();
            const previousEmailKey = emailToDocKey(previousEmailLower);

            const profile = {
                name,
                email: decoded.email,
                emailLower,
                username,
                usernameLower,
                dni,
                phone,
                role: previousData.role || 'user',
                updatedAt: nowIso,
                createdAt: previousData.createdAt || nowIso,
            };

            tx.set(userRef, profile, { merge: true });
            tx.set(
                usernameRef,
                {
                    uid: decoded.uid,
                    emailLower,
                    updatedAt: nowIso,
                    createdAt: usernameSnap.exists ? usernameSnap.data()?.createdAt || nowIso : nowIso,
                },
                { merge: true }
            );
            tx.set(
                emailRef,
                {
                    uid: decoded.uid,
                    emailLower,
                    updatedAt: nowIso,
                    createdAt: emailSnap.exists ? emailSnap.data()?.createdAt || nowIso : nowIso,
                },
                { merge: true }
            );

            if (previousUsernameLower && previousUsernameLower !== usernameLower) {
                const previousUsernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${previousUsernameLower}`);
                const previousUsernameSnap = await tx.get(previousUsernameRef);
                if (previousUsernameSnap.exists && String(previousUsernameSnap.data()?.uid || '') === decoded.uid) {
                    tx.delete(previousUsernameRef);
                }
            }

            if (previousEmailKey && previousEmailKey !== emailKey) {
                const previousEmailRef = db.doc(`artifacts/${storeId}/public/data/emails/${previousEmailKey}`);
                const previousEmailSnap = await tx.get(previousEmailRef);
                if (previousEmailSnap.exists && String(previousEmailSnap.data()?.uid || '') === decoded.uid) {
                    tx.delete(previousEmailRef);
                }
            }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        if (Number(error?.status) >= 400 && Number(error?.status) < 500) {
            return res.status(error.status).json({ error: error.message, code: error.code || null });
        }
        return res.status(500).json({ error: 'Internal error' });
    }
}

