import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, X, Trash2, CheckCircle, Plus, Info, Star } from 'lucide-react';

const BotProductCard = ({ product, onAdd }) => {
    const [qty, setQty] = useState(1);
    const finalPrice = product.basePrice * (1 - (product.discount || 0) / 100);

    return (
        <div className="min-w-[200px] max-w-[200px] bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden flex flex-col group snap-center">
            <div className="relative h-28 bg-white p-2">
                <img src={product.image} className="w-full h-full object-contain group-hover:scale-110 transition duration-500" alt={product.name} />
                {product.discount > 0 && (
                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
                        -{product.discount}%
                    </div>
                )}
            </div>
            <div className="p-3 flex-1 flex flex-col">
                <h4 className="text-white font-bold text-xs line-clamp-2 mb-2 leading-tight h-8">{product.name}</h4>
                <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-yellow-500 font-black text-sm">${Math.round(finalPrice).toLocaleString()}</span>
                        {product.discount > 0 && (
                            <span className="text-slate-500 text-[10px] line-through">${product.basePrice.toLocaleString()}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/5 transition"
                            >
                                -
                            </button>
                            <span className="px-2 py-1 text-xs text-white font-bold min-w-[24px] text-center">{qty}</span>
                            <button
                                onClick={() => setQty(Math.min(99, qty + 1))}
                                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-white/5 transition"
                            >
                                +
                            </button>
                        </div>
                        <button
                            onClick={() => onAdd(product, qty)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-1.5 rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 shadow-lg shadow-yellow-900/20"
                        >
                            <Plus className="w-3 h-3" /> LISTO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SustIABot = React.memo(({ settings, products, addToCart, controlPanel, coupons, appId }) => {
    // 1. Verificación de Plan - Solo disponible en Plan Premium
    const forceEnabled = (() => {
        try {
            const href = String(window.location.href || '');
            if (href.includes('sustia=1')) return true;
            return new URLSearchParams(window.location.search).get('sustia') === '1';
        } catch { return false; }
    })();
    if (!forceEnabled && settings?.subscriptionPlan !== 'premium') return null;

    const [isOpen, setIsOpen] = useState(false);

    // Custom Bot Image (Configurable)
    const botImage = settings?.botImage || "sustia-ai-v2.jpg";

    const chatStorageKey = `sustore_sustia_chat_${appId}`;
    const defaultBotMessage = { role: 'model', text: '¡Hola! Soy SustIA 🤖, tu asistente personal. ¿Buscas algo especial hoy? Puedo verificar stock y agregar productos a tu carrito.' };
    const [messages, setMessages] = useState([defaultBotMessage]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastContext, setLastContext] = useState(null); // Para manejar contexto (Sí/No)
    const messagesEndRef = useRef(null);
    const messagesRef = useRef(messages);
    const inFlightRef = useRef(false);
    const pendingTextRef = useRef(null);
    const isMountedRef = useRef(true);

    const safeProducts = Array.isArray(products) ? products : [];
    const safeCoupons = Array.isArray(coupons) ? coupons : [];
    const aiEnabled = !!settings?.aiAssistant?.enabled;

    const normalizeText = (value) => {
        if (value === null || value === undefined) return '';
        return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    };

    const tokenize = (value) => {
        const t = normalizeText(value);
        if (!t) return [];
        const raw = t.split(/[\s,.;:!?/()\\[\]{}"“”'’\-+*_]+/).filter(Boolean);
        const stop = new Set([
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
            'de', 'del', 'en', 'con', 'sin', 'para', 'por', 'a', 'al',
            'que', 'como', 'cual', 'cuales', 'donde', 'cuando', 'quien', 'quienes',
            'hola', 'buenas', 'buenos', 'dia', 'dias', 'tardes', 'noches',
            'busco', 'buscar', 'tenes', 'tienes', 'precio', 'vale', 'cuesta',
            'quiero', 'necesito', 'hay', 'me', 'te', 'mi', 'mis', 'tu', 'tus',
            'agrega', 'agregar', 'agregame', 'agregalo', 'sumar', 'sumame', 'poner', 'pone',
            'comprar', 'compralo', 'llevo', 'carrito', 'bolsa', 'cesta',
            'mas', 'menos', 'muy', 'super', 're'
        ]);
        return raw.filter(w => w.length > 1 && !stop.has(w) && !/^\d+$/.test(w));
    };

    const parseHumanNumber = (rawNumber, contextText) => {
        if (!rawNumber) return null;
        const n = parseFloat(String(rawNumber).replace(',', '.'));
        if (!Number.isFinite(n)) return null;
        const hasK = contextText.includes(`${rawNumber}k`) || contextText.includes(`${rawNumber} k`) || contextText.includes(`${rawNumber}mil`) || contextText.includes(`${rawNumber} mil`);
        if (hasK) return n * 1000;
        return n;
    };

    const parseQuantity = (t) => {
        const text = normalizeText(t);
        const m1 = text.match(/\b(?:x|por)\s*(\d{1,3})\b/);
        if (m1) return Math.max(1, Math.min(99, parseInt(m1[1], 10)));
        const m2 = text.match(/\b(\d{1,3})\s*(?:u|ud|uds|unidad|unidades|pcs|piezas)\b/);
        if (m2) return Math.max(1, Math.min(99, parseInt(m2[1], 10)));
        const m3 = text.match(/\b(\d{1,2})\b/);
        if (m3 && text.match(/\b(agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|quiero|llevo|comprar)\b/)) {
            return Math.max(1, Math.min(99, parseInt(m3[1], 10)));
        }
        return 1;
    };

    const getProductCategories = (p) => {
        const cats = [];
        if (Array.isArray(p?.categories)) cats.push(...p.categories);
        if (typeof p?.category === 'string' && p.category.trim()) cats.push(p.category);
        return cats
            .filter(Boolean)
            .map(c => String(c).trim())
            .filter(Boolean);
    };

    const getProductFinalPrice = (p) => {
        const base = Number(p?.basePrice) || 0;
        const disc = Number(p?.discount) || 0;
        return base * (1 - disc / 100);
    };

    const aiContext = useMemo(() => {
        const storeName = settings?.storeName ? String(settings.storeName) : '';
        const aboutUsText = settings?.aboutUsText ? String(settings.aboutUsText) : '';

        const deliveryEnabled = !!settings?.shippingDelivery?.enabled;
        const pickupEnabled = !!settings?.shippingPickup?.enabled;
        const deliveryFee = Number(settings?.shippingDelivery?.fee) || 0;
        const freeAbove = Number(settings?.shippingDelivery?.freeAbove) || 0;
        const pickupAddress = settings?.shippingPickup?.address || '';
        const shippingParts = [];
        if (pickupEnabled) shippingParts.push(`Retiro en local: ${pickupAddress ? pickupAddress : 'a coordinar'}.`);
        if (deliveryEnabled) {
            if (freeAbove > 0) shippingParts.push(`Envío a domicilio: $${deliveryFee.toLocaleString()} (gratis desde $${freeAbove.toLocaleString()}).`);
            else shippingParts.push(`Envío a domicilio: $${deliveryFee.toLocaleString()}.`);
        }

        const hasCard = !!settings?.paymentMercadoPago?.enabled;
        const hasTransfer = !!settings?.paymentTransfer?.enabled;
        const hasCash = !!settings?.paymentCash && pickupEnabled;
        const payParts = [];
        if (hasCard) payParts.push('Tarjeta (Mercado Pago)');
        if (hasTransfer) payParts.push('Transferencia');
        if (hasCash) payParts.push('Efectivo (solo retiro en local)');

        const categories = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...safeProducts.flatMap(p => getProductCategories(p))])]
            .map(c => String(c).trim())
            .filter(Boolean)
            .slice(0, 20);

        const productHints = safeProducts
            .filter(p => p && (Number(p.stock) || 0) > 0 && p.isActive !== false)
            .map(p => ({
                name: String(p.name || '').trim(),
                price: getProductFinalPrice(p),
                discount: Number(p.discount) || 0,
                featured: !!p.isFeatured,
                cats: getProductCategories(p).slice(0, 2).join(', ')
            }))
            .filter(p => p.name)
            .sort((a, b) => (b.discount - a.discount) || (Number(b.featured) - Number(a.featured)) || (a.price - b.price))
            .slice(0, 25)
            .map(p => `${p.name} — $${Math.round(p.price).toLocaleString()}${p.cats ? ` — ${p.cats}` : ''}`);

        return {
            storeName,
            aboutUsText,
            shipping: shippingParts.join(' '),
            payments: payParts.join(', '),
            categories,
            productHints
        };
    }, [settings, safeProducts]);

    const callExternalAI = async ({ userText, history, signal }) => {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userText,
                messages: Array.isArray(history) ? history : [],
                context: aiContext
            }),
            signal
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'ai_error');
        if (!data?.text || typeof data.text !== 'string') throw new Error('ai_invalid');
        return { text: data.text };
    };

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    // --- HERRAMIENTA DE BÚSQUEDA INTELIGENTE (FUZZY) ---
    const fuzzySearch = (text, query) => {
        if (!query || typeof query !== 'string') return false;
        if (!text || typeof text !== 'string') return false;

        const str = normalizeText(text);
        const patt = normalizeText(query);

        if (str.includes(patt)) return true; // Coincidencia exacta parcial

        // Coincidencia aproximada simple (para Typos)
        // Si más del 70% de los caracteres están presentes en orden relativo
        let matches = 0;
        let lastIndex = -1;
        for (let char of patt) {
            const index = str.indexOf(char, lastIndex + 1);
            if (index > -1) {
                matches++;
                lastIndex = index;
            }
        }
        return (matches / patt.length) > 0.75;
    };

    // --- CEREBRO LOCAL AVANZADO V5 (Universal & Contextual) ---
    const callLocalBrain = async (userText, currentMessages) => {
        await new Promise(resolve => setTimeout(resolve, 800)); // Simular pensamiento
        const text = normalizeText(userText);
        const qty = parseQuantity(text);

        // 0. Detectar Saludos
        if (text.match(/\b(hola|holas|buen dia|buenos dias|buenas tardes|buenas noches|buenas|hello|hi|hey|que tal|como estas|como va|todo bien)\b/)) {
            return { text: "¡Hola! 👋 ¿Qué querés hacer? Podés pedirme productos, ofertas, cupones, envío, pagos o que agregue algo al carrito." };
        }

        if (text.match(/\b(quien sos|que sos|que haces|sos real|sos un bot|asistente)\b/)) {
            const storeName = settings?.storeName ? ` de **${settings.storeName}**` : '';
            return { text: `Soy SustIA${storeName}. Puedo ayudarte a encontrar productos, ver ofertas/cupones y armar el carrito más rápido.` };
        }

        if (text.match(/\b(categorias|categoria|rubros|rubro|secciones)\b/)) {
            const prodCats = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
            const cats = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...prodCats])]
                .map(c => String(c).trim())
                .filter(Boolean);
            if (cats.length === 0) return { text: "Todavía no tengo categorías configuradas. Decime qué estás buscando y lo resuelvo igual." };
            const top = cats.slice(0, 10);
            return { text: `Tenemos estas categorías:\n\n${top.map(c => `- ${c}`).join('\n')}\n\nDecime cuál te interesa y te muestro opciones.` };
        }

        if (text.match(/\b(sobre|info|informacion|quienes somos|about)\b/)) {
            const about = settings?.aboutUsText || '';
            if (about.trim()) return { text: about.trim() };
            return { text: "Esta tienda todavía no cargó su sección “Sobre nosotros”. ¿Querés que te ayude a encontrar un producto?" };
        }

        // 0.1 Comandos de Sistema (Universal)
        if (controlPanel) {
            if (text.match(/modo\s*(?:oscuro|noche|dark)/)) {
                controlPanel.setDarkMode(true);
                return { text: "He activado el modo oscuro 🌙. ¿Mejor para tus ojos?" };
            }
            if (text.match(/modo\s*(?:claro|dia|light)/)) {
                controlPanel.setDarkMode(false);
                return { text: "He activado el modo claro ☀️." };
            }
            if (text.match(/(?:ver|abrir|ir al)\s*(?:carrito|bolsa|cesta)/)) {
                controlPanel.openCart();
                return { text: "Abriendo tu carrito de compras... 🛒" };
            }
        }

        if (text.match(/\b(envio|envios|entrega|delivery|domicilio|retiro|retirar|local|pickup)\b/)) {
            const deliveryEnabled = !!settings?.shippingDelivery?.enabled;
            const pickupEnabled = !!settings?.shippingPickup?.enabled;
            const deliveryFee = Number(settings?.shippingDelivery?.fee) || 0;
            const freeAbove = Number(settings?.shippingDelivery?.freeAbove) || 0;
            const pickupAddress = settings?.shippingPickup?.address || '';

            const lines = [];
            if (pickupEnabled) {
                lines.push(`📍 Retiro en local: ${pickupAddress ? `**${pickupAddress}**` : 'a coordinar'}.`);
            }
            if (deliveryEnabled) {
                if (freeAbove > 0) {
                    lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()} (gratis desde $${freeAbove.toLocaleString()}).`);
                } else {
                    lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()}.`);
                }
            }
            if (!pickupEnabled && !deliveryEnabled) {
                lines.push("Todavía no tengo configurado el método de entrega para esta tienda.");
            }
            lines.push("Si me decís tu ciudad/zona, te digo lo mejor para vos.");
            return { text: lines.join('\n') };
        }

        if (text.match(/\b(pago|pagos|tarjeta|mercado\s*pago|transferencia|cbu|alias|efectivo)\b/)) {
            const hasCard = !!settings?.paymentMercadoPago?.enabled;
            const hasTransfer = !!settings?.paymentTransfer?.enabled;
            const hasCash = !!settings?.paymentCash && !!settings?.shippingPickup?.enabled;
            const wantsTransferData = hasTransfer && text.match(/\b(alias|cbu|transferencia)\b/);
            const options = [];
            if (hasCard) options.push("💳 Tarjeta (Mercado Pago)");
            if (hasTransfer) options.push("🏦 Transferencia");
            if (hasCash) options.push("💵 Efectivo (solo retiro en local)");

            if (options.length === 0) {
                return { text: "Todavía no tengo métodos de pago configurados para esta tienda. Si querés, te paso WhatsApp para coordinar." };
            }
            if (wantsTransferData) {
                const holderName = settings?.paymentTransfer?.holderName ? String(settings.paymentTransfer.holderName).trim() : '';
                const alias = settings?.paymentTransfer?.alias ? String(settings.paymentTransfer.alias).trim() : '';
                const cbu = settings?.paymentTransfer?.cbu ? String(settings.paymentTransfer.cbu).trim() : '';
                const lines = ["Para transferir, usá estos datos:"];
                if (holderName) lines.push(`- Titular: ${holderName}`);
                if (alias) lines.push(`- Alias: ${alias}`);
                if (cbu) lines.push(`- CBU: ${cbu}`);
                if (!holderName && !alias && !cbu) {
                    lines.push("- Aún no están cargados los datos de transferencia para esta tienda.");
                }
                return { text: lines.join('\n') };
            }
            return { text: `Podés pagar con:\n\n${options.map(o => `- ${o}`).join('\n')}\n\n¿Con cuál preferís?` };
        }

        // 0.2 Detectar Ayuda/Contacto
        if (text.match(/\b(ayuda|soporte|contacto|human|persona|asesor)\b/)) {
            if (settings?.whatsappLink) {
                return { text: `Claro. Si necesitas asistencia personalizada con un humano 🧑‍💻, escríbenos a nuestro WhatsApp: ${settings.whatsappLink} 📲` };
            }
            return { text: "Estoy diseñado para ayudarte a encontrar productos las 24hs. 🤖 ¿Buscas algo en específico?" };
        }

        // 0.3 Detectar Promociones/Cupones
        if (text.match(/\b(descuento|promo|cupon|oferta|codigo|rebaja)\b/)) {
            const activeCoupons = safeCoupons.filter(c => c?.active);
            const deals = safeProducts.filter(p => (Number(p?.discount) || 0) > 0 && (Number(p?.stock) || 0) > 0);

            if (activeCoupons.length > 0) {
                const couponText = activeCoupons
                    .filter(c => c?.code)
                    .map(c => `🎫 **${c.code}** (${c.discountType === 'percentage' ? c.value + '%' : '$' + c.value} OFF)`)
                    .join("\n");
                return { text: `¡Sí! Tenemos estos cupones disponibles para ti:\n\n${couponText}\n\n¡Úsalos al finalizar tu compra! 🛒` };
            } else if (deals.length > 0) {
                setLastContext({ type: 'show_deals', data: deals.sort(() => 0.5 - Math.random()).slice(0, 5) });
                return { text: `No tengo códigos de cupón activos ahora, pero sí tenemos **${deals.length}** productos con descuento. ¿Querés que te muestre los mejores? 🏷️` };
            } else {
                return { text: "Por el momento no tengo códigos promocionales activos, pero nuestros precios son los mejores del mercado. 😉" };
            }
        }

        // 1. Manejo de Contexto (Conversacional)
        if (lastContext) {
            if (text.match(/\b(si|claro|dale|bueno|yes|por favor|obvio)\b/)) {
                const ctx = lastContext;
                setLastContext(null);
                if (ctx.type === 'suggest_cross_sell') {
                    return {
                        text: "¡Excelente! Mira estas oportunidades que seleccioné para ti: 🔥",
                        products: ctx.data
                    };
                }
                if (ctx.type === 'show_deals') {
                    return {
                        text: "Listo. Estas son algunas ofertas que valen la pena ahora mismo:",
                        products: ctx.data
                    };
                }
            } else if (text.match(/\b(no|gracias|paso|cancelar|asi esta bien)\b/)) {
                setLastContext(null);
                return { text: "Entendido. ¿Necesitas ayuda con algo más? 😊" };
            }
        }

        // 2. Detectar Intenciones
        const isCheaper = text.match(/(?:mas|muy|super)\s*(?:barato|economico|bajo)|oferta|menos|mas\s*economico/);
        const isExpensive = text.match(/(?:mas|muy|super)\s*(?:caro|mejor|calidad|top|premium)|costoso|lujo/);
        const isBuying = text.match(/(?:agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|comprar|quiero|dame|carrito|llevo|lo quiero)/);

        // 2.1 Filtros de Precio Inteligentes (NUEVO)
        let minPrice = 0;
        let maxPrice = Infinity;

        // Detectar "menos de X"
        const lessThanMatch = text.match(/(?:menos|menor|bajo)\s*(?:de|a|que)?\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (lessThanMatch) {
            const parsed = parseHumanNumber(lessThanMatch[1], text);
            if (parsed !== null) maxPrice = parsed;
        }

        // Detectar "entre X y Y"
        const betweenMatch = text.match(/entre\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?\s*y\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (betweenMatch) {
            const parsedMin = parseHumanNumber(betweenMatch[1], text);
            const parsedMax = parseHumanNumber(betweenMatch[2], text);
            if (parsedMin !== null) minPrice = parsedMin;
            if (parsedMax !== null) maxPrice = parsedMax;
        }

        // 3. Detectar Categoría (Fuzzy)
        const availableCategories = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
        const detectedCategoryVal = availableCategories.find(c => fuzzySearch(c, text) || fuzzySearch(text, c));
        const targetCategory = detectedCategoryVal ? detectedCategoryVal.toLowerCase() : null;

        // 4. Búsqueda y Scoring de Productos
        const synonyms = new Map([
            ['celu', 'celular'],
            ['cel', 'celular'],
            ['tele', 'televisor'],
            ['tv', 'televisor'],
            ['compu', 'computadora'],
            ['notebook', 'laptop'],
            ['auris', 'auriculares'],
            ['zapas', 'zapatillas'],
            ['remera', 'camiseta'],
            ['remeras', 'camisetas']
        ]);
        const keywords = tokenize(text).flatMap(k => {
            const alt = synonyms.get(k);
            return alt ? [k, alt] : [k];
        });

        let candidates = safeProducts.filter(p => (Number(p?.stock) || 0) > 0 && p?.isActive !== false);

        // Aplicar filtros de precio
        candidates = candidates.filter(p => {
            const fp = getProductFinalPrice(p);
            return fp >= minPrice && fp <= maxPrice;
        });

        // Filtro por categoría detectada
        if (targetCategory) {
            candidates = candidates.filter(p => getProductCategories(p).some(c => c.toLowerCase() === targetCategory));
        }

        const scores = candidates.map(p => {
            let score = 0;
            const pName = normalizeText(p.name);
            const pDesc = normalizeText(p.description);

            keywords.forEach(k => {
                if (pName.includes(k)) score += 10;
                else if (fuzzySearch(pName, k)) score += 5;
                if (pDesc.includes(k)) score += 2;
            });

            if (p.isFeatured) score += 5;
            if (p.discount > 0) score += 3;
            if (isCheaper) score += (1 / (getProductFinalPrice(p) || 1)) * 10000;
            if (isExpensive) score += getProductFinalPrice(p) / 100;

            return { product: p, score };
        });

        const sorted = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
        const topMatches = sorted.slice(0, 5).map(s => s.product);

        if (topMatches.length === 0) {
            return { text: "No encontré exactamente lo que buscás, pero probando con otra palabra o viendo nuestras categorías seguro lo hallamos. 🔎" };
        }

        if (isBuying && topMatches.length > 0) {
            const best = topMatches[0];
            addToCart(best, qty);

            const suggestions = safeProducts
                .filter(p => p.id !== best.id && (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            if (suggestions.length > 0) {
                setLastContext({ type: 'suggest_cross_sell', data: suggestions });
                return {
                    text: `¡Listo! Agregué **${qty}x ${best.name}** a tu carrito. 🛒\n\n¿Te gustaría ver algunos productos destacados para complementar tu compra? 👀`,
                    products: [best]
                };
            }

            return {
                text: `¡Listo! Agregué **${qty}x ${best.name}** a tu carrito. 🛒 ¿Algo más?`,
                products: [best]
            };
        }

        let msg = "Aquí tienes algunas opciones:";
        if (targetCategory) msg = `Encontré esto en la categoría ${targetCategory}:`;
        if (isCheaper) msg = "Las opciones más económicas:";

        return {
            text: msg,
            products: topMatches
        };
    };

    const withTimeout = async (promise, ms) => {
        let timeoutId = null;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    };

    const sendText = async (rawText, opts = {}) => {
        const alreadyAddedUser = !!opts.alreadyAddedUser;
        const text = String(rawText || '').trim().slice(0, 300);
        if (!text) return;
        if (inFlightRef.current) {
            if (!alreadyAddedUser) {
                const newMsgUserQueued = { role: 'client', text };
                setMessages(prev => [...prev, newMsgUserQueued]);
            }
            pendingTextRef.current = { text, alreadyAddedUser: true };
            return;
        }

        inFlightRef.current = true;
        setInputValue('');

        const newMsgUser = alreadyAddedUser ? null : { role: 'client', text };
        const updatedHistory = [...(messagesRef.current || []), ...(newMsgUser ? [newMsgUser] : [])];

        if (newMsgUser) {
            setMessages(prev => [...prev, newMsgUser]);
        }
        setIsTyping(true);

        try {
            const localResponse = await withTimeout(callLocalBrain(text, updatedHistory), 12000);
            if (!isMountedRef.current) return;
            let finalText = localResponse?.text && typeof localResponse.text === 'string'
                ? localResponse.text
                : "Perdón, tuve un problema procesando eso. ¿Podés reformularlo?";
            const safeProducts = Array.isArray(localResponse?.products) ? localResponse.products : undefined;

            const shouldAskExternal = aiEnabled && (!safeProducts || safeProducts.length === 0) && /no encontr[eé]|no tengo eso|no lo tengo|probando con otra palabra/i.test(finalText);
            if (shouldAskExternal) {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), 8500);
                try {
                    const aiRes = await callExternalAI({ userText: text, history: updatedHistory, signal: controller.signal });
                    if (aiRes?.text) finalText = aiRes.text;
                } catch { }
                clearTimeout(id);
            }

            setMessages(prev => [...prev, {
                role: 'model',
                text: finalText,
                products: safeProducts
            }]);
        } catch (e) {
            if (!isMountedRef.current) return;
            const fallback = settings?.whatsappLink
                ? `Uy, se me trabó por un momento. Si querés, hablá por WhatsApp: ${settings.whatsappLink}`
                : "Uy, se me trabó por un momento. ¿Probamos de nuevo?";
            setMessages(prev => [...prev, { role: 'model', text: fallback }]);
        } finally {
            if (isMountedRef.current) setIsTyping(false);
            inFlightRef.current = false;
            const pending = pendingTextRef.current;
            if (pending && pending.text) {
                pendingTextRef.current = null;
                setTimeout(() => sendText(pending.text, { alreadyAddedUser: pending.alreadyAddedUser === true }), 0);
            }
        }
    };

    const handleSend = async () => {
        return sendText(inputValue);
    };

    const handleQuickAction = (value) => {
        const text = String(value || '').trim();
        if (!text) return;
        sendText(text);
    };

    const clearChat = () => {
        try {
            localStorage.removeItem(chatStorageKey);
        } catch { }
        setLastContext(null);
        setMessages([defaultBotMessage]);
    };

    const quickActions = [
        { label: 'Ofertas', value: 'Mostrame ofertas' },
        { label: 'Cupones', value: 'Tenés cupones?' },
        { label: 'Envío', value: 'Cómo es el envío?' },
        { label: 'Pagos', value: 'Qué medios de pago hay?' },
        { label: 'Categorías', value: 'Qué categorías tenés?' },
        { label: 'WhatsApp', value: 'Necesito hablar con una persona' }
    ];

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
            {isOpen && (
                <div className="bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] w-[calc(100vw-2rem)] sm:w-80 md:w-96 h-[min(600px,80dvh)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col mb-4 animate-fade-up overflow-hidden font-sans pointer-events-auto ring-1 ring-white/10 relative mr-0 sm:mr-0">
                    <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-5 flex justify-between items-center relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-1 bg-white/20 rounded-full backdrop-blur-md overflow-hidden border border-white/30">
                                <img src={botImage} className="w-9 h-9 object-cover rounded-full" alt="SustIA" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-tight">SustIA AI</h3>
                                <p className="text-[10px] text-white/90 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                                    En línea
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={clearChat} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors" title="Limpiar chat">
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors" title="Cerrar">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#111] px-4 py-2 border-b border-white/5">
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {quickActions.map(a => (
                                <button
                                    key={a.label}
                                    type="button"
                                    data-testid={`quick-action-${a.label.toLowerCase()}`}
                                    onClick={() => {
                                        handleQuickAction(a.value);
                                    }}
                                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-white/10 bg-[#1a1a1a] text-white/90 hover:bg-[#222] transition"
                                >
                                    {a.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#0a0a0a]/50 custom-scrollbar relative">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'client' ? 'items-end' : 'items-start'} animate-fade-in`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-lg ${m.role === 'client'
                                    ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-tr-none border border-white/10'
                                    : 'bg-[#1a1a1a] text-slate-200 rounded-tl-none border border-white/5'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{m.text}</p>
                                </div>

                                {m.products && m.products.length > 0 && (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar pl-1 snap-x">
                                        {m.products.map(product => (
                                            <BotProductCard
                                                key={product.id}
                                                product={product}
                                                onAdd={(p, qty) => {
                                                    addToCart(p, qty);
                                                    setMessages(prev => [...prev, { role: 'model', text: `Agregado ${qty}x ${p.name} al carrito! 🛒` }]);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-bl-none border border-white/5 flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border-t border-white/10 relative z-0">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                            <input
                                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:border-yellow-500/50 outline-none transition placeholder:text-slate-600"
                                placeholder="Escribe aquí..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                            />
                            <button type="submit" className="p-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full transition shadow-lg shadow-yellow-600/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isTyping || !inputValue.trim()}>
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-110 transition-transform group relative z-50"
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : (
                    <div className="w-full h-full p-1">
                        <img src="sustia-ai-v2.jpg" className="w-full h-full object-cover rounded-full opacity-95 group-hover:scale-110 transition-transform duration-300" alt="SustIA" />
                    </div>
                )}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border border-black"></span>
                    </span>
                )}
            </button>
        </div>
    );
}, (prevProps, nextProps) => {
    if (prevProps.settings?.subscriptionPlan !== nextProps.settings?.subscriptionPlan) return false;
    if (prevProps.products !== nextProps.products) return false;
    return true;
});

export default SustIABot;
