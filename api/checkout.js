// api/checkout.js - Mercado Pago Payment Processing
// Esta función serverless procesa pagos de forma segura usando el SDK de Mercado Pago

import { MercadoPagoConfig, Payment } from 'mercadopago';

export default async function handler(req, res) {
    // Configurar CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verificar que tenemos el Access Token configurado
    if (!process.env.MP_ACCESS_TOKEN) {
        console.error('MP_ACCESS_TOKEN not configured');
        return res.status(500).json({ error: 'Payment service not configured' });
    }

    // LOG DE SEGURIDAD PARA DEBUG (Solo mostramos el inicio del token)
    console.log('Token prefix:', process.env.MP_ACCESS_TOKEN.substring(0, 15) + '...');

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
                description: paymentData.description || 'Compra en Sustore',
                installments: Number(paymentData.installments) || 1,
                payment_method_id: paymentData.payment_method_id,
                payer: {
                    email: payer.email,
                },
            };

            if (paymentData.issuer_id) {
                paymentBody.issuer_id = paymentData.issuer_id;
            }

            if (payer.identificationType && payer.identificationNumber) {
                paymentBody.payer.identification = {
                    type: payer.identificationType,
                    number: payer.identificationNumber,
                };
            }

            console.log('Enviando pago a MP...');
            const paymentResponse = await payment.create({ body: paymentBody });
            console.log('Respuesta de MP con éxito:', paymentResponse.status);

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
