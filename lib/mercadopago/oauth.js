import crypto from 'crypto';
import { MercadoPagoConfig, OAuth } from 'mercadopago';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function createApiError(code, message, status = 500) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function requireOAuthEnvVar(name) {
    const value = String(process.env[name] || '').trim();
    if (!value) {
        throw createApiError('oauth_not_configured', `${name} is not configured`, 500);
    }
    return value;
}

function getOAuthAppAccessToken() {
    const value = String(process.env.MP_OAUTH_APP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '').trim();
    if (!value) {
        throw createApiError(
            'oauth_not_configured',
            'MP_OAUTH_APP_ACCESS_TOKEN (or MP_ACCESS_TOKEN fallback) is not configured',
            500
        );
    }
    return value;
}

function getOAuthClient() {
    const accessToken = getOAuthAppAccessToken();
    const client = new MercadoPagoConfig({ accessToken });
    return new OAuth(client);
}

export function buildOAuthTokenExpiresAt(expiresInSeconds) {
    const ttl = Number(expiresInSeconds) || 0;
    const safeTtl = Math.max(60, ttl);
    return new Date(Date.now() + safeTtl * 1000).toISOString();
}

export async function createAuthorizationUrl({ storeId, uid, db, returnTo = null }) {
    const clientId = requireOAuthEnvVar('MP_OAUTH_CLIENT_ID');
    const redirectUri = requireOAuthEnvVar('MP_OAUTH_REDIRECT_URI');
    const oauth = getOAuthClient();

    const state = crypto.randomBytes(24).toString('hex');
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();

    const stateRef = db.doc(`artifacts/${storeId}/private/data/mercadoPagoOauthStates/${state}`);
    await stateRef.set({
        uid: String(uid || '').trim(),
        storeId: String(storeId || '').trim(),
        createdAt: nowIso,
        expiresAt,
        used: false,
        usedAt: null,
        result: null,
        returnTo: returnTo ? String(returnTo).trim() : null,
    });

    const authorizationUrl = oauth.getAuthorizationURL({
        options: {
            client_id: clientId,
            redirect_uri: redirectUri,
            state,
        },
    });

    return { authorizationUrl, expiresAt, state };
}

export async function exchangeOAuthCodeForTokens(code) {
    const clientId = requireOAuthEnvVar('MP_OAUTH_CLIENT_ID');
    const clientSecret = requireOAuthEnvVar('MP_OAUTH_CLIENT_SECRET');
    const redirectUri = requireOAuthEnvVar('MP_OAUTH_REDIRECT_URI');
    const oauth = getOAuthClient();

    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) {
        throw createApiError('oauth_invalid_code', 'Missing OAuth authorization code', 400);
    }

    return oauth.create({
        body: {
            client_id: clientId,
            client_secret: clientSecret,
            code: normalizedCode,
            redirect_uri: redirectUri,
        },
    });
}

export async function refreshOAuthTokens(refreshToken) {
    const clientId = requireOAuthEnvVar('MP_OAUTH_CLIENT_ID');
    const clientSecret = requireOAuthEnvVar('MP_OAUTH_CLIENT_SECRET');
    const oauth = getOAuthClient();

    const normalizedRefreshToken = String(refreshToken || '').trim();
    if (!normalizedRefreshToken) {
        throw createApiError('oauth_missing_refresh_token', 'Missing OAuth refresh token', 500);
    }

    return oauth.refresh({
        body: {
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: normalizedRefreshToken,
        },
    });
}
