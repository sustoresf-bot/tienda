import { getAdmin, verifyIdTokenFromRequest } from '../_firebaseAdmin.js';
import { isAdminEmail } from '../_authz.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!(await isAdminEmail(decoded.email))) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { uid } = req.body;

    if (!uid) {
        return res.status(400).json({ error: 'Faltan datos (uid)' });
    }

    try {
        const admin = getAdmin();
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
