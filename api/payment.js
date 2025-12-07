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

    const mailContent = `
        <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #0f172a 100%); padding: 35px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 26px; letter-spacing: 2px; font-weight: 900;">PEDIDO CONFIRMADO</h1>
                <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">Orden #${orderId}</p>
                <p style="font-size: 12px; opacity: 0.6; margin-top: 5px;">${new Date(date).toLocaleString()}</p>
            </div>
            
            <div style="padding: 30px;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 25px; line-height: 1.5;">
                    Hola <strong>${customer.name}</strong>,<br>
                    Gracias por tu compra en <strong>Sustore</strong>. Aquí tienes el resumen de tu pedido.
                </p>
                
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px;">Tu Resumen</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${items.map(item => `
                            <tr>
                                <td style="padding: 10px 0; color: #475569; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                                    <strong>${item.quantity}x</strong> ${item.title}
                                </td>
                                <td style="padding: 10px 0; text-align: right; color: #1e293b; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                                    $${item.unit_price.toLocaleString()}
                                </td>
                            </tr>
                        `).join('')}
                        
                        ${discountDetails ? `
                        <tr>
                            <td style="padding: 15px 0 5px; color: #16a34a; font-size: 14px;">
                                Descuento Aplicado (${discountDetails.percentage}%)
                            </td>
                            <td style="padding: 15px 0 5px; text-align: right; color: #16a34a; font-weight: bold; font-size: 14px;">
                                -$${discountDetails.amount.toLocaleString()}
                            </td>
                        </tr>
                        ` : ''}

                        <tr>
                            <td style="padding: 15px 0 0; font-weight: 900; color: #0f172a; font-size: 16px;">TOTAL A PAGAR</td>
                            <td style="padding: 15px 0 0; text-align: right; font-weight: 900; color: #06b6d4; font-size: 22px;">
                                $${total.toLocaleString()}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
                        <h4 style="margin: 0 0 8px; color: #0284c7; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Envío a</h4>
                        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.4;">${shipping}</p>
                    </div>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <h4 style="margin: 0 0 8px; color: #16a34a; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Detalles</h4>
                        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.4;">
                            Pago: <strong>${paymentMethod}</strong><br>
                            DNI: ${customer.dni}<br>
                            Tel: ${customer.phone}
                        </p>
                    </div>
                </div>

                <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
                    ¿Preguntas? Responde a este correo.<br>
                    <strong>Sustore Technology</strong>
                </p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Sustore Pedidos" <${process.env.EMAIL_USER}>`,
            to: `${customer.email}, ${process.env.EMAIL_USER}`,
            subject: `📦 Pedido Confirmado #${orderId}`,
            html: mailContent
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: error.message });
    }
}
