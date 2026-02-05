import { getEnv } from './env.js';
import { getFirebaseAdmin } from './firebaseAdmin.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function parseBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function getAdminAllowList() {
  const superAdmin = normalizeEmail(
    getEnv('SUPER_ADMIN_EMAIL', { required: false, defaultValue: '' })
  );
  const admins = getEnv('ADMIN_EMAILS', { required: false, defaultValue: '' })
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  return new Set([superAdmin, ...admins].filter(Boolean));
}

export async function requireAdmin(req) {
  const token = parseBearerToken(req);
  if (!token) {
    const err = new Error('Missing Authorization Bearer token');
    err.statusCode = 401;
    throw err;
  }

  const admin = getFirebaseAdmin();
  const decoded = await admin.auth().verifyIdToken(token);

  if (decoded.admin === true) return decoded;

  const allowList = getAdminAllowList();
  const email = normalizeEmail(decoded.email);

  if (!email || !allowList.has(email)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  return decoded;
}
