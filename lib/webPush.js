import crypto from 'crypto';
import { getUserRoleByEmail } from './authz.js';

let webPushClientPromise = null;

function envText(value) {
    return String(value || '').trim();
}

export function hasWebPushConfig() {
    return !!(envText(process.env.WEB_PUSH_PUBLIC_KEY) && envText(process.env.WEB_PUSH_PRIVATE_KEY) && envText(process.env.WEB_PUSH_SUBJECT));
}

async function getWebPushClient() {
    if (webPushClientPromise) return webPushClientPromise;

    webPushClientPromise = (async () => {
        const { default: webpush } = await import('web-push');
        webpush.setVapidDetails(
            envText(process.env.WEB_PUSH_SUBJECT),
            envText(process.env.WEB_PUSH_PUBLIC_KEY),
            envText(process.env.WEB_PUSH_PRIVATE_KEY)
        );
        return webpush;
    })();

    return webPushClientPromise;
}

export function getWebPushPublicKey() {
    return envText(process.env.WEB_PUSH_PUBLIC_KEY);
}

export function buildSubscriptionId(endpoint) {
    return crypto.createHash('sha256').update(String(endpoint || '').trim()).digest('hex');
}

export function normalizePushSubscription(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const endpoint = String(payload.endpoint || '').trim();
    const keys = payload.keys && typeof payload.keys === 'object' ? payload.keys : {};
    const p256dh = String(keys.p256dh || '').trim();
    const auth = String(keys.auth || '').trim();
    if (!endpoint || !p256dh || !auth) return null;
    return {
        endpoint,
        expirationTime: payload.expirationTime == null ? null : payload.expirationTime,
        keys: { p256dh, auth },
    };
}

export async function resolveStaffRole({ decoded, storeId }) {
    if (!decoded?.email) return null;
    const role = await getUserRoleByEmail(decoded.email, storeId);
    return role === 'admin' || role === 'editor' || role === 'employee' ? role : null;
}

export async function sendOrderPushNotifications({
    adminSdk,
    storeId,
    orderId,
    total,
    customerName,
    shippingMethod,
}) {
    if (!hasWebPushConfig()) {
        return { sent: 0, failed: 0, disabled: 0, skipped: true };
    }

    const db = adminSdk.firestore();
    const nowIso = new Date().toISOString();
    const snapshot = await db.collection(`artifacts/${storeId}/public/data/pushSubscriptions`).limit(300).get();
    if (snapshot.empty) {
        return { sent: 0, failed: 0, disabled: 0, skipped: false };
    }

    const webpush = await getWebPushClient();
    const payload = JSON.stringify({
        title: 'Nuevo pedido',
        body: `${customerName || 'Cliente'} • #${orderId} • $${Number(total || 0).toLocaleString('es-AR')}`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `pedido-${String(orderId || '').trim() || 'nuevo'}`,
        url: '/?view=admin&tab=orders',
        data: {
            orderId: String(orderId || '').trim(),
            total: Number(total || 0),
            shippingMethod: String(shippingMethod || '').trim() || 'Envio',
        },
    });

    let sent = 0;
    let failed = 0;
    let disabled = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data() || {};
        if (data.disabled === true) continue;
        const role = String(data.role || '').trim().toLowerCase();
        if (!['admin', 'editor', 'employee'].includes(role)) continue;

        const subscription = normalizePushSubscription({
            endpoint: data.endpoint,
            expirationTime: data.expirationTime ?? null,
            keys: data.keys,
        });
        if (!subscription) {
            failed += 1;
            continue;
        }

        try {
            await webpush.sendNotification(subscription, payload, { TTL: 120 });
            sent += 1;
            await docSnap.ref.set({ lastSuccessAt: nowIso, lastErrorAt: null, disabled: false }, { merge: true });
        } catch (error) {
            failed += 1;
            const statusCode = Number(error?.statusCode) || 0;
            const shouldDisable = statusCode === 404 || statusCode === 410;
            if (shouldDisable) disabled += 1;
            await docSnap.ref.set({
                lastErrorAt: nowIso,
                lastErrorCode: statusCode || null,
                lastErrorMessage: String(error?.message || 'push_send_failed').slice(0, 300),
                disabled: shouldDisable ? true : data.disabled === true,
            }, { merge: true });
        }
    }

    return { sent, failed, disabled, skipped: false };
}
