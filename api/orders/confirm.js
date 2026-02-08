import nodemailer from 'nodemailer';
import { getAdmin, verifyIdTokenFromRequest } from '../../lib/firebaseAdmin.js';
import { getStoreIdFromRequest } from '../../lib/authz.js';

function formatMoney(amount) {
    return `$${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
    });
}

function calculateItemPrice(basePrice, discount) {
    const base = Number(basePrice) || 0;
    const disc = Number(discount) || 0;
    if (!disc || disc <= 0) return base;
    return Math.ceil(base * (1 - disc / 100));
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function normalizeUrl(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
    return `https://${raw}`;
}

function normalizeWhatsappLink(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) return normalizeUrl(raw);
    if (/wa\.me\/|api\.whatsapp\.com/i.test(raw)) return normalizeUrl(raw);
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length >= 8) return `https://wa.me/${digits}`;
    return null;
}

async function getMercadoPagoPayment({ paymentId, accessToken }) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = data?.message || data?.error || 'Error consultando Mercado Pago';
        throw new Error(message);
    }
    return data;
}

function buildEmailHtml({ brandName, ticketWhatsappLink, ticketSiteUrl, orderId, customerName, items, subtotal, discountDetails, shippingMethod, shippingAddress, shippingFee, total, paymentMethod, date }) {
    const safeItems = Array.isArray(items) ? items : [];
    const safeBrandName = escapeHtml(brandName || 'Sustore');
    const storeUrl = normalizeUrl(ticketSiteUrl) || 'https://sustore.vercel.app/';
    const whatsappUrl = normalizeWhatsappLink(ticketWhatsappLink);
    const year = new Date(date || Date.now()).getFullYear();
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirmación de Pedido</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&display=swap');
                body { margin: 0; padding: 0; background-color: #000000; font-family: 'Outfit', Helvetica, Arial, sans-serif; color: #e2e8f0; }
                .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4); }
                .btn-whatsapp { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); box-shadow: 0 4px 15px rgba(34, 197, 94, 0.35); }
                .status-badge { background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); color: #22d3ee; padding: 8px 16px; border-radius: 50px; font-size: 12px; font-weight: 700; letter-spacing: 1px; display: inline-block; }
                .card { background-color: #0a0a0a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; }
            </style>
        </head>
        <body style="background-color: #000000;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; border: 1px solid #1e293b; border-radius: 24px; max-width: 600px; width: 100%; box-shadow: 0 0 50px rgba(6, 182, 212, 0.15); overflow: hidden;">
                            <tr><td height="4" style="background: linear-gradient(90deg, #06b6d4, #8b5cf6);"></td></tr>
                            <tr>
                                <td style="padding: 40px 40px 20px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">${safeBrandName}</h1>
                                    <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; letter-spacing: 2px;">CONFIRMACIÓN DE COMPRA</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px 40px; text-align: center;">
                                    <div class="status-badge">PAGO EXITOSO</div>
                                    <p style="margin-top: 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                        ¡Hola <span style="font-weight: 700; color: #ffffff;">${escapeHtml(customerName)}</span>! Gracias por tu compra.
                                        <br>Ya estamos preparando tu pedido con el ID: <strong style="color: #22d3ee;">#${orderId}</strong>
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px;">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="48%" valign="top" class="card">
                                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Método de Entrega</div>
                                                <div style="font-size: 14px; color: #e2e8f0; line-height: 1.4; font-weight: 500; margin-bottom: 4px;">
                                                    ${escapeHtml(shippingMethod || 'Envío')}
                                                </div>
                                                <div style="font-size: 12px; color: #94a3b8; line-height: 1.4;">
                                                    ${escapeHtml(shippingAddress || 'No especificada')}
                                                </div>
                                            </td>
                                            <td width="4%"></td>
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
                                                        <span style="color: #8b5cf6; font-weight: 900; margin-right: 8px;">${Number(item.quantity) || 0}x</span> ${escapeHtml(item.title)}
                                                    </div>
                                                </td>
                                                <td style="padding: 16px 0; border-bottom: 1px dashed #1e293b; text-align: right; vertical-align: middle;">
                                                    <span style="font-size: 15px; font-weight: 700; color: #ffffff;">${formatMoney(item.unit_price * item.quantity)}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </table>
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
                                        <tr>
                                            <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; font-size: 14px;">Subtotal</td>
                                            <td style="padding-bottom: 8px; text-align: right; color: #cbd5e1; font-size: 14px; width: 120px; font-weight: 500;">${formatMoney(subtotal)}</td>
                                        </tr>
                                        ${discountDetails ? `
                                            <tr>
                                                <td style="padding-bottom: 8px; text-align: right; color: #22c55e; font-size: 14px;">Descuento (${discountDetails.percentage}%)</td>
                                                <td style="padding-bottom: 8px; text-align: right; color: #22c55e; font-size: 14px; font-weight: 700;">-${formatMoney(discountDetails.amount)}</td>
                                            </tr>
                                        ` : ''}
                                        <tr>
                                            <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; font-size: 14px;">Costo de Envío</td>
                                            <td style="padding-bottom: 8px; text-align: right; color: #cbd5e1; font-size: 14px; font-weight: 500;">
                                                ${Number(shippingFee) > 0 ? `+ ${formatMoney(shippingFee)}` : 'Gratis'}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top: 15px; text-align: right; color: #ffffff; font-size: 18px; font-weight: 900; border-top: 1px solid #1e293b;">Total Final</td>
                                            <td style="padding-top: 15px; text-align: right; color: #22d3ee; font-size: 32px; font-weight: 900; letter-spacing: -1px; border-top: 1px solid #1e293b;">${formatMoney(total)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px 40px; text-align: center;">
                                    <div style="margin-bottom: 40px; padding: 20px; background: rgba(139, 92, 246, 0.05); border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                        <p style="margin: 0 0 5px; font-size: 11px; text-transform: uppercase; color: #a78bfa; font-weight: 700;">Método de Pago</p>
                                        <p style="margin: 0; font-size: 15px; color: #ffffff; font-weight: 600;">${escapeHtml(paymentMethod)}</p>
                                    </div>
                                    <a href="${escapeHtml(storeUrl)}" class="btn">VER DETALLES EN LA TIENDA</a>
                                    ${whatsappUrl ? `<a href="${escapeHtml(whatsappUrl)}" class="btn btn-whatsapp" style="margin-left: 12px;">WHATSAPP</a>` : ''}
                                    <div style="margin-top: 40px; border-top: 1px solid #1e293b; padding-top: 30px;">
                                        <div style="font-size: 12px; color: #64748b;">© ${year} ${safeBrandName}. Todos los derechos reservados.</div>
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
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = await verifyIdTokenFromRequest(req);
    if (!decoded?.uid || !decoded?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const storeId = getStoreIdFromRequest(req);

    const paymentMethod = String(req.body?.paymentMethod || '').trim();
    const shippingMethod = String(req.body?.shippingMethod || '').trim();
    const shipping = req.body?.shipping || {};
    const couponCode = req.body?.couponCode ? String(req.body.couponCode).trim() : null;
    const mpPaymentId = req.body?.mpPaymentId ? String(req.body.mpPaymentId).trim() : null;
    const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];

    if (!paymentMethod) return res.status(400).json({ error: 'Falta método de pago' });
    if (!shippingMethod) return res.status(400).json({ error: 'Falta método de entrega' });
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ error: 'Carrito vacío' });
    if (shippingMethod === 'Delivery') {
        if (!String(shipping?.address || '').trim() || !String(shipping?.city || '').trim() || !String(shipping?.province || '').trim() || !String(shipping?.zipCode || '').trim()) {
            return res.status(400).json({ error: 'Faltan datos de envío' });
        }
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const FieldValue = adminSdk.firestore.FieldValue;

        const userRef = db.doc(`artifacts/${storeId}/public/data/users/${decoded.uid}`);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : null;
        if (!userData?.name || !userData?.dni || !userData?.phone) {
            return res.status(400).json({ error: 'Datos de usuario incompletos' });
        }

        const productIds = cart.map((i) => String(i?.productId || '').trim()).filter(Boolean);
        if (productIds.length !== cart.length) return res.status(400).json({ error: 'Carrito inválido' });

        const productSnaps = await Promise.all(productIds.map((id) => db.doc(`artifacts/${storeId}/public/data/products/${id}`).get()));
        const productsById = new Map();
        productSnaps.forEach((snap) => {
            if (snap.exists) productsById.set(snap.id, snap.data());
        });

        const items = [];
        let subtotal = 0;

        for (const entry of cart) {
            const productId = String(entry.productId);
            const quantity = Number(entry.quantity) || 0;
            if (quantity <= 0) return res.status(400).json({ error: 'Carrito inválido' });

            const product = productsById.get(productId);
            if (!product) return res.status(400).json({ error: 'Producto no encontrado' });

            const unitPrice = calculateItemPrice(product.basePrice, product.discount);
            items.push({
                productId,
                title: product.name || 'Producto',
                quantity,
                unit_price: unitPrice,
                image: product.image || '',
            });

            subtotal += unitPrice * quantity;
        }

        const settingsSnap = await db.doc(`artifacts/${storeId}/public/data/settings/config`).get();
        const settingsData = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
        const deliverySettings = settingsData?.shippingDelivery || null;
        const ticketSettings = settingsData?.ticket || {};
        const ticketBrandName = String(ticketSettings?.brandName || settingsData?.storeName || 'Sustore').trim();
        const ticketWhatsappLink = String(ticketSettings?.whatsappLink || settingsData?.whatsappLink || '').trim();
        const ticketSiteUrl = String(ticketSettings?.siteUrl || settingsData?.seoUrl || 'https://sustore.vercel.app/').trim();

        let deliveryFee = 0;
        if (shippingMethod === 'Delivery' && deliverySettings?.enabled) {
            const freeAbove = Number(deliverySettings.freeAbove) || 0;
            const fee = Number(deliverySettings.fee) || 0;
            if (!(freeAbove > 0 && subtotal >= freeAbove)) {
                deliveryFee = fee;
            }
        }

        let discountDetails = null;
        let discountAmount = 0;
        let couponDocRef = null;

        if (couponCode) {
            const couponsCol = db.collection(`artifacts/${storeId}/public/data/coupons`);
            const snap = await couponsCol.where('code', '==', couponCode).limit(1).get();
            const couponDoc = snap.docs[0];
            if (couponDoc) {
                const coupon = couponDoc.data() || {};
                if (!coupon.expirationDate || new Date(coupon.expirationDate) >= new Date()) {
                    const usedBy = Array.isArray(coupon.usedBy) ? coupon.usedBy : [];
                    const usageLimit = Number(coupon.usageLimit) || 0;
                    if (usageLimit > 0 && usedBy.length >= usageLimit) {
                        return res.status(400).json({ error: 'Este cupón ha agotado sus usos' });
                    }
                    if (coupon.targetType === 'specific_email' && coupon.targetUser) {
                        const targetLower = String(coupon.targetUser).trim().toLowerCase();
                        const userLower = String(decoded.email || '').trim().toLowerCase();
                        if (targetLower !== userLower) {
                            return res.status(400).json({ error: 'Este cupón no está disponible para tu cuenta' });
                        }
                    }
                    const minPurchase = Number(coupon.minPurchase) || 0;
                    if (minPurchase > 0 && subtotal < minPurchase) {
                        return res.status(400).json({ error: `El monto mínimo para este cupón es $${minPurchase}` });
                    }
                    if (!usedBy.includes(decoded.uid)) {
                        if (userData?.dni) {
                            try {
                                const ordersCol = db.collection(`artifacts/${storeId}/public/data/orders`);
                                const dniSnap = await ordersCol
                                    .where('customer.dni', '==', String(userData.dni))
                                    .where('discountCode', '==', couponCode)
                                    .limit(1)
                                    .get();
                                if (!dniSnap.empty) {
                                    return res.status(400).json({ error: 'Ya utilizaste este cupón anteriormente' });
                                }
                            } catch { }
                        }
                        if (coupon.type === 'fixed') {
                            discountAmount = Math.min(Number(coupon.value) || 0, subtotal);
                        } else if (coupon.type === 'percentage') {
                            discountAmount = subtotal * ((Number(coupon.value) || 0) / 100);
                            if (coupon.maxDiscount && Number(coupon.maxDiscount) > 0) {
                                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
                            }
                        }
                        discountAmount = Math.ceil(discountAmount);
                        if (discountAmount > 0) {
                            discountDetails = { percentage: Number(coupon.value) || 0, amount: discountAmount };
                            couponDocRef = couponDoc.ref;
                        }
                    }
                }
            }
        }

        const total = Math.max(0, Math.ceil(subtotal - discountAmount + deliveryFee));

        if (paymentMethod === 'Tarjeta') {
            if (!mpPaymentId) return res.status(400).json({ error: 'Falta mpPaymentId' });
            if (!process.env.MP_ACCESS_TOKEN) return res.status(500).json({ error: 'Pago no configurado' });

            const mp = await getMercadoPagoPayment({ paymentId: mpPaymentId, accessToken: process.env.MP_ACCESS_TOKEN });
            const mpStatus = String(mp?.status || '');
            if (!['approved', 'in_process', 'pending'].includes(mpStatus)) {
                return res.status(400).json({ error: 'Pago no aprobado' });
            }
            const mpAmount = Number(mp?.transaction_amount);
            if (!Number.isFinite(mpAmount) || Math.abs(mpAmount - total) > 1) {
                return res.status(400).json({ error: 'Monto de pago inválido' });
            }
        }

        const orderId = `ORD-${Date.now().toString().slice(-6)}`;
        const shippingAddress = shippingMethod === 'Delivery'
            ? `${String(shipping.address || '').trim()}, ${String(shipping.city || '').trim()}, ${String(shipping.province || '').trim()} (CP: ${String(shipping.zipCode || '').trim()})`
            : 'Retiro en Local';

        const nowIso = new Date().toISOString();
        const orderData = {
            orderId,
            customerId: decoded.uid,
            userId: decoded.uid,
            customer: {
                name: userData.name || 'Cliente',
                email: decoded.email,
                phone: userData.phone || '-',
                dni: userData.dni || '-',
            },
            items,
            subtotal,
            discount: discountAmount,
            total,
            discountCode: couponCode || null,
            status: paymentMethod === 'Tarjeta' ? 'Realizado' : 'Pendiente',
            date: nowIso,
            shippingMethod,
            shippingFee: deliveryFee,
            shippingAddress,
            paymentMethod,
            mpPaymentId: mpPaymentId || null,
            lastUpdate: nowIso,
        };

        const batch = db.batch();
        const orderRef = db.collection(`artifacts/${storeId}/public/data/orders`).doc();
        batch.set(orderRef, orderData);

        const cartRef = db.doc(`artifacts/${storeId}/public/data/carts/${decoded.uid}`);
        batch.set(cartRef, { userId: decoded.uid, items: [] }, { merge: true });

        batch.set(userRef, {
            address: String(shipping.address || ''),
            city: String(shipping.city || ''),
            province: String(shipping.province || ''),
            zipCode: String(shipping.zipCode || ''),
            ordersCount: FieldValue.increment(1),
            lastOrderDate: nowIso,
        }, { merge: true });

        for (const entry of cart) {
            const productId = String(entry.productId);
            const quantity = Number(entry.quantity) || 0;
            const product = productsById.get(productId) || {};

            if (product.isPromo && Array.isArray(product.items)) {
                for (const promoItem of product.items) {
                    const componentId = String(promoItem?.productId || '');
                    const componentQty = Number(promoItem?.quantity) || 0;
                    if (!componentId || componentQty <= 0) continue;
                    const totalDecrement = componentQty * quantity;
                    const ref = db.doc(`artifacts/${storeId}/public/data/products/${componentId}`);
                    batch.update(ref, { stock: FieldValue.increment(-totalDecrement), salesCount: FieldValue.increment(totalDecrement) });
                }
            } else {
                const ref = db.doc(`artifacts/${storeId}/public/data/products/${productId}`);
                batch.update(ref, { stock: FieldValue.increment(-quantity), salesCount: FieldValue.increment(quantity) });
            }
        }

        if (couponDocRef) {
            batch.update(couponDocRef, { usedBy: FieldValue.arrayUnion(decoded.uid) });
        }

        await batch.commit();

        let emailSent = false;
        const emailUser = String(process.env.EMAIL_USER || '').trim();
        const emailPass = String(process.env.EMAIL_PASS || '').trim();

        if (emailUser && emailPass) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: emailUser,
                        pass: emailPass,
                    },
                });

                const html = buildEmailHtml({
                    brandName: ticketBrandName,
                    ticketWhatsappLink,
                    ticketSiteUrl,
                    orderId,
                    customerName: userData.name || 'Cliente',
                    items,
                    subtotal,
                    discountDetails,
                    shippingMethod,
                    shippingAddress,
                    shippingFee: deliveryFee,
                    total,
                    paymentMethod,
                    date: nowIso,
                });

                const fromName = String(ticketBrandName || 'Sustore').replace(/[\r\n"]/g, '').trim().slice(0, 80) || 'Sustore';
                await transporter.sendMail({
                    from: `"${fromName}" <${emailUser}>`,
                    to: `${decoded.email}, ${emailUser}`,
                    replyTo: emailUser,
                    subject: `✅ Pedido Confirmado #${orderId}`,
                    html,
                });

                emailSent = true;
            } catch (e) {
                console.error('[orders/confirm] Email send failed:', e);
            }
        } else {
            console.warn('[orders/confirm] Email not configured (missing EMAIL_USER/EMAIL_PASS).');
        }

        return res.status(200).json({ success: true, orderId, emailSent });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}
