import { getAdmin } from '../firebaseAdmin.js';
import { exchangeOAuthCodeForTokens } from './oauth.js';
import { saveStoreOAuthCredentials } from './store-credentials.js';

function parseBool(value) {
    return value === true || value === 'true';
}

function buildDefaultRedirectOrigin(req) {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req?.headers?.host || '').split(',')[0].trim();
    const fallback = String(process.env.PUBLIC_SITE_URL || '').trim();
    if (fallback) {
        try {
            const parsed = new URL(fallback);
            return parsed.origin;
        } catch (_) {
            // ignore invalid fallback URL
        }
    }
    if (!host) return 'http://localhost:3000';
    const isLocalHost = host.includes('localhost') || host.startsWith('127.0.0.1') || host.startsWith('::1');
    const protocol = forwardedProto || (isLocalHost ? 'http' : 'https');
    return `${protocol}://${host}`;
}

function buildRedirectUrl(origin, status, errorCode = '') {
    const target = new URL(origin);
    target.searchParams.set('mp_oauth', status);
    if (errorCode) target.searchParams.set('mp_oauth_error', errorCode);
    return target.toString();
}

function sanitizeErrorCode(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 60);
}

function resolveReturnToOrigin(rawReturnTo, fallbackOrigin) {
    const raw = String(rawReturnTo || '').trim();
    if (!raw) return fallbackOrigin;
    try {
        const parsed = new URL(raw);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.origin;
        }
    } catch (_) {
        // ignore invalid URL
    }
    return fallbackOrigin;
}

function sendRedirect(res, url, status = 302) {
    res.statusCode = status;
    res.setHeader('Location', url);
    res.end();
}

async function findStateSnapshot(db, state) {
    const snap = await db
        .collectionGroup('mercadoPagoOauthStates')
        .where('state', '==', state)
        .limit(2)
        .get();

    if (snap.empty) return null;
    if (snap.docs.length > 1) {
        const error = new Error('Duplicated OAuth state');
        error.code = 'oauth_state_duplicated';
        error.status = 500;
        throw error;
    }
    return snap.docs[0];
}

export async function handleMercadoPagoOAuthCallback({ req, res }) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const base = `http://${req?.headers?.host || 'localhost'}`;
    const url = new URL(String(req?.url || ''), base);
    const code = String(url.searchParams.get('code') || '').trim();
    const state = String(url.searchParams.get('state') || '').trim();
    const providerError = String(url.searchParams.get('error') || '').trim();

    const fallbackOrigin = buildDefaultRedirectOrigin(req);
    if (!state) {
        return sendRedirect(res, buildRedirectUrl(fallbackOrigin, 'error', 'missing_state'));
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();

        const stateDoc = await findStateSnapshot(db, state);
        if (!stateDoc) {
            return sendRedirect(res, buildRedirectUrl(fallbackOrigin, 'error', 'invalid_state'));
        }

        const stateRef = stateDoc.ref;
        const stateData = stateDoc.data() || {};
        const storeId = String(stateData.storeId || '').trim();
        const uid = String(stateData.uid || '').trim();
        const returnToOrigin = resolveReturnToOrigin(stateData.returnTo, fallbackOrigin);

        await db.runTransaction(async (tx) => {
            const txSnap = await tx.get(stateRef);
            if (!txSnap.exists) {
                const error = new Error('OAuth state not found');
                error.code = 'oauth_state_not_found';
                error.status = 400;
                throw error;
            }
            const fresh = txSnap.data() || {};
            const expiresAtMs = Date.parse(String(fresh.expiresAt || ''));
            const alreadyUsed = parseBool(fresh.used);
            if (alreadyUsed) {
                const error = new Error('OAuth state already used');
                error.code = 'oauth_state_already_used';
                error.status = 400;
                throw error;
            }
            if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) {
                const error = new Error('OAuth state expired');
                error.code = 'oauth_state_expired';
                error.status = 400;
                throw error;
            }

            tx.set(stateRef, {
                used: true,
                usedAt: new Date().toISOString(),
                result: {
                    status: providerError ? 'denied' : 'processing',
                    at: new Date().toISOString(),
                },
            }, { merge: true });
        });

        if (providerError) {
            const errCode = sanitizeErrorCode(providerError || 'access_denied');
            await stateRef.set({
                result: {
                    status: 'denied',
                    code: errCode,
                    at: new Date().toISOString(),
                },
            }, { merge: true });
            return sendRedirect(res, buildRedirectUrl(returnToOrigin, 'denied', errCode));
        }

        if (!code) {
            await stateRef.set({
                result: {
                    status: 'error',
                    code: 'missing_code',
                    at: new Date().toISOString(),
                },
            }, { merge: true });
            return sendRedirect(res, buildRedirectUrl(returnToOrigin, 'error', 'missing_code'));
        }

        if (!storeId || !uid) {
            await stateRef.set({
                result: {
                    status: 'error',
                    code: 'invalid_state_payload',
                    at: new Date().toISOString(),
                },
            }, { merge: true });
            return sendRedirect(res, buildRedirectUrl(returnToOrigin, 'error', 'invalid_state_payload'));
        }

        const oauthResponse = await exchangeOAuthCodeForTokens(code);
        await saveStoreOAuthCredentials({
            db,
            storeId,
            oauthResponse,
            connectedByUid: uid,
        });

        await stateRef.set({
            result: {
                status: 'connected',
                at: new Date().toISOString(),
            },
        }, { merge: true });

        return sendRedirect(res, buildRedirectUrl(returnToOrigin, 'connected'));
    } catch (error) {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        try {
            const stateDoc = await findStateSnapshot(db, state);
            if (stateDoc?.ref) {
                await stateDoc.ref.set({
                    result: {
                        status: 'error',
                        code: sanitizeErrorCode(error?.code || error?.message || 'callback_failed'),
                        at: new Date().toISOString(),
                    },
                }, { merge: true });
            }
        } catch (_) {
            // ignore state update errors in fallback path
        }
        return sendRedirect(
            res,
            buildRedirectUrl(
                fallbackOrigin,
                'error',
                sanitizeErrorCode(error?.code || error?.message || 'callback_failed')
            )
        );
    }
}
