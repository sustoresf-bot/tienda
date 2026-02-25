// api/checkout.js - Mercado Pago Payment Processing
// Esta función serverless procesa pagos de forma segura usando el SDK de Mercado Pago

import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getAdmin } from '../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../lib/authz.js';
import {
    getStoreAccessTokenForOperations,
    getStorePublicKeyForCheckout,
} from '../lib/mercadopago/store-credentials.js';

function isSameOriginRequest(req) {
    const origin = String(req?.headers?.origin || '').trim();
    if (!origin) return true;
    const host = String(req?.headers?.host || '').trim().toLowerCase();
    if (!host) return false;
    try {
        const parsedOrigin = new URL(origin);
        return String(parsedOrigin.host || '').trim().toLowerCase() === host;
    } catch {
        return false;
    }
}

function buildErrorResponse(error) {
    let errorMessage = 'Error al procesar el pago';
    if (error?.cause && Array.isArray(error.cause)) {
        errorMessage = error.cause.map((c) => c.description || c.message).filter(Boolean).join(', ') || errorMessage;
    } else if (error?.message) {
        errorMessage = String(error.message);
    }

    return {
        error: errorMessage,
        details: error?.cause || error?.message || null,
        code: error?.code || null,
        mp_status: error?.status || null,
    };
}

export default async function handler(req, res) {
    // Same-origin endpoint. CORS is intentionally not enabled.
    if (!isSameOriginRequest(req)) {
        return res.status(403).json({ error: 'Forbidden origin' });
    }

    const storeId = getStoreIdFromRequest(req);

    if (req.method === 'GET') {
        try {
            const base = `http://${req?.headers?.host || 'localhost'}`;
            const url = new URL(String(req?.url || ''), base);
            const action = String(url.searchParams.get('action') || '').trim();

            if (action !== 'public_config') {
                return res.status(400).json({ error: 'Invalid action' });
            }

            const firebaseApiKey = String(process.env.FIREBASE_WEB_API_KEY || '').trim();
            const adminSdk = getAdmin();
            const db = adminSdk.firestore();
            const { publicKey } = await getStorePublicKeyForCheckout({ db, storeId });

            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
            return res.status(200).json({
                mpPublicKey: publicKey || null,
                firebaseApiKey: firebaseApiKey || null,
                storeId: storeId || null,
            });
        } catch (error) {
            return res.status(500).json({
                error: 'Internal error',
                code: error?.code || 'public_config_failed',
            });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, paymentData = {}, payer = {} } = req.body || {};
    if (action !== 'process_payment') {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const { accessToken } = await getStoreAccessTokenForOperations({ db, storeId });

        const client = new MercadoPagoConfig({ accessToken });
        const payment = new Payment(client);

        const paymentBody = {
            transaction_amount: Number(paymentData.transaction_amount),
            token: paymentData.token,
            description: paymentData.description || 'Compra en Tienda Online',
            installments: Number(paymentData.installments) || 1,
            payment_method_id: paymentData.payment_method_id,
            issuer_id: paymentData.issuer_id ? Number(paymentData.issuer_id) : undefined,
            payer: {
                email: payer.email,
                identification: {
                    type: payer.identificationType || 'DNI',
                    number: String(payer.identificationNumber || ''),
                },
            },
        };

        if (!paymentBody.issuer_id) delete paymentBody.issuer_id;

        const paymentResponse = await payment.create({ body: paymentBody });
        return res.status(200).json({
            status: paymentResponse.status,
            status_detail: paymentResponse.status_detail,
            id: paymentResponse.id,
        });
    } catch (error) {
        const statusCode = Number(error?.status);
        const response = buildErrorResponse(error);
        if (Number.isFinite(statusCode) && statusCode >= 400 && statusCode < 600) {
            return res.status(statusCode).json(response);
        }
        return res.status(500).json(response);
    }
}
