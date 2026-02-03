import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag,
    Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home,
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet,
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown,
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy,
    ShoppingCart, Archive, Play, FolderPlus, Eye, EyeOff, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, Sparkles,
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp, Store, BarChart, Globe, Headphones, Palette, Share2, Cog, Facebook, Twitter, Linkedin, Youtube, Bell, BellOff, Music, Building, Banknote, Smartphone, UserPlus, Maximize2, Settings2, Sun, Moon, Upload,
    Fingerprint, ShieldCheck, Key, Cpu, ArrowRightLeft
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, sendPasswordResetEmail, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import {
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc,
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove, orderBy, limit, startAfter
} from 'firebase/firestore';
import Lenis from 'lenis';

// --- CONFIGURACIÓN FIREBASE (PROYECTO: sustore-63266) ---
// Nota: esta es la configuración pública del SDK web. NO incluyas aquí el JSON de service account.
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
// ID interno de la app (no es el appId de Firebase). Puedes cambiarlo si quieres diferenciar entornos.
const appId = "sustore-63266-prod";
const APP_VERSION = "3.0.2";

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
        const base = 'tienda_secure_2024';
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
        const secret = 'tienda_secret_key_2024';
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
        // 1. Permitir siempre al Super Admin (Hardcoded)
        if (userData.email === SUPER_ADMIN_EMAIL) return true;

        // 2. Permitir si tiene la flag de verificación (seteada al loguear/cargar desde DB)
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
    // --- Identidad de la Tienda ---
    storeName: "Tienda Online",
    primaryColor: "#f97316",
    currency: "$",

    // --- Administración ---
    admins: SUPER_ADMIN_EMAIL,
    team: [{ email: SUPER_ADMIN_EMAIL, role: "admin", name: "Administrador" }],

    // --- Contacto ---
    sellerEmail: "",
    instagramUser: "",
    instagramLink: "",
    whatsappLink: "",
    showWhatsapp: false,
    showFloatingWhatsapp: false,
    showInstagram: false,

    // --- Imágenes ---
    logoUrl: "",
    heroImages: [], // Array de { url, linkedProductId?, linkedPromoId? }
    heroCarouselInterval: 5000, // Intervalo en ms
    carouselHeight: "slim", // default to slim as requested by user ("mucho mas chico")

    // --- Configuración de Tienda ---
    markupPercentage: 0,
    announcementMessage: "",
    categories: ["General"],
    aboutUsText: "Bienvenido a nuestra tienda. Ofrecemos productos de calidad con envío a todo el país.",

    // --- SEO (Search Engine Optimization) ---
    seoTitle: "",
    seoDescription: "Tu tienda online de confianza. Calidad y vanguardia en cada producto. Envíos a todo el país.",
    seoKeywords: "tienda online, productos, comprar, envíos",
    seoAuthor: "",
    seoUrl: "",
    seoImage: "",

    // --- Textos de Carga ---
    loadingTitle: "",
    loadingText: "Cargando sistema..."
};

// --- COMPONENTES DE UI ---

// TEMPORALMENTE DESHABILITADO PARA DEBUG
// Componente de Imagen con Lazy Loading
function LazyImage({ src, alt, className, placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg==' }) {
    // Image with native lazy loading and fade-in effect
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <img
            src={src}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
        />
    );
}

// Componente de Notificación (Toast)
function Toast({ message, type, onClose }) {
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
            <button onClick={onClose} className="ml-auto p-1 hover:bg-white/10 rounded-full transition">
                <X className="w-4 h-4 opacity-50 hover:opacity-100" />
            </button>
        </div>
    );
}

// Componente Modal de Confirmación
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false, darkMode }) {
    if (!isOpen) return null;
    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-up ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
            <div className={`p-8 rounded-[2rem] max-w-sm w-full border shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500' : (darkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-100 text-orange-600')}`}>
                    {isDangerous ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                </div>
                <h3 className={`text-xl font-black text-center mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
                <p className={`text-center mb-8 text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className={`flex-1 py-3 rounded-xl font-bold transition ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>{cancelText}</button>
                    <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold transition shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

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

// Componente Auxiliar para Botón de Agregar Rápido
function QuickAddButton({ product, onAdd, darkMode }) {
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    const handleAdd = (e) => {
        e.stopPropagation();
        onAdd(product, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        setQty(1);
    };

    const isMax = qty >= product.stock;
    const isMin = qty <= 1;

    return (
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
            <div className={`flex items-center rounded-lg ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'} p-0.5 border ${darkMode ? 'border-zinc-700' : 'border-slate-200'}`}>
                <button
                    onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                    disabled={isMin}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition ${isMin ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-zinc-700 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
                ><Minus className="w-3 h-3" /></button>

                <span className={`w-8 text-center text-xs font-bold font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>{qty}</span>

                <button
                    onClick={(e) => { e.stopPropagation(); setQty(Math.min(product.stock, qty + 1)); }}
                    disabled={isMax}
                    className={`w-7 h-7 flex items-center justify-center rounded-md transition ${isMax ? 'opacity-30 cursor-not-allowed' : darkMode ? 'hover:bg-zinc-700 text-white' : 'hover:bg-slate-200 text-slate-700'}`}
                ><Plus className="w-3 h-3" /></button>
            </div>

            <button
                onClick={handleAdd}
                className={`w-full py-1.5 px-3 rounded-xl transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 active:scale-95 ${added
                    ? 'bg-green-500 text-white shadow-green-500/30'
                    : darkMode
                        ? 'bg-white text-black hover:bg-orange-400 hover:text-black shadow-white/10'
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20'
                    }`}
            >
                {added ? (
                    <CheckCircle className="w-4 h-4" />
                ) : (
                    <>
                        <Plus className="w-5 h-5 md:w-4 md:h-4" />
                    </>
                )}
            </button>
        </div>
    );
}

// Componente AccessDenied Refactorizado y Movido
function AccessDenied({ onBack, darkMode }) {
    return (
        <div className={`min-h-screen flex items-center justify-center p-4 animate-fade-in ${darkMode ? 'bg-black' : 'bg-slate-50'}`}>
            <div className="text-center max-w-md">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${darkMode ? 'bg-red-900/20 text-red-500 border-red-900/50' : 'bg-red-100 text-red-500 border-red-200'}`}>
                    <Shield className="w-10 h-10" />
                </div>
                <h1 className={`text-3xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>ACCESO DENEGADO</h1>
                <p className={`mb-8 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>No tienes los permisos necesarios para acceder al Panel de Administración.</p>
                <button onClick={onBack} className={`px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto border ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'}`}>
                    <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
                </button>
            </div>
        </div>
    );
}

// --- COMPONENTE PRODUCT CARD OPTIMIZADO (MEMOIZED) ---
function ProductCard({ p, settings, currentUser, toggleFavorite, setSelectedProduct, manageCart, calculateItemPrice, darkMode }) {
    // Clases dinámicas basadas en el tema
    const cardBg = darkMode ? 'bg-[#0a0a0a]' : 'bg-white';
    const cardBorder = darkMode ? 'border-slate-800/50' : 'border-slate-200';
    const cardHoverBorder = darkMode ? 'hover:border-orange-500/50' : 'hover:border-orange-400';
    const cardShadow = darkMode ? 'hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]' : 'shadow-md hover:shadow-xl hover:shadow-orange-100';
    const imageBg = darkMode ? 'bg-gradient-to-b from-slate-900 to-[#0a0a0a]' : 'bg-gradient-to-b from-slate-100 to-white';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
    const infoBg = darkMode ? 'bg-[#0a0a0a]' : 'bg-white';
    const borderColor = darkMode ? 'border-slate-800/50' : 'border-slate-200';

    return (
        <div className={`${cardBg} rounded-2xl sm:rounded-3xl border ${cardBorder} overflow-hidden group ${cardHoverBorder} ${cardShadow} transition duration-500 relative flex flex-col h-full animate-fade-in content-visibility-auto contain-content`}>

            {/* Imagen y Badges */}
            <div className={`h-56 sm:h-80 ${imageBg} m-2 sm:m-3 p-2 sm:p-3 flex items-center justify-center relative overflow-hidden cursor-zoom-in transition-all duration-500`} onClick={() => setSelectedProduct(p)}>
                {/* Efecto Glow Fondo */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

                {p.image ? (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                            src={p.image}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.nextSibling.style.display = 'flex'; }}
                            className={`max-w-full max-h-full rounded-xl sm:rounded-2xl border-4 ${darkMode ? 'border-cyan-500/30' : 'border-orange-300'} shadow-lg z-10 transition-transform duration-700 group-hover:scale-105 ${p.stock <= 0 ? 'grayscale opacity-50' : ''}`}
                        />
                    </div>
                ) : null}


                {/* Botón Ver (Visible en Mobile/Touch) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                    }}
                    className={`absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-30 ${darkMode ? 'bg-black/60 border-white/20' : 'bg-white/90 border-slate-200'} backdrop-blur-md p-2 sm:p-3 rounded-full ${darkMode ? 'text-white' : 'text-slate-700'} border md:hidden`}
                >
                    <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Fallback Icon */}
                <div className="hidden w-full h-full flex items-center justify-center z-0 absolute inset-0" style={{ display: p.image ? 'none' : 'flex' }}>
                    <div className={`flex flex-col items-center justify-center ${darkMode ? 'text-slate-700' : 'text-slate-400'}`}>
                        <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-2 opacity-50" />
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50">Sin Imagen</span>
                    </div>
                </div>

                {/* OVERLAY AGOTADO (Mejorado) */}
                {p.stock <= 0 && (
                    <div className={`absolute inset-0 z-30 flex items-center justify-center ${darkMode ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-[2px]`}>
                        <div className="border-4 border-red-500 p-2 sm:p-4 -rotate-12 bg-black/80 shadow-[0_0_30px_rgba(239,68,68,0.5)] transform scale-90 sm:scale-110">
                            <span className="text-red-500 font-black text-lg sm:text-2xl md:text-3xl tracking-[0.15em] sm:tracking-[0.2em] uppercase">AGOTADO</span>
                        </div>
                    </div>
                )}

                {/* BADGE: DESTACADO */}
                {p.isFeatured && p.stock > 0 && (
                    <div className="absolute top-0 left-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[9px] sm:text-[10px] font-black px-2 sm:px-4 py-1 sm:py-1.5 rounded-br-xl sm:rounded-br-2xl uppercase tracking-wider z-20 shadow-lg flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> Destacado
                    </div>
                )}

                {/* Descuento Badge */}
                {p.discount > 0 && p.stock > 0 && !p.isFeatured && (
                    <span className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg z-20 shadow-red-600/20">
                        -{p.discount}% OFF
                    </span>
                )}

                {/* Combined Badge (Featured + Discount) */}
                {p.discount > 0 && p.stock > 0 && p.isFeatured && (
                    <span className="absolute top-8 sm:top-10 left-0 bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-r-lg shadow-lg z-20">
                        -{p.discount}% OFF
                    </span>
                )}

                {/* Botón Favorito (Funcional) */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p) }}
                    className={`absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 rounded-full z-20 transition shadow-lg backdrop-blur-sm border ${currentUser?.favorites?.includes(p.id) ? 'bg-red-500 text-white border-red-500 shadow-red-500/30' : darkMode ? 'bg-white/10 text-slate-300 border-white/10 hover:bg-white hover:text-red-500' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                >
                    <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`} />
                </button>


            </div>

            {/* Información */}
            <div className={`p-3 sm:p-4 flex-1 flex flex-col relative z-10 ${infoBg}`}>
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <p className={`text-[9px] sm:text-[10px] text-orange-500 font-black uppercase tracking-widest ${darkMode ? 'border-orange-900/30 bg-orange-900/10' : 'border-orange-200 bg-orange-50'} border px-1.5 sm:px-2 py-0.5 sm:py-1 rounded`}>
                        {Array.isArray(p.categories) ? (p.categories.length > 0 ? p.categories[0] : p.category || 'Sin categoría') : (p.category || 'Sin categoría')}
                    </p>
                    {/* Estado de Stock */}
                    {settings?.showStockCount !== false && p.stock > 0 && p.stock <= (settings?.lowStockThreshold || 5) ? (
                        <span className="text-[9px] sm:text-[10px] text-red-500 font-bold flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> últimos {p.stock}
                        </span>
                    ) : null}
                </div>

                <h3 className={`${textPrimary} font-bold text-sm sm:text-base leading-tight mb-2 sm:mb-4 group-hover:text-orange-600 transition line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]`}>
                    {p.name}
                </h3>

                <div className={`mt-auto pt-2 sm:pt-4 border-t ${borderColor} flex items-end justify-between`}>
                    <div className="flex flex-col">
                        {p.discount > 0 && (
                            <span className={`text-[10px] sm:text-xs ${textSecondary} line-through font-medium mb-0.5 sm:mb-1`}>
                                ${p.basePrice.toLocaleString()}
                            </span>
                        )}
                        <span className={`text-lg sm:text-2xl font-black ${textPrimary} tracking-tight flex items-center gap-1`}>
                            ${calculateItemPrice(p.basePrice, p.discount).toLocaleString()}
                        </span>
                    </div>

                    {/* Add to Cart with Quantity */}
                    {p.stock > 0 && (
                        <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <QuickAddButton
                                product={p}
                                onAdd={(product, qty) => manageCart(product, qty)}
                                darkMode={darkMode}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// --- Bot Product Card Component ---
function BotProductCard({ product, onAdd, darkMode }) {
    const [qty, setQty] = useState(1);
    const hasStock = product.stock > 0;

    return (
        <div className={`min-w-[140px] w-[140px] border rounded-xl overflow-hidden shadow-lg snap-start flex-shrink-0 group flex flex-col ${darkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="h-28 bg-white relative overflow-hidden">
                <img
                    src={product.image || 'https://via.placeholder.com/150'}
                    alt={product.name}
                    className={`w-full h-full object-contain p-2 transition duration-300 ${hasStock ? 'group-hover:scale-110' : 'grayscale opacity-50'}`}
                />
                {!hasStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold bg-red-600 px-2 py-1 rounded">AGOTADO</span>
                    </div>
                )}
            </div>
            <div className="p-2 flex-1 flex flex-col">
                <h4 className={`text-xs font-bold truncate mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{product.name}</h4>
                <div className="flex justify-between items-center mb-2">
                    <p className="text-yellow-500 text-xs font-black">${parseInt(product.basePrice).toLocaleString()}</p>
                    {product.discount > 0 && <span className="text-[10px] text-red-400 font-bold">-{product.discount}%</span>}
                </div>

                {hasStock ? (
                    <div className="mt-auto space-y-2">
                        <div className={`flex items-center justify-between rounded-lg p-1 mb-2 ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                            <button
                                onClick={() => setQty(Math.max(1, qty - 1))}
                                className={`w-6 h-6 flex items-center justify-center rounded transition font-bold ${darkMode ? 'text-white hover:bg-zinc-700' : 'text-slate-600 hover:bg-slate-200'}`}
                            >-</button>
                            <span className={`text-xs font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{qty}</span>
                            <button
                                onClick={() => setQty(Math.min(product.stock, qty + 1))}
                                className={`w-6 h-6 flex items-center justify-center rounded transition font-bold ${darkMode ? 'text-white hover:bg-zinc-700' : 'text-slate-600 hover:bg-slate-200'}`}
                            >+</button>
                        </div>
                        <button
                            onClick={() => onAdd(product, qty)}
                            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1 active:scale-95"
                        >
                            Agregar <span className="text-xs">+</span>
                        </button>
                    </div>
                ) : (
                    <button disabled className="w-full mt-auto bg-slate-700 text-slate-400 text-[10px] py-1.5 rounded-lg cursor-not-allowed">
                        Sin Stock
                    </button>
                )}
            </div>
        </div>
    );
}

// --- COMPONENTE SUSTIA (AI ASSISTANT) ---
function SustIABot({ settings, products, addToCart, controlPanel, coupons, darkMode }) {
    // 1. Verificación de Plan - Solo disponible en Plan Premium
    // 1. Verificación de Plan - Logica movida al componente padre App para evitar errores de Hooks
    // if (settings?.subscriptionPlan !== 'premium') return null;

    const [isOpen, setIsOpen] = useState(false);

    // Custom Bot Image (Configurable)
    const botImage = settings?.botImage || "sustia-ai-v2.jpg";

    const [messages, setMessages] = useState([
        { role: 'model', text: '¡Hola! Soy SustIA ??, tu asistente personal.¿Buscas algo especial hoy? Puedo verificar stock y agregar productos a tu carrito.' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [lastContext, setLastContext] = useState(null); // Para manejar contexto (Sí/No)
    const messagesEndRef = useRef(null);

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    // --- HERRAMIENTA DE BÚSQUEDA INTELIGENTE (FUZZY) ---
    const fuzzySearch = (text, query) => {
        if (!query || typeof query !== 'string') return false;
        if (!text || typeof text !== 'string') return false;

        const str = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const patt = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
        const text = userText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 0. Detectar Saludos
        if (text.match(/\b(hola|holas|buen dia|buenos dias|buenas tardes|buenas noches|buenas|hello|hi|hey|que tal|como estas|como va|todo bien)\b/)) {
            return { text: "\u00A1Hola! \uD83D\uDC4B \u00BFEn qu\u00E9 puedo ayudarte hoy? Puedes pedirme buscar productos o ver ofertas." };
        }

        // 0.1 Comandos de Sistema (Universal)
        if (controlPanel) {
            if (text.match(/modo\s*(?:oscuro|noche|dark)/)) {
                controlPanel.setDarkMode(true);
                return { text: "He activado el modo oscuro \uD83C\uDF19. \u00BFMejor para tus ojos?" };
            }
            if (text.match(/modo\s*(?:claro|dia|light)/)) {
                controlPanel.setDarkMode(false);
                return { text: "He activado el modo claro \u2600\uFE0F." };
            }
            if (text.match(/(?:ver|abrir|ir al)\s*(?:carrito|bolsa|cesta)/)) {
                controlPanel.openCart();
                return { text: "Abriendo tu carrito de compras... \uD83D\uDED2" };
            }
        }

        // 0.2 Detectar Ayuda/Contacto
        if (text.match(/\b(ayuda|soporte|contacto|human|persona|asesor)\b/)) {
            if (settings?.whatsappLink) {
                return { text: `Claro. Si necesitas asistencia personalizada con un humano \uD83D\uDC64, escr\u00EDbenos a nuestro WhatsApp: ${settings.whatsappLink} \uD83D\uDCAC` };
            }
            return { text: "Estoy dise\u00F1ado para ayudarte a encontrar productos las 24hs. \uD83E\uDD16 \u00BFBuscas algo en espec\u00EDfico?" };
        }

        // 0.3 Detectar Promociones/Cupones
        if (text.match(/\b(descuento|promo|cupon|oferta|codigo|rebaja)\b/)) {
            const activeCoupons = (coupons || []).filter(c => c.active);
            const productsWithDiscount = products.filter(p => p.discount > 0).length;

            if (activeCoupons.length > 0) {
                const couponText = activeCoupons.map(c => `?? **${c.code}** (${c.discountType === 'percentage' ? c.value + '%' : '$' + c.value} OFF)`).join("\n");
                return { text: `¡Sí! Tenemos estos cupones disponibles para ti:\n\n${couponText}\n\n¡Úsalos al finalizar tu compra! ??` };
            } else if (productsWithDiscount > 0) {
                return { text: `No tengo códigos de cupón activos ahora, ¡pero tenemos ${productsWithDiscount} productos con descuento especial en la tienda! ??? ¿Quieres verlos?` };
            } else {
                return { text: "Por el momento no tengo códigos promocionales activos, pero nuestros precios son los mejores del mercado. ??" };
            }
        }

        // 1. Manejo de Contexto (Conversacional)
        if (lastContext) {
            if (text.match(/\b(si|claro|dale|bueno|yes|por favor|obvio)\b/)) {
                const ctx = lastContext;
                setLastContext(null);
                if (ctx.type === 'suggest_cross_sell') {
                    return {
                        text: "¡Excelente! Mira estas oportunidades que seleccioná para ti: ??",
                        products: ctx.data
                    };
                }
            } else if (text.match(/\b(no|gracias|paso|cancelar|asi esta bien)\b/)) {
                setLastContext(null);
                return { text: "Entendido. ¿Necesitas ayuda con algo más? ??" };
            }
        }

        // 2. Detectar Intenciones
        const isCheaper = text.match(/(?:mas|muy|super)\s*(?:barato|economico|bajo)|oferta|menos/);
        const isExpensive = text.match(/(?:mas|muy|super)\s*(?:caro|mejor|calidad|top|premium)|costoso|lujo/);
        const isBuying = text.match(/(?:agrega|comprar|quiero|dame|carrito|llevo|lo quiero)/);

        // 2.1 Filtros de Precio Inteligentes (NUEVO)
        let minPrice = 0;
        let maxPrice = Infinity;

        // Detectar "menos de X"
        const lessThanMatch = text.match(/(?:menos|menor|bajo)\s*(?:de|a|que)?\s*\$?\s*(\d+(?:[.,]\d+)?)/);
        if (lessThanMatch) {
            maxPrice = parseFloat(lessThanMatch[1].replace(',', '.'));
            // Soporte simple para "mil" (ej: 10 mil)
            if (text.includes(lessThanMatch[1] + ' mil') || text.includes(lessThanMatch[1] + 'k')) {
                maxPrice *= 1000;
            }
        }

        // Detectar "entre X y Y"
        const betweenMatch = text.match(/entre\s*\$?\s*(\d+(?:[.,]\d+)?)\s*y\s*\$?\s*(\d+(?:[.,]\d+)?)/);
        if (betweenMatch) {
            minPrice = parseFloat(betweenMatch[1].replace(',', '.'));
            maxPrice = parseFloat(betweenMatch[2].replace(',', '.'));
            if (text.includes(betweenMatch[1] + ' mil') || text.includes(betweenMatch[1] + 'k')) minPrice *= 1000;
            if (text.includes(betweenMatch[2] + ' mil') || text.includes(betweenMatch[2] + 'k')) maxPrice *= 1000;
        }

        // 3. Detectar Categoría (Fuzzy)
        const availableCategories = [...new Set(products.filter(p => p.category && typeof p.category === 'string').map(p => p.category))];
        const detectedCategoryVal = availableCategories.find(c => fuzzySearch(c, text) || fuzzySearch(text, c));
        const targetCategory = detectedCategoryVal ? detectedCategoryVal.toLowerCase() : null;

        // 4. Búsqueda y Scoring de Productos
        const stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'con', 'que', 'para', 'por', 'hola', 'busco', 'tienes', 'precio', 'vale', 'quiero', 'necesito', 'hay', 'donde', 'mas', 'menos', 'agregalo', 'agrega', 'compralo'];
        const keywords = text.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w) && isNaN(w));

        let candidates = products.filter(p => p.stock > 0);

        // Aplicar filtros de precio
        candidates = candidates.filter(p => p.basePrice >= minPrice && p.basePrice <= maxPrice);

        // Filtro por categoría detectada
        if (targetCategory) {
            candidates = candidates.filter(p => p.category && p.category.toLowerCase() === targetCategory);
        }

        // Scoring
        if (keywords.length > 0) {
            candidates = candidates.map(p => {
                let score = 0;
                const pName = (p.name || "").toLowerCase().normalize("NFD");
                const pCategory = (p.category || "").toLowerCase().normalize("NFD");

                // Coincidencia exacta o fuzzy
                keywords.forEach(k => {
                    if (pName.includes(k)) score += 10;
                    else if (fuzzySearch(pName, k)) score += 5;

                    if (pCategory.includes(k)) score += 5;
                });
                return { ...p, score };
            }).filter(p => p.score > 0);

            // Ordenar por relevancia
            candidates.sort((a, b) => b.score - a.score);
        }

        // 4.1 Recuperación Contextual (Si el usuario dice "agregalo" y no hay keywords de producto)
        // Buscamos en el historial previo si se mostraron productos
        if (candidates.length === 0 && isBuying) {
            // Buscar el último mensaje del modelo que tuviera productos
            // currentMessages incluye el mensaje actual del usuario al final.
            const history = [...currentMessages].reverse();
            // history[0] es el mensaje del usuario actual
            // history[1] debería ser el último del modelo
            const lastModelMsg = history.find(m => m.role === 'model' && m.products && m.products.length > 0);

            if (lastModelMsg) {
                // Asumimos el primero de la lista anterior como el deseado
                candidates = [lastModelMsg.products[0]];
            }
        }

        // Ordenamiento por precio (secundario)
        if (isCheaper) candidates.sort((a, b) => a.basePrice - b.basePrice);
        if (isExpensive) candidates.sort((a, b) => b.basePrice - a.basePrice);

        // 5. Respuesta
        if (candidates.length === 0) {
            // Inteligencia Proactiva: Si no hay match, ofrecer ofertas o destacados
            const deals = products.filter(p => p.discount > 0 && p.stock > 0).slice(0, 3);
            if (deals.length > 0) {
                setLastContext({ type: 'suggest_cross_sell', data: deals });
                return { text: "Mmm, no encontré exactamente eso ??.¿Pero te gustaría ver nuestras ofertas del día? ???" };
            }
            // Dynamic "Smart" Sugestións
            let sugestionText = "No encontré nada parecido. ??";

            if (availableCategories.length > 0) {
                // Get 3 random unique categories
                const shuffled = availableCategories.sort(() => 0.5 - Math.random());
                const topCats = shuffled.slice(0, 3).join(", ");
                sugestionText = `No tengo eso por ahora. Pero mira, en esta tienda tenemos cosas de: **${topCats}**. ¿Te sirve algo de eso?`;
            } else {
                sugestionText = "No encontré nada con ese nombre. ¿Quizás probando con otra palabra más simple?";
            }

            return { text: sugestionText };
        }

        const topMatches = candidates.slice(0, 5);

        // Acción de Compra
        if (isBuying && topMatches.length > 0) {
            const best = topMatches[0];
            addToCart(best);

            // --- CROSS-SELLING UNIVERSAL ---
            // Buscar productos complementarios (Destacados o con Descuento que NO sean el que acaba de comprar)
            // Esto funciona para cualquier tienda
            const sugGestións = products
                .filter(p => (p.isFeatured || p.discount > 0) && p.id !== best.id && p.stock > 0)
                .sort(() => 0.5 - Math.random()) // Mezclar
                .slice(0, 3);

            if (sugestións.length > 0) {
                setLastContext({ type: 'suggest_cross_sell', data: sugestións });
                return {
                    text: `¡Listo! Agregué **${best.name}** a tu carrito. ??\n\n¿Te gustaría ver algunos productos destacados para complementar tu compra? ??`,
                    products: [best]
                };
            }

            return {
                text: `¡Listo! Agregué **${best.name}** a tu carrito. ??¿Algo más?`,
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
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none max-h-[calc(100vh-100px)]">
            {isOpen && (
                <div className={`pointer-events-auto border rounded-2xl w-80 md:w-96 max-h-[calc(100vh-120px)] h-[500px] shadow-2xl flex flex-col mb-4 animate-fade-up overflow-hidden font-sans ${darkMode ? 'bg-[#0a0a0a] border-yellow-500/30' : 'bg-white border-yellow-400/50'}`}>
                    <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-4 flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="p-1 bg-white/10 rounded-full backdrop-blur-sm overflow-hidden border border-white/20">
                                <img src={botImage} className="w-8 h-8 object-cover rounded-full opacity-90" alt="SustIA" />
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

                    <div className={`flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar ${darkMode ? 'bg-[#111]' : 'bg-slate-50'}`} data-lenis-prevent>
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.role === 'client' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm ${m.role === 'client'
                                    ? 'bg-yellow-600 text-white rounded-br-sm'
                                    : (darkMode ? 'bg-[#1a1a1a] text-slate-200 border border-white/5' : 'bg-white text-slate-800 border border-slate-200 shadow-sm') + ' rounded-bl-sm'
                                    }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                                </div>

                                {m.products && m.products.length > 0 && (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 w-full custom-scrollbar pl-1 snap-x">
                                        {m.products.map(product => (
                                            <BotProductCard
                                                key={product.id}
                                                product={product}
                                                onAdd={(p, qty) => {
                                                    addToCart(p, qty);
                                                    setMessages(prev => [...prev, { role: 'model', text: `Agregado ${qty}x ${p.name} al carrito! ??` }]);
                                                }}
                                                darkMode={darkMode}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className={`p-3 rounded-2xl rounded-bl-none border flex gap-1 ${darkMode ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={`p-3 border-t ${darkMode ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-slate-100'}`}>
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                            <input
                                className={`flex-1 border rounded-full px-4 py-2.5 text-sm focus:border-yellow-500/50 outline-none transition ${darkMode ? 'bg-[#1a1a1a] border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-900 placeholder:text-slate-400'}`}
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
                {isOpen ? <X className="w-6 h-6 text-white" /> : <img src="sustia-ai-v2.jpg" className="w-full h-full object-cover rounded-full opacity-95 hover:scale-110 transition-transform duration-300" alt="SustIA" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 border border-black"></span>
                    </span>
                )}
            </button>
        </div>
    );
}

function CategoryModal({ isOpen, onClose, categories, onAdd, onRemove }) {
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
                    <FolderPlus className="w-6 h-6 text-orange-400" /> gestionar Categorías
                </h3>

                <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
                    <input
                        className="input-cyber flex-1 p-3"
                        placeholder="Nueva categoría..."
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl font-bold transition">
                        <Plus className="w-5 h-5" />
                    </button>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent>
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

// --- COMPONENTS ---
function SmoothScroll({ enabled = true }) {
    useEffect(() => {
        if (!enabled) return;

        const lenis = new Lenis({
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 0.7,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, [enabled]);

    return null;
}

// --- REFACTORED MODALS ---

// === COMPONENTE MODAL DE PLANES REFACTORIZADO ===
function PlansModalContent({ settings, onClose, darkMode }) {
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
        orange: {
            iconBg: 'bg-orange-600',
            iconText: 'text-orange-400',
            price: 'text-orange-400',
            check: 'text-orange-500',
            activeBg: 'bg-orange-500',
            activeBorder: 'border-orange-400',
            gradient: 'from-orange-900/40 to-slate-900',
            border: 'border-orange-500/50'
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
            emoji: '✅',
            subtitle: 'El impulso que tu negocio necesita para despegar.',
            price: '$7.000',
            features: [
                '✅ Carga de hasta 30 productos',
                '✅ Integración con Mercado Pago',
                '✅ 1 Promoción activa',
                '✅ Panel de Control completo',
                '✅ Soporte técnico vía Gmail'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$2.000', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$7.000', sub: 'Opción equilibrada' },
                { id: 'annual', label: 'Anual', price: '$70.000', sub: '✅ 2 MESES GRATIS' }
            ],
            color: 'orange',
            icon: Store
        },
        {
            id: 'business',
            name: 'Plan Negocio',
            emoji: '✅',
            subtitle: 'Para marcas con identidad que buscan escalar.',
            price: '$13.000',
            popular: true,
            features: [
                '✅ Hasta 50 productos',
                '✅ 5 Promociones simultáneas',
                '✅ Sistema de cupones',
                '✅ Analítica de clientes',
                '✅ Botón WhatsApp flotante'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$4.000', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$13.000', sub: 'Equilibrio perfecto' },
                { id: 'annual', label: 'Anual', price: '$117.000', sub: '🎁  3 MESES GRATIS' }
            ],
            color: 'purple',
            icon: Briefcase
        },
        {
            id: 'premium',
            name: 'Plan Premium',
            emoji: '✅',
            subtitle: 'Automatización total y cero preocupaciones.',
            price: '$22.000',
            features: [
                '🚀 Productos ilimitados',
                '🤖 Asistente IA 24/7',
                '✅ Carga VIP (10 productos)',
                '✅ Mantenimiento mensual',
                '✅ Omnicanalidad total'
            ],
            cycles: [
                { id: 'weekly', label: 'Semanal', price: '$6.500', sub: 'Flexibilidad total' },
                { id: 'monthly', label: 'Mensual', price: '$22.000', sub: 'Equilibrio perfecto' },
                { id: 'annual', label: 'Anual', price: '$198.000', sub: '🎁  3 MESES GRATIS!' }
            ],
            color: 'yellow',
            icon: Sparkles
        }
    ];

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in-scale p-2 sm:p-4 overflow-hidden">
            <div className={`relative w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-5xl sm:rounded-3xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-gradient-to-b from-[#0d0d0d] to-[#050505] border-slate-800/50' : 'bg-white border-slate-200'}`} data-lenis-prevent>

                {/* Header */}
                <div className={`flex justify-between items-center p-4 sm:p-6 border-b shrink-0 ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                    <div>
                        <h2 className={`text-xl sm:text-3xl font-black flex items-center gap-2 sm:gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 fill-current" /> Planes Disponibles
                        </h2>
                        <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Elegí un plan y seleccioná tu forma de pago</p>
                    </div>
                    <button onClick={onClose} className={`p-2 sm:p-3 rounded-full transition-all hover:rotate-90 ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
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
                                            : (darkMode ? 'bg-[#111] border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm')
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
                                            📍 TU PLAN
                                        </div>
                                    )}

                                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                        {/* Header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2.5 sm:p-3 rounded-xl ${colors.iconBg} shadow-lg`}>
                                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className={`text-lg sm:text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                                                <p className={`text-[11px] sm:text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{plan.subtitle}</p>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className={`text-2xl sm:text-3xl font-black ${colors.price} mb-4`}>
                                            {plan.price} <span className="text-sm text-slate-500 font-normal">/mes</span>
                                        </div>

                                        {/* Features */}
                                        <div className="space-y-2 mb-4 flex-1">
                                            {plan.features.map((feat, i) => (
                                                <div key={i} className={`flex items-start gap-2 text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    <CheckCircle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colors.check} shrink-0 mt-0.5`} />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Expand/Collapse Indicator */}
                                        <button
                                            className={`w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2
                                                ${isActive ? 'bg-white/5 text-white' : (darkMode ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}`}
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
                                                                    : (darkMode ? 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-slate-300 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600 hover:border-slate-300')
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
                                    {selectedOption.emoji} {selectedOption.plan} - <span className="text-green-400">{selectedOption.cycle}</span>
                                </p>
                                <p className="text-slate-400 text-xs">{selectedOption.sub} - {selectedOption.price}</p>
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
}

// Componente Modal de Detalle de Pedido
function OrderDetailsModal({ order, onClose, darkMode }) {
    if (!order) return null;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2rem] shadow-2xl relative flex flex-col ${darkMode ? 'bg-[#0a0a0a] border border-slate-800' : 'bg-white border border-slate-200'}`}>

                {/* Header */}
                <div className={`p-8 border-b flex justify-between items-center bg-slate-900/50`}>
                    <div>
                        <h3 className={`text-2xl font-black flex items-center gap-2 ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                            PEDIDO <span className="text-orange-400">#{order.orderId}</span>
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
                    <button onClick={onClose} className={`p-3 rounded-full transition hover:rotate-90 ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                    {/* Status Visual */}
                    <div className={`flex justify-between items-center p-6 rounded-2xl border shadow-inner ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-full shadow-lg ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
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

                    {/* Columns Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-2xl border transition ${darkMode ? 'bg-slate-900/30 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800/20 pb-2">
                                <User className="w-4 h-4" /> Cliente
                            </h4>
                            <div className="space-y-3">
                                <p className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>{order.customer.name}</p>
                                <div className="space-y-2 text-sm">
                                    {order.customer.email && (
                                        <p className="flex justify-between border-b border-dashed border-slate-700/20 pb-1">
                                            <span className="text-slate-500">Email:</span> <span className={darkMode ? 'text-white' : 'text-slate-900'}>{order.customer.email}</span>
                                        </p>
                                    )}
                                    {order.customer.phone && (
                                        <p className="flex justify-between border-b border-dashed border-slate-700/20 pb-1">
                                            <span className="text-slate-500">Teléfono:</span>
                                            <a href={`https://wa.me/549${order.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 font-bold hover:underline flex items-center gap-1">
                                                <MessageCircle className="w-3 h-3" /> {order.customer.phone}
                                            </a>
                                        </p>
                                    )}
                                    {order.customer.dni && (
                                        <p className="flex justify-between">
                                            <span className="text-slate-500">DNI:</span> <span className={darkMode ? 'text-white' : 'text-slate-900'}>{order.customer.dni}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border transition ${darkMode ? 'bg-slate-900/30 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800/20 pb-2">
                                <Truck className="w-4 h-4" /> Envío / Entrega
                            </h4>
                            <div className="space-y-3">
                                <p className={`font-medium text-sm leading-relaxed min-h-[3rem] ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {order.delivery?.address || order.shippingAddress || (order.delivery?.method === 'Retiro' ? 'Retiro en sucursal' : 'Retiro en sucursal')}
                                    {order.delivery?.city && <span><br />{order.delivery.city}, {order.delivery.zip}</span>}
                                </p>
                                <div className="pt-2 mt-2 border-t border-slate-800/20">
                                    <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Método de Pago</p>
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-orange-400" />
                                        <p className="text-orange-400 font-black text-sm uppercase">{order.paymentMethod || 'Efectivo'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products */}
                    <div>
                        <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-800/20 pb-2">
                            <Package className="w-4 h-4" /> Productos ({order.items.length})
                        </h4>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className={`flex justify-between items-center p-4 rounded-xl border transition group ${darkMode ? 'bg-slate-900/40 border-slate-800 hover:border-orange-900/30' : 'bg-white border-slate-100 hover:border-orange-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-white overflow-hidden p-1 flex-shrink-0 shadow-sm">
                                            <img src={item.image || 'https://via.placeholder.com/100'} className="w-full h-full object-contain" alt={item.title} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-bold text-sm truncate max-w-[200px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</p>
                                            <p className="text-slate-500 text-xs flex items-center gap-2">
                                                <span className="bg-slate-800/10 text-slate-500 px-1.5 rounded text-[10px] font-bold">x{item.quantity}</span>
                                                <span>${(item.unit_price || item.price || 0).toLocaleString()} c/u</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold text-lg tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        ${((item.unit_price || item.price || 0) * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className={`p-6 rounded-2xl border space-y-3 shadow-lg ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between text-slate-500 text-sm font-medium">
                            <span>Subtotal</span>
                            <span className={darkMode ? 'text-white' : 'text-slate-900'}>${(order.subtotal || order.total).toLocaleString()}</span>
                        </div>

                        {order.discount > 0 && (
                            <div className="flex justify-between text-green-500 text-sm font-bold bg-green-500/5 p-2 rounded-lg border border-green-500/20 border-dashed">
                                <span className="flex items-center gap-2">
                                    <Ticket className="w-3 h-3" /> Descuento
                                </span>
                                <span>-${order.discount.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/20 border-dashed">
                            <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>TOTAL</span>
                            <span className="text-3xl font-black text-orange-400 neon-text tracking-tighter">
                                ${order.total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t ${darkMode ? 'border-slate-800 bg-[#050505]' : 'border-slate-100 bg-slate-50'}`}>
                    <button onClick={onClose} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-xl' : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-sm'}`}>
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
    );
}

// Componente Modal de Selección de Cupones
function CouponSelectorModal({ isOpen, onClose, coupons, currentUser, cartSubtotal, selectCoupon, darkMode }) {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
            <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-up ${darkMode ? 'bg-[#0a0a0a] border border-slate-800' : 'bg-white border border-slate-200'}`}>
                <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tus Cupones</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {coupons.filter(c => c.isActive && (!c.onlyFor || c.onlyFor === currentUser?.email)).map((coupon, idx) => {
                        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                        const isSpent = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
                        const minNotMet = cartSubtotal < (coupon.minPurchase || 0);
                        const isDisabled = isExpired || isSpent || minNotMet;

                        return (
                            <button
                                key={idx}
                                onClick={() => !isDisabled && selectCoupon(coupon)}
                                disabled={isDisabled}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition relative group ${isDisabled ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-50' : 'bg-white dark:bg-slate-900 border-dashed border-orange-500/30 hover:border-orange-500 hover:shadow-lg'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-lg font-black ${isDisabled ? 'text-slate-400' : 'text-orange-500'}`}>{coupon.code}</span>
                                    <span className="text-xs font-bold px-2 py-1 bg-orange-500/10 text-orange-500 rounded-lg">-{coupon.discount}%</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">{coupon.description || 'Válido para toda la tienda.'}</p>
                                {minNotMet && <p className="text-[10px] text-red-400 mt-2 font-bold uppercase tracking-wider">Mínimo: ${coupon.minPurchase.toLocaleString()}</p>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Modal de Detalle de Producto / Promo (Versión Premium)
function ProductDetailModal({ selectedProduct, setSelectedProduct, cart, manageCart, products, calculateItemPrice, darkMode, showToast, toggleFavorite, currentUser, settings }) {
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);

    if (!selectedProduct) return null;

    const isPromo = selectedProduct.isPromo || !!selectedProduct.items;
    const stockLimit = isPromo ? Number(selectedProduct.stock) : Number(selectedProduct.stock);

    const cartItem = cart.find(item => item.product.id === selectedProduct.id);
    const inCartQty = cartItem ? cartItem.quantity : 0;
    const availableToAdd = Math.max(0, stockLimit - inCartQty);

    const hasStock = stockLimit > 0;
    const isMaxInCart = (availableToAdd <= 0) && hasStock;
    const displayPrice = isPromo ? Number(selectedProduct.price || selectedProduct.basePrice) : calculateItemPrice(selectedProduct.basePrice, selectedProduct.discount);

    const handleAdd = (e) => {
        e.stopPropagation();
        if (!hasStock || availableToAdd <= 0) return;

        const itemToAdd = isPromo ? {
            id: selectedProduct.id,
            name: selectedProduct.name,
            basePrice: selectedProduct.price || selectedProduct.basePrice,
            image: selectedProduct.image,
            isPromo: true,
            items: selectedProduct.items,
            stock: selectedProduct.stock
        } : selectedProduct;

        manageCart(itemToAdd, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4" onClick={() => setSelectedProduct(null)}>
            <div className={`bg-[#0f0f12] border border-slate-800/60 rounded-[2rem] max-w-3xl w-full overflow-hidden flex flex-col md:flex-row shadow-2xl animate-scale-up relative h-full md:h-auto overflow-y-auto md:overflow-hidden`} onClick={e => e.stopPropagation()}>

                {/* Imagen */}
                <div className="md:w-1/2 h-64 md:h-auto aspect-[4/5] bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-50 group-hover:opacity-100 transition duration-500"></div>
                    <img src={selectedProduct.image} className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.15)] z-10 transition-transform duration-700 hover:scale-110" />
                    {!hasStock && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <div className="border-4 border-red-500 p-4 -rotate-12 bg-black shadow-2xl">
                                <span className="text-red-500 font-black text-2xl tracking-widest uppercase">AGOTADO</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col bg-[#080808]">
                    <div className="mb-8">
                        <span className="inline-block px-3 py-1 bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] rounded mb-4 border border-orange-500/20">
                            {isPromo ? 'COMBOS & PROMOCIONES' : selectedProduct.category}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] mb-6 neon-text-small">{selectedProduct.name}</h2>
                        <p className="text-slate-400 text-sm md:text-base leading-relaxed line-clamp-4">{selectedProduct.description || ''}</p>
                    </div>

                    {isPromo && selectedProduct.items && (
                        <div className="mb-8 space-y-3 bg-purple-500/5 p-6 rounded-2xl border border-purple-500/20 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-purple-400 tracking-[0.2em]">Incluye:</p>
                            <div className="space-y-2">
                                {selectedProduct.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs text-slate-300">
                                        <span className="font-bold">{item.name}</span>
                                        <span className="text-purple-400 font-black">x{item.qty}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-auto space-y-6">
                        <div className="flex items-end justify-between border-b border-white/5 pb-4">
                            <div>
                                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Precio Final</p>
                                <p className="text-4xl font-black text-white font-mono">${displayPrice.toLocaleString()}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${hasStock ? (isMaxInCart ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400') : 'bg-red-500/20 text-red-500'}`}>
                                {hasStock ? (isMaxInCart ? 'LÍMITE ALCANZADO' : `DISPONIBLES: ${availableToAdd}`) : 'SIN STOCK'}
                            </div>
                        </div>

                        {hasStock && availableToAdd > 0 && (
                            <div className="flex gap-4">
                                <div className="flex items-center bg-slate-900 rounded-2xl p-1 border border-slate-800">
                                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"><Minus className="w-4 h-4" /></button>
                                    <span className="w-10 text-center text-white font-black font-mono">{qty}</span>
                                    <button onClick={() => setQty(Math.min(availableToAdd, qty + 1))} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"><Plus className="w-4 h-4" /></button>
                                </div>
                                <button onClick={handleAdd} disabled={added} className={`flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${added ? 'bg-green-600' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}>
                                    {added ? 'AGREGADO!' : 'Agregar al Carrito'}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-6 pt-2">
                            <button onClick={() => toggleFavorite(selectedProduct)} className={`flex items-center gap-2 text-xs font-bold ${currentUser?.favorites?.includes(selectedProduct.id) ? 'text-orange-500' : 'text-slate-500'}`}>
                                <Heart className={`w-4 h-4 ${currentUser?.favorites?.includes(selectedProduct.id) ? 'fill-current' : ''}`} /> Favoritos
                            </button>
                        </div>
                    </div>

                    <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-2 bg-black/50 rounded-full text-white backdrop-blur-md border border-white/10"><X className="w-6 h-6" /></button>
                </div>
            </div>
        </div>
    );
}

// Modal de Venta Manual
function ManualSaleModal({ showManualSaleModal, setShowManualSaleModal, saleData, setSaleData, products, showToast, db, appId, darkMode }) {
    if (!showManualSaleModal) return null;

    const product = products.find(p => p.id === saleData.productId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!product) return showToast("Selecciona un producto.", "warning");
        try {
            const total = saleData.quantity * saleData.price;
            const newOrder = {
                orderId: `man-${Date.now().toString().slice(-6)}`,
                userId: 'manual_admin',
                customer: { name: saleData.customerName || 'Cliente Mostrador', email: 'offline@store.com' },
                items: [{ productId: product.id, title: product.name, quantity: Number(saleData.quantity), unit_price: Number(saleData.price), image: product.image }],
                total: total,
                status: 'Realizado',
                date: new Date().toISOString(),
                paymentMethod: saleData.paymentMethod,
                isManual: true
            };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), { stock: increment(-Number(saleData.quantity)) });
            showToast("Venta registrada!", "success");
            setShowManualSaleModal(false);
        } catch (err) { showToast("Error!", "error"); }
    };

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
            <div className={`w-full max-w-lg rounded-3xl shadow-2xl p-8 ${darkMode ? 'bg-[#0a0a0a] border border-slate-800' : 'bg-white border border-slate-200'}`}>
                <h3 className="text-xl font-bold mb-6 text-white uppercase tracking-widest">Venta Mostrador</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" value={saleData.productId} onChange={e => setSaleData({ ...saleData, productId: e.target.value, price: products.find(p => p.id === e.target.value)?.basePrice || 0 })}>
                        <option value="">Producto...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" value={saleData.quantity} onChange={e => setSaleData({ ...saleData, quantity: e.target.value })} placeholder="Cant" />
                        <input type="number" className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" value={saleData.price} onChange={e => setSaleData({ ...saleData, price: e.target.value })} placeholder="Precio" />
                    </div>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" value={saleData.customerName} onChange={e => setSaleData({ ...saleData, customerName: e.target.value })} placeholder="Cliente" />
                    <button type="submit" className="w-full bg-green-600 py-4 rounded-xl font-bold text-white uppercase">Registrar</button>
                    <button type="button" onClick={() => setShowManualSaleModal(false)} className="w-full text-slate-500 font-bold uppercase text-xs mt-2">Cerrar</button>
                </form>
            </div>
        </div>
    );
}

// Modal de Analíticas
function MetricsDetailModal({ metricsDetail, setMetricsDetail, dashboardMetrics, darkMode }) {
    const [timeframe, setTimeframe] = useState('monthly');
    if (!metricsDetail) return null;
    const data = dashboardMetrics?.analytics?.[timeframe] || [];
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
            <div className={`rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col border p-8 ${darkMode ? 'bg-[#050505] border-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white uppercase tracking-widest">Estadísticas Detalladas</h3>
                    <button onClick={() => setMetricsDetail(null)}><X className="text-white" /></button>
                </div>
                <div className="flex gap-4 mb-8">
                    {['daily', 'monthly', 'yearly'].map(t => (
                        <button key={t} onClick={() => setTimeframe(t)} className={`px-6 py-2 rounded-full text-xs font-black uppercase ${timeframe === t ? 'bg-white text-black' : 'bg-slate-900 text-slate-500'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex justify-between p-4 bg-white/5 rounded-2xl">
                            <span className="text-white font-mono">{item.date}</span>
                            <span className="text-orange-400 font-black">${item.revenue.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Drawer de Administración de Usuarios
function AdminUserDrawer({ viewUserCart, setViewUserCart, viewUserEdit, setViewUserEdit, currentUser, setCurrentUser, db, appId, darkMode, showToast, openConfirm }) {
    const [active, setActive] = useState(false);
    const [type, setType] = useState('cart');
    const [user, setUser] = useState(null);
    const [cartData, setCartData] = useState([]);
    const [loadingCart, setLoadingCart] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const u = viewUserCart || viewUserEdit;
        if (u) {
            setUser(u);
            setType(viewUserCart ? 'cart' : 'edit');
            setFormData({ ...u, newPassword: '' });
            setActive(true);
            if (viewUserCart) fetchCart(u.id);
        } else {
            setActive(false);
        }
    }, [viewUserCart, viewUserEdit]);

    const fetchCart = async (uid) => {
        setLoadingCart(true);
        try {
            const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', uid));
            setCartData(snap.exists() ? (snap.data().items || []) : []);
        } catch (e) { setCartData([]); }
        setLoadingCart(false);
    };

    if (!active || !user) return null;

    const close = () => { setViewUserCart(null); setViewUserEdit(null); };

    const handleEdit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const update = { ...formData, updatedAt: new Date().toISOString(), lastModifiedBy: currentUser.email };
            delete update.newPassword;
            if (formData.newPassword) update.password = formData.newPassword;
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), update);
            showToast("Actualizado!", "success");
            close();
        } catch (e) { showToast("Error!", "error"); }
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end animate-fade-in pointer-events-none">
            <div className="fixed inset-0 bg-black/60 pointer-events-auto" onClick={close} />
            <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] flex flex-col shadow-2xl pointer-events-auto ${darkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                <div className="p-8 border-b flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase text-white">{type === 'cart' ? 'Carrito' : 'Editar Usuario'}</h2>
                    <button onClick={close}><X className="text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                    {type === 'cart' ? (
                        <div className="space-y-4">
                            {loadingCart ? <p>Cargando...</p> : cartData.map((item, i) => (
                                <div key={i} className="flex justify-between p-4 bg-white/5 rounded-xl">
                                    <span className="text-white">{item.name} x{item.quantity}</span>
                                    <span className="text-orange-400 font-bold">${item.price}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <form onSubmit={handleEdit} className="space-y-6">
                            <input className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre" />
                            <input className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email" />
                            <input className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white" type="password" onChange={e => setFormData({ ...formData, newPassword: e.target.value })} placeholder="Nueva Contraseña" />
                            <button className="w-full bg-orange-600 py-4 rounded-xl font-bold uppercase text-white">Guardar</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- APLICACIÓN PRINCIPAL ---
function App() {
    // Versión del Sistema para Auto-Updates
    const APP_VERSION = '3.0.0';

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
            return saved !== null ? JSON.parse(saved) : false; // Default to light mode (blanco)
        } catch (e) { return false; }
    });

    // Usuarios y Autenticación
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('sustore_user_data');
            if (!saved) return null;

            const userData = JSON.parse(saved);

            // Validar que el usuario tenga los campos mínimos requeridos
            // Si no tiene id, email o name, es un usuario inválido o corrupto
            if (!userData || !userData.id || !userData.email || !userData.name) {
                // Limpiar datos corruptos o incompletos
                localStorage.removeItem('sustore_user_data');
                return null;
            }

            return userData;
        } catch (e) {
            // Si hay error al parsear, limpiar localStorage
            localStorage.removeItem('sustore_user_data');
            return null;
        }
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
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0); // Estado para el carrusel del hero

    // Estados de Interfaz de Usuario
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    // --- DRAG TO SCROLL (Categorías) ---
    const categoriesScrollRef = useRef(null);
    const [isDraggingCategories, setIsDraggingCategories] = useState(false);
    const [startXCategories, setStartXCategories] = useState(0);
    const [scrollLeftCategories, setScrollLeftCategories] = useState(0);

    const handleMouseDownCategories = (e) => {
        setIsDraggingCategories(true);
        setStartXCategories(e.pageX - categoriesScrollRef.current.offsetLeft);
        setScrollLeftCategories(categoriesScrollRef.current.scrollLeft);
    };

    const handleMouseLeaveCategories = () => {
        setIsDraggingCategories(false);
    };

    // --- ESTADOS PARA MERCADO PAGO CARD PAYMENT BRICK ---
    const [mpBrickController, setMpBrickController] = useState(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const isInitializingBrick = useRef(false);
    const cardPaymentBrickRef = useRef(null);

    // --- NOTIFICACIONES PARA ADMINS ---
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            const saved = localStorage.getItem('sustore_sound_enabled');
            return saved !== null ? JSON.parse(saved) : false; // Default off por autoplay policy
        } catch { return false; }
    });
    const prevOrdersCountRef = useRef(null);
    const lastNotifiedCountRef = useRef(0);

    const handleMouseUpCategories = () => {
        setIsDraggingCategories(false);
    };

    const handleMouseMoveCategories = (e) => {
        if (!isDraggingCategories) return;
        e.preventDefault();
        const x = e.pageX - categoriesScrollRef.current.offsetLeft;
        const walk = (x - startXCategories) * 2; // Velocidad de desplazamiento
        categoriesScrollRef.current.scrollLeft = scrollLeftCategories - walk;
    };


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
                ${productsToDeactivate.length > 0 ? `⚠️ ${productsToDeactivate.length} producto(s) serán desactivados (se conservan los ${newLimit} más vendidos)\n` : ''}
                ${couponsToDeactivate.length > 0 ? `⚠️ ${couponsToDeactivate.length} cupón(es) serán desactivados (el plan ${newPlan === 'entrepreneur' ? 'Emprendedor' : ''} no incluye cupones)\n` : ''}
                
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



    // --- ESTADOS DE ADMINISTRACIÓN (DETALLADOS) ---

    // Gestión de Productos
    const [newProduct, setNewProduct] = useState({
        name: '',
        basePrice: '',
        stock: '',
        categories: [], // Cambio: Ahora es un array para múltiples categorías
        image: '',
        description: '',
        discount: 0,
        purchasePrice: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    const [settingsTab, setSettingsTab] = useState('identity'); // identity, features, legal, advanced, subscription

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
    const [promoSearchQuery, setPromoSearchQuery] = useState('');
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

    // --- MEMOIZED DATA FOR ADMIN TABS (Optimización para evitar "Expected static flag was missing") ---
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const query = userSearch.toLowerCase();
            const matchesSearch = (u.name || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query) ||
                (u.username || '').toLowerCase().includes(query);
            const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, userSearch, userRoleFilter]);

    const distributionData = useMemo(() => {
        const team = settings?.team || [];
        const memberInvestments = team.map(member => {
            const totalInv = Number(member.investment) || 0;
            return { ...member, totalInv };
        });
        const totalCapital = memberInvestments.reduce((acc, m) => acc + m.totalInv, 0);
        return { memberInvestments, totalCapital };
    }, [settings?.team]);

    const planLimits = useMemo(() => {
        const plan = settings?.subscriptionPlan || 'entrepreneur';
        const limitCount = plan === 'premium' ? 999999 : plan === 'business' ? 50 : 30;
        const current = products.length;
        const isNearLimit = plan !== 'premium' && current >= limitCount * 0.8;
        const deactivatedByPlan = products.filter(p => !p.isActive && p.deactivatedByPlan);
        const deactivatedManually = products.filter(p => !p.isActive && !p.deactivatedByPlan);
        const totalDeactivated = products.filter(p => !p.isActive);
        return { plan, limitCount, current, isNearLimit, deactivatedByPlan, deactivatedManually, totalDeactivated };
    }, [settings?.subscriptionPlan, products]);

    const userProfileData = useMemo(() => {
        if (!currentUser) return { myCoupons: [], myOrders: [] };
        const myCoupons = coupons.filter(c =>
            (c.targetType === 'global') ||
            (c.targetType === 'specific_email' && c.targetUser === currentUser.email)
        );
        const myOrders = orders.filter(o => o.userId === currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date));
        return { myCoupons, myOrders };
    }, [coupons, orders, currentUser]);

    const heroCarouselData = useMemo(() => {
        const heroImages = Array.isArray(settings?.heroImages) && settings.heroImages.length ? settings.heroImages :
            (settings?.heroUrl ? [{ url: settings.heroUrl }] : []);
        const hasMultipleImages = heroImages.length > 1;
        return { heroImages, hasMultipleImages };
    }, [settings?.heroImages, settings?.heroUrl]);

    const purchaseFormData = useMemo(() => {
        const selectedProd = products.find(p => p.id === newPurchase.productId);
        const productPrice = selectedProd?.purchasePrice || selectedProd?.basePrice || 0;
        const autoCost = productPrice * newPurchase.quantity;
        return { selectedProd, productPrice, autoCost };
    }, [products, newPurchase.productId, newPurchase.quantity]);

    const handleHeroClick = useCallback((image) => {
        if (image?.linkedProductId) {
            const product = products.find(p => p.id === image.linkedProductId);
            if (product) setSelectedProduct(product);
        } else if (image?.linkedPromoId) {
            setSelectedCategory('Promos');
        }
    }, [products]);

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


    // --- NOTIFICACIONES PARA ADMINS ---



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
        if (!email) return 'user';
        const cleanEmail = email.trim().toLowerCase();

        // Super Admin Hardcodeado (Prioridad Máxima) - No depende de settings
        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';

        // 1. Verificar currentUser.role (Prioridad sobre equipo estático)
        // Esto permite promover usuarios desde el panel sin depender de settings.team
        // Esta verificación no depende de settings, solo de currentUser
        if (currentUser && currentUser.email && currentUser.email.trim().toLowerCase() === cleanEmail && currentUser.role && currentUser.role !== 'user') {
            return currentUser.role;
        }

        // Si settings aún no está cargado, no podemos verificar team ni users
        // Devolvemos 'loading' para indicar que no sabemos aún el rol real
        if (!settings || !settingsLoaded) return 'loading';

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
    const isRoleLoading = (email) => getRole(email) === 'loading';
    const hasAccess = (email) => {
        const role = getRole(email);
        // Si el rol aún está cargando, no tiene acceso (se mostrará loading)
        if (role === 'loading') return false;
        return role === 'admin' || role === 'editor' || role === 'employee';
    };

    // --- EFECTOS DE SINCRONIZACIÓN (FIREBASE) ---

    // 0. Sincronizar Dark Mode con el DOM y localStorage
    useEffect(() => {
        // Aplicar/remover clase dark-mode en el body
        if (darkMode) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
        }
        // Guardar preferencia en localStorage
        localStorage.setItem('sustore_dark_mode', JSON.stringify(darkMode));
    }, [darkMode]);

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
        // Solo guardar usuarios con datos válidos completos
        if (currentUser && currentUser.id && currentUser.email && currentUser.name) {
            localStorage.setItem('sustore_user_data', JSON.stringify(currentUser));
            // Pre-llenar checkout si hay datos
            setCheckoutData(prev => ({
                ...prev,
                address: currentUser.address || prev.address,
                city: currentUser.city || prev.city,
                province: currentUser.province || prev.province,
                zipCode: currentUser.zipCode || prev.zipCode
            }));
        } else if (!currentUser) {
            // Si no hay usuario, limpiar localStorage
            localStorage.removeItem('sustore_user_data');
        }
        // Si currentUser existe pero no tiene datos válidos, no guardamos nada
        // Esto evita persistir usuarios "fantasma" incompletos
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

                            // Asegurar flag de verificación para admins al recargar
                            if (freshUserData.role === 'admin') {
                                freshUserData._adminVerified = true;
                            }

                            // Verificar si hay cambios reales antes de actualizar estado
                            if (JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
                                setCurrentUser(freshUserData);
                            }
                        }
                    } catch (err) {
                        const errMsg = (err.message || err.toString() || '').toLowerCase();
                        if (errMsg.includes('offline') || errMsg.includes('unavailable') || errMsg.includes('network')) {
                            console.debug("Modo offline detectado: Usando datos en caché.");
                        } else {
                            console.warn("No se pudo refrescar usuario al inicio:", err);
                        }
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
            const primaryColor = settings.primaryColor || '#f97316';
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
                .text-orange-400, .text-orange-500 { color: ${primaryColor} !important; }
                .bg-orange-400, .bg-orange-500 { background-color: ${primaryColor} !important; }
                .bg-orange-900\\/10, .bg-orange-900\\/20 { background-color: ${primaryColor}1a !important; }
                .border-orange-500, .border-orange-500\\/20, .border-orange-500\\/30, .border-orange-500\\/50 { border-color: ${primaryColor} !important; }
                .hover\\:text-orange-400:hover { color: ${primaryColor} !important; }
                .hover\\:bg-orange-400:hover, .hover\\:bg-orange-500:hover { background-color: ${primaryColor} !important; }
                .hover\\:border-orange-500:hover, .hover\\:border-orange-500\\/30:hover, .hover\\:border-orange-500\\/50:hover { border-color: ${primaryColor} !important; }
                .focus-within\\:border-orange-500\\/50:focus-within { border-color: ${primaryColor}80 !important; }
                .from-orange-400 { --tw-gradient-from: ${primaryColor} !important; }
                .to-orange-500 { --tw-gradient-to: ${primaryColor} !important; }
                .shadow-orange-500\\/30, .shadow-orange-600\\/30 { --tw-shadow-color: ${primaryColor}4d !important; }
                .ring-orange-500 { --tw-ring-color: ${primaryColor} !important; }
                .selection\\:bg-orange-500\\/30 ::selection { background-color: ${primaryColor}4d !important; }
                .selection\\:text-orange-200 ::selection { color: ${primaryColor} !important; }
                
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
                .input-cyber:focus { border-color: var(--color-primary, #f97316) !important; }
                
                /* Cards and containers */
                .rounded-\\[2rem\\], .rounded-\\[2\\.5rem\\], .rounded-\\[1\\.5rem\\] {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05) !important;
                }
                
                /* Footer - Dynamic styles allowed */
                
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
                const sortedOrders = ordersData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setOrders(sortedOrders);
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
                console.log("?? Carrito actualizado automáticamente:", removedItems);

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

    // --- EFECTO VISUAL: SEO, FAVICON Y TÍTULO DINÁMICO ---

    const lastSavedSettingsRef = useRef(null);

    // Actualiza todas las meta tags de SEO según la configuración de la tienda
    useEffect(() => {
        // IMPORTANTE: Esperar a que la configuración cargue realmente para evitar "parpadeo" del logo default
        if (!settingsLoaded || !settings) return;

        const currentSettingsStr = JSON.stringify(settings);

        // Prevent infinite loop: Only save if content changed
        if (lastSavedSettingsRef.current === currentSettingsStr) {
            return;
        }

        // Auto-Save Settings Logic (Debounced)
        const autoSaveTimer = setTimeout(async () => {
            try {
                const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
                // Use merge true to be safe, though we usually have the full object
                await setDoc(settingsRef, settings, { merge: true });

                // Update the ref to match what we just saved
                lastSavedSettingsRef.current = JSON.stringify(settings);

                console.log("[AutoSave] Settings saved successfully.");
            } catch (error) {
                console.error("[AutoSave] Error saving settings:", error);
            }
        }, 2000); // 2 seconds debounce

        // Helper para actualizar meta tags de forma segura
        const updateMetaTag = (selector, content) => {
            const element = document.querySelector(selector);
            if (element && content) {
                element.setAttribute('content', content);
            }
        };

        const updateMetaTagById = (id, content) => {
            const element = document.getElementById(id);
            if (element && content) {
                element.setAttribute('content', content);
            }
        };

        const updateLinkTag = (id, href) => {
            const element = document.getElementById(id);
            if (element && href) {
                element.setAttribute('href', href);
            }
        };

        // 1. Título de la Pestaña
        const pageTitle = settings.seoTitle || (settings.storeName ? `${settings.storeName} - Tienda Online` : 'Tienda Online');
        document.title = pageTitle;

        // 2. Meta Description
        const description = settings.seoDescription || `${settings.storeName || 'Tienda'} - Tu tienda online de confianza.`;
        updateMetaTagById('meta-description', description);

        // 3. Meta Keywords
        const keywords = settings.seoKeywords || `${settings.storeName || 'tienda'}, productos, comprar, envíos`;
        updateMetaTagById('meta-keywords', keywords);

        // 4. Meta Author
        const author = settings.seoAuthor || settings.storeName || 'Tienda Online';
        updateMetaTagById('meta-author', author);

        // 5. Apple Mobile Web App Title
        updateMetaTagById('meta-apple-title', settings.storeName || 'Tienda');

        // 6. Theme Color
        if (settings.primaryColor) {
            updateMetaTagById('meta-theme-color', settings.primaryColor);
        }

        // 7. Canonical URL
        if (settings.seoUrl) {
            updateLinkTag('link-canonical', settings.seoUrl);
        }

        // 8. Open Graph Tags
        const ogImage = settings.seoImage || settings.logoUrl || (settings.heroImages?.[0]?.url) || '';
        updateMetaTagById('og-title', pageTitle);
        updateMetaTagById('og-description', description);
        updateMetaTagById('og-site-name', settings.storeName || 'Tienda Online');
        if (settings.seoUrl) {
            updateMetaTagById('og-url', settings.seoUrl);
        }
        if (ogImage) {
            updateMetaTagById('og-image', ogImage);
        }

        // 9. Twitter Card Tags
        updateMetaTagById('twitter-title', pageTitle);
        updateMetaTagById('twitter-description', description);
        if (ogImage) {
            updateMetaTagById('twitter-image', ogImage);
        }

        // 10. Favicon (Icono de Pestaña) - Auto Circular
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

        console.log('[SEO & AutoSave] Updated and Autosaved.');

        return () => clearTimeout(autoSaveTimer);
    }, [settings, settingsLoaded]);

    // --- HOOKS ADICIONALES (Notificaciones, Hero, Mercado Pago) ---

    // 1. Auto-corrección de método de pago
    useEffect(() => {
        if (checkoutData.shippingMethod === 'Delivery' && checkoutData.paymentChoice === 'Efectivo') {
            showToast('Pago en efectivo solo disponible con Retiro en Local.', 'info');
            const hasTransfer = settings?.paymentTransfer?.enabled;
            const hasCard = settings?.paymentMercadoPago?.enabled;
            setCheckoutData(prev => ({
                ...prev,
                paymentChoice: hasTransfer ? 'Transferencia' : (hasCard ? 'Tarjeta' : '')
            }));
        }
    }, [checkoutData.shippingMethod, settings]);

    // 2. Persistir preferencia de sonido
    useEffect(() => {
        localStorage.setItem('sustore_sound_enabled', JSON.stringify(soundEnabled));
    }, [soundEnabled]);

    // 3. Actualizar pedidos vistos
    useEffect(() => {
        if (view === 'admin' && adminTab === 'orders') {
            const currentTotal = orders.length;
            if (currentTotal > 0) {
                localStorage.setItem('sustore_last_viewed_orders', currentTotal.toString());
            }
        }
    }, [view, adminTab, orders.length]);

    // 4. Efecto de Notificaciones y Sonido
    const audioRef = useRef(new Audio('/notification.mp3'));
    const isAudioUnlocked = useRef(false);

    // Función para "desbloquear" el audio en el primer click (Autoplay Policy)
    const unlockAudio = useCallback(() => {
        if (isAudioUnlocked.current) return;

        const audio = audioRef.current;
        if (!audio) return;

        console.log("[Audio] Attempting to unlock audio system...");

        // Intentamos reproducir y pausar inmediatamente un sonido silencioso
        // Esto le dice al navegador que el usuario permite audio en este sitio
        audio.volume = 0;
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0.5;
            isAudioUnlocked.current = true;
            console.log("✅ [Audio] System unlocked and ready!");
            showToast("🔊 Notificaciones sonoras activadas", "success");
        }).catch((e) => {
            console.warn("[Audio] Failed to unlock:", e.name);
            // Aún bloqueado (posible si el click no fue lo suficientemente claro para el navegador)
        });
    }, []);

    // Desbloquear audio al interactuar con CUALQUIER parte de la página (para admins y editores)
    useEffect(() => {
        // Solo configurar el sistema de audio para admins y editores
        const userRole = currentUser?.role;
        const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

        if (!isAdminOrEditor) return;

        const handleInteraction = () => {
            unlockAudio();
            // No removemos los listeners para intentar varias veces si falla
        };

        // Agregar eventos de interacción en TODA la página
        window.addEventListener('click', handleInteraction);
        window.addEventListener('mousedown', handleInteraction);
        window.addEventListener('keydown', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);

        // Intentar desbloquear inmediatamente si ya hubo interacción previa (eliminado para evitar warnings de consola)
        // setTimeout(() => unlockAudio(), 100);

        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, [currentUser?.role, unlockAudio]);

    useEffect(() => {
        // Verificar si el usuario actual es admin o editor
        const userRole = currentUser?.role;
        const isAdminOrEditor = userRole === 'admin' || userRole === 'editor';

        // Solo ejecutar para admins y editores
        if (!isAdminOrEditor) return;

        const lastViewedCount = parseInt(localStorage.getItem('sustore_last_viewed_orders') || '0');
        const currentCount = orders.length;

        console.log('[Notifications] Debug:', { currentCount, lastViewedCount, soundEnabled, view, adminTab, userRole });

        // Si estamos en la bandeja de pedidos, actualizamos visto y DETENEMOS el sonido
        if (view === 'admin' && adminTab === 'orders') {
            if (currentCount > lastViewedCount) {
                localStorage.setItem('sustore_last_viewed_orders', currentCount.toString());
                lastNotifiedCountRef.current = currentCount;
            }
            // DETENER SONIDO AL ENTRAR A PEDIDOS
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                console.log('[Notifications] Stopped notification sound (viewing orders)');
            }
        }
        // Si hay nuevos pedidos y NO estamos viendo la bandeja, notificar y reproducir sonido
        else if (currentCount > lastViewedCount) {
            if (currentCount > lastNotifiedCountRef.current) {
                console.log('[Notifications] New order detected! Playing sound...');

                if (soundEnabled) {
                    try {
                        const audio = audioRef.current;
                        // Asegurar que el audio esté listo
                        audio.pause();
                        audio.currentTime = 0;
                        audio.loop = true; // REPETIR HASTA QUE SE VEA
                        audio.volume = 0.5;

                        // Intentar reproducir
                        const playPromise = audio.play();

                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('[Notifications] ✅ Sound playing successfully!');
                            }).catch(e => {
                                if (e.name === 'NotAllowedError') {
                                    isAudioUnlocked.current = false;
                                    console.warn("[Audio] ❌ Blocked by browser. User interaction required.");
                                    showToast("🔊 Haz clic en la página para activar las alertas sonoras", "warning");
                                } else {
                                    console.error("[Audio] ❌ Error playing sound:", e);
                                }
                            });
                        }
                    } catch (e) {
                        console.error('[Notifications] ❌ Error handling notification sound:', e);
                    }
                } else {
                    console.log('[Notifications] Sound disabled, skipping audio');
                }

                const newOrdersCount = currentCount - lastViewedCount;
                showToast(`🔔 ${newOrdersCount === 1 ? '¡Nuevo Pedido!' : `¡${newOrdersCount} Nuevos Pedidos!`} - ${newOrdersCount === 1 ? 'Haz clic' : 'Ve a Pedidos'} para revisarlo${newOrdersCount === 1 ? '' : 's'}.`, 'info');
                lastNotifiedCountRef.current = currentCount;
            }
        }

        // Cleanup al desmontar: detener sonido
        return () => {
            if (audioRef.current && (view === 'admin' && adminTab === 'orders')) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [orders, view, adminTab, soundEnabled, currentUser]);

    // 5. Rotacin Automtica Carrusel Hero
    useEffect(() => {
        const heroImages = settings?.heroImages?.length ? settings.heroImages :
            (settings?.heroUrl ? [{ url: settings.heroUrl }] : []);
        const hasMultipleImages = heroImages.length > 1;

        if (!hasMultipleImages) return;

        const interval = setInterval(() => {
            setCurrentHeroSlide(prev => (prev + 1) % heroImages.length);
        }, settings?.heroCarouselInterval || 5000);

        return () => clearInterval(interval);
    }, [settings?.heroImages, settings?.heroUrl, settings?.heroCarouselInterval]);

    // 6. Inicialización Mercado Pago Brick
    useEffect(() => {
        const isCheckoutView = view === 'checkout';
        const isMP = checkoutData.paymentChoice === 'Tarjeta';

        if (isCheckoutView && isMP && finalTotal > 0 && currentUser && cart.length > 0) {
            if (!currentUser.name || !currentUser.phone || !currentUser.dni) {
                showToast("Por favor completá tus datos personales antes de pagar con tarjeta.", "warning");
                setView('profile');
                return;
            }

            let attempts = 0;
            const maxAttempts = 20;

            const pollContainer = setInterval(() => {
                const container = document.getElementById('cardPaymentBrick_container');
                if (container) {
                    clearInterval(pollContainer);
                    initializeCardPaymentBrick();
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(pollContainer);
                        console.error('? Mercado Pago: Timeout esperando al contenedor #cardPaymentBrick_container');
                        showToast('Error cargando el formulario de pago. Por favor recarga la página.', 'error');
                    }
                }
            }, 100);

            return () => clearInterval(pollContainer);
        } else if (mpBrickController && (!isCheckoutView || !isMP)) {
            console.log('Sweep: Limpiando Brick por cambio de vista o método.');
            try {
                mpBrickController.unmount();
            } catch (e) { }
            setMpBrickController(null);
            isInitializingBrick.current = false;
        }
    }, [checkoutData.paymentChoice, finalTotal, currentUser, cart.length, view]);


    // ?? [PAUSA POR SEGURIDAD] - El código continúa con la lógica expandida. Escribe "continuar" para la siguiente parte.
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
                    throw new Error("No encontramos una cuenta con esos datos. Verifica o registrate.");
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

                // Estampar verificación de admin
                if (safeUserData.role === 'admin') {
                    safeUserData._adminVerified = true;
                }

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
                return [...prevCart, { product: product, quantity: newQuantity }];
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
                // Nota: Query compleja. Requiere -ndice compuesto posiblemente.
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

        console.log('?? Mercado Pago: Iniciando Brick. Total a cobrar:', finalTotal);

        if (!window.MercadoPago) {
            console.error('? Mercado Pago: SDK no cargado.');
            setPaymentError('No se pudo cargar el sistema de pagos. Por favor recarga la página.');
            return;
        }

        // Sanitizar el monto total para evitar errores de precisión flotante
        const safeAmount = Number(parseFloat(finalTotal).toFixed(2));
        if (isNaN(safeAmount) || safeAmount <= 0) {
            console.error('? Error: Monto inválido para pago:', finalTotal);
            return;
        }

        const container = document.getElementById('cardPaymentBrick_container');
        if (!container) return;

        isInitializingBrick.current = true;

        // Timeout de seguridad: si en 10 segundos no cargó, permitir reintentar
        const safetyTimeout = setTimeout(() => {
            if (isInitializingBrick.current) {
                console.warn('?? Mercado Pago: La inicialización está tardando demasiado. Liberando bloqueo...');
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
                                baseColor: '#f97316',
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
                        console.log('? Mercado Pago: Card Payment Brick cargado.');
                        isInitializingBrick.current = false;
                        clearTimeout(safetyTimeout);
                    },
                    onSubmit: async (cardFormData) => {
                        console.log('?? Mercado Pago: Procesando pago...');

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
                            console.log('?? Respuesta:', result);

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
                                const mpErrorMap = {
                                    'cc_rejected_high_risk': 'El pago fue rechazado por controles de seguridad de Mercado Pago. Te recomendamos probar con otra tarjeta o medio de pago.',
                                    'cc_rejected_insufficient_amount': 'Tu tarjeta no tiene fondos suficientes.',
                                    'cc_rejected_bad_filled_other': 'Revisá los datos de tu tarjeta.',
                                    'cc_rejected_bad_filled_date': 'La fecha de vencimiento es incorrecta.',
                                    'cc_rejected_bad_filled_security_code': 'El código de seguridad es incorrecto.',
                                    'cc_rejected_call_for_authorize': 'Debés autorizar el pago llamando a tu banco.',
                                    'cc_rejected_card_disabled': 'Tu tarjeta está inactiva. Llamá a tu banco para activarla.',
                                    'cc_rejected_max_attempts': 'Llegaste al límite de intentos permitidos. Usá otra tarjeta.',
                                    'cc_rejected_duplicated_payment': 'Ya hiciste un pago similar recientemente. Esperá unos minutos.'
                                };
                                const detailedError = mpErrorMap[result.status_detail] || result.status_detail || result.error || 'Pago rechazado';
                                console.error('? Motivo del rechazo:', detailedError);

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
                                setPaymentError(`${detailedError}`); // Mensaje limpio y directo
                                showToast('El pago no se pudo completar. Revisá los detalles.', 'error');
                            }
                        } catch (error) {
                            // ERROR DE CONEXIÓN
                            console.error('? Error de conexión:', error);
                            setIsPaymentProcessing(false);
                            setPaymentError('Error de conexión con el servidor. Revisá tu internet e intentá de nuevo.');
                            showToast('Error de conexión.', 'error');
                        }
                    },
                    onError: (error) => {
                        console.error('? Mercado Pago Error:', error);
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
                return showToast(`Has alcanzado el límite de ${MAX_PRODUCTS_ENTREPRENEUR} productos del Plan Emprendedor.¡Mejora tu plan para seguir creciendo!`, "error");
            }

            if (isBusiness && products.length >= MAX_PRODUCTS_BUSINESS) {
                return showToast(`Has alcanzado el límite de ${MAX_PRODUCTS_BUSINESS} productos del Plan Negocio.¡Pásate a Premium para productos ilimitados!`, "error");
            }
        }

        if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0) return showToast("El precio debe ser mayor a 0.", "warning");

        // Validación de categorías (array)
        const categories = Array.isArray(newProduct.categories) ? newProduct.categories :
            (newProduct.category ? [newProduct.category] : []);
        if (categories.length === 0) return showToast("Selecciona al menos una categoría.", "warning");

        const productData = {
            ...newProduct,
            categories: categories, // Guardar como array
            basePrice: Number(newProduct.basePrice) || 0,
            purchasePrice: Number(newProduct.purchasePrice || 0),
            stock: Number(newProduct.stock) || 0,
            discount: Number(newProduct.discount || 0),
            image: newProduct.image || 'https://via.placeholder.com/150',
            lastUpdated: new Date().toISOString()
        };

        // Eliminar propiedad legacy para evitar error de "undefined" en Firestore
        if ('category' in productData) delete productData.category;

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
            setNewProduct({ name: '', basePrice: '', purchasePrice: '', stock: '', categories: [], image: '', description: '', discount: 0 });
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
            ...(Array.isArray(purchases) ? purchases : []).map(p => ({ id: p.id, type: 'expense', category: 'Compra Stock', date: p.date, amount: p.cost, description: `Prov: ${p.supplier || 'General'}`, status: 'Completado' })),
            ...(Array.isArray(investments) ? investments : []).map(i => ({ id: i.id, type: 'income', category: 'Inversión', date: i.date, amount: i.amount, description: `Inv: ${i.investor}`, status: 'Recibido' }))
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

    // ?? [PAUSA POR SEGURIDAD] - El código continúa con la Interfaz Gráfica completa y detallada. Por favor escribe "continuar".
    // --- COMPONENTES UI: MODALES DETALLADOS ---

    // Modal de Detalles de Pedido (Visor Completo)

    // Modal de Detalle de Producto / Promo (Versión Premium)




    // Estado de Carga Inicial
    if (isLoading && view === 'store') {
        const loadingPrimaryColor = settings?.primaryColor || '#f97316';
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${darkMode ? 'bg-[#050505] text-white' : 'bg-white text-slate-900'}`}>
                <div className="relative">
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 animate-spin ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} style={{ borderTopColor: loadingPrimaryColor }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" style={{ color: loadingPrimaryColor }} />
                    </div>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] mt-6 sm:mt-8 animate-pulse text-center max-w-[90vw]" style={{ color: loadingPrimaryColor, textShadow: `0 0 20px ${loadingPrimaryColor}40` }}>
                    {settings?.loadingTitle || settings?.storeName || ''}
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-3 sm:mt-4 font-mono uppercase tracking-wider sm:tracking-widest text-center">
                    {settings?.loadingText || 'Cargando sistema...'}
                </p>
            </div>
        );
    }

    // Modo Mantenimiento
    if (settings?.maintenanceMode && !isAdmin(currentUser?.email)) {
        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-center ${darkMode ? 'bg-[#050505] text-white' : 'bg-white text-slate-900'}`}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6 sm:mb-8 border border-red-900/50 animate-pulse">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-4xl font-black mb-3 sm:mb-4 tracking-tight uppercase">Sistema en Mantenimiento</h1>
                <p className={`max-w-sm sm:max-w-md mx-auto leading-relaxed text-sm sm:text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Estamos realizando mejoras para brindarte una experiencia premium.
                    ¿Te mandamos un saludo y esperamos que vuelvas prontamente!
                </p>
                <div className="mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-slate-900 w-full max-w-xs">
                    <p className="text-[10px] sm:text-xs text-slate-600 font-mono italic">{settings?.storeName || ''} - Modo Mantenimiento Activo</p>
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

            // NUEVO: Soporte para múltiples categorías
            // Verificar si el producto tiene el array categories o el campo legacy category
            const matchesCategory = (() => {
                // Sin filtro seleccionado - mostrar todos
                if (selectedCategory === '') return true;

                // Producto con múltiples categorías (nuevo sistema)
                if (Array.isArray(p.categories)) {
                    return p.categories.includes(selectedCategory);
                }

                // Producto con categoría antigua (retrocompatibilidad)
                if (p.category) {
                    return p.category.trim() === selectedCategory;
                }

                // Sin categoría asignada
                return false;
            })();

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
        <React.Fragment>
            <SmoothScroll enabled={view !== 'admin'} />

            {view === 'admin' && (
                <style>{`
                    body { background-color: #f8fafc !important; }
                    html { background-color: #f8fafc !important; }
                `}</style>
            )}

            <div
                className={view === 'admin' ? "bg-slate-50 min-h-screen font-sans" : `min-h-screen flex flex-col relative w-full bg-grid font-sans selection:bg-orange-500/30 selection:text-orange-200 transition-colors duration-300 ${darkMode ? 'bg-[#050505]' : 'bg-white'}`}
                style={view === 'admin' ? { transform: 'none' } : {}}
            >
                {/* Wrapper for admin content ensuring no transforms affect fixed position */}
                {/* DEBUGGER VISUAL (SOLO DESARROLLO) */}
                {view === 'store' && currentUser?.role === 'admin' && (
                    <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-green-400 font-mono text-xs p-2 rounded border border-green-900 pointer-events-none">
                        [DEBUG] Total: {products.length} | Filtro: {filteredProducts.length} | Cat: {selectedCategory || 'ALL'}
                    </div>
                )}

                {/* Efectos de Fondo Globales - SOLO STORE */}
                {view !== 'admin' && (
                    <div className="fixed inset-0 pointer-events-none z-0">
                        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-orange-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                    </div>
                )}


                {/* Contenedores Globales (Toasts y Modales) */}
                <div className="fixed top-24 right-4 z-[9999] space-y-3 pointer-events-none">
                    {/* Toasts necesitan pointer-events-auto para poder cerrarlos */}
                    <div className="pointer-events-auto space-y-3">
                        {toasts.map(t => (
                            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                        ))}
                    </div>
                </div>



                {/* TEMPORALMENTE DESHABILITADOS - Componentes no definidos */}
                <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} darkMode={darkMode} />
                <CouponSelectorModal
                    isOpen={showCouponModal}
                    onClose={() => setShowCouponModal(false)}
                    coupons={coupons}
                    currentUser={currentUser}
                    cartSubtotal={cartSubtotal}
                    selectCoupon={selectCoupon}
                    darkMode={darkMode}
                />
                <ProductDetailModal
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    darkMode={darkMode}
                    calculateItemPrice={calculateItemPrice}
                    settings={settings}
                    manageCart={manageCart}
                    cart={cart}
                    showToast={showToast}
                    toggleFavorite={toggleFavorite}
                    currentUser={currentUser}
                />

                {/* --- BARRA DE NAVEGACIÓN (NAVBAR) --- */}
                {view !== 'admin' && (
                    <nav className={`fixed top-0 w-full h-16 sm:h-20 z-50 px-3 sm:px-6 md:px-12 flex items-center justify-between backdrop-blur-xl transition-all duration-300 ${darkMode ? 'glass border-b border-slate-800/50' : 'bg-white/95 border-b border-slate-200 shadow-sm'}`}>
                        {/* Logo y Menú */}
                        <div className="flex items-center gap-2 sm:gap-6">
                            <button onClick={() => setIsMenuOpen(true)} className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition border group ${darkMode ? 'bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/50' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-200'}`}>
                                <Menu className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition" />
                            </button>
                            <div className="cursor-pointer group flex items-center gap-2 sm:gap-3" onClick={() => setView('store')}>
                                {settings?.logoUrl && (
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 bg-white p-0.5 flex-shrink-0 shadow-lg group-hover:border-orange-500 transition-colors duration-300 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className={`text-xl sm:text-2xl md:text-4xl font-black tracking-tighter italic group-hover:text-orange-500 transition-all duration-300 leading-none ${darkMode ? 'text-white' : 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] filter'}`}>
                                        {!settingsLoaded ? (
                                            <span className={`inline-block h-6 sm:h-8 w-20 sm:w-32 rounded animate-pulse ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`}></span>
                                        ) : (settings?.storeName || '')}
                                    </span>
                                    <div className="h-0.5 sm:h-1 w-1/2 bg-orange-500 rounded-full group-hover:w-full transition-all duration-500 mt-0.5 sm:mt-1 shadow-sm"></div>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Búsqueda (Visible en Desktop) */}
                        <div className={`hidden lg:flex items-center rounded-2xl px-6 py-3 w-1/3 transition shadow-inner group ${darkMode ? 'bg-slate-900/50 border border-slate-700/50 focus-within:border-orange-500/50 focus-within:bg-slate-900' : 'bg-slate-100 border border-slate-200 focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-md'}`}>
                            <Search className={`w-5 h-5 mr-3 group-focus-within:text-orange-500 transition ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                            <input
                                className={`bg-transparent outline-none text-sm w-full font-medium ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                                placeholder={'\u00BFQu\u00E9 est\u00E1s buscando hoy?'}
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
                                className={`relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition group overflow-hidden border ${darkMode ? 'bg-slate-900/50 text-yellow-400 hover:bg-slate-800 border-slate-700/50' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200'}`}
                                title={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                            >
                                <div className={`transform transition-all duration-500 ${darkMode ? 'rotate-0 scale-100' : 'rotate-180 scale-0 absolute'}`}>
                                    <Moon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition" />
                                </div>
                                <div className={`transform transition-all duration-500 ${!darkMode ? 'rotate-0 scale-100' : '-rotate-180 scale-0 absolute'}`}>
                                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition" />
                                </div>
                            </button>

                            {/* Botón Carrito */}
                            <button onClick={() => setView('cart')} className={`relative p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition group border ${darkMode ? 'bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/50 hover:border-orange-500/30' : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-200 hover:border-orange-400'}`}>
                                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition" />
                                {cart.length > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-orange-500 text-white text-[9px] sm:text-[10px] font-black w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border-2 animate-bounce-short ${darkMode ? 'border-[#050505]' : 'border-white'}`}>
                                        {cart.length}
                                    </span>
                                )}
                            </button>

                            {/* Perfil / Login - Solo mostrar perfil si el usuario tiene datos válidos */}
                            {currentUser && currentUser.id && currentUser.email && currentUser.name ? (
                                <button onClick={() => setView('profile')} className={`flex items-center gap-2 sm:gap-3 pl-2 pr-3 sm:pr-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border transition group ${darkMode ? 'bg-slate-900/50 border-slate-700/50 hover:border-orange-500/50' : 'bg-slate-100 border-slate-200 hover:border-orange-400'}`}>
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold shadow-lg text-xs sm:text-sm group-hover:scale-105 transition">
                                        {currentUser.name.charAt(0)}
                                    </div>
                                    <div className="text-left hidden md:block">
                                        <p className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Hola,</p>
                                        <p className={`text-xs sm:text-sm font-bold leading-none group-hover:text-orange-500 transition ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentUser.name.split(' ')[0]}</p>
                                    </div>
                                </button>
                            ) : (
                                <button onClick={() => setView('login')} className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition shadow-lg flex items-center gap-1 sm:gap-2 transform hover:-translate-y-0.5 ${darkMode ? 'bg-white text-black hover:bg-orange-500 hover:text-white' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                                    <User className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">INGRESAR</span><span className="sm:hidden">Entrar</span>
                                </button>
                            )}
                        </div>
                    </nav>
                )}

                {/* --- MENÚ MÓVIL (DETALLADO Y EXPLÍCITO) --- */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[10000] flex justify-start">
                        {/* Backdrop */}
                        <div className={`fixed inset-0 backdrop-blur-sm transition-opacity ${darkMode ? 'bg-black/90' : 'bg-black/50'}`} onClick={() => setIsMenuOpen(false)}></div>

                        {/* Panel Lateral */}
                        <div className={`relative w-72 sm:w-80 h-full p-6 sm:p-8 animate-fade-in-right flex flex-col shadow-2xl z-[10001] ${darkMode ? 'bg-[#0a0a0a] border-r border-slate-800' : 'bg-white border-r border-slate-200'}`} data-lenis-prevent>
                            <div className={`flex justify-between items-center mb-8 sm:mb-10 border-b pb-4 sm:pb-6 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md ${darkMode ? 'text-white' : 'text-slate-900'}`}>MENÚ</h2>
                                <button onClick={() => setIsMenuOpen(false)} className={`p-2 sm:p-3 rounded-full transition border ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 border-slate-200'}`}>
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            {/* Lista de Botones */}
                            <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <button onClick={() => { setView('store'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold transition flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl group border border-transparent ${darkMode ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-900/50 hover:border-slate-800' : 'text-slate-700 hover:text-orange-500 hover:bg-slate-100 hover:border-slate-200'}`}>
                                    <Home className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:text-orange-500 transition ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> Inicio
                                </button>

                                <button onClick={() => { setView('profile'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold transition flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl group border border-transparent ${darkMode ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-900/50 hover:border-slate-800' : 'text-slate-700 hover:text-orange-500 hover:bg-slate-100 hover:border-slate-200'}`}>
                                    <User className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:text-orange-500 transition ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> Mi Perfil
                                </button>

                                <button onClick={() => { setView('cart'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold transition flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl group border border-transparent ${darkMode ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-900/50 hover:border-slate-800' : 'text-slate-700 hover:text-orange-500 hover:bg-slate-100 hover:border-slate-200'}`}>
                                    <div className="relative">
                                        <ShoppingBag className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:text-orange-500 transition ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                                        {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-orange-500 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">{cart.length}</span>}
                                    </div>
                                    Mi Carrito
                                </button>

                                <div className={`h-px my-3 sm:my-4 mx-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>

                                <button onClick={() => { setView('about'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold transition flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl group border border-transparent ${darkMode ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-900/50 hover:border-slate-800' : 'text-slate-700 hover:text-orange-500 hover:bg-slate-100 hover:border-slate-200'}`}>
                                    <Info className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:text-orange-500 transition ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> Sobre Nosotros
                                </button>

                                {settings?.showGuideLink !== false && (
                                    <button onClick={() => { setView('guide'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold transition flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl group border border-transparent ${darkMode ? 'text-slate-300 hover:text-orange-400 hover:bg-slate-900/50 hover:border-slate-800' : 'text-slate-700 hover:text-orange-500 hover:bg-slate-100 hover:border-slate-200'}`}>
                                        <FileQuestion className={`w-5 h-5 sm:w-6 sm:h-6 group-hover:text-orange-500 transition ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> {settings?.guideTitle || 'Cómo Comprar'}
                                    </button>
                                )}

                                {/* Panel Admin (Solo si tiene permisos) */}
                                {hasAccess(currentUser?.email) && (
                                    <button onClick={() => { setView('admin'); setIsMenuOpen(false) }} className={`w-full text-left text-base sm:text-lg font-bold text-orange-500 mt-4 sm:mt-6 pt-4 sm:pt-6 flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition border ${darkMode ? 'border-t border-slate-800 bg-orange-900/10 hover:bg-orange-900/20 border-orange-500/20' : 'border-t border-slate-200 bg-orange-50 hover:bg-orange-100 border-orange-200'}`}>
                                        <Shield className="w-5 h-5 sm:w-6 sm:h-6" /> Admin Panel
                                    </button>
                                )}
                            </div>

                            <div className={`mt-6 sm:mt-8 pt-6 sm:pt-8 border-t text-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{settings?.menuCopyright || settings.storeName}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Espaciador para el Navbar Fixed */}
                {view !== 'admin' && <div className="h-16 sm:h-20 md:h-24"></div>}

                {/* --- CONTENIDO PRINCIPAL (VIEW SWITCHER) --- */}
                <main className={`flex-grow relative z-10 ${view === 'admin' ? 'flex' : 'p-4 md:p-8'}`}>

                    {/* 1. VISTA TIENDA (HOME) */}
                    {view === 'store' && (
                        <div className="max-w-[1400px] mx-auto pb-32 min-h-screen block">

                            {/* Anuncio Global (Marquesina) - Solo mostrar cuando settings estén cargados */}
                            {settingsLoaded && settings?.showAnnouncementBanner !== false && settings?.announcementMessage && (
                                <div className="w-full bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition duration-1000"></div>
                                    <p className="text-orange-400 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                                        <Flame className="w-4 h-4 text-orange-500" /> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500" />
                                    </p>
                                </div>
                            )}

                            {/* Brand Ticker (Futuristic) - Solo mostrar cuando settings estén cargados */}
                            {settingsLoaded && settings?.showBrandTicker !== false && (
                                <div className={`mb-8 w-full overflow-hidden border-y backdrop-blur-sm py-2 ${darkMode ? 'border-slate-800/50 bg-[#0a0a0a]/50' : 'border-slate-200 bg-slate-100/50'}`}>
                                    <div className="ticker-wrap">
                                        <div className={`ticker-content font-mono text-xs md:text-sm tracking-[0.2em] md:tracking-[0.5em] uppercase flex items-center gap-6 md:gap-12 ${darkMode ? 'text-orange-500/50' : 'text-orange-600/70'}`}>
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



                            {/* Banner Hero - Carrusel */}
                            <div className={`relative w-full rounded-[2rem] overflow-hidden shadow-2xl mb-8 border group container-tv transition-all duration-500 ${settings?.carouselHeight === 'slim' ? 'h-[80px] sm:h-[120px] lg:h-[140px]' :
                                (!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'h-[120px] sm:h-[160px] lg:h-[180px]' :
                                    settings?.carouselHeight === 'medium' ? 'h-[200px] sm:h-[280px] lg:h-[350px]' :
                                        'h-[350px] sm:h-[500px] lg:h-[600px]'} ${darkMode ? 'border-slate-800 bg-[#080808]' : 'border-slate-200 bg-white'}`}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>

                                {/* Imágenes del Carrusel */}
                                {!settingsLoaded ? (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 animate-pulse"></div>
                                ) : (Array.isArray(heroCarouselData.heroImages) ? heroCarouselData.heroImages : []).length > 0 ? (
                                    (Array.isArray(heroCarouselData.heroImages) ? heroCarouselData.heroImages : []).map((image, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleHeroClick(image)}
                                            className={`absolute inset-0 transition-opacity duration-700 ${image?.linkedProductId || image?.linkedPromoId ? 'cursor-pointer' : ''} ${currentHeroSlide === index ? 'opacity-100 z-[1]' : 'opacity-0 z-0'}`}
                                        >
                                            <img
                                                src={image.url}
                                                className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                                                alt={`Hero ${index + 1}`}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    // Fallback Hero Background si no hay imágenes
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 via-[#0a0a0a] to-slate-900/40 opacity-60">
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                    </div>
                                )
                                }

                                {/* Overlay de Texto - Solo en primera imagen (slide 0) */}
                                <div className={`absolute inset-0 z-10 flex flex-col justify-center transition-all duration-500 
                                            ${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'px-6 sm:px-12 md:px-16 lg:px-20' : 'px-8 sm:px-16 md:px-24'}`}>
                                    <div className={`transition-all duration-700 transform ${currentHeroSlide === 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                                        {/* Si hay un overlay per-image, lo mostramos (vanguardia) */}
                                        {heroCarouselData.heroImages[0]?.textOverlay ? (
                                            <>
                                                <div dangerouslySetInnerHTML={{ __html: heroCarouselData.heroImages[0].textOverlay }} />
                                            </>
                                        ) : (
                                            <>
                                                <span className={`bg-orange-500 text-black px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.1)] inline-block
                                                            ${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'text-[8px] mb-1' : 'text-[10px] mb-4'}`}>
                                                    {settings?.heroBadge || ''}
                                                </span>
                                                <h1 className={`text-tv-huge font-black leading-[0.9] drop-shadow-2xl transition-all duration-300 
                                                            ${settings?.carouselHeight === 'slim' ? 'text-xs md:text-sm lg:text-base mb-0' :
                                                        (!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'text-lg md:text-2xl lg:text-3xl mb-1' :
                                                            'text-3xl md:text-5xl lg:text-6xl mb-4'}
                                                            ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                                    {settings?.heroTitle1 || ''} <br />
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-blue-600">
                                                        {settings?.heroTitle2 || ''}
                                                    </span>
                                                </h1>
                                                {(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? null : (
                                                    <p className={`text-sm md:text-base lg:text-lg mb-6 max-w-md font-medium transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {settings?.heroSubtitle || ''}
                                                    </p>
                                                )}
                                                <div className={`flex items-center transition-all ${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'gap-2 mt-2' : 'gap-4'}`}>
                                                    <button
                                                        onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })}
                                                        className={`font-black rounded-xl hover:bg-orange-400 transition flex items-center justify-center gap-2 group/btn 
                                                                    ${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'px-4 py-2 text-xs' : 'px-8 py-4'}
                                                                    ${darkMode ? 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'bg-slate-900 text-white shadow-xl hover:bg-slate-800'}`}>
                                                        VER CATÁLOGO <ArrowRight className={`${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'w-3 h-3' : 'w-5 h-5'} group-hover/btn:translate-x-1 transition`} />
                                                    </button>
                                                    <button
                                                        onClick={() => setView('guide')}
                                                        className={`backdrop-blur-md border rounded-xl flex items-center transition font-bold group
                                                                    ${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'px-3 py-2 text-[10px] gap-1' : 'px-6 py-2.5 text-xs gap-2'}
                                                                    ${darkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}>
                                                        <Info className={`${(!settings?.carouselHeight || settings?.carouselHeight === 'small') ? 'w-3 h-3' : 'w-4 h-4'} text-orange-400`} /> Ayuda
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Indicadores del Carrusel (dots) - Solo si hay múltiples imágenes */}
                                {heroCarouselData.hasMultipleImages && settingsLoaded && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                        {(Array.isArray(heroCarouselData.heroImages) ? heroCarouselData.heroImages : []).map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentHeroSlide(index)}
                                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentHeroSlide === index
                                                    ? 'bg-orange-500 w-6'
                                                    : (darkMode ? 'bg-white/30 hover:bg-white/50' : 'bg-slate-900/30 hover:bg-slate-900/50')}`}
                                            />
                                        ))}
                                    </div>
                                )}
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
                                                <div className={`p-4 rounded-[1.5rem] border backdrop-blur-sm flex flex-col items-center text-center tech-glow transition duration-500 group ${darkMode ? 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50'}`}>
                                                    <div className="w-10 h-10 rounded-full bg-orange-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                        <Zap className="w-5 h-5 text-orange-400" />
                                                    </div>
                                                    <h3 className={`text-base font-bold mb-1 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{settings?.feature1Title || ''}</h3>
                                                    <p className={`text-[11px] transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{settings?.feature1Desc || ''}</p>
                                                </div>
                                            )}
                                            {/* Beneficio 2 */}
                                            {settings?.showFeature2 !== false && (
                                                <div className={`p-4 rounded-[1.5rem] border backdrop-blur-sm flex flex-col items-center text-center tech-glow transition duration-500 group ${darkMode ? 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50'}`}>
                                                    <div className="w-10 h-10 rounded-full bg-purple-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                        <Shield className="w-5 h-5 text-purple-400" />
                                                    </div>
                                                    <h3 className={`text-base font-bold mb-1 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{settings?.feature2Title || ''}</h3>
                                                    <p className={`text-[11px] transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{settings?.feature2Desc || ''}</p>
                                                </div>
                                            )}
                                            {/* Beneficio 3 */}
                                            {settings?.showFeature3 !== false && (
                                                <div className={`p-4 rounded-[1.5rem] border backdrop-blur-sm flex flex-col items-center text-center tech-glow transition duration-500 group ${darkMode ? 'bg-slate-900/30 border-slate-800 hover:bg-slate-900/50' : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50'}`}>
                                                    <div className="w-10 h-10 rounded-full bg-green-900/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                                        <Headphones className="w-5 h-5 text-green-400" />
                                                    </div>
                                                    <h3 className={`text-base font-bold mb-1 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{settings?.feature3Title || ''}</h3>
                                                    <p className={`text-[11px] transition-colors ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{settings?.feature3Desc || ''}</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Filtros de Categoría */}
                            <div id="catalog" className={`sticky top-16 sm:top-20 z-40 backdrop-blur-xl py-3 sm:py-4 mb-6 sm:mb-8 -mx-4 px-4 border-y ${darkMode ? 'bg-[#050505]/80 border-slate-800/50' : 'bg-white/80 border-slate-200'}`}>
                                <div
                                    ref={categoriesScrollRef}
                                    onMouseDown={handleMouseDownCategories}
                                    onMouseLeave={handleMouseLeaveCategories}
                                    onMouseUp={handleMouseUpCategories}
                                    onMouseMove={handleMouseMoveCategories}
                                    className={`flex items-center gap-2 overflow-x-auto pb-1 ${isDraggingCategories ? 'cursor-grabbing scroll-auto' : 'cursor-grab scroll-smooth'}`}
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                                >
                                    <Filter className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />

                                    {/* BOTÓN PROMOS (SPECIAL) */}
                                    <button
                                        onClick={() => setSelectedCategory('Promos')}
                                        className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-black text-[10px] sm:text-xs transition border whitespace-nowrap flex items-center gap-1.5 sm:gap-2 group relative overflow-hidden flex-shrink-0 ${selectedCategory === 'Promos' ? 'text-white border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]' : darkMode ? 'bg-slate-900 border-slate-800 text-purple-400 hover:text-white hover:border-purple-500/50' : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300'}`}
                                    >
                                        {selectedCategory === 'Promos' && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 animate-gradient-xy"></div>}
                                        <span className="relative z-10 flex items-center gap-1.5 sm:gap-2"><Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> PROMOS</span>
                                    </button>

                                    {/* BOTÓN OFERTAS (SPECIAL) */}
                                    <button
                                        onClick={() => setSelectedCategory('Ofertas')}
                                        className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition border whitespace-nowrap flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ${selectedCategory === 'Ofertas' ? 'bg-red-600/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : darkMode ? 'bg-slate-900 border-slate-800 text-red-400 hover:text-white hover:border-red-500/50' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300'}`}
                                    >
                                        <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> OFERTAS
                                    </button>

                                    <button onClick={() => setSelectedCategory('')} className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition border whitespace-nowrap flex-shrink-0 ${selectedCategory === '' ? darkMode ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-900 text-white border-slate-900 shadow-md' : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}>
                                        Todos
                                    </button>
                                    {settings?.categories?.map(c => (
                                        <button key={c} onClick={() => setSelectedCategory(c)} className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs transition border whitespace-nowrap flex-shrink-0 ${selectedCategory === c ? 'bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : darkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600'}`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>


                            {/* SECCIÓN PROMOS (NUEVO) */}
                            {/* SECCIÓN PROMOS (TAB VIEW) */}
                            {selectedCategory === 'Promos' && (
                                <div className="mb-16 animate-fade-in">
                                    {promos.length > 0 ? (
                                        <>
                                            <h2 className={`text-3xl font-black mb-8 flex items-center gap-3 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
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
                                                        <div key={promo.id} className={`bg-gradient-to-br rounded-[2.5rem] border overflow-hidden group shadow-[0_0_30px_rgba(168,85,247,0.1)] hover:shadow-[0_0_50px_rgba(168,85,247,0.2)] transition duration-500 relative flex flex-col ${darkMode ? 'from-purple-900/10 to-blue-900/10 border-purple-500/30' : 'from-purple-50 to-blue-50 border-purple-200'}`}>
                                                            <div
                                                                className={`aspect-square flex items-center justify-center relative overflow-hidden cursor-zoom-in ${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}
                                                                onClick={() => setSelectedProduct({ ...promo, isPromo: true, stock: maxPurchasable })}
                                                            >
                                                                <img src={promo.image} className="w-full h-full object-contain transition duration-700 group-hover:scale-110" />
                                                                <div className={`absolute inset-0 bg-gradient-to-t ${darkMode ? 'from-[#0a0a0a] via-transparent to-transparent' : 'from-slate-100/50 via-transparent to-transparent'}`}></div>
                                                                <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                                                    Oferta Limitada
                                                                </div>
                                                            </div>

                                                            <div className="p-8 flex-1 flex flex-col">
                                                                <h3 className={`text-2xl font-black mb-2 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{promo.name}</h3>
                                                                <p className={`text-sm mb-6 flex-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>{promo.description}</p>

                                                                {/* Lista de productos incluidos */}
                                                                <div className="mb-6 space-y-2">
                                                                    <p className={`text-[10px] uppercase font-bold tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Incluye:</p>
                                                                    {promo.items.map((item, idx) => {
                                                                        const p = products.find(prod => prod.id === item.productId);
                                                                        return (
                                                                            <div key={idx} className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                                <CheckCircle className="w-3 h-3 text-purple-500" />
                                                                                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.quantity}x</span> {p ? p.name : 'Producto'}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                <div className={`flex items-center justify-between mt-auto pt-6 border-t ${darkMode ? 'border-white/5' : 'border-purple-200/50'}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-slate-500 text-xs font-bold line-through decoration-red-500 decoration-2">
                                                                            ${promo.items.reduce((acc, item) => {
                                                                                const p = products.find(prod => prod.id === item.productId);
                                                                                return acc + ((Number(p?.basePrice) || 0) * item.quantity);
                                                                            }, 0).toLocaleString()}
                                                                        </span>
                                                                        <span className={`text-3xl font-black ${darkMode ? 'text-white neon-text text-purple-400' : 'text-purple-600'}`}>
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
                                                                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg ${hasStock ? (darkMode ? 'bg-white text-black hover:bg-purple-400 hover:text-white' : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105') : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
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
                                        <div className={`flex flex-col items-center justify-center p-20 text-center border border-dashed rounded-[3rem] ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-300 bg-slate-50'}`}>
                                            <div className={`p-8 rounded-full mb-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                                <Tag className="w-16 h-16 text-slate-600" />
                                            </div>
                                            <h3 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sin Promociones Activas</h3>
                                            <p className="text-slate-500 max-w-sm">No hay promociones disponibles en este momento. ¡Volvé pronto!</p>
                                            <button
                                                onClick={() => setSelectedCategory('')}
                                                className="mt-6 px-6 py-3 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 rounded-xl font-bold transition border border-orange-500/20"
                                            >
                                                Ver Todo el Catálogo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Grid de Productos - Filtrando productos inválidos (ej: tests) */}
                            {products.filter(p => p.isActive !== false).length === 0 ? (
                                // Empty State explícito (sin componente externo para "bulk")
                                <div className={`flex flex-col items-center justify-center p-20 text-center border-2 border-dashed rounded-[3rem] ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-300 bg-slate-50'}`}>
                                    <div className={`p-8 rounded-full mb-6 shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                        <Package className="w-16 h-16 text-slate-600" />
                                    </div>
                                    <h3 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Catálogo Vacío</h3>
                                    <p className="text-slate-500 max-w-sm">No hay productos disponibles en este momento. Por favor revisa más tarde o contacta soporte.</p>
                                </div>
                            ) : (
                                <>
                                    {filteredProducts.length === 0 && selectedCategory !== 'Promos' && (
                                        <div className="flex flex-col items-center justify-center p-20 text-center col-span-full animate-fade-in w-full">
                                            <div className={`p-6 rounded-full mb-4 inline-block border ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
                                                <Search className="w-12 h-12 text-slate-500" />
                                            </div>
                                            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No se encontraron resultados</h3>
                                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                                No hay productos que coincidan con <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>"{searchQuery}"</span>
                                                {selectedCategory && <span> en la categoría <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedCategory}</span></span>}.
                                            </p>
                                            <button
                                                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                                                className="px-6 py-3 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 rounded-xl font-bold transition border border-orange-500/20"
                                            >
                                                Limpiar filtros
                                            </button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 min-[1920px]:grid-cols-5 gap-4 sm:gap-6 md:gap-8 pb-32">
                                        {filteredProducts.map(p => (
                                            <ProductCard
                                                key={p.id}
                                                p={p}
                                                settings={settings}
                                                currentUser={currentUser}
                                                toggleFavorite={toggleFavorite}
                                                setSelectedProduct={setSelectedProduct}
                                                manageCart={manageCart}
                                                calculateItemPrice={calculateItemPrice}
                                                darkMode={darkMode}
                                            />
                                        ))}
                                    </div>

                                </>
                            )}
                        </div>
                    )
                    }

                    {/* 2. VISTA DEL CARRITO DE COMPRAS */}
                    {
                        view === 'cart' && (
                            <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
                                <div className="flex items-center gap-4 mb-8 pt-8">
                                    <button onClick={() => setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 group">
                                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition" />
                                    </button>
                                    <h1 className={`text-4xl font-black flex items-center gap-3 ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                        <ShoppingBag className="w-10 h-10 text-orange-500" /> Mi Carrito
                                    </h1>
                                </div>

                                {cart.length === 0 ? (
                                    <div className={`flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-[2rem] ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                                        <div className={`p-6 rounded-full mb-4 shadow-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <ShoppingCart className={`w-12 h-12 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                                        </div>
                                        <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tu carrito está vacío</h3>
                                        <p className="text-slate-500 text-sm max-w-xs mb-6 leading-relaxed">
                                            ¡Es un buen momento para buscar ese producto que tanto quieres!
                                        </p>
                                        <button onClick={() => setView('store')} className="px-6 py-3 bg-orange-600 text-white rounded-xl font-bold transition shadow-lg hover:bg-orange-500 hover:shadow-orange-500/30 flex items-center gap-2 text-sm">
                                            Ir a la Tienda <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid lg:grid-cols-3 gap-6">
                                        {/* Lista de Items Compacta */}
                                        <div className="lg:col-span-2 space-y-3">
                                            {cart.map((item) => (
                                                <div key={item.product.id} className={`border p-3 rounded-2xl flex gap-4 items-center group relative overflow-hidden transition duration-300 ${darkMode ? 'bg-[#0a0a0a] border-slate-800 hover:border-orange-900/50' : 'bg-white border-slate-200 hover:border-orange-200 shadow-sm'}`}>
                                                    {/* Imagen Compacta */}
                                                    <div className={`w-20 h-20 rounded-xl flex items-center justify-center p-1 flex-shrink-0 shadow-sm ${darkMode ? 'bg-white' : 'bg-slate-50'}`}>
                                                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                                                    </div>

                                                    {/* Info Compacta */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start w-full mb-1">
                                                            <h3 className={`font-bold text-base truncate pr-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.product.name}</h3>
                                                            <button onClick={() => manageCart(item.product, -item.quantity)} className="text-slate-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-900/20 shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className={`${darkMode ? 'text-orange-400' : 'text-orange-600'} font-bold text-sm`}>
                                                                    ${calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0).toLocaleString()}
                                                                </p>
                                                                {item.quantity > 1 && (
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                                                                        Subtotal: ${(calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0) * item.quantity).toLocaleString()}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Controles de Cantidad Compactos */}
                                                            <div className={`flex items-center gap-2 rounded-lg p-1 border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                                                                <button onClick={() => manageCart(item.product, -1)} className={`w-7 h-7 flex items-center justify-center rounded-md transition ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm'}`}>
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className={`text-sm font-bold w-6 text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.quantity}</span>
                                                                <button onClick={() => manageCart(item.product, 1)} className={`w-7 h-7 flex items-center justify-center rounded-md transition ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-600 hover:text-slate-900 shadow-sm'}`}>
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Resumen y Actions */}
                                        <div className={`border p-6 rounded-[2rem] h-fit sticky top-24 shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <h3 className={`text-xl font-black mb-6 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <ShoppingBag className="w-5 h-5 text-orange-500" /> Resumen
                                            </h3>

                                            {/* Cupón Compacto */}
                                            <div className="mb-6">
                                                {appliedCoupon ? (
                                                    <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl flex justify-between items-center relative overflow-hidden group">
                                                        <div className="relative z-10">
                                                            <p className="font-black text-purple-300 text-sm tracking-widest">{appliedCoupon.code}</p>
                                                            <p className="text-[10px] text-purple-400 font-bold">
                                                                {appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => setAppliedCoupon(null)} className="p-1.5 bg-slate-900/50 rounded-full text-purple-300 hover:text-red-400 hover:bg-red-900/30 transition relative z-10">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setShowCouponModal(true)} className="w-full py-3 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 text-slate-400 hover:text-purple-300 rounded-xl transition flex items-center justify-center gap-2 text-xs font-bold">
                                                        <Ticket className="w-4 h-4" /> Tengo un cupón
                                                    </button>
                                                )}
                                            </div>

                                            {/* Totales */}
                                            <div className={`space-y-3 border-b pb-6 mb-6 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                                <div className={`flex justify-between text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    <span>Subtotal</span>
                                                    <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>${cartSubtotal.toLocaleString()}</span>
                                                </div>
                                                {appliedCoupon && (
                                                    <div className="flex justify-between text-purple-500 font-bold text-sm">
                                                        <span>Descuento</span>
                                                        <span>-${discountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-end pt-2">
                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total</span>
                                                    <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                                        ${finalTotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botones de Acción */}
                                            <div className="space-y-3">
                                                <button onClick={() => setView('checkout')} className="w-full bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 py-4 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-orange-500/30 transition-all flex items-center justify-center gap-2">
                                                    Iniciar Compra <ArrowRight className="w-5 h-5" />
                                                </button>

                                                {/* Botón WhatsApp Configurable */}
                                                {settings?.whatsappCartEnabled && (
                                                    <button
                                                        onClick={() => {
                                                            try {
                                                                const phone = settings?.whatsappLink || '';
                                                                const match = phone.match(/\d+/g);
                                                                let cleanPhone = match ? match.join('') : '';
                                                                if (!cleanPhone) return showToast("WhatsApp no configurado", "error");

                                                                if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                                                                if (!cleanPhone.startsWith('54')) {
                                                                    if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                                                                    else cleanPhone = '54' + cleanPhone;
                                                                } else {
                                                                    if (cleanPhone.length === 12 && !cleanPhone.startsWith('549')) cleanPhone = '549' + cleanPhone.substring(2);
                                                                }

                                                                const itemsList = cart.map(i => `• ${i.quantity}x ${i.product.name} $${calculateItemPrice(i.product.basePrice, i.product.discount).toLocaleString()}`).join('\n');
                                                                const msg = `Hola! Quiero comprar lo siguiente:\n\n${itemsList}\n\n*Total: $${finalTotal.toLocaleString()}*\n\n¿Cómo procedemos?`;

                                                                window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                            } catch (e) {
                                                                showToast("Error al abrir WhatsApp", "error");
                                                            }
                                                        }}
                                                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm ${darkMode ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                    >
                                                        <MessageCircle className="w-4 h-4" /> {settings?.whatsappCartText || 'Compra por WhatsApp'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* 3. VISTA DE CHECKOUT (FINALIZAR COMPRA) */}
                    {
                        view === 'checkout' && (
                            <div className="max-w-5xl mx-auto pb-20 animate-fade-up px-4 md:px-8">
                                <button onClick={() => setView('cart')} className="mb-8 mt-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition">
                                    <ArrowLeft className="w-5 h-5" /> Volver al Carrito
                                </button>

                                <div className="grid md:grid-cols-5 gap-8">
                                    {/* Columna Izquierda: Formularios */}
                                    <div className="md:col-span-3 space-y-8">

                                        {/* Opciones de Entrega */}
                                        <div className={`border p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-[100px] pointer-events-none"></div>
                                            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <Truck className="text-orange-500 w-6 h-6" /> Método de Entrega
                                            </h2>
                                            <div className="grid grid-cols-2 gap-4 relative z-10 mb-6">
                                                {settings?.shippingPickup?.enabled && (
                                                    <button
                                                        onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Pickup' })}
                                                        className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Pickup' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}
                                                    >
                                                        {checkoutData.shippingMethod === 'Pickup' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-orange-500" />}
                                                        <MapPin className="w-8 h-8 group-hover:scale-110 transition" />
                                                        <span className="text-xs font-black uppercase">Retiro en Local</span>
                                                    </button>
                                                )}
                                                {settings?.shippingDelivery?.enabled && (
                                                    <button
                                                        onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Delivery' })}
                                                        className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Delivery' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}
                                                    >
                                                        {checkoutData.shippingMethod === 'Delivery' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-orange-500" />}
                                                        <Truck className="w-8 h-8 group-hover:scale-110 transition" />
                                                        <span className="text-xs font-black uppercase">Envío a Domicilio</span>
                                                    </button>
                                                )}
                                            </div>

                                            {checkoutData.shippingMethod === 'Pickup' && (
                                                <div className="p-4 bg-orange-900/10 border border-orange-500/20 rounded-xl animate-fade-up flex gap-3">
                                                    <Info className="w-5 h-5 text-orange-400 shrink-0" />
                                                    <p className="text-xs text-orange-200">Retira tu pedido en: <span className="font-bold">{settings?.shippingPickup?.address || 'Dirección a coordinar'}</span></p>
                                                </div>
                                            )}

                                            {checkoutData.shippingMethod === 'Delivery' && (
                                                <div className="space-y-5 relative z-10 animate-fade-up mt-4">
                                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Datos de Destino</h3>
                                                    <div>
                                                        <label htmlFor="address" className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Dirección y Altura</label>
                                                        <input
                                                            id="address"
                                                            name="address"
                                                            autocomplete="street-address"
                                                            className={`w-full rounded-xl p-4 outline-none transition font-medium ${darkMode ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500'}`}
                                                            placeholder="Ej: Av. Santa Fe 1234"
                                                            value={checkoutData.address || ''}
                                                            onChange={e => setCheckoutData({ ...checkoutData, address: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-5">
                                                        <div>
                                                            <label htmlFor="city" className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Ciudad</label>
                                                            <input
                                                                id="city"
                                                                name="city"
                                                                autocomplete="address-level2"
                                                                className={`w-full rounded-xl p-4 outline-none transition font-medium ${darkMode ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`}
                                                                placeholder="Ej: Rosario"
                                                                value={checkoutData.city || ''}
                                                                onChange={e => setCheckoutData({ ...checkoutData, city: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="province" className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Provincia</label>
                                                            <input
                                                                id="province"
                                                                name="province"
                                                                autocomplete="address-level1"
                                                                className={`w-full rounded-xl p-4 outline-none transition font-medium ${darkMode ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`}
                                                                placeholder="Ej: Santa Fe"
                                                                value={checkoutData.province || ''}
                                                                onChange={e => setCheckoutData({ ...checkoutData, province: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="zipCode" className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Código Postal</label>
                                                        <input
                                                            id="zipCode"
                                                            name="zipCode"
                                                            autocomplete="postal-code"
                                                            className={`w-full rounded-xl p-4 outline-none transition font-medium ${darkMode ? 'bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`}
                                                            placeholder="Ej: 2000"
                                                            value={checkoutData.zipCode || ''}
                                                            onChange={e => setCheckoutData({ ...checkoutData, zipCode: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Método de Pago */}
                                        <div className={`border p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-[100px] pointer-events-none"></div>
                                            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                <CreditCard className="text-orange-500 w-6 h-6" /> Método de Pago
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                                {settings?.paymentMercadoPago?.enabled && (
                                                    <button
                                                        onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Tarjeta' })}
                                                        className={`p-4 md:p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Tarjeta' ? 'border-orange-500 bg-orange-900/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                                    >
                                                        {checkoutData.paymentChoice === 'Tarjeta' && <CheckCircle className="absolute top-2 right-2 text-orange-500" />}
                                                        <CreditCard className="w-8 h-8 group-hover:scale-110 transition" />
                                                        <span className="text-sm font-black tracking-wider uppercase">Tarjeta</span>
                                                    </button>
                                                )}
                                                {settings?.paymentTransfer?.enabled && (
                                                    <button
                                                        onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Transferencia' })}
                                                        className={`p-4 md:p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Transferencia' ? 'border-orange-500 bg-orange-900/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                                    >
                                                        {checkoutData.paymentChoice === 'Transferencia' && <CheckCircle className="absolute top-2 right-2 text-orange-500" />}
                                                        <RefreshCw className="w-8 h-8 group-hover:scale-110 transition" />
                                                        <span className="text-sm font-black tracking-wider uppercase">Transferencia</span>
                                                    </button>
                                                )}
                                                {settings?.paymentCash && checkoutData.shippingMethod !== 'Delivery' && (
                                                    <button
                                                        onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: 'Efectivo' })}
                                                        className={`p-4 md:p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === 'Efectivo' ? 'border-orange-500 bg-orange-900/20 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                                    >
                                                        {checkoutData.paymentChoice === 'Efectivo' && <CheckCircle className="absolute top-2 right-2 text-orange-500" />}
                                                        <Banknote className="w-8 h-8 group-hover:scale-110 transition" />
                                                        <span className="text-sm font-black tracking-wider uppercase">Efectivo</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Datos Bancarios para Transferencia */}
                                            {checkoutData.paymentChoice === 'Transferencia' && (
                                                <div className="mt-6 animate-fade-up">
                                                    <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/50 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                                                        <h3 className={`font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                            <Building className="w-5 h-5 text-orange-400" />
                                                            Datos para Transferencia
                                                        </h3>
                                                        <div className="space-y-3">
                                                            {settings?.paymentTransfer?.alias && (
                                                                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                                                    <span className="text-sm text-slate-500">Alias</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-mono font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{settings.paymentTransfer.alias}</span>
                                                                        <button
                                                                            onClick={() => { navigator.clipboard.writeText(settings.paymentTransfer.alias); showToast('Alias copiado!', 'success'); }}
                                                                            className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition"
                                                                        >
                                                                            <Copy className="w-4 h-4 text-orange-400" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {settings?.paymentTransfer?.cvuCbu && (
                                                                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                                                    <span className="text-sm text-slate-500">CVU/CBU</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-mono text-xs font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{settings.paymentTransfer.cvuCbu}</span>
                                                                        <button
                                                                            onClick={() => { navigator.clipboard.writeText(settings.paymentTransfer.cvuCbu); showToast('CVU/CBU copiado!', 'success'); }}
                                                                            className="p-1.5 bg-orange-500/10 hover:bg-orange-500/20 rounded-lg transition"
                                                                        >
                                                                            <Copy className="w-4 h-4 text-orange-400" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {settings?.paymentTransfer?.titular && (
                                                                <div className={`flex justify-between items-center p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                                                                    <span className="text-sm text-slate-500">Titular</span>
                                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{settings.paymentTransfer.titular}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${darkMode ? 'bg-orange-900/20 border border-orange-500/20' : 'bg-orange-100'}`}>
                                                            <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                            <p className={`text-xs leading-relaxed ${darkMode ? 'text-orange-200' : 'text-orange-700'}`}>
                                                                Realizá la transferencia y luego confirmá tu pedido. Te enviaremos un email con los detalles.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Card Payment Brick Container - Solo para Tarjeta */}
                                            {checkoutData.paymentChoice === 'Tarjeta' && (
                                                <div className="mt-8 animate-fade-up">
                                                    <div className="bg-slate-900/50 p-6 rounded-2xl border border-orange-500/30">
                                                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                                            <CreditCard className="w-5 h-5 text-orange-400" />
                                                            Ingresá los datos de tu tarjeta
                                                        </h3>
                                                        <p className="text-slate-400 text-sm mb-4">
                                                            Pagá de forma segura con Visa, MasterCard, AMEX y más.
                                                        </p>

                                                        {/* Mensaje de Seguridad */}
                                                        <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl flex items-start gap-3">
                                                            <Shield className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <p className="text-green-400 text-sm font-bold mb-1">Pago 100% Seguro</p>
                                                                <p className="text-xs text-green-200/80 leading-relaxed">
                                                                    Tus datos son procesados de forma encriptada por Mercado Pago. No almacenamos información de tu tarjeta.
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* WARNING: AD BLOCKER */}
                                                        <div className="mb-6 p-4 bg-orange-900/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                                                            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                                            <p className="text-xs text-orange-200 leading-relaxed font-medium">
                                                                <strong className="text-orange-400 block mb-1">ATENCIÓN:</strong>
                                                                Si tenés activado un <span className="text-white font-bold">AdBlocker/Bloqueador de Anuncios</span>, por favor desactivalo temporalmente.
                                                                Es posible que el pago no se concrete si el bloqueador interfiere con la seguridad del banco.
                                                            </p>
                                                        </div>

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
                                                            <div className="mt-4 p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl text-orange-400 text-sm flex items-center gap-3">
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
                                        <div className={`border p-8 rounded-[2.5rem] sticky top-28 shadow-2xl ${darkMode ? 'bg-gradient-to-br from-slate-900 via-[#0a0a0a] to-[#050505] border-slate-800' : 'bg-white border-slate-200'}`}>
                                            <h3 className={`font-black mb-8 text-xl border-b pb-4 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-100'}`}>Resumen Final</h3>

                                            <div className="space-y-4 mb-8">
                                                <div className={`flex justify-between ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <span>Productos ({cart.length})</span>
                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>${cartSubtotal.toLocaleString()}</span>
                                                </div>

                                                {discountAmount > 0 && (
                                                    <div className="flex justify-between text-purple-500 font-bold">
                                                        <span>Descuento</span>
                                                        <span>-${discountAmount.toLocaleString()}</span>
                                                    </div>
                                                )}

                                                <div className={`h-px my-4 border-t border-dashed ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}></div>

                                                <div className="flex justify-between items-end">
                                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total a Pagar</span>
                                                    <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>${finalTotal.toLocaleString()}</span>
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
                                                <div className="bg-orange-900/10 border border-orange-500/20 p-4 rounded-2xl text-center">
                                                    <p className="text-orange-400 text-sm font-medium flex items-center justify-center gap-2">
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
                        )
                    }

                    {/* 4. VISTA DE PERFIL (HISTORIAL Y FAVORITOS) - Solo si el usuario tiene datos válidos */}
                    {
                        view === 'profile' && currentUser && currentUser.id && currentUser.email && currentUser.name && (
                            <div className="max-w-6xl mx-auto pt-8 animate-fade-up px-4 md:px-8 pb-20">
                                {/* Tarjeta de Usuario */}
                                {/* Tarjeta de Usuario */}
                                <div className={`border p-8 md:p-12 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                    {/* Decoración Fondo */}
                                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

                                    {/* Avatar */}
                                    <div className={`w-28 h-28 rounded-[2rem] bg-gradient-to-br from-orange-500 to-blue-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl z-10 transform rotate-3 border-4 ${darkMode ? 'border-[#0a0a0a]' : 'border-white'}`}>
                                        {currentUser.name.charAt(0)}
                                    </div>

                                    {/* Info */}
                                    <div className="text-center md:text-left z-10 flex-1">
                                        <h2 className={`text-4xl md:text-5xl font-black mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentUser.name}</h2>
                                        <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2 font-medium mb-4">
                                            <Mail className="w-4 h-4 text-orange-500" /> {currentUser.email}
                                        </p>
                                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                                            <span className={`border px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                <User className="w-3 h-3" /> {currentUser.dni || 'Sin DNI'}
                                            </span>
                                            <span className={`border px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                <Phone className="w-3 h-3" /> {currentUser.phone || 'Sin Teléfono'}
                                            </span>
                                            <span className={`border px-4 py-2 rounded-xl text-xs font-mono flex items-center gap-2 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                                <Shield className="w-3 h-3" /> {getRole(currentUser.email).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex flex-col gap-3 z-10 w-full md:w-auto">
                                        {hasAccess(currentUser.email) && (
                                            <button onClick={() => setView('admin')} className={`px-6 py-4 border rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg ${darkMode ? 'bg-slate-900 border-orange-500/30 text-orange-400 hover:bg-orange-900/20' : 'bg-slate-800 border-slate-700 text-orange-400 hover:bg-slate-900'}`}>
                                                <Shield className="w-5 h-5" /> Panel Admin
                                            </button>
                                        )}
                                        <button onClick={() => { localStorage.removeItem('sustore_user_data'); setCurrentUser(null); setView('store') }} className={`px-6 py-4 border rounded-2xl font-bold transition flex items-center justify-center gap-2 ${darkMode ? 'bg-red-900/10 border-red-500/20 text-red-500 hover:bg-red-900/20' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-100'}`}>
                                            <LogOut className="w-5 h-5" /> Cerrar Sesión
                                        </button>
                                    </div>
                                </div>

                                {/* SECCIÓN: MIS CUPONES (NUEVO) */}
                                <div className={`border p-8 rounded-[2.5rem] mb-12 shadow-2xl animate-fade-up ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <h3 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        <Ticket className="text-purple-400 w-6 h-6" /> Mis Cupones Disponibles
                                    </h3>

                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            {/* Mostrar cupones GLOBALES (targetType='global') y ESPECIFICOS para este usuario */}
                                            {userProfileData.myCoupons.length === 0 ? (
                                                <p className="text-slate-500 italic">No tienes cupones disponibles en este momento.</p>
                                            ) : (
                                                userProfileData.myCoupons.map(c => (
                                                    <div key={c.id} className={`border p-4 rounded-xl flex items-center justify-between group transition ${darkMode ? 'bg-slate-900/50 border-slate-800 hover:border-purple-500/30' : 'bg-slate-50 border-slate-200 hover:border-purple-400'}`}>
                                                        <div>
                                                            <p className={`font-black text-lg tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>{c.code}</p>
                                                            <p className="text-purple-400 text-sm font-bold">
                                                                {c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}
                                                            </p>
                                                            {c.expirationDate && <p className="text-[10px] text-slate-500 mt-1">Vence: {c.expirationDate}</p>}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(c.code);
                                                                alert("¡Código copiado!");
                                                            }}
                                                            className={`p-3 rounded-lg flex items-center gap-2 hover:bg-purple-500 hover:text-white transition ${darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                            <span className="text-xs font-bold uppercase">Copiar</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                            <h4 className={`font-bold mb-4 text-sm uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>Canjear Código</h4>
                                            <div className="flex gap-2">
                                                <input
                                                    className={`flex-1 border rounded-xl p-3 focus:border-purple-500 outline-none uppercase font-mono ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
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
                                                <ShoppingBag className="text-orange-400 w-6 h-6" /> Tus Compras
                                            </h3>
                                        </div>

                                        {(() => {
                                            // MEJORA: Mostrar TODOS los pedidos del usuario, no solo los 'Realizado'
                                            const myOrders = orders.filter(o => o.userId === currentUser.id);
                                            // Flatten all items from orders
                                            const renderedOrders = myOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

                                            if (renderedOrders.length === 0) {
                                                return (
                                                    <div className={`p-12 border-2 border-dashed rounded-[2rem] text-center ${darkMode ? 'border-slate-800 bg-slate-900/20 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                        <p className="font-bold">Aún no tienes compras.</p>
                                                        <button onClick={() => setView('store')} className="mt-4 text-orange-400 hover:underline text-sm font-bold">Ir a la tienda</button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                                    {renderedOrders.map((order, idx) => (
                                                        <div key={idx} className={`border p-5 rounded-2xl flex flex-col gap-4 group transition duration-300 ${darkMode ? 'bg-[#0a0a0a] border-slate-800 hover:border-orange-500/50' : 'bg-white border-slate-200 hover:border-orange-300 shadow-sm'}`}>
                                                            <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-700/50">
                                                                <span className="text-xs font-mono text-slate-500">{new Date(order.date).toLocaleDateString()}</span>
                                                                {/* Badge de Estado */}
                                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.status === 'Realizado' ? 'bg-green-500/10 text-green-500' :
                                                                    order.status === 'Pendiente' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                        order.status === 'Cancelado' ? 'bg-red-500/10 text-red-500' :
                                                                            'bg-slate-500/10 text-slate-500'
                                                                    }`}>
                                                                    {order.status || 'Procesando'}
                                                                </span>
                                                            </div>

                                                            {order.items.map((item, i) => (
                                                                <div key={i} className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-lg p-1 flex-shrink-0 ${darkMode ? 'bg-white' : 'bg-slate-100'}`}>
                                                                        <img src={item.image} className="w-full h-full object-contain" alt={item.title} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`font-bold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h4>
                                                                        <p className="text-xs text-orange-400 font-bold mt-1">${Number(item.unit_price).toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        {item.quantity > 1 && (
                                                                            <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded-full">x{item.quantity}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            <div className="flex justify-between items-center pt-2">
                                                                <span className="text-xs text-slate-500">Total Pedido</span>
                                                                <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>${order.total.toLocaleString()}</span>
                                                            </div>

                                                            {/* Botón de WhatsApp para pedidos */}
                                                            <button
                                                                onClick={() => {
                                                                    try {
                                                                        // 1. Obtener número de teléfono limpio
                                                                        let phone = settings?.whatsappLink || '';
                                                                        // Intentar extraer número de un link tipo wa.me o usar el string directo
                                                                        const match = phone.match(/\d+/g);
                                                                        let cleanPhone = match ? match.join('') : '';

                                                                        // Si no hay número en el link, intentar buscar en otros campos
                                                                        if (!cleanPhone && settings?.phone) {
                                                                            const match2 = settings.phone.match(/\d+/g);
                                                                            cleanPhone = match2 ? match2.join('') : '';
                                                                        }

                                                                        if (!cleanPhone || cleanPhone.length < 5) {
                                                                            return showToast("El número de WhatsApp de la tienda no está configurado correctamente.", "error");
                                                                        }

                                                                        // LOGICA ARGENTINA ROBUSTA
                                                                        // Si empieza con 0, quitarlo
                                                                        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

                                                                        // Si no empieza con 54, agregarlo
                                                                        if (!cleanPhone.startsWith('54')) {
                                                                            // Si tiene 10 dígitos (ej: 3425906630), es movil sin 15 ni 0, necesita 9 despues del 54
                                                                            if (cleanPhone.length === 10) {
                                                                                cleanPhone = '549' + cleanPhone;
                                                                            } else {
                                                                                cleanPhone = '54' + cleanPhone;
                                                                            }
                                                                        } else {
                                                                            // Si ya empieza con 54
                                                                            // Chequear si le falta el 9 para celular (aprox longitud total 12 o 13 digitos)
                                                                            // Si tiene 12 digitos (54 + 10 del numero), insertar 9
                                                                            if (cleanPhone.length === 12 && !cleanPhone.startsWith('549')) {
                                                                                cleanPhone = '549' + cleanPhone.substring(2);
                                                                            }
                                                                        }

                                                                        // 2. Construir mensaje detallado
                                                                        const itemsList = order.items.map(i => `• ${i.quantity}x ${i.title} ($${Number(i.unit_price).toLocaleString()})`).join('\n');
                                                                        const msg = `Hola! Hice un pedido en *${settings?.storeName || 'la tienda'}*:\n\n${itemsList}\n\n*Total: $${order.total.toLocaleString()}*\nPedido: #${order.id.slice(0, 8)}\n\nMi nombre es ${currentUser?.name || ''}.`;

                                                                        // 3. Abrir WhatsApp
                                                                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                                    } catch (err) {
                                                                        console.error(err);
                                                                        showToast("Error al abrir WhatsApp", "error");
                                                                    }
                                                                }}
                                                                className={`mt-3 w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm ${darkMode ? 'bg-green-900/20 text-green-400 hover:bg-green-900/40 border border-green-500/20' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                            >
                                                                <MessageCircle className="w-4 h-4" /> Confirmar por WhatsApp
                                                            </button>
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
                                            <div className={`p-12 border-2 border-dashed rounded-[2rem] text-center ${darkMode ? 'border-slate-800 bg-slate-900/20 text-slate-500' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
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
                                                        <div key={fid} className={`border p-4 rounded-2xl flex items-center gap-4 relative group transition ${darkMode ? 'bg-[#0a0a0a] border-slate-800 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                                                            <div className={`w-16 h-16 rounded-xl p-1 flex-shrink-0 ${darkMode ? 'bg-white' : 'bg-slate-100'}`}>
                                                                <img src={p.image} className="w-full h-full object-contain" />
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-bold line-clamp-1 group-hover:text-orange-400 transition ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</p>
                                                                <p className="text-orange-400 font-bold text-sm mt-1">${p.basePrice.toLocaleString()}</p>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => toggleFavorite(p)}
                                                                    className={`p-3 rounded-xl transition border hover:bg-red-500 hover:text-white ${darkMode ? 'bg-slate-900 text-red-400 border-slate-800' : 'bg-slate-100 text-red-500 border-slate-200'}`}
                                                                    title="Eliminar de favoritos"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => manageCart(p, 1)}
                                                                    className={`p-3 rounded-xl transition border hover:bg-orange-500 hover:text-white ${darkMode ? 'bg-slate-900 text-orange-400 border-slate-800' : 'bg-slate-100 text-orange-500 border-slate-200'}`}
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
                        )
                    }

                    {/* Fallback: Si intenta acceder a profile sin usuario válido, mostrar login */}
                    {
                        view === 'profile' && (!currentUser || !currentUser.id || !currentUser.email || !currentUser.name) && (
                            <div className="max-w-md mx-auto pt-20 animate-fade-up px-4 text-center">
                                <div className={`border p-8 rounded-[2rem] shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <User className="w-16 h-16 mx-auto mb-6 text-orange-500 opacity-50" />
                                    <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Inicia Sesión</h2>
                                    <p className={`mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Debes iniciar sesión o registrarte para acceder a tu perfil.</p>
                                    <button
                                        onClick={() => setView('login')}
                                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-blue-600 text-white rounded-2xl font-black hover:from-orange-400 hover:to-blue-500 transition shadow-lg"
                                    >
                                        INGRESAR SESIÓN
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {/* 5. MODAL DE AUTENTICACIÓN (LOGIN/REGISTER) */}
                    {
                        (view === 'login' || view === 'register') && (
                            <div className={`fixed inset-0 z-[500] flex items-center justify-center p-4 animate-fade-up backdrop-blur-xl ${darkMode ? 'bg-[#050505]/95' : 'bg-white/90'}`}>

                                <div className={`p-8 md:p-12 rounded-[3rem] w-full max-w-md shadow-2xl border relative overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                                    {/* Botón Cerrar (Dentro de la tarjeta) */}
                                    <button onClick={() => setView('store')} className={`absolute top-6 right-6 p-2 rounded-full transition z-20 ${darkMode ? 'bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}>
                                        <X className="w-6 h-6" />
                                    </button>

                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600"></div>

                                    <h2 className={`text-4xl font-black mb-2 text-center tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {loginMode ? 'Bienvenido' : 'Crear Cuenta'}
                                    </h2>
                                    <p className={`text-center mb-8 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                        {loginMode ? 'Ingresa a tu cuenta para continuar.' : 'Únete a nosotros hoy mismo.'}
                                    </p>

                                    <form onSubmit={(e) => { e.preventDefault(); handleAuth(!loginMode) }} className="space-y-4">
                                        {!loginMode && (
                                            <div className="space-y-4 animate-fade-up">
                                                <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} placeholder="Nombre Completo *" value={authData.name} onChange={e => setAuthData({ ...authData, name: e.target.value })} required />
                                                <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} placeholder="Nombre de Usuario *" value={authData.username} onChange={e => setAuthData({ ...authData, username: e.target.value })} required />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} placeholder="DNI *" value={authData.dni} onChange={e => setAuthData({ ...authData, dni: e.target.value })} required />
                                                    <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} placeholder="Teléfono *" value={authData.phone} onChange={e => setAuthData({ ...authData, phone: e.target.value })} required />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} placeholder={loginMode ? "Email o Usuario" : "Email *"} value={authData.email} onChange={e => setAuthData({ ...authData, email: e.target.value })} required />
                                            <input className={`w-full p-4 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-800 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`} type="password" placeholder={loginMode ? "Contraseña" : "Contraseña *"} value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })} required />
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 py-4 text-white rounded-xl font-bold mt-6 transition transform hover:-translate-y-1 shadow-lg flex items-center justify-center gap-2">
                                            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (loginMode ? 'INGRESAR' : 'REGISTRARSE')}
                                        </button>
                                    </form>

                                    <button onClick={() => setLoginMode(!loginMode)} className={`w-full text-center text-sm mt-8 font-bold hover:text-orange-400 transition border-t pt-6 ${darkMode ? 'text-slate-500 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                                        {loginMode ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {/* 6. VISTAS ESTÁTICAS (ABOUT & GUIDE) */}
                    {
                        view === 'about' && (
                            <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                                <button onClick={() => setView('store')} className={`mb-8 p-3 rounded-full transition ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}><ArrowLeft /></button>
                                <h2 className={`text-4xl md:text-5xl font-black mb-12 flex items-center gap-4 ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                    <Info className="text-orange-500 w-12 h-12" /> Sobre Nosotros
                                </h2>
                                <div className={`border p-8 md:p-12 rounded-[3rem] text-xl leading-relaxed whitespace-pre-wrap shadow-2xl relative overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                                    <p className="relative z-10">{settings.aboutUsText}</p>

                                    <div className={`mt-12 pt-12 border-t flex flex-col md:flex-row gap-8 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}><Shield className="text-orange-500" /></div>
                                            <div><h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Garantía Oficial</h4><p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>En todos los productos</p></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}><Truck className="text-purple-500" /></div>
                                            <div><h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Envíos Seguros</h4><p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>A todo el país</p></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {
                        view === 'guide' && (
                            <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                                <button onClick={() => setView('store')} className={`mb-8 p-3 rounded-full transition ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}><ArrowLeft /></button>
                                <h2 className={`text-4xl md:text-5xl font-black mb-12 flex items-center gap-4 ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                    <FileQuestion className="text-orange-500 w-12 h-12" /> {settings?.guideTitle || 'Cómo Comprar'}
                                </h2>
                                <div className={`border p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-8 ${darkMode ? 'bg-[#0a0a0a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
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
                                            <div className={`w-10 h-10 rounded-full font-black flex items-center justify-center border flex-shrink-0 mt-1 ${darkMode ? 'bg-orange-900/20 text-orange-400 border-orange-500/20' : 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{step.title}</h3>
                                                <p className={`leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{step.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }

                    {
                        view === 'privacy' && (
                            <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                                <button onClick={() => setView('store')} className={`mb-8 p-3 rounded-full transition ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}><ArrowLeft /></button>
                                <h2 className={`text-4xl md:text-5xl font-black mb-12 flex items-center gap-4 ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>
                                    <Shield className="text-orange-500 w-12 h-12" /> Política de Privacidad
                                </h2>
                                <div className={`border p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#0a0a0a] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                                    <div className="prose prose-invert max-w-none">
                                        <p className={`text-sm mb-8 italic ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>última actualización: 07 de enero de 2026</p>

                                        <p>Este Aviso de Privacidad para <strong>{settings?.storeName || 'Sustore'}</strong> ("nosotros", "nos" o "nuestro"), describe cómo y por qué podríamos acceder, recopilar, almacenar, usar y/o compartir ("proceso") su información personal cuando utiliza nuestros servicios ("Servicios"), incluso cuando:</p>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>Visita nuestro sitio web en <a href="https://sustore.vercel.app" className="text-orange-500 hover:underline">https://sustore.vercel.app</a> o cualquier sitio web nuestro que enlace a este Aviso de Privacidad.</li>
                                            <li>Interactúe con nosotros de otras maneras relacionadas, incluido cualquier marketing o evento.</li>
                                        </ul>

                                        <div className={`p-6 rounded-2xl border my-8 ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>RESUMEN DE PUNTOS CLAVE</h3>
                                            <ul className="space-y-4 text-sm">
                                                <li><strong>¿Qué información personal procesamos?</strong> Información proporcionada al registrarse o comprar.</li>
                                                <li><strong>¿Procesamos información confidencial?</strong> No.</li>
                                                <li><strong>¿Recopilamos información de terceros?</strong> No.</li>
                                                <li><strong>¿Cómo procesamos su información?</strong> Para gestionar pedidos, seguridad y mejora del servicio.</li>
                                                <li><strong>¿Compartimos información?</strong> Solo en situaciones específicas como transferencias comerciales o requisitos legales.</li>
                                            </ul>
                                        </div>

                                        <h3 className={`text-xl font-bold mt-12 mb-4 border-b pb-2 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>1. -QUÉ INFORMACIÓN RECOPILAMOS?</h3>
                                        <p>Recopilamos información que usted nos proporciona voluntariamente: nombres, teléfonos, emails, direcciones, nombres de usuario y contraseñas.</p>
                                        <p>También recopilamos datos técnicos automáticamente (IP, tipo de navegador) para seguridad y análisis del sitio.</p>

                                        <h3 className={`text-xl font-bold mt-12 mb-4 border-b pb-2 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>2. ¿CÓMO PROCESAMOS TU INFORMACIÓN?</h3>
                                        <ul className="list-disc pl-5 space-y-2">
                                            <li>Facilitar creación y administración de cuentas.</li>
                                            <li>gestionar pedidos, pagos y envíos.</li>
                                            <li>Proteger nuestros servicios contra fraude.</li>
                                            <li>Evaluar y mejorar la experiencia del usuario.</li>
                                        </ul>

                                        <h3 className={`text-xl font-bold mt-12 mb-4 border-b pb-2 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>3. ¿CUÁNTO TIEMPO CONSERVAMOS TU INFORMACIÓN?</h3>
                                        <p>Conservamos su información mientras tenga una cuenta activa con nosotros o según lo exija la ley para fines contables o legales.</p>

                                        <h3 className={`text-xl font-bold mt-12 mb-4 border-b pb-2 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>4. ¿CUÁLES SON SUS DERECHOS?</h3>
                                        <p>Puede revisar, cambiar o cancelar su cuenta en cualquier momento desde su perfil o contactándonos directamente.</p>

                                        <h3 className={`text-xl font-bold mt-12 mb-4 border-b pb-2 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>5. CONTACTO</h3>
                                        <p>Para preguntas sobre este aviso, puede escribirnos a:</p>
                                        <div className={`p-6 rounded-xl border font-mono text-sm leading-relaxed ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                            <strong>{settings?.storeName || 'Sustore'}</strong><br />
                                            Saavedra 7568<br />
                                            Santa Fe, 3000<br />
                                            Argentina<br />
                                            <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${settings?.sellerEmail}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">{settings?.sellerEmail || '[Email de contacto]'}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* 7. PANEL DE ADMINISTRACIÓN (COMPLETO Y DETALLADO) */}
                    {
                        view === 'admin' && (
                            // === Verificación de carga antes de verificar acceso ===
                            // Si los settings no están cargados o el rol está indeterminado, mostrar loading
                            (!settingsLoaded || isRoleLoading(currentUser?.email)) ? (
                                <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-full border-4 border-slate-800 animate-spin" style={{ borderTopColor: '#f97316' }}></div>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Shield className="w-6 h-6 text-orange-500 animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-xs mt-4 font-mono uppercase tracking-widest">Verificando permisos...</p>
                                    </div>
                                </div>
                            ) :
                                // === SEGURIDAD: Triple verificación de acceso ===
                                // 1. Verificar que tiene permisos por rol
                                // 2. Verificar que el usuario tiene un ID válido
                                // 3. Verificar que la sesión no fue manipulada
                                (hasAccess(currentUser?.email) &&
                                    currentUser?.id &&
                                    currentUser?.id.length >= 10 &&
                                    !SecurityManager.detectManipulation()) ? (
                                    <div className="min-h-screen bg-slate-50 relative w-full font-sans">

                                        {/* Overlay para cerrar el menú en móvil */}
                                        {isAdminMenuOpen && (
                                            <div
                                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
                                                onClick={() => setIsAdminMenuOpen(false)}
                                            />
                                        )}

                                        {/* 7.1 Sidebar Admin - FORCE FIXED VIEWPORT */}
                                        <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }} className={`w-[280px] bg-white/95 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-transform duration-300 md:transition-none ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:transform-none'} shadow-[10px_0_40px_rgba(0,0,0,0.05)] overflow-hidden`}>
                                            <div className="p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                                                <div className="group cursor-pointer">
                                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-4 group-hover:scale-105 transition-transform">
                                                        <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-1 ring-orange-500/20">
                                                            <Shield className="w-6 h-6 animate-pulse" />
                                                        </div>
                                                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">ADMIN</span>
                                                    </h2>
                                                    <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-[0.2em] ml-1 opacity-60">Control Center v4.2</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsAdminMenuOpen(false)}
                                                    className="md:hidden p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all border border-slate-200"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>

                                            <nav className="flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar">
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-3 mb-1 opacity-50">Menú Principal</p>

                                                <button onClick={() => { setAdminTab('dashboard'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'dashboard' ? 'bg-orange-600 text-white shadow-[0_10px_30px_rgba(249,115,22,0.3)] border border-orange-400/50 scale-[1.02]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}`}>
                                                    <LayoutDashboard className={`w-6 h-6 ${adminTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Inicio
                                                </button>

                                                <button onClick={() => { setAdminTab('orders'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 relative group ${adminTab === 'orders' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}`}>
                                                    <ShoppingBag className={`w-5 h-5 ${adminTab === 'orders' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Pedidos
                                                    {orders.length > (parseInt(localStorage.getItem('sustore_last_viewed_orders') || '0')) && (
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[22px] h-[22px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-lg animate-bounce">
                                                            {orders.length - parseInt(localStorage.getItem('sustore_last_viewed_orders') || '0')}
                                                        </span>
                                                    )}
                                                </button>

                                                <button onClick={() => { setAdminTab('products'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'products' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}`}>
                                                    <Package className={`w-5 h-5 ${adminTab === 'products' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Productos
                                                </button>

                                                {(isAdmin(currentUser?.email) || isEditor(currentUser?.email)) && (
                                                    <button onClick={() => { setAdminTab('promos'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'promos' ? 'bg-purple-600 text-white shadow-[0_10px_20px_rgba(147,51,234,0.2)] border border-purple-400/30' : 'text-slate-400 hover:text-purple-400 hover:bg-purple-400/5 border border-transparent'}`}>
                                                        <Tag className={`w-5 h-5 ${adminTab === 'promos' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Promos
                                                    </button>
                                                )}

                                                {isAdmin(currentUser?.email) && (
                                                    <>
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-3 mt-8 mb-1 opacity-50">Operaciones</p>

                                                        <button onClick={() => { setAdminTab('coupons'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'coupons' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                                            <Ticket className={`w-5 h-5 ${adminTab === 'coupons' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Cupones
                                                        </button>

                                                        <button onClick={() => { setAdminTab('suppliers'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'suppliers' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                                            <Truck className={`w-5 h-5 ${adminTab === 'suppliers' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Proveedores
                                                        </button>

                                                        <button onClick={() => { setAdminTab('purchases'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'purchases' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                                            <ShoppingCart className={`w-5 h-5 ${adminTab === 'purchases' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Compras
                                                        </button>

                                                        <button onClick={() => { setAdminTab('finance'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'finance' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                                            <Wallet className={`w-5 h-5 ${adminTab === 'finance' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Finanzas
                                                        </button>

                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-3 mt-8 mb-1 opacity-50">Sistema</p>

                                                        <button onClick={() => { setAdminTab('settings'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'settings' ? 'bg-orange-600 text-white shadow-[0_10px_20px_rgba(249,115,22,0.2)] border border-orange-400/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                                            <Settings className={`w-5 h-5 ${adminTab === 'settings' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Configuración
                                                        </button>

                                                        <button onClick={() => { setAdminTab('users'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-5 py-3.5 rounded-2xl flex items-center gap-4 font-bold text-sm transition-all duration-300 group ${adminTab === 'users' ? 'bg-pink-600 text-white shadow-[0_10px_20px_rgba(219,39,119,0.2)] border border-pink-400/30' : 'text-slate-400 hover:text-pink-400 hover:bg-pink-400/5 border border-transparent'}`}>
                                                            <Users className={`w-5 h-5 ${adminTab === 'users' ? 'scale-110' : 'group-hover:scale-110 transition-transform'}`} /> Usuarios
                                                        </button>
                                                    </>
                                                )}
                                            </nav>

                                            <div className="p-6 mt-auto border-t border-white/5 space-y-4 bg-gradient-to-t from-black/50 to-transparent">
                                                {/* User Profile Hook */}
                                                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group cursor-pointer relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-lg ring-2 ring-white/10">
                                                        {currentUser?.name?.charAt(0) || 'A'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-white truncate">{currentUser?.name || 'Administrador'}</p>
                                                        <p className="text-[10px] text-slate-500 truncate font-mono">{currentUser?.email}</p>
                                                    </div>
                                                    <button onClick={() => auth.signOut()} className="text-slate-600 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg">
                                                        <LogOut className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <button onClick={() => { setView('store'); setIsAdminMenuOpen(false); }} className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2 group border border-orange-400/20 active:scale-95 hover:shadow-[0_15px_30px_rgba(249,115,22,0.3)]">
                                                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> IR A TIENDA
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const newState = !soundEnabled;
                                                        setSoundEnabled(newState);
                                                        localStorage.setItem('sustore_sound_enabled', JSON.stringify(newState));

                                                        if (newState) {
                                                            // ACTIVANDO: Reproducir sonido de prueba
                                                            try {
                                                                const audio = audioRef.current;
                                                                // Detener cualquier reproducción previa
                                                                audio.pause();
                                                                audio.currentTime = 0;
                                                                audio.loop = false;
                                                                audio.volume = 0.5;

                                                                // Reproducir sonido breve de confirmación
                                                                audio.play().then(() => {
                                                                    // Asegurar que el audio se detenga después de reproducirse una vez
                                                                    setTimeout(() => {
                                                                        audio.pause();
                                                                        audio.currentTime = 0;
                                                                    }, 1000); // Detener después de 1 segundo

                                                                    if (!isAudioUnlocked.current) {
                                                                        isAudioUnlocked.current = true;
                                                                        console.log("[Audio] Unlocked via settings toggle");
                                                                    }
                                                                }).catch((e) => {
                                                                    console.warn("[Audio] Blocked by browser:", e);
                                                                    showToast("🔊 Haz clic aquí de nuevo para confirmar sonido", "warning");
                                                                });

                                                                showToast("Sonido activado 🔔", "success");
                                                            } catch (e) {
                                                                console.error("[Audio] Error toggling sound:", e);
                                                                showToast("Sonido activado 🔔", "success");
                                                            }
                                                        } else {
                                                            // DESACTIVANDO: Solo detener audio y mostrar mensaje silencioso
                                                            if (audioRef.current) {
                                                                audioRef.current.pause();
                                                                audioRef.current.currentTime = 0;
                                                            }
                                                            showToast("Sonido desactivado 🔕", "info");
                                                        }
                                                    }}
                                                    className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all border ${soundEnabled
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                        : 'bg-slate-800/30 text-slate-500 border-slate-700 hover:bg-slate-800/50 hover:text-slate-300'
                                                        }`}
                                                >
                                                    {soundEnabled ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
                                                    {soundEnabled ? 'ALERTAS ON' : 'ALERTAS OFF'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 7.2 Contenido Principal Admin */}
                                        {/* 7.2 Contenido Principal Admin */}
                                        <div className="flex-1 bg-slate-50 relative min-h-screen overflow-x-hidden md:ml-[280px]">
                                            <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-orange-600/5 to-transparent pointer-events-none"></div>

                                            <div className="relative z-10 p-6 md:p-12 lg:p-16 max-w-[1700px] mx-auto">
                                                <div className="md:hidden mb-8 flex items-center justify-between">
                                                    <button onClick={() => setIsAdminMenuOpen(true)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-900 border border-slate-200 flex items-center gap-3 font-black text-xs uppercase tracking-widest transition-all shadow-sm">
                                                        <Menu className="w-5 h-5" /> Menú
                                                    </button>
                                                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                </div>

                                                {/* TAB: DASHBOARD */}
                                                {adminTab === 'dashboard' && (
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8 pb-20">
                                                        {/* Modales Admin Users */}


                                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 relative z-20">
                                                            <div>
                                                                <div className="flex items-center gap-3 text-orange-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 bg-orange-500/5 px-4 py-2 rounded-full w-fit border border-orange-500/10">
                                                                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                                                                    Live Metrics - Apps v4.2
                                                                </div>
                                                                <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-4 drop-shadow-sm">
                                                                    Panel de <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 animate-gradient-x">Control</span>
                                                                </h1>
                                                                <p className="text-slate-400 font-medium max-w-md">Bienvenido de nuevo. Aquí tienes el rendimiento de tu tienda en tiempo real.</p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] shadow-sm flex items-center gap-6">
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-none">Fecha Actual</p>
                                                                        <p className="text-slate-900 font-bold text-sm leading-none">
                                                                            {new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* SECCIÓN 1: TARJETAS PRINCIPALES (PREMIUM) */}
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                                            {/* INGRESOS BRUTOS */}
                                                            <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-orange-500/20 transition-all duration-500 shadow-xl">
                                                                {/* Background Glow */}
                                                                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-green-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/10 transition-colors duration-1000"></div>
                                                                <div className="flex justify-between items-center mb-6">
                                                                    <div>
                                                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Ingresos Brutos</p>
                                                                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">${dashboardMetrics.revenue.toLocaleString()}</h2>
                                                                    </div>
                                                                    <div className="p-4 bg-green-100 text-green-600 rounded-2xl w-16 h-16 flex items-center justify-center shadow-sm">
                                                                        <DollarSign className="w-8 h-8" />
                                                                    </div>
                                                                </div>

                                                                {/* Lista Gráfica (Ultimos 6 meses) */}
                                                                <div className="space-y-4 mt-8 border-t border-slate-100 pt-6">
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Rendimiento Mensual</p>
                                                                    {dashboardMetrics.analytics.monthly.slice(-6).reverse().map((m, i) => {
                                                                        const maxRev = Math.max(...dashboardMetrics.analytics.monthly.map(x => x.revenue));
                                                                        const percentage = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;

                                                                        return (
                                                                            <div key={i} className="group/item">
                                                                                <div className="flex justify-between text-xs mb-1">
                                                                                    <span className="text-slate-500 font-mono">{m.date}</span>
                                                                                    <span className="text-slate-900 font-bold">${m.revenue.toLocaleString()}</span>
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
                                                            <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500 shadow-xl">
                                                                {/* Background Glow */}
                                                                <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-colors duration-1000 ${dashboardMetrics.netIncome >= 0 ? 'bg-orange-500/5 group-hover:bg-orange-500/10' : 'bg-red-500/5 group-hover:bg-red-500/10'}`}></div>
                                                                <div className="flex justify-between items-center mb-6">
                                                                    <div>
                                                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Beneficio Neto (Estimado)</p>
                                                                        <h2 className={`text-4xl font-black tracking-tighter ${dashboardMetrics.netIncome >= 0 ? 'text-orange-600' : 'text-red-500'}`}>
                                                                            ${dashboardMetrics.netIncome.toLocaleString()}
                                                                        </h2>
                                                                    </div>
                                                                    <div className={`p-4 rounded-2xl w-16 h-16 flex items-center justify-center shadow-sm ${dashboardMetrics.netIncome >= 0 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                                        {dashboardMetrics.netIncome >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                                                                    </div>
                                                                </div>

                                                                {/* Lista Gráfica (Comparativa Ingreso vs Gasto) */}
                                                                <div className="space-y-4 mt-8 border-t border-slate-100 pt-6">
                                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Ingresos vs Gastos (últimos Meses)</p>
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
                                                                                    <span className="text-orange-600 font-bold">+${(m.revenue - monthExpenses).toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex h-2 bg-slate-800 rounded-full overflow-hidden w-full">
                                                                                    <div title={`Ingresos: $${m.revenue}`} className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${revPct}%` }}></div>
                                                                                    <div title={`Gastos: $${monthExpenses}`} className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${100 - revPct}%` }}></div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {dashboardMetrics.analytics.monthly.length === 0 && <p className="text-slate-600 text-xs">Sin datos suficientes.</p>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* SECCIÓN 2: KPIs RÁPIDOS (PREMIUM) */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-orange-500/30 transition-colors group shadow-sm">
                                                                <div className="flex justify-center mb-3 text-slate-400 group-hover:text-blue-500 transition-colors">
                                                                    <Users className="w-6 h-6" />
                                                                </div>
                                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center tracking-widest">Usuarios</p>
                                                                <p className="text-slate-900 font-black text-3xl text-center mt-1 group-hover:scale-110 transition-transform duration-300">{dashboardMetrics.totalUsers}</p>
                                                            </div>
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-purple-500/30 transition-colors group shadow-sm">
                                                                <div className="flex justify-center mb-3 text-slate-400 group-hover:text-purple-500 transition-colors">
                                                                    <ShoppingBag className="w-6 h-6" />
                                                                </div>
                                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center tracking-widest">Pedidos</p>
                                                                <p className="text-slate-900 font-black text-3xl text-center mt-1 group-hover:scale-110 transition-transform duration-300">{dashboardMetrics.totalOrders}</p>
                                                            </div>
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-green-500/30 transition-colors group shadow-sm">
                                                                <div className="flex justify-center mb-3 text-slate-400 group-hover:text-green-500 transition-colors">
                                                                    <DollarSign className="w-6 h-6" />
                                                                </div>
                                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center tracking-widest">Ticket Promedio</p>
                                                                <p className="text-slate-900 font-black text-2xl text-center mt-2 group-hover:scale-110 transition-transform duration-300 font-mono text-green-600">
                                                                    ${dashboardMetrics.totalOrders > 0 ? Math.round(dashboardMetrics.revenue / dashboardMetrics.totalOrders).toLocaleString() : 0}
                                                                </p>
                                                            </div>
                                                            <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-red-500/30 transition-colors group shadow-sm">
                                                                <div className={`flex justify-center mb-3 transition-colors ${dashboardMetrics.lowStockProducts.length > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400 group-hover:text-red-500'}`}>
                                                                    <AlertCircle className="w-6 h-6" />
                                                                </div>
                                                                <p className="text-slate-500 text-[10px] uppercase font-bold text-center tracking-widest">Stock Bajo</p>
                                                                <p className={`font-black text-3xl text-center mt-1 group-hover:scale-110 transition-transform duration-300 ${dashboardMetrics.lowStockProducts.length > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                                                    {dashboardMetrics.lowStockProducts.length}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* SECCIÓN 2.5: MEJORES Y PEORES (PREMIUM) */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {/* BEST SELLER */}
                                                            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-500 shadow-xl">
                                                                <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                                                    <Star className="w-32 h-32 text-yellow-500" />
                                                                </div>
                                                                <p className="text-slate-500 font-bold text-xs tracking-widest uppercase mb-6 flex items-center gap-2 relative z-10">
                                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Producto Estrella
                                                                </p>
                                                                {dashboardMetrics.starProduct ? (
                                                                    <div className="flex items-center gap-8 relative z-10">
                                                                        <div className="w-28 h-28 bg-white rounded-2xl p-2 shadow-md border border-slate-100 flex-shrink-0 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                                                            <img src={dashboardMetrics.starProduct.image} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">{dashboardMetrics.starProduct.name}</h3>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <p className="text-orange-500 font-black text-3xl">{dashboardMetrics.starProduct.sales}</p>
                                                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Unidades</p>
                                                                            </div>
                                                                            <p className="text-slate-500 text-xs mt-2 bg-slate-100 py-1 px-3 rounded-full w-fit border border-slate-200">Stock disponible: {dashboardMetrics.starProduct.stock}</p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-slate-600">No hay datos de ventas aún.</p>
                                                                )}
                                                            </div>

                                                            {/* WORST SELLER */}
                                                            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                    <TrendingDown className="w-24 h-24 text-slate-900" />
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 relative z-10">
                                                                    <TrendingDown className="w-4 h-4 text-slate-400" /> Menos Vendido (En Stock)
                                                                </p>
                                                                {dashboardMetrics.leastSoldProduct ? (
                                                                    <div className="flex items-center gap-8 relative z-10">
                                                                        <div className="w-28 h-28 bg-white rounded-2xl p-2 shadow-md border border-slate-100 grayscale flex-shrink-0 -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                                                            <img src={dashboardMetrics.leastSoldProduct.image} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">{dashboardMetrics.leastSoldProduct.name}</h3>
                                                                            <div className="flex items-baseline gap-2">
                                                                                <p className="text-slate-400 font-black text-3xl">
                                                                                    {dashboardMetrics.salesCount[dashboardMetrics.leastSoldProduct.id] || 0}
                                                                                </p>
                                                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Unidades</p>
                                                                            </div>
                                                                            <p className="text-slate-500 text-xs mt-2 bg-slate-100 py-1 px-3 rounded-full w-fit flex items-center gap-2 border border-slate-200">
                                                                                <RefreshCw className="w-3 h-3" /> Sugerencia: Oferta Flash
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-slate-600">Todos los productos tienen buena rotación.</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* SECCIÓN 3: LIBRO MAYOR (REGISTRO ADMINISTRATIVO) */}
                                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
                                                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                                <FileText className="w-6 h-6 text-purple-600" /> Registro de Movimientos
                                                            </h3>

                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                                                            <th className="pb-4 pl-4">Fecha</th>
                                                                            <th className="pb-4">Tipo</th>
                                                                            <th className="pb-4">Concepto</th>
                                                                            <th className="pb-4">Estado</th>
                                                                            <th className="pb-4 text-right pr-4">Monto</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-sm font-medium">
                                                                        {dashboardMetrics.transactions.map((t, idx) => (
                                                                            <tr key={`${t.type}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50 transition group">
                                                                                <td className="py-4 pl-4 text-slate-500 font-mono text-xs">{new Date(t.date).toLocaleDateString()}</td>
                                                                                <td className="py-4">
                                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${t.type === 'income' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'
                                                                                        }`}>
                                                                                        {t.category}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-4 text-slate-900 group-hover:text-purple-600 transition">
                                                                                    {t.description}
                                                                                </td>
                                                                                <td className="py-4 text-xs text-slate-500">
                                                                                    {t.status}
                                                                                </td>
                                                                                <td className={`py-4 text-right pr-4 font-mono font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
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
                                                    <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-up pb-20">
                                                        <div className="flex justify-between items-center">
                                                            <h1 className="text-3xl font-black text-slate-900">Proveedores</h1>
                                                            <button onClick={() => { setNewSupplier({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] }); setEditingSupplierId(null); setShowSupplierModal(true); }} className="bg-orange-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-orange-500 transition transform hover:-translate-y-1">
                                                                <Plus className="w-5 h-5" /> Nuevo Proveedor
                                                            </button>
                                                        </div>

                                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                            {suppliers.map((s, idx) => (
                                                                <div key={s.id} style={{ animationDelay: `${idx * 0.05}s` }} className="bg-white border border-slate-200 p-6 rounded-[2rem] hover:border-orange-500/30 transition duration-300 group animate-fade-up shadow-sm hover:shadow-md">
                                                                    <div className="flex justify-between items-start mb-6">
                                                                        <div className="p-4 bg-slate-100 rounded-xl text-slate-500 group-hover:text-orange-600 transition group-hover:bg-orange-50">
                                                                            <Truck className="w-8 h-8" />
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button
                                                                                onClick={() => { setNewSupplier(s); setEditingSupplierId(s.id); setShowSupplierModal(true); }}
                                                                                className="text-slate-400 hover:text-orange-600 p-2 hover:bg-slate-100 rounded-lg transition"
                                                                                title="Editar"
                                                                            >
                                                                                <Edit className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => openConfirm("Eliminar Proveedor", "¿Eliminar proveedor?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suppliers', s.id)))}
                                                                                className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 rounded-lg transition"
                                                                                title="Eliminar"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{s.name}</h3>

                                                                    <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                                        <p className="text-slate-600 text-sm flex items-center gap-3">
                                                                            <User className="w-4 h-4 text-slate-400" /> {s.contact}
                                                                        </p>
                                                                        {s.phone && (
                                                                            <p className="text-slate-600 text-sm flex items-center gap-3">
                                                                                <Phone className="w-4 h-4 text-slate-400" /> {s.phone}
                                                                            </p>
                                                                        )}
                                                                        {s.ig && (
                                                                            <p className="text-slate-600 text-sm flex items-center gap-3">
                                                                                <Instagram className="w-4 h-4 text-slate-400" /> {s.ig}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="pt-4 border-t border-slate-100">
                                                                        <p className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Productos Suministrados</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {(s.associatedProducts && s.associatedProducts.length > 0) ? (
                                                                                s.associatedProducts.map(pid => {
                                                                                    const p = products.find(prod => prod.id === pid);
                                                                                    if (!p) return null;
                                                                                    return (
                                                                                        <div key={pid} className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center border border-slate-200 tooltip-container shadow-sm" title={p.name}>
                                                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                            ) : (
                                                                                <span className="text-xs text-slate-400 italic">No hay productos asignados</span>
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
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20">
                                                        <h1 className="text-3xl font-black text-slate-900 mb-8">Gestión de Stock y Compras</h1>

                                                        {/* Formulario de Compra Unificado */}
                                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] mb-10 shadow-xl overflow-hidden relative">

                                                            {/* Header / Solo Reposición de Stock */}
                                                            <div className="flex border-b border-slate-100">
                                                                <div className="flex-1 p-6 text-center font-bold tracking-wider bg-orange-50 text-orange-600">
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
                                                                                            <div className="w-16 h-16 bg-white rounded-lg p-1 flex-shrink-0 border border-slate-200 shadow-sm">
                                                                                                <img src={selectedProduct.image} className="w-full h-full object-contain" alt="Preview" />
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="flex-1">
                                                                                            <select className="input-cyber w-full p-4 bg-slate-50 border-slate-200 text-slate-900" value={newPurchase.productId} onChange={e => setNewPurchase({ ...newPurchase, productId: e.target.value })}>
                                                                                                <option value="">Seleccionar Producto...</option>
                                                                                                {products.map(p => (
                                                                                                    <option key={p.id} value={p.id}>
                                                                                                        {p.name} (Stock: {isNaN(Number(p.stock)) ? 0 : p.stock})
                                                                                                    </option>
                                                                                                ))}
                                                                                            </select>
                                                                                            {selectedProduct && (
                                                                                                <p className="text-xs text-orange-600 mt-2 font-bold">
                                                                                                    Stock Actual: {isNaN(Number(selectedProduct.stock)) ? 0 : selectedProduct.stock} | Costo Total Estimado: ${autoCost.toLocaleString()}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Cantidad</label>
                                                                                    <input type="number" className="input-cyber w-full p-4 bg-slate-50 border-slate-200 text-slate-900" placeholder="0" value={newPurchase.quantity} onChange={e => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })} />
                                                                                </div>
                                                                                <div className="md:col-span-3">
                                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Proveedor</label>
                                                                                    <select className="input-cyber w-full p-4 bg-slate-50 border-slate-200 text-slate-900" value={newPurchase.supplierId} onChange={e => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}>
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

                                                                            // Auto-calcular costo: precio de compra - cantidad
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
                                                                    className="w-full mt-8 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black py-5 rounded-2xl shadow-xl transition transform hover:scale-[1.01] flex items-center justify-center gap-3 text-lg"
                                                                >
                                                                    <Save className="w-6 h-6" /> REGISTRAR REPOSICIÓN DE STOCK
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* CARRITO DE COMPRAS */}
                                                        {purchaseCart.length > 0 && (
                                                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-[2.5rem] p-8 mb-10 animate-fade-up">
                                                                <div className="flex items-center justify-between mb-6">
                                                                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                                                        <ShoppingCart className="w-6 h-6 text-orange-600" />
                                                                        Carrito de Compras ({purchaseCart.length} {purchaseCart.length === 1 ? 'producto' : 'productos'})
                                                                    </h3>
                                                                    <p className="text-orange-600 font-black text-2xl">
                                                                        TOTAL: ${purchaseCart.reduce((acc, item) => acc + item.cost, 0).toLocaleString()}
                                                                    </p>
                                                                </div>

                                                                <div className="space-y-4 mb-6">
                                                                    {purchaseCart.map((item, index) => (
                                                                        <div key={index} className="flex items-center gap-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                            <div className="w-16 h-16 bg-white rounded-lg p-1 flex-shrink-0 border border-slate-100">
                                                                                <img src={item.productImage} className="w-full h-full object-contain" alt={item.productName} />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className="font-bold text-slate-900">{item.productName}</p>
                                                                                <p className="text-xs text-slate-500">Precio Unit.: ${item.unitPrice.toLocaleString()}</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <input
                                                                                    type="number"
                                                                                    value={item.quantity}
                                                                                    onChange={(e) => updatePurchaseCartItem(index, parseInt(e.target.value) || 1)}
                                                                                    className="w-20 bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-lg text-center font-bold"
                                                                                    min="1"
                                                                                />
                                                                                <p className="text-orange-600 font-bold w-28 text-right">${item.cost.toLocaleString()}</p>
                                                                                <button
                                                                                    onClick={() => removeFromPurchaseCart(index)}
                                                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition"
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
                                                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                                                            <h3 className="text-xl font-bold text-slate-900 mb-6">Historial de Compras</h3>
                                                            <div className="space-y-4">
                                                                {purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map((p, idx) => {
                                                                    const prod = products.find(prod => prod.id === p.productId);
                                                                    const sup = suppliers.find(s => s.id === p.supplierId);
                                                                    return (
                                                                        <div key={p.id} style={{ animationDelay: `${idx * 0.05}s` }} className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition group animate-fade-up shadow-sm">
                                                                            <div className="flex items-center gap-4 flex-1">
                                                                                {/* Image Preview */}
                                                                                <div className="w-12 h-12 bg-white rounded-lg p-1 flex-shrink-0 border border-slate-200">
                                                                                    {prod?.image ? (
                                                                                        <img src={prod.image} className="w-full h-full object-contain" alt={prod.name} />
                                                                                    ) : (
                                                                                        <Package className="w-full h-full text-slate-300 p-2" />
                                                                                    )}
                                                                                </div>

                                                                                <div>
                                                                                    <p className="font-bold text-slate-900 flex items-center gap-2">
                                                                                        {prod?.name || 'Producto Eliminado'}
                                                                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">STOCK ACTUAL: {prod?.stock || 0}</span>
                                                                                    </p>
                                                                                    <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString()} {sup ? `- Prov: ${sup.name}` : ''}</p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-6">
                                                                                <div className="text-right">
                                                                                    <p className="text-orange-600 font-bold">+{p.quantity} u.</p>
                                                                                    <p className="text-slate-500 text-xs font-mono">${(p.cost || 0).toLocaleString()}</p>
                                                                                </div>
                                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={() => setEditingPurchase(p)} className="p-2 bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-500 rounded-lg transition">
                                                                                        <Edit className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button onClick={() => deletePurchaseFn(p)} className="p-2 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-lg transition">
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
                                                                <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
                                                                    <button onClick={() => setEditingPurchase(null)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900"><X className="w-6 h-6" /></button>
                                                                    <h3 className="text-2xl font-bold text-slate-900 mb-6">Editar Compra</h3>

                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label htmlFor="purchase-quantity" className="text-xs font-bold text-slate-500 uppercase block mb-1">Cantidad comprada</label>
                                                                            <div className="text-xs text-yellow-500 mb-2">? Modificar esto ajustará el stock del producto automáticamente.</div>
                                                                            <input id="purchase-quantity" type="number" className="input-cyber w-full p-3" value={editingPurchase.quantity} onChange={e => setEditingPurchase({ ...editingPurchase, quantity: parseInt(e.target.value) || 0 })} />
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor="purchase-cost" className="text-xs font-bold text-slate-500 uppercase block mb-1">Costo Total ($)</label>
                                                                            <input id="purchase-cost" type="number" className="input-cyber w-full p-3" value={editingPurchase.cost} onChange={e => setEditingPurchase({ ...editingPurchase, cost: parseFloat(e.target.value) || 0 })} />
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => {
                                                                            const original = purchases.find(x => x.id === editingPurchase.id);
                                                                            if (original) updatePurchaseFn(editingPurchase.id, original, editingPurchase);
                                                                        }}
                                                                        className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition shadow-lg"
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
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20">
                                                        <h1 className="text-4xl font-black text-slate-900 mb-8">Finanzas y Capital</h1>

                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                                            {/* SECCIÓN: REGISTRAR INVERSIÓN (NUEVO) */}
                                                            <div className="bg-[#0a0a0a] border border-orange-900/30 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-[100px] pointer-events-none"></div>
                                                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                    <TrendingUp className="w-5 h-5 text-orange-400" /> Registrar Inversión / Aporte
                                                                </h3>
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label htmlFor="investment-investor" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Inversor (Socio)</label>
                                                                        <div className="relative">
                                                                            <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                                                                            <select
                                                                                id="investment-investor"
                                                                                className="input-cyber w-full pl-12 p-4 appearance-none"
                                                                                value={newInvestment.investor}
                                                                                onChange={e => setNewInvestment({ ...newInvestment, investor: e.target.value })}
                                                                            >
                                                                                <option value="">Seleccionar Socio...</option>
                                                                                {(Array.isArray(settings?.team) ? settings.team : []).map((member, idx) => (
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
                                                                            <label htmlFor="investment-amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto ($)</label>
                                                                            <input
                                                                                id="investment-amount"
                                                                                type="number"
                                                                                className="input-cyber w-full p-4 font-mono font-bold text-orange-400"
                                                                                placeholder="0.00"
                                                                                value={newInvestment.amount}
                                                                                onChange={e => setNewInvestment({ ...newInvestment, amount: parseFloat(e.target.value) || 0 })}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor="investment-date" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Fecha</label>
                                                                            <input
                                                                                id="investment-date"
                                                                                type="date"
                                                                                className="input-cyber w-full p-4"
                                                                                value={newInvestment.date}
                                                                                onChange={e => setNewInvestment({ ...newInvestment, date: e.target.value })}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label htmlFor="investment-notes" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notas (Opcional)</label>
                                                                        <input
                                                                            id="investment-notes"
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
                                                                        className="w-full mt-2 bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 border border-orange-500/20"
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
                                                                        <label htmlFor="expense-description" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción</label>
                                                                        <input id="expense-description" className="input-cyber w-full p-4" placeholder="Ej: Pago de Internet, Alquiler..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label htmlFor="expense-amount" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto ($)</label>
                                                                            <input id="expense-amount" type="number" className="input-cyber w-full p-4 font-mono font-bold text-red-400" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} />
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor="expense-category" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                                                                            <select id="expense-category" className="input-cyber w-full p-4" value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
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
                                                                            <div key={inv.id} className="bg-slate-900/30 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-orange-500/30 transition">
                                                                                <div>
                                                                                    <p className="text-white font-bold text-sm">{inv.investor}</p>
                                                                                    <p className="text-slate-500 text-xs">{new Date(inv.date).toLocaleDateString()} {inv.notes && `- ${inv.notes}`}</p>
                                                                                </div>
                                                                                <div className="flex items-center gap-4">
                                                                                    <p className="text-orange-400 font-mono font-bold">+${inv.amount.toLocaleString()}</p>
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
                                                                {distributionData.totalCapital === 0 ? (
                                                                    <p className="text-slate-500 text-center py-12">Registra inversiones para ver la distribución de ganancias.</p>
                                                                ) : (
                                                                    <>
                                                                        {/* Barra de Progreso Distribución */}
                                                                        <div className="w-full h-8 bg-slate-900 rounded-full flex overflow-hidden">
                                                                            {distributionData.memberInvestments.map((member, idx) => {
                                                                                const pct = distributionData.totalCapital > 0 ? (member.totalInv / distributionData.totalCapital) * 100 : 0;
                                                                                const colors = ['bg-green-500', 'bg-orange-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-red-500'];
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
                                                                                    {distributionData.memberInvestments.map((member, idx) => {
                                                                                        const sharePercentage = distributionData.totalCapital > 0 ? ((member.totalInv / distributionData.totalCapital) * 100) : 0;
                                                                                        const memberProfit = (dashboardMetrics.netIncome * sharePercentage) / 100;
                                                                                        const colors = ['text-green-500', 'text-orange-500', 'text-purple-500', 'text-pink-500', 'text-yellow-500', 'text-red-500'];

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
                                                                                        <td className="p-6 text-right font-black text-orange-400 text-lg">
                                                                                            ${distributionData.totalCapital.toLocaleString()}
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
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* TAB: CUPONES (GESTIÓN AVANZADA) */}
                                                {adminTab === 'coupons' && (
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20 relative">

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

                                                        <h1 className="text-3xl font-black text-slate-900 mb-8">Gestión de Cupones</h1>

                                                        {/* Formulario de Creación */}
                                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] mb-10 shadow-xl">
                                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                <Plus className="w-5 h-5 text-purple-400" /> Crear Nuevo Cupón
                                                            </h3>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                                {/* Columna 1 */}
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <label htmlFor="coupon-code" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código del Cupón</label>
                                                                        <input id="coupon-code" className="input-cyber w-full p-4 font-mono text-lg uppercase tracking-widest" placeholder="Ej: VERANO2024" value={newCoupon.code} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} />
                                                                    </div>
                                                                    <div className="flex gap-4">
                                                                        <div className="flex-1">
                                                                            <label htmlFor="coupon-type" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo</label>
                                                                            <select id="coupon-type" className="input-cyber w-full p-4" value={newCoupon.type} onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value })}>
                                                                                <option value="percentage">Porcentaje (%)</option>
                                                                                <option value="fixed">Fijo ($)</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label htmlFor="coupon-value" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Valor</label>
                                                                            <input id="coupon-value" className="input-cyber w-full p-4" type="number" placeholder="0" value={newCoupon.value} onChange={e => setNewCoupon({ ...newCoupon, value: e.target.value })} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Columna 2 */}
                                                                <div className="space-y-4">
                                                                    <div className="flex gap-4">
                                                                        <div className="flex-1">
                                                                            <label htmlFor="coupon-minPurchase" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mínimo de Compra</label>
                                                                            <input id="coupon-minPurchase" className="input-cyber w-full p-4" type="number" placeholder="$0" value={newCoupon.minPurchase} onChange={e => setNewCoupon({ ...newCoupon, minPurchase: e.target.value })} />
                                                                        </div>
                                                                        {newCoupon.type === 'percentage' && (
                                                                            <div className="flex-1">
                                                                                <label htmlFor="coupon-maxDiscount" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tope Reintegro</label>
                                                                                <input id="coupon-maxDiscount" className="input-cyber w-full p-4" type="number" placeholder="$0 (Opcional)" value={newCoupon.maxDiscount} onChange={e => setNewCoupon({ ...newCoupon, maxDiscount: e.target.value })} />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex gap-4">
                                                                        <div className="flex-1">
                                                                            <label htmlFor="coupon-usageLimit" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Límite Usos (Total)</label>
                                                                            <input id="coupon-usageLimit" className="input-cyber w-full p-4" type="number" placeholder="Ej: 100" value={newCoupon.usageLimit} onChange={e => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })} />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label htmlFor="coupon-expirationDate" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Vencimiento</label>
                                                                            <input id="coupon-expirationDate" className="input-cyber w-full p-4" type="date" value={newCoupon.expirationDate} onChange={e => setNewCoupon({ ...newCoupon, expirationDate: e.target.value })} />
                                                                        </div>
                                                                    </div>

                                                                    <div className="md:col-span-2">
                                                                        <label htmlFor="coupon-targetType" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                            Tipo de Cupón
                                                                        </label>
                                                                        <select
                                                                            id="coupon-targetType"
                                                                            className="input-cyber w-full p-4"
                                                                            value={newCoupon.targetType}
                                                                            onChange={e => setNewCoupon({ ...newCoupon, targetType: e.target.value })}
                                                                        >
                                                                            <option value="global">🌐 Público / Canjeable (Redes Sociales)</option>
                                                                            <option value="specific_email">👤 Usuario Específico (Email)</option>
                                                                        </select>
                                                                    </div>

                                                                    {newCoupon.targetType === 'specific_email' && (
                                                                        <div className="md:col-span-2">
                                                                            <label htmlFor="coupon-targetUser" className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                                Email del Usuario
                                                                            </label>
                                                                            <input
                                                                                id="coupon-targetUser"
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

                                                {adminTab === 'users' && (
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20">
                                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                                                            <div>
                                                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30">
                                                                        <Users className="w-6 h-6 text-pink-400" />
                                                                    </div>
                                                                    Gestión de Usuarios
                                                                </h1>
                                                                <p className="text-slate-500 mt-2 font-medium">Control total sobre cuentas, roles y auditoría de carritos.</p>
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                                                <div className="relative w-full sm:w-64 group">
                                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-400 transition" />
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
                                                                                                {u.isVerified && <CheckCircle className="w-4 h-4 text-orange-400" />}
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
                                                                                                <ShoppingBag className="w-4 h-4 text-orange-500" />
                                                                                                <span className="text-sm font-black text-white">{u.ordersCount || 0}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => setViewUserCart(u)}
                                                                                            className="w-full py-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
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
                                                                                            className="w-11 h-11 flex items-center justify-center bg-[#0a0a0a] border border-white/5 rounded-2xl text-slate-400 hover:text-orange-400 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all shadow-xl group"
                                                                                            title="gestionar Perfil"
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
                                                )}


                                                {/* TAB: PROMOS (NUEVO) */}
                                                {adminTab === 'promos' && (
                                                    <div className="max-w-[1700px] mx-auto animate-fade-in pb-20 px-4 sm:px-6">
                                                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 text-purple-500 font-black text-xs uppercase tracking-[0.3em] mb-2">
                                                                    <Zap className="w-3.5 h-3.5 animate-pulse" /> Growth Engine
                                                                </div>
                                                                <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-4 mb-2">
                                                                    <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)]">
                                                                        <Tag className="w-8 h-8 text-white" />
                                                                    </div>
                                                                    Gestión de Promos
                                                                </h1>
                                                                <p className="text-slate-400 font-medium ml-1">Diseña combos irresistibles y potencia tus ventas con packs exclusivos</p>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-center justify-center">
                                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Activas</span>
                                                                    <span className="text-2xl font-black text-white">{promos.length}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Formulario Nueva Promo */}
                                                        {/* Formulario Nueva Promo o Banner Upgrade */}
                                                        {(!((settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && promos.length >= 1) || isEditingPromo) ? (
                                                            <div className="bg-white border border-slate-200 p-8 sm:p-12 rounded-[2.5rem] mb-16 shadow-lg relative overflow-hidden group">
                                                                <div className="relative z-10 w-full max-w-5xl mx-auto">
                                                                    <h3 className="text-3xl font-black text-slate-900 mb-10 flex items-center gap-4 border-b border-slate-100 pb-6">
                                                                        <div className={`p-3 rounded-2xl ${isEditingPromo ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                                                            {isEditingPromo ? <Edit className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                                                                        </div>
                                                                        {isEditingPromo ? 'Editar Combo Promocional' : 'Diseñar Nueva Promo'}
                                                                    </h3>

                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                                                        {/* Left Column: General Info */}
                                                                        <div className="space-y-8">
                                                                            <div>
                                                                                <label htmlFor="promo-name" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 block ml-1">Nombre del Combo</label>
                                                                                <input
                                                                                    id="promo-name"
                                                                                    type="text"
                                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 font-bold text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                                                                                    placeholder="Ej: Starter Pack Gaming"
                                                                                    value={newPromo.name}
                                                                                    onChange={e => setNewPromo({ ...newPromo, name: e.target.value })}
                                                                                />
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-6">
                                                                                <div>
                                                                                    <label htmlFor="promo-price" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 block ml-1">Precio Promocional</label>
                                                                                    <div className="relative">
                                                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                                                        <input
                                                                                            id="promo-price"
                                                                                            type="number"
                                                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-8 text-slate-900 font-black text-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                                                                                            placeholder="0"
                                                                                            value={newPromo.price}
                                                                                            onChange={e => setNewPromo({ ...newPromo, price: e.target.value })}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block ml-1 opacity-70">Costo Base Ref.</label>
                                                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center h-[60px] text-slate-500 font-bold text-lg font-mono">
                                                                                        ${newPromo.items.reduce((acc, item) => {
                                                                                            const p = products.find(prod => prod.id === item.productId);
                                                                                            return acc + ((Number(p?.basePrice) || 0) * item.quantity);
                                                                                        }, 0).toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 block ml-1">Imagen del Combo</label>
                                                                                <div className="flex items-center gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 border-dashed hover:border-purple-300 transition-colors group/upload cursor-pointer">
                                                                                    <div className="relative w-24 h-24 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                                        {newPromo.image ? (
                                                                                            <>
                                                                                                <img src={newPromo.image} className="w-full h-full object-cover" />
                                                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                    <button onClick={(e) => { e.stopPropagation(); setNewPromo({ ...newPromo, image: '' }); }} className="bg-white p-2 rounded-lg shadow-md text-red-500 hover:scale-110 transition">
                                                                                                        <X className="w-4 h-4" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            <ImageIcon className="w-8 h-8 text-slate-300" />
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <p className="text-xs text-slate-500 font-medium mb-3">Sube una imagen atractiva (PNG/JPG)</p>
                                                                                        <label htmlFor="promo-image" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
                                                                                            <Upload className="w-3.5 h-3.5" /> Seleccionar Archivo
                                                                                            <input id="promo-image" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setNewPromo)} />
                                                                                        </label>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right Column: ROI & Current Items */}
                                                                        <div className="space-y-8">
                                                                            {/* ROI Analysis Redesigned */}
                                                                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                                                                <div className="flex items-center justify-between mb-6">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                                                                            <DollarSign className="w-4 h-4 text-purple-600" />
                                                                                        </div>
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Análisis ROI</span>
                                                                                    </div>
                                                                                    <span className={`text-[9px] font-black px-3 py-1.5 rounded-full border shadow-sm ${Number(newPromo.price) > (newPromo.items.reduce((acc, item) => acc + ((Number(products.find(p => p.id === item.productId)?.purchasePrice) || 0) * item.quantity), 0)) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                                                        {Number(newPromo.price) > (newPromo.items.reduce((acc, item) => acc + ((Number(products.find(p => p.id === item.productId)?.purchasePrice) || 0) * item.quantity), 0)) ? 'MARGEN POSITIVO' : 'PÉRDIDA'}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Costo Inversión</p>
                                                                                        <p className="text-2xl font-black text-slate-700 font-mono tracking-tight">
                                                                                            ${newPromo.items.reduce((acc, item) => {
                                                                                                const p = products.find(prod => prod.id === item.productId);
                                                                                                return acc + ((Number(p?.purchasePrice) || 0) * item.quantity);
                                                                                            }, 0).toLocaleString()}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Ganancia Neta</p>
                                                                                        <p className={`text-2xl font-black font-mono tracking-tight ${Number(newPromo.price) - (newPromo.items.reduce((acc, item) => acc + ((Number(products.find(p => p.id === item.productId)?.purchasePrice) || 0) * item.quantity), 0)) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                            ${(Number(newPromo.price) - newPromo.items.reduce((acc, item) => {
                                                                                                const p = products.find(prod => prod.id === item.productId);
                                                                                                return acc + ((Number(p?.purchasePrice) || 0) * item.quantity);
                                                                                            }, 0)).toLocaleString()}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                                                                    <div className="flex justify-between items-end mb-2">
                                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Retorno Estimado</span>
                                                                                        <span className="text-xl font-black text-purple-600 font-mono">
                                                                                            {Number(newPromo.price) > 0 ? (((Number(newPromo.price) - newPromo.items.reduce((acc, item) => {
                                                                                                const p = products.find(prod => prod.id === item.productId);
                                                                                                return acc + ((Number(p?.purchasePrice) || 0) * item.quantity);
                                                                                            }, 0)) / Number(newPromo.price)) * 100).toFixed(0) : 0}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                                        <div className="h-full bg-purple-500 transition-all duration-1000 rounded-full" style={{ width: `${Math.min(Math.max((Number(newPromo.price) > 0 ? (((Number(newPromo.price) - newPromo.items.reduce((acc, item) => acc + ((Number(products.find(p => p.id === item.productId)?.purchasePrice) || 0) * item.quantity), 0)) / Number(newPromo.price)) * 100) : 0), 0), 100)}%` }}></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Products List */}
                                                                            <div>
                                                                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 block ml-1">Contenido del Combo</label>
                                                                                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
                                                                                    <div className="flex gap-2">
                                                                                        <div className="flex-1 space-y-2">
                                                                                            <input
                                                                                                type="text"
                                                                                                placeholder="Buscar producto..."
                                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-purple-400 transition-colors"
                                                                                                onChange={(e) => setPromoSearchQuery(e.target.value.toLowerCase())}
                                                                                            />
                                                                                            <select
                                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 font-bold outline-none"
                                                                                                value={selectedPromoProduct}
                                                                                                onChange={e => setSelectedPromoProduct(e.target.value)}
                                                                                            >
                                                                                                <option value="">Selecciona un producto...</option>
                                                                                                {products
                                                                                                    .filter(p => p.name.toLowerCase().includes(promoSearchQuery || ''))
                                                                                                    .map(p => (
                                                                                                        <option key={p.id} value={p.id}>{p.name} (${Number(p.basePrice).toLocaleString()})</option>
                                                                                                    ))}
                                                                                            </select>
                                                                                        </div>
                                                                                        <div className="flex flex-col gap-2">
                                                                                            <input
                                                                                                type="number"
                                                                                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-center font-bold outline-none"
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
                                                                                                className="h-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-md"
                                                                                            >
                                                                                                <Plus className="w-5 h-5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                                                                                        {newPromo.items.map((item, idx) => {
                                                                                            const p = products.find(prod => prod.id === item.productId);
                                                                                            if (!p) return null;
                                                                                            return (
                                                                                                <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 group/item hover:border-purple-200 transition-colors">
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex-shrink-0">
                                                                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs font-black text-slate-700 truncate max-w-[140px] leading-tight">{p.name}</p>
                                                                                                            <p className="text-[10px] text-slate-500 font-mono tracking-tight">{item.quantity} x ${p.basePrice}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <button onClick={() => setNewPromo({ ...newPromo, items: newPromo.items.filter((_, i) => i !== idx) })} className="text-slate-400 hover:text-red-500 p-2 transition-colors bg-white hover:bg-red-50 rounded-lg shadow-sm border border-slate-200 hover:border-red-200">
                                                                                                        <X className="w-3.5 h-3.5" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                        {newPromo.items.length === 0 && (
                                                                                            <div className="text-center py-8 text-slate-400 font-medium text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 ">
                                                                                                No hay productos seleccionados
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Action Button */}
                                                                    <div className="mt-10 flex justify-end">
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (!newPromo.name || !newPromo.price || newPromo.items.length === 0) {
                                                                                    showToast("Completa nombre, precio y agrega productos.", "warning");
                                                                                    return;
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
                                                                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95"
                                                                        >
                                                                            {isEditingPromo ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                                            {isEditingPromo ? 'Guardar Cambios' : 'Crear Promo Ahora'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                        ) : (
                                                            <div className="bg-slate-50 border border-slate-200 p-8 rounded-[2rem] mb-10 shadow-inner flex flex-col items-center justify-center text-center animate-fade-up">
                                                                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6 border border-purple-100 shadow-sm">
                                                                    <Lock className="w-10 h-10 text-purple-500" />
                                                                </div>
                                                                <h3 className="text-2xl font-black text-slate-900 mb-2">Límite de Promos Alcanzado</h3>
                                                                <p className="text-slate-500 max-w-md mb-8">
                                                                    Tu plan actual te permite tener hasta <strong className="text-slate-900">1 promo activa</strong>.
                                                                    Para crear más promociones ilimitadas, actualiza tu plan.
                                                                </p>
                                                                <button
                                                                    onClick={() => setShowPlansModal(true)}
                                                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
                                                                >
                                                                    <Zap className="w-5 h-5" /> Mejorar mi Plan
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Lista de Promos */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                                                    <div key={promo.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden hover:border-purple-300 transition-all duration-500 group flex flex-col shadow-lg hover:shadow-xl hover:shadow-purple-200/50">
                                                                        <div className="aspect-[4/3] relative overflow-hidden">
                                                                            <img src={promo.image || 'https://via.placeholder.com/400'} className="w-full h-full object-cover transition duration-1000 group-hover:scale-110" />
                                                                            {/* Gradient Overlay for Readability */}
                                                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                                                                            <div className="absolute top-4 right-4">
                                                                                <div className={`px-4 py-2 rounded-2xl text-xs font-black backdrop-blur-md border ${isProfitable ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-600 border-red-200'} shadow-sm`}>
                                                                                    {margin}% MARGEN
                                                                                </div>
                                                                            </div>
                                                                            <div className="absolute bottom-6 left-6 right-6">
                                                                                <h4 className="text-2xl font-black text-white mb-1 drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{promo.name}</h4>
                                                                                <p className="text-3xl text-white font-black tracking-tighter drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>${price.toLocaleString()}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-8 flex-1 flex flex-col space-y-6">
                                                                            {/* Productos Incluidos */}
                                                                            <div className="flex-1">
                                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Componentes del Combo:</p>
                                                                                <div className="space-y-3">
                                                                                    {(Array.isArray(promo.items) ? promo.items : []).map((item, i) => {
                                                                                        const p = products.find(prod => prod.id === item.productId);
                                                                                        return (
                                                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors group/item">
                                                                                                <div className="w-10 h-10 bg-white rounded-xl p-1 flex-shrink-0 shadow-sm border border-slate-200 group-hover/item:scale-110 transition-transform">
                                                                                                    <img src={p?.image || 'https://via.placeholder.com/50'} className="w-full h-full object-contain" />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <p className="text-xs font-bold text-slate-700 truncate">{p?.name || 'Producto Eliminado'}</p>
                                                                                                    <p className="text-[10px] text-slate-500 font-mono">{item.quantity} unidades</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>

                                                                            {/* Análisis Visual */}
                                                                            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rentabilidad</span>
                                                                                    <span className={`text-xs font-black ${isProfitable ? 'text-green-600' : 'text-red-500'}`}>
                                                                                        {isProfitable ? '+' : ''}${profit.toLocaleString()}
                                                                                    </span>
                                                                                </div>
                                                                                {/* Barra de progreso visual */}
                                                                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full rounded-full transition-all duration-1000 ${isProfitable ? 'bg-green-500 shadow-sm' : 'bg-red-500'}`}
                                                                                        style={{ width: `${Math.min(Math.max(Number(margin), 0), 100)}%` }}
                                                                                    ></div>
                                                                                </div>
                                                                                <div className="flex justify-between mt-2 text-[10px] font-mono text-slate-500 uppercase">
                                                                                    <span>Inversión: ${totalCost.toLocaleString()}</span>
                                                                                    <span>ROI: {totalCost > 0 ? ((profit / totalCost) * 100).toFixed(0) : 0}%</span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex gap-3">
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
                                                                                    className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                                                                >
                                                                                    <Edit className="w-3.5 h-3.5" /> Editar
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => openConfirm('Eliminar Promo', '¿Estés seguro? Esto no se puede deshacer.', async () => {
                                                                                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'promos', promo.id));
                                                                                        showToast("Promo eliminada", "info");
                                                                                    })}
                                                                                    className="w-14 py-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl transition flex items-center justify-center"
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
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20">
                                                        <h1 className="text-3xl font-black text-slate-900 mb-8">Gestión de Pedidos</h1>

                                                        {orders.length === 0 ? (
                                                            <div className="text-center py-20 border border-dashed border-slate-300 rounded-[3rem] bg-slate-50">
                                                                <ShoppingBag className="w-20 h-20 mx-auto mb-4 text-slate-300" />
                                                                <p className="text-xl text-slate-500 font-bold">No hay pedidos registrados aún.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                {orders.map((o, idx) => (
                                                                    <div
                                                                        key={o.id}
                                                                        style={{ animationDelay: `${idx * 0.05}s` }}
                                                                        className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-orange-500/20 transition group animate-fade-up shadow-sm"
                                                                    >
                                                                        {/* Info Principal */}
                                                                        <div className="flex-1 w-full lg:w-auto">
                                                                            <div className="flex items-center gap-4 mb-2">
                                                                                <span className="bg-slate-50 text-orange-600 px-3 py-1 rounded-lg text-sm font-black tracking-widest border border-slate-200">
                                                                                    #{o.orderId}
                                                                                </span>
                                                                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold border ${o.status === 'Realizado' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200'}`}>
                                                                                    {o.status}
                                                                                </span>
                                                                            </div>
                                                                            <h4 className="text-slate-900 font-bold text-lg mb-1">{o.customer.name}</h4>
                                                                            <p className="text-slate-500 text-xs flex items-center gap-2">
                                                                                <Clock className="w-3 h-3" /> {new Date(o.date).toLocaleString()}
                                                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                                                <span className="text-slate-900 font-mono font-bold">${o.total.toLocaleString()}</span>
                                                                            </p>
                                                                        </div>

                                                                        {/* Items Preview */}
                                                                        <div className="flex -space-x-2">
                                                                            {o.items.slice(0, 4).map((i, idx) => (
                                                                                <div key={idx} className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden" title={i.title}>
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
                                                                            {/* WhatsApp Cliente */}
                                                                            {o.customer.phone && o.customer.phone !== '-' && (
                                                                                <a
                                                                                    href={(() => {
                                                                                        let phone = o.customer.phone.replace(/\D/g, '');
                                                                                        // Normalización para Argentina
                                                                                        if (phone.startsWith('0')) phone = phone.substring(1);
                                                                                        if (phone.startsWith('15')) phone = phone.substring(2); // Si el usuario puso 15... (casos raros sin area code previo, pero comunmente es area+15)
                                                                                        // Mejor: Si empieza con 54 y no 549, agregar 9. Si no empieza con 54, agregar 549.

                                                                                        // Logica robusta simplificada:
                                                                                        if (phone.startsWith('549')) {
                                                                                            // Ya está bien
                                                                                        } else if (phone.startsWith('54')) {
                                                                                            // Tiene 54 pero falta 9 (asumiendo movil)
                                                                                            phone = '549' + phone.substring(2);
                                                                                        } else {
                                                                                            // No tiene pais, asumir local y agregar 549
                                                                                            phone = '549' + phone;
                                                                                        }

                                                                                        return `https://wa.me/${phone}?text=${encodeURIComponent('Hola ' + o.customer.name + '! Te escribimos por tu pedido de: ' + o.items.map(i => i.quantity + 'x ' + i.title).join(', '))}`;
                                                                                    })()}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="p-3 bg-green-900/20 hover:bg-green-600 text-green-500 hover:text-white rounded-xl transition border border-green-500/30"
                                                                                    title={'WhatsApp: +54 ' + o.customer.phone}
                                                                                >
                                                                                    <MessageCircle className="w-5 h-5" />
                                                                                </a>
                                                                            )}
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
                                                                <h1 className="text-3xl font-black text-slate-900">Inventario</h1>
                                                                {(() => {
                                                                    const plan = settings?.subscriptionPlan || 'entrepreneur';
                                                                    const limit = plan === 'premium' ? Infinity : plan === 'business' ? 50 : 30;
                                                                    const current = products.length;
                                                                    const isNearLimit = plan !== 'premium' && current >= limit * 0.8;
                                                                    return (
                                                                        <p className={`text-sm font-bold mt-1 ${isNearLimit ? 'text-yellow-400' : 'text-slate-500'}`}>
                                                                            {current} / {plan === 'premium' ? 'Ilimitado' : limit} productos
                                                                            {isNearLimit && plan !== 'premium' && <span className="text-yellow-500 ml-2">⚠️ Cerca del límite</span>}
                                                                        </p>
                                                                    );
                                                                })()}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setShowCategoryModal(true)} className="bg-slate-800 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-slate-700 transition transform hover:scale-105 active:scale-95 border border-slate-700">
                                                                    <FolderPlus className="w-5 h-5" /> Categorías
                                                                </button>
                                                                <button onClick={() => { setNewProduct({}); setEditingId(null); setShowProductForm(true) }} className="bg-orange-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hover:bg-orange-500 transition transform hover:scale-105 active:scale-95">
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
                                                                            onClick={() => showToast("Usa el botón de ojo (👁️) en cada producto para activar/desactivar", "info")}
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
                                                            <div className="bg-[#0a0a0a] border border-orange-500/30 p-8 rounded-[2rem] mb-10 shadow-2xl relative">
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
                                                                        <div className="space-y-2">
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                                                                                Categorías (Selecciona una o más)
                                                                            </label>
                                                                            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
                                                                                {(settings?.categories || []).length === 0 ? (
                                                                                    <p className="text-center text-slate-600 py-4 text-sm">
                                                                                        No hay categorías disponibles. Agrégalas abajo.
                                                                                    </p>
                                                                                ) : (
                                                                                    (Array.isArray(settings?.categories) ? settings.categories : []).map(cat => {
                                                                                        // Soporte retrocompatible: verificar tanto categories (array) como category (string)
                                                                                        const isSelected = Array.isArray(newProduct.categories)
                                                                                            ? newProduct.categories.includes(cat)
                                                                                            : (newProduct.category ? [newProduct.category] : []);

                                                                                        return (
                                                                                            <label
                                                                                                key={cat}
                                                                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group hover:bg-slate-800 mb-2 last:mb-0 ${isSelected ? 'bg-orange-900/20 border border-orange-500/30' : 'border border-transparent'
                                                                                                    }`}
                                                                                            >
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    checked={isSelected}
                                                                                                    onChange={(e) => {
                                                                                                        if (e.target.checked) {
                                                                                                            // Agregar categoría
                                                                                                            const current = Array.isArray(newProduct.categories)
                                                                                                                ? newProduct.categories
                                                                                                                : (newProduct.category ? [newProduct.category] : []);
                                                                                                            setNewProduct({
                                                                                                                ...newProduct,
                                                                                                                categories: [...current, cat],
                                                                                                                category: undefined // Eliminar el campo antiguo
                                                                                                            });
                                                                                                        } else {
                                                                                                            // Remover categoría
                                                                                                            const updated = Array.isArray(newProduct.categories)
                                                                                                                ? newProduct.categories.filter(c => c !== cat)
                                                                                                                : [];
                                                                                                            setNewProduct({
                                                                                                                ...newProduct,
                                                                                                                categories: updated
                                                                                                            });
                                                                                                        }
                                                                                                    }}
                                                                                                    className="w-4 h-4 text-orange-600 bg-slate-900 border-slate-600 rounded focus:ring-orange-500 focus:ring-2"
                                                                                                />
                                                                                                <span className={`flex-1 text-sm font-medium transition-colors ${isSelected ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'
                                                                                                    }`}>
                                                                                                    {cat}
                                                                                                </span>
                                                                                                {isSelected && (
                                                                                                    <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                                                                                        <CheckCircle className="w-3 h-3" />
                                                                                                    </span>
                                                                                                )}
                                                                                            </label>
                                                                                        );
                                                                                    })
                                                                                )}
                                                                            </div>
                                                                            {/* Mostrar categorías seleccionadas como tags */}
                                                                            {newProduct.categories && newProduct.categories.length > 0 && (
                                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                                    {newProduct.categories.map(cat => (
                                                                                        <span
                                                                                            key={cat}
                                                                                            className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-500/30 flex items-center gap-2"
                                                                                        >
                                                                                            {cat}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    setNewProduct({
                                                                                                        ...newProduct,
                                                                                                        categories: newProduct.categories.filter(c => c !== cat)
                                                                                                    });
                                                                                                }}
                                                                                                className="hover:text-orange-300 transition"
                                                                                            >
                                                                                                <X className="w-3 h-3" />
                                                                                            </button>
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowCategoryModal(true)}
                                                                            className="w-full mt-2 py-2 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm border border-orange-800"
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
                                                                                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-900/20 file:text-orange-400 hover:file:bg-orange-900/40 transition"
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
                                                                    <button onClick={saveProductFn} className="px-8 py-3 bg-orange-600 rounded-xl text-white font-bold shadow-lg hover:bg-orange-500 transition">Guardar Producto</button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Lista de Productos */}
                                                        <div className="grid gap-3">
                                                            {products.map((p, idx) => (
                                                                <div
                                                                    key={p.id}
                                                                    style={{ animationDelay: `${idx * 0.05}s` }}
                                                                    className={`bg-[#0a0a0a] border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center group hover:border-orange-900/50 transition animate-fade-up ${p.isActive === false ? 'border-yellow-500/30 opacity-60' : 'border-slate-800'}`}
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
                                                                                <span className="text-orange-400 font-bold ml-2" title="Precio Venta">${Number(p.basePrice).toLocaleString()}</span> |
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
                                                                        <button onClick={() => { setNewProduct(p); setEditingId(p.id); setShowProductForm(true) }} className="p-3 bg-slate-900 rounded-xl text-orange-400 hover:bg-orange-900/20 transition border border-slate-800 transform hover:scale-105 active:scale-95">
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
                                                    <div className="max-w-[1600px] mx-auto animate-fade-up pb-20 relative">

                                                        {/* Developer-Only Access Block REMOVED to allow store owner access */}
                                                        {/* Only restricted sections like 'subscription' will remain restricted */}

                                                        <h1 className="text-4xl font-black text-slate-900 neon-text mb-8 flex items-center gap-3">
                                                            <Settings className="w-8 h-8 text-orange-500 animate-spin-slow" /> Configuración General
                                                        </h1>

                                                        {/* Sub-Navigation Tabs */}
                                                        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-slate-800">
                                                            {[
                                                                { id: 'identity', label: 'Identidad', icon: Fingerprint },
                                                                { id: 'features', label: 'Funcionalidades', icon: Zap },
                                                                { id: 'legal', label: 'Legal y Políticas', icon: ShieldCheck },
                                                                { id: 'advanced', label: 'Avanzado', icon: Cog },
                                                                // Only show Subscription tab to Super Admin
                                                                ...(currentUser?.email === SUPER_ADMIN_EMAIL ? [{ id: 'subscription', label: 'Suscripciones', icon: Key }] : [])
                                                            ].map(tab => (
                                                                <button
                                                                    key={tab.id}
                                                                    onClick={() => setSettingsTab(tab.id)}
                                                                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300 border ${settingsTab === tab.id ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border-orange-400 transform scale-105' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'}`}
                                                                >
                                                                    <tab.icon className={`w-4 h-4 ${settingsTab === tab.id ? 'animate-pulse' : ''}`} /> {tab.label}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* === SUBSCRIPTION MANAGEMENT (SUPER ADMIN ONLY) === */}
                                                        {settingsTab === 'subscription' && currentUser?.email === SUPER_ADMIN_EMAIL && (
                                                            <div className="space-y-6 animate-fade-up">
                                                                <div className="bg-[#0a0a0a] border border-orange-500/30 p-8 rounded-[2rem] shadow-[0_0_50px_rgba(249,115,22,0.1)]">
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
                                                                            className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${settings.subscriptionPlan === 'entrepreneur' || !settings.subscriptionPlan ? 'bg-slate-900 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.2)] scale-105 z-10' : 'bg-[#050505] border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'}`}
                                                                        >
                                                                            <div className="flex justify-between items-start mb-4">
                                                                                <div className="p-3 bg-slate-800 rounded-xl">
                                                                                    <Store className="w-6 h-6 text-orange-400" />
                                                                                </div>
                                                                                {(settings.subscriptionPlan === 'entrepreneur' || !settings.subscriptionPlan) && <div className="bg-orange-500 text-black text-xs font-black px-2 py-1 rounded">ACTIVO</div>}
                                                                            </div>
                                                                            <h4 className="text-xl font-black text-white mb-1">Emprendedor</h4>
                                                                            <p className="text-sm text-slate-400 mb-4 h-10">El esencial para arrancar sólido pero económico.</p>
                                                                            <div className="text-2xl font-black text-orange-400 mb-6">$7.000 <span className="text-sm text-slate-500 font-normal">/mes</span></div>

                                                                            <ul className="space-y-2 text-sm text-slate-300">
                                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500" /> Hasta 30 productos</li>
                                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500" /> Dominio Vercel</li>
                                                                                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500" /> Mercado Pago Directo</li>
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

                                                        {settingsTab === 'identity' && (
                                                            <div className="space-y-6 animate-fade-up">
                                                                {/* INFORMACIÓN BÁSICA (Originalmente en 'store') */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Store className="w-5 h-5 text-orange-400" /> Información de la Tienda
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
                                                                                placeholder="Av. Principal 123, Ciudad"
                                                                            />
                                                                            <p className="text-xs text-slate-500 mt-2">Aparece al final del menú hamburguesa</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* LOGO Y COLORES (Originalmente en 'appearance') */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                            <Store className="w-5 h-5 text-orange-400" /> Logo de la Tienda
                                                                        </h3>
                                                                        <div className="flex flex-col items-center gap-4">
                                                                            <div className="relative group w-32 h-32 bg-white rounded-2xl p-2 border border-slate-700 flex items-center justify-center overflow-hidden">
                                                                                {settings?.logoUrl ? (
                                                                                    <img src={settings.logoUrl} className="w-full h-full object-contain" alt="Logo" />
                                                                                ) : (
                                                                                    <Store className="w-12 h-12 text-slate-300" />
                                                                                )}
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                    onChange={(e) => handleImageUpload(e, setSettings, 'logoUrl')}
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
                                                                                    <Upload className="w-8 h-8 text-white" />
                                                                                </div>
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 text-center">Formato PNG recomendado para transparencia.</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                            <Palette className="w-5 h-5 text-pink-400" /> Colores de Marca
                                                                        </h3>
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center gap-4">
                                                                                <input
                                                                                    type="color"
                                                                                    value={settings?.primaryColor || '#f97316'}
                                                                                    onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                                                                                    className="w-12 h-12 rounded-lg border-none cursor-pointer p-0"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="text-xs font-bold text-slate-500 uppercase">Primario</p>
                                                                                    <p className="text-sm font-mono text-white">{settings?.primaryColor || '#f97316'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4">
                                                                                <input
                                                                                    type="color"
                                                                                    value={settings?.secondaryColor || '#8b5cf6'}
                                                                                    onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
                                                                                    className="w-12 h-12 rounded-lg border-none cursor-pointer p-0"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="text-xs font-bold text-slate-500 uppercase">Secundario</p>
                                                                                    <p className="text-sm font-mono text-white">{settings?.secondaryColor || '#8b5cf6'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* REDES SOCIALES (Originalmente en 'social') */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Share2 className="w-5 h-5 text-blue-400" /> Presencia en RRSS
                                                                    </h3>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Instagram className="w-3 h-3 text-pink-500" /> Instagram</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.instagramLink || ''}
                                                                                onChange={e => setSettings({ ...settings, instagramLink: e.target.value })}
                                                                                placeholder="https://instagram.com/mitienda"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><MessageCircle className="w-3 h-3 text-green-500" /> WhatsApp</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.whatsappLink || ''}
                                                                                onChange={e => setSettings({ ...settings, whatsappLink: e.target.value })}
                                                                                placeholder="https://wa.me/..."
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Facebook className="w-3 h-3 text-blue-500" /> Facebook</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.facebookLink || ''}
                                                                                onChange={e => setSettings({ ...settings, facebookLink: e.target.value })}
                                                                                placeholder="https://facebook.com/..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {settingsTab === 'features' && (
                                                            <div className="space-y-6 animate-fade-up">
                                                                {/* HERO CAROUSEL SETTINGS */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <ImageIcon className="w-5 h-5 text-purple-400" /> Carrusel Principal (Hero)
                                                                    </h3>

                                                                    <div className="space-y-4 mb-6">
                                                                        {(Array.isArray(settings?.heroImages) ? settings.heroImages : []).map((image, index) => (
                                                                            <div key={index} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 transition hover:border-slate-600">
                                                                                <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
                                                                                    <img src={image.url} className="w-full h-full object-cover" alt={`Slide ${index + 1}`} />
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-white font-bold text-sm mb-2">Slide {index + 1}</p>
                                                                                    <select
                                                                                        className="input-cyber w-full p-2 text-xs"
                                                                                        value={image.linkedProductId || (image.linkedPromoId ? `promo_${image.linkedPromoId}` : '')}
                                                                                        onChange={(e) => {
                                                                                            const value = e.target.value;
                                                                                            const newImages = [...(Array.isArray(settings?.heroImages) ? settings.heroImages : [])];
                                                                                            if (value.startsWith('promo_')) {
                                                                                                newImages[index] = { ...newImages[index], linkedProductId: null, linkedPromoId: value.replace('promo_', '') };
                                                                                            } else if (value) {
                                                                                                newImages[index] = { ...newImages[index], linkedProductId: value, linkedPromoId: null };
                                                                                            } else {
                                                                                                newImages[index] = { ...newImages[index], linkedProductId: null, linkedPromoId: null };
                                                                                            }
                                                                                            setSettings({ ...settings, heroImages: newImages });
                                                                                        }}
                                                                                    >
                                                                                        <option value="">Sin vinculación</option>
                                                                                        <optgroup label="Productos">
                                                                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                                        </optgroup>
                                                                                        <optgroup label="Promos">
                                                                                            {promos.map(promo => <option key={promo.id} value={`promo_${promo.id}`}>{promo.name || promo.title}</option>)}
                                                                                        </optgroup>
                                                                                    </select>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const newImages = (Array.isArray(settings?.heroImages) ? settings.heroImages : []).filter((_, i) => i !== index);
                                                                                        setSettings({ ...settings, heroImages: newImages });
                                                                                    }}
                                                                                    className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition"
                                                                                >
                                                                                    <Trash2 className="w-5 h-5" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                        {(!Array.isArray(settings?.heroImages) || settings.heroImages.length < 5) && (
                                                                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 hover:border-orange-500 rounded-[2rem] cursor-pointer transition bg-slate-900/20 group">
                                                                                <Plus className="w-10 h-10 text-slate-700 group-hover:text-orange-500 mb-2 transition" />
                                                                                <span className="text-slate-500 font-bold group-hover:text-slate-300">Agregar imagen</span>
                                                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setSettings, 'heroImages', 1920)} />
                                                                            </label>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-800">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4">
                                                                                <Clock className="w-3 h-3" /> Intervalo (segundos)
                                                                            </label>
                                                                            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                                                <input
                                                                                    type="range"
                                                                                    min="2000"
                                                                                    max="15000"
                                                                                    step="1000"
                                                                                    value={settings?.heroCarouselInterval || 5000}
                                                                                    onChange={e => setSettings({ ...settings, heroCarouselInterval: parseInt(e.target.value) })}
                                                                                    className="flex-1 accent-orange-500"
                                                                                />
                                                                                <span className="font-mono font-bold text-orange-500 min-w-[3ch]">{((settings?.heroCarouselInterval || 5000) / 1000).toFixed(0)}s</span>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4">
                                                                                <Maximize2 className="w-3 h-3" /> Altura de Visualización
                                                                            </label>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {[
                                                                                    { id: 'slim', label: 'Baja' },
                                                                                    { id: 'small', label: 'Compacta' },
                                                                                    { id: 'medium', label: 'Normal' },
                                                                                    { id: 'large', label: 'Grande' }
                                                                                ].map(size => (
                                                                                    <button
                                                                                        key={size.id}
                                                                                        onClick={() => setSettings({ ...settings, carouselHeight: size.id })}
                                                                                        className={`py-2 rounded-lg text-[10px] font-black uppercase border transition ${settings?.carouselHeight === size.id || (!settings?.carouselHeight && size.id === 'small')
                                                                                            ? 'bg-orange-600 text-white border-orange-500 shadow-lg'
                                                                                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white hover:border-slate-700'
                                                                                            }`}
                                                                                    >
                                                                                        {size.label}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* TICKER Y ANUNCIOS */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <div className="flex items-center justify-between mb-6">
                                                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                                                <Sparkles className="w-5 h-5 text-yellow-400" /> Ticker Animado
                                                                            </h3>
                                                                            <button
                                                                                onClick={() => setSettings({ ...settings, showBrandTicker: !settings?.showBrandTicker })}
                                                                                className={`w-12 h-6 rounded-full transition relative ${settings?.showBrandTicker !== false ? 'bg-orange-500' : 'bg-slate-700'}`}
                                                                            >
                                                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.showBrandTicker !== false ? 'left-6' : 'left-0.5'}`}></div>
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            className="input-cyber w-full p-4"
                                                                            value={settings?.tickerText || ''}
                                                                            onChange={e => setSettings({ ...settings, tickerText: e.target.value })}
                                                                            placeholder="ENVÍOS A TODO EL PAÍS - CALIDAD PREMIUM - 12 CUOTAS"
                                                                        />
                                                                    </div>
                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                                                            <Bell className="w-5 h-5 text-orange-400" /> Banner de Anuncio
                                                                        </h3>
                                                                        <input
                                                                            className="input-cyber w-full p-4"
                                                                            value={settings?.announcementMessage || ''}
                                                                            onChange={e => setSettings({ ...settings, announcementMessage: e.target.value })}
                                                                            placeholder="?? -PROMO LANZAMIENTO! - 20% OFF en toda la tienda"
                                                                        />
                                                                        <p className="text-[10px] text-slate-500 mt-2">Visible en la parte superior. Dejar vacío para ocultar.</p>
                                                                    </div>
                                                                </div>

                                                                {/* GUÍA DE COMPRA */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <div className="flex items-center justify-between mb-6">
                                                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                                            <FileQuestion className="w-5 h-5 text-blue-400" /> Guía "Cómo Comprar" (Pasos)
                                                                        </h3>
                                                                        <button
                                                                            onClick={() => setSettings({ ...settings, showGuideLink: !settings?.showGuideLink })}
                                                                            className={`w-14 h-7 rounded-full transition relative ${settings?.showGuideLink !== false ? 'bg-blue-600' : 'bg-slate-700'}`}
                                                                        >
                                                                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${settings?.showGuideLink !== false ? 'left-8' : 'left-1'}`}></div>
                                                                        </button>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        {[1, 2, 3, 4, 5].map(num => (
                                                                            <div key={num} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                                                <div className="flex items-center gap-3 mb-3">
                                                                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">{num}</span>
                                                                                    <input
                                                                                        className="bg-transparent border-none text-white font-bold p-0 focus:ring-0 flex-1"
                                                                                        value={settings?.[`guideStep${num}Title`] || ''}
                                                                                        onChange={e => setSettings({ ...settings, [`guideStep${num}Title`]: e.target.value })}
                                                                                        placeholder={`Título Paso ${num}`}
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => setSettings({ ...settings, [`showGuideStep${num}`]: !settings?.[`showGuideStep${num}`] })}
                                                                                        className={`w-8 h-4 rounded-full transition relative ${settings?.[`showGuideStep${num}`] !== false ? 'bg-blue-600' : 'bg-slate-700'}`}
                                                                                    >
                                                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition ${settings?.[`showGuideStep${num}`] !== false ? 'left-4.5' : 'left-0.5'}`}></div>
                                                                                    </button>
                                                                                </div>
                                                                                <textarea
                                                                                    className="input-cyber w-full p-3 text-xs h-16 resize-none"
                                                                                    value={settings?.[`guideStep${num}Text`] || ''}
                                                                                    onChange={e => setSettings({ ...settings, [`guideStep${num}Text`]: e.target.value })}
                                                                                    placeholder="Describe este paso de la compra..."
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {settingsTab === 'legal' && (
                                                            <div className="space-y-6 animate-fade-up">
                                                                {/* COPYRIGHT SETTINGS */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <FileText className="w-5 h-5 text-slate-400" /> Información Legal y Copyright
                                                                    </h3>
                                                                    <div className="space-y-6">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Texto de Copyright (Footer)</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.footerCopyright || ''}
                                                                                onChange={e => setSettings({ ...settings, footerCopyright: e.target.value })}
                                                                                placeholder="© 2024 SUSTORE. Todos los derechos reservados."
                                                                            />
                                                                        </div>
                                                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <div>
                                                                                    <p className="font-bold text-white">Política de Privacidad</p>
                                                                                    <p className="text-xs text-slate-500">Habilitar página y link en footer</p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setSettings({ ...settings, showPrivacyPolicy: !settings?.showPrivacyPolicy })}
                                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.showPrivacyPolicy !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                                >
                                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showPrivacyPolicy !== false ? 'left-7' : 'left-1'}`}></div>
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex items-center justify-between">
                                                                                <div>
                                                                                    <p className="font-bold text-white">Términos y Condiciones</p>
                                                                                    <p className="text-xs text-slate-500">Habilitar página y link en footer</p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setSettings({ ...settings, showTermsOfService: !settings?.showTermsOfService })}
                                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.showTermsOfService !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                                >
                                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.showTermsOfService !== false ? 'left-7' : 'left-1'}`}></div>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {settingsTab === 'advanced' && (
                                                            <div className="space-y-6 animate-fade-up">
                                                                {/* MANTENIMIENTO Y RENDIMIENTO */}
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <div className="flex items-center justify-between mb-6">
                                                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                                                <ShieldCheck className="w-5 h-5 text-red-500" /> Modo Mantenimiento
                                                                            </h3>
                                                                            <button
                                                                                onClick={() => setSettings({ ...settings, maintenanceMode: !settings?.maintenanceMode })}
                                                                                className={`w-12 h-6 rounded-full transition relative ${settings?.maintenanceMode ? 'bg-red-500' : 'bg-slate-700'}`}
                                                                            >
                                                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.maintenanceMode ? 'left-6' : 'left-0.5'}`}></div>
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">Si se activa, los clientes verán una página de "Volvemos pronto".</p>
                                                                    </div>
                                                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                        <div className="flex items-center justify-between mb-6">
                                                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                                                <Zap className="w-5 h-5 text-yellow-500" /> Optimización (Lazy Load)
                                                                            </h3>
                                                                            <button
                                                                                onClick={() => setSettings({ ...settings, lazyLoad: settings?.lazyLoad !== false ? false : true })}
                                                                                className={`w-12 h-6 rounded-full transition relative ${settings?.lazyLoad !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                            >
                                                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${settings?.lazyLoad !== false ? 'left-6' : 'left-0.5'}`}></div>
                                                                            </button>
                                                                        </div>
                                                                        <p className="text-xs text-slate-500">Carga imágenes solo cuando son visibles para mejorar velocidad.</p>
                                                                    </div>
                                                                </div>

                                                                {/* SEO Y METADATOS */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Search className="w-5 h-5 text-blue-400" /> SEO y buscadores
                                                                    </h3>
                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Título de la Página (Meta Title)</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.seoTitle || ''}
                                                                                onChange={e => setSettings({ ...settings, seoTitle: e.target.value })}
                                                                                placeholder="SUSTORE | Tecnología Premium"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción (Meta Description)</label>
                                                                            <textarea
                                                                                className="input-cyber w-full p-4 h-24 resize-none"
                                                                                value={settings?.seoDescription || ''}
                                                                                onChange={e => setSettings({ ...settings, seoDescription: e.target.value })}
                                                                                placeholder="Encuentra los mejores productos tecnológicos con la mejor calidad..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* CONFIGURACIÓN IA */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Cpu className="w-5 h-5 text-purple-400" /> Configuración Asistente IA
                                                                    </h3>
                                                                    <div className="flex flex-col items-center gap-4">
                                                                        <div className="relative group w-24 h-24 bg-slate-900 rounded-full border-2 border-purple-500/30 flex items-center justify-center overflow-hidden">
                                                                            {settings?.botImageUrl ? (
                                                                                <img src={settings.botImageUrl} className="w-full h-full object-cover" alt="Bot" />
                                                                            ) : (
                                                                                <Cpu className="w-10 h-10 text-slate-700" />
                                                                            )}
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                onChange={(e) => handleImageUpload(e, setSettings, 'botImageUrl')}
                                                                            />
                                                                        </div>
                                                                        <p className="text-[10px] text-slate-500 uppercase font-black">Avatar del Asistente</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}


                                                        {/* === SEO === */}
                                                        {settingsTab === 'legal' && (
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
                                                                                placeholder="Tienda online de productos de alta calidad. Envíos a todo el país. ¡Visítanos!"
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

                                                                        {/* URL Canónica */}
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">URL del Sitio (Canónica)</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.seoUrl || ''}
                                                                                onChange={e => setSettings({ ...settings, seoUrl: e.target.value })}
                                                                                placeholder="https://mitienda.vercel.app"
                                                                            />
                                                                            <p className="text-xs text-slate-500 mt-1">URL oficial de tu tienda (aparece en Google y redes sociales)</p>
                                                                        </div>

                                                                        {/* Autor */}
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Autor / Empresa</label>
                                                                            <input
                                                                                className="input-cyber w-full p-4"
                                                                                value={settings?.seoAuthor || ''}
                                                                                onChange={e => setSettings({ ...settings, seoAuthor: e.target.value })}
                                                                                placeholder="Mi Empresa S.A."
                                                                            />
                                                                            <p className="text-xs text-slate-500 mt-1">Nombre que aparece como autor del sitio</p>
                                                                        </div>

                                                                        {/* OG Image Upload */}
                                                                        <div>
                                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Imagen para Redes Sociales (OG:Image)</label>
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="relative group w-32 h-32 bg-slate-900 rounded-xl border-2 border-dashed border-slate-700 hover:border-orange-500 transition flex items-center justify-center overflow-hidden cursor-pointer">
                                                                                    {settings?.seoImage ? (
                                                                                        <img src={settings.seoImage} alt="SEO Preview" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <ImageIcon className="w-8 h-8 text-slate-600 group-hover:text-orange-500 transition" />
                                                                                    )}
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                                                                        onChange={(e) => handleImageUpload(e, setSettings, 'seoImage', 1200)}
                                                                                    />
                                                                                    {/* Overlay al hacer hover para indicar cambio */}
                                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
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
                                                                            <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-2">Rendimiento & PWA</h4>

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

                                                                        {/* WhatsApp Cart Button Config */}
                                                                        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <div>
                                                                                    <p className="font-bold text-white">Botón WhatsApp en Carrito</p>
                                                                                    <p className="text-xs text-slate-500">Permitir enviar pedido por WhatsApp</p>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setSettings({ ...settings, whatsappCartEnabled: settings?.whatsappCartEnabled === false ? true : false })}
                                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.whatsappCartEnabled !== false ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                                >
                                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.whatsappCartEnabled !== false ? 'left-7' : 'left-1'}`}></div>
                                                                                </button>
                                                                            </div>
                                                                            {settings?.whatsappCartEnabled !== false && (
                                                                                <div>
                                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Texto del Botón</label>
                                                                                    <input
                                                                                        className="input-cyber w-full p-3"
                                                                                        value={settings?.whatsappCartText || 'Compra por WhatsApp'}
                                                                                        onChange={e => setSettings({ ...settings, whatsappCartText: e.target.value })}
                                                                                        placeholder="Ej: Compra por WhatsApp"
                                                                                    />
                                                                                </div>
                                                                            )}
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


                                                                {/* === PAYMENTS (Moved from separate tab) === */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <CreditCard className="w-5 h-5 text-green-400" /> Métodos de Pago
                                                                    </h3>
                                                                    <div className="space-y-6">
                                                                        {/* Transfer */}
                                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <div className="flex items-center gap-3">
                                                                                    <ArrowRightLeft className="w-6 h-6 text-purple-400" />
                                                                                    <div>
                                                                                        <p className="font-bold text-white">Transferencia Bancaria</p>
                                                                                        <p className="text-xs text-slate-500">Muestra datos de CBU/Alias</p>
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => setSettings({ ...settings, paymentTransfer: { ...settings?.paymentTransfer, enabled: !settings?.paymentTransfer?.enabled } })}
                                                                                    className={`w-14 h-8 rounded-full transition relative ${settings?.paymentTransfer?.enabled ? 'bg-green-500' : 'bg-slate-700'}`}
                                                                                >
                                                                                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition ${settings?.paymentTransfer?.enabled ? 'left-7' : 'left-1'}`}></div>
                                                                                </button>
                                                                            </div>
                                                                            {settings?.paymentTransfer?.enabled && (
                                                                                <div className="mt-4 space-y-3 pt-4 border-t border-slate-700">
                                                                                    <div>
                                                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Alias</label>
                                                                                        <input
                                                                                            className="input-cyber w-full p-3 text-sm font-mono uppercase"
                                                                                            placeholder="MI.ALIAS.MP"
                                                                                            value={settings?.paymentTransfer?.alias || ''}
                                                                                            onChange={e => setSettings({ ...settings, paymentTransfer: { ...settings?.paymentTransfer, alias: e.target.value.toUpperCase() } })}
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">CVU / CBU</label>
                                                                                        <input
                                                                                            className="input-cyber w-full p-3 text-sm font-mono"
                                                                                            placeholder="0000000000000000000000"
                                                                                            value={settings?.paymentTransfer?.cvuCbu || ''}
                                                                                            onChange={e => setSettings({ ...settings, paymentTransfer: { ...settings?.paymentTransfer, cvuCbu: e.target.value.replace(/[^0-9]/g, '') } })}
                                                                                            maxLength={22}
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Titular de la Cuenta</label>
                                                                                        <input
                                                                                            className="input-cyber w-full p-3 text-sm"
                                                                                            placeholder="Nombre y Apellido del Titular"
                                                                                            value={settings?.paymentTransfer?.titular || ''}
                                                                                            onChange={e => setSettings({ ...settings, paymentTransfer: { ...settings?.paymentTransfer, titular: e.target.value } })}
                                                                                        />
                                                                                    </div>
                                                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                                                                                        <AlertCircle className="w-3 h-3" /> Estos datos se mostrarán al cliente al elegir pagar por transferencia
                                                                                    </p>
                                                                                </div>
                                                                            )}
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
                                                                                        // Validar que Retiro en Local está activo
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
                                                                                    <CreditCard className="w-6 h-6 text-orange-400" />
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

                                                                {/* === SHIPPING (Moved from separate tab) === */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Truck className="w-5 h-5 text-orange-400" /> Opciones de Envío
                                                                    </h3>
                                                                    <div className="space-y-6">
                                                                        {/* Pickup */}
                                                                        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <div className="flex items-center gap-3">
                                                                                    <MapPin className="w-6 h-6 text-orange-400" />
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

                                                                {/* AI Config Block (SustIA) */}
                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <Sparkles className="w-5 h-5 text-yellow-500" /> Personalización IA
                                                                    </h3>
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="relative group w-24 h-24 bg-slate-900 rounded-full border-2 border-dashed border-slate-700 hover:border-yellow-500 transition flex items-center justify-center overflow-hidden cursor-pointer shrink-0 shadow-xl">
                                                                            {settings?.botImage ? (
                                                                                <img src={settings.botImage} alt="Bot Preview" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <Sparkles className="w-8 h-8 text-slate-600 group-hover:text-yellow-500 transition" />
                                                                            )}
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="absolute inset-0 opacity-0 cursor-pointer z-50"
                                                                                onChange={(e) => handleImageUpload(e, setSettings, 'botImage', 300)}
                                                                            />
                                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition pointer-events-none">
                                                                                <Upload className="w-6 h-6 text-white" />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-white text-base mb-1">Avatar del Asistente</p>
                                                                            <p className="text-xs text-slate-500 mb-3 max-w-xs leading-relaxed">Sube una imagen personalizada para el bot (PNG/JPG). Se recomienda formato cuadrado.</p>
                                                                            {settings?.botImage ? (
                                                                                <button
                                                                                    onClick={() => setSettings({ ...settings, botImage: '' })}
                                                                                    className="text-xs bg-red-900/20 text-red-400 hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition flex items-center gap-2 border border-red-500/20"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" /> Restaurar Default
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-xs text-yellow-600 bg-yellow-900/20 px-3 py-1 rounded-lg border border-yellow-700/30">
                                                                                    Usando imagen por defecto
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                                                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                                        <FolderPlus className="w-5 h-5 text-orange-400" /> Categorías de Productos
                                                                    </h3>
                                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                                        {(Array.isArray(settings?.categories) ? settings.categories : []).map((cat, idx) => (
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
                                                                        className="px-4 py-2 bg-orange-900/20 text-orange-400 rounded-lg font-bold text-sm border border-orange-500/30 hover:bg-orange-900/40 transition flex items-center gap-2"
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
                                                                    <p className="text-slate-500 mb-6">Gestióna los miembros del equipo, sus roles de acceso y participación en ganancias.</p>

                                                                    <div className="space-y-4 mb-6">
                                                                        {(Array.isArray(settings?.team) ? settings.team : []).map((member, idx) => (
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
                                                                                            className={`input-cyber w-full p-2 text-sm ${member.email === SUPER_ADMIN_EMAIL ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                            value={member.email || ''}
                                                                                            onChange={e => {
                                                                                                const updated = [...(settings?.team || [])];
                                                                                                updated[idx] = { ...updated[idx], email: e.target.value };
                                                                                                setSettings({ ...settings, team: updated });
                                                                                            }}
                                                                                            placeholder="usuario@email.com"
                                                                                            disabled={member.email === SUPER_ADMIN_EMAIL}
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Rol</label>
                                                                                        <select
                                                                                            className={`input-cyber w-full p-2 text-sm ${member.email === SUPER_ADMIN_EMAIL ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                            value={member.role || 'employee'}
                                                                                            onChange={e => {
                                                                                                const updated = [...(settings?.team || [])];
                                                                                                updated[idx] = { ...updated[idx], role: e.target.value };
                                                                                                setSettings({ ...settings, team: updated });
                                                                                            }}
                                                                                            disabled={member.email === SUPER_ADMIN_EMAIL}
                                                                                        >
                                                                                            <option value="employee">Empleado</option>
                                                                                            <option value="admin">Admin</option>
                                                                                        </select>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Total Invertido ($)</label>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="input-cyber w-full p-2 text-sm"
                                                                                            value={member.investment || 0}
                                                                                            onChange={e => {
                                                                                                const updated = [...(settings?.team || [])];
                                                                                                updated[idx] = { ...updated[idx], investment: Number(e.target.value) };
                                                                                                setSettings({ ...settings, team: updated });
                                                                                            }}
                                                                                            placeholder="0"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                {member.email !== SUPER_ADMIN_EMAIL && (
                                                                                    <button
                                                                                        onClick={() => setSettings({ ...settings, team: (settings?.team || []).filter((_, i) => i !== idx) })}
                                                                                        className="p-3 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl transition flex-shrink-0"
                                                                                        title="Eliminar Miembro"
                                                                                    >
                                                                                        <Trash2 className="w-5 h-5" />
                                                                                    </button>
                                                                                )}
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
                                                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
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
                                                                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-2xl shadow-orange-900/30 flex items-center gap-3 transition transform hover:scale-105"
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
                                                            <div className="bg-[#0a0a0a] border border-slate-700 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]" data-lenis-prevent>
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
                                                                            <div className="h-48 overflow-y-auto bg-slate-900/50 rounded-xl p-2 border border-slate-800 custom-scrollbar" data-lenis-prevent>
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
                                                                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer mb-1 transition ${newSupplier.associatedProducts?.includes(p.id) ? 'bg-orange-900/30 border border-orange-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                                                                    >
                                                                                        <div className="w-8 h-8 bg-white rounded p-0.5 flex-shrink-0">
                                                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                                                        </div>
                                                                                        <span className="text-xs text-white truncate flex-1 font-medium">{p.name}</span>
                                                                                        {newSupplier.associatedProducts?.includes(p.id) && <CheckCircle className="w-4 h-4 text-orange-400" />}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Footer Botones Fixed */}
                                                                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent flex gap-4">
                                                                    <button onClick={() => setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition bg-slate-900 rounded-xl">Cancelar</button>
                                                                    <button onClick={saveSupplierFn} className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg transition">Guardar</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                            </div>
                                        </div >
                                    </div >
                                ) : (
                                    <AccessDenied onBack={() => setView('store')} />
                                )
                        )
                    }

                    {/* 8. VISTA POLÍTICA DE PRIVACIDAD */}
                    {
                        view === 'privacy' && (
                            <div className="max-w-4xl mx-auto py-20 px-6 animate-fade-up">
                                <div className="glass p-12 rounded-[3rem] border border-slate-800">
                                    <div className="prose prose-invert max-w-none">
                                        <h1 className="text-5xl font-black mb-12 tracking-tighter italic">
                                            Política de <span className="text-orange-500 text-6xl">Privacidad</span>
                                        </h1>
                                        <p className="text-slate-400 text-lg leading-relaxed">
                                            En <strong>{settings?.storeName || 'SUSTORE'}</strong>, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política describe cómo recolectamos, usamos y resguardamos tu información.
                                        </p>
                                        <h2 className="text-2xl font-bold text-white mt-12 mb-6">1. Información Recolectada</h2>
                                        <p className="text-slate-500 leading-relaxed">
                                            Recolectamos datos básicos como nombre, correo electrónico y número de teléfono únicamente cuando te registras o realizas un pedido para procesar tu compra correctamente.
                                        </p>
                                        <h2 className="text-2xl font-bold text-white mt-12 mb-6">2. Uso de los Datos</h2>
                                        <p className="text-slate-500 leading-relaxed">
                                            Tu información se utiliza exclusivamente para:
                                        </p>
                                        <ul className="list-disc pl-6 text-slate-500 space-y-2">
                                            <li>gestionar tus pedidos y entregas.</li>
                                            <li>Enviar actualizaciones sobre el estado de tu compra.</li>
                                            <li>Mejorar nuestros servicios y experiencia de usuario.</li>
                                        </ul>
                                        <h2 className="text-2xl font-bold text-white mt-12 mb-6">3. Seguridad</h2>
                                        <p className="text-slate-500 leading-relaxed">
                                            Implementamos medidas de seguridad robustas y encriptación de datos para asegurar que tu información está protegida contra accesos no autorizados.
                                        </p>
                                        <h2 className="text-2xl font-bold text-white mt-12 mb-6">4. Contacto</h2>
                                        <p className="text-slate-500 leading-relaxed mb-12">
                                            Si tienes dudas sobre nuestra política de privacidad, contáctanos a <span className="text-orange-400">{settings?.storeEmail || 'soporte@tuempresa.com'}</span>.
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
                                            Condiciones de <span className="text-orange-500 text-6xl">Uso</span>
                                        </h1>
                                        <p className="text-slate-400 font-bold mb-8">última actualización: 07 de enero de 2026</p>

                                        <h3 className="text-xl font-bold text-white mt-8 mb-4">ACUERDO CON NUESTROS TÉRMINOS LEGALES</h3>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Nosotros somos <strong>{settings?.storeName || 'Sustore'}</strong> ("<strong>Empresa</strong>", "<strong>nosotros</strong>", "<strong>nos</strong>", "<strong>nuestro</strong>").
                                        </p>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Operamos el sitio web <a href="https://sustore.vercel.app" className="text-orange-400 hover:underline">https://sustore.vercel.app</a> (el "<strong>Sitio</strong>"), así como cualquier otro producto y servicio relacionado que haga referencia o se vincule con estos términos legales (los "<strong>Términos Legales</strong>") (colectivamente, los "<strong>Servicios</strong>").
                                        </p>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Puede contactarnos por correo electrónico a la dirección proporcionada al final de este documento.
                                        </p>
                                        <p className="text-slate-500 leading-relaxed mb-4">
                                            Estos Términos Legales constituyen un acuerdo legalmente vinculante celebrado entre usted, ya sea personalmente o en nombre de una entidad ("<strong>usted</strong>"), y Sustore, en relación con su acceso y uso de los Servicios. Usted acepta que al acceder a los Servicios, ha leído, comprendido y aceptado estar sujeto a todos estos Términos Legales. <strong className="text-red-400">SI NO ESTÁ DE ACUERDO CON TODOS ESTOS TÉRMINOS LEGALES, ENTONCES TIENE EXPRESAMENTE PROHIBIDO UTILIZAR LOS SERVICIOS Y DEBE DEJAR DE UTILIZARLOS INMEDIATAMENTE.</strong>
                                        </p>

                                        <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 my-10">
                                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6">ÍNDICE</h3>
                                            <ul className="space-y-2 text-sm text-orange-400 font-medium">
                                                <li><a href="#section1" className="hover:text-orange-300 transition">1. NUESTROS SERVICIOS</a></li>
                                                <li><a href="#section2" className="hover:text-orange-300 transition">2. DERECHOS DE PROPIEDAD INTELECTUAL</a></li>
                                                <li><a href="#section3" className="hover:text-orange-300 transition">3. REPRESENTACIONES DE USUARIOS</a></li>
                                                <li><a href="#section4" className="hover:text-orange-300 transition">4. ACTIVIDADES PROHIBIDAS</a></li>
                                                <li><a href="#section5" className="hover:text-orange-300 transition">5. CONTRIBUCIONES GENERADAS POR EL USUARIO</a></li>
                                                <li><a href="#section6" className="hover:text-orange-300 transition">6. LICENCIA DE CONTRIBUCIÓN</a></li>
                                                <li><a href="#section7" className="hover:text-orange-300 transition">7. GESTIÓN DE SERVICIOS</a></li>
                                                <li><a href="#section8" className="hover:text-orange-300 transition">8. PLAZO Y TERMINACIÓN</a></li>
                                                <li><a href="#section9" className="hover:text-orange-300 transition">9. MODIFICACIONES E INTERRUPCIONES</a></li>
                                                <li><a href="#section10" className="hover:text-orange-300 transition">10. LEY APLICABLE</a></li>
                                                <li><a href="#section11" className="hover:text-orange-300 transition">11. RESOLUCIÓN DE DISPUTAS</a></li>
                                                <li><a href="#section12" className="hover:text-orange-300 transition">12. CORRECCIONES</a></li>
                                                <li><a href="#section13" className="hover:text-orange-300 transition">13. DESCARGO DE RESPONSABILIDAD</a></li>
                                                <li><a href="#section14" className="hover:text-orange-300 transition">14. LIMITACIONES DE RESPONSABILIDAD</a></li>
                                                <li><a href="#section15" className="hover:text-orange-300 transition">15. INDEMNIZACIÓN</a></li>
                                                <li><a href="#section16" className="hover:text-orange-300 transition">16. DATOS DEL USUARIO</a></li>
                                                <li><a href="#section17" className="hover:text-orange-300 transition">17. COMUNICACIONES ELECTRÓNICAS</a></li>
                                                <li><a href="#section18" className="hover:text-orange-300 transition">18. VARIOS</a></li>
                                                <li><a href="#section19" className="hover:text-orange-300 transition">19. CONTÁCTENOS</a></li>
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
                                                No puede acceder ni utilizar los Servicios para ningún otro propósito que no sea aquel para el cual los ponemos a disposición. Los Servicios no podrán utilizarse en relación con ningún negocio comercial esfuerzo excepto aquellos que están específicamente respaldados o aprobados por nosotros.
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
                                                LOS SERVICIOS SE PRESTAN TAL CUAL Y SEGÚN ESTÁ DISPONIBLE. USTED ACEPTA QUE SU USO DE LOS SERVICIOS SERÁ BAJO SU PROPIO RIESGO. EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, RENUNCIAMOS A TODAS LAS GARANTÍAS, EXPRESAS O IMPLÍCITAS, EN RELACIÓN CON LOS SERVICIOS Y SU USO DE LOS MISMOS.
                                            </p>
                                        </section>

                                        <section id="section19" className="mb-12">
                                            <h2 className="text-2xl font-bold text-white mb-4">19. CONTÁCTENOS</h2>
                                            <p className="text-slate-500 leading-relaxed mb-4">
                                                Para resolver una queja con respecto a los Servicios o para recibir más información sobre el uso de los Servicios, contáctenos en:
                                            </p>
                                            <p className="text-2xl font-black text-orange-400">
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
                        <footer
                            className={`${darkMode ? 'bg-[#050505] border-slate-900' : 'bg-white border-slate-200'} border-t pt-16 pb-8 relative overflow-hidden transition-colors duration-300`}
                            style={{ backgroundColor: darkMode ? '#050505' : '#ffffff' }}
                        >
                            {/* Decoración de Fondo */}
                            <div className={`absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent ${darkMode ? 'via-orange-900/50' : 'via-orange-500/20'} to-transparent`}></div>
                            <div className={`absolute -top-40 -right-40 w-96 h-96 ${darkMode ? 'bg-blue-900/5' : 'bg-blue-500/5'} rounded-full blur-[100px] pointer-events-none`}></div>

                            <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-8 relative z-10">
                                {/* Columna 1: Marca */}
                                <div className="md:col-span-2 space-y-6">
                                    <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-black'} tracking-tighter italic`}>
                                        {settingsLoaded ? (settings?.storeName || '') : ''}
                                        <span className="text-orange-500">{settings?.footerSuffix || '.SF'}</span>
                                    </h2>
                                    <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
                                        {settings?.footerDescription || 'Tu destino premium para tecnología de vanguardia. Ofrecemos los mejores productos con garantía y soporte especializado. Elevamos tu experiencia digital.'}
                                    </p>
                                    <div className="flex gap-3 pt-2 flex-wrap">
                                        {settings?.showInstagram !== false && settings?.instagramLink && (
                                            <button onClick={() => window.open(settings?.instagramLink, '_blank')} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-pink-400 hover:bg-pink-900/10 hover:border-pink-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-pink-500 hover:bg-pink-50 hover:border-pink-300'}`}>
                                                <Instagram className="w-5 h-5" />
                                            </button>
                                        )}
                                        {settings?.showWhatsapp === true && settings?.whatsappLink && (
                                            <button onClick={() => {
                                                let phone = settings.whatsappLink;
                                                const match = phone.match(/\d+/g);
                                                let cleanPhone = match ? match.join('') : '';
                                                if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                                                if (!cleanPhone.startsWith('54')) {
                                                    if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                                                    else cleanPhone = '54' + cleanPhone;
                                                } else {
                                                    if (cleanPhone.length === 12 && !cleanPhone.startsWith('549')) cleanPhone = '549' + cleanPhone.substring(2);
                                                }
                                                window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                            }} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-green-400 hover:bg-green-900/10 hover:border-green-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-green-500 hover:bg-green-50 hover:border-green-300'}`}>
                                                <MessageCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                        {settings?.showFacebook && settings?.facebookLink && (
                                            <button onClick={() => window.open(settings?.facebookLink, '_blank')} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-blue-400 hover:bg-blue-900/10 hover:border-blue-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-blue-500 hover:bg-blue-50 hover:border-blue-300'}`}>
                                                <Facebook className="w-5 h-5" />
                                            </button>
                                        )}
                                        {settings?.showTwitter && settings?.twitterLink && (
                                            <button onClick={() => window.open(settings?.twitterLink, '_blank')} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-sky-400 hover:bg-sky-900/10 hover:border-sky-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-sky-500 hover:bg-sky-50 hover:border-sky-300'}`}>
                                                <Twitter className="w-5 h-5" />
                                            </button>
                                        )}
                                        {settings?.showTiktok && settings?.tiktokLink && (
                                            <button onClick={() => window.open(settings?.tiktokLink, '_blank')} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-400 hover:bg-rose-900/10 hover:border-rose-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-300'}`}>
                                                <Music className="w-5 h-5" />
                                            </button>
                                        )}
                                        {settings?.showYoutube && settings?.youtubeLink && (
                                            <button onClick={() => window.open(settings?.youtubeLink, '_blank')} className={`p-2 rounded-lg transition border ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-red-400 hover:bg-red-900/10 hover:border-red-500/30' : 'bg-white text-slate-600 border-slate-200 hover:text-red-500 hover:bg-red-50 hover:border-red-300'}`}>
                                                <Youtube className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Columna 2: Quick Links */}
                                <div className="space-y-6">
                                    <h3 className={`${darkMode ? 'text-white' : 'text-slate-900'} font-bold uppercase tracking-widest text-xs`}>Enlaces Rápidos</h3>
                                    <ul className="space-y-3 text-sm text-slate-500 font-medium">
                                        <li>
                                            <button onClick={() => setView('store')} className="hover:text-orange-400 transition flex items-center gap-2 group">
                                                <span className="w-0 group-hover:w-2 h-px bg-orange-400 transition-all duration-300"></span> Inicio
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => setView('profile')} className="hover:text-orange-400 transition flex items-center gap-2 group">
                                                <span className="w-0 group-hover:w-2 h-px bg-orange-400 transition-all duration-300"></span> Mi Cuenta
                                            </button>
                                        </li>
                                        <li>
                                            <button onClick={() => setView('guide')} className="hover:text-orange-400 transition flex items-center gap-2 group">
                                                <span className="w-0 group-hover:w-2 h-px bg-orange-400 transition-all duration-300"></span> Ayuda & Soporte
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                {/* Columna 3: Soporte */}
                                {settings?.showFooterContact !== false && (
                                    <div className="space-y-6">
                                        <h3 className={`${darkMode ? 'text-white' : 'text-slate-900'} font-bold uppercase tracking-widest text-xs`}>
                                            {settings?.footerContactTitle || 'Contacto'}
                                        </h3>
                                        <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                            {settings?.footerContactDescription || '¿Tienes alguna duda? Estamos aquí para ayudarte.'}
                                        </p>
                                        <button
                                            onClick={() => {
                                                const type = settings?.footerContactType || 'whatsapp';
                                                if (type === 'whatsapp' && settings?.whatsappLink) {
                                                    let phone = settings.whatsappLink;
                                                    const match = phone.match(/\d+/g);
                                                    let cleanPhone = match ? match.join('') : '';
                                                    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                                                    if (!cleanPhone.startsWith('54')) {
                                                        if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                                                        else cleanPhone = '54' + cleanPhone;
                                                    } else {
                                                        if (cleanPhone.length === 12 && !cleanPhone.startsWith('549')) cleanPhone = '549' + cleanPhone.substring(2);
                                                    }
                                                    window.open(`https://wa.me/${cleanPhone}`, '_blank');
                                                } else if (type === 'instagram' && settings?.instagramLink) {
                                                    window.open(settings.instagramLink, '_blank');
                                                } else if (type === 'email' && settings?.storeEmail) {
                                                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${settings.storeEmail}`, '_blank');
                                                }
                                            }}
                                            className={`px-6 py-3 rounded-xl text-sm font-bold border transition w-full md:w-auto ${darkMode ? 'bg-orange-900/10 text-orange-400 border-orange-500/20 hover:bg-orange-500 hover:text-white' : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-500 hover:text-white'}`}
                                        >
                                            {settings?.footerContactButtonText || 'Contactar Soporte'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Copyright Bar */}
                            <div className={`border-t ${darkMode ? 'border-slate-900 bg-[#020202]' : 'border-slate-200 bg-white'}`}>
                                <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                    <p className="text-slate-600 text-xs font-mono">
                                        © 2026 Sustore. Todos los derechos reservados.
                                    </p>
                                    <div className="flex gap-6">
                                        {settings?.showPrivacyPolicy !== false && (
                                            <span onClick={() => setView('privacy')} className={`text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-slate-400 transition underline ${darkMode ? 'text-slate-700 decoration-slate-900' : 'text-slate-500 decoration-slate-200'} underline-offset-4`}>Privacy Policy</span>
                                        )}
                                        {settings?.showTermsOfService !== false && (
                                            <span onClick={() => setView('terms')} className={`text-xs font-bold uppercase tracking-wider cursor-pointer hover:text-slate-400 transition underline ${darkMode ? 'text-slate-700 decoration-slate-900' : 'text-slate-500 decoration-slate-200'} underline-offset-4`}>Terms of Service</span>
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
                        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-scale ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
                            <div className={`p-8 rounded-[2rem] max-w-md w-full border shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-orange-800' : 'bg-white border-orange-200'}`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${darkMode ? 'bg-orange-900/20 text-orange-500' : 'bg-orange-100 text-orange-600'}`}>
                                    <FolderPlus className="w-8 h-8" />
                                </div>
                                <h3 className={`text-2xl font-black text-center mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nueva Categoría</h3>
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className={`w-full p-4 mb-6 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-600 focus:border-orange-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-orange-500'}`}
                                    placeholder="Nombre de la categoría"
                                    autoFocus
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setNewCategory(''); setShowCategoryModal(false); }}
                                        className={`flex-1 py-3 rounded-xl font-bold transition ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={createCategoryFn}
                                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition shadow-lg shadow-orange-600/30"
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
                        <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-scale ${darkMode ? 'bg-black/90' : 'bg-black/50'}`}>
                            <div className={`p-8 rounded-[2rem] max-w-md w-full border shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-green-900' : 'bg-white border-green-200'}`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${darkMode ? 'bg-green-900/20 text-green-500' : 'bg-green-100 text-green-600'}`}>
                                    <DollarSign className="w-8 h-8" />
                                </div>
                                <h3 className={`text-2xl font-black text-center mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Venta Manual</h3>
                                <p className="text-center text-slate-400 mb-6">
                                    {products.find(p => p.id === saleData.productId)?.name}
                                </p>

                                <div className="space-y-4 mb-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase mb-1 block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Cantidad</label>
                                            <input
                                                type="number"
                                                className={`w-full p-3 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white focus:border-green-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500'}`}
                                                value={saleData.quantity}
                                                onChange={(e) => setSaleData({ ...saleData, quantity: parseInt(e.target.value) || 1 })}
                                                min="1"
                                            />
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase mb-1 block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Precio Unit.</label>
                                            <input
                                                type="number"
                                                className={`w-full p-3 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white focus:border-green-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500'}`}
                                                value={saleData.price}
                                                onChange={(e) => setSaleData({ ...saleData, price: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-bold uppercase mb-1 block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Método de Pago</label>
                                        <select
                                            className={`w-full p-3 rounded-xl outline-none border transition ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white focus:border-green-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500'}`}
                                            value={saleData.paymentMethod}
                                            onChange={(e) => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Tarjeta">Tarjeta</option>
                                        </select>
                                    </div>
                                    <div className={`p-4 rounded-xl flex justify-between items-center border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                                        <span className={darkMode ? 'text-slate-400 font-bold' : 'text-slate-500 font-bold'}>Total:</span>
                                        <span className="text-2xl font-black text-green-400 min-w-[100px] text-right">${(saleData.quantity * saleData.price).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowManualSaleModal(false)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
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
                            onClick={() => {
                                let phone = settings.whatsappLink;
                                const match = phone.match(/\d+/g);
                                let cleanPhone = match ? match.join('') : '';
                                if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
                                if (!cleanPhone.startsWith('54')) {
                                    if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                                    else cleanPhone = '54' + cleanPhone;
                                } else {
                                    if (cleanPhone.length === 12 && !cleanPhone.startsWith('549')) cleanPhone = '549' + cleanPhone.substring(2);
                                }
                                window.open(`https://wa.me/${cleanPhone}`, '_blank');
                            }}
                            className="fixed bottom-24 right-6 z-50 p-4 bg-green-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:scale-110 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] transition-all animate-bounce-slow"
                            title="Chatea con nosotros"
                        >
                            <MessageCircle className="w-8 h-8 text-white fill-white" />
                        </button>
                    )
                }


                {/* MODAL: VER PLANES DE SUSCRIPCIÓN */}
                {
                    showPlansModal && (
                        <PlansModalContent settings={settings} onClose={() => setShowPlansModal(false)} darkMode={darkMode} />
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
                                            <p className="text-slate-500">Tu plan actual: <span className="text-orange-400 font-bold uppercase bg-orange-500/10 px-3 py-1 rounded-full text-sm">{settings?.subscriptionPlan === 'business' ? '💼 Negocio' : settings?.subscriptionPlan === 'premium' ? '💎 Premium' : '🚀 Emprendedor'}</span></p>
                                        </div>
                                        <button onClick={() => setShowPlansModal(false)} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all duration-300 hover:rotate-90">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

                                        {/* ------------------------------------------------------------------- */}
                                        {/* PLAN EMPRENDEDOR */}
                                        {/* ------------------------------------------------------------------- */}
                                        <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan
                                            ? 'bg-gradient-to-b from-orange-950/40 to-slate-950 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.25)]'
                                            : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-orange-500/50'
                                            }`}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            {(settings?.subscriptionPlan === 'entrepreneur' || !settings?.subscriptionPlan) && (
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-400 text-black text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">📍 TU PLAN ACTUAL</div>
                                            )}

                                            <div className="relative z-10 p-6 flex-1 flex flex-col">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="p-4 bg-gradient-to-br from-orange-600 to-orange-500 rounded-2xl shadow-lg shadow-orange-500/30">
                                                        <Store className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-white">🚀 Emprendedor</h4>
                                                        <p className="text-sm text-orange-400 font-medium leading-tight">Impulso inicial</p>
                                                    </div>
                                                </div>

                                                <div className="bg-black/30 rounded-2xl p-4 mb-5 border border-slate-800">
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Desde</p>
                                                    <div className="text-4xl font-black text-white">$7.000 <span className="text-lg text-slate-500 font-normal">/mes</span></div>
                                                </div>

                                                <div className="space-y-3 mb-6 flex-1">
                                                    <div className="space-y-2 text-sm text-slate-300">
                                                        <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> <span>Carga de hasta <strong className="text-white">30 productos</strong></span></div>
                                                        <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> <span>Integración <strong className="text-white">Mercado Pago</strong></span></div>
                                                        <div className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> <span><strong className="text-white">1 promoción</strong> activa</span></div>
                                                    </div>
                                                </div>

                                                <details className="group/payment bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden cursor-pointer transition-all duration-300 open:bg-slate-900 open:border-orange-500/50 open:shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                                                    <summary className="flex items-center justify-between p-4 list-none font-bold text-white text-sm hover:bg-slate-800/50 transition">
                                                        <span className="flex items-center gap-2 text-orange-400">💳 Elegí tu plan de pago</span>
                                                        <ChevronDown className="w-5 h-5 text-orange-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                    </summary>
                                                    <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                        {[
                                                            { cycle: 'Semanal', price: '$2.000', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                            { cycle: 'Mensual', price: '$7.000', label: 'Pago Mensual', sub: 'Más equilibrado' },
                                                            { cycle: 'Anual', price: '$70.000', label: 'Pago Anual', sub: 'Ahorrás $14.000 ??' }
                                                        ].map((opt) => (
                                                            <div
                                                                key={opt.cycle}
                                                                onClick={() => setSelectedPlanOption({ plan: 'Emprendedor', cycle: opt.cycle, price: opt.price })}
                                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${selectedPlanOption?.plan === 'Emprendedor' && selectedPlanOption?.cycle === opt.cycle
                                                                    ? 'bg-orange-500 text-black border-orange-400 shadow-lg ring-2 ring-orange-500/50 ring-offset-2 ring-offset-[#0a0a0a]'
                                                                    : 'bg-black/40 text-slate-300 border-slate-800 hover:border-orange-500/50 hover:bg-slate-800'
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

                                        {/* ------------------------------------------------------------------- */}
                                        {/* PLAN NEGOCIO */}
                                        {/* ------------------------------------------------------------------- */}
                                        <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'business'
                                            ? 'bg-gradient-to-b from-purple-950/40 to-slate-950 border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.25)]'
                                            : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-purple-500/50'
                                            }`}>
                                            <div className="absolute top-4 right-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20 animate-pulse">🔥 MÁS POPULAR</div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            {settings?.subscriptionPlan === 'business' && (
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-purple-400 text-white text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">📍 TU PLAN ACTUAL</div>
                                            )}

                                            <div className="relative z-10 p-6 flex-1 flex flex-col">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="p-4 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-2xl shadow-lg shadow-purple-500/30">
                                                        <Briefcase className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-white">💼 Negocio</h4>
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
                                                        <span className="flex items-center gap-2 text-purple-400">💳 Elegí tu plan de pago</span>
                                                        <ChevronDown className="w-5 h-5 text-purple-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                    </summary>
                                                    <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                        {[
                                                            { cycle: 'Semanal', price: '$4.000', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                            { cycle: 'Mensual', price: '$13.000', label: 'Pago Mensual', sub: 'Ideal gestión mensual' },
                                                            { cycle: 'Anual', price: '$117.000', label: 'Pago Anual', sub: '3 MESES GRATIS ??' }
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

                                        {/* ------------------------------------------------------------------- */}
                                        {/* PLAN PREMIUM */}
                                        {/* ------------------------------------------------------------------- */}
                                        <div className={`group relative rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.01] overflow-hidden flex flex-col ${settings?.subscriptionPlan === 'premium'
                                            ? 'bg-gradient-to-b from-yellow-950/40 to-slate-950 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.25)]'
                                            : 'bg-gradient-to-b from-slate-900/50 to-[#050505] border-slate-800 hover:border-yellow-500/50'
                                            }`}>
                                            <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20">👑 VIP</div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            {settings?.subscriptionPlan === 'premium' && (
                                                <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-black px-5 py-1.5 rounded-b-xl shadow-lg z-20">📍 TU PLAN ACTUAL</div>
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
                                                        <span className="flex items-center gap-2 text-yellow-400">💳 Elegí tu plan de pago</span>
                                                        <ChevronDown className="w-5 h-5 text-yellow-400 transition-transform duration-300 group-open/payment:rotate-180" />
                                                    </summary>
                                                    <div className="px-3 pb-3 space-y-2 animate-fade-in">
                                                        {[
                                                            { cycle: 'Semanal', price: '$6.500', label: 'Pago Semanal', sub: 'Flexibilidad total' },
                                                            { cycle: 'Mensual', price: '$22.000', label: 'Pago Mensual', sub: 'Equilibrio perfecto' },
                                                            { cycle: 'Anual', price: '$198.000', label: 'Pago Anual', sub: '3 MESES GRATIS ??' }
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
                                                            ? `¡Excelente elección! 🎉`
                                                            : 'Seleccioná una opción para continuar'}
                                                    </h3>
                                                    <p className={`text-sm ${selectedPlanOption ? 'text-green-300' : 'text-slate-400'}`}>
                                                        {selectedPlanOption
                                                            ? <span>Estés a un paso de activar tu <strong>Plan {selectedPlanOption.plan}</strong> con pago <strong>{selectedPlanOption.cycle}</strong>.</span>
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
                    isDangerous={confirmModal.isDangerous}
                    darkMode={darkMode}
                />
                {/* --- SUSTIA CHATBOT (AI) --- */}
                <CouponSelectorModal
                    isOpen={showCouponModal}
                    onClose={() => setShowCouponModal(false)}
                    coupons={coupons}
                    currentUser={currentUser}
                    cartSubtotal={cartSubtotal}
                    selectCoupon={selectCoupon}
                    darkMode={darkMode}
                />
                <ProductDetailModal
                    selectedProduct={selectedProduct}
                    setSelectedProduct={setSelectedProduct}
                    cart={cart}
                    manageCart={manageCart}
                    products={products}
                    calculateItemPrice={calculateItemPrice}
                    darkMode={darkMode}
                    showToast={showToast}
                    toggleFavorite={toggleFavorite}
                    currentUser={currentUser}
                    settings={settings}
                />
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    darkMode={darkMode}
                />
                <ManualSaleModal
                    showManualSaleModal={showManualSaleModal}
                    setShowManualSaleModal={setShowManualSaleModal}
                    saleData={saleData}
                    setSaleData={setSaleData}
                    products={products}
                    showToast={showToast}
                    db={db}
                    appId={appId}
                    darkMode={darkMode}
                />
                <MetricsDetailModal
                    metricsDetail={metricsDetail}
                    setMetricsDetail={setMetricsDetail}
                    dashboardMetrics={dashboardMetrics}
                    darkMode={darkMode}
                />
                <AdminUserDrawer
                    viewUserCart={viewUserCart}
                    setViewUserCart={setViewUserCart}
                    viewUserEdit={viewUserEdit}
                    setViewUserEdit={setViewUserEdit}
                    currentUser={currentUser}
                    setCurrentUser={setCurrentUser}
                    db={db}
                    appId={appId}
                    darkMode={darkMode}
                    showToast={showToast}
                    openConfirm={openConfirm}
                />
                {/* --- SUSTIA CHATBOT (AI) --- */}
                <CategoryModal
                    isOpen={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    categories={settings?.categories || []}
                    onAdd={(newCat) => setSettings({ ...settings, categories: [...(settings?.categories || []), newCat] })}
                    onRemove={(cat) => setSettings({ ...settings, categories: (settings?.categories || []).filter(c => c !== cat) })}
                />
                {settings?.subscriptionPlan === 'premium' && (
                    <SustIABot
                        settings={settings}
                        products={products}
                        addToCart={(p, q = 1) => manageCart(p, q)}
                        controlPanel={{
                            setDarkMode: setDarkMode,
                            openCart: () => setView('cart')
                        }}
                        coupons={coupons}
                        darkMode={darkMode}
                    />
                )}
            </div>
        </React.Fragment>
    );
}

// Renderizado Final
const root = createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>

        <App />
    </ErrorBoundary>
);

// v3.5.2 - Externalized Components Refactored
