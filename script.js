import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, 
    Minus, Plus, Trash2, Edit, RefreshCw, LogIn, LogOut, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, 
    Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, 
    TrendingUp, Printer, Phone, Calendar, ChevronRight, Lock, Loader2, Filter 
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

// --- 2. UTILIDADES ---
const formatMoney = (amount) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// --- 3. COMPONENTES UI REUTILIZABLES ---

// Notificaciones Toast
const Toast = ({ message, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
    const types = { 
        success: 'border-l-4 border-green-500 text-green-400', 
        error: 'border-l-4 border-red-500 text-red-400', 
        info: 'border-l-4 border-primary text-primary' 
    };
    return (
        <div className={`glass p-4 rounded-r-lg shadow-2xl flex items-center gap-3 animate-fade-in mb-3 ${types[type] || types.info}`}>
            {type === 'success' && <CheckCircle className="w-5 h-5"/>}
            {type === 'error' && <X className="w-5 h-5"/>}
            {type === 'info' && <Info className="w-5 h-5"/>}
            <p className="text-sm font-medium text-white">{message}</p>
        </div>
    );
};

// Tarjeta de Producto Premium
const ProductCard = ({ product, onAdd }) => {
    const isOutOfStock = product.stock <= 0;
    const finalPrice = product.basePrice * (1 - (product.discount || 0) / 100);

    return (
        <div className="glass-card rounded-2xl overflow-hidden group flex flex-col h-full relative">
            <div className="relative aspect-[4/3] bg-[#050505] p-6 flex items-center justify-center overflow-hidden">
                <img 
                    src={product.image || 'https://via.placeholder.com/300'} 
                    alt={product.name} 
                    className={`w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-50' : ''}`} 
                />
                {product.discount > 0 && !isOutOfStock && (
                    <span className="absolute top-3 left-3 bg-primary text-black text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide">
                        -{product.discount}% OFF
                    </span>
                )}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="border border-red-500 text-red-500 px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase bg-red-500/10">Agotado</span>
                    </div>
                )}
            </div>
            
            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">{product.category || 'General'}</span>
                </div>
                <h3 className="text-white font-bold text-lg leading-snug mb-4 group-hover:text-primary transition-colors">{product.name}</h3>
                
                <div className="mt-auto flex items-end justify-between border-t border-white/5 pt-4">
                    <div className="flex flex-col">
                        {product.discount > 0 && <span className="text-xs text-gray-500 line-through mb-0.5">{formatMoney(product.basePrice)}</span>}
                        <span className="text-xl font-bold text-white tracking-tight">{formatMoney(finalPrice)}</span>
                    </div>
                    <button 
                        onClick={() => !isOutOfStock && onAdd(product)} 
                        disabled={isOutOfStock}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOutOfStock ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-white text-black hover:bg-primary hover:text-white hover:scale-110 shadow-lg'}`}
                    >
                        <Plus className="w-5 h-5 stroke-[3]"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Carrito Slide-Over
const CartDrawer = ({ isOpen, onClose, cart, updateQty, total, onCheckout }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-bg-panel border-l border-white/10 h-full shadow-2xl flex flex-col animate-slide-in-right">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#050505]">
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        <ShoppingBag className="text-primary w-6 h-6"/> Tu Pedido
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4">
                            <ShoppingBag className="w-16 h-16 opacity-20"/>
                            <p className="text-lg font-medium">El carrito está vacío</p>
                            <button onClick={onClose} className="btn btn-secondary text-sm">Volver a la tienda</button>
                        </div>
                    ) : (
                        cart.map(item => {
                            const price = item.product.basePrice * (1 - (item.product.discount || 0) / 100);
                            return (
                                <div key={item.product.id} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition">
                                    <div className="w-20 h-20 bg-[#050505] rounded-lg p-2 flex items-center justify-center flex-shrink-0">
                                        <img src={item.product.image} className="max-w-full max-h-full object-contain"/>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-white text-sm truncate">{item.product.name}</h4>
                                            <p className="text-primary font-bold text-sm mt-1">{formatMoney(price)}</p>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1">
                                                <button onClick={() => updateQty(item.product, -1)} className="w-6 h-6 flex items-center justify-center hover:text-white text-gray-500"><Minus className="w-3 h-3"/></button>
                                                <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQty(item.product, 1)} className="w-6 h-6 flex items-center justify-center hover:text-white text-gray-500"><Plus className="w-3 h-3"/></button>
                                            </div>
                                            <button onClick={() => updateQty(item.product, -item.quantity)} className="text-gray-600 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-6 bg-[#050505] border-t border-white/5">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-400 text-sm">Total Estimado</span>
                        <span className="text-3xl font-black text-white tracking-tight">{formatMoney(total)}</span>
                    </div>
                    <button 
                        onClick={() => { onClose(); onCheckout(); }}
                        disabled={cart.length === 0}
                        className="w-full py-4 btn-primary rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2"
                    >
                        Iniciar Compra <ArrowRight className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 4. APLICACIÓN PRINCIPAL ---

function App() {
    // --- ESTADOS ---
    const [view, setView] = useState('store'); // store, checkout, profile, login, admin
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('cart_v2')) || [] } catch { return [] } });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [toasts, setToasts] = useState([]);
    
    // Filtros UI
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('Todas');
    
    // Auth & Checkout Forms
    const [authMode, setAuthMode] = useState('login'); // login, register
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', phone: '' });
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', phone: '', payment: 'Transferencia' });

    // --- EFECTOS & DATA FETCHING ---
    useEffect(() => {
        const init = async () => {
            // Persistencia User
            const savedUser = localStorage.getItem('user_data');
            if (savedUser) setUser(JSON.parse(savedUser));

            // Auth Anon
            await signInAnonymously(auth);

            // Listeners
            const unsubProds = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => {
                setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
                setIsLoading(false);
            });
            const unsubOrders = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => {
                const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
                setOrders(data.sort((a,b) => new Date(b.date) - new Date(a.date)));
            });

            return () => { unsubProds(); unsubOrders(); };
        };
        init();
    }, []);

    useEffect(() => localStorage.setItem('cart_v2', JSON.stringify(cart)), [cart]);

    // --- LÓGICA DE NEGOCIO ---
    
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
                if (!snap.empty) throw new Error("Este email ya está registrado");
                
                const newUser = { ...authData, role: 'user', createdAt: new Date().toISOString() };
                const ref = await addDoc(usersRef, newUser);
                const finalUser = { ...newUser, id: ref.id };
                
                setUser(finalUser);
                localStorage.setItem('user_data', JSON.stringify(finalUser));
                showToast(`¡Bienvenido, ${authData.name}!`, 'success');
            } else {
                const q = query(usersRef, where('email', '==', authData.email), where('password', '==', authData.password));
                const snap = await getDocs(q);
                if (snap.empty) throw new Error("Credenciales incorrectas");
                
                const foundUser = { ...snap.docs[0].data(), id: snap.docs[0].id };
                setUser(foundUser);
                localStorage.setItem('user_data', JSON.stringify(foundUser));
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
                paymentMethod: checkoutData.payment
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

            // 3. Enviar a WhatsApp
            const message = `*¡Hola Sustore! 👋 Quiero confirmar mi pedido.*\n\n🆔 *Pedido:* #${orderId}\n👤 *Cliente:* ${newOrder.customer.name}\n\n🛒 *Productos:*\n${cart.map(i => `▫ ${i.quantity}x ${i.product.name}`).join('\n')}\n\n💰 *Total: ${formatMoney(total)}*\n\n📍 *Envío:* ${checkoutData.address}, ${checkoutData.city}\n💳 *Pago:* ${checkoutData.payment}`;
            window.open(`https://wa.me/5493425123456?text=${encodeURIComponent(message)}`, '_blank');

            setCart([]);
            setView('store');
            showToast("¡Pedido realizado con éxito!", "success");

        } catch (error) {
            console.error(error);
            showToast("Error al procesar el pedido", "error");
        }
        setIsLoading(false);
    };

    // --- RENDERIZADO DE VISTAS ---
    
    // 1. HEADER (Navigation)
    const Header = () => (
        <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                <div onClick={() => setView('store')} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 bg-gradient-to-tr from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition">
                        <Zap className="text-black w-6 h-6 fill-black"/>
                    </div>
                    <span className="font-black text-2xl tracking-tight text-white group-hover:text-primary transition">SUSTORE</span>
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
                    {user?.role === 'admin' && (
                        <button onClick={() => setView('admin')} className="hidden md:flex btn btn-secondary text-xs px-4 py-2 rounded-full gap-2">
                            <LayoutDashboard className="w-4 h-4 text-primary"/> Panel
                        </button>
                    )}
                    
                    <button onClick={() => setIsCartOpen(true)} className="relative p-3 hover:bg-white/5 rounded-full transition group">
                        <ShoppingBag className="w-6 h-6 text-gray-400 group-hover:text-white transition"/>
                        {cart.length > 0 && (
                            <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/50 animate-pulse-subtle">
                                {cart.length}
                            </span>
                        )}
                    </button>

                    {user ? (
                        <div onClick={() => setView('profile')} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-1.5 pr-4 rounded-full border border-transparent hover:border-white/10 transition">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">{user.name.charAt(0)}</div>
                            <span className="text-sm font-bold hidden md:block">{user.name.split(' ')[0]}</span>
                        </div>
                    ) : (
                        <button onClick={() => setView('auth')} className="btn btn-primary px-6 py-2 rounded-full text-sm shadow-lg shadow-primary/10">
                            Ingresar
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );

    // 2. VIEW: STORE
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
                                <p className="text-lg text-gray-300 max-w-md leading-relaxed">
                                    Descubre la tecnología más avanzada con garantía oficial y soporte premium.
                                </p>
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
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:block">{filtered.length} Productos</span>
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
                
                <div className="fixed bottom-6 right-6 z-40 space-y-2 flex flex-col items-end">
                    {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
                </div>
            </div>
        );
    }

    // 3. VIEW: CHECKOUT
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
                                    {['Transferencia', 'Efectivo', 'Tarjeta'].map(m => (
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
                                <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{formatMoney(total)}</span></div>
                                <div className="flex justify-between text-gray-400"><span>Envío</span><span className="text-primary font-bold text-xs uppercase">A coordinar</span></div>
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
                            <p className="text-center text-xs text-gray-600 mt-4">Al confirmar, serás redirigido a WhatsApp con el detalle de tu pedido listo para enviar.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // 4. VIEW: AUTH
    if (view === 'auth') {
        return (
            <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>
                <div className="glass p-10 md:p-12 rounded-[2.5rem] w-full max-w-md relative z-10 border border-white/10 shadow-2xl">
                    <button onClick={() => setView('store')} className="absolute top-6 right-6 text-gray-500 hover:text-white transition"><X className="w-6 h-6"/></button>
                    
                    <div className="mb-10 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <Zap className="w-8 h-8"/>
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">{authMode === 'login' ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                        <p className="text-gray-500">Accede para gestionar tus pedidos y perfil.</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === 'register' && (
                            <div className="animate-fade-in space-y-4">
                                <input className="w-full input-tech p-4" placeholder="Nombre Completo" required value={authData.name} onChange={e => setAuthData({...authData, name: e.target.value})}/>
                            </div>
                        )}
                        <input className="w-full input-tech p-4" type="email" placeholder="Correo electrónico" required value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})}/>
                        <input className="w-full input-tech p-4" type="password" placeholder="Contraseña" required value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})}/>
                        
                        <button type="submit" disabled={isLoading} className="w-full py-4 btn-primary rounded-xl font-bold shadow-lg shadow-primary/20 mt-4">
                            {isLoading ? <Loader2 className="animate-spin mx-auto"/> : (authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse')}
                        </button>
                    </form>

                    <div className="mt-8 text-center space-y-4">
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-sm text-gray-400 hover:text-white transition underline decoration-gray-700 underline-offset-4">
                            {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
                        </button>
                    </div>
                </div>
                <div className="fixed top-6 right-6 flex flex-col items-end gap-2">
                    {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(p => p.filter(x => x.id !== t.id))} />)}
                </div>
            </div>
        );
    }

    // 5. VIEW: PROFILE
    if (view === 'profile' && user) {
        const myOrders = orders.filter(o => o.userId === user.id);
        return (
            <div className="min-h-screen bg-bg-main pb-20">
                <Header />
                <div className="pt-28 px-4 max-w-5xl mx-auto animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl border-4 border-bg-main">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-4xl font-black text-white mb-2">{user.name}</h1>
                            <p className="text-gray-400 font-mono text-sm">{user.email}</p>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => { localStorage.removeItem('user_data'); setUser(null); setView('store'); }} className="btn btn-secondary px-6 py-2 rounded-lg text-sm border-red-900/30 text-red-400 hover:bg-red-900/10 hover:border-red-500 hover:text-red-500">
                                    <LogOut className="w-4 h-4"/> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">Mis Pedidos</h2>
                    <div className="space-y-4">
                        {myOrders.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">No tienes pedidos aún.</div>
                        ) : (
                            myOrders.map(order => (
                                <div key={order.id} className="glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 border border-white/5 hover:border-primary/30 transition group">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${order.status === 'Realizado' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                            <Package className="w-6 h-6"/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-lg">Pedido #{order.orderId}</p>
                                            <p className="text-xs text-gray-500">{formatDate(order.date)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">{order.items.length} productos</p>
                                            <p className="font-black text-white text-xl">{formatMoney(order.total)}</p>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${order.status === 'Realizado' ? 'bg-green-500/5 text-green-400 border-green-500/20' : 'bg-yellow-500/5 text-yellow-400 border-yellow-500/20'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }
// --- 6. VIEW: ADMIN PANEL (ENTERPRISE) ---
    if (view.startsWith('admin')) {
        // Validación de seguridad simple
        if (user?.role !== 'admin') {
            setView('store');
            return null;
        }

        // Sub-navegación basada en el nombre de la vista (ej: 'admin_products')
        const currentTab = view === 'admin' ? 'dashboard' : view.replace('admin_', '');
        
        // --- ADMIN LOGIC ---
        
        // Productos
        const [editingProduct, setEditingProduct] = useState(null);
        const [showProductModal, setShowProductModal] = useState(false);
        const [tempProduct, setTempProduct] = useState({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });

        // Proveedores & Gastos (Fetch on demand para no saturar hooks al inicio)
        const [suppliers, setSuppliers] = useState([]);
        const [expenses, setExpenses] = useState([]);
        const [showSupplierModal, setShowSupplierModal] = useState(false);
        const [tempSupplier, setTempSupplier] = useState({ name: '', phone: '', debt: 0 });
        
        // POS
        const [posCart, setPosCart] = useState([]);
        const [posSearch, setPosSearch] = useState('');

        // Cargar datos secundarios solo al entrar a admin
        useEffect(() => {
            const fetchAdminData = async () => {
                const suppSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'));
                setSuppliers(suppSnap.docs.map(d => ({id: d.id, ...d.data()})));
                const expSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
                setExpenses(expSnap.docs.map(d => ({id: d.id, ...d.data()})));
            };
            if (view.startsWith('admin')) fetchAdminData();
        }, [view]);

        // Handlers
        const handleSaveProduct = async () => {
            setIsLoading(true);
            try {
                const productData = {
                    ...tempProduct,
                    basePrice: Number(tempProduct.basePrice),
                    stock: Number(tempProduct.stock),
                    discount: Number(tempProduct.discount),
                    updatedAt: new Date().toISOString()
                };

                if (editingProduct) {
                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), productData);
                    showToast('Producto actualizado', 'success');
                } else {
                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, createdAt: new Date().toISOString() });
                    showToast('Producto creado', 'success');
                }
                setShowProductModal(false);
                setEditingProduct(null);
                setTempProduct({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });
            } catch (e) { showToast('Error al guardar', 'error'); }
            setIsLoading(false);
        };

        const handleDeleteProduct = async (id) => {
            if(!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
            showToast('Producto eliminado', 'success');
        };

        const handleSaveSupplier = async () => {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), tempSupplier);
            setTempSupplier({ name: '', phone: '', debt: 0 });
            setShowSupplierModal(false);
            // Recargar simple
            const s = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'));
            setSuppliers(s.docs.map(d => ({id: d.id, ...d.data()})));
            showToast('Proveedor agregado', 'success');
        };

        const toggleOrderStatus = async (order) => {
            const newStatus = order.status === 'Pendiente' ? 'Realizado' : 'Pendiente';
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', order.id), { status: newStatus });
            showToast(`Pedido marcado como ${newStatus}`, 'success');
        };

        const handlePosSale = async () => {
            if(posCart.length === 0) return;
            const total = posCart.reduce((a,i) => a + (i.basePrice * i.qty), 0);
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), {
                orderId: `POS-${Date.now().toString().slice(-6)}`,
                userId: 'ADMIN',
                customer: { name: 'Venta Mostrador', email: '-', phone: '-' },
                items: posCart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.basePrice })),
                total, status: 'Realizado', date: new Date().toISOString(), paymentMethod: 'Efectivo/POS'
            });
            // Descontar stock
            const batch = writeBatch(db);
            posCart.forEach(i => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id), { stock: increment(-i.qty) }));
            await batch.commit();
            
            setPosCart([]);
            showToast('Venta registrada', 'success');
        };

        // UI Components for Admin
        const AdminCard = ({ title, value, icon: Icon, trend, color = "text-white" }) => (
            <div className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-white/20 transition">
                <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
                    <Icon className="w-24 h-24"/>
                </div>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon className="w-6 h-6"/></div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</span>
                </div>
                <div className="flex items-end gap-4">
                    <span className="text-3xl font-black text-white">{value}</span>
                    {trend && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded flex items-center gap-1"><TrendingUp className="w-3 h-3"/> {trend}</span>}
                </div>
            </div>
        );

        return (
            <div className="min-h-screen bg-[#050505] flex text-white font-sans">
                {/* Sidebar */}
                <aside className="w-20 lg:w-64 bg-black border-r border-white/10 flex flex-col fixed h-full z-50 lg:static transition-all duration-300">
                    <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/10">
                        <Zap className="w-8 h-8 text-primary"/>
                        <span className="hidden lg:block font-black text-xl ml-3 tracking-tight">ADMIN<span className="text-primary">PANEL</span></span>
                    </div>
                    
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
                        {[
                            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                            { id: 'products', icon: Package, label: 'Inventario' },
                            { id: 'orders', icon: ShoppingBag, label: 'Pedidos' },
                            { id: 'pos', icon: Zap, label: 'Punto Venta' },
                            { id: 'suppliers', icon: Truck, label: 'Proveedores' },
                            { id: 'finance', icon: PieChart, label: 'Finanzas' },
                        ].map(item => (
                            <button 
                                key={item.id}
                                onClick={() => setView(item.id === 'dashboard' ? 'admin' : `admin_${item.id}`)}
                                className={`w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group ${currentTab === item.id ? 'bg-primary text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <item.icon className="w-6 h-6 flex-shrink-0"/>
                                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                                {currentTab === item.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block opacity-50"/>}
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
                <main className="flex-1 flex flex-col h-screen overflow-hidden ml-20 lg:ml-0 bg-bg-main">
                    {/* Topbar */}
                    <header className="h-20 bg-bg-main/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-40">
                        <h1 className="text-2xl font-black capitalize flex items-center gap-2">
                            {currentTab}
                            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary"/>}
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-white">{user.name}</p>
                                <p className="text-xs text-primary font-mono">Administrador</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-primary border border-white/10">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </header>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        
                        {/* DASHBOARD */}
                        {currentTab === 'dashboard' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <AdminCard title="Ingresos Totales" value={formatMoney(orders.reduce((a,b)=>a+b.total,0))} icon={DollarSign} trend="+12%" color="text-green-400"/>
                                    <AdminCard title="Pedidos" value={orders.length} icon={ShoppingBag} trend="+5%" color="text-blue-400"/>
                                    <AdminCard title="Productos" value={products.length} icon={Package} color="text-purple-400"/>
                                    <AdminCard title="Clientes" value={new Set(orders.map(o=>o.customer.email)).size} icon={Users} color="text-orange-400"/>
                                </div>

                                <div className="grid lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp className="text-primary"/> Ventas Recientes</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-gray-500 font-bold border-b border-white/10 uppercase text-xs">
                                                    <tr><th className="pb-3 pl-2">ID</th><th className="pb-3">Cliente</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Total</th></tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {orders.slice(0, 5).map(o => (
                                                        <tr key={o.id} className="hover:bg-white/5 transition">
                                                            <td className="py-4 pl-2 font-mono text-gray-400 text-xs">{o.orderId}</td>
                                                            <td className="py-4 font-bold">{o.customer.name}</td>
                                                            <td className="py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${o.status==='Realizado'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}>{o.status}</span></td>
                                                            <td className="py-4 text-right font-mono text-primary">{formatMoney(o.total)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="glass p-6 rounded-2xl border border-white/5">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-red-400"><AlertTriangle className="w-5 h-5"/> Stock Crítico</h3>
                                        <div className="space-y-4">
                                            {products.filter(p => p.stock <= 5).slice(0,5).map(p => (
                                                <div key={p.id} className="flex justify-between items-center bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                                                    <span className="font-medium text-sm text-gray-300 truncate w-32">{p.name}</span>
                                                    <span className="text-red-400 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">Queda: {p.stock}</span>
                                                </div>
                                            ))}
                                            {products.filter(p => p.stock <= 5).length === 0 && <p className="text-gray-500 text-sm">Todo el stock está saludable.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRODUCTOS */}
                        {currentTab === 'products' && (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
                                        <input className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-primary outline-none transition" placeholder="Buscar producto..." onChange={(e)=>setPosSearch(e.target.value)}/>
                                    </div>
                                    <button onClick={() => { setTempProduct({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 }); setEditingProduct(null); setShowProductModal(true); }} className="btn btn-primary px-6 py-2 rounded-lg text-sm shadow-lg">
                                        <Plus className="w-4 h-4"/> Nuevo Producto
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.filter(p => p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                        <div key={p.id} className="glass rounded-xl p-4 flex flex-col border border-white/5 group hover:border-primary/50 transition relative">
                                            <div className="h-40 bg-[#020202] rounded-lg mb-4 flex items-center justify-center p-4">
                                                <img src={p.image} className="max-h-full object-contain"/>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">{p.category}</span>
                                                    <span className={`text-[10px] font-bold px-2 rounded ${p.stock > 5 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>Stock: {p.stock}</span>
                                                </div>
                                                <h4 className="font-bold text-white mb-2 line-clamp-2 h-10">{p.name}</h4>
                                                <p className="text-xl font-black text-white mb-4">{formatMoney(p.basePrice)}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                <button onClick={() => { setTempProduct(p); setEditingProduct(p); setShowProductModal(true); }} className="py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"><Edit className="w-3 h-3"/> Editar</button>
                                                <button onClick={() => handleDeleteProduct(p.id)} className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"><Trash2 className="w-3 h-3"/> Borrar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* POS (Punto de Venta) */}
                        {currentTab === 'pos' && (
                            <div className="flex flex-col lg:flex-row h-full gap-6 animate-fade-in -m-4 p-4">
                                <div className="lg:w-2/3 flex flex-col">
                                    <input className="w-full bg-[#0a0a0c] p-4 rounded-xl border border-white/10 text-lg mb-4 focus:border-primary outline-none" placeholder="🔍 Buscar producto para venta..." value={posSearch} onChange={e=>setPosSearch(e.target.value)} autoFocus/>
                                    <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4 pr-2 custom-scrollbar">
                                        {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                                            <div key={p.id} onClick={() => {
                                                const ex = posCart.find(i=>i.id===p.id);
                                                if(ex && ex.qty >= p.stock) return showToast('Sin stock suficiente', 'error');
                                                setPosCart(ex ? posCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...posCart, {id:p.id, name:p.name, basePrice:Number(p.basePrice), qty:1}]);
                                            }} className="bg-white/5 hover:bg-primary/20 cursor-pointer p-4 rounded-xl border border-white/5 transition active:scale-95 flex flex-col items-center text-center">
                                                <img src={p.image} className="w-16 h-16 object-contain mb-2"/>
                                                <p className="text-xs font-bold text-white line-clamp-2">{p.name}</p>
                                                <p className="text-primary font-black mt-1">{formatMoney(p.basePrice)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="lg:w-1/3 bg-[#0a0a0c] border border-white/10 rounded-2xl flex flex-col h-full shadow-2xl">
                                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#050505] rounded-t-2xl">
                                        <h3 className="font-bold flex items-center gap-2"><ShoppingBag className="text-primary"/> Ticket Actual</h3>
                                        <button onClick={()=>setPosCart([])} className="text-xs text-red-400 hover:text-red-300">Vaciar</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {posCart.map(i => (
                                            <div key={i.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                                <div>
                                                    <p className="text-xs font-bold text-white w-32 truncate">{i.name}</p>
                                                    <p className="text-[10px] text-gray-500">{formatMoney(i.basePrice)} x {i.qty}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold">{formatMoney(i.basePrice*i.qty)}</span>
                                                    <button onClick={()=>setPosCart(posCart.filter(x=>x.id!==i.id))}><X className="w-4 h-4 text-gray-500 hover:text-white"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-primary/10 border-t border-primary/20 rounded-b-2xl">
                                        <div className="flex justify-between items-end mb-4">
                                            <span className="text-primary font-bold">Total a Cobrar</span>
                                            <span className="text-4xl font-black text-white">{formatMoney(posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0))}</span>
                                        </div>
                                        <button onClick={handlePosSale} className="w-full py-4 bg-primary text-black font-black text-xl rounded-xl shadow-lg hover:shadow-primary/30 transition flex items-center justify-center gap-2">
                                            <DollarSign className="w-6 h-6 stroke-[3]"/> COBRAR
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROVEEDORES */}
                        {currentTab === 'suppliers' && (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-bold">Gestión de Proveedores</h2>
                                    <button onClick={()=>setShowSupplierModal(true)} className="btn btn-primary px-6 py-2 text-sm rounded-lg">Agregar Proveedor</button>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {suppliers.map(s => (
                                        <div key={s.id} className="glass p-6 rounded-2xl border border-white/5 relative group">
                                            <h3 className="font-black text-xl text-white mb-1">{s.name}</h3>
                                            <p className="text-gray-500 text-sm mb-4 flex items-center gap-2"><Phone className="w-3 h-3"/> {s.phone || 'Sin teléfono'}</p>
                                            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                                <span className="text-xs text-gray-400 uppercase font-bold">Deuda Actual</span>
                                                <span className="text-lg font-black text-red-400">{formatMoney(s.debt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* OTROS MODULOS (Visual Only for Enterprise Feel) */}
                        {currentTab === 'orders' && (
                            <div className="space-y-4 animate-fade-in">
                                {orders.map(o => (
                                    <div key={o.id} className="glass p-4 rounded-xl flex items-center justify-between border border-white/5 hover:border-primary/30 transition">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs ${o.status==='Realizado'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}>{o.status.charAt(0)}</div>
                                            <div>
                                                <p className="font-bold text-white">{o.customer.name}</p>
                                                <p className="text-xs text-gray-500">#{o.orderId} • {formatDate(o.date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-mono font-bold text-xl">{formatMoney(o.total)}</span>
                                            <button onClick={()=>toggleOrderStatus(o)} className="btn btn-secondary px-4 py-2 text-xs rounded-lg">
                                                <RefreshCw className="w-3 h-3"/> Cambiar Estado
                                            </button>
                                            <button onClick={async()=>{if(window.confirm('Eliminar?')) await deleteDoc(doc(db,'artifacts',appId,'public','data','orders',o.id))}} className="text-red-500 hover:text-red-400 p-2"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* --- MODAL PRODUCTO --- */}
                {showProductModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#0a0a0c] border border-white/10 w-full max-w-2xl rounded-2xl p-8 shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh]">
                            <h3 className="text-2xl font-black text-white mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nombre</label><input className="w-full input-tech p-3" value={tempProduct.name} onChange={e=>setTempProduct({...tempProduct,name:e.target.value})}/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Precio ($)</label><input type="number" className="w-full input-tech p-3" value={tempProduct.basePrice} onChange={e=>setTempProduct({...tempProduct,basePrice:e.target.value})}/></div>
                                    <div className="flex gap-4">
                                        <div className="flex-1"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Stock</label><input type="number" className="w-full input-tech p-3" value={tempProduct.stock} onChange={e=>setTempProduct({...tempProduct,stock:e.target.value})}/></div>
                                        <div className="flex-1"><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Desc %</label><input type="number" className="w-full input-tech p-3" value={tempProduct.discount} onChange={e=>setTempProduct({...tempProduct,discount:e.target.value})}/></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Categoría</label><select className="w-full input-tech p-3 bg-[#121214]" value={tempProduct.category} onChange={e=>setTempProduct({...tempProduct,category:e.target.value})}><option value="">Seleccionar...</option>{['Celulares', 'Audio', 'Gaming', 'Computación', 'Accesorios'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Imagen URL</label><input className="w-full input-tech p-3" value={tempProduct.image} onChange={e=>setTempProduct({...tempProduct,image:e.target.value})} placeholder="https://..."/></div>
                                    <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">Imagen (Local)</label><input type="file" className="text-xs text-gray-400" onChange={(e)=>{const f=e.target.files[0]; if(f){const r=new FileReader(); r.onload=()=>setTempProduct({...tempProduct,image:r.result}); r.readAsDataURL(f);}}}/></div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-white/10 pt-6">
                                <button onClick={()=>setShowProductModal(false)} className="px-6 py-2 text-gray-400 hover:text-white font-bold">Cancelar</button>
                                <button onClick={handleSaveProduct} disabled={isLoading} className="btn btn-primary px-8 py-2 rounded-lg shadow-lg">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- MODAL PROVEEDOR --- */}
                {showSupplierModal && (
                    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#0a0a0c] border border-white/10 w-full max-w-md rounded-2xl p-8 shadow-2xl animate-fade-in">
                            <h3 className="text-xl font-bold text-white mb-6">Nuevo Proveedor</h3>
                            <div className="space-y-4 mb-6">
                                <input className="w-full input-tech p-3" placeholder="Nombre Empresa / Contacto" value={tempSupplier.name} onChange={e=>setTempSupplier({...tempSupplier,name:e.target.value})}/>
                                <input className="w-full input-tech p-3" placeholder="Teléfono" value={tempSupplier.phone} onChange={e=>setTempSupplier({...tempSupplier,phone:e.target.value})}/>
                                <input type="number" className="w-full input-tech p-3" placeholder="Deuda Inicial ($)" value={tempSupplier.debt} onChange={e=>setTempSupplier({...tempSupplier,debt:Number(e.target.value)})}/>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={()=>setShowSupplierModal(false)} className="btn btn-ghost">Cancelar</button>
                                <button onClick={handleSaveSupplier} className="btn btn-primary px-6">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
