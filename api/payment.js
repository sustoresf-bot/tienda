import nodemailer from 'nodemailer';
import { getEnv } from './_utils/env.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // 1. Extracción de datos con Defaults seguros
        const {
            orderId,
            customer,
            items,
            total,
            subtotal,
            discountDetails,
            shippingAddress, // En script.js se envía como 'shipping' o 'shippingAddress' segun el caso, normalizamos
            shipping, // Fallback si viene como 'shipping'
            shippingFee,
            shippingMethod,
            paymentMethod,
            date
        } = req.body;

        const safeCustomer = customer || {};
        const customerName = safeCustomer.name || 'Cliente';
        const customerEmail = safeCustomer.email;
        const finalShippingAddress = shippingAddress || shipping || 'No especificada';
        const finalShippingFee = Number(shippingFee) || 0;
        const finalSubtotal = Number(subtotal) || 0;
        const finalTotal = Number(total) || 0;

        // Validación Crítica
        if (!customerEmail) {
            return res.status(400).json({ error: 'Falta email del cliente' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: getEnv('EMAIL_USER'),
                pass: getEnv('EMAIL_PASS')
            }
        });

        // Formateadores
        const formatMoney = (amount) => `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
        const formatDate = (dateString) => new Date(dateString).toLocaleString('es-AR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Argentina/Buenos_Aires'
        });

        // items mapping safely
        const safeItems = Array.isArray(items) ? items : [];

        // Diseño HTML
        const mailContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmación de Pedido</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
                    body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', Helvetica, Arial, sans-serif; color: #e2e8f0; }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
                        color: #ffffff !important;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 700;
                        font-size: 14px;
                        text-align: center;
                        letter-spacing: 0.5px;
                        box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
                    }
                    .status-badge {
                        background: rgba(6, 182, 212, 0.1);
                        border: 1px solid rgba(6, 182, 212, 0.3);
                        color: #22d3ee;
                        padding: 8px 16px;
                        border-radius: 50px;
                        font-size: 12px;
                        font-weight: 700;
                        letter-spacing: 1px;
                        display: inline-block;
                    }
                    .card {
                        background-color: #0a0a0a;
                        border: 1px solid #1e293b;
                        border-radius: 16px;
                        padding: 24px;
                    }
                </style>
            </head>
            <body style="background-color: #000000;">
                
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
                    <tr>
                        <td align="center">
                            
                            <!-- Main Container -->
                            <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 24px; max-width: 600px; width: 100%; box-shadow: 0 0 50px rgba(6, 182, 212, 0.15); overflow: hidden;">
                                
                                <!-- Header Gradient Line -->
                                <tr>
                                    <td height="4" style="background: linear-gradient(90deg, #06b6d4, #8b5cf6);"></td>
                                </tr>

                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 20px; text-align: center;">
                                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Sustore</h1>
                                        <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; letter-spacing: 2px;">CONFIRMACIÓN DE COMPRA</p>
                                    </td>
                                </tr>

                                <!-- Status -->
                                <tr>
                                    <td style="padding: 0 40px 40px; text-align: center;">
                                        <div class="status-badge">⚡ PAGO EXITOSO</div>
                                        <p style="margin-top: 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                            ¡Hola <span style="font-weight: 700; color: #ffffff;">${customerName}</span>! Gracias por tu compra.
                                            <br>Ya estamos preparando tu pedido con el ID: <strong style="color: #22d3ee;">#${orderId}</strong>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Grid Info -->
                                <tr>
                                    <td style="padding: 0 40px;">
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <!-- Shipping Info -->
                                                <td width="48%" valign="top" class="card">
                                                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Método de Entrega</div>
                                                    <div style="font-size: 14px; color: #e2e8f0; line-height: 1.4; font-weight: 500; margin-bottom: 4px;">
                                                        ${shippingMethod || 'Envío'}
                                                    </div>
                                                    <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                                                        ${finalShippingAddress}
                                                    </div>
                                                </td>
                                                <td width="4%"></td>
                                                <!-- Date Info -->
                                                <td width="48%" valign="top" class="card">
                                                    <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Fecha de Pedido</div>
                                                    <div style="font-size: 14px; color: #e2e8f0; line-height: 1.4; font-weight: 500;">
                                                        ${formatDate(date || new Date())}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Items List -->
                                <tr>
                                    <td style="padding: 40px;">
                                        <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 12px; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">
                                            Tus Productos
                                        </h3>
                                        
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                            ${safeItems.map(item => `
                                                <tr>
                                                    <td style="padding: 16px 0; border-bottom: 1px dashed #1e293b; vertical-align: middle;">
                                                        <div style="font-size: 15px; font-weight: 600; color: #ffffff;">
                                                            <span style="color: #8b5cf6; font-weight: 900; margin-right: 8px;">${item.quantity}x</span> ${item.title}
                                                        </div>
                                                    </td>
                                                    <td style="padding: 16px 0; border-bottom: 1px dashed #1e293b; text-align: right; vertical-align: middle;">
                                                        <span style="font-size: 15px; font-weight: 700; color: #ffffff;">${formatMoney(item.unit_price * item.quantity)}</span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </table>

                                        <!-- Totals -->
                                        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
                                            <tr>
                                                <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; font-size: 14px;">Subtotal</td>
                                                <td style="padding-bottom: 8px; text-align: right; color: #cbd5e1; font-size: 14px; width: 120px; font-weight: 500;">${formatMoney(finalSubtotal)}</td>
                                            </tr>
                                            ${discountDetails ? `
                                                <tr>
                                                    <td style="padding-bottom: 8px; text-align: right; color: #22c55e; font-size: 14px;">Descuento (${discountDetails.percentage}%)</td>
                                                    <td style="padding-bottom: 8px; text-align: right; color: #22c55e; font-size: 14px; font-weight: 700;">-${formatMoney(discountDetails.amount)}</td>
                                                </tr>
                                            ` : ''}
                                            <tr>
                                                <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; font-size: 14px;">
                                                    Costo de Envío 
                                                    <span style="font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">${shippingMethod === 'Delivery' ? 'A Domicilio' : 'Retiro'}</span>
                                                </td>
                                                <td style="padding-bottom: 8px; text-align: right; color: #cbd5e1; font-size: 14px; font-weight: 500;">
                                                    ${finalShippingFee > 0 ? `+ ${formatMoney(finalShippingFee)}` : 'Gratis'}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 15px; text-align: right; color: #ffffff; font-size: 18px; font-weight: 900; border-top: 1px solid #1e293b;">Total Final</td>
                                                <td style="padding-top: 15px; text-align: right; color: #22d3ee; font-size: 32px; font-weight: 900; letter-spacing: -1px; border-top: 1px solid #1e293b;">${formatMoney(finalTotal)}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Payment & Footer -->
                                <tr>
                                    <td style="padding: 0 40px 40px; text-align: center;">
                                        <div style="margin-bottom: 40px; padding: 20px; background: rgba(139, 92, 246, 0.05); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                            <p style="margin: 0 0 5px; font-size: 11px; text-transform: uppercase; color: #a78bfa; font-weight: 700;">Método de Pago</p>
                                            <p style="margin: 0; font-size: 15px; color: #ffffff; font-weight: 600;">${paymentMethod}</p>
                                            ${safeCustomer.dni ? `<p style="margin: 5px 0 0; font-size: 13px; color: #94a3b8;">DNI: ${safeCustomer.dni}</p>` : ''}
                                        </div>

                                        <a href="https://sustore.vercel.app/" class="btn">VER DETALLES EN LA TIENDA</a>

                                        <div style="margin-top: 40px; border-top: 1px solid #1e293b; padding-top: 30px;">
                                            <a href="https://wa.me/5493425906300" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4); margin-bottom: 20px;">
                                                ¿NECESITAS AYUDA? CONTACTANOS
                                            </a>
                                            <div style="font-size: 12px; color: #64748b;">
                                                © ${new Date().getFullYear()} Sustore. Todos los derechos reservados.
                                            </div>
                                        </div>
                                    </td>
                                </tr>

                            </table>
                        
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const emailUser = getEnv('EMAIL_USER');
        await transporter.sendMail({
            from: `"Sustore" <${emailUser}>`,
            to: `${customerEmail}, ${emailUser}`,
            replyTo: emailUser,
            subject: `✅ Pedido Confirmado #${orderId}`,
            html: mailContent
        });

        res.status(200).json({ success: true });

    } catch (error) {
        console.error('[Email] Error enviando correo:', error?.message || error);
        res.status(500).json({ error: error.message });
    }
}
