import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest, isAdminEmail } from '../../lib/authz.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const storeId = getStoreIdFromRequest(req);
    if (!(await isAdminEmail(decoded.email, storeId))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const uid = String(req.body?.uid || '').trim();
    if (!uid) {
        return res.status(400).json({ error: 'Missing UID' });
    }

    let action = String(req.body?.action || '').trim().toLowerCase();
    if (!action) {
        action = req.body?.email || req.body?.password ? 'update' : 'delete';
    }

    try {
        const admin = getAdmin();

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
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Internal error' });
    }
}
