
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

    const { uid } = req.body || {};

    if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ error: 'Faltan datos (uid)' });
    }

    try {
        const admin = getFirebaseAdmin();
        // Intentar eliminar de Firebase Auth
        try {
            await admin.auth().deleteUser(uid);
        } catch (authError) {
            // Si el usuario no existe en Auth, no es un error crítico
            // Solo logueamos y continuamos (el usuario puede existir solo en Firestore)
            if (authError.code === 'auth/user-not-found') {
                console.log(`Usuario ${uid} no encontrado en Auth, continuando con eliminación de Firestore...`);
            } else {
                throw authError; // Re-lanzar otros errores
            }
        }

        return res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ error: error.message || 'Error interno al eliminar usuario.' });
    }
}
