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
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // Diseño HTML Optimizado para Email (Table-based layout para máxima compatibilidad)
    const mailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Pedido</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 0;">
                <tr>
                    <td align="center">
                        
                        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); max-width: 600px; width: 100%;">
                            
                            <tr>
                                <td style="background-color: #0f172a; padding: 40px 40px; text-align: center; background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; letter-spacing: -0.5px; font-weight: 800; text-transform: uppercase;">Sustore</h1>
                                    <p style="margin: 10px 0 0; color: #06b6d4; font-size: 14px; font-weight: 600; letter-spacing: 2px;">TECNOLOGÍA DEL FUTURO</p>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 40px 40px 20px;">
                                    <table width="100%" border="0">
                                        <tr>
                                            <td align="center">
                                                <img src="https://cdn-icons-png.flaticon.com/512/148/148767.png" alt="Check" width="64" style="display: block; margin-bottom: 20px; opacity: 0.8;">
                                                <h2 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700;">¡Gracias por tu compra, ${customer.name}!</h2>
                                                <p style="margin: 10px 0 0; color: #64748b; font-size: 16px; line-height: 1.5;">Tu pedido ha sido confirmado exitosamente. A continuación encontrarás los detalles.</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td align="center" style="padding: 0 40px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                                        <tr>
                                            <td width="50%" style="padding: 15px 20px; border-right: 1px solid #e2e8f0; text-align: center;">
                                                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px;">Nro. Orden</p>
                                                <p style="margin: 5px 0 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 16px;">#${orderId}</p>
                                            </td>
                                            <td width="50%" style="padding: 15px 20px; text-align: center;">
                                                <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px;">Fecha</p>
                                                <p style="margin: 5px 0 0; color: #0f172a; font-weight: 600; font-size: 14px;">${formatDate(date)}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 30px 40px;">
                                    <h3 style="margin: 0 0 20px; color: #0f172a; font-size: 16px; font-weight: 700; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9;">Resumen del Pedido</h3>
                                    
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        ${items.map(item => `
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
                                                    <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                                                        <span style="color: #06b6d4; margin-right: 5px;">${item.quantity}x</span> ${item.title}
                                                    </div>
                                                    <div style="font-size: 12px; color: #94a3b8;">Producto tecnológico</div>
                                                </td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; vertical-align: top; white-space: nowrap;">
                                                    <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${formatMoney(item.unit_price)}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </table>

                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                                        ${discountDetails ? `
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #64748b; font-size: 14px;">Subtotal:</td>
                                                <td style="padding-top: 5px; text-align: right; color: #64748b; font-size: 14px; width: 100px; font-weight: 500;">${formatMoney(subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 14px;">Descuento (${discountDetails.percentage}%):</td>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 14px; width: 100px; font-weight: 600;">-${formatMoney(discountDetails.amount)}</td>
                                            </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding-top: 15px; text-align: right; color: #0f172a; font-size: 16px; font-weight: 800;">TOTAL</td>
                                            <td style="padding-top: 15px; text-align: right; color: #06b6d4; font-size: 24px; font-weight: 900; width: 120px;">${formatMoney(total)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 0 40px 40px;">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="48%" valign="top" style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <table width="100%" border="0">
                                                    <tr>
                                                        <td style="padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                                                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0284c7; letter-spacing: 1px;">Envío a</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding-top: 10px; font-size: 13px; color: #334155; line-height: 1.4;">
                                                            ${shipping}
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                            
                                            <td width="4%"></td> <td width="48%" valign="top" style="background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <table width="100%" border="0">
                                                    <tr>
                                                        <td style="padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px;">
                                                            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 1px;">Pago</span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td style="padding-top: 10px; font-size: 13px; color: #334155; line-height: 1.4;">
                                                            Método: <strong>${paymentMethod}</strong><br>
                                                            <span style="display:block; margin-top:4px; color:#64748b;">DNI: ${customer.dni}</span>
                                                            <span style="display:block; color:#64748b;">Tel: ${customer.phone}</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <tr>
                                <td style="padding: 30px; background-color: #0f172a; text-align: center; border-top: 4px solid #06b6d4;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 13px; margin-bottom: 10px;">
                                        ¿Tienes dudas? Responde a este correo o contáctanos por WhatsApp.
                                    </p>
                                    <p style="margin: 0; color: #ffffff; font-weight: 700; font-size: 14px; letter-spacing: 1px;">SUSTORE TECHNOLOGY</p>
                                    <div style="margin-top: 20px;">
                                        <a href="#" style="color: #06b6d4; text-decoration: none; font-size: 12px; margin: 0 10px;">Instagram</a>
                                        <a href="#" style="color: #06b6d4; text-decoration: none; font-size: 12px; margin: 0 10px;">Tienda Web</a>
                                    </div>
                                </td>
                            </tr>

                        </table>
                        
                        <p style="margin-top: 20px; color: #94a3b8; font-size: 11px;">
                            © ${new Date().getFullYear()} Sustore. Todos los derechos reservados.
                        </p>

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
