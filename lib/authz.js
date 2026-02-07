import { getAdmin } from './firebaseAdmin.js';

export const DEFAULT_APP_ID = process.env.SUSTORE_APP_ID || 'sustore-63266-prod';

export function getStoreIdFromRequest(req) {
    const headerValue = req?.headers?.['x-store-id'] || req?.headers?.['X-Store-Id'];
    const bodyValue = req?.body?.storeId;
    const candidate = String(headerValue || bodyValue || '').trim();
    const cleaned = candidate.replace(/[^a-zA-Z0-9_-]/g, '');
    return cleaned || DEFAULT_APP_ID;
}

export async function getSettingsConfig(storeId = DEFAULT_APP_ID) {
    const adminSdk = getAdmin();
    const ref = adminSdk.firestore().doc(`artifacts/${storeId}/public/data/settings/config`);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
}

export async function getUserRoleByEmail(email, storeId = DEFAULT_APP_ID) {
    if (!email) return null;

    const normalizedEmail = String(email).trim().toLowerCase();
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    if (superAdminEmail && normalizedEmail === superAdminEmail) return 'admin';

    const config = await getSettingsConfig(storeId);
    const teamRoles = config?.teamRoles && typeof config.teamRoles === 'object' ? config.teamRoles : null;
    if (teamRoles) {
        const role = teamRoles[normalizedEmail];
        if (role) return role;
    }
    const team = Array.isArray(config?.team) ? config.team : [];
    const member = team.find((m) => (m?.email || '').trim().toLowerCase() === normalizedEmail);
    if (member?.role) return member.role;

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const snap = await db.collection(`artifacts/${storeId}/public/data/users`)
            .where('emailLower', '==', normalizedEmail)
            .limit(1)
            .get();
        if (!snap.empty) {
            const userRole = snap.docs[0].data()?.role;
            if (userRole && userRole !== 'user') return userRole;
        }
    } catch (_) { /* ignore fallback errors */ }

    return null;
}

export async function isAdminEmail(email, storeId = DEFAULT_APP_ID) {
    const role = await getUserRoleByEmail(email, storeId);
    return role === 'admin';
}
