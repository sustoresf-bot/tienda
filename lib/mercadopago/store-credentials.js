import { decryptSecret, encryptSecret } from '../secrets.js';
import { buildOAuthTokenExpiresAt, refreshOAuthTokens } from './oauth.js';

function createApiError(code, message, status = 500) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function normalizeStoreId(storeId) {
    return String(storeId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
}

function getOAuthDocPath(storeId) {
    const safeStoreId = normalizeStoreId(storeId);
    if (!safeStoreId) {
        throw createApiError('invalid_store_id', 'Invalid storeId', 400);
    }
    return `artifacts/${safeStoreId}/private/data/mercadoPago/oauth`;
}

function getOAuthDocRef(db, storeId) {
    return db.doc(getOAuthDocPath(storeId));
}

function normalizeOAuthPayload(raw, fallback = {}) {
    const accessToken = String(raw?.access_token || '').trim();
    const refreshToken = String(raw?.refresh_token || fallback.refreshToken || '').trim();
    const publicKey = String(raw?.public_key || fallback.publicKey || '').trim();
    const scope = String(raw?.scope || fallback.scope || '').trim();
    const expiresAt = raw?.expires_in
        ? buildOAuthTokenExpiresAt(raw.expires_in)
        : (fallback.expiresAt || null);
    const userIdRaw = raw?.user_id ?? fallback.mpUserId ?? null;
    const mpUserId = userIdRaw == null || userIdRaw === '' ? null : Number(userIdRaw);
    const liveMode = typeof raw?.live_mode === 'boolean'
        ? raw.live_mode
        : (typeof fallback.liveMode === 'boolean' ? fallback.liveMode : null);

    if (!accessToken) {
        throw createApiError('oauth_missing_access_token', 'OAuth access token was not returned by Mercado Pago', 502);
    }
    if (!refreshToken) {
        throw createApiError('oauth_missing_refresh_token', 'OAuth refresh token was not returned by Mercado Pago', 502);
    }

    return {
        accessToken,
        refreshToken,
        publicKey: publicKey || null,
        scope: scope || null,
        expiresAt: expiresAt || null,
        mpUserId: Number.isFinite(mpUserId) ? mpUserId : null,
        liveMode,
    };
}

export async function saveStoreOAuthCredentials({ db, storeId, oauthResponse, connectedByUid = null }) {
    const ref = getOAuthDocRef(db, storeId);
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? (existingSnap.data() || {}) : {};
    const normalized = normalizeOAuthPayload(oauthResponse, {
        publicKey: existing.publicKey || null,
        scope: existing.scope || null,
        expiresAt: existing.expiresAt || null,
        mpUserId: existing.mpUserId ?? null,
        liveMode: existing.liveMode ?? null,
    });

    const nowIso = new Date().toISOString();
    const connectedAt = existing.connectedAt || nowIso;
    const connectedBy = String(connectedByUid || existing.connectedByUid || '').trim() || null;

    await ref.set({
        accessTokenEncrypted: encryptSecret(normalized.accessToken),
        refreshTokenEncrypted: encryptSecret(normalized.refreshToken),
        publicKey: normalized.publicKey,
        mpUserId: normalized.mpUserId,
        scope: normalized.scope,
        liveMode: normalized.liveMode,
        expiresAt: normalized.expiresAt,
        connectedByUid: connectedBy,
        connectedAt,
        updatedAt: nowIso,
    }, { merge: true });

    return {
        connected: true,
        mpUserId: normalized.mpUserId,
        liveMode: normalized.liveMode,
        scope: normalized.scope,
        expiresAt: normalized.expiresAt,
        publicKey: normalized.publicKey,
    };
}

export async function getStoreOAuthStatus({ db, storeId }) {
    const ref = getOAuthDocRef(db, storeId);
    const snap = await ref.get();
    if (!snap.exists) {
        return {
            connected: false,
            mpUserId: null,
            liveMode: null,
            scope: null,
            expiresAt: null,
            publicKey: null,
        };
    }

    const data = snap.data() || {};
    const hasCredentials = !!(data.accessTokenEncrypted && data.refreshTokenEncrypted);

    return {
        connected: hasCredentials,
        mpUserId: data.mpUserId ?? null,
        liveMode: typeof data.liveMode === 'boolean' ? data.liveMode : null,
        scope: data.scope || null,
        expiresAt: data.expiresAt || null,
        publicKey: data.publicKey || null,
    };
}

async function refreshStoreAccessTokenIfNeeded({ db, storeId, data }) {
    const expiresAtMs = Date.parse(String(data?.expiresAt || ''));
    const isExpired = Number.isFinite(expiresAtMs) ? (expiresAtMs <= Date.now() + 60_000) : true;
    if (!isExpired) {
        const accessToken = decryptSecret(data.accessTokenEncrypted);
        return {
            accessToken,
            refreshed: false,
            publicKey: data.publicKey || null,
        };
    }

    if (!data.refreshTokenEncrypted) {
        throw createApiError('oauth_missing_refresh_token', 'OAuth refresh token is missing', 500);
    }

    const refreshToken = decryptSecret(data.refreshTokenEncrypted);
    let refreshed;
    try {
        refreshed = await refreshOAuthTokens(refreshToken);
    } catch (error) {
        const message = String(error?.message || 'No se pudo renovar el token de Mercado Pago').trim();
        throw createApiError('oauth_refresh_failed', message, 502);
    }

    const normalized = normalizeOAuthPayload(refreshed, {
        refreshToken,
        publicKey: data.publicKey || null,
        scope: data.scope || null,
        expiresAt: data.expiresAt || null,
        mpUserId: data.mpUserId ?? null,
        liveMode: data.liveMode ?? null,
    });

    const ref = getOAuthDocRef(db, storeId);
    await ref.set({
        accessTokenEncrypted: encryptSecret(normalized.accessToken),
        refreshTokenEncrypted: encryptSecret(normalized.refreshToken),
        publicKey: normalized.publicKey,
        mpUserId: normalized.mpUserId,
        scope: normalized.scope,
        liveMode: normalized.liveMode,
        expiresAt: normalized.expiresAt,
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    return {
        accessToken: normalized.accessToken,
        refreshed: true,
        publicKey: normalized.publicKey,
    };
}

export async function getStoreAccessTokenForOperations({ db, storeId }) {
    const ref = getOAuthDocRef(db, storeId);
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() || {}) : null;

    if (data?.accessTokenEncrypted && data?.refreshTokenEncrypted) {
        const resolved = await refreshStoreAccessTokenIfNeeded({ db, storeId, data });
        return {
            accessToken: resolved.accessToken,
            source: 'oauth',
            refreshed: resolved.refreshed,
            publicKey: resolved.publicKey || null,
        };
    }

    const legacyToken = String(process.env.MP_ACCESS_TOKEN || '').trim();
    if (legacyToken) {
        return {
            accessToken: legacyToken,
            source: 'legacy',
            refreshed: false,
            publicKey: String(process.env.MP_PUBLIC_KEY || '').trim() || null,
        };
    }

    throw createApiError('mercadopago_not_configured', 'Mercado Pago no esta configurado para esta tienda', 500);
}

export async function getStorePublicKeyForCheckout({ db, storeId }) {
    const status = await getStoreOAuthStatus({ db, storeId });
    if (status.connected && status.publicKey) {
        return {
            publicKey: status.publicKey,
            source: 'oauth',
        };
    }

    const legacyPublicKey = String(process.env.MP_PUBLIC_KEY || '').trim();
    return {
        publicKey: legacyPublicKey || null,
        source: legacyPublicKey ? 'legacy' : 'none',
    };
}

export async function disconnectStoreOAuthCredentials({ db, storeId }) {
    const ref = getOAuthDocRef(db, storeId);
    await ref.delete();
}
