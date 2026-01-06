
import admin from 'firebase-admin';

// Inicialización Lazy de Firebase Admin para evitar errores de reinicialización en hot-reload
if (!admin.apps.length) {
    try {
        // En Vercel/Producción, se suelen usar variables de entorno.
        // Se espera que FIREBASE_SERVICE_ACCOUNT sea un JSON string o variables individuales.
        // Aquí usamos una configuración genérica robusta que busca credenciales en ENV.

        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
            };

        if (serviceAccount.projectId) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Fallback para desarrollo local si no hay credenciales (esto fallará al intentar auth)
            console.warn("No se encontraron credenciales de Firebase Admin. La función fallará.");
            admin.initializeApp();
        }

    } catch (error) {
        console.error("Error inicializando Firebase Admin:", error.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, newPassword } = req.body;

    if (!uid || !newPassword) {
        return res.status(400).json({ error: 'Faltan datos (uid, newPassword)' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        // Actualizar contraseña usando Admin SDK
        await admin.auth().updateUser(uid, {
            password: newPassword
        });

        return res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        return res.status(500).json({ error: error.message || 'Error interno al actualizar contraseña.' });
    }
}
