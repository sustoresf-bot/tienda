import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { orderId, customer, items, total, shipping, paymentMethod, date, subtotal, discountDetails } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Formateadores para moneda y fecha
    const formatMoney = (amount) => `$${Number(amount).toLocaleString('es-AR')}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires'
    });

    // Diseño HTML Tech/Minimalista (Ajustado)
    const mailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Pedido</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
            
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 20px 0;">
                <tr>
                    <td align="center">
                        
                        <!-- Main Container -->
                        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 12px; max-width: 600px; width: 100%; box-shadow: 0 0 20px rgba(6, 182, 212, 0.1); overflow: hidden;">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #0f172a; padding: 40px; text-align: center; border-bottom: 2px solid #06b6d4;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -1px;">SUSTORE</h1>
                                    <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">Confirmación de Compra</p>
                                </td>
                            </tr>

                            <!-- Status Banner -->
                            <tr>
                                <td style="padding: 40px 30px; text-align: center;">
                                    <div style="display: inline-block; padding: 12px 24px; border-radius: 50px; background-color: rgba(6, 182, 212, 0.1); color: #06b6d4; font-weight: bold; font-size: 14px; letter-spacing: 1px;">
                                        ✅ PEDIDO CONFIRMADO
                                    </div>
                                    <p style="margin-top: 20px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">Hola <span style="font-weight: bold; color: #fff;">${customer.name}</span>, ya estamos preparando tu pedido.</p>
                                </td>
                            </tr>

                            <!-- Order Info Grid -->
                            <tr>
                                <td style="padding: 0 30px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #1e293b; background-color: #0a0a0a; border-radius: 8px;">
                                        <tr>
                                            <td width="50%" style="padding: 20px; border-right: 1px solid #1e293b; text-align: center;">
                                                <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">ID DE ORDEN</p>
                                                <p style="margin: 8px 0 0; color: #ffffff; font-size: 18px; font-weight: 700;">#${orderId}</p>
                                            </td>
                                            <td width="50%" style="padding: 20px; text-align: center;">
                                                <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">FECHA</p>
                                                <p style="margin: 8px 0 0; color: #ffffff; font-size: 14px; font-weight: 500;">${formatDate(date)}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Items List -->
                            <tr>
                                <td style="padding: 30px;">
                                    <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 14px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                                        Resumen de Compra
                                    </h3>
                                    
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        ${items.map(item => `
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; vertical-align: top;">
                                                    <div style="font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px;">
                                                        <span style="color: #06b6d4; margin-right: 5px;">${item.quantity}x</span> ${item.title}
                                                    </div>
                                                </td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; text-align: right; vertical-align: top; white-space: nowrap;">
                                                    <span style="font-size: 14px; font-weight: 500; color: #e2e8f0;">${formatMoney(item.unit_price)}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </table>

                                    <!-- Totals -->
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                                        ${discountDetails ? `
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #94a3b8; font-size: 13px;">Subtotal:</td>
                                                <td style="padding-top: 5px; text-align: right; color: #94a3b8; font-size: 13px; width: 100px;">${formatMoney(subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 13px;">Descuento (${discountDetails.percentage}%):</td>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 13px; width: 100px;">-${formatMoney(discountDetails.amount)}</td>
                                            </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding-top: 20px; text-align: right; color: #ffffff; font-size: 16px; font-weight: 900;">TOTAL</td>
                                            <td style="padding-top: 20px; text-align: right; color: #06b6d4; font-size: 24px; font-weight: 900; width: 120px;">${formatMoney(total)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Details Grid -->
                            <tr>
                                <td style="padding: 0 30px 40px;">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="48%" valign="top" style="background-color: #0a0a0a; padding: 20px; border: 1px solid #1e293b; border-radius: 8px;">
                                                <div style="font-size: 10px; color: #06b6d4; text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">Envío</div>
                                                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                                                    ${shipping}
                                                </div>
                                            </td>
                                            
                                            <td width="4%"></td> 
                                            
                                            <td width="48%" valign="top" style="background-color: #0a0a0a; padding: 20px; border: 1px solid #1e293b; border-radius: 8px;">
                                                <div style="font-size: 10px; color: #06b6d4; text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">Cliente</div>
                                                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
                                                    <strong style="color: #fff;">${paymentMethod}</strong><br>
                                                    DNI: ${customer.dni}<br>
                                                    Tel: ${customer.phone}
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px; background-color: #0f172a; text-align: center; border-top: 1px solid #1e293b;">
                                    <div style="margin-bottom: 20px;">
                                        <a href="https://sustore.vercel.app/" class="btn">IR A TIENDA</a>
                                        <a href="https://instagram.com/sustore_sf" style="display: inline-block; padding: 10px 20px; background-color: rgba(255,255,255,0.1); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 5px;">Instagram</a>
                                    </div>
                                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                                        Mensaje automático. Por favor no responder a este correo.
                                    </p>
                                    <p style="margin-top: 15px; color: #475569; font-size: 10px;">
                                        © ${new Date().getFullYear()} SUSTORE. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
    try {
        await transporter.sendMail({
            from: `"Sustore Confirmaciones" <${process.env.EMAIL_USER}>`,
            to: `${customer.email}, ${process.env.EMAIL_USER}`,
            subject: `✅ Pedido Confirmado #${orderId} - Sustore`,
            html: mailContent
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: error.message });
    }
}
