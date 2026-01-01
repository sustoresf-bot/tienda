import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
// Importación MASIVA de iconos para cubrir todas las necesidades visuales de la interfaz antigua y nueva
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, 
    Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, 
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, 
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, 
    ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, 
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp, CheckSquare, XCircle, MoreVertical,
    Activity, Database, Server, Smartphone, Headphones, Monitor, Speaker, Wifi, Battery, MousePointer,
    Layout, Grid, List, Bell, Link, Share2, Printer, Download, Upload, Camera, Video, Mic, Volume2,
    Sun, Moon, Globe, Map, Navigation, Crosshair, Target, Disc, Layers, Sidebar, Box, Hexagon
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, 
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';

/**
 * =================================================================================================
 * CONFIGURACIÓN DE FIREBASE E INICIALIZACIÓN DE SERVICIOS
 * =================================================================================================
 * No modificar esta sección a menos que cambien las credenciales del proyecto.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
  authDomain: "sustore-63266.firebaseapp.com",
  projectId: "sustore-63266",
  storageBucket: "sustore-63266.firebasestorage.app",
  messagingSenderId: "684651914850",
  appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
  measurementId: "G-X3K7XGYPRD"
};

// Inicialización de la aplicación Firebase
const app = initializeApp(firebaseConfig);
// Servicio de Autenticación
const auth = getAuth(app);
// Servicio de Base de Datos Firestore
const db = getFirestore(app);

// Constantes Globales del Sistema
const APP_ID = "sustore-prod-v3"; // Identificador de versión para aislar datos
const SUPER_ADMIN_EMAIL = "lautarocorazza63@gmail.com"; // Email con permisos irrevocables

/**
 * =================================================================================================
 * CONFIGURACIÓN POR DEFECTO DEL SISTEMA (FALLBACK SETTINGS)
 * =================================================================================================
 * Estos valores se utilizan cuando no se encuentra configuración en la base de datos o para
 * inicializar el sistema por primera vez. Incluye toda la personalización posible.
 */
const defaultSettings = {
    // Identidad de la Marca
    storeName: "SUSTORE", 
    primaryColor: "#06b6d4", 
    secondaryColor: "#8b5cf6",
    currency: "$", 
    
    // Equipo y Accesos
    admins: SUPER_ADMIN_EMAIL, 
    team: [
        { 
            email: SUPER_ADMIN_EMAIL, 
            role: "admin", 
            name: "Lautaro Corazza",
            position: "CEO & Founder",
            avatar: "",
            accessLevel: "full"
        }
    ],
    
    // Contacto y Redes
    sellerEmail: "sustoresf@gmail.com", 
    instagramUser: "sustore_sf", 
    whatsappLink: "https://wa.me/message/3MU36VTEKINKP1", 
    facebookUser: "",
    tiktokUser: "",
    
    // Recursos Visuales
    logoUrl: "", 
    heroUrl: "", 
    
    // Reglas de Negocio
    markupPercentage: 0, // Margen global opcional
    enableStockCheck: true, // Validar stock al comprar
    enableGuestCheckout: true, // Permitir compra sin cuenta (opcional)
    
    // Textos y Contenidos
    announcementMessage: "🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥",
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado para asegur[...]
    
    // Categorización
    categories: [
        "Celulares", 
        "Accesorios", 
        "Audio", 
        "Computación", 
        "Gaming",
        "Tablets",
        "Smartwatch",
        "Cargadores",
        "Periféricos",
        "Ofertas"
    ]
};

/**
 * =================================================================================================
 * UTILIDADES Y HELPERS (FUNCIONES DE APOYO)
 * =================================================================================================
 */

// Formateador de Moneda Seguro (ARS por defecto)
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Formateador de Fechas Largo
const formatDateLong = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Formateador de Fechas Corto
const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR');
};

// Calculadora de Precios Centralizada
// Maneja descuentos, costos y márgenes en un solo lugar para evitar errores de lógica
const calculateProductMetrics = (basePrice, discountPercent, costPrice = 0) => {
    const base = Number(basePrice) || 0;
    const discount = Number(discountPercent) || 0;
    const cost = Number(costPrice) || 0;
    
    // Precio Final al Público
    const finalPrice = discount > 0 
        ? Math.ceil(base * (1 - discount / 100)) 
        : base;
        
    // Ganancia Neta
    const profit = finalPrice - cost;
    
    // Margen de Ganancia (%)
    const margin = cost > 0 ? ((profit / cost) * 100).toFixed(1) : 100;

    return {
        base,
        discount,
        cost,
        finalPrice,
        profit,
        margin,
        hasDiscount: discount > 0,
        discountAmount: base - finalPrice
    };
};

/**
 * =================================================================================================
 * COMPONENTES DE INTERFAZ DE USUARIO (UI KIT)
 * =================================================================================================
 * Componentes reutilizables diseñados para mantener consistencia visual y reducir repetición.
 */

// 1. Componente Toast (Notificaciones Flotantes Avanzadas)
const ToastNotification = ({ id, message, type, onClose }) => {
    // Definición de estilos dinámicos basados en el tipo de alerta
    let containerClasses = "fixed top-24 right-4 z-[9999] flex items-center gap-4 p-5 rounded-2xl border-l-4 backdrop-blur-xl animate-fade-up shadow-2xl transition-all duration-300 min-w-[320px] max-w[...]
    let iconContainerClasses = "p-3 rounded-full flex items-center justify-center shrink-0";
    let Icon = Info;
    let textColor = "text-white";

    switch (type) {
        case 'success':
            containerClasses += " border-green-500 bg-black/90 shadow-[0_0_20px_rgba(34,197,94,0.2)]";
            iconContainerClasses += " bg-green-500/20 text-green-400";
            Icon = CheckCircle;
            textColor = "text-green-50";
            break;
        case 'error':
            containerClasses += " border-red-500 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
            iconContainerClasses += " bg-red-500/20 text-red-400";
            Icon = AlertCircle;
            textColor = "text-red-50";
            break;
        case 'warning':
            containerClasses += " border-yellow-500 bg-black/90 shadow-[0_0_20px_rgba(234,179,8,0.2)]";
            iconContainerClasses += " bg-yellow-500/20 text-yellow-400";
            Icon = AlertTriangle;
            textColor = "text-yellow-50";
            break;
        case 'info':
        default:
            containerClasses += " border-cyan-500 bg-black/90 shadow-[0_0_20px_rgba(6,182,212,0.2)]";
            iconContainerClasses += " bg-cyan-500/20 text-cyan-400";
            Icon = Info;
            textColor = "text-cyan-50";
            break;
    }

    // Auto-cierre después de 4 segundos
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <div className={containerClasses} role="alert">
            <div className={iconContainerClasses}>
                <Icon className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
                <p className={`font-bold text-sm tracking-wide leading-snug ${textColor}`}>
                    {message}
                </p>
            </div>
            <button 
                onClick={() => onClose(id)} 
                className="ml-2 text-white/40 hover:text-white transition p-2 hover:bg-white/10 rounded-xl"
                aria-label="Cerrar notificación"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// 2. Componente Modal Genérico (Base para todos los diálogos)
const Modal = ({ isOpen, onClose, title, children, size = "md", icon: Icon }) => {
    if (!isOpen) return null;

    // Tamaños configurables
    const sizes = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        full: "max-w-[95vw]"
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
            {/* Backdrop con Blur */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" 
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Contenedor del Modal */}
            <div className={`relative bg-[#0a0a0a] border border-slate-800 rounded-[2.5rem] shadow-2xl w-full ${sizes[size]} transform transition-all duration-300 animate-fade-up flex flex-col max-h-[[...]
                
                {/* Cabecera Neon */}
                <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-900/50 to-transparent rounded-t-[2.5rem]">
                    <div className="flex items-center gap-4">
                        {Icon && (
                            <div className="p-3 bg-slate-800 rounded-xl text-cyan-400 shadow-lg shadow-cyan-900/20 border border-slate-700">
                                <Icon className="w-6 h-6" />
                            </div>
                        )}
                        <h3 className="text-2xl font-black text-white tracking-tight">{title}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-red-900/20 hover:border-red-500/30 border border-slate-800 transition duration-300 group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>

                {/* Cuerpo Scrollable */}
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#050505] relative">
                    {children}
                </div>
                
                {/* Decoración Cyberpunk */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 opacity-20"></div>
            </div>
        </div>
    );
};

// 3. Componente Input Personalizado (Cyber Style)
const InputField = ({ label, type = "text", value, onChange, placeholder, icon: Icon, required = false, disabled = false, min, max }) => (
    <div className="space-y-2 w-full">
        {label && (
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                {Icon && <Icon className="w-3 h-3" />} {label} {required && <span className="text-red-500">*</span>}
            </label>
        )}
        <div className="relative group">
            <input 
                type={type} 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                className={`
                    w-full bg-[#0f0f13] border border-slate-800 rounded-xl p-4 pl-4 
                    text-white placeholder-slate-600 font-medium transition-all duration-300
                    focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 focus:bg-[#161620] outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${Icon ? 'pl-12' : ''}
                `}
            />
            {Icon && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300 pointer-events-none">
                    <Icon className="w-5 h-5" />
                </div>
            )}
        </div>
    </div>
);

// 4. Componente TextArea Personalizado
const TextAreaField = ({ label, value, onChange, placeholder, rows = 4 }) => (
    <div className="space-y-2 w-full">
        {label && (
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 block">
                {label}
            </label>
        )}
        <textarea 
            value={value} 
            onChange={onChange} 
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-[#0f0f13] border border-slate-800 rounded-xl p-4 text-white placeholder-slate-600 font-medium transition-all duration-300 focus:border-cyan-500 focus:ring[...]
        />
    </div>
);

// 5. Componente Botón Primario/Secundario
const Button = ({ children, onClick, variant = "primary", className = "", icon: Icon, isLoading = false, disabled = false, type = "button" }) => {
    const baseStyle = "relative overflow-hidden rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"[...]
    
    const variants = {
        primary: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/30 py-4 px-8",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 py-4 px-8",
        danger: "bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 hover:border-red-500 py-3 px-6",
        success: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 py-3 px-6",
        ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white py-2 px-4"
    };

    return (
        <button 
            type={type}
            onClick={onClick} 
            disabled={disabled || isLoading} 
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
};

// 6. Modal de Confirmación Global (Reemplazo de window.confirm)
const ConfirmationDialog = ({ config, onConfirm, onCancel }) => {
    if (!config.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={onCancel}></div>
            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] max-w-sm w-full relative z-10 shadow-2xl animate-fade-up">
                
                {/* Icono Central */}
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 shadow-xl ${config.isDangerous ? 'bg-red-900/20 text-red-500 border border-red-500/20' : 'bg-cyan-[...]
                    {config.isDangerous ? <AlertTriangle className="w-10 h-10" /> : <Info className="w-10 h-10" />}
                </div>

                <h3 className="text-2xl font-black text-white text-center mb-3">{config.title}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">{config.message}</p>

                <div className="grid gap-3">
                    <Button 
                        onClick={onConfirm} 
                        variant={config.isDangerous ? "danger" : "primary"}
                        className="w-full py-4"
                    >
                        {config.confirmText || "Confirmar"}
                    </Button>
                    <Button 
                        onClick={onCancel} 
                        variant="secondary"
                        className="w-full py-4"
                    >
                        {config.cancelText || "Cancelar"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
/**
 * =================================================================================================
 * CUSTOM HOOKS (LÓGICA REUTILIZABLE)
 * =================================================================================================
 * Estos hooks encapsulan lógica compleja para mantener el componente principal limpio y robusto.
 */

// Hook para manejar valores con retardo (Búsquedas optimizadas)
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// Hook para almacenamiento local seguro (Persistencia)
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        if (typeof window === "undefined") return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = (value) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };
    return [storedValue, setValue];
};

/**
 * =================================================================================================
 * COMPONENTE PRINCIPAL (ORQUESTADOR DE LA APLICACIÓN)
 * =================================================================================================
 */
function App() {
    // ---------------------------------------------------------------------------------------------
    // 1. GESTIÓN DE ESTADO GLOBAL (STATE MANAGEMENT)
    // ---------------------------------------------------------------------------------------------
    
    // --- Control de Navegación y UI ---
    const [view, setView] = useState('store'); // Vistas: store, cart, checkout, profile, admin, login...
    const [adminTab, setAdminTab] = useState('dashboard'); // Tabs Admin: dashboard, products, orders...
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Menú hamburguesa móvil
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false); // Sidebar admin móvil
    const [isLoading, setIsLoading] = useState(true); // Carga inicial del sistema
    const [notifications, setNotifications] = useState([]); // Sistema de Toasts
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // --- Datos del Usuario y Sesión ---
    const [systemUser, setSystemUser] = useState(null); // Usuario de Firebase Auth
    const [currentUser, setCurrentUser] = useLocalStorage('nexus_user_v2', null); // Datos completos del usuario (DB)
    
    // --- Datos de Negocio (Sincronizados con Firestore) ---
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);
    
    // --- Carrito de Compras (Complejo) ---
    const [cart, setCart] = useLocalStorage('nexus_cart_v2', []);
    const [liveCarts, setLiveCarts] = useState([]); // Monitor de carritos en tiempo real (Admin)

    // --- Estados de Formularios y Filtros ---
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 }); // Filtro de precio
    
    // --- Estados de Autenticación (Login/Register) ---
    const [authForm, setAuthForm] = useState({
        email: '', password: '', name: '', username: '', dni: '', phone: '', address: ''
    });
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    // --- Estados de Checkout (Proceso de Compra) ---
    const [checkoutForm, setCheckoutForm] = useState({
        address: '', city: '', province: '', zipCode: '', phone: '', notes: '', paymentMethod: ''
    });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);

    // --- Estados de Administración (CRUD) ---
    // Productos
    const [productForm, setProductForm] = useState({
        id: null, name: '', description: '', basePrice: '', costPrice: '', 
        stock: '', category: '', image: '', discount: 0, featured: false
    });
    const [showProductModal, setShowProductModal] = useState(false);
    
    // Cupones
    const [couponForm, setCouponForm] = useState({
        code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0,
        expirationDate: '', usageLimit: 0, targetType: 'global', targetUser: ''
    });
    const [showCouponFormModal, setShowCouponFormModal] = useState(false);

    // Proveedores
    const [supplierForm, setSupplierForm] = useState({
        name: '', contactName: '', phone: '', email: '', website: '', notes: '', associatedProducts: []
    });
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    // Configuración
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });

    // Modales de Visualización
    const [selectedOrder, setSelectedOrder] = useState(null); // Para ver detalles de pedido
    const [selectedProduct, setSelectedProduct] = useState(null); // Para vista rápida
    const fileInputRef = useRef(null); // Referencia para input de archivo oculto

    // ---------------------------------------------------------------------------------------------
    // 2. SISTEMA DE NOTIFICACIONES Y FEEDBACK
    // ---------------------------------------------------------------------------------------------
    
    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const openConfirm = (title, message, onConfirm, isDangerous = false) => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            },
            cancelText: "Cancelar",
            confirmText: isDangerous ? "Eliminar" : "Confirmar",
            isDangerous
        });
    };

    // ---------------------------------------------------------------------------------------------
    // 3. SINCRONIZACIÓN DE DATOS (FIREBASE LISTENERS)
    // ---------------------------------------------------------------------------------------------

    // A. Inicialización de Auth y Usuario
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setSystemUser(user);
            
            if (user) {
                // Si hay usuario autenticado, buscar su perfil completo en Firestore
                try {
                    // Primero intentamos por ID de Auth
                    let userDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', user.uid);
                    let userSnap = await getDoc(userDocRef);

                    // Si no existe (login anónimo o migración), intentamos buscar por email si existe en local
                    if (!userSnap.exists() && currentUser?.email) {
                        const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), where("email", "==", currentUser.email));
                        const querySnap = await getDocs(q);
                        if (!querySnap.empty) {
                            userSnap = querySnap.docs[0];
                        }
                    }

                    if (userSnap && userSnap.exists()) {
                        const userData = { ...userSnap.data(), id: userSnap.id };
                        // Actualizar solo si hay cambios para evitar re-renders infinitos
                        if (JSON.stringify(userData) !== JSON.stringify(currentUser)) {
                            setCurrentUser(userData);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                // Si no hay usuario, iniciamos anónimamente para permitir lectura
                signInAnonymously(auth).catch(e => console.error("Anon auth failed", e));
            }
            
            setIsLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    // B. Listeners de Colecciones (Datos en Tiempo Real)
    useEffect(() => {
        if (!systemUser) return;

        // Listener de Productos
        const unsubProducts = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProducts(data);
        }, (error) => console.error("Error products listener:", error));

        // Listener de Pedidos (Ordenados por fecha localmente luego)
        const unsubOrders = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar descendente por fecha
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setOrders(data);
        }, (error) => console.error("Error orders listener:", error));

        // Listener de Configuración
        const unsubSettings = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                // Fusión defensiva con defaults
                const finalSettings = {
                    ...defaultSettings,
                    ...data,
                    categories: data.categories || defaultSettings.categories,
                    team: data.team || defaultSettings.team
                };
                setSettings(finalSettings);
                setTempSettings(finalSettings); // Sincronizar temp para edición
            } else {
                // Inicializar si no existe
                addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'settings'), defaultSettings);
            }
        });

        // Listeners solo para Admin (Optimización)
        let unsubUsers = () => {};
        let unsubCoupons = () => {};
        let unsubSuppliers = () => {};
        let unsubLiveCarts = () => {};

        // Validamos si el usuario actual tiene rol de acceso (aunque sea localmente por ahora)
        const hasAdminAccess = currentUser?.role === 'admin' || currentUser?.role === 'employee' || systemUser.email === SUPER_ADMIN_EMAIL;

        if (true) { // Habilitamos carga para todos por ahora para evitar problemas de permisos visuales, filtramos en UI
            
            // Usuarios
            unsubUsers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            // Cupones
            unsubCoupons = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'coupons'), (snapshot) => {
                setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });

            // Proveedores
            unsubSuppliers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'suppliers'), (snapshot) => {
                setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            
            // Live Carts (Carritos activos)
            unsubLiveCarts = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'carts'), (snapshot) => {
                const carts = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(c => c.items && c.items.length > 0); // Solo carritos con items
                setLiveCarts(carts);
            });
        }

        return () => {
            unsubProducts();
            unsubOrders();
            unsubSettings();
            unsubUsers();
            unsubCoupons();
            unsubSuppliers();
            unsubLiveCarts();
        };
    }, [systemUser, currentUser]); // Dependencias del efecto

    // C. Sincronización del Carrito Local a Remoto
    useEffect(() => {
        if (currentUser?.id && cart) {
            const syncCartToCloud = async () => {
                try {
                    const cartRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'carts', currentUser.id);
                    await setDoc(cartRef, {
                        userId: currentUser.id,
                        userName: currentUser.name || 'Anónimo',
                        email: currentUser.email || '',
                        items: cart.map(item => ({
                            productId: item.product.id,
                            name: item.product.name,
                            quantity: item.quantity,
                            price: item.product.basePrice,
                            image: item.product.image
                        })),
                        lastUpdated: new Date().toISOString(),
                        totalValue: cart.reduce((acc, item) => acc + (item.product.basePrice * item.quantity), 0)
                    });
                } catch (e) {
                    console.error("Error syncing cart to cloud:", e);
                }
            };
            
            const timeout = setTimeout(syncCartToCloud, 2000); // Debounce de 2s
            return () => clearTimeout(timeout);
        }
    }, [cart, currentUser]);

    // ---------------------------------------------------------------------------------------------
    // 4. LÓGICA DE NEGOCIO COMPUTADA (MÉTRICAS Y FILTROS)
    // ---------------------------------------------------------------------------------------------

    // Filtrado de Productos
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                                  p.category.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
            const matchesPrice = p.basePrice >= priceRange.min && p.basePrice <= priceRange.max;
            return matchesSearch && matchesCategory && matchesPrice;
        });
    }, [products, debouncedSearch, selectedCategory, priceRange]);

    // Cálculo de Dashboard Admin (Completo)
    const dashboardStats = useMemo(() => {
        const stats = {
            totalRevenue: 0,
            totalProfit: 0,
            totalOrders: orders.length,
            pendingOrders: 0,
            completedOrders: 0,
            totalUsers: users.length,
            activeCarts: liveCarts.length,
            lowStockProducts: [],
            topProducts: [], // Best Sellers
            mostViewedProducts: [], // Simulado con 'interest'
            recentActivity: []
        };

        const productSales = {}; // { productId: { quantity: 0, revenue: 0, name: '', image: '' } }

        orders.forEach(order => {
            // Contabilizar dinero solo de órdenes no canceladas
            if (order.status !== 'Cancelado') {
                stats.totalRevenue += Number(order.total) || 0;
                
                // Calcular ganancia real basada en costo histórico
                const orderProfit = (order.items || []).reduce((acc, item) => {
                    const cost = Number(item.cost_price) || 0;
                    const sale = Number(item.unit_price) || 0;
                    return acc + ((sale - cost) * item.quantity);
                }, 0);
                stats.totalProfit += orderProfit;
            }

            // Contadores de estado
            if (order.status === 'Pendiente') stats.pendingOrders++;
            if (order.status === 'Realizado') stats.completedOrders++;

            // Análisis de Productos Vendidos
            (order.items || []).forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = { 
                        id: item.productId,
                        quantity: 0, 
                        revenue: 0, 
                        name: item.title, 
                        image: item.image 
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += (item.unit_price * item.quantity);
            });
        });

        // Top Productos (Más vendidos por cantidad)
        stats.topProducts = Object.values(productSales)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        // Productos con bajo stock
        stats.lowStockProducts = products
            .filter(p => p.stock <= 3)
            .map(p => ({ ...p, status: p.stock === 0 ? 'Agotado' : 'Crítico' }));

        // Simulación de "Más Vistos / Interés" basado en Carritos Activos + Favoritos
        const interestMap = {};
        liveCarts.forEach(c => c.items.forEach(i => {
            interestMap[i.productId] = (interestMap[i.productId] || 0) + 3; // Carrito vale 3 puntos
        }));
        users.forEach(u => (u.favorites || []).forEach(fid => {
            interestMap[fid] = (interestMap[fid] || 0) + 1; // Fav vale 1 punto
        }));
        
        stats.mostViewedProducts = Object.entries(interestMap)
            .map(([id, score]) => {
                const p = products.find(prod => prod.id === id);
                return p ? { ...p, interestScore: score } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.interestScore - a.interestScore)
            .slice(0, 5);

        return stats;
    }, [orders, products, users, liveCarts]);
    // ---------------------------------------------------------------------------------------------
    // 5. MANEJADORES DE AUTENTICACIÓN Y USUARIOS
    // ---------------------------------------------------------------------------------------------

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setIsAuthLoading(true);

        try {
            const usersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'users');
            
            if (!isLoginMode) {
                // --- REGISTRO DE NUEVO USUARIO ---
                
                // 1. Validaciones Exhaustivas
                if (!authForm.name || authForm.name.length < 3) throw new Error("El nombre es demasiado corto.");
                if (!authForm.username || authForm.username.length < 3) throw new Error("El usuario debe tener al menos 3 caracteres.");
                if (!authForm.email.includes('@')) throw new Error("El formato del email no es válido.");
                if (authForm.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                if (!authForm.dni) throw new Error("El DNI es obligatorio para la facturación.");

                // 2. Verificar duplicados (Email)
                const qEmail = query(usersRef, where("email", "==", authForm.email));
                const emailCheck = await getDocs(qEmail);
                if (!emailCheck.empty) throw new Error("Este correo electrónico ya está registrado.");

                // 3. Verificar duplicados (Usuario)
                const qUser = query(usersRef, where("username", "==", authForm.username));
                const userCheck = await getDocs(qUser);
                if (!userCheck.empty) throw new Error("Este nombre de usuario ya está en uso.");

                // 4. Crear Objeto de Usuario
                const newUser = {
                    ...authForm,
                    role: 'user', // Por defecto nadie es admin
                    joinDate: new Date().toISOString(),
                    favorites: [],
                    ordersCount: 0,
                    totalSpent: 0,
                    lastLogin: new Date().toISOString(),
                    avatar: '', // Futuro: avatar personalizado
                    status: 'active'
                };

                // 5. Guardar en Firestore
                const docRef = await addDoc(usersRef, newUser);
                const userWithId = { ...newUser, id: docRef.id };
                
                setCurrentUser(userWithId);
                addNotification("¡Bienvenido! Tu cuenta ha sido creada con éxito.", "success");

            } else {
                // --- INICIO DE SESIÓN ---

                // 1. Buscar por Email y Password
                let q = query(usersRef, where("email", "==", authForm.email), where("password", "==", authForm.password));
                let snap = await getDocs(q);

                // 2. Si falla, intentar buscar por Nombre de Usuario y Password
                if (snap.empty) {
                    q = query(usersRef, where("username", "==", authForm.email), where("password", "==", authForm.password));
                    snap = await getDocs(q);
                }

                if (snap.empty) throw new Error("Credenciales incorrectas. Verifica tus datos.");

                // 3. Login Exitoso
                const userData = { ...snap.docs[0].data(), id: snap.docs[0].id };
                
                // Actualizar última conexión
                updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userData.id), {
                    lastLogin: new Date().toISOString()
                });

                setCurrentUser(userData);
                addNotification(`Hola de nuevo, ${userData.name}.`, "success");
            }

            // Limpieza y Redirección
            setView('store');
            setAuthForm({ email: '', password: '', name: '', username: '', dni: '', phone: '', address: '' });
            
        } catch (error) {
            console.error("Auth Error:", error);
            addNotification(error.message, "error");
        } finally {
            setIsAuthLoading(false);
        }
    };

    const handleLogout = () => {
        openConfirm(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres salir de tu cuenta?",
            () => {
                setCurrentUser(null);
                setCart([]); // Opcional: limpiar carrito local al salir
                setView('store');
                addNotification("Has cerrado sesión correctamente.", "info");
            }
        );
    };

    // ---------------------------------------------------------------------------------------------
    // 6. GESTIÓN DEL CARRITO Y FAVORITOS
    // ---------------------------------------------------------------------------------------------

    const handleAddToCart = (product, quantity = 1) => {
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);
            const currentQty = existingItemIndex >= 0 ? prevCart[existingItemIndex].quantity : 0;
            const newQty = currentQty + quantity;

            // Validación de Stock Estricta
            if (settings.enableStockCheck && newQty > product.stock) {
                addNotification(`Stock insuficiente. Solo quedan ${product.stock} unidades disponibles.`, "warning");
                return prevCart;
            }

            if (newQty <= 0) {
                // Eliminar si la cantidad llega a 0
                return prevCart.filter(item => item.product.id !== product.id);
            }

            const newCart = [...prevCart];
            if (existingItemIndex >= 0) {
                newCart[existingItemIndex] = { ...newCart[existingItemIndex], quantity: newQty };
                addNotification("Carrito actualizado.", "info");
            } else {
                newCart.push({ product, quantity: newQty });
                addNotification(`"${product.name}" agregado al carrito.`, "success");
            }
            return newCart;
        });
    };

    const handleToggleFavorite = async (product) => {
        if (!currentUser) {
            addNotification("Inicia sesión para guardar tus favoritos.", "warning");
            setView('login');
            return;
        }

        const currentFavorites = currentUser.favorites || [];
        const isFavorite = currentFavorites.includes(product.id);
        
        let newFavorites;
        if (isFavorite) {
            newFavorites = currentFavorites.filter(id => id !== product.id);
            addNotification("Producto eliminado de favoritos.", "info");
        } else {
            newFavorites = [...currentFavorites, product.id];
            addNotification("¡Guardado en favoritos!", "success");
        }

        // Actualización Optimista UI
        setCurrentUser(prev => ({ ...prev, favorites: newFavorites }));

        // Persistencia DB
        try {
            const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', currentUser.id);
            await updateDoc(userRef, { favorites: newFavorites });
        } catch (error) {
            console.error("Error updating favorites:", error);
            // Revertir si falla (opcional, por ahora solo logueamos)
        }
    };

    // ---------------------------------------------------------------------------------------------
    // 7. LÓGICA DE CHECKOUT Y PEDIDOS
    // ---------------------------------------------------------------------------------------------

    // Validar y aplicar cupón
    const handleApplyCoupon = (couponCode) => {
        const code = couponCode || prompt("Ingresa el código del cupón:"); // Fallback a prompt si no viene por UI
        if (!code) return;

        const coupon = coupons.find(c => c.code === code.toUpperCase().trim());

        if (!coupon) {
            addNotification("El cupón ingresado no existe.", "error");
            return;
        }

        // Validaciones de Reglas de Negocio del Cupón
        if (!coupon.isActive && coupon.isActive !== undefined) return addNotification("Este cupón ha sido desactivado.", "error");
        if (new Date(coupon.expirationDate) < new Date()) return addNotification("Este cupón ha expirado.", "error");
        if (coupon.usageLimit > 0 && (coupon.usedBy?.length || 0) >= coupon.usageLimit) return addNotification("Este cupón ha alcanzado su límite de uso global.", "error");
        
        // Validación de Usuario Específico (FEATURE RECUPERADA)
        if (coupon.targetType === 'user' && coupon.targetUser && coupon.targetUser !== currentUser?.email) {
            return addNotification("Este cupón no es válido para tu usuario.", "error");
        }

        // Validación de uso único por usuario
        if (currentUser && (coupon.usedBy || []).includes(currentUser.id)) {
            return addNotification("Ya has utilizado este cupón anteriormente.", "warning");
        }

        setAppliedCoupon(coupon);
        addNotification("¡Cupón aplicado correctamente!", "success");
        setShowCouponModal(false);
    };

    // Procesar Pedido Final
    const handleConfirmOrder = async () => {
        if (isProcessingOrder) return;
        
        // Validaciones Finales
        if (!currentUser && !settings.enableGuestCheckout) {
            addNotification("Debes iniciar sesión para comprar.", "warning");
            setView('login');
            return;
        }
        if (!checkoutForm.address || !checkoutForm.city || !checkoutForm.paymentMethod) {
            addNotification("Por favor completa todos los campos obligatorios.", "warning");
            return;
        }

        setIsProcessingOrder(true);
        const toastId = Date.now();
        // Usamos un toast persistente simulado
        addNotification("Procesando tu pedido, por favor no cierres la ventana...", "info");

        try {
            // Recálculo de seguridad de totales
            const subtotal = cart.reduce((acc, item) => {
                const { finalPrice } = calculateProductMetrics(item.product.basePrice, item.product.discount);
                return acc + (finalPrice * item.quantity);
            }, 0);

            let discountVal = 0;
            if (appliedCoupon) {
                if (appliedCoupon.type === 'fixed') discountVal = appliedCoupon.value;
                else discountVal = subtotal * (appliedCoupon.value / 100);
                
                if (appliedCoupon.maxDiscount && discountVal > appliedCoupon.maxDiscount) {
                    discountVal = appliedCoupon.maxDiscount;
                }
            }
            const total = Math.max(0, subtotal - discountVal);

            // Construcción del Pedido
            const newOrder = {
                orderId: `ORD-${Date.now().toString().slice(-6)}`, // ID legible
                userId: currentUser?.id || 'GUEST',
                customer: {
                    name: currentUser?.name || 'Invitado',
                    email: currentUser?.email || authForm.email,
                    phone: checkoutForm.phone || currentUser?.phone,
                    dni: currentUser?.dni || ''
                },
                items: cart.map(i => {
                    const metrics = calculateProductMetrics(i.product.basePrice, i.product.discount, i.product.costPrice);
                    return {
                        productId: i.product.id,
                        title: i.product.name,
                        quantity: i.quantity,
                        unit_price: metrics.finalPrice,
                        original_price: metrics.base,
                        cost_price: metrics.cost, // Guardar costo para reporte de ganancias
                        image: i.product.image
                    };
                }),
                financials: {
                    subtotal,
                    discount: discountVal,
                    total,
                    currency: settings.currency
                },
                payment: {
                    method: checkoutForm.paymentMethod,
                    status: 'Pendiente'
                },
                shipping: {
                    address: checkoutForm.address,
                    city: checkoutForm.city,
                    province: checkoutForm.province,
                    zipCode: checkoutForm.zipCode,
                    status: 'Pendiente'
                },
                status: 'Pendiente',
                notes: checkoutForm.notes,
                couponCode: appliedCoupon?.code || null,
                date: new Date().toISOString(),
                history: [
                    { status: 'Pendiente', date: new Date().toISOString(), note: 'Pedido creado' }
                ]
            };

            // Transacción en Lote (Batch Write)
            const batch = writeBatch(db);

            // 1. Guardar Pedido
            const orderRef = doc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'));
            batch.set(orderRef, newOrder);

            // 2. Actualizar Stock y Ventas de Productos
            cart.forEach(item => {
                const prodRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', item.product.id);
                batch.update(prodRef, { 
                    stock: increment(-item.quantity),
                    salesCount: increment(item.quantity)
                });
            });

            // 3. Actualizar Usuario (Stats y Dirección)
            if (currentUser) {
                const userRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', currentUser.id);
                batch.update(userRef, {
                    ordersCount: increment(1),
                    totalSpent: increment(total),
                    address: checkoutForm.address,
                    city: checkoutForm.city,
                    province: checkoutForm.province,
                    zipCode: checkoutForm.zipCode,
                    phone: checkoutForm.phone
                });
                
                // Limpiar Carrito Remoto
                const cartRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'carts', currentUser.id);
                batch.update(cartRef, { items: [] });
            }

            // 4. Marcar Cupón Usado
            if (appliedCoupon) {
                const couponRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'coupons', appliedCoupon.id);
                batch.update(couponRef, { usedBy: arrayUnion(currentUser?.id || 'GUEST') });
            }

            await batch.commit();

            // Éxito
            setCart([]);
            setAppliedCoupon(null);
            setView('profile'); // O página de éxito
            addNotification("¡Pedido confirmado! Gracias por tu compra.", "success");

        } catch (error) {
            console.error("Order Error:", error);
            addNotification("Error al procesar el pedido. Intenta nuevamente.", "error");
        } finally {
            setIsProcessingOrder(false);
        }
    };

    // ---------------------------------------------------------------------------------------------
    // 8. CRUD ADMINISTRATIVO (PRODUCTOS, PEDIDOS, VENTAS)
    // ---------------------------------------------------------------------------------------------

    // --- A. GESTIÓN DE PRODUCTOS ---
    
    const handleSaveProduct = async () => {
        // Validaciones de formulario
        if (!productForm.name) return addNotification("Falta el nombre del producto.", "warning");
        if (!productForm.basePrice || Number(productForm.basePrice) <= 0) return addNotification("El precio debe ser mayor a 0.", "warning");
        if (!productForm.category) return addNotification("Selecciona una categoría.", "warning");

        try {
            const productData = {
                name: productForm.name,
                description: productForm.description || '',
                basePrice: Number(productForm.basePrice),
                costPrice: Number(productForm.costPrice || 0), // Recuperado Costo
                stock: Number(productForm.stock),
                category: productForm.category,
                image: productForm.image || 'https://via.placeholder.com/300?text=Sin+Imagen',
                discount: Number(productForm.discount || 0),
                featured: productForm.featured || false,
                lastUpdated: new Date().toISOString()
            };

            if (productForm.id) {
                // Editar
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', productForm.id), productData);
                addNotification("Producto actualizado correctamente.", "success");
            } else {
                // Crear
                await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'products'), {
                    ...productData,
                    createdAt: new Date().toISOString(),
                    salesCount: 0
                });
                addNotification("Producto creado exitosamente.", "success");
            }
            setShowProductModal(false);
            setProductForm({ id: null, name: '', description: '', basePrice: '', costPrice: '', stock: '', category: '', image: '', discount: 0, featured: false });
        } catch (error) {
            console.error(error);
            addNotification("Error guardando producto.", "error");
        }
    };

    const handleDeleteProduct = (product) => {
        openConfirm(
            "Eliminar Producto",
            `¿Estás seguro de que quieres eliminar "${product.name}"? Esta acción es irreversible.`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', product.id));
                    addNotification("Producto eliminado.", "success");
                } catch (e) {
                    addNotification("Error al eliminar.", "error");
                }
            },
            true // isDangerous
        );
    };

    // --- B. VENTA LOCAL / MANUAL (FEATURE CRÍTICA) ---
    // Permite descontar stock manualmente para ventas en mostrador
    const handleLocalSale = (product) => {
        // Usamos un modal simulado con window.prompt por simplicidad en esta parte, 
        // idealmente sería un modal UI, pero cumple el requerimiento funcional.
        // Mejoramos usando el sistema de confirmación personalizado si tuviéramos input,
        // pero aquí necesitamos input de cantidad. Usaremos un prompt seguro.
        
        // TODO: Reemplazar con Modal UI en V5 si se requiere más estética.
        const qtyInput = window.prompt(`VENTA LOCAL - ${product.name}\n\nStock Actual: ${product.stock}\nIngrese cantidad a descontar:`, "1");
        
        if (qtyInput === null) return;
        const qty = parseInt(qtyInput);

        if (isNaN(qty) || qty <= 0) return addNotification("Cantidad inválida.", "warning");
        if (qty > product.stock) return addNotification("No hay suficiente stock.", "error");

        openConfirm(
            "Confirmar Venta Local",
            `¿Registrar venta de ${qty} unidades de "${product.name}"? Se descontará del stock.`,
            async () => {
                try {
                    const productRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'products', product.id);
                    await updateDoc(productRef, {
                        stock: increment(-qty),
                        salesCount: increment(qty),
                        lastLocalSale: new Date().toISOString()
                    });
                    
                    // Opcional: Registrar un "Pedido Fantasma" para que conste en ingresos
                    // Esto ayuda a que el dashboard de ganancias sea real.
                    const ghostOrder = {
                        orderId: `LOC-${Date.now().toString().slice(-6)}`,
                        userId: 'LOCAL_SALE',
                        customer: { name: 'Venta Mostrador', email: '-' },
                        items: [{
                            productId: product.id,
                            title: product.name,
                            quantity: qty,
                            unit_price: calculateProductMetrics(product.basePrice, product.discount).finalPrice,
                            cost_price: Number(product.costPrice || 0),
                            image: product.image
                        }],
                        total: calculateProductMetrics(product.basePrice, product.discount).finalPrice * qty,
                        status: 'Realizado',
                        date: new Date().toISOString(),
                        isLocal: true
                    };
                    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'orders'), ghostOrder);

                    addNotification(`Venta registrada. Stock actualizado (-${qty}).`, "success");
                } catch (e) {
                    addNotification("Error registrando venta.", "error");
                }
            }
        );
    };

    // --- C. GESTIÓN DE PEDIDOS ---

    const handleFinalizeOrder = (order) => {
        openConfirm(
            "Finalizar Pedido",
            `¿Marcar el pedido #${order.orderId} como ENTREGADO/FINALIZADO?`,
            async () => {
                try {
                    const orderRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', order.id);
                    await updateDoc(orderRef, {
                        status: 'Realizado',
                        'payment.status': 'Pagado',
                        'shipping.status': 'Entregado',
                        lastUpdate: new Date().toISOString(),
                        history: arrayUnion({ status: 'Realizado', date: new Date().toISOString(), note: 'Finalizado manualmente por Admin' })
                    });
                    addNotification("Pedido finalizado correctamente.", "success");
                } catch (e) {
                    addNotification("Error al finalizar pedido.", "error");
                }
            }
        );
    };

    const handleDeleteOrder = (order) => {
        openConfirm(
            "Eliminar Pedido",
            `ADVERTENCIA: ¿Eliminar permanentemente el pedido #${order.orderId}? Esto no restaurará el stock automáticamente.`,
            async () => {
                try {
                    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'orders', order.id));
                    addNotification("Pedido eliminado del historial.", "success");
                    setSelectedOrder(null);
                } catch (e) {
                    addNotification("Error al eliminar pedido.", "error");
                }
            },
            true // Dangerous action
        );
    };

    // ---------------------------------------------------------------------------------------------
    // FIX: funciones/helpers que faltaban (isAdmin, hasAccess, saveCouponFn, saveSupplierFn)
    // Se colocan aquí dentro del scope de App para evitar ReferenceError que causaba pantalla en negro
    // ---------------------------------------------------------------------------------------------
    const isAdmin = (email) => {
        if (!email && !currentUser) return false;
        if (currentUser?.role) return currentUser.role === 'admin';
        return email === SUPER_ADMIN_EMAIL;
    };

    const hasAccess = (email) => {
        if (currentUser?.role) return currentUser.role === 'admin' || currentUser.role === 'employee';
        return email === SUPER_ADMIN_EMAIL;
    };

    const saveCouponFn = async () => {
        try {
            if (!couponForm.code) return addNotification("El código del cupón es obligatorio.", "warning");
            if (!couponForm.value || Number(couponForm.value) <= 0) return addNotification("El valor del cupón debe ser mayor a 0.", "warning");

            const couponData = {
                code: (couponForm.code || '').toUpperCase().trim(),
                type: couponForm.type || 'percentage',
                value: Number(couponForm.value) || 0,
                minPurchase: Number(couponForm.minPurchase) || 0,
                maxDiscount: Number(couponForm.maxDiscount) || 0,
                expirationDate: couponForm.expirationDate || null,
                usageLimit: Number(couponForm.usageLimit) || 0,
                targetType: couponForm.targetType || 'global',
                targetUser: couponForm.targetType === 'user' ? (couponForm.targetUser || '') : '',
                isActive: true,
                usedBy: [],
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'coupons'), couponData);
            addNotification("Cupón creado correctamente.", "success");
            setShowCouponFormModal(false);
            setCouponForm({
                code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0,
                expirationDate: '', usageLimit: 0, targetType: 'global', targetUser: ''
            });
        } catch (e) {
            console.error("Error saving coupon:", e);
            addNotification("Error al guardar el cupón.", "error");
        }
    };

    const saveSupplierFn = async () => {
        try {
            if (!supplierForm.name) return addNotification("El nombre del proveedor es obligatorio.", "warning");

            const supplierData = {
                name: supplierForm.name,
                contactName: supplierForm.contactName || '',
                phone: supplierForm.phone || '',
                email: supplierForm.email || '',
                website: supplierForm.website || '',
                notes: supplierForm.notes || '',
                associatedProducts: supplierForm.associatedProducts || [],
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'suppliers'), supplierData);
            addNotification("Proveedor registrado correctamente.", "success");
            setShowSupplierModal(false);
            setSupplierForm({ name: '', contactName: '', phone: '', email: '', website: '', notes: '', associatedProducts: [] });
        } catch (e) {
            console.error("Error saving supplier:", e);
            addNotification("Error al guardar el proveedor.", "error");
        }
    };

    // ---------------------------------------------------------------------------------------------
    // 9. MODALES DE FORMULARIOS (UI DE GESTIÓN AVANZADA)
    // ---------------------------------------------------------------------------------------------

    // Helper para renderizar el Modal de Productos
    const renderProductModal = () => (
        <Modal 
            isOpen={showProductModal} 
            onClose={() => setShowProductModal(false)}
            title={productForm.id ? "Editar Producto" : "Nuevo Producto"}
            icon={Package}
            size="lg"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna Izquierda: Datos Principales */}
                    <div className="space-y-4">
                        <InputField 
                            label="Nombre del Producto" 
                            placeholder="Ej: Auriculares Gamer RGB" 
                            value={productForm.name} 
                            onChange={e => setProductForm({...productForm, name: e.target.value})}
                            icon={Tag}
                            required
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <InputField 
                                label="Precio Venta ($)" 
                                type="number" 
                                placeholder="0.00" 
                                value={productForm.basePrice} 
                                onChange={e => setProductForm({...productForm, basePrice: e.target.value})}
                                icon={DollarSign}
                                required
                            />
                            {/* CAMPO SOLICITADO: COSTO */}
                            <InputField 
                                label="Costo / Compra ($)" 
                                type="number" 
                                placeholder="0.00" 
                                value={productForm.costPrice} 
                                onChange={e => setProductForm({...productForm, costPrice: e.target.value})}
                                icon={Wallet} 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField 
                                label="Stock Disponible" 
                                type="number" 
                                placeholder="0" 
                                value={productForm.stock} 
                                onChange={e => setProductForm({...productForm, stock: e.target.value})}
                                icon={Box}
                                required
                            />
                            <InputField 
                                label="Descuento (%)" 
                                type="number" 
                                placeholder="0" 
                                value={productForm.discount} 
                                onChange={e => setProductForm({...productForm, discount: e.target.value})}
                                icon={Percent}
                                max={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Layers className="w-3 h-3" /> Categoría
                            </label>
                            <select 
                                className="w-full bg-[#0f0f13] border border-slate-800 rounded-xl p-4 text-white font-medium focus:border-cyan-500 outline-none transition-all"
                                value={productForm.category}
                                onChange={e => setProductForm({...productForm, category: e.target.value})}
                            >
                                <option value="">Seleccionar Categoría...</option>
                                {settings.categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Columna Derecha: Multimedia y Detalles */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ImageIcon className="w-3 h-3" /> Imagen del Producto
                            </label>
                            
                            {/* Previsualización de Imagen */}
                            <div 
                                className="w-full h-48 bg-[#0f0f13] border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50[...]
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {productForm.image && productForm.image.length > 100 ? (
                                    <img src={productForm.image} alt="Preview" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <>
                                        <div className="p-4 bg-slate-800 rounded-full text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-900/20 mb-2 transition-all">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Click para subir</p>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setProductForm({...productForm, image: reader.result});
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <TextAreaField 
                            label="Descripción Detallada" 
                            placeholder="Describe las características principales..." 
                            value={productForm.description}
                            onChange={e => setProductForm({...productForm, description: e.target.value})}
                            rows={5}
                        />

                        {/* Switch de Destacado */}
                        <div 
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${productForm.featured ? 'bg-yellow-900/10 border-yellow-500/30' : 'bg-sla[...]
                            onClick={() => setProductForm({...productForm, featured: !productForm.featured})}
                        >
                            <div className="flex items-center gap-3">
                                <Star className={`w-5 h-5 ${productForm.featured ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                                <div>
                                    <p className={`font-bold text-sm ${productForm.featured ? 'text-yellow-100' : 'text-slate-400'}`}>Producto Destacado</p>
                                    <p className="text-xs text-slate-500">Aparecerá primero en la tienda</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${productForm.featured ? 'bg-yellow-500' : 'bg-slate-700'}`}>
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${productForm.featured ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-800">
                    <Button variant="secondary" onClick={() => setShowProductModal(false)} className="flex-1">Cancelar</Button>
                    <Button onClick={handleSaveProduct} className="flex-1" icon={Save}>Guardar Producto</Button>
                </div>
            </div>
        </Modal>
    );

    // Helper para renderizar el Modal de Cupones (Con TARGET USER RESTAURADO)
    const renderCouponModal = () => (
        <Modal 
            isOpen={showCouponFormModal} 
            onClose={() => setShowCouponFormModal(false)}
            title="Gestión de Cupones"
            icon={Ticket}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Código del Cupón" 
                        placeholder="Ej: OFERTA2024" 
                        value={couponForm.code} 
                        onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                        icon={Tag}
                        required
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 block">Tipo de Descuento</label>
                        <div className="flex bg-[#0f0f13] p-1 rounded-xl border border-slate-800">
                            <button 
                                onClick={() => setCouponForm({...couponForm, type: 'percentage'})}
                                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${couponForm.type === 'percentage' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text[...]
                            >
                                Porcentaje (%)
                            </button>
                            <button 
                                onClick={() => setCouponForm({...couponForm, type: 'fixed'})}
                                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${couponForm.type === 'fixed' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-wh[...]
                            >
                                Monto Fijo ($)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Valor del Descuento" 
                        type="number" 
                        value={couponForm.value} 
                        onChange={e => setCouponForm({...couponForm, value: e.target.value})}
                        icon={couponForm.type === 'fixed' ? DollarSign : Percent}
                    />
                    <InputField 
                        label="Compra Mínima ($)" 
                        type="number" 
                        value={couponForm.minPurchase} 
                        onChange={e => setCouponForm({...couponForm, minPurchase: e.target.value})}
                        icon={ShoppingCart}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Límite de Usos (0 = Infinito)" 
                        type="number" 
                        value={couponForm.usageLimit} 
                        onChange={e => setCouponForm({...couponForm, usageLimit: e.target.value})}
                        icon={Users}
                    />
                    <InputField 
                        label="Fecha de Expiración" 
                        type="date" 
                        value={couponForm.expirationDate} 
                        onChange={e => setCouponForm({...couponForm, expirationDate: e.target.value})}
                        icon={Calendar}
                    />
                </div>

                {/* SECCIÓN RESTAURADA: TARGET USER (CUPÓN PERSONALIZADO) */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Restricción de Usuario</h4>
                    </div>
                    
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="targetType" 
                                checked={couponForm.targetType === 'global'}
                                onChange={() => setCouponForm({...couponForm, targetType: 'global'})}
                                className="accent-cyan-500"
                            />
                            <span className="text-sm text-slate-300">Global (Todos)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="targetType" 
                                checked={couponForm.targetType === 'user'}
                                onChange={() => setCouponForm({...couponForm, targetType: 'user'})}
                                className="accent-purple-500"
                            />
                            <span className="text-sm text-slate-300">Usuario Específico</span>
                        </label>
                    </div>

                    {couponForm.targetType === 'user' && (
                        <div className="animate-fade-in-down">
                            <InputField 
                                label="Email del Usuario Destino" 
                                placeholder="usuario@ejemplo.com"
                                value={couponForm.targetUser}
                                onChange={e => setCouponForm({...couponForm, targetUser: e.target.value})}
                                icon={User}
                                required
                            />
                            <p className="text-[10px] text-slate-500 mt-2 ml-1">
                                * Este cupón solo podrá ser canjeado por la cuenta asociada a este email.
                            </p>
                        </div>
                    )}
                </div>

                <Button onClick={saveCouponFn} className="w-full" icon={Save}>Crear Cupón</Button>
            </div>
        </Modal>
    );

    // Helper para renderizar el Modal de Proveedores
    const renderSupplierModal = () => (
        <Modal
            isOpen={showSupplierModal}
            onClose={() => setShowSupplierModal(false)}
            title="Registrar Proveedor"
            icon={Truck}
        >
            <div className="space-y-4">
                <InputField 
                    label="Nombre de la Empresa" 
                    value={supplierForm.name} 
                    onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                    icon={Briefcase}
                />
                <div className="grid grid-cols-2 gap-4">
                    <InputField 
                        label="Contacto" 
                        value={supplierForm.contactName} 
                        onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})} 
                        icon={User}
                    />
                    <InputField 
                        label="Teléfono" 
                        value={supplierForm.phone} 
                        onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} 
                        icon={Phone}
                    />
                </div>
                <InputField 
                    label="Email / Web" 
                    value={supplierForm.email} 
                    onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} 
                    icon={Globe}
                />
                <TextAreaField 
                    label="Notas Adicionales" 
                    value={supplierForm.notes} 
                    onChange={e => setSupplierForm({...supplierForm, notes: e.target.value})} 
                />
                <Button onClick={saveSupplierFn} className="w-full">Guardar Proveedor</Button>
            </div>
        </Modal>
    );

    // ---------------------------------------------------------------------------------------------
    // 10. ESTRUCTURA DE LAYOUT Y NAVEGACIÓN (RENDER)
    // ---------------------------------------------------------------------------------------------

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#050505] font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* --- BACKGROUND EFFECTS (Ambientación Cyberpunk) --- */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Orbes de luz difusa */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-900/10 rounded-full blur-[180px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-900/10 rounded-full blur-[180px] animate-pulse-slow"></div>
                
                {/* Grid Overlay sutil */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
            </div>

            {/* --- COMPONENTES GLOBALES --- */}
            
            {/* Notificaciones (Toast Stack) */}
            <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                <div className="pointer-events-auto flex flex-col gap-2">
                    {notifications.map(n => (
                        <ToastNotification 
                            key={n.id} 
                            id={n.id} 
                            message={n.message} 
                            type={n.type} 
                            onClose={removeNotification} 
                        />
                    ))}
                </div>
            </div>

            {/* Diálogo de Confirmación */}
            <ConfirmationDialog 
                config={confirmDialog} 
                onConfirm={confirmDialog.onConfirm} 
                onCancel={() => setConfirmDialog({...confirmDialog, isOpen: false})} 
            />

            {/* Modales de Gestión */}
            {renderProductModal()}
            {renderCouponModal()}
            {renderSupplierModal()}
            {/* Modal de Detalle de Pedido se renderiza condicionalmente abajo */}

            {/* --- NAVBAR SUPERIOR (SOLO VISIBLE SI NO ES LOGIN/ADMIN FULLSCREEN) --- */}
            {view !== 'login' && view !== 'register' && view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 z-50 px-6 md:px-12 flex items-center justify-between border-b border-white/5 backdrop-blur-xl transition-all duration-300 bg-black/50 supports-[[...]
                    
                    {/* IZQUIERDA: MENÚ Y LOGO */}
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={()=>setIsMenuOpen(true)} 
                            className="p-3 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition border border-white/5 group active:scale-95"
                            aria-label="Abrir Menú"
                        >
                            <Menu className="w-6 h-6 group-hover:scale-110 transition" />
                        </button>
                        
                        <div 
                            className="cursor-pointer group flex flex-col justify-center select-none" 
                            onClick={()=>setView('store')}
                        >
                            <h1 className="text-3xl font-black text-white tracking-tighter italic relative">
                                <span className="relative z-10 group-hover:text-cyan-400 transition-colors duration-300">
                                    {settings?.storeName || 'SUSTORE'}
                                </span>
                                {/* Efecto Neon Sutil */}
                                <span className="absolute top-0 left-0 w-full h-full text-cyan-500 blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300">
                                    {settings?.storeName}
                                </span>
                            </h1>
                            <div className="h-0.5 w-8 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500 mt-1 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                        </div>
                    </div>
                    
                    {/* CENTRO: BARRA DE BÚSQUEDA (Desktop) */}
                    <div className="hidden lg:flex items-center relative w-1/3 max-w-xl group">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 blur-md"></div[...]
                        <div className="relative w-full flex items-center bg-[#0a0a0a] border border-white/10 rounded-2xl px-6 py-3.5 focus-within:border-cyan-500/50 transition-all shadow-inner">
                            <Search className="w-5 h-5 text-slate-500 mr-4 group-focus-within:text-cyan-400 transition-colors" />
                            <input 
                                className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium tracking-wide" 
                                placeholder="¿Qué estás buscando hoy?" 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={()=>setSearchQuery('')} className="ml-2 text-slate-600 hover:text-white transition">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DERECHA: ACCIONES DE USUARIO */}
                    <div className="flex items-center gap-4">
                        {/* Botón Soporte */}
                        <a 
                            href={settings?.whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition[...]
                        >
                            <MessageCircle className="w-5 h-5 group-hover:animate-bounce" /> 
                            <span className="hidden lg:inline">Soporte</span>
                        </a>
                        
                        {/* Botón Carrito */}
                        <button 
                            onClick={()=>setView('cart')} 
                            className="relative p-3 bg-white/5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 transition group hover:border-cyan-500/30 active:scale[...]
                        >
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition" />
                            {cart.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 bor[...]
                                    {cart.length}
                                </span>
                            )}
                        </button>
                        
                        {/* Botón Perfil / Login */}
                        {currentUser ? (
                            <div className="relative group">
                                <button 
                                    onClick={()=>setView('profile')} 
                                    className="flex items-center gap-3 pl-2 pr-4 py-2 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/50 transition group hover:bg-white/10"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-lg text-sm border border[...]
                                        {currentUser.avatar ? (
                                            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            currentUser.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="text-left hidden md:block">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Cuenta</p>
                                        <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition truncate max-w-[100px]">
                                            {currentUser.name.split(' ')[0]}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={()=>setView('login')} 
                                className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba([...]
                            >
                                <User className="w-5 h-5" /> 
                                <span className="hidden md:inline">INGRESAR</span>
                            </button>
                        )}
                    </div>
                </nav>
            )}

            {/* --- SIDEBAR MÓVIL (MENU OFF-CANVAS) --- */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-start">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" 
                        onClick={()=>setIsMenuOpen(false)}
                    ></div>
                    
                    {/* Panel Lateral */}
                    <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-in-right flex flex-col shadow-2xl z-[10001]">
                        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
                            <h2 className="text-3xl font-black text-white neon-text tracking-tight">MENÚ</h2>
                            <button 
                                onClick={()=>setIsMenuOpen(false)} 
                                className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 border border-slate-800"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {/* Enlaces de Navegación */}
                            {[
                                { id: 'store', icon: Home, label: 'Inicio' },
                                { id: 'profile', icon: User, label: 'Mi Perfil' },
                                { id: 'cart', icon: ShoppingBag, label: 'Mi Carrito', badge: cart.length },
                                { id: 'about', icon: Info, label: 'Sobre Nosotros' },
                                { id: 'help', icon: FileQuestion, label: 'Ayuda & FAQ' }
                            ].map((item) => (
                                <button 
                                    key={item.id}
                                    onClick={()=>{setView(item.id); setIsMenuOpen(false)}} 
                                    className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group borde[...]
                                >
                                    <item.icon className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition-colors" /> 
                                    {item.label}
                                    {item.badge > 0 && (
                                        <span className="ml-auto bg-cyan-900/30 text-cyan-400 text-xs px-2 py-1 rounded-full border border-cyan-500/20">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            ))}

                            <div className="h-px bg-slate-800 my-6 mx-4"></div>

                            {/* Enlace Admin (Protegido) */}
                            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'employee' || currentUser.email === SUPER_ADMIN_EMAIL) && (
                                <button 
                                    onClick={()=>{setView('admin'); setIsMenuOpen(false)}} 
                                    className="w-full text-left text-lg font-bold text-cyan-400 mt-2 pt-4 border-t border-slate-800 flex items-center gap-4 p-4 bg-cyan-900/10 rounded-xl hover:bg-cyan-[...]
                                >
                                    <Shield className="w-6 h-6" /> 
                                    Panel Admin
                                </button>
                            )}

                            {currentUser && (
                                <button 
                                    onClick={()=>{handleLogout(); setIsMenuOpen(false)}} 
                                    className="w-full text-left text-lg font-bold text-red-400 mt-2 flex items-center gap-4 p-4 hover:bg-red-900/10 rounded-xl transition"
                                >
                                    <LogOut className="w-6 h-6" /> 
                                    Cerrar Sesión
                                </button>
                            )}
                        </div>
                        
                        {/* Footer del Menú */}
                        <div className="pt-6 border-t border-slate-800 text-center">
                            <p className="text-xs text-slate-600 font-mono">v3.0.0 - {settings.storeName}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Espaciador para no solapar contenido con el Navbar fijo */}
            {view !== 'admin' && view !== 'login' && view !== 'register' && <div className="h-32"></div>}
             {/* --- CONTENEDOR PRINCIPAL DE VISTAS (MAIN) --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {/* --------------------------------------------------------------------------------
                   1. VISTA TIENDA (CATÁLOGO Y HERO)
                   -------------------------------------------------------------------------------- */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        
                        {/* Banner de Anuncios */}
                        {settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden g[...]
                                <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition duration-1000"></div>
                                <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                                    <Flame className="w-4 h-4 text-orange-500 animate-fire"/> 
                                    {settings.announcementMessage} 
                                    <Flame className="w-4 h-4 text-orange-500 animate-fire"/>
                                </p>
                            </div>
                        )}

                        {/* Hero Section (Banner Principal) */}
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            {settings?.heroUrl ? (
                                <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" alt="Hero" />
                            ) : (
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black opacity-80"></div>
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <div className="max-w-3xl animate-fade-up">
                                    <span className="inline-block py-1 px-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6 backdro[...]
                                        Nueva Colección 2025
                                    </span>
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-6">
                                        TECNOLOGÍA <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">
                                            DEL FUTURO
                                        </span>
                                    </h1>
                                    <p className="text-slate-400 text-lg mb-8 max-w-lg font-medium leading-relaxed">
                                        Explora nuestra selección premium de dispositivos con garantía oficial.
                                    </p>
                                    <div className="flex gap-4">
                                        <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-black font-black rounded-xl ho[...]
                                            VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition"/>
                                        </button>
                                        <button onClick={() => setView('about')} className="px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition[...]
                                            CONOCER MÁS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtros de Categoría */}
                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-sc[...]
                            <Filter className="w-5 h-5 text-slate-500 flex-shrink-0 ml-2" />
                            <button 
                                onClick={()=>setSelectedCategory('Todos')} 
                                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory==='Todos'?'bg-white text-black border-white shadow-[0_0_15px[...]
                            >
                                Todos
                            </button>
                            {settings?.categories?.map(c => (
                                <button 
                                    key={c} 
                                    onClick={()=>setSelectedCategory(c)} 
                                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_[...]
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        {/* Grid de Productos */}
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-32 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/10">
                                <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">No encontramos productos</h3>
                                <p className="text-slate-500">Intenta cambiar los filtros o busca con otro término.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {filteredProducts.map(p => (
                                    <div key={p.id} onClick={() => {}} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_[...]
                                        
                                        {/* Imagen y Badges */}
                                        <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110" alt={p.name} />
                                            
                                            {/* Badges */}
                                            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                                {p.discount > 0 && (
                                                    <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                                                        <Tag className="w-3 h-3"/> -{p.discount}%
                                                    </span>
                                                )}
                                                {p.featured && (
                                                    <span className="bg-yellow-500 text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1">
                                                        <Star className="w-3 h-3 fill-black"/> TOP
                                                    </span>
                                                )}
                                            </div>

                                            {/* Acción Favorito */}
                                            <button 
                                                onClick={(e)=>{e.stopPropagation(); handleToggleFavorite(p)}} 
                                                className={`absolute top-4 right-4 p-3 rounded-full z-20 transition shadow-lg backdrop-blur-sm border ${currentUser?.favorites?.includes(p.id) ? 'bg-red[...]
                                            >
                                                <Heart className={`w-5 h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`}/>
                                            </button>
                                        </div>

                                        {/* Info Producto */}
                                        <div className="p-6 flex-1 flex flex-col relative z-10 bg-[#0a0a0a]">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">{p.category}</p[...]
                                                {p.stock <= 0 && <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700">AGOTADO</span>}
                                                {p.stock > 0 && p.stock < 5 && <span className="text-[10px] text-orange-400 font-bold bg-orange-900/20 px-2 py-1 rounded border border-orange-500/20">Ú[...]
                                            </div>
                                            
                                            <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2 min-h-[3rem]">{p.name}</h3>
                                            
                                            <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    {p.discount > 0 && <span className="text-xs text-slate-500 line-through font-medium mb-1">${p.basePrice}</span>}
                                                    <span className="text-2xl font-black text-white tracking-tight flex items-center gap-1">
                                                        ${calculateProductMetrics(p.basePrice, p.discount).finalPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={(e)=>{e.stopPropagation(); handleAddToCart(p, 1)}} 
                                                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-cyan-400 hover:scale-110 transition shadow-lg group/[...]
                                                    disabled={p.stock <= 0}
                                                >
                                                    <Plus className="w-6 h-6 group-active/add:scale-75 transition-transform"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --------------------------------------------------------------------------------
                   2. VISTA CARRITO (CART)
                   -------------------------------------------------------------------------------- */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20 pt-8">
                         <div className="flex items-center gap-4 mb-8">
                            <button onClick={()=>setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white border border-slate-800 transition hover:bg-slate-800"><Arro[...]
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3"><ShoppingBag className="w-10 h-10 text-cyan-400"/> Tu Carrito</h1>
                        </div>

                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 bg-slate-900/10 rounded-[3rem] border-2 border-dashed border-slate-800">
                                <ShoppingBag className="w-24 h-24 text-slate-700 mb-6" />
                                <h2 className="text-2xl font-black text-white mb-2">Tu carrito está vacío</h2>
                                <p className="text-slate-500 mb-8">Parece que aún no has agregado nada.</p>
                                <button onClick={()=>setView('store')} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold hover:bg-cyan-500 transition shadow-lg">Ir a la Tienda</button>
                            </div>
                        ) : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                {/* Lista de Items */}
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => {
                                        const { finalPrice } = calculateProductMetrics(item.product.basePrice, item.product.discount);
                                        return (
                                            <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex items-center gap-6 group hover:border-slate-700 transition">
                                                <div className="w-24 h-24 bg-white rounded-2xl p-2 flex-shrink-0">
                                                    <img src={item.product.image} className="w-full h-full object-contain" alt={item.product.name}/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-cyan-400 uppercase font-black tracking-widest mb-1">{item.product.category}</p>
                                                    <h3 className="font-bold text-white text-lg truncate">{item.product.name}</h3>
                                                    <p className="text-slate-400 font-mono text-sm">${finalPrice.toLocaleString()} x unidad</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <p className="text-white font-black text-xl">${(finalPrice * item.quantity).toLocaleString()}</p>
                                                    <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
                                                        <button onClick={() => handleAddToCart(item.product, -1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white ho[...]
                                                        <span className="w-8 text-center text-white font-bold text-sm">{item.quantity}</span>
                                                        <button onClick={() => handleAddToCart(item.product, 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hov[...]
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Resumen de Compra */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-2"><Calculator className="w-6 h-6 text-slate-500"/> Resumen</h3>
                                    
                                    {/* Selector de Cupón */}
                                    {appliedCoupon ? (
                                        <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center mb-6 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 h-full w-1 bg-purple-500"></div>
                                            <div>
                                                <p className="font-black text-purple-300 text-lg tracking-widest">{appliedCoupon.code}</p>
                                                <p className="text-xs text-purple-400 font-bold">{appliedCoupon.type==='fixed'?`$${appliedCoupon.value} OFF`:`${appliedCoupon.value}% OFF`}</p>
                                            </div>
                                            <button onClick={()=>setAppliedCoupon(null)} className="p-2 bg-purple-900/30 rounded-full text-purple-300 hover:text-white hover:bg-purple-500 transition">
                                                <X className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={()=>setShowCouponModal(true)} 
                                            className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 text-slate-400 hover:text-purple-300 rounded-2xl mb-6 f[...]
                                        >
                                            <Ticket className="w-4 h-4 group-hover:rotate-12 transition"/> Tengo un cupón
                                        </button>
                                    )}

                                    {/* Totales */}
                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Subtotal</span>
                                            <span className="font-mono text-white">${cart.reduce((acc, item) => acc + (calculateProductMetrics(item.product.basePrice, item.product.discount).finalPrice[...]
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex justify-between text-purple-400 font-bold">
                                                <span>Descuento</span>
                                                <span>- ${cart.reduce((acc, item) => acc + (calculateProductMetrics(item.product.basePrice, item.product.discount).finalPrice * item.quantity), 0) * (ap[...]
                                            </div>
                                        )}
                                        <div className="flex justify-between items-end text-white font-bold text-xl pt-4 border-t border-slate-800/50">
                                            <span>Total Estimado</span>
                                            <span className="text-3xl font-black text-cyan-400 neon-text">
                                                ${cart.reduce((acc, item) => acc + (calculateProductMetrics(item.product.basePrice, item.product.discount).finalPrice * item.quantity), 0).toLocaleStrin[...]
                                            </span>
                                        </div>
                                    </div>

                                    <button onClick={() => setView('checkout')} className="w-full bg-cyan-600 hover:bg-cyan-500 py-5 text-white font-bold text-lg rounded-2xl shadow-lg transition flex [...]
                                        Iniciar Compra <ArrowRight className="w-5 h-5"/>
                                    </button>
                                    <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-widest font-bold">Pago 100% Seguro</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --------------------------------------------------------------------------------
                   3. VISTA CHECKOUT (FINALIZAR COMPRA)
                   -------------------------------------------------------------------------------- */}
                {view === 'checkout' && (
                    <div className="max-w-2xl mx-auto pb-20 animate-fade-up pt-8">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition"/> Volver al Carrito
                        </button>
                        
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                            
                            <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                                <CheckCircle className="w-8 h-8 text-cyan-500"/> Finalizar Pedido
                            </h2>

                            <div className="space-y-8">
                                {/* Datos de Contacto */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Información de Contacto</h3>
                                    <InputField 
                                        label="Teléfono / WhatsApp" 
                                        icon={Phone} 
                                        value={checkoutForm.phone} 
                                        onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})}
                                        placeholder="+54 9 ..."
                                    />
                                    <TextAreaField 
                                        label="Notas del Pedido (Opcional)"
                                        placeholder="Instrucciones especiales para la entrega..."
                                        value={checkoutForm.notes}
                                        onChange={e => setCheckoutForm({...checkoutForm, notes: e.target.value})}
                                        rows={2}
                                    />
                                </div>

                                {/* Datos de Envío */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Dirección de Envío</h3>
                                    <InputField 
                                        label="Calle y Altura" 
                                        icon={MapPin}
                                        value={checkoutForm.address} 
                                        onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})}
                                        required
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Ciudad" value={checkoutForm.city} onChange={e => setCheckoutForm({...checkoutForm, city: e.target.value})} required />
                                        <InputField label="Provincia" value={checkoutForm.province} onChange={e => setCheckoutForm({...checkoutForm, province: e.target.value})} required />
                                    </div>
                                    <InputField label="Código Postal" value={checkoutForm.zipCode} onChange={e => setCheckoutForm({...checkoutForm, zipCode: e.target.value})} />
                                </div>

                                {/* Método de Pago */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Método de Pago</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Transferencia', 'Efectivo'].map(method => (
                                            <div 
                                                key={method}
                                                onClick={() => setCheckoutForm({...checkoutForm, paymentMethod: method})}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${checkoutForm.paymentMethod === method ? 'bg-cyan-900/20 border[...]
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checkoutForm.paymentMethod === method ? 'border-cyan-500' : 'border-sl[...]
                                                    {checkoutForm.paymentMethod === method && <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>}
                                                </div>
                                                <span className="font-bold">{method}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Confirmación */}
                                <div className="pt-6 border-t border-slate-800">
                                    <button 
                                        onClick={handleConfirmOrder} 
                                        disabled={isProcessingOrder} 
                                        className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacit[...]
                                    >
                                        {isProcessingOrder ? <Loader2 className="animate-spin w-6 h-6"/> : <CheckCircle className="w-6 h-6"/>} 
                                        {isProcessingOrder ? 'Procesando...' : 'CONFIRMAR PEDIDO'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --------------------------------------------------------------------------------
                   4. PANEL DE ADMINISTRACIÓN (DASHBOARD COMPLETO)
                   -------------------------------------------------------------------------------- */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden w-full font-sans fixed inset-0 z-[100]">
                        {/* Sidebar Admin */}
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '[...]
                            <div className="p-8 border-b border-slate-900 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white flex items-center gap-2"><Shield className="text-cyan-400"/> ADMIN</h2>
                                <button onClick={()=>setIsAdminMenuOpen(false)} className="md:hidden text-slate-500"><X/></button>
                            </div>
                            
                            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                                <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-4">Analítica</p>
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='dash[...]
                                
                                <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-6">Gestión</p>
                                <button onClick={()=>setAdminTab('orders')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='orders'[...]
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='produ[...]
                                
                                {isAdmin(currentUser?.email) && <>
                                    <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-6">Marketing & Config</p>
                                    <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='co[...]
                                    <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='[...]
                                    <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='s[...]
                                </>}
                            </nav>

                            <div className="p-4 bg-slate-900/50 m-4 rounded-xl border border-slate-800">
                                <p className="text-xs text-slate-500 font-bold mb-2">Usuario Actual</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-bold">{currentUser.name.charAt(0)}</div>
                                    <div className="overflow-hidden">
                                        <p className="text-white text-sm font-bold truncate">{currentUser.name}</p>
                                        <p className="text-cyan-400 text-[10px] uppercase font-black">{currentUser.role}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-800">
                                <button onClick={()=>setView('store')} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white font-bold text-sm transition fl[...]
                                    <LogOut className="w-4 h-4"/> Salir del Panel
                                </button>
                            </div>
                        </div>

                        {/* Main Content Admin */}
                        <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10 custom-scrollbar">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white"><Menu/></button>
                            
                            {/* --- TAB DASHBOARD (MÉTRICAS COMPLETAS) --- */}
                            {adminTab === 'dashboard' && (
                                <div className="space-y-8 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Dashboard General</h1>
                                        <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-slate-400 text-xs font-mono">
                                            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                    
                                    {/* Métricas Principales */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {[
                                            { label: 'Ingresos Totales', value: formatCurrency(dashboardStats.totalRevenue), icon: DollarSign, color: 'text-white', bg: 'bg-slate-900' },
                                            { label: 'Ganancia Neta', value: formatCurrency(dashboardStats.totalProfit), icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/10' },
                                            { label: 'Pedidos Realizados', value: dashboardStats.totalOrders, icon: ShoppingBag, color: 'text-purple-400', bg: 'bg-purple-900/10' },
                                            { label: 'Carritos Activos', value: dashboardStats.activeCarts, icon: ShoppingCart, color: 'text-cyan-400', bg: 'bg-cyan-900/10 animate-pulse' }
                                        ].map((stat, i) => (
                                            <div key={i} className={`border border-slate-800 p-6 rounded-[2rem] flex flex-col justify-between h-32 ${stat.bg}`}>
                                                <div className="flex justify-between items-start">
                                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{stat.label}</p>
                                                    <stat.icon className={`w-5 h-5 ${stat.color}`}/>
                                                </div>
                                                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid lg:grid-cols-2 gap-8">
                                        {/* Top Productos (Más Vendidos) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Trophy className="text-yellow-500"/> Productos Más Vendidos</h3>
                                            <div className="space-y-4">
                                                {dashboardStats.topProducts.length === 0 ? <p className="text-slate-500 text-sm">No hay datos de ventas aún.</p> : 
                                                dashboardStats.topProducts.map((p, idx) => (
                                                    <div key={p.id} className="flex items-center gap-4 border-b border-slate-800 pb-4 last:border-0 last:pb-0">
                                                        <span className="text-2xl font-black text-slate-700 w-6">#{idx+1}</span>
                                                        <img src={p.image} className="w-12 h-12 rounded-lg bg-white object-contain p-1" alt={p.name}/>
                                                        <div className="flex-1">
                                                            <p className="text-white font-bold text-sm truncate">{p.name}</p>
                                                            <p className="text-slate-500 text-xs">{p.quantity} ventas</p>
                                                        </div>
                                                        <span className="text-green-400 font-mono font-bold">{formatCurrency(p.revenue)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Interés / Más Vistos (Simulado) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Eye className="text-cyan-500"/> Mayor Interés (Vistas/Carritos)</h3>
                                            <div className="space-y-6">
                                                {dashboardStats.mostViewedProducts.map((p, idx) => (
                                                    <div key={p.id} className="space-y-2">
                                                        <div className="flex justify-between text-xs font-bold">
                                                            <span className="text-white">{p.name}</span>
                                                            <span className="text-cyan-400">{p.interestScore} ptos</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full" 
                                                                style={{ width: `${Math.min(100, (p.interestScore / 10) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {dashboardStats.mostViewedProducts.length === 0 && <p className="text-slate-500 text-sm">Sin actividad reciente de usuarios.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB PEDIDOS (CON BOTONES RESTAURADOS) --- */}
                            {adminTab === 'orders' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Gestión de Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-sl[...]
                                                <div className="flex items-center gap-4 w-full lg:w-auto" onClick={()=>setSelectedOrder(o)}>
                                                    <div className={`p-4 rounded-xl shrink-0 ${o.status==='Realizado'?'bg-green-900/20 text-green-400':'bg-yellow-900/20 text-yellow-400'}`}>
                                                        {o.status==='Realizado' ? <CheckCircle/> : <Clock/>}
                                                    </div>
                                                    <div className="cursor-pointer">
                                                        <p className="font-bold text-white text-lg flex items-center gap-2">
                                                            #{o.orderId} <span className="text-slate-500 text-sm font-normal">| {o.customer.name}</span>
                                                        </p>
                                                        <p className="text-slate-500 text-sm flex items-center gap-2 mt-1">
                                                            <Calendar className="w-3 h-3"/> {formatDateShort(o.date)} 
                                                            <span className="text-slate-700">|</span> 
                                                            <span className="text-white font-mono">{formatCurrency(o.total)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap items-center gap-3 justify-end w-full lg:w-auto">
                                                    <button onClick={()=>setSelectedOrder(o)} className="px-4 py-2 bg-slate-900 text-slate-300 rounded-lg text-xs font-bold hover:text-white border bord[...]
                                                    
                                                    {/* BOTÓN FINALIZAR (RESTORED) */}
                                                    {o.status !== 'Realizado' && (
                                                        <button onClick={()=>handleFinalizeOrder(o)} className="px-4 py-2 bg-green-900/20 text-green-400 border border-green-500/30 rounded-lg text-xs f[...]
                                                            <CheckSquare className="w-3 h-3"/> Finalizar
                                                        </button>
                                                    )}
                                                    
                                                    {/* BOTÓN ELIMINAR (RESTORED) */}
                                                    <button onClick={()=>handleDeleteOrder(o)} className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hov[...]
                                                        <Trash2 className="w-3 h-3"/> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- TAB PRODUCTOS (CON COSTO Y VENTA LOCAL) --- */}
                            {adminTab === 'products' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Inventario</h1>
                                        <button onClick={()=>{setProductForm({}); setShowProductModal(true)}} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg hove[...]
                                    </div>

                                    <div className="grid gap-3">
                                        {products.map(p => (
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center group hover:border-cy[...]
                                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                                    <div className="w-16 h-16 bg-white rounded-xl p-2 flex-shrink-0 object-contain"><img src={p.image} className="w-full h-full object-contain" alt={p.n[...]
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{p.name}</p>
                                                        <div className="flex items-center gap-4 mt-1 text-xs">
                                                            <span className={`font-mono font-bold ${p.stock < 5 ? 'text-red-400' : 'text-slate-400'}`}>Stock: {p.stock}</span>
                                                            <span className="text-slate-500">|</span>
                                                            <span className="text-cyan-400 font-bold">Venta: {formatCurrency(p.basePrice)}</span>
                                                            <span className="text-slate-500">|</span>
                                                            <span className="text-purple-400 font-bold">Costo: {formatCurrency(p.costPrice || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                                                    {/* BOTÓN VENTA LOCAL (RESTORED) */}
                                                    <button onClick={()=>handleLocalSale(p)} className="p-3 bg-green-900/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500 hove[...]
                                                        <Wallet className="w-5 h-5"/>
                                                    </button>
                                                    
                                                    <button onClick={()=>{setProductForm(p); setShowProductModal(true)}} className="p-3 bg-slate-900 rounded-xl text-cyan-400 hover:bg-cyan-900/20 trans[...]
                                                    <button onClick={()=>handleDeleteProduct(p)} className="p-3 bg-slate-900 rounded-xl text-red-400 hover:bg-red-900/20 transition border border-slate-[...]
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* --- TAB CONFIGURACIÓN (EXPANDIDO) --- */}
                             {adminTab === 'settings' && (
                                <div className="space-y-8 animate-fade-up pb-20 max-w-4xl">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Configuración de Tienda</h1>
                                        <Button icon={Save} onClick={()=>addNotification("Guardando cambios...", "info")}>Guardar Todo</Button>
                                    </div>
                                    
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                                        <h3 className="font-bold text-white text-xl border-b border-slate-800 pb-4">Identidad de Marca</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <InputField label="Nombre de la Tienda" value={tempSettings.storeName} onChange={e=>setTempSettings({...tempSettings, storeName:e.target.value})} />
                                            <InputField label="Mensaje de Anuncio (Barra Superior)" value={tempSettings.announcementMessage} onChange={e=>setTempSettings({...tempSettings, announcement[...]
                                        </div>
                                        <InputField label="URL del Logo" value={tempSettings.logoUrl} onChange={e=>setTempSettings({...tempSettings, logoUrl:e.target.value})} icon={Link} />
                                        <InputField label="URL del Banner Principal (Hero)" value={tempSettings.heroUrl} onChange={e=>setTempSettings({...tempSettings, heroUrl:e.target.value})} icon={[...]
                                    </div>

                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                                        <h3 className="font-bold text-white text-xl border-b border-slate-800 pb-4">Redes Sociales y Contacto</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <InputField label="Link de WhatsApp" value={tempSettings.whatsappLink} onChange={e=>setTempSettings({...tempSettings, whatsappLink:e.target.value})} icon={M[...]
                                            <InputField label="Instagram User" value={tempSettings.instagramUser} onChange={e=>setTempSettings({...tempSettings, instagramUser:e.target.value})} icon={I[...]
                                            <InputField label="Email de Soporte" value={tempSettings.sellerEmail} onChange={e=>setTempSettings({...tempSettings, sellerEmail:e.target.value})} icon={Mai[...]
                                        </div>
                                    </div>

                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
                                        <h3 className="font-bold text-white text-xl border-b border-slate-800 pb-4">Sobre Nosotros</h3>
                                        <TextAreaField label="Texto de la página 'Sobre Nosotros'" rows={6} value={tempSettings.aboutUsText} onChange={e=>setTempSettings({...tempSettings, aboutUsText[...]
                                    </div>
                                </div>
                             )}

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
