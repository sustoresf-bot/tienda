import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, 
    Minus, Plus, Trash2, Edit, RefreshCw, LogIn, LogOut, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, 
    Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, 
    TrendingUp, TrendingDown, Printer, Phone, Calendar, ChevronRight, Lock, 
    Loader2, Filter, AlertTriangle, Save, Copy, ExternalLink, Shield, Gift, 
    Archive, Eye, Clock, MapPin, Calculator, Briefcase, FilePlus, Banknote
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, 
    doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment 
} from 'firebase/firestore';

// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAfllte-D_I3h3TwBaiSL4KVfWrCSVh9ro",
  authDomain: "sustore-63266.firebaseapp.com",
  projectId: "sustore-63266",
  storageBucket: "sustore-63266.firebasestorage.app",
  messagingSenderId: "684651914850",
  appId: "1:684651914850:web:f3df09e5caf6e50e9e533b",
  measurementId: "G-X3K7XGYPRD"
};

// Inicializar Firebase solo una vez
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "sustore-v6-enterprise"; // Namespace para aislar datos

const defaultSettings = {
    storeName: "SUSTORE",
    phone: "5493425123456",
    address: "Santa Fe, Argentina",
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming", "Ofertas"],
    shippingCost: 0,
    freeShippingThreshold: 50000
};

// ==========================================
// 2. UTILIDADES DEL SISTEMA
// ==========================================

const formatMoney = (amount) => {
    if (amount === undefined || amount === null) return '$0';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const generateId = (prefix = 'ID') => `${prefix}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;

// ==========================================
// 3. COMPONENTES UI REUTILIZABLES
// ==========================================

const ToastSystem = ({ toasts, removeToast }) => (
    <div className="fixed top-24 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto min-w-[320px] p-4 rounded-xl border-l-4 shadow-2xl backdrop-blur-xl flex items-start gap-3 animate-fade-in transform transition-all hover:scale-105 ${
                t.type === 'success' ? 'bg-green-950/90 border-green-500 text-green-100' :
                t.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' :
                'bg-slate-900/90 border-cyan-500 text-cyan-100'
            }`}>
                <div className="mt-1">{t.type === 'success' ? <CheckCircle size={18}/> : t.type === 'error' ? <AlertTriangle size={18}/> : <Info size={18}/>}</div>
                <div className="flex-1">
                    <p className="font-bold text-sm">{t.title}</p>
                    <p className="text-xs opacity-80 mt-1 leading-tight">{t.message}</p>
                </div>
                <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100"><X size={16}/></button>
            </div>
        ))}
    </div>
);

const Modal = ({ isOpen, onClose, title, children, size = "md" }) => {
    if (!isOpen) return null;
    const sizes = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-7xl", full: "w-full h-full" };
    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`bg-[#0a0a0c] border border-white/10 w-full ${sizes[size]} rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden`}>
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#111115]">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Zap className="w-5 h-5 text-cyan-500"/> {title}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0c]">{children}</div>
            </div>
        </div>
    );
};

// ==========================================
// 4. APLICACIÓN PRINCIPAL (LOGICA MASIVA)
// ==========================================

function App() {
    // --- ESTADOS GLOBALES ---
    const [view, setView] = useState('store'); 
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState([]);

    // --- BASE DE DATOS (DATA LAKE) ---
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [users, setUsers] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // --- ESTADOS UI (TIENDA) ---
    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('cart_v6')) || [] } catch { return [] } });
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isCartOpen, setCartOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [selectedProduct, setSelectedProduct] = useState(null);

    // --- ESTADOS CHECKOUT & AUTH ---
    const [authMode, setAuthMode] = useState('login');
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', phone: '' });
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', phone: '', method: 'Transferencia', notes: '' });
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    // --- ESTADOS ADMIN PANEL (COMPLETO) ---
    const [adminTab, setAdminTab] = useState('dashboard');
    // POS States
    const [posCart, setPosCart] = useState([]);
    const [posSearch, setPosSearch] = useState('');
    const [posClient, setPosClient] = useState({ name: 'Consumidor Final', dni: '' });
    // CRUD States
    const [modalConfig, setModalConfig] = useState({ active: false, type: null, data: null });
    const [tempProduct, setTempProduct] = useState({});
    const [tempSupplier, setTempSupplier] = useState({});
    const [tempExpense, setTempExpense] = useState({});
    const [tempCoupon, setTempCoupon] = useState({});
    const [quoteCart, setQuoteCart] = useState([]);
    const [quoteClient, setQuoteClient] = useState({ name: '', phone: '', email: '', validUntil: '' });

    // --- EFECTOS & CARGA DE DATOS ---
    useEffect(() => {
        const initSystem = async () => {
            // Recuperar sesión
            const savedUser = localStorage.getItem('user_v6');
            if (savedUser) setUser(JSON.parse(savedUser));

            // Auth anónimo para lectura
            await signInAnonymously(auth);

            // Listeners Masivos (Realtime)
            const unsubscribes = [
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.date) - new Date(a.date)))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), s => setQuotes(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d => ({id: d.id, ...d.data()})))),
                onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => { if(!s.empty) setSettings({...defaultSettings, ...s.docs[0].data()}) })
            ];

            setLoading(false);
            return () => unsubscribes.forEach(u => u());
        };
        initSystem();
    }, []);

    useEffect(() => localStorage.setItem('cart_v6', JSON.stringify(cart)), [cart]);

    // --- FUNCIONES CORE ---
    const showToast = (title, message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, title, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };

    // --- GESTIÓN DE CARRITO ---
    const handleCart = (action, payload) => {
        if (action === 'add') {
            const product = payload;
            if (product.stock <= 0) return showToast("Stock Agotado", "No quedan unidades disponibles.", "error");
            
            setCart(prev => {
                const exist = prev.find(i => i.id === product.id);
                if (exist) {
                    if (exist.qty >= product.stock) {
                        showToast("Límite Alcanzado", "No hay más stock disponible.", "error");
                        return prev;
                    }
                    showToast("Carrito Actualizado", `${product.name} (+1)`, "success");
                    return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
                }
                showToast("Producto Agregado", product.name, "success");
                return [...prev, { ...product, qty: 1 }];
            });
            setCartOpen(true);
        }
        if (action === 'remove') {
            setCart(prev => prev.filter(i => i.id !== payload));
        }
        if (action === 'update') {
            const { id, delta } = payload;
            setCart(prev => prev.map(i => {
                if (i.id === id) {
                    const newQty = i.qty + delta;
                    if (newQty > i.stock) return i; // Tope stock
                    return newQty > 0 ? { ...i, qty: newQty } : null;
                }
                return i;
            }).filter(Boolean));
        }
        if (action === 'clear') setCart([]);
    };

    // --- AUTENTICACIÓN ---
    const processAuth = async (e) => {
        e.preventDefault();
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        try {
            if (authMode === 'register') {
                const q = query(usersRef, where('email', '==', authData.email));
                if (!(await getDocs(q)).empty) throw new Error("El email ya existe.");
                
                const newUser = { ...authData, role: 'user', createdAt: new Date().toISOString() };
                const ref = await addDoc(usersRef, newUser);
                const userObj = { ...newUser, id: ref.id };
                setUser(userObj); localStorage.setItem('user_v6', JSON.stringify(userObj));
                showToast("Bienvenido", `Hola, ${newUser.name}!`, "success");
            } else {
                const q = query(usersRef, where('email', '==', authData.email), where('password', '==', authData.password));
                const snap = await getDocs(q);
                if (snap.empty) throw new Error("Credenciales inválidas.");
                
                const userObj = { ...snap.docs[0].data(), id: snap.docs[0].id };
                setUser(userObj); localStorage.setItem('user_v6', JSON.stringify(userObj));
                showToast("Sesión Iniciada", `Bienvenido de nuevo, ${userObj.name}`, "success");
            }
            setView('store');
        } catch (err) { showToast("Error de Autenticación", err.message, "error"); }
    };
    // --- LÓGICA DE ADMINISTRACIÓN (CRUD) ---
    const handleAdminAction = async (action, collectionName, data) => {
        setLoading(true);
        try {
            if (action === 'delete') {
                if(!window.confirm("¿Seguro que deseas eliminar este elemento?")) { setLoading(false); return; }
                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, data.id));
                showToast("Eliminado", "Elemento eliminado correctamente.", "info");
            } 
            else if (action === 'save') {
                const colRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
                // Sanitizar datos numéricos
                const cleanData = { ...data };
                if(cleanData.basePrice) cleanData.basePrice = Number(cleanData.basePrice);
                if(cleanData.stock) cleanData.stock = Number(cleanData.stock);
                if(cleanData.discount) cleanData.discount = Number(cleanData.discount);
                if(cleanData.value) cleanData.value = Number(cleanData.value);
                if(cleanData.minPurchase) cleanData.minPurchase = Number(cleanData.minPurchase);
                
                // Formatear códigos de cupón
                if(collectionName === 'coupons' && cleanData.code) cleanData.code = cleanData.code.toUpperCase();

                if (data.id) {
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, data.id), cleanData);
                    showToast("Actualizado", "Cambios guardados exitosamente.", "success");
                } else {
                    await addDoc(colRef, { ...cleanData, createdAt: new Date().toISOString() });
                    showToast("Creado", "Nuevo elemento agregado.", "success");
                }
                setModalConfig({ active: false, type: null, data: null });
            }
        } catch (e) { 
            console.error(e);
            showToast("Error", "No se pudo realizar la operación.", "error"); 
        }
        setLoading(false);
    };

    // --- LÓGICA PUNTO DE VENTA (POS) ---
    const addToPos = (product) => {
        const existing = posCart.find(i => i.id === product.id);
        if (existing && existing.qty >= product.stock) return showToast("Stock Límite", "No hay más unidades.", "warning");
        
        if (existing) {
            setPosCart(posCart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setPosCart([...posCart, { ...product, qty: 1 }]);
        }
    };

    const processPosSale = async () => {
        if (posCart.length === 0) return;
        const total = posCart.reduce((acc, item) => acc + (Number(item.basePrice) * item.qty), 0);
        
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                orderId: generateId('POS'),
                userId: user?.id || 'ADMIN',
                customer: { name: posClient.name || 'Mostrador', email: '-', phone: '-' },
                items: posCart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.basePrice })),
                total,
                status: 'Realizado',
                date: new Date().toISOString(),
                paymentMethod: 'Efectivo',
                origin: 'POS'
            });

            const batch = writeBatch(db);
            posCart.forEach(item => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
                batch.update(ref, { stock: increment(-item.qty) });
            });
            await batch.commit();

            setPosCart([]);
            setPosClient({ name: 'Consumidor Final', dni: '' });
            showToast("Venta Exitosa", `Total cobrado: ${formatMoney(total)}`, "success");
        } catch (e) { showToast("Error POS", "No se pudo procesar la venta.", "error"); }
    };

    // --- LÓGICA PRESUPUESTOS ---
    const saveQuote = async () => {
        if(!quoteCart.length || !quoteClient.name) return showToast("Faltan datos", "Agrega productos y cliente.", "warning");
        const total = quoteCart.reduce((acc, item) => acc + (Number(item.basePrice) * item.qty), 0);
        
        await handleAdminAction('save', 'quotes', {
            clientName: quoteClient.name,
            clientPhone: quoteClient.phone,
            items: quoteCart,
            total,
            status: 'Pendiente',
            date: new Date().toISOString()
        });
        setQuoteCart([]);
        setQuoteClient({ name: '', phone: '' });
    };

    // ==========================================
    // 5. RENDERIZADO DE VISTAS (UI)
    // ==========================================

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4"/>
                <p className="text-slate-500 font-mono text-sm animate-pulse">Cargando Sistema Enterprise...</p>
            </div>
        </div>
    );

    // --- COMPONENTES UI INTERNOS ---
    
    // 1. Sidebar (Menú Lateral)
    const Sidebar = () => (
        <>
            <div className={`fixed inset-0 bg-black/80 z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)}/>
            <div className={`fixed inset-y-0 left-0 w-80 bg-[#0a0a0c] border-r border-white/10 z-[101] transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111115]">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2"><Zap className="text-cyan-500 fill-current"/> MENU</h2>
                    <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                </div>
                <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button onClick={() => { setView('store'); setMenuOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-white/5 font-bold flex items-center gap-3 transition text-slate-300 hover:text-white"><Home/> Inicio</button>
                    {user && <button onClick={() => { setView('profile'); setMenuOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-white/5 font-bold flex items-center gap-3 transition text-slate-300 hover:text-white"><User/> Mi Cuenta</button>}
                    {user?.role === 'admin' && (
                        <button onClick={() => { setView('admin'); setMenuOpen(false); }} className="w-full text-left p-4 rounded-xl bg-cyan-900/10 text-cyan-400 border border-cyan-500/20 font-bold flex items-center gap-3 mt-4 hover:bg-cyan-900/20 transition">
                            <Shield className="w-5 h-5"/> Panel Admin
                        </button>
                    )}
                </div>
                <div className="p-6 border-t border-white/10">
                    {user ? (
                        <button onClick={() => { setUser(null); localStorage.removeItem('user_v6'); setView('store'); }} className="w-full p-4 rounded-xl border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-950/20 transition"><LogOut/> Cerrar Sesión</button>
                    ) : (
                        <button onClick={() => { setView('auth'); setMenuOpen(false); }} className="w-full p-4 rounded-xl bg-white text-black font-black hover:bg-slate-200 transition">Iniciar Sesión</button>
                    )}
                </div>
            </div>
        </>
    );

    // 2. Carrito Slide-over
    const CartDrawer = () => {
        const subtotal = cart.reduce((a, i) => a + (Number(i.price) * (1 - (i.discount || 0) / 100) * i.qty), 0);
        return (
            <>
                <div className={`fixed inset-0 bg-black/80 z-[100] transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setCartOpen(false)}/>
                <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-[#0a0a0c] border-l border-white/10 z-[101] transform transition-transform duration-300 ${isCartOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col shadow-2xl`}>
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111115]">
                        <h2 className="text-xl font-black text-white flex items-center gap-2"><ShoppingBag className="text-cyan-500"/> Tu Compra</h2>
                        <button onClick={() => setCartOpen(false)} className="hover:text-cyan-500 transition"><X/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.length === 0 ? <div className="text-center py-20 text-slate-500 font-medium">El carrito está vacío.</div> : cart.map(i => (
                            <div key={i.id} className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 items-center">
                                <img src={i.image} className="w-16 h-16 object-contain bg-black/50 rounded-xl"/>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{i.name}</p>
                                    <p className="text-cyan-400 font-bold">{formatMoney(i.price * (1 - (i.discount || 0) / 100))}</p>
                                    <div className="flex items-center gap-3 mt-2 bg-black/30 w-fit px-2 py-1 rounded-lg">
                                        <button onClick={() => manageCart(i, -1)} className="hover:text-white text-slate-400"><Minus size={14}/></button>
                                        <span className="text-xs font-bold text-white w-4 text-center">{i.qty}</span>
                                        <button onClick={() => manageCart(i, 1)} className="hover:text-white text-slate-400"><Plus size={14}/></button>
                                    </div>
                                </div>
                                <button onClick={() => handleCart('remove', i.id)} className="text-red-400 hover:bg-red-950/30 p-2 rounded-lg transition"><Trash2 size={18}/></button>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && (
                        <div className="p-6 border-t border-white/10 bg-[#111115]">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-slate-400 font-medium">Subtotal Estimado</span>
                                <span className="text-2xl font-black text-white">{formatMoney(subtotal)}</span>
                            </div>
                            <button onClick={() => { setCartOpen(false); setView('checkout'); }} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2">
                                INICIAR PAGO <ArrowRight size={20}/>
                            </button>
                        </div>
                    )}
                </div>
            </>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
            <ToastSystem toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
            <Sidebar />
            <CartDrawer />

            {/* Navbar Global */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-20 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 z-40 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMenuOpen(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition"><Menu/></button>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('store')}>
                            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20"><Zap className="text-white w-5 h-5 fill-current"/></div>
                            <span className="font-black text-2xl tracking-tighter text-white hidden md:block">{settings.storeName}</span>
                        </div>
                    </div>
                    <div className="flex-1 max-w-md mx-6 hidden md:block relative">
                        <Search className="absolute left-4 top-3 text-slate-500 w-4 h-4"/>
                        <input className="w-full bg-[#111115] border border-white/10 rounded-full pl-12 pr-4 py-2.5 text-sm focus:border-cyan-500 outline-none transition text-white" placeholder="Buscar productos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCartOpen(true)} className="relative p-3 bg-white/5 hover:bg-white/10 rounded-xl transition group">
                            <ShoppingBag className="w-5 h-5 text-slate-300 group-hover:text-white"/>
                            {cart.length > 0 && <span className="absolute top-2 right-2 bg-cyan-500 w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"/>}
                        </button>
                        {user ? (
                            <div onClick={() => setView('profile')} className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1 pr-4 rounded-full border border-transparent hover:border-white/10 transition">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">{user.name.charAt(0)}</div>
                                <span className="text-sm font-bold text-white">{user.name.split(' ')[0]}</span>
                            </div>
                        ) : (
                            <button onClick={() => setView('auth')} className="hidden md:block bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition shadow-lg">Ingresar</button>
                        )}
                    </div>
                </nav>
            )}

            <main className={`relative z-10 ${view !== 'admin' ? 'pt-28 pb-20 px-4 max-w-7xl mx-auto' : ''}`}>
                
                {/* VISTA 1: TIENDA */}
                {view === 'store' && (
                    <div className="animate-fade-in space-y-12">
                        {/* Hero */}
                        <div className="relative w-full h-[450px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group">
                            <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070" className="absolute inset-0 w-full h-full object-cover opacity-60 transition duration-700 group-hover:scale-105" alt="Banner"/>
                            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent flex flex-col justify-center px-12">
                                <span className="text-cyan-400 font-bold tracking-widest text-xs uppercase mb-4 bg-cyan-950/30 w-fit px-3 py-1 rounded-full border border-cyan-500/20 backdrop-blur">Lo Nuevo</span>
                                <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[0.9]">FUTURO <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">DIGITAL</span></h1>
                                <button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })} className="bg-white text-black px-8 py-4 rounded-xl font-bold w-fit hover:scale-105 transition shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2">
                                    Ver Catálogo <ArrowRight size={20}/>
                                </button>
                            </div>
                        </div>

                        {/* Filtros */}
                        <div id="catalog" className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                            <button onClick={() => setCategoryFilter('Todas')} className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap border transition ${categoryFilter === 'Todas' ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>Todas</button>
                            {settings.categories.map(c => (
                                <button key={c} onClick={() => setCategoryFilter(c)} className={`px-6 py-2.5 rounded-full font-bold whitespace-nowrap border transition ${categoryFilter === c ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>{c}</button>
                            ))}
                        </div>

                        {/* Grid Productos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {products.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) && (categoryFilter === 'Todas' || p.category === categoryFilter)).map(p => (
                                <div key={p.id} className="bg-[#0f0f12] border border-white/5 rounded-3xl p-4 hover:border-cyan-500/30 transition group flex flex-col h-full shadow-lg hover:shadow-cyan-500/10">
                                    <div className="relative aspect-square bg-[#16161a] rounded-2xl mb-4 p-6 flex items-center justify-center overflow-hidden">
                                        <img src={p.image} className="w-full h-full object-contain transition duration-500 group-hover:scale-110"/>
                                        {p.stock <= 0 && <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white backdrop-blur-sm rounded-2xl border border-white/10">AGOTADO</div>}
                                        {p.discount > 0 && p.stock > 0 && <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg uppercase">-{p.discount}%</span>}
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <p className="text-[10px] text-cyan-500 font-bold uppercase mb-1 tracking-wider">{p.category}</p>
                                        <h3 className="font-bold text-white text-lg leading-tight mb-2 line-clamp-2">{p.name}</h3>
                                        <div className="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
                                            <div>
                                                {p.discount > 0 && <p className="text-xs text-slate-500 line-through mb-0.5">{formatMoney(p.basePrice)}</p>}
                                                <p className="text-xl font-black text-white">{formatMoney(p.basePrice * (1 - (p.discount || 0) / 100))}</p>
                                            </div>
                                            <button disabled={p.stock <= 0} onClick={() => manageCart(p, 1)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition shadow-lg ${p.stock <= 0 ? 'bg-slate-800 cursor-not-allowed' : 'bg-white text-black hover:bg-cyan-400 hover:scale-110'}`}>
                                                <Plus size={20} strokeWidth={3}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* VISTA 2: CHECKOUT */}
                {view === 'checkout' && (
                    <div className="max-w-5xl mx-auto pt-8 grid md:grid-cols-2 gap-12 animate-fade-in">
                        <div>
                            <button onClick={() => setView('store')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition group"><ArrowLeft size={18} className="group-hover:-translate-x-1 transition"/> Volver a comprar</button>
                            <h2 className="text-3xl font-black text-white mb-6 flex items-center gap-3"><Truck className="text-cyan-500"/> Envío</h2>
                            <div className="space-y-4">
                                <input className="w-full bg-[#111115] border border-white/10 p-4 rounded-xl text-white focus:border-cyan-500 outline-none transition" placeholder="Dirección Completa (Calle y Altura)" value={checkoutForm.addr} onChange={e => setCheckoutForm({ ...checkoutForm, addr: e.target.value })}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full bg-[#111115] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition" placeholder="Ciudad" value={checkoutForm.city} onChange={e => setCheckoutForm({ ...checkoutForm, city: e.target.value })}/>
                                    <input className="w-full bg-[#111115] border border-white/10 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition" placeholder="Teléfono" value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}/>
                                </div>
                                <textarea className="w-full bg-[#111115] border border-white/10 p-4 rounded-xl text-white h-24 resize-none outline-none focus:border-cyan-500 transition" placeholder="Notas para el envío (Opcional)" value={checkoutForm.notes} onChange={e => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}/>
                            </div>
                            <h2 className="text-3xl font-black text-white mt-10 mb-6 flex items-center gap-3"><Wallet className="text-cyan-500"/> Pago</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {['Transferencia', 'Efectivo'].map(m => (
                                    <button key={m} onClick={() => setCheckoutForm({ ...checkoutForm, method: m })} className={`p-6 rounded-xl border transition font-bold flex flex-col items-center gap-2 ${checkoutForm.method === m ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-[#111115] border-white/10 text-slate-500 hover:bg-white/5'}`}>
                                        {m === 'Transferencia' ? <RefreshCw size={24}/> : <DollarSign size={24}/>} {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-[#111115] border border-white/10 rounded-[2rem] p-8 h-fit shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]"/>
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/5 flex items-center gap-2"><ShoppingBag size={20}/> Resumen</h3>
                            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                {cart.map(i => (
                                    <div key={i.id} className="flex justify-between text-sm items-center group">
                                        <span className="text-slate-300 group-hover:text-white transition"><span className="font-bold text-white bg-white/10 px-2 rounded mr-2">{i.qty}x</span> {i.name}</span>
                                        <span className="font-mono text-slate-400 font-bold">{formatMoney(i.price * (1 - (i.discount || 0) / 100) * i.qty)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-white/5 p-4 rounded-xl mb-6 border border-white/5">
                                <div className="flex gap-2 mb-2">
                                    <input id="couponInput" className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white flex-1 outline-none text-sm focus:border-cyan-500 transition" placeholder="Tengo un cupón..."/>
                                    <button onClick={() => { const val = document.getElementById('couponInput').value.toUpperCase(); const c = coupons.find(x => x.code === val); if (c) { setAppliedCoupon(c); showToast("Descuento aplicado", "Ahorras dinero en esta compra.", "success"); } else showToast("Cupón inválido", "El código no existe o expiró.", "error"); }} className="bg-white/10 hover:bg-white/20 px-4 rounded-lg font-bold text-sm text-white transition">Aplicar</button>
                                </div>
                                {appliedCoupon && <div className="flex justify-between text-green-400 text-xs font-bold px-1"><span>CUPÓN: {appliedCoupon.code}</span><span>-{appliedCoupon.type === 'fixed' ? formatMoney(appliedCoupon.value) : `${appliedCoupon.value}%`}</span></div>}
                            </div>

                            <div className="flex justify-between items-end border-t border-white/10 pt-6 mb-8">
                                <span className="text-slate-400 font-medium">Total a Pagar</span>
                                <span className="text-4xl font-black text-white tracking-tighter">
                                    {formatMoney(Math.max(0, cart.reduce((a, i) => a + (i.price * (1 - (i.discount || 0) / 100) * i.qty), 0) - (appliedCoupon ? (appliedCoupon.type === 'fixed' ? appliedCoupon.value : cart.reduce((a, i) => a + (i.price * i.qty), 0) * (appliedCoupon.value / 100)) : 0)))}
                                </span>
                            </div>
                            <button onClick={processOrder} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition flex justify-center items-center gap-2 text-lg">
                                <MessageCircle size={24}/> CONFIRMAR PEDIDO
                            </button>
                            <p className="text-center text-[10px] text-slate-600 mt-4 uppercase font-bold tracking-wider">Checkout Seguro • Encriptación SSL</p>
                        </div>
                    </div>
                )}
{/* VISTA: AUTH (LOGIN / REGISTRO) */}
                {view === 'auth' && (
                    <div className="min-h-[70vh] flex items-center justify-center animate-fade-in">
                        <div className="w-full max-w-md bg-[#0a0a0c] border border-white/10 p-8 rounded-[2rem] shadow-2xl relative">
                            <button onClick={() => setView('store')} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20}/></button>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-cyan-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400 border border-cyan-500/20"><LogIn size={32}/></div>
                                <h2 className="text-3xl font-black text-white">{authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                                <p className="text-slate-500 text-sm mt-2">Accede al ecosistema Sustore Enterprise.</p>
                            </div>
                            <form onSubmit={processAuth} className="space-y-4">
                                {authMode === 'register' && (
                                    <div className="bg-[#111115] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                        <User className="text-slate-500 ml-2" size={18}/>
                                        <input className="bg-transparent w-full text-white outline-none text-sm" placeholder="Nombre Completo" value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})}/>
                                    </div>
                                )}
                                <div className="bg-[#111115] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                    <MessageCircle className="text-slate-500 ml-2" size={18}/>
                                    <input className="bg-transparent w-full text-white outline-none text-sm" type="email" placeholder="Correo electrónico" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})}/>
                                </div>
                                <div className="bg-[#111115] border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                    <Lock className="text-slate-500 ml-2" size={18}/>
                                    <input className="bg-transparent w-full text-white outline-none text-sm" type="password" placeholder="Contraseña" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})}/>
                                </div>
                                <button type="submit" className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-xl transition shadow-lg shadow-cyan-500/20 flex justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin"/> : (authMode === 'login' ? 'INGRESAR' : 'REGISTRARSE')}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-sm text-slate-400 hover:text-white underline">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PANEL DE ADMINISTRACIÓN ENTERPRISE --- */}
                {view === 'admin' && user?.role === 'admin' && (
                    <div className="fixed inset-0 z-[200] bg-[#050505] flex text-white font-sans overflow-hidden">
                        {/* Sidebar Admin */}
                        <div className="w-64 bg-[#0a0a0c] border-r border-white/10 flex flex-col shadow-2xl z-20">
                            <div className="h-20 flex items-center justify-center border-b border-white/10 bg-[#111115]">
                                <Shield className="text-cyan-500 mr-2"/><span className="font-black text-lg tracking-widest">ADMIN PANEL</span>
                            </div>
                            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                                {[
                                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                                    { id: 'pos', label: 'Punto de Venta', icon: Calculator },
                                    { id: 'products', label: 'Inventario', icon: Package },
                                    { id: 'quotes', label: 'Presupuestos', icon: FileText },
                                    { id: 'orders', label: 'Pedidos Web', icon: ShoppingBag },
                                    { id: 'suppliers', label: 'Proveedores', icon: Truck },
                                    { id: 'coupons', label: 'Marketing', icon: Ticket },
                                    { id: 'expenses', label: 'Gastos', icon: PieChart },
                                    { id: 'settings', label: 'Configuración', icon: Settings },
                                ].map(item => (
                                    <button key={item.id} onClick={() => setAdminTab(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${adminTab === item.id ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                                        <item.icon size={18}/> {item.label}
                                    </button>
                                ))}
                            </nav>
                            <div className="p-4 border-t border-white/10">
                                <button onClick={() => setView('store')} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition font-bold">
                                    <LogOut size={18}/> Salir
                                </button>
                            </div>
                        </div>

                        {/* Contenido Admin */}
                        <div className="flex-1 flex flex-col h-full relative">
                            <header className="h-20 bg-[#0a0a0c]/80 backdrop-blur border-b border-white/10 flex justify-between items-center px-8">
                                <h2 className="text-2xl font-black capitalize flex items-center gap-3 text-white">{adminTab === 'pos' ? 'Terminal POS' : adminTab}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-bold text-white">{user.name}</p>
                                        <p className="text-xs text-cyan-500 font-mono">ADMINISTRADOR</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-black">{user.name.charAt(0)}</div>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto p-8 bg-[#050505] custom-scrollbar">
                                
                                {/* DASHBOARD */}
                                {adminTab === 'dashboard' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { title: "Ingresos", value: formatMoney(orders.reduce((a,b)=>a+(b.total||0),0)), icon: DollarSign, color: "text-green-400", bg: "bg-green-900/20" },
                                                { title: "Pedidos", value: orders.length, icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-900/20" },
                                                { title: "Productos", value: products.length, icon: Package, color: "text-purple-400", bg: "bg-purple-900/20" },
                                                { title: "Stock Bajo", value: products.filter(p=>p.stock<=5).length, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-900/20" }
                                            ].map((s,i) => (
                                                <div key={i} className="bg-[#0a0a0c] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                                                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition ${s.color}`}><s.icon size={48}/></div>
                                                    <div className="flex items-center gap-3 mb-4"><div className={`p-3 rounded-xl ${s.bg} ${s.color}`}><s.icon size={20}/></div><span className="text-slate-400 font-bold uppercase text-xs">{s.title}</span></div>
                                                    <p className="text-3xl font-black text-white">{s.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid lg:grid-cols-3 gap-8">
                                            <div className="lg:col-span-2 bg-[#0a0a0c] border border-white/10 p-6 rounded-2xl">
                                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="text-cyan-500"/> Últimos Pedidos</h3>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm text-slate-400">
                                                        <thead className="text-xs uppercase border-b border-white/10"><tr><th className="pb-2">ID</th><th className="pb-2">Cliente</th><th className="pb-2">Estado</th><th className="pb-2 text-right">Total</th></tr></thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {orders.slice(0,5).map(o=>(<tr key={o.id} className="hover:bg-white/5"><td className="py-3 font-mono">{o.orderId}</td><td className="py-3 text-white font-bold">{o.customer.name}</td><td className="py-3"><span className="bg-white/10 px-2 py-1 rounded text-xs">{o.status}</span></td><td className="py-3 text-right font-mono text-cyan-400">{formatMoney(o.total)}</td></tr>))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="bg-[#0a0a0c] border border-white/10 p-6 rounded-2xl">
                                                <h3 className="font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="text-red-500"/> Alertas de Stock</h3>
                                                <div className="space-y-3">
                                                    {products.filter(p=>p.stock<=5).slice(0,5).map(p=>(<div key={p.id} className="flex justify-between items-center bg-red-900/10 p-3 rounded-xl border border-red-500/20"><span className="text-white text-sm truncate w-32">{p.name}</span><span className="text-red-400 font-bold text-xs bg-red-900/20 px-2 py-1 rounded">Queda: {p.stock}</span></div>))}
                                                    {products.filter(p=>p.stock<=5).length===0 && <p className="text-slate-500 text-sm italic">Inventario saludable.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* POS SYSTEM */}
                                {adminTab === 'pos' && (
                                    <div className="flex h-full gap-6 -m-2">
                                        <div className="w-2/3 bg-[#0a0a0c] p-6 rounded-2xl border border-white/10 flex flex-col shadow-lg">
                                            <div className="flex gap-4 mb-4">
                                                <input className="flex-1 bg-[#111115] border border-white/10 rounded-xl p-4 text-lg text-white focus:border-cyan-500 outline-none" placeholder="🔍 Buscar producto..." value={posSearch} onChange={e=>setPosSearch(e.target.value)} autoFocus/>
                                                <input className="w-1/3 bg-[#111115] border border-white/10 rounded-xl p-4 text-white outline-none" placeholder="Cliente (Opcional)" value={posClient.name} onChange={e=>setPosClient({...posClient, name:e.target.value})}/>
                                            </div>
                                            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-4 pr-2 custom-scrollbar">
                                                {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase()) && p.stock > 0).map(p => (
                                                    <div key={p.id} onClick={()=>addToPos(p)} className="bg-[#16161a] p-4 rounded-xl border border-white/5 cursor-pointer hover:border-cyan-500 hover:bg-[#1a1a20] transition active:scale-95 text-center flex flex-col items-center justify-center h-40">
                                                        <p className="font-bold text-white text-sm line-clamp-2 mb-2">{p.name}</p>
                                                        <p className="text-cyan-400 font-black text-xl">{formatMoney(p.basePrice)}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Stock: {p.stock}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="w-1/3 bg-[#0a0a0c] p-6 rounded-2xl border border-white/10 flex flex-col shadow-2xl">
                                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                                                <h3 className="font-black text-xl text-white flex items-center gap-2"><Calculator className="text-cyan-500"/> Ticket</h3>
                                                <button onClick={()=>setPosCart([])} className="text-xs font-bold text-red-400 hover:text-white uppercase tracking-widest">Borrar</button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {posCart.map(i => (
                                                    <div key={i.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                                        <div className="flex-1 min-w-0 mr-2">
                                                            <p className="text-white text-sm font-bold truncate">{i.name}</p>
                                                            <p className="text-xs text-slate-500">{i.qty} x {formatMoney(i.basePrice)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-white font-mono font-bold">{formatMoney(i.basePrice * i.qty)}</p>
                                                            <button onClick={()=>setPosCart(posCart.filter(x=>x.id!==i.id))} className="text-red-400 text-xs hover:underline">Quitar</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/10 bg-cyan-900/10 -mx-6 -mb-6 p-6 rounded-b-2xl">
                                                <div className="flex justify-between items-end mb-4">
                                                    <span className="text-cyan-500 font-bold uppercase tracking-widest text-sm">Total a Cobrar</span>
                                                    <span className="text-4xl font-black text-white">{formatMoney(posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0))}</span>
                                                </div>
                                                <button onClick={processPosSale} className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2">
                                                    <DollarSign size={24} strokeWidth={3}/> COBRAR
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* INVENTARIO */}
                                {adminTab === 'products' && (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="relative w-96">
                                                <Search className="absolute left-4 top-3 text-slate-500 w-4"/><input className="w-full bg-[#111115] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500 transition" placeholder="Buscar producto..." onChange={e=>setPosSearch(e.target.value)}/>
                                            </div>
                                            <button onClick={()=>{setTempProduct({}); setModalConfig({active:true, type:'product'})}} className="bg-cyan-500 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-400 transition shadow-lg"><FilePlus size={20}/> Nuevo Producto</button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p=>(
                                                <div key={p.id} className="bg-[#0a0a0c] border border-white/10 p-4 rounded-2xl group hover:border-cyan-500/30 transition relative">
                                                    <div className="h-40 bg-[#16161a] rounded-xl mb-3 p-4 flex items-center justify-center"><img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition"/></div>
                                                    <p className="font-bold text-white text-lg truncate">{p.name}</p>
                                                    <p className="text-cyan-400 font-black text-xl">{formatMoney(p.basePrice)}</p>
                                                    <p className="text-xs text-slate-500 font-mono mt-1">Stock: {p.stock} | Desc: {p.discount}%</p>
                                                    <button onClick={()=>{setTempProduct(p); setModalConfig({active:true, type:'product'})}} className="absolute top-4 right-4 bg-slate-800 p-2 rounded-lg text-cyan-400 opacity-0 group-hover:opacity-100 transition hover:bg-slate-700"><Edit size={16}/></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PRESUPUESTOS (QUOTES) */}
                                {adminTab === 'quotes' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-white/10">
                                            <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Generar Nuevo Presupuesto</h3>
                                            <div className="flex gap-4 mb-4">
                                                <input className="bg-[#111115] border border-white/10 p-3 rounded-lg text-white flex-1" placeholder="Nombre Cliente" value={quoteClient.name} onChange={e=>setQuoteClient({...quoteClient, name:e.target.value})}/>
                                                <input className="bg-[#111115] border border-white/10 p-3 rounded-lg text-white flex-1" placeholder="Teléfono" value={quoteClient.phone} onChange={e=>setQuoteClient({...quoteClient, phone:e.target.value})}/>
                                            </div>
                                            <div className="flex gap-4 mb-4">
                                                <input className="bg-[#111115] border border-white/10 p-3 rounded-lg text-white w-full" placeholder="Buscar producto para agregar..." onChange={e=>setPosSearch(e.target.value)}/>
                                                <div className="flex items-center gap-2 overflow-x-auto flex-1">{products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).slice(0,3).map(p=><button key={p.id} onClick={()=>setQuoteCart([...quoteCart, {...p, qty:1}])} className="bg-white/10 px-3 py-1 rounded text-xs text-white whitespace-nowrap hover:bg-white/20">+ {p.name}</button>)}</div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl mb-4 space-y-2 max-h-40 overflow-y-auto">{quoteCart.map((i,idx)=><div key={idx} className="flex justify-between text-sm text-slate-300 border-b border-white/5 pb-1"><span>{i.name}</span><span>{formatMoney(i.basePrice)}</span></div>)}</div>
                                            <button onClick={saveQuote} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg">Guardar Presupuesto</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            {quotes.map(q => (
                                                <div key={q.id} className="bg-[#0a0a0c] p-6 rounded-2xl border border-white/10 relative group hover:border-cyan-500/30 transition">
                                                    <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-white text-lg">{q.clientName}</h3><span className="text-[10px] bg-white/10 px-2 py-1 rounded text-slate-400">PENDIENTE</span></div>
                                                    <p className="text-slate-500 text-sm mb-4">Tel: {q.clientPhone}</p>
                                                    <div className="flex justify-between items-center pt-4 border-t border-white/10"><span className="font-black text-cyan-400 text-xl">{formatMoney(q.total)}</span><button className="text-red-400 p-2 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition" onClick={()=>handleAdminAction('delete','quotes',q)}><Trash2 size={18}/></button></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PROVEEDORES Y CUPONES */}
                                {(adminTab === 'suppliers' || adminTab === 'coupons') && (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-center mb-8"><h2 className="text-3xl font-black text-white capitalize">{adminTab === 'suppliers' ? 'Proveedores' : 'Cupones'}</h2><button onClick={() => { adminTab === 'suppliers' ? setTempSupplier({}) : setTempCoupon({}); setModalConfig({ active: true, type: adminTab === 'suppliers' ? 'supplier' : 'coupon' }) }} className="bg-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-cyan-500 transition shadow-lg">Crear Nuevo</button></div>
                                        <div className="grid grid-cols-3 gap-6">
                                            {adminTab === 'suppliers' ? suppliers.map(s => (<div key={s.id} className="bg-[#0a0a0c] p-8 rounded-2xl border border-white/10 group relative"><h3 className="font-bold text-white text-xl mb-1">{s.name}</h3><p className="text-slate-400 text-sm mb-4">{s.phone}</p><div className="pt-4 border-t border-white/10 flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Deuda</span><span className="text-red-400 font-black text-lg">{formatMoney(s.debt)}</span></div><button className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition" onClick={()=>handleAdminAction('delete','suppliers',s)}><Trash2 size={18}/></button></div>)) : coupons.map(c => (<div key={c.id} className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 p-8 rounded-2xl relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-10"><Ticket className="w-20 h-20 text-purple-500"/></div><h3 className="font-black text-white text-3xl tracking-widest mb-2">{c.code}</h3><p className="text-purple-400 font-bold text-lg">{c.value}{c.type === 'fixed' ? '$' : '%'} OFF</p><button className="absolute bottom-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 transition" onClick={()=>handleAdminAction('delete','coupons',c)}><Trash2 size={18}/></button></div>))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALES DE ADMINISTRACIÓN */}
                <Modal isOpen={modalConfig.active} onClose={() => setModalConfig({ active: false })} title={modalConfig.type === 'product' ? 'Producto' : modalConfig.type === 'supplier' ? 'Proveedor' : 'Cupón'}>
                    <div className="space-y-4">
                        {modalConfig.type === 'product' && (
                            <>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" placeholder="Nombre del Producto" value={tempProduct.name || ''} onChange={e => setTempProduct({ ...tempProduct, name: e.target.value })}/>
                                <div className="flex gap-4">
                                    <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" type="number" placeholder="Precio ($)" value={tempProduct.basePrice || ''} onChange={e => setTempProduct({ ...tempProduct, basePrice: e.target.value })}/>
                                    <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" type="number" placeholder="Stock" value={tempProduct.stock || ''} onChange={e => setTempProduct({ ...tempProduct, stock: e.target.value })}/>
                                </div>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" placeholder="Categoría" value={tempProduct.category || ''} onChange={e => setTempProduct({ ...tempProduct, category: e.target.value })}/>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" placeholder="URL Imagen" value={tempProduct.image || ''} onChange={e => setTempProduct({ ...tempProduct, image: e.target.value })}/>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" type="number" placeholder="Descuento %" value={tempProduct.discount || ''} onChange={e => setTempProduct({ ...tempProduct, discount: e.target.value })}/>
                                <button onClick={() => handleAdminAction('save', 'products', tempProduct)} className="w-full py-3 bg-cyan-600 rounded-xl font-bold text-white mt-4 shadow-lg">GUARDAR PRODUCTO</button>
                            </>
                        )}
                        {modalConfig.type === 'supplier' && (
                            <>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" placeholder="Empresa" value={tempSupplier.name || ''} onChange={e => setTempSupplier({ ...tempSupplier, name: e.target.value })}/>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" placeholder="Teléfono" value={tempSupplier.phone || ''} onChange={e => setTempSupplier({ ...tempSupplier, phone: e.target.value })}/>
                                <input className="w-full bg-[#16161a] p-3 rounded-lg text-white border border-white/10" type="number" placeholder="Deuda Inicial ($)" value={tempSupplier.debt || ''} onChange={e => setTempSupplier({ ...tempSupplier, debt: e.target.value })}/>
                                <button onClick={() => handleAdminAction('save', 'suppliers', tempSupplier)} className="w-full py-3 bg-cyan-600 rounded-xl font-bold text-white mt-4 shadow-lg">GUARDAR PROVEEDOR</button>
                            </>
                        )}
                        {modalConfig.type === 'coupon' && (
                            <>
                                <input className="w-full bg-[#16161a] p-4 rounded-xl text-white border border-white/10 uppercase text-center font-black tracking-widest text-xl" placeholder="CÓDIGO (EJ: SALE20)" value={tempCoupon.code || ''} onChange={e => setTempCoupon({ ...tempCoupon, code: e.target.value })}/>
                                <div className="flex gap-4">
                                    <input className="flex-1 bg-[#16161a] p-3 rounded-lg text-white border border-white/10" type="number" placeholder="Valor" value={tempCoupon.value || ''} onChange={e => setTempCoupon({ ...tempCoupon, value: e.target.value })}/>
                                    <select className="flex-1 bg-[#16161a] p-3 rounded-lg text-white border border-white/10" value={tempCoupon.type || 'percentage'} onChange={e => setTempCoupon({ ...tempCoupon, type: e.target.value })}>
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed">Fijo ($)</option>
                                    </select>
                                </div>
                                <button onClick={() => handleAdminAction('save', 'coupons', tempCoupon)} className="w-full py-3 bg-purple-600 rounded-xl font-bold text-white mt-4 shadow-lg">ACTIVAR CUPÓN</button>
                            </>
                        )}
                    </div>
                </Modal>
            </main>
        </div>
    );
}

// Inicialización del React Root
const root = createRoot(document.getElementById('root'));
root.render(<App />);
