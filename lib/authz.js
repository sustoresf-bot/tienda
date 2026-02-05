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
        return role || null;
    }
    const team = Array.isArray(config?.team) ? config.team : [];

    const member = team.find((m) => (m?.email || '').trim().toLowerCase() === normalizedEmail);
    return member?.role || null;
}

export async function isAdminEmail(email, storeId = DEFAULT_APP_ID) {
    const role = await getUserRoleByEmail(email, storeId);
    return role === 'admin';
}
