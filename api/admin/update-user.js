
import { getFirebaseAdmin } from '../_utils/firebaseAdmin.js';
import { requireAdmin } from '../_utils/requireAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await requireAdmin(req);
    } catch (error) {
        return res.status(error.statusCode || 500).json({ error: error.message || 'Error interno' });
    }

    const { uid, email, password } = req.body || {};

    if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ error: 'Missing UID' });
    }

    try {
        const admin = getFirebaseAdmin();
        const updateData = {};
        if (email && typeof email === 'string') updateData.email = email;
        if (password && typeof password === 'string') updateData.password = password;

        // Si hay datos para Auth, intentamos actualizar
        if (Object.keys(updateData).length > 0) {
            try {
                await admin.auth().updateUser(uid, updateData);
            } catch (authError) {
                // Si el usuario no existe en Auth, informamos pero no es crítico para datos de Firestore
                if (authError.code === 'auth/user-not-found') {
                    return res.status(200).json({
                        success: true,
                        warning: 'Usuario no encontrado en Auth. Solo se actualizarán datos en Firestore.',
                        authUpdated: false
                    });
                }
                throw authError;
            }
        }

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente en Auth', authUpdated: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: error.message });
    }
}
