import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    // Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { orderId, customer, items, total, shipping } = req.body;

    // Configuración del transporte de correo (Gmail)
    // Las credenciales se toman de las variables de entorno de Vercel
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Tu correo (lautarocorazza63@gmail.com)
            pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación (euru blws vsfw xfra)
        }
    });

    // Diseño del correo en HTML
    const mailContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0891b2; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">¡PEDIDO CONFIRMADO!</h1>
                <p style="color: #cffafe; margin: 10px 0 0;">Orden #${orderId}</p>
            </div>
            
            <div style="padding: 30px; background-color: #ffffff;">
                <p style="color: #334155; font-size: 16px;">Hola <strong>${customer.name}</strong>,</p>
                <p style="color: #64748b; line-height: 1.6;">Gracias por tu compra en <strong>Sustore</strong>. Hemos recibido tu pedido correctamente. A continuación te detallamos la información:</p>
                
                <div style="margin-top: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background-color: #f1f5f9;">
                            <tr>
                                <th style="padding: 12px 15px; text-align: left; color: #475569; font-size: 14px;">Producto</th>
                                <th style="padding: 12px 15px; text-align: right; color: #475569; font-size: 14px;">Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 12px 15px; color: #334155;">
                                        <strong>${item.quantity}x</strong> ${item.title}
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; color: #334155;">
                                        $${item.unit_price.toLocaleString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot style="background-color: #f8fafc;">
                            <tr>
                                <td style="padding: 15px; font-weight: bold; color: #0f172a;">TOTAL</td>
                                <td style="padding: 15px; text-align: right; font-weight: bold; color: #0891b2; font-size: 18px;">$${total.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="margin-top: 30px; background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0891b2;">
                    <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">📍 Datos de Envío</h3>
                    <p style="margin: 5px 0; color: #64748b; font-size: 14px;">${shipping}</p>
                    <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Recibe:</strong> ${customer.name}</p>
                    <p style="margin: 5px 0; color: #64748b; font-size: 14px;"><strong>Contacto:</strong> ${customer.email}</p>
                </div>

                <div style="margin-top: 30px; text-align: center;">
                    <a href="https://wa.me/5493425000000" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Contactar por WhatsApp</a>
                </div>

                <p style="margin-top: 30px; font-size: 13px; color: #94a3b8; text-align: center;">
                    Si tienes alguna duda sobre tu pedido, responde a este correo.<br>
                    © 2024 Sustore Technology
                </p>
            </div>
        </div>
    `;

    try {
        // Enviar el correo
        await transporter.sendMail({
            from: `"Sustore Ventas" <${process.env.EMAIL_USER}>`,
            to: `${customer.email}, ${process.env.EMAIL_USER}`, // Se envía al cliente y una copia a ti
            subject: `✅ Confirmación de Pedido #${orderId} - Sustore`,
            html: mailContent
        });

        res.status(200).json({ success: true, message: 'Correo enviado correctamente' });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: "Error al enviar el correo: " + error.message });
    }
}
