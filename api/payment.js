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

    // Diseño HTML Cyberpunk/Tech para Email
    const mailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Pedido</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; color: #ffffff;">
            
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 20px 0;">
                <tr>
                    <td align="center">
                        
                        <!-- Main Container -->
                        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 0; max-width: 600px; width: 100%; box-shadow: 0 0 20px rgba(6, 182, 212, 0.1);">
                            
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #0f172a; padding: 30px; text-align: center; border-bottom: 2px solid #06b6d4;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; letter-spacing: 4px; font-weight: 900; text-shadow: 0 0 10px rgba(6, 182, 212, 0.5);">SUSTORE</h1>
                                    <p style="margin: 5px 0 0; color: #06b6d4; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">// SISTEMA DE PEDIDOS v2.0 //</p>
                                </td>
                            </tr>

                            <!-- Status Banner -->
                            <tr>
                                <td style="padding: 40px 30px; text-align: center;">
                                    <div style="display: inline-block; padding: 10px 20px; border: 1px solid #06b6d4; color: #06b6d4; font-weight: bold; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; background-color: rgba(6, 182, 212, 0.05);">
                                        PEDIDO CONFIRMADO
                                    </div>
                                    <p style="margin-top: 20px; color: #94a3b8; font-size: 14px;">Iniciando protocolo de envío para <span style="color: #fff; font-weight: bold;">${customer.name}</span>...</p>
                                </td>
                            </tr>

                            <!-- Order Info Grid -->
                            <tr>
                                <td style="padding: 0 30px;">
                                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #1e293b; background-color: #0a0a0a;">
                                        <tr>
                                            <td width="50%" style="padding: 15px; border-right: 1px solid #1e293b; text-align: center;">
                                                <p style="margin: 0; font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 1px;">ID DE ORDEN</p>
                                                <p style="margin: 5px 0 0; color: #ffffff; font-family: monospace; font-size: 16px;">#${orderId}</p>
                                            </td>
                                            <td width="50%" style="padding: 15px; text-align: center;">
                                                <p style="margin: 0; font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 1px;">TIMESTAMP</p>
                                                <p style="margin: 5px 0 0; color: #ffffff; font-family: monospace; font-size: 14px;">${formatDate(date)}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Items List -->
                            <tr>
                                <td style="padding: 30px;">
                                    <h3 style="margin: 0 0 20px; color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                                        <span style="color: #06b6d4;">&gt;</span> Items del Pedido
                                    </h3>
                                    
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        ${items.map(item => `
                                            <tr>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; vertical-align: top;">
                                                    <div style="font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">
                                                        <span style="color: #06b6d4; font-family: monospace;">[${item.quantity}]</span> ${item.title}
                                                    </div>
                                                </td>
                                                <td style="padding: 12px 0; border-bottom: 1px solid #1e293b; text-align: right; vertical-align: top; white-space: nowrap;">
                                                    <span style="font-size: 14px; font-weight: 600; color: #e2e8f0; font-family: monospace;">${formatMoney(item.unit_price)}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </table>

                                    <!-- Totals -->
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                                        ${discountDetails ? `
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #94a3b8; font-size: 12px;">SUBTOTAL:</td>
                                                <td style="padding-top: 5px; text-align: right; color: #94a3b8; font-size: 12px; width: 100px; font-family: monospace;">${formatMoney(subtotal)}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 12px;">DESC. (${discountDetails.percentage}%):</td>
                                                <td style="padding-top: 5px; text-align: right; color: #16a34a; font-size: 12px; width: 100px; font-family: monospace;">-${formatMoney(discountDetails.amount)}</td>
                                            </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding-top: 15px; text-align: right; color: #ffffff; font-size: 16px; font-weight: 900; letter-spacing: 1px;">TOTAL A PAGAR</td>
                                            <td style="padding-top: 15px; text-align: right; color: #06b6d4; font-size: 20px; font-weight: 900; width: 120px; font-family: monospace; text-shadow: 0 0 10px rgba(6,182,212,0.3);">${formatMoney(total)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Details Grid -->
                            <tr>
                                <td style="padding: 0 30px 40px;">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="48%" valign="top" style="background-color: #0a0a0a; padding: 20px; border: 1px solid #1e293b;">
                                                <div style="font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Dirección de Envío</div>
                                                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">
                                                    ${shipping}
                                                </div>
                                            </td>
                                            
                                            <td width="4%"></td> 
                                            
                                            <td width="48%" valign="top" style="background-color: #0a0a0a; padding: 20px; border: 1px solid #1e293b;">
                                                <div style="font-size: 10px; color: #06b6d4; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Datos de Cliente</div>
                                                <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">
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
                                    <p style="margin: 0; color: #64748b; font-size: 11px;">
                                        SYSTEM AUTO-GENERATED MESSAGE.<br>NO REPLY REQUIRED.
                                    </p>
                                    <div style="margin-top: 15px;">
                                        <a href="#" style="color: #06b6d4; text-decoration: none; font-size: 11px; margin: 0 10px; text-transform: uppercase;">[ WEB ]</a>
                                        <a href="#" style="color: #06b6d4; text-decoration: none; font-size: 11px; margin: 0 10px; text-transform: uppercase;">[ INSTAGRAM ]</a>
                                    </div>
                                    <p style="margin-top: 15px; color: #475569; font-size: 10px;">
                                        © ${new Date().getFullYear()} SUSTORE. ALL RIGHTS RESERVED.
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
