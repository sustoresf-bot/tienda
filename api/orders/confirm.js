import crypto from 'crypto';
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

function cents(amount) {
    return Math.round((Number(amount) || 0) * 100);
}

function createApiError(code, message, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
}

function normalizePromoItems(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map((entry) => ({
            productId: String(entry?.productId || '').trim(),
            quantity: Number(entry?.quantity) || 0,
        }))
        .filter((entry) => entry.productId && entry.quantity > 0);
}

function normalizeCartEntry(entry) {
    return {
        productId: String(entry?.productId || '').trim(),
        quantity: Number(entry?.quantity) || 0,
        isPromo: entry?.isPromo === true,
        promoItems: normalizePromoItems(entry?.promoItems || entry?.items),
    };
}

function buildPaymentLockId(paymentId) {
    const raw = String(paymentId || '').trim();
    const safe = raw.replace(/[^a-zA-Z0-9_-]/g, '');
    if (safe) return safe.slice(0, 120);
    return crypto.createHash('sha256').update(raw).digest('hex');
}

async function getMercadoPagoPayment({ paymentId, accessToken }) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = data?.message || data?.error || 'Error consultando Mercado Pago';
        throw createApiError('payment_provider_error', message, 502);
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
            <title>Confirmacion de Pedido</title>
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
                                    <p style="margin: 8px 0 0; color: #64748b; font-size: 14px; letter-spacing: 2px;">CONFIRMACION DE COMPRA</p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px 40px; text-align: center;">
                                    <div class="status-badge">PAGO EXITOSO</div>
                                    <p style="margin-top: 24px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                                        Hola <span style="font-weight: 700; color: #ffffff;">${escapeHtml(customerName)}</span>. Gracias por tu compra.
                                        <br>Ya estamos preparando tu pedido con el ID: <strong style="color: #22d3ee;">#${orderId}</strong>
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 0 40px;">
                                    <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                        <tr>
                                            <td width="48%" valign="top" class="card">
                                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 8px;">Metodo de Entrega</div>
                                                <div style="font-size: 14px; color: #e2e8f0; line-height: 1.4; font-weight: 500; margin-bottom: 4px;">
                                                    ${escapeHtml(shippingMethod || 'Envio')}
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
                                            <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; font-size: 14px;">Costo de Envio</td>
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
                                        <p style="margin: 0 0 5px; font-size: 11px; text-transform: uppercase; color: #a78bfa; font-weight: 700;">Metodo de Pago</p>
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

    if (!paymentMethod) return res.status(400).json({ error: 'Falta metodo de pago' });
    if (!shippingMethod) return res.status(400).json({ error: 'Falta metodo de entrega' });
    if (!Array.isArray(cart) || cart.length === 0) return res.status(400).json({ error: 'Carrito vacio' });

    if (shippingMethod === 'Delivery') {
        const requiredShipping = [shipping?.address, shipping?.city, shipping?.province, shipping?.zipCode]
            .every((field) => String(field || '').trim().length > 0);
        if (!requiredShipping) {
            return res.status(400).json({ error: 'Faltan datos de envio' });
        }
    }

    try {
        const adminSdk = getAdmin();
        const db = adminSdk.firestore();
        const FieldValue = adminSdk.firestore.FieldValue;

        const userRef = db.doc(`artifacts/${storeId}/public/data/users/${decoded.uid}`);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? (userSnap.data() || {}) : null;
        if (!userData?.name || !userData?.dni || !userData?.phone) {
            return res.status(400).json({ error: 'Datos de usuario incompletos' });
        }

        const normalizedCart = cart.map(normalizeCartEntry);
        if (normalizedCart.some((entry) => !entry.productId || entry.quantity <= 0)) {
            return res.status(400).json({ error: 'Carrito invalido' });
        }

        const uniqueIds = Array.from(new Set(normalizedCart.map((entry) => entry.productId)));
        const [productSnaps, promoSnaps] = await Promise.all([
            Promise.all(uniqueIds.map((id) => db.doc(`artifacts/${storeId}/public/data/products/${id}`).get())),
            Promise.all(uniqueIds.map((id) => db.doc(`artifacts/${storeId}/public/data/promos/${id}`).get())),
        ]);

        const productsById = new Map();
        productSnaps.forEach((snap) => {
            if (snap.exists) productsById.set(snap.id, snap.data() || {});
        });

        const promosById = new Map();
        promoSnaps.forEach((snap) => {
            if (snap.exists) promosById.set(snap.id, snap.data() || {});
        });

        const classifiedCart = normalizedCart.map((entry) => {
            const productDoc = productsById.get(entry.productId) || null;
            const promoDoc = promosById.get(entry.productId) || null;
            const isPromo = entry.isPromo === true || (!productDoc && !!promoDoc);
            return { ...entry, isPromo, productDoc, promoDoc };
        });

        const componentIds = new Set();
        for (const entry of classifiedCart) {
            if (!entry.isPromo) continue;
            const promoDoc = entry.promoDoc;
            if (!promoDoc) continue;
            const promoItems = normalizePromoItems(promoDoc.items);
            for (const component of promoItems) {
                if (!productsById.has(component.productId)) {
                    componentIds.add(component.productId);
                }
            }
        }

        if (componentIds.size > 0) {
            const componentSnaps = await Promise.all(
                Array.from(componentIds).map((id) => db.doc(`artifacts/${storeId}/public/data/products/${id}`).get())
            );
            componentSnaps.forEach((snap) => {
                if (snap.exists) productsById.set(snap.id, snap.data() || {});
            });
        }

        const items = [];
        const stockDeltas = new Map();
        let subtotal = 0;

        for (const entry of classifiedCart) {
            const quantity = entry.quantity;

            if (entry.isPromo) {
                const promo = entry.promoDoc;
                if (!promo) {
                    throw createApiError('invalid_cart_item', 'Promo no encontrada', 400);
                }
                if (promo.isActive === false) {
                    throw createApiError('invalid_cart_item', 'Promo no disponible', 400);
                }

                const promoItems = normalizePromoItems(promo.items);
                if (promoItems.length === 0) {
                    throw createApiError('invalid_promo_components', 'La promo no tiene componentes validos', 400);
                }

                const unitPriceRaw = Number(promo.price ?? promo.basePrice);
                if (!Number.isFinite(unitPriceRaw) || unitPriceRaw < 0) {
                    throw createApiError('invalid_cart_item', 'Precio de promo invalido', 400);
                }
                const unitPrice = Math.ceil(unitPriceRaw);

                items.push({
                    productId: entry.productId,
                    title: promo.name || 'Promo',
                    quantity,
                    unit_price: unitPrice,
                    image: promo.image || '',
                    isPromo: true,
                    promoItems,
                });
                subtotal += unitPrice * quantity;

                for (const component of promoItems) {
                    const componentProduct = productsById.get(component.productId);
                    if (!componentProduct || componentProduct.isActive === false) {
                        throw createApiError('invalid_promo_components', 'Componente de promo no disponible', 400);
                    }
                    const totalDecrement = component.quantity * quantity;
                    stockDeltas.set(component.productId, (stockDeltas.get(component.productId) || 0) + totalDecrement);
                }

                continue;
            }

            const product = entry.productDoc;
            if (!product) {
                throw createApiError('invalid_cart_item', 'Producto no encontrado', 400);
            }
            if (product.isActive === false) {
                throw createApiError('invalid_cart_item', 'Producto no disponible', 400);
            }

            const unitPrice = calculateItemPrice(product.basePrice, product.discount);
            items.push({
                productId: entry.productId,
                title: product.name || 'Producto',
                quantity,
                unit_price: unitPrice,
                image: product.image || '',
                isPromo: false,
            });
            subtotal += unitPrice * quantity;
            stockDeltas.set(entry.productId, (stockDeltas.get(entry.productId) || 0) + quantity);
        }

        const settingsSnap = await db.doc(`artifacts/${storeId}/public/data/settings/config`).get();
        const settingsData = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
        const deliverySettings = settingsData?.shippingDelivery || null;
        const ticketSettings = settingsData?.ticket || {};
        const ticketBrandName = String(ticketSettings?.brandName || settingsData?.storeName || 'Sustore').trim();
        const ticketWhatsappLink = String(ticketSettings?.whatsappLink || settingsData?.whatsappLink || '').trim();
        const ticketSiteUrl = String(ticketSettings?.siteUrl || settingsData?.seoUrl || process.env.PUBLIC_SITE_URL || 'https://sustore.vercel.app/').trim();

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
            const couponSnap = await couponsCol.where('code', '==', couponCode).limit(1).get();
            const couponDoc = couponSnap.docs[0];

            if (couponDoc) {
                const coupon = couponDoc.data() || {};
                if (!coupon.expirationDate || new Date(coupon.expirationDate) >= new Date()) {
                    const usedBy = Array.isArray(coupon.usedBy) ? coupon.usedBy : [];
                    const usageLimit = Number(coupon.usageLimit) || 0;

                    if (usageLimit > 0 && usedBy.length >= usageLimit) {
                        throw createApiError('coupon_usage_limit', 'Este cupon ha agotado sus usos', 400);
                    }

                    if (coupon.targetType === 'specific_email' && coupon.targetUser) {
                        const targetLower = String(coupon.targetUser).trim().toLowerCase();
                        const userLower = String(decoded.email || '').trim().toLowerCase();
                        if (targetLower !== userLower) {
                            throw createApiError('coupon_not_available_for_user', 'Este cupon no esta disponible para tu cuenta', 400);
                        }
                    }

                    const minPurchase = Number(coupon.minPurchase) || 0;
                    if (minPurchase > 0 && subtotal < minPurchase) {
                        throw createApiError('coupon_min_purchase', `El monto minimo para este cupon es $${minPurchase}`, 400);
                    }

                    if (!usedBy.includes(decoded.uid)) {
                        if (userData?.dni) {
                            const ordersCol = db.collection(`artifacts/${storeId}/public/data/orders`);
                            const dniOrders = await ordersCol
                                .where('customer.dni', '==', String(userData.dni))
                                .where('discountCode', '==', couponCode)
                                .limit(1)
                                .get();
                            if (!dniOrders.empty) {
                                throw createApiError('coupon_already_used_by_dni', 'Ya utilizaste este cupon anteriormente', 400);
                            }
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
                            discountDetails = {
                                percentage: Number(coupon.value) || 0,
                                amount: discountAmount,
                            };
                            couponDocRef = couponDoc.ref;
                        }
                    }
                }
            }
        }

        const total = Math.max(0, Math.ceil(subtotal - discountAmount + deliveryFee));

        if (paymentMethod === 'Tarjeta') {
            if (!mpPaymentId) {
                throw createApiError('missing_mp_payment_id', 'Falta mpPaymentId', 400);
            }
            if (!process.env.MP_ACCESS_TOKEN) {
                throw createApiError('payment_not_configured', 'Pago no configurado', 500);
            }

            const mpPayment = await getMercadoPagoPayment({
                paymentId: mpPaymentId,
                accessToken: process.env.MP_ACCESS_TOKEN,
            });

            const paymentStatus = String(mpPayment?.status || '').trim().toLowerCase();
            if (paymentStatus !== 'approved') {
                throw createApiError('payment_not_approved', 'Pago no aprobado', 400);
            }

            const expectedCents = cents(total);
            const paidCents = cents(mpPayment?.transaction_amount);
            if (expectedCents !== paidCents) {
                throw createApiError('payment_amount_mismatch', 'Monto de pago invalido', 400);
            }
        }

        const orderId = `ORD-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
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

        const orderRef = db.collection(`artifacts/${storeId}/public/data/orders`).doc();
        const cartRef = db.doc(`artifacts/${storeId}/public/data/carts/${decoded.uid}`);
        const paymentLockRef = paymentMethod === 'Tarjeta'
            ? db.doc(`artifacts/${storeId}/public/data/paymentLocks/${buildPaymentLockId(mpPaymentId)}`)
            : null;

        await db.runTransaction(async (tx) => {
            if (paymentLockRef) {
                const lockSnap = await tx.get(paymentLockRef);
                if (lockSnap.exists) {
                    throw createApiError('payment_already_used', 'Este pago ya fue registrado anteriormente', 409);
                }
            }

            for (const [productId, requiredQty] of stockDeltas.entries()) {
                const productRef = db.doc(`artifacts/${storeId}/public/data/products/${productId}`);
                const productSnap = await tx.get(productRef);
                if (!productSnap.exists) {
                    throw createApiError('stock_insufficient', 'Stock insuficiente para completar el pedido', 409);
                }
                const product = productSnap.data() || {};
                if (product.isActive === false) {
                    throw createApiError('stock_insufficient', 'Producto no disponible para completar el pedido', 409);
                }

                const currentStock = Number(product.stock) || 0;
                if (currentStock < requiredQty) {
                    throw createApiError('stock_insufficient', `Stock insuficiente para ${product.name || 'producto'}`, 409);
                }

                tx.update(productRef, {
                    stock: currentStock - requiredQty,
                    salesCount: (Number(product.salesCount) || 0) + requiredQty,
                });
            }

            if (couponDocRef) {
                const couponSnap = await tx.get(couponDocRef);
                if (!couponSnap.exists) {
                    throw createApiError('coupon_invalid', 'El cupon ya no esta disponible', 400);
                }

                const couponData = couponSnap.data() || {};
                if (couponData.expirationDate && new Date(couponData.expirationDate) < new Date()) {
                    throw createApiError('coupon_expired', 'El cupon expiro', 400);
                }

                const usedBy = Array.isArray(couponData.usedBy) ? couponData.usedBy : [];
                const usageLimit = Number(couponData.usageLimit) || 0;

                if (usedBy.includes(decoded.uid)) {
                    throw createApiError('coupon_already_used', 'Este cupon ya fue utilizado por tu cuenta', 400);
                }
                if (usageLimit > 0 && usedBy.length >= usageLimit) {
                    throw createApiError('coupon_usage_limit', 'Este cupon ha agotado sus usos', 400);
                }

                if (couponData.targetType === 'specific_email' && couponData.targetUser) {
                    const targetLower = String(couponData.targetUser).trim().toLowerCase();
                    const userLower = String(decoded.email || '').trim().toLowerCase();
                    if (targetLower !== userLower) {
                        throw createApiError('coupon_not_available_for_user', 'Este cupon no esta disponible para tu cuenta', 400);
                    }
                }

                tx.update(couponDocRef, { usedBy: FieldValue.arrayUnion(decoded.uid) });
            }

            tx.set(orderRef, orderData);
            tx.set(cartRef, { userId: decoded.uid, items: [] }, { merge: true });
            tx.set(userRef, {
                address: String(shipping.address || ''),
                city: String(shipping.city || ''),
                province: String(shipping.province || ''),
                zipCode: String(shipping.zipCode || ''),
                ordersCount: FieldValue.increment(1),
                lastOrderDate: nowIso,
            }, { merge: true });

            if (paymentLockRef) {
                tx.set(paymentLockRef, {
                    mpPaymentId,
                    orderDocId: orderRef.id,
                    orderId,
                    customerId: decoded.uid,
                    total,
                    createdAt: nowIso,
                });
            }
        });

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
            } catch (error) {
                console.error('[orders/confirm] Email send failed:', error);
            }
        } else {
            console.warn('[orders/confirm] Email not configured (missing EMAIL_USER/EMAIL_PASS).');
        }

        return res.status(200).json({ success: true, orderId, emailSent });
    } catch (error) {
        if (error?.status && error?.code) {
            return res.status(error.status).json({ error: error.message, code: error.code });
        }
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}
