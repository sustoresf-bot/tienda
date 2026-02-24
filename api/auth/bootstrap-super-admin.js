import { getAdmin } from '../../lib/firebaseAdmin.js';

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

export default async function handler(req, res) {
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
