import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Trash2, CheckCircle, Plus, Info, Star } from 'lucide-react';

const BotProductCard = ({ product, onAdd }) => {
    const [qty, setQty] = useState(1);
    const finalPrice = product.basePrice * (1 - (product.discount || 0) / 100);

    return (
        <div className="min-w-[200px] max-w-[200px] bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden flex flex-col group snap-center">
            <div className="relative aspect-square bg-white/95 p-2 overflow-hidden rounded-t-2xl">
                <img src={product.image} className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition duration-500" alt={product.name} loading="lazy" />
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
                            <span className="text-slate-500 text-[10px] line-through">${(Number(product.basePrice) || 0).toLocaleString()}</span>
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
                                onClick={() => setQty(Math.min(Number(product.stock) || 1, qty + 1))}
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
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Custom Bot Image (Configurable)
    const botImage = settings?.botImage || "sustia-ai-v2.jpg";

    const chatStorageKey = `sustore_sustia_chat_${appId}`;
    const defaultBotMessage = { role: 'model', text: '¡Hola! Soy SustIA 🤖, tu asistente personal. ¿Buscas algo especial hoy? Puedo verificar stock y agregar productos a tu carrito.' };
    const [messages, setMessages] = useState([defaultBotMessage]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const topicRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesRef = useRef(messages);
    const inFlightRef = useRef(false);
    const pendingTextRef = useRef(null);
    const isMountedRef = useRef(true);

    const safeProducts = Array.isArray(products) ? products : [];
    const safeCoupons = Array.isArray(coupons) ? coupons : [];

    useEffect(() => {
        const check = () => {
            try {
                setIsDarkMode(document?.documentElement?.classList?.contains('dark-mode') === true);
            } catch {
                setIsDarkMode(false);
            }
        };
        check();

        let obs;
        try {
            obs = new MutationObserver(() => check());
            if (document?.documentElement) obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        } catch { }

        return () => {
            try { obs?.disconnect?.(); } catch { }
        };
    }, []);

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

    // --- LISTA DE PROVINCIAS Y CIUDADES ARGENTINAS ---
    const ARGENTINA_PROVINCES = [
        'buenos aires', 'caba', 'capital federal', 'ciudad autonoma', 'ciudad de buenos aires',
        'catamarca', 'chaco', 'chubut', 'cordoba', 'corrientes', 'entre rios', 'formosa',
        'jujuy', 'la pampa', 'la rioja', 'mendoza', 'misiones', 'neuquen', 'rio negro',
        'salta', 'san juan', 'san luis', 'santa cruz', 'santa fe', 'santiago del estero',
        'tierra del fuego', 'tucuman'
    ];
    const ARGENTINA_CITIES = [
        'adrogue', 'avellaneda', 'bahia blanca', 'banfield', 'bariloche', 'bernal', 'berazategui',
        'burzaco', 'caleta olivia', 'campana', 'caseros', 'cipolletti', 'comodoro rivadavia',
        'concordia', 'devoto', 'el calafate', 'el palomar', 'escobar', 'ezeiza', 'florencio varela',
        'general roca', 'gualeguaychu', 'hurlingham', 'iguazu', 'ituzaingo', 'jose c paz',
        'junin', 'la plata', 'lanus', 'lomas de zamora', 'lujan', 'mar del plata',
        'marcos paz', 'mercedes', 'merlo', 'monte grande', 'moron', 'necochea',
        'olavarria', 'parana', 'pergamino', 'pilar', 'pinamar', 'posadas', 'presidencia roque saenz pena',
        'quilmes', 'rafaela', 'rawson', 'reconquista', 'resistencia', 'rio cuarto', 'rio gallegos',
        'rosario', 'san fernando', 'san isidro', 'san justo', 'san martin', 'san miguel',
        'san miguel de tucuman', 'san nicolas', 'san rafael', 'san salvador de jujuy',
        'santa rosa', 'tandil', 'temperley', 'tigre', 'trelew', 'ushuaia', 'venado tuerto',
        'villa carlos paz', 'villa maria', 'villa mercedes', 'wilde', 'zarate',
        'gonzalez catan', 'virrey del pino', 'laferrere', 'rafael castillo', 'isidro casanova',
        'ciudad evita', 'aldo bonzi', 'tapiales', 'villa luzuriaga', 'ramos mejia', 'haedo',
        'castelar', 'ciudadela', 'liniers', 'mataderos', 'lugano', 'flores', 'caballito',
        'almagro', 'boedo', 'palermo', 'belgrano', 'nunez', 'recoleta', 'retiro', 'microcentro',
        'san telmo', 'la boca', 'barracas', 'constitucion', 'once', 'congreso', 'tribunales',
        'villa crespo', 'villa urquiza', 'villa devoto', 'villa del parque', 'versalles',
        'monte castro', 'floresta', 'velez sarsfield', 'parque chacabuco', 'pompeya',
        'soldati', 'villa lugano', 'villa riachuelo', 'liniers', 'mataderos', 'parque avellaneda',
        'villa luro', 'agronomia', 'chacarita', 'paternal', 'villa ortuzar', 'coghlan',
        'saavedra', 'villa pueyrredon', 'parque chas', 'villa real', 'puerto madero',
        'san cristobal', 'balvanera', 'monserrat', 'san nicolas barrio',
        'olivos', 'martinez', 'acassuso', 'beccar', 'boulogne', 'munro', 'florida', 'vicente lopez',
        'don torcuato', 'el talar', 'garin', 'grand bourg', 'ingeniero maschwitz', 'los polvorines',
        'pablo nogues', 'tortuguitas', 'william morris', 'general pacheco', 'benavidez',
        'nordelta', 'rincon de milberg', 'dique lujan', 'general rodriguez',
        'moreno', 'paso del rey', 'trujui', 'francisco alvarez', 'la reja', 'guernica',
        'alejandro korn', 'domselaar', 'san vicente', 'canning', 'esteban echeverria',
        'el jaguel', 'luis guillon', 'longchamps', 'glew', 'claypole', 'almirante brown',
        'villa gesell', 'miramar', 'necochea', 'tres arroyos', 'azul', 'olavarria', 'bragado',
        'chivilcoy', 'chacabuco', 'pehuajo', 'trenque lauquen', 'general villegas',
        'nueve de julio', 'bolivar', 'saladillo', 'lobos', 'canuelas', 'san antonio de areco',
        'carmen de areco', 'capitan sarmiento', 'san pedro', 'baradero', 'ramallo',
        'villa constitucion', 'san lorenzo', 'casilda', 'firmat', 'chabas', 'rufino',
        'general pico', 'rio tercero', 'villa allende', 'unquillo', 'jesus maria',
        'alta gracia', 'cosquin', 'la falda', 'villa giardino', 'dean funes',
        'cruz del eje', 'bell ville', 'marcos juarez', 'laboulaye', 'san francisco'
    ];
    const ALL_LOCATIONS = [...ARGENTINA_PROVINCES, ...ARGENTINA_CITIES];

    const BLOCKED_WORDS = new Set([
        'caca', 'culo', 'teta', 'tetas', 'pija', 'pito', 'mierda', 'puta', 'puto',
        'concha', 'pelotudo', 'pelotuda', 'boludo', 'boluda', 'forro', 'forra',
        'verga', 'poronga', 'ojete', 'orto', 'pete', 'garcha', 'cogida', 'cogido',
        'coger', 'chupar', 'chuparla', 'chupame', 'chupala', 'mamada', 'mogolico',
        'mogolica', 'tarado', 'tarada', 'imbecil', 'idiota', 'estupido', 'estupida',
        'hdp', 'lcdtm', 'ctm', 'ptm', 'sorete', 'trola', 'trolo', 'gil', 'gila',
        'pajero', 'pajera', 'nabo', 'naba', 'salame', 'bobo', 'boba', 'banana',
        'zapallo', 'pichipe'
    ]);

    const isBlockedInput = (text) => {
        const norm = normalizeText(text);
        const words = norm.split(/\s+/).filter(Boolean);
        // If every meaningful word is blocked, reject
        const meaningful = words.filter(w => w.length > 1);
        if (meaningful.length === 0) return true;
        return meaningful.every(w => BLOCKED_WORDS.has(w));
    };

    const isValidLocation = (text) => {
        const norm = normalizeText(text);
        if (norm.length < 2 || norm.length > 60) return false;
        return ALL_LOCATIONS.some(loc => {
            if (loc.includes(norm) || norm.includes(loc)) return true;
            return fuzzySearch(loc, norm) && norm.length >= 3;
        });
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

    // --- CEREBRO LOCAL AVANZADO V6 (Contextual & Inteligente) ---
    const callLocalBrain = async (userText, currentMessages) => {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        const text = normalizeText(userText);
        const rawText = String(userText || '').trim();
        const qty = parseQuantity(text);
        const topic = topicRef.current;

        if (topic && Date.now() - (topic.ts || 0) > 300000) topicRef.current = null;
        const setTopic = (t) => { topicRef.current = { ...t, ts: Date.now() }; };
        const clearTopic = () => { topicRef.current = null; };

        // --- Mensajes muy cortos ---
        if (text.length <= 1) {
            if (topicRef.current) return { text: "No entendí bien, ¿podés escribir un poco más?" };
            return { text: "Te leí, pero me falta info 😊. ¿Qué estás buscando? (ej: 'auriculares', 'zapatillas', 'envío', 'pagos')" };
        }

        // --- Filtro de groserías/sinsentido ---
        if (isBlockedInput(userText)) {
            return { text: "No entendí eso 😅. ¿En qué puedo ayudarte? Podés preguntarme por productos, envío, pagos o cupones." };
        }

        // --- Agradecimiento / Despedida ---
        if (text.match(/\b(gracias|gracia|muchas gracias|thx|thanks)\b/) && text.length < 40) {
            clearTopic();
            return { text: "¡De nada! Si necesitás algo más, acá estoy 😊" };
        }
        if (text.match(/\b(chau|adios|bye|nos vemos|hasta luego)\b/) && text.length < 30) {
            clearTopic();
            return { text: "¡Hasta la próxima! 👋 Cuando quieras, estoy acá." };
        }

        // --- Saludos (limpian el tema) ---
        if (text.match(/\b(hola|holas|buen dia|buenos dias|buenas tardes|buenas noches|buenas|hello|hi|hey|que tal|como estas|como va|todo bien)\b/) && text.length < 40) {
            clearTopic();
            return { text: "¡Hola! 👋 ¿Qué querés hacer? Podés pedirme productos, ofertas, cupones, envío, pagos o que agregue algo al carrito." };
        }

        // --- Identidad ---
        if (text.match(/\b(quien sos|que sos|que haces|sos real|sos un bot|asistente)\b/)) {
            const storeName = settings?.storeName ? ` de **${settings.storeName}**` : '';
            return { text: `Soy SustIA${storeName}. Puedo ayudarte a encontrar productos, ver ofertas/cupones y armar el carrito más rápido.` };
        }

        // --- Comandos de Sistema ---
        if (controlPanel) {
            if (text.match(/modo\s*(?:oscuro|noche|dark)/)) { controlPanel.setDarkMode(true); return { text: "He activado el modo oscuro 🌙" }; }
            if (text.match(/modo\s*(?:claro|dia|light)/)) { controlPanel.setDarkMode(false); return { text: "He activado el modo claro ☀️" }; }
            if (text.match(/(?:ver|abrir|ir al)\s*(?:carrito|bolsa|cesta)/)) { controlPanel.openCart(); return { text: "Abriendo tu carrito 🛒" }; }
        }

        // === DETECCIÓN DE INTENTS EXPLÍCITOS ===
        const hasShippingKw = !!text.match(/\b(envio|envios|entrega|delivery|domicilio|retiro|retirar|pickup|como llega|cuando llega|hacen envios|mandan)\b/);
        const hasPaymentKw = !!text.match(/\b(pago|pagos|tarjeta|mercado\s*pago|transferencia|cbu|alias|efectivo|como pago|formas? de pago|metodos? de pago)\b/);
        const hasCouponKw = !!text.match(/\b(cupon|cupones|codigo)\b/);
        const hasOffersKw = !!text.match(/\b(descuento|descuentos|promo|promos|oferta|ofertas|rebaja|rebajas)\b/);
        const hasCategoryKw = !!text.match(/\b(categorias|categoria|rubros|rubro|secciones)\b/);
        const hasHelpKw = !!text.match(/\b(ayuda|soporte|contacto|human|persona|asesor|whatsapp)\b/);
        const hasAboutKw = !!text.match(/\b(quienes somos|about)\b/) || (!!text.match(/\b(sobre|informacion)\b/) && !text.match(/\bsobre\s+(un|el|la|este|esta|ese|esa|esto)\b/));
        const hasExplicitIntent = hasShippingKw || hasPaymentKw || hasCouponKw || hasOffersKw || hasCategoryKw || hasHelpKw || hasAboutKw;

        // === FOLLOW-UPS CONTEXTUALES ===
        if (topicRef.current && !hasExplicitIntent) {
            const t = topicRef.current;
            const isYes = !!text.match(/\b(si|sip|sep|claro|dale|bueno|yes|por favor|obvio|ok|sale|va|vamos|manda|quiero|mostrame|show)\b/);
            const isNo = !!text.match(/\b(no|nah|paso|cancelar|nada|asi esta bien|despues|luego|no gracias|esta bien asi)\b/);

            // --- Envío: el bot pidió ciudad/zona ---
            if (t.action === 'asked_location') {
                const loc = rawText;
                // Validate: must look like a real Argentine location
                if (!isValidLocation(loc)) {
                    // Don't clear topic — let them retry
                    return { text: "No reconozco esa ubicación 🤔. Decime tu ciudad o provincia de Argentina (ej: *Córdoba*, *Rosario*, *CABA*, *Mar del Plata*)." };
                }
                clearTopic();
                const { deliveryEnabled, pickupEnabled, deliveryFee, freeAbove, pickupAddress } = t.data || {};
                const pickupNorm = normalizeText(pickupAddress);
                const locNorm = normalizeText(loc);
                const sameZone = pickupNorm && (pickupNorm.includes(locNorm) || locNorm.includes((pickupNorm.split(',')[0] || '').trim()));
                const lines = [`📍 Para **${loc}**:`];
                if (pickupEnabled && sameZone) {
                    lines.push(`✅ Podés retirar en nuestro local: **${pickupAddress}**.`);
                } else if (pickupEnabled) {
                    lines.push(`🏪 Tenemos retiro en local en **${pickupAddress || 'dirección a coordinar'}**, pero queda en otra zona.`);
                }
                if (deliveryEnabled) {
                    const feeText = deliveryFee > 0 ? `$${deliveryFee.toLocaleString()}` : 'sin costo';
                    lines.push(`🚚 Hacemos envíos a domicilio (${feeText}${freeAbove > 0 ? `, gratis superando $${freeAbove.toLocaleString()}` : ''}).`);
                    lines.push(`Para confirmar costo exacto a ${loc}, avanzá al checkout o consultanos.`);
                }
                if (!pickupEnabled && !deliveryEnabled) {
                    lines.push('Todavía no tenemos envío configurado. Consultanos para coordinar.');
                }
                if (settings?.whatsappLink) lines.push(`\n[WSP_BUTTON]`);
                lines.push('\n¿Necesitás algo más? Puedo mostrarte productos, ofertas o medios de pago.');
                return { text: lines.join('\n') };
            }

            // --- Productos mostrados: referencia, compra, refinamiento ---
            if (t.action === 'showed_products' && Array.isArray(t.shownProducts) && t.shownProducts.length > 0) {
                const shown = t.shownProducts;

                // Detectar referencia ordinal
                const ordinals = [
                    { p: /\b(primero|primer|1ro|1ero|1°)\b/, i: 0 },
                    { p: /\b(segundo|2do|2°)\b/, i: 1 },
                    { p: /\b(tercero|tercer|3ro|3ero|3°)\b/, i: 2 },
                    { p: /\b(cuarto|4to|4°)\b/, i: 3 },
                    { p: /\b(ultimo|quinto|5to|5°)\b/, i: shown.length - 1 },
                ];
                let refProd = null;
                for (const o of ordinals) { if (text.match(o.p) && shown[o.i]) { refProd = shown[o.i]; break; } }
                if (!refProd && text.match(/\b(ese|este|eso|esto)\b/)) refProd = shown[0];
                if (!refProd) {
                    const numRef = text.match(/\b(?:el|la|n[uú]mero)\s*(\d)\b/);
                    if (numRef && shown[parseInt(numRef[1], 10) - 1]) refProd = shown[parseInt(numRef[1], 10) - 1];
                }
                if (!refProd && text.length > 3) {
                    refProd = shown.find(p => {
                        const pn = normalizeText(p.name);
                        return pn.includes(text) || text.includes(pn.split(' ')[0]);
                    });
                }

                // Intent de compra
                const isBuyIntent = !!text.match(/\b(agrega|agregar|agregame|agregalo|sum[aá]|sumale|pone|poner|met[eé]|comprar|compralo|quiero|dame|llevo|lo quiero|al carrito|sumalo|mandalo)\b/);
                if (isBuyIntent) {
                    const target = refProd || shown[0];
                    addToCart(target, qty);
                    const others = shown.filter(p => p.id !== target.id).slice(0, 3);
                    if (others.length > 0) {
                        setTopic({ action: 'asked_yes_no', subAction: 'cross_sell', data: others, shownProducts: others });
                        return { text: `¡Listo! Agregué **${qty}x ${target.name}** al carrito 🛒\n\n¿Querés ver algo más para complementar?`, products: [target] };
                    }
                    clearTopic();
                    return { text: `¡Listo! Agregué **${qty}x ${target.name}** al carrito 🛒 ¿Algo más?`, products: [target] };
                }

                // Más info sobre un producto referenciado
                if (refProd && text.match(/\b(info|detalle|detalles|especif|descrip|cuenta|contame|mas sobre)\b/)) {
                    const p = refProd;
                    const price = getProductFinalPrice(p);
                    const cats = getProductCategories(p);
                    const lines = [`📦 **${p.name}**`, `💰 $${Math.round(price).toLocaleString()}${(p.discount || 0) > 0 ? ` (${p.discount}% OFF)` : ''}`];
                    if (p.description) lines.push(`📝 ${String(p.description).slice(0, 200)}`);
                    if (cats.length > 0) lines.push(`🏷️ ${cats.join(', ')}`);
                    lines.push(`📊 Stock: ${p.stock || 0} unidades`);
                    lines.push(`\n¿Lo agregamos al carrito?`);
                    setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: p, shownProducts: shown });
                    return { text: lines.join('\n'), products: [p] };
                }

                // Si referenció un producto sin intent claro, preguntar
                if (refProd) {
                    const p = refProd;
                    const price = getProductFinalPrice(p);
                    setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: p, shownProducts: shown });
                    return { text: `**${p.name}** — $${Math.round(price).toLocaleString()}${(p.discount || 0) > 0 ? ` (${p.discount}% OFF)` : ''}\n\n¿Lo agrego al carrito?`, products: [p] };
                }

                // "más barato" / "más caro"
                if (text.match(/\b(barato|economico|baratos|economicos|menor precio)\b/)) {
                    const cheaper = [...shown].sort((a, b) => getProductFinalPrice(a) - getProductFinalPrice(b));
                    setTopic({ action: 'showed_products', shownProducts: cheaper, searchKeywords: t.searchKeywords });
                    return { text: "Ordenados de más económico a más caro:", products: cheaper };
                }
                if (text.match(/\b(caro|caros|premium|mejor calidad|top|mejor)\b/)) {
                    const pricier = [...shown].sort((a, b) => getProductFinalPrice(b) - getProductFinalPrice(a));
                    setTopic({ action: 'showed_products', shownProducts: pricier, searchKeywords: t.searchKeywords });
                    return { text: "Las opciones de mayor precio/calidad:", products: pricier };
                }

                // "otro", "más opciones"
                if (text.match(/\b(otro|otros|otras|mas opciones|ver mas|siguiente|siguientes|que mas hay|hay mas)\b/)) {
                    const shownIds = new Set(shown.map(p => p.id));
                    let more = safeProducts.filter(p => !shownIds.has(p.id) && (Number(p.stock) || 0) > 0 && p.isActive !== false);
                    if (Array.isArray(t.searchKeywords) && t.searchKeywords.length > 0) {
                        const filtered = more.filter(p => {
                            const pn = normalizeText(p.name);
                            return t.searchKeywords.some(k => pn.includes(k) || fuzzySearch(pn, k));
                        });
                        if (filtered.length > 0) more = filtered;
                    }
                    const moreSlice = more.slice(0, 5);
                    if (moreSlice.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: moreSlice, searchKeywords: t.searchKeywords });
                        return { text: "Más opciones:", products: moreSlice };
                    }
                    return { text: "No tengo más opciones con ese criterio. ¿Querés buscar otra cosa?" };
                }
            }

            // --- Sí/No genérico ---
            if (t.action === 'asked_yes_no') {
                if (isYes) {
                    clearTopic();
                    if (t.subAction === 'cross_sell' && Array.isArray(t.data)) {
                        return { text: "¡Mirá estas opciones! 🔥", products: t.data };
                    }
                    if (t.subAction === 'show_deals' && Array.isArray(t.data)) {
                        return { text: "Las mejores ofertas ahora mismo:", products: t.data };
                    }
                    if (t.subAction === 'add_product' && t.data) {
                        addToCart(t.data, qty);
                        return { text: `¡Listo! Agregué **${qty}x ${t.data.name}** al carrito 🛒 ¿Algo más?`, products: [t.data] };
                    }
                }
                if (isNo) {
                    clearTopic();
                    return { text: "Perfecto. ¿Necesitás algo más? 😊" };
                }
            }

            // --- Categoría: el bot pidió que elija una ---
            if (t.action === 'asked_category') {
                const allCats = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...safeProducts.flatMap(p => getProductCategories(p))])];
                const matchedCat = allCats.find(c => fuzzySearch(normalizeText(c), text) || fuzzySearch(text, normalizeText(c)));
                if (matchedCat) {
                    const catProds = safeProducts
                        .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false && getProductCategories(p).some(c => c.toLowerCase() === matchedCat.toLowerCase()))
                        .slice(0, 5);
                    if (catProds.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: catProds, searchKeywords: [] });
                        return { text: `Productos en **${matchedCat}**:`, products: catProds };
                    }
                    return { text: `No hay productos disponibles en "${matchedCat}" ahora. ¿Buscamos otra categoría?` };
                }
            }
        }

        // === HANDLERS DE INTENTS EXPLÍCITOS ===

        // Categorías
        if (hasCategoryKw) {
            const prodCats = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
            const cats = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...prodCats])]
                .map(c => String(c).trim()).filter(Boolean);
            if (cats.length === 0) return { text: "Todavía no tengo categorías configuradas. Decime qué estás buscando y lo resuelvo igual." };
            setTopic({ action: 'asked_category' });
            return { text: `Tenemos estas categorías:\n\n${cats.slice(0, 10).map(c => `- ${c}`).join('\n')}\n\nDecime cuál te interesa y te muestro opciones.` };
        }

        // Sobre nosotros
        if (hasAboutKw) {
            const about = settings?.aboutUsText || '';
            if (about.trim()) return { text: about.trim() };
            return { text: "Esta tienda todavía no cargó su sección \u201cSobre nosotros\u201d. ¿Querés que te ayude a encontrar un producto?" };
        }

        // Envío
        if (hasShippingKw) {
            const deliveryEnabled = !!settings?.shippingDelivery?.enabled;
            const pickupEnabled = !!settings?.shippingPickup?.enabled;
            const deliveryFee = Number(settings?.shippingDelivery?.fee) || 0;
            const freeAbove = Number(settings?.shippingDelivery?.freeAbove) || 0;
            const pickupAddress = settings?.shippingPickup?.address || '';
            const lines = [];
            if (pickupEnabled) lines.push(`📍 Retiro en local: ${pickupAddress ? `**${pickupAddress}**` : 'a coordinar'}.`);
            if (deliveryEnabled) {
                if (freeAbove > 0) lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()} (gratis desde $${freeAbove.toLocaleString()}).`);
                else lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()}.`);
            }
            if (!pickupEnabled && !deliveryEnabled) lines.push("Todavía no tengo configurado el método de entrega.");
            lines.push("Si me decís tu ciudad/zona, te digo lo mejor para vos.");
            setTopic({ action: 'asked_location', data: { deliveryEnabled, pickupEnabled, deliveryFee, freeAbove, pickupAddress } });
            return { text: lines.join('\n') };
        }

        // Pagos
        if (hasPaymentKw) {
            const hasCard = !!settings?.paymentMercadoPago?.enabled;
            const hasTransfer = !!settings?.paymentTransfer?.enabled;
            const hasCash = !!settings?.paymentCash && !!settings?.shippingPickup?.enabled;
            const wantsTransferData = hasTransfer && text.match(/\b(alias|cbu|transferencia)\b/);
            const options = [];
            if (hasCard) options.push("💳 Tarjeta (Mercado Pago)");
            if (hasTransfer) options.push("🏦 Transferencia");
            if (hasCash) options.push("💵 Efectivo (solo retiro en local)");
            if (options.length === 0) return { text: "Todavía no tengo métodos de pago configurados." };
            if (wantsTransferData) {
                const holderName = settings?.paymentTransfer?.holderName ? String(settings.paymentTransfer.holderName).trim() : '';
                const alias = settings?.paymentTransfer?.alias ? String(settings.paymentTransfer.alias).trim() : '';
                const cbu = settings?.paymentTransfer?.cbu ? String(settings.paymentTransfer.cbu).trim() : '';
                const lines = ["Para transferir, usá estos datos:"];
                if (holderName) lines.push(`- Titular: ${holderName}`);
                if (alias) lines.push(`- Alias: ${alias}`);
                if (cbu) lines.push(`- CBU: ${cbu}`);
                if (!holderName && !alias && !cbu) lines.push("- Aún no están cargados los datos.");
                return { text: lines.join('\n') };
            }
            return { text: `Podés pagar con:\n\n${options.map(o => `- ${o}`).join('\n')}\n\n¿Con cuál preferís?` };
        }

        // Ayuda/Contacto
        if (hasHelpKw) {
            if (settings?.whatsappLink) return { text: `Claro. Si necesitas asistencia personalizada 🧑‍💻, escribinos por WhatsApp 📲\n\n[WSP_BUTTON]` };
            return { text: "Estoy diseñado para ayudarte las 24hs 🤖. ¿Buscás algo en específico?" };
        }

        // Ofertas / Productos con descuento
        if (hasOffersKw) {
            const deals = safeProducts.filter(p => (Number(p?.discount) || 0) > 0 && (Number(p?.stock) || 0) > 0 && p?.isActive !== false);
            if (deals.length > 0) {
                const topDeals = deals.sort(() => 0.5 - Math.random()).slice(0, 5);
                setTopic({ action: 'showed_products', shownProducts: topDeals, searchKeywords: [] });
                return { text: `Las mejores ofertas ahora mismo:`, products: topDeals };
            }
            return { text: "No tengo productos en oferta por ahora, pero nuestros precios son los mejores 😉 ¿Querés ver alguna categoría?" };
        }

        // Cupones (códigos de descuento)
        if (hasCouponKw) {
            const activeCoupons = safeCoupons.filter(c => {
                if (!c?.code) return false;
                const isNotExpired = !c.expirationDate || new Date(c.expirationDate) > new Date();
                const usedCount = Array.isArray(c.usedBy) ? c.usedBy.length : 0;
                const notExhausted = !c.usageLimit || usedCount < c.usageLimit;
                return isNotExpired && notExhausted;
            });
            if (activeCoupons.length > 0) {
                const couponText = activeCoupons
                    .map(c => `🎫 **${c.code}** (${c.type === 'percentage' ? c.value + '%' : '$' + c.value} OFF)`)
                    .join("\n");
                return { text: `¡Sí! Tenemos estos cupones:\n\n${couponText}\n\n¡Usalos al finalizar tu compra! 🛒` };
            }
            return { text: "No hay cupones activos por ahora. ¿Querés ver nuestras ofertas o productos? 😊" };
        }

        // === BÚSQUEDA DE PRODUCTOS ===
        const isCheaper = text.match(/(?:mas|muy|super)\s*(?:barato|economico|bajo)|mas\s*economico/);
        const isExpensive = text.match(/(?:mas|muy|super)\s*(?:caro|mejor|calidad|top|premium)|costoso|lujo/);
        const isBuying = text.match(/(?:agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|comprar|quiero|dame|carrito|llevo|lo quiero)/);

        let minPrice = 0;
        let maxPrice = Infinity;
        const lessThanMatch = text.match(/(?:menos|menor|bajo)\s*(?:de|a|que)?\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (lessThanMatch) { const p = parseHumanNumber(lessThanMatch[1], text); if (p !== null) maxPrice = p; }
        const betweenMatch = text.match(/entre\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?\s*y\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (betweenMatch) {
            const pMin = parseHumanNumber(betweenMatch[1], text); const pMax = parseHumanNumber(betweenMatch[2], text);
            if (pMin !== null) minPrice = pMin; if (pMax !== null) maxPrice = pMax;
        }

        const availableCategories = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
        const detectedCategoryVal = availableCategories.find(c => fuzzySearch(c, text) || fuzzySearch(text, c));
        const targetCategory = detectedCategoryVal ? detectedCategoryVal.toLowerCase() : null;

        const synonyms = new Map([
            ['celu', 'celular'], ['cel', 'celular'], ['tele', 'televisor'],
            ['tv', 'televisor'], ['compu', 'computadora'], ['notebook', 'laptop'],
            ['auris', 'auriculares'], ['zapas', 'zapatillas'],
            ['remera', 'camiseta'], ['remeras', 'camisetas'],
            ['funda', 'funda'], ['cable', 'cable'], ['cargador', 'cargador'],
            ['protector', 'protector'], ['vidrio', 'vidrio templado']
        ]);
        const keywords = tokenize(text).flatMap(k => { const alt = synonyms.get(k); return alt ? [k, alt] : [k]; });

        if (keywords.length === 0 && !targetCategory && !isCheaper && !isExpensive && !isBuying) {
            const lastResort = safeProducts
                .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .find(p => fuzzySearch(normalizeText(p.name), text));
            if (lastResort) {
                setTopic({ action: 'showed_products', shownProducts: [lastResort], searchKeywords: [text] });
                return { text: `¿Buscás esto?`, products: [lastResort] };
            }
            return { text: "¿Me decís qué producto o categoría querés ver? También podés preguntar por envío, pagos o cupones." };
        }

        let candidates = safeProducts.filter(p => (Number(p?.stock) || 0) > 0 && p?.isActive !== false);
        candidates = candidates.filter(p => { const fp = getProductFinalPrice(p); return fp >= minPrice && fp <= maxPrice; });
        if (targetCategory) candidates = candidates.filter(p => getProductCategories(p).some(c => c.toLowerCase() === targetCategory));

        const scores = candidates.map(p => {
            let score = 0;
            const pName = normalizeText(p.name);
            const pDesc = normalizeText(p.description);
            keywords.forEach(k => {
                if (pName.includes(k)) score += 10;
                else if (fuzzySearch(pName, k)) score += 5;
                if (pDesc.includes(k)) score += 2;
            });
            if (targetCategory && !keywords.length) score += 5;
            if (p.isFeatured) score += 5;
            if (p.discount > 0) score += 3;
            if (isCheaper) score += (1 / (getProductFinalPrice(p) || 1)) * 10000;
            if (isExpensive) score += getProductFinalPrice(p) / 100;
            return { product: p, score };
        });

        const sorted = scores.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
        const topMatches = sorted.slice(0, 5).map(s => s.product);

        if (topMatches.length === 0) {
            const allDeals = safeProducts.filter(p => (Number(p.discount) || 0) > 0 && (Number(p.stock) || 0) > 0).slice(0, 3);
            if (allDeals.length > 0) {
                setTopic({ action: 'showed_products', shownProducts: allDeals, searchKeywords: keywords });
                return { text: "No encontré eso exactamente, pero mirá estas opciones con descuento:", products: allDeals };
            }
            return { text: "No encontré lo que buscás. Probá con otra palabra o preguntame por categorías 🔎" };
        }

        if (isBuying && topMatches.length > 0) {
            const best = topMatches[0];
            addToCart(best, qty);
            const suggestions = safeProducts
                .filter(p => p.id !== best.id && (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .sort(() => 0.5 - Math.random()).slice(0, 3);
            if (suggestions.length > 0) {
                setTopic({ action: 'asked_yes_no', subAction: 'cross_sell', data: suggestions, shownProducts: suggestions });
                return { text: `¡Listo! Agregué **${qty}x ${best.name}** al carrito 🛒\n\n¿Querés ver algo para complementar? 👀`, products: [best] };
            }
            clearTopic();
            return { text: `¡Listo! Agregué **${qty}x ${best.name}** al carrito 🛒 ¿Algo más?`, products: [best] };
        }

        setTopic({ action: 'showed_products', shownProducts: topMatches, searchKeywords: keywords });
        let msg = "Encontré estas opciones. ¿Querés que te muestre más o me decís un presupuesto?";
        if (targetCategory) msg = `Encontré esto en **${detectedCategoryVal}**:`;
        if (isCheaper) msg = "Las opciones más económicas:";
        if (topMatches.length === 1) msg = "Encontré esto para vos:";

        return { text: msg, products: topMatches };
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

            setMessages(prev => [...prev, {
                role: 'model',
                text: finalText,
                products: safeProducts
            }]);
        } catch (e) {
            if (!isMountedRef.current) return;
            const fallback = settings?.whatsappLink
                ? `Uy, se me trabó por un momento. Si querés, hablá por WhatsApp:\n\n[WSP_BUTTON]`
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
        topicRef.current = null;
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
        <div data-testid="sustia-root" className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
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

                    <div className={`px-4 py-2 border-b ${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {quickActions.map(a => (
                                <button
                                    key={a.label}
                                    type="button"
                                    data-testid={`quick-action-${a.label.toLowerCase()}`}
                                    onClick={() => {
                                        handleQuickAction(a.value);
                                    }}
                                    className={
                                        isDarkMode
                                            ? "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-white/10 bg-[#1a1a1a] text-white hover:bg-[#222] transition"
                                            : "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition"
                                    }
                                >
                                    <span className={isDarkMode ? "text-white" : "text-slate-800"}>{a.label}</span>
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
                                    {m.text && m.text.includes('[WSP_BUTTON]') ? (
                                        <>
                                            {m.text.split('[WSP_BUTTON]').map((part, idx, arr) => (
                                                <React.Fragment key={idx}>
                                                    {part && <p className="whitespace-pre-wrap">{part}</p>}
                                                    {idx < arr.length - 1 && settings?.whatsappLink && (
                                                        <a
                                                            href={settings.whatsappLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 mt-2 mb-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-full transition shadow-lg shadow-green-900/30"
                                                        >
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                            Ir a WhatsApp
                                                        </a>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{m.text}</p>
                                    )}
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
                data-testid="sustia-launcher"
                aria-label={isOpen ? 'Cerrar chat de SustIA' : 'Abrir chat de SustIA'}
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
