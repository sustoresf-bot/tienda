import crypto from 'crypto';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { getAdmin, parseServiceAccountFromEnvValue, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';
import { emailToDocKey, normalizeUsernameForKey, normalizeStrictUsername } from '../../lib/userIdentity.js';
import { resolveIdentityRequirements, validateIdentityFields } from '../../lib/auth-requirements.js';

// --- Helper Functions for Legacy Login ---

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
        return false;
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

function parseServiceAccountFromEnv() {
    return parseServiceAccountFromEnvValue(process.env.FIREBASE_SERVICE_ACCOUNT);
}

function getFirebaseAdminConfigStatus() {
    const fromEnv = parseServiceAccountFromEnv();
    const hasEnvJson = !!(fromEnv?.project_id || fromEnv?.projectId) && !!(fromEnv?.client_email || fromEnv?.clientEmail) && !!(fromEnv?.private_key || fromEnv?.privateKey);

    const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '').trim();
    const hasSplit = !!projectId && !!clientEmail && !!privateKey;

    const filePath = String(process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
    const fileExists = filePath ? fs.existsSync(filePath) : false;

    return {
        configured: hasEnvJson || hasSplit || fileExists,
        hasEnvJson,
        hasSplit,
        hasFile: !!filePath,
        fileExists,
    };
}

// --- Helper Functions for Reset Password ---

const FIREBASE_ADMIN_MISCONFIG_HINTS = [
    'could not load the default credentials',
    'default credentials',
    'failed to determine project id',
    'unable to detect a project id',
    'missing or insufficient permissions',
    'permission-denied',
];
let warnedFirebaseAdminMisconfigured = false;

function isFirebaseAdminMisconfigured(error) {
    const message = String(error?.message || '').toLowerCase();
    return FIREBASE_ADMIN_MISCONFIG_HINTS.some((hint) => message.includes(hint));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildResetEmailHtml({ brandName, resetLink, userEmail }) {
    const safeBrand = escapeHtml(brandName || 'Sustore');
    const safeEmail = escapeHtml(userEmail);
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contrasena</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', Helvetica, Arial, sans-serif; color: #e2e8f0; }
        .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 16px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4); }
        .card { background-color: #0a0a0a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; }
    </style>
</head>
<body style="background-color: #000000;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 24px; max-width: 600px; width: 100%; box-shadow: 0 0 50px rgba(249, 115, 22, 0.1); overflow: hidden;">
                    <tr><td height="4" style="background: linear-gradient(90deg, #f97316, #3b82f6);"></td></tr>
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">${safeBrand}</h1>
                            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; letter-spacing: 2px;">RESTABLECER CONTRASENA</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px 10px; text-align: center;">
                            <div style="background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 16px; padding: 24px;">
                                <p style="margin: 0 0 8px; color: #f97316; font-size: 28px;">🔒</p>
                                <p style="margin: 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                    Recibimos una solicitud para restablecer la contrasena de la cuenta asociada a:
                                </p>
                                <p style="margin: 12px 0 0; color: #f97316; font-size: 16px; font-weight: 700;">${safeEmail}</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                                Hace clic en el boton de abajo para crear una nueva contrasena. Este enlace expira en 1 hora.
                            </p>
                            <a href="${escapeHtml(resetLink)}" class="btn" style="color: #ffffff !important; text-decoration: none;">CAMBIAR MI CONTRASENA</a>
                            <p style="margin: 24px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                Si no solicitaste este cambio, ignora este email. Tu contrasena no sera modificada.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <div style="border-top: 1px solid #1e293b; padding-top: 24px;">
                                <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                                    Si el boton no funciona, copia y pega este enlace en tu navegador:
                                </p>
                                <p style="margin: 8px 0 0; font-size: 11px; color: #64748b; word-break: break-all;">${escapeHtml(resetLink)}</p>
                            </div>
                            <div style="margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 20px;">
                                <p style="margin: 0; font-size: 12px; color: #64748b;">© ${year} ${safeBrand}. Todos los derechos reservados.</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// --- Helper Functions for Claim Legacy Profile ---

function stripLegacySensitiveFields(data) {
    const cleaned = { ...(data || {}) };
    delete cleaned.password;
    delete cleaned._adminVerified;
    return cleaned;
}

// --- Helper Functions for Setup Profile ---

function createApiError(status, message, code) {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
}

// --- Helper Functions for Bootstrap Super Admin ---

function isLocalRequest(req) {
    const host = String(req?.headers?.host || '').toLowerCase();
    const remote = String(req?.socket?.remoteAddress || '').toLowerCase();
    const fwd = String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim().toLowerCase();
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;
    if (remote === '::1' || remote === '127.0.0.1') return true;
    if (remote.startsWith('::ffff:127.0.0.1')) return true;
    if (fwd === '::1' || fwd === '127.0.0.1') return true;
    if (fwd.startsWith('::ffff:127.0.0.1')) return true;
    return false;
}

// --- Handlers ---

async function handleLegacyLogin(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json({ ok: true, firebaseAdmin: getFirebaseAdminConfigStatus() });
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    const isProd = nodeEnv === 'production';
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
    if (!isEmail) {
        return res.status(400).json({ error: 'Usa tu email para iniciar sesión', code: 'email_required' });
    }
    const normalized = identifier.toLowerCase();

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const usersCol = db.collection(`artifacts/${storeId}/public/data/users`);

        const querySnap = await usersCol.where('emailLower', '==', normalized).limit(5).get();

        const legacyDoc = querySnap.docs.find((d) => d.data()?.password);
        if (!legacyDoc) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const legacyData = legacyDoc.data() || {};
        const storedPassword = legacyData.password;
        if (!isHexSha256(storedPassword)) {
            return res.status(403).json({
                error: 'Tu cuenta requiere migración de seguridad. Restablecé tu contraseña para continuar.',
                code: 'legacy_password_reset_required',
            });
        }

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
        const usernameLower = normalizeUsernameForKey(dataToCopy.usernameLower || dataToCopy.username || '');
        if (usernameLower) {
            dataToCopy.usernameLower = usernameLower;
        }

        const batch = db.batch();
        batch.set(uidRef, { ...dataToCopy, email: emailLower, emailLower, updatedAt: nowIso, migratedFrom: legacyDoc.id }, { merge: true });

        if (legacyDoc.id !== uid) {
            batch.delete(legacyDoc.ref);
        }

        if (usernameLower) {
            const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
            const usernameSnap = await usernameRef.get();
            if (!usernameSnap.exists) {
                batch.set(usernameRef, { uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        const emailKey = emailToDocKey(emailLower);
        if (emailKey) {
            const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailKey}`);
            const emailSnap = await emailRef.get();
            if (!emailSnap.exists) {
                batch.set(emailRef, { uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        await batch.commit();

        const token = await adminSdk.auth().createCustomToken(uid);
        return res.status(200).json({ token });
    } catch (error) {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message || '') : '';
        const normalizedMessage = message.toLowerCase();
        const hints = [
            'could not load the default credentials',
            'default credentials',
            'failed to determine project id',
            'unable to detect a project id',
            'missing or insufficient permissions',
            'permission-denied',
        ];
        const isFirebaseAdminMisconfigured = hints.some((h) => normalizedMessage.includes(h));

        return res.status(500).json({
            error: isFirebaseAdminMisconfigured ? 'Backend no configurado (Firebase Admin)' : 'Internal error',
            ...(isFirebaseAdminMisconfigured ? { code: 'firebase_admin_not_configured' } : {}),
            ...(!isProd ? { details: { message } } : {}),
        });
    }
}

async function handleBootstrapSuperAdmin(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
    if (nodeEnv === 'production') {
        return res.status(403).json({ error: 'Bootstrap deshabilitado en producción' });
    }
    if (!isLocalRequest(req)) {
        return res.status(403).json({ error: 'Bootstrap solo disponible en localhost' });
    }

    const SUPER_ADMIN_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_EMAIL.includes('@')) {
        return res.status(500).json({ error: 'SUPER_ADMIN_EMAIL no configurado en el entorno' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@') || !password) {
        return res.status(400).json({ error: 'Faltan credenciales' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    if (email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const admin = getAdmin();
        let userRecord = null;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        } catch (e) {
            if (e?.code !== 'auth/user-not-found') throw e;
        }

        if (!userRecord) {
            userRecord = await admin.auth().createUser({ email, password });
        } else {
            await admin.auth().updateUser(userRecord.uid, { password });
        }

        return res.status(200).json({ ok: true, uid: userRecord.uid });
    } catch (error) {
        const message = error && typeof error === 'object' && 'message' in error ? String(error.message || '') : '';
        return res.status(500).json({
            error: 'Internal error',
            ...(nodeEnv !== 'production' ? { details: { message } } : {}),
        });
    }
}

async function handleClaimLegacyProfile(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const emailLower = decoded.email.toLowerCase();

        const usersCol = db.collection(`artifacts/${storeId}/public/data/users`);
        const uidRef = usersCol.doc(decoded.uid);
        const uidSnap = await uidRef.get();
        if (uidSnap.exists) {
            return res.status(200).json({ migrated: false });
        }

        const legacySnap = await usersCol.where('emailLower', '==', emailLower).limit(5).get();
        const legacyDoc = legacySnap.docs.find((d) => d.id !== decoded.uid);
        if (!legacyDoc) {
            return res.status(200).json({ migrated: false });
        }

        const legacyData = stripLegacySensitiveFields(legacyDoc.data());
        const nowIso = new Date().toISOString();

        const batch = db.batch();
        batch.set(uidRef, { ...legacyData, email: decoded.email, emailLower, updatedAt: nowIso, migratedFrom: legacyDoc.id }, { merge: true });
        batch.delete(legacyDoc.ref);

        const usernameLower = normalizeUsernameForKey(legacyData.usernameLower || legacyData.username || '');
        if (usernameLower) {
            const usernameRef = db.doc(`artifacts/${storeId}/public/data/usernames/${usernameLower}`);
            const usernameSnap = await usernameRef.get();
            if (!usernameSnap.exists) {
                batch.set(usernameRef, { uid: decoded.uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        const emailKey = emailToDocKey(emailLower);
        if (emailKey) {
            const emailRef = db.doc(`artifacts/${storeId}/public/data/emails/${emailKey}`);
            const emailSnap = await emailRef.get();
            if (!emailSnap.exists) {
                batch.set(emailRef, { uid: decoded.uid, emailLower, createdAt: nowIso, updatedAt: nowIso }, { merge: true });
            }
        }

        await batch.commit();
        return res.status(200).json({ migrated: true });
    } catch (error) {
        return res.status(500).json({ error: 'Internal error' });
    }
}

async function handleResetPassword(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Email invalido' });
    }

    const emailUser = String(process.env.EMAIL_USER || '').trim();
    const emailPass = String(process.env.EMAIL_PASS || '').trim();
    if (!emailUser || !emailPass) {
        return res.status(500).json({ error: 'Email no configurado en el servidor' });
    }

    const storeId = getStoreIdFromRequest(req);

    try {
        const adminSdk = getAdmin();
        let userExists = true;
        try {
            await adminSdk.auth().getUserByEmail(email);
        } catch (e) {
            if (e?.code === 'auth/user-not-found') {
                userExists = false;
            } else {
                throw e;
            }
        }

        if (userExists) {
            const firebaseLink = await adminSdk.auth().generatePasswordResetLink(email);
            const firebaseUrl = new URL(firebaseLink);
            const oobCode = firebaseUrl.searchParams.get('oobCode');
            const host = req.headers?.host || 'sustore.vercel.app';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const resetLink = `${protocol}://${host}/reset-password.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

            let brandName = 'Sustore';
            if (storeId) {
                try {
                    const settingsSnap = await adminSdk.firestore().doc(`artifacts/${storeId}/public/data/settings/config`).get();
                    if (settingsSnap.exists) {
                        const s = settingsSnap.data() || {};
                        brandName = String(s?.ticket?.brandName || s?.storeName || 'Sustore').trim();
                    }
                } catch { }
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
            });

            const html = buildResetEmailHtml({
                brandName,
                resetLink,
                userEmail: email,
            });

            const fromName = String(brandName).replace(/[\r\n"]/g, '').trim().slice(0, 80) || 'Sustore';
            await transporter.sendMail({
                from: `"${fromName}" <${emailUser}>`,
                to: email,
                replyTo: emailUser,
                subject: `🔒 Restablecer Contrasena — ${fromName}`,
                html,
            });
        }

        // Generic success response to avoid account enumeration.
        return res.status(200).json({ success: true });
    } catch (error) {
        if (isFirebaseAdminMisconfigured(error)) {
            if (!warnedFirebaseAdminMisconfigured) {
                warnedFirebaseAdminMisconfigured = true;
                console.warn('[reset-password] Firebase Admin no configurado. Se devuelve éxito genérico sin enviar email.');
            }
            return res.status(200).json({ success: true });
        }
        console.error('[reset-password] Error:', error);
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}

async function handleSetupProfile(req, res) {
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

async function handleUsernameLookup(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Deprecated by design: avoids account enumeration (email/uid disclosure via username).
    return res.status(410).json({ error: 'Username login deprecated. Use email login.' });
}

export default async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'legacy-login':
            return handleLegacyLogin(req, res);
        case 'bootstrap-super-admin':
            return handleBootstrapSuperAdmin(req, res);
        case 'claim-legacy-profile':
            return handleClaimLegacyProfile(req, res);
        case 'reset-password':
            return handleResetPassword(req, res);
        case 'setup-profile':
            return handleSetupProfile(req, res);
        case 'username-lookup':
            return handleUsernameLookup(req, res);
        default:
            return res.status(404).json({ error: 'Action not found' });
    }
}
