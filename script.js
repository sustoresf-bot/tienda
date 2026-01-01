import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
// Importación masiva de iconos para asegurar que no falte ninguno de los que usabas
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, 
    Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, 
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, 
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, 
    ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, 
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp, CheckSquare, XCircle, MoreVertical,
    Activity, Database, Server, Smartphone, Headphones, Monitor, Speaker, Wifi, Battery
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, 
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (NO TOCAR) ---
// Esta configuración conecta directamente con tu base de datos 'sustore-63266'
const firebaseConfig = {
  apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
  authDomain: "sustore-63266.firebaseapp.com",
  projectId: "sustore-63266",
  storageBucket: "sustore-63266.firebasestorage.app",
  messagingSenderId: "684651914850",
  appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
  measurementId: "G-X3K7XGYPRD"
};

// Inicialización de servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Identificador de la aplicación para separar datos en DB
const appId = "sustore-prod-v3";
// Email del Super Administrador (TÚ)
const SUPER_ADMIN_EMAIL = "lautarocorazza63@gmail.com";

// --- CONFIGURACIÓN POR DEFECTO DEL SISTEMA ---
// Estos valores se usan si la base de datos no tiene configuración guardada
const defaultSettings = {
    storeName: "SUSTORE", 
    primaryColor: "#06b6d4", 
    currency: "$", 
    admins: SUPER_ADMIN_EMAIL, 
    team: [
        { 
            email: SUPER_ADMIN_EMAIL, 
            role: "admin", 
            name: "Lautaro Corazza",
            position: "CEO & Founder"
        }
    ],
    sellerEmail: "sustoresf@gmail.com", 
    instagramUser: "sustore_sf", 
    whatsappLink: "https://wa.me/message/3MU36VTEKINKP1", 
    logoUrl: "", 
    heroUrl: "", 
    markupPercentage: 0,
    announcementMessage: "🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥",
    categories: [
        "Celulares", 
        "Accesorios", 
        "Audio", 
        "Computación", 
        "Gaming",
        "Tablets",
        "Smartwatch",
        "Cargadores"
    ], 
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado para asegurar tu satisfacción."
};

// --- UTILIDADES Y ESTILOS AUXILIARES ---

// Función para formatear moneda de forma segura
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

// Función para calcular precios con descuento
const calculatePrices = (basePrice, discount, costPrice = 0) => {
    const base = Number(basePrice) || 0;
    const disc = Number(discount) || 0;
    const cost = Number(costPrice) || 0;
    
    const finalPrice = disc > 0 ? Math.ceil(base * (1 - disc / 100)) : base;
    const profit = finalPrice - cost;
    
    return {
        base,
        discount: disc,
        cost,
        finalPrice,
        profit,
        hasDiscount: disc > 0
    };
};

// --- COMPONENTES DE UI GENÉRICOS ---

/**
 * Componente Toast (Notificaciones flotantes)
 * Muestra mensajes de éxito, error o información en la esquina superior derecha.
 */
const Toast = ({ message, type, onClose }) => {
    // Definición detallada de estilos según el tipo
    let containerStyle = "fixed top-24 right-4 z-[9999] flex items-center gap-4 p-5 rounded-2xl border-l-4 backdrop-blur-xl animate-fade-up shadow-2xl transition-all duration-300 min-w-[300px]";
    let iconBoxStyle = "p-2 rounded-full flex items-center justify-center";
    let IconComponent = Info;

    if (type === 'success') {
        containerStyle += " border-green-500 text-green-400 bg-black/90 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
        iconBoxStyle += " bg-green-500/20";
        IconComponent = CheckCircle;
    } else if (type === 'error') {
        containerStyle += " border-red-500 text-red-400 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
        iconBoxStyle += " bg-red-500/20";
        IconComponent = AlertCircle;
    } else if (type === 'warning') {
        containerStyle += " border-yellow-500 text-yellow-400 bg-black/90 shadow-[0_0_20px_rgba(234,179,8,0.3)]";
        iconBoxStyle += " bg-yellow-500/20";
        IconComponent = AlertTriangle;
    } else {
        containerStyle += " border-cyan-500 text-cyan-400 bg-black/90 shadow-[0_0_20px_rgba(6,182,212,0.3)]";
        iconBoxStyle += " bg-cyan-500/20";
        IconComponent = Info;
    }
    
    useEffect(() => { 
        const timer = setTimeout(onClose, 4000); 
        return () => clearTimeout(timer); 
    }, [onClose]);
    
    return (
        <div className={containerStyle}>
            <div className={iconBoxStyle}>
                <IconComponent className="w-6 h-6"/>
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm tracking-wide leading-snug">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-white/50 hover:text-white transition p-1 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4"/>
            </button>
        </div>
    );
};

/**
 * Componente Modal de Confirmación
 * Se usa para acciones destructivas como eliminar productos o pedidos.
 */
const ConfirmModal = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText="Confirmar", 
    cancelText="Cancelar", 
    isDangerous = false 
}) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
            <div className={`glass p-8 rounded-[2rem] max-w-sm w-full border ${isDangerous ? 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-slate-700 shadow-2xl'}`}>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500 shadow-lg shadow-red-900/20' : 'bg-cyan-900/20 text-cyan-500 shadow-lg shadow-cyan-900/20'}`}>
                    {isDangerous ? <AlertTriangle className="w-10 h-10"/> : <Info className="w-10 h-10"/>}
                </div>
                
                <h3 className="text-2xl font-black text-center mb-3 text-white">{title}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed font-medium">{message}</p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onConfirm} 
                        className={`w-full py-4 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2 ${isDangerous ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 shadow-red-600/30' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30'}`}
                    >
                        {isDangerous && <Trash2 className="w-5 h-5"/>}
                        {confirmText}
                    </button>
                    <button 
                        onClick={onCancel} 
                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition border border-slate-700 hover:text-white"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- APLICACIÓN PRINCIPAL ---
function App() {
    // --------------------------------------------------------------------------------
    // 1. GESTIÓN DE ESTADO (STATE MANAGEMENT)
    // --------------------------------------------------------------------------------

    // --- Navegación y UI ---
    // Controla qué vista se muestra actualmente (store, cart, checkout, admin, etc.)
    const [view, setView] = useState('store'); 
    // Controla la pestaña activa dentro del panel de administración
    const [adminTab, setAdminTab] = useState('dashboard'); 
    // Controla la visibilidad del menú lateral en móviles
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    // Control de carga inicial de la aplicación
    const [isLoading, setIsLoading] = useState(true);
    // Sistema de notificaciones (Toasts)
    const [toasts, setToasts] = useState([]);
    // Configuración del modal de confirmación global
    const [modalConfig, setModalConfig] = useState({ isOpen: false });

    // --- Usuario y Sesión ---
    // Estado del usuario actual con persistencia local inicial para evitar parpadeos
    const [currentUser, setCurrentUser] = useState(() => { 
        try { 
            const saved = localStorage.getItem('nexus_user_data');
            return saved ? JSON.parse(saved) : null; 
        } catch(e) { return null; } 
    });
    // Usuario del sistema (Firebase Auth object)
    const [systemUser, setSystemUser] = useState(null);
    
    // --- Datos de Negocio (Sincronizados con Firebase) ---
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]); // Lista de todos los usuarios (solo visible para admin)
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);
    
    // Carrito de compras local (persiste en localStorage)
    const [cart, setCart] = useState(() => { 
        try { 
            const saved = JSON.parse(localStorage.getItem('nexus_cart'));
            return Array.isArray(saved) ? saved : []; 
        } catch(e) { return []; } 
    });
    
    // Monitoreo de carritos en tiempo real (Live Carts) para el Dashboard
    const [liveCarts, setLiveCarts] = useState([]); 

    // --- Estados de Formularios y UI Específica ---
    // Búsqueda y Filtros
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Formulario de Autenticación (Login/Registro)
    const [authData, setAuthData] = useState({ 
        email: '', 
        password: '', 
        name: '', 
        username: '', 
        dni: '', 
        phone: '' 
    });
    const [loginMode, setLoginMode] = useState(true); // true = Login, false = Registro
    
    // Formulario de Checkout (Datos de envío y pago)
    const [checkoutData, setCheckoutData] = useState({ 
        address: '', 
        city: '', 
        province: '', 
        zipCode: '', 
        paymentChoice: '' 
    });
    
    // Cupones en Checkout
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false); 

    // --- Estados del Panel de Administración (CRUD) ---
    // Formulario de Producto (Ahora incluye COSTO)
    const [newProduct, setNewProduct] = useState({ 
        name: '', 
        basePrice: '', // Precio de Venta
        costPrice: '', // Precio de Compra (Costo)
        stock: '', 
        category: '', 
        image: '', 
        description: '', 
        discount: 0 
    });
    const [editingId, setEditingId] = useState(null); // ID del producto que se está editando
    const [showProductForm, setShowProductForm] = useState(false);
    
    // Formulario de Cupón
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, 
        expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '', perUserLimit: 1, isActive: true
    });
    
    // Formulario de Proveedor
    const [newSupplier, setNewSupplier] = useState({ 
        name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] 
    });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    
    // Configuración General
    const [aboutText, setAboutText] = useState('');
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });
    
    // Modal de Detalle de Pedido
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Referencias
    const fileInputRef = useRef(null); // Para el input de subir imagen

    // --------------------------------------------------------------------------------
    // 2. FUNCIONES AUXILIARES Y HELPERS
    // --------------------------------------------------------------------------------

    // Mostrar notificaciones en pantalla
    const showToast = (msg, type = 'info') => { 
        const id = Date.now(); 
        setToasts(prev => { 
            // Limitar a 5 notificaciones simultáneas para no saturar
            const filtered = prev.filter(t => Date.now() - t.id < 4000); 
            return [...filtered, { id, message: msg, type }]; 
        });
    };

    // Eliminar una notificación específica
    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

    // Determinar rol del usuario
    const getRole = (email) => {
        if (!email || !settings) return 'user';
        const cleanEmail = email.trim().toLowerCase();
        // El Super Admin tiene acceso total siempre
        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';
        // Buscar en la lista de equipo configurada
        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
        return member ? member.role : 'user';
    };

    // Verificadores de permisos
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => ['admin', 'employee'].includes(getRole(email));

    // --------------------------------------------------------------------------------
    // 3. EFECTOS Y SINCRONIZACIÓN (HOOKS)
    // --------------------------------------------------------------------------------

    // Persistencia del Carrito Local y Sincronización Remota
    useEffect(() => {
        // Guardar en localStorage siempre
        localStorage.setItem('nexus_cart', JSON.stringify(cart));
        
        // Si el usuario está logueado, subir su carrito a Firebase (para que el Admin lo vea en "Live")
        if (currentUser?.id) {
            const syncCart = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name || 'Usuario',
                        items: cart.map(item => ({
                            productId: item.product.id,
                            quantity: item.quantity,
                            name: item.product.name,
                            price: item.product.basePrice
                        })),
                        lastUpdated: new Date().toISOString()
                    });
                } catch (e) { console.error("Error sincronizando carrito:", e); }
            };
            // Debounce para no escribir en DB con cada click rápido
            const t = setTimeout(syncCart, 2000);
            return () => clearTimeout(t);
        }
    }, [cart, currentUser]);

    // Persistencia de Sesión de Usuario Local
    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            // Pre-llenar datos de checkout si existen en el perfil
            setCheckoutData(prev => ({ 
                ...prev, 
                address: currentUser.address || prev.address, 
                city: currentUser.city || prev.city, 
                province: currentUser.province || prev.province, 
                zipCode: currentUser.zipCode || prev.zipCode,
                phone: currentUser.phone || prev.phone
            }));
        }
    }, [currentUser]);

    // Inicialización de Autenticación Firebase
    useEffect(() => { 
        // Iniciar sesión anónima para permitir lectura de base de datos
        signInAnonymously(auth).then(() => {
            // Si hay un usuario guardado localmente, intentar refrescar sus datos frescos de la DB
             if (currentUser?.id) {
                getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id))
                    .then(s => {
                        if (s.exists()) {
                            setCurrentUser({...s.data(), id: s.id});
                        }
                    })
                    .catch(err => console.warn("No se pudo refrescar usuario:", err));
            }
        }).catch(err => console.error("Error Auth Anónimo:", err));

        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            // Pequeño delay artificial para transiciones suaves de carga
            setTimeout(() => setIsLoading(false), 1200);
        }); 
    }, []);
    
    // Listeners de Base de Datos en Tiempo Real (Snapshots)
    useEffect(() => {
        if(!systemUser) return;
        
        // Array de funciones para desuscribirse (limpieza)
        const unsubscribes = [
            // Productos
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), snapshot => {
                setProducts(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
            }),
            // Pedidos (Ordenados por fecha localmente para simplificar queries)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), snapshot => {
                const ordersData = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
                setOrders(ordersData.sort((a,b) => new Date(b.date) - new Date(a.date)));
            }),
            // Usuarios (Solo necesarios para admin, pero cargamos todos por simplicidad en v3)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), snapshot => {
                setUsers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
            }),
            // Cupones
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), snapshot => {
                setCoupons(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
            }),
            // Proveedores
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), snapshot => {
                setSuppliers(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
            }),
            // Carritos Activos (Para Dashboard Admin)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), snapshot => {
                setLiveCarts(snapshot.docs.map(d => ({id: d.id, ...d.data()})).filter(c => c.items?.length > 0));
            }),
            // Configuración Global
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), snapshot => { 
                if(!snapshot.empty) { 
                    const d = snapshot.docs[0].data(); 
                    const merged = { 
                        ...defaultSettings, 
                        ...d, 
                        team: d.team || defaultSettings.team, 
                        categories: d.categories || defaultSettings.categories 
                    };
                    setSettings(merged); 
                    setTempSettings(merged); 
                    setAboutText(d.aboutUsText || defaultSettings.aboutUsText); 
                } else {
                    // Si no existe configuración, crear la por defecto
                    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings); 
                }
            })
        ];
        
        // Cleanup al desmontar
        return () => unsubscribes.forEach(fn => fn());
    }, [systemUser]);

    // --------------------------------------------------------------------------------
    // 4. LÓGICA DE NEGOCIO (STORE & CHECKOUT)
    // --------------------------------------------------------------------------------

    // Manejo de Autenticación (Login y Registro)
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            
            if (isRegister) {
                // Validaciones de Registro
                if (!authData.name || authData.name.length < 3) throw new Error("El nombre es muy corto.");
                if (!authData.email.includes('@')) throw new Error("Email inválido.");
                if (authData.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                if (!authData.dni) throw new Error("El DNI es obligatorio.");
                
                // Verificar duplicados
                const qEmail = query(usersRef, where("email", "==", authData.email));
                const emailCheck = await getDocs(qEmail);
                if (!emailCheck.empty) throw new Error("Este email ya está registrado.");

                const newUser = { 
                    ...authData, 
                    role: 'user', 
                    joinDate: new Date().toISOString(), 
                    favorites: [], 
                    ordersCount: 0 
                };
                
                const ref = await addDoc(usersRef, newUser);
                setCurrentUser({ ...newUser, id: ref.id });
                showToast("¡Cuenta creada exitosamente!", "success");
            } else {
                // Lógica de Login (Soporta Email o Username)
                let q = query(usersRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let snap = await getDocs(q);
                
                if (snap.empty) {
                    q = query(usersRef, where("username", "==", authData.email), where("password", "==", authData.password));
                    snap = await getDocs(q);
                }
                
                if (snap.empty) throw new Error("Credenciales incorrectas. Verifica tus datos.");
                
                setCurrentUser({ ...snap.docs[0].data(), id: snap.docs[0].id });
                showToast(`Bienvenido de nuevo, ${snap.docs[0].data().name}`, "success");
            }
            // Reset y Redirección
            setView('store');
            setAuthData({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
        } catch (error) { 
            showToast(error.message, "error"); 
        } finally { 
            setIsLoading(false); 
        }
    };

    // Agregar/Quitar de Favoritos
    const toggleFavorite = async (product) => {
        if (!currentUser) return showToast("Debes iniciar sesión para guardar favoritos.", "info");
        
        const currentFavs = currentUser.favorites || [];
        const isFav = currentFavs.includes(product.id);
        let newFavs;
        
        if (isFav) {
            newFavs = currentFavs.filter(id => id !== product.id);
            showToast("Eliminado de favoritos.", "info");
        } else {
            newFavs = [...currentFavs, product.id];
            showToast("Guardado en favoritos.", "success");
        }
        
        // Actualización optimista local
        setCurrentUser(prev => ({ ...prev, favorites: newFavs }));
        
        // Actualización remota silenciosa
        try { 
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { favorites: newFavs }); 
        } catch(e){
            console.error("Error actualizando favoritos:", e);
        }
    };

    // Gestión del Carrito (Agregar, Quitar, Cambiar cantidad)
    const manageCart = (product, quantityDelta) => {
        setCart(prev => {
            const idx = prev.findIndex(item => item.product.id === product.id);
            const currentQty = idx >= 0 ? prev[idx].quantity : 0;
            const newQty = currentQty + quantityDelta;
            
            // Validaciones de Stock
            if (newQty > Number(product.stock)) {
                showToast(`Stock insuficiente. Solo quedan ${product.stock} unidades.`, "warning");
                return prev;
            }
            
            // Si la cantidad es 0 o menor, eliminar del carrito
            if (newQty <= 0) {
                if (idx >= 0) showToast("Producto eliminado del carrito.", "info");
                return prev.filter(item => item.product.id !== product.id);
            }
            
            // Si el producto ya existe, actualizar cantidad
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], quantity: newQty };
                return updated;
            }
            
            // Si es nuevo, agregar
            showToast("Producto agregado al carrito.", "success");
            return [...prev, { product, quantity: 1 }];
        });
    };

    // Cálculos de Precios para el Carrito (Memoizados)
    const cartSubtotal = useMemo(() => {
        return cart.reduce((total, item) => {
            const { finalPrice } = calculatePrices(item.product.basePrice, item.product.discount);
            return total + (finalPrice * item.quantity);
        }, 0);
    }, [cart]);
    
    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        
        // Validar cupón nuevamente
        if (new Date(appliedCoupon.expirationDate) < new Date()) return 0;
        
        let val = 0;
        if (appliedCoupon.type === 'fixed') {
            val = appliedCoupon.value;
        } else {
            val = cartSubtotal * (appliedCoupon.value / 100);
        }
        
        // Aplicar tope de reintegro si existe
        if (appliedCoupon.maxDiscount && val > appliedCoupon.maxDiscount) {
            val = appliedCoupon.maxDiscount;
        }
        
        // El descuento no puede ser mayor al total
        return Math.min(val, cartSubtotal);
    }, [cartSubtotal, appliedCoupon]);

    const finalTotal = Math.max(0, cartSubtotal - discountAmount);

    // Selección y validación de Cupón
    const selectCoupon = (coupon) => {
        // Validaciones estrictas
        if (new Date(coupon.expirationDate) < new Date()) return showToast("Este cupón ha vencido.", "error");
        if (coupon.usageLimit && (coupon.usedBy?.length || 0) >= coupon.usageLimit) return showToast("Este cupón ha agotado sus usos.", "error");
        if (cartSubtotal < (coupon.minPurchase || 0)) return showToast(`La compra mínima para este cupón es $${coupon.minPurchase}.`, "warning");
        if (coupon.targetUser && coupon.targetUser !== currentUser?.email) return showToast("Este cupón no es válido para tu usuario.", "error");
        
        setAppliedCoupon(coupon);
        setShowCouponModal(false);
        showToast("¡Cupón aplicado correctamente!", "success");
    };

    // Procesamiento y Confirmación del Pedido
    const confirmOrder = async () => {
        // Bloqueo de doble envío
        if (isProcessingOrder) return;
        
        // Validaciones pre-envío
        if (!currentUser) { setView('login'); return showToast("Por favor inicia sesión para completar la compra.", "info"); }
        if (!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Por favor completa todos los datos de envío.", "warning");
        if (!checkoutData.paymentChoice) return showToast("Debes seleccionar un método de pago.", "warning");

        setIsProcessingOrder(true);
        showToast("Procesando tu pedido, por favor espera...", "info");

        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`; 
            
            // Construcción del objeto Pedido con datos inmutables del momento de la compra
            const newOrder = { 
                orderId,
                userId: currentUser.id, 
                customer: { 
                    name: currentUser.name, 
                    email: currentUser.email, 
                    phone: currentUser.phone || '', 
                    dni: currentUser.dni || '' 
                }, 
                items: cart.map(i => {
                    const prices = calculatePrices(i.product.basePrice, i.product.discount, i.product.costPrice);
                    return { 
                        productId: i.product.id, 
                        title: i.product.name, 
                        quantity: i.quantity, 
                        unit_price: prices.finalPrice, // Precio al que se vendió
                        original_price: Number(i.product.basePrice), // Precio de lista original
                        cost_price: Number(i.product.costPrice || 0), // IMPORTANTE: Guardar costo histórico para reportes
                        image: i.product.image 
                    };
                }), 
                subtotal: cartSubtotal, 
                discount: discountAmount,
                total: finalTotal, 
                discountCode: appliedCoupon?.code || null, 
                status: 'Pendiente', 
                date: new Date().toISOString(), 
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, 
                paymentMethod: checkoutData.paymentChoice,
                lastUpdate: new Date().toISOString()
            };
            
            // 1. Guardar Pedido
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            
            // 2. Actualizar Usuario (Dirección y Contador)
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { 
                address: checkoutData.address, 
                city: checkoutData.city, 
                province: checkoutData.province, 
                zipCode: checkoutData.zipCode,
                phone: checkoutData.phone || currentUser.phone,
                ordersCount: increment(1)
            });
            
            // 3. Limpiar Carrito "En Vivo" en DB
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), { userId: currentUser.id, items: [] });

            // 4. Operación en Lote (Batch) para Stock y Cupones
            const batch = writeBatch(db);
            
            // Descontar Stock
            cart.forEach(item => {
                const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                batch.update(productRef, { stock: increment(-item.quantity) });
            });
            
            // Marcar Cupón como Usado
            if (appliedCoupon) {
                const couponRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id);
                batch.update(couponRef, { usedBy: arrayUnion(currentUser.id) });
            }
            
            await batch.commit();

            // 5. Finalización y Limpieza
            setCart([]); 
            setAppliedCoupon(null); 
            setView('profile'); 
            showToast("¡Pedido realizado con éxito! Gracias por tu compra.", "success");
            
            // Enviar email de confirmación (si estuviera configurado el backend)
            // await fetch('/api/payment', { method: 'POST', body: JSON.stringify(newOrder) });

        } catch(e) { 
            console.error("Error checkout:", e); 
            showToast("Ocurrió un error al procesar el pedido. Intenta nuevamente.", "error"); 
        } finally { 
            setIsProcessingOrder(false); 
        }
    };
    // --------------------------------------------------------------------------------
    // 5. FUNCIONES DE ADMINISTRACIÓN (PANEL DE CONTROL)
    // --------------------------------------------------------------------------------

    // A) GESTIÓN DE PRODUCTOS
    
    // Guardar Producto (Crear o Editar) - AHORA INCLUYE COSTO
    const saveProductFn = async () => {
        // Validaciones de formulario
        if (!newProduct.name) return showToast("El nombre del producto es obligatorio.", "warning");
        if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0) return showToast("El precio de venta debe ser mayor a 0.", "warning");
        if (!newProduct.category) return showToast("Debes seleccionar una categoría.", "warning");

        const productData = {
            ...newProduct, 
            basePrice: Number(newProduct.basePrice), 
            costPrice: Number(newProduct.costPrice || 0), // NUEVO: Precio de Costo
            stock: Number(newProduct.stock), 
            discount: Number(newProduct.discount || 0), 
            image: newProduct.image || 'https://via.placeholder.com/150',
            lastUpdated: new Date().toISOString()
        };

        try {
            if (editingId) {
                // Modo Edición
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), productData);
                showToast("Producto actualizado correctamente.", "success");
            } else {
                // Modo Creación
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), {
                    ...productData,
                    createdAt: new Date().toISOString()
                });
                showToast("Producto creado exitosamente.", "success");
            }
            // Limpiar formulario y cerrar modal
            setNewProduct({ name: '', basePrice: '', costPrice: '', stock: '', category: '', image: '', description: '', discount: 0 }); 
            setEditingId(null); 
            setShowProductForm(false);
        } catch(e) { 
            console.error(e);
            showToast("Error al guardar el producto.", "error"); 
        }
    };

    // Eliminar Producto (Restaurado)
    const deleteProductFn = async (product) => {
        // Confirmación de seguridad
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
        
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id));
            showToast("Producto eliminado del inventario.", "success");
        } catch (e) { 
            console.error(e);
            showToast("Error al eliminar el producto.", "error"); 
        }
    };

    // Venta Local / Manual (NUEVA FUNCIÓN SOLICITADA)
    // Permite descontar stock rápidamente sin pasar por el carrito (venta de mostrador)
    const sellProductLocally = async (product) => {
        const qtyStr = window.prompt(`VENTA RÁPIDA (LOCAL)\nProducto: ${product.name}\nStock Actual: ${product.stock}\n\nIngrese la cantidad vendida para descontar:`, "1");
        
        if (qtyStr === null) return; // Cancelado por usuario
        
        const qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0) return showToast("Por favor ingrese una cantidad válida.", "warning");
        if (qty > product.stock) return showToast("No tienes suficiente stock para realizar esta venta.", "error");

        try {
            const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id);
            await updateDoc(productRef, { 
                stock: increment(-qty),
                lastSale: new Date().toISOString()
            });
            showToast(`Venta registrada. Se descontaron ${qty} unidades.`, "success");
        } catch (e) { 
            console.error(e);
            showToast("Error al registrar la venta manual.", "error"); 
        }
    };

    // B) GESTIÓN DE PEDIDOS (RESTAURADO COMPLETO)

    // Finalizar Pedido (Marcar como entregado)
    const finalizeOrder = async (orderId) => {
        if (!window.confirm("¿Confirmar que este pedido ha sido completado y entregado?")) return;
        
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { 
                status: 'Realizado', 
                lastUpdate: new Date().toISOString(),
                completedAt: new Date().toISOString()
            });
            showToast("Estado del pedido actualizado a FINALIZADO.", "success");
        } catch(e) { 
            console.error(e);
            showToast("Error al actualizar el pedido.", "error"); 
        }
    };

    // Eliminar Pedido (Borrar del historial)
    const deleteOrder = async (orderId) => {
        if (!window.confirm("ADVERTENCIA: ¿Eliminar este pedido permanentemente? Esta acción borrará el registro para siempre.")) return;
        
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
            showToast("Pedido eliminado del historial.", "success");
            if(selectedOrder && selectedOrder.id === orderId) setSelectedOrder(null);
        } catch(e) { 
            console.error(e);
            showToast("Error al eliminar el pedido.", "error"); 
        }
    };

    // C) GESTIÓN DE CUPONES
    const saveCouponFn = async () => {
        if (!newCoupon.code || newCoupon.code.length < 3) return showToast("El código debe tener al menos 3 letras.", "warning");
        if (!newCoupon.value || newCoupon.value <= 0) return showToast("El valor del descuento debe ser mayor a 0.", "warning");

        try {
            const couponData = { 
                ...newCoupon, 
                code: newCoupon.code.toUpperCase().trim(), 
                value: Number(newCoupon.value), 
                minPurchase: Number(newCoupon.minPurchase || 0), 
                maxDiscount: Number(newCoupon.maxDiscount || 0), 
                usageLimit: Number(newCoupon.usageLimit || 0), 
                createdAt: new Date().toISOString(),
                usedBy: [] 
            };
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), couponData);
            
            // Resetear formulario
            setNewCoupon({ 
                code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, 
                expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '', perUserLimit: 1 
            }); 
            showToast("Cupón de descuento creado.", "success");
        } catch(e) { 
            console.error(e);
            showToast("Error al crear el cupón.", "error"); 
        }
    };

    // D) GESTIÓN DE PROVEEDORES
    const saveSupplierFn = async () => { 
        if (!newSupplier.name) return showToast("El nombre de la empresa es obligatorio.", "warning");
        
        try {
            const supplierData = { ...newSupplier, createdAt: new Date().toISOString() };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), supplierData); 
            
            setNewSupplier({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] }); 
            setShowSupplierModal(false); 
            showToast("Proveedor registrado correctamente.", "success"); 
        } catch(e) {
            console.error(e);
            showToast("Error al guardar proveedor.", "error");
        }
    };

    // E) CONFIGURACIÓN GLOBAL
    const saveSettingsFn = async () => { 
        if (!tempSettings) return;
        
        try {
            const settingsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
            const settingsSnap = await getDocs(settingsQuery);
            const dataToSave = { ...tempSettings, aboutUsText: aboutText }; 
            
            if (!settingsSnap.empty) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', settingsSnap.docs[0].id), dataToSave); 
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), dataToSave); 
            }
            
            setSettings(dataToSave);
            showToast("Configuración de la tienda guardada.", 'success'); 
        } catch(e) {
            console.error(e);
            showToast("Error guardando configuración.", "error");
        }
    };

    // Gestión de Equipo
    const addTeamMemberFn = () => { 
        if (!newTeamMember.email.includes('@')) return showToast("Ingresa un email válido.", "warning");
        
        const currentTeam = settings.team || [];
        if (currentTeam.some(m => m.email === newTeamMember.email)) return showToast("Este email ya es parte del equipo.", "warning");

        setTempSettings(prev => ({ 
            ...prev, 
            team: [...(prev.team || []), newTeamMember] 
        })); 
        setNewTeamMember({ email: '', role: 'employee', name: '' });
        showToast("Miembro agregado (Recuerda guardar la configuración).", "info");
    };

    const removeTeamMemberFn = (email) => {
        if (email === SUPER_ADMIN_EMAIL) return showToast("No se puede eliminar al Super Admin.", "error");
        
        setTempSettings(prev => ({ 
            ...prev, 
            team: (prev.team || []).filter(m => m.email !== email) 
        }));
        showToast("Miembro eliminado (Recuerda guardar).", "info");
    };

    // Subida de Imágenes (Local File Reader)
    const handleImage = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setter(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    // --------------------------------------------------------------------------------
    // 6. DASHBOARD & MÉTRICAS (Lógica de análisis de datos)
    // --------------------------------------------------------------------------------
    const dashboardMetrics = useMemo(() => {
        const productStats = {}; // { id: { cart: 0, fav: 0, total: 0 } }
        
        // Análisis de Carritos en Vivo
        (liveCarts || []).forEach(cart => {
            if (Array.isArray(cart.items)) {
                cart.items.forEach(item => {
                    if (!productStats[item.productId]) productStats[item.productId] = { cart: 0, fav: 0, total: 0 };
                    productStats[item.productId].cart += 1;
                    productStats[item.productId].total += 1;
                });
            }
        });

        // Análisis de Favoritos
        (users || []).forEach(u => {
            if (Array.isArray(u.favorites)) {
                u.favorites.forEach(pid => {
                    if (!productStats[pid]) productStats[pid] = { cart: 0, fav: 0, total: 0 };
                    productStats[pid].fav += 1;
                    productStats[pid].total += 1;
                });
            }
        });

        // Productos en Tendencia
        const trendingProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                const prod = products.find(p => p.id === id);
                return prod ? { ...prod, stats } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.stats.total - a.stats.total)
            .slice(0, 5);

        // Finanzas
        const validOrders = orders.filter(o => o.status !== 'Cancelado');
        const revenue = validOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        
        // Cálculo de Ganancia Real (Venta - Costo)
        // [IMPORTANTE] Usa el costo histórico guardado en el pedido si existe, sino usa 0
        const profit = validOrders.reduce((acc, o) => {
            const orderProfit = (o.items || []).reduce((itemAcc, item) => {
                const cost = Number(item.cost_price) || 0;
                const sale = Number(item.unit_price) || 0;
                return itemAcc + ((sale - cost) * item.quantity);
            }, 0);
            return acc + orderProfit;
        }, 0);

        // Producto Estrella
        const salesCount = {};
        validOrders.forEach(o => {
            (o.items || []).forEach(i => {
                salesCount[i.productId] = (salesCount[i.productId] || 0) + i.quantity;
            });
        });
        
        let starProductId = null;
        let maxSales = 0;
        Object.entries(salesCount).forEach(([id, count]) => {
            if (count > maxSales) {
                maxSales = count;
                starProductId = id;
            }
        });
        const starProduct = starProductId ? products.find(p => p.id === starProductId) : null;

        return { 
            revenue, 
            profit, 
            trendingProducts, 
            starProduct, 
            salesCount, 
            totalOrders: orders.length, 
            totalUsers: users.length 
        };
    }, [orders, products, liveCarts, users]);

    // --------------------------------------------------------------------------------
    // 7. COMPONENTES DE MODAL INTERNOS (Helpers de UI)
    // --------------------------------------------------------------------------------

    // Modal Detalle Pedido (Dentro del scope para acceder a funciones)
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        const canEdit = hasAccess(currentUser?.email);

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-800 relative bg-[#050505]">
                    {/* Header Modal */}
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                PEDIDO <span className="text-cyan-400 font-mono">#{order.orderId}</span>
                            </h3>
                            <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                                <Calendar className="w-3 h-3"/> {new Date(order.date).toLocaleString()}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition shadow-lg border border-slate-700">
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                    
                    {/* Contenido Scrollable */}
                    <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                        {/* Estado y Acciones */}
                        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-full shadow-lg ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                                    {order.status === 'Realizado' ? <CheckCircle className="w-8 h-8"/> : <Clock className="w-8 h-8"/>}
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Estado Actual</p>
                                    <p className={`text-2xl font-black ${order.status === 'Realizado' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {order.status}
                                    </p>
                                </div>
                            </div>
                            
                            {/* BOTONES DE ACCIÓN (SOLO ADMIN) - RESTAURADOS */}
                            {canEdit && (
                                <div className="flex flex-wrap gap-3 justify-end">
                                    {order.status !== 'Realizado' && (
                                        <button 
                                            onClick={() => finalizeOrder(order.id)} 
                                            className="px-6 py-3 bg-green-900/30 text-green-400 border border-green-500/30 rounded-xl text-sm font-bold hover:bg-green-500 hover:text-white transition flex items-center gap-2 shadow-lg"
                                        >
                                            <CheckSquare className="w-4 h-4"/> Finalizar Pedido
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => deleteOrder(order.id)} 
                                        className="px-6 py-3 bg-red-900/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-2 shadow-lg"
                                    >
                                        <Trash2 className="w-4 h-4"/> Eliminar Pedido
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Datos Cliente y Envío */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                                <h4 className="text-slate-500 text-xs font-black uppercase mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                    <User className="w-4 h-4"/> Datos del Cliente
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-white font-bold text-lg">{order.customer.name}</p>
                                    <p className="text-slate-400 text-sm flex items-center gap-2"><Mail className="w-3 h-3"/> {order.customer.email}</p>
                                    <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-3 h-3"/> {order.customer.phone || 'Sin teléfono'}</p>
                                    <p className="text-slate-400 text-sm flex items-center gap-2"><CreditCard className="w-3 h-3"/> DNI: {order.customer.dni || 'Sin DNI'}</p>
                                </div>
                            </div>
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                                <h4 className="text-slate-500 text-xs font-black uppercase mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                    <Truck className="w-4 h-4"/> Información de Envío
                                </h4>
                                <div className="space-y-3">
                                    <p className="text-white text-sm font-medium leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                                        {order.shippingAddress}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Pago:</span>
                                        <span className="text-cyan-400 text-xs font-black uppercase bg-cyan-900/20 px-2 py-1 rounded border border-cyan-500/20">
                                            {order.paymentMethod}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Productos */}
                        <div>
                            <h4 className="text-slate-500 text-xs font-black uppercase mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4"/> Productos Comprados ({order.items.length})
                            </h4>
                            <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 hover:border-cyan-900/30 transition group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-white rounded-lg p-2 shadow-md flex-shrink-0 group-hover:scale-105 transition">
                                                <img src={item.image} className="w-full h-full object-contain"/>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm line-clamp-1">{item.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">x{item.quantity}</span>
                                                    <span className="text-xs text-slate-500 font-mono">${item.unit_price.toLocaleString()} c/u</span>
                                                </div>
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
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-right space-y-3 shadow-inner">
                             <div className="flex justify-between text-slate-400 text-sm font-medium">
                                <span>Subtotal</span>
                                <span>${order.subtotal?.toLocaleString()}</span>
                             </div>
                             {order.discount > 0 && (
                                 <div className="flex justify-between text-green-400 text-sm font-bold bg-green-900/10 p-2 rounded-lg border border-green-900/30 border-dashed">
                                    <span className="flex items-center gap-2"><Ticket className="w-3 h-3"/> Descuento ({order.discountCode || 'Cupón'})</span>
                                    <span>-${order.discount.toLocaleString()}</span>
                                 </div>
                             )}
                             <div className="flex justify-between items-center text-white font-black text-2xl border-t border-slate-800 pt-4 mt-4">
                                <span>Total Final</span>
                                <span className="text-cyan-400 neon-text">${order.total.toLocaleString()}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Modal Selector de Cupones (Checkout)
    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        
        // Filtro de cupones válidos
        const available = coupons.filter(c => 
            (!c.expirationDate || new Date(c.expirationDate) > new Date()) &&
            (!c.targetUser || c.targetUser === currentUser?.email) &&
            (!c.usageLimit || (c.usedBy?.length || 0) < c.usageLimit) &&
            (!currentUser || !(c.usedBy || []).includes(currentUser.id))
        );

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-lg overflow-hidden relative border border-purple-500/20 bg-[#050505] shadow-2xl">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition z-10 hover:bg-slate-800">
                        <X className="w-5 h-5"/>
                    </button>
                    
                    <div className="p-8 bg-gradient-to-br from-slate-900 to-black border-b border-slate-800">
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="bg-purple-900/20 p-2 rounded-lg border border-purple-500/30">
                                <Gift className="w-6 h-6 text-purple-400"/>
                            </div>
                            Mis Cupones
                        </h3>
                        <p className="text-slate-500 mt-2 text-sm">Selecciona un cupón para aplicar a tu compra actual.</p>
                    </div>
                    
                    <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {available.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-700"/>
                                <p className="text-slate-500 font-bold">No tienes cupones disponibles.</p>
                            </div>
                        ) : available.map(c => {
                            const canApply = cartSubtotal >= (c.minPurchase || 0);
                            return (
                                <div key={c.id} onClick={() => canApply && selectCoupon(c)} className={`relative p-5 rounded-2xl border transition-all duration-300 flex justify-between items-center group overflow-hidden ${canApply ? 'bg-slate-900 border-slate-700 hover:border-purple-500 cursor-pointer hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'opacity-50 grayscale cursor-not-allowed border-slate-800 bg-black'}`}>
                                    <div className="relative z-10">
                                        <p className="font-black text-white text-xl tracking-widest font-mono mb-1">{c.code}</p>
                                        <p className="text-purple-400 font-bold text-sm flex items-center gap-2">
                                            {c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}
                                            {c.minPurchase > 0 && <span className="text-slate-500 font-normal text-xs bg-slate-950 px-2 py-0.5 rounded">Min: ${c.minPurchase}</span>}
                                        </p>
                                    </div>
                                    {canApply && (
                                        <div className="bg-purple-600 rounded-full p-3 text-white shadow-lg transform group-hover:scale-110 transition relative z-10">
                                            <Plus className="w-5 h-5"/>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Estado de Carga
    if (isLoading && view === 'store') return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
            <Loader2 className="w-16 h-16 animate-spin text-cyan-500 mb-6"/>
            <p className="text-slate-500 font-mono text-sm uppercase tracking-widest animate-pulse">Cargando Sistema...</p>
        </div>
    );
// --------------------------------------------------------------------------------
    // 8. RENDERIZADO VISUAL (JSX COMPLETO)
    // --------------------------------------------------------------------------------
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* Efectos de Fondo Globales (Atmósfera) */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
            </div>

            {/* Contenedores de Feedback (Toasts y Modales Globales) */}
            <div className="fixed top-24 right-4 z-[9999] space-y-3 pointer-events-none">
                <div className="pointer-events-auto space-y-3">
                    {toasts.map(t => (
                        <Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>
                    ))}
                </div>
            </div>
            
            <ConfirmModal 
                isOpen={modalConfig.isOpen} 
                title={modalConfig.title} 
                message={modalConfig.message} 
                onConfirm={modalConfig.onConfirm} 
                onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} 
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                isDangerous={modalConfig.isDangerous} 
            />
            
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- NAVBAR PRINCIPAL --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    {/* Izquierda: Menú y Logo */}
                    <div className="flex items-center gap-6">
                        <button onClick={()=>setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50 group">
                            <Menu className="w-6 h-6 group-hover:scale-110 transition"/>
                        </button>
                        <div className="cursor-pointer group flex flex-col justify-center" onClick={()=>setView('store')}>
                            <span className="text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300">
                                {settings?.storeName || 'SUSTORE'}
                            </span>
                            <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500 mt-1"></div>
                        </div>
                    </div>
                    
                    {/* Centro: Búsqueda (Visible en Desktop) */}
                    <div className="hidden lg:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-3 w-1/3 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition shadow-inner group relative">
                        <Search className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-cyan-400 transition"/>
                        <input 
                            className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium" 
                            placeholder="Buscar productos, marcas..." 
                            value={searchQuery} 
                            onChange={e=>setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={()=>setSearchQuery('')} className="absolute right-4 text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
                        )}
                    </div>

                    {/* Derecha: Acciones */}
                    <div className="flex items-center gap-4">
                        <button onClick={()=>window.open(settings?.whatsappLink, '_blank')} className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] group">
                            <MessageCircle className="w-5 h-5 group-hover:animate-bounce"/> Soporte
                        </button>
                        
                        <button onClick={()=>setView('cart')} className="relative p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group hover:border-cyan-500/30">
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition"/>
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505] animate-bounce-short">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                        
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group hover:bg-slate-800/80">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm group-hover:scale-105 transition border border-white/10">
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="text-left hidden md:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Hola,</p>
                                    <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</p>
                                </div>
                            </button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 transform hover:-translate-y-0.5 border border-transparent">
                                <User className="w-5 h-5"/> INGRESAR
                            </button>
                        )}
                    </div>
                </nav>
            )}
            
            {/* --- MENÚ LATERAL MÓVIL (OFF-CANVAS) --- */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-start">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" onClick={()=>setIsMenuOpen(false)}></div>
                    <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-in-right flex flex-col shadow-2xl z-[10001]">
                        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
                            <h2 className="text-3xl font-black text-white neon-text tracking-tight">MENÚ</h2>
                            <button onClick={()=>setIsMenuOpen(false)} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 border border-slate-800">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><Home className="w-6 h-6"/> Inicio</button>
                            <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><User className="w-6 h-6"/> Mi Perfil</button>
                            <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><ShoppingBag className="w-6 h-6"/> Mi Carrito <span className="ml-auto bg-slate-800 text-xs px-2 py-1 rounded-full">{cart.length}</span></button>
                            <div className="h-px bg-slate-800 my-4 mx-4"></div>
                            <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                            {hasAccess(currentUser?.email) && (
                                <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-4 bg-cyan-900/10 rounded-xl hover:bg-cyan-900/20 transition border border-cyan-500/20"><Shield className="w-6 h-6"/> Panel Admin</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Espaciador para no solapar con el Navbar Fixed */}
            {view !== 'admin' && <div className="h-32"></div>}

            {/* --- CONTENEDOR PRINCIPAL DE VISTAS --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {/* 1. VISTA TIENDA (CATÁLOGO) */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        {settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition duration-1000"></div>
                                <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3"><Flame className="w-4 h-4 text-orange-500"/> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500"/></p>
                            </div>
                        )}

                        {/* Banner Hero */}
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            {settings?.heroUrl ? <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"/> : <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-purple-900 opacity-20"></div>}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <div className="max-w-2xl animate-fade-up">
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-6">TECNOLOGÍA <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">DEL FUTURO</span></h1>
                                    <p className="text-slate-400 text-lg mb-8 max-w-lg font-medium">Explora nuestra selección premium de dispositivos. Calidad garantizada.</p>
                                    <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2 group/btn">VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition"/></button>
                                </div>
                            </div>
                        </div>

                        {/* Filtros */}
                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <Filter className="w-5 h-5 text-slate-500 flex-shrink-0"/>
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===''?'bg-white text-black border-white':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>Todos</button>
                            {settings?.categories?.map(c => (
                                <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>
                            ))}
                        </div>

                        {/* Grid de Productos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                            {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition duration-500 relative flex flex-col h-full">
                                    <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                        <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110"/>
                                        {p.discount > 0 && <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-20">-{p.discount}%</span>}
                                        <button onClick={(e)=>{e.stopPropagation(); toggleFavorite(p)}} className={`absolute top-4 right-4 p-3 rounded-full z-20 transition shadow-lg backdrop-blur-sm border ${currentUser?.favorites?.includes(p.id) ? 'bg-red-500 text-white border-red-500' : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white hover:text-red-500'}`}><Heart className={`w-5 h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`}/></button>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col relative z-10 bg-[#0a0a0a]">
                                        <div className="flex justify-between items-start mb-3">
                                            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">{p.category}</p>
                                            {p.stock === 0 && <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700">AGOTADO</span>}
                                        </div>
                                        <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2 min-h-[3rem]">{p.name}</h3>
                                        <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-end justify-between">
                                            <div className="flex flex-col">
                                                {p.discount > 0 && <span className="text-xs text-slate-500 line-through font-medium mb-1">${p.basePrice}</span>}
                                                <span className="text-2xl font-black text-white tracking-tight flex items-center gap-1">${calculatePrices(p.basePrice, p.discount).finalPrice.toLocaleString()}</span>
                                            </div>
                                            <button onClick={(e)=>{e.stopPropagation(); manageCart(p, 1)}} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-cyan-400 hover:scale-110 transition shadow-lg"><Plus/></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* 2. VISTA CARRITO */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
                         <div className="flex items-center gap-4 mb-8 pt-8">
                            <button onClick={()=>setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white"><ArrowLeft/></button>
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3"><ShoppingBag className="w-10 h-10 text-cyan-400"/> Mi Carrito</h1>
                        </div>
                        {cart.length === 0 ? <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800"><p className="text-slate-500">Carrito vacío.</p></div> : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex items-center gap-6">
                                            <img src={item.product.image} className="w-20 h-20 object-contain bg-white rounded-xl p-2"/>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white">{item.product.name}</h3>
                                                <p className="text-cyan-400 font-bold">${calculatePrices(item.product.basePrice, item.product.discount).finalPrice.toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1">
                                                <button onClick={() => manageCart(item.product, -1)} className="p-2 text-slate-400 hover:text-white"><Minus className="w-4 h-4"/></button>
                                                <span className="text-white font-bold">{item.quantity}</span>
                                                <button onClick={() => manageCart(item.product, 1)} className="p-2 text-slate-400 hover:text-white"><Plus className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8">Resumen</h3>
                                    {appliedCoupon ? (
                                        <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center mb-6">
                                            <div><p className="font-black text-purple-300">{appliedCoupon.code}</p><p className="text-xs text-purple-400">{appliedCoupon.type==='fixed'?`$${appliedCoupon.value} OFF`:`${appliedCoupon.value}% OFF`}</p></div>
                                            <button onClick={()=>setAppliedCoupon(null)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <button onClick={()=>setShowCouponModal(true)} className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 text-slate-400 hover:text-purple-300 rounded-2xl mb-6 flex items-center justify-center gap-2">
                                            <Ticket className="w-4 h-4"/> Tengo un cupón
                                        </button>
                                    )}
                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${cartSubtotal.toLocaleString()}</span></div>
                                        {discountAmount > 0 && <div className="flex justify-between text-purple-400 font-bold"><span>Descuento</span><span>-${discountAmount.toLocaleString()}</span></div>}
                                        <div className="flex justify-between items-end text-white font-bold text-xl pt-4"><span>Total</span><span className="text-3xl font-black text-cyan-400">${finalTotal.toLocaleString()}</span></div>
                                    </div>
                                    <button onClick={() => setView('checkout')} className="w-full bg-cyan-600 hover:bg-cyan-500 py-5 text-white font-bold text-lg rounded-2xl shadow-lg transition flex items-center justify-center gap-2">Iniciar Compra <ArrowRight/></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. VISTA CHECKOUT */}
                {view === 'checkout' && (
                    <div className="max-w-xl mx-auto pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold"><ArrowLeft className="w-5 h-5"/> Volver</button>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3"><MapPin className="text-cyan-400"/> Datos de Envío</h2>
                            <input className="input-cyber w-full p-4" placeholder="Dirección y Altura" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="input-cyber p-4" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/>
                                <input className="input-cyber p-4" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/>
                            </div>
                            <input className="input-cyber w-full p-4" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                            
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 pt-6"><CreditCard className="text-cyan-400"/> Pago</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {['Transferencia', 'Efectivo'].map(m => (
                                    <button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-4 rounded-xl border font-bold ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/20 text-cyan-400':'border-slate-700 bg-slate-900/30 text-slate-500'}`}>{m}</button>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-white font-bold text-lg">Total a Pagar</span>
                                    <span className="text-3xl font-black text-cyan-400">${finalTotal.toLocaleString()}</span>
                                </div>
                                <button onClick={confirmOrder} disabled={isProcessingOrder} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3">
                                    {isProcessingOrder ? <Loader2 className="animate-spin"/> : <CheckCircle/>} Confirmar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. VISTAS AUTH & PROFILE */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 p-4 animate-fade-up backdrop-blur-xl">
                        <div className="bg-[#0a0a0a] p-8 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800 relative">
                            <button onClick={()=>setView('store')} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X/></button>
                            <h2 className="text-3xl font-black text-white mb-6 text-center">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-4">
                                {!loginMode && <><input className="input-cyber w-full p-4" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})}/><input className="input-cyber w-full p-4" placeholder="Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})}/><input className="input-cyber w-full p-4" placeholder="DNI" value={authData.dni} onChange={e=>setAuthData({...authData, dni:e.target.value})}/></>}
                                <input className="input-cyber w-full p-4" placeholder="Email" value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})}/>
                                <input className="input-cyber w-full p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})}/>
                                <button type="submit" className="w-full bg-cyan-600 py-4 text-white rounded-xl font-bold mt-4">{isLoading?<Loader2 className="animate-spin mx-auto"/>:(loginMode?'INGRESAR':'REGISTRARSE')}</button>
                            </form>
                            <button onClick={()=>setLoginMode(!loginMode)} className="w-full text-center text-slate-500 text-sm mt-6 hover:text-cyan-400 font-bold">{loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button>
                        </div>
                    </div>
                )}

                {view === 'profile' && currentUser && (
                    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[3rem] mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="w-24 h-24 rounded-full bg-cyan-600 flex items-center justify-center text-4xl font-black text-white">{currentUser.name.charAt(0)}</div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-3xl font-black text-white">{currentUser.name}</h2>
                                <p className="text-slate-400">{currentUser.email}</p>
                                <div className="mt-4 flex gap-4 justify-center md:justify-start">
                                    {hasAccess(currentUser.email) && <button onClick={()=>setView('admin')} className="px-4 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded-xl font-bold text-sm">Panel Admin</button>}
                                    <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="px-4 py-2 bg-red-900/10 text-red-500 rounded-xl font-bold text-sm">Salir</button>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-6">Historial de Pedidos</h3>
                        <div className="space-y-4">
                            {orders.filter(o => o.userId === currentUser.id).map(o => (
                                <div key={o.id} onClick={()=>setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition">
                                    <div>
                                        <p className="font-bold text-white">Pedido #{o.orderId}</p>
                                        <p className="text-xs text-slate-500">{new Date(o.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-white">${o.total.toLocaleString()}</p>
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${o.status==='Realizado'?'bg-green-900/20 text-green-400':'bg-yellow-900/20 text-yellow-400'}`}>{o.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. PANEL DE ADMINISTRACIÓN (RESTAURADO COMPLETO) */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden w-full font-sans fixed inset-0 z-[100]">
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static`}>
                            <div className="p-8 border-b border-slate-900"><h2 className="text-2xl font-black text-white flex items-center gap-2"><Shield className="text-cyan-400"/> ADMIN</h2></div>
                            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='dashboard'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><LayoutDashboard className="w-5 h-5"/> Dashboard</button>
                                <button onClick={()=>setAdminTab('orders')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='orders'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><ShoppingBag className="w-5 h-5"/> Pedidos</button>
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='products'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Package className="w-5 h-5"/> Productos</button>
                                {isAdmin(currentUser?.email) && <>
                                    <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='coupons'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Ticket className="w-5 h-5"/> Cupones</button>
                                    <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='suppliers'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Truck className="w-5 h-5"/> Proveedores</button>
                                    <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='settings'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Settings className="w-5 h-5"/> Configuración</button>
                                </>}
                            </nav>
                            <div className="p-4"><button onClick={()=>setView('store')} className="w-full py-3 bg-slate-900 rounded-xl text-slate-400 font-bold text-sm hover:text-white">Volver a Tienda</button></div>
                        </div>

                        <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10 custom-scrollbar">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white"><Menu/></button>
                            
                            {adminTab === 'dashboard' && (
                                <div className="space-y-8 animate-fade-up">
                                    <h1 className="text-3xl font-black text-white">Dashboard</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Ingresos Brutos</p>
                                            <p className="text-3xl font-black text-white">${dashboardMetrics.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Ganancia Neta (Aprox)</p>
                                            <p className="text-3xl font-black text-green-400">${dashboardMetrics.profit.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Pedidos Totales</p>
                                            <p className="text-3xl font-black text-white">{dashboardMetrics.totalOrders}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Carritos Activos</p>
                                            <p className="text-3xl font-black text-cyan-400 animate-pulse">{liveCarts.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* [TAB: PEDIDOS RESTAURADA] - CON BOTONES FINALIZAR Y ELIMINAR */}
                            {adminTab === 'orders' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Gestión de Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
                                                <div className="flex items-center gap-4 cursor-pointer" onClick={()=>setSelectedOrder(o)}>
                                                    <div className={`p-4 rounded-xl ${o.status==='Realizado'?'bg-green-900/20 text-green-400':'bg-yellow-900/20 text-yellow-400'}`}>
                                                        {o.status==='Realizado' ? <CheckCircle/> : <Clock/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">#{o.orderId} - {o.customer.name}</p>
                                                        <p className="text-slate-500 text-sm">{new Date(o.date).toLocaleDateString()} - ${o.total.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={()=>setSelectedOrder(o)} className="px-4 py-2 bg-slate-900 text-slate-300 rounded-lg text-sm font-bold hover:text-white">Ver Detalle</button>
                                                    {o.status !== 'Realizado' && (
                                                        <button onClick={()=>finalizeOrder(o.id)} className="px-4 py-2 bg-green-900/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500 hover:text-white transition flex gap-2 items-center">
                                                            <CheckSquare className="w-4 h-4"/> Finalizar
                                                        </button>
                                                    )}
                                                    <button onClick={()=>deleteOrder(o.id)} className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition flex gap-2 items-center">
                                                        <Trash2 className="w-4 h-4"/> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* [TAB: PRODUCTOS RESTAURADA] - CON COSTO Y VENTA LOCAL */}
                            {adminTab === 'products' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Inventario</h1>
                                        <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg"><Plus/> Nuevo</button>
                                    </div>

                                    {showProductForm && (
                                        <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2rem] relative">
                                            <h3 className="text-xl font-bold text-white mb-6">{editingId ? 'Editar' : 'Crear'} Producto</h3>
                                            <div className="grid md:grid-cols-2 gap-6 mb-4">
                                                <div className="space-y-4">
                                                    <input className="input-cyber w-full p-4" placeholder="Nombre" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 pl-2 mb-1 block">Precio Venta</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="$ Venta" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 pl-2 mb-1 block">Costo (Compra)</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="$ Costo" value={newProduct.costPrice||''} onChange={e=>setNewProduct({...newProduct,costPrice:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <input className="input-cyber w-full p-4" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                                        <input className="input-cyber w-full p-4" type="number" placeholder="Descuento %" value={newProduct.discount||0} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <select className="input-cyber w-full p-4" value={newProduct.category||''} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>
                                                        <option value="">Categoría...</option>
                                                        {settings?.categories?.map(c=><option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 cursor-pointer h-32 justify-center" onClick={()=>fileInputRef.current.click()}>
                                                        {newProduct.image ? <img src={newProduct.image} className="h-full object-contain"/> : <span className="text-slate-500 font-bold text-xs uppercase">Subir Imagen</span>}
                                                        <input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="hidden"/>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button onClick={()=>setShowProductForm(false)} className="px-6 py-3 text-slate-400 font-bold hover:text-white">Cancelar</button>
                                                <button onClick={saveProductFn} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold hover:bg-cyan-500 shadow-lg">Guardar</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-3">
                                        {products.map(p => (
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center group hover:border-cyan-900/50 transition">
                                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                                    <div className="w-16 h-16 bg-white rounded-lg p-2 flex-shrink-0"><img src={p.image} className="w-full h-full object-contain"/></div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{p.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">Stock: <span className={p.stock < 5 ? 'text-red-400 font-bold' : 'text-slate-400'}>{p.stock}</span> | Venta: ${p.basePrice} | Costo: ${p.costPrice || 0}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                                                    <button onClick={()=>sellProductLocally(p)} className="p-3 bg-green-900/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500 hover:text-white transition" title="Venta Local Rápida (Descontar Stock)">
                                                        <Wallet className="w-5 h-5"/>
                                                    </button>
                                                    <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-3 bg-slate-900 rounded-xl text-cyan-400 hover:bg-cyan-900/20 transition border border-slate-800"><Edit className="w-5 h-5"/></button>
                                                    <button onClick={()=>deleteProductFn(p)} className="p-3 bg-slate-900 rounded-xl text-red-400 hover:bg-red-900/20 transition border border-slate-800"><Trash2 className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: CUPONES */}
                            {adminTab === 'coupons' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Cupones</h1>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] mb-8">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <input className="input-cyber p-4" placeholder="CÓDIGO" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})}/>
                                            <div className="flex gap-4">
                                                <input className="input-cyber w-full p-4" type="number" placeholder="Valor" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon,value:e.target.value})}/>
                                                <select className="input-cyber w-full p-4" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon,type:e.target.value})}><option value="percentage">%</option><option value="fixed">$</option></select>
                                            </div>
                                            <input className="input-cyber p-4" type="number" placeholder="Mínimo Compra" value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon,minPurchase:e.target.value})}/>
                                            <input className="input-cyber p-4" type="date" value={newCoupon.expirationDate} onChange={e=>setNewCoupon({...newCoupon,expirationDate:e.target.value})}/>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-purple-600 py-4 rounded-xl text-white font-bold hover:bg-purple-500">Crear Cupón</button>
                                    </div>
                                    <div className="grid gap-4">
                                        {coupons.map(c => (
                                            <div key={c.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                                <div><p className="font-black text-white">{c.code}</p><p className="text-purple-400 text-sm font-bold">{c.value}{c.type==='percentage'?'%':'$'} OFF</p></div>
                                                <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',c.id))} className="text-red-400 hover:text-white p-2"><Trash2/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* TAB: PROVEEDORES */}
                            {adminTab === 'suppliers' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <div className="flex justify-between">
                                        <h1 className="text-3xl font-black text-white">Proveedores</h1>
                                        <button onClick={()=>setShowSupplierModal(true)} className="bg-cyan-600 px-6 py-2 rounded-xl text-white font-bold">Nuevo</button>
                                    </div>
                                    {showSupplierModal && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                                            <div className="bg-[#0a0a0a] border border-slate-700 p-8 rounded-[2rem] w-full max-w-md">
                                                <h3 className="text-white font-bold text-xl mb-4">Nuevo Proveedor</h3>
                                                <div className="space-y-4 mb-6">
                                                    <input className="input-cyber w-full p-4" placeholder="Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier,name:e.target.value})}/>
                                                    <input className="input-cyber w-full p-4" placeholder="Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier,contact:e.target.value})}/>
                                                    <input className="input-cyber w-full p-4" placeholder="Teléfono" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier,phone:e.target.value})}/>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                                                    <button onClick={saveSupplierFn} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {suppliers.map(s => (
                                            <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                                <h3 className="font-bold text-white text-xl mb-2">{s.name}</h3>
                                                <p className="text-slate-400 text-sm flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p>
                                                <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4"/> {s.phone}</p>
                                                <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','suppliers',s.id))} className="mt-4 text-red-400 text-xs font-bold hover:text-white">ELIMINAR</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* TAB: CONFIGURACIÓN */}
                             {adminTab === 'settings' && (
                                <div className="space-y-8 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Configuración</h1>
                                        <button onClick={saveSettingsFn} className="bg-cyan-600 px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2"><Save className="w-4 h-4"/> Guardar</button>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                        <h3 className="font-bold text-white mb-4">Equipo</h3>
                                        <div className="flex gap-4 mb-4">
                                            <input className="input-cyber flex-1 p-3" placeholder="Email" value={newTeamMember.email} onChange={e=>setNewTeamMember({...newTeamMember,email:e.target.value})}/>
                                            <select className="input-cyber p-3" value={newTeamMember.role} onChange={e=>setNewTeamMember({...newTeamMember,role:e.target.value})}><option value="employee">Empleado</option><option value="admin">Admin</option></select>
                                            <button onClick={addTeamMemberFn} className="bg-slate-800 p-3 rounded-xl text-white"><Plus/></button>
                                        </div>
                                        <div className="space-y-2">
                                            {(tempSettings.team||[]).map((m,i)=>(
                                                <div key={i} className="flex justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                                    <span className="text-white text-sm">{m.email} ({m.role})</span>
                                                    {m.email!==SUPER_ADMIN_EMAIL && <button onClick={()=>removeTeamMemberFn(m.email)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                        <h3 className="font-bold text-white mb-4">Sobre Nosotros</h3>
                                        <textarea className="input-cyber w-full h-40 p-4 resize-none" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
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
