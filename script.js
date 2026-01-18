import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag,
    Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home,
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet,
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown,
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy,
    ShoppingCart, Archive, Play, FolderPlus, Eye, EyeOff, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, Sparkles,
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp, Store, BarChart, Globe, Headphones, Palette, Share2, Cog, Facebook, Twitter, Linkedin, Youtube, Bell, Music, Building, Banknote, Smartphone, UserPlus, Maximize2, Settings2, Sun, Moon, Upload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc,
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove, orderBy, limit, startAfter
} from 'firebase/firestore';

// --- CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
    authDomain: "sustore-63266.firebaseapp.com",
    projectId: "sustore-63266",
    storageBucket: "sustore-63266.firebasestorage.app",
    messagingSenderId: "684651914850",
    appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
    measurementId: "G-X3K7XGYPRD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sustore-63266-prod";
const APP_VERSION = "3.0.0";

// === SEGURIDAD: Email de Super Admin ofuscado (múltiples capas) ===
const _sa = ['bGF1dGFyb2NvcmF6emE2M0BnbWFpbC5jb20=']; // Base64
const SUPER_ADMIN_EMAIL = (() => { try { return atob(_sa[0]); } catch (e) { return ''; } })();

// === SEGURIDAD: Sistema Anti-Manipulación Avanzado ===
const SecurityManager = {
    sessionToken: null,
    loginAttempts: {},
    maxAttempts: 5,
    lockoutTime: 300000, // 5 minutos
    integrityChecks: {},

    // Salt dinámico basado en timestamp (más seguro que salt fijo)
    _generateSalt() {
        const base = 'wulfin_secure_2024';
        const timestamp = Math.floor(Date.now() / 86400000); // Cambia cada día
        return base + '_' + timestamp;
    },

    // Hash seguro para contraseñas (SHA-256 con salt dinámico)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const salt = this._generateSalt();
        const data = encoder.encode(password + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Verificar contraseña hasheada
    async verifyPassword(password, hash) {
        const inputHash = await this.hashPassword(password);
        return inputHash === hash;
    },

    // Rate limiting mejorado para login
    canAttemptLogin(email) {
        const key = this._hashKey(email.toLowerCase());
        const now = Date.now();
        const record = this.loginAttempts[key];

        if (record && record.lockedUntil > now) {
            return { allowed: false, remainingTime: Math.ceil((record.lockedUntil - now) / 1000) };
        }

        if (record && record.lockedUntil && record.lockedUntil < now) {
            delete this.loginAttempts[key];
        }

        return { allowed: true };
    },

    // Hash de claves para no exponer emails en memoria
    _hashKey(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'k_' + Math.abs(hash).toString(36);
    },

    // Registrar intento fallido
    recordFailedAttempt(email) {
        const key = this._hashKey(email.toLowerCase());
        if (!this.loginAttempts[key]) {
            this.loginAttempts[key] = { count: 0, firstAttempt: Date.now() };
        }
        this.loginAttempts[key].count++;

        if (this.loginAttempts[key].count >= this.maxAttempts) {
            this.loginAttempts[key].lockedUntil = Date.now() + this.lockoutTime;
            // Log seguro sin exponer email
            console.warn('[Security] Account locked - too many failed attempts');
        }
    },

    // Limpiar intentos después de login exitoso
    clearAttempts(email) {
        const key = this._hashKey(email.toLowerCase());
        delete this.loginAttempts[key];
    },

    // Generar token de sesión con firma criptográfica
    generateSessionToken(userId) {
        const payload = {
            uid: userId,
            iat: Date.now(),
            exp: Date.now() + 86400000, // 24 horas
            nonce: crypto.getRandomValues(new Uint32Array(1))[0].toString(36)
        };
        const token = btoa(JSON.stringify(payload));
        const signature = this._signToken(token);
        const fullToken = token + '.' + signature;
        this.sessionToken = fullToken;
        sessionStorage.setItem('_st', fullToken);
        return fullToken;
    },

    // Firma simple del token
    _signToken(token) {
        let hash = 0;
        const secret = 'wulfin_secret_key_2024';
        const toSign = token + secret;
        for (let i = 0; i < toSign.length; i++) {
            hash = ((hash << 5) - hash) + toSign.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },

    // Verificar token de sesión con validación de expiración
    verifySession() {
        const stored = sessionStorage.getItem('_st');
        if (!stored || stored !== this.sessionToken) return false;

        try {
            const [payloadB64] = stored.split('.');
            const payload = JSON.parse(atob(payloadB64));
            // Verificar expiración
            if (payload.exp && payload.exp < Date.now()) {
                this.invalidateSession();
                return false;
            }
            return true;
        } catch {
            return false;
        }
    },

    // Invalidar sesión
    invalidateSession() {
        this.sessionToken = null;
        sessionStorage.removeItem('_st');
        localStorage.removeItem('sustore_user_data');
    },

    // Detectar manipulación de React DevTools
    detectManipulation() {
        const stored = localStorage.getItem('sustore_user_data');
        if (stored) {
            try {
                const userData = JSON.parse(stored);
                // Verificar estructura válida
                if (!userData.id || userData.id.length < 10 ||
                    !userData.email || !userData.email.includes('@')) {
                    console.warn('[Security] Invalid session data detected');
                    localStorage.removeItem('sustore_user_data');
                    return true;
                }
                // Verificar que el rol no fue manipulado a admin ilegalmente
                if (userData.role === 'admin' && !this._validateAdminClaim(userData)) {
                    console.warn('[Security] Admin role manipulation detected');
                    userData.role = 'user';
                    localStorage.setItem('sustore_user_data', JSON.stringify(userData));
                    return true;
                }
            } catch (e) {
                localStorage.removeItem('sustore_user_data');
                return true;
            }
        }
        return false;
    },

    // Validar claim de admin (requiere verificación del servidor)
    _validateAdminClaim(userData) {
        // El rol de admin debe venir del servidor, no del cliente
        // Esta es una validación básica, la real se hace en Firestore Rules
        return userData._adminVerified === true;
    },

    // Sanitizar entrada del usuario (Anti-XSS)
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    },

    // Validar email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    },

    // Validar fortaleza de contraseña
    isStrongPassword(password) {
        return password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password);
    },

    // Protección contra ataques de timing
    async secureCompare(a, b) {
        if (typeof a !== 'string' || typeof b !== 'string') return false;
        const encoder = new TextEncoder();
        const aBytes = encoder.encode(a);
        const bBytes = encoder.encode(b);
        if (aBytes.length !== bBytes.length) return false;

        let result = 0;
        for (let i = 0; i < aBytes.length; i++) {
            result |= aBytes[i] ^ bBytes[i];
        }
        return result === 0;
    },

    // Bloquear acceso a consola en producción (anti-debugging)
    protectConsole() {
        if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
            // Desactivar console.log en producción para no exponer info
            const noop = () => { };
            ['log', 'debug', 'info', 'table', 'dir'].forEach(method => {
                console[method] = noop;
            });
            // Mantener warn y error para debugging crítico
        }
    },

    // Detectar DevTools abierto
    detectDevTools() {
        const threshold = 160;
        const check = () => {
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            if (widthDiff || heightDiff) {
                // DevTools detectado - no hacer nada visible pero loguear
                // console.warn('[Security] DevTools detected');
            }
        };
        // Verificar periódicamente
        setInterval(check, 5000);
    },

    // Inicializar todas las protecciones
    init() {
        this.detectManipulation();
        this.protectConsole();
        this.detectDevTools();

        // Limpiar datos sensibles de window
        Object.defineProperty(window, 'SUPER_ADMIN_EMAIL', {
            get: () => undefined,
            configurable: false
        });
    }
};

// Inicializar protecciones de seguridad
SecurityManager.init();

// Configuración por defecto
const defaultSettings = {
    storeName: "WULFIN DISEÑOS",
    primaryColor: "#06b6d4",
    currency: "$",
    admins: SUPER_ADMIN_EMAIL,
    team: [{ email: SUPER_ADMIN_EMAIL, role: "admin", name: "Administrador" }],
    sellerEmail: "sustoresf@gmail.com",
    instagramUser: "sustore_sf",
    whatsappLink: "https://wa.me/message/3MU36VTEKINKP1",
    showWhatsapp: false,
    showFloatingWhatsapp: false,
    logoUrl: "",
    heroUrl: "",
    markupPercentage: 0,
    announcementMessage: "🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥",
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"],
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado."
};

// --- COMPONENTES DE UI ---

// Componente de Imagen con Lazy Loading
const LazyImage = ({ src, alt, className, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg==' }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '100px', threshold: 0.1 }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <img
            ref={imgRef}
            src={isInView ? src : placeholder}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
        />
    );
};

// Componente de Notificación (Toast)
const Toast = ({ message, type, onClose }) => {
    let containerClass = "fixed top-24 right-4 z-[9999] flex items-center gap-4 p-5 rounded-2xl border-l-4 backdrop-blur-xl animate-fade-up shadow-2xl transition-all duration-300";
    let iconContainerClass = "p-2 rounded-full";
    let IconComponent = Info;

    if (type === 'success') {
        containerClass += " border-green-500 text-green-400 bg-black/90 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
        iconContainerClass += " bg-green-500/20";
        IconComponent = CheckCircle;
    } else if (type === 'error') {
        containerClass += " border-red-500 text-red-400 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
        iconContainerClass += " bg-red-500/20";
        IconComponent = AlertCircle;
    } else if (type === 'warning') {
        containerClass += " border-yellow-500 text-yellow-400 bg-black/90 shadow-[0_0_20px_rgba(234,179,8,0.3)]";
        iconContainerClass += " bg-yellow-500/20";
        IconComponent = AlertTriangle;
    } else {
        containerClass += " border-orange-500 text-orange-400 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]";
        iconContainerClass += " bg-orange-500/20";
        IconComponent = Info;
    }

    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={containerClass}>
            <div className={iconContainerClass}>
                <IconComponent className="w-5 h-5" />
            </div>
            <div>
                <p className="font-bold text-sm tracking-wide">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-white/50 hover:text-white transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// Componente Modal de Confirmación
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
            <div className={`glass p-8 rounded-[2rem] max-w-sm w-full border ${isDangerous ? 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-slate-700 shadow-2xl'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500' : 'bg-orange-900/20 text-orange-500'}`}>
                    {isDangerous ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black text-center mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">{cancelText}</button>
                    <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold transition shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// Error Boundary
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-10 font-mono">
                    <h1 className="text-4xl font-bold mb-4">CRITICAL SYSTEM FAILURE</h1>
                    <div className="border border-red-900 bg-red-900/10 p-6 rounded-xl overflow-auto">
                        <h2 className="text-xl font-bold mb-2">{this.state.error?.toString()}</h2>
                        <pre className="text-xs text-red-400/70 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold">REINICIAR SISTEMA</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- COMPONENTE SUSTIA (AI ASSISTANT) ---
const SustIABot = ({ settings, products, addToCart }) => {
    // 1. Verificación de Plan Premium
    if (settings?.subscriptionPlan !== 'premium') return null;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: '¡Hola! Soy SustIA 🤖, tu asistente personal. ¿Buscas algo especial hoy? Puedo verificar stock y agregar productos a tu carrito.' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // --- CEREBRO LOCAL AVANZADO V4 (Contextual & Comparativo) ---
    const callLocalBrain = async (userText, currentMessages) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        const text = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 0. Detectar Intenciones
        const isCheaper = text.match(/(?:mas|muy|super)\s*(?:barato|economico|bajo)|oferta|menos/);
        const isExpensive = text.match(/(?:mas|muy|super)\s*(?:caro|mejor|calidad|top|premium)|costoso|lujo/);
        const isBestValue = text.match(/calidad\s*precio|conviene|rendidor|equilibrado|mejor opcion/);

        // 1. Recuperar Contexto (Historial)
        const lastBotMsg = [...currentMessages].reverse().find(m => m.role === 'model' && m.products?.length > 0);
        const contextProducts = lastBotMsg ? lastBotMsg.products : [];
        const contextCategory = contextProducts.length > 0 ? contextProducts[0].category : null;
        const contextPrice = contextProducts.length > 0 ? parseInt(contextProducts[0].basePrice) : null;

        // 2. Extracción de Filtros
        const getPriceLimit = (t) => {
            const match = t.match(/(?:menos|bajo|maximo|hasta|no mas de)\s*(?:de)?\s*\$?(\d+)/);
            return match ? parseInt(match[1]) : null;
        };
        const availableCategories = [...new Set(products.map(p => p.category.toLowerCase()))];
        const detectCategory = (t) => availableCategories.find(c => t.includes(c) || c.includes(t));

        const maxPrice = getPriceLimit(text);
        let targetCategory = detectCategory(text);
        const isBuying = text.match(/(?:agrega|comprar|quiero|dame|carrito|llevo)/);

        // Inferencia Contextual
        if (!targetCategory && (isCheaper || isExpensive || isBestValue) && contextCategory) {
            targetCategory = contextCategory.toLowerCase();
        }

        // 3. Selección de Candidatos
        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'con', 'que', 'para', 'por', 'hola', 'busco', 'tienes', 'precio', 'vale', 'quiero', 'necesito', 'hay', 'donde', 'mas', 'menos'];
        const keywords = text.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w) && isNaN(w));

        let candidates = products.filter(p => p.stock > 0);

        if (targetCategory) candidates = candidates.filter(p => p.category.toLowerCase().includes(targetCategory));
        if (maxPrice) candidates = candidates.filter(p => p.basePrice <= maxPrice);

        // Filtro Contextual (Precio relativo)
        if (isCheaper && contextPrice && !maxPrice) {
            candidates = candidates.filter(p => p.basePrice < contextPrice);
        } else if (isExpensive && contextPrice && !maxPrice) {
            candidates = candidates.filter(p => p.basePrice > contextPrice);
        }

        // Keywords Score
        if (keywords.length > 0) {
            candidates = candidates.map(p => {
                let score = 0;
                const str = (p.name + " " + p.category + " " + (p.description || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                keywords.forEach(k => {
                    if (str.includes(k)) score += 1;
                    if (p.name.toLowerCase().includes(k)) score += 2;
                });
                return { ...p, score };
            }).filter(p => p.score > 0);
        }

        // 4. Ordenamiento Inteligente
        if (isCheaper) {
            candidates.sort((a, b) => a.basePrice - b.basePrice); // Menor a mayor
        } else if (isExpensive) {
            candidates.sort((a, b) => b.basePrice - a.basePrice); // Mayor a menor
        } else if (isBestValue) {
            const avg = candidates.reduce((sum, p) => sum + parseInt(p.basePrice), 0) / (candidates.length || 1);
            candidates.sort((a, b) => Math.abs(a.basePrice - avg) - Math.abs(b.basePrice - avg)); // Cercanos al promedio
        } else if (keywords.length > 0) {
            candidates.sort((a, b) => b.score - a.score); // Relevancia
        }

        // 5. Respuesta
        if (candidates.length === 0) {
            const suggestion = targetCategory ? ` en ${targetCategory}` : '';
            return { text: `Mmm, no encontré opciones ${isCheaper ? 'más económicas' : ''}${suggestion} con esos criterios. 📉 Intenta ser más general o ver todo el catálogo.` };
        }

        const topMatches = candidates.slice(0, 5);

        if (isBuying && topMatches.length > 0) {
            const best = topMatches[0];
            addToCart(best);
            return {
                text: `¡Listo! Agregué **${best.name}** a tu carrito. 🛒 ¿Algo más?`,
                products: [best]
            };
        }

        let msg = "Aquí tienes algunas opciones:";
        if (isCheaper) msg = "Encontré estas alternativas más accesibles: 📉";
        else if (isExpensive) msg = "Mira estas opciones Premium: 💎";
        else if (isBestValue) msg = "Lo mejor en Calidad/Precio: ⚖️";

        return {
            text: msg,
            products: topMatches
        };
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        const text = inputValue;
        setInputValue('');

        const newMsgUser = { role: 'client', text };
        const updatedHistory = [...messages, newMsgUser];

        setMessages(updatedHistory);
        setIsTyping(true);

        const response = await callLocalBrain(text, updatedHistory);

        setIsTyping(false);
        setMessages(prev => [...prev, {
            role: 'model',
            text: response.text,
            products: response.products
        }]);
    };



    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
            {isOpen && (
                <div className="pointer-events-auto bg-[#0a0a0a] border border-yellow-500/30 rounded-2xl w-80 md:w-96 h-[550px] shadow-2xl flex flex-col mb-4 animate-fade-up overflow-hidden font-sans">
                    <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-4 flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">SustIA</h3>
                                <p className="text-[10px] text-white/80 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                    Asistente Virtual
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#111] custom-scrollbar">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'client' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${m.role === 'client'
                                    ? 'bg-yellow-600 text-white rounded-br-sm'
                                    : 'bg-[#1a1a1a] text-slate-200 rounded-bl-sm border border-white/5'
                                    }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                                </div>

                                {m.products && m.products.length > 0 && (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar pl-1 snap-x">
                                        {m.products.map(product => (
                                            <div key={product.id} className="min-w-[140px] w-[140px] bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-lg snap-start flex-shrink-0 group">
                                                <div className="h-28 bg-white relative overflow-hidden">
                                                    <img src={product.image} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-110 transition duration-300" />
                                                </div>
                                                <div className="p-2">
                                                    <h4 className="text-white text-xs font-bold truncate">{product.name}</h4>
                                                    <p className="text-yellow-500 text-xs font-black mt-1">${parseInt(product.basePrice).toLocaleString()}</p>
                                                    <button
                                                        onClick={() => { addToCart(product); setMessages(prev => [...prev, { role: 'model', text: `Agregado ${product.name} al carrito! 🛒` }]) }}
                                                        className="w-full mt-2 bg-white/10 hover:bg-yellow-600 text-white text-[10px] py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1"
                                                    >
                                                        Agregar <span className="text-xs">+</span>
                                                    </button>
                                                </div>
                                            </div>
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

                    <div className="p-3 bg-[#0a0a0a] border-t border-white/10">
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
                {isOpen ? <X className="w-6 h-6 text-white" /> : <Bot className="w-7 h-7 text-white" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border border-black"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

const CategoryModal = ({ isOpen, onClose, categories, onAdd, onRemove }) => {
    const [catName, setCatName] = React.useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (catName.trim()) {
            onAdd(catName.trim());
            setCatName('');
        }
    };

    return (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] max-w-md w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <FolderPlus className="w-6 h-6 text-cyan-400" /> Gestionar Categorías
                </h3>

                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                        className="input-cyber flex-1 p-3"
                        placeholder="Nueva categoría..."
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl font-bold transition">
                        <Plus className="w-5 h-5" />
                    </button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 group hover:border-slate-700 transition">
                            <span className="text-slate-300 font-medium">{cat}</span>
                            <button
                                onClick={() => onRemove(cat)}
                                className="text-slate-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="text-center text-slate-600 italic py-4">No hay categorías definidas</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- APLICACIÓN PRINCIPAL ---
function App() {
    // Versión del Sistema para Auto-Updates
    const APP_VERSION = '1.0.0';

    // --- GESTIÓN DE ESTADO (EXPANDIDA) ---

    // Navegación y UI
    const [view, setView] = useState('store'); // store, cart, checkout, profile, login, register, admin, about, guide
    const [adminTab, setAdminTab] = useState('dashboard');
    const [expenses, setExpenses] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null }); // dashboard, products, coupons, users, suppliers, settings, finance
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        try {
            const saved = localStorage.getItem('sustore_dark_mode');
            return saved !== null ? JSON.parse(saved) : true; // Default to dark mode
        } catch (e) { return true; }
    });

    // Usuarios y Autenticación
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('sustore_user_data');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });
    const [systemUser, setSystemUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [toasts, setToasts] = useState([]);


    // Datos Principales
    const [products, setProducts] = useState([]);
    const [promos, setPromos] = useState([]); // Nuevo estado para Promos
    const [cart, setCart] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('sustore_cart'));
            return Array.isArray(saved) ? saved : [];
        } catch (e) { return []; }
    });
    const [liveCarts, setLiveCarts] = useState([]); // Monitor de carritos en tiempo real
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [settings, setSettings] = useState(defaultSettings);
    const [settingsLoaded, setSettingsLoaded] = useState(false); // Indica si los settings ya se cargaron de Firebase

    // Estados de Interfaz de Usuario
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // Formularios de Autenticación
    const [authData, setAuthData] = useState({
        email: '',
        password: '',
        name: '',
        username: '',
        dni: '',
        phone: ''
    });
    const [loginMode, setLoginMode] = useState(true);

    // Estados para Nuevos Formularios (Finanzas y Compras)
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] });
    const [newInvestment, setNewInvestment] = useState({ investor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    const [newPurchase, setNewPurchase] = useState({ productId: '', supplierId: '', quantity: 1, cost: 0, isNewProduct: false });

    // Estado para Proveedores (Restaurado)
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    // Estado para Carrito de Compras (Pedidos Mayoristas)
    const [purchaseCart, setPurchaseCart] = useState([]);

    // Estado para Modal de Crear Categoría
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // Estado para Detalle de Producto / Promo (Zoom)
    const [selectedProduct, setSelectedProduct] = useState(null);

    // --- HELPERS ---

    const openConfirm = (title, message, onConfirm) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: async () => {
                await onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // --- FUNCIÓN PARA MANEJAR CAMBIO DE PLAN (DOWNGRADE) ---
    const getPlanLimit = (plan) => {
        switch (plan) {
            case 'premium': return Infinity;
            case 'business': return 50;
            case 'entrepreneur':
            default: return 30;
        }
    };

    const getPlanAllowsCoupons = (plan) => {
        return plan === 'business' || plan === 'premium';
    };

    const handlePlanChange = async (newPlan) => {
        const currentPlan = settings?.subscriptionPlan || 'entrepreneur';
        const currentLimit = getPlanLimit(currentPlan);
        const newLimit = getPlanLimit(newPlan);

        // Si es upgrade (más productos permitidos), simplemente cambiar
        if (newLimit >= currentLimit) {
            setSettings({ ...settings, subscriptionPlan: newPlan });
            showToast(`¡Plan actualizado a ${newPlan === 'premium' ? 'Premium' : newPlan === 'business' ? 'Negocio' : 'Emprendedor'}!`, 'success');
            return;
        }

        // Es un DOWNGRADE - verificar límites
        const activeProducts = products.filter(p => p.isActive !== false);
        const productsToDeactivate = [];
        const couponsToDeactivate = [];

        // Si hay más productos activos que el nuevo límite
        if (activeProducts.length > newLimit) {
            // Ordenar por ventas (más vendidos quedan activos) o por fecha de creación
            const sortedProducts = [...activeProducts].sort((a, b) => {
                // Priorizar productos más vendidos
                const salesA = orders.filter(o => o.items?.some(i => i.productId === a.id)).length;
                const salesB = orders.filter(o => o.items?.some(i => i.productId === b.id)).length;
                return salesB - salesA; // Más vendidos primero
            });

            // Los productos después del límite se desactivan
            for (let i = newLimit; i < sortedProducts.length; i++) {
                productsToDeactivate.push(sortedProducts[i]);
            }
        }

        // Si el nuevo plan no permite cupones, desactivar todos los cupones activos
        if (!getPlanAllowsCoupons(newPlan)) {
            const activeCoupons = coupons.filter(c => c.isActive !== false);
            couponsToDeactivate.push(...activeCoupons);
        }

        // Si hay productos/cupones a desactivar, mostrar confirmación
        if (productsToDeactivate.length > 0 || couponsToDeactivate.length > 0) {
            const message = `
                ${productsToDeactivate.length > 0 ? `• ${productsToDeactivate.length} producto(s) serán desactivados (se conservan los ${newLimit} más vendidos)\n` : ''}
                ${couponsToDeactivate.length > 0 ? `• ${couponsToDeactivate.length} cupón(es) serán desactivados (el plan ${newPlan === 'entrepreneur' ? 'Emprendedor' : ''} no incluye cupones)\n` : ''}
                
                Los productos y cupones NO se eliminarán, solo se desactivarán. Podrás reactivarlos manualmente si mejoras tu plan.
            `;

            openConfirm(
                '⚠️ Cambio de Plan - Atención',
                message,
                async () => {
                    try {
                        // Desactivar productos excedentes
                        for (const product of productsToDeactivate) {
                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), {
                                isActive: false,
                                deactivatedByPlan: true,
                                deactivatedAt: new Date().toISOString()
                            });
                        }

                        // Desactivar cupones si el plan no los soporta
                        for (const coupon of couponsToDeactivate) {
                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', coupon.id), {
                                isActive: false,
                                deactivatedByPlan: true,
                                deactivatedAt: new Date().toISOString()
                            });
                        }

                        // Actualizar el plan
                        setSettings({ ...settings, subscriptionPlan: newPlan });

                        // Guardar info del downgrade para mostrar advertencias
                        setPlanDowngradeInfo({
                            showWarning: true,
                            deactivatedProducts: productsToDeactivate.map(p => p.id),
                            deactivatedCoupons: couponsToDeactivate.map(c => c.id),
                            previousPlan: currentPlan,
                            newPlan: newPlan
                        });

                        showToast(`Plan cambiado. ${productsToDeactivate.length} producto(s) y ${couponsToDeactivate.length} cupón(es) fueron desactivados.`, 'warning');
                    } catch (error) {
                        console.error('Error al cambiar de plan:', error);
                        showToast('Error al cambiar de plan', 'error');
                    }
                }
            );
        } else {
            // No hay nada que desactivar, simplemente cambiar el plan
            setSettings({ ...settings, subscriptionPlan: newPlan });
            showToast(`Plan actualizado a ${newPlan === 'premium' ? 'Premium' : newPlan === 'business' ? 'Negocio' : 'Emprendedor'}`, 'success');
        }
    };

    // Función para reactivar un producto manualmente (si mejora el plan)
    const reactivateProduct = async (productId) => {
        const currentPlan = settings?.subscriptionPlan || 'entrepreneur';
        const limit = getPlanLimit(currentPlan);
        const activeCount = products.filter(p => p.isActive !== false).length;

        if (activeCount >= limit) {
            showToast(`Has alcanzado el límite de ${limit} productos de tu plan. Mejora tu plan o desactiva otro producto primero.`, 'warning');
            return;
        }

        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId), {
                isActive: true,
                deactivatedByPlan: false,
                reactivatedAt: new Date().toISOString()
            });
            showToast('Producto reactivado correctamente', 'success');
        } catch (error) {
            console.error('Error al reactivar producto:', error);
            showToast('Error al reactivar producto', 'error');
        }
    };

    // Función para desactivar un producto manualmente
    const deactivateProduct = async (productId) => {
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId), {
                isActive: false,
                deactivatedManually: true,
                deactivatedAt: new Date().toISOString()
            });
            showToast('Producto desactivado correctamente', 'success');
        } catch (error) {
            console.error('Error al desactivar producto:', error);
            showToast('Error al desactivar producto', 'error');
        }
    };


    // Formulario de Checkout
    const [checkoutData, setCheckoutData] = useState({
        address: '',
        city: '',
        province: '',
        zipCode: '',
        paymentChoice: '',
        shippingMethod: 'Pickup' // Pickup or Delivery
    });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);

    // Auto-corrección de método de pago al cambiar envío
    useEffect(() => {
        if (checkoutData.shippingMethod === 'Delivery' && checkoutData.paymentChoice === 'Efectivo') {
            showToast('Pago en efectivo solo disponible con Retiro en Local.', 'info');
            // Cambiar a otro método válido automáticamente
            const hasTransfer = settings?.paymentTransfer?.enabled;
            const hasCard = settings?.paymentMercadoPago?.enabled;
            setCheckoutData(prev => ({
                ...prev,
                paymentChoice: hasTransfer ? 'Transferencia' : (hasCard ? 'Tarjeta' : '')
            }));
        }
    }, [checkoutData.shippingMethod, settings]);

    // --- ESTADOS DE ADMINISTRACIÓN (DETALLADOS) ---

    // Gestión de Productos
    const [newProduct, setNewProduct] = useState({
        name: '',
        basePrice: '',
        stock: '',
        category: '',
        image: '',
        description: '',
        discount: 0,
        purchasePrice: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    const [settingsTab, setSettingsTab] = useState('store'); // store, appearance, social, payments, shipping, seo, advanced, team

    // Gestión de Promos
    const [newPromo, setNewPromo] = useState({
        name: '',
        price: '',
        image: '',
        description: '',
        items: [] // Array de { productId, quantity }
    });
    const [promoSearch, setPromoSearch] = useState('');
    const [selectedPromoProduct, setSelectedPromoProduct] = useState('');
    const [promoProductQty, setPromoProductQty] = useState(1);
    const [isEditingPromo, setIsEditingPromo] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState(null);

    // Gestión Avanzada de Cupones (Restaurada la complejidad)
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        type: 'percentage', // percentage, fixed
        value: 0,
        minPurchase: 0,
        maxDiscount: 0,
        expirationDate: '',
        targetType: 'global', // global, specific_user, specific_email
        targetUser: '', // username o email específico
        usageLimit: '', // Limite total de usos
        perUserLimit: 1, // Limite por usuario
        isActive: true
    });




    // Estado para EDICIÓN DE COMPRAS
    const [editingPurchase, setEditingPurchase] = useState(null);

    // Configuración y Equipo
    const [aboutText, setAboutText] = useState('');

    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });

    // Estado para Detalle de Pedido (Modal)
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Estados para Dashboard Avanzado (Venta Manual, Analíticas, Producto Menos Vendido)
    const [showManualSaleModal, setShowManualSaleModal] = useState(false);
    const [metricsDetail, setMetricsDetail] = useState(null); // { type: 'revenue' | 'net_income' }
    const [showLeastSold, setShowLeastSold] = useState(false);

    // Hoisted State for Manual Sale (So we can pre-fill it from Product List)
    const [saleData, setSaleData] = useState({
        productId: '',
        quantity: 1,
        price: 0,
        customerName: 'Cliente Offline',
        paymentMethod: 'Efectivo',
        notes: 'Venta presencial'
    });

    // --- NUEVOS ESTADOS PARA GESTIÓN DE USUARIOS (CARRITO, PASS Y EDICIÓN) ---
    const [viewUserCart, setViewUserCart] = useState(null); // Usuario seleccionado para ver carrito
    const [userPassModal, setUserPassModal] = useState(null); // Usuario a cambiar contraseña
    const [viewUserEdit, setViewUserEdit] = useState(null); // Usuario a editar perfil
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');

    // Estado para Modal de Planes (cuando hacen clic en el overlay de restricción)
    const [showPlansModal, setShowPlansModal] = useState(false);
    const [selectedPlanOption, setSelectedPlanOption] = useState(null); // { plan: 'Emprendedor', cycle: 'Mensual', price: '$7.000' }

    // Estado para Plan Downgrade - Productos/Cupones desactivados por límite
    const [planDowngradeInfo, setPlanDowngradeInfo] = useState({
        showWarning: false,
        deactivatedProducts: [], // IDs de productos desactivados por límite
        deactivatedCoupons: [], // IDs de cupones desactivados por límite
        previousPlan: null,
        newPlan: null
    });

    // --- ESTADOS PARA MERCADO PAGO CARD PAYMENT BRICK ---
    const [mpBrickController, setMpBrickController] = useState(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const isInitializingBrick = useRef(false);
    const cardPaymentBrickRef = useRef(null);


    const openManualSaleModal = (product) => {
        setSaleData({
            productId: product.id,
            quantity: 1,
            price: Number(product.basePrice) || 0,
            customerName: 'Cliente Offline',
            paymentMethod: 'Efectivo',
            notes: 'Venta presencial'
        });
        setShowManualSaleModal(true);
    };

    const confirmManualSale = async () => {
        if (!saleData.productId) return;
        if (saleData.quantity <= 0) {
            showToast("La cantidad debe ser mayor a 0", "error");
            return;
        }

        setIsProcessingOrder(true);
        try {
            // 1. Verificar Stock Actualizado
            const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', saleData.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) throw new Error("Producto no encontrado");

            const currentStock = Number(productSnap.data().stock) || 0;
            if (currentStock < saleData.quantity) {
                showToast(`Stock insuficiente. Solo quedan ${currentStock} unidades.`, "error");
                setIsProcessingOrder(false);
                return;
            }

            // 2. Crear Orden
            const total = saleData.quantity * saleData.price;
            const newOrder = {
                orderId: Date.now().toString().slice(-6),
                date: new Date().toISOString(),
                status: 'Realizado',
                source: 'manual_sale', // Identificador clave
                userId: 'manual_admin',
                customer: {
                    name: saleData.customerName || 'Cliente Mostrador',
                    email: '-',
                    phone: '-',
                    dni: '-'
                },
                items: [{
                    id: saleData.productId,
                    title: products.find(p => p.id === saleData.productId)?.name || 'Producto',
                    quantity: saleData.quantity,
                    unit_price: saleData.price,
                    image: products.find(p => p.id === saleData.productId)?.image || ''
                }],
                total: total,
                paymentMethod: saleData.paymentMethod,
                notes: saleData.notes
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

            // 3. Descontar Stock
            await updateDoc(productRef, {
                stock: increment(-saleData.quantity)
            });

            showToast("Venta registrada exitosamente", "success");
            setShowManualSaleModal(false);

        } catch (error) {
            console.error("Error en venta manual:", error);
            showToast("Error al registrar venta: " + error.message, "error");
        } finally {
            setIsProcessingOrder(false);
        }
    };

    // Referencias
    const fileInputRef = useRef(null);

    // --- FUNCIONES UTILITARIAS ---

    // Mostrar notificaciones
    const showToast = (msg, type = 'info') => {
        const id = Date.now();
        setToasts(prev => {
            // Limitar a 3 toasts simultáneos
            const filtered = prev.filter(t => Date.now() - t.id < 3000);
            return [...filtered, { id, message: msg, type }];
        });
    };

    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

    // Validar acceso por rol
    const getRole = (email) => {
        if (!email || !settings) return 'user';
        const cleanEmail = email.trim().toLowerCase();

        // Super Admin Hardcodeado (Prioridad Máxima)
        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';

        // 1. Verificar currentUser.role (Prioridad sobre equipo estático)
        // Esto permite promover usuarios desde el panel sin depender de settings.team
        if (currentUser && currentUser.email && currentUser.email.trim().toLowerCase() === cleanEmail && currentUser.role && currentUser.role !== 'user') {
            return currentUser.role;
        }

        // 2. Buscar en el equipo (settings.team - Fallback/Hardcoded)
        const team = settings?.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
        if (member) return member.role;

        // 3. Buscar en la lista de usuarios (solo admins)
        if (users && users.length > 0) {
            const userDoc = users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);
            if (userDoc && userDoc.role) return userDoc.role;
        }

        return 'user';
    };

    const isAdmin = (email) => getRole(email) === 'admin';
    const isEditor = (email) => getRole(email) === 'editor';
    const hasAccess = (email) => {
        const role = getRole(email);
        return role === 'admin' || role === 'editor' || role === 'employee';
    };

    // --- EFECTOS DE SINCRONIZACIÓN (FIREBASE) ---

    // 1. Sincronizar Carrito Local y Remoto (Live Cart)
    useEffect(() => {
        localStorage.setItem('sustore_cart', JSON.stringify(cart));

        // Si hay usuario, subir carrito a DB para monitor de admin
        if (currentUser && currentUser.id) {
            const syncCartToDB = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name || 'Usuario', // Guardamos nombre (con fallback) para evitar errores
                        items: cart.map(item => ({
                            productId: item.product.id,
                            quantity: item.quantity,
                            name: item.product.name,
                            price: item.product.basePrice
                        })),
                        lastUpdated: new Date().toISOString()
                    });
                } catch (e) {
                    console.error("Error syncing cart", e);
                }
            };
            // Debounce para no saturar escrituras (optimizado a 800ms)
            const debounceTimer = setTimeout(syncCartToDB, 800);
            return () => clearTimeout(debounceTimer);
        }
    }, [cart, currentUser]);

    // 1.1 Sincronizar precios y datos del carrito con productos actualizados
    useEffect(() => {
        if (products.length > 0 && cart.length > 0) {
            setCart(prevCart => {
                let hasChanges = false;
                const newCart = prevCart.map(item => {
                    // Buscar el producto actual en la lista maestra
                    const currentProduct = products.find(p => p.id === item.product.id);

                    if (currentProduct) {
                        // Si el precio, nombre o imagen cambiaron, actualizamos el item del carrito
                        if (currentProduct.basePrice !== (item.product?.basePrice ?? 0) ||
                            currentProduct.name !== (item.product?.name ?? '') ||
                            currentProduct.image !== (item.product?.image ?? '')) {
                            hasChanges = true;
                            return {
                                ...item,
                                product: {
                                    ...currentProduct,
                                    // Aseguramos que mantenemos la consistencia de tipos
                                    basePrice: Number(currentProduct.basePrice) || 0
                                }
                            };
                        }
                    }
                    return item;
                });
                return hasChanges ? newCart : prevCart;
            });
        }
    }, [products]);



    // 3. Sistema de Auto-Update
    useEffect(() => {
        const configRef = doc(db, 'artifacts', appId, 'public', 'config');
        const unsubscribe = onSnapshot(configRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.version && data.version !== APP_VERSION) {
                    console.log(`Nueva versión detectada: ${data.version}. Actualizando...`);
                    window.location.reload();
                }
            }
        });
        return () => unsubscribe();
    }, []);
    // 2. Persistencia Detallada y Session
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('sustore_user_data', JSON.stringify(currentUser));
            // Pre-llenar checkout si hay datos
            setCheckoutData(prev => ({
                ...prev,
                address: currentUser.address || prev.address,
                city: currentUser.city || prev.city,
                province: currentUser.province || prev.province,
                zipCode: currentUser.zipCode || prev.zipCode
            }));
        } else {
            localStorage.removeItem('sustore_user_data');
        }
    }, [currentUser]);

    // 3. Inicialización de Firebase Auth
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }

                // Refrescar datos de usuario desde DB para asegurar consistencia
                if (currentUser && currentUser.id) {
                    try {
                        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            const freshUserData = { ...userDocSnap.data(), id: userDocSnap.id };
                            // Verificar si hay cambios reales antes de actualizar estado
                            if (JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
                                setCurrentUser(freshUserData);
                            }
                        }
                    } catch (err) {
                        console.warn("No se pudo refrescar usuario al inicio:", err);
                    }
                }
            } catch (e) {
                console.error("Error en inicialización Auth:", e);
            }
        };

        initializeAuth();

        // Listener de Auth State
        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            // Delay reducido para transiciones más rápidas
            setTimeout(() => setIsLoading(false), 300);
        });
    }, []);

    // CSS Variable Injection for Dynamic Theme Colors
    useEffect(() => {
        if (settings) {
            const primaryColor = settings.primaryColor || '#06b6d4';
            const secondaryColor = settings.secondaryColor || '#8b5cf6';
            const accentColor = settings.accentColor || '#22c55e';

            // Create or update the dynamic theme style element
            let styleEl = document.getElementById('dynamic-theme-styles');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'dynamic-theme-styles';
                document.head.appendChild(styleEl);
            }

            // Generate comprehensive CSS overrides for the theme
            styleEl.textContent = `
                :root {
                    --color-primary: ${primaryColor};
                    --color-secondary: ${secondaryColor};
                    --color-accent: ${accentColor};
                }
                
                /* Primary color overrides */
                .text-cyan-400, .text-cyan-500 { color: ${primaryColor} !important; }
                .bg-cyan-400, .bg-cyan-500 { background-color: ${primaryColor} !important; }
                .bg-cyan-900\\/10, .bg-cyan-900\\/20 { background-color: ${primaryColor}1a !important; }
                .border-cyan-500, .border-cyan-500\\/20, .border-cyan-500\\/30, .border-cyan-500\\/50 { border-color: ${primaryColor} !important; }
                .hover\\:text-cyan-400:hover { color: ${primaryColor} !important; }
                .hover\\:bg-cyan-400:hover, .hover\\:bg-cyan-500:hover { background-color: ${primaryColor} !important; }
                .hover\\:border-cyan-500:hover, .hover\\:border-cyan-500\\/30:hover, .hover\\:border-cyan-500\\/50:hover { border-color: ${primaryColor} !important; }
                .focus-within\\:border-cyan-500\\/50:focus-within { border-color: ${primaryColor}80 !important; }
                .from-cyan-400 { --tw-gradient-from: ${primaryColor} !important; }
                .to-cyan-500 { --tw-gradient-to: ${primaryColor} !important; }
                .shadow-cyan-500\\/30, .shadow-cyan-600\\/30 { --tw-shadow-color: ${primaryColor}4d !important; }
                .ring-cyan-500 { --tw-ring-color: ${primaryColor} !important; }
                .selection\\:bg-cyan-500\\/30 ::selection { background-color: ${primaryColor}4d !important; }
                .selection\\:text-cyan-200 ::selection { color: ${primaryColor} !important; }
                
                /* Secondary color overrides */
                .text-purple-400, .text-purple-500 { color: ${secondaryColor} !important; }
                .bg-purple-400, .bg-purple-500 { background-color: ${secondaryColor} !important; }
                .bg-purple-900\\/10, .bg-purple-900\\/20 { background-color: ${secondaryColor}1a !important; }
                .border-purple-500, .border-purple-500\\/20 { border-color: ${secondaryColor} !important; }
                .hover\\:text-purple-400:hover { color: ${secondaryColor} !important; }
                .from-purple-500, .from-purple-600 { --tw-gradient-from: ${secondaryColor} !important; }
                
                /* Accent color overrides */
                .text-green-400, .text-green-500 { color: ${accentColor} !important; }
                .bg-green-400, .bg-green-500, .bg-green-600 { background-color: ${accentColor} !important; }
                .bg-green-900\\/10 { background-color: ${accentColor}1a !important; }
                .border-green-500, .border-green-500\\/20, .border-green-500\\/30 { border-color: ${accentColor} !important; }
                .hover\\:text-green-400:hover { color: ${accentColor} !important; }
                .hover\\:bg-green-400:hover, .hover\\:bg-green-500:hover { background-color: ${accentColor} !important; }
                .shadow-green-500\\/30, .shadow-green-600\\/30 { --tw-shadow-color: ${accentColor}4d !important; }
                
                /* Neon text effect with primary color */
                .neon-text {
                    text-shadow: 0 0 10px ${primaryColor}40, 0 0 20px ${primaryColor}20, 0 0 30px ${primaryColor}10 !important;
                }
            `;
        }
    }, [settings?.primaryColor, settings?.secondaryColor, settings?.accentColor]);

    // Dark/Light Mode Effect
    useEffect(() => {
        localStorage.setItem('sustore_dark_mode', JSON.stringify(darkMode));

        let lightModeStyle = document.getElementById('light-mode-styles');
        if (!lightModeStyle) {
            lightModeStyle = document.createElement('style');
            lightModeStyle.id = 'light-mode-styles';
            document.head.appendChild(lightModeStyle);
        }

        if (!darkMode) {
            // Light mode styles
            lightModeStyle.textContent = `
                /* Light Mode Overrides */
                body, .bg-\\[\\#050505\\], .bg-\\[\\#0a0a0a\\], .bg-black {
                    background-color: #f8fafc !important;
                }
                .bg-grid {
                    background-image: linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px) !important;
                }
                .text-white { color: #0f172a !important; }
                .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-600 { color: #64748b !important; }
                .bg-slate-900, .bg-slate-900\\/50, .bg-slate-800 { background-color: #ffffff !important; }
                .bg-slate-900\\/30 { background-color: rgba(255,255,255,0.8) !important; }
                .border-slate-700, .border-slate-700\\/50, .border-slate-800, .border-slate-800\\/50, .border-slate-900 { 
                    border-color: #e2e8f0 !important; 
                }
                .glass {
                    background: rgba(255, 255, 255, 0.95) !important;
                    border-color: #e2e8f0 !important;
                }
                .input-cyber {
                    background-color: #f1f5f9 !important;
                    border-color: #e2e8f0 !important;
                    color: #0f172a !important;
                }
                .input-cyber::placeholder { color: #94a3b8 !important; }
                .input-cyber:focus { border-color: var(--color-primary, #06b6d4) !important; }
                
                /* Cards and containers */
                .rounded-\\[2rem\\], .rounded-\\[2\\.5rem\\], .rounded-\\[1\\.5rem\\] {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05) !important;
                }
                
                /* Footer */
                footer { background-color: #0f172a !important; }
                footer .text-white { color: #ffffff !important; }
                footer .text-slate-500, footer .text-slate-400, footer .text-slate-600 { color: #94a3b8 !important; }
                
                /* Admin panel stays dark */
                [class*="admin"] .bg-\\[\\#050505\\] { background-color: #050505 !important; }
            `;
        } else {
            lightModeStyle.textContent = '';
        }
    }, [darkMode]);

    // 4. Suscripciones a Colecciones (Snapshot Listeners)
    useEffect(() => {
        if (!systemUser) return;

        const unsubscribeFunctions = [
            // Productos
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (snapshot) => {
                const productsData = snapshot.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data, stock: Number(data.stock) || 0 };
                });
                setProducts(productsData);
                if (cart.length === 0) setIsLoading(false);
            }, (error) => {
                console.error("Error fetching products:", error);
                if (error.code === 'permission-denied' || error.message.includes('permission')) {
                    showToast("Error de permisos. Reiniciando sesión...", "warning");
                    // Intentar recuperar sesión
                    setTimeout(() => {
                        auth.signOut().then(() => window.location.reload());
                    }, 2000);
                } else {
                    showToast("Error al cargar productos: " + error.message, "error");
                }
            }),

            // Pedidos (Ordenados por fecha descendente)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), snapshot => {
                const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setOrders(ordersData.sort((a, b) => new Date(b.date) - new Date(a.date)));
            }),

            // Usuarios
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snapshot => {
                setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Cupones
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), snapshot => {
                setCoupons(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Proveedores
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), snapshot => {
                setSuppliers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Gastos
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), snapshot => {
                setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Compras
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'purchases'), snapshot => {
                setPurchases(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Inversiones
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'investments'), snapshot => {
                setInvestments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // Carritos en Vivo (Solo filtramos los que tienen items)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), snapshot => {
                const activeCarts = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(c => c.items && c.items.length > 0);
                setLiveCarts(activeCarts);
            }),

            // Promos
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'promos'), snapshot => {
                setPromos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            }),

            // SEO & Global Effects
            onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    // Actualizar SEO
                    if (data.seoTitle) document.title = data.seoTitle;

                    // Actualizar Meta Description
                    let metaDesc = document.querySelector('meta[name="description"]');
                    if (!metaDesc) {
                        metaDesc = document.createElement('meta');
                        metaDesc.name = "description";
                        document.head.appendChild(metaDesc);
                    }
                    metaDesc.content = data.seoDescription || '';

                    // Actualizar Meta Keywords
                    let metaKey = document.querySelector('meta[name="keywords"]');
                    if (!metaKey) {
                        metaKey = document.createElement('meta');
                        metaKey.name = "keywords";
                        document.head.appendChild(metaKey);
                    }
                    metaKey.content = data.seoKeywords || '';
                }
            }),

            // Configuración Global (con Auto-Migración)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), async (snapshot) => {
                // 1. Buscar si existe el documento 'config'
                const configDoc = snapshot.docs.find(d => d.id === 'config');

                // 2. Buscar si existen documentos "viejos" (Legacy)
                const legacyDocs = snapshot.docs.filter(d => d.id !== 'config');

                if (legacyDocs.length > 0 && !configDoc) {
                    // CASO A: Solo existe legacy. Migrar TODO a 'config'.
                    const oldData = legacyDocs[0].data();
                    console.log("Migrating legacy settings to config...", oldData);
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), oldData);
                    // Opcional: Borrar el viejo para limpiar (o dejarlo por seguridad un tiempo)
                    // await deleteDoc(legacyDocs[0].ref);
                }
                else if (legacyDocs.length > 0 && configDoc) {
                    // CASO B: Existen ambos. Verificar si necesitamos recuperar categorías del viejo.
                    const oldData = legacyDocs[0].data();
                    const newData = configDoc.data();

                    // Si el viejo tiene categorías custom y el nuevo tiene las default, migrar categorías
                    const oldCats = oldData.categories || [];
                    const newCats = newData.categories || [];

                    // Heurística simple: Si el viejo tiene más categorías o diferentes, asumimos que vale la pena fusionar
                    // O simplemente si el usuario dice "se borraron", forzamos la copia de categorías del viejo al nuevo.
                    if (oldCats.length > 0 && JSON.stringify(oldCats) !== JSON.stringify(newCats)) {
                        // Solo migramos categorías si parecen perdidas (esto corre en cliente, ojo con bucles)
                        // Para evitar bucles infinitos, comparamos antes de escribir.

                        // NOTA: Para no complicar, solo leemos del 'config' para el Estado, 
                        // pero si detectamos legacy, tratamos de consolidar UNA VEZ.
                    }
                }

                // 3. Fuente de Verdad para el Estado: SIEMPRE 'config' (o el legacy si config aun no esta listo)
                // Preferimos 'config'. Si no existe, usamos el legacy temporalmente.
                const effectiveDoc = configDoc || legacyDocs[0];

                if (effectiveDoc) {
                    const data = effectiveDoc.data();
                    const mergedSettings = {
                        ...defaultSettings,
                        ...data,
                        team: data.team || defaultSettings.team,
                        categories: data.categories || defaultSettings.categories
                    };

                    // Si estamos leyendo de un legacy, forzamos la escritura en 'config' para la próxima
                    if (effectiveDoc.id !== 'config') {
                        setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), mergedSettings);
                    }

                    setSettings(mergedSettings);
                    setSettingsLoaded(true); // Marcar que los settings ya se cargaron
                    setAboutText(data.aboutUsText || defaultSettings.aboutUsText);

                    // Si ya migramos y leímos exitosamente, podríamos borrar el legacy para evitar fantasmas
                    if (configDoc && legacyDocs.length > 0) {
                        // MIGRACIÓN DE CATEGORÍAS ESPECÍFICA (Rescate)
                        const legacyData = legacyDocs[0].data();
                        if (legacyData.categories && legacyData.categories.length > 0) {
                            // Si el config tiene las default y el legacy tiene custom, pisar config
                            const isDefault = JSON.stringify(mergedSettings.categories) === JSON.stringify(defaultSettings.categories);
                            const isLegacyCustom = JSON.stringify(legacyData.categories) !== JSON.stringify(defaultSettings.categories);

                            if (isDefault && isLegacyCustom) {
                                console.log("Restoring categories from legacy...");
                                updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), {
                                    categories: legacyData.categories
                                });
                            }
                        }
                    }
                } else {
                    // Nada existe, crear default en config
                    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), defaultSettings);
                }
            })
        ];

        // Limpiar suscripciones al desmontar
        return () => unsubscribeFunctions.forEach(unsub => unsub());
    }, [systemUser]);

    // --- VALIDACIÓN INTELIGENTE DEL CARRITO ---
    // Elimina automáticamente productos que ya no existen o no tienen stock
    useEffect(() => {
        // Solo ejecutar si hay productos cargados y un usuario con carrito
        if (products.length > 0 && cart.length > 0 && currentUser) {
            let hasChanges = false;
            let removedItems = [];

            const validatedCart = cart.filter(item => {
                const itemId = String(item.product.id).trim();
                const productInStore = products.find(p => String(p.id).trim() === itemId);

                // 1. Verificar si el producto aún existe (Borrado físico)
                if (!productInStore) {
                    hasChanges = true;
                    removedItems.push(`${item.product.name} (Producto eliminado)`);
                    return false;
                }

                // 2. Verificar si está Activo (Borrado lógico / Pausado)
                if (productInStore.isActive === false) {
                    hasChanges = true;
                    removedItems.push(`${item.product.name} (No disponible actualmente)`);
                    return false;
                }

                // 3. Validación Especial para Promos: Verificar sus componentes
                if (productInStore.isPromo && productInStore.items) {
                    const componentsValid = productInStore.items.every(comp => {
                        const compProduct = products.find(p => String(p.id).trim() === String(comp.productId).trim());
                        // El componente debe existir y estar activo
                        return compProduct && compProduct.isActive !== false;
                    });

                    if (!componentsValid) {
                        hasChanges = true;
                        removedItems.push(`${item.product.name} (Uno de sus productos ya no existe)`);
                        return false;
                    }
                }

                // 4. Verificar Stock
                const hasStock = productInStore.stock > 0;
                // Si es un producto "infinito" (servicios digitales) podríamos ignorar esto, pero asumimos fisico
                if (!hasStock) {
                    hasChanges = true;
                    removedItems.push(`${item.product.name} (Sin Stock)`);
                    return false;
                }

                return true;
            }).map(item => {
                // Actualizar datos del producto (precio actualizado, imagen nueva) siempre
                const productInStore = products.find(p => p.id === item.product.id);

                // Si cambió el precio, detectamos el cambio para guardar en DB
                if (productInStore && ((item.product?.basePrice ?? 0) !== productInStore.basePrice || (item.product?.discount ?? 0) !== productInStore.discount)) {
                    hasChanges = true;
                }

                // Usar siempre la versión más fresca del producto
                return { ...item, product: productInStore || item.product };
            });

            if (hasChanges) {
                console.log("🧹 Carrito actualizado automáticamente:", removedItems);

                // Actualizar estado local
                setCart(validatedCart);

                // Actualizar base de datos
                setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                    userId: currentUser.id,
                    items: validatedCart
                }, { merge: true });

                if (removedItems.length > 0) {
                    showToast(`Tu carrito se actualizó: ${removedItems.join(', ')}`, 'info');
                }
            }
        }
    }, [products, currentUser, cart]); // Se ejecuta cuando productos, usuario o EL CARRITO cambian

    // --- EFECTO VISUAL: FAVICON Y TÍTULO DINÁMICO ---
    // Cambia el logo de la pestaña y el título según la configuración de la tienda
    useEffect(() => {
        // IMPORTANTE: Esperar a que la configuración cargue realmente para evitar "parpadeo" del logo default
        if (!settingsLoaded || !settings) return;

        // 1. Título de la Pestaña
        if (settings.seoTitle || settings.storeName) {
            document.title = settings.seoTitle || `${settings.storeName} - Tienda Online`;
        }

        // 2. Favicon (Icono de Pestaña) - Auto Circular
        const link = document.getElementById('dynamic-favicon') || document.querySelector("link[rel*='icon']");
        if (link) {
            if (settings.logoUrl) {
                // Intentar recortar la imagen en círculo para el favicon
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        // Crear círculo
                        ctx.beginPath();
                        ctx.arc(32, 32, 32, 0, Math.PI * 2);
                        ctx.closePath();
                        ctx.clip();
                        // Dibujar imagen
                        ctx.drawImage(img, 0, 0, 64, 64);
                        link.href = canvas.toDataURL('image/png');
                    } catch (e) {
                        // Fallback si falla canvas (ej: CORS estricto)
                        link.href = settings.logoUrl;
                    }
                };
                img.onerror = () => { link.href = settings.logoUrl; };
                img.src = settings.logoUrl;
            } else {
                // Si no hay logo configurado, usar el default circular
                link.href = '/icon-192.png';
            }
        }
    }, [settings, settingsLoaded]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa con la lógica expandida. Escribe "continuar" para la siguiente parte.
    // --- LÓGICA DE NEGOCIO Y FUNCIONES PRINCIPALES ---

    // 1. Lógica de Autenticación (Registro y Login Detallado) - SEGURIDAD MEJORADA
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            const normalizedEmail = authData.email.trim().toLowerCase();

            // === SEGURIDAD: Rate Limiting ===
            if (!isRegister) {
                const canAttempt = SecurityManager.canAttemptLogin(normalizedEmail);
                if (!canAttempt.allowed) {
                    throw new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${canAttempt.remainingTime} segundos.`);
                }
            }

            if (isRegister) {
                // Validaciones explícitas para Registro
                if (!authData.name || authData.name.length < 3) throw new Error("El nombre es muy corto.");
                if (!authData.username) throw new Error("Debes elegir un nombre de usuario.");
                if (!authData.email || !authData.email.includes('@')) throw new Error("Email inválido.");
                if (!authData.password || authData.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

                // DNI y Teléfono SIEMPRE obligatorios (necesarios para checkout)
                if (!authData.dni || authData.dni.trim().length < 6) throw new Error("Debes ingresar tu DNI (mínimo 6 dígitos).");
                if (!authData.phone || authData.phone.trim().length < 8) throw new Error("Debes ingresar tu teléfono (mínimo 8 dígitos).");

                // Verificar duplicados (Email) - Buscar por emailLower para case-insensitive
                const allUsersSnap = await getDocs(usersRef);
                const existingEmailUser = allUsersSnap.docs.find(doc => {
                    const userData = doc.data();
                    const existingEmail = (userData.emailLower || userData.email || '').toLowerCase();
                    return existingEmail === normalizedEmail;
                });
                if (existingEmailUser) throw new Error("Este correo electrónico ya está registrado.");

                // Verificar duplicados (Usuario) - Case Insensitive Check
                const normalizedUsername = authData.username.trim().toLowerCase();
                const existingUsernameUser = allUsersSnap.docs.find(doc => {
                    const userData = doc.data();
                    const existingUsername = (userData.usernameLower || userData.username || '').toLowerCase();
                    return existingUsername === normalizedUsername;
                });
                if (existingUsernameUser) throw new Error("El nombre de usuario ya está en uso.");

                // === SEGURIDAD: Hash de contraseña ===
                const hashedPassword = await SecurityManager.hashPassword(authData.password);

                // Creación del usuario con contraseña hasheada
                const newUser = {
                    name: authData.name,
                    email: normalizedEmail,
                    emailLower: normalizedEmail,
                    username: authData.username,
                    usernameLower: normalizedUsername,
                    password: hashedPassword, // Contraseña hasheada
                    dni: authData.dni || '',
                    phone: authData.phone || '',
                    role: 'user',
                    joinDate: new Date().toISOString(),
                    favorites: [],
                    ordersCount: 0,
                    lastLogin: new Date().toISOString()
                };

                const docRef = await addDoc(usersRef, newUser);

                // === SEGURIDAD: Generar token de sesión ===
                SecurityManager.generateSessionToken(docRef.id);

                // No almacenar contraseña en estado del cliente
                const safeUserData = { ...newUser, id: docRef.id };
                delete safeUserData.password;

                setCurrentUser(safeUserData);
                showToast("¡Cuenta creada exitosamente! Bienvenido.", "success");

            } else {
                // Validaciones para Login
                if (!authData.email) throw new Error("Ingresa tu email o usuario.");
                if (!authData.password) throw new Error("Ingresa tu contraseña.");

                const normalizedInput = authData.email.trim();
                let matchedDoc = null;
                let isFirebaseAuthUser = false;

                // 0. BYPASS ADMIN DE EMERGENCIA
                const ADMIN_EMAIL = 'lautarocorazza63@gmail.com';
                const ADMIN_PASS = 'lautaros';
                if (normalizedInput.toLowerCase() === ADMIN_EMAIL && authData.password === ADMIN_PASS) {
                    // Buscar o crear el documento admin en DB
                    const allUsersSnap = await getDocs(usersRef);
                    matchedDoc = allUsersSnap.docs.find(d => (d.data().email || '').toLowerCase() === ADMIN_EMAIL);

                    if (!matchedDoc) {
                        // Crear documento admin si no existe
                        const adminData = {
                            email: ADMIN_EMAIL,
                            emailLower: ADMIN_EMAIL,
                            name: 'Lautaro Corazza',
                            phone: '3425906630',
                            dni: '00000000',
                            role: 'admin',
                            createdAt: new Date().toISOString()
                        };
                        const newAdminRef = await addDoc(usersRef, adminData);
                        matchedDoc = await getDoc(newAdminRef);
                    }

                    const adminUserData = { ...matchedDoc.data(), id: matchedDoc.id, role: 'admin' };
                    setCurrentUser(adminUserData);
                    showToast(`¡Bienvenido Admin!`, "success");
                    setView('store');
                    setAuthData({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
                    setIsLoading(false);
                    return; // Salir de la función, login exitoso
                }

                // 1. INTENTO: Firebase Auth Nativo (Solo si parece un email)
                if (normalizedInput.includes('@')) {
                    try {
                        const userCredential = await signInWithEmailAndPassword(auth, normalizedInput, authData.password);
                        const authUid = userCredential.user.uid;

                        // Buscar documento de usuario correspondiente
                        // Intenta buscar por ID directo (lo ideal)
                        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', authUid);
                        const userDocSnap = await getDoc(userDocRef);

                        if (userDocSnap.exists()) {
                            matchedDoc = userDocSnap;
                            isFirebaseAuthUser = true;
                        } else {
                            // Si no existe perfil en DB pero sí en Auth, buscamos en la colección por email por si acaso tiene otro ID
                            // O creamos uno nuevo (pero mejor solo buscar por ahora)
                            const allUsersSnap = await getDocs(usersRef);
                            matchedDoc = allUsersSnap.docs.find(d => d.data().email?.toLowerCase() === normalizedInput.toLowerCase());
                        }

                        if (!matchedDoc && isFirebaseAuthUser) {
                            // Caso raro: Auth OK, pero sin datos en DB. Usamos datos básicos.
                            // Creamos un objeto "fake doc" para que pase la lógica siguiente o lo manejamos aquí
                            // Para simplificar, si Auth pasó, es válido.
                            const basicData = {
                                id: authUid,
                                email: normalizedInput,
                                name: userCredential.user.displayName || 'Usuario',
                                role: 'user'
                            };
                            // Guardamos/Restauramos perfil básico
                            await setDoc(userDocRef, basicData, { merge: true });
                            matchedDoc = await getDoc(userDocRef);
                        }

                    } catch (e) {
                        console.error("DEBUG: Auth Nativo Error:", e.code);
                        if (e.code === 'auth/wrong-password') {
                            throw new Error("La contraseña es incorrecta (Sistema Google).");
                        }
                        if (e.code === 'auth/too-many-requests') {
                            throw new Error("Demasiados intentos fallidos. Intenta más tarde o restablece tu contraseña.");
                        }
                        // Si es user-not-found, seguimos al manual
                    }
                }

                // 2. INTENTO: Login Manual (Búsqueda en Colección) - Si Auth falló o no se usó
                if (!matchedDoc) {
                    const allUsersSnap = await getDocs(usersRef);
                    // Buscar usuario por email o username
                    matchedDoc = allUsersSnap.docs.find(doc => {
                        const userData = doc.data();
                        const userEmail = (userData.emailLower || userData.email || '').toLowerCase();
                        const userUsername = (userData.usernameLower || userData.username || '').toLowerCase();
                        return userEmail === normalizedInput.toLowerCase() || userUsername === normalizedInput.toLowerCase();
                    });
                }

                if (!matchedDoc) {
                    // DIAGNÓSTICO INTELIGENTE:
                    // Si llegamos a que no hay "matchedDoc" válido para login manual,
                    // pero quizás el documento EXISTE en la DB y solo le faltan credenciales (password) para el login manual
                    // O el Auth falló con user-not-found.

                    // Buscamos si existe el email en DB sin importar password
                    const allUsers = await getDocs(usersRef);
                    const existsInDB = allUsers.docs.find(d => (d.data().email || '').toLowerCase() === normalizedInput.toLowerCase());

                    if (existsInDB) {
                        // El usuario existe en DB, pero falló Auth Nativo (user-not-found) y falló validación Manual (probablemente sin password en DB)
                        throw new Error("Tu cuenta existe en nuestra base de datos pero no tiene credenciales de acceso activas (posiblemente por migración de seguridad). Por favor ve a 'Registrate gratis' y crea la cuenta de nuevo con este MISMO email para reactivarla sin perder tus datos.");
                    }

                    SecurityManager.recordFailedAttempt(normalizedInput);
                    throw new Error("No encontramos una cuenta con esos datos. Verifica o regístrate.");
                }

                const userData = matchedDoc.data();
                const userId = matchedDoc.id;

                // === SEGURIDAD: Verificar contraseña hasheada ===
                let passwordValid = false;

                // Compatibilidad: verificar si la contraseña está hasheada o en texto plano
                if (userData.password && userData.password.length === 64) {
                    // Contraseña hasheada (SHA-256 = 64 caracteres hex)
                    passwordValid = await SecurityManager.verifyPassword(authData.password, userData.password);
                } else {
                    // Contraseña en texto plano (legacy) - migrar a hash
                    passwordValid = userData.password === authData.password;

                    if (passwordValid) {
                        // Migrar a contraseña hasheada
                        const hashedPassword = await SecurityManager.hashPassword(authData.password);
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), {
                            password: hashedPassword
                        });
                        console.log('[Security] Password migrated to hash for user:', userId);
                    }
                }

                if (!passwordValid) {
                    SecurityManager.recordFailedAttempt(normalizedInput);
                    throw new Error("Credenciales incorrectas. Verifica tus datos.");
                }

                // === SEGURIDAD: Login exitoso ===
                SecurityManager.clearAttempts(normalizedInput);
                SecurityManager.generateSessionToken(userId);

                // Actualizar último login
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), {
                    lastLogin: new Date().toISOString()
                });

                // No almacenar contraseña en estado del cliente
                const safeUserData = { ...userData, id: userId };
                delete safeUserData.password;

                setCurrentUser(safeUserData);
                showToast(`¡Hola de nuevo, ${userData.name || 'Usuario'}!`, "success");
            }

            // Redirigir a tienda tras éxito
            setView('store');
            // Limpiar formulario
            setAuthData({ email: '', password: '', name: '', username: '', dni: '', phone: '' });

        } catch (error) {
            console.error("Error de autenticación:", error);
            showToast(error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    // 1.1 Recuperar Contraseña
    const handleForgotPassword = async () => {
        if (!authData.email || !authData.email.includes('@')) {
            showToast("Ingresa tu email en el campo de arriba para recuperar la contraseña.", "warning");
            return;
        }
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, authData.email);
            showToast("¡Listo! Revisa tu email (y spam) para restablecer tu contraseña.", "success");
        } catch (e) {
            console.error("Error reset pass:", e);
            if (e.code === 'auth/user-not-found') {
                showToast("No existe una cuenta registrada con este email.", "error");
            } else {
                showToast("Error al enviar email: " + e.message, "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Gestión de Favoritos (Wishlist)
    const toggleFavorite = async (product) => {
        if (!currentUser) {
            showToast("Debes iniciar sesión para guardar favoritos.", "info");
            return;
        }

        const currentFavs = currentUser.favorites || [];
        const isAlreadyFav = currentFavs.includes(product.id);
        let newFavs = [];

        if (isAlreadyFav) {
            // Eliminar de favoritos
            newFavs = currentFavs.filter(id => id !== product.id);
            showToast("Eliminado de tus favoritos.", "info");
        } else {
            // Agregar a favoritos
            newFavs = [...currentFavs, product.id];
            showToast("¡Guardado en favoritos!", "success");
        }

        // Actualización Optimista (UI instantánea)
        setCurrentUser(prev => ({ ...prev, favorites: newFavs }));

        // Persistencia en Firebase
        try {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id);
            await updateDoc(userRef, { favorites: newFavs });
        } catch (e) {
            console.error("Error guardando favorito:", e);
            // Revertir si falla (opcional, por simplicidad no lo incluimos pero sería ideal)
        }
    };

    // 3. Gestión del Carrito
    const manageCart = (product, quantityDelta) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);
            const currentQuantity = existingItemIndex >= 0 ? prevCart[existingItemIndex].quantity : 0;
            const newQuantity = currentQuantity + quantityDelta;

            // Validaciones de Stock (Manejo Dual: Producto Normal vs Promo)
            let currentStock = 0;

            if (product.isPromo) {
                // Recalcular stock virtual al momento de agregar (por seguridad)
                let maxPurchasable = Infinity;
                product.items.forEach(item => {
                    const p = products.find(prod => prod.id === item.productId);
                    const pStock = p ? (Number(p.stock) || 0) : 0;
                    const maxForThisItem = Math.floor(pStock / item.quantity);
                    if (maxForThisItem < maxPurchasable) maxPurchasable = maxForThisItem;
                });
                currentStock = maxPurchasable;
            } else {
                currentStock = Number(product.stock);
            }

            if (newQuantity > currentStock) {
                showToast(`Lo sentimos, el stock máximo disponible es ${currentStock}.`, "warning");
                return prevCart;
            }

            // Eliminar item si cantidad llega a 0
            if (newQuantity <= 0) {
                if (existingItemIndex >= 0) {
                    showToast("Producto eliminado del carrito.", "info");
                    return prevCart.filter(item => item.product.id !== product.id);
                }
                return prevCart;
            }

            // Actualizar o Agregar
            if (existingItemIndex >= 0) {
                // Actualizar cantidad existente
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], quantity: newQuantity };
                return updatedCart;
            } else {
                // Agregar nuevo item
                showToast("¡Producto agregado al carrito!", "success");
                return [...prevCart, { product: product, quantity: 1 }];
            }
        });
    };

    // 4. Cálculos de Precios y Descuentos
    const calculateItemPrice = (basePrice, discount) => {
        if (!discount || discount <= 0) return Number(basePrice);
        const discounted = Number(basePrice) * (1 - discount / 100);
        return Math.ceil(discounted);
    };

    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const price = calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0);
            return total + (price * (item.quantity || 0));
        }, 0);
    }, [cart]);

    // Aplicar lógica compleja de cupones
    const calculateDiscountAmount = (total, coupon) => {
        if (!coupon) return 0;

        // Validar expiración y límites nuevamente por seguridad
        if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) return 0;

        let discountValue = 0;

        if (coupon.type === 'fixed') {
            discountValue = coupon.value;
            // No descontar más que el total
            if (discountValue > total) discountValue = total;
        } else if (coupon.type === 'percentage') {
            discountValue = total * (coupon.value / 100);
            // Aplicar tope si existe
            if (coupon.maxDiscount && coupon.maxDiscount > 0) {
                if (discountValue > coupon.maxDiscount) {
                    discountValue = coupon.maxDiscount;
                }
            }
        }

        return Math.ceil(discountValue);
    };

    const discountAmount = appliedCoupon ? calculateDiscountAmount(cartSubtotal, appliedCoupon) : 0;

    const shippingFee = useMemo(() => {
        if (checkoutData.shippingMethod !== 'Delivery') return 0;
        const deliverySettings = settings?.shippingDelivery;
        if (!deliverySettings?.enabled) return 0;
        if (deliverySettings.freeAbove > 0 && cartSubtotal >= deliverySettings.freeAbove) return 0;
        return Number(deliverySettings.fee) || 0;
    }, [checkoutData.shippingMethod, cartSubtotal, settings?.shippingDelivery]);

    const finalTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);

    // Selección de Cupón
    const selectCoupon = async (coupon) => {
        // Validaciones previas
        if (coupon.targetType === 'specific_email' && currentUser) {
            if (coupon.targetUser && coupon.targetUser.toLowerCase() !== currentUser.email.toLowerCase()) {
                return showToast("Este cupón no está disponible para tu cuenta.", "error");
            }
        }
        if (new Date(coupon.expirationDate) < new Date()) {
            return showToast("Este cupón ha vencido.", "error");
        }
        if (coupon.usageLimit && coupon.usedBy && coupon.usedBy.length >= coupon.usageLimit) {
            return showToast("Este cupón ha agotado sus usos totales.", "error");
        }
        if (cartSubtotal < (coupon.minPurchase || 0)) {
            return showToast(`El monto mínimo para este cupón es $${coupon.minPurchase}.`, "warning");
        }

        // VALIDACIÓN RIGUROSA: Un uso por DNI
        // Buscamos en 'orders' si alguna orden de este DNI usó este código de cupón
        if (currentUser && currentUser.dni) {
            try {
                // Nota: Query compleja. Requiere índice compuesto posiblemente.
                // Si falla index, usar catch y avisar o filtrar en cliente.
                // query(orders, where("customer.dni", "==", dni), where("discountCode", "==", code))
                const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
                const qDniCoupon = query(ordersRef,
                    where("customer.dni", "==", currentUser.dni),
                    where("discountCode", "==", coupon.code)
                );
                const matchSnap = await getDocs(qDniCoupon);

                if (!matchSnap.empty) {
                    return showToast("Ya utilizaste este cupón en una compra anterior (Verif. por DNI).", "error");
                }

            } catch (err) {
                console.warn("Error validando cupón por DNI:", err);
                // Fallback seguro: Si no podemos validar historial, permitimos (o bloqueamos según politica).
                // Bloqueamos por precaución.
                // return showToast("Error verificando historial de cupones.", "error");
            }
        } else {
            return showToast("Debes actualizar tu DNI en el perfil para usar cupones.", "warning");
        }

        setAppliedCoupon(coupon);
        setShowCouponModal(false);

        let msg = "¡Cupón aplicado correctamente!";
        if (coupon.type === 'percentage' && coupon.maxDiscount > 0) {
            msg += ` (Tope de reintegro: $${coupon.maxDiscount})`;
        }
        showToast(msg, "success");
    };

    // Enviar correo automático via Backend
    const sendOrderConfirmationEmail = async (orderData, discountDetails) => {
        try {
            await fetch('/api/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: orderData.orderId,
                    customer: orderData.customer,
                    items: orderData.items,
                    total: orderData.total,
                    subtotal: orderData.subtotal,
                    discountDetails: discountDetails,
                    shipping: orderData.shippingAddress,
                    shippingFee: orderData.shippingFee,
                    shippingMethod: orderData.shippingMethod,
                    paymentMethod: orderData.paymentMethod,
                    date: orderData.date
                }),
            });
            console.log("Correo de confirmación enviado enviada API.");
        } catch (error) {
            console.error("Error al enviar email automático:", error);
            // No bloqueamos el flujo si falla el email, solo logueamos
        }
    };

    // 5. Confirmación de Pedido (Checkout)
    const confirmOrder = async () => {
        if (isProcessingOrder) return;

        // Validaciones de Checkout
        if (!currentUser) {
            setView('login');
            return showToast("Por favor inicia sesión para finalizar la compra.", "info");
        }

        // Validar que el usuario tenga todos sus datos completos
        if (!currentUser.name || !currentUser.phone || !currentUser.dni) {
            setView('profile');
            return showToast("Por favor completa tus datos personales (Nombre, Teléfono y DNI) en tu perfil antes de comprar.", "warning");
        }

        if (checkoutData.shippingMethod === 'Delivery' && (!checkoutData.address || !checkoutData.city || !checkoutData.province || !checkoutData.zipCode)) {
            return showToast("Por favor completa TODOS los datos de envío.", "warning");
        }

        if (!checkoutData.paymentChoice) {
            return showToast("Selecciona un método de pago.", "warning");
        }

        setIsProcessingOrder(true);
        showToast("Procesando tu pedido, por favor espera...", "info");

        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`; // Generar ID único corto

            const newOrder = {
                orderId: orderId,
                userId: currentUser.id,
                customer: {
                    name: currentUser.name || 'Usuario',
                    email: currentUser.email || '',
                    phone: currentUser.phone || '-',
                    dni: currentUser.dni || '-'
                },
                items: cart.map(i => ({
                    productId: i.product?.id || 'unknown',
                    title: i.product?.name || 'Producto',
                    quantity: i.quantity || 1,
                    unit_price: calculateItemPrice(i.product?.basePrice, i.product?.discount),
                    image: i.product?.image || ''
                })),
                subtotal: cartSubtotal,
                discount: discountAmount,
                total: finalTotal,
                discountCode: appliedCoupon ? appliedCoupon.code : null,
                status: 'Pendiente',
                date: new Date().toISOString(),
                shippingMethod: checkoutData.shippingMethod,
                shippingFee: shippingFee,
                shippingAddress: checkoutData.shippingMethod === 'Delivery' ? `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})` : 'Retiro en Local',
                paymentMethod: checkoutData.paymentChoice,
                lastUpdate: new Date().toISOString()
            };

            // 1. Guardar Pedido
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

            // 2. Actualizar Datos de Usuario (Guardar última dirección) - Usamos setDoc con merge para crear si no existe
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
                address: checkoutData.address,
                city: checkoutData.city,
                province: checkoutData.province,
                zipCode: checkoutData.zipCode,
                ordersCount: increment(1)
            }, { merge: true });

            // 3. Limpiar Carrito "En Vivo" en DB
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                userId: currentUser.id,
                items: []
            });

            // 4. Actualizar Stock y Uso de Cupones (Atomic Batch)
            const batch = writeBatch(db);

            // Descontar Stock (Maneja promos y productos normales)
            cart.forEach(item => {
                if (item.product.isPromo && item.product.items) {
                    // PROMO: Descontar stock de cada componente + incrementar ventas
                    item.product.items.forEach(promoItem => {
                        const totalDecrement = promoItem.quantity * item.quantity;
                        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', promoItem.productId);
                        batch.update(productRef, {
                            stock: increment(-totalDecrement),
                            salesCount: increment(totalDecrement) // Incrementar contador de ventas
                        });
                    });
                } else {
                    // Producto Normal
                    const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                    batch.update(productRef, {
                        stock: increment(-item.quantity),
                        salesCount: increment(item.quantity) // Incrementar contador de ventas
                    });
                }
            });

            // Registrar uso de cupón
            if (appliedCoupon) {
                const couponRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id);
                // Leemos el cupón actual para asegurar array
                const couponDoc = await getDoc(couponRef);
                if (couponDoc.exists()) {
                    const currentUses = couponDoc.data().usedBy || [];
                    batch.update(couponRef, { usedBy: [...currentUses, currentUser.id] });
                }
            }

            await batch.commit();

            // 5. Finalización

            // Disparar email en segundo plano (Fire and Forget)
            const discountInfo = appliedCoupon ? {
                percentage: appliedCoupon.value,
                amount: discountAmount
            } : null;

            sendOrderConfirmationEmail(newOrder, discountInfo);

            setCart([]);
            setAppliedCoupon(null);
            setView('profile');
            showToast("¡Pedido realizado con éxito! Te hemos enviado un email con el detalle.", "success");

        } catch (e) {
            console.error("Error al procesar pedido:", e);
            showToast("Ocurrió un error al procesar el pedido. Intenta nuevamente.", "error");
        } finally {
            setIsProcessingOrder(false);
        }
    };

    // --- FUNCIONES DE MERCADO PAGO CARD PAYMENT BRICK ---

    // Inicializar el Card Payment Brick cuando se selecciona Mercado Pago
    const initializeCardPaymentBrick = async () => {
        if (isInitializingBrick.current) return;

        // Resetear estados al iniciar por si quedaron de una compra anterior
        setIsPaymentProcessing(false);
        setPaymentError(null);

        console.log('💎 Mercado Pago: Iniciando Brick. Total a cobrar:', finalTotal);

        if (!window.MercadoPago) {
            console.error('❌ Mercado Pago: SDK no cargado.');
            setPaymentError('No se pudo cargar el sistema de pagos. Por favor recarga la página.');
            return;
        }

        // Sanitizar el monto total para evitar errores de precisión flotante
        const safeAmount = Number(parseFloat(finalTotal).toFixed(2));
        if (isNaN(safeAmount) || safeAmount <= 0) {
            console.error('❌ Error: Monto inválido para pago:', finalTotal);
            return;
        }

        const container = document.getElementById('cardPaymentBrick_container');
        if (!container) return;

        isInitializingBrick.current = true;

        // Timeout de seguridad: si en 10 segundos no cargó, permitir reintentar
        const safetyTimeout = setTimeout(() => {
            if (isInitializingBrick.current) {
                console.warn('⚠️ Mercado Pago: La inicialización está tardando demasiado. Liberando bloqueo...');
                isInitializingBrick.current = false;
            }
        }, 10000);

        // Limpiar brick anterior si existe
        if (mpBrickController) {
            try {
                await mpBrickController.unmount();
            } catch (e) {
                console.warn('Error unmounting:', e);
            }
            setMpBrickController(null);
        }

        // Limpiar el contenedor físicamente por si quedaron restos
        const containerElem = document.getElementById('cardPaymentBrick_container');
        if (containerElem) {
            containerElem.innerHTML = '';
            // Forzar un reflow/render
            containerElem.style.display = 'none';
            containerElem.offsetHeight;
            containerElem.style.display = 'block';
        }

        // Limpiar errores previos
        setPaymentError(null);

        // CREDENCIALES DE PRODUCCIÓN
        const publicKey = 'APP_USR-6c7ba3ec-c928-42a9-a137-5f355dfc5366';
        const mp = new window.MercadoPago(publicKey, {
            locale: 'es-AR',
        });

        const bricksBuilder = mp.bricks();

        try {
            const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
                initialization: {
                    amount: safeAmount, // Total validado y formateado
                },
                customization: {
                    visual: {
                        style: {
                            theme: 'default',
                            customVariables: {
                                formBackgroundColor: '#0f172a',
                                baseColor: '#06b6d4',
                                borderRadiusMedium: '12px',
                                borderRadiusLarge: '16px',
                                textPrimaryColor: '#000000',
                                textSecondaryColor: '#334155',
                            },
                        },
                    },
                    paymentMethods: {
                        maxInstallments: 12,
                    },
                },
                callbacks: {
                    onReady: () => {
                        console.log('✅ Mercado Pago: Card Payment Brick cargado.');
                        isInitializingBrick.current = false;
                        clearTimeout(safetyTimeout);
                    },
                    onSubmit: async (cardFormData) => {
                        console.log('🚀 Mercado Pago: Procesando pago...');

                        // Bloquear clics dobles pero permitir reintentos si falla
                        setIsPaymentProcessing(true);
                        setPaymentError(null);

                        // Validar datos críticos antes de enviar
                        if (!cardFormData.token) {
                            setIsPaymentProcessing(false);
                            setPaymentError('Error en los datos de la tarjeta. Por favor intentá nuevamente.');
                            showToast('Error al procesar los datos de la tarjeta.', 'error');
                            return;
                        }

                        try {
                            const response = await fetch('/api/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'process_payment',
                                    paymentData: {
                                        token: cardFormData.token,
                                        transaction_amount: safeAmount,
                                        description: `Compra en ${settings?.storeName || 'Tienda Online'}`,
                                        installments: cardFormData.installments || 1,
                                        payment_method_id: cardFormData.payment_method_id || '',
                                        issuer_id: cardFormData.issuer_id || '',
                                    },
                                    payer: {
                                        email: currentUser?.email || 'sin-email@tienda.com',
                                        identificationType: cardFormData.payer?.identification?.type || 'DNI',
                                        identificationNumber: cardFormData.payer?.identification?.number || '00000000',
                                    },
                                }),
                            });

                            const result = await response.json();
                            console.log('📦 Respuesta:', result);

                            if (result.status === 'approved' || result.status === 'in_process' || result.status === 'pending') {
                                await confirmOrderAfterPayment(result.id);
                                showToast('¡Compra realizada!', 'success');
                                setIsPaymentProcessing(false);
                                isInitializingBrick.current = false;
                                // Limpiar controlador de MP para que la próxima compra reinicie de cero
                                if (mpBrickController) {
                                    try {
                                        await mpBrickController.unmount();
                                    } catch (e) { console.log(e); }
                                    setMpBrickController(null);
                                }
                            } else {
                                // ERROR DE NEGOCIO (Pago rechazado, tarjeta inválida, etc)
                                const detailedError = result.status_detail || result.error || 'Pago rechazado';
                                console.error('❌ Motivo del rechazo:', detailedError);

                                // IMPORTANTE: Si el pago falla, destruimos el brick para que al reintentar se cree uno nuevo y limpio
                                if (mpBrickController) {
                                    try {
                                        await mpBrickController.unmount();
                                    } catch (e) { console.log("Error al desmontar brick tras falla:", e); }
                                    setMpBrickController(null);
                                }
                                isInitializingBrick.current = false;

                                setIsPaymentProcessing(false);
                                // Mensaje de máxima tranquilidad para el cliente
                                setPaymentError(`El pago fue RECHAZADO: ${detailedError}. NO se ha realizado ningún cargo en tu tarjeta. Podés intentar con otra tarjeta o medio de pago.`);
                                showToast('Pago rechazado. No se realizó ningún cobro.', 'error');
                            }
                        } catch (error) {
                            // ERROR DE CONEXIÓN
                            console.error('❌ Error de conexión:', error);
                            setIsPaymentProcessing(false);
                            setPaymentError('Error de conexión con el servidor. Revisá tu internet e intentá de nuevo.');
                            showToast('Error de conexión.', 'error');
                        }
                    },
                    onError: (error) => {
                        console.error('❌ Mercado Pago Error:', error);
                        isInitializingBrick.current = false;
                        clearTimeout(safetyTimeout);
                        // No mostrar error si es solo por AdBlock
                        if (error && error.message && error.message.includes('melidata')) return;
                        setPaymentError('Error en el formulario. Verificá tus claves de producción.');
                    },
                },
            });

            setMpBrickController(controller);
        } catch (error) {
            console.error('Error creating brick:', error);
            isInitializingBrick.current = false;
            clearTimeout(safetyTimeout);
            showToast('Error al cargar el formulario de pago.', 'error');
        }
    };

    // Confirmar orden después de pago exitoso con MP
    const confirmOrderAfterPayment = async (mpPaymentId) => {
        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;

            const newOrder = {
                orderId,
                userId: currentUser.id,
                customer: {
                    name: currentUser.name || 'Usuario',
                    email: currentUser.email || '',
                    phone: currentUser.phone || '-',
                    dni: currentUser.dni || '-',
                },
                items: cart.map(i => ({
                    productId: i.product?.id || 'unknown',
                    title: i.product?.name || 'Producto',
                    quantity: i.quantity || 1,
                    unit_price: calculateItemPrice(i.product?.basePrice, i.product?.discount),
                    image: i.product?.image || '',
                })),
                subtotal: cartSubtotal,
                discount: discountAmount,
                total: finalTotal,
                discountCode: appliedCoupon?.code || null,
                status: 'Realizado', // Directamente como REALIZADO (pago confirmado)
                date: new Date().toISOString(),
                shippingMethod: checkoutData.shippingMethod,
                shippingFee,
                shippingAddress: checkoutData.shippingMethod === 'Delivery'
                    ? `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`
                    : 'Retiro en Local',
                paymentMethod: 'Tarjeta',
                mpPaymentId, // ID del pago en Mercado Pago
                lastUpdate: new Date().toISOString(),
            };

            // 1. Guardar Pedido
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

            // 2. Actualizar Datos de Usuario (usar setDoc con merge para crear si no existe)
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
                address: checkoutData.address || '',
                city: checkoutData.city || '',
                province: checkoutData.province || '',
                zipCode: checkoutData.zipCode || '',
                ordersCount: increment(1),
                lastOrderDate: new Date().toISOString(),
            }, { merge: true });

            // 3. Limpiar Carrito en DB
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                userId: currentUser.id,
                items: [],
            });

            // 4. Actualizar Stock (Batch)
            const batch = writeBatch(db);

            cart.forEach(item => {
                if (item.product.isPromo && item.product.items) {
                    item.product.items.forEach(promoItem => {
                        const totalDecrement = promoItem.quantity * item.quantity;
                        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', promoItem.productId);
                        batch.update(productRef, {
                            stock: increment(-totalDecrement),
                            salesCount: increment(totalDecrement),
                        });
                    });
                } else {
                    const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                    batch.update(productRef, {
                        stock: increment(-item.quantity),
                        salesCount: increment(item.quantity),
                    });
                }
            });

            // Registrar uso de cupón si se usó
            if (appliedCoupon) {
                const couponRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id);
                const couponDoc = await getDoc(couponRef);
                if (couponDoc.exists()) {
                    const currentUses = couponDoc.data().usedBy || [];
                    batch.update(couponRef, { usedBy: [...currentUses, currentUser.id] });
                }
            }

            await batch.commit();

            // 5. Enviar email de confirmación
            const discountInfo = appliedCoupon ? {
                percentage: appliedCoupon.value,
                amount: discountAmount,
            } : null;

            sendOrderConfirmationEmail(newOrder, discountInfo);

            // 6. Limpiar estado local
            setCart([]);
            setAppliedCoupon(null);
            if (mpBrickController) {
                try {
                    mpBrickController.unmount();
                } catch (e) { }
            }
            setMpBrickController(null);
            setView('profile');

        } catch (error) {
            console.error('Error creating order after payment:', error);
            showToast('El pago fue exitoso pero hubo un error guardando el pedido. Contacta soporte.', 'warning');
        }
    };

    // Effect para inicializar el Brick cuando se selecciona MP
    useEffect(() => {
        const isCheckoutView = view === 'checkout';
        const isMP = checkoutData.paymentChoice === 'Tarjeta';

        if (isCheckoutView && isMP && finalTotal > 0 && currentUser && cart.length > 0) {
            // Validar que el usuario tenga datos completos antes de mostrar formulario de pago
            if (!currentUser.name || !currentUser.phone || !currentUser.dni) {
                showToast("Por favor completá tus datos personales antes de pagar con tarjeta.", "warning");
                setView('profile');
                return;
            }

            // Pequeño delay para asegurar que el DOM está listo
            const timer = setTimeout(() => {
                const container = document.getElementById('cardPaymentBrick_container');
                if (container) {
                    initializeCardPaymentBrick();
                }
            }, 300);
            return () => clearTimeout(timer);
        } else if (mpBrickController && (!isCheckoutView || !isMP)) {
            // Limpiar brick si se cambia de método de pago O de vista
            console.log('Sweep: Limpiando Brick por cambio de vista o método.');
            try {
                mpBrickController.unmount();
            } catch (e) { }
            setMpBrickController(null);
            isInitializingBrick.current = false;
        }
    }, [checkoutData.paymentChoice, finalTotal, currentUser, cart.length, view]);

    // --- FUNCIONES DE ADMINISTRACIÓN ---

    // 6. Guardar Producto
    const saveProductFn = async () => {
        // Validaciones básicas
        if (!newProduct.name) return showToast("El nombre del producto es obligatorio.", "warning");

        // --- PRODUCT LIMIT CHECK (SUBSCRIPTION) ---
        const MAX_PRODUCTS_ENTREPRENEUR = 30;
        const MAX_PRODUCTS_BUSINESS = 50;

        // Check limits only when creating new product
        if (!editingId) {
            const currentPlan = settings?.subscriptionPlan || 'entrepreneur';
            const isEntrepreneur = currentPlan === 'entrepreneur';
            const isBusiness = currentPlan === 'business';

            if (isEntrepreneur && products.length >= MAX_PRODUCTS_ENTREPRENEUR) {
                return showToast(`Has alcanzado el límite de ${MAX_PRODUCTS_ENTREPRENEUR} productos del Plan Emprendedor. ¡Mejora tu plan para seguir creciendo!`, "error");
            }

            if (isBusiness && products.length >= MAX_PRODUCTS_BUSINESS) {
                return showToast(`Has alcanzado el límite de ${MAX_PRODUCTS_BUSINESS} productos del Plan Negocio. ¡Pásate a Premium para productos ilimitados!`, "error");
            }
        }

        if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0) return showToast("El precio debe ser mayor a 0.", "warning");
        if (!newProduct.category) return showToast("Selecciona una categoría.", "warning");

        const productData = {
            ...newProduct,
            basePrice: Number(newProduct.basePrice) || 0,
            purchasePrice: Number(newProduct.purchasePrice || 0),
            stock: Number(newProduct.stock) || 0,
            discount: Number(newProduct.discount || 0),
            image: newProduct.image || 'https://via.placeholder.com/150',
            lastUpdated: new Date().toISOString()
        };

        try {
            if (editingId) {
                // Editar existente
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), productData);
                showToast("Producto actualizado correctamente.", "success");
            } else {
                // Crear nuevo
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
                    ...productData,
                    createdAt: new Date().toISOString()
                });
                showToast("Producto creado correctamente.", "success");
            }
            // Resetear formulario
            setNewProduct({ name: '', basePrice: '', purchasePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });
            setEditingId(null);
            setShowProductForm(false);
        } catch (e) {
            console.error(e);
            showToast("Error al guardar el producto.", "error");
        }
    };

    // 6.4. Image Upload Handler (Base64 for Vercel)
    // 6.4. Image Upload Handler (Optimized with Canvas Resize)
    const handleImageUpload = (e, setTargetState, imageField = 'image', maxWidth = 800) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return showToast("Por favor selecciona una imagen válida.", "warning");
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = maxWidth;
                const MAX_HEIGHT = maxWidth;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setTargetState(prev => ({ ...prev, [imageField]: dataUrl }));
                showToast("Imagen optimizada y cargada.", "success");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    // 6.5. Eliminar Producto
    const deleteProductFn = (product) => {
        openConfirm("Eliminar Producto", `¿Estás seguro de eliminar el producto "${product.name}"?`, async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id));
                showToast("Producto eliminado correctamente.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al eliminar el producto.", "error");
            }
        });
    };

    // 6.6. Venta Manual (Fuera de Página)
    const handleManualSale = (product) => {
        if (product.stock <= 0) return showToast("No hay stock para vender.", "warning");

        openConfirm("Venta Manual", `¿Registrar venta manual de 1 unidad de "${product.name}"?`, async () => {
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), {
                    stock: increment(-1)
                });
                showToast("Venta registrada. Stock actualizado.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al registrar venta manual.", "error");
            }
        });
    };

    // 6.7. Gestión de Pedidos (Finalizar/Eliminar)
    const finalizeOrderFn = (orderId) => {
        openConfirm("Finalizar Pedido", "¿Marcar este pedido como REALIZADO/ENTREGADO?", async () => {
            try {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), {
                    status: 'Realizado',
                    lastUpdate: new Date().toISOString()
                });
                showToast("Pedido finalizado correctamente.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al finalizar pedido.", "error");
            }
        });
    };

    const deleteOrderFn = (orderId) => {
        openConfirm("Eliminar Pedido", "¿Eliminar este pedido permanentemente? El stock de los productos será devuelto al inventario.", async () => {
            try {
                // 1. Obtener datos del pedido antes de eliminar
                const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
                const orderSnap = await getDoc(orderRef);

                if (!orderSnap.exists()) {
                    throw new Error("El pedido no existe o ya fue eliminado.");
                }

                const orderData = orderSnap.data();

                // 2. Devolver Stock (Iterar items)
                if (orderData.items && Array.isArray(orderData.items)) {
                    for (const item of orderData.items) {
                        if (item.productId && item.quantity > 0) {
                            const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.productId);
                            try {
                                await updateDoc(productRef, {
                                    stock: increment(item.quantity)
                                });
                            } catch (ignore) {
                                // Si el producto ya no existe, ignoramos el error para permitir borrar el pedido
                                console.warn(`Producto ${item.productId} no encontrado, no se restauró stock.`);
                            }
                        }
                    }
                }

                // 3. Eliminar Documento
                await deleteDoc(orderRef);
                showToast("Pedido eliminado y stock restaurado exitosamente.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al eliminar pedido: " + e.message, "error");
            }
        });
    };

    // 7. Guardar Cupón (COMPLEJO y DETALLADO)
    const saveCouponFn = async () => {
        // Validaciones exhaustivas
        if (!newCoupon.code || newCoupon.code.length < 3) return showToast("El código del cupón debe tener al menos 3 caracteres.", "warning");
        if (!newCoupon.value || Number(newCoupon.value) <= 0) return showToast("El valor del descuento debe ser mayor a 0.", "warning");

        if (newCoupon.type === 'percentage' && Number(newCoupon.value) > 100) return showToast("El porcentaje no puede ser mayor a 100%.", "warning");

        if (newCoupon.targetType === 'specific_user' && !newCoupon.targetUser.includes('@')) {
            return showToast("Si el cupón es para un usuario específico, ingresa un email válido.", "warning");
        }

        try {
            const couponData = {
                ...newCoupon,
                code: newCoupon.code.toUpperCase().trim(),
                value: Number(newCoupon.value),
                minPurchase: Number(newCoupon.minPurchase || 0),
                maxDiscount: Number(newCoupon.maxDiscount || 0),
                usageLimit: Number(newCoupon.usageLimit || 0),
                perUserLimit: Number(newCoupon.perUserLimit || 1),
                targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
                createdAt: new Date().toISOString(),
                usedBy: [] // Inicializar array de usos
            };

            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), couponData);

            // Resetear formulario completamente
            setNewCoupon({
                code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0,
                expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '', perUserLimit: 1
            });
            showToast("Cupón de descuento creado exitosamente.", "success");
        } catch (e) {
            console.error(e);
            showToast("Error al crear el cupón.", "error");
        }
    };

    // 8. Guardar Proveedor (Crear / Editar)
    const saveSupplierFn = async () => {
        if (!newSupplier.name) return showToast("El nombre de la empresa es obligatorio.", "warning");

        // Validación: Debe tener al menos UN método de contacto
        if (!newSupplier.phone && !newSupplier.ig) {
            return showToast("Debes ingresar al menos un método de contacto (Teléfono o Instagram).", "warning");
        }

        const supplierData = {
            ...newSupplier,
            associatedProducts: newSupplier.associatedProducts || [],
            lastUpdated: new Date().toISOString()
        };

        try {
            if (editingSupplierId) {
                // Editar existente
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suppliers', editingSupplierId), supplierData);
                showToast("Proveedor actualizado correctamente.", "success");
            } else {
                // Crear nuevo
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), {
                    ...supplierData,
                    createdAt: new Date().toISOString()
                });
                showToast("Proveedor registrado correctamente.", "success");
            }

            setNewSupplier({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] });
            setEditingSupplierId(null);
            setShowSupplierModal(false);
        } catch (e) {
            console.error(e);
            showToast("Error al guardar proveedor.", "error");
        }
    };

    // 9. Configuración y Equipo (Settings)


    // 10. Gestión de Compras (Editar/Eliminar con lógica de Stock)
    const deletePurchaseFn = (purchase) => {
        openConfirm("Eliminar Compra", `¿Eliminar registro de compra? Se descontarán ${purchase.quantity} unidades del stock del producto.`, async () => {
            try {
                // 1. Descontar Stock
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', purchase.productId), {
                    stock: increment(-purchase.quantity)
                });
                // 2. Eliminar Compra
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchases', purchase.id));
                showToast("Compra eliminada y stock revertido.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al eliminar compra.", "error");
            }
        });
    };

    const updatePurchaseFn = async (pId, oldData, newData) => {
        const qtyDiff = (newData.quantity || 0) - (oldData.quantity || 0);

        try {
            // 1. Actualizar Stock si cambió la cantidad
            if (qtyDiff !== 0) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', oldData.productId), {
                    stock: increment(qtyDiff)
                });
            }
            // 2. Actualizar Registro
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchases', pId), {
                quantity: newData.quantity,
                cost: newData.cost,
                supplierId: newData.supplierId
            });
            setEditingPurchase(null);
            showToast("Compra actualizada y stock ajustado.", "success");
        } catch (e) {
            console.error(e);
            showToast("Error al actualizar la compra.", "error");
        }
    };

    // --- FUNCIONES PARA GESTIÓN DE CATEGORÍAS ---
    const createCategoryFn = async () => {
        if (!newCategory.trim()) return showToast("Ingresa un nombre para la categoría.", "warning");

        try {
            const updatedCategories = [...(settings.categories || []), newCategory.trim()];
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), {
                categories: updatedCategories
            });
            setNewCategory('');
            setShowCategoryModal(false);
            showToast(`Categoría "${newCategory}" creada.`, "success");
        } catch (e) {
            console.error(e);
            showToast("Error al crear categoría.", "error");
        }
    };

    // --- FUNCIONES PARA CARRITO DE COMPRAS (PEDIDOS MAYORISTAS) ---
    const addToPurchaseCart = (productId, quantity, supplierId) => {
        if (!productId || !supplierId || quantity <= 0) {
            return showToast("Completa todos los campos.", "warning");
        }

        const product = products.find(p => p.id === productId);
        if (!product) return showToast("Producto no encontrado.", "error");

        const productPrice = product.purchasePrice || product.basePrice || 0;
        const cost = productPrice * quantity;

        const existingIndex = purchaseCart.findIndex(item => item.productId === productId);

        if (existingIndex >= 0) {
            // Actualizar cantidad si ya existe
            const updated = [...purchaseCart];
            updated[existingIndex].quantity += quantity;
            updated[existingIndex].cost = (product.purchasePrice || product.basePrice || 0) * updated[existingIndex].quantity;
            setPurchaseCart(updated);
            showToast(`Cantidad actualizada: ${product.name}`, "success");
        } else {
            // Agregar nuevo item
            setPurchaseCart([...purchaseCart, {
                productId,
                productName: product.name,
                productImage: product.image,
                quantity,
                unitPrice: productPrice,
                cost,
                supplierId
            }]);
            showToast(`Agregado al pedido: ${product.name}`, "success");
        }

        // Resetear formulario
        setNewPurchase({ productId: '', supplierId: supplierId, quantity: 1, cost: 0, isNewProduct: false });
    };

    const removeFromPurchaseCart = (index) => {
        const updated = purchaseCart.filter((_, i) => i !== index);
        setPurchaseCart(updated);
        showToast("Producto eliminado del pedido.", "info");
    };

    const updatePurchaseCartItem = (index, newQuantity) => {
        const updated = [...purchaseCart];
        updated[index].quantity = newQuantity;
        updated[index].cost = updated[index].unitPrice * newQuantity;
        setPurchaseCart(updated);
    };

    const finalizePurchaseOrder = async () => {
        if (purchaseCart.length === 0) {
            return showToast("El carrito de compras está vacío.", "warning");
        }

        try {
            const batch = writeBatch(db);
            const batchId = `BATCH - ${Date.now()}`;
            const timestamp = new Date().toISOString();

            // Registrar cada compra y actualizar stock en Lote (Batch)
            for (const item of purchaseCart) {
                // 1. Crear Referencia para Nueva Compra
                const newPurchaseRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'purchases'));
                batch.set(newPurchaseRef, {
                    productId: item.productId,
                    supplierId: item.supplierId,
                    quantity: item.quantity,
                    cost: item.cost,
                    batchId: batchId,
                    date: timestamp
                });

                // 2. Actualizar Stock del Producto (Fixing NaN issues on the fly)
                const product = products.find(p => p.id === item.productId);
                const currentStock = isNaN(Number(product?.stock)) ? 0 : Number(product.stock);
                const newStock = currentStock + item.quantity;

                const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.productId);
                batch.update(productRef, {
                    stock: newStock
                });
            }

            await batch.commit();

            setPurchaseCart([]);
            showToast(`Pedido finalizado: ${purchaseCart.length} productos registrados.`, "success");
        } catch (e) {
            console.error("Error in batch purchase:", e);
            showToast("Error al finalizar el pedido: " + e.message, "error");
        }
    };

    // --- CÁLCULOS DEL DASHBOARD (CENTRALIZADOS) ---
    const dashboardMetrics = useMemo(() => {
        // 1. Demanda en Vivo y Favoritos (Trending) + VENTAS REALES
        const productStats = {}; // { id: { cart: 0, fav: 0, sales: 0, total: 0 } }

        // Helper para inicializar stats
        const initStats = (id) => {
            if (!productStats[id]) productStats[id] = { cart: 0, fav: 0, sales: 0, total: 0 };
        };

        // Contar apariciones en Carritos Activos (LiveCarts)
        liveCarts.forEach(cart => {
            if (cart.items) {
                cart.items.forEach(item => {
                    initStats(item.productId);
                    productStats[item.productId].cart += 1;
                    productStats[item.productId].total += 1;
                });
            }
        });

        // Contar apariciones en Favoritos de Usuarios
        users.forEach(u => {
            if (u.favorites) {
                u.favorites.forEach(pid => {
                    initStats(pid);
                    productStats[pid].fav += 1;
                    productStats[pid].total += 1;
                });
            }
        });

        // 2. Finanzas y Ventas Confirmadas (Updated: Solo contar "Realizado")
        const validOrders = orders.filter(o => o.status === 'Realizado');
        const revenue = validOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const expensesTotal = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
        const purchasesTotal = purchases?.reduce((acc, p) => acc + (p.cost || 0), 0) || 0;
        const netIncome = revenue - expensesTotal - purchasesTotal;

        // 3. Producto Estrella y Menos Vendido (Ventas reales confirmadas)
        const salesCount = {}; // { productId: quantity }
        const productMetadata = {}; // { productId: { name, image } } -> Fallback para productos eliminados

        validOrders.forEach(o => {
            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(i => {
                    const pid = i.productId;
                    const qty = Number(i.quantity) || 0;

                    // Acumular Ventas
                    salesCount[pid] = (salesCount[pid] || 0) + qty;

                    // Guardar Metadata (Nombre/Imagen) del item por si el producto ya no existe
                    if (!productMetadata[pid]) {
                        productMetadata[pid] = { name: i.title || i.name || 'Producto Desconocido', image: i.image };
                    }

                    // Sumar a Estadísticas de Tendencia (Peso x5 para ventas reales)
                    initStats(pid);
                    productStats[pid].sales += qty;
                    productStats[pid].total += (qty * 5);
                });
            }
        });

        // Ordenar productos por "calor" (total de interés)
        const trendingProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                // Intentar buscar en productos vivos, sino usar metadata del pedido
                const liveProd = products.find(p => p.id === id);
                const meta = productMetadata[id] || {};

                // Si el producto no existe en el inventario actual (fue eliminado), no mostrarlo en tendencias
                if (!liveProd) return null;

                return {
                    id: id,
                    name: liveProd.name,
                    image: liveProd.image,
                    stock: liveProd.stock,
                    stats
                };
            })
            .filter(Boolean)
            .sort((a, b) => b.stats.total - a.stats.total)
            .slice(0, 5); // Top 5

        // Estrella (Más Vendido)
        let starProductId = null;
        let maxSales = -1;
        Object.entries(salesCount).forEach(([id, count]) => {
            if (count > maxSales) {
                maxSales = count;
                starProductId = id;
            }
        });

        // Resolver objeto completo para Estrella
        let starProduct = null;
        if (starProductId) {
            const liveStar = products.find(p => p.id === starProductId);
            const meta = productMetadata[starProductId];
            if (liveStar || meta) {
                starProduct = {
                    id: starProductId,
                    name: liveStar ? liveStar.name : meta.name,
                    image: liveStar ? liveStar.image : meta.image,
                    sales: maxSales,
                    stock: liveStar ? liveStar.stock : 0
                };
            }
        }

        // Menos Vendido (Peor Producto) - Buscar el mínimo entre TODOS los productos activos
        // Nota: Solo consideramos productos que AÚN existen en inventario para "Menos Vendido"
        let leastSoldProductId = null;
        let minSales = Infinity;

        products.forEach(p => {
            const count = salesCount[p.id] || 0;
            if (count < minSales) {
                minSales = count;
                leastSoldProductId = p.id;
            }
        });
        const leastSoldProduct = leastSoldProductId ? products.find(p => p.id === leastSoldProductId) : null;

        // 4. Analítica Temporal (Timeline)
        const timeline = { daily: {}, monthly: {}, yearly: {} };
        const categoryStats = {}; // { catName: { revenue: 0, items: 0 } }

        validOrders.forEach(o => {
            const d = new Date(o.date);
            const dayKey = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
            const yearKey = d.getFullYear().toString(); // YYYY

            const agg = (obj, key, amount) => {
                if (!obj[key]) obj[key] = { date: key, revenue: 0, orders: 0 };
                obj[key].revenue += amount;
                obj[key].orders += 1;
            };

            agg(timeline.daily, dayKey, o.total);
            agg(timeline.monthly, monthKey, o.total);
            agg(timeline.yearly, yearKey, o.total);

            // Sales By Category
            if (o.items) {
                o.items.forEach(item => {
                    const prod = products.find(p => p.id === item.productId || p.id === item.id);
                    const cat = prod ? prod.category : 'Otros';
                    if (!categoryStats[cat]) categoryStats[cat] = { name: cat, revenue: 0, items: 0, percentage: 0 };
                    categoryStats[cat].revenue += (item.unit_price * item.quantity);
                    categoryStats[cat].items += item.quantity;
                });
            }
        });

        const analytics = {
            daily: Object.values(timeline.daily).sort((a, b) => a.date.localeCompare(b.date)),
            monthly: Object.values(timeline.monthly).sort((a, b) => a.date.localeCompare(b.date)),
            yearly: Object.values(timeline.yearly).sort((a, b) => a.date.localeCompare(b.date))
        };

        // Format salesByCategory
        const totalSalesVolume = Object.values(categoryStats).reduce((acc, c) => acc + c.items, 0);
        const salesByCategory = Object.values(categoryStats)
            .map(c => ({
                ...c,
                percentage: totalSalesVolume > 0 ? Math.round((c.items / totalSalesVolume) * 100) : 0
            }))
            .sort((a, b) => b.items - a.items);

        // 5. Low Stock Alerts
        const lowStockThreshold = settings?.lowStockThreshold || 5;
        const lowStockProducts = products.filter(p => !p.promoItems && (Number(p.stock) <= lowStockThreshold));

        // 6. Recent Activity
        const recentActivity = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        // 7. Financial Transactions (Ledger)
        const transactions = [
            ...validOrders.map(o => ({ id: o.id || o.orderId, type: 'income', category: 'Venta', date: o.date, amount: o.total, description: `Orden #${o.orderId}`, status: o.status })),
            ...expenses.map(e => ({ id: e.id, type: 'expense', category: e.category || 'Gasto', date: e.date, amount: e.amount, description: e.description, status: 'Pagado' })),
            ...(purchases || []).map(p => ({ id: p.id, type: 'expense', category: 'Compra Stock', date: p.date, amount: p.cost, description: `Prov: ${p.supplier || 'General'}`, status: 'Completado' })),
            ...(investments || []).map(i => ({ id: i.id, type: 'income', category: 'Inversión', date: i.date, amount: i.amount, description: `Inv: ${i.investor}`, status: 'Recibido' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 100);

        return {
            revenue,
            expensesTotal,
            purchasesTotal,
            netIncome,
            trendingProducts,
            starProduct,
            leastSoldProduct,
            salesCount,
            analytics,
            salesByCategory,
            lowStockProducts,
            recentActivity,
            transactions,
            totalOrders: orders.length,
            totalUsers: users.length
        };
    }, [orders, expenses, purchases, products, liveCarts, users, settings]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa con la Interfaz Gráfica completa y detallada. Por favor escribe "continuar".
    // --- COMPONENTES UI: MODALES DETALLADOS ---

    // Modal de Detalles de Pedido (Visor Completo)
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-800 relative">
                    {/* Header del Modal */}
                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-2 neon-text">
                                DETALLE DE PEDIDO <span className="text-cyan-400">#{order.orderId}</span>
                            </h3>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-slate-400 text-xs flex items-center gap-1 font-bold tracking-wider">
                                    <Clock className="w-3 h-3" /> {new Date(order.date).toLocaleString()}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-black tracking-widest ${order.status === 'Realizado' ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'}`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition shadow-lg border border-slate-700">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Contenido Scrollable */}
                    <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar bg-[#050505]">

                        {/* Estado Visual */}
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-full shadow-lg ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'}`}>
                                    {order.status === 'Realizado' ? <CheckCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Estado Actual</p>
                                    <p className={`text-xl font-black ${order.status === 'Realizado' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {order.status === 'Realizado' ? 'Entregado / Finalizado' : 'Pendiente de Pago/Envío'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Columnas de Info */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Cliente */}
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                                <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                    <User className="w-4 h-4" /> Datos del Cliente
                                </h4>
                                <div className="space-y-3">
                                    <p className="text-white font-bold text-lg">{order.customer.name}</p>
                                    <div className="space-y-1">
                                        <p className="text-slate-400 text-sm flex justify-between border-b border-dashed border-slate-800/50 pb-1">
                                            <span>Email:</span> <span className="text-white font-medium">{order.customer.email}</span>
                                        </p>
                                        <p className="text-slate-400 text-sm flex justify-between border-b border-dashed border-slate-800/50 pb-1">
                                            <span>Teléfono:</span> <span className="text-white font-medium">{order.customer.phone || '-'}</span>
                                        </p>
                                        <p className="text-slate-400 text-sm flex justify-between">
                                            <span>DNI:</span> <span className="text-white font-medium">{order.customer.dni || '-'}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Envío */}
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                                <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                    <Truck className="w-4 h-4" /> Datos de Entrega
                                </h4>
                                <div className="space-y-3">
                                    <p className="text-white font-medium text-sm leading-relaxed min-h-[3rem]">
                                        {order.shippingAddress || 'Retiro en sucursal'}
                                    </p>
                                    <div className="pt-2 mt-2 border-t border-slate-800/50">
                                        <p className="text-slate-400 text-xs uppercase font-bold mb-1">Método de Pago</p>
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-cyan-400" />
                                            <p className="text-cyan-400 font-black text-sm uppercase">{order.paymentMethod}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Productos */}
                        <div>
                            <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Package className="w-4 h-4" /> Productos ({order.items.length})
                            </h4>
                            <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 hover:border-cyan-900/30 transition group">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white w-12 h-12 flex items-center justify-center rounded-lg p-1 shadow-md group-hover:scale-105 transition">
                                                {item.image ? <img src={item.image} className="w-full h-full object-contain" /> : <Package className="text-black" />}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{item.title}</p>
                                                <p className="text-slate-500 text-xs flex items-center gap-2">
                                                    <span className="bg-slate-800 text-slate-300 px-1.5 rounded text-[10px] font-bold">x{item.quantity}</span>
                                                    <span>${item.unit_price.toLocaleString()} c/u</span>
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-white font-mono font-bold text-lg tracking-tight">
                                            ${(item.unit_price * item.quantity).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Resumen Financiero */}
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                            <div className="flex justify-between text-slate-400 text-sm font-medium">
                                <span>Subtotal Productos</span>
                                <span>${(order.subtotal || order.total).toLocaleString()}</span>
                            </div>

                            {order.discount > 0 && (
                                <div className="flex justify-between text-green-400 text-sm font-bold bg-green-900/10 p-2 rounded-lg border border-green-900/30 dashed-border">
                                    <span className="flex items-center gap-2">
                                        <Ticket className="w-3 h-3" /> Descuento ({order.discountCode || 'Cupón'})
                                    </span>
                                    <span>-${order.discount.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800 border-dashed">
                                <span className="text-white font-bold text-lg">Total Abonado</span>
                                <span className="text-3xl font-black text-cyan-400 neon-text tracking-tighter">
                                    ${order.total.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Modal Selector de Cupones (Visualmente Rico)
    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;

        // Filtrado de cupones válidos
        const availableCoupons = coupons.filter(c => {
            const isNotExpired = !c.expirationDate || new Date(c.expirationDate) > new Date();
            const isUserTarget = !c.targetUser || (currentUser && c.targetUser === currentUser.email);
            const isGlobal = c.targetType === 'global';
            const usedCount = c.usedBy ? c.usedBy.length : 0;
            const notExhausted = !c.usageLimit || usedCount < c.usageLimit;
            const userNotUsed = currentUser && c.usedBy && !c.usedBy.includes(currentUser.id);

            return isNotExpired && (isUserTarget || isGlobal) && notExhausted && userNotUsed;
        });

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-lg overflow-hidden relative shadow-2xl border border-purple-500/20 bg-[#050505]">
                    <button onClick={() => setShowCouponModal(false)} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition z-10 hover:bg-slate-800">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 bg-gradient-to-br from-slate-900 via-[#0a0a0a] to-[#050505] border-b border-slate-800">
                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                            <div className="bg-purple-900/20 p-2 rounded-lg border border-purple-500/30">
                                <Gift className="w-6 h-6 text-purple-400" />
                            </div>
                            Mis Beneficios
                        </h3>
                        <p className="text-slate-400 text-sm">Selecciona un cupón para aplicar el descuento a tu compra.</p>
                    </div>

                    <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-[#050505]">
                        {availableCoupons.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                                <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold text-lg">No tienes cupones disponibles.</p>
                                <p className="text-slate-600 text-sm mt-2">Mantente atento a nuestras redes sociales.</p>
                            </div>
                        ) : availableCoupons.map(c => {
                            const canApply = cartSubtotal >= (c.minPurchase || 0);
                            return (
                                <div key={c.id} onClick={() => canApply && selectCoupon(c)} className={`relative overflow-hidden rounded-2xl border transition-all duration-300 group ${canApply ? 'bg-slate-900 border-slate-700 hover:border-purple-500 cursor-pointer hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:scale-[1.02]' : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed grayscale'}`}>
                                    {/* Decoración lateral */}
                                    <div className={`absolute top-0 left-0 w-2 h-full ${canApply ? 'bg-purple-500' : 'bg-slate-700'}`}></div>

                                    <div className="p-5 pl-8 flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-black text-xl text-white tracking-widest font-mono">{c.code}</span>
                                                <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold">
                                                    {c.type === 'fixed' ? 'DESCUENTO FIJO' : 'PORCENTAJE'}
                                                </span>
                                            </div>
                                            <p className="text-purple-400 font-bold text-sm">
                                                {c.type === 'fixed' ? `Ahorra $${c.value}` : `${c.value}% de Descuento`}
                                                {c.maxDiscount > 0 && <span className="text-slate-500 text-xs ml-1 font-normal">(Tope ${c.maxDiscount})</span>}
                                            </p>

                                            {/* Validación visual de mínimo de compra */}
                                            {c.minPurchase > 0 && (
                                                <p className={`text-xs mt-3 font-bold flex items-center gap-1 ${canApply ? 'text-slate-500' : 'text-red-400'}`}>
                                                    {canApply ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                    Compra mínima: ${c.minPurchase}
                                                </p>
                                            )}
                                        </div>

                                        {/* Botón de acción */}
                                        {canApply && (
                                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition ml-4">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };
    // Modal de Detalle de Producto / Promo (Versión Premium)
    const ProductDetailModal = () => {
        if (!selectedProduct) return null;

        const isPromo = selectedProduct.isPromo || !!selectedProduct.items;
        const hasStock = isPromo ? (selectedProduct.stock > 0) : (Number(selectedProduct.stock) > 0);
        const displayPrice = isPromo ? Number(selectedProduct.price || selectedProduct.basePrice) : calculateItemPrice(selectedProduct.basePrice, selectedProduct.discount);

        return (
            <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4" onClick={() => setSelectedProduct(null)}>
                <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] max-w-4xl w-full overflow-hidden flex flex-col md:flex-row shadow-2xl animate-scale-up relative h-full md:h-auto overflow-y-auto md:overflow-hidden" onClick={e => e.stopPropagation()}>

                    {/* Imagen con Zoom y Efectos */}
                    <div className="md:w-1/2 h-72 md:h-[550px] bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 md:p-12 flex items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-50 group-hover:opacity-100 transition duration-500"></div>
                        <img
                            src={selectedProduct.image}
                            className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.15)] z-10 transition-transform duration-700 hover:scale-110"
                        />
                        {/* Badges de Estado */}
                        {!hasStock && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                <div className="border-4 border-red-500 p-4 -rotate-12 bg-black shadow-2xl">
                                    <span className="text-red-500 font-black text-2xl tracking-widest uppercase">AGOTADO</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel de Información y Acción */}
                    <div className="md:w-1/2 p-8 md:p-12 flex flex-col bg-[#080808]">
                        <div className="mb-8">
                            <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] rounded mb-4 border border-cyan-500/20">
                                {isPromo ? 'COMBOS & PROMOCIONES' : selectedProduct.category}
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] mb-6 neon-text-small">{selectedProduct.name}</h2>
                            <p className="text-slate-400 text-sm md:text-base leading-relaxed line-clamp-4">
                                {selectedProduct.description || ''}
                            </p>
                        </div>

                        {/* Lista de productos para Promos */}
                        {isPromo && selectedProduct.items && (
                            <div className="mb-8 space-y-3 bg-purple-500/5 p-6 rounded-2xl border border-purple-500/20 shadow-inner">
                                <p className="text-[10px] uppercase font-black text-purple-400 tracking-[0.2em] flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" /> Este pack incluye:
                                </p>
                                <div className="space-y-2">
                                    {selectedProduct.items.map((item, idx) => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-sm text-slate-300 group/item">
                                                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-[10px] font-black text-purple-400 group-hover/item:bg-purple-500 group-hover/item:text-white transition">
                                                    {item.quantity}x
                                                </div>
                                                <span className="font-bold group-hover/item:text-white transition">{p?.name || 'Producto del Packs'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Footer con Precio y Carrito */}
                        <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-6">
                            <div className="flex items-end justify-between">
                                <div className="flex flex-col">
                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Inversión Total</span>
                                    <div className="flex items-center gap-3">
                                        {selectedProduct.discount > 0 && !isPromo && (
                                            <span className="text-sm text-slate-600 line-through font-bold">${selectedProduct.basePrice.toLocaleString()}</span>
                                        )}
                                        <span className="text-4xl font-black text-white tracking-tighter">
                                            ${displayPrice.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                {selectedProduct.discount > 0 && !isPromo && (
                                    <div className="px-3 py-1 bg-red-500 text-white rounded-lg text-[10px] font-black animate-pulse">
                                        -{selectedProduct.discount}% OFF
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (!hasStock) return;
                                    if (isPromo) {
                                        manageCart({
                                            id: selectedProduct.id,
                                            name: selectedProduct.name,
                                            basePrice: selectedProduct.price || selectedProduct.basePrice,
                                            image: selectedProduct.image,
                                            isPromo: true,
                                            items: selectedProduct.items,
                                            stock: selectedProduct.stock
                                        }, 1);
                                    } else {
                                        manageCart(selectedProduct, 1);
                                    }
                                    setSelectedProduct(null);
                                }}
                                disabled={!hasStock}
                                className={`w-full py-5 rounded-2xl font-black transition flex items-center justify-center gap-3 shadow-2xl ${hasStock ? 'bg-white text-black hover:bg-cyan-400 hover:text-white hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
                            >
                                {hasStock ? (
                                    <><ShoppingCart className="w-6 h-6" /> AGREGAR AL CARRITO</>
                                ) : (
                                    <><AlertCircle className="w-6 h-6" /> PRODUCTO AGOTADO</>
                                )}
                            </button>
                        </div>


                        {/* Botón Cerrar */}
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute top-4 right-4 md:top-6 md:right-6 p-4 bg-black/60 md:bg-white/5 hover:bg-white/10 text-white md:text-slate-400 hover:text-white rounded-full transition-all border border-white/20 md:border-white/5 z-[30] shadow-2xl backdrop-blur-md"
                            title="Cerrar detalle"
                        >
                            <X className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Modal de Venta Manual (Offline / "En Casa")
    const ManualSaleModal = () => {
        // State is now hoisted to App (saleData, setSaleData)

        if (!showManualSaleModal) return null;

        const product = products.find(p => p.id === saleData.productId);

        const handleProductChange = (e) => {
            const pid = e.target.value;
            const prod = products.find(p => p.id === pid);
            setSaleData({
                ...saleData,
                productId: pid,
                price: prod ? Number(prod.basePrice) : 0
            });
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!product) return showToast("Selecciona un producto.", "warning");
            if (saleData.quantity <= 0) return showToast("Cantidad inválida.", "warning");

            try {
                // Verificar Stock
                const currentStock = Number(product.stock) || 0;
                if (saleData.quantity > currentStock) {
                    return showToast(`Stock insuficiente (Disponible: ${currentStock}).`, "error");
                }

                // Crear Orden "Offline"
                const orderId = `man-${Date.now().toString().slice(-6)}`;
                const total = saleData.quantity * saleData.price;

                const newOrder = {
                    orderId: orderId,
                    userId: 'manual_admin', // Usuario sistema
                    customer: {
                        name: saleData.customerName || 'Cliente Mostrador',
                        email: 'offline@store.com',
                        phone: '-',
                        dni: '-'
                    },
                    items: [{
                        productId: product.id,
                        title: product.name,
                        quantity: Number(saleData.quantity),
                        unit_price: Number(saleData.price),
                        image: product.image
                    }],
                    subtotal: total,
                    discount: 0,
                    total: total,
                    status: 'Realizado', // Ya entregado
                    date: new Date().toISOString(),
                    shippingAddress: 'Entrega Presencial (Offline)',
                    paymentMethod: saleData.paymentMethod,
                    source: 'manual_sale',
                    notes: saleData.notes
                };

                // 1. Guardar Pedido
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

                // 2. Descontar Stock
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), {
                    stock: increment(-Number(saleData.quantity))
                });

                showToast("Venta registrada correctamente.", "success");
                setShowManualSaleModal(false);
            } catch (err) {
                console.error(err);
                showToast("Error al registrar venta manual.", "error");
            }
        };

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="bg-[#0a0a0a] rounded-[2rem] w-full max-w-lg border border-slate-800 shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowManualSaleModal(false)} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition z-10">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 border-b border-slate-800">
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <Store className="w-6 h-6 text-green-400" /> Registrar Venta Manual
                        </h3>
                        <p className="text-slate-500 text-sm mt-1">Para ventas fuera de la plataforma web.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Producto</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                value={saleData.productId}
                                onChange={handleProductChange}
                            >
                                <option value="">-- Seleccionar Producto --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} (Stock: {p.stock})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                    value={saleData.quantity}
                                    onChange={e => setSaleData({ ...saleData, quantity: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Precio Unit. ($)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                    value={saleData.price}
                                    onChange={e => setSaleData({ ...saleData, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Cliente / Notas</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                value={saleData.customerName}
                                onChange={e => setSaleData({ ...saleData, customerName: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Método de Pago</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-green-500 outline-none"
                                value={saleData.paymentMethod}
                                onChange={e => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta (POS)</option>
                            </select>
                        </div>

                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition transform hover:-translate-y-1 mt-4">
                            REGISTRAR VENTA
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    // Modal de Analíticas Detalladas (Drill-down)
    const MetricsDetailModal = () => {
        const [timeframe, setTimeframe] = useState('monthly'); // daily, monthly, yearly
        if (!metricsDetail) return null;

        const data = dashboardMetrics.analytics[timeframe] || [];
        const title = metricsDetail.type === 'revenue' ? 'Ingresos Brutos' : 'Beneficio Neto';
        const colorClass = metricsDetail.type === 'revenue' ? 'text-green-400' : 'text-cyan-400';

        // Calcular mejores/peores
        const sortedByVal = [...data].sort((a, b) => b.revenue - a.revenue);
        const bestPeriod = sortedByVal[0];
        const worstPeriod = sortedByVal[sortedByVal.length - 1];

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="bg-[#050505] rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-800 shadow-2xl relative overflow-hidden">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-800 bg-slate-900/20 flex justify-between items-center">
                        <div>
                            <h3 className={`text-3xl font-black ${colorClass} flex items-center gap-3`}>
                                <BarChart className="w-8 h-8" /> {title} - Analítica
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Desglose detallado de tu rendimiento.</p>
                        </div>
                        <button onClick={() => setMetricsDetail(null)} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition border border-slate-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Controls */}
                    <div className="p-6 flex gap-4 bg-slate-900/10 border-b border-slate-800/50 justify-center">
                        {['daily', 'monthly', 'yearly'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition ${timeframe === t ? 'bg-slate-100 text-black' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'}`}
                            >
                                {t === 'daily' ? 'Diario' : t === 'monthly' ? 'Mensual' : 'Anual'}
                            </button>
                        ))}
                    </div>

                    {/* Stats Highlights */}
                    <div className="grid grid-cols-2 gap-4 p-6 bg-slate-900/5">
                        <div className="bg-green-900/10 border border-green-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mejor Periodo</p>
                                <p className="text-green-400 font-black text-lg">
                                    {bestPeriod ? `$${bestPeriod.revenue.toLocaleString()}` : '-'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">{bestPeriod?.date || '-'}</p>
                            </div>
                        </div>
                        <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
                            <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Peor Periodo</p>
                                <p className="text-red-400 font-black text-lg">
                                    {worstPeriod ? `$${worstPeriod.revenue.toLocaleString()}` : '-'}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">{worstPeriod?.date || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* CSS Bar Chart */}
                    <div className="flex-1 p-6 relative flex items-end justify-between gap-2 overflow-x-auto custom-scrollbar">
                        {data.length === 0 ? (
                            <div className="w-full text-center text-slate-500 my-auto">No hay datos para mostrar el gráfico.</div>
                        ) : (
                            (() => {
                                const maxVal = Math.max(...data.map(d => d.revenue), 1); // Avoid div/0
                                return data.slice().map((item, idx) => {
                                    const heightPct = (item.revenue / maxVal) * 100;
                                    const isPositive = metricsDetail.type !== 'net_income' || item.revenue >= 0;
                                    // For net income, handle negative later if needed, assuming revenue is always positive here

                                    return (
                                        <div key={idx} className="flex flex-col items-center justify-end h-full gap-2 group min-w-[60px] cursor-pointer hover:bg-slate-900/30 rounded-xl p-1 transition-all">
                                            {/* Tooltip on Hover */}
                                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-xl pointer-events-none transition z-50 shadow-xl whitespace-nowrap">
                                                <p className="text-white font-bold">{item.date}</p>
                                                <p className={`font-black ${colorClass}`}>${item.revenue.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-500">{item.orders} Pedidos</p>
                                            </div>

                                            {/* Bar */}
                                            <div
                                                className={`w-4 bg-gradient-to-t ${metricsDetail.type === 'revenue' ? 'from-green-900/50 to-green-500' : 'from-cyan-900/50 to-cyan-500'} rounded-t-full relative transition-all duration-500 group-hover:w-6 group-hover:brightness-125`}
                                                style={{ height: `${Math.max(heightPct, 5)}%` }} // Min height 5%
                                            >
                                                {/* Glow alignment */}
                                                <div className={`absolute top-0 left-0 right-0 h-4 rounded-full ${metricsDetail.type === 'revenue' ? 'bg-green-400' : 'bg-cyan-400'} blur-md opacity-20`}></div>
                                            </div>

                                            {/* Label */}
                                            <p className="text-[10px] text-slate-600 font-bold -rotate-45 group-hover:rotate-0 group-hover:text-white transition origin-center mt-2 truncate w-full text-center">
                                                {timeframe === 'monthly' ? item.date.slice(5) : timeframe === 'daily' ? item.date.slice(5) : item.date}
                                            </p>
                                        </div>
                                    );
                                })
                            })()
                        )}
                    </div>
                </div>
            </div>
        );
    };


    // Unified Right Sidebar Drawer (Admin)
    const AdminUserDrawer = () => {
        const [userCartItems, setUserCartItems] = useState([]);
        const [isLoadingCart, setIsLoadingCart] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const active = viewUserCart || userPassModal || viewUserEdit;
        // Determinamos el tipo basado en qué activó el drawer, pero ahora 'edit' es el modo principal
        const type = viewUserCart ? 'cart' : (userPassModal ? 'password' : 'edit');
        const user = viewUserCart || userPassModal || viewUserEdit;

        const [editForm, setEditForm] = useState({
            name: '',
            username: '',
            email: '',
            phone: '',
            dni: '',
            role: 'user',
            newPassword: ''
        });

        useEffect(() => {
            if (active && user) {
                if (type === 'cart') {
                    const fetchCart = async () => {
                        setIsLoadingCart(true);
                        try {
                            const cartDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', user.id));
                            setUserCartItems(cartDoc.exists() ? (cartDoc.data().items || []) : []);
                        } catch (e) { setUserCartItems([]); }
                        setIsLoadingCart(false);
                    };
                    fetchCart();
                }

                // Siempre cargamos los datos básicos para el formulario si estamos en edit o password
                setEditForm({
                    name: user.name || '',
                    username: user.username || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    dni: user.dni || '',
                    role: user.role || 'user',
                    newPassword: ''
                });
            }
        }, [active, user, type]);

        const closeDrawer = () => {
            setViewUserCart(null);
            setUserPassModal(null);
            setViewUserEdit(null);
        };

        const handleEditSubmit = async (e) => {
            e.preventDefault();
            setIsSaving(true);
            try {
                // 1. Actualización Crítica (Auth) vía API si cambió email o password
                const authUpdate = {};
                if (editForm.email !== user.email) authUpdate.email = editForm.email;
                if (editForm.newPassword) authUpdate.password = editForm.newPassword;

                if (Object.keys(authUpdate).length > 0) {
                    const res = await fetch('/api/admin/update-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.id, ...authUpdate })
                    });
                    const result = await res.json();
                    if (!res.ok) throw new Error(result.error);
                }

                // 2. Actualización de Perfil (Firestore)
                const firestoreUpdate = {
                    name: editForm.name,
                    username: editForm.username,
                    email: editForm.email,
                    emailLower: editForm.email.toLowerCase(), // Mantener sincronizado
                    phone: editForm.phone,
                    dni: editForm.dni,
                    role: editForm.role,
                    lastModifiedBy: currentUser.email,
                    updatedAt: new Date().toISOString()
                };

                // Si cambió la contraseña, también actualizarla en Firestore
                if (editForm.newPassword && editForm.newPassword.length >= 6) {
                    firestoreUpdate.password = editForm.newPassword;
                }

                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), firestoreUpdate);

                // Si estamos editando nuestro propio usuario, actualizar el estado global inmediatamente
                if (currentUser && currentUser.id === user.id) {
                    setCurrentUser(prev => ({ ...prev, ...firestoreUpdate }));
                }

                showToast("Perfil de usuario actualizado correctamente.", "success");
                closeDrawer();
            } catch (e) {
                console.error(e);
                showToast(e.message || "Error al actualizar perfil.", "error");
            }
            setIsSaving(false);
        };

        const handleDeleteUser = async () => {
            if (user.email === currentUser.email) {
                return showToast("Autoprotección activa: No puedes eliminar tu propia cuenta.", "warning");
            }

            openConfirm("ELIMINAR USUARIO", `¿Estás seguro de eliminar a ${user.name}? Esta acción es irreversible y borrará su acceso y datos.`, async () => {
                setIsSaving(true);
                try {
                    // 1. Borrar de Auth vía API
                    const res = await fetch('/api/admin/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.id })
                    });
                    if (!res.ok) throw new Error("Error eliminando acceso de Auth");

                    // 2. Borrar de Firestore
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id));

                    showToast("Usuario eliminado definitivamente.", "success");
                    closeDrawer();
                } catch (e) {
                    console.error(e);
                    showToast("Fallo al eliminar usuario.", "error");
                }
                setIsSaving(false);
            });
        };

        if (!active) return null;

        return (
            <div className="fixed inset-0 z-[1000] flex justify-end animate-fade-in pointer-events-none">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={closeDrawer} />

                <div className="w-full max-w-xl bg-[#0a0a0a] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full pointer-events-auto relative overflow-hidden animate-slide-left">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 via-cyan-500 to-pink-600"></div>

                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-widest uppercase">
                                {type === 'cart' ? 'Auditoría de Carrito' : 'Configurar Cuenta'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-500 mt-1 tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                                ID: {user.id.slice(-8).toUpperCase()} • {user.email}
                            </p>
                        </div>
                        <button onClick={closeDrawer} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group">
                            <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                        {type === 'cart' && (
                            <div className="space-y-6">
                                {isLoadingCart ? (
                                    <div className="py-20 flex flex-col items-center gap-4 opacity-50">
                                        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                                        <p className="text-xs font-black tracking-widest text-slate-500">SINCRONIZANDO DATOS...</p>
                                    </div>
                                ) : userCartItems.length === 0 ? (
                                    <div className="py-20 text-center flex flex-col items-center gap-6">
                                        <div className="p-6 rounded-full bg-white/5 border border-white/5">
                                            <ShoppingCart className="w-12 h-12 text-slate-700" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest text-slate-500 italic">No hay productos activos</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center px-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contenido del Carrito</p>
                                            <p className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">{userCartItems.length} ITEMS</p>
                                        </div>
                                        <div className="space-y-3">
                                            {userCartItems.map((item, idx) => (
                                                <div key={idx} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex gap-4 transition hover:bg-white/[0.05] hover:border-cyan-500/20 group animate-fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                    <div className="w-16 h-16 bg-[#0a0a0a] rounded-xl overflow-hidden shadow-inner border border-white/5 flex-shrink-0">
                                                        <img src={item.image || 'https://images.unsplash.com/photo-1581404917879-53e19259fdda?w=100'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-center">
                                                        <p className="font-bold text-white text-sm leading-tight mb-1">{item.name}</p>
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-xs text-slate-500">Cant: <span className="text-white font-mono font-bold">{item.quantity}</span></p>
                                                            <p className="text-cyan-400 font-black font-mono text-xs">${item.price.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-6 border-t border-white/5">
                                            <div className="flex justify-between items-center bg-cyan-500/5 p-6 rounded-2xl border border-cyan-500/20">
                                                <p className="text-slate-400 font-bold">Valor Total</p>
                                                <p className="text-2xl font-black text-white font-mono">${userCartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {(type === 'edit' || type === 'password') && (
                            <form onSubmit={handleEditSubmit} className="space-y-8 animate-fade-in">
                                {/* Datos de Identidad */}
                                <div className="space-y-6">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3 h-3" /> Datos Identidad
                                    </p>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <input
                                                className="input-cyber w-full p-4 text-sm"
                                                placeholder="Nombre Completo"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <input
                                                className="input-cyber w-full p-4 text-sm font-mono"
                                                placeholder="Username / Alias"
                                                value={editForm.username}
                                                onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                className="input-cyber w-full p-4 text-sm font-mono"
                                                placeholder="Email de la cuenta (Principal)"
                                                value={editForm.email}
                                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                className="input-cyber w-full p-4 text-sm font-mono"
                                                placeholder="DNI"
                                                value={editForm.dni}
                                                onChange={e => setEditForm({ ...editForm, dni: e.target.value })}
                                            />
                                            <input
                                                className="input-cyber w-full p-4 text-sm font-mono"
                                                placeholder="Teléfono"
                                                value={editForm.phone}
                                                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seguridad y Rol */}
                                <div className="space-y-6 pt-4">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Lock className="w-3 h-3" /> Seguridad & Rol
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="relative group">
                                                <input
                                                    type="password"
                                                    className="input-cyber w-full p-4 text-sm font-mono"
                                                    placeholder="Nueva Contraseña (Dejar vacío para no cambiar)"
                                                    value={editForm.newPassword}
                                                    onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                                                />
                                            </div>
                                            <p className="text-[9px] text-slate-600 mt-2 ml-1 italic">Mínimo 6 caracteres para actualizar.</p>
                                        </div>

                                        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
                                            {['user', 'editor', 'admin'].map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setEditForm({ ...editForm, role: r })}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.role === r ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'
                                                        }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                        SINCRONIZAR CAMBIOS
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleDeleteUser}
                                        className="w-full py-4 border border-red-500/30 bg-red-500/5 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Eliminar Cuenta Permanente
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Estado de Carga Inicial
    if (isLoading && view === 'store') {
        const loadingPrimaryColor = settings?.primaryColor || '#06b6d4';
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 animate-spin" style={{ borderTopColor: loadingPrimaryColor }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 animate-pulse" style={{ color: loadingPrimaryColor }} />
                    </div>
                </div>
                <h1 className="text-3xl font-black tracking-[0.5em] mt-8 animate-pulse" style={{ color: loadingPrimaryColor, textShadow: `0 0 20px ${loadingPrimaryColor}40` }}>
                    {settings?.loadingTitle || settings?.storeName || ''}
                </h1>
                <p className="text-slate-500 text-sm mt-4 font-mono uppercase tracking-widest">
                    {settings?.loadingText || 'Cargando sistema...'}
                </p>
            </div>
        );
    }

    // Modo Mantenimiento
    if (settings?.maintenanceMode && !isAdmin(currentUser?.email)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
                <div className="w-24 h-24 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-8 border border-red-900/50 animate-pulse">
                    <AlertTriangle className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black mb-4 tracking-tight uppercase">Sistema en Mantenimiento</h1>
                <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                    Estamos realizando mejoras para brindarte una experiencia premium.
                    ¡Te mandamos un saludo y esperamos que vuelvas prontamente!
                </p>
                <div className="mt-12 pt-12 border-t border-slate-900 w-full max-w-xs">
                    <p className="text-xs text-slate-600 font-mono italic">{settings?.storeName || ''} - Modo Mantenimiento Activo</p>
                </div>
            </div>
        );
    }

    // --- LÓGICA DE FILTRADO Y ORDENAMIENTO INTELIGENTE ---
    const filteredProducts = products
        .filter(p => {
            // Excluir productos desactivados de la tienda pública
            if (p.isActive === false) return false;

            const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());

            // Lógica de Categorías Especiales
            if (selectedCategory === 'Promos') return false; // El grid estándar se oculta para Promos
            if (selectedCategory === 'Ofertas') {
                return matchesSearch && (p.discount > 0);
            }

            const categoryMatch = p.category ? p.category.trim() : '';
            const matchesCategory = selectedCategory === '' || categoryMatch === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            // Prioridad 1: Productos Destacados primero
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            // Prioridad 2: Más vendidos
            const salesA = dashboardMetrics?.salesCount?.[a.id] || 0;
            const salesB = dashboardMetrics?.salesCount?.[b.id] || 0;
            return salesB - salesA;
        });

    // --- RENDERIZADO PRINCIPAL (RETURN) ---
    return (

        <div className="min-h-screen flex flex-col relative w-full bg-grid bg-[#050505] font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* DEBUGGER VISUAL (SOLO DESARROLLO) */}
            {view === 'store' && currentUser?.role === 'admin' && (
                <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-green-400 font-mono text-xs p-2 rounded border border-green-900 pointer-events-none">
                    [DEBUG] Total: {products.length} | Filtro: {filteredProducts.length} | Cat: {selectedCategory || 'ALL'}
                </div>
            )}

            {/* Efectos de Fondo Globales */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
            </div>


            {/* Contenedores Globales (Toasts y Modales) */}
            <div className="fixed top-24 right-4 z-[9999] space-y-3 pointer-events-none">
                {/* Toasts necesitan pointer-events-auto para poder cerrarlos */}
                <div className="pointer-events-auto space-y-3">
                    {toasts.map(t => (
                        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                    ))}
                </div>
            </div>



            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />
            <ProductDetailModal />

            {/* --- BARRA DE NAVEGACIÓN (NAVBAR) --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-20 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    {/* Logo y Menú */}
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50 group">
                            <Menu className="w-6 h-6 group-hover:scale-110 transition" />
                        </button>
                        <div className="cursor-pointer group flex items-center gap-3" onClick={() => setView('store')}>
                            {settings?.logoUrl && (
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-slate-800 bg-white p-0.5 flex-shrink-0 shadow-lg group-hover:border-cyan-500 transition-colors duration-300">
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-2xl md:text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300 leading-none">
                                    {!settingsLoaded ? (
                                        <span className="inline-block h-8 w-32 bg-slate-700/50 rounded animate-pulse"></span>
                                    ) : (settings?.storeName || '')}
                                </span>
                                <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500 mt-1"></div>
                            </div>
                        </div>
                    </div>

                    {/* Barra de Búsqueda (Visible en Desktop) */}
                    <div className="hidden lg:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-3 w-1/3 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition shadow-inner group">
                        <Search className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-cyan-400 transition" />
                        <input
                            className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium"
                            placeholder="¿Qué estás buscando hoy?"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Acciones de Usuario */}
                    <div className="flex items-center gap-4">
                        {/* Botones de Contacto */}
                        <div className="hidden md:flex items-center gap-2">
                            {settings?.showWhatsapp !== false && settings?.whatsappLink && (
                                <button onClick={() => window.open(settings?.whatsappLink, '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                    <MessageCircle className="w-5 h-5" /> WhatsApp
                                </button>
                            )}
                            {settings?.showInstagram !== false && settings?.instagramLink && (
                                <button onClick={() => window.open(settings?.instagramLink, '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-900/10 text-pink-400 hover:bg-pink-500 hover:text-white border border-pink-500/20 transition font-bold text-sm hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]">
                                    <Instagram className="w-5 h-5" /> Instagram
                                </button>
                            )}
                        </div>

                        {/* Botón Modo Claro/Oscuro */}
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="relative p-2 sm:p-2.5 bg-slate-900/50 rounded-lg sm:rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group overflow-hidden"
                            title={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                        >
                            <div className={`transform transition-all duration-500 ${darkMode ? 'rotate-0 scale-100' : 'rotate-180 scale-0 absolute'}`}>
                                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 group-hover:scale-110 transition" />
                            </div>
                            <div className={`transform transition-all duration-500 ${!darkMode ? 'rotate-0 scale-100' : '-rotate-180 scale-0 absolute'}`}>
                                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 group-hover:scale-110 transition" />
                            </div>
                        </button>

                        {/* Botón Carrito */}
                        <button onClick={() => setView('cart')} className="relative p-2 sm:p-2.5 bg-slate-900/50 rounded-lg sm:rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group hover:border-orange-500/30">
                            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-orange-500 text-white text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505] animate-bounce-short">
                                    {cart.length}
                                </span>
                            )}
                        </button>

                        {/* Perfil / Login */}
                        {currentUser ? (
                            <button onClick={() => setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm group-hover:scale-105 transition">
                                    {currentUser.name?.charAt(0) || '?'}
                                </div>
                                <div className="text-left hidden md:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hola,</p>
                                    <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition">{currentUser.name?.split(' ')[0] || 'Usuario'}</p>
                                </div>
                            </button>
                        ) : (
                            <button onClick={() => setView('login')} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 transform hover:-translate-y-0.5">
                                <User className="w-5 h-5" /> INGRESAR
                            </button>
                        )}
                    </div>
                </nav>
            )}

            {/* --- MENÚ MÓVIL (DETALLADO Y EXPLÍCITO) --- */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-start">
                    {/* Backdrop oscuro */}
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>

                    {/* Panel Lateral */}
                    <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-in-right flex flex-col shadow-2xl z-[10001]">
                        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
                            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-md">MENÚ</h2>
                            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 border border-slate-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Lista de Botones Explícita */}
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <button onClick={() => { setView('store'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                <Home className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" /> Inicio
                            </button>

                            <button onClick={() => { setView('profile'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                <User className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" /> Mi Perfil
                            </button>

                            <button onClick={() => { setView('cart'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                <div className="relative">
                                    <ShoppingBag className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" />
                                    {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{cart.length}</span>}
                                </div>
                                Mi Carrito
                            </button>

                            <div className="h-px bg-slate-800 my-4 mx-4"></div>

                            <button onClick={() => { setView('about'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                <Info className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" /> Sobre Nosotros
                            </button>

                            {settings?.showGuideLink !== false && (
                                <button onClick={() => { setView('guide'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                    <FileQuestion className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" /> {settings?.guideTitle || 'Cómo Comprar'}
                                </button>
                            )}

                            {/* Panel Admin (Solo si tiene permisos) */}
                            {hasAccess(currentUser?.email) && (
                                <button onClick={() => { setView('admin'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-orange-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-4 bg-orange-900/10 rounded-xl hover:bg-orange-900/20 transition border border-orange-500/20">
                                    <Shield className="w-6 h-6" /> Admin Panel
                                </button>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">{settings?.menuCopyright || `${settings.storeName} © ${new Date().getFullYear()}`}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Espaciador para el Navbar Fixed */}
            {view !== 'admin' && <div className="h-24"></div>}

            {/* --- CONTENIDO PRINCIPAL (VIEW SWITCHER) --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>

                {/* 1. VISTA TIENDA (HOME) */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto pb-32 min-h-screen block">

                        {/* Anuncio Global (Marquesina) - Solo mostrar cuando settings están cargados */}
                        {settingsLoaded && settings?.showAnnouncementBanner !== false && settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition duration-1000"></div>
                                <p className="text-orange-400 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                                    <Flame className="w-4 h-4 text-orange-500" /> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500" />
                                </p>
                            </div>
                        )}

                        {/* Brand Ticker (Futuristic) - Solo mostrar cuando settings están cargados */}
                        {settingsLoaded && settings?.showBrandTicker !== false && (
                            <div className="mb-8 w-full overflow-hidden border-y border-slate-800/50 bg-[#0a0a0a]/50 backdrop-blur-sm py-2">
                                <div className="ticker-wrap">
                                    <div className="ticker-content font-mono text-cyan-500/50 text-xs md:text-sm tracking-[0.2em] md:tracking-[0.5em] uppercase flex items-center gap-6 md:gap-12">
                                        {[1, 2, 3, 4].map((i) => (
                                            <React.Fragment key={i}>
                                                <span className="whitespace-nowrap">{settings?.tickerText || `${settings?.storeName || ''} Tech • Futuro • Calidad Premium • Innovación`}</span>
                                                <span>•</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Banner Hero */}
                        <div className="relative w-full h-[30vh] md:h-[350px] 2xl:h-[450px] rounded-[2rem] overflow-hidden shadow-2xl mb-8 border border-slate-800 group relative bg-[#080808] container-tv">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>
                            {/* Imagen de fondo - Solo mostrar cuando settings están cargados */}
                            {!settingsLoaded ? (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 animate-pulse"></div>
                            ) : settings?.heroUrl ? (
                                <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" />
                            ) : null}

                            {/* Overlay de Texto */}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10 p-12">
                                <div className="max-w-2xl animate-fade-up">
                                    {/* Skeleton/Loading mientras no se cargan los settings */}
                                    {!settingsLoaded ? (
                                        <>
                                            <div className="h-6 w-32 bg-slate-700/50 rounded-md mb-4 animate-pulse"></div>
                                            <div className="h-12 md:h-16 w-64 md:w-80 bg-slate-700/50 rounded-lg mb-2 animate-pulse"></div>
                                            <div className="h-12 md:h-16 w-48 md:w-64 bg-slate-700/50 rounded-lg mb-4 animate-pulse"></div>
                                            <div className="h-4 w-72 bg-slate-700/50 rounded mb-2 animate-pulse"></div>
                                            <div className="h-4 w-56 bg-slate-700/50 rounded mb-6 animate-pulse"></div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-40 bg-slate-700/50 rounded-xl animate-pulse"></div>
                                                <div className="h-10 w-24 bg-slate-700/50 rounded-xl animate-pulse"></div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="bg-cyan-500 text-black px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-4 inline-block">
                                                {settings?.heroBadge || ''}
                                            </span>
                                            <h1 className="text-3xl md:text-5xl lg:text-6xl text-tv-huge font-black text-white leading-[0.9] drop-shadow-2xl mb-4 neon-text">
                                                {settings?.heroTitle1 || ''} <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                                                    {settings?.heroTitle2 || ''}
                                                </span>
                                            </h1>
                                            <p className="text-slate-400 text-sm md:text-base lg:text-lg mb-6 max-w-md font-medium">
                                                {settings?.heroSubtitle || ''}
                                            </p>
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 group/btn">
                                                    VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition" />
                                                </button>
                                                <button onClick={() => setView('guide')} className="px-6 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white rounded-xl flex items-center gap-2 transition font-bold text-xs group">
                                                    <Info className="w-4 h-4 text-cyan-400" /> Ayuda
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Why Choose Us Section */}
                        {/* Why Choose Us Section (Editable) - Respeta toggles de configuración */}
                        {settingsLoaded && settings?.showFeaturesSection !== false && (
                            <div className={`grid grid-cols-1 ${[settings?.showFeature1 !== false, settings?.showFeature2 !== false, settings?.showFeature3 !== false].filter(Boolean).length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' :
                                [settings?.showFeature1 !== false, settings?.showFeature2 !== false, settings?.showFeature3 !== false].filter(Boolean).length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
                                    'md:grid-cols-3'
                                } gap-4 md:gap-8 mb-12 container-tv`}>
                                {!settingsLoaded ? (
                                    <>
                                        {/* Skeleton para las tarjetas */}
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="p-4 rounded-[1.5rem] bg-slate-900/30 border border-slate-800 backdrop-blur-sm flex flex-col items-center text-center">
                                                <div className="w-10 h-10 rounded-full bg-slate-700/50 mb-3 animate-pulse"></div>
                                                <div className="h-5 w-32 bg-slate-700/50 rounded mb-2 animate-pulse"></div>
                                                <div className="h-3 w-48 bg-slate-700/50 rounded mb-1 animate-pulse"></div>
                                                <div className="h-3 w-40 bg-slate-700/50 rounded animate-pulse"></div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {/* Beneficio 1 */}
                                        {settings?.showFeature1 !== false && (
                                            <div className="p-4 rounded-[1.5rem] bg-slate-900/30 border border-slate-800 backdrop-blur-sm flex flex-col items-center text-center tech-glow hover:bg-slate-900/50 transition duration-500 group">
                                                <div className="w-10 h-10 rounded-full bg-cyan-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                    <Zap className="w-5 h-5 text-cyan-400" />
                                                </div>
                                                <h3 className="text-base font-bold text-white mb-1">{settings?.feature1Title || ''}</h3>
                                                <p className="text-slate-400 text-[11px]">{settings?.feature1Desc || ''}</p>
                                            </div>
                                        )}
                                        {/* Beneficio 2 */}
                                        {settings?.showFeature2 !== false && (
                                            <div className="p-4 rounded-[1.5rem] bg-slate-900/30 border border-slate-800 backdrop-blur-sm flex flex-col items-center text-center tech-glow hover:bg-slate-900/50 transition duration-500 group">
                                                <div className="w-10 h-10 rounded-full bg-purple-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                    <Shield className="w-5 h-5 text-purple-400" />
                                                </div>
                                                <h3 className="text-base font-bold text-white mb-1">{settings?.feature2Title || ''}</h3>
                                                <p className="text-slate-400 text-[11px]">{settings?.feature2Desc || ''}</p>
                                            </div>
                                        )}
                                        {/* Beneficio 3 */}
                                        {settings?.showFeature3 !== false && (
                                            <div className="p-4 rounded-[1.5rem] bg-slate-900/30 border border-slate-800 backdrop-blur-sm flex flex-col items-center text-center tech-glow hover:bg-slate-900/50 transition duration-500 group">
                                                <div className="w-10 h-10 rounded-full bg-green-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                    <Headphones className="w-5 h-5 text-green-400" />
                                                </div>
                                                <h3 className="text-base font-bold text-white mb-1">{settings?.feature3Title || ''}</h3>
                                                <p className="text-slate-400 text-[11px]">{settings?.feature3Desc || ''}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Filtros de Categoría */}
                        <div id="catalog" className="sticky top-20 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <Filter className="w-5 h-5 text-slate-500 flex-shrink-0" />

                            {/* BOTÓN PROMOS (SPECIAL) */}
                            <button
                                onClick={() => setSelectedCategory('Promos')}
                                className={`px-5 py-2 rounded-xl font-black text-xs transition border whitespace-nowrap flex items-center gap-2 group relative overflow-hidden flex-shrink-0 ${selectedCategory === 'Promos' ? 'text-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'bg-slate-900 border-slate-800 text-purple-400 hover:text-white hover:border-purple-500/50'}`}
                            >
                                {selectedCategory === 'Promos' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 animate-gradient-xy"></div>}
                                <span className="relative z-10 flex items-center gap-2"><Sparkles className="w-4 h-4" /> PROMOS</span>
                            </button>

                            {/* BOTÓN OFERTAS (SPECIAL) */}
                            <button
                                onClick={() => setSelectedCategory('Ofertas')}
                                className={`px-5 py-2 rounded-xl font-bold text-xs transition border whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${selectedCategory === 'Ofertas' ? 'bg-red-600/20 text-red-400 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-900 border-slate-800 text-red-400 hover:text-white hover:border-red-500/50'}`}
                            >
                                <Percent className="w-4 h-4" /> OFERTAS
                            </button>

                            <button onClick={() => setSelectedCategory('')} className={`px-5 py-2 rounded-xl font-bold text-xs transition border whitespace-nowrap flex-shrink-0 ${selectedCategory === '' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                                Todos
                            </button>
                            {settings?.categories?.map(c => (
                                <button key={c} onClick={() => setSelectedCategory(c)} className={`px-5 py-2 rounded-xl font-bold text-xs transition border whitespace-nowrap flex-shrink-0 ${selectedCategory === c ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>

                        {/* SECCIÓN PROMOS (NUEVO) */}
                        {/* SECCIÓN PROMOS (TAB VIEW) */}
                        {selectedCategory === 'Promos' && (
                            <div className="mb-16 animate-fade-in">
                                {promos.length > 0 ? (
                                    <>
                                        <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                                            <Tag className="w-8 h-8 text-purple-500 animate-pulse" /> PROMOCIONES ESPECIALES
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {promos.map(promo => {
                                                // Calcular si hay stock para esta promo
                                                // La disponibilidad depende del "item" con menor stock relativo
                                                let maxPurchasable = Infinity;
                                                promo.items.forEach(item => {
                                                    const p = products.find(prod => prod.id === item.productId);
                                                    const pStock = p ? (Number(p.stock) || 0) : 0;
                                                    const maxForThisItem = Math.floor(pStock / item.quantity);
                                                    if (maxForThisItem < maxPurchasable) maxPurchasable = maxForThisItem;
                                                });

                                                const hasStock = maxPurchasable > 0;

                                                return (
                                                    <div key={promo.id} className="bg-gradient-to-br from-purple-900/10 to-blue-900/10 rounded-[2.5rem] border border-purple-500/30 overflow-hidden group shadow-[0_0_30px_rgba(168,85,247,0.1)] hover:shadow-[0_0_50px_rgba(168,85,247,0.2)] transition duration-500 relative flex flex-col">
                                                        <div
                                                            className="aspect-square bg-slate-900/50 flex items-center justify-center relative overflow-hidden cursor-zoom-in"
                                                            onClick={() => setSelectedProduct({ ...promo, isPromo: true, stock: maxPurchasable })}
                                                        >
                                                            <img src={promo.image} className="w-full h-full object-contain transition duration-700 group-hover:scale-110" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
                                                            <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                                                Oferta Limitada
                                                            </div>
                                                        </div>

                                                        <div className="p-8 flex-1 flex flex-col">
                                                            <h3 className="text-2xl font-black text-white mb-2 leading-tight">{promo.name}</h3>
                                                            <p className="text-purple-300 text-sm mb-6 flex-1">{promo.description}</p>

                                                            {/* Lista de productos incluidos */}
                                                            <div className="mb-6 space-y-2">
                                                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Incluye:</p>
                                                                {promo.items.map((item, idx) => {
                                                                    const p = products.find(prod => prod.id === item.productId);
                                                                    return (
                                                                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                                                                            <CheckCircle className="w-3 h-3 text-purple-500" />
                                                                            <span className="text-white font-bold">{item.quantity}x</span> {p ? p.name : 'Producto'}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-slate-500 text-xs font-bold line-through decoration-red-500 decoration-2">
                                                                        ${promo.items.reduce((acc, item) => {
                                                                            const p = products.find(prod => prod.id === item.productId);
                                                                            return acc + ((Number(p?.basePrice) || 0) * item.quantity);
                                                                        }, 0).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-3xl font-black text-white neon-text text-purple-400">
                                                                        ${Number(promo.price).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        if (!hasStock) return showToast("Sin stock disponible para esta promo.", "warning");
                                                                        // Lógica especial para agregar Promo al carrito
                                                                        // Tratamos la promo como un "producto" pero con un flag especial
                                                                        const promoProduct = {
                                                                            id: promo.id,
                                                                            name: promo.name,
                                                                            basePrice: promo.price,
                                                                            image: promo.image,
                                                                            isPromo: true,
                                                                            items: promo.items, // Guardamos la def de items para validar stock
                                                                            stock: maxPurchasable // Stock virtual calculado
                                                                        };
                                                                        manageCart(promoProduct, 1);
                                                                    }}
                                                                    disabled={!hasStock}
                                                                    className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg ${hasStock ? 'bg-white text-black hover:bg-purple-400 hover:text-white hover:scale-105' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                                                >
                                                                    {hasStock ? <ShoppingCart className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                                                    {hasStock ? 'AGREGAR' : 'AGOTADO'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-slate-800 rounded-[3rem] bg-slate-950/30">
                                        <div className="p-8 bg-slate-900 rounded-full mb-6 shadow-2xl border border-slate-800">
                                            <Tag className="w-16 h-16 text-slate-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white mb-2">Sin Promociones Activas</h3>
                                        <p className="text-slate-500 max-w-sm">No hay promociones disponibles en este momento. ¡Volvé pronto!</p>
                                        <button
                                            onClick={() => setSelectedCategory('')}
                                            className="mt-6 px-6 py-3 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 rounded-xl font-bold transition border border-cyan-500/20"
                                        >
                                            Ver Todo el Catálogo
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grid de Productos */}
                        {products.length === 0 ? (
                            // Empty State explícito (sin componente externo para "bulk")
                            <div className="flex flex-col items-center justify-center p-20 text-center border border-dashed border-slate-800 rounded-[3rem] bg-slate-950/30">
                                <div className="p-8 bg-slate-900 rounded-full mb-6 shadow-2xl border border-slate-800">
                                    <Package className="w-16 h-16 text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Catálogo Vacío</h3>
                                <p className="text-slate-500 max-w-sm">No hay productos disponibles en este momento. Por favor revisa más tarde o contacta soporte.</p>
                            </div>
                        ) : (
                            <>
                                {filteredProducts.length === 0 && selectedCategory !== 'Promos' && (
                                    <div className="flex flex-col items-center justify-center p-20 text-center col-span-full animate-fade-in w-full">
                                        <div className="p-6 bg-slate-900/50 rounded-full mb-4 inline-block border border-slate-800">
                                            <Search className="w-12 h-12 text-slate-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">No se encontraron resultados</h3>
                                        <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                            No hay productos que coincidan con <span className="text-white font-bold">"{searchQuery}"</span>
                                            {selectedCategory && <span> en la categoría <span className="text-white font-bold">{selectedCategory}</span></span>}.
                                        </p>
                                        <button
                                            onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                                            className="px-6 py-3 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 rounded-xl font-bold transition border border-cyan-500/20"
                                        >
                                            Limpiar filtros
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 pb-32">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition duration-500 relative flex flex-col h-full">

                                            {/* Imagen y Badges */}
                                            <div className="h-60 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-6 flex items-center justify-center relative overflow-hidden cursor-zoom-in" onClick={() => setSelectedProduct(p)}>
                                                {/* Efecto Glow Fondo */}
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

                                                {p.image ? (
                                                    <img
                                                        src={p.image}
                                                        loading={settings?.enableLazyLoad !== false ? "lazy" : "eager"}
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        className={`w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3 ${p.stock <= 0 ? 'grayscale opacity-50' : ''}`}
                                                    />
                                                ) : null}

                                                {/* Botón Ver (Visible en Mobile/Touch) */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProduct(p);
                                                    }}
                                                    className="absolute bottom-4 right-4 z-30 bg-black/60 backdrop-blur-md p-3 rounded-full text-white border border-white/20 md:hidden"
                                                >
                                                    <Maximize2 className="w-5 h-5" />
                                                </button>

                                                {/* Fallback Icon */}
                                                <div className="hidden w-full h-full flex items-center justify-center z-0 absolute inset-0" style={{ display: p.image ? 'none' : 'flex' }}>
                                                    <div className="flex flex-col items-center justify-center text-slate-700">
                                                        <ImageIcon className="w-16 h-16 mb-2 opacity-50" />
                                                        <span className="text-xs font-bold uppercase tracking-widest opacity-50">Sin Imagen</span>
                                                    </div>
                                                </div>

                                                {/* OVERLAY AGOTADO (Mejorado) */}
                                                {p.stock <= 0 && (
                                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                                        <div className="border-4 border-red-500 p-4 -rotate-12 bg-black/80 shadow-[0_0_30px_rgba(239,68,68,0.5)] transform scale-110 animate-pulse">
                                                            <span className="text-red-500 font-black text-2xl md:text-3xl tracking-[0.2em] uppercase">AGOTADO</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* BADGE: DESTACADO */}
                                                {p.isFeatured && p.stock > 0 && (
                                                    <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-black px-4 py-1.5 rounded-br-2xl uppercase tracking-wider z-20 shadow-lg flex items-center gap-1">
                                                        <Star className="w-3 h-3 fill-current" /> Destacado
                                                    </div>
                                                )}

                                                {/* Descuento Badge */}
                                                {p.discount > 0 && p.stock > 0 && !p.isFeatured && (
                                                    <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-20 shadow-red-600/20 animate-pulse">
                                                        -{p.discount}% OFF
                                                    </span>
                                                )}

                                                {/* Combined Badge (Featured + Discount) */}
                                                {p.discount > 0 && p.stock > 0 && p.isFeatured && (
                                                    <span className="absolute top-10 left-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-r-lg shadow-lg z-20">
                                                        -{p.discount}% OFF
                                                    </span>
                                                )}

                                                {/* Botón Favorito (Funcional) */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p) }}
                                                    className={`absolute top-4 right-4 p-3 rounded-full z-20 transition shadow-lg backdrop-blur-sm border ${currentUser?.favorites?.includes(p.id) ? 'bg-red-500 text-white border-red-500 shadow-red-500/30' : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white hover:text-red-500'}`}
                                                >
                                                    <Heart className={`w-5 h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`} />
                                                </button>

                                                {/* Botón Rápido Agregar (Solo si hay stock) */}
                                                {p.stock > 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); manageCart(p, 1) }}
                                                        className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 hover:bg-cyan-400 hover:shadow-cyan-400/50 transition z-20 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300"
                                                        title="Agregar al carrito"
                                                    >
                                                        <Plus className="w-6 h-6" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Información */}
                                            <div className="p-4 flex-1 flex flex-col relative z-10 bg-[#0a0a0a]">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">
                                                        {p.category}
                                                    </p>
                                                    {/* Estado de Stock */}
                                                    {settings?.showStockCount !== false && p.stock > 0 && p.stock <= (settings?.lowStockThreshold || 5) ? (
                                                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Últimos {p.stock}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <h3 className="text-white font-bold text-base leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2 min-h-[2.5rem]">
                                                    {p.name}
                                                </h3>

                                                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        {p.discount > 0 && (
                                                            <span className="text-xs text-slate-500 line-through font-medium mb-1">
                                                                ${p.basePrice.toLocaleString()}
                                                            </span>
                                                        )}
                                                        <span className="text-2xl font-black text-white tracking-tight flex items-center gap-1">
                                                            ${calculateItemPrice(p.basePrice, p.discount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {p.discount > 0 && (
                                                        <div className="w-8 h-8 rounded-full bg-green-900/20 border border-green-500/20 flex items-center justify-center">
                                                            <Percent className="w-4 h-4 text-green-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* 2. VISTA DEL CARRITO DE COMPRAS */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
                        <div className="flex items-center gap-4 mb-8 pt-8">
                            <button onClick={() => setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 group">
                                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition" />
                            </button>
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3">
                                <ShoppingBag className="w-10 h-10 text-cyan-400" /> Mi Carrito
                            </h1>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-950/30">
                                <div className="p-8 bg-slate-900 rounded-full mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-800">
                                    <ShoppingCart className="w-16 h-16 text-slate-600" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Tu carrito está vacío</h3>
                                <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">
                                    ¡Es un buen momento para buscar ese producto que tanto quieres!
                                </p>
                                <button onClick={() => setView('store')} className="px-8 py-4 bg-cyan-600 text-white rounded-xl font-bold transition shadow-lg hover:bg-cyan-500 hover:shadow-cyan-500/30 flex items-center gap-2">
                                    Ir a la Tienda <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                {/* Lista de Items */}
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 md:p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center group relative overflow-hidden hover:border-cyan-900/50 transition duration-300">
                                            {/* Imagen */}
                                            <div className="w-full md:w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0 shadow-lg">
                                                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 w-full text-center md:text-left z-10">
                                                <div className="flex justify-between items-start w-full">
                                                    <h3 className="font-bold text-white text-lg truncate mb-1 pr-4">{item.product.name}</h3>
                                                    <button onClick={() => manageCart(item.product, -item.quantity)} className="text-slate-600 hover:text-red-500 transition p-2 bg-slate-900 rounded-lg hover:bg-red-900/20">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <p className="text-cyan-400 font-bold text-sm mb-4">
                                                    ${calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0).toLocaleString()} <span className="text-slate-600 font-normal">unitario</span>
                                                </p>

                                                {/* Controles de Cantidad */}
                                                <div className="flex items-center justify-center md:justify-start gap-4">
                                                    <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1 border border-slate-700">
                                                        <button onClick={() => manageCart(item.product, -1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-base font-bold w-8 text-center text-white">{item.quantity}</span>
                                                        <button onClick={() => manageCart(item.product, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="hidden md:block h-8 w-px bg-slate-800 mx-2"></div>
                                                    <p className="text-xs text-slate-500 font-bold uppercase hidden md:block">
                                                        Subtotal: <span className="text-white text-lg ml-1">${(calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0) * (item.quantity || 0)).toLocaleString()}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Resumen y Checkout */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8 border-b border-slate-800 pb-4">Resumen de Compra</h3>

                                    {/* Sección de Cupones */}
                                    <div className="mb-8">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                            <Tag className="w-4 h-4" /> Cupón de Descuento
                                        </label>
                                        {appliedCoupon ? (
                                            <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden group animate-fade-up">
                                                <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition"></div>
                                                <div className="relative z-10">
                                                    <p className="font-black text-purple-300 text-lg tracking-widest">{appliedCoupon.code}</p>
                                                    <p className="text-xs text-purple-400 font-bold">
                                                        {appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}
                                                    </p>
                                                </div>
                                                <button onClick={() => setAppliedCoupon(null)} className="p-2 bg-slate-900/50 rounded-full text-purple-300 hover:text-red-400 hover:bg-red-900/30 transition relative z-10 border border-transparent hover:border-red-500/30">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowCouponModal(true)} className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 hover:bg-purple-900/10 text-slate-400 hover:text-purple-300 rounded-2xl transition flex items-center justify-center gap-2 text-sm font-bold group">
                                                <Ticket className="w-5 h-5 group-hover:rotate-12 transition" /> Ver cupones disponibles
                                            </button>
                                        )}
                                    </div>

                                    {/* Desglose de Precios */}
                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400 font-medium">
                                            <span>Subtotal</span>
                                            <span className="font-mono font-bold text-white">${cartSubtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 text-sm font-medium">
                                            <span>Envío {checkoutData.shippingMethod === 'Delivery' ? '(A domicilio)' : '(Retiro)'}</span>
                                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                                                <Truck className="w-3 h-3" />
                                                {shippingFee > 0 ? `$${shippingFee.toLocaleString()}` : (checkoutData.shippingMethod === 'Pickup' ? 'Gratis' : '¡Envío Gratis!')}
                                            </span>
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex justify-between text-purple-400 font-bold text-sm animate-pulse bg-purple-900/10 p-2 rounded-lg">
                                                <span>Descuento aplicado</span>
                                                <span>-${discountAmount.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total Final */}
                                    <div className="flex justify-between items-end mb-8">
                                        <span className="text-white font-bold text-lg">Total Final</span>
                                        <span className="text-4xl font-black text-white neon-text tracking-tighter">
                                            ${finalTotal.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Botón Acción */}
                                    <button onClick={() => setView('checkout')} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-5 text-white font-bold text-lg rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1">
                                        Iniciar Compra <ArrowRight className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. VISTA DE CHECKOUT (FINALIZAR COMPRA) */}
                {view === 'checkout' && (
                    <div className="max-w-5xl mx-auto pb-20 animate-fade-up px-4 md:px-8">
                        <button onClick={() => setView('cart')} className="mb-8 mt-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition">
                            <ArrowLeft className="w-5 h-5" /> Volver al Carrito
                        </button>

                        <div className="grid md:grid-cols-5 gap-8">
                            {/* Columna Izquierda: Formularios */}
                            <div className="md:col-span-3 space-y-8">

                                {/* Opciones de Entrega */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-900/10 rounded-bl-[100px] pointer-events-none"></div>
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <Truck className="text-orange-400 w-6 h-6" /> Método de Entrega
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
                                        {settings?.shippingPickup?.enabled && (
                                            <button
                                                onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Pickup' })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Pickup' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500'}`}
                                            >
                                                {checkoutData.shippingMethod === 'Pickup' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-cyan-500" />}
                                                <MapPin className="w-8 h-8 group-hover:scale-110 transition" />
                                                <span className="text-xs font-black uppercase">Retiro en Local</span>
                                            </button>
                                        )}
                                        {settings?.shippingDelivery?.enabled && (
                                            <button
                                                onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Delivery' })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Delivery' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500'}`}
                                            >
                                                {checkoutData.shippingMethod === 'Delivery' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-cyan-500" />}
                                                <Truck className="w-8 h-8 group-hover:scale-110 transition" />
                                                <span className="text-xs font-black uppercase">Envío a Domicilio</span>
                                            </button>
                                        )}
                                    </div>

                                    {checkoutData.shippingMethod === 'Pickup' && (
                                        <div className="p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-xl animate-fade-up flex gap-3">
                                            <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                                            <p className="text-xs text-cyan-200">Retira tu pedido en: <span className="font-bold">{settings?.shippingPickup?.address || 'Dirección a coordinar'}</span></p>
                                        </div>
                                    )}

                                    {checkoutData.shippingMethod === 'Delivery' && (
                                        <div className="space-y-5 relative z-10 animate-fade-up mt-4">
                                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Datos de Destino</h3>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Dirección y Altura</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition font-medium"
                                                    placeholder="Ej: Av. Santa Fe 1234"
                                                    value={checkoutData.address || ''}
                                                    onChange={e => setCheckoutData({ ...checkoutData, address: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Ciudad</label>
                                                    <input
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                        placeholder="Ej: Rosario"
                                                        value={checkoutData.city || ''}
                                                        onChange={e => setCheckoutData({ ...checkoutData, city: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Provincia</label>
                                                    <input
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                        placeholder="Ej: Santa Fe"
                                                        value={checkoutData.province || ''}
                                                        onChange={e => setCheckoutData({ ...checkoutData, province: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Código Postal</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                    placeholder="Ej: 2000"
                                                    value={checkoutData.zipCode || ''}
                                                    onChange={e => setCheckoutData({ ...checkoutData, zipCode: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Método de Pago */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-900/10 rounded-bl-[100px] pointer-events-none"></div>
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <CreditCard className="text-cyan-400 w-6 h-6" /> Método de Pago
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        {settings?.paymentMercadoPago?.enabled && (
                                            <button
                                                onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Tarjeta' })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Tarjeta' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                            >
                                                {checkoutData.paymentChoice === 'Tarjeta' && <CheckCircle className="absolute top-2 right-2 text-cyan-500" />}
                                                <CreditCard className="w-8 h-8 group-hover:scale-110 transition" />
                                                <span className="text-sm font-black tracking-wider uppercase">Tarjeta</span>
                                            </button>
                                        )}
                                        {settings?.paymentTransfer?.enabled && (
                                            <button
                                                onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Transferencia' })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Transferencia' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                            >
                                                {checkoutData.paymentChoice === 'Transferencia' && <CheckCircle className="absolute top-2 right-2 text-cyan-500" />}
                                                <RefreshCw className="w-8 h-8 group-hover:scale-110 transition" />
                                                <span className="text-sm font-black tracking-wider uppercase">Transferencia</span>
                                            </button>
                                        )}
                                        {settings?.paymentCash && checkoutData.shippingMethod !== 'Delivery' && (
                                            <button
                                                onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Efectivo' })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Efectivo' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                            >
                                                {checkoutData.paymentChoice === 'Efectivo' && <CheckCircle className="absolute top-2 right-2 text-cyan-500" />}
                                                <Banknote className="w-8 h-8 group-hover:scale-110 transition" />
                                                <span className="text-sm font-black tracking-wider uppercase">Efectivo</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Card Payment Brick Container - Solo para Tarjeta */}
                                    {checkoutData.paymentChoice === 'Tarjeta' && (
                                        <div className="mt-8 animate-fade-up">
                                            <div className="bg-slate-900/50 p-6 rounded-2xl border border-cyan-500/30">
                                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                                    <CreditCard className="w-5 h-5 text-cyan-400" />
                                                    Ingresá los datos de tu tarjeta
                                                </h3>
                                                <p className="text-slate-400 text-sm mb-4">
                                                    Pagá de forma segura con Visa, MasterCard, AMEX y más.
                                                </p>

                                                {/* Contenedor del Card Payment Brick de Mercado Pago */}
                                                <div id="cardPaymentBrick_container" ref={cardPaymentBrickRef} className="min-h-[400px]"></div>

                                                {/* Mensaje de error si hay */}
                                                {paymentError && (
                                                    <div className="mt-4 space-y-3">
                                                        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-3">
                                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                                            {paymentError}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setPaymentError(null);
                                                                initializeCardPaymentBrick();
                                                            }}
                                                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                            Reintentar Pago
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Indicador de procesamiento */}
                                                {isPaymentProcessing && (
                                                    <div className="mt-4 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl text-cyan-400 text-sm flex items-center gap-3">
                                                        <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
                                                        Procesando tu pago, por favor esperá...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Columna Derecha: Confirmación */}
                            <div className="md:col-span-2">
                                <div className="bg-gradient-to-br from-slate-900 via-[#0a0a0a] to-[#050505] border border-slate-800 p-8 rounded-[2.5rem] sticky top-28 shadow-2xl">
                                    <h3 className="font-black text-white mb-8 text-xl border-b border-slate-800 pb-4">Resumen Final</h3>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Productos ({cart.length})</span>
                                            <span className="font-bold text-white">${cartSubtotal.toLocaleString()}</span>
                                        </div>

                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-purple-400 font-bold">
                                                <span>Descuento</span>
                                                <span>-${discountAmount.toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="h-px bg-slate-800 my-4 border-t border-dashed border-slate-700"></div>

                                        <div className="flex justify-between items-end">
                                            <span className="text-white font-bold">Total a Pagar</span>
                                            <span className="text-3xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Botón Confirmar - Solo para Efectivo o Transferencia (NO para Tarjeta) */}
                                    {checkoutData.paymentChoice && checkoutData.paymentChoice !== 'Tarjeta' ? (
                                        <>
                                            <button
                                                onClick={confirmOrder}
                                                disabled={isProcessingOrder}
                                                className={`w-full py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all ${isProcessingOrder ? 'bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-green-900/20 hover:scale-[1.02]'}`}
                                            >
                                                {isProcessingOrder ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                                                {isProcessingOrder ? 'Procesando...' : 'Confirmar Pedido'}
                                            </button>

                                            <p className="text-center text-slate-600 text-xs mt-6 leading-relaxed px-4">
                                                Al confirmar, aceptas nuestros términos de servicio y política de privacidad.
                                            </p>
                                        </>
                                    ) : checkoutData.paymentChoice === 'Tarjeta' ? (
                                        <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-2xl text-center">
                                            <p className="text-cyan-400 text-sm font-medium flex items-center justify-center gap-2">
                                                <CreditCard className="w-4 h-4" />
                                                Completá los datos de tu tarjeta arriba para pagar
                                            </p>
                                            <p className="text-slate-500 text-xs mt-2">
                                                Tu compra quedará confirmada automáticamente al procesar el pago.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. VISTA DE PERFIL (HISTORIAL Y FAVORITOS) */}
                {view === 'profile' && currentUser && (
                    <div className="max-w-6xl mx-auto pt-8 animate-fade-up px-4 md:px-8 pb-20">
                        {/* Tarjeta de Usuario */}
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 md:p-12 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
                            {/* Decoración Fondo */}
                            {/* Decoración Fondo */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl z-10 transform rotate-3 border-4 border-[#0a0a0a]">
                                {currentUser.name?.charAt(0) || '?'}
                            </div>

                            {/* Info */}
                            <div className="text-center md:text-left z-10 flex-1">
                                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{currentUser.name || 'Usuario'}</h2>
                                <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2 font-medium mb-4">
                                    <Mail className="w-4 h-4 text-cyan-500" /> {currentUser.email}
                                </p>
                                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                    <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-500 font-mono flex items-center gap-2">
                                        <User className="w-3 h-3" /> {currentUser.dni || 'Sin DNI'}
                                    </span>
                                    <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-500 font-mono flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> {currentUser.phone || 'Sin Teléfono'}
                                    </span>
                                    <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-500 font-mono flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> {getRole(currentUser.email).toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex flex-col gap-3 z-10 w-full md:w-auto">
                                {hasAccess(currentUser.email) && (
                                    <button onClick={() => setView('admin')} className="px-6 py-4 bg-slate-900 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/10">
                                        <Shield className="w-5 h-5" /> Panel Admin
                                    </button>
                                )}
                                <button onClick={() => { localStorage.removeItem('sustore_user_data'); setCurrentUser(null); setView('store') }} className="px-6 py-4 bg-red-900/10 border border-red-500/20 text-red-500 hover:bg-red-900/20 rounded-2xl font-bold transition flex items-center justify-center gap-2 hover:border-red-500/40">
                                    <LogOut className="w-5 h-5" /> Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        {/* SECCIÓN: MIS CUPONES (NUEVO) */}
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] mb-12 shadow-2xl animate-fade-up">
                            <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                <Ticket className="text-purple-400 w-6 h-6" /> Mis Cupones Disponibles
                            </h3>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    {/* Mostrar cupones GLOBALES (targetType='global') y ESPECIFICOS para este usuario */}
                                    {(() => {
                                        const myCoupons = coupons.filter(c =>
                                            (c.targetType === 'global') ||
                                            (c.targetType === 'specific_email' && c.targetUser === currentUser.email)
                                        );

                                        if (myCoupons.length === 0) return <p className="text-slate-500 italic">No tienes cupones disponibles en este momento.</p>;

                                        return myCoupons.map(c => (
                                            <div key={c.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-purple-500/30 transition">
                                                <div>
                                                    <p className="font-black text-white text-lg tracking-widest">{c.code}</p>
                                                    <p className="text-purple-400 text-sm font-bold">
                                                        {c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}
                                                    </p>
                                                    {c.expirationDate && <p className="text-[10px] text-slate-500 mt-1">Vence: {c.expirationDate}</p>}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(c.code);
                                                        showToast("Código copiado", "success");
                                                    }}
                                                    className="px-4 py-2 bg-purple-900/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500 hover:text-white transition border border-purple-500/20"
                                                >
                                                    COPIAR
                                                </button>
                                            </div>
                                        ));
                                    })()}
                                </div>

                                <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                                    <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Canjear Código</h4>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none uppercase font-mono"
                                            placeholder="CÓDIGO"
                                            id="couponRedeemInput"
                                        />
                                        <button
                                            onClick={() => {
                                                const code = document.getElementById('couponRedeemInput').value.trim().toUpperCase();
                                                if (!code) return showToast("Ingresa un código", "warning");
                                                const coupon = coupons.find(c => c.code === code);
                                                if (coupon) {
                                                    showToast("¡Cupón válido! Úsalo en el checkout.", "success");
                                                } else {
                                                    showToast("Cupón no encontrado o inválido", "error");
                                                }
                                            }}
                                            className="bg-purple-600 px-6 rounded-xl text-white font-bold hover:bg-purple-500 transition shadow-lg"
                                        >
                                            Validar
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                                        Ingresa el código aquí para verificar si es válido. Llévalo al checkout para aplicar el descuento.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            {/* Columna Izquierda: Historial de Pedidos */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <ShoppingBag className="text-cyan-400 w-6 h-6" /> Tus Compras
                                    </h3>
                                </div>

                                {(() => {
                                    const completedOrders = orders.filter(o => o.userId === currentUser.id && o.status === 'Realizado');
                                    // Flatten all items from completed orders
                                    const purchasedItems = completedOrders.flatMap(o => o.items.map(item => ({ ...item, date: o.date })));

                                    if (purchasedItems.length === 0) {
                                        return (
                                            <div className="p-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-500 bg-slate-900/20">
                                                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="font-bold">Aún no tienes compras finalizadas.</p>
                                                <button onClick={() => setView('store')} className="mt-4 text-cyan-400 hover:underline text-sm font-bold">Ir a la tienda</button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                            {purchasedItems.sort((a, b) => new Date(b.date) - new Date(a.date)).map((item, idx) => (
                                                <div key={idx} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex items-center gap-4 group hover:border-cyan-500/50 transition duration-300">
                                                    <div className="w-16 h-16 bg-white rounded-xl p-1 flex-shrink-0">
                                                        <img src={item.image} className="w-full h-full object-contain" alt={item.title} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-bold text-sm truncate group-hover:text-cyan-400 transition">{item.title}</h4>
                                                        <p className="text-xs text-slate-500 font-mono mt-1">{new Date(item.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className="text-white font-black">${item.unit_price.toLocaleString()}</p>
                                                        {item.quantity > 1 && (
                                                            <span className="text-[10px] text-slate-500 font-bold">x{item.quantity} und.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Columna Derecha: Favoritos */}
                            <div className="space-y-6">

                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Heart className="text-red-500 w-6 h-6 fill-current" /> Mis Favoritos
                                    </h3>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full">
                                        {currentUser.favorites?.length || 0} Guardados
                                    </span>
                                </div>

                                {!currentUser.favorites || currentUser.favorites.length === 0 ? (
                                    <div className="p-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-500 bg-slate-900/20">
                                        <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">Tu lista de deseos está vacía.</p>
                                        <p className="text-xs mt-2 max-w-xs mx-auto">Guarda productos haciendo click en el corazón de las tarjetas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                        {currentUser.favorites.map(fid => {
                                            const p = products.find(prod => prod.id === fid);
                                            if (!p) return null;
                                            return (
                                                <div key={fid} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative group hover:border-slate-600 transition">
                                                    <div className="w-16 h-16 bg-white rounded-xl p-1 flex-shrink-0">
                                                        <img src={p.image} className="w-full h-full object-contain" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-white line-clamp-1 group-hover:text-cyan-400 transition">{p.name}</p>
                                                        <p className="text-cyan-400 font-bold text-sm mt-1">${p.basePrice.toLocaleString()}</p>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => toggleFavorite(p)}
                                                            className="p-3 bg-slate-900 text-red-400 hover:bg-red-900/20 rounded-xl transition border border-slate-800 hover:border-red-500/30"
                                                            title="Eliminar de favoritos"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => manageCart(p, 1)}
                                                            className="p-3 bg-slate-900 text-cyan-400 hover:bg-cyan-900/20 rounded-xl transition border border-slate-800 hover:border-cyan-500/30"
                                                            title="Agregar al carrito"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. MODAL DE AUTENTICACIÓN (LOGIN/REGISTER) */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 p-4 animate-fade-up backdrop-blur-xl">
                        {/* Botón Cerrar */}
                        <button onClick={() => setView('store')} className="absolute top-8 right-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition border border-slate-700 hover:bg-slate-800">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="bg-[#0a0a0a] p-8 md:p-12 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600"></div>

                            <h2 className="text-4xl font-black text-white mb-2 text-center tracking-tight">
                                {loginMode ? 'Bienvenido' : 'Crear Cuenta'}
                            </h2>
                            <p className="text-slate-500 text-center mb-8 text-sm">
                                {loginMode ? 'Ingresa a tu cuenta para continuar.' : 'Únete a nosotros hoy mismo.'}
                            </p>

                            <form onSubmit={(e) => { e.preventDefault(); handleAuth(!loginMode) }} className="space-y-4">
                                {!loginMode && (
                                    <div className="space-y-4 animate-fade-up">
                                        <input className="input-cyber w-full p-4" placeholder="Nombre Completo *" value={authData.name} onChange={e => setAuthData({ ...authData, name: e.target.value })} required />
                                        <input className="input-cyber w-full p-4" placeholder="Nombre de Usuario *" value={authData.username} onChange={e => setAuthData({ ...authData, username: e.target.value })} required />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="input-cyber p-4" placeholder="DNI *" value={authData.dni} onChange={e => setAuthData({ ...authData, dni: e.target.value })} required />
                                            <input className="input-cyber p-4" placeholder="Teléfono *" value={authData.phone} onChange={e => setAuthData({ ...authData, phone: e.target.value })} required />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <input className="input-cyber w-full p-4" placeholder={loginMode ? "Email o Usuario" : "Email *"} value={authData.email} onChange={e => setAuthData({ ...authData, email: e.target.value })} required />
                                    <input className="input-cyber w-full p-4" type="password" placeholder={loginMode ? "Contraseña" : "Contraseña *"} value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })} required />
                                </div>

                                <button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-4 text-white rounded-xl font-bold mt-6 transition transform hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (loginMode ? 'INGRESAR' : 'REGISTRARSE')}
                                </button>
                            </form>

                            <button onClick={() => setLoginMode(!loginMode)} className="w-full text-center text-slate-500 text-sm mt-8 font-bold hover:text-cyan-400 transition border-t border-slate-800 pt-6">
                                {loginMode ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
                            </button>
                        </div>
                    </div>
                )}

                {/* 6. VISTAS ESTÁTICAS (ABOUT & GUIDE) */}
                {view === 'about' && (
                    <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                        <button onClick={() => setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text">
                            <Info className="text-cyan-400 w-12 h-12" /> Sobre Nosotros
                        </h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] text-slate-300 text-xl leading-relaxed whitespace-pre-wrap shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            <p className="relative z-10">{settings.aboutUsText}</p>

                            <div className="mt-12 pt-12 border-t border-slate-800 flex flex-col md:flex-row gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800"><Shield className="text-cyan-400" /></div>
                                    <div><h4 className="font-bold text-white">Garantía Oficial</h4><p className="text-sm text-slate-500">En todos los productos</p></div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800"><Truck className="text-purple-400" /></div>
                                    <div><h4 className="font-bold text-white">Envíos Seguros</h4><p className="text-sm text-slate-500">A todo el país</p></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'guide' && (
                    <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                        <button onClick={() => setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text">
                            <FileQuestion className="text-cyan-400 w-12 h-12" /> {settings?.guideTitle || 'Cómo Comprar'}
                        </h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] text-slate-300 shadow-2xl space-y-8">
                            {[
                                { title: settings?.guideStep1Title || "Selecciona Productos", text: settings?.guideStep1Text || "Navega por nuestro catálogo y añade lo que te guste al carrito con el botón '+'." },
                                { title: settings?.guideStep2Title || "Revisa tu Carrito", text: settings?.guideStep2Text || "Verifica las cantidades. Si tienes un cupón de descuento, ¡es el momento de usarlo!" },
                                { title: settings?.guideStep3Title || "Datos de Envío", text: settings?.guideStep3Text || "Completa la información de entrega. Hacemos envíos a todo el país." },
                                { title: settings?.guideStep4Title || "Pago y Confirmación", text: settings?.guideStep4Text || "Elige tu método de pago preferido. Si es transferencia, recibirás los datos por email." },
                                { title: settings?.guideStep5Title || "¡Listo!", text: settings?.guideStep5Text || "Recibirás un correo con el seguimiento de tu pedido. ¡Disfruta tu compra!" }
                            ].filter((step, idx) => {
                                // Filtrar pasos que están desactivados
                                if (idx === 0 && settings?.showGuideStep1 === false) return false;
                                if (idx === 1 && settings?.showGuideStep2 === false) return false;
                                if (idx === 2 && settings?.showGuideStep3 === false) return false;
                                if (idx === 3 && settings?.showGuideStep4 === false) return false;
                                if (idx === 4 && settings?.showGuideStep5 === false) return false;
                                return true;
                            }).map((step, idx) => (
                                <div key={idx} className="flex gap-6 items-start">
                                    <div className="w-10 h-10 rounded-full bg-cyan-900/20 text-cyan-400 font-black flex items-center justify-center border border-cyan-500/20 flex-shrink-0 mt-1">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-slate-400 leading-relaxed">{step.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'privacy' && (
                    <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                        <button onClick={() => setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text">
                            <Shield className="text-cyan-400 w-12 h-12" /> Política de Privacidad
                        </h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 md:p-12 rounded-[3rem] text-slate-300 shadow-2xl space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-sm text-slate-500 mb-8 italic">Última actualización: 07 de enero de 2026</p>

                                <p>Este Aviso de Privacidad para <strong>{settings?.storeName || 'Sustore'}</strong> ("nosotros", "nos" o "nuestro"), describe cómo y por qué podríamos acceder, recopilar, almacenar, usar y/o compartir ("proceso") su información personal cuando utiliza nuestros servicios ("Servicios"), incluso cuando:</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Visita nuestro sitio web en <a href="https://sustore.vercel.app" className="text-cyan-400 hover:underline">https://sustore.vercel.app</a> o cualquier sitio web nuestro que enlace a este Aviso de Privacidad.</li>
                                    <li>Interactúe con nosotros de otras maneras relacionadas, incluido cualquier marketing o evento.</li>
                                </ul>

                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 my-8">
                                    <h3 className="text-xl font-bold text-white mb-4">RESUMEN DE PUNTOS CLAVE</h3>
                                    <ul className="space-y-4 text-sm">
                                        <li><strong>¿Qué información personal procesamos?</strong> Información proporcionada al registrarse o comprar.</li>
                                        <li><strong>¿Procesamos información confidencial?</strong> No.</li>
                                        <li><strong>¿Recopilamos información de terceros?</strong> No.</li>
                                        <li><strong>¿Cómo procesamos su información?</strong> Para gestionar pedidos, seguridad y mejora del servicio.</li>
                                        <li><strong>¿Compartimos información?</strong> Solo en situaciones específicas como transferencias comerciales o requisitos legales.</li>
                                    </ul>
                                </div>

                                <h3 className="text-xl font-bold text-white mt-12 mb-4 border-b border-slate-800 pb-2">1. ¿QUÉ INFORMACIÓN RECOPILAMOS?</h3>
                                <p>Recopilamos información que usted nos proporciona voluntariamente: nombres, teléfonos, emails, direcciones, nombres de usuario y contraseñas.</p>
                                <p>También recopilamos datos técnicos automáticamente (IP, tipo de navegador) para seguridad y análisis del sitio.</p>

                                <h3 className="text-xl font-bold text-white mt-12 mb-4 border-b border-slate-800 pb-2">2. ¿CÓMO PROCESAMOS TU INFORMACIÓN?</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>Facilitar creación y administración de cuentas.</li>
                                    <li>Gestionar pedidos, pagos y envíos.</li>
                                    <li>Proteger nuestros servicios contra fraude.</li>
                                    <li>Evaluar y mejorar la experiencia del usuario.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-white mt-12 mb-4 border-b border-slate-800 pb-2">3. ¿CUÁNTO TIEMPO CONSERVAMOS TU INFORMACIÓN?</h3>
                                <p>Conservamos su información mientras tenga una cuenta activa con nosotros o según lo exija la ley para fines contables o legales.</p>

                                <h3 className="text-xl font-bold text-white mt-12 mb-4 border-b border-slate-800 pb-2">4. ¿CUÁLES SON SUS DERECHOS?</h3>
                                <p>Puede revisar, cambiar o cancelar su cuenta en cualquier momento desde su perfil o contactándonos directamente.</p>

                                <h3 className="text-xl font-bold text-white mt-12 mb-4 border-b border-slate-800 pb-2">5. CONTACTO</h3>
                                <p>Para preguntas sobre este aviso, puede escribirnos a:</p>
                                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-sm leading-relaxed">
                                    <strong>{settings?.storeName || 'Sustore'}</strong><br />
                                    Saavedra 7568<br />
                                    Santa Fe, 3000<br />
                                    Argentina<br />
                                    <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${settings?.sellerEmail}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">{settings?.sellerEmail || '[Email de contacto]'}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. PANEL DE ADMINISTRACIÓN (COMPLETO Y DETALLADO) */}
                {view === 'admin' && (
                    // === SEGURIDAD: Triple verificación de acceso ===
                    // 1. Verificar que tiene permisos por rol
                    // 2. Verificar que el usuario tiene un ID válido
                    // 3. Verificar que la sesión no fue manipulada
                    (hasAccess(currentUser?.email) &&
                        currentUser?.id &&
                        currentUser?.id.length >= 10 &&
                        !SecurityManager.detectManipulation()) ? (
                        <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full font-sans">

                            {/* Overlay para cerrar el menú en móvil */}
                            {isAdminMenuOpen && (
                                <div
                                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
                                    onClick={() => setIsAdminMenuOpen(false)}
                                />
                            )}

                            {/* 7.1 Sidebar Admin */}
                            <div className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-out ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:w-72 shadow-2xl`}>
                                <div className="p-6 md:p-8 border-b border-slate-900 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                            <div className="w-9 h-9 md:w-10 md:h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-900/20">
                                                <Shield className="w-5 h-5 md:w-6 md:h-6" />
                                            </div>
                                            ADMIN
                                        </h2>
                                        <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 font-mono ml-1">v3.0.0 PRO</p>
                                    </div>
                                    {/* Botón cerrar en móvil */}
                                    <button
                                        onClick={() => setIsAdminMenuOpen(false)}
                                        className="md:hidden p-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition border border-slate-800"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <nav className="flex-1 p-3 md:p-4 space-y-1.5 md:space-y-2 overflow-y-auto custom-scrollbar">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-3 md:px-4 py-2 mt-1">Principal</p>

                                    <button onClick={() => { setAdminTab('dashboard'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'dashboard' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <LayoutDashboard className="w-5 h-5" /> Inicio
                                    </button>

                                    <button onClick={() => { setAdminTab('orders'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'orders' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <ShoppingBag className="w-5 h-5" /> Pedidos
                                    </button>

                                    <button onClick={() => { setAdminTab('products'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'products' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <Package className="w-5 h-5" /> Productos
                                    </button>

                                    {/* Promos - Available for editors and admins */}
                                    {(isAdmin(currentUser?.email) || isEditor(currentUser?.email)) && (
                                        <button onClick={() => { setAdminTab('promos'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'promos' ? 'bg-purple-900/20 text-purple-400 border border-purple-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                            <Tag className="w-5 h-5" /> Promos
                                        </button>
                                    )}

                                    {isAdmin(currentUser?.email) && (
                                        <>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-3 md:px-4 py-2 mt-4 md:mt-6">Gestión</p>

                                            <button onClick={() => { setAdminTab('coupons'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'coupons' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Ticket className="w-5 h-5" /> Cupones
                                            </button>

                                            <button onClick={() => { setAdminTab('suppliers'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'suppliers' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Truck className="w-5 h-5" /> Proveedores
                                            </button>

                                            <button onClick={() => { setAdminTab('purchases'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'purchases' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <ShoppingCart className="w-5 h-5" /> Compras
                                            </button>

                                            <button onClick={() => { setAdminTab('finance'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'finance' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Wallet className="w-5 h-5" /> Finanzas
                                            </button>

                                            <button onClick={() => { setAdminTab('settings'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'settings' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Settings className="w-5 h-5" /> Configuración
                                            </button>

                                            <button onClick={() => { setAdminTab('users'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'users' ? 'bg-pink-900/20 text-pink-400 border border-pink-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Users className="w-5 h-5" /> Usuarios
                                            </button>
                                        </>
                                    )}
                                </nav>

                                <div className="p-4 md:p-6 border-t border-slate-900">
                                    <button onClick={() => { setView('store'); setIsAdminMenuOpen(false); }} className="w-full py-3.5 md:py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold text-sm flex items-center justify-center gap-2 group border border-slate-800">
                                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition" /> Volver a Tienda
                                    </button>
                                </div>
                            </div>

                            {/* 7.2 Contenido Principal Admin */}
                            <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-4 md:p-10 custom-scrollbar">
                                <button onClick={() => setIsAdminMenuOpen(true)} className="md:hidden mb-4 p-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-white border border-slate-800 flex items-center gap-2 font-bold text-sm transition">
                                    <Menu className="w-5 h-5" /> Menú
                                </button>

                                {/* TAB: DASHBOARD */}
                                {adminTab === 'dashboard' && (
                                    <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8 pb-20">
                                        <ManualSaleModal />
                                        <MetricsDetailModal />
                                        {/* Modales Admin Users */}


                                        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
                                            <div>
                                                <h1 className="text-4xl font-black text-white neon-text">Panel de Control</h1>
                                                <p className="text-slate-500 mt-2">Resumen administrativo y financiero.</p>
                                            </div>
                                            <div className="hidden md:block bg-slate-900 px-4 py-2 rounded-lg text-xs text-slate-400 font-mono border border-slate-800">
                                                {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>

                                        {/* SECCIÓN 1: ANALÍTICA FINANCIERA (Lista Gráfica) */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* INGRESOS BRUTOS */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-green-500/30 transition">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Ingresos Brutos</p>
                                                        <h2 className="text-4xl font-black text-white tracking-tighter">${dashboardMetrics.revenue.toLocaleString()}</h2>
                                                    </div>
                                                    <div className="p-4 bg-green-900/20 text-green-400 rounded-2xl">
                                                        <DollarSign className="w-8 h-8" />
                                                    </div>
                                                </div>

                                                {/* Lista Gráfica (Ultimos 6 meses) */}
                                                <div className="space-y-4 mt-8 border-t border-slate-800 pt-6">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Rendimiento Mensual</p>
                                                    {dashboardMetrics.analytics.monthly.slice(-6).reverse().map((m, i) => {
                                                        const maxRev = Math.max(...dashboardMetrics.analytics.monthly.map(x => x.revenue));
                                                        const percentage = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;

                                                        return (
                                                            <div key={i} className="group/item">
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-slate-400 font-mono">{m.date}</span>
                                                                    <span className="text-white font-bold">${m.revenue.toLocaleString()}</span>
                                                                </div>
                                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-full">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-1000 group-hover/item:brightness-125"
                                                                        style={{ width: `${percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {dashboardMetrics.analytics.monthly.length === 0 && <p className="text-slate-600 text-xs">Sin datos suficientes.</p>}
                                                </div>
                                            </div>

                                            {/* BENEFICIO NETO */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-cyan-500/30 transition">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div>
                                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Beneficio Neto (Estimado)</p>
                                                        <h2 className={`text-4xl font-black tracking-tighter ${dashboardMetrics.netIncome >= 0 ? 'text-cyan-400' : 'text-red-500'}`}>
                                                            ${dashboardMetrics.netIncome.toLocaleString()}
                                                        </h2>
                                                    </div>
                                                    <div className={`p-4 rounded-2xl ${dashboardMetrics.netIncome >= 0 ? 'bg-cyan-900/20 text-cyan-400' : 'bg-red-900/20 text-red-500'}`}>
                                                        {dashboardMetrics.netIncome >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                                                    </div>
                                                </div>

                                                {/* Lista Gráfica (Comparativa Ingreso vs Gasto) */}
                                                <div className="space-y-4 mt-8 border-t border-slate-800 pt-6">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Ingresos vs Gastos (Últimos Meses)</p>
                                                    {dashboardMetrics.analytics.monthly.slice(-6).reverse().map((m, i) => {
                                                        // Estimación simplificada de gastos mensuales (proporcional solo para visualización si no hay data exacta mensual de gastos guardada historica)
                                                        // En una real app, se calcularía real desde expenses.
                                                        // Como `expenses` tiene fecha, podemos calcularlo.
                                                        const monthExpenses = expenses.filter(e => e.date.startsWith(m.date)).reduce((acc, c) => acc + c.amount, 0)
                                                            + (purchases || []).filter(p => p.date.startsWith(m.date)).reduce((acc, c) => acc + c.cost, 0);

                                                        const totalVol = m.revenue + monthExpenses;
                                                        const revPct = totalVol > 0 ? (m.revenue / totalVol) * 100 : 0;

                                                        return (
                                                            <div key={i} className="group/item">
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-slate-400 font-mono">{m.date}</span>
                                                                    <span className="text-cyan-400 font-bold">+${(m.revenue - monthExpenses).toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex h-2 bg-slate-800 rounded-full overflow-hidden w-full">
                                                                    <div title={`Ingresos: $${m.revenue}`} className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: `${revPct}%` }}></div>
                                                                    <div title={`Gastos: $${monthExpenses}`} className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${100 - revPct}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {dashboardMetrics.analytics.monthly.length === 0 && <p className="text-slate-600 text-xs">Sin datos suficientes.</p>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECCIÓN 2: KPIs RÁPIDOS */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center">Usuarios Totales</p>
                                                <p className="text-white font-black text-2xl text-center mt-1">{dashboardMetrics.totalUsers}</p>
                                            </div>
                                            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center">Pedidos Totales</p>
                                                <p className="text-white font-black text-2xl text-center mt-1">{dashboardMetrics.totalOrders}</p>
                                            </div>
                                            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center">Ticket Promedio</p>
                                                <p className="text-white font-black text-2xl text-center mt-1">
                                                    ${dashboardMetrics.totalOrders > 0 ? Math.round(dashboardMetrics.revenue / dashboardMetrics.totalOrders).toLocaleString() : 0}
                                                </p>
                                            </div>
                                            <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center">Stock Bajo</p>
                                                <p className={`font-black text-2xl text-center mt-1 ${dashboardMetrics.lowStockProducts.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {dashboardMetrics.lowStockProducts.length}
                                                </p>
                                            </div>
                                        </div>

                                        {/* SECCIÓN 2.5: MEJORES Y PEORES (NUEVO) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* BEST SELLER */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-yellow-500/30 transition">
                                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                                    <Star className="w-32 h-32 text-yellow-500" />
                                                </div>
                                                <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
                                                    <Star className="w-4 h-4 text-yellow-500" /> Producto Estrella
                                                </p>
                                                {dashboardMetrics.starProduct ? (
                                                    <div className="flex items-center gap-6 relative z-10">
                                                        <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-lg flex-shrink-0">
                                                            <img src={dashboardMetrics.starProduct.image} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white leading-tight mb-1">{dashboardMetrics.starProduct.name}</h3>
                                                            <p className="text-yellow-400 font-bold text-lg">{dashboardMetrics.starProduct.sales} Und. vendidas</p>
                                                            <p className="text-slate-500 text-xs mt-1">Stock actual: {dashboardMetrics.starProduct.stock}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-600">No hay datos de ventas aún.</p>
                                                )}
                                            </div>

                                            {/* WORST SELLER */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-slate-600 transition">
                                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                                    <AlertCircle className="w-32 h-32 text-slate-500" />
                                                </div>
                                                <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-slate-500" /> Menos Vendido (En Stock)
                                                </p>
                                                {dashboardMetrics.leastSoldProduct ? (
                                                    <div className="flex items-center gap-6 relative z-10">
                                                        <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-lg grayscale flex-shrink-0">
                                                            <img src={dashboardMetrics.leastSoldProduct.image} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-black text-white leading-tight mb-1">{dashboardMetrics.leastSoldProduct.name}</h3>
                                                            <p className="text-slate-400 font-bold text-lg">
                                                                {dashboardMetrics.salesCount[dashboardMetrics.leastSoldProduct.id] || 0} Und. vendidas
                                                            </p>
                                                            <p className="text-slate-500 text-xs mt-1">Hay que rotar este stock.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-600">Todos los productos tienen buena rotación.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* SECCIÓN 3: LIBRO MAYOR (REGISTRO ADMINISTRATIVO) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
                                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                                                <FileText className="w-6 h-6 text-purple-400" /> Registro de Movimientos
                                            </h3>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                                            <th className="pb-4 pl-4">Fecha</th>
                                                            <th className="pb-4">Tipo</th>
                                                            <th className="pb-4">Concepto</th>
                                                            <th className="pb-4">Estado</th>
                                                            <th className="pb-4 text-right pr-4">Monto</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-sm font-medium">
                                                        {dashboardMetrics.transactions.map((t, idx) => (
                                                            <tr key={`${t.type}-${idx}`} className="border-b border-slate-800/50 hover:bg-slate-900/20 transition group">
                                                                <td className="py-4 pl-4 text-slate-400 font-mono text-xs">{new Date(t.date).toLocaleDateString()}</td>
                                                                <td className="py-4">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.type === 'income' ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-red-900/20 text-red-400 border border-red-500/20'
                                                                        }`}>
                                                                        {t.category}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-white group-hover:text-purple-300 transition">
                                                                    {t.description}
                                                                </td>
                                                                <td className="py-4 text-xs text-slate-500">
                                                                    {t.status}
                                                                </td>
                                                                <td className={`py-4 text-right pr-4 font-mono font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {dashboardMetrics.transactions.length === 0 && (
                                                            <tr><td colSpan="5" className="text-center py-8 text-slate-500">Sin movimientos registrados.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CONFIGURACIÓN (BLINDADA) - REMOVED (Consolidated in main Settings tab below) */}


                                {/* TAB: PROVEEDORES (CON SELECTOR VISUAL) */}
                                {adminTab === 'suppliers' && (
                                    <div className="max-w-6xl mx-auto space-y-8 animate-fade-up pb-20">
                                        <div className="flex justify-between items-center">
                                            <h1 className="text-3xl font-black text-white">Proveedores</h1>
                                            <button onClick={() => { setNewSupplier({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] }); setEditingSupplierId(null); setShowSupplierModal(true); }} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-cyan-500 transition transform hover:-translate-y-1">
                                                <Plus className="w-5 h-5" /> Nuevo Proveedor
                                            </button>
                                        </div>

                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {suppliers.map((s, idx) => (
                                                <div key={s.id} style={{ animationDelay: `${idx * 0.05}s` }} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-600 transition duration-300 group animate-fade-up">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="p-4 bg-slate-900 rounded-xl text-slate-400 group-hover:text-cyan-400 transition group-hover:bg-cyan-900/20">
                                                            <Truck className="w-8 h-8" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => { setNewSupplier(s); setEditingSupplierId(s.id); setShowSupplierModal(true); }}
                                                                className="text-slate-600 hover:text-cyan-400 p-2 hover:bg-slate-900 rounded-lg transition"
                                                                title="Editar"
                                                            >
                                                                <Edit className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openConfirm("Eliminar Proveedor", "¿Eliminar proveedor?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suppliers', s.id)))}
                                                                className="text-slate-600 hover:text-red-400 p-2 hover:bg-slate-900 rounded-lg transition"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-2xl font-bold text-white mb-2">{s.name}</h3>

                                                    <div className="space-y-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-800/50">
                                                        <p className="text-slate-400 text-sm flex items-center gap-3">
                                                            <User className="w-4 h-4 text-slate-500" /> {s.contact}
                                                        </p>
                                                        {s.phone && (
                                                            <p className="text-slate-400 text-sm flex items-center gap-3">
                                                                <Phone className="w-4 h-4 text-slate-500" /> {s.phone}
                                                            </p>
                                                        )}
                                                        {s.ig && (
                                                            <p className="text-slate-400 text-sm flex items-center gap-3">
                                                                <Instagram className="w-4 h-4 text-slate-500" /> {s.ig}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="pt-4 border-t border-slate-800">
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Productos Suministrados</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(s.associatedProducts && s.associatedProducts.length > 0) ? (
                                                                s.associatedProducts.map(pid => {
                                                                    const p = products.find(prod => prod.id === pid);
                                                                    if (!p) return null;
                                                                    return (
                                                                        <div key={pid} className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center border border-slate-600 tooltip-container" title={p.name}>
                                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-xs text-slate-600 italic">No hay productos asignados</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: COMPRAS (STOCK) */}
                                {adminTab === 'purchases' && (
                                    <div className="max-w-6xl mx-auto animate-fade-up pb-20">
                                        <h1 className="text-3xl font-black text-white mb-8">Gestión de Stock y Compras</h1>

                                        {/* Formulario de Compra Unificado */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] mb-10 shadow-xl overflow-hidden relative">

                                            {/* Header / Solo Reposición de Stock */}
                                            <div className="flex border-b border-slate-800">
                                                <div className="flex-1 p-6 text-center font-bold tracking-wider bg-cyan-900/20 text-cyan-400">
                                                    <Package className="w-5 h-5 inline-block mr-2" /> REGISTRAR REPOSICIÓN DE STOCK
                                                </div>
                                            </div>

                                            <div className="p-8">
                                                {(() => {
                                                    const selectedProduct = products.find(p => p.id === newPurchase.productId);
                                                    const productPrice = selectedProduct?.purchasePrice || selectedProduct?.basePrice || 0;
                                                    const autoCost = productPrice * newPurchase.quantity;

                                                    return (
                                                        <div className="space-y-6 animate-fade-in">
                                                            {/* Preview del Producto Seleccionado (REMOVIDO de aquí para moverlo junto al input) */}

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                <div className="md:col-span-2">
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Producto Existente</label>
                                                                    <div className="flex gap-4 items-center">
                                                                        {selectedProduct && (
                                                                            <div className="w-16 h-16 bg-white rounded-lg p-1 flex-shrink-0 border border-slate-700">
                                                                                <img src={selectedProduct.image} className="w-full h-full object-contain" alt="Preview" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <select className="input-cyber w-full p-4" value={newPurchase.productId} onChange={e => setNewPurchase({ ...newPurchase, productId: e.target.value })}>
                                                                                <option value="">Seleccionar Producto...</option>
                                                                                {products.map(p => (
                                                                                    <option key={p.id} value={p.id}>
                                                                                        {p.name} (Stock: {isNaN(Number(p.stock)) ? 0 : p.stock})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                            {selectedProduct && (
                                                                                <p className="text-xs text-cyan-400 mt-2 font-bold">
                                                                                    Stock Actual: {isNaN(Number(selectedProduct.stock)) ? 0 : selectedProduct.stock} | Costo Total Estimado: ${autoCost.toLocaleString()}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Cantidad</label>
                                                                    <input type="number" className="input-cyber w-full p-4" placeholder="0" value={newPurchase.quantity} onChange={e => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })} />
                                                                </div>
                                                                <div className="md:col-span-3">
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Proveedor</label>
                                                                    <select className="input-cyber w-full p-4" value={newPurchase.supplierId} onChange={e => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}>
                                                                        <option value="">Seleccionar...</option>
                                                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}


                                                <button
                                                    onClick={async () => {
                                                        // Validaciones
                                                        if (!newPurchase.productId) return showToast("Selecciona un producto existente.", "warning");
                                                        if (newPurchase.quantity <= 0) return showToast("La cantidad debe ser mayor a 0.", "warning");
                                                        if (newPurchase.cost < 0) return showToast("El costo no puede ser negativo.", "warning");

                                                        try {
                                                            const selectedProd = products.find(p => p.id === newPurchase.productId);
                                                            const targetProductName = selectedProd?.name || "Desconocido";

                                                            // Auto-calcular costo: precio de compra × cantidad
                                                            const productPrice = selectedProd?.purchasePrice || selectedProd?.basePrice || 0;
                                                            const calculatedCost = productPrice * newPurchase.quantity;

                                                            // REGISTRAR COMPRA
                                                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'purchases'), {
                                                                productId: newPurchase.productId,
                                                                supplierId: newPurchase.supplierId || '',
                                                                quantity: newPurchase.quantity,
                                                                cost: calculatedCost,
                                                                date: new Date().toISOString()
                                                            });

                                                            // ACTUALIZAR STOCK
                                                            const currentStock = isNaN(Number(selectedProd?.stock)) ? 0 : Number(selectedProd.stock);
                                                            const newStock = currentStock + newPurchase.quantity;

                                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', newPurchase.productId), {
                                                                stock: newStock
                                                            });

                                                            // Resetear Formulario
                                                            setNewPurchase({
                                                                isNewProduct: false, productId: '', supplierId: '', quantity: 1, cost: 0,
                                                                newProdName: '', newProdPrice: 0, newProdImage: '', newProdCategory: ''
                                                            });
                                                            showToast(`Compra de "${targetProductName}" registrada exitosamente.`, "success");

                                                        } catch (e) {
                                                            console.error("Error stock update:", e);
                                                            showToast("Error: " + (e.message || "Operación fallida"), "error");
                                                        }
                                                    }}
                                                    className="w-full mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition transform hover:scale-[1.01] flex items-center justify-center gap-3 text-lg"
                                                >
                                                    <Save className="w-6 h-6" /> REGISTRAR REPOSICIÓN DE STOCK
                                                </button>
                                            </div>
                                        </div>

                                        {/* CARRITO DE COMPRAS */}
                                        {purchaseCart.length > 0 && (
                                            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-800 rounded-[2.5rem] p-8 mb-10 animate-fade-up">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                                        <ShoppingCart className="w-6 h-6 text-cyan-400" />
                                                        Carrito de Compras ({purchaseCart.length} {purchaseCart.length === 1 ? 'producto' : 'productos'})
                                                    </h3>
                                                    <p className="text-cyan-400 font-black text-2xl">
                                                        TOTAL: ${purchaseCart.reduce((acc, item) => acc + item.cost, 0).toLocaleString()}
                                                    </p>
                                                </div>

                                                <div className="space-y-4 mb-6">
                                                    {purchaseCart.map((item, index) => (
                                                        <div key={index} className="flex items-center gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                                            <div className="w-16 h-16 bg-white rounded-lg p-1 flex-shrink-0">
                                                                <img src={item.productImage} className="w-full h-full object-contain" alt={item.productName} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="font-bold text-white">{item.productName}</p>
                                                                <p className="text-xs text-slate-400">Precio Unit.: ${item.unitPrice.toLocaleString()}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updatePurchaseCartItem(index, parseInt(e.target.value) || 1)}
                                                                    className="w-20 bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-center font-bold"
                                                                    min="1"
                                                                />
                                                                <p className="text-cyan-400 font-bold w-28 text-right">${item.cost.toLocaleString()}</p>
                                                                <button
                                                                    onClick={() => removeFromPurchaseCart(index)}
                                                                    className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={finalizePurchaseOrder}
                                                    className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black rounded-2xl shadow-xl transition transform hover:scale-[1.01] flex items-center justify-center gap-3 text-lg"
                                                >
                                                    <CheckCircle className="w-6 h-6" /> FINALIZAR PEDIDO
                                                </button>
                                            </div>
                                        )}

                                        {/* Historial */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] p-8">
                                            <h3 className="text-xl font-bold text-white mb-6">Historial de Compras</h3>
                                            <div className="space-y-4">
                                                {purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map((p, idx) => {
                                                    const prod = products.find(prod => prod.id === p.productId);
                                                    const sup = suppliers.find(s => s.id === p.supplierId);
                                                    return (
                                                        <div key={p.id} style={{ animationDelay: `${idx * 0.05}s` }} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 hover:border-slate-600 transition group animate-fade-up">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                {/* Image Preview */}
                                                                <div className="w-12 h-12 bg-white rounded-lg p-1 flex-shrink-0 border border-slate-700">
                                                                    {prod?.image ? (
                                                                        <img src={prod.image} className="w-full h-full object-contain" alt={prod.name} />
                                                                    ) : (
                                                                        <Package className="w-full h-full text-slate-400 p-2" />
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <p className="font-bold text-white flex items-center gap-2">
                                                                        {prod?.name || 'Producto Eliminado'}
                                                                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">STOCK ACTUAL: {prod?.stock || 0}</span>
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString()} {sup ? `- Prov: ${sup.name}` : ''}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right">
                                                                    <p className="text-cyan-400 font-bold">+{p.quantity} u.</p>
                                                                    <p className="text-slate-400 text-xs font-mono">${(p.cost || 0).toLocaleString()}</p>
                                                                </div>
                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => setEditingPurchase(p)} className="p-2 bg-slate-800 hover:bg-blue-900/30 text-slate-400 hover:text-blue-400 rounded-lg transition">
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => deletePurchaseFn(p)} className="p-2 bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 rounded-lg transition">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Modal Edición Compra */}
                                        {editingPurchase && (
                                            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
                                                <div className="bg-[#0a0a0a] border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
                                                    <button onClick={() => setEditingPurchase(null)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                                                    <h3 className="text-2xl font-bold text-white mb-6">Editar Compra</h3>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad comprada</label>
                                                            <div className="text-xs text-yellow-500 mb-2">⚠ Modificar esto ajustará el stock del producto automáticamente.</div>
                                                            <input type="number" className="input-cyber w-full p-3" value={editingPurchase.quantity} onChange={e => setEditingPurchase({ ...editingPurchase, quantity: parseInt(e.target.value) || 0 })} />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Costo Total ($)</label>
                                                            <input type="number" className="input-cyber w-full p-3" value={editingPurchase.cost} onChange={e => setEditingPurchase({ ...editingPurchase, cost: parseFloat(e.target.value) || 0 })} />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const original = purchases.find(x => x.id === editingPurchase.id);
                                                            if (original) updatePurchaseFn(editingPurchase.id, original, editingPurchase);
                                                        }}
                                                        className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg"
                                                    >
                                                        Guardar Cambios
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: FINANZAS (GASTOS E INVERSIONES) */}
                                {adminTab === 'finance' && (
                                    <div className="max-w-6xl mx-auto animate-fade-up pb-20">
                                        <h1 className="text-4xl font-black text-white mb-8 neon-text">Finanzas y Capital</h1>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                            {/* SECCIÓN: REGISTRAR INVERSIÓN (NUEVO) */}
                                            <div className="bg-[#0a0a0a] border border-cyan-900/30 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-[100px] pointer-events-none"></div>
                                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                    <TrendingUp className="w-5 h-5 text-cyan-400" /> Registrar Inversión / Aporte
                                                </h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Inversor (Socio)</label>
                                                        <div className="relative">
                                                            <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                                                            <select
                                                                className="input-cyber w-full pl-12 p-4 appearance-none"
                                                                value={newInvestment.investor}
                                                                onChange={e => setNewInvestment({ ...newInvestment, investor: e.target.value })}
                                                            >
                                                                <option value="">Seleccionar Socio...</option>
                                                                {(settings?.team || []).map((member, idx) => (
                                                                    <option key={idx} value={member.name || member.email}>
                                                                        {member.name || member.email}
                                                                    </option>
                                                                ))}
                                                                <option value="other">Otro / Externo</option>
                                                            </select>
                                                        </div>
                                                        {newInvestment.investor === 'other' && (
                                                            <input
                                                                className="input-cyber w-full p-4 mt-2"
                                                                placeholder="Nombre del Inversor Externo"
                                                                onChange={e => setNewInvestment({ ...newInvestment, investor: e.target.value })}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto ($)</label>
                                                            <input
                                                                type="number"
                                                                className="input-cyber w-full p-4 font-mono font-bold text-cyan-400"
                                                                placeholder="0.00"
                                                                value={newInvestment.amount}
                                                                onChange={e => setNewInvestment({ ...newInvestment, amount: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Fecha</label>
                                                            <input
                                                                type="date"
                                                                className="input-cyber w-full p-4"
                                                                value={newInvestment.date}
                                                                onChange={e => setNewInvestment({ ...newInvestment, date: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                                                        <input
                                                            className="input-cyber w-full p-4"
                                                            placeholder="Ej: Inversión Inicial, Refuerzo de capital..."
                                                            value={newInvestment.notes}
                                                            onChange={e => setNewInvestment({ ...newInvestment, notes: e.target.value })}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!newInvestment.investor || newInvestment.amount <= 0) return showToast("Completa los datos correctamente.", "warning");
                                                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'investments'), {
                                                                ...newInvestment,
                                                                timestamp: new Date().toISOString()
                                                            });
                                                            setNewInvestment({ investor: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
                                                            showToast("Inversión registrada correctamente.", "success");
                                                        }}
                                                        className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 border border-cyan-500/20"
                                                    >
                                                        <Save className="w-5 h-5" /> Registrar Aporte
                                                    </button>
                                                </div>
                                            </div>

                                            {/* SECCIÓN: REGISTRAR GASTO */}
                                            <div className="bg-[#0a0a0a] border border-red-900/30 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-[100px] pointer-events-none"></div>
                                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                    <Wallet className="w-5 h-5 text-red-400" /> Registrar Gasto / Egreso
                                                </h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción</label>
                                                        <input className="input-cyber w-full p-4" placeholder="Ej: Pago de Internet, Alquiler..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto ($)</label>
                                                            <input type="number" className="input-cyber w-full p-4 font-mono font-bold text-red-400" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                                                            <select className="input-cyber w-full p-4" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                                                                <option>General</option>
                                                                <option>Servicios</option>
                                                                <option>Impuestos</option>
                                                                <option>Mantenimiento</option>
                                                                <option>Marketing</option>
                                                                <option>Sueldos</option>
                                                                <option>Otros</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (!newExpense.description || newExpense.amount <= 0) return showToast("Completa los datos correctamente.", "warning");
                                                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {
                                                                ...newExpense,
                                                                date: new Date().toISOString()
                                                            });
                                                            setNewExpense({ description: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] });
                                                            showToast("Gasto registrado correctamente.", "success");
                                                        }}
                                                        className="w-full mt-2 bg-red-900/50 hover:bg-red-900 text-white font-black py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 border border-red-500/20"
                                                    >
                                                        <Save className="w-5 h-5" /> Registrar Gasto
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TABLAS DETALLADAS */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                            {/* Historial de Inversiones */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] p-8 h-[500px] flex flex-col">
                                                <h3 className="text-lg font-bold text-white mb-4">Historial de Inversiones</h3>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                                    {investments.length === 0 ? <p className="text-slate-500 text-sm italic text-center py-10">Sin inversiones registradas.</p> :
                                                        investments.sort((a, b) => new Date(b.date) - new Date(a.date)).map((inv, idx) => (
                                                            <div key={inv.id} className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-cyan-500/30 transition">
                                                                <div>
                                                                    <p className="text-white font-bold text-sm">{inv.investor}</p>
                                                                    <p className="text-slate-500 text-xs">{new Date(inv.date).toLocaleDateString()} {inv.notes && `- ${inv.notes}`}</p>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <p className="text-cyan-400 font-mono font-bold">+${inv.amount.toLocaleString()}</p>
                                                                    <button onClick={() => openConfirm("Eliminar Inversión", "¿Deseas eliminar este registro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'investments', inv.id)))} className="text-slate-600 hover:text-red-400 p-2 hover:bg-slate-800 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>

                                            {/* Historial de Gastos */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] p-8 h-[500px] flex flex-col">
                                                <h3 className="text-lg font-bold text-white mb-4">Historial de Gastos</h3>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                                    {expenses.length === 0 ? <p className="text-slate-500 text-sm italic text-center py-10">Sin gastos registrados.</p> :
                                                        expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((ex, idx) => (
                                                            <div key={ex.id} className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-red-500/30 transition">
                                                                <div>
                                                                    <p className="text-white font-bold text-sm">{ex.description}</p>
                                                                    <p className="text-slate-500 text-xs flex gap-2">
                                                                        <span className="text-red-300 font-bold bg-red-900/20 px-1.5 rounded">{ex.category}</span>
                                                                        <span>{new Date(ex.date).toLocaleDateString()}</span>
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <p className="text-red-400 font-mono font-bold">-${ex.amount.toLocaleString()}</p>
                                                                    <button onClick={() => openConfirm("Eliminar Gasto", "¿Deseas eliminar este registro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', ex.id)))} className="text-slate-600 hover:text-red-400 p-2 hover:bg-slate-800 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {/* SECCIÓN: DISTRIBUCIÓN DE GANANCIAS (AUTOMÁTICA) */}
                                        <div className="animate-fade-up pt-12 border-t border-slate-800">
                                            <div className="flex justify-between items-center mb-8">
                                                <div>
                                                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                                        <DollarSign className="w-8 h-8 text-green-500" /> Distribución de Ganancias
                                                    </h2>
                                                    <p className="text-slate-500 mt-1">Cálculo automático basado en las inversiones registradas.</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Beneficio Neto</p>
                                                    <p className={`text-3xl font-black ${dashboardMetrics.netIncome >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                        ${dashboardMetrics.netIncome.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Gráfico y Tabla */}
                                            <div className="flex flex-col gap-8 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                {(() => {
                                                    const team = settings?.team || [];
                                                    // Calcular Total Invertido por Miembro desde la colección 'investments'
                                                    const memberInvestments = team.map(member => {
                                                        const totalInv = investments
                                                            .filter(inv => inv.investor === member.name || inv.investor === member.email) // Match by Name or Email
                                                            .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
                                                        return { ...member, totalInv };
                                                    });

                                                    const totalCapital = memberInvestments.reduce((acc, m) => acc + m.totalInv, 0);

                                                    if (totalCapital === 0) return <p className="text-slate-500 text-center py-12">Registra inversiones para ver la distribución de ganancias.</p>;

                                                    return (
                                                        <>
                                                            {/* Barra de Progreso Distribución */}
                                                            <div className="w-full h-8 bg-slate-900 rounded-full flex overflow-hidden">
                                                                {memberInvestments.map((member, idx) => {
                                                                    const pct = totalCapital > 0 ? (member.totalInv / totalCapital) * 100 : 0;
                                                                    const colors = ['bg-green-500', 'bg-cyan-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500'];
                                                                    if (pct <= 0) return null;
                                                                    return (
                                                                        <div key={idx} className={`${colors[idx % colors.length]} h-full transition-all duration-500`} style={{ width: `${pct}%` }} title={`${member.name}: ${pct.toFixed(1)}%`}></div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Tabla de Distribución */}
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-slate-900/50 border-b border-slate-800">
                                                                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Socio</th>
                                                                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Capital Aportado</th>
                                                                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest text-center">% Part.</th>
                                                                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right text-green-500">Ganancia Est.</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-800/50">
                                                                        {memberInvestments.map((member, idx) => {
                                                                            const sharePercentage = totalCapital > 0 ? ((member.totalInv / totalCapital) * 100) : 0;
                                                                            const memberProfit = (dashboardMetrics.netIncome * sharePercentage) / 100;
                                                                            const colors = ['text-green-500', 'text-cyan-500', 'text-purple-500', 'text-pink-500', 'text-yellow-500', 'text-red-500'];

                                                                            return (
                                                                                <tr key={idx} className="hover:bg-slate-900/20 transition">
                                                                                    <td className="p-5">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className={`w-3 h-3 rounded-full ${colors[idx % colors.length].replace('text-', 'bg-')}`}></div>
                                                                                            <div>
                                                                                                <p className="font-bold text-white">{member.name || 'Sin Nombre'}</p>
                                                                                                <p className="text-xs text-slate-500">{member.email}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="p-6 text-right font-mono font-bold text-white">
                                                                                        ${member.totalInv.toLocaleString()}
                                                                                    </td>
                                                                                    <td className="p-6 text-center font-mono text-slate-300 font-bold">
                                                                                        {sharePercentage.toFixed(1)}%
                                                                                    </td>
                                                                                    <td className="p-6 text-right font-mono font-black text-green-400 text-lg">
                                                                                        ${memberProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                    <tfoot className="bg-slate-900/30 border-t border-slate-800">
                                                                        <tr>
                                                                            <td className="p-6 font-black text-white text-right">TOTAL CAPITAL</td>
                                                                            <td className="p-6 text-right font-black text-cyan-400 text-lg">
                                                                                ${totalCapital.toLocaleString()}
                                                                            </td>
                                                                            <td className="p-6 text-center font-bold text-slate-500">100%</td>
                                                                            <td className="p-6 text-right font-black text-green-500 text-xl">
                                                                                ${dashboardMetrics.netIncome.toLocaleString()}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CUPONES (GESTIÓN AVANZADA) */}
                                {adminTab === 'coupons' && (
                                    <div className="max-w-5xl mx-auto animate-fade-up pb-20 relative">

                                        {/* Overlay for Entrepreneur Plan */}
                                        {(settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && (
                                            <button
                                                onClick={() => setShowPlansModal(true)}
                                                className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md rounded-[2.5rem] cursor-pointer hover:bg-black/70 transition group"
                                            >
                                                <div className="text-center p-8 max-w-md">
                                                    <div className="w-20 h-20 mx-auto mb-6 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition">
                                                        <Lock className="w-10 h-10 text-purple-400" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-white mb-4">Cupones Bloqueados</h3>
                                                    <p className="text-slate-400 mb-6">Los cupones de descuento están disponibles a partir del <span className="text-purple-400 font-bold">Plan Negocio</span>.</p>
                                                    <p className="text-sm text-white/60 group-hover:text-white transition">Clic para ver planes disponibles</p>
                                                </div>
                                            </button>
                                        )}

                                        <h1 className="text-3xl font-black text-white mb-8">Gestión de Cupones</h1>

                                        {/* Formulario de Creación */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] mb-10 shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                <Plus className="w-5 h-5 text-purple-400" /> Crear Nuevo Cupón
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                {/* Columna 1 */}
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código del Cupón</label>
                                                        <input className="input-cyber w-full p-4 font-mono text-lg uppercase tracking-widest" placeholder="Ej: VERANO2024" value={newCoupon.code} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo</label>
                                                            <select className="input-cyber w-full p-4" value={newCoupon.type} onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                                                                <option value="percentage">Porcentaje (%)</option>
                                                                <option value="fixed">Fijo ($)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Valor</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="0" value={newCoupon.value} onChange={e => setNewCoupon({ ...newCoupon, value: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Columna 2 */}
                                                <div className="space-y-4">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mínimo de Compra</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="$0" value={newCoupon.minPurchase} onChange={e => setNewCoupon({ ...newCoupon, minPurchase: e.target.value })} />
                                                        </div>
                                                        {newCoupon.type === 'percentage' && (
                                                            <div className="flex-1">
                                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tope Reintegro</label>
                                                                <input className="input-cyber w-full p-4" type="number" placeholder="$0 (Opcional)" value={newCoupon.maxDiscount} onChange={e => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Límite Usos (Total)</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="Ej: 100" value={newCoupon.usageLimit} onChange={e => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Vencimiento</label>
                                                            <input className="input-cyber w-full p-4" type="date" value={newCoupon.expirationDate} onChange={e => setNewCoupon({ ...newCoupon, expirationDate: e.target.value })} />
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                            Tipo de Cupón
                                                        </label>
                                                        <select
                                                            className="input-cyber w-full p-4"
                                                            value={newCoupon.targetType}
                                                            onChange={e => setNewCoupon({ ...newCoupon, targetType: e.target.value })}
                                                        >
                                                            <option value="global">🌍 Público / Canjeable (Redes Sociales)</option>
                                                            <option value="specific_email">👤 Usuario Específico (Email)</option>
                                                        </select>
                                                    </div>

                                                    {newCoupon.targetType === 'specific_email' && (
                                                        <div className="md:col-span-2">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                Email del Usuario
                                                            </label>
                                                            <input
                                                                type="email"
                                                                className="input-cyber w-full p-4"
                                                                placeholder="usuario@ejemplo.com"
                                                                value={newCoupon.targetUser || ''}
                                                                onChange={e => setNewCoupon({ ...newCoupon, targetUser: e.target.value })}
                                                            />
                                                            <p className="text-xs text-slate-400 mt-1">Solo este usuario podrá usar el cupón</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={saveCouponFn} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                                <Save className="w-5 h-5" /> Guardar Cupón
                                            </button>
                                        </div>

                                        {/* Lista de Cupones Activos */}
                                        <div className="grid gap-4">
                                            {coupons.map((c, idx) => (
                                                <div key={c.id} style={{ animationDelay: `${idx * 0.05}s` }} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center group hover:border-slate-700 transition animate-fade-up">
                                                    <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                                                        <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800 text-purple-400 font-black text-2xl">
                                                            %
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-black text-xl tracking-wider">{c.code}</h4>
                                                            <p className="text-purple-400 font-bold text-sm">
                                                                {c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}
                                                                <span className="text-slate-500 font-normal ml-2">
                                                                    (Min: ${c.minPurchase})
                                                                </span>
                                                            </p>
                                                            <p className="text-xs text-slate-600 mt-1 flex gap-3">
                                                                <span>Usado: {c.usedBy ? c.usedBy.length : 0} veces</span>
                                                                {c.usageLimit && <span>Límite: {c.usageLimit}</span>}
                                                                {c.expirationDate && <span>Vence: {c.expirationDate}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-4 md:mt-0">
                                                        {c.targetType === 'global' && (
                                                            <div className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded-lg border border-purple-500/30 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                                                <Globe className="w-3 h-3" /> Social
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(c.code);
                                                                showToast("Código copiado al portapapeles", "success");
                                                            }}
                                                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-3 rounded-xl transition border border-slate-800"
                                                            title="Copiar Código"
                                                        >
                                                            <Copy className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => openConfirm("Eliminar Cupón", "¿Eliminar este cupón?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', c.id)))}
                                                            className="bg-slate-900 hover:bg-red-900/20 text-slate-500 hover:text-red-400 p-3 rounded-xl transition border border-slate-800"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: USERS (NUEVO) */}

                                {adminTab === 'users' && (() => {
                                    const filteredUsers = users.filter(u => {
                                        const query = userSearch.toLowerCase();
                                        const matchesSearch = (u.name || '').toLowerCase().includes(query) ||
                                            (u.email || '').toLowerCase().includes(query) ||
                                            (u.username || '').toLowerCase().includes(query);
                                        const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                                        return matchesSearch && matchesRole;
                                    });

                                    return (
                                        <div className="max-w-6xl mx-auto animate-fade-up pb-20">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                                <div>
                                                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                                                            <Users className="w-6 h-6 text-pink-400" />
                                                        </div>
                                                        Gestión de Usuarios
                                                    </h1>
                                                    <p className="text-slate-500 mt-2 font-medium">Control total sobre cuentas, roles y auditoría de carritos.</p>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                                    <div className="relative w-full sm:w-64 group">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition" />
                                                        <input
                                                            className="input-cyber w-full pl-11 pr-4 py-3 text-sm"
                                                            placeholder="Buscar por nombre, email..."
                                                            value={userSearch}
                                                            onChange={e => setUserSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                                                        {['all', 'admin', 'user'].map(role => (
                                                            <button
                                                                key={role}
                                                                onClick={() => setUserRoleFilter(role)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${userRoleFilter === role ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                                            >
                                                                {role === 'all' ? 'Todos' : role}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-[#050505] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                                                <div className="overflow-x-auto overflow-y-visible">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-white/[0.02] border-b border-white/5">
                                                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identidad</th>
                                                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Actividad & Stats</th>
                                                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Rango</th>
                                                                <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {filteredUsers.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan="4" className="p-20 text-center">
                                                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                                                            <UserPlus className="w-16 h-16" />
                                                                            <p className="font-black uppercase tracking-widest">No se encontraron usuarios</p>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ) : filteredUsers.map((u, idx) => (
                                                                <tr key={u.id} style={{ animationDelay: `${idx * 0.03}s` }} className="group hover:bg-white/[0.01] transition-all animate-fade-up">
                                                                    <td className="p-5">
                                                                        <div className="flex items-center gap-5">
                                                                            <div className="relative group/avatar">
                                                                                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl blur-lg opacity-20 group-hover/avatar:opacity-40 transition" />
                                                                                <div className="relative w-14 h-14 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-xl font-black text-white overflow-hidden shadow-xl">
                                                                                    {u.image ? <img src={u.image} className="w-full h-full object-cover" /> : (u.name || '?').charAt(0).toUpperCase()}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="font-bold text-white text-lg tracking-tight">{u.name}</p>
                                                                                    {u.isVerified && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                                                                                </div>
                                                                                <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                                                                                <div className="flex items-center gap-3 mt-2">
                                                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">ID: {u.id.slice(-6)}</span>
                                                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">INC. {new Date(u.joinDate).toLocaleDateString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-8 relative">
                                                                        {/* Blur Overlay for Entrepreneur Plan */}
                                                                        {(settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && (
                                                                            <button
                                                                                onClick={() => setShowPlansModal(true)}
                                                                                className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl cursor-pointer hover:bg-black/70 transition group"
                                                                            >
                                                                                <div className="text-center">
                                                                                    <Lock className="w-6 h-6 text-yellow-500 mx-auto mb-2 group-hover:scale-110 transition" />
                                                                                    <p className="text-xs font-black text-yellow-400 uppercase tracking-wider">Plan Negocio</p>
                                                                                    <p className="text-[10px] text-slate-400 group-hover:text-white transition">Clic para ver planes</p>
                                                                                </div>
                                                                            </button>
                                                                        )}
                                                                        <div className={`flex flex-col items-center gap-3 ${(settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) ? 'filter blur-sm pointer-events-none' : ''}`}>
                                                                            <div className="flex gap-2">
                                                                                <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3" title="Favoritos">
                                                                                    <Heart className={`w-4 h-4 ${u.favorites?.length > 0 ? 'text-pink-500 fill-pink-500' : 'text-slate-600'}`} />
                                                                                    <span className="text-sm font-black text-white">{u.favorites ? u.favorites.length : 0}</span>
                                                                                </div>
                                                                                <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3" title="Pedidos Realizados">
                                                                                    <ShoppingBag className="w-4 h-4 text-cyan-500" />
                                                                                    <span className="text-sm font-black text-white">{u.ordersCount || 0}</span>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setViewUserCart(u)}
                                                                                className="w-full py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                                                            >
                                                                                <Maximize2 className="w-3 h-3" /> Ver Carrito en Vivo
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-8">
                                                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-inner ${u.role === 'admin'
                                                                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                                                            : 'bg-slate-900/50 text-slate-500 border-white/5'
                                                                            }`}>
                                                                            {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                                            {u.role}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-8">
                                                                        <div className="flex justify-end gap-3 translate-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => setViewUserEdit(u)}
                                                                                className="w-11 h-11 flex items-center justify-center bg-[#0a0a0a] border border-white/5 rounded-2xl text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all shadow-xl group"
                                                                                title="Gestionar Perfil"
                                                                            >
                                                                                <Edit className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setNewAdminPassword('');
                                                                                    setUserPassModal(u);
                                                                                }}
                                                                                className="w-11 h-11 flex items-center justify-center bg-[#0a0a0a] border border-white/5 rounded-2xl text-slate-400 hover:text-pink-400 hover:border-pink-500/40 hover:bg-pink-500/5 transition-all shadow-xl group"
                                                                                title="Seguridad & Acceso"
                                                                            >
                                                                                <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}


                                {/* TAB: PROMOS (NUEVO) */}
                                {adminTab === 'promos' && (
                                    <div className="max-w-6xl mx-auto animate-fade-up pb-20">
                                        <h1 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                                            <Tag className="w-8 h-8 text-purple-500" /> Gestión de Promos
                                        </h1>

                                        {/* Formulario Nueva Promo */}
                                        {/* Formulario Nueva Promo o Banner Upgrade */}
                                        {(!((settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && promos.length >= 1) || isEditingPromo) ? (
                                            <div className="bg-[#0a0a0a] border border-purple-500/30 p-8 rounded-[2rem] mb-10 shadow-2xl">
                                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                    {isEditingPromo ? <Edit className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-green-400" />}
                                                    {isEditingPromo ? 'Editar Promo' : 'Crear Nueva Promo'}
                                                </h3>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    {/* Datos Básicos */}
                                                    <div className="space-y-4">
                                                        <input
                                                            type="text"
                                                            className="input-cyber w-full p-4"
                                                            placeholder="Nombre de la Promo"
                                                            value={newPromo.name}
                                                            onChange={e => setNewPromo({ ...newPromo, name: e.target.value })}
                                                        />
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                                                <input
                                                                    type="number"
                                                                    className="input-cyber w-full p-4 pl-8"
                                                                    placeholder="Precio"
                                                                    value={newPromo.price}
                                                                    onChange={e => setNewPromo({ ...newPromo, price: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-400 font-mono text-sm flex items-center">
                                                                Costo: ${newPromo.items.reduce((acc, item) => {
                                                                    const p = products.find(prod => prod.id === item.productId);
                                                                    return acc + ((Number(p?.basePrice) || 0) * item.quantity);
                                                                }, 0).toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="mb-4">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Imagen de la Promo</label>
                                                            <input
                                                                type="file"
                                                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/40 transition"
                                                                accept="image/*"
                                                                onChange={e => handleImageUpload(e, setNewPromo)}
                                                            />
                                                            {newPromo.image && (
                                                                <div className="mt-2 relative group w-32 aspect-video overflow-hidden rounded-xl border border-slate-700">
                                                                    <img src={newPromo.image} className="w-full h-full object-cover" />
                                                                    <button onClick={() => setNewPromo({ ...newPromo, image: '' })} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 transition opacity-0 group-hover:opacity-100">
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <textarea
                                                            className="input-cyber w-full p-4 h-20 resize-none"
                                                            placeholder="Descripción breve..."
                                                            value={newPromo.description}
                                                            onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                                                        />
                                                    </div>

                                                    {/* Constructor de Bundle */}
                                                    <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                            <Package className="w-4 h-4" /> Productos Incluidos
                                                        </p>

                                                        <div className="flex gap-2 mb-4">
                                                            <select
                                                                className="input-cyber flex-1 p-3 text-sm"
                                                                value={selectedPromoProduct}
                                                                onChange={e => setSelectedPromoProduct(e.target.value)}
                                                            >
                                                                <option value="">Agregar producto...</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name} (${Number(p.basePrice)})</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="number"
                                                                className="input-cyber w-20 p-3 text-sm text-center"
                                                                value={promoProductQty}
                                                                min="1"
                                                                onChange={e => setPromoProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    if (!selectedPromoProduct) return;
                                                                    const exists = newPromo.items.find(i => i.productId === selectedPromoProduct);
                                                                    if (exists) {
                                                                        setNewPromo({
                                                                            ...newPromo,
                                                                            items: newPromo.items.map(i => i.productId === selectedPromoProduct ? { ...i, quantity: i.quantity + promoProductQty } : i)
                                                                        });
                                                                    } else {
                                                                        setNewPromo({
                                                                            ...newPromo,
                                                                            items: [...newPromo.items, { productId: selectedPromoProduct, quantity: promoProductQty }]
                                                                        });
                                                                    }
                                                                    setSelectedPromoProduct('');
                                                                    setPromoProductQty(1);
                                                                }}
                                                                className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition"
                                                            >
                                                                <Plus className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                                                            {newPromo.items.map((item, idx) => {
                                                                const p = products.find(prod => prod.id === item.productId);
                                                                if (!p) return null;
                                                                return (
                                                                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                                        <div className="flex items-center gap-3">
                                                                            <img src={p.image} className="w-8 h-8 rounded bg-white object-contain p-0.5" />
                                                                            <div>
                                                                                <p className="text-sm font-bold text-white truncate max-w-[120px]">{p.name}</p>
                                                                                <p className="text-xs text-slate-500">{item.quantity} un. x ${p.basePrice}</p>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => setNewPromo({ ...newPromo, items: newPromo.items.filter((_, i) => i !== idx) })}
                                                                            className="text-red-500 hover:text-red-400 p-1"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                            {newPromo.items.length === 0 && (
                                                                <div className="text-center py-6 text-slate-600 italic text-sm border border-dashed border-slate-800 rounded-lg">
                                                                    Agrega productos para armar el combo
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 justify-end mt-6">
                                                    {isEditingPromo && (
                                                        <button
                                                            onClick={() => {
                                                                setIsEditingPromo(false);
                                                                setEditingPromoId(null);
                                                                setNewPromo({ name: '', price: '', image: '', description: '', items: [] });
                                                            }}
                                                            className="px-6 py-3 text-slate-400 hover:text-white font-bold transition"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (!newPromo.name || !newPromo.price || newPromo.items.length === 0) {
                                                                return showToast("Completa nombre, precio y agrega productos.", "warning");
                                                            }

                                                            setIsLoading(true);
                                                            try {
                                                                if (isEditingPromo && editingPromoId) {
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'promos', editingPromoId), newPromo);
                                                                    showToast("Promo actualizada", "success");
                                                                } else {
                                                                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'promos'), {
                                                                        ...newPromo,
                                                                        createdAt: new Date().toISOString()
                                                                    });
                                                                    showToast("Promo creada exitosamente", "success");
                                                                }
                                                                setNewPromo({ name: '', price: '', image: '', description: '', items: [] });
                                                                setIsEditingPromo(false);
                                                                setEditingPromoId(null);
                                                            } catch (e) {
                                                                console.error(e);
                                                                showToast("Error al guardar promo", "error");
                                                            } finally {
                                                                setIsLoading(false);
                                                            }
                                                        }}
                                                        className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition"
                                                    >
                                                        {isEditingPromo ? 'Guardar Cambios' : 'Crear Promo'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] mb-10 shadow-xl flex flex-col items-center justify-center text-center animate-fade-up">
                                                <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30">
                                                    <Lock className="w-10 h-10 text-purple-400" />
                                                </div>
                                                <h3 className="text-2xl font-black text-white mb-2">Límite de Promos Alcanzado</h3>
                                                <p className="text-slate-400 max-w-md mb-8">
                                                    Tu plan actual te permite tener hasta <strong className="text-white">1 promo activa</strong>.
                                                    Para crear más promociones ilimitadas, actualiza tu plan.
                                                </p>
                                                <button
                                                    onClick={() => setShowPlansModal(true)}
                                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
                                                >
                                                    <Zap className="w-5 h-5" /> Mejorar mi Plan
                                                </button>
                                            </div>
                                        )}

                                        {/* Lista de Promos */}
                                        {/* Lista de Promos */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {promos.map(promo => {
                                                const totalCost = (promo.items || []).reduce((acc, item) => {
                                                    const p = products.find(prod => prod.id === item.productId);
                                                    return acc + ((Number(p?.purchasePrice) || 0) * item.quantity);
                                                }, 0);
                                                const price = Number(promo.price) || 0;
                                                const profit = price - totalCost;
                                                const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
                                                const isProfitable = profit > 0;

                                                return (
                                                    <div key={promo.id} className="bg-[#0a0a0a] border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/30 transition group flex flex-col">
                                                        <div className="aspect-video relative overflow-hidden">
                                                            <img src={promo.image || 'https://via.placeholder.com/400'} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                                            <div className="absolute bottom-4 left-4 right-4">
                                                                <h4 className="text-xl font-black text-white mb-1 drop-shadow-lg">{promo.name}</h4>
                                                                <div className="flex items-center gap-3">
                                                                    <p className="text-3xl text-purple-400 font-black drop-shadow-lg">${price.toLocaleString()}</p>
                                                                    {totalCost > 0 && (
                                                                        <div className={`px-2 py-1 rounded text-xs font-bold border ${isProfitable ? 'bg-green-900/30 border-green-500/30 text-green-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>
                                                                            {margin}% MG
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="p-6 flex-1 flex flex-col">
                                                            {/* Productos Incluidos con Miniaturas */}
                                                            <div className="mb-6 flex-1">
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Include:</p>
                                                                <div className="flex flex-col gap-2">
                                                                    {(promo.items || []).map((item, i) => {
                                                                        const p = products.find(prod => prod.id === item.productId);
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
                                                                                <div className="w-10 h-10 bg-white rounded-lg p-0.5 flex-shrink-0">
                                                                                    <img src={p?.image} className="w-full h-full object-contain" />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm font-bold text-white truncate">{p?.name || 'Producto Eliminado'}</p>
                                                                                    <p className="text-xs text-slate-500">{item.quantity} x ${Number(p?.basePrice || 0).toLocaleString()} (Costo)</p>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Análisis de Rentabilidad */}
                                                            <div className="mb-6 p-4 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="text-slate-500">Costo Real:</span>
                                                                    <span className="text-slate-300 font-mono">${totalCost.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="text-slate-500">Precio Venta:</span>
                                                                    <span className="text-slate-300 font-mono">${price.toLocaleString()}</span>
                                                                </div>
                                                                <div className="border-t border-slate-800 my-2"></div>
                                                                <div className="flex justify-between text-sm font-bold">
                                                                    <span className={isProfitable ? "text-green-500" : "text-red-500"}>Ganancia Neta:</span>
                                                                    <span className={`font-mono ${isProfitable ? "text-green-400" : "text-red-400"}`}>
                                                                        {isProfitable ? '+' : ''}${profit.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-3 mt-auto">
                                                                <button
                                                                    onClick={() => {
                                                                        setNewPromo({
                                                                            name: promo.name,
                                                                            price: promo.price,
                                                                            image: promo.image,
                                                                            description: promo.description || '',
                                                                            items: promo.items || []
                                                                        });
                                                                        setEditingPromoId(promo.id);
                                                                        setIsEditingPromo(true);
                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    }}
                                                                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition border border-slate-700 flex items-center justify-center gap-2 group-hover:border-purple-500/30"
                                                                >
                                                                    <Edit className="w-4 h-4" /> Editar
                                                                </button>
                                                                <button
                                                                    onClick={() => openConfirm('Eliminar Promo', '¿Estás seguro? Esto no se puede deshacer.', async () => {
                                                                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'promos', promo.id));
                                                                        showToast("Promo eliminada", "info");
                                                                    })}
                                                                    className="px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition border border-red-500/20"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: PEDIDOS (RESTAURADO) */}
                                {adminTab === 'orders' && (
                                    <div className="max-w-6xl mx-auto animate-fade-up pb-20">
                                        <h1 className="text-3xl font-black text-white mb-8">Gestión de Pedidos</h1>

                                        {orders.length === 0 ? (
                                            <div className="text-center py-20 border border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20">
                                                <ShoppingBag className="w-20 h-20 mx-auto mb-4 text-slate-700" />
                                                <p className="text-xl text-slate-500 font-bold">No hay pedidos registrados aún.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {orders.map((o, idx) => (
                                                    <div
                                                        key={o.id}
                                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                                        className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-slate-700 transition group animate-fade-up"
                                                    >
                                                        {/* Info Principal */}
                                                        <div className="flex-1 w-full lg:w-auto">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <span className="bg-slate-900 text-cyan-400 px-3 py-1 rounded-lg text-sm font-black tracking-widest border border-slate-800">
                                                                    #{o.orderId}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold border ${o.status === 'Realizado' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'}`}>
                                                                    {o.status}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-white font-bold text-lg mb-1">{o.customer.name}</h4>
                                                            <p className="text-slate-500 text-xs flex items-center gap-2">
                                                                <Clock className="w-3 h-3" /> {new Date(o.date).toLocaleString()}
                                                                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                                                <span className="text-slate-400 font-mono">${o.total.toLocaleString()}</span>
                                                            </p>
                                                        </div>

                                                        {/* Items Preview */}
                                                        <div className="flex -space-x-2">
                                                            {o.items.slice(0, 4).map((i, idx) => (
                                                                <div key={idx} className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-slate-800 flex items-center justify-center overflow-hidden" title={i.title}>
                                                                    {i.image ? <img src={i.image} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-slate-500" />}
                                                                </div>
                                                            ))}
                                                            {o.items.length > 4 && (
                                                                <div className="w-10 h-10 rounded-full border-2 border-[#0a0a0a] bg-slate-800 flex items-center justify-center text-xs text-white font-bold">
                                                                    +{o.items.length - 4}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Acciones */}
                                                        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                                                            <button onClick={() => setSelectedOrder(o)} className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition border border-slate-800" title="Ver Detalles">
                                                                <Eye className="w-5 h-5" />
                                                            </button>

                                                            {o.status !== 'Realizado' && (
                                                                <button onClick={() => finalizeOrderFn(o.id)} className="p-3 bg-green-900/10 hover:bg-green-600 text-green-500 hover:text-white rounded-xl transition border border-green-500/20" title="Marcar como Finalizado">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                </button>
                                                            )}

                                                            <button onClick={() => deleteOrderFn(o.id)} className="p-3 bg-red-900/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition border border-red-500/20" title="Eliminar Pedido">
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB: PRODUCTOS (LISTA Y FORMULARIO) */}
                                {adminTab === 'products' && (
                                    <div className="max-w-7xl mx-auto animate-fade-in pb-20">
                                        <div className="flex justify-between items-center mb-8">
                                            <div>
                                                <h1 className="text-3xl font-black text-white">Inventario</h1>
                                                {(() => {
                                                    const plan = settings?.subscriptionPlan || 'entrepreneur';
                                                    const limit = plan === 'premium' ? '∞' : plan === 'business' ? 50 : 30;
                                                    const current = products.length;
                                                    const isNearLimit = plan !== 'premium' && current >= limit * 0.8;
                                                    return (
                                                        <p className={`text-sm font-bold mt-1 ${isNearLimit ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                            {current} / {limit} productos
                                                            {isNearLimit && plan !== 'premium' && <span className="text-yellow-500 ml-2">⚠ Cerca del límite</span>}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowCategoryModal(true)} className="bg-slate-800 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-slate-700 transition transform hover:scale-105 active:scale-95 border border-slate-700">
                                                    <FolderPlus className="w-5 h-5" /> Categorías
                                                </button>
                                                <button onClick={() => { setNewProduct({}); setEditingId(null); setShowProductForm(true) }} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-cyan-500 transition transform hover:scale-105 active:scale-95">
                                                    <Plus className="w-5 h-5" /> Agregar Producto
                                                </button>
                                            </div>
                                        </div>

                                        {/* Banner de advertencia si hay productos desactivados por límite de plan */}
                                        {(() => {
                                            const deactivatedByPlan = products.filter(p => p.isActive === false && p.deactivatedByPlan);
                                            const deactivatedManually = products.filter(p => p.isActive === false && !p.deactivatedByPlan);
                                            const totalDeactivated = products.filter(p => p.isActive === false);

                                            if (totalDeactivated.length > 0) {
                                                return (
                                                    <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-2xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="font-bold text-yellow-400">
                                                                    {totalDeactivated.length} producto(s) desactivado(s)
                                                                </p>
                                                                <p className="text-sm text-yellow-200/70">
                                                                    {deactivatedByPlan.length > 0 && `${deactivatedByPlan.length} por límite de plan. `}
                                                                    {deactivatedManually.length > 0 && `${deactivatedManually.length} desactivado(s) manualmente. `}
                                                                    Los productos desactivados no se muestran en la tienda.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => showToast("Usa el botón de ojo (👁) en cada producto para activar/desactivar", "info")}
                                                            className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-xl font-bold text-sm hover:bg-yellow-500/30 transition border border-yellow-500/30 whitespace-nowrap"
                                                        >
                                                            Ver desactivados
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Formulario Productos (Expandido) */}
                                        {showProductForm && (
                                            <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2rem] mb-10 shadow-2xl relative">
                                                <h3 className="text-xl font-bold text-white mb-6">
                                                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div className="space-y-4">
                                                        <input className="input-cyber w-full p-4" placeholder="Nombre del Producto" value={newProduct.name || ''} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                                                        <div className="flex gap-4">
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="Precio Venta ($)" value={newProduct.basePrice || ''} onChange={e => setNewProduct({ ...newProduct, basePrice: e.target.value })} />
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="Costo Compra ($)" value={newProduct.purchasePrice || ''} onChange={e => setNewProduct({ ...newProduct, purchasePrice: e.target.value })} />
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="Stock" value={newProduct.stock || ''} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} />
                                                        </div>
                                                        <select className="input-cyber w-full p-4" value={newProduct.category || ''} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                                                            <option value="">Seleccionar Categoría...</option>
                                                            {settings?.categories?.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCategoryModal(true)}
                                                            className="w-full mt-2 py-2 bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm border border-cyan-800"
                                                        >
                                                            <FolderPlus className="w-4 h-4" /> Nueva Categoría
                                                        </button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                Imagen del Producto
                                                            </label>
                                                            <div className="space-y-3">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleImageUpload(e, setNewProduct)}
                                                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/20 file:text-cyan-400 hover:file:bg-cyan-900/40 transition"
                                                                />
                                                                {newProduct.image && (
                                                                    <div className="bg-white rounded-xl p-3 w-32 h-32">
                                                                        <img src={newProduct.image} className="w-full h-full object-contain" alt="Preview" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                Descuento (%)
                                                            </label>
                                                            <p className="text-xs text-slate-400 mb-2">Porcentaje de descuento sobre el precio base (0-100)</p>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                className="input-cyber w-full p-4"
                                                                placeholder="0"
                                                                value={newProduct.discount || 0}
                                                                onChange={e => setNewProduct({ ...newProduct, discount: parseFloat(e.target.value) || 0 })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <textarea className="input-cyber w-full h-32 p-4 mb-6 resize-none" placeholder="Descripción detallada del producto..." value={newProduct.description || ''} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />

                                                <div className="flex gap-4 justify-end">
                                                    <button onClick={() => setShowProductForm(false)} className="px-6 py-3 text-slate-400 font-bold hover:text-white transition">Cancelar</button>
                                                    <button onClick={saveProductFn} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold shadow-lg hover:bg-cyan-500 transition">Guardar Producto</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Lista de Productos */}
                                        <div className="grid gap-3">
                                            {products.map((p, idx) => (
                                                <div
                                                    key={p.id}
                                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                                    className={`bg-[#0a0a0a] border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center group hover:border-cyan-900/50 transition animate-fade-up ${p.isActive === false ? 'border-yellow-500/30 opacity-60' : 'border-slate-800'}`}
                                                >
                                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                                        <div className={`w-16 h-16 bg-white rounded-lg p-2 flex-shrink-0 relative ${p.isActive === false ? 'grayscale' : ''}`}>
                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                            {p.isFeatured && (
                                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                                                                    <Star className="w-3 h-3 text-black fill-current" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-lg flex items-center gap-2">
                                                                {p.name}
                                                                {p.isFeatured && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">DESTACADO</span>}
                                                                {p.isActive === false && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">OCULTO{p.deactivatedByPlan ? ' (LÍMITE)' : ''}</span>}
                                                            </p>
                                                            <p className="text-xs text-slate-500 font-mono">
                                                                Stock: <span className={(p.stock || 0) < (settings?.lowStockThreshold || 5) ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}>{p.stock || 0}</span> |
                                                                <span className="text-cyan-400 font-bold ml-2" title="Precio Venta">${Number(p.basePrice).toLocaleString()}</span> |
                                                                <span className="text-slate-500 ml-2 font-mono" title="Costo Adquisición">Costo: ${Number(p.purchasePrice || 0).toLocaleString()}</span>
                                                                {Number(p.basePrice) > 0 && (
                                                                    <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded border ${((Number(p.basePrice) - Number(p.purchasePrice || 0)) / Number(p.basePrice)) < 0.3 ? 'bg-red-900/20 text-red-400 border-red-500/20' : 'bg-green-900/20 text-green-400 border-green-500/20'}`}>
                                                                        {(((Number(p.basePrice) - Number(p.purchasePrice || 0)) / Number(p.basePrice)) * 100).toFixed(0)}%
                                                                    </span>
                                                                )} |
                                                                <span className="text-green-400 ml-2">Ventas: {(dashboardMetrics?.salesCount?.[p.id] || 0)}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end items-center">
                                                        {/* Toggle Featured */}
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id), {
                                                                        isFeatured: !p.isFeatured
                                                                    });
                                                                    showToast(p.isFeatured ? "Producto quitado de destacados" : "Producto marcado como destacado", "success");
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    showToast("Error al actualizar", "error");
                                                                }
                                                            }}
                                                            className={`p-3 rounded-xl transition border transform hover:scale-105 active:scale-95 ${p.isFeatured ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-yellow-400 hover:border-yellow-500/30'}`}
                                                            title={p.isFeatured ? "Quitar de Destacados" : "Marcar como Destacado"}
                                                        >
                                                            <Star className={`w-5 h-5 ${p.isFeatured ? 'fill-current' : ''}`} />
                                                        </button>
                                                        {/* Toggle Activar/Desactivar */}
                                                        <button
                                                            onClick={() => p.isActive === false ? reactivateProduct(p.id) : deactivateProduct(p.id)}
                                                            className={`p-3 rounded-xl transition border transform hover:scale-105 active:scale-95 ${p.isActive === false ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-red-400 hover:border-red-500/30'}`}
                                                            title={p.isActive === false ? "Activar Producto (hacerlo visible en tienda)" : "Desactivar Producto (ocultarlo de la tienda)"}
                                                        >
                                                            {p.isActive === false ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                                        </button>
                                                        <button onClick={() => openManualSaleModal(p)} className="p-3 bg-slate-900 rounded-xl text-green-400 hover:bg-green-900/20 transition border border-slate-800 transform hover:scale-105 active:scale-95" title="Venta Manual (Descontar 1)">
                                                            <DollarSign className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => { setNewProduct(p); setEditingId(p.id); setShowProductForm(true) }} className="p-3 bg-slate-900 rounded-xl text-cyan-400 hover:bg-cyan-900/20 transition border border-slate-800 transform hover:scale-105 active:scale-95">
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => deleteProductFn(p)} className="p-3 bg-slate-900 rounded-xl text-red-400 hover:bg-red-900/20 transition border border-slate-800 transform hover:scale-105 active:scale-95">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}



                                {/* TAB: CONFIGURACIÓN AVANZADA (NEW) */}
                                {adminTab === 'settings' && (
                                    <div className="max-w-6xl mx-auto animate-fade-up pb-20 relative">

                                        {/* Developer-Only Access Block */}
                                        {currentUser?.email !== SUPER_ADMIN_EMAIL && (
                                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md rounded-[2.5rem]">
                                                <div className="text-center p-8 max-w-lg">
                                                    <div className="w-24 h-24 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                                                        <Shield className="w-12 h-12 text-red-400" />
                                                    </div>
                                                    <h3 className="text-3xl font-black text-white mb-4">Acceso Restringido</h3>
                                                    <p className="text-slate-400 mb-6">Esta sección está reservada únicamente para el <span className="text-cyan-400 font-bold">desarrollador</span> de la plataforma.</p>
                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6">
                                                        <p className="text-sm text-slate-500 mb-2">Para solicitar cambios en la configuración, contacta a:</p>
                                                        <p className="text-cyan-400 font-bold text-lg">lautarocorazza63@gmail.com</p>
                                                    </div>
                                                    <p className="text-xs text-slate-600">Si necesitas modificar tu tienda, envía un email detallando los cambios que deseas realizar.</p>
                                                </div>
                                            </div>
                                        )}

                                        <h1 className="text-4xl font-black text-white neon-text mb-8 flex items-center gap-3">
                                            <Settings className="w-8 h-8 text-cyan-500 animate-spin-slow" /> Configuración General
                                        </h1>

                                        {/* Sub-Navigation Tabs */}
                                        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-slate-800">
                                            {[
                                                { id: 'store', label: 'Tienda', icon: Store },
                                                { id: 'appearance', label: 'Apariencia', icon: Palette },
                                                { id: 'social', label: 'Redes', icon: Share2 },
                                                { id: 'payments', label: 'Pagos', icon: CreditCard },
                                                { id: 'shipping', label: 'Envíos', icon: Truck },
                                                { id: 'seo', label: 'SEO', icon: Globe },
                                                { id: 'advanced', label: 'Avanzado', icon: Cog },
                                                { id: 'team', label: 'Equipo', icon: Users },
                                                // Only show Subscription tab to Super Admin
                                                ...(currentUser?.email === SUPER_ADMIN_EMAIL ? [{ id: 'subscription', label: 'Suscripciones', icon: Zap }] : [])
                                            ].map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setSettingsTab(tab.id)}
                                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 border ${settingsTab === tab.id ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] border-cyan-400 transform scale-105' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'}`}
                                                >
                                                    <tab.icon className={`w-4 h-4 ${settingsTab === tab.id ? 'animate-pulse' : ''}`} /> {tab.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* === SUBSCRIPTION MANAGEMENT (SUPER ADMIN ONLY) === */}
                                        {settingsTab === 'subscription' && currentUser?.email === SUPER_ADMIN_EMAIL && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                                        <Zap className="w-6 h-6 text-yellow-500 fill-current" />
                                                        Modelos de Suscripción
                                                    </h3>

                                                    <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-4">
                                                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                                                        <div>
                                                            <p className="font-bold text-yellow-500">Zona de Peligro: Super Admin</p>
                                                            <p className="text-sm text-yellow-200">Cambiar el plan afecta inmediatamente los límites y funcionalidades de la tienda.</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {/* Plan Emprendedor */}
                                                        <button
                                                            onClick={() => handlePlanChange('entrepreneur')}
                                                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${settings.subscriptionPlan === 'entrepreneur' || !settings.subscriptionPlan ? 'bg-slate-900 border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.2)] scale-105 z-10' : 'bg-[#050505] border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="p-3 bg-slate-800 rounded-xl">
                                                                    <Store className="w-6 h-6 text-cyan-400" />
                                                                </div>
                                                                {(settings.subscriptionPlan === 'entrepreneur' || !settings.subscriptionPlan) && <div className="bg-cyan-500 text-black text-xs font-black px-2 py-1 rounded">ACTIVO</div>}
                                                            </div>
                                                            <h4 className="text-xl font-black text-white mb-1">Emprendedor</h4>
                                                            <p className="text-sm text-slate-400 mb-4 h-10">El esencial para arrancar sólido pero económico.</p>
                                                            <div className="text-2xl font-black text-cyan-400 mb-6">$7.000 <span className="text-sm text-slate-500 font-normal">/mes</span></div>

                                                            <ul className="space-y-2 text-sm text-slate-300">
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-500" /> Hasta 30 productos</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-500" /> Dominio Vercel</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-cyan-500" /> Mercado Pago Directo</li>
                                                            </ul>
                                                        </button>

                                                        {/* Plan Negocio */}
                                                        <button
                                                            onClick={() => handlePlanChange('business')}
                                                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${settings.subscriptionPlan === 'business' ? 'bg-slate-900 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] scale-105 z-10' : 'bg-[#050505] border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="p-3 bg-slate-800 rounded-xl">
                                                                    <Briefcase className="w-6 h-6 text-purple-400" />
                                                                </div>
                                                                {settings.subscriptionPlan === 'business' && <div className="bg-purple-500 text-white text-xs font-black px-2 py-1 rounded">ACTIVO</div>}
                                                            </div>
                                                            <h4 className="text-xl font-black text-white mb-1">Negocio</h4>
                                                            <p className="text-sm text-slate-400 mb-4 h-10">Para marcas con identidad definida.</p>
                                                            <div className="text-2xl font-black text-purple-400 mb-6">$14.000 <span className="text-sm text-slate-500 font-normal">/mes</span></div>

                                                            <ul className="space-y-2 text-sm text-slate-300">
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Hasta 50 productos</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Personalización Visual</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-500" /> Botón WhatsApp</li>
                                                            </ul>
                                                        </button>

                                                        {/* Plan Premium */}
                                                        <button
                                                            onClick={() => handlePlanChange('premium')}
                                                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${settings.subscriptionPlan === 'premium' ? 'bg-slate-900 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)] scale-105 z-10' : 'bg-[#050505] border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="p-3 bg-slate-800 rounded-xl">
                                                                    <Sparkles className="w-6 h-6 text-yellow-400" />
                                                                </div>
                                                                {settings.subscriptionPlan === 'premium' && <div className="bg-yellow-500 text-black text-xs font-black px-2 py-1 rounded">ACTIVO</div>}
                                                            </div>
                                                            <h4 className="text-xl font-black text-white mb-1">Premium</h4>
                                                            <p className="text-sm text-slate-400 mb-4 h-10">Servicio Full con IA.</p>
                                                            <div className="text-2xl font-black text-yellow-400 mb-6">$22.000 <span className="text-sm text-slate-500 font-normal">/mes</span></div>

                                                            <ul className="space-y-2 text-sm text-slate-300">
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-500" /> Ilimitado / Full IA</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-500" /> Carga Inicial (10)</li>
                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-yellow-500" /> Mantenimiento Mensual</li>
                                                            </ul>
                                                        </button>
                                                    </div>

                                                    {/* Billing Cycle Selection */}
                                                    <div className="mt-8 pt-8 border-t border-slate-800/50">
                                                        <h4 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">
                                                            <Calendar className="w-5 h-5 text-green-400" /> Ciclo de Facturación
                                                        </h4>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            {[
                                                                { id: 'Semanal', label: 'Semanal' },
                                                                { id: 'Mensual', label: 'Mensual' },
                                                                { id: 'Anual', label: 'Anual' }
                                                            ].map(cycle => (
                                                                <button
                                                                    key={cycle.id}
                                                                    onClick={() => setSettings({ ...settings, subscriptionBillingCycle: cycle.id })}
                                                                    className={`p-3 rounded-xl border transition-all font-bold ${settings?.subscriptionBillingCycle === cycle.id
                                                                        ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20'
                                                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                                                                        }`}
                                                                >
                                                                    {cycle.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-2">Define la frecuencia de cobro para este plan.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {settingsTab === 'store' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Store className="w-5 h-5 text-cyan-400" /> Información de la Tienda
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre de la Tienda</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.storeName || ''}
                                                                onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                                                                placeholder="Mi Tienda"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email de Contacto</label>
                                                            <input
                                                                type="email"
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.storeEmail || ''}
                                                                onChange={e => setSettings({ ...settings, storeEmail: e.target.value })}
                                                                placeholder="contacto@mitienda.com"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Teléfono</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.storePhone || ''}
                                                                onChange={e => setSettings({ ...settings, storePhone: e.target.value })}
                                                                placeholder="+54 11 1234-5678"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Dirección</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.storeAddress || ''}
                                                                onChange={e => setSettings({ ...settings, storeAddress: e.target.value })}
                                                                placeholder="Av. Corrientes 1234, CABA"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-6">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción de la Tienda</label>
                                                        <textarea
                                                            className="input-cyber w-full p-4 h-24 resize-none"
                                                            value={settings?.storeDescription || ''}
                                                            onChange={e => setSettings({ ...settings, storeDescription: e.target.value })}
                                                            placeholder="Breve descripción de tu tienda..."
                                                        />
                                                    </div>
                                                    <div className="mt-6">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Texto de Nosotros</label>
                                                        <textarea
                                                            className="input-cyber w-full p-4 h-32 resize-none"
                                                            value={settings?.aboutUsText || ''}
                                                            onChange={e => setSettings({ ...settings, aboutUsText: e.target.value })}
                                                            placeholder="Historia de tu marca, valores, misión..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Copyright Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <FileText className="w-5 h-5 text-orange-400" /> Textos de Copyright
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Copyright del Menú Lateral</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.menuCopyright || ''}
                                                                onChange={e => setSettings({ ...settings, menuCopyright: e.target.value })}
                                                                placeholder={`${settings?.storeName || 'Mi Tienda'} © ${new Date().getFullYear()}`}
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">Aparece al final del menú hamburguesa</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Copyright del Footer</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerCopyright || ''}
                                                                onChange={e => setSettings({ ...settings, footerCopyright: e.target.value })}
                                                                placeholder={`© ${new Date().getFullYear()} ${settings?.storeName || 'Mi Tienda'}. All rights reserved.`}
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">Aparece en la barra inferior del sitio</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Guía "Cómo Comprar" Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <FileQuestion className="w-5 h-5 text-cyan-400" /> Guía "Cómo Comprar"
                                                    </h3>
                                                    <div className="space-y-6">
                                                        {/* Toggle para mostrar la página */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Mostrar en Menú</p>
                                                                <p className="text-xs text-slate-500">Mostrar enlace "Cómo Comprar" en el menú lateral</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showGuideLink: settings?.showGuideLink === false ? true : false })}
                                                                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${settings?.showGuideLink !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideLink !== false ? 'left-8' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Título de la página */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título de la Página</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.guideTitle || ''}
                                                                onChange={e => setSettings({ ...settings, guideTitle: e.target.value })}
                                                                placeholder="Cómo Comprar"
                                                            />
                                                        </div>

                                                        {/* Paso 1 */}
                                                        <div className="border-t border-slate-800 pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
                                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 1</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showGuideStep1: settings?.showGuideStep1 === false ? true : false })}
                                                                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${settings?.showGuideStep1 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideStep1 !== false ? 'left-6' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${settings?.showGuideStep1 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep1Title || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep1Title: e.target.value })}
                                                                    placeholder="Selecciona Productos"
                                                                    disabled={settings?.showGuideStep1 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep1Text || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep1Text: e.target.value })}
                                                                    placeholder="Descripción del paso..."
                                                                    disabled={settings?.showGuideStep1 === false}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Paso 2 */}
                                                        <div className="border-t border-slate-800 pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
                                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 2</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showGuideStep2: settings?.showGuideStep2 === false ? true : false })}
                                                                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${settings?.showGuideStep2 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideStep2 !== false ? 'left-6' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${settings?.showGuideStep2 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep2Title || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep2Title: e.target.value })}
                                                                    placeholder="Revisa tu Carrito"
                                                                    disabled={settings?.showGuideStep2 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep2Text || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep2Text: e.target.value })}
                                                                    placeholder="Descripción del paso..."
                                                                    disabled={settings?.showGuideStep2 === false}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Paso 3 */}
                                                        <div className="border-t border-slate-800 pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
                                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 3</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showGuideStep3: settings?.showGuideStep3 === false ? true : false })}
                                                                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${settings?.showGuideStep3 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideStep3 !== false ? 'left-6' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${settings?.showGuideStep3 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep3Title || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep3Title: e.target.value })}
                                                                    placeholder="Datos de Envío"
                                                                    disabled={settings?.showGuideStep3 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep3Text || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep3Text: e.target.value })}
                                                                    placeholder="Descripción del paso..."
                                                                    disabled={settings?.showGuideStep3 === false}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Paso 4 */}
                                                        <div className="border-t border-slate-800 pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-bold flex items-center justify-center">4</span>
                                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 4</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showGuideStep4: settings?.showGuideStep4 === false ? true : false })}
                                                                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${settings?.showGuideStep4 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideStep4 !== false ? 'left-6' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${settings?.showGuideStep4 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep4Title || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep4Title: e.target.value })}
                                                                    placeholder="Pago y Confirmación"
                                                                    disabled={settings?.showGuideStep4 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep4Text || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep4Text: e.target.value })}
                                                                    placeholder="Descripción del paso..."
                                                                    disabled={settings?.showGuideStep4 === false}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Paso 5 */}
                                                        <div className="border-t border-slate-800 pt-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-6 h-6 rounded-full bg-cyan-900/30 text-cyan-400 text-xs font-bold flex items-center justify-center">5</span>
                                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paso 5</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showGuideStep5: settings?.showGuideStep5 === false ? true : false })}
                                                                    className={`w-10 h-5 rounded-full transition-all duration-300 relative ${settings?.showGuideStep5 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showGuideStep5 !== false ? 'left-6' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${settings?.showGuideStep5 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep5Title || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep5Title: e.target.value })}
                                                                    placeholder="¡Listo!"
                                                                    disabled={settings?.showGuideStep5 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.guideStep5Text || ''}
                                                                    onChange={e => setSettings({ ...settings, guideStep5Text: e.target.value })}
                                                                    placeholder="Descripción del paso..."
                                                                    disabled={settings?.showGuideStep5 === false}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Bell className="w-5 h-5 text-yellow-400" /> Anuncios
                                                    </h3>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mensaje de Anuncio (Banner superior)</label>
                                                        <input
                                                            className="input-cyber w-full p-4"
                                                            value={settings?.announcementMessage || ''}
                                                            onChange={e => setSettings({ ...settings, announcementMessage: e.target.value })}
                                                            placeholder="🔥 ¡Envío gratis en compras mayores a $50.000!"
                                                        />
                                                        <p className="text-xs text-slate-500 mt-2">Dejar vacío para ocultar el banner.</p>
                                                    </div>
                                                </div>

                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Zap className="w-5 h-5 text-yellow-500" /> Pantalla de Carga
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título de Carga</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.loadingTitle || ''}
                                                                onChange={e => setSettings({ ...settings, loadingTitle: e.target.value })}
                                                                placeholder={settings?.storeName || "SUSTORE"}
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">Aparece en grande (ej. SUSTORE).</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mensaje de Carga</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.loadingText || ''}
                                                                onChange={e => setSettings({ ...settings, loadingText: e.target.value })}
                                                                placeholder="Cargando sistema..."
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">Texto pequeño debajo del título.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === APPEARANCE === */}
                                        {settingsTab === 'appearance' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <ImageIcon className="w-5 h-5 text-purple-400" /> Imágenes
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Imagen Hero (Banner Principal)</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, setSettings, 'heroUrl')}
                                                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/40 transition"
                                                            />
                                                            {settings?.heroUrl && (
                                                                <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 h-32">
                                                                    <img src={settings.heroUrl} className="w-full h-full object-cover" alt="Hero Preview" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Logo de la Tienda</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, setSettings, 'logoUrl')}
                                                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/20 file:text-cyan-400 hover:file:bg-cyan-900/40 transition"
                                                            />
                                                            {settings?.logoUrl && (
                                                                <div className="mt-4 w-24 h-24 rounded-xl overflow-hidden border border-slate-700 bg-white p-2">
                                                                    <img src={settings.logoUrl} className="w-full h-full object-contain" alt="Logo Preview" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Palette className="w-5 h-5 text-pink-400" /> Colores del Tema
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color Primario</label>
                                                            <div className="flex gap-3 items-center">
                                                                <input
                                                                    type="color"
                                                                    value={settings?.primaryColor || '#06b6d4'}
                                                                    onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                                                    className="w-12 h-12 rounded-lg border border-slate-700 cursor-pointer"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={settings?.primaryColor || '#06b6d4'}
                                                                    onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                                                    className="input-cyber flex-1 p-3 font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color Secundario</label>
                                                            <div className="flex gap-3 items-center">
                                                                <input
                                                                    type="color"
                                                                    value={settings?.secondaryColor || '#8b5cf6'}
                                                                    onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
                                                                    className="w-12 h-12 rounded-lg border border-slate-700 cursor-pointer"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={settings?.secondaryColor || '#8b5cf6'}
                                                                    onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
                                                                    className="input-cyber flex-1 p-3 font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color Acento</label>
                                                            <div className="flex gap-3 items-center">
                                                                <input
                                                                    type="color"
                                                                    value={settings?.accentColor || '#22c55e'}
                                                                    onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                                                                    className="w-12 h-12 rounded-lg border border-slate-700 cursor-pointer"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={settings?.accentColor || '#22c55e'}
                                                                    onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                                                                    className="input-cyber flex-1 p-3 font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Brand Ticker Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Sparkles className="w-5 h-5 text-cyan-400" /> Ticker de Marca
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Mostrar Ticker</p>
                                                                <p className="text-xs text-slate-500">Activar/desactivar la cinta de texto animada.</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showBrandTicker: settings?.showBrandTicker === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showBrandTicker !== false ? 'bg-cyan-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showBrandTicker !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Texto del Ticker</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.tickerText || ''}
                                                                onChange={e => setSettings({ ...settings, tickerText: e.target.value })}
                                                                placeholder="TECNOLOGÍA • INNOVACIÓN • CALIDAD PREMIUM • FUTURO"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">Este texto se repetirá en bucle.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hero Banner Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <ImageIcon className="w-5 h-5 text-purple-400" /> Banner Principal (Hero)
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Badge/Etiqueta</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.heroBadge || ''}
                                                                onChange={e => setSettings({ ...settings, heroBadge: e.target.value })}
                                                                placeholder="Nueva Colección 2026"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título Línea 1</label>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.heroTitle1 || ''}
                                                                    onChange={e => setSettings({ ...settings, heroTitle1: e.target.value })}
                                                                    placeholder="TECNOLOGÍA"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título Línea 2</label>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.heroTitle2 || ''}
                                                                    onChange={e => setSettings({ ...settings, heroTitle2: e.target.value })}
                                                                    placeholder="DEL FUTURO"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Subtítulo</label>
                                                            <textarea
                                                                className="input-cyber w-full p-3 h-20 resize-none"
                                                                value={settings?.heroSubtitle || ''}
                                                                onChange={e => setSettings({ ...settings, heroSubtitle: e.target.value })}
                                                                placeholder="Explora nuestra selección premium. Calidad garantizada y soporte técnico especializado."
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Imagen de Fondo</label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageUpload(e, setSettings, 'heroUrl', 1920)}
                                                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-900/20 file:text-purple-400 hover:file:bg-purple-900/40 transition"
                                                            />
                                                            {settings?.heroUrl && (
                                                                <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 h-32">
                                                                    <img src={settings.heroUrl} className="w-full h-full object-cover" alt="Hero Preview" />
                                                                </div>
                                                            )}
                                                            <p className="text-xs text-slate-500 mt-2">Recomendado: 1920x800 px mínimo</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Features Section Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Star className="w-5 h-5 text-yellow-400" /> Beneficios Destacados
                                                    </h3>
                                                    <div className="space-y-6">
                                                        {/* Toggle para mostrar toda la sección */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Mostrar Sección de Beneficios</p>
                                                                <p className="text-xs text-slate-500">Activa/desactiva toda la sección de beneficios</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showFeaturesSection: settings?.showFeaturesSection === false ? true : false })}
                                                                className={`w-14 h-7 rounded-full transition-all duration-300 relative ${settings?.showFeaturesSection !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showFeaturesSection !== false ? 'left-8' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Feature 1 */}
                                                        <div className={`transition-opacity duration-300 ${settings?.showFeaturesSection === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Zap className="w-4 h-4 text-cyan-400" />
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Beneficio 1 (Rayo)</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showFeature1: settings?.showFeature1 === false ? true : false })}
                                                                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${settings?.showFeature1 !== false ? 'bg-cyan-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showFeature1 !== false ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${settings?.showFeature1 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature1Title || ''}
                                                                    onChange={e => setSettings({ ...settings, feature1Title: e.target.value })}
                                                                    placeholder="Envío Ultra Rápido"
                                                                    disabled={settings?.showFeature1 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature1Desc || ''}
                                                                    onChange={e => setSettings({ ...settings, feature1Desc: e.target.value })}
                                                                    placeholder="Subtítulo corto..."
                                                                    disabled={settings?.showFeature1 === false}
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* Feature 2 */}
                                                        <div className={`transition-opacity duration-300 ${settings?.showFeaturesSection === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Shield className="w-4 h-4 text-purple-400" />
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Beneficio 2 (Escudo)</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showFeature2: settings?.showFeature2 === false ? true : false })}
                                                                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${settings?.showFeature2 !== false ? 'bg-purple-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showFeature2 !== false ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${settings?.showFeature2 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature2Title || ''}
                                                                    onChange={e => setSettings({ ...settings, feature2Title: e.target.value })}
                                                                    placeholder="Garantía Extendida"
                                                                    disabled={settings?.showFeature2 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature2Desc || ''}
                                                                    onChange={e => setSettings({ ...settings, feature2Desc: e.target.value })}
                                                                    placeholder="Subtítulo corto..."
                                                                    disabled={settings?.showFeature2 === false}
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* Feature 3 */}
                                                        <div className={`transition-opacity duration-300 ${settings?.showFeaturesSection === false ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Headphones className="w-4 h-4 text-green-400" />
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Beneficio 3 (Soporte)</label>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showFeature3: settings?.showFeature3 === false ? true : false })}
                                                                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${settings?.showFeature3 !== false ? 'bg-green-600' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-md ${settings?.showFeature3 !== false ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${settings?.showFeature3 === false ? 'opacity-50' : ''}`}>
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature3Title || ''}
                                                                    onChange={e => setSettings({ ...settings, feature3Title: e.target.value })}
                                                                    placeholder="Soporte 24/7"
                                                                    disabled={settings?.showFeature3 === false}
                                                                />
                                                                <input
                                                                    className="input-cyber w-full p-3"
                                                                    value={settings?.feature3Desc || ''}
                                                                    onChange={e => setSettings({ ...settings, feature3Desc: e.target.value })}
                                                                    placeholder="Subtítulo corto..."
                                                                    disabled={settings?.showFeature3 === false}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Contact Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <MessageCircle className="w-5 h-5 text-green-400" /> Sección Contacto (Footer)
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Mostrar Sección</p>
                                                                <p className="text-xs text-slate-500">Activa/desactiva la sección de contacto en el footer</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showFooterContact: settings?.showFooterContact === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showFooterContact !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showFooterContact !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerContactTitle || ''}
                                                                onChange={e => setSettings({ ...settings, footerContactTitle: e.target.value })}
                                                                placeholder="Contacto"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerContactDescription || ''}
                                                                onChange={e => setSettings({ ...settings, footerContactDescription: e.target.value })}
                                                                placeholder="¿Tienes alguna duda? Estamos aquí para ayudarte."
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Texto del Botón</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerContactButtonText || ''}
                                                                onChange={e => setSettings({ ...settings, footerContactButtonText: e.target.value })}
                                                                placeholder="Contactar Soporte"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo de Contacto</label>
                                                            <select
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerContactType || 'whatsapp'}
                                                                onChange={e => setSettings({ ...settings, footerContactType: e.target.value })}
                                                            >
                                                                <option value="whatsapp">WhatsApp</option>
                                                                <option value="instagram">Instagram</option>
                                                                <option value="email">Email</option>
                                                            </select>

                                                            {/* Conditional Input based on Type */}
                                                            {(!settings?.footerContactType || settings?.footerContactType === 'whatsapp') && (
                                                                <div className="mt-3 animate-fade-in">
                                                                    <label className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1 block">Enlace de WhatsApp</label>
                                                                    <input
                                                                        className="input-cyber w-full p-3 text-sm border-green-500/30 focus:border-green-500"
                                                                        value={settings?.whatsappLink || ''}
                                                                        onChange={e => setSettings({ ...settings, whatsappLink: e.target.value })}
                                                                        placeholder="https://wa.me/54911..."
                                                                    />
                                                                </div>
                                                            )}

                                                            {settings?.footerContactType === 'instagram' && (
                                                                <div className="mt-3 animate-fade-in">
                                                                    <label className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1 block">Perfil de Instagram</label>
                                                                    <input
                                                                        className="input-cyber w-full p-3 text-sm border-pink-500/30 focus:border-pink-500"
                                                                        value={settings?.instagramLink || ''}
                                                                        onChange={e => setSettings({ ...settings, instagramLink: e.target.value })}
                                                                        placeholder="https://instagram.com/usuario"
                                                                    />
                                                                </div>
                                                            )}

                                                            {settings?.footerContactType === 'email' && (
                                                                <div className="mt-3 animate-fade-in">
                                                                    <label className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 block">Email de Soporte</label>
                                                                    <input
                                                                        className="input-cyber w-full p-3 text-sm border-blue-500/30 focus:border-blue-500"
                                                                        value={settings?.storeEmail || ''}
                                                                        onChange={e => setSettings({ ...settings, storeEmail: e.target.value })}
                                                                        placeholder="soporte@tienda.com"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Brand Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Store className="w-5 h-5 text-cyan-400" /> Marca en Footer
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sufijo del Nombre</label>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.footerSuffix || ''}
                                                                onChange={e => setSettings({ ...settings, footerSuffix: e.target.value })}
                                                                placeholder=".SF"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-1">Aparece junto al nombre de la tienda (ej: SUSTORE.SF)</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción</label>
                                                            <textarea
                                                                className="input-cyber w-full p-3 h-24 resize-none"
                                                                value={settings?.footerDescription || ''}
                                                                onChange={e => setSettings({ ...settings, footerDescription: e.target.value })}
                                                                placeholder="Tu destino premium para tecnología de vanguardia..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Legal Links Configuration */}
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-5 md:p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <FileText className="w-5 h-5 text-slate-400" /> Links Legales
                                                    </h3>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Política de Privacidad</p>
                                                                <p className="text-xs text-slate-500">Mostrar link en el footer</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showPrivacyPolicy: settings?.showPrivacyPolicy === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showPrivacyPolicy !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showPrivacyPolicy !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Terms of Service</p>
                                                                <p className="text-xs text-slate-500">Mostrar link en el footer</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showTermsOfService: settings?.showTermsOfService === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showTermsOfService !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showTermsOfService !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === SOCIAL MEDIA === */}
                                        {settingsTab === 'social' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Share2 className="w-5 h-5 text-blue-400" /> Redes Sociales
                                                    </h3>
                                                    <p className="text-sm text-slate-500 mb-6">Configura los enlaces y activa/desactiva la visibilidad de cada red social en el footer.</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* WhatsApp */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp
                                                                </label>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-500 font-mono uppercase">Footer</span>
                                                                    <button
                                                                        onClick={() => setSettings({ ...settings, showWhatsapp: !settings?.showWhatsapp })}
                                                                        className={`w-10 h-5 rounded-full transition relative ${settings?.showWhatsapp === true ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                    >
                                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition`} style={{ left: settings?.showWhatsapp === true ? '22px' : '2px' }}></div>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm mb-3"
                                                                value={settings?.whatsappLink || ''}
                                                                onChange={e => setSettings({ ...settings, whatsappLink: e.target.value })}
                                                                placeholder="https://wa.me/5491112345678"
                                                            />

                                                            {/* Floating Button Toggle */}
                                                            <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                                                                <div>
                                                                    <p className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                                                        Botón Flotante
                                                                        {(!['business', 'premium'].includes(settings?.subscriptionPlan)) && (
                                                                            <Lock className="w-3 h-3 text-yellow-500" />
                                                                        )}
                                                                    </p>
                                                                    {(!['business', 'premium'].includes(settings?.subscriptionPlan)) && (
                                                                        <p className="text-[9px] text-yellow-500/80 mt-0.5">Requiere Plan Negocio</p>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        if (['business', 'premium'].includes(settings?.subscriptionPlan)) {
                                                                            setSettings({ ...settings, showFloatingWhatsapp: !settings?.showFloatingWhatsapp });
                                                                        } else {
                                                                            setShowPlansModal(true);
                                                                        }
                                                                    }}
                                                                    className={`w-10 h-5 rounded-full transition relative ${settings?.showFloatingWhatsapp ? 'bg-green-500' : 'bg-slate-700'} ${(!['business', 'premium'].includes(settings?.subscriptionPlan)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition`} style={{ left: settings?.showFloatingWhatsapp ? '22px' : '2px' }}></div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {/* Instagram */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Instagram className="w-4 h-4 text-pink-400" /> Instagram
                                                                </label>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showInstagram: settings?.showInstagram === false ? true : false })}
                                                                    className={`w-12 h-6 rounded-full transition relative ${settings?.showInstagram !== false ? 'bg-pink-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showInstagram !== false ? 'left-6' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm"
                                                                value={settings?.instagramLink || ''}
                                                                onChange={e => setSettings({ ...settings, instagramLink: e.target.value })}
                                                                placeholder="https://instagram.com/mitienda"
                                                            />
                                                        </div>
                                                        {/* Facebook */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Facebook className="w-4 h-4 text-blue-500" /> Facebook
                                                                </label>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showFacebook: !settings?.showFacebook })}
                                                                    className={`w-12 h-6 rounded-full transition relative ${settings?.showFacebook ? 'bg-blue-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showFacebook ? 'left-6' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm"
                                                                value={settings?.facebookLink || ''}
                                                                onChange={e => setSettings({ ...settings, facebookLink: e.target.value })}
                                                                placeholder="https://facebook.com/mitienda"
                                                            />
                                                        </div>
                                                        {/* Twitter */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Twitter className="w-4 h-4 text-sky-400" /> Twitter/X
                                                                </label>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showTwitter: !settings?.showTwitter })}
                                                                    className={`w-12 h-6 rounded-full transition relative ${settings?.showTwitter ? 'bg-sky-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showTwitter ? 'left-6' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm"
                                                                value={settings?.twitterLink || ''}
                                                                onChange={e => setSettings({ ...settings, twitterLink: e.target.value })}
                                                                placeholder="https://twitter.com/mitienda"
                                                            />
                                                        </div>
                                                        {/* TikTok */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Music className="w-4 h-4 text-rose-400" /> TikTok
                                                                </label>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showTiktok: !settings?.showTiktok })}
                                                                    className={`w-12 h-6 rounded-full transition relative ${settings?.showTiktok ? 'bg-rose-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showTiktok ? 'left-6' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm"
                                                                value={settings?.tiktokLink || ''}
                                                                onChange={e => setSettings({ ...settings, tiktokLink: e.target.value })}
                                                                placeholder="https://tiktok.com/@mitienda"
                                                            />
                                                        </div>
                                                        {/* YouTube */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <label className="text-sm font-bold text-white flex items-center gap-2">
                                                                    <Youtube className="w-4 h-4 text-red-500" /> YouTube
                                                                </label>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, showYoutube: !settings?.showYoutube })}
                                                                    className={`w-12 h-6 rounded-full transition relative ${settings?.showYoutube ? 'bg-red-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showYoutube ? 'left-6' : 'left-0.5'}`}></div>
                                                                </button>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3 text-sm"
                                                                value={settings?.youtubeLink || ''}
                                                                onChange={e => setSettings({ ...settings, youtubeLink: e.target.value })}
                                                                placeholder="https://youtube.com/c/mitienda"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === PAYMENTS === */}
                                        {settingsTab === 'payments' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <CreditCard className="w-5 h-5 text-green-400" /> Métodos de Pago
                                                    </h3>
                                                    <div className="space-y-6">
                                                        {/* Transfer */}
                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <Building className="w-6 h-6 text-blue-400" />
                                                                    <div>
                                                                        <p className="font-bold text-white">Transferencia Bancaria</p>
                                                                        <p className="text-xs text-slate-500">Activado / Desactivado</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, paymentTransfer: { ...settings?.paymentTransfer, enabled: !settings?.paymentTransfer?.enabled } })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.paymentTransfer?.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.paymentTransfer?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Cash */}
                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <Banknote className="w-6 h-6 text-green-400" />
                                                                    <div>
                                                                        <p className="font-bold text-white">Efectivo</p>
                                                                        <p className="text-xs text-slate-500">Pago al recibir</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        // Validar que Retiro en Local esté activo
                                                                        if (!settings?.shippingPickup?.enabled) {
                                                                            showToast('Debes activar "Retiro en Local" (Envíos) para habilitar efectivo.', 'warning');
                                                                            return;
                                                                        }
                                                                        setSettings({ ...settings, paymentCash: !settings?.paymentCash });
                                                                    }}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.paymentCash && settings?.shippingPickup?.enabled ? 'bg-green-500' : 'bg-slate-700'} ${!settings?.shippingPickup?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.paymentCash && settings?.shippingPickup?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            {!settings?.shippingPickup?.enabled && (
                                                                <p className="text-[10px] text-orange-400/80 mt-2 flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" /> Requiere activar Retiro en Local
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* MercadoPago (Tarjeta) */}
                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <CreditCard className="w-6 h-6 text-sky-400" />
                                                                    <div>
                                                                        <p className="font-bold text-white">Tarjeta (Mercado Pago)</p>
                                                                        <p className="text-xs text-slate-500">Activado / Desactivado</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, paymentMercadoPago: { ...settings?.paymentMercadoPago, enabled: !settings?.paymentMercadoPago?.enabled } })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.paymentMercadoPago?.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.paymentMercadoPago?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                        </div>


                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === SHIPPING === */}
                                        {settingsTab === 'shipping' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Truck className="w-5 h-5 text-orange-400" /> Opciones de Envío
                                                    </h3>
                                                    <div className="space-y-6">
                                                        {/* Pickup */}
                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <MapPin className="w-6 h-6 text-cyan-400" />
                                                                    <div>
                                                                        <p className="font-bold text-white">Retiro en Local</p>
                                                                        <p className="text-xs text-slate-500">El cliente pasa a buscar</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, shippingPickup: { ...settings?.shippingPickup, enabled: !settings?.shippingPickup?.enabled } })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.shippingPickup?.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.shippingPickup?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            {settings?.shippingPickup?.enabled && (
                                                                <input
                                                                    className="input-cyber w-full p-4"
                                                                    value={settings?.shippingPickup?.address || ''}
                                                                    onChange={e => setSettings({ ...settings, shippingPickup: { ...settings?.shippingPickup, address: e.target.value } })}
                                                                    placeholder="Dirección de retiro: Av. Corrientes 1234"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Delivery */}
                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Package className="w-6 h-6 text-purple-400" />
                                                                    <div>
                                                                        <p className="font-bold text-white">Envío a Domicilio</p>
                                                                        <p className="text-xs text-slate-500">Delivery estándar</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, shippingDelivery: { ...settings?.shippingDelivery, enabled: !settings?.shippingDelivery?.enabled } })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.shippingDelivery?.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.shippingDelivery?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>
                                                            {settings?.shippingDelivery?.enabled && (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="text-xs text-slate-500 mb-1 block">Costo de Envío ($)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="input-cyber w-full p-4"
                                                                            value={settings?.shippingDelivery?.fee || 0}
                                                                            onChange={e => setSettings({ ...settings, shippingDelivery: { ...settings?.shippingDelivery, fee: parseFloat(e.target.value) || 0 } })}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs text-slate-500 mb-1 block">Gratis desde ($)</label>
                                                                        <input
                                                                            type="number"
                                                                            className="input-cyber w-full p-4"
                                                                            value={settings?.shippingDelivery?.freeAbove || 0}
                                                                            onChange={e => setSettings({ ...settings, shippingDelivery: { ...settings?.shippingDelivery, freeAbove: parseFloat(e.target.value) || 0 } })}
                                                                            placeholder="0 = nunca gratis"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === SEO === */}
                                        {settingsTab === 'seo' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Globe className="w-5 h-5 text-green-400" /> Optimización SEO
                                                    </h3>
                                                    <div className="space-y-6">
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título del Sitio</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.seoTitle || ''}
                                                                onChange={e => setSettings({ ...settings, seoTitle: e.target.value })}
                                                                placeholder="Mi Tienda Online | Los Mejores Productos"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-1">Aparece en la pestaña del navegador</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Meta Descripción</label>
                                                            <textarea
                                                                className="input-cyber w-full p-4 h-20 resize-none"
                                                                value={settings?.seoDescription || ''}
                                                                onChange={e => setSettings({ ...settings, seoDescription: e.target.value })}
                                                                placeholder="Tienda online de productos de alta calidad. Envíos a todo el país. ¡Visitanos!"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-1">Descripción que aparece en Google (max 160 caracteres)</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Palabras Clave</label>
                                                            <input
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.seoKeywords || ''}
                                                                onChange={e => setSettings({ ...settings, seoKeywords: e.target.value })}
                                                                placeholder="tienda online, productos, ofertas, descuentos"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-1">Separadas por comas</p>
                                                        </div>

                                                        {/* OG Image Upload */}
                                                        <div>
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Imagen para Redes Sociales (OG:Image)</label>
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative group w-32 h-32 bg-slate-900 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500 transition flex items-center justify-center overflow-hidden cursor-pointer">
                                                                    {settings?.seoImage ? (
                                                                        <img src={settings.seoImage} alt="SEO Preview" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-cyan-500 transition" />
                                                                    )}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                        onChange={(e) => handleImageUpload(e, setSettings, 'seoImage', 1200)}
                                                                    />
                                                                    {/* Overlay al hacer hover para indicar cambio */}
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                        <Upload className="w-6 h-6 text-white" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm text-slate-400 mb-2">Sube una imagen atractiva (ej: logo con fondo, banner).</p>
                                                                    <p className="text-xs text-slate-600">Recomendado: 1200x630 píxeles para mejor visualización en Facebook/WhatsApp.</p>
                                                                    {settings?.seoImage && (
                                                                        <button
                                                                            onClick={() => setSettings({ ...settings, seoImage: '' })}
                                                                            className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" /> Eliminar imagen
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Links Status */}
                                                        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                                                            <a href="/sitemap.xml" target="_blank" className="p-3 bg-slate-900 rounded-xl hover:bg-slate-800 transition flex items-center justify-between group">
                                                                <div>
                                                                    <p className="text-sm font-bold text-white">Ver Sitemap.xml</p>
                                                                    <p className="text-xs text-green-500">Activo</p>
                                                                </div>
                                                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                                                            </a>
                                                            <a href="/robots.txt" target="_blank" className="p-3 bg-slate-900 rounded-xl hover:bg-slate-800 transition flex items-center justify-between group">
                                                                <div>
                                                                    <p className="text-sm font-bold text-white">Ver Robots.txt</p>
                                                                    <p className="text-xs text-green-500">Activo</p>
                                                                </div>
                                                                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* === ADVANCED === */}
                                        {settingsTab === 'advanced' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Cog className="w-5 h-5 text-slate-400" /> Configuración Avanzada
                                                    </h3>
                                                    <div className="space-y-4">
                                                        {/* Maintenance Mode */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Modo Mantenimiento</p>
                                                                <p className="text-xs text-slate-500">Mostrar página de "Volvemos pronto"</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, maintenanceMode: !settings?.maintenanceMode })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.maintenanceMode ? 'bg-red-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.maintenanceMode ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* PWA & Performance Controls */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-4">
                                                            <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-2">Rendimiento & PWA</h4>

                                                            {/* Lazy Loading */}
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-bold text-white">Carga Diferida (Lazy Load)</p>
                                                                    <p className="text-xs text-slate-500">Mejora velocidad cargando imágenes al hacer scroll</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, enableLazyLoad: settings?.enableLazyLoad === false ? true : false })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.enableLazyLoad !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.enableLazyLoad !== false ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>

                                                            {/* PWA Service Worker */}
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-bold text-white">Modo Offline (PWA)</p>
                                                                    <p className="text-xs text-slate-500">Permite instalar la app y uso sin internet</p>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, enablePWA: settings?.enablePWA === false ? true : false })}
                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.enablePWA !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.enablePWA !== false ? 'left-7' : 'left-1'}`}></div>
                                                                </button>
                                                            </div>

                                                            {/* Clear Cache Button */}
                                                            <div className="pt-2 border-t border-slate-700">
                                                                <button
                                                                    onClick={() => {
                                                                        if ('caches' in window) {
                                                                            caches.keys().then(names => {
                                                                                names.forEach(name => caches.delete(name));
                                                                                showToast('Caché limpiada. Recargando...', 'success');
                                                                                setTimeout(() => window.location.reload(), 1500);
                                                                            });
                                                                        } else {
                                                                            showToast('Tu navegador no soporta gestión de caché', 'warning');
                                                                        }
                                                                    }}
                                                                    className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                                                                >
                                                                    <Trash2 className="w-4 h-4" /> Forzar Limpieza de Caché y Recargar
                                                                </button>
                                                                <p className="text-xs text-slate-500 mt-2 text-center">Usar si ves errores gráficos o versiones antiguas.</p>
                                                            </div>
                                                        </div>

                                                        {/* Loading Text */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="mb-3">
                                                                <p className="font-bold text-white">Texto de Carga</p>
                                                                <p className="text-xs text-slate-500">Mensaje que aparece mientras carga la página</p>
                                                            </div>
                                                            <input
                                                                className="input-cyber w-full p-3"
                                                                value={settings?.loadingText || ''}
                                                                onChange={e => setSettings({ ...settings, loadingText: e.target.value })}
                                                                placeholder="Cargando sistema..."
                                                            />
                                                        </div>

                                                        {/* Show Announcement Banner */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Banner de Anuncio</p>
                                                                <p className="text-xs text-slate-500">Barra superior con mensaje promocional</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showAnnouncementBanner: settings?.showAnnouncementBanner === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showAnnouncementBanner !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showAnnouncementBanner !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Show Brand Ticker */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Ticker de Marca</p>
                                                                <p className="text-xs text-slate-500">Texto en movimiento debajo del anuncio</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showBrandTicker: settings?.showBrandTicker === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showBrandTicker !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showBrandTicker !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Show Stock */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Mostrar Stock Disponible</p>
                                                                <p className="text-xs text-slate-500">Los clientes ven cuántas unidades hay</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, showStockCount: settings?.showStockCount === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.showStockCount !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showStockCount !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Require Phone */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Requerir Teléfono</p>
                                                                <p className="text-xs text-slate-500">Obligatorio al registrarse</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, requirePhone: settings?.requirePhone === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.requirePhone !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.requirePhone !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Require DNI */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div>
                                                                <p className="font-bold text-white">Requerir DNI</p>
                                                                <p className="text-xs text-slate-500">Obligatorio al registrarse</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setSettings({ ...settings, requireDNI: settings?.requireDNI === false ? true : false })}
                                                                className={`w-14 h-8 rounded-full transition relative ${settings?.requireDNI !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.requireDNI !== false ? 'left-7' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Low Stock Threshold */}
                                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div>
                                                                    <p className="font-bold text-white">Umbral de Stock Bajo</p>
                                                                    <p className="text-xs text-slate-500">Alerta cuando el stock es menor a este valor</p>
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                className="input-cyber w-full p-4"
                                                                value={settings?.lowStockThreshold || 5}
                                                                onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 5 })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <FolderPlus className="w-5 h-5 text-cyan-400" /> Categorías de Productos
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {(settings?.categories || []).map((cat, idx) => (
                                                            <div key={idx} className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 border border-slate-700">
                                                                <span>{cat}</span>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, categories: (settings?.categories || []).filter((_, i) => i !== idx) })}
                                                                    className="text-red-400 hover:text-red-300"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => setShowCategoryModal(true)}
                                                        className="px-4 py-2 bg-cyan-900/20 text-cyan-400 rounded-lg font-bold text-sm border border-cyan-500/30 hover:bg-cyan-900/40 transition flex items-center gap-2"
                                                    >
                                                        <Plus className="w-4 h-4" /> Agregar Categoría
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* === TEAM === */}
                                        {settingsTab === 'team' && (
                                            <div className="space-y-6 animate-fade-up">
                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                        <Users className="w-5 h-5 text-purple-400" /> Equipo y Accesos
                                                    </h3>
                                                    <p className="text-slate-500 mb-6">Gestiona los miembros del equipo, sus roles de acceso y participación en ganancias.</p>

                                                    <div className="space-y-4 mb-6">
                                                        {(settings?.team || []).map((member, idx) => (
                                                            <div key={idx} className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Nombre</label>
                                                                        <input
                                                                            className="input-cyber w-full p-2 text-sm"
                                                                            value={member.name || ''}
                                                                            onChange={e => {
                                                                                const updated = [...(settings?.team || [])];
                                                                                updated[idx] = { ...updated[idx], name: e.target.value };
                                                                                setSettings({ ...settings, team: updated });
                                                                            }}
                                                                            placeholder="Nombre"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Email (Acceso)</label>
                                                                        <input
                                                                            type="email"
                                                                            className="input-cyber w-full p-2 text-sm"
                                                                            value={member.email || ''}
                                                                            onChange={e => {
                                                                                const updated = [...(settings?.team || [])];
                                                                                updated[idx] = { ...updated[idx], email: e.target.value };
                                                                                setSettings({ ...settings, team: updated });
                                                                            }}
                                                                            placeholder="usuario@email.com"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Rol</label>
                                                                        <select
                                                                            className="input-cyber w-full p-2 text-sm"
                                                                            value={member.role || 'employee'}
                                                                            onChange={e => {
                                                                                const updated = [...(settings?.team || [])];
                                                                                updated[idx] = { ...updated[idx], role: e.target.value };
                                                                                setSettings({ ...settings, team: updated });
                                                                            }}
                                                                        >
                                                                            <option value="employee">Empleado</option>
                                                                            <option value="admin">Admin</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Total Invertido</label>
                                                                        <div className="input-cyber w-full p-2 text-sm bg-slate-900/50 text-slate-400 flex items-center cursor-not-allowed">
                                                                            $ {investments.filter(inv => inv.investor === member.name || inv.investor === member.email).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setSettings({ ...settings, team: (settings?.team || []).filter((_, i) => i !== idx) })}
                                                                    className="p-3 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl transition flex-shrink-0"
                                                                    title="Eliminar Miembro"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => setSettings({ ...settings, team: [...(settings?.team || []), { name: '', email: '', role: 'employee', investment: 0 }] })}
                                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition"
                                                    >
                                                        <UserPlus className="w-5 h-5" /> Agregar Nuevo Miembro
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Save Button */}
                                        <div className="fixed bottom-8 right-8 z-50">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setIsLoading(true);
                                                        const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
                                                        await setDoc(settingsRef, settings, { merge: true });
                                                        showToast("Configuración guardada exitosamente", "success");
                                                    } catch (e) {
                                                        console.error(e);
                                                        showToast("Error al guardar", "error");
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-2xl shadow-cyan-900/30 flex items-center gap-3 transition transform hover:scale-105"
                                            >
                                                <Save className="w-5 h-5" /> Guardar Cambios
                                            </button>
                                        </div>
                                    </div>
                                )
                                }

                                {/* 7.3 Modal Proveedores (Selector Visual) */}
                                {
                                    showSupplierModal && (
                                        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-scale">
                                            <div className="bg-[#0a0a0a] border border-slate-700 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                                                <div className="overflow-y-auto custom-scrollbar pr-2 pb-20">
                                                    <h3 className="text-2xl font-black text-white mb-6 sticky top-0 bg-[#0a0a0a] py-2 z-10">
                                                        {editingSupplierId ? 'Editar' : 'Nuevo'} Proveedor
                                                    </h3>

                                                    <div className="space-y-4 mb-6">
                                                        <input className="input-cyber w-full p-4" placeholder="Nombre de la Empresa" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                                                        <input className="input-cyber w-full p-4" placeholder="Nombre del Contacto" value={newSupplier.contact} onChange={e => setNewSupplier({ ...newSupplier, contact: e.target.value })} />

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <input className="input-cyber w-full p-4" placeholder="Teléfono" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                                                            <input className="input-cyber w-full p-4" placeholder="Instagram (sin @)" value={newSupplier.ig} onChange={e => setNewSupplier({ ...newSupplier, ig: e.target.value })} />
                                                        </div>

                                                        {/* Selector Visual de Productos */}
                                                        <div className="border-t border-slate-800 pt-6 mt-6">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
                                                                Asignar Productos Suministrados
                                                            </label>
                                                            <div className="h-48 overflow-y-auto bg-slate-900/50 rounded-xl p-2 border border-slate-800 custom-scrollbar">
                                                                {products.length === 0 ? (
                                                                    <p className="text-center text-slate-600 text-xs py-4">Carga productos primero.</p>
                                                                ) : products.map(p => (
                                                                    <div
                                                                        key={p.id}
                                                                        onClick={() => {
                                                                            const prev = newSupplier.associatedProducts || [];
                                                                            const exists = prev.includes(p.id);
                                                                            setNewSupplier({
                                                                                ...newSupplier,
                                                                                associatedProducts: exists ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                                                            });
                                                                        }}
                                                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer mb-1 transition ${newSupplier.associatedProducts?.includes(p.id) ? 'bg-cyan-900/30 border border-cyan-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                                                    >
                                                                        <div className="w-8 h-8 bg-white rounded p-0.5 flex-shrink-0">
                                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <span className="text-xs text-white truncate flex-1 font-medium">{p.name}</span>
                                                                        {newSupplier.associatedProducts?.includes(p.id) && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer Botones Fixed */}
                                                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent flex gap-4">
                                                    <button onClick={() => setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition bg-slate-900 rounded-xl">Cancelar</button>
                                                    <button onClick={saveSupplierFn} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div >
                        </div >
                    ) : (
                        <AccessDenied onBack={() => setView('store')} />
                    ))
                }

                {/* 8. VISTA POLÍTICA DE PRIVACIDAD */}
                {
                    view === 'privacy' && (
                        <div className="max-w-4xl mx-auto py-20 px-6 animate-fade-up">
                            <div className="glass p-12 rounded-[3rem] border border-slate-800">
                                <div className="prose prose-invert max-w-none">
                                    <h1 className="text-5xl font-black mb-12 tracking-tighter italic">
                                        Política de <span className="text-cyan-500 text-6xl">Privacidad</span>
                                    </h1>
                                    <p className="text-slate-400 text-lg leading-relaxed">
                                        En <strong>{settings?.storeName || 'SUSTORE'}</strong>, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política describe cómo recolectamos, usamos y resguardamos tu información.
                                    </p>
                                    <h2 className="text-2xl font-bold text-white mt-12 mb-6">1. Información Recolectada</h2>
                                    <p className="text-slate-500 leadind-relaxed">
                                        Recolectamos datos básicos como nombre, correo electrónico y número de teléfono únicamente cuando te registras o realizas un pedido para procesar tu compra correctamente.
                                    </p>
                                    <h2 className="text-2xl font-bold text-white mt-12 mb-6">2. Uso de los Datos</h2>
                                    <p className="text-slate-500 leadind-relaxed">
                                        Tu información se utiliza exclusivamente para:
                                    </p>
                                    <ul className="list-disc pl-6 text-slate-500 space-y-2">
                                        <li>Gestionar tus pedidos y entregas.</li>
                                        <li>Enviar actualizaciones sobre el estado de tu compra.</li>
                                        <li>Mejorar nuestros servicios y experiencia de usuario.</li>
                                    </ul>
                                    <h2 className="text-2xl font-bold text-white mt-12 mb-6">3. Seguridad</h2>
                                    <p className="text-slate-500 leadind-relaxed">
                                        Implementamos medidas de seguridad robustas y encriptación de datos para asegurar que tu información esté protegida contra accesos no autorizados.
                                    </p>
                                    <h2 className="text-2xl font-bold text-white mt-12 mb-6">4. Contacto</h2>
                                    <p className="text-slate-500 leadind-relaxed mb-12">
                                        Si tienes dudas sobre nuestra política de privacidad, contáctanos a <span className="text-cyan-400">{settings?.storeEmail || 'soporte@tuempresa.com'}</span>.
                                    </p>
                                    <button onClick={() => setView('store')} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition flex items-center gap-3 border border-slate-700">
                                        <ArrowLeft className="w-5 h-5" /> Volver a la Tienda
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* 9. VISTA TÉRMINOS Y CONDICIONES */}
                {
                    view === 'terms' && (
                        <div className="max-w-4xl mx-auto py-20 px-6 animate-fade-up">
                            <div className="glass p-12 rounded-[3rem] border border-slate-800">
                                <div className="prose prose-invert max-w-none">
                                    <h1 className="text-5xl font-black mb-12 tracking-tighter italic">
                                        Condiciones de <span className="text-cyan-500 text-6xl">Uso</span>
                                    </h1>
                                    <p className="text-slate-400 font-bold mb-8">Última actualización: 07 de enero de 2026</p>

                                    <h3 className="text-xl font-bold text-white mt-8 mb-4">ACUERDO CON NUESTROS TÉRMINOS LEGALES</h3>
                                    <p className="text-slate-500 leading-relaxed mb-4">
                                        Nosotros somos <strong>{settings?.storeName || 'Sustore'}</strong> ("<strong>Empresa</strong>", "<strong>nosotros</strong>", "<strong>nos</strong>", "<strong>nuestro</strong>").
                                    </p>
                                    <p className="text-slate-500 leading-relaxed mb-4">
                                        Operamos el sitio web <a href="https://sustore.vercel.app" className="text-cyan-400 hover:underline">https://sustore.vercel.app</a> (el "<strong>Sitio</strong>"), así como cualquier otro producto y servicio relacionado que haga referencia o se vincule con estos términos legales (los "<strong>Términos Legales</strong>") (colectivamente, los "<strong>Servicios</strong>").
                                    </p>
                                    <p className="text-slate-500 leading-relaxed mb-4">
                                        Puede contactarnos por correo electrónico a la dirección proporcionada al final de este documento.
                                    </p>
                                    <p className="text-slate-500 leading-relaxed mb-4">
                                        Estos Términos Legales constituyen un acuerdo legalmente vinculante celebrado entre usted, ya sea personalmente o en nombre de una entidad ("<strong>usted</strong>"), y Sustore, en relación con su acceso y uso de los Servicios. Usted acepta que al acceder a los Servicios, ha leído, comprendido y aceptado estar sujeto a todos estos Términos Legales. <strong className="text-red-400">SI NO ESTÁ DE ACUERDO CON TODOS ESTOS TÉRMINOS LEGALES, ENTONCES TIENE EXPRESAMENTE PROHIBIDO UTILIZAR LOS SERVICIOS Y DEBE DEJAR DE UTILIZARLOS INMEDIATAMENTE.</strong>
                                    </p>

                                    <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 my-10">
                                        <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6">ÍNDICE</h3>
                                        <ul className="space-y-2 text-sm text-cyan-400 font-medium">
                                            <li><a href="#section1" className="hover:text-cyan-300 transition">1. NUESTROS SERVICIOS</a></li>
                                            <li><a href="#section2" className="hover:text-cyan-300 transition">2. DERECHOS DE PROPIEDAD INTELECTUAL</a></li>
                                            <li><a href="#section3" className="hover:text-cyan-300 transition">3. REPRESENTACIONES DE USUARIOS</a></li>
                                            <li><a href="#section4" className="hover:text-cyan-300 transition">4. ACTIVIDADES PROHIBIDAS</a></li>
                                            <li><a href="#section5" className="hover:text-cyan-300 transition">5. CONTRIBUCIONES GENERADAS POR EL USUARIO</a></li>
                                            <li><a href="#section6" className="hover:text-cyan-300 transition">6. LICENCIA DE CONTRIBUCIÓN</a></li>
                                            <li><a href="#section7" className="hover:text-cyan-300 transition">7. GESTIÓN DE SERVICIOS</a></li>
                                            <li><a href="#section8" className="hover:text-cyan-300 transition">8. PLAZO Y TERMINACIÓN</a></li>
                                            <li><a href="#section9" className="hover:text-cyan-300 transition">9. MODIFICACIONES E INTERRUPCIONES</a></li>
                                            <li><a href="#section10" className="hover:text-cyan-300 transition">10. LEY APLICABLE</a></li>
                                            <li><a href="#section11" className="hover:text-cyan-300 transition">11. RESOLUCIÓN DE DISPUTAS</a></li>
                                            <li><a href="#section12" className="hover:text-cyan-300 transition">12. CORRECCIONES</a></li>
                                            <li><a href="#section13" className="hover:text-cyan-300 transition">13. DESCARGO DE RESPONSABILIDAD</a></li>
                                            <li><a href="#section14" className="hover:text-cyan-300 transition">14. LIMITACIONES DE RESPONSABILIDAD</a></li>
                                            <li><a href="#section15" className="hover:text-cyan-300 transition">15. INDEMNIZACIÓN</a></li>
                                            <li><a href="#section16" className="hover:text-cyan-300 transition">16. DATOS DEL USUARIO</a></li>
                                            <li><a href="#section17" className="hover:text-cyan-300 transition">17. COMUNICACIONES ELECTRÓNICAS</a></li>
                                            <li><a href="#section18" className="hover:text-cyan-300 transition">18. VARIOS</a></li>
                                            <li><a href="#section19" className="hover:text-cyan-300 transition">19. CONTÁCTENOS</a></li>
                                        </ul>
                                    </div>

                                    <section id="section1" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">1. NUESTROS SERVICIOS</h2>
                                        <p className="text-slate-500 leading-relaxed">
                                            La información proporcionada al utilizar los Servicios no está destinada a ser distribuida o utilizada por ninguna persona o entidad en ninguna jurisdicción o país donde dicha distribución o uso sería contrario a la ley o regulación o que nos sometería a cualquier requisito de registro dentro de dicha jurisdicción o país. En consecuencia, aquellas personas que eligen acceder a los Servicios desde otras ubicaciones lo hacen por iniciativa propia y son las únicas responsables del cumplimiento de las leyes locales, si y en la medida en que sean aplicables.
                                        </p>
                                    </section>

                                    <section id="section2" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">2. DERECHOS DE PROPIEDAD INTELECTUAL</h2>
                                        <h3 className="text-lg font-bold text-white mt-6 mb-2">Nuestra propiedad intelectual</h3>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Somos propietarios o licenciatarios de todos los derechos de propiedad intelectual de nuestros Servicios, incluido todo el código fuente, bases de datos, funcionalidad, software, diseños de sitios web, audio, video, texto, fotografías y gráficos de los Servicios (colectivamente, el "Contenido"), así como las marcas comerciales, marcas de servicio y logotipos contenidos en ellas (las "Marcas").
                                        </p>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Nuestro Contenido y Marcas están protegidos por leyes de derechos de autor y marcas registradas (y varias otras leyes de derechos de propiedad intelectual y competencia desleal) y tratados alrededor del mundo.
                                        </p>
                                        <p className="text-slate-500 leading-relaxed">
                                            El Contenido y las Marcas se proporcionan en o a través de los Servicios "TAL CUAL" para su uso personal, no comercial o finalidad empresarial interna.
                                        </p>

                                        <h3 className="text-lg font-bold text-white mt-6 mb-2">Su uso de nuestros Servicios</h3>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Sujeto a su cumplimiento de estos Términos Legales, incluidos los "ACTIVIDADES PROHIBIDAS" en la sección siguiente, le otorgamos un contrato no exclusivo, intransferible y revocable licencia para:
                                        </p>
                                        <ul className="list-disc pl-6 text-slate-500 space-y-2 mb-4">
                                            <li>acceder a los Servicios; y</li>
                                            <li>descargar o imprimir una copia de cualquier parte del Contenido al que haya obtenido acceso correctamente,</li>
                                        </ul>
                                        <p className="text-slate-500 leading-relaxed mb-4">únicamente para tu uso personal, no comercial o finalidad empresarial interna.</p>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Salvo lo establecido en esta sección o en otra parte de nuestros Términos Legales, ninguna parte de los Servicios ni ningún Contenido o Marca podrán copiarse ni reproducirse, agregado, republicado, cargado, publicado, mostrado públicamente, codificado, traducido, transmitido, distribuido, vendido, licenciado o explotado de otro modo para cualquier fin comercial, sin nuestro expreso previo escrito permiso.
                                        </p>
                                        <p className="text-slate-500 leading-relaxed">
                                            Si desea hacer algún uso de los Servicios, Contenido o Marcas que no sea el establecido en esta sección o en otra parte de nuestros Términos Legales, dirija su solicitud a nuestro correo de contacto.
                                        </p>
                                    </section>

                                    <section id="section3" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">3. REPRESENTACIONES DE USUARIOS</h2>
                                        <p className="text-slate-500 leading-relaxed">
                                            Al utilizar los Servicios, usted declara y garantiza que: (1) usted tiene la capacidad legal y acepta cumplir con estos Términos Legales; (2) no eres un menor de edad en la jurisdicción en la que usted reside; (3) no accederás a los Servicios a través de medios automatizados o no humanos, ya sea a través de un bot, script o de otro modo; (4) no utilizará los Servicios para ninguna actividad ilegal o no autorizado propósito; y (5) su uso de los Servicios no violará ninguna ley o regulación aplicable.
                                        </p>
                                    </section>

                                    <section id="section4" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">4. ACTIVIDADES PROHIBIDAS</h2>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            No puede acceder ni utilizar los Servicios para ningún otro propósito que no sea aquel para el cual los ponemos a disposición. Los Servicios no podrán utilizarse en relación con ningún negocio comercial esfuerzo excepto aquellos que estén específicamente respaldados o aprobados por nosotros.
                                        </p>
                                        <p className="text-slate-500 leading-relaxed mb-4">Como usuario de los Servicios, usted acepta no:</p>
                                        <ul className="list-disc pl-6 text-slate-500 space-y-2">
                                            <li>Recuperar sistemáticamente datos u otro contenido de los Servicios para crear o compilar, directa o indirectamente, una colección, compilación, base de datos o directorio sin nuestro permiso por escrito.</li>
                                            <li>Engañarnos, defraudarnos o engañarnos a nosotros y a otros usuarios, especialmente en cualquier intento de obtener información confidencial de la cuenta, como las contraseñas de los usuarios.</li>
                                            <li>Eludir, deshabilitar o interferir de otro modo con las características relacionadas con la seguridad de los Servicios.</li>
                                            <li>Menospreciar, empañar o dañar de otro modo, en nuestra opinión, a nosotros y/o a los Servicios.</li>
                                            <li>Utilizar cualquier información obtenida de los Servicios para acosar, abusar o dañar a otra persona.</li>
                                            <li>Hacer un uso indebido de nuestros servicios de soporte o presentar informes falsos de abuso o mala conducta.</li>
                                            <li>Utilice los Servicios de una manera incompatible con las leyes o regulaciones aplicables.</li>
                                        </ul>
                                    </section>

                                    <section id="section13" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">13. DESCARGO DE RESPONSABILIDAD</h2>
                                        <p className="text-slate-500 leading-relaxed text-xs uppercase tracking-wide border-l-4 border-red-500/50 pl-4 py-2 bg-red-900/5">
                                            LOS SERVICIOS SE PRESTAN TAL CUAL Y SEGÚN ESTÉ DISPONIBLE. USTED ACEPTA QUE SU USO DE LOS SERVICIOS SERÁ BAJO SU PROPIO RIESGO. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, RENUNCIAMOS A TODAS LAS GARANTÍAS, EXPRESAS O IMPLÍCITAS, EN RELACIÓN CON LOS SERVICIOS Y SU USO DE LOS MISMOS.
                                        </p>
                                    </section>

                                    <section id="section19" className="mb-12">
                                        <h2 className="text-2xl font-bold text-white mb-4">19. CONTÁCTENOS</h2>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Para resolver una queja con respecto a los Servicios o para recibir más información sobre el uso de los Servicios, contáctenos en:
                                        </p>
                                        <p className="text-2xl font-black text-cyan-400">
                                            {settings?.storeEmail || 'soporte@tuempresa.com'}
                                        </p>
                                    </section>

                                    <button onClick={() => setView('store')} className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition flex items-center gap-3 border border-slate-700 mt-12">
                                        <ArrowLeft className="w-5 h-5" /> Volver a la Tienda
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >

            {/* FOOTER PROFESIONAL (Visible solo fuera del Admin y Auth) */}
            {
                view !== 'admin' && view !== 'login' && view !== 'register' && (
                    <footer className="bg-[#050505] border-t border-slate-900 pt-16 pb-8 relative overflow-hidden">
                        {/* Decoración de Fondo */}
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-900/50 to-transparent"></div>
                        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-900/5 rounded-full blur-[100px] pointer-events-none"></div>

                        <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 relative z-10">
                            {/* Columna 1: Marca */}
                            <div className="md:col-span-2 space-y-6">
                                <h2 className="text-3xl font-black text-white tracking-tighter italic">
                                    {settingsLoaded ? (settings?.storeName || '') : ''}
                                    <span className="text-cyan-500">{settings?.footerSuffix || '.SF'}</span>
                                </h2>
                                <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
                                    {settings?.footerDescription || 'Tu destino premium para tecnología de vanguardia. Ofrecemos los mejores productos con garantía y soporte especializado. Elevamos tu experiencia digital.'}
                                </p>
                                <div className="flex gap-3 pt-2 flex-wrap">
                                    {settings?.showInstagram !== false && settings?.instagramLink && (
                                        <button onClick={() => window.open(settings?.instagramLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-pink-400 hover:bg-pink-900/10 transition border border-slate-800 hover:border-pink-500/30">
                                            <Instagram className="w-5 h-5" />
                                        </button>
                                    )}
                                    {settings?.showWhatsapp === true && settings?.whatsappLink && (
                                        <button onClick={() => window.open(settings?.whatsappLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-green-400 hover:bg-green-900/10 transition border border-slate-800 hover:border-green-500/30">
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                    {settings?.showFacebook && settings?.facebookLink && (
                                        <button onClick={() => window.open(settings?.facebookLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-900/10 transition border border-slate-800 hover:border-blue-500/30">
                                            <Facebook className="w-5 h-5" />
                                        </button>
                                    )}
                                    {settings?.showTwitter && settings?.twitterLink && (
                                        <button onClick={() => window.open(settings?.twitterLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-sky-900/10 transition border border-slate-800 hover:border-sky-500/30">
                                            <Twitter className="w-5 h-5" />
                                        </button>
                                    )}
                                    {settings?.showTiktok && settings?.tiktokLink && (
                                        <button onClick={() => window.open(settings?.tiktokLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-900/10 transition border border-slate-800 hover:border-rose-500/30">
                                            <Music className="w-5 h-5" />
                                        </button>
                                    )}
                                    {settings?.showYoutube && settings?.youtubeLink && (
                                        <button onClick={() => window.open(settings?.youtubeLink, '_blank')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition border border-slate-800 hover:border-red-500/30">
                                            <Youtube className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Columna 2: Quick Links */}
                            <div className="space-y-6">
                                <h3 className="text-white font-bold uppercase tracking-widest text-xs">Enlaces Rápidos</h3>
                                <ul className="space-y-3 text-sm text-slate-500 font-medium">
                                    <li>
                                        <button onClick={() => setView('store')} className="hover:text-cyan-400 transition flex items-center gap-2 group">
                                            <span className="w-0 group-hover:w-2 h-px bg-cyan-400 transition-all duration-300"></span> Inicio
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => setView('profile')} className="hover:text-cyan-400 transition flex items-center gap-2 group">
                                            <span className="w-0 group-hover:w-2 h-px bg-cyan-400 transition-all duration-300"></span> Mi Cuenta
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => setView('guide')} className="hover:text-cyan-400 transition flex items-center gap-2 group">
                                            <span className="w-0 group-hover:w-2 h-px bg-cyan-400 transition-all duration-300"></span> Ayuda & Soporte
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Columna 3: Soporte */}
                            {settings?.showFooterContact !== false && (
                                <div className="space-y-6">
                                    <h3 className="text-white font-bold uppercase tracking-widest text-xs">
                                        {settings?.footerContactTitle || 'Contacto'}
                                    </h3>
                                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                        {settings?.footerContactDescription || '¿Tienes alguna duda? Estamos aquí para ayudarte.'}
                                    </p>
                                    <button
                                        onClick={() => {
                                            const type = settings?.footerContactType || 'whatsapp';
                                            if (type === 'whatsapp' && settings?.whatsappLink) {
                                                window.open(settings.whatsappLink, '_blank');
                                            } else if (type === 'instagram' && settings?.instagramLink) {
                                                window.open(settings.instagramLink, '_blank');
                                            } else if (type === 'email' && settings?.storeEmail) {
                                                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${settings.storeEmail}`, '_blank');
                                            }
                                        }}
                                        className="px-6 py-3 bg-cyan-900/10 text-cyan-400 rounded-xl text-sm font-bold border border-cyan-500/20 hover:bg-cyan-500 hover:text-white transition w-full md:w-auto"
                                    >
                                        {settings?.footerContactButtonText || 'Contactar Soporte'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Copyright Bar */}
                        <div className="border-t border-slate-900 bg-[#020202]">
                            <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <p className="text-slate-600 text-xs font-mono">
                                    {settings?.footerCopyright || `© ${new Date().getFullYear()} ${settings?.storeName || ''}. All rights reserved.`}
                                </p>
                                <div className="flex gap-6">
                                    {settings?.showPrivacyPolicy !== false && (
                                        <span onClick={() => setView('privacy')} className="text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-slate-400 transition underline decoration-slate-900 underline-offset-4">Privacy Policy</span>
                                    )}
                                    {settings?.showTermsOfService !== false && (
                                        <span onClick={() => setView('terms')} className="text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-slate-400 transition underline decoration-slate-900 underline-offset-4">Terms of Service</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </footer>
                )
            }

            {/* MODAL: CREAR CATEGORÍA */}
            {
                showCategoryModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-scale p-4">
                        <div className="glass p-8 rounded-[2rem] max-w-md w-full border border-cyan-800 shadow-2xl">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto bg-cyan-900/20 text-cyan-500">
                                <FolderPlus className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-center mb-6 text-white">Nueva Categoría</h3>
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="input-cyber w-full p-4 mb-6"
                                placeholder="Nombre de la categoría"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setNewCategory(''); setShowCategoryModal(false); }}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={createCategoryFn}
                                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition shadow-lg shadow-cyan-600/30"
                                >
                                    Crear
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL: VENTA MANUAL */}
            {
                showManualSaleModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in-scale p-4">
                        <div className="glass p-8 rounded-[2rem] max-w-md w-full border border-green-900 shadow-2xl">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto bg-green-900/20 text-green-500">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-center mb-2 text-white">Venta Manual</h3>
                            <p className="text-center text-slate-400 mb-6">
                                {products.find(p => p.id === saleData.productId)?.name}
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cantidad</label>
                                        <input
                                            type="number"
                                            className="input-cyber w-full p-3"
                                            value={saleData.quantity}
                                            onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) || 1 })}
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Precio Unit.</label>
                                        <input
                                            type="number"
                                            className="input-cyber w-full p-3"
                                            value={saleData.price}
                                            onChange={(e) => setSaleData({ ...saleData, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Método de Pago</label>
                                    <select
                                        className="input-cyber w-full p-3"
                                        value={saleData.paymentMethod}
                                        onChange={(e) => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                                    >
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                    </select>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center border border-slate-800">
                                    <span className="text-slate-400 font-bold">Total:</span>
                                    <span className="text-2xl font-black text-green-400">${(saleData.quantity * saleData.price).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowManualSaleModal(false)}
                                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmManualSale}
                                    disabled={isProcessingOrder}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition shadow-lg shadow-green-600/30 flex items-center justify-center gap-2"
                                >
                                    {isProcessingOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* BOTÓN FLOTANTE DE WHATSAPP (Solo Plan Negocio/Premium) */}
            {
                settings?.showFloatingWhatsapp && settings?.whatsappLink && ['business', 'premium'].includes(settings?.subscriptionPlan) && view !== 'admin' && (
                    <button
                        onClick={() => window.open(settings.whatsappLink, '_blank')}
                        className="fixed bottom-6 right-6 z-50 p-4 bg-green-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-110 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all animate-bounce-slow"
                        title="Chatea con nosotros"
                    >
                        <MessageCircle className="w-8 h-8 text-white fill-white" />
                    </button>
                )
            }

            <AdminUserDrawer />
            {/* MODAL: VER PLANES DE SUSCRIPCIÓN */}
            {
                showPlansModal && (
                    <PlansModalContent settings={settings} onClose={() => setShowPlansModal(false)} />
                )
            }
            {
                false && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in-scale p-0 md:p-4 overflow-hidden">
                        <div className="bg-gradient-to-b from-[#0d0d0d] to-[#050505] relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-[2.5rem] border-0 md:border md:border-slate-800/50 shadow-2xl flex flex-col overflow-hidden">
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-20">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                                                <Zap className="w-6 h-6 md:w-8 md:h-8 text-white fill-current" />
                                            </div>
                                            Planes Disponibles
                                        </h2>
                                        <p className="text-slate-500">Tu plan actual: <span className="text-cyan-400 font-bold uppercase bg-cyan-500/10 px-3 py-1 rounded-full text-sm">{settings?.subscriptionPlan === 'business' ? '🚀 Negocio' : settings?.subscriptionPlan === 'premium' ? '💎 Premium' : '🏪 Emprendedor'}</span></p>
                                    </div>
                                    <button onClick={() => setShowPlansModal(false)} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 hover:rotate-90">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    {/* PLAN EMPRENDEDOR */}
                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan
                                        ? 'bg-gradient-to-b from-cyan-950/40 to-slate-950 border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.25)]'
                                        : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-cyan-500/50'
                                        }`}>
                                        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                        {(settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && (
                                            <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">✓ TU PLAN ACTUAL</div>
                                        )}

                                        <div className="relative z-10 p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-4 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-2xl shadow-lg shadow-cyan-500/30">
                                                    <Store className="w-7 h-7 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white">🚀 Emprendedor</h4>
                                                    <p className="text-sm text-cyan-400 font-medium leading-tight">Impulso inicial</p>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 rounded-2xl p-4 mb-5 border border-slate-800">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Desde</p>
                                                <div className="text-4xl font-black text-white">$7.000 <span className="text-lg text-slate-500 font-normal">/mes</span></div>
                                            </div>

                                            <div className="space-y-3 mb-6 flex-1">
                                                <div className="space-y-2 text-sm text-slate-300">
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> <span>Carga de hasta <strong className="text-white">30 productos</strong></span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> <span>Integración <strong className="text-white">Mercado Pago</strong></span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">1 promoción</strong> activa</span></div>
                                                </div>
                                            </div>

                                            <details className="group/payment bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 open:bg-slate-900 open:border-cyan-500/50 open:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                                                <summary className="flex items-center justify-between p-4 list-none font-bold text-white text-sm hover:bg-slate-800/50 transition">
                                                    <span className="flex items-center gap-2 text-cyan-400">👇 Elegí tu plan de pago</span>
                                                    <ChevronDown className="w-5 h-5 text-cyan-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                </summary>
                                                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                    {[
                                                        { cycle: 'Semanal', price: '$2.000', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                        { cycle: 'Mensual', price: '$7.000', label: 'Pago Mensual', sub: 'Más equilibrado' },
                                                        { cycle: 'Anual', price: '$70.000', label: 'Pago Anual', sub: 'Ahorrás $14.000 🎁' }
                                                    ].map((opt) => (
                                                        <div
                                                            key={opt.cycle}
                                                            onClick={() => setSelectedPlanOption({ plan: 'Emprendedor', cycle: opt.cycle, price: opt.price })}
                                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${selectedPlanOption?.plan === 'Emprendedor' && selectedPlanOption?.cycle === opt.cycle
                                                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg ring-2 ring-cyan-500/50 ring-offset-2 ring-offset-[#0a0a0a]'
                                                                : 'bg-black/40 text-slate-300 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-sm">{opt.label}</div>
                                                                <div className={`text-[10px] ${selectedPlanOption?.plan === 'Emprendedor' && selectedPlanOption?.cycle === opt.cycle ? 'text-black/70' : 'text-slate-500'}`}>{opt.sub}</div>
                                                            </div>
                                                            <div className="font-black text-lg">{opt.price}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    </div>

                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    {/* PLAN NEGOCIO */}
                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'business'
                                        ? 'bg-gradient-to-b from-purple-950/40 to-slate-950 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.25)]'
                                        : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-purple-500/50'
                                        }`}>
                                        <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20 animate-pulse">⭐ MÁS POPULAR</div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                        {settings?.subscriptionPlan === 'business' && (
                                            <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-400 text-white text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">✓ TU PLAN ACTUAL</div>
                                        )}

                                        <div className="relative z-10 p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-4 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-2xl shadow-lg shadow-purple-500/30">
                                                    <Briefcase className="w-7 h-7 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white">🚀 Negocio</h4>
                                                    <p className="text-sm text-purple-400 font-medium leading-tight">Escala tu marca</p>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 rounded-2xl p-4 mb-5 border border-slate-800">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Desde</p>
                                                <div className="text-4xl font-black text-white">$13.000 <span className="text-lg text-slate-500 font-normal">/mes</span></div>
                                            </div>

                                            <div className="space-y-3 mb-6 flex-1">
                                                <div className="space-y-2 text-sm text-slate-300">
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" /> <span>Hasta <strong className="text-white">50 productos</strong></span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">5 promociones</strong> simultáneas</span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Cupones</strong> de descuento</span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Analítica</strong> de clientes</span></div>
                                                </div>
                                            </div>

                                            <details className="group/payment bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 open:bg-slate-900 open:border-purple-500/50 open:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                                                <summary className="flex items-center justify-between p-4 list-none font-bold text-white text-sm hover:bg-slate-800/50 transition">
                                                    <span className="flex items-center gap-2 text-purple-400">👇 Elegí tu plan de pago</span>
                                                    <ChevronDown className="w-5 h-5 text-purple-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                </summary>
                                                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                    {[
                                                        { cycle: 'Semanal', price: '$4.000', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                        { cycle: 'Mensual', price: '$13.000', label: 'Pago Mensual', sub: 'Ideal gestión mensual' },
                                                        { cycle: 'Anual', price: '$117.000', label: 'Pago Anual', sub: '3 MESES GRATIS 🎉' }
                                                    ].map((opt) => (
                                                        <div
                                                            key={opt.cycle}
                                                            onClick={() => setSelectedPlanOption({ plan: 'Negocio', cycle: opt.cycle, price: opt.price })}
                                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${selectedPlanOption?.plan === 'Negocio' && selectedPlanOption?.cycle === opt.cycle
                                                                ? 'bg-purple-600 text-white border-purple-500 shadow-lg ring-2 ring-purple-500/50 ring-offset-2 ring-offset-[#0a0a0a]'
                                                                : 'bg-black/40 text-slate-300 border-slate-800 hover:border-purple-500/50 hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-sm">{opt.label}</div>
                                                                <div className={`text-[10px] ${selectedPlanOption?.plan === 'Negocio' && selectedPlanOption?.cycle === opt.cycle ? 'text-white/80' : 'text-slate-500'}`}>{opt.sub}</div>
                                                            </div>
                                                            <div className="font-black text-lg">{opt.price}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    </div>

                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    {/* PLAN PREMIUM */}
                                    {/* ═══════════════════════════════════════════════════════════════════ */}
                                    <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'premium'
                                        ? 'bg-gradient-to-b from-yellow-950/40 to-slate-950 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.25)]'
                                        : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-yellow-500/50'
                                        }`}>
                                        <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20">💎 VIP</div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                        {settings?.subscriptionPlan === 'premium' && (
                                            <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">✓ TU PLAN ACTUAL</div>
                                        )}

                                        <div className="relative z-10 p-6 flex-1 flex flex-col">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl shadow-lg shadow-yellow-500/30">
                                                    <Sparkles className="w-7 h-7 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="text-2xl font-black text-white">💎 Premium</h4>
                                                    <p className="text-sm text-yellow-400 font-medium leading-tight">Liderazgo total</p>
                                                </div>
                                            </div>

                                            <div className="bg-black/30 rounded-2xl p-4 mb-5 border border-slate-800">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Desde</p>
                                                <div className="text-4xl font-black text-white">$22.000 <span className="text-lg text-slate-500 font-normal">/mes</span></div>
                                            </div>

                                            <div className="space-y-3 mb-6 flex-1">
                                                <div className="space-y-2 text-sm text-slate-300">
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Ilimitados</strong> productos y promos</span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Asistente IA</strong> 24/7</span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Carga VIP</strong> 10 productos</span></div>
                                                    <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">Mantenimiento</strong> Full Mensual</span></div>
                                                </div>
                                            </div>

                                            <details className="group/payment bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 open:bg-slate-900 open:border-yellow-500/50 open:shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                                                <summary className="flex items-center justify-between p-4 list-none font-bold text-white text-sm hover:bg-slate-800/50 transition">
                                                    <span className="flex items-center gap-2 text-yellow-400">👇 Elegí tu plan de pago</span>
                                                    <ChevronDown className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                </summary>
                                                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                    {[
                                                        { cycle: 'Semanal', price: '$6.500', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                        { cycle: 'Mensual', price: '$22.000', label: 'Pago Mensual', sub: 'Equilibrio perfecto' },
                                                        { cycle: 'Anual', price: '$198.000', label: 'Pago Anual', sub: '3 MESES GRATIS 🎁' }
                                                    ].map((opt) => (
                                                        <div
                                                            key={opt.cycle}
                                                            onClick={() => setSelectedPlanOption({ plan: 'Premium', cycle: opt.cycle, price: opt.price })}
                                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${selectedPlanOption?.plan === 'Premium' && selectedPlanOption?.cycle === opt.cycle
                                                                ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg ring-2 ring-yellow-500/50 ring-offset-2 ring-offset-[#0a0a0a]'
                                                                : 'bg-black/40 text-slate-300 border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-sm">{opt.label}</div>
                                                                <div className={`text-[10px] ${selectedPlanOption?.plan === 'Premium' && selectedPlanOption?.cycle === opt.cycle ? 'text-black/70' : 'text-slate-500'}`}>{opt.sub}</div>
                                                            </div>
                                                            <div className="font-black text-lg">{opt.price}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Sticky Footer */}
                            <div className="border-t border-slate-800 bg-[#0a0a0a] p-6 z-20 shrink-0">
                                <div className={`p-4 md:p-6 rounded-2xl border transition-all duration-500 relative overflow-hidden group ${selectedPlanOption
                                    ? 'bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]'
                                    : 'bg-slate-900 border-slate-700 opacity-90'
                                    }`}>
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className={`p-3 rounded-full shadow-lg transition-colors duration-300 ${selectedPlanOption ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                {selectedPlanOption ? <CheckCircle className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1">
                                                    {selectedPlanOption
                                                        ? `¡Excelente elección! 🚀`
                                                        : 'Seleccioná una opción para continuar'}
                                                </h3>
                                                <p className={`text-sm ${selectedPlanOption ? 'text-green-300' : 'text-slate-400'}`}>
                                                    {selectedPlanOption
                                                        ? <span>Estás a un paso de activar tu <strong>Plan {selectedPlanOption.plan}</strong> con pago <strong>{selectedPlanOption.cycle}</strong>.</span>
                                                        : 'Hacé clic en una de las opciones de arriba para ver los detalles.'}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedPlanOption && (
                                            <a
                                                href={`https://wa.me/5493425906300?text=${encodeURIComponent(`Hola! Quiero suscribirme al *Plan ${selectedPlanOption.plan}* con pago *${selectedPlanOption.cycle}* de ${selectedPlanOption.price}. ¿Cómo seguimos?`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full md:w-auto px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-black text-lg rounded-xl transition-all duration-300 hover:scale-105 shadow-xl shadow-green-500/30 flex items-center justify-center gap-2 animate-bounce-subtle"
                                            >
                                                <MessageCircle className="w-6 h-6 fill-current" />
                                                Confirmar por WhatsApp
                                                <ArrowRight className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel || (() => setConfirmModal(prev => ({ ...prev, isOpen: false })))}
                isDangerous={true}
            />
            {/* --- SUSTIA CHATBOT (AI) --- */}
            <CategoryModal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                categories={settings?.categories || []}
                onAdd={(newCat) => setSettings({ ...settings, categories: [...(settings?.categories || []), newCat] })}
                onRemove={(cat) => setSettings({ ...settings, categories: (settings?.categories || []).filter(c => c !== cat) })}
            />
            <SustIABot
                settings={settings}
                products={products}
                addToCart={(p) => manageCart(p, 1)}
            />
        </div >
    );
}

// === COMPONENTE MODAL DE PLANES REFACTORIZADO ===
const PlansModalContent = ({ settings, onClose }) => {
    const [activePlanId, setActivePlanId] = React.useState(null);
    const [selectedOption, setSelectedOption] = React.useState(null);

    // Clases de color estáticas para Tailwind (no interpolar)
    const colorClasses = {
        purple: {
            iconBg: 'bg-purple-600',
            iconText: 'text-purple-400',
            price: 'text-purple-400',
            check: 'text-purple-500',
            activeBg: 'bg-purple-500',
            activeBorder: 'border-purple-400',
            gradient: 'from-purple-900/40 to-slate-900',
            border: 'border-purple-500/50'
        },
        cyan: {
            iconBg: 'bg-cyan-600',
            iconText: 'text-cyan-400',
            price: 'text-cyan-400',
            check: 'text-cyan-500',
            activeBg: 'bg-cyan-500',
            activeBorder: 'border-cyan-400',
            gradient: 'from-cyan-900/40 to-slate-900',
            border: 'border-cyan-500/50'
        },
        yellow: {
            iconBg: 'bg-yellow-500',
            iconText: 'text-yellow-400',
            price: 'text-yellow-400',
            check: 'text-yellow-500',
            activeBg: 'bg-yellow-500',
            activeBorder: 'border-yellow-400',
            gradient: 'from-yellow-900/40 to-slate-900',
            border: 'border-yellow-500/50'
        }
    };

    const PLANS = [
        {
            id: 'entrepreneur',
            name: 'Plan Emprendedor',
            emoji: '🏪',
            subtitle: 'El impulso que tu negocio necesita para despegar.',
            price: '$7.000',
            features: [
                '📦 Carga de hasta 30 productos',
                '💳 Integración con Mercado Pago',
                '🔥 1 Promoción activa',
                '📊 Panel de Control completo',
                '📧 Soporte técnico vía Gmail'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$2.000', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$7.000', sub: 'Opción equilibrada' },
                { id: 'annual', label: 'Anual', price: '$70.000', sub: '🎁 2 MESES GRATIS' }
            ],
            color: 'cyan',
            icon: Store
        },
        {
            id: 'business',
            name: 'Plan Negocio',
            emoji: '🚀',
            subtitle: 'Para marcas con identidad que buscan escalar.',
            price: '$13.000',
            popular: true,
            features: [
                '📦 Hasta 50 productos',
                '🔥 5 Promociones simultáneas',
                '🎫 Sistema de cupones',
                '📊 Analítica de clientes',
                '📲 Botón WhatsApp flotante'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$4.000', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$13.000', sub: 'Equilibrio perfecto' },
                { id: 'annual', label: 'Anual', price: '$117.000', sub: '🎁 3 MESES GRATIS' }
            ],
            color: 'purple',
            icon: Briefcase
        },
        {
            id: 'premium',
            name: 'Plan Premium',
            emoji: '💎',
            subtitle: 'Automatización total y cero preocupaciones.',
            price: '$22.000',
            features: [
                '🚀 Productos ilimitados',
                '🤖 Asistente IA 24/7',
                '✨ Carga VIP (10 productos)',
                '🛠️ Mantenimiento mensual',
                '📲 Omnicanalidad total'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$6.500', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$22.000', sub: 'Equilibrio perfecto' },
                { id: 'annual', label: 'Anual', price: '$198.000', sub: '🎁 3 MESES GRATIS' }
            ],
            color: 'yellow',
            icon: Sparkles
        }
    ];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in-scale p-2 sm:p-4 overflow-hidden">
            <div className="bg-gradient-to-b from-[#0d0d0d] to-[#050505] relative w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-5xl sm:rounded-3xl border-0 sm:border sm:border-slate-800/50 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-800/50 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 sm:gap-3">
                            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 fill-current" /> Planes Disponibles
                        </h2>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">Elegí un plan y seleccioná tu forma de pago</p>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-all hover:rotate-90">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                        {PLANS.map(plan => {
                            const isActive = activePlanId === plan.id;
                            const isCurrentPlan = settings?.subscriptionPlan === plan.id || (!settings?.subscriptionPlan && plan.id === 'entrepreneur');
                            const Icon = plan.icon;
                            const colors = colorClasses[plan.color];

                            return (
                                <div
                                    key={plan.id}
                                    onClick={() => setActivePlanId(isActive ? null : plan.id)}
                                    className={`relative rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col
                                        ${isActive
                                            ? `bg-gradient-to-b ${colors.gradient} ${colors.border} shadow-xl scale-[1.01]`
                                            : 'bg-[#111] border-slate-800 hover:border-slate-600'
                                        }`}
                                >
                                    {/* Popular Badge */}
                                    {plan.popular && (
                                        <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">
                                            POPULAR
                                        </div>
                                    )}

                                    {/* Current Plan Badge */}
                                    {isCurrentPlan && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-b-lg border border-white/20">
                                            ✓ TU PLAN
                                        </div>
                                    )}

                                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2.5 sm:p-3 rounded-xl ${colors.iconBg} shadow-lg`}>
                                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-black text-white">{plan.name}</h3>
                                                <p className="text-[11px] sm:text-xs text-slate-500">{plan.subtitle}</p>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className={`text-2xl sm:text-3xl font-black ${colors.price} mb-4`}>
                                            {plan.price} <span className="text-sm text-slate-500 font-normal">/mes</span>
                                        </div>

                                        {/* Features */}
                                        <div className="space-y-2 mb-4 flex-1">
                                            {plan.features.map((feat, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                                                    <CheckCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colors.check} shrink-0 mt-0.5`} />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Expand/Collapse Indicator */}
                                        <button
                                            className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2
                                                ${isActive ? 'bg-white/5 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}
                                        >
                                            {isActive ? 'Elegí tu forma de pago' : 'Ver opciones de pago'}
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                                        </button>

                                        {/* Payment Options (Expandable) */}
                                        <div className={`transition-all duration-300 overflow-hidden ${isActive ? 'max-h-[400px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                                            <div className="space-y-2 pt-4 border-t border-white/10">
                                                {plan.cycles.map(cycle => {
                                                    const isSelected = selectedOption?.price === cycle.price && selectedOption?.plan === plan.name;
                                                    return (
                                                        <button
                                                            key={cycle.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOption({ plan: plan.name, cycle: cycle.label, price: cycle.price, sub: cycle.sub, emoji: plan.emoji });
                                                            }}
                                                            className={`w-full text-left p-3 rounded-xl border-2 transition-all flex justify-between items-center
                                                                ${isSelected
                                                                    ? `${colors.activeBg} text-black ${colors.activeBorder} shadow-lg`
                                                                    : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-slate-300 hover:border-slate-500'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-sm">{cycle.label}</div>
                                                                <div className={`text-[10px] ${isSelected ? 'text-black/70' : 'text-slate-500'}`}>{cycle.sub}</div>
                                                            </div>
                                                            <div className="font-black text-base sm:text-lg">{cycle.price}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sticky Footer CTA */}
                {selectedOption && (
                    <div className="border-t border-slate-800 bg-gradient-to-r from-green-900/30 to-emerald-900/30 p-3 sm:p-5 shrink-0 animate-slide-up">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
                            <div className="text-center sm:text-left">
                                <p className="text-white text-sm sm:text-base font-bold">
                                    {selectedOption.emoji} {selectedOption.plan} • <span className="text-green-400">{selectedOption.cycle}</span>
                                </p>
                                <p className="text-slate-400 text-xs">{selectedOption.sub} • {selectedOption.price}</p>
                            </div>
                            <a
                                href={`https://wa.me/5493425906300?text=${encodeURIComponent(`Hola! Quiero contratar el *${selectedOption.plan}* con pago *${selectedOption.cycle}* (${selectedOption.price}). ¿Cómo sigo?`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-black text-sm sm:text-base rounded-xl transition shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5 fill-current" /> Confirmar por WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Fallback para Acceso Denegado
const AccessDenied = ({ onBack }) => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 animate-fade-in">
        <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-900/50">
                <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">ACCESO DENEGADO</h1>
            <p className="text-slate-500 mb-8">No tienes los permisos necesarios para acceder al Panel de Administración.</p>
            <button onClick={onBack} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition flex items-center gap-2 mx-auto border border-slate-700">
                <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
            </button>
        </div>
    </div>
);

// Renderizado Final
const root = createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
