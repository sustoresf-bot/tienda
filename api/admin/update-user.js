
import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, email, password, role } = req.body;

    if (!uid) {
        return res.status(400).json({ error: 'Missing UID' });
    }

    try {
        const updateData = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;

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

        // Si hay cambio de rol, podemos manejarlo aquí o dejar que el cliente actualice Firestore.
        // Por seguridad, los cambios críticos se hacen vía Admin SDK.

        return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente en Auth', authUpdated: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: error.message });
    }
}
