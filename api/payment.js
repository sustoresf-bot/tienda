import nodemailer from 'nodemailer';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { orderId, customer, items, total, shipping, paymentMethod, date } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailContent = `
        <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">PEDIDO CONFIRMADO</h1>
                <p style="margin: 5px 0 0; opacity: 0.9;">Orden #${orderId}</p>
                <p style="font-size: 12px; opacity: 0.8;">${new Date(date).toLocaleString()}</p>
            </div>
            
            <div style="padding: 30px;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                    Hola <strong>${customer.name}</strong> (@${customer.username}),<br>
                    Hemos recibido tu solicitud de pedido. A continuación te detallamos la información para proceder con el pago y envío.
                </p>
                
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Detalle de Productos</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        ${items.map(item => `
                            <tr>
                                <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                                    <strong>${item.quantity}x</strong> ${item.title}
                                </td>
                                <td style="padding: 8px 0; text-align: right; color: #475569; font-weight: bold; font-size: 14px;">
                                    $${item.unit_price.toLocaleString()}
                                </td>
                            </tr>
                        `).join('')}
                        <tr style="border-top: 2px solid #e2e8f0;">
                            <td style="padding: 15px 0 0; font-weight: bold; color: #0f172a;">TOTAL FINAL</td>
                            <td style="padding: 15px 0 0; text-align: right; font-weight: bold; color: #06b6d4; font-size: 18px;">
                                $${total.toLocaleString()}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
                        <h4 style="margin: 0 0 10px; color: #0284c7; font-size: 12px; text-transform: uppercase;">Datos de Envío</h4>
                        <p style="margin: 0; font-size: 13px; color: #334155;">${shipping}</p>
                    </div>
                    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <h4 style="margin: 0 0 10px; color: #16a34a; font-size: 12px; text-transform: uppercase;">Detalles</h4>
                        <p style="margin: 0; font-size: 13px; color: #334155;">
                            <strong>Pago:</strong> ${paymentMethod}<br>
                            <strong>DNI:</strong> ${customer.dni}<br>
                            <strong>Tel:</strong> ${customer.phone}<br>
                            <strong>Email:</strong> ${customer.email}
                        </p>
                    </div>
                </div>

                <p style="text-align: center; margin-top: 30px; font-size: 13px; color: #94a3b8;">
                    Nos comunicaremos contigo a la brevedad para coordinar la entrega.<br>
                    <strong>Sustore Technology</strong>
                </p>
            </div>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Sustore Pedidos" <${process.env.EMAIL_USER}>`,
            to: `${customer.email}, ${process.env.EMAIL_USER}`,
            subject: `📦 Nuevo Pedido #${orderId} - ${customer.name}`,
            html: mailContent
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: error.message });
    }
}
