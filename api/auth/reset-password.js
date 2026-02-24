import nodemailer from 'nodemailer';
import { getAdmin } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildResetEmailHtml({ brandName, resetLink, userEmail }) {
    const safeBrand = escapeHtml(brandName || 'Sustore');
    const safeEmail = escapeHtml(userEmail);
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contrasena</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
        body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', Helvetica, Arial, sans-serif; color: #e2e8f0; }
        .btn { display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 16px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(249, 115, 22, 0.4); }
        .card { background-color: #0a0a0a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; }
    </style>
</head>
<body style="background-color: #000000;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 24px; max-width: 600px; width: 100%; box-shadow: 0 0 50px rgba(249, 115, 22, 0.1); overflow: hidden;">
                    <tr><td height="4" style="background: linear-gradient(90deg, #f97316, #3b82f6);"></td></tr>
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">${safeBrand}</h1>
                            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; letter-spacing: 2px;">RESTABLECER CONTRASENA</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px 10px; text-align: center;">
                            <div style="background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.2); border-radius: 16px; padding: 24px;">
                                <p style="margin: 0 0 8px; color: #f97316; font-size: 28px;">🔒</p>
                                <p style="margin: 0; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                    Recibimos una solicitud para restablecer la contrasena de la cuenta asociada a:
                                </p>
                                <p style="margin: 12px 0 0; color: #f97316; font-size: 16px; font-weight: 700;">${safeEmail}</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 24px; color: #94a3b8; font-size: 15px; line-height: 1.6;">
                                Hace clic en el boton de abajo para crear una nueva contrasena. Este enlace expira en 1 hora.
                            </p>
                            <a href="${escapeHtml(resetLink)}" class="btn" style="color: #ffffff !important; text-decoration: none;">CAMBIAR MI CONTRASENA</a>
                            <p style="margin: 24px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                Si no solicitaste este cambio, ignora este email. Tu contrasena no sera modificada.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <div style="border-top: 1px solid #1e293b; padding-top: 24px;">
                                <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                                    Si el boton no funciona, copia y pega este enlace en tu navegador:
                                </p>
                                <p style="margin: 8px 0 0; font-size: 11px; color: #64748b; word-break: break-all;">${escapeHtml(resetLink)}</p>
                            </div>
                            <div style="margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 20px;">
                                <p style="margin: 0; font-size: 12px; color: #64748b;">© ${year} ${safeBrand}. Todos los derechos reservados.</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Email invalido' });
    }

    const emailUser = String(process.env.EMAIL_USER || '').trim();
    const emailPass = String(process.env.EMAIL_PASS || '').trim();
    if (!emailUser || !emailPass) {
        return res.status(500).json({ error: 'Email no configurado en el servidor' });
    }

    const storeId = getStoreIdFromRequest(req);

    try {
        const adminSdk = getAdmin();
        let userExists = true;
        try {
            await adminSdk.auth().getUserByEmail(email);
        } catch (e) {
            if (e?.code === 'auth/user-not-found') {
                userExists = false;
            } else {
                throw e;
            }
        }

        if (userExists) {
            const firebaseLink = await adminSdk.auth().generatePasswordResetLink(email);
            const firebaseUrl = new URL(firebaseLink);
            const oobCode = firebaseUrl.searchParams.get('oobCode');
            const host = req.headers?.host || 'sustore.vercel.app';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const resetLink = `${protocol}://${host}/reset-password.html?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;

            let brandName = 'Sustore';
            if (storeId) {
                try {
                    const settingsSnap = await adminSdk.firestore().doc(`artifacts/${storeId}/public/data/settings/config`).get();
                    if (settingsSnap.exists) {
                        const s = settingsSnap.data() || {};
                        brandName = String(s?.ticket?.brandName || s?.storeName || 'Sustore').trim();
                    }
                } catch { }
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
            });

            const html = buildResetEmailHtml({
                brandName,
                resetLink,
                userEmail: email,
            });

            const fromName = String(brandName).replace(/[\r\n"]/g, '').trim().slice(0, 80) || 'Sustore';
            await transporter.sendMail({
                from: `"${fromName}" <${emailUser}>`,
                to: email,
                replyTo: emailUser,
                subject: `🔒 Restablecer Contrasena — ${fromName}`,
                html,
            });
        }

        // Generic success response to avoid account enumeration.
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[reset-password] Error:', error);
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}
