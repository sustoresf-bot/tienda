import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, 
    Minus, Plus, Trash2, Edit, RefreshCw, LogIn, LogOut, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, 
    Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, 
    TrendingUp, TrendingDown, Printer, Phone, Calendar, ChevronRight, Lock, 
    Loader2, Filter, AlertTriangle, Save, Copy, ExternalLink, Shield, Gift, 
    Archive, Eye, Clock, MapPin, Calculator, Briefcase
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, 
    doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment, serverTimestamp 
} from 'firebase/firestore';

// --- 1. CONFIGURACIÓN FIREBASE PRO ---
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
const appId = "sustore-prod-v4-enterprise"; // Versión nueva para asegurar limpieza

// Configuración por defecto robusta
const defaultSettings = {
    storeName: "SUSTORE",
    primaryColor: "#06b6d4",
    currency: "$",
    adminEmails: ["lautarocorazza63@gmail.com"],
    team: [{ email: "lautarocorazza63@gmail.com", role: "admin", name: "Lautaro" }],
    contact: {
        whatsapp: "5493425123456",
        instagram: "sustore_sf",
        email: "sustoresf@gmail.com",
        address: "Santa Fe, Argentina"
    },
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming", "Ofertas"],
    ui: {
        heroTitle: "FUTURO AHORA",
        heroSubtitle: "Tecnología de vanguardia al alcance de tu mano.",
        showPromoBanner: true,
        promoText: "Envío Gratis en compras superiores a $100.000"
    }
};

// --- 2. UTILIDADES AVANZADAS ---
const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString) => {
    if(!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const generateId = (prefix='ID') => `${prefix}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// --- 3. SISTEMA DE UI (COMPONENTES) ---

// Notificaciones Toast Flotantes
const ToastSystem = ({ toasts, removeToast }) => (
    <div className="fixed top-24 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border-l-4 shadow-2xl backdrop-blur-md animate-fade-in-right transform transition-all hover:scale-105 ${
                t.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-200' :
                t.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-200' :
                t.type === 'warning' ? 'bg-yellow-950/90 border-yellow-500 text-yellow-200' :
                'bg-slate-900/90 border-cyan-500 text-cyan-200'
            }`}>
                {t.type === 'success' && <CheckCircle className="w-5 h-5"/>}
                {t.type === 'error' && <AlertTriangle className="w-5 h-5"/>}
                {t.type === 'warning' && <AlertTriangle className="w-5 h-5"/>}
                {t.type === 'info' && <Info className="w-5 h-5"/>}
                <div>
                    <p className="font-bold text-sm">{t.title}</p>
                    {t.message && <p className="text-xs opacity-80">{t.message}</p>}
                </div>
                <button onClick={() => removeToast(t.id)} className="ml-2 hover:bg-white/10 rounded-full p-1"><X className="w-4 h-4"/></button>
            </div>
        ))}
    </div>
);

// Modal Genérico Premium
const Modal = ({ isOpen, onClose, title, children, size = "md", icon: Icon }) => {
    if (!isOpen) return null;
    const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl", full: "max-w-full m-4" };
    
    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`bg-[#0a0a0c] border border-white/10 w-full ${sizes[size]} rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden transform transition-all`}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#111115]">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        {Icon && <Icon className="w-6 h-6 text-cyan-400"/>}
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
                        <X className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Tarjeta de Producto (Estilo "Apple Dark")
const ProductCard = ({ product, onAdd, onOpenDetail }) => {
    const isNoStock = product.stock <= 0;
    const price = Number(product.basePrice);
    const discount = Number(product.discount || 0);
    const finalPrice = discount > 0 ? price * (1 - discount/100) : price;

    return (
        <div className="group relative bg-[#0f0f12] rounded-3xl border border-white/5 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] flex flex-col">
            <div className="relative aspect-square p-6 bg-[#16161a] overflow-hidden flex items-center justify-center">
                <img src={product.image || 'https://via.placeholder.com/400'} alt={product.name} className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 ${isNoStock ? 'grayscale opacity-40' : ''}`} />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {discount > 0 && !isNoStock && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-wider">-{discount}%</span>}
                    {product.isNew && <span className="bg-cyan-500 text-black text-[10px] font-black px-2 py-1 rounded-lg shadow-lg uppercase tracking-wider">NUEVO</span>}
                </div>
                
                {/* Overlay de acciones rápidas */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                    <button onClick={() => onOpenDetail(product)} className="p-3 bg-white text-black rounded-full hover:scale-110 transition shadow-xl" title="Ver Detalles"><Eye className="w-5 h-5"/></button>
                    {!isNoStock && <button onClick={() => onAdd(product)} className="p-3 bg-cyan-500 text-white rounded-full hover:scale-110 transition shadow-[0_0_20px_rgba(6,182,212,0.5)]" title="Agregar al Carrito"><ShoppingBag className="w-5 h-5"/></button>}
                </div>

                {isNoStock && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/80 text-white border border-white/20 px-4 py-2 rounded-xl font-bold backdrop-blur-md">AGOTADO</span></div>}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">{product.category}</p>
                <h3 className="text-white font-bold text-lg leading-tight mb-2 line-clamp-2">{product.name}</h3>
                
                <div className="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
                    <div>
                        {discount > 0 && <p className="text-xs text-slate-500 line-through mb-0.5">{formatMoney(price)}</p>}
                        <p className="text-xl font-black text-white">{formatMoney(finalPrice)}</p>
                    </div>
                    <button onClick={() => !isNoStock && onAdd(product)} disabled={isNoStock} className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${isNoStock ? 'bg-slate-800 text-slate-600' : 'bg-[#1a1a20] text-white hover:bg-cyan-500 hover:text-black'}`}>
                        <Plus className="w-5 h-5 stroke-[3]"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 4. APP PRINCIPAL (ESTADO MASIVO) ---
function App() {
    // === ESTADOS GLOBALES ===
    const [view, setView] = useState('store'); // store, product_detail, cart, checkout, auth, profile, admin
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    const [modal, setModal] = useState({ isOpen: false, title: '', content: null });
    
    // === ESTADOS DE DATOS (DATA LAKE) ===
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('sustore_cart_v4')) || []);
    const [users, setUsers] = useState([]); // Solo para admin
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // === ESTADOS UI / FILTROS ===
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Menú Hamburguesa
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todas');
    const [selectedProduct, setSelectedProduct] = useState(null); // Para modal detalle

    // === ESTADOS DE CHECKOUT & AUTH ===
    const [authMode, setAuthMode] = useState('login');
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', phone: '', dni: '' });
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', paymentMethod: 'Transferencia', notes: '' });
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // === ESTADOS ADMIN PANEL ===
    const [adminTab, setAdminTab] = useState('dashboard'); // dashboard, inventory, pos, orders, finance, settings
    const [posCart, setPosCart] = useState([]); // Carrito del Punto de Venta
    const [posSearch, setPosSearch] = useState('');
    const [tempProduct, setTempProduct] = useState({}); // Edición producto
    const [tempSupplier, setTempSupplier] = useState({});
    const [tempCoupon, setTempCoupon] = useState({});
    // === 5. EFECTOS (CARGA DE DATOS) ===
    useEffect(() => {
        const initSystem = async () => {
            // 1. Persistencia de Usuario
            try {
                const savedUser = localStorage.getItem('nexus_user_data_v4');
                if (savedUser) setUser(JSON.parse(savedUser));
            } catch (e) { console.error("Error recuperando sesión", e); }

            // 2. Auth Anónimo (necesario para lectura inicial)
            await signInAnonymously(auth);

            // 3. Listeners en Tiempo Real (Data Lake)
            const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), snapshot => {
                setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setIsLoading(false);
            });

            const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), snapshot => {
                setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => new Date(b.date) - new Date(a.date)));
            });

            // Listeners Admin & Config (Se cargan siempre para tener la app lista)
            const unsubSettings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => {
                if(!s.empty) setSettings({ ...defaultSettings, ...s.docs[0].data(), id: s.docs[0].id });
            });

            const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => {
                setCoupons(s.docs.map(d => ({id: d.id, ...d.data()})));
            });

            // Listeners pesados (Solo si es necesario o admin, aquí simplificado cargamos todo para fluidez)
            const unsubSuppliers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d => ({id:d.id, ...d.data()}))));
            const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d => ({id:d.id, ...d.data()}))));
            const unsubUsers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d => ({id:d.id, ...d.data()}))));

            return () => {
                unsubProducts(); unsubOrders(); unsubSettings(); unsubCoupons();
                unsubSuppliers(); unsubExpenses(); unsubUsers();
            };
        };
        initSystem();
    }, []);

    // Persistencia del Carrito
    useEffect(() => {
        localStorage.setItem('sustore_cart_v4', JSON.stringify(cart));
    }, [cart]);

    // === 6. LÓGICA DE NEGOCIO (HANDLERS) ===

    // Auth
    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (authMode === 'register') {
                if(!authData.email || !authData.password || !authData.name) throw new Error("Completa todos los campos");
                
                // Verificar duplicados
                const q = query(usersRef, where('email', '==', authData.email));
                const snap = await getDocs(q);
                if (!snap.empty) throw new Error("El email ya está registrado");

                const newUser = {
                    ...authData,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    ordersCount: 0,
                    wallet: 0 // Futuro sistema de puntos
                };
                const ref = await addDoc(usersRef, newUser);
                const userFinal = { ...newUser, id: ref.id };
                setUser(userFinal);
                localStorage.setItem('nexus_user_data_v4', JSON.stringify(userFinal));
                showToast(`¡Bienvenido a la familia, ${authData.name}!`, 'success');
            } else {
                // Login simple
                const q = query(usersRef, where('email', '==', authData.email), where('password', '==', authData.password));
                const snap = await getDocs(q);
                if (snap.empty) throw new Error("Credenciales incorrectas");
                const userFinal = { ...snap.docs[0].data(), id: snap.docs[0].id };
                setUser(userFinal);
                localStorage.setItem('nexus_user_data_v4', JSON.stringify(userFinal));
                showToast("Sesión iniciada correctamente", 'success');
            }
            setView('store');
        } catch (err) {
            showToast(err.message, 'error');
        }
        setIsLoading(false);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('nexus_user_data_v4');
        setView('store');
        showToast("Has cerrado sesión", 'info');
    };

    // Carrito
    const addToCart = (product) => {
        if(product.stock <= 0) return showToast("Producto agotado", "error");
        
        setCart(prev => {
            const exists = prev.find(i => i.product.id === product.id);
            if (exists) {
                if (exists.quantity >= product.stock) {
                    showToast("No hay más stock disponible", "warning");
                    return prev;
                }
                showToast("Cantidad actualizada", "success");
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            showToast("Agregado al carrito", "success");
            return [...prev, { product, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const updateCartQty = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                if (newQty > item.product.stock) {
                    showToast("Stock máximo alcanzado", "warning");
                    return item;
                }
                if (newQty <= 0) return null;
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(i => i.product.id !== productId));
        showToast("Producto eliminado", "info");
    };

    // Cálculos de Totales
    const cartSubtotal = cart.reduce((acc, item) => {
        const price = item.product.basePrice * (1 - (item.product.discount || 0)/100);
        return acc + (price * item.quantity);
    }, 0);

    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.type === 'percentage') return cartSubtotal * (appliedCoupon.value / 100);
        if (appliedCoupon.type === 'fixed') return appliedCoupon.value;
        return 0;
    }, [cartSubtotal, appliedCoupon]);

    const cartTotal = Math.max(0, cartSubtotal - discountAmount);

    // Cupones
    const applyCoupon = (code) => {
        const coupon = coupons.find(c => c.code === code.toUpperCase());
        if (!coupon) return showToast("Cupón inválido", "error");
        
        // Validaciones
        if (new Date(coupon.expirationDate) < new Date()) return showToast("El cupón ha expirado", "error");
        if (coupon.minPurchase && cartSubtotal < coupon.minPurchase) return showToast(`Compra mínima de $${coupon.minPurchase}`, "warning");
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return showToast("Este cupón se ha agotado", "error");
        if (coupon.targetUser && (!user || user.email !== coupon.targetUser)) return showToast("Este cupón no es para ti", "error");

        setAppliedCoupon(coupon);
        showToast("¡Cupón aplicado con éxito!", "success");
    };

    // === 7. COMPONENTES VISUALES INTERNOS (SIDEBAR, DRAWER, ETC) ===

    // MENU LATERAL (LAS TRES RAYITAS)
    const Sidebar = () => (
        <>
            {/* Overlay Oscuro */}
            <div 
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Panel Lateral */}
            <div className={`fixed inset-y-0 left-0 w-80 bg-[#0a0a0c] border-r border-white/10 z-[201] transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111115]">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2 tracking-tighter">
                        <Zap className="text-cyan-400 fill-current w-6 h-6"/> SUSTORE
                    </h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
                        <X className="w-6 h-6"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {/* User Info Mini */}
                    {user ? (
                        <div className="bg-white/5 p-4 rounded-xl mb-6 border border-white/5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                {user.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold text-white truncate">{user.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6 rounded-xl mb-6 border border-cyan-500/20 text-center">
                            <p className="text-sm text-cyan-200 mb-3">Únete para acceder a ofertas exclusivas.</p>
                            <button onClick={() => { setView('auth'); setIsSidebarOpen(false); }} className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition shadow-lg shadow-cyan-500/20">
                                Iniciar Sesión / Registro
                            </button>
                        </div>
                    )}

                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 mt-4">Navegación</p>
                    
                    <button onClick={() => { setView('store'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white font-bold flex items-center gap-3 transition">
                        <Home className="w-5 h-5 text-cyan-400"/> Inicio
                    </button>
                    
                    <button onClick={() => { setView('store'); setIsSidebarOpen(false); setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white font-bold flex items-center gap-3 transition">
                        <Search className="w-5 h-5 text-purple-400"/> Catálogo
                    </button>

                    {user && (
                        <>
                            <button onClick={() => { setView('profile'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white font-bold flex items-center gap-3 transition">
                                <User className="w-5 h-5 text-green-400"/> Mi Perfil & Cupones
                            </button>
                            
                            {user.role === 'admin' && (
                                <button onClick={() => { setView('admin'); setIsSidebarOpen(false); }} className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-3 transition mt-4 hover:bg-slate-700">
                                    <Shield className="w-5 h-5"/> Panel de Admin
                                </button>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/10">
                    {user && (
                        <button onClick={() => { logout(); setIsSidebarOpen(false); }} className="w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-950/30 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                            <LogOut className="w-4 h-4"/> Cerrar Sesión
                        </button>
                    )}
                    <p className="text-center text-[10px] text-slate-600 mt-4">v4.5.0 Enterprise Edition</p>
                </div>
            </div>
        </>
    );

    // CARRITO DESLIZANTE (SLIDE-OVER)
    const CartDrawer = () => (
        <>
            <div 
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsCartOpen(false)}
            />
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#0a0a0c] border-l border-white/10 z-[301] transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111115]">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <ShoppingBag className="text-cyan-400 w-6 h-6"/> Tu Carrito
                        <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full">{cart.length}</span>
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition">
                        <X className="w-6 h-6"/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                            <ShoppingBag className="w-20 h-20 text-slate-600"/>
                            <p className="text-slate-400 font-bold">Tu carrito está vacío.</p>
                            <button onClick={() => setIsCartOpen(false)} className="text-cyan-400 hover:underline">Ir a comprar</button>
                        </div>
                    ) : (
                        cart.map(item => {
                            const price = item.product.basePrice * (1 - (item.product.discount || 0)/100);
                            return (
                                <div key={item.product.id} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition group">
                                    <div className="w-20 h-20 bg-[#050505] rounded-lg p-2 flex items-center justify-center flex-shrink-0">
                                        <img src={item.product.image} className="max-w-full max-h-full object-contain"/>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-white text-sm line-clamp-1">{item.product.name}</h4>
                                            <p className="text-cyan-400 font-bold text-sm mt-1">{formatMoney(price)}</p>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/5">
                                                <button onClick={() => updateCartQty(item.product.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition"><Minus className="w-3 h-3"/></button>
                                                <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateCartQty(item.product.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded text-slate-400 hover:text-white transition"><Plus className="w-3 h-3"/></button>
                                            </div>
                                            <button onClick={() => removeFromCart(item.product.id)} className="text-slate-600 hover:text-red-500 transition p-1"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="p-6 bg-[#111115] border-t border-white/10 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-slate-400 text-sm">
                                <span>Subtotal</span>
                                <span>{formatMoney(cartSubtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-green-400 text-sm font-bold">
                                    <span>Descuento ({appliedCoupon?.code})</span>
                                    <span>-{formatMoney(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-2 border-t border-white/5">
                                <span className="text-white font-bold">Total Final</span>
                                <span className="text-3xl font-black text-cyan-400">{formatMoney(cartTotal)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setIsCartOpen(false); setView('checkout'); }}
                            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            Iniciar Compra <ArrowRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>
        </>
    );

    // MODAL DE AUTENTICACIÓN
    const AuthModal = () => (
        <Modal 
            isOpen={view === 'auth' || view === 'login' || view === 'register'} 
            onClose={() => setView('store')} 
            title={authMode === 'login' ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
            size="sm"
        >
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <LogIn className="w-8 h-8"/>
                </div>
                <p className="text-slate-400 text-sm">Accede para gestionar tus pedidos y cupones.</p>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                    <div className="space-y-4 animate-fade-in">
                        <input className="w-full input-premium p-4" placeholder="Nombre Completo" required value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                            <input className="w-full input-premium p-4" placeholder="DNI (Opcional)" value={authData.dni} onChange={e => setAuthData({...authData, dni: e.target.value})}/>
                            <input className="w-full input-premium p-4" placeholder="Teléfono" value={authData.phone} onChange={e => setAuthData({...authData, phone: e.target.value})}/>
                        </div>
                    </div>
                )}
                
                <input className="w-full input-premium p-4" type="email" placeholder="Correo electrónico" required value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})}/>
                <input className="w-full input-premium p-4" type="password" placeholder="Contraseña" required value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})}/>
                
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition flex justify-center items-center gap-2 mt-2 shadow-lg">
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : (authMode === 'login' ? 'INGRESAR' : 'REGISTRARSE')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-sm text-slate-500 hover:text-white transition underline underline-offset-4">
                    {authMode === 'login' ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión'}
                </button>
            </div>
        </Modal>
    );
// === 8. COMPONENTE DE DETALLE DE PRODUCTO (MODAL) ===
    const ProductDetailModal = () => {
        if (!selectedProduct) return null;
        const isNoStock = selectedProduct.stock <= 0;
        const price = Number(selectedProduct.basePrice);
        const discount = Number(selectedProduct.discount || 0);
        const finalPrice = discount > 0 ? price * (1 - discount/100) : price;

        return (
            <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={selectedProduct.name} size="lg">
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white/5 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden group">
                        <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"/>
                        {discount > 0 && <span className="absolute top-4 left-4 bg-red-500 text-white font-black px-3 py-1 rounded-lg uppercase">-{discount}% OFF</span>}
                    </div>
                    <div className="flex flex-col">
                        <div className="mb-6">
                            <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-2 block">{selectedProduct.category}</span>
                            <h2 className="text-3xl font-black text-white leading-tight mb-4">{selectedProduct.name}</h2>
                            <p className="text-slate-400 leading-relaxed text-sm mb-6">{selectedProduct.description || "Sin descripción disponible para este producto."}</p>
                        </div>
                        
                        <div className="mt-auto p-6 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    {discount > 0 && <p className="text-sm text-slate-500 line-through mb-1 font-medium">Precio Regular: {formatMoney(price)}</p>}
                                    <p className="text-3xl font-black text-white">{formatMoney(finalPrice)}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${isNoStock ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                                    {isNoStock ? 'SIN STOCK' : `STOCK: ${selectedProduct.stock}`}
                                </div>
                            </div>
                            <button 
                                onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} 
                                disabled={isNoStock}
                                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isNoStock ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]'}`}
                            >
                                {isNoStock ? 'No disponible' : <><ShoppingBag className="w-5 h-5"/> Agregar al Carrito</>}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    };

    // === 9. RENDERIZADO PRINCIPAL (RETURN DEL APP) ===
    return (
        <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
            
            {/* --- COMPONENTES GLOBALES --- */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            </div>

            <ToastSystem toasts={toasts} removeToast={removeToast} />
            <Sidebar />
            <CartDrawer />
            <AuthModal />
            <ProductDetailModal />

            {/* --- NAVBAR PRINCIPAL --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-20 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 z-40 px-4 md:px-8 flex items-center justify-between transition-all duration-300">
                    <div className="flex items-center gap-4">
                        {/* BOTÓN MENÚ (3 RAYITAS) */}
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white transition hover:scale-110 bg-white/5 rounded-lg border border-white/5">
                            <Menu className="w-6 h-6"/>
                        </button>
                        
                        <div onClick={() => setView('store')} className="flex items-center gap-3 cursor-pointer group">
                            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
                                <Zap className="text-white w-5 h-5 fill-current"/>
                            </div>
                            <span className="font-black text-2xl tracking-tighter text-white hidden md:block group-hover:text-cyan-400 transition">
                                {settings.storeName}
                            </span>
                        </div>
                    </div>

                    {/* BARRA DE BÚSQUEDA */}
                    <div className="hidden md:flex items-center bg-[#111115] border border-white/10 rounded-full px-5 py-2.5 w-96 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all shadow-inner">
                        <Search className="w-4 h-4 text-slate-500 mr-3"/>
                        <input 
                            className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium" 
                            placeholder="Buscar productos..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* ACCIONES DERECHA */}
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsCartOpen(true)} className="relative p-3 hover:bg-white/5 rounded-xl transition group border border-transparent hover:border-white/10">
                            <ShoppingBag className="w-6 h-6 text-slate-400 group-hover:text-white transition"/>
                            {cart.length > 0 && (
                                <span className="absolute top-2 right-2 w-4 h-4 bg-cyan-500 text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                        
                        {user ? (
                            <div onClick={() => setView('profile')} className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 pr-4 rounded-full border border-transparent hover:border-white/10 transition">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold text-white leading-none">{user.name.split(' ')[0]}</span>
                                    <span className="text-[10px] text-cyan-400 leading-none mt-1">Miembro</span>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => setView('auth')} className="hidden md:flex px-6 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-slate-200 transition shadow-lg">
                                Ingresar
                            </button>
                        )}
                    </div>
                </nav>
            )}

            {/* --- CONTENEDOR PRINCIPAL DE VISTAS --- */}
            <main className={`relative z-10 ${view !== 'admin' ? 'pt-28 pb-20 px-4 max-w-7xl mx-auto' : ''}`}>
                
                {/* === VISTA: TIENDA === */}
                {view === 'store' && (
                    <div className="space-y-12 animate-fade-in-up">
                        {/* Hero Banner */}
                        <div className="relative w-full h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
                            <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" alt="Hero"/>
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent flex flex-col justify-center px-8 md:px-16">
                                <div className="max-w-3xl space-y-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{settings.ui?.heroSubtitle || "Nueva Colección 2024"}</span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] tracking-tight">
                                        {settings.ui?.heroTitle || "FUTURO"} <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                            AHORA
                                        </span>
                                    </h1>
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center gap-2">
                                            Ver Productos <ArrowRight className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => setView('profile')} className="px-8 py-4 bg-black/50 text-white border border-white/20 font-bold rounded-xl hover:bg-black/70 transition backdrop-blur-md">
                                            Mis Cupones
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtros de Categoría */}
                        <div id="catalog" className="sticky top-24 z-30 py-4 bg-[#050505]/95 backdrop-blur-xl border-y border-white/5 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-2xl md:border md:bg-[#0a0a0c]/80 flex flex-wrap gap-2 items-center justify-center md:justify-start">
                            <button onClick={()=>setActiveCategory('Todas')} className={`px-6 py-2 rounded-full text-sm font-bold transition border ${activeCategory === 'Todas' ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white'}`}>Todas</button>
                            {settings.categories.map(cat => (
                                <button key={cat} onClick={()=>setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-sm font-bold transition border ${activeCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white'}`}>{cat}</button>
                            ))}
                        </div>

                        {/* Grid de Productos */}
                        {products.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4"/>
                                <p className="text-slate-500 font-bold">Cargando catálogo...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {products
                                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (activeCategory === 'Todas' || p.category === activeCategory))
                                    .map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} onOpenDetail={setSelectedProduct} />)
                                }
                            </div>
                        )}
                    </div>
                )}

                {/* === VISTA: CHECKOUT === */}
                {view === 'checkout' && (
                    <div className="max-w-5xl mx-auto animate-fade-in-up">
                        <button onClick={() => setView('store')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition"/> Volver a la tienda
                        </button>

                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Formulario */}
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3"><Truck className="text-cyan-400"/> Datos de Envío</h2>
                                    <p className="text-slate-500 text-sm mb-6">Completa la información para recibir tu pedido.</p>
                                    
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Contacto</p>
                                            <p className="text-white font-bold">{user?.name || authData.name}</p>
                                            <p className="text-slate-400 text-sm">{user?.email || authData.email}</p>
                                        </div>
                                        <input className="w-full input-premium p-4" placeholder="Dirección Completa (Calle y Altura)" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="w-full input-premium p-4" placeholder="Ciudad" value={checkoutData.city} onChange={e => setCheckoutData({...checkoutData, city: e.target.value})} />
                                            <input className="w-full input-premium p-4" placeholder="Teléfono" value={user?.phone || ''} disabled={!!user?.phone} />
                                        </div>
                                        <textarea className="w-full input-premium p-4 h-24 resize-none" placeholder="Notas adicionales para el envío (Opcional)" value={checkoutData.notes} onChange={e => setCheckoutData({...checkoutData, notes: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Wallet className="text-cyan-400"/> Método de Pago</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Transferencia', 'Efectivo'].map(method => (
                                            <button 
                                                key={method}
                                                onClick={() => setCheckoutData({...checkoutData, paymentMethod: method})}
                                                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${checkoutData.paymentMethod === method ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-[#111115] border-white/10 text-slate-500 hover:bg-white/5'}`}
                                            >
                                                {method === 'Transferencia' ? <RefreshCw className="w-8 h-8"/> : <DollarSign className="w-8 h-8"/>}
                                                <span className="font-bold text-sm uppercase tracking-wider">{method}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Resumen Lateral */}
                            <div className="lg:sticky lg:top-24 h-fit">
                                <div className="bg-[#0a0a0c] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>
                                    
                                    <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">Resumen de Compra</h3>
                                    
                                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                        {cart.map(item => {
                                            const price = item.product.basePrice * (1 - (item.product.discount || 0)/100);
                                            return (
                                                <div key={item.product.id} className="flex justify-between items-center text-sm group">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-white/10 text-white w-6 h-6 flex items-center justify-center rounded text-xs font-bold">{item.quantity}</span>
                                                        <span className="text-slate-300 group-hover:text-white transition">{item.product.name}</span>
                                                    </div>
                                                    <span className="font-mono text-slate-400">${(price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Cupón Input */}
                                    <div className="mb-6">
                                        {appliedCoupon ? (
                                            <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-green-400 font-bold text-xs uppercase tracking-wider">Cupón Aplicado</p>
                                                    <p className="text-white font-black">{appliedCoupon.code}</p>
                                                </div>
                                                <button onClick={() => setAppliedCoupon(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input id="couponInput" className="bg-[#111115] border border-white/10 text-white text-sm rounded-xl px-4 py-3 flex-1 outline-none focus:border-cyan-500 transition" placeholder="Código de Cupón"/>
                                                <button onClick={() => { const val = document.getElementById('couponInput').value; if(val) applyCoupon(val); }} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-xl font-bold transition">Aplicar</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-6 border-t border-white/10 mb-8">
                                        <div className="flex justify-between text-slate-500 text-sm"><span>Subtotal</span><span>{formatMoney(cartSubtotal)}</span></div>
                                        {discountAmount > 0 && <div className="flex justify-between text-green-400 text-sm font-bold"><span>Descuento</span><span>-{formatMoney(discountAmount)}</span></div>}
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="text-white font-bold text-lg">Total Final</span>
                                            <span className="text-4xl font-black text-cyan-400 tracking-tighter">{formatMoney(cartTotal)}</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={confirmOrder} 
                                        disabled={isProcessingOrder} 
                                        className="w-full py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-lg rounded-2xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                                    >
                                        {isProcessingOrder ? <Loader2 className="animate-spin w-6 h-6"/> : <><MessageCircle className="w-6 h-6"/> Confirmar por WhatsApp</>}
                                    </button>
                                    <p className="text-center text-[10px] text-slate-500 mt-4">Al confirmar, serás redirigido a WhatsApp con el detalle pre-cargado.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === VISTA: PERFIL === */}
                {view === 'profile' && user && (
                    <div className="max-w-6xl mx-auto animate-fade-in-up pt-8">
                        {/* Header Perfil */}
                        <div className="glass rounded-[2.5rem] p-8 md:p-12 mb-10 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 border border-white/10">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 z-0"></div>
                            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-1 shadow-2xl z-10">
                                <div className="w-full h-full rounded-full bg-[#0a0a0c] flex items-center justify-center text-5xl font-black text-white">
                                    {user.name.charAt(0)}
                                </div>
                            </div>
                            <div className="text-center md:text-left z-10 flex-1">
                                <h1 className="text-4xl font-black text-white mb-2">{user.name}</h1>
                                <p className="text-slate-400 font-mono bg-white/5 inline-block px-4 py-1 rounded-full border border-white/5">{user.email}</p>
                                <div className="flex gap-4 mt-6 justify-center md:justify-start">
                                    <div className="text-center px-6 py-2 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Pedidos</p>
                                        <p className="text-2xl font-black text-white">{orders.filter(o => o.userId === user.id).length}</p>
                                    </div>
                                    <div className="text-center px-6 py-2 bg-white/5 rounded-xl border border-white/5">
                                        <p className="text-xs text-slate-500 uppercase font-bold">Miembro</p>
                                        <p className="text-2xl font-black text-white">2024</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={logout} className="z-10 px-6 py-3 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 transition font-bold flex gap-2 items-center">
                                <LogOut className="w-4 h-4"/> Cerrar Sesión
                            </button>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Historial de Pedidos */}
                            <div className="lg:col-span-2 space-y-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Package className="text-cyan-400"/> Mis Pedidos Recientes</h2>
                                <div className="space-y-4">
                                    {orders.filter(o => o.userId === user.id).length === 0 ? (
                                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
                                            <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-4"/>
                                            <p className="text-slate-500 font-bold">Aún no has realizado compras.</p>
                                            <button onClick={() => setView('store')} className="mt-4 text-cyan-400 hover:text-white font-bold text-sm">Ir a la Tienda</button>
                                        </div>
                                    ) : (
                                        orders.filter(o => o.userId === user.id).map(o => (
                                            <div key={o.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5 hover:border-cyan-500/30 transition group">
                                                <div className="flex items-center gap-4 w-full md:w-auto">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${o.status === 'Realizado' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                        {o.status.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">Pedido #{o.orderId}</p>
                                                        <p className="text-xs text-slate-500">{formatDate(o.date)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="text-right">
                                                        <p className="text-sm text-slate-500 mb-1">{o.items.length} productos</p>
                                                        <p className="font-black text-white text-xl">{formatMoney(o.total)}</p>
                                                    </div>
                                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${o.status === 'Realizado' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                        {o.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Mis Cupones */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Ticket className="text-purple-400"/> Cupones Disponibles</h2>
                                <div className="space-y-4">
                                    {coupons.filter(c => !c.targetUser || c.targetUser === user.email).length === 0 ? (
                                        <p className="text-slate-500 text-sm italic">No tienes cupones disponibles.</p>
                                    ) : (
                                        coupons.filter(c => !c.targetUser || c.targetUser === user.email).map(c => (
                                            <div key={c.id} className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-5 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition">
                                                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl -mr-10 -mt-10"></div>
                                                <div className="relative z-10">
                                                    <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-1">{c.type === 'fixed' ? 'Descuento Fijo' : 'Porcentaje'}</p>
                                                    <p className="text-3xl font-black text-white mb-2">{c.code}</p>
                                                    <p className="text-sm text-slate-300">
                                                        {c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF en tu compra`}
                                                    </p>
                                                    {c.minPurchase > 0 && <p className="text-[10px] text-slate-500 mt-2">* Mínimo ${c.minPurchase}</p>}
                                                </div>
                                                <button onClick={() => { navigator.clipboard.writeText(c.code); showToast("Código copiado", "success"); }} className="absolute bottom-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-white" title="Copiar">
                                                    <Copy className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
{/* === VISTA: PANEL DE ADMINISTRACIÓN (Llamada al Componente) === */}
            {view === 'admin' && (
                <AdminPanel 
                    user={user} 
                    setView={setView} 
                    currentTab={adminTab}
                    setTab={setAdminTab}
                    data={{ products, orders, suppliers, expenses, coupons, quotes, settings, users }}
                    states={{ 
                        posCart, setPosCart, posSearch, setPosSearch, 
                        tempProduct, setTempProduct, tempSupplier, setTempSupplier, tempCoupon, setTempCoupon 
                    }}
                    actions={{ showToast, addToCart }}
                />
            )}

        </div> // --- FIN DEL COMPONENTE APP ---
    );
}

// =================================================================================================
// === COMPONENTE: PANEL DE ADMINISTRACIÓN ENTERPRISE (Separado para máximo rendimiento) ===
// =================================================================================================

const AdminPanel = ({ user, setView, currentTab, setTab, data, states, actions }) => {
    // Desestructuración de datos y estados para facilitar uso
    const { products, orders, suppliers, expenses, coupons, settings, users } = data;
    const { posCart, setPosCart, posSearch, setPosSearch, tempProduct, setTempProduct, tempSupplier, setTempSupplier, tempCoupon, setTempCoupon } = states;
    const { showToast } = actions;

    // --- ESTADOS LOCALES DEL ADMIN ---
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [showModal, setShowModal] = useState({ active: false, type: null, data: null }); // 'product', 'supplier', 'coupon'
    
    // --- LÓGICA DE NEGOCIO ADMIN (CRUD) ---
    
    // 1. Productos
    const handleSaveProduct = async () => {
        if (!tempProduct.name || !tempProduct.basePrice) return showToast("Faltan datos obligatorios", "error");
        
        const productData = {
            ...tempProduct,
            basePrice: Number(tempProduct.basePrice),
            stock: Number(tempProduct.stock),
            discount: Number(tempProduct.discount),
            updatedAt: new Date().toISOString()
        };

        try {
            if (tempProduct.id) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', tempProduct.id), productData);
                showToast("Producto actualizado correctamente", "success");
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, createdAt: new Date().toISOString() });
                showToast("Producto creado correctamente", "success");
            }
            setShowModal({ active: false });
            setTempProduct({});
        } catch (e) { console.error(e); showToast("Error al guardar", "error"); }
    };

    const handleDeleteProduct = async (id) => {
        if(!window.confirm("¿Estás seguro de eliminar este producto?")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
        showToast("Producto eliminado", "success");
    };

    // 2. Punto de Venta (POS)
    const addToPos = (product) => {
        const existing = posCart.find(i => i.id === product.id);
        if(existing && existing.qty >= product.stock) return showToast("Sin stock suficiente", "warning");
        
        if (existing) {
            setPosCart(posCart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setPosCart([...posCart, { ...product, qty: 1 }]);
        }
    };

    const processPosSale = async () => {
        if (posCart.length === 0) return;
        const total = posCart.reduce((acc, item) => acc + (item.basePrice * item.qty), 0);
        
        try {
            // Registrar Orden
            const orderRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                orderId: `POS-${Date.now().toString().slice(-6)}`,
                userId: user.id,
                customer: { name: 'Venta Mostrador', email: '-', phone: '-' },
                items: posCart.map(i => ({ productId: i.id, title: i.name, quantity: i.qty, unit_price: i.basePrice })),
                total,
                status: 'Realizado',
                date: new Date().toISOString(),
                paymentMethod: 'Efectivo/POS',
                origin: 'POS'
            });

            // Descontar Stock
            const batch = writeBatch(db);
            posCart.forEach(item => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
                batch.update(ref, { stock: increment(-item.qty) });
            });
            await batch.commit();

            setPosCart([]);
            showToast("Venta registrada exitosamente", "success");
        } catch (e) { showToast("Error al procesar venta", "error"); }
    };

    // 3. Proveedores & Cupones
    const handleSaveSupplier = async () => {
        if(!tempSupplier.name) return showToast("Nombre requerido", "error");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), tempSupplier);
        setShowModal({ active: false }); setTempSupplier({}); showToast("Proveedor agregado", "success");
    };

    const handleSaveCoupon = async () => {
        if(!tempCoupon.code) return showToast("Código requerido", "error");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), { ...tempCoupon, code: tempCoupon.code.toUpperCase(), value: Number(tempCoupon.value) });
        setShowModal({ active: false }); setTempCoupon({}); showToast("Cupón creado", "success");
    };

    // --- RENDERIZADO DEL PANEL ---
    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex text-slate-200 font-sans overflow-hidden">
            
            {/* SIDEBAR ADMIN */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0a0a0c] border-r border-white/5 transition-all duration-300 flex flex-col z-20`}>
                <div className="h-20 flex items-center justify-center border-b border-white/5 bg-[#111115]">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={()=>setSidebarOpen(!isSidebarOpen)}>
                        <Shield className="w-8 h-8 text-cyan-500 fill-current/20"/>
                        {isSidebarOpen && <span className="font-black text-xl text-white tracking-tight">ADMIN</span>}
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                        { id: 'products', icon: Package, label: 'Inventario' },
                        { id: 'pos', icon: Calculator, label: 'Punto de Venta' },
                        { id: 'orders', icon: ShoppingBag, label: 'Pedidos' },
                        { id: 'suppliers', icon: Truck, label: 'Proveedores' },
                        { id: 'coupons', icon: Ticket, label: 'Marketing' },
                        { id: 'finance', icon: PieChart, label: 'Finanzas' },
                        { id: 'settings', icon: Settings, label: 'Configuración' },
                    ].map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setTab(item.id)}
                            className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${currentTab === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${currentTab === item.id ? 'text-cyan-400' : 'group-hover:text-white'}`}/>
                            {isSidebarOpen && <span className="text-sm font-bold truncate">{item.label}</span>}
                            {!isSidebarOpen && currentTab === item.id && <div className="absolute left-16 bg-cyan-900 text-cyan-200 text-xs px-2 py-1 rounded ml-2">{item.label}</div>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button onClick={() => setView('store')} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition group">
                        <LogOut className="w-5 h-5"/>
                        {isSidebarOpen && <span className="font-bold text-sm">Salir</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#050505]">
                {/* Topbar */}
                <header className="h-20 border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur flex items-center justify-between px-8 z-10">
                    <h1 className="text-2xl font-black text-white capitalize flex items-center gap-3">
                        {currentTab === 'pos' ? 'Punto de Venta' : currentTab}
                        {isSidebarOpen && <span className="text-xs bg-white/10 px-2 py-1 rounded text-slate-400 font-normal uppercase tracking-wider">v4.5 Enterprise</span>}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="font-bold text-white text-sm">{user.name}</p>
                            <p className="text-xs text-cyan-500 font-mono">ADMINISTRADOR</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-[2px]">
                            <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-white font-bold text-xs">{user.name.charAt(0)}</div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    {/* --- VISTA: DASHBOARD --- */}
                    {currentTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: "Ventas Totales", value: formatMoney(orders.reduce((a,b) => a + b.total, 0)), icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
                                    { label: "Pedidos", value: orders.length, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
                                    { label: "Clientes", value: users.length || new Set(orders.map(o=>o.customer.email)).size, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
                                    { label: "Productos", value: products.length, icon: Package, color: "text-orange-400", bg: "bg-orange-500/10" },
                                ].map((stat, idx) => (
                                    <div key={idx} className="bg-[#0a0a0c] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-white/10 transition">
                                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition ${stat.color}`}><stat.icon className="w-20 h-20"/></div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}><stat.icon className="w-6 h-6"/></div>
                                            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                        <p className="text-3xl font-black text-white relative z-10">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
                                    <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2"><TrendingUp className="text-cyan-500 w-5 h-5"/> Últimos Movimientos</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-slate-500 border-b border-white/5 uppercase text-xs font-bold">
                                                <tr><th className="pb-3 pl-2">ID</th><th className="pb-3">Cliente</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Total</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {orders.slice(0, 5).map(o => (
                                                    <tr key={o.id} className="hover:bg-white/5 transition">
                                                        <td className="py-4 pl-2 font-mono text-slate-500 text-xs">{o.orderId}</td>
                                                        <td className="py-4 font-bold text-slate-200">{o.customer.name}</td>
                                                        <td className="py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${o.status==='Realizado'?'bg-green-500/10 text-green-400':'bg-yellow-500/10 text-yellow-400'}`}>{o.status}</span></td>
                                                        <td className="py-4 text-right font-mono text-white font-bold">{formatMoney(o.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
                                    <h3 className="font-bold text-white text-lg mb-6 flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5"/> Stock Crítico</h3>
                                    <div className="space-y-3">
                                        {products.filter(p => p.stock <= 3).map(p => (
                                            <div key={p.id} className="flex justify-between items-center bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                                                <span className="font-medium text-slate-300 text-sm truncate w-32">{p.name}</span>
                                                <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">Queda: {p.stock}</span>
                                            </div>
                                        ))}
                                        {products.filter(p => p.stock <= 3).length === 0 && <p className="text-slate-500 italic text-sm">Inventario saludable.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- VISTA: INVENTARIO --- */}
                    {currentTab === 'products' && (
                        <div className="animate-fade-in-up">
                            <div className="flex justify-between items-center mb-8">
                                <div className="relative w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
                                    <input className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-500 outline-none transition" placeholder="Buscar en inventario..." onChange={(e) => setPosSearch(e.target.value)}/>
                                </div>
                                <button onClick={() => { setTempProduct({}); setShowModal({ active: true, type: 'product' }); }} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition">
                                    <Plus className="w-5 h-5"/> Nuevo Producto
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                    <div key={p.id} className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 flex flex-col group hover:border-cyan-500/30 transition relative overflow-hidden">
                                        <div className="h-40 bg-[#111115] rounded-xl mb-4 flex items-center justify-center p-4 relative">
                                            <img src={p.image} className="max-h-full object-contain transition-transform group-hover:scale-110"/>
                                            {p.stock <= 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm rounded-xl"><span className="text-red-500 font-black text-xs uppercase border border-red-500 px-2 py-1 rounded">Agotado</span></div>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-cyan-500 font-bold uppercase tracking-wider mb-1">{p.category}</p>
                                            <h4 className="font-bold text-white leading-tight mb-2 line-clamp-2">{p.name}</h4>
                                            <div className="flex justify-between items-end">
                                                <p className="text-xl font-black text-white">{formatMoney(p.basePrice)}</p>
                                                <p className="text-xs text-slate-500 font-mono">Stock: {p.stock}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                                            <button onClick={() => { setTempProduct(p); setShowModal({ active: true, type: 'product' }); }} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition"><Edit className="w-3 h-3"/> Editar</button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition"><Trash2 className="w-3 h-3"/> Borrar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- VISTA: POS (Punto de Venta) --- */}
                    {currentTab === 'pos' && (
                        <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in-up -m-2">
                            {/* Grid Productos POS */}
                            <div className="lg:w-2/3 flex flex-col bg-[#0a0a0c] rounded-2xl border border-white/5 p-6 shadow-xl">
                                <input className="w-full bg-[#111115] border border-white/10 rounded-xl px-5 py-4 text-lg text-white mb-6 focus:border-cyan-500 outline-none" placeholder="🔍 Buscar o escanear producto..." value={posSearch} onChange={e => setPosSearch(e.target.value)} autoFocus/>
                                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar pr-2">
                                    {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.stock > 0).map(p => (
                                        <div key={p.id} onClick={() => addToPos(p)} className="bg-[#16161a] hover:bg-[#1f1f25] border border-white/5 hover:border-cyan-500/50 rounded-xl p-4 cursor-pointer transition flex flex-col items-center text-center active:scale-95 group">
                                            <img src={p.image} className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition"/>
                                            <p className="text-xs font-bold text-white line-clamp-2 leading-tight">{p.name}</p>
                                            <p className="text-cyan-400 font-black mt-2">{formatMoney(p.basePrice)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Ticket POS */}
                            <div className="lg:w-1/3 bg-[#111115] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                                <div className="p-5 border-b border-white/5 bg-[#16161a] flex justify-between items-center">
                                    <h3 className="font-bold text-white flex items-center gap-2"><Calculator className="text-cyan-500"/> Ticket Actual</h3>
                                    <button onClick={() => setPosCart([])} className="text-xs text-red-400 hover:text-white uppercase font-bold tracking-wider">Vaciar</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {posCart.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-xs font-bold text-white truncate">{i.name}</p>
                                                <p className="text-[10px] text-slate-500">{formatMoney(i.basePrice)} x {i.qty}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono font-bold text-white text-sm">{formatMoney(i.basePrice * i.qty)}</p>
                                                <button onClick={() => setPosCart(posCart.filter(x => x.id !== i.id))} className="text-[10px] text-red-500 hover:underline mt-1">Quitar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-cyan-900/10 border-t border-cyan-500/20">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-cyan-500 font-bold uppercase tracking-wider text-sm">Total a Cobrar</span>
                                        <span className="text-4xl font-black text-white">{formatMoney(posCart.reduce((a, i) => a + (i.basePrice * i.qty), 0))}</span>
                                    </div>
                                    <button onClick={processPosSale} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2">
                                        COBRAR <DollarSign className="w-6 h-6 stroke-[3]"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- OTRAS PESTAÑAS SIMPLIFICADAS --- */}
                    {currentTab === 'suppliers' && (
                        <div className="space-y-6">
                            <div className="flex justify-between"><h2 className="text-2xl font-bold">Proveedores</h2><button onClick={()=>{setTempSupplier({}); setShowModal({active:true, type:'supplier'})}} className="btn-primary px-6 py-2 rounded-lg bg-cyan-600 text-white font-bold">Nuevo</button></div>
                            <div className="grid grid-cols-3 gap-6">{suppliers.map(s=><div key={s.id} className="bg-white/5 p-6 rounded-xl border border-white/10"><h3 className="font-bold text-xl">{s.name}</h3><p className="text-slate-400 text-sm mt-2"><User className="inline w-4 h-4"/> {s.contact}</p><p className="text-slate-400 text-sm"><Phone className="inline w-4 h-4"/> {s.phone}</p><div className="mt-4 pt-4 border-t border-white/5 flex justify-between"><span className="text-xs uppercase font-bold text-slate-500">Deuda</span><span className="text-red-400 font-bold font-mono">{formatMoney(s.debt || 0)}</span></div></div>)}</div>
                        </div>
                    )}
                    
                    {currentTab === 'coupons' && (
                        <div className="space-y-6">
                            <div className="flex justify-between"><h2 className="text-2xl font-bold">Cupones de Descuento</h2><button onClick={()=>{setTempCoupon({}); setShowModal({active:true, type:'coupon'})}} className="btn-primary px-6 py-2 rounded-lg bg-purple-600 text-white font-bold">Crear Cupón</button></div>
                            <div className="grid grid-cols-3 gap-6">{coupons.map(c=><div key={c.id} className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-6 rounded-xl relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-20"><Ticket className="w-16 h-16 text-purple-500"/></div><h3 className="font-black text-2xl tracking-widest text-white">{c.code}</h3><p className="text-purple-400 font-bold">{c.type==='fixed' ? formatMoney(c.value) : c.value+'%'} OFF</p><button onClick={async()=>{if(confirm('Borrar?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',c.id))}} className="mt-4 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Eliminar</button></div>)}</div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- MODALES ADMIN GENÉRICOS --- */}
            <Modal isOpen={showModal.active} onClose={() => setShowModal({ active: false })} title={showModal.type === 'product' ? 'Gestionar Producto' : showModal.type === 'supplier' ? 'Nuevo Proveedor' : 'Crear Cupón'} size="md">
                <div className="space-y-4">
                    {showModal.type === 'product' && (
                        <>
                            <input className="w-full input-premium p-3" placeholder="Nombre" value={tempProduct.name || ''} onChange={e => setTempProduct({ ...tempProduct, name: e.target.value })}/>
                            <div className="flex gap-4">
                                <input className="w-full input-premium p-3" type="number" placeholder="Precio ($)" value={tempProduct.basePrice || ''} onChange={e => setTempProduct({ ...tempProduct, basePrice: e.target.value })}/>
                                <input className="w-full input-premium p-3" type="number" placeholder="Stock" value={tempProduct.stock || ''} onChange={e => setTempProduct({ ...tempProduct, stock: e.target.value })}/>
                            </div>
                            <div className="flex gap-4">
                                <input className="w-full input-premium p-3" placeholder="Categoría" value={tempProduct.category || ''} onChange={e => setTempProduct({ ...tempProduct, category: e.target.value })}/>
                                <input className="w-full input-premium p-3" type="number" placeholder="% Descuento" value={tempProduct.discount || ''} onChange={e => setTempProduct({ ...tempProduct, discount: e.target.value })}/>
                            </div>
                            <input className="w-full input-premium p-3" placeholder="URL Imagen" value={tempProduct.image || ''} onChange={e => setTempProduct({ ...tempProduct, image: e.target.value })}/>
                            <textarea className="w-full input-premium p-3 h-24" placeholder="Descripción" value={tempProduct.description || ''} onChange={e => setTempProduct({ ...tempProduct, description: e.target.value })}/>
                            <button onClick={handleSaveProduct} className="w-full py-3 bg-cyan-600 rounded-xl font-bold text-white mt-4">Guardar Producto</button>
                        </>
                    )}
                    {showModal.type === 'supplier' && (
                        <>
                            <input className="w-full input-premium p-3" placeholder="Empresa" value={tempSupplier.name || ''} onChange={e => setTempSupplier({ ...tempSupplier, name: e.target.value })}/>
                            <input className="w-full input-premium p-3" placeholder="Contacto" value={tempSupplier.contact || ''} onChange={e => setTempSupplier({ ...tempSupplier, contact: e.target.value })}/>
                            <input className="w-full input-premium p-3" placeholder="Teléfono" value={tempSupplier.phone || ''} onChange={e => setTempSupplier({ ...tempSupplier, phone: e.target.value })}/>
                            <input className="w-full input-premium p-3" type="number" placeholder="Deuda Inicial" value={tempSupplier.debt || ''} onChange={e => setTempSupplier({ ...tempSupplier, debt: e.target.value })}/>
                            <button onClick={handleSaveSupplier} className="w-full py-3 bg-cyan-600 rounded-xl font-bold text-white mt-4">Guardar Proveedor</button>
                        </>
                    )}
                    {showModal.type === 'coupon' && (
                        <>
                            <input className="w-full input-premium p-3 uppercase font-black tracking-widest text-center text-xl text-purple-400 border-purple-500/50" placeholder="CÓDIGO (EJ: SALE20)" value={tempCoupon.code || ''} onChange={e => setTempCoupon({ ...tempCoupon, code: e.target.value })}/>
                            <div className="flex gap-4">
                                <select className="input-premium p-3 flex-1" value={tempCoupon.type || 'percentage'} onChange={e => setTempCoupon({ ...tempCoupon, type: e.target.value })}><option value="percentage">Porcentaje (%)</option><option value="fixed">Monto Fijo ($)</option></select>
                                <input className="input-premium p-3 flex-1" type="number" placeholder="Valor" value={tempCoupon.value || ''} onChange={e => setTempCoupon({ ...tempCoupon, value: e.target.value })}/>
                            </div>
                            <div className="flex gap-4">
                                <input className="input-premium p-3 flex-1" type="number" placeholder="Compra Mínima" value={tempCoupon.minPurchase || ''} onChange={e => setTempCoupon({ ...tempCoupon, minPurchase: e.target.value })}/>
                                <input className="input-premium p-3 flex-1" type="date" value={tempCoupon.expirationDate || ''} onChange={e => setTempCoupon({ ...tempCoupon, expirationDate: e.target.value })}/>
                            </div>
                            <input className="w-full input-premium p-3" placeholder="Email usuario específico (Opcional)" value={tempCoupon.targetUser || ''} onChange={e => setTempCoupon({ ...tempCoupon, targetUser: e.target.value })}/>
                            <button onClick={handleSaveCoupon} className="w-full py-3 bg-purple-600 rounded-xl font-bold text-white mt-4">Crear Beneficio</button>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
