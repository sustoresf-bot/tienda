// api/checkout.js - Mercado Pago Payment Processing
// Esta función serverless procesa pagos de forma segura usando el SDK de Mercado Pago

import { MercadoPagoConfig, Payment } from 'mercadopago';

function hostMatchesUrlHost(urlValue, host) {
    if (!urlValue) return false;
    try {
        const parsed = new URL(urlValue);
        return String(parsed.host || '').trim().toLowerCase() === host;
    } catch {
        return false;
    }
}

function isSameOriginRequest(req) {
    const host = String(req?.headers?.host || '').trim().toLowerCase();
    if (!host) return false;

    const origin = String(req?.headers?.origin || '').trim();
    if (origin) return hostMatchesUrlHost(origin, host);

    const referer = String(req?.headers?.referer || '').trim();
    if (referer) return hostMatchesUrlHost(referer, host);

    // Fallback for browsers/proxies that omit Origin/Referer on same-origin requests.
    const secFetchSite = String(req?.headers?.['sec-fetch-site'] || '').trim().toLowerCase();
    if (secFetchSite === 'same-origin') return true;

    const method = String(req?.method || '').toUpperCase();
    return method === 'GET' || method === 'HEAD';
}

export default async function handler(req, res) {
    // Same-origin endpoint. CORS is intentionally not enabled.
    if (!isSameOriginRequest(req)) {
        return res.status(403).json({ error: 'Forbidden origin' });
    }

    if (req.method === 'GET') {
        try {
            const base = `http://${req?.headers?.host || 'localhost'}`;
            const url = new URL(String(req?.url || ''), base);
            const action = String(url.searchParams.get('action') || '').trim();

            if (action !== 'public_config') {
                return res.status(400).json({ error: 'Invalid action' });
            }

            const mpPublicKey = String(process.env.MP_PUBLIC_KEY || '').trim();
            const firebaseApiKey = String(process.env.FIREBASE_WEB_API_KEY || '').trim();
            const storeId = String(process.env.SUSTORE_APP_ID || 'sustore-63266-prod').trim();
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
            return res.status(200).json({
                mpPublicKey: mpPublicKey || null,
                firebaseApiKey: firebaseApiKey || null,
                storeId: storeId || null,
            });
        } catch (error) {
            return res.status(500).json({ error: 'Internal error' });
        }
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Verificar que tenemos el Access Token configurado
    if (!process.env.MP_ACCESS_TOKEN) {
        console.error('MP_ACCESS_TOKEN not configured');
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Configuración del cliente MP
    const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const action = String(body.action || '').trim();

    try {
        if (action === 'process_payment') {
            const paymentData = body.paymentData && typeof body.paymentData === 'object' ? body.paymentData : null;
            const payer = body.payer && typeof body.payer === 'object' ? body.payer : null;
            const transactionAmount = Number(paymentData?.transaction_amount);
            const token = String(paymentData?.token || '').trim();
            const paymentMethodId = String(paymentData?.payment_method_id || '').trim();
            const payerEmail = String(payer?.email || '').trim().toLowerCase();

            if (!paymentData || !payer) {
                return res.status(400).json({ error: 'Invalid payment payload' });
            }
            if (!Number.isFinite(transactionAmount) || transactionAmount <= 0) {
                return res.status(400).json({ error: 'Invalid transaction amount' });
            }
            if (!token || !paymentMethodId || !payerEmail || !payerEmail.includes('@')) {
                return res.status(400).json({ error: 'Missing required payment fields' });
            }

            const payment = new Payment(client);

            const paymentBody = {
                transaction_amount: transactionAmount,
                token,
                description: paymentData.description || 'Compra en Tienda Online',
                installments: Number(paymentData.installments) || 1,
                payment_method_id: paymentMethodId,
                issuer_id: paymentData.issuer_id ? Number(paymentData.issuer_id) : undefined,
                payer: {
                    email: payerEmail,
                    identification: {
                        type: payer.identificationType || 'DNI',
                        number: String(payer.identificationNumber || ''),
                    },
                },
            };

            // Eliminar issuer_id si es undefined
            if (!paymentBody.issuer_id) {
                delete paymentBody.issuer_id;
            }

            const paymentResponse = await payment.create({ body: paymentBody });

            return res.status(200).json({
                status: paymentResponse.status,
                status_detail: paymentResponse.status_detail,
                id: paymentResponse.id,
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        // Log detallado en la consola de Vercel (Esto lo podés ver vos en Vercel logs)
        console.error('--- ERROR DETALLADO DE MERCADO PAGO ---');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Cause:', JSON.stringify(error.cause, null, 2));

        let errorMessage = 'Error al procesar el pago';
        if (error.cause && Array.isArray(error.cause)) {
            errorMessage = error.cause.map(c => c.description || c.message).join(', ');
        } else if (error.message) {
            errorMessage = error.message;
        }

        return res.status(500).json({
            error: errorMessage,
            details: error.cause || error.message,
            mp_status: error.status
        });
    }
}
