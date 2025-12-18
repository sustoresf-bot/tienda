import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, 
    Minus, Plus, Trash2, Edit, RefreshCw, LogIn, LogOut, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, 
    Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, 
    TrendingUp, Printer, Phone, Calendar, ChevronRight, Lock, Loader2, Filter, 
    AlertTriangle, Save, Copy, ExternalLink, Shield 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, updateDoc, 
    doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment 
} from 'firebase/firestore';

// --- 1. CONFIGURACIÓN FIREBASE ---
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

const defaultSettings = {
    storeName: "SUSTORE", currency: "$", 
    adminEmails: ["lautarocorazza63@gmail.com"], // Lista de admins
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"],
    whatsappPhone: "5493425123456", instagramUser: "sustore_sf"
};

// --- 2. UTILIDADES ---
const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// --- 3. COMPONENTES UI REUTILIZABLES ---

const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
    const types = { 
        success: 'border-l-4 border-green-500 text-green-400 bg-[#0a0a0c]', 
        error: 'border-l-4 border-red-500 text-red-400 bg-[#0a0a0c]', 
        info: 'border-l-4 border-primary text-primary bg-[#0a0a0c]' 
    };
    return (
        <div className={`p-4 rounded-r-lg shadow-2xl flex items-center gap-3 animate-fade-in mb-3 border border-white/5 relative z-[10000] ${types[type]}`}>
            {type === 'success' && <CheckCircle className="w-5 h-5"/>}
            {type === 'error' && <X className="w-5 h-5"/>}
            {type === 'info' && <Info className="w-5 h-5"/>}
            <p className="text-sm font-medium text-white">{message}</p>
        </div>
    );
};

const ProductCard = ({ product, onAdd }) => {
    const isOutOfStock = product.stock <= 0;
    const finalPrice = product.basePrice * (1 - (product.discount || 0) / 100);
    return (
        <div className="glass-card rounded-2xl overflow-hidden group flex flex-col h-full relative hover:border-primary/50 transition-all duration-300">
            <div className="relative aspect-[4/3] bg-[#050505] p-6 flex items-center justify-center overflow-hidden">
                <img src={product.image || 'https://via.placeholder.com/300'} alt={product.name} className={`w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
                {product.discount > 0 && !isOutOfStock && <span className="absolute top-3 left-3 bg-primary text-black text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide">-{product.discount}% OFF</span>}
                {isOutOfStock && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center"><span className="border border-red-500 text-red-500 px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase bg-red-500/10">Agotado</span></div>}
            </div>
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{product.category || 'General'}</span></div>
                <h3 className="text-white font-bold text-lg leading-snug mb-4 group-hover:text-primary transition-colors">{product.name}</h3>
                <div className="mt-auto flex items-end justify-between border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                        {product.discount > 0 && <span className="text-xs text-gray-500 line-through mb-0.5">{formatMoney(product.basePrice)}</span>}
                        <span className="text-xl font-bold text-white tracking-tight">{formatMoney(finalPrice)}</span>
                    </div>
                    <button onClick={() => !isOutOfStock && onAdd(product)} disabled={isOutOfStock} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOutOfStock ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white text-black hover:bg-primary hover:text-white hover:scale-110 shadow-lg'}`}><Plus className="w-5 h-5 stroke-[3]"/></button>
                </div>
            </div>
        </div>
    );
};

const CartDrawer = ({ isOpen, onClose, cart, updateQty, total, onCheckout }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-[#0a0a0c] border-l border-white/10 h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#050505]">
                    <h2 className="text-xl font-black text-white flex items-center gap-3"><ShoppingBag className="text-primary w-6 h-6"/> Tu Pedido</h2>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? <div className="text-center py-20 text-gray-500"><ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20"/><p>El carrito está vacío</p></div> : cart.map(item => (
                        <div key={item.product.id} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="w-20 h-20 bg-[#050505] rounded-lg p-2 flex items-center justify-center flex-shrink-0"><img src={item.product.image} className="max-w-full max-h-full object-contain"/></div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div><h4 className="font-bold text-white text-sm truncate">{item.product.name}</h4><p className="text-primary font-bold text-sm mt-1">{formatMoney(item.product.basePrice * (1 - (item.product.discount || 0) / 100))}</p></div>
                                <div className="flex justify-between items-end"><div className="flex items-center gap-3 bg-black/40 rounded-lg p-1"><button onClick={() => updateQty(item.product, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"><Minus className="w-3 h-3"/></button><span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span><button onClick={() => updateQty(item.product, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"><Plus className="w-3 h-3"/></button></div><button onClick={() => updateQty(item.product, -item.quantity)} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-6 bg-[#050505] border-t border-white/5">
                    <div className="flex justify-between items-end mb-6"><span className="text-gray-400 text-sm">Total Estimado</span><span className="text-3xl font-black text-white">{formatMoney(total)}</span></div>
                    <button onClick={() => { onClose(); onCheckout(); }} disabled={cart.length === 0} className="w-full py-4 btn btn-primary rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2">Iniciar Compra <ArrowRight className="w-5 h-5"/></button>
                </div>
            </div>
        </div>
    );
};

const Sidebar = ({ isOpen, onClose, setView, user, logout }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-80 bg-[#0a0a0c] h-full shadow-2xl border-r border-white/10 flex flex-col animate-slide-in-left p-6">
                <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-black text-white flex items-center gap-2"><Zap className="text-primary fill-current"/> SUSTORE</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X className="w-6 h-6"/></button></div>
                <nav className="space-y-2 flex-1">
                    <button onClick={()=>{setView('store'); onClose()}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white font-bold flex items-center gap-3"><Home className="w-5 h-5"/> Inicio</button>
                    {user ? (
                         <>
                            <button onClick={()=>{setView('profile'); onClose()}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white font-bold flex items-center gap-3"><User className="w-5 h-5"/> Mi Perfil</button>
                            {user.role === 'admin' && (
                                <div className="pt-4 mt-4 border-t border-white/10">
                                    <p className="px-4 text-xs font-bold text-gray-500 uppercase mb-2">Administración</p>
                                    <button onClick={()=>{setView('admin'); onClose()}} className="w-full text-left px-4 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold flex items-center gap-3"><LayoutDashboard className="w-5 h-5"/> Panel Admin</button>
                                </div>
                            )}
                         </>
                    ) : ( <button onClick={()=>{setView('auth'); onClose()}} className="w-full text-left px-4 py-3 rounded-xl bg-white text-black font-bold flex items-center gap-3 mt-4"><LogIn className="w-5 h-5"/> Iniciar Sesión</button> )}
                </nav>
                {user && <button onClick={()=>{logout(); onClose()}} className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-900/10 text-red-400 hover:text-red-300 font-bold flex items-center gap-3 mt-auto"><LogOut className="w-5 h-5"/> Cerrar Sesión</button>}
            </div>
        </div>
    );
};

// --- 4. APP PRINCIPAL ---
function App() {
    // ESTADOS GLOBALES
    const [view, setView] = useState('store');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toasts, setToasts] = useState([]);
    
    // DATOS DE NEGOCIO
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart_v2')) || []);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // ESTADOS DE INTERFAZ
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todas');
    
    // AUTH & CHECKOUT
    const [authMode, setAuthMode] = useState('login');
    const [authData, setAuthData] = useState({ email: '', password: '', name: '' });
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', phone: '', payment: 'Transferencia' });
    // --- 5. EFECTOS (DATA FETCHING) ---
    useEffect(() => {
        const init = async () => {
            // Cargar usuario persistente
            try {
                const savedUser = localStorage.getItem('nexus_user_data');
                if (savedUser) setUser(JSON.parse(savedUser));
            } catch (e) { console.error("Error cargando usuario", e); }

            // Login Anónimo para leer base de datos
            await signInAnonymously(auth);

            // Listeners en Tiempo Real (Firebase)
            const unsubProducts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => {
                setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
                setIsLoading(false);
            });
            
            const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => {
                const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
                setOrders(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
            });

            // Listeners Admin (Proveedores, Gastos, Cupones, Settings)
            const unsubSuppliers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d => ({id: d.id, ...d.data()}))));
            const unsubExpenses = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d => ({id: d.id, ...d.data()}))));
            const unsubQuotes = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), s => setQuotes(s.docs.map(d => ({id: d.id, ...d.data()}))));
            const unsubCoupons = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d => ({id: d.id, ...d.data()}))));
            const unsubSettings = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => {
                if(!s.empty) setSettings({...defaultSettings, ...s.docs[0].data()});
            });

            return () => { 
                unsubProducts(); unsubOrders(); unsubSuppliers(); 
                unsubExpenses(); unsubQuotes(); unsubCoupons(); unsubSettings();
            };
        };
        init();
    }, []);

    // Persistir carrito
    useEffect(() => localStorage.setItem('cart_v2', JSON.stringify(cart)), [cart]);

    // --- 6. LÓGICA DE NEGOCIO ---
    
    const showToast = (msg, type='info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message: msg, type }]);
    };

    const addToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(i => i.product.id === product.id);
            if (exists) {
                if (exists.quantity >= product.stock) { showToast('Stock máximo alcanzado', 'error'); return prev; }
                showToast('Cantidad actualizada', 'success');
                return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            showToast('Producto agregado', 'success');
            return [...prev, { product, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const updateCart = (product, delta) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === product.id) {
                const newQty = Math.max(0, Math.min(product.stock, item.quantity + delta));
                return newQty === 0 ? null : { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (authMode === 'register') {
                const q = query(usersRef, where('email', '==', authData.email));
                const snap = await getDocs(q);
                if (!snap.empty) throw new Error("Email ya registrado");
                
                const newUser = { ...authData, role: 'user', createdAt: new Date().toISOString() };
                const ref = await addDoc(usersRef, newUser);
                const finalUser = { ...newUser, id: ref.id };
                
                setUser(finalUser);
                localStorage.setItem('nexus_user_data', JSON.stringify(finalUser));
                showToast(`¡Bienvenido, ${authData.name}!`, 'success');
            } else {
                const q = query(usersRef, where('email', '==', authData.email), where('password', '==', authData.password));
                const snap = await getDocs(q);
                if (snap.empty) throw new Error("Credenciales incorrectas");
                
                const foundUser = { ...snap.docs[0].data(), id: snap.docs[0].id };
                setUser(foundUser);
                localStorage.setItem('nexus_user_data', JSON.stringify(foundUser));
                showToast(`¡Hola de nuevo, ${foundUser.name}!`, 'success');
            }
            setView('store');
        } catch (err) { showToast(err.message, 'error'); }
        setIsLoading(false);
    };

    const handleCheckout = async () => {
        if (!checkoutData.address || !checkoutData.city || !checkoutData.phone) return showToast("Por favor completa los datos de envío", "error");
        
        setIsLoading(true);
        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;
            const total = cart.reduce((acc, item) => acc + (item.product.basePrice * (1 - (item.product.discount || 0)/100) * item.quantity), 0);
            
            const newOrder = {
                orderId,
                userId: user?.id || 'guest',
                customer: {
                    name: user?.name || authData.name || 'Invitado',
                    email: user?.email || authData.email || '-',
                    phone: checkoutData.phone
                },
                shipping: { ...checkoutData },
                items: cart.map(i => ({
                    id: i.product.id,
                    name: i.product.name,
                    qty: i.quantity,
                    price: i.product.basePrice * (1 - (i.product.discount || 0)/100)
                })),
                total,
                status: 'Pendiente',
                date: new Date().toISOString(),
                paymentMethod: checkoutData.payment,
                origin: 'web'
            };

            // 1. Guardar Orden
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);

            // 2. Actualizar Stock
            const batch = writeBatch(db);
            cart.forEach(item => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                batch.update(ref, { stock: increment(-item.quantity) });
            });
            await batch.commit();

            // 3. Redirigir a WhatsApp
            const message = `*¡Hola Sustore! 👋 Quiero confirmar mi pedido.*\n\n🆔 *Pedido:* #${orderId}\n👤 *Cliente:* ${newOrder.customer.name}\n\n🛒 *Productos:*\n${cart.map(i => `▫ ${i.quantity}x ${i.product.name}`).join('\n')}\n\n💰 *Total: ${formatMoney(total)}*\n\n📍 *Envío:* ${checkoutData.address}, ${checkoutData.city}\n💳 *Pago:* ${checkoutData.payment}`;
            
            const wspNumber = settings.whatsappPhone || "5493425123456";
            window.open(`https://wa.me/${wspNumber}?text=${encodeURIComponent(message)}`, '_blank');

            setCart([]);
            setView('store');
            showToast("¡Pedido realizado con éxito!", "success");

        } catch (error) {
            console.error(error);
            showToast("Error al procesar el pedido", "error");
        }
        setIsLoading(false);
    };

    // --- 7. VISTAS Y RENDERIZADO ---
    
    // Header Component
    const Header = () => (
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Botón Menú Hamburguesa */}
                    <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-full md:hidden">
                        <Menu className="w-6 h-6 text-white"/>
                    </button>
                    
                    <div onClick={() => setView('store')} className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-10 h-10 bg-gradient-to-tr from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition">
                            <Zap className="text-black w-6 h-6 fill-black"/>
                        </div>
                        <span className="font-black text-2xl tracking-tight text-white group-hover:text-primary transition hidden md:block">{settings.storeName}</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center bg-[#18181b] border border-white/10 rounded-full px-5 py-2.5 w-96 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <Search className="w-4 h-4 text-gray-400 mr-3"/>
                    <input 
                        className="bg-transparent outline-none text-sm w-full text-white placeholder-gray-500 font-medium" 
                        placeholder="Buscar productos..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => setIsCartOpen(true)} className="relative p-3 hover:bg-white/5 rounded-full transition group">
                        <ShoppingBag className="w-6 h-6 text-gray-400 group-hover:text-white transition"/>
                        {cart.length > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse-subtle">
                                {cart.length}
                            </span>
                        )}
                    </button>

                    {user ? (
                        <div onClick={() => setView('profile')} className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 pr-4 rounded-full border border-transparent hover:border-white/10 transition">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{user.name.charAt(0)}</div>
                            <span className="text-sm font-bold">{user.name.split(' ')[0]}</span>
                        </div>
                    ) : (
                        <button onClick={() => setView('auth')} className="hidden md:flex btn btn-primary px-6 py-2 rounded-full text-sm shadow-lg shadow-primary/10">
                            Ingresar
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );

    // VISTA: STORE (Catálogo)
    if (view === 'store') {
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(search.toLowerCase()) && 
            (category === 'Todas' || p.category === category)
        );
        const categories = ['Todas', ...new Set(products.map(p => p.category))];

        return (
            <div className="min-h-screen bg-bg-main pb-20">
                <Header />
                <div className="pt-28 px-4 max-w-7xl mx-auto space-y-12">
                    
                    {/* Hero Banner */}
                    <div className="relative rounded-[2rem] overflow-hidden h-[400px] md:h-[500px] border border-white/10 group shadow-2xl">
                        <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-1000"/>
                        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent flex flex-col justify-center px-8 md:px-16">
                            <div className="max-w-2xl animate-fade-in space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Nueva Colección</span>
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9]">
                                    FUTURO <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">AHORA</span>
                                </h1>
                                <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="btn btn-primary px-8 py-4 rounded-xl text-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transition-all">
                                    Ver Catálogo <ArrowRight className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div id="catalog" className="flex flex-col md:flex-row justify-between items-center gap-6 sticky top-24 z-30 py-4 bg-bg-main/95 backdrop-blur-xl border-y border-white/5 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:backdrop-blur-0 md:border-none md:static">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setCategory(cat)} 
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${category === cat ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'bg-[#18181b] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {isLoading ? (
                        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin"/></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
                            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                            <h3 className="text-xl font-bold text-white">No hay productos</h3>
                            <p className="text-gray-500 mt-2">Intenta con otra categoría o búsqueda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
                        </div>
                    )}
                </div>
                
                <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQty={updateCart} total={cart.reduce((a,i) => a + (i.product.basePrice * (1-(i.product.discount||0)/100) * i.quantity), 0)} onCheckout={() => setView('checkout')} />
                <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} setView={setView} user={user} logout={() => { setUser(null); localStorage.removeItem('nexus_user_data'); }} />
            </div>
        );
    }

    // VISTA: CHECKOUT
    if (view === 'checkout') {
        const total = cart.reduce((a,i) => a + (i.product.basePrice * (1-(i.product.discount||0)/100) * i.quantity), 0);
        return (
            <div className="min-h-screen bg-bg-main p-4 md:p-8 animate-fade-in">
                <div className="max-w-5xl mx-auto pt-10">
                    <button onClick={() => setView('store')} className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 font-bold transition"><ArrowLeft className="w-5 h-5"/> Volver a la tienda</button>
                    
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Formulario */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3"><Truck className="text-primary"/> Envío</h2>
                                <p className="text-gray-500 mb-6">Completa tus datos para coordinar la entrega.</p>
                                <div className="space-y-4">
                                    <input className="w-full input-tech p-4" placeholder="Nombre Completo" value={user?.name || authData.name} onChange={e => !user && setAuthData({...authData, name: e.target.value})} disabled={!!user} />
                                    <input className="w-full input-tech p-4" placeholder="Teléfono / WhatsApp" value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                                    <input className="w-full input-tech p-4" placeholder="Dirección de Entrega" value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                                    <input className="w-full input-tech p-4" placeholder="Ciudad / Localidad" value={checkoutData.city} onChange={e => setCheckoutData({...checkoutData, city: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Wallet className="text-primary"/> Pago</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Transferencia', 'Efectivo'].map(m => (
                                        <div 
                                            key={m} 
                                            onClick={() => setCheckoutData({...checkoutData, payment: m})}
                                            className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 ${checkoutData.payment === m ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-[#18181b] border-white/10 text-gray-500 hover:border-white/30'}`}
                                        >
                                            <span className="font-bold text-sm uppercase tracking-wider">{m}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="bg-[#0a0a0c] border border-white/10 rounded-[2rem] p-8 h-fit sticky top-8 shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-6 pb-4 border-b border-white/10">Resumen del Pedido</h3>
                            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {cart.map(item => (
                                    <div key={item.product.id} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white/5 rounded-md flex items-center justify-center text-xs font-bold text-gray-400">{item.quantity}x</div>
                                            <span className="text-gray-300 font-medium">{item.product.name}</span>
                                        </div>
                                        <span className="text-white font-bold">{formatMoney(item.product.basePrice * (1-(item.product.discount||0)/100) * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="space-y-3 pt-6 border-t border-white/10 mb-8">
                                <div className="flex justify-between items-end pt-4">
                                    <span className="text-white font-bold text-lg">Total Final</span>
                                    <span className="text-4xl font-black text-primary tracking-tight">{formatMoney(total)}</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleCheckout} 
                                disabled={isLoading} 
                                className="w-full py-5 btn-primary rounded-xl text-lg font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin w-6 h-6"/> : <><MessageCircle className="w-6 h-6"/> Confirmar por WhatsApp</>}
                            </button>
                            <p className="text-center text-xs text-gray-600 mt-4">Al confirmar, serás redirigido a WhatsApp con el detalle.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
// --- 7. VISTA: AUTH (Login/Registro) ---
    if (view === 'auth') {
        return (
            <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
                <div className="glass p-10 rounded-[2.5rem] w-full max-w-md relative border border-white/10 shadow-2xl animate-fade-in">
                    <button onClick={()=>setView('store')} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X className="w-6 h-6"/></button>
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                            <Zap className="w-8 h-8 fill-current"/>
                        </div>
                        <h2 className="text-3xl font-black text-white">{authMode==='login'?'Bienvenido':'Crear Cuenta'}</h2>
                        <p className="text-gray-500 text-sm mt-2">Gestiona tus pedidos y perfil.</p>
                    </div>
                    
                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode==='register' && (
                            <div className="animate-fade-in">
                                <input className="w-full p-4 bg-[#121214] border border-white/10 rounded-xl text-white focus:border-primary transition outline-none" placeholder="Nombre Completo" required value={authData.name} onChange={e=>setAuthData({...authData,name:e.target.value})}/>
                            </div>
                        )}
                        <input className="w-full p-4 bg-[#121214] border border-white/10 rounded-xl text-white focus:border-primary transition outline-none" type="email" placeholder="Correo electrónico" required value={authData.email} onChange={e=>setAuthData({...authData,email:e.target.value})}/>
                        <input className="w-full p-4 bg-[#121214] border border-white/10 rounded-xl text-white focus:border-primary transition outline-none" type="password" placeholder="Contraseña" required value={authData.password} onChange={e=>setAuthData({...authData,password:e.target.value})}/>
                        
                        <button type="submit" disabled={isLoading} className="w-full py-4 btn-primary rounded-xl font-bold text-lg shadow-lg mt-2 flex justify-center items-center gap-2 hover:scale-[1.02] transition-transform">
                            {isLoading ? <Loader2 className="animate-spin w-5 h-5"/> : (authMode==='login'?'Ingresar':'Registrarse')}
                        </button>
                    </form>
                    
                    <button onClick={()=>setAuthMode(authMode==='login'?'register':'login')} className="w-full text-center mt-6 text-sm text-gray-400 hover:text-white underline decoration-gray-700 underline-offset-4 transition">
                        {authMode==='login'?'¿No tienes cuenta? Regístrate':'¿Ya tienes cuenta? Ingresa'}
                    </button>
                </div>
            </div>
        );
    }

    // --- 8. VISTA: PERFIL ---
    if (view === 'profile' && user) {
        const myOrders = orders.filter(o => o.userId === user.id);
        return (
            <div className="min-h-screen pb-20 pt-24 px-4 max-w-5xl mx-auto animate-fade-in">
                <button onClick={()=>setView('store')} className="mb-8 text-gray-400 hover:text-white flex items-center gap-2 font-bold transition group"><ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition"/> Volver a la tienda</button>
                
                <div className="glass p-8 rounded-[2.5rem] border border-white/10 mb-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl border-4 border-[#0a0a0c]">
                        {user.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-4xl font-black text-white mb-2">{user.name}</h1>
                        <p className="text-gray-400 font-mono text-sm bg-white/5 inline-block px-4 py-1 rounded-full border border-white/5">{user.email}</p>
                    </div>
                    <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setUser(null); setView('store')}} className="px-6 py-3 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 hover:text-red-300 transition flex items-center gap-2 font-bold">
                        <LogOut className="w-5 h-5"/> Cerrar Sesión
                    </button>
                </div>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Package className="text-primary"/> Mis Pedidos</h2>
                <div className="space-y-4">
                    {myOrders.length === 0 ? (
                        <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-3"/>
                            <p className="text-gray-500 font-bold">Aún no has realizado pedidos.</p>
                        </div>
                    ) : (
                        myOrders.map(o => (
                            <div key={o.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5 hover:border-primary/30 transition group">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${o.status==='Realizado'?'bg-green-500/10 text-green-500':'bg-yellow-500/10 text-yellow-500'}`}>
                                        <Package className="w-6 h-6"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">Pedido #{o.orderId}</p>
                                        <p className="text-xs text-gray-500">{formatDate(o.date)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 mb-1">{o.items.length} productos</p>
                                        <p className="font-black text-white text-xl">{formatMoney(o.total)}</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${o.status==='Realizado'?'bg-green-500/10 text-green-400 border-green-500/20':'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // --- 9. VISTA: PANEL ADMIN (Sub-Componente) ---
    // Delegamos la lógica admin a un componente separado para evitar errores de Hooks
    if (view.startsWith('admin')) {
        if (user?.role !== 'admin') { setView('store'); return null; }
        return <AdminPanel user={user} setView={setView} products={products} orders={orders} suppliers={suppliers} showToast={showToast} currentView={view} />;
    }

    // --- 10. CIERRE APP ---
    return (
        <div className="fixed bottom-6 right-6 z-[10001] space-y-2 flex flex-col items-end pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />
                </div>
            ))}
        </div>
    );
} // Fin App

// --- COMPONENTE PANEL DE ADMINISTRACIÓN ---
function AdminPanel({ user, setView, products, orders, suppliers, showToast, currentView }) {
    const tab = currentView === 'admin' ? 'dashboard' : currentView.replace('admin_', '');
    
    // Estados exclusivos de Admin
    const [editingProd, setEditingProd] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [tempProd, setTempProd] = useState({ name: '', basePrice: '', stock: '', category: '', image: '', discount: 0 });
    const [tempSupplier, setTempSupplier] = useState({ name: '', phone: '', debt: 0 });
    const [posCart, setPosCart] = useState([]);
    const [posSearch, setPosSearch] = useState('');

    // Acciones
    const saveProduct = async () => {
        if (!tempProd.name || !tempProd.basePrice) return showToast("Faltan datos", "error");
        const d = { ...tempProd, basePrice: Number(tempProd.basePrice), stock: Number(tempProd.stock), discount: Number(tempProd.discount) };
        try {
            if (editingProd) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProd.id), d);
            else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...d, createdAt: new Date().toISOString() });
            setShowModal(false); setEditingProd(null); setTempProd({ name: '', basePrice: '', stock: '', category: '', image: '', discount: 0 }); 
            showToast("Producto guardado", "success");
        } catch(e) { showToast("Error al guardar", "error"); }
    };

    const saveSupplier = async () => {
        if(!tempSupplier.name) return showToast("Falta nombre", "error");
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), tempSupplier);
        setTempSupplier({ name: '', phone: '', debt: 0 }); setShowSupplierModal(false);
        showToast("Proveedor agregado", "success");
    };

    const confirmPosSale = async () => {
         if(posCart.length === 0) return;
         const total = posCart.reduce((a,i) => a + (i.basePrice * i.qty), 0);
         await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), { 
             orderId: `POS-${Date.now().toString().slice(-6)}`, 
             userId: 'ADMIN', 
             customer: { name: 'Venta Mostrador', phone: '-', email: '-' }, 
             items: posCart.map(i => ({ id:i.id, name:i.name, qty:i.qty, price:i.basePrice })), 
             total, status: 'Realizado', date: new Date().toISOString(), paymentMethod: 'Efectivo', origin: 'POS'
         });
         const batch = writeBatch(db); 
         posCart.forEach(i => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id), { stock: increment(-i.qty) })); 
         await batch.commit();
         setPosCart([]); showToast("Venta registrada", "success");
    };

    return (
        <div className="min-h-screen bg-[#050505] flex text-white font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className="w-20 lg:w-64 bg-black border-r border-white/10 flex flex-col fixed h-full z-40 lg:static transition-all duration-300">
                <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10">
                    <Zap className="w-8 h-8 text-primary"/>
                    <span className="hidden lg:block font-black text-xl ml-3 tracking-tight">ADMIN<span className="text-primary">PANEL</span></span>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, l: 'Dashboard' },
                        { id: 'products', icon: Package, l: 'Inventario' },
                        { id: 'pos', icon: Zap, l: 'Punto de Venta' },
                        { id: 'orders', icon: ShoppingBag, l: 'Pedidos' },
                        { id: 'suppliers', icon: Truck, l: 'Proveedores' }
                    ].map(item => (
                        <button key={item.id} onClick={() => setView(item.id === 'dashboard' ? 'admin' : `admin_${item.id}`)} className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${tab === item.id ? 'bg-primary text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                            <item.icon className="w-6 h-6 flex-shrink-0"/>
                            <span className="hidden lg:block text-sm font-medium">{item.l}</span>
                            {tab === item.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block opacity-50"/>}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-white/10">
                    <button onClick={() => setView('store')} className="w-full flex items-center justify-center lg:justify-start gap-4 p-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/10 transition">
                        <LogOut className="w-6 h-6"/>
                        <span className="hidden lg:block font-bold text-sm">Salir</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden ml-20 lg:ml-0 bg-bg-main relative">
                <header className="h-20 bg-bg-main/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-30">
                    <h1 className="text-2xl font-black capitalize flex items-center gap-3">{tab === 'pos' ? 'Punto de Venta' : tab}</h1>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block"><p className="text-sm font-bold text-white">{user.name}</p><p className="text-xs text-primary font-mono uppercase tracking-widest">Administrador</p></div>
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-primary border border-white/10 shadow-lg">{user.name.charAt(0)}</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* DASHBOARD */}
                    {tab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { l: 'Ingresos', v: formatMoney(orders.reduce((a, b) => a + b.total, 0)), i: DollarSign, c: 'text-green-400', bg: 'bg-green-500/10' },
                                    { l: 'Pedidos', v: orders.length, i: ShoppingBag, c: 'text-blue-400', bg: 'bg-blue-500/10' },
                                    { l: 'Productos', v: products.length, i: Package, c: 'text-purple-400', bg: 'bg-purple-500/10' },
                                    { l: 'Proveedores', v: suppliers.length, i: Truck, c: 'text-orange-400', bg: 'bg-orange-500/10' }
                                ].map((s, i) => (
                                    <div key={i} className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/20 transition">
                                        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${s.c}`}><s.i className="w-24 h-24"/></div>
                                        <div className="flex items-center gap-3 mb-4"><div className={`p-2 rounded-lg ${s.bg} ${s.c}`}><s.i className="w-6 h-6"/></div><span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{s.l}</span></div>
                                        <p className="text-3xl font-black text-white">{s.v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp className="text-primary"/> Últimos Pedidos</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm"><thead className="text-gray-500 font-bold border-b border-white/10 uppercase text-xs"><tr><th className="pb-3 pl-2">ID</th><th className="pb-3">Cliente</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Total</th></tr></thead>
                                            <tbody className="divide-y divide-white/5">{orders.slice(0, 5).map(o => (<tr key={o.id} className="hover:bg-white/5 transition"><td className="py-4 pl-2 font-mono text-gray-400 text-xs">{o.orderId}</td><td className="py-4 font-bold">{o.customer.name}</td><td className="py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${o.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{o.status}</span></td><td className="py-4 text-right font-mono text-primary">{formatMoney(o.total)}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="glass p-6 rounded-2xl border border-white/5">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5"/> Stock Bajo</h3>
                                    <div className="space-y-4">{products.filter(p => p.stock <= 5).length === 0 ? <p className="text-gray-500 text-sm">Todo el stock está bien.</p> : products.filter(p => p.stock <= 5).slice(0, 5).map(p => (<div key={p.id} className="flex justify-between items-center bg-red-500/5 p-3 rounded-xl border border-red-500/10"><span className="font-medium text-sm text-gray-300 truncate w-32">{p.name}</span><span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">Queda: {p.stock}</span></div>))}</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* INVENTARIO */}
                    {tab === 'products' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <div className="relative w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/><input className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition" placeholder="Buscar producto..." onChange={e => setPosSearch(e.target.value)}/></div>
                                <button onClick={() => { setTempProd({ name: '', basePrice: '', stock: '', category: '', image: '', discount: 0 }); setEditingProd(null); setShowModal(true); }} className="btn btn-primary px-6 py-2 rounded-lg text-sm shadow-lg"><Plus className="w-4 h-4"/> Nuevo Producto</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                    <div key={p.id} className="glass p-4 rounded-xl border border-white/5 flex flex-col group hover:border-primary/30 transition relative">
                                        <div className="h-40 bg-[#020202] rounded-lg mb-4 flex items-center justify-center p-4 relative overflow-hidden"><img src={p.image} className="max-h-full object-contain group-hover:scale-110 transition duration-500"/>{p.stock <= 5 && <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded">Bajo Stock</span>}</div>
                                        <div className="flex-1"><div className="flex justify-between mb-1"><span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">{p.category}</span></div><h4 className="font-bold text-white mb-2 line-clamp-2">{p.name}</h4><p className="text-xl font-black text-white mb-4">{formatMoney(p.basePrice)}</p></div>
                                        <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                                            <button onClick={() => { setTempProd(p); setEditingProd(p); setShowModal(true); }} className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-1"><Edit className="w-3 h-3"/> Editar</button>
                                            <button onClick={async () => { if (window.confirm('¿Borrar producto?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id)) }} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"><Trash2 className="w-3 h-3"/> Borrar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* POS */}
                    {tab === 'pos' && (
                        <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in -m-4 p-4">
                            <div className="lg:w-2/3 flex flex-col">
                                <input className="w-full bg-[#0a0a0c] p-4 rounded-xl border border-white/10 text-lg mb-4 focus:border-primary outline-none" placeholder="🔍 Buscar producto para venta..." value={posSearch} onChange={e => setPosSearch(e.target.value)} autoFocus/>
                                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4 pr-2 custom-scrollbar">
                                    {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                        <div key={p.id} onClick={() => { const x = posCart.find(i => i.id === p.id); if (x && x.qty >= p.stock) return showToast('Stock insuficiente', 'error'); setPosCart(x ? posCart.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...posCart, { id: p.id, name: p.name, basePrice: Number(p.basePrice), qty: 1 }]); }} className="bg-white/5 hover:bg-primary/20 cursor-pointer p-4 rounded-xl border border-white/5 transition active:scale-95 flex flex-col items-center text-center group">
                                            <img src={p.image} className="w-16 h-16 object-contain mb-2 group-hover:scale-110 transition"/>
                                            <p className="text-xs font-bold text-white line-clamp-2">{p.name}</p>
                                            <p className="text-primary font-black mt-1">{formatMoney(p.basePrice)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/3 bg-[#0a0a0c] border border-white/10 rounded-2xl flex flex-col h-full shadow-2xl">
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#050505] rounded-t-2xl"><h3 className="font-bold flex items-center gap-2"><ShoppingBag className="text-primary"/> Ticket Actual</h3><button onClick={() => setPosCart([])} className="text-xs text-red-400 hover:text-red-300 font-bold uppercase">Vaciar</button></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {posCart.map(i => (
                                        <div key={i.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                            <div><p className="text-xs font-bold text-white w-32 truncate">{i.name}</p><p className="text-[10px] text-gray-500">{formatMoney(i.basePrice)} x {i.qty}</p></div>
                                            <div className="flex items-center gap-3"><span className="font-mono font-bold text-white">{formatMoney(i.basePrice * i.qty)}</span><button onClick={() => setPosCart(posCart.filter(x => x.id !== i.id))}><X className="w-4 h-4 text-gray-500 hover:text-white"/></button></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-primary/10 border-t border-primary/20 rounded-b-2xl">
                                    <div className="flex justify-between items-end mb-4"><span className="text-primary font-bold">Total a Cobrar</span><span className="text-4xl font-black text-white">{formatMoney(posCart.reduce((a, i) => a + (i.basePrice * i.qty), 0))}</span></div>
                                    <button onClick={confirmPosSale} className="w-full py-4 bg-primary text-black font-black text-xl rounded-xl shadow-lg hover:shadow-primary/30 transition flex items-center justify-center gap-2"><DollarSign className="w-6 h-6 stroke-[3]"/> COBRAR</button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* PEDIDOS & PROVEEDORES */}
                    {tab === 'orders' && <div className="space-y-4 animate-fade-in">{orders.map(o => (<div key={o.id} className="glass p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-primary/30 transition"><div className="flex items-center gap-6"><div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs ${o.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{o.status.charAt(0)}</div><div><p className="font-bold text-white">{o.customer.name}</p><p className="text-xs text-gray-500">#{o.orderId} • {formatDate(o.date)}</p></div></div><div className="flex items-center gap-6"><span className="font-mono font-bold text-xl">{formatMoney(o.total)}</span><button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { status: o.status === 'Pendiente' ? 'Realizado' : 'Pendiente' })} className="btn bg-white/10 px-4 py-2 text-xs rounded-lg font-bold hover:bg-white/20"><RefreshCw className="w-3 h-3"/> {o.status}</button></div></div>))}</div>}
                    {tab === 'suppliers' && <div className="animate-fade-in"><div className="flex justify-between items-center mb-8"><h2 className="text-xl font-bold">Proveedores</h2><button onClick={() => setShowSupplierModal(true)} className="btn btn-primary px-6 py-2 text-sm rounded-lg">Agregar</button></div><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{suppliers.map(s => (<div key={s.id} className="glass p-6 rounded-2xl border border-white/5 relative group hover:border-white/20 transition"><h3 className="font-black text-xl text-white mb-1">{s.name}</h3><p className="text-gray-500 text-sm mb-4 flex items-center gap-2"><Phone className="w-3 h-3"/> {s.phone || 'Sin teléfono'}</p><div className="border-t border-white/10 pt-4 flex justify-between items-center"><span className="text-xs text-gray-400 uppercase font-bold">Deuda Actual</span><span className="text-lg font-black text-red-400">{formatMoney(s.debt)}</span></div><button onClick={async () => { if (window.confirm('¿Borrar?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'suppliers', s.id)) }} className="absolute top-4 right-4 text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>))}</div></div>}
                </div>
            </main>

            {/* Modals */}
            {showModal && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-[#0a0a0c] w-full max-w-lg rounded-2xl p-8 border border-white/10 shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]"><h3 className="text-2xl font-black text-white mb-6">{editingProd ? 'Editar' : 'Nuevo'}</h3><div className="space-y-4"><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="Nombre" value={tempProd.name} onChange={e => setTempProd({ ...tempProd, name: e.target.value })}/><div className="flex gap-4"><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" type="number" placeholder="Precio ($)" value={tempProd.basePrice} onChange={e => setTempProd({ ...tempProd, basePrice: e.target.value })}/><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" type="number" placeholder="Stock" value={tempProd.stock} onChange={e => setTempProd({ ...tempProd, stock: e.target.value })}/></div><div className="flex gap-4"><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="Categoría" value={tempProd.category} onChange={e => setTempProd({ ...tempProd, category: e.target.value })}/><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" type="number" placeholder="Descuento %" value={tempProd.discount} onChange={e => setTempProd({ ...tempProd, discount: e.target.value })}/></div><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="URL Imagen" value={tempProd.image} onChange={e => setTempProd({ ...tempProd, image: e.target.value })}/></div><div className="flex justify-end gap-4 mt-8 pt-6 border-t border-white/10"><button onClick={() => setShowModal(false)} className="text-gray-400 font-bold hover:text-white transition">Cancelar</button><button onClick={saveProduct} className="bg-primary text-black px-8 py-3 rounded-xl font-bold hover:bg-white transition">Guardar</button></div></div></div>)}
            {showSupplierModal && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-[#0a0a0c] w-full max-w-md rounded-2xl p-8 border border-white/10 shadow-2xl animate-fade-in"><h3 className="text-xl font-bold text-white mb-6">Nuevo Proveedor</h3><div className="space-y-4 mb-6"><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="Nombre Empresa" value={tempSupplier.name} onChange={e => setTempSupplier({ ...tempSupplier, name: e.target.value })}/><input className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="Teléfono" value={tempSupplier.phone} onChange={e => setTempSupplier({ ...tempSupplier, phone: e.target.value })}/><input type="number" className="w-full p-3 bg-[#121214] border border-white/10 rounded text-white" placeholder="Deuda Inicial ($)" value={tempSupplier.debt} onChange={e => setTempSupplier({ ...tempSupplier, debt: Number(e.target.value) })}/></div><div className="flex justify-end gap-3"><button onClick={() => setShowSupplierModal(false)} className="btn text-gray-400">Cancelar</button><button onClick={saveSupplier} className="btn bg-primary text-black px-6 rounded-lg font-bold">Guardar</button></div></div></div>)}
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
