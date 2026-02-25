import { getAdmin, verifyIdTokenFromRequest } from '../../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../../lib/authz.js';
import { createAuthorizationUrl } from '../../../lib/mercadopago/oauth.js';

function getRequestOrigin(req) {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req?.headers?.host || '').split(',')[0].trim();
    if (!host) {
        const fallback = String(process.env.PUBLIC_SITE_URL || '').trim();
        return fallback || null;
    }
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    return `${protocol}://${host}`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    if (!(await isAdminEmail(decoded.email, storeId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const returnTo = getRequestOrigin(req);
        const result = await createAuthorizationUrl({
            storeId,
            uid: decoded.uid,
            db,
            returnTo,
        });

        return res.status(200).json({
            authorizationUrl: result.authorizationUrl,
            expiresAt: result.expiresAt,
        });
    } catch (error) {
        const status = Number(error?.status) || 500;
        return res.status(status).json({
            error: error?.message || 'No se pudo iniciar la conexion con Mercado Pago',
            code: error?.code || 'oauth_connect_failed',
        });
    }
}
