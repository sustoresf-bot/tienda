import { getAdmin, verifyIdTokenFromRequest } from '../../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../../lib/authz.js';
import { disconnectStoreOAuthCredentials } from '../../../lib/mercadopago/store-credentials.js';

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
        await disconnectStoreOAuthCredentials({ db, storeId });
        return res.status(200).json({ success: true });
    } catch (error) {
        const statusCode = Number(error?.status) || 500;
        return res.status(statusCode).json({
            error: error?.message || 'No se pudo desconectar Mercado Pago',
            code: error?.code || 'oauth_disconnect_failed',
        });
    }
}
