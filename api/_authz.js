import { getAdmin } from './_firebaseAdmin.js';

export const APP_ID = process.env.SUSTORE_APP_ID || 'sustore-63266-prod';

export async function getSettingsConfig() {
    const adminSdk = getAdmin();
    const ref = adminSdk.firestore().doc(`artifacts/${APP_ID}/public/data/settings/config`);
    const snap = await ref.get();
    return snap.exists ? snap.data() : null;
}

export async function getUserRoleByEmail(email) {
    if (!email) return null;

    const normalizedEmail = String(email).trim().toLowerCase();
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    if (superAdminEmail && normalizedEmail === superAdminEmail) return 'admin';

    const config = await getSettingsConfig();
    const teamRoles = config?.teamRoles && typeof config.teamRoles === 'object' ? config.teamRoles : null;
    if (teamRoles) {
        const role = teamRoles[normalizedEmail];
        return role || null;
    }
    const team = Array.isArray(config?.team) ? config.team : [];

    const member = team.find((m) => (m?.email || '').trim().toLowerCase() === normalizedEmail);
    return member?.role || null;
}

export async function isAdminEmail(email) {
    const role = await getUserRoleByEmail(email);
    return role === 'admin';
}
