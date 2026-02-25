// api/checkout.js - Mercado Pago Payment Processing
// Esta función serverless procesa pagos de forma segura usando el SDK de Mercado Pago

import { MercadoPagoConfig, Payment } from 'mercadopago';

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

    // Verificar que tenemos el Access Token configurado
    if (!process.env.MP_ACCESS_TOKEN) {
        console.error('MP_ACCESS_TOKEN not configured');
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Configuración del cliente MP
    const client = new MercadoPagoConfig({
        accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const { action, paymentData, payer } = req.body;

    try {
        if (action === 'process_payment') {
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
