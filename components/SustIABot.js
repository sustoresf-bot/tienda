import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Trash2, Plus } from 'lucide-react';

const WhatsAppIcon = ({ className = '' }) => (
    <svg viewBox="0 0 448 512" className={className} fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-221.7 99.3-221.7 221.7 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 69 27 106.1 27h.1c122.3 0 221.7-99.3 221.7-221.7 0-59.3-23.1-115-64.7-157.3zM223.9 438.7h-.1c-33.1 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68-4.3-7c-18.5-29.4-28.2-63.4-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54 81.2 54 130.4-.1 101.8-82.9 184.6-184.5 184.6zm101.1-138.2c-5.5-2.8-32.8-16.1-37.9-17.9-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 17.9-17.5 21.6-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.7 35.2 15.2 49 16.5 66.6 14 10.7-1.6 32.8-13.4 37.4-26.3 4.6-12.9 4.6-23.9 3.2-26.3-1.3-2.4-5-3.7-10.5-6.5z" />
    </svg>
);

const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = [];
    let key = 0;
    const regex = /(\*\*(.+?)\*\*|~~(.+?)~~|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        if (match[2]) {
            parts.push(<strong key={key++}>{match[2]}</strong>);
        } else if (match[3]) {
            parts.push(<s key={key++}>{match[3]}</s>);
        } else if (match[4]) {
            parts.push(<em key={key++}>{match[4]}</em>);
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
};

const BotProductCard = ({ product, onAdd, accentColor, idx = 0 }) => {
    const [qty, setQty] = useState(1);
    const basePrice = Number(product.basePrice) || 0;
    const finalPrice = basePrice * (1 - (Number(product.discount) || 0) / 100);
    const color = accentColor || '#f97316';

    return (
        <div className="sustia-card-anim min-w-[200px] max-w-[200px] bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden flex flex-col group snap-center hover:border-white/15 transition-all duration-300 hover:-translate-y-1" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="relative aspect-square bg-white/95 p-2 overflow-hidden rounded-t-2xl">
                <img src={product.image || 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 200 200%27%3E%3Crect fill=%27%23e2e8f0%27 width=%27200%27 height=%27200%27/%3E%3Ctext x=%27100%27 y=%27105%27 text-anchor=%27middle%27 fill=%27%2394a3b8%27 font-size=%2714%27%3ESin imagen%3C/text%3E%3C/svg%3E'} className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition duration-500" alt={product.name || 'Producto'} loading="lazy" />
                {product.discount > 0 && (
                    <div className="absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg" style={{ backgroundColor: color }}>
                        -{product.discount}%
                    </div>
                )}
            </div>
            <div className="p-3 flex-1 flex flex-col">
                <h4 className="text-white font-bold text-xs line-clamp-2 mb-2 leading-tight h-8">{product.name}</h4>
                <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-black text-sm" style={{ color }}>${Math.round(finalPrice).toLocaleString()}</span>
                        {product.discount > 0 && (
                            <span className="text-slate-500 text-[10px] line-through">${basePrice.toLocaleString()}</span>
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
                            className="flex-1 text-white py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 shadow-lg hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: color, boxShadow: `0 4px 12px ${color}33` }}
                        >
                            <Plus className="w-3 h-3" /> AGREGAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SustIABot = React.memo(({ settings, products, addToCart, controlPanel, coupons, appId, hasFloatingWhatsapp = false }) => {
    // 1. Verificación de Plan - Solo disponible en Plan Premium
    const forceEnabled = (() => {
        try {
            const href = String(window.location.href || '');
            if (href.includes('sustia=1')) return true;
            return new URLSearchParams(window.location.search).get('sustia') === '1';
        } catch { return false; }
    })();
    const isEnabled = forceEnabled || settings?.subscriptionPlan === 'premium';

    const [isOpen, setIsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // --- Color dinámico de la tienda ---
    const rawPrimary = settings?.primaryColor || '#f97316';
    const primaryColor = (() => {
        const s = String(rawPrimary).trim();
        if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
        if (/^#[0-9a-fA-F]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
        if (/^#[0-9a-fA-F]{8}$/.test(s)) return s.slice(0, 7);
        return '#f97316';
    })();
    const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };
    const primaryDark = (() => {
        const [r, g, b] = hexToRgb(primaryColor);
        return `#${Math.max(0, r - 30).toString(16).padStart(2,'0')}${Math.max(0, g - 30).toString(16).padStart(2,'0')}${Math.max(0, b - 30).toString(16).padStart(2,'0')}`;
    })();
    const pc = (opacity = 1) => {
        const [r, g, b] = hexToRgb(primaryColor);
        return `rgba(${r},${g},${b},${opacity})`;
    };

    // --- Inyectar animaciones CSS una sola vez ---
    useEffect(() => {
        const id = 'sustia-bot-animations';
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            @keyframes sustia-slide-up { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes sustia-slide-down { from { opacity:1; transform:translateY(0) scale(1); } to { opacity:0; transform:translateY(20px) scale(0.95); } }
            @keyframes sustia-msg-in-left { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
            @keyframes sustia-msg-in-right { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
            @keyframes sustia-card-in { from { opacity:0; transform:translateY(12px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
            @keyframes sustia-pulse-ring { 0% { transform:scale(1); opacity:0.6; } 50% { transform:scale(1.15); opacity:0.3; } 100% { transform:scale(1); opacity:0.6; } }
            @keyframes sustia-bounce-dot { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-6px); } }
            @keyframes sustia-fab-entrance { from { transform:scale(0) rotate(-180deg); opacity:0; } to { transform:scale(1) rotate(0deg); opacity:1; } }
            .sustia-chat-open { animation: sustia-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
            .sustia-msg-bot { animation: sustia-msg-in-left 0.3s ease-out forwards; }
            .sustia-msg-user { animation: sustia-msg-in-right 0.3s ease-out forwards; }
            .sustia-card-anim { animation: sustia-card-in 0.35s ease-out both; }
            .sustia-dot { animation: sustia-bounce-dot 1.2s ease-in-out infinite; }
            .sustia-fab { animation: sustia-fab-entrance 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
            .sustia-pulse-ring { animation: sustia-pulse-ring 2s ease-in-out infinite; }
            .sustia-quick-btn { transition: all 0.2s ease; }
            .sustia-quick-btn:hover { transform: translateY(-1px); }
            .sustia-quick-btn:active { transform: translateY(0) scale(0.97); }
        `;
        document.head.appendChild(style);
    }, []);

    // Custom Bot Image (Configurable)
    const rawBotImage = String(settings?.botImage || '').trim();
    const botImage = rawBotImage && !/sustia-ai-v2\.jpg$/i.test(rawBotImage) ? rawBotImage : 'sustia-ai.jpg';

    const chatStorageKey = `sustore_sustia_chat_${appId}`;
    const storeName = settings?.storeName || '';
    const defaultBotMessage = { role: 'model', text: `¡Hola! Soy tu asistente virtual${storeName ? ` de **${storeName}**` : ''} 🤖. ¿Buscás algo especial hoy? Puedo mostrarte productos, ofertas, cupones, y ayudarte con envío y pagos.` };
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
        const m3 = text.match(/\b(?:agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|quiero|llevo|comprar)\s+(\d{1,2})\b/);
        if (m3) return Math.max(1, Math.min(99, parseInt(m3[1], 10)));
        const m4 = text.match(/\b(\d{1,2})\s+(?:agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|quiero|llevo|comprar)\b/);
        if (m4) return Math.max(1, Math.min(99, parseInt(m4[1], 10)));
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
        'soldati', 'villa lugano', 'villa riachuelo', 'parque avellaneda',
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
        'villa gesell', 'miramar', 'tres arroyos', 'azul', 'bragado',
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

    // --- DISTANCIA DE LEVENSHTEIN (tolerancia a typos) ---
    const levenshtein = (a, b) => {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        // Optimización: si la diferencia de longitud ya es mayor al umbral, no calcular
        if (Math.abs(a.length - b.length) > 3) return Math.abs(a.length - b.length);
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = b[i - 1] === a[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,     // eliminación
                    matrix[i][j - 1] + 1,     // inserción
                    matrix[i - 1][j - 1] + cost // sustitución
                );
            }
        }
        return matrix[b.length][a.length];
    };

    // --- HERRAMIENTA DE BÚSQUEDA INTELIGENTE (FUZZY AVANZADO) ---
    const fuzzySearch = (text, query) => {
        if (!query || typeof query !== 'string') return false;
        if (!text || typeof text !== 'string') return false;

        const str = normalizeText(text);
        const patt = normalizeText(query);

        if (!str || !patt) return false;

        // 1. Coincidencia exacta parcial (substring)
        if (str.includes(patt)) return true;
        if (patt.includes(str) && str.length >= 3) return true;

        // 2. Prefijo: "auric" matchea "auriculares"
        const strWords = str.split(/\s+/);
        const pattWords = patt.split(/\s+/);
        for (const pw of pattWords) {
            if (pw.length < 3) continue;
            for (const sw of strWords) {
                if (sw.length < 3) continue;
                if (sw.startsWith(pw) || pw.startsWith(sw)) return true;
            }
        }

        // 3. Levenshtein por palabra: tolerar 1-2 errores según largo
        for (const pw of pattWords) {
            if (pw.length < 3) continue;
            const maxDist = pw.length <= 4 ? 1 : pw.length <= 7 ? 2 : 3;
            for (const sw of strWords) {
                if (Math.abs(sw.length - pw.length) > maxDist) continue;
                if (levenshtein(pw, sw) <= maxDist) return true;
            }
        }

        // 4. Sin espacios: "auricularesbluetooth" → buscar si alguna combinación de palabras del producto está dentro
        const pattNoSpaces = patt.replace(/\s+/g, '');
        const strNoSpaces = str.replace(/\s+/g, '');
        if (pattNoSpaces.length >= 5 && (strNoSpaces.includes(pattNoSpaces) || pattNoSpaces.includes(strNoSpaces))) return true;

        // 5. Cada palabra del query aparece como substring en el texto completo
        if (pattWords.length > 1 && pattWords.every(pw => pw.length < 3 || str.includes(pw) || strWords.some(sw => levenshtein(pw, sw) <= (pw.length <= 4 ? 1 : 2)))) {
            return true;
        }

        // 6. Fallback: coincidencia de caracteres en orden (>75%)
        let matches = 0;
        let lastIndex = -1;
        for (const char of patt) {
            const index = str.indexOf(char, lastIndex + 1);
            if (index > -1) {
                matches++;
                lastIndex = index;
            }
        }
        return patt.length >= 4 && (matches / patt.length) > 0.8;
    };

    // --- Puntaje de similitud para ranking (0-100) ---
    const similarityScore = (text, query) => {
        if (!text || !query) return 0;
        const str = normalizeText(text);
        const patt = normalizeText(query);
        if (!str || !patt) return 0;

        // Exacto
        if (str === patt) return 100;
        if (str.includes(patt)) return 90;

        const strWords = str.split(/\s+/);
        const pattWords = patt.split(/\s+/);

        let totalScore = 0;
        let matchedWords = 0;

        for (const pw of pattWords) {
            if (pw.length < 2) continue;
            let bestWordScore = 0;
            for (const sw of strWords) {
                if (sw.length < 2) continue;
                if (sw === pw) { bestWordScore = Math.max(bestWordScore, 100); continue; }
                if (sw.length >= 3 && pw.length >= 3 && (sw.startsWith(pw) || pw.startsWith(sw))) { bestWordScore = Math.max(bestWordScore, 80); continue; }
                if (sw.length >= 3 && pw.length >= 3 && (sw.includes(pw) || pw.includes(sw))) { bestWordScore = Math.max(bestWordScore, 70); continue; }
                const maxDist = pw.length <= 4 ? 1 : pw.length <= 7 ? 2 : 3;
                const dist = levenshtein(pw, sw);
                if (dist <= maxDist) {
                    bestWordScore = Math.max(bestWordScore, Math.round(70 * (1 - dist / maxDist)));
                }
            }
            if (bestWordScore > 0) matchedWords++;
            totalScore += bestWordScore;
        }

        if (pattWords.length === 0) return 0;
        const avgScore = totalScore / pattWords.length;
        // Bonus si todas las palabras matchearon
        if (matchedWords === pattWords.length) return Math.min(95, avgScore + 10);
        return Math.round(avgScore * (matchedWords / pattWords.length));
    };

    // --- HELPERS DE VENTA ---
    const getRelatedProducts = (product, excludeIds, limit = 3) => {
        const excl = new Set(Array.isArray(excludeIds) ? excludeIds : []);
        excl.add(product.id);
        const prodCats = getProductCategories(product).map(c => c.toLowerCase());
        const available = safeProducts.filter(p => !excl.has(p.id) && (Number(p.stock) || 0) > 0 && p.isActive !== false);
        // Prioridad 1: misma categoría
        const sameCat = available.filter(p => getProductCategories(p).some(c => prodCats.includes(c.toLowerCase())));
        if (sameCat.length >= limit) return sameCat.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || (Number(b.discount) || 0) - (Number(a.discount) || 0)).slice(0, limit);
        // Prioridad 2: precio similar (±40%)
        const price = getProductFinalPrice(product);
        const similarPrice = available.filter(p => {
            const fp = getProductFinalPrice(p);
            return fp >= price * 0.6 && fp <= price * 1.4 && !sameCat.includes(p);
        });
        return [...sameCat, ...similarPrice].slice(0, limit);
    };

    const buildStockHint = (product) => {
        const stock = Number(product?.stock) || 0;
        if (stock <= 0) return '❌ Sin stock';
        if (stock <= 3) return `🔥 ¡Últimas ${stock} unidades!`;
        if (stock <= 10) return `⚡ Quedan pocas unidades`;
        return '';
    };

    const buildProductPresentation = (p, opts = {}) => {
        const price = getProductFinalPrice(p);
        const cats = getProductCategories(p);
        const lines = [`📦 **${p.name}**`];
        const priceStr = `💰 **$${Math.round(price).toLocaleString()}**`;
        if ((p.discount || 0) > 0) {
            lines.push(`${priceStr} ~~$${(Number(p.basePrice) || 0).toLocaleString()}~~ (${p.discount}% OFF 🔥)`);
        } else {
            lines.push(priceStr);
        }
        if (p.description && opts.showDesc !== false) lines.push(`📝 ${String(p.description).slice(0, 200)}`);
        if (cats.length > 0) lines.push(`🏷️ ${cats.join(', ')}`);
        const stockHint = buildStockHint(p);
        if (stockHint) lines.push(stockHint);
        else lines.push(`📊 Stock: ${p.stock || 0} unidades`);
        return lines;
    };

    const getAvailableCategories = () => {
        return [...new Set(safeProducts.filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false).flatMap(p => getProductCategories(p)))];
    };

    const sName = () => settings?.storeName || 'nuestra tienda';

    // --- CEREBRO LOCAL V7 (Vendedor Experto) ---
    const callLocalBrain = async (userText, currentMessages) => {
        await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 400));
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
            const catExamples = getAvailableCategories().slice(0, 2);
            const hint = catExamples.length > 0
                ? `Podés preguntarme por ${catExamples.map(c => `*${c}*`).join(', ')}, envío o pagos.`
                : 'Podés preguntarme por productos, envío, pagos o cupones.';
            return { text: `Te leí, pero me falta info 😊. ¿Qué estás buscando? ${hint}` };
        }

        // --- Filtro de groserías/sinsentido ---
        if (isBlockedInput(userText)) {
            return { text: "No entendí eso 😅. ¿En qué puedo ayudarte? Preguntame por nuestros productos, envío, pagos o cupones." };
        }

        // --- Preguntas fuera del alcance de la tienda ---
        if (text.match(/\b(clima|el tiempo|que tiempo hace|temperatura|futbol|partido|pelicula|receta|cocina|politica|presidente|elecciones|religion|dios|biblia|horoscopo|signo|chiste|chistes|cancion|musica|noticias|dolares?|cotizacion|bitcoin|crypto|programar|codigo|hack|virus|jugar online|descargar gratis|quien gano|como se hace|capital de|cuantos habitantes|que significa|traducir|traduccion)\b/)
            && !text.match(/\b(producto|precio|stock|envio|pago|comprar|carrito|oferta|cupon|categoria)\b/)) {
            return { text: `Soy el asistente de esta tienda y solo puedo ayudarte con nuestros productos y servicios. ¿Querés que te muestre lo que tenemos?` };
        }

        // --- Agradecimiento / Despedida ---
        if (text.match(/\b(gracias|gracia|muchas gracias|thx|thanks)\b/) && text.length < 40) {
            clearTopic();
            const deals = safeProducts.filter(p => (Number(p.discount) || 0) > 0 && (Number(p.stock) || 0) > 0 && p.isActive !== false);
            if (deals.length > 0) {
                return { text: "¡De nada! 😊 Antes de irte, ¿querés ver nuestras ofertas del momento?" };
            }
            return { text: "¡De nada! Si necesitás algo más, acá estoy 😊" };
        }
        if (text.match(/\b(chau|adios|bye|nos vemos|hasta luego)\b/) && text.length < 30) {
            clearTopic();
            return { text: `¡Gracias por visitar **${sName()}**! 👋 Volvé cuando quieras, estoy acá las 24hs.` };
        }

        // --- Saludos (limpian el tema) ---
        if (text.match(/\b(hola|holas|buen dia|buenos dias|buenas tardes|buenas noches|buenas|hello|hi|hey|que tal|como estas|como va|todo bien)\b/) && text.length < 40) {
            clearTopic();
            const storeLabel = settings?.storeName ? ` a **${settings.storeName}**` : '';
            const catList = getAvailableCategories().slice(0, 3);
            const totalProducts = safeProducts.filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false).length;
            const deals = safeProducts.filter(p => (Number(p.discount) || 0) > 0 && (Number(p.stock) || 0) > 0 && p.isActive !== false).length;
            let greeting = `¡Hola! 👋 Bienvenido/a${storeLabel}.`;
            if (totalProducts > 0) greeting += ` Tenemos **${totalProducts} productos** disponibles`;
            if (catList.length > 0) greeting += ` en ${catList.map(c => `*${c}*`).join(', ')} y más`;
            if (totalProducts > 0) greeting += '.';
            if (deals > 0) greeting += ` 🔥 ¡Hay **${deals} productos en oferta**!`;
            greeting += '\n\n¿Qué estás buscando? Puedo ayudarte con productos, ofertas, cupones, envío o pagos.';
            return { text: greeting };
        }

        // --- Identidad ---
        if (text.match(/\b(quien sos|que sos|que haces|sos real|sos un bot|asistente|como te llamas|tu nombre)\b/)) {
            const catList = getAvailableCategories().slice(0, 3);
            const catHint = catList.length > 0 ? ` Tenemos ${catList.join(', ')} y más.` : '';
            return { text: `Soy el asistente virtual de **${sName()}** 🤖. Estoy acá las 24hs para ayudarte a encontrar lo que necesitás, ver ofertas, cupones, consultar envío y pagos, y armar tu carrito.${catHint}` };
        }

        // --- Comandos de Sistema ---
        if (controlPanel) {
            if (text.match(/modo\s*(?:oscuro|noche|dark)/)) { controlPanel.setDarkMode(true); return { text: "¡Listo! Modo oscuro activado 🌙" }; }
            if (text.match(/modo\s*(?:claro|dia|light)/)) { controlPanel.setDarkMode(false); return { text: "¡Listo! Modo claro activado ☀️" }; }
            if (text.match(/(?:ver|abrir|ir al|mostrar|mostra)\s*(?:carrito|bolsa|cesta|mi compra)/)) { controlPanel.openCart(); return { text: "¡Ahí va! Abriendo tu carrito 🛒" }; }
        }

        // === DETECCIÓN DE INTENTS EXPLÍCITOS ===
        const hasShippingKw = !!text.match(/\b(envio|envios|entrega|delivery|domicilio|retiro|retirar|pickup|como llega|cuando llega|hacen envios|mandan|despacho|despachan|llega a|envian)\b/);
        const hasPaymentKw = !!text.match(/\b(pago|pagos|tarjeta|mercado\s*pago|transferencia|cbu|alias|efectivo|como pago|formas? de pago|metodos? de pago|cuotas|financiacion)\b/);
        const hasCouponKw = !!text.match(/\b(cupon|cupones|descuento\s*code|code)\b/) || !!(text.match(/\bcodigo\b/) && text.match(/\b(descuento|promo|cupon|oferta|aplicar|canjear|usar)\b/));
        const hasOffersKw = !!text.match(/\b(descuento|descuentos|promo|promos|oferta|ofertas|rebaja|rebajas|liquidacion|sale|outlet)\b/);
        const hasCategoryKw = !!text.match(/\b(categorias|categoria|rubros|rubro|secciones|que venden|que tienen)\b/);
        const hasHelpKw = !!text.match(/\b(ayuda|soporte|contacto|human|asesor|whatsapp|humano|hablar con alguien|hablar con una persona|persona real)\b/);
        const hasAboutKw = !!text.match(/\b(quienes somos|about)\b/) || (!!text.match(/\b(sobre|informacion)\b/) && !text.match(/\bsobre\s+(un|el|la|este|esta|ese|esa|esto)\b/));
        const hasPopularKw = !!text.match(/\b(popular|populares|mas vendido|mas vendidos|destacado|destacados|recomendado|recomendados|lo mejor|top ventas|bestseller|tendencia|novedades|nuevo|nuevos|reciente|recientes)\b/);
        const hasStockKw = !!text.match(/\b(stock|hay stock|disponible|disponibilidad|queda|quedan|tienen|tenes)\b/) && !!text.match(/\b(stock|disponib)/);
        const hasPriceKw = !!text.match(/\b(precio|cuanto\s*(?:sale|cuesta|vale|es)|cuanto\s*esta|a cuanto)\b/);
        const hasWarrantyKw = !!text.match(/\b(garantia|devolucion|devoluciones|cambio|cambios|reclamo|defecto|roto|falla)\b/);
        const hasBudgetKw = !!text.match(/\b(tengo|presupuesto|dispongo|gasto|gastar)\s*\$?\s*\d/);
        const hasNegativeFeedback = !!text.match(/\b(no me gusta|no me gusto|feo|feos|fea|feas|no me convence|no me sirve|malo|mala|malos|malas|horrible|espantoso|no me copa|no va|ninguno|ninguna|no quiero nada de eso|nada de eso)\b/);
        const hasExplicitIntent = hasShippingKw || hasPaymentKw || hasCouponKw || hasOffersKw || hasCategoryKw || hasHelpKw || hasAboutKw || hasPopularKw || hasStockKw || hasPriceKw || hasWarrantyKw || hasBudgetKw;

        // === FOLLOW-UPS CONTEXTUALES ===
        if (topicRef.current && !hasExplicitIntent) {
            const t = topicRef.current;
            const isYes = !!text.match(/\b(si|sip|sep|claro|dale|bueno|yes|por favor|obvio|ok|sale|va|vamos|manda|mostrame|show|demas|genial|perfecto)\b/);
            const isNo = !!text.match(/\b(no|nah|paso|cancelar|nada|asi esta bien|despues|luego|no gracias|esta bien asi|listo|ya esta|basta)\b/);
            const resolvedYes = isYes && !(isNo && text.match(/^no\b/));
            const resolvedNo = isNo && !resolvedYes;

            // --- Envío: el bot pidió ciudad/zona ---
            if (t.action === 'asked_location') {
                const loc = rawText;
                if (!isValidLocation(loc)) {
                    return { text: "No reconozco esa ubicación 🤔. Decime tu ciudad o provincia de Argentina (ej: *Córdoba*, *Rosario*, *CABA*, *Mar del Plata*)." };
                }
                clearTopic();
                const { deliveryEnabled, pickupEnabled, deliveryFee, freeAbove, pickupAddress } = t.data || {};
                const pickupNorm = normalizeText(pickupAddress);
                const locNorm = normalizeText(loc);
                const sameZone = pickupNorm && (pickupNorm.includes(locNorm) || locNorm.includes((pickupNorm.split(',')[0] || '').trim()));
                const lines = [`📍 Para **${loc}**:`];
                if (pickupEnabled && sameZone) {
                    lines.push(`✅ Podés retirar en nuestro local: **${pickupAddress}** — ¡sin costo de envío!`);
                } else if (pickupEnabled) {
                    lines.push(`🏪 Tenemos retiro en local en **${pickupAddress || 'dirección a coordinar'}**, pero queda en otra zona.`);
                }
                if (deliveryEnabled) {
                    const feeText = deliveryFee > 0 ? `$${deliveryFee.toLocaleString()}` : '**sin costo**';
                    lines.push(`🚚 Hacemos envíos a domicilio (${feeText}${freeAbove > 0 ? `, gratis superando $${freeAbove.toLocaleString()}` : ''}).`);
                    lines.push(`Para confirmar costo exacto a ${loc}, avanzá al checkout o consultanos.`);
                }
                if (!pickupEnabled && !deliveryEnabled) {
                    lines.push('Todavía no tenemos envío configurado. Consultanos para coordinar.');
                }
                if (settings?.whatsappLink) lines.push(`\n[WSP_BUTTON]`);
                lines.push('\n¿Querés que te muestre productos o necesitás algo más?');
                return { text: lines.join('\n') };
            }

            // --- Productos mostrados: referencia, compra, refinamiento ---
            if (t.action === 'showed_products' && Array.isArray(t.shownProducts) && t.shownProducts.length > 0) {
                const shown = t.shownProducts;

                // Feedback negativo: "no me gusta", "feo", etc.
                if (hasNegativeFeedback) {
                    const shownIds = new Set(shown.map(p => p.id));
                    let alternatives = safeProducts.filter(p => !shownIds.has(p.id) && (Number(p.stock) || 0) > 0 && p.isActive !== false);
                    if (Array.isArray(t.searchKeywords) && t.searchKeywords.length > 0) {
                        const filtered = alternatives.filter(p => {
                            const pn = normalizeText(p.name);
                            return t.searchKeywords.some(k => pn.includes(k) || fuzzySearch(pn, k));
                        });
                        if (filtered.length > 0) alternatives = filtered;
                    }
                    const altSlice = alternatives.slice(0, 5);
                    if (altSlice.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: altSlice, searchKeywords: t.searchKeywords });
                        return { text: "¡Sin problema! Te muestro otras opciones:", products: altSlice };
                    }
                    const cats = getAvailableCategories().slice(0, 4);
                    if (cats.length > 0) {
                        setTopic({ action: 'asked_category' });
                        return { text: `Entiendo. No tengo más opciones con ese criterio, pero podés buscar en otra categoría:\n\n${cats.map(c => `- ${c}`).join('\n')}\n\n¿Cuál te interesa?` };
                    }
                    return { text: "Entiendo. Decime qué tipo de producto buscás y te ayudo a encontrarlo." };
                }

                // Objeción de precio: "es caro", "muy caro"
                if (text.match(/\b(caro|carisimo|carisima|costoso|mucha plata|sale mucho|no me alcanza|no llego|fuera de presupuesto|excede)\b/) && !text.match(/\b(mas caro|el mas caro|lo mas caro)\b/)) {
                    const cheaperAlts = safeProducts
                        .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false && !shown.some(s => s.id === p.id))
                        .filter(p => {
                            if (!Array.isArray(t.searchKeywords) || t.searchKeywords.length === 0) return true;
                            const pn = normalizeText(p.name);
                            return t.searchKeywords.some(k => pn.includes(k) || fuzzySearch(pn, k));
                        })
                        .sort((a, b) => getProductFinalPrice(a) - getProductFinalPrice(b))
                        .slice(0, 5);
                    if (cheaperAlts.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: cheaperAlts, searchKeywords: t.searchKeywords });
                        return { text: "¡Entendido! Te muestro opciones más accesibles 💪:", products: cheaperAlts };
                    }
                    // Si tiene cupones, ofrecerlos
                    const activeCoupons = safeCoupons.filter(c => c?.code && (!c.expirationDate || new Date(c.expirationDate) > new Date()));
                    if (activeCoupons.length > 0) {
                        const code = activeCoupons[0];
                        return { text: `Entiendo que el precio es alto. ¡Pero tenemos un cupón que te puede ayudar! 🎫 Usá **${code.code}** (${code.type === 'percentage' ? code.value + '%' : '$' + code.value} OFF) al finalizar tu compra.` };
                    }
                    return { text: "No tengo opciones más económicas en ese rubro, pero nuestros precios son competitivos. ¿Querés buscar en otra categoría?" };
                }

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
                if (!refProd && text.match(/\b(ese|este|eso|esto|el de arriba)\b/)) refProd = shown[0];
                if (!refProd) {
                    const numRef = text.match(/\b(?:el|la|n[uú]mero)\s*(\d)\b/);
                    if (numRef && shown[parseInt(numRef[1], 10) - 1]) refProd = shown[parseInt(numRef[1], 10) - 1];
                }
                if (!refProd && text.length > 3) {
                    refProd = shown.find(p => {
                        const pn = normalizeText(p.name);
                        if (!pn) return false;
                        const firstWord = pn.split(' ')[0] || '';
                        return pn.includes(text) || (firstWord.length >= 3 && text.includes(firstWord));
                    });
                }

                // Intent de compra
                const isBuyIntent = !!text.match(/\b(agrega|agregar|agregame|agregalo|sum[aá]|sumale|pone|poner|met[eé]|comprar|compralo|quiero|dame|llevo|lo quiero|al carrito|sumalo|mandalo|mandame|lo llevo|me lo llevo)\b/);
                if (isBuyIntent) {
                    const target = refProd || shown[0];
                    addToCart(target, qty);
                    const related = getRelatedProducts(target, shown.map(p => p.id));
                    const stockHint = buildStockHint(target);
                    let confirmMsg = `✅ ¡Agregué **${qty}x ${target.name}** al carrito!`;
                    if (stockHint && (Number(target.stock) || 0) <= 3) confirmMsg += ` ${stockHint}`;
                    if (related.length > 0) {
                        setTopic({ action: 'asked_yes_no', subAction: 'cross_sell', data: related, shownProducts: related });
                        confirmMsg += '\n\n🛍️ Clientes que compraron esto también vieron:';
                        return { text: confirmMsg, products: [target, ...related] };
                    }
                    clearTopic();
                    confirmMsg += ' 🛒 ¿Necesitás algo más?';
                    return { text: confirmMsg, products: [target] };
                }

                // Más info sobre un producto referenciado
                if (refProd && text.match(/\b(info|detalle|detalles|especif|descrip|cuenta|contame|mas sobre|que es|que tiene|caracteristicas|features)\b/)) {
                    const p = refProd;
                    const lines = buildProductPresentation(p);
                    lines.push(`\n¿Lo agregamos al carrito? 🛒`);
                    setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: p, shownProducts: shown });
                    return { text: lines.join('\n'), products: [p] };
                }

                // Si referenció un producto sin intent claro, presentarlo como vendedor
                if (refProd) {
                    const p = refProd;
                    const price = getProductFinalPrice(p);
                    const stockHint = buildStockHint(p);
                    let msg = `**${p.name}** — **$${Math.round(price).toLocaleString()}**`;
                    if ((p.discount || 0) > 0) msg += ` (¡${p.discount}% OFF! 🔥)`;
                    if (stockHint) msg += `\n${stockHint}`;
                    msg += `\n\n¿Lo agrego al carrito? 🛒`;
                    setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: p, shownProducts: shown });
                    return { text: msg, products: [p] };
                }

                // "más barato" / "más caro"
                if (text.match(/\b(barato|economico|baratos|economicos|menor precio|accesible)\b/)) {
                    const cheaper = [...shown].sort((a, b) => getProductFinalPrice(a) - getProductFinalPrice(b));
                    setTopic({ action: 'showed_products', shownProducts: cheaper, searchKeywords: t.searchKeywords });
                    return { text: "💰 De más accesible a mayor precio:", products: cheaper };
                }
                if (text.match(/\b(caro|caros|premium|mejor calidad|top|mejor|gama alta)\b/)) {
                    const pricier = [...shown].sort((a, b) => getProductFinalPrice(b) - getProductFinalPrice(a));
                    setTopic({ action: 'showed_products', shownProducts: pricier, searchKeywords: t.searchKeywords });
                    return { text: "⭐ Las opciones premium:", products: pricier };
                }

                // "otro", "más opciones"
                if (text.match(/\b(otro|otros|otras|mas opciones|ver mas|siguiente|siguientes|que mas hay|hay mas|mostrame mas|tenes mas)\b/)) {
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
                        return { text: "¡Acá van más opciones! 👇", products: moreSlice };
                    }
                    const cats = getAvailableCategories().slice(0, 4);
                    if (cats.length > 0) {
                        setTopic({ action: 'asked_category' });
                        return { text: `No tengo más opciones con ese criterio. ¿Querés explorar otra categoría?\n\n${cats.map(c => `- ${c}`).join('\n')}` };
                    }
                    return { text: "No tengo más opciones con ese criterio. ¿Querés buscar algo diferente?" };
                }

                // Comparar productos
                if (text.match(/\b(compar[aáe]|diferencia|cual es mejor|cual conviene|vs|versus)\b/) && shown.length >= 2) {
                    const [a, b] = shown.slice(0, 2);
                    const pa = getProductFinalPrice(a);
                    const pb = getProductFinalPrice(b);
                    const lines = [
                        '📊 **Comparación rápida:**',
                        '',
                        `**${a.name}** → $${Math.round(pa).toLocaleString()}${(a.discount || 0) > 0 ? ` (${a.discount}% OFF)` : ''}`,
                        `**${b.name}** → $${Math.round(pb).toLocaleString()}${(b.discount || 0) > 0 ? ` (${b.discount}% OFF)` : ''}`,
                        '',
                        pa < pb ? `💡 **${a.name}** es más económico.` : pa > pb ? `💡 **${b.name}** es más económico.` : '💡 Tienen el mismo precio.',
                        '',
                        '¿Cuál te interesa? Decime y lo agrego al carrito.'
                    ];
                    return { text: lines.join('\n') };
                }
            }

            // --- Sí/No genérico ---
            if (t.action === 'asked_yes_no') {
                if (resolvedYes) {
                    if (t.subAction === 'cross_sell' && Array.isArray(t.data)) {
                        setTopic({ action: 'showed_products', shownProducts: t.data, searchKeywords: [] });
                        return { text: "¡Mirá estas opciones! 🔥 ¿Alguna te interesa?", products: t.data };
                    }
                    if (t.subAction === 'show_deals' && Array.isArray(t.data)) {
                        setTopic({ action: 'showed_products', shownProducts: t.data, searchKeywords: [] });
                        return { text: "Las mejores ofertas ahora mismo 🔥:", products: t.data };
                    }
                    if (t.subAction === 'show_popular' && Array.isArray(t.data)) {
                        setTopic({ action: 'showed_products', shownProducts: t.data, searchKeywords: [] });
                        return { text: "Lo más destacado de la tienda ⭐:", products: t.data };
                    }
                    if (t.subAction === 'add_product' && t.data) {
                        addToCart(t.data, qty);
                        clearTopic();
                        const related = getRelatedProducts(t.data, [t.data.id]);
                        if (related.length > 0) {
                            setTopic({ action: 'asked_yes_no', subAction: 'cross_sell', data: related, shownProducts: related });
                            return { text: `✅ ¡Agregué **${qty}x ${t.data.name}** al carrito! 🛒\n\n¿Querés ver productos relacionados?`, products: [t.data] };
                        }
                        return { text: `✅ ¡Agregué **${qty}x ${t.data.name}** al carrito! 🛒 ¿Necesitás algo más?`, products: [t.data] };
                    }
                }
                if (resolvedNo) {
                    clearTopic();
                    return { text: "¡Perfecto! ¿Necesitás algo más? Puedo ayudarte con otros productos, envío o pagos 😊" };
                }
            }

            // --- Categoría: el bot pidió que elija una ---
            if (t.action === 'asked_category') {
                const allCats = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...safeProducts.flatMap(p => getProductCategories(p))])];
                const matchedCat = allCats.find(c => fuzzySearch(normalizeText(c), text) || fuzzySearch(text, normalizeText(c)));
                if (matchedCat) {
                    const catProds = safeProducts
                        .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false && getProductCategories(p).some(c => c.toLowerCase() === matchedCat.toLowerCase()))
                        .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || (Number(b.discount) || 0) - (Number(a.discount) || 0))
                        .slice(0, 5);
                    if (catProds.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: catProds, searchKeywords: [] });
                        const dealCount = catProds.filter(p => (Number(p.discount) || 0) > 0).length;
                        let intro = `Lo mejor de **${matchedCat}**:`;
                        if (dealCount > 0) intro += ` (${dealCount} en oferta 🔥)`;
                        return { text: intro, products: catProds };
                    }
                    return { text: `No hay productos disponibles en "${matchedCat}" ahora. ¿Buscamos en otra categoría?` };
                }
            }
        }

        // === HANDLERS DE INTENTS EXPLÍCITOS ===

        // Productos populares / destacados / nuevos
        if (hasPopularKw) {
            const isNew = !!text.match(/\b(nuevo|nuevos|reciente|recientes|novedades)\b/);
            let popular;
            if (isNew) {
                popular = safeProducts
                    .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                    .sort((a, b) => {
                        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return db - da;
                    })
                    .slice(0, 5);
            } else {
                popular = safeProducts
                    .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                    .sort((a, b) => (b.isFeatured ? 10 : 0) + (Number(b.discount) || 0) - ((a.isFeatured ? 10 : 0) + (Number(a.discount) || 0)))
                    .slice(0, 5);
            }
            if (popular.length > 0) {
                setTopic({ action: 'showed_products', shownProducts: popular, searchKeywords: [] });
                const label = isNew ? 'Lo más nuevo' : 'Lo más destacado';
                return { text: `${label} de **${sName()}** ⭐:`, products: popular };
            }
            return { text: "Todavía no tenemos productos destacados. ¿Querés ver nuestras categorías?" };
        }

        // Stock de producto específico
        if (hasStockKw && text.length > 15) {
            const stockKeywords = tokenize(text).filter(k => !['stock', 'disponible', 'disponibilidad', 'queda', 'quedan', 'tienen', 'tenes', 'hay'].includes(k));
            if (stockKeywords.length > 0) {
                const found = safeProducts.find(p => {
                    const pn = normalizeText(p.name);
                    return stockKeywords.some(k => pn.includes(k) || fuzzySearch(pn, k));
                });
                if (found) {
                    const stock = Number(found.stock) || 0;
                    const stockHint = buildStockHint(found);
                    const price = getProductFinalPrice(found);
                    if (stock > 0) {
                        setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: found, shownProducts: [found] });
                        return { text: `✅ **${found.name}** está disponible.\n${stockHint || `📊 Stock: ${stock} unidades`}\n💰 $${Math.round(price).toLocaleString()}${(found.discount || 0) > 0 ? ` (${found.discount}% OFF 🔥)` : ''}\n\n¿Lo agrego al carrito?`, products: [found] };
                    }
                    return { text: `😕 **${found.name}** no tiene stock en este momento. ¿Querés que te muestre alternativas?` };
                }
            }
        }

        // Consulta de precio
        if (hasPriceKw) {
            const priceKeywords = tokenize(text).filter(k => !['precio', 'cuanto', 'sale', 'cuesta', 'vale', 'esta'].includes(k));
            if (priceKeywords.length > 0) {
                const found = safeProducts.find(p => {
                    const pn = normalizeText(p.name);
                    return priceKeywords.some(k => pn.includes(k) || fuzzySearch(pn, k));
                });
                if (found) {
                    const price = getProductFinalPrice(found);
                    const lines = buildProductPresentation(found, { showDesc: false });
                    lines.push(`\n¿Lo agrego al carrito? 🛒`);
                    setTopic({ action: 'asked_yes_no', subAction: 'add_product', data: found, shownProducts: [found] });
                    return { text: lines.join('\n'), products: [found] };
                }
            }
        }

        // Garantía / Devoluciones
        if (hasWarrantyKw) {
            if (settings?.whatsappLink) {
                return { text: `Para consultas sobre garantía, devoluciones o cambios, lo mejor es que nos escribas directamente 📲\n\n[WSP_BUTTON]` };
            }
            return { text: `Las consultas de garantía, devoluciones y cambios se manejan caso por caso. Contactanos para resolverlo rápido.` };
        }

        // Presupuesto: "tengo $5000"
        if (hasBudgetKw) {
            const budgetMatch = text.match(/\b(?:tengo|presupuesto|dispongo|gasto|gastar)\s*(?:de)?\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?\b/);
            if (budgetMatch) {
                const budget = parseHumanNumber(budgetMatch[1], text);
                if (budget && budget > 0) {
                    const withinBudget = safeProducts
                        .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false && getProductFinalPrice(p) <= budget)
                        .sort((a, b) => {
                            const sa = (b.isFeatured ? 10 : 0) + (Number(b.discount) || 0);
                            const sb = (a.isFeatured ? 10 : 0) + (Number(a.discount) || 0);
                            return sa - sb || getProductFinalPrice(b) - getProductFinalPrice(a);
                        })
                        .slice(0, 5);
                    if (withinBudget.length > 0) {
                        setTopic({ action: 'showed_products', shownProducts: withinBudget, searchKeywords: [] });
                        return { text: `💰 Con un presupuesto de **$${budget.toLocaleString()}** te recomiendo:`, products: withinBudget };
                    }
                    return { text: `No encontré productos dentro de $${budget.toLocaleString()} 😕. ¿Querés que te muestre las opciones más económicas?` };
                }
            }
        }

        // Categorías
        if (hasCategoryKw) {
            const prodCats = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
            const cats = [...new Set([...(Array.isArray(settings?.categories) ? settings.categories : []), ...prodCats])]
                .map(c => String(c).trim()).filter(Boolean);
            if (cats.length === 0) return { text: "Todavía no tengo categorías configuradas. Decime qué estás buscando y lo resuelvo igual." };
            setTopic({ action: 'asked_category' });
            const totalProducts = safeProducts.filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false).length;
            return { text: `Tenemos **${totalProducts} productos** en estas categorías:\n\n${cats.slice(0, 10).map(c => `- ${c}`).join('\n')}\n\nDecime cuál te interesa y te muestro las mejores opciones 👇` };
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
            if (pickupEnabled) lines.push(`📍 Retiro en local: ${pickupAddress ? `**${pickupAddress}**` : 'a coordinar'} — ¡sin costo!`);
            if (deliveryEnabled) {
                if (freeAbove > 0) lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()} (gratis desde $${freeAbove.toLocaleString()}).`);
                else if (deliveryFee > 0) lines.push(`🚚 Envío a domicilio: $${deliveryFee.toLocaleString()}.`);
                else lines.push(`🚚 Envío a domicilio: **¡GRATIS!** 🎉`);
            }
            if (!pickupEnabled && !deliveryEnabled) lines.push("Todavía no tenemos configurado el método de entrega.");
            lines.push("\nDecime tu ciudad/zona y te digo la mejor opción para vos.");
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
            if (hasCard) options.push("💳 Tarjeta / Mercado Pago (podés pagar en cuotas)");
            if (hasTransfer) options.push("🏦 Transferencia bancaria");
            if (hasCash) options.push("💵 Efectivo (solo retiro en local)");
            if (options.length === 0) return { text: "Todavía no tenemos métodos de pago configurados." };
            if (wantsTransferData) {
                const holderName = settings?.paymentTransfer?.holderName ? String(settings.paymentTransfer.holderName).trim() : '';
                const alias = settings?.paymentTransfer?.alias ? String(settings.paymentTransfer.alias).trim() : '';
                const cbu = settings?.paymentTransfer?.cbu ? String(settings.paymentTransfer.cbu).trim() : '';
                const lines = ["🏦 **Datos para transferencia:**"];
                if (holderName) lines.push(`- Titular: **${holderName}**`);
                if (alias) lines.push(`- Alias: **${alias}**`);
                if (cbu) lines.push(`- CBU: **${cbu}**`);
                if (!holderName && !alias && !cbu) lines.push("- Aún no están cargados los datos.");
                lines.push('\nUna vez transferido, enviá el comprobante para confirmar tu pedido.');
                return { text: lines.join('\n') };
            }
            return { text: `Aceptamos estos medios de pago:\n\n${options.map(o => `- ${o}`).join('\n')}\n\n¿Necesitás los datos de transferencia o querés pagar con tarjeta?` };
        }

        // Ayuda/Contacto
        if (hasHelpKw) {
            if (settings?.whatsappLink) return { text: `¡Por supuesto! Si necesitás atención personalizada 🧑‍💻, escribinos por WhatsApp y te respondemos al toque 📲\n\n[WSP_BUTTON]` };
            return { text: `Estoy acá las 24hs para ayudarte 🤖. Preguntame lo que necesites sobre productos, precios, envío o pagos.` };
        }

        // Ofertas / Productos con descuento
        if (hasOffersKw) {
            const deals = safeProducts.filter(p => (Number(p?.discount) || 0) > 0 && (Number(p?.stock) || 0) > 0 && p?.isActive !== false);
            if (deals.length > 0) {
                const topDeals = deals.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0)).slice(0, 5);
                setTopic({ action: 'showed_products', shownProducts: topDeals, searchKeywords: [] });
                const maxDiscount = Math.max(...topDeals.map(p => Number(p.discount) || 0));
                return { text: `🔥 **${deals.length} productos en oferta** (hasta ${maxDiscount}% OFF):`, products: topDeals };
            }
            return { text: "No tenemos ofertas activas en este momento, pero nuestros precios son muy competitivos 😉. ¿Querés ver alguna categoría?" };
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
                    .map(c => `🎫 **${c.code}** — ${c.type === 'percentage' ? c.value + '% OFF' : '$' + c.value + ' de descuento'}`)
                    .join("\n");
                return { text: `¡Sí! Tenemos cupones activos 🎉:\n\n${couponText}\n\n💡 Aplicalos en el checkout para obtener tu descuento.` };
            }
            return { text: "No hay cupones activos por ahora. Pero te recomiendo ver nuestras ofertas, ¡hay buenos descuentos! 😊 ¿Querés que te las muestre?" };
        }

        // === BÚSQUEDA DE PRODUCTOS ===
        const isCheaper = text.match(/\b(?:mas|muy|super)\s*(?:barato|economico|bajo|accesible)\b|\bmas\s*economico\b|\bmas\s*accesible\b/);
        const isExpensive = text.match(/\b(?:mas|muy|super)\s*(?:caro|mejor|calidad|top|premium|gama alta)\b|\bcostoso\b|\blujo\b/);
        const isBuying = text.match(/\b(?:agrega|agregar|agregame|sum[aá]|pone|poner|met[eé]|comprar|quiero|dame|carrito|llevo|lo quiero|mandame|me lo llevo)\b/);

        let minPrice = 0;
        let maxPrice = Infinity;
        // "menos de $X", "bajo $X"
        const lessThanMatch = text.match(/\b(?:menos|menor|bajo|hasta|maximo)\s*(?:de|a|que)?\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (lessThanMatch) { const p = parseHumanNumber(lessThanMatch[1], text); if (p !== null) maxPrice = p; }
        // "más de $X"
        const moreThanMatch = text.match(/\b(?:mas|mayor|desde|minimo|arriba)\s*(?:de|a|que)?\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (moreThanMatch && !lessThanMatch) { const p = parseHumanNumber(moreThanMatch[1], text); if (p !== null) minPrice = p; }
        // "entre $X y $Y"
        const betweenMatch = text.match(/entre\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?\s*y\s*\$?\s*(\d+(?:[.,]\d+)?)(?:\s*(?:k|mil))?/);
        if (betweenMatch) {
            const pMin = parseHumanNumber(betweenMatch[1], text); const pMax = parseHumanNumber(betweenMatch[2], text);
            if (pMin !== null) minPrice = pMin; if (pMax !== null) maxPrice = pMax;
        }

        const availableCategories = [...new Set(safeProducts.flatMap(p => getProductCategories(p)))];
        const detectedCategoryVal = availableCategories.find(c => fuzzySearch(c, text) || fuzzySearch(text, c));
        const targetCategory = detectedCategoryVal ? detectedCategoryVal.toLowerCase() : null;

        // Sinónimos dinámicos: se construyen a partir de los productos reales de la tienda
        const synonyms = new Map();
        const dynamicSynonymPairs = [
            ['celu', 'celular'], ['cel', 'celular'], ['tele', 'televisor'],
            ['tv', 'televisor'], ['compu', 'computadora'], ['notebook', 'laptop'],
            ['auris', 'auriculares'], ['zapas', 'zapatillas'],
            ['remera', 'camiseta'], ['remeras', 'camisetas'],
            ['joystick', 'control'], ['mando', 'control'], ['play', 'playstation'],
            ['ps5', 'playstation 5'], ['ps4', 'playstation 4'],
            ['xbox', 'xbox'], ['switch', 'nintendo switch'],
            ['micro', 'microfono'], ['parlante', 'speaker'],
            ['cam', 'camara'], ['bici', 'bicicleta'], ['moto', 'motocicleta'],
            ['pc', 'computadora'], ['tablet', 'tableta'],
        ];
        const allProductText = safeProducts.map(p => normalizeText(p.name)).join(' ');
        for (const [shortForm, expanded] of dynamicSynonymPairs) {
            if (allProductText.includes(normalizeText(expanded)) || allProductText.includes(normalizeText(shortForm))) {
                synonyms.set(shortForm, expanded);
            }
        }
        const keywords = tokenize(text).flatMap(k => { const alt = synonyms.get(k); return alt ? [k, alt] : [k]; });

        // Feedback negativo sin contexto de productos: redirigir
        if (hasNegativeFeedback && keywords.length === 0) {
            const cats = getAvailableCategories().slice(0, 4);
            if (cats.length > 0) {
                setTopic({ action: 'asked_category' });
                return { text: `Entendido. ¿Qué te gustaría ver? Tenemos:\n\n${cats.map(c => `- ${c}`).join('\n')}\n\nDecime cuál te interesa 👇` };
            }
            return { text: "Entendido. ¿Podés decirme qué tipo de producto estás buscando?" };
        }

        if (keywords.length === 0 && !targetCategory && !isCheaper && !isExpensive && !isBuying) {
            // Búsqueda completa con texto crudo: intenta matchear incluso con typos o sin espacios
            const rawSearch = safeProducts
                .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .map(p => ({ product: p, sim: similarityScore(p.name, text) }))
                .filter(s => s.sim >= 40)
                .sort((a, b) => b.sim - a.sim);

            if (rawSearch.length > 0) {
                const topRaw = rawSearch.slice(0, 5).map(s => s.product);
                setTopic({ action: 'showed_products', shownProducts: topRaw, searchKeywords: [text] });
                return { text: topRaw.length === 1 ? '¿Buscás esto?' : 'Creo que buscás algo de esto:', products: topRaw };
            }

            // Fuzzy match como último recurso
            const lastResort = safeProducts
                .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .find(p => fuzzySearch(normalizeText(p.name), text));
            if (lastResort) {
                setTopic({ action: 'showed_products', shownProducts: [lastResort], searchKeywords: [text] });
                return { text: `¿Buscás esto?`, products: [lastResort] };
            }

            const availCats = getAvailableCategories().slice(0, 5);
            if (availCats.length > 0) {
                setTopic({ action: 'asked_category' });
                return { text: `No estoy seguro de qué necesitás. Estas son nuestras categorías:\n\n${availCats.map(c => `- ${c}`).join('\n')}\n\n¿Cuál te interesa?` };
            }
            return { text: "No estoy seguro de qué necesitás. ¿Podés decirme el nombre del producto o qué tipo de producto buscás?" };
        }

        let candidates = safeProducts.filter(p => (Number(p?.stock) || 0) > 0 && p?.isActive !== false);
        candidates = candidates.filter(p => { const fp = getProductFinalPrice(p); return fp >= minPrice && fp <= maxPrice; });
        if (targetCategory) candidates = candidates.filter(p => getProductCategories(p).some(c => c.toLowerCase() === targetCategory));

        const scores = candidates.map(p => {
            let score = 0;
            const pName = normalizeText(p.name);
            const pDesc = normalizeText(p.description);
            const pCats = getProductCategories(p).map(c => normalizeText(c)).join(' ');
            keywords.forEach(k => {
                // Nombre: máxima prioridad
                if (pName.includes(k)) score += 15;
                else {
                    const sim = similarityScore(pName, k);
                    if (sim >= 60) score += Math.round(sim / 10);  // 6-10 puntos según similitud
                }
                // Descripción
                if (pDesc.includes(k)) score += 4;
                else if (fuzzySearch(pDesc, k)) score += 2;
                // Categorías
                if (pCats.includes(k)) score += 5;
                else if (fuzzySearch(pCats, k)) score += 3;
            });
            // Bonus: toda la frase del usuario como búsqueda contra el nombre
            if (text.length >= 4) {
                const fullSim = similarityScore(pName, text);
                if (fullSim >= 50) score += Math.round(fullSim / 10);
            }
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
            // Último intento: búsqueda fuzzy amplia con similarityScore contra TODOS los productos
            const fuzzyFallback = safeProducts
                .filter(p => (Number(p.stock) || 0) > 0 && p.isActive !== false)
                .map(p => ({ product: p, sim: similarityScore(p.name, text) }))
                .filter(s => s.sim >= 35)
                .sort((a, b) => b.sim - a.sim)
                .slice(0, 5)
                .map(s => s.product);

            if (fuzzyFallback.length > 0) {
                setTopic({ action: 'showed_products', shownProducts: fuzzyFallback, searchKeywords: keywords });
                return { text: fuzzyFallback.length === 1 ? '¿Será esto lo que buscás?' : '¿Buscás alguno de estos?', products: fuzzyFallback };
            }

            // Precio fuera de rango?
            if (maxPrice < Infinity || minPrice > 0) {
                const priceRange = minPrice > 0 && maxPrice < Infinity
                    ? `entre $${minPrice.toLocaleString()} y $${maxPrice.toLocaleString()}`
                    : maxPrice < Infinity ? `hasta $${maxPrice.toLocaleString()}` : `desde $${minPrice.toLocaleString()}`;
                return { text: `No encontré productos ${priceRange} con ese criterio. ¿Querés que amplíe el rango de precio o busque en otra categoría?` };
            }
            const availCats = getAvailableCategories().slice(0, 5);
            const catSuggestion = availCats.length > 0
                ? `\n\nNuestras categorías: ${availCats.map(c => `**${c}**`).join(', ')}. ¿Querés ver alguna?`
                : '';
            return { text: `No encontré lo que buscás en nuestra tienda 🔎. Probá con otra palabra o preguntame por categorías.${catSuggestion}` };
        }

        if (isBuying && topMatches.length > 0) {
            const best = topMatches[0];
            addToCart(best, qty);
            const related = getRelatedProducts(best, topMatches.map(p => p.id));
            const stockHint = buildStockHint(best);
            let confirmMsg = `✅ ¡Agregué **${qty}x ${best.name}** al carrito!`;
            if (stockHint && (Number(best.stock) || 0) <= 3) confirmMsg += ` ${stockHint}`;
            if (related.length > 0) {
                setTopic({ action: 'asked_yes_no', subAction: 'cross_sell', data: related, shownProducts: related });
                confirmMsg += '\n\n🛍️ Te pueden interesar también:';
                return { text: confirmMsg, products: [best, ...related] };
            }
            clearTopic();
            confirmMsg += ' 🛒 ¿Necesitás algo más?';
            return { text: confirmMsg, products: [best] };
        }

        setTopic({ action: 'showed_products', shownProducts: topMatches, searchKeywords: keywords });

        // Mensajes de presentación persuasivos
        let msg;
        const dealCount = topMatches.filter(p => (Number(p.discount) || 0) > 0).length;
        const lowStockCount = topMatches.filter(p => (Number(p.stock) || 0) <= 3).length;

        if (topMatches.length === 1) {
            const p = topMatches[0];
            const stockHint = buildStockHint(p);
            msg = `Encontré esto para vos:`;
            if (stockHint) msg += ` ${stockHint}`;
        } else if (targetCategory) {
            msg = `Lo mejor de **${detectedCategoryVal}**`;
            if (dealCount > 0) msg += ` (${dealCount} en oferta 🔥)`;
            msg += ':';
        } else if (isCheaper) {
            msg = "💰 Las opciones más accesibles:";
        } else if (isExpensive) {
            msg = "⭐ Las opciones premium:";
        } else {
            msg = `Encontré **${topMatches.length} opciones** para vos`;
            if (dealCount > 0) msg += ` (${dealCount} en oferta 🔥)`;
            if (lowStockCount > 0) msg += ` — ¡apurate, hay pocas unidades!`;
            msg += ':';
        }

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
            const responseProducts = Array.isArray(localResponse?.products) ? localResponse.products : undefined;

            setMessages(prev => [...prev, {
                role: 'model',
                text: finalText,
                products: responseProducts
            }]);
        } catch (e) {
            if (!isMountedRef.current) return;
            const fallback = settings?.whatsappLink
                ? `Uy, se me trabó por un momento. Si querés, hablá por WhatsApp:\n\n[WSP_BUTTON]`
                : "Uy, se me trabó por un momento. ¿Probamos de nuevo?";
            setMessages(prev => [...prev, { role: 'model', text: fallback }]);
        } finally {
            inFlightRef.current = false;
            if (isMountedRef.current) {
                setIsTyping(false);
                const pending = pendingTextRef.current;
                if (pending && pending.text) {
                    pendingTextRef.current = null;
                    setTimeout(() => sendText(pending.text, { alreadyAddedUser: pending.alreadyAddedUser === true }), 0);
                }
            } else {
                pendingTextRef.current = null;
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
        { label: '🔥 Ofertas', value: 'Mostrame ofertas' },
        { label: '⭐ Destacados', value: 'Lo más vendido' },
        { label: '🎫 Cupones', value: 'Tenés cupones?' },
        { label: '🚚 Envío', value: 'Cómo es el envío?' },
        { label: '💳 Pagos', value: 'Qué medios de pago hay?' },
        { label: '📂 Categorías', value: 'Qué categorías tenés?' },
    ];

    if (!isEnabled) return null;

    return (
        <div
            data-testid="sustia-root"
            className={`store-sustia-root fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-4 z-[9999] flex flex-col items-end pointer-events-none ${hasFloatingWhatsapp ? 'store-sustia-root-with-wa' : ''}`}
        >
            {isOpen && (
                <div className="sustia-chat-open backdrop-blur-2xl border rounded-[2rem] w-[calc(100vw-2rem)] sm:w-80 md:w-96 h-[min(600px,80dvh)] flex flex-col mb-4 overflow-hidden font-sans pointer-events-auto relative mr-0 sm:mr-0"
                    style={{ backgroundColor: 'rgba(15,15,15,0.95)', borderColor: pc(0.15), boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${pc(0.08)}` }}>
                    {/* Header */}
                    <div className="p-5 flex justify-between items-center relative z-10" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` }}>
                        <div className="flex items-center gap-3">
                            <div className="p-1 bg-white/20 rounded-full backdrop-blur-md overflow-hidden border border-white/30">
                                <img src={botImage} className="w-9 h-9 object-cover rounded-full" alt="SustIA" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-tight">Asistente Virtual</h3>
                                <p className="text-[10px] text-white/90 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ boxShadow: '0 0 8px rgba(74,222,128,0.8)' }}></span>
                                    En línea
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={clearChat} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90" title="Limpiar chat">
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90" title="Cerrar">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className={`px-4 py-2 border-b ${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {quickActions.map(a => (
                                <button
                                    key={a.label}
                                    type="button"
                                    data-testid={`quick-action-${a.label.toLowerCase()}`}
                                    onClick={() => handleQuickAction(a.value)}
                                    className={`sustia-quick-btn shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                                        isDarkMode
                                            ? 'border-white/10 bg-[#1a1a1a] text-white hover:bg-[#222]'
                                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                                    }`}
                                    style={{ '--hover-border': primaryColor }}
                                >
                                    <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>{a.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar relative" style={{ backgroundColor: 'rgba(10,10,10,0.5)' }}>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'client' ? 'items-end sustia-msg-user' : 'items-start sustia-msg-bot'}`}>
                                <div
                                    className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-lg ${m.role === 'client'
                                        ? 'text-white rounded-tr-none border border-white/10'
                                        : 'bg-[#1a1a1a] text-slate-200 rounded-tl-none border border-white/5'
                                    }`}
                                    style={m.role === 'client' ? { background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})` } : undefined}
                                >
                                    {m.text && m.text.includes('[WSP_BUTTON]') ? (
                                        <>
                                            {m.text.split('[WSP_BUTTON]').map((part, idx, arr) => (
                                                <React.Fragment key={idx}>
                                                    {part && <p className="whitespace-pre-wrap">{renderMarkdown(part)}</p>}
                                                    {idx < arr.length - 1 && settings?.whatsappLink && (
                                                        <a
                                                            href={settings.whatsappLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 mt-2 mb-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-green-900/30 active:scale-95"
                                                        >
                                                            <WhatsAppIcon className="w-4 h-4" />
                                                            Ir a WhatsApp
                                                        </a>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{renderMarkdown(m.text)}</p>
                                    )}
                                </div>

                                {m.products && m.products.length > 0 && (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar pl-1 snap-x">
                                        {m.products.map((product, pIdx) => (
                                            <BotProductCard
                                                key={product.id}
                                                product={product}
                                                idx={pIdx}
                                                accentColor={primaryColor}
                                                onAdd={(p, qty) => {
                                                    addToCart(p, qty);
                                                    setMessages(prev => [...prev, { role: 'model', text: `✅ Agregado ${qty}x ${p.name} al carrito! 🛒` }]);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start sustia-msg-bot">
                                <div className="bg-[#1a1a1a] p-3 rounded-2xl rounded-bl-none border border-white/5 flex gap-1.5 items-center">
                                    <span className="sustia-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, animationDelay: '0s' }}></span>
                                    <span className="sustia-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.7, animationDelay: '0.15s' }}></span>
                                    <span className="sustia-dot w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor, opacity: 0.4, animationDelay: '0.3s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t relative z-0" style={{ backgroundColor: '#0a0a0a', borderColor: pc(0.15) }}>
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                            <input
                                className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-600"
                                placeholder="Escribe aquí..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                style={{ '--focus-color': pc(0.5) }}
                                onFocus={e => e.target.style.borderColor = pc(0.5)}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            <button
                                type="submit"
                                className="p-2.5 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-90 hover:brightness-110"
                                style={{ backgroundColor: primaryColor, boxShadow: `0 4px 12px ${pc(0.25)}` }}
                                disabled={isTyping || !inputValue.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* FAB Launcher */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                data-testid="sustia-launcher"
                aria-label={isOpen ? 'Cerrar chat de SustIA' : 'Abrir chat de SustIA'}
                className="sustia-fab store-sustia-launcher-fab pointer-events-auto w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 group relative z-50"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryDark})`, boxShadow: `0 0 20px ${pc(0.4)}` }}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : (
                    <div className="w-full h-full p-1">
                        <img src={botImage} className="w-full h-full object-cover rounded-full opacity-95 group-hover:scale-110 transition-transform duration-300" alt="SustIA" />
                    </div>
                )}
                {!isOpen && (
                    <>
                        <span className="sustia-pulse-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${pc(0.4)}` }}></span>
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: primaryColor }}></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 border border-black" style={{ backgroundColor: primaryColor }}></span>
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}, (prevProps, nextProps) => {
    if (prevProps.settings?.subscriptionPlan !== nextProps.settings?.subscriptionPlan) return false;
    if (prevProps.settings?.primaryColor !== nextProps.settings?.primaryColor) return false;
    if (prevProps.settings?.storeName !== nextProps.settings?.storeName) return false;
    if (prevProps.settings?.botImage !== nextProps.settings?.botImage) return false;
    if (prevProps.hasFloatingWhatsapp !== nextProps.hasFloatingWhatsapp) return false;
    if (prevProps.products !== nextProps.products) return false;
    if (prevProps.coupons !== nextProps.coupons) return false;
    return true;
});

export default SustIABot;
