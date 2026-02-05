// api/checkout.js - Mercado Pago Payment Processing
// Esta función serverless procesa pagos de forma segura usando el SDK de Mercado Pago

import { MercadoPagoConfig, Payment } from 'mercadopago';
import { getAllowedOrigins, getEnv } from './_utils/env.js';

export default async function handler(req, res) {
    const origin = req.headers.origin;
    const allowedOrigins = getAllowedOrigins();
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);

    if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        if (origin && allowedOrigins.length > 0 && !isAllowedOrigin) {
            return res.status(403).end();
        }
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (origin && allowedOrigins.length > 0 && !isAllowedOrigin) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }

    let accessToken;
    try {
        accessToken = getEnv('MP_ACCESS_TOKEN');
    } catch {
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    // Configuración del cliente MP
    const client = new MercadoPagoConfig({
        accessToken,
    });
    const payment = new Payment(client);

    const { action, paymentData, payer } = req.body || {};

    try {
        if (action === 'process_payment') {
            if (!paymentData || isNaN(paymentData.transaction_amount) || Number(paymentData.transaction_amount) <= 0) {
                return res.status(400).json({ error: 'Monto de transacción inválido' });
            }
            if (!paymentData.token || typeof paymentData.token !== 'string') {
                return res.status(400).json({ error: 'Token de tarjeta inválido' });
            }
            if (!paymentData.payment_method_id || typeof paymentData.payment_method_id !== 'string') {
                return res.status(400).json({ error: 'Método de pago inválido' });
            }
            if (!payer || typeof payer !== 'object' || !payer.email || typeof payer.email !== 'string') {
                return res.status(400).json({ error: 'Email del pagador inválido' });
            }

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
            console.log('Respuesta de MP:', JSON.stringify({
                status: paymentResponse.status,
                status_detail: paymentResponse.status_detail,
                id: paymentResponse.id
            }));

            return res.status(200).json({
                status: paymentResponse.status,
                status_detail: paymentResponse.status_detail,
                id: paymentResponse.id,
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('[MP] Error:', {
            status: error?.status,
            message: error?.message
        });

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
