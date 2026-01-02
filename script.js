import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import {
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus,
    Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home,
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet,
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown,
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy,
    ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent,
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import {
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc,
    where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove
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
const appId = "sustore-prod-v3";
const SUPER_ADMIN_EMAIL = "lautarocorazza63@gmail.com";

// Configuración por defecto extendida para evitar fallos
const defaultSettings = {
    storeName: "SUSTORE",
    primaryColor: "#06b6d4",
    currency: "$",
    admins: SUPER_ADMIN_EMAIL,
    team: [{ email: SUPER_ADMIN_EMAIL, role: "admin", name: "Lautaro Corazza" }],
    sellerEmail: "sustoresf@gmail.com",
    instagramUser: "sustore_sf",
    whatsappLink: "https://wa.me/message/3MU36VTEKINKP1",
    logoUrl: "",
    heroUrl: "",
    markupPercentage: 0,
    announcementMessage: "🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥",
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"],
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado."
};

// --- COMPONENTES DE UI ---

// Componente de Notificación (Toast)
const Toast = ({ message, type, onClose }) => {
    // Definición explícita de colores para mayor control
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
        containerClass += " border-cyan-500 text-cyan-400 bg-black/90 shadow-[0_0_20px_rgba(6,182,212,0.3)]";
        iconContainerClass += " bg-cyan-500/20";
        IconComponent = Info;
    }

    useEffect(() => {
        const t = setTimeout(onClose, 4000); // 4 segundos de duración
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
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500' : 'bg-cyan-900/20 text-cyan-500'}`}>
                    {isDangerous ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black text-center mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">{cancelText}</button>
                    <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold transition shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// Error Boundary para capturar crashes
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

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
                    <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold">
                        REINICIAR SISTEMA
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- APLICACIÓN PRINCIPAL ---
function App() {
    // --- GESTIÓN DE ESTADO (EXPANDIDA) ---

    // Navegación y UI
    const [view, setView] = useState('store'); // store, cart, checkout, profile, login, register, admin, about, guide
    const [adminTab, setAdminTab] = useState('dashboard');
    const [expenses, setExpenses] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null }); // dashboard, products, coupons, users, suppliers, settings, finance
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

    // Usuarios y Autenticación
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('nexus_user_data');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });
    const [systemUser, setSystemUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });

    // Datos Principales
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('nexus_cart'));
            return Array.isArray(saved) ? saved : [];
        } catch (e) { return []; }
    });
    const [liveCarts, setLiveCarts] = useState([]); // Monitor de carritos en tiempo real
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [settings, setSettings] = useState(defaultSettings);

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
    const [newPurchase, setNewPurchase] = useState({ productId: '', supplierId: '', quantity: 1, cost: 0, isNewProduct: false });

    // Estado para Proveedores (Restaurado)
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    // Estado para Carrito de Compras (Pedidos Mayoristas)
    const [purchaseCart, setPurchaseCart] = useState([]);

    // Estado para Modal de Crear Categoría
    const [showCategoryModal, setShowCategoryModal] = useState(false);

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

    // Formulario de Checkout
    const [checkoutData, setCheckoutData] = useState({
        address: '',
        city: '',
        province: '',
        zipCode: '',
        paymentChoice: ''
    });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);

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
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });

    // Estado para Detalle de Pedido (Modal)
    const [selectedOrder, setSelectedOrder] = useState(null);

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

        // Buscar en el equipo
        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
        return member ? member.role : 'user';
    };

    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => {
        const role = getRole(email);
        return role === 'admin' || role === 'employee';
    };

    // --- EFECTOS DE SINCRONIZACIÓN (FIREBASE) ---

    // 1. Sincronizar Carrito Local y Remoto (Live Cart)
    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));

        // Si hay usuario, subir carrito a DB para monitor de admin
        if (currentUser && currentUser.id) {
            const syncCartToDB = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name, // Guardamos nombre para facilitar visualización rápida
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
            // Debounce para no saturar escrituras
            const debounceTimer = setTimeout(syncCartToDB, 1500);
            return () => clearTimeout(debounceTimer);
        }
    }, [cart, currentUser]);

    // 2. Persistencia de Sesión Local
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            // Pre-llenar checkout si hay datos
            setCheckoutData(prev => ({
                ...prev,
                address: currentUser.address || prev.address,
                city: currentUser.city || prev.city,
                province: currentUser.province || prev.province,
                zipCode: currentUser.zipCode || prev.zipCode
            }));
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
            // Pequeño delay artificial para transiciones suaves
            setTimeout(() => setIsLoading(false), 1000);
        });
    }, []);

    // 4. Suscripciones a Colecciones (Snapshot Listeners)
    useEffect(() => {
        if (!systemUser) return;

        const unsubscribeFunctions = [
            // Productos
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), (snapshot) => {
                const productsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setProducts(productsData);
                if (cart.length === 0) setIsLoading(false);
            }, (error) => {
                console.error("Error fetching products:", error);
                showToast("Error al cargar productos: " + error.message, "error");
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

            // Carritos en Vivo (Solo filtramos los que tienen items)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), snapshot => {
                const activeCarts = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(c => c.items && c.items.length > 0);
                setLiveCarts(activeCarts);
            }),

            // Configuración Global
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), snapshot => {
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    // Fusión defensiva con valores por defecto
                    const mergedSettings = {
                        ...defaultSettings,
                        ...data,
                        team: data.team || defaultSettings.team,
                        categories: data.categories || defaultSettings.categories
                    };
                    setSettings(mergedSettings);
                    setTempSettings(mergedSettings);
                    setAboutText(data.aboutUsText || defaultSettings.aboutUsText);
                } else {
                    // Si no existe, crear configuración inicial
                    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings);
                }
            })
        ];

        // Limpiar suscripciones al desmontar
        return () => unsubscribeFunctions.forEach(unsub => unsub());
    }, [systemUser]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa con la lógica expandida. Escribe "continuar" para la siguiente parte.
    // --- LÓGICA DE NEGOCIO Y FUNCIONES PRINCIPALES ---

    // 1. Lógica de Autenticación (Registro y Login Detallado)
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

            if (isRegister) {
                // Validaciones explícitas para Registro
                if (!authData.name || authData.name.length < 3) throw new Error("El nombre es muy corto.");
                if (!authData.username) throw new Error("Debes elegir un nombre de usuario.");
                if (!authData.email || !authData.email.includes('@')) throw new Error("Email inválido.");
                if (!authData.password || authData.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                if (!authData.dni) throw new Error("El DNI es obligatorio para la facturación.");
                if (!authData.phone) throw new Error("El teléfono es obligatorio para el contacto.");

                // Verificar duplicados (Email)
                const qEmail = query(usersRef, where("email", "==", authData.email));
                const emailSnap = await getDocs(qEmail);
                if (!emailSnap.empty) throw new Error("Este correo electrónico ya está registrado.");

                // Verificar duplicados (Usuario)
                const qUser = query(usersRef, where("username", "==", authData.username));
                const userSnap = await getDocs(qUser);
                if (!userSnap.empty) throw new Error("El nombre de usuario ya está en uso. Elige otro.");

                // Creación del usuario
                const newUser = {
                    ...authData,
                    role: 'user',
                    joinDate: new Date().toISOString(),
                    favorites: [], // Inicializar favoritos vacío
                    ordersCount: 0
                };

                const docRef = await addDoc(usersRef, newUser);
                setCurrentUser({ ...newUser, id: docRef.id });
                showToast("¡Cuenta creada exitosamente! Bienvenido.", "success");

            } else {
                // Validaciones para Login
                if (!authData.email) throw new Error("Ingresa tu email o usuario.");
                if (!authData.password) throw new Error("Ingresa tu contraseña.");

                // Intentar login por Email
                let q = query(usersRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let snapshot = await getDocs(q);

                // Si falla, intentar login por Username
                if (snapshot.empty) {
                    q = query(usersRef, where("username", "==", authData.email), where("password", "==", authData.password));
                    snapshot = await getDocs(q);
                }

                if (snapshot.empty) {
                    throw new Error("Credenciales incorrectas. Verifica tus datos.");
                }

                const userData = snapshot.docs[0].data();
                const userId = snapshot.docs[0].id;

                setCurrentUser({ ...userData, id: userId });
                showToast(`¡Hola de nuevo, ${userData.name}!`, "success");
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

            // Validaciones de Stock
            if (newQuantity > Number(product.stock)) {
                showToast(`Lo sentimos, solo quedan ${product.stock} unidades disponibles.`, "warning");
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
            const price = calculateItemPrice(item.product.basePrice, item.product.discount);
            return total + (price * item.quantity);
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
    const finalTotal = Math.max(0, cartSubtotal - discountAmount);

    // Selección de Cupón
    const selectCoupon = (coupon) => {
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

        setAppliedCoupon(coupon);
        setShowCouponModal(false);

        let msg = "¡Cupón aplicado correctamente!";
        if (coupon.type === 'percentage' && coupon.maxDiscount > 0) {
            msg += ` (Tope de reintegro: $${coupon.maxDiscount})`;
        }
        showToast(msg, "success");
    };

    // 5. Confirmación de Pedido (Checkout)
    const confirmOrder = async () => {
        if (isProcessingOrder) return;

        // Validaciones de Checkout
        if (!currentUser) {
            setView('login');
            return showToast("Por favor inicia sesión para finalizar la compra.", "info");
        }

        if (!checkoutData.address || !checkoutData.city || !checkoutData.province || !checkoutData.zipCode) {
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
                    name: currentUser.name,
                    email: currentUser.email,
                    phone: currentUser.phone,
                    dni: currentUser.dni
                },
                items: cart.map(i => ({
                    productId: i.product.id,
                    title: i.product.name,
                    quantity: i.quantity,
                    unit_price: calculateItemPrice(i.product.basePrice, i.product.discount),
                    image: i.product.image
                })),
                subtotal: cartSubtotal,
                discount: discountAmount,
                total: finalTotal,
                discountCode: appliedCoupon ? appliedCoupon.code : null,
                status: 'Pendiente',
                date: new Date().toISOString(),
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`,
                paymentMethod: checkoutData.paymentChoice,
                lastUpdate: new Date().toISOString()
            };

            // 1. Guardar Pedido
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

            // 2. Actualizar Datos de Usuario (Guardar última dirección)
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), {
                address: checkoutData.address,
                city: checkoutData.city,
                province: checkoutData.province,
                zipCode: checkoutData.zipCode,
                ordersCount: increment(1)
            });

            // 3. Limpiar Carrito "En Vivo" en DB
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                userId: currentUser.id,
                items: []
            });

            // 4. Actualizar Stock y Uso de Cupones (Atomic Batch)
            const batch = writeBatch(db);

            // Descontar Stock
            cart.forEach(item => {
                const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                batch.update(productRef, { stock: increment(-item.quantity) });
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
            setCart([]);
            setAppliedCoupon(null);
            setView('profile');
            showToast("¡Pedido realizado con éxito! Gracias por tu compra.", "success");

        } catch (e) {
            console.error("Error al procesar pedido:", e);
            showToast("Ocurrió un error al procesar el pedido. Intenta nuevamente.", "error");
        } finally {
            setIsProcessingOrder(false);
        }
    };

    // --- FUNCIONES DE ADMINISTRACIÓN ---

    // 6. Guardar Producto
    const saveProductFn = async () => {
        // Validaciones básicas
        if (!newProduct.name) return showToast("El nombre del producto es obligatorio.", "warning");
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
    const handleImageUpload = (e, setTargetState, imageField = 'image') => {
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
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
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
        openConfirm("Eliminar Pedido", "¿Eliminar este pedido permanentemente?", async () => {
            try {
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
                showToast("Pedido eliminado correctamente.", "success");
            } catch (e) {
                console.error(e);
                showToast("Error al eliminar pedido.", "error");
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
    const saveSettingsFn = async () => {
        if (!tempSettings) return;

        try {
            const settingsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
            const settingsSnap = await getDocs(settingsQuery);

            const dataToSave = { ...tempSettings, aboutUsText: aboutText };

            if (!settingsSnap.empty) {
                // Actualizar existente
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', settingsSnap.docs[0].id), dataToSave);
            } else {
                // Crear nuevo si no existe
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), dataToSave);
            }

            setSettings(dataToSave);
            showToast("Configuración global guardada correctamente.", 'success');
        } catch (e) {
            console.error(e);
            showToast("Error al guardar configuración.", "error");
        }
    };

    // Gestión de Miembros del Equipo
    const addTeamMemberFn = async () => {
        if (!newTeamMember.email.includes('@')) return showToast("Ingresa un email válido.", "warning");
        if (!newTeamMember.name) return showToast("Ingresa el nombre del miembro.", "warning");

        const currentTeam = settings.team || [];
        // Evitar duplicados
        if (currentTeam.some(m => m.email === newTeamMember.email)) return showToast("Este email ya está en el equipo.", "warning");

        const updatedTeam = [...currentTeam, newTeamMember];
        setTempSettings(prev => ({ ...prev, team: updatedTeam }));
        setNewTeamMember({ email: '', role: 'employee', name: '' });
        showToast("Miembro agregado (Recuerda guardar la configuración).", "info");
    };

    const removeTeamMemberFn = (email) => {
        if (email === SUPER_ADMIN_EMAIL) return showToast("No se puede eliminar al Super Admin.", "error");

        const currentTeam = tempSettings.team || [];
        const updatedTeam = currentTeam.filter(m => m.email !== email);
        setTempSettings(prev => ({ ...prev, team: updatedTeam }));
        showToast("Miembro eliminado (Recuerda guardar la configuración).", "info");
    };

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
        const qtyDiff = newData.quantity - oldData.quantity;

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
            const batchId = `BATCH - ${Date.now()}`

            // Registrar cada compra y actualizar stock
            for (const item of purchaseCart) {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'purchases'), {
                    productId: item.productId,
                    supplierId: item.supplierId,
                    quantity: item.quantity,
                    cost: item.cost,
                    batchId: batchId,
                    date: new Date().toISOString()
                });

                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.productId), {
                    stock: increment(item.quantity)
                });
            }

            setPurchaseCart([]);
            showToast(`Pedido finalizado: ${purchaseCart.length} productos registrados.`, "success");
        } catch (e) {
            console.error(e);
            showToast("Error al finalizar el pedido.", "error");
        }
    };

    // --- CÁLCULOS DEL DASHBOARD (CENTRALIZADOS) ---
    const dashboardMetrics = useMemo(() => {
        // 1. Demanda en Vivo y Favoritos (Trending)
        const productStats = {}; // { id: { cart: 0, fav: 0, total: 0 } }

        // Contar apariciones en Carritos Activos (LiveCarts)
        liveCarts.forEach(cart => {
            if (cart.items) {
                cart.items.forEach(item => {
                    if (!productStats[item.productId]) productStats[item.productId] = { cart: 0, fav: 0, total: 0 };
                    productStats[item.productId].cart += 1;
                    productStats[item.productId].total += 1;
                });
            }
        });

        // Contar apariciones en Favoritos de Usuarios
        users.forEach(u => {
            if (u.favorites) {
                u.favorites.forEach(pid => {
                    if (!productStats[pid]) productStats[pid] = { cart: 0, fav: 0, total: 0 };
                    productStats[pid].fav += 1;
                    productStats[pid].total += 1;
                });
            }
        });

        // Ordenar productos por "calor" (total de interés)
        const trendingProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                const prod = products.find(p => p.id === id);
                return prod ? { ...prod, stats } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.stats.total - a.stats.total)
            .slice(0, 5); // Top 5

        // 2. Finanzas
        const revenue = orders
            .filter(o => o.status !== 'Cancelado') // Excluir cancelados
            .reduce((acc, o) => acc + (o.total || 0), 0);

        const expensesTotal = expenses?.reduce((acc, e) => acc + (e.amount || 0), 0) || 0;
        const purchasesTotal = purchases?.reduce((acc, p) => acc + (p.cost || 0), 0) || 0;
        const netIncome = revenue - expensesTotal - purchasesTotal;

        // 3. Producto Estrella (Ventas reales confirmadas)
        const salesCount = {};
        orders.forEach(o => {
            if (o.status !== 'Cancelado') {
                o.items.forEach(i => {
                    salesCount[i.productId] = (salesCount[i.productId] || 0) + i.quantity;
                });
            }
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
            expensesTotal,
            purchasesTotal,
            netIncome,
            trendingProducts,
            starProduct,
            salesCount,
            totalOrders: orders.length,
            totalUsers: users.length
        };
    }, [orders, expenses, purchases, products, liveCarts, users]);

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

    // Estado de Carga Inicial
    if (isLoading && view === 'store') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-slate-800 border-t-cyan-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-cyan-500 animate-pulse" />
                    </div>
                </div>
                <h1 className="text-3xl font-black tracking-[0.5em] mt-8 animate-pulse neon-text">SUSTORE</h1>
                <p className="text-slate-500 text-sm mt-4 font-mono uppercase tracking-widest">Cargando sistema...</p>
            </div>
        );
    }

    // --- LÓGICA DE FILTRADO CONSOLIDADA ---
    const filteredProducts = products.filter(p => {
        const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const categoryMatch = p.category ? p.category.trim() : '';
        const matchesCategory = selectedCategory === '' || categoryMatch === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // --- RENDERIZADO PRINCIPAL (RETURN) ---
    return (

        <div className="min-h-screen flex flex-col relative w-full bg-grid bg-[#050505] font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* DEBUGGER VISUAL (SOLO DESARROLLO) */}
            {view === 'store' && (
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

            <ConfirmModal
                isOpen={modalConfig.isOpen}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig({ ...modalConfig, isOpen: false })}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
                isDangerous={modalConfig.isDangerous}
            />

            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- BARRA DE NAVEGACIÓN (NAVBAR) --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    {/* Logo y Menú */}
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50 group">
                            <Menu className="w-6 h-6 group-hover:scale-110 transition" />
                        </button>
                        <div className="cursor-pointer group flex flex-col" onClick={() => setView('store')}>
                            <span className="text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300">
                                {settings?.storeName || 'SUSTORE'}
                            </span>
                            <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500"></div>
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
                        {/* Botón Soporte */}
                        <button onClick={() => window.open(settings?.whatsappLink, '_blank')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <MessageCircle className="w-5 h-5" /> Soporte
                        </button>

                        {/* Botón Carrito */}
                        <button onClick={() => setView('cart')} className="relative p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group hover:border-cyan-500/30">
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition" />
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505] animate-bounce-short">
                                    {cart.length}
                                </span>
                            )}
                        </button>

                        {/* Perfil / Login */}
                        {currentUser ? (
                            <button onClick={() => setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm group-hover:scale-105 transition">
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="text-left hidden md:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hola,</p>
                                    <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition">{currentUser.name.split(' ')[0]}</p>
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
                            <h2 className="text-3xl font-black text-white neon-text tracking-tight">MENÚ</h2>
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

                            <button onClick={() => { setView('guide'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800">
                                <FileQuestion className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 transition" /> Cómo Comprar
                            </button>

                            {/* Panel Admin (Solo si tiene permisos) */}
                            {hasAccess(currentUser?.email) && (
                                <button onClick={() => { setView('admin'); setIsMenuOpen(false) }} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-4 bg-cyan-900/10 rounded-xl hover:bg-cyan-900/20 transition border border-cyan-500/20">
                                    <Shield className="w-6 h-6" /> Admin Panel
                                </button>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">{settings.storeName} © 2024</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Espaciador para el Navbar Fixed */}
            {view !== 'admin' && <div className="h-32"></div>}

            {/* --- CONTENIDO PRINCIPAL (VIEW SWITCHER) --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>

                {/* 1. VISTA TIENDA (HOME) */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto pb-32 min-h-screen block">

                        {/* Anuncio Global (Marquesina) */}
                        {settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/5 skew-x-12 -translate-x-full group-hover:translate-x-full transition duration-1000"></div>
                                <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                                    <Flame className="w-4 h-4 text-orange-500" /> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500" />
                                </p>
                            </div>
                        )}

                        {/* Banner Hero */}
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            {/* Imagen de fondo */}
                            {settings?.heroUrl ? (
                                <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-purple-900 opacity-20"></div>
                            )}

                            {/* Overlay de Texto */}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <div className="max-w-2xl animate-fade-up">
                                    <span className="bg-cyan-500 text-black px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.4)] mb-4 inline-block">Nueva Colección</span>
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-6">
                                        TECNOLOGÍA <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">
                                            DEL FUTURO
                                        </span>
                                    </h1>
                                    <p className="text-slate-400 text-lg mb-8 max-w-lg font-medium">
                                        Explora nuestra selección premium de dispositivos. Calidad garantizada y soporte técnico especializado.
                                    </p>
                                    <div className="flex gap-4">
                                        <button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2 group/btn">
                                            VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition" />
                                        </button>
                                        <button onClick={() => setView('guide')} className="px-8 py-4 glass text-white font-bold rounded-xl hover:bg-white/10 transition border border-white/10">
                                            Ayuda
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtros de Categoría */}
                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <Filter className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <button onClick={() => setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory === '' ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                                Todos
                            </button>
                            {settings?.categories?.map(c => (
                                <button key={c} onClick={() => setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory === c ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>

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
                                {filteredProducts.length === 0 && (
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-32">
                                    {filteredProducts.map(p => (
                                        <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition duration-500 relative flex flex-col h-full">

                                            {/* Imagen y Badges */}
                                            <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                                {/* Efecto Glow Fondo */}
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

                                                {p.image ? (
                                                    <img
                                                        src={p.image}
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                        className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                                                    />
                                                ) : null}

                                                {/* Fallback Icon (se muestra si no hay imagen o si falla) */}
                                                <div className="hidden w-full h-full flex items-center justify-center z-0 absolute inset-0" style={{ display: p.image ? 'none' : 'flex' }}>
                                                    <div className="flex flex-col items-center justify-center text-slate-700">
                                                        <ImageIcon className="w-16 h-16 mb-2 opacity-50" />
                                                        <span className="text-xs font-bold uppercase tracking-widest opacity-50">Sin Imagen</span>
                                                    </div>
                                                </div>

                                                {/* Descuento Badge */}
                                                {p.discount > 0 && (
                                                    <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-20 shadow-red-600/20 animate-pulse">
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

                                                {/* Botón Rápido Agregar */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); manageCart(p, 1) }}
                                                    className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 hover:bg-cyan-400 hover:shadow-cyan-400/50 transition z-20 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300"
                                                    title="Agregar al carrito"
                                                >
                                                    <Plus className="w-6 h-6" />
                                                </button>
                                            </div>

                                            {/* Información */}
                                            <div className="p-6 flex-1 flex flex-col relative z-10 bg-[#0a0a0a]">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">
                                                        {p.category}
                                                    </p>
                                                    {/* Estado de Stock */}
                                                    {p.stock === 0 ? (
                                                        <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700">AGOTADO</span>
                                                    ) : p.stock <= 3 ? (
                                                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Últimos {p.stock}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2 min-h-[3rem]">
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
                                                    ${calculateItemPrice(item.product.basePrice, item.product.discount).toLocaleString()} <span className="text-slate-600 font-normal">unitario</span>
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
                                                        Subtotal: <span className="text-white text-lg ml-1">${(calculateItemPrice(item.product.basePrice, item.product.discount) * item.quantity).toLocaleString()}</span>
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
                                            <span>Envío</span>
                                            <span className="text-cyan-400 font-bold flex items-center gap-1"><Truck className="w-3 h-3" /> Gratis</span>
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

                                {/* Datos de Envío */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-900/10 rounded-bl-[100px] pointer-events-none"></div>
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <MapPin className="text-cyan-400 w-6 h-6" /> Datos de Envío
                                    </h2>
                                    <div className="space-y-5 relative z-10">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Dirección y Altura</label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition font-medium"
                                                placeholder="Ej: Av. Santa Fe 1234"
                                                value={checkoutData.address}
                                                onChange={e => setCheckoutData({ ...checkoutData, address: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Ciudad</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                    placeholder="Ej: Rosario"
                                                    value={checkoutData.city}
                                                    onChange={e => setCheckoutData({ ...checkoutData, city: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Provincia</label>
                                                <input
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                    placeholder="Ej: Santa Fe"
                                                    value={checkoutData.province}
                                                    onChange={e => setCheckoutData({ ...checkoutData, province: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">Código Postal</label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
                                                placeholder="Ej: 2000"
                                                value={checkoutData.zipCode}
                                                onChange={e => setCheckoutData({ ...checkoutData, zipCode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Método de Pago */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-900/10 rounded-bl-[100px] pointer-events-none"></div>
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <CreditCard className="text-cyan-400 w-6 h-6" /> Método de Pago
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4 relative z-10">
                                        {['Transferencia', 'Efectivo'].map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: method })}
                                                className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === method ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                            >
                                                {checkoutData.paymentChoice === method && (
                                                    <div className="absolute top-2 right-2 text-cyan-500 animate-fade-in">
                                                        <CheckCircle className="w-5 h-5" />
                                                    </div>
                                                )}
                                                {method === 'Transferencia' ? <RefreshCw className="w-8 h-8 group-hover:scale-110 transition" /> : <DollarSign className="w-8 h-8 group-hover:scale-110 transition" />}
                                                <span className="text-sm font-black tracking-wider uppercase">{method}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {checkoutData.paymentChoice === 'Transferencia' && (
                                        <div className="mt-6 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-xl animate-fade-up">
                                            <div className="flex items-start gap-3">
                                                <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-cyan-200 text-sm leading-relaxed">
                                                    Al confirmar el pedido, recibirás un correo electrónico con los datos bancarios (CBU/Alias) para realizar la transferencia. Tu pedido se procesará una vez enviado el comprobante.
                                                </p>
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
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>

                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl z-10 transform rotate-3 border-4 border-[#0a0a0a]">
                                {currentUser.name.charAt(0)}
                            </div>

                            {/* Info */}
                            <div className="text-center md:text-left z-10 flex-1">
                                <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{currentUser.name}</h2>
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
                                <button onClick={() => { localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store') }} className="px-6 py-4 bg-red-900/10 border border-red-500/20 text-red-500 hover:bg-red-900/20 rounded-2xl font-bold transition flex items-center justify-center gap-2 hover:border-red-500/40">
                                    <LogOut className="w-5 h-5" /> Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            {/* Columna Izquierda: Historial de Pedidos */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <Package className="text-cyan-400 w-6 h-6" /> Mis Pedidos
                                    </h3>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full">
                                        {orders.filter(o => o.userId === currentUser.id).length} Total
                                    </span>
                                </div>

                                {orders.filter(o => o.userId === currentUser.id).length === 0 ? (
                                    <div className="p-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-500 bg-slate-900/20">
                                        <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="font-bold">Aún no has realizado compras.</p>
                                        <button onClick={() => setView('store')} className="mt-4 text-cyan-400 hover:underline text-sm font-bold">Ir a la tienda</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                        {orders.filter(o => o.userId === currentUser.id).map(o => (
                                            <div key={o.id} onClick={() => setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl flex justify-between items-center cursor-pointer transition duration-300 group relative overflow-hidden">
                                                {/* Hover Effect */}
                                                <div className="absolute inset-0 bg-cyan-900/5 opacity-0 group-hover:opacity-100 transition"></div>

                                                <div className="relative z-10">
                                                    <p className="font-bold text-white text-lg group-hover:text-cyan-400 transition mb-1 flex items-center gap-2">
                                                        <span className="text-slate-500">#</span> {o.orderId}
                                                    </p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2 font-mono">
                                                        <Calendar className="w-3 h-3" /> {new Date(o.date).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                <div className="text-right relative z-10">
                                                    <p className="font-black text-white text-xl mb-2">${o.total.toLocaleString()}</p>
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider border ${o.status === 'Realizado' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'}`}>
                                                        {o.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                        <input className="input-cyber w-full p-4" placeholder="Nombre Completo" value={authData.name} onChange={e => setAuthData({ ...authData, name: e.target.value })} />
                                        <input className="input-cyber w-full p-4" placeholder="Nombre de Usuario" value={authData.username} onChange={e => setAuthData({ ...authData, username: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="input-cyber p-4" placeholder="DNI" value={authData.dni} onChange={e => setAuthData({ ...authData, dni: e.target.value })} />
                                            <input className="input-cyber p-4" placeholder="Teléfono" value={authData.phone} onChange={e => setAuthData({ ...authData, phone: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <input className="input-cyber w-full p-4" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e => setAuthData({ ...authData, email: e.target.value })} />
                                    <input className="input-cyber w-full p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })} />
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
                            <FileQuestion className="text-cyan-400 w-12 h-12" /> Cómo Comprar
                        </h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] text-slate-300 shadow-2xl space-y-8">
                            {[
                                { title: "Selecciona Productos", text: "Navega por nuestro catálogo y añade lo que te guste al carrito con el botón '+'." },
                                { title: "Revisa tu Carrito", text: "Verifica las cantidades. Si tienes un cupón de descuento, ¡es el momento de usarlo!" },
                                { title: "Datos de Envío", text: "Completa la información de entrega. Hacemos envíos a todo el país." },
                                { title: "Pago y Confirmación", text: "Elige tu método de pago preferido. Si es transferencia, recibirás los datos por email." },
                                { title: "¡Listo!", text: "Recibirás un correo con el seguimiento de tu pedido. ¡Disfruta tu compra!" }
                            ].map((step, idx) => (
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

                {/* 7. PANEL DE ADMINISTRACIÓN (COMPLETO Y DETALLADO) */}
                {view === 'admin' && (
                    hasAccess(currentUser?.email) ? (
                        <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full font-sans">

                            {/* 7.1 Sidebar Admin */}
                            <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static shadow-2xl`}>
                                <div className="p-8 border-b border-slate-900">
                                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                        <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-900/20">
                                            <Shield className="w-6 h-6" />
                                        </div>
                                        ADMIN
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-2 font-mono ml-1">v3.0.0 PRO</p>
                                </div>

                                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-2 mt-2">Principal</p>

                                    <button onClick={() => setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'dashboard' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                                    </button>

                                    <button onClick={() => setAdminTab('orders')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'orders' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <ShoppingBag className="w-5 h-5" /> Pedidos
                                    </button>

                                    <button onClick={() => setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'products' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                        <Package className="w-5 h-5" /> Productos
                                    </button>

                                    {isAdmin(currentUser?.email) && (
                                        <>
                                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-2 mt-6">Gestión</p>

                                            <button onClick={() => setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'coupons' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Ticket className="w-5 h-5" /> Cupones
                                            </button>

                                            <button onClick={() => setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'suppliers' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Truck className="w-5 h-5" /> Proveedores
                                            </button>

                                            <button onClick={() => setAdminTab('purchases')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'purchases' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <ShoppingCart className="w-5 h-5" /> Compras
                                            </button>

                                            <button onClick={() => setAdminTab('finance')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'finance' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Wallet className="w-5 h-5" /> Finanzas
                                            </button>

                                            <button onClick={() => setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'settings' ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                                <Settings className="w-5 h-5" /> Configuración
                                            </button>
                                        </>
                                    )}
                                </nav>

                                <div className="p-6 border-t border-slate-900">
                                    <button onClick={() => setView('store')} className="w-full py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold text-sm flex items-center justify-center gap-2 group border border-slate-800">
                                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition" /> Volver a Tienda
                                    </button>
                                </div>
                            </div>

                            {/* 7.2 Contenido Principal Admin */}
                            <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10 custom-scrollbar">
                                <button onClick={() => setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800">
                                    <Menu className="w-6 h-6" />
                                </button>

                                {/* TAB: DASHBOARD */}
                                {adminTab === 'dashboard' && (
                                    <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8 pb-20">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <h1 className="text-4xl font-black text-white neon-text">Panel de Control</h1>
                                                <p className="text-slate-500 mt-2">Visión general del rendimiento de tu negocio.</p>
                                            </div>
                                            <div className="hidden md:block bg-slate-900 px-4 py-2 rounded-lg text-xs text-slate-400 font-mono border border-slate-800">
                                                {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>

                                        {/* Métricas Principales (Financieras) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-green-900/20 rounded-xl text-green-400"><DollarSign className="w-6 h-6" /></div>
                                                    <span className="text-[10px] font-bold bg-green-900/20 text-green-400 px-2 py-1 rounded-full">VENTAS</span>
                                                </div>
                                                <p className="text-slate-500 font-black text-[10px] tracking-widest mb-1">INGRESOS BRUTOS</p>
                                                <p className="text-3xl font-black text-white tracking-tight">${dashboardMetrics.revenue.toLocaleString()}</p>
                                            </div>

                                            <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${dashboardMetrics.netIncome >= 0 ? 'bg-cyan-900/20 text-cyan-400' : 'bg-red-900/20 text-red-500'}`}>
                                                        {dashboardMetrics.netIncome >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dashboardMetrics.netIncome >= 0 ? 'bg-cyan-900/20 text-cyan-400' : 'bg-red-900/20 text-red-500'}`}>
                                                        {dashboardMetrics.netIncome >= 0 ? 'PROFIT' : 'LOSS'}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 font-black text-[10px] tracking-widest mb-1">BENEFICIO NETO</p>
                                                <p className={`text-3xl font-black tracking-tight ${dashboardMetrics.netIncome >= 0 ? 'text-white' : 'text-red-500'}`}>
                                                    ${dashboardMetrics.netIncome.toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-red-900/20 rounded-xl text-red-400"><Wallet className="w-6 h-6" /></div>
                                                </div>
                                                <p className="text-slate-500 font-black text-[10px] tracking-widest mb-1">GASTOS + COMPRAS</p>
                                                <p className="text-3xl font-black text-white tracking-tight">${(dashboardMetrics.expensesTotal + (dashboardMetrics.purchasesTotal || 0)).toLocaleString()}</p>
                                            </div>

                                            <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-cyan-900/20 rounded-xl text-cyan-400"><Eye className="w-6 h-6 animate-pulse" /></div>
                                                    <span className="text-[10px] font-bold bg-cyan-900/20 text-cyan-400 px-2 py-1 rounded-full animate-pulse">LIVE</span>
                                                </div>
                                                <p className="text-slate-500 font-black text-[10px] tracking-widest mb-1">USUARIOS ACTIVOS</p>
                                                <p className="text-3xl font-black text-white tracking-tight">{liveCarts.length}</p>
                                            </div>
                                        </div>

                                        {/* Sección "Heavy": Top Ventas y Demanda */}
                                        <div className="grid lg:grid-cols-3 gap-8">

                                            {/* Tendencia de Demanda (Live Carts + Favoritos) */}
                                            <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                                                <div className="flex justify-between items-center mb-8 relative z-10">
                                                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                                                        <Flame className="text-orange-500 w-6 h-6" /> Tendencia de Demanda
                                                    </h3>
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-bold bg-blue-900/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">Carrito</span>
                                                        <span className="text-[10px] font-bold bg-red-900/20 text-red-400 px-3 py-1 rounded-full border border-red-500/20">Favoritos</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 relative z-10">
                                                    {dashboardMetrics.trendingProducts.length === 0 ? (
                                                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                                                            No hay suficiente actividad reciente para mostrar tendencias.
                                                        </div>
                                                    ) : (
                                                        dashboardMetrics.trendingProducts.map((p, idx) => (
                                                            <div key={p.id} className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800 hover:bg-slate-900/60 transition">
                                                                <div className="flex items-center gap-4">
                                                                    <span className={`font-black text-xl w-8 text-center ${idx === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-400' : 'text-slate-600'}`}>
                                                                        #{idx + 1}
                                                                    </span>
                                                                    <div className="w-12 h-12 bg-white rounded-lg p-1 flex-shrink-0">
                                                                        <img src={p.image} className="w-full h-full object-contain" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-white text-sm line-clamp-1">{p.name}</p>
                                                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                                                            Stock Disponible: <span className={p.stock < 5 ? 'text-red-400' : 'text-slate-400'}>{p.stock}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="text-center">
                                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Cart</p>
                                                                        <p className="font-mono text-lg font-bold text-blue-400">{p.stats.cart}</p>
                                                                    </div>
                                                                    <div className="h-8 w-px bg-slate-800"></div>
                                                                    <div className="text-center">
                                                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Fav</p>
                                                                        <p className="font-mono text-lg font-bold text-red-400">{p.stats.fav}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Producto Estrella */}
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group flex flex-col items-center text-center">
                                                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-700"></div>

                                                <div className="bg-yellow-500/10 p-4 rounded-full mb-6 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                                    <Trophy className="w-10 h-10 text-yellow-400" />
                                                </div>

                                                <h3 className="text-xl font-black text-white mb-2 relative z-10">Producto Estrella</h3>
                                                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-6">El más vendido</p>

                                                {dashboardMetrics.starProduct ? (
                                                    <div className="relative z-10 w-full bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                        <img src={dashboardMetrics.starProduct.image} className="w-32 h-32 mx-auto bg-white rounded-xl object-contain p-2 shadow-lg mb-4" />
                                                        <h4 className="text-white font-black text-lg line-clamp-2 leading-tight mb-2">{dashboardMetrics.starProduct.name}</h4>
                                                        <div className="inline-block bg-yellow-900/20 border border-yellow-500/30 px-4 py-1 rounded-full">
                                                            <p className="text-yellow-400 font-black text-xl">
                                                                {dashboardMetrics.salesCount[dashboardMetrics.starProduct.id]} <span className="text-xs font-bold uppercase">Unidades</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-500 text-sm mt-4">Esperando datos de ventas...</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CONFIGURACIÓN (BLINDADA) */}
                                {adminTab === 'settings' && (
                                    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-20">
                                        <div className="flex justify-between items-center">
                                            <h1 className="text-3xl font-black text-white neon-text">Configuración Global</h1>
                                            <button onClick={saveSettingsFn} className="bg-cyan-600 px-8 py-3 rounded-xl text-white font-bold shadow-lg hover:bg-cyan-500 transition flex items-center gap-2">
                                                <Save className="w-5 h-5" /> Guardar Cambios
                                            </button>
                                        </div>

                                        {/* Gestión de Categorías */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                <Tag className="w-5 h-5 text-purple-400" /> Categorías de Productos
                                            </h3>
                                            <div className="flex gap-4 mb-6">
                                                <input
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition"
                                                    placeholder="Nombre de nueva categoría (ej: Tablets)"
                                                    value={newCategory}
                                                    onChange={e => setNewCategory(e.target.value)}
                                                />
                                                <button
                                                    onClick={() => { if (newCategory) { setTempSettings({ ...tempSettings, categories: [...(tempSettings.categories || []), newCategory] }); setNewCategory(''); } }}
                                                    className="bg-purple-600 px-6 rounded-xl text-white font-bold hover:bg-purple-500 transition shadow-lg"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {(tempSettings?.categories || []).map(c => (
                                                    <span key={c} className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300 flex items-center gap-3 font-bold group hover:border-red-500/50 hover:bg-red-900/10 transition">
                                                        {c}
                                                        <button onClick={() => setTempSettings({ ...tempSettings, categories: tempSettings.categories.filter(x => x !== c) })} className="text-slate-500 group-hover:text-red-400 transition">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Gestión de Equipo (Admins) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-cyan-400" /> Equipo & Accesos
                                            </h3>
                                            <p className="text-slate-500 text-sm mb-6">Gestiona quién tiene acceso al panel de administración.</p>

                                            <div className="flex gap-3 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                                <input className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder="Nombre" value={newTeamMember.name} onChange={e => setNewTeamMember({ ...newTeamMember, name: e.target.value })} />
                                                <input className="flex-[3] bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder="Email (Usuario existente)" value={newTeamMember.email} onChange={e => setNewTeamMember({ ...newTeamMember, email: e.target.value })} />
                                                <select className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" value={newTeamMember.role} onChange={e => setNewTeamMember({ ...newTeamMember, role: e.target.value })}>
                                                    <option value="employee">Empleado</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button onClick={addTeamMemberFn} className="bg-cyan-600 px-5 rounded-xl text-white font-bold hover:bg-cyan-500 transition shadow-lg"><Plus className="w-5 h-5" /></button>
                                            </div>

                                            <div className="space-y-3">
                                                {(tempSettings?.team || []).map((m, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${m.role === 'admin' ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                                                {m.name ? m.name.charAt(0) : <User className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{m.name || 'Sin nombre'}</p>
                                                                <p className="text-xs text-slate-500">{m.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">{m.role}</span>
                                                            {m.email === SUPER_ADMIN_EMAIL ? (
                                                                <Lock className="w-4 h-4 text-cyan-500" title="Super Admin Protegido" />
                                                            ) : (
                                                                <button onClick={() => removeTeamMemberFn(m.email)} className="p-2 hover:bg-red-900/20 rounded-lg text-slate-600 hover:text-red-400 transition">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Textos Globales */}
                                        <div className="space-y-6">
                                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
                                                <h3 className="text-xl font-bold text-white mb-6">Mensajes y Textos</h3>
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Marquesina de Anuncio (Inicio)</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Ej: 🔥 ENVÍOS GRATIS 🔥" value={tempSettings?.announcementMessage || ''} onChange={e => setTempSettings({ ...tempSettings, announcementMessage: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Texto "Sobre Nosotros"</label>
                                                        <textarea className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition resize-none leading-relaxed custom-scrollbar" value={aboutText} onChange={e => setAboutText(e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            {suppliers.map(s => (
                                                <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] hover:border-slate-600 transition duration-300 group">
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

                                            {/* Header / Selector de Modo */}
                                            <div className="flex border-b border-slate-800">
                                                <button
                                                    onClick={() => setNewPurchase(prev => ({ ...prev, isNewProduct: false }))}
                                                    className={`flex-1 p-6 text-center font-bold tracking-wider transition ${!newPurchase.isNewProduct ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <Package className="w-5 h-5 inline-block mr-2" /> REPONER STOCK
                                                </button>
                                                <button
                                                    onClick={() => setNewPurchase(prev => ({ ...prev, isNewProduct: true }))}
                                                    className={`flex-1 p-6 text-center font-bold tracking-wider transition ${newPurchase.isNewProduct ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <CheckCircle className="w-5 h-5 inline-block mr-2" /> PRODUCTO NUEVO
                                                </button>
                                            </div>

                                            <div className="p-8">
                                                {/* MODO: REPONER STOCK */}
                                                {!newPurchase.isNewProduct && (() => {
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

                                                            {/* Botón Agregar al Carrito */}
                                                            <button
                                                                onClick={() => addToPurchaseCart(newPurchase.productId, newPurchase.quantity, newPurchase.supplierId)}
                                                                className="w-full mt-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-3"
                                                            >
                                                                <ShoppingCart className="w-5 h-5" /> AGREGAR AL PEDIDO
                                                            </button>
                                                        </div>
                                                    );
                                                })()}

                                                {/* MODO: NUEVO PRODUCTO */}
                                                {/* MODO: NUEVO PRODUCTO */}
                                                {newPurchase.isNewProduct && (
                                                    <div className="space-y-6 animate-fade-in">
                                                        <div className="p-6 bg-slate-900/30 rounded-2xl border border-slate-800">
                                                            <h4 className="text-cyan-400 font-bold mb-4 flex items-center gap-2">
                                                                <Tag className="w-4 h-4" /> Datos del Producto
                                                            </h4>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Nombre */}
                                                                <div className="md:col-span-2">
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Nombre del Producto
                                                                    </label>
                                                                    <input
                                                                        className="input-cyber w-full p-4"
                                                                        placeholder="Ej: Samsung Galaxy S24"
                                                                        value={newPurchase.newProdName || ''}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, newProdName: e.target.value })}
                                                                    />
                                                                </div>

                                                                {/* Categoría */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Categoría
                                                                    </label>
                                                                    <select
                                                                        className="input-cyber w-full p-4"
                                                                        value={newPurchase.newProdCategory || ''}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, newProdCategory: e.target.value })}
                                                                    >
                                                                        <option value="">Seleccionar...</option>
                                                                        {(settings?.categories || []).map(cat => (
                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>

                                                                {/* Precio de Venta */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Precio de Venta ($)
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className="input-cyber w-full p-4"
                                                                        placeholder="0"
                                                                        value={newPurchase.newProdPrice || 0}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, newProdPrice: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                </div>

                                                                {/* Imagen - UPLOAD */}
                                                                <div className="md:col-span-2">
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Imagen del Producto
                                                                    </label>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleImageUpload(e, setNewPurchase, 'newProdImage')}
                                                                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-900/20 file:text-cyan-400 hover:file:bg-cyan-900/40"
                                                                    />
                                                                    {newPurchase.newProdImage && (
                                                                        <div className="mt-3 bg-white rounded-xl p-3 w-32 h-32">
                                                                            <img src={newPurchase.newProdImage} className="w-full h-full object-contain" alt="Preview" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Stock Inicial */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Stock Inicial
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className="input-cyber w-full p-4"
                                                                        placeholder="0"
                                                                        value={newPurchase.quantity || 0}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, quantity: parseInt(e.target.value) || 0 })}
                                                                    />
                                                                </div>

                                                                {/* Proveedor */}
                                                                <div>
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Proveedor
                                                                    </label>
                                                                    <select
                                                                        className="input-cyber w-full p-4"
                                                                        value={newPurchase.supplierId || ''}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, supplierId: e.target.value })}
                                                                    >
                                                                        <option value="">Seleccionar...</option>
                                                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                    </select>
                                                                </div>

                                                                {/* Costo de Compra */}
                                                                <div className="md:col-span-2">
                                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                                                        Costo de Compra Total ($)
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className="input-cyber w-full p-4"
                                                                        placeholder="0.00"
                                                                        value={newPurchase.cost || 0}
                                                                        onChange={e => setNewPurchase({ ...newPurchase, cost: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                    <p className="text-xs text-slate-400 mt-1">Este es el costo total de la compra al proveedor</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        // Validaciones Comunes
                                                        if (newPurchase.quantity <= 0) return showToast("La cantidad debe ser mayor a 0.", "warning");
                                                        if (!newPurchase.supplierId) return showToast("Selecciona un proveedor.", "warning");
                                                        if (newPurchase.cost < 0) return showToast("El costo no puede ser negativo.", "warning");

                                                        try {
                                                            let targetProductId = newPurchase.productId;
                                                            let targetProductName = "";
                                                            let calculatedCost = 0;

                                                            if (newPurchase.isNewProduct) {
                                                                // VALIDAR Y CREAR PRODUCTO
                                                                if (!newPurchase.newProdName || !newPurchase.newProdPrice || !newPurchase.newProdCategory) {
                                                                    return showToast("Completa los detalles del nuevo producto.", "warning");
                                                                }

                                                                const newProdData = {
                                                                    name: newPurchase.newProdName,
                                                                    basePrice: newPurchase.newProdPrice,
                                                                    image: newPurchase.newProdImage || 'https://via.placeholder.com/300',
                                                                    category: newPurchase.newProdCategory,
                                                                    description: 'Producto nuevo agregado desde Compras',
                                                                    stock: 0, // Se actualizará abajo
                                                                    discount: 0,
                                                                    createdAt: new Date().toISOString()
                                                                };

                                                                const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), newProdData);
                                                                targetProductId = docRef.id;
                                                                targetProductName = newProdData.name;
                                                                calculatedCost = newPurchase.cost; // Usar costo manual para nuevos productos
                                                                showToast("¡Producto nuevo creado!", "success");
                                                            } else {
                                                                if (!targetProductId) return showToast("Selecciona un producto existente.", "warning");
                                                                const selectedProd = products.find(p => p.id === targetProductId);
                                                                targetProductName = selectedProd?.name || "Desconocido";
                                                                // Auto-calcular costo: precio de compra × cantidad
                                                                const productPrice = selectedProd?.purchasePrice || selectedProd?.basePrice || 0;
                                                                calculatedCost = productPrice * newPurchase.quantity;
                                                            }

                                                            // REGISTRAR COMPRA
                                                            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'purchases'), {
                                                                productId: targetProductId,
                                                                supplierId: newPurchase.supplierId,
                                                                quantity: newPurchase.quantity,
                                                                cost: calculatedCost,
                                                                date: new Date().toISOString()
                                                            });

                                                            // ACTUALIZAR STOCK (Fixing NaN issues)
                                                            const currentStock = isNaN(Number(selectedProd?.stock)) ? 0 : Number(selectedProd.stock);
                                                            const newStock = currentStock + newPurchase.quantity;

                                                            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', targetProductId), {
                                                                stock: newStock
                                                            });

                                                            // Resetear Formulario
                                                            setNewPurchase({
                                                                isNewProduct: false, productId: '', supplierId: '', quantity: 1, cost: 0,
                                                                newProdName: '', newProdPrice: 0, newProdImage: '', newProdCategory: ''
                                                            });
                                                            showToast(`Compra de "${targetProductName}" registrada exitosamente.`, "success");

                                                        } catch (e) {
                                                            console.error(e);
                                                            showToast("Error al procesar la operación.", "error");
                                                        }
                                                    }}
                                                    className="w-full mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-5 rounded-2xl shadow-xl transition transform hover:scale-[1.01] flex items-center justify-center gap-3 text-lg"
                                                >
                                                    <Save className="w-6 h-6" /> {newPurchase.isNewProduct ? 'CREAR PRODUCTO Y REGISTRAR COMPRA' : 'REGISTRAR REPOSICIÓN DE STOCK'}
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
                                                {purchases.sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => {
                                                    const prod = products.find(prod => prod.id === p.productId);
                                                    const sup = suppliers.find(s => s.id === p.supplierId);
                                                    return (
                                                        <div key={p.id} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 hover:border-slate-600 transition group">
                                                            <div>
                                                                <p className="font-bold text-white flex items-center gap-2">
                                                                    {prod?.name || 'Producto Eliminado'}
                                                                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">STOCK ACTUAL: {prod?.stock || 0}</span>
                                                                </p>
                                                                <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString()} - Prov: {sup?.name || 'Desconocido'}</p>
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

                                {/* TAB: FINANZAS (GASTOS) */}
                                {adminTab === 'finance' && (
                                    <div className="max-w-5xl mx-auto animate-fade-up pb-20">
                                        <h1 className="text-3xl font-black text-white mb-8">Finanzas y Gastos</h1>

                                        {/* Formulario Gastos */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] mb-10 shadow-xl">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                <Wallet className="w-5 h-5 text-red-400" /> Registrar Nuevo Gasto
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descripción</label>
                                                    <input className="input-cyber w-full p-4" placeholder="Ej: Pago de Internet, Alquiler..." value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Monto ($)</label>
                                                    <input type="number" className="input-cyber w-full p-4" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })} />
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
                                                className="w-full mt-6 bg-red-900/50 hover:bg-red-900 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 border border-red-500/20"
                                            >
                                                <Save className="w-5 h-5" /> Registrar Gasto
                                            </button>
                                        </div>

                                        {/* Lista Gastos */}
                                        <div className="space-y-4">
                                            {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(Ex => (
                                                <div key={Ex.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex justify-between items-center group hover:border-slate-700 transition">
                                                    <div>
                                                        <h4 className="text-white font-bold text-lg">{Ex.description}</h4>
                                                        <p className="text-slate-500 text-xs flex gap-3">
                                                            <span className="text-red-400 font-bold bg-red-900/10 px-2 rounded border border-red-500/10">{Ex.category}</span>
                                                            <span>{new Date(Ex.date).toLocaleDateString()}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <p className="text-xl font-mono font-bold text-red-500">-${Ex.amount.toLocaleString()}</p>
                                                        <button
                                                            onClick={() => openConfirm("Eliminar Gasto", "¿Estás seguro?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', Ex.id)))}
                                                            className="p-3 bg-slate-900 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-xl transition border border-slate-800"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB: CUPONES (GESTIÓN AVANZADA) */}
                                {adminTab === 'coupons' && (
                                    <div className="max-w-5xl mx-auto animate-fade-up pb-20">
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
                                                            <option value="global">🌍 Para Todos los Usuarios</option>
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
                                            {coupons.map(c => (
                                                <div key={c.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center group hover:border-slate-700 transition">
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
                                                    <button
                                                        onClick={() => openConfirm("Eliminar Cupón", "¿Eliminar este cupón?", async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'coupons', c.id)))}
                                                        className="bg-slate-900 hover:bg-red-900/20 text-slate-500 hover:text-red-400 p-3 rounded-xl transition border border-slate-800"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
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
                                                {orders.map(o => (
                                                    <div key={o.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-slate-700 transition group">
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
                                    <div className="max-w-7xl mx-auto animate-fade-up pb-20">
                                        <div className="flex justify-between items-center mb-8">
                                            <h1 className="text-3xl font-black text-white">Inventario</h1>
                                            <button onClick={() => { setNewProduct({}); setEditingId(null); setShowProductForm(true) }} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg">
                                                <Plus className="w-5 h-5" /> Agregar Producto
                                            </button>
                                        </div>

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
                                            {products.map(p => (
                                                <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center group hover:border-cyan-900/50 transition">
                                                    <div className="flex items-center gap-6 w-full sm:w-auto">
                                                        <div className="w-16 h-16 bg-white rounded-lg p-2 flex-shrink-0">
                                                            <img src={p.image} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-lg">{p.name}</p>
                                                            <p className="text-xs text-slate-500 font-mono">
                                                                Stock: <span className={p.stock < 5 ? 'text-red-400 font-bold' : 'text-slate-400'}>{p.stock}</span> |
                                                                <span className="text-cyan-400 font-bold ml-2">${p.basePrice}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                                                        <button onClick={() => handleManualSale(p)} className="p-3 bg-slate-900 rounded-xl text-green-400 hover:bg-green-900/20 transition border border-slate-800" title="Venta Manual (Descontar 1)">
                                                            <DollarSign className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => { setNewProduct(p); setEditingId(p.id); setShowProductForm(true) }} className="p-3 bg-slate-900 rounded-xl text-cyan-400 hover:bg-cyan-900/20 transition border border-slate-800">
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                        <button onClick={() => deleteProductFn(p)} className="p-3 bg-slate-900 rounded-xl text-red-400 hover:bg-red-900/20 transition border border-slate-800">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* 7.3 Modal Proveedores (Selector Visual) */}
                            {showSupplierModal && (
                                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
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
                            )}
                        </div>
                    ) : (
                        <AccessDenied onBack={() => setView('store')} />
                    ))}
            </main>
            {/* MODAL: CREAR CATEGORÍA */}
            {showCategoryModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
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
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={confirmModal.onCancel || (() => setConfirmModal(prev => ({ ...prev, isOpen: false })))}
                isDangerous={true}
            />
        </div>
    );
}

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
