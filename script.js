import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, Flame } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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

// --- UTILS & COMPONENTS ---
const Toast = ({ message, type, onClose }) => {
    const colors = { 
        success: 'border-green-500 text-green-400 bg-black/90 shadow-[0_0_20px_rgba(34,197,94,0.3)]', 
        error: 'border-red-500 text-red-400 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.3)]', 
        info: 'border-cyan-500 text-cyan-400 bg-black/90 shadow-[0_0_20px_rgba(6,182,212,0.3)]', 
        warning: 'border-yellow-500 text-yellow-400 bg-black/90 shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
    };
    
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    
    return (
        <div className={`fixed top-24 right-4 z-[9999] flex items-center gap-4 p-5 rounded-2xl border-l-4 backdrop-blur-xl animate-fade-up ${colors[type] || colors.info}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-cyan-500/20'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5"/> : type === 'error' ? <AlertCircle className="w-5 h-5"/> : <Info className="w-5 h-5"/>}
            </div>
            <p className="font-bold text-sm tracking-wide">{message}</p>
        </div>
    );
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText="Confirmar", cancelText="Cancelar", isDangerous = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
            <div className={`glass p-8 rounded-[2rem] max-w-sm w-full border ${isDangerous ? 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-slate-700 shadow-2xl'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500' : 'bg-cyan-900/20 text-cyan-500'}`}>
                    {isDangerous ? <AlertTriangle className="w-8 h-8"/> : <Info className="w-8 h-8"/>}
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

const EmptyState = ({ icon: Icon, title, text, action, actionText }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/30 w-full animate-fade-up">
        <div className="p-6 bg-slate-900 rounded-full mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-800 group">
            <Icon className="w-12 h-12 text-slate-600 group-hover:text-cyan-400 transition duration-500"/>
        </div>
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">{text}</p>
        {action && <button onClick={action} className="px-8 py-3 neon-button text-white rounded-xl font-bold transition shadow-lg flex items-center gap-2">{actionText} <ArrowRight className="w-4 h-4"/></button>}
    </div>
);

// --- MAIN APPLICATION ---
function App() {
    // --- ESTADOS GLOBALES ---
    const [view, setView] = useState('store');
    const [adminTab, setAdminTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    
    // PERSISTENCIA DE SESIÓN
    const [currentUser, setCurrentUser] = useState(() => { 
        try { 
            const saved = localStorage.getItem('nexus_user_data');
            return saved ? JSON.parse(saved) : null; 
        } catch(e) { return null; } 
    });

    const [systemUser, setSystemUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false); 
    const [toasts, setToasts] = useState([]);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });

    // --- DATOS ---
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => { 
        try { 
            const saved = JSON.parse(localStorage.getItem('nexus_cart'));
            return Array.isArray(saved) ? saved : []; 
        } catch(e) { return []; } 
    });
    // Live Carts (Todos los carritos activos en DB para estadísticas)
    const [liveCarts, setLiveCarts] = useState([]);
    
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // --- ESTADOS UI ---
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    
    // Auth & Checkout
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
    const [loginMode, setLoginMode] = useState(true);
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', province: '', zipCode: '', paymentChoice: '' });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);

    // Admin States
    const [newProduct, setNewProduct] = useState({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    
    // Cupones
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, 
        expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '' 
    });
    
    // Proveedores Mejorados
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', ig: '', associatedProducts: [] });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    
    // Gastos y Compras
    const [expenseModalMode, setExpenseModalMode] = useState('closed'); 
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [purchaseCart, setPurchaseCart] = useState([]); 
    const [newPurchaseItem, setNewPurchaseItem] = useState({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null });
    const [productSearchTerm, setProductSearchTerm] = useState(''); 
    
    // POS & Quote
    const [posCart, setPosCart] = useState([]);
    const [posSearch, setPosSearch] = useState('');
    const [showPosModal, setShowPosModal] = useState(false);
    const [quoteCart, setQuoteCart] = useState([]);
    const [quoteClient, setQuoteClient] = useState({ name: '', phone: '' });
    const [quoteDiscount, setQuoteDiscount] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null);
    
    // Settings & Team
    const [aboutText, setAboutText] = useState('');
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });

    // Refs
    const fileInputRef = useRef(null);
    const purchaseFileInputRef = useRef(null);

    // --- UTILIDADES ---
    const showToast = (msg, type = 'info') => { 
        const id = Date.now(); 
        setToasts(prev => { const filtered = prev.filter(t => Date.now() - t.id < 2000); return [...filtered, { id, message: msg, type }]; });
    };
    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
    const confirmAction = (title, message, action, isDangerous=false) => setModalConfig({ isOpen: true, title, message, onConfirm: () => { action(); setModalConfig({ ...modalConfig, isOpen: false }); }, isDangerous });
    
    // Roles
    const getRole = (email) => {
        if (!email || !settings) return 'user';
        const clean = email.trim().toLowerCase();
        if (clean === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';
        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === clean);
        return member ? member.role : 'user';
    };
    
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => {
        const role = getRole(email);
        return role === 'admin' || role === 'employee';
    };

    // --- EFFECTS ---
    // Sincronizar Carrito Local y Firestore (Para monitoreo de "Demanda" en Admin)
    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));
        // Si hay usuario logueado, subimos su carrito a la colección 'carts' para que el admin vea la demanda
        if (currentUser && currentUser.id) {
            const syncCart = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        // No guardamos el nombre para privacidad en la vista de "demanda de producto", solo items
                        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) { console.error("Error syncing cart", e); }
            };
            // Debounce para no saturar escrituras
            const debounce = setTimeout(syncCart, 2000);
            return () => clearTimeout(debounce);
        }
    }, [cart, currentUser]);

    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            setCheckoutData(prev => ({ ...prev, address: currentUser.address || prev.address, city: currentUser.city || prev.city, province: currentUser.province || prev.province, zipCode: currentUser.zipCode || prev.zipCode }));
        }
    }, [currentUser]);

    // Data Fetching
    useEffect(() => { 
        const init = async () => { 
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
                
                // Refrescar datos de usuario al cargar
                if (currentUser && currentUser.id) {
                    try {
                        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id));
                        if (userDoc.exists()) {
                            const freshData = { ...userDoc.data(), id: userDoc.id };
                            // Solo actualizar si hay cambios reales
                            if (JSON.stringify(freshData) !== JSON.stringify(currentUser)) setCurrentUser(freshData);
                        }
                    } catch (err) { console.warn("No se pudo refrescar usuario:", err); }
                }
            } catch (e) { console.error("Auth init error:", e); }
        }; 
        init(); 
        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            setTimeout(() => setIsLoading(false), 1500);
        }); 
    }, []);
    
    useEffect(() => {
        if(!systemUser) return;
        const subs = [
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => { setProducts(s.docs.map(d=>({id:d.id, ...d.data()}))); if(cart.length === 0) setIsLoading(false); }),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), s => setQuotes(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            // Live Carts Subscription (Data solo para estadísticas del Admin)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), s => {
                setLiveCarts(s.docs.map(d=>({id:d.id, ...d.data()})).filter(c => c.items && c.items.length > 0));
            }),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => { 
                if(!s.empty) { 
                    const d = s.docs[0].data(); 
                    // Fusionar con defaults y asegurar arrays
                    const merged = { 
                        ...defaultSettings, 
                        ...d, 
                        team: d.team || defaultSettings.team, 
                        categories: d.categories || defaultSettings.categories 
                    };
                    setSettings(merged); 
                    setTempSettings(merged); 
                    setAboutText(d.aboutUsText || defaultSettings.aboutUsText); 
                } else addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings); 
            })
        ];
        return () => subs.forEach(unsub => unsub());
    }, [systemUser]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa. Escribe "continuar" para la lógica de negocio y componentes.
    // --- LÓGICA DE NEGOCIO ---
    
    // Auth
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const uRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (isRegister) {
                if (!authData.name || !authData.username || !authData.email || !authData.password || !authData.dni || !authData.phone) 
                    throw new Error("Por favor completa todos los campos (incluyendo DNI y Teléfono)");
                
                const qEmail = query(uRef, where("email", "==", authData.email));
                if (!(await getDocs(qEmail)).empty) throw new Error("El email ya está registrado");
                
                const qUser = query(uRef, where("username", "==", authData.username));
                if (!(await getDocs(qUser)).empty) throw new Error("El nombre de usuario no está disponible");

                const newUser = { ...authData, role: 'user', joinDate: new Date().toISOString(), favorites: [] };
                const ref = await addDoc(uRef, newUser);
                setCurrentUser({ ...newUser, id: ref.id });
                showToast("¡Bienvenido a la familia Sustore!", "success");
            } else {
                if (!authData.email || !authData.password) throw new Error("Ingresa credenciales");
                let q = query(uRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let s = await getDocs(q);
                if (s.empty) { 
                    q = query(uRef, where("username", "==", authData.email), where("password", "==", authData.password)); 
                    s = await getDocs(q); 
                }
                
                if (s.empty) throw new Error("Credenciales inválidas");
                setCurrentUser({ ...s.docs[0].data(), id: s.docs[0].id });
                showToast("¡Hola de nuevo!", "success");
            }
            setView('store');
        } catch (e) { showToast(e.message, "error"); }
        setIsLoading(false);
    };

    // Favoritos (Nueva Funcionalidad)
    const toggleFavorite = async (prod) => {
        if (!currentUser) return showToast("Inicia sesión para guardar favoritos", "info");
        
        const isFav = currentUser.favorites?.includes(prod.id);
        const newFavs = isFav 
            ? currentUser.favorites.filter(id => id !== prod.id)
            : [...(currentUser.favorites || []), prod.id];
        
        // Actualizar estado local y remoto
        setCurrentUser(prev => ({ ...prev, favorites: newFavs }));
        
        try {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id);
            await updateDoc(userRef, { favorites: newFavs });
            showToast(isFav ? "Eliminado de favoritos" : "Añadido a favoritos", "success");
        } catch (e) { console.error(e); }
    };

    // Carrito
    const manageCart = (prod, delta) => {
        setCart(prevCart => {
            const exists = prevCart.find(i => i.product.id === prod.id);
            const currentQty = exists ? exists.quantity : 0;
            const newQty = currentQty + delta;
            
            if (newQty > Number(prod.stock)) { showToast(`Stock máximo: ${prod.stock}`, "warning"); return prevCart; }
            if (newQty <= 0) return prevCart.filter(i => i.product.id !== prod.id);
            
            if (exists) return prevCart.map(i => i.product.id === prod.id ? { ...i, quantity: newQty } : i);
            showToast("Agregado al carrito", "success"); 
            return [...prevCart, { product: prod, quantity: 1 }];
        });
    };

    // Cálculos
    const calculatePrice = (p, d) => d > 0 ? Math.ceil(Number(p) * (1 - d / 100)) : Number(p);
    const cartTotal = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);
    
    const getDiscountValue = (total, coupon) => {
        if (!coupon) return 0;
        if (coupon.type === 'fixed') return Math.min(total, coupon.value);
        if (coupon.type === 'percentage') {
            const val = total * (coupon.value / 100);
            return (coupon.maxDiscount > 0) ? Math.min(val, coupon.maxDiscount) : Math.ceil(val);
        }
        return 0;
    };
    
    const discountAmt = appliedCoupon ? getDiscountValue(cartTotal, appliedCoupon) : 0;
    const finalTotal = Math.max(0, cartTotal - discountAmt);

    // Confirmar Pedido
    const confirmOrder = async () => {
        if (isProcessingOrder) return;
        if(!currentUser) { setView('login'); return showToast("Inicia sesión primero", "info"); }
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Faltan datos de envío", "warning");

        setIsProcessingOrder(true);
        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;
            const newOrder = { 
                orderId, 
                userId: currentUser.id, 
                customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, dni: currentUser.dni }, 
                items: cart.map(i => ({ productId: i.product.id, title: i.product.name, quantity: i.quantity, unit_price: calculatePrice(i.product.basePrice, i.product.discount), image: i.product.image })), 
                total: finalTotal, 
                subtotal: cartTotal, 
                discount: discountAmt, 
                discountCode: appliedCoupon?.code || null, 
                status: 'Pendiente', 
                date: new Date().toISOString(), 
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, 
                paymentMethod: checkoutData.paymentChoice
            };
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), { userId: currentUser.id, items: [] }); // Limpiar live cart
            
            // Actualizar stock
            const batch = writeBatch(db);
            cart.forEach(i => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', i.product.id), { stock: increment(-i.quantity) }));
            if(appliedCoupon) {
                const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id);
                // Usamos lógica manual para update seguro
                const cDoc = await getDoc(cRef);
                const usedBy = cDoc.exists() ? (cDoc.data().usedBy || []) : [];
                batch.update(cRef, { usedBy: [...usedBy, currentUser.id] });
            }
            await batch.commit();

            setCart([]); setAppliedCoupon(null); setView('profile'); 
            showToast("¡Pedido realizado con éxito!", "success");
        } catch(e) { console.error(e); showToast("Error al procesar", "error"); }
        setIsProcessingOrder(false);
    };

    // --- FUNCIONES ADMIN ---
    
    // Proveedor (Validación Inteligente)
    const saveSupplierFn = async () => { 
        if(!newSupplier.name) return showToast("Nombre requerido", "warning"); 
        if(!newSupplier.phone && !newSupplier.ig) return showToast("Ingresa Teléfono O Instagram de contacto", "warning");
        
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), {
            ...newSupplier,
            associatedProducts: newSupplier.associatedProducts || []
        }); 
        setNewSupplier({name:'', contact:'', phone:'', ig:'', associatedProducts: []}); 
        setShowSupplierModal(false); 
        showToast("Proveedor guardado", "success"); 
    };

    // Productos
    const saveProductFn = async () => {
        if(!newProduct.name || Number(newProduct.basePrice) <= 0) return showToast("Datos inválidos", "warning");
        const d = { ...newProduct, basePrice: Number(newProduct.basePrice), stock: Number(newProduct.stock), discount: Number(newProduct.discount) };
        
        try {
            if(editingId) await updateDoc(doc(db,'artifacts',appId,'public','data','products',editingId), d);
            else await addDoc(collection(db,'artifacts',appId,'public','data','products'), d);
            setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0}); setEditingId(null); setShowProductForm(false);
            showToast("Producto guardado", "success");
        } catch(e) { showToast("Error al guardar", "error"); }
    };

    // Cupones
    const saveCouponFn = async () => {
        if(!newCoupon.code) return showToast("Código requerido", "warning");
        try {
            await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), { 
                ...newCoupon, 
                code: newCoupon.code.toUpperCase(), 
                value: Number(newCoupon.value), 
                minPurchase: Number(newCoupon.minPurchase||0), 
                maxDiscount: Number(newCoupon.maxDiscount||0), 
                usageLimit: Number(newCoupon.usageLimit||0),
                createdAt: new Date().toISOString()
            });
            setNewCoupon({code:'', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
            showToast("Cupón creado", "success");
        } catch(e) { showToast("Error creando cupón", "error"); }
    };

    // Configuración (BLINDADA)
    const saveSettingsFn = async () => { 
        if (!tempSettings) return;
        const sSnap = await getDocs(query(collection(db,'artifacts',appId,'public','data','settings'))); 
        const d = {...tempSettings, aboutUsText: aboutText}; 
        if(!sSnap.empty) await updateDoc(doc(db,'artifacts',appId,'public','data','settings',sSnap.docs[0].id), d); 
        else await addDoc(collection(db,'artifacts',appId,'public','data','settings'), d); 
        setSettings(d);
        showToast("Configuración actualizada", 'success'); 
    };

    const addTeamMemberFn = async () => { 
        if(!newTeamMember.email.includes('@')) return showToast("Email inválido", "warning"); 
        const currentTeam = settings.team || [];
        const updatedTeam = [...currentTeam, newTeamMember]; 
        setTempSettings(p => ({...p, team: updatedTeam})); // Actualizar UI local
        // Guardado real ocurre al dar click en "Guardar Configuración" o podemos hacerlo directo:
        // Por simplicidad, actualizamos tempSettings y forzamos un saveSettingsFn implícito si se desea UX inmediata
    };

    // --- DASHBOARD DATA (DEMANDA & FAVORITOS) ---
    const dashboardMetrics = useMemo(() => {
        // Calcular "Demanda" (Carritos + Favoritos)
        const productDemand = {}; // { id: { cartCount: 0, favCount: 0 } }
        
        // 1. Contar carritos activos
        liveCarts.forEach(c => {
            c.items?.forEach(item => {
                if(!productDemand[item.productId]) productDemand[item.productId] = { cartCount: 0, favCount: 0, total: 0 };
                productDemand[item.productId].cartCount += 1;
                productDemand[item.productId].total += 1;
            });
        });

        // 2. Contar favoritos (iteramos todos los usuarios cargados)
        users.forEach(u => {
            u.favorites?.forEach(pid => {
                if(!productDemand[pid]) productDemand[pid] = { cartCount: 0, favCount: 0, total: 0 };
                productDemand[pid].favCount += 1;
                productDemand[pid].total += 1;
            });
        });

        // Convertir a array y ordenar por popularidad
        const trendingProducts = Object.entries(productDemand)
            .map(([id, stats]) => {
                const p = products.find(prod => prod.id === id);
                return p ? { ...p, stats } : null;
            })
            .filter(Boolean)
            .sort((a,b) => b.stats.total - a.stats.total)
            .slice(0, 5);

        // Financiero
        const revenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
        const expensesTotal = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
        
        // Producto Estrella (Ventas reales)
        const salesCount = {};
        orders.forEach(o => o.items.forEach(i => {
            salesCount[i.productId] = (salesCount[i.productId] || 0) + i.quantity;
        }));
        const starProductId = Object.keys(salesCount).sort((a,b) => salesCount[b] - salesCount[a])[0];
        const starProduct = products.find(p => p.id === starProductId);

        return { revenue, expensesTotal, trendingProducts, starProduct, salesCount };
    }, [orders, expenses, products, liveCarts, users]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa. Escribe "continuar" para la Interfaz Gráfica (Modales, Navbar y Vistas).
    // --- SUB-COMPONENTS ---
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-800">
                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-2 neon-text">PEDIDO <span className="text-cyan-400">#{order.orderId}</span></h3>
                            <p className="text-slate-400 text-xs mt-1 flex items-center gap-2 font-bold tracking-wider"><Clock className="w-3 h-3"/> {new Date(order.date).toLocaleString()}</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition"><X className="w-5 h-5 text-slate-400"/></button>
                    </div>
                    <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                            <div><p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Estado</p><p className={`text-lg font-black ${order.status === 'Realizado' ? 'text-green-400' : 'text-yellow-400'}`}>{order.status}</p></div>
                            <span className="text-2xl font-black text-white">${order.total.toLocaleString()}</span>
                        </div>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-lg p-1"><img src={item.image} className="w-full h-full object-contain"/></div>
                                        <div><p className="text-white font-bold text-sm">{item.title}</p><p className="text-slate-500 text-xs">{item.quantity} x ${item.unit_price}</p></div>
                                    </div>
                                    <span className="text-white font-mono font-bold">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        const availableCoupons = coupons.filter(c => {
            if (new Date(c.expirationDate) < new Date()) return false;
            if (c.usageLimit && c.usedBy?.length >= c.usageLimit) return false;
            if (c.targetUser && currentUser && c.targetUser !== currentUser.email) return false;
            if (currentUser && c.usedBy?.includes(currentUser.id)) return false;
            return true;
        });

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-lg relative shadow-2xl border border-purple-500/20 bg-[#050505]">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-4 right-4 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                    <div className="p-8 bg-gradient-to-br from-purple-900/20 to-slate-900">
                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2"><Gift className="text-purple-400"/> Mis Cupones</h3>
                    </div>
                    <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {availableCoupons.length === 0 ? <p className="text-center text-slate-500 font-bold">No hay cupones disponibles para ti.</p> : availableCoupons.map(c => (
                            <div key={c.id} onClick={() => selectCoupon(c)} className="cursor-pointer bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-purple-500 transition group relative overflow-hidden">
                                <div className="flex justify-between items-center relative z-10">
                                    <div>
                                        <p className="text-purple-400 font-black text-xl tracking-widest">{c.code}</p>
                                        <p className="text-slate-400 text-xs font-bold mt-1">{c.type==='fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}</p>
                                    </div>
                                    {cartTotal >= c.minPurchase ? <div className="bg-purple-600 p-2 rounded-full text-white"><Plus className="w-4 h-4"/></div> : <p className="text-[10px] text-red-500 font-bold">Min: ${c.minPurchase}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && view === 'store') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-8"/>
                <h1 className="text-2xl font-black tracking-widest animate-pulse neon-text">SUSTORE</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Elements Globales */}
            <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div><div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow"></div></div>
            <div className="fixed top-24 right-4 z-[9999] space-y-2">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            <ConfirmModal isOpen={modalConfig.isOpen} {...modalConfig} onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} />
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- NAVBAR --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <button onClick={()=>setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50"><Menu className="w-6 h-6"/></button>
                        <div className="cursor-pointer group" onClick={()=>setView('store')}>
                            <span className="text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300">{settings?.storeName || 'SUSTORE'}</span>
                            <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500"></div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-3 w-1/3 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition shadow-inner">
                        <Search className="w-5 h-5 text-slate-400 mr-3"/>
                        <input className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium" placeholder="Buscar productos..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={()=>window.open(settings?.whatsappLink, '_blank')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm"><MessageCircle className="w-5 h-5"/> Soporte</button>
                        <button onClick={()=>setView('cart')} className="relative p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group">
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition"/>
                            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505]">{cart.length}</span>}
                        </button>
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm">{currentUser.name.charAt(0)}</div>
                            </button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition flex items-center gap-2"><User className="w-5 h-5"/> INGRESAR</button>
                        )}
                    </div>
                </nav>
            )}
            
            {/* --- MENÚ MÓVIL (RESTAURADO) --- */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-start">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={()=>setIsMenuOpen(false)}></div>
                    <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-up flex flex-col shadow-2xl z-[10001]">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-3xl font-black text-white neon-text">MENÚ</h2>
                            <button onClick={()=>setIsMenuOpen(false)} className="p-3 bg-slate-900 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="space-y-2 flex-1 overflow-y-auto">
                            <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl"><Home className="w-6 h-6"/> Inicio</button>
                            <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl"><User className="w-6 h-6"/> Mi Perfil</button>
                            <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl"><ShoppingBag className="w-6 h-6"/> Carrito ({cart.length})</button>
                            <div className="h-px bg-slate-800 my-2"></div>
                            <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                            <button onClick={()=>{setView('guide');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl"><FileQuestion className="w-6 h-6"/> Cómo Comprar</button>
                            
                            {hasAccess(currentUser?.email) && (
                                <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-4 bg-cyan-900/10 rounded-xl"><Shield className="w-6 h-6"/> Admin Panel</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view !== 'admin' && <div className="h-32"></div>}

            {/* --- MAIN CONTENT --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        {settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse">
                                <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase">{settings.announcementMessage}</p>
                            </div>
                        )}
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            {settings?.heroUrl ? <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60"/> : <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-purple-900 opacity-20"></div>}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-4">TECNOLOGÍA <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">DEL FUTURO</span></h1>
                                <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="w-fit px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition flex items-center gap-2">VER CATÁLOGO <ArrowRight className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===''?'bg-white text-black border-white':'bg-slate-900 border-slate-800 text-slate-400'}`}>Todos</button>
                            {settings?.categories?.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500':'bg-slate-900 border-slate-800 text-slate-400'}`}>{c}</button>)}
                        </div>

                        {products.length === 0 ? <EmptyState icon={Package} title="Catálogo Vacío" text="No hay productos disponibles."/> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                    <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 transition duration-500 relative flex flex-col">
                                        <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110"/>
                                            {/* Botón Favoritos */}
                                            <button onClick={(e)=>{e.stopPropagation(); toggleFavorite(p)}} className={`absolute top-4 right-4 p-3 rounded-full z-20 transition shadow-lg ${currentUser?.favorites?.includes(p.id) ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-white/10 text-slate-300 hover:bg-white hover:text-red-500'}`}>
                                                <Heart className={`w-5 h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`}/>
                                            </button>
                                            <button onClick={(e)=>{e.stopPropagation(); manageCart(p, 1)}} className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 hover:bg-cyan-400 transition z-20 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300"><Plus className="w-6 h-6"/></button>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">{p.category}</p>
                                                {p.stock === 0 && <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded">AGOTADO</span>}
                                            </div>
                                            <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2">{p.name}</h3>
                                            <div className="mt-auto pt-4 border-t border-slate-800/50 flex flex-col">
                                                {p.discount > 0 && <span className="text-xs text-slate-500 line-through font-medium">${p.basePrice.toLocaleString()}</span>}
                                                <span className="text-2xl font-black text-white tracking-tight">${calculatePrice(p.basePrice, p.discount).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- VISTAS SIMPLES (CARRITO, CHECKOUT, PERFIL) --- */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up">
                        <div className="flex items-center gap-4 mb-8"><button onClick={()=>setView('store')}><ArrowLeft className="text-slate-400 hover:text-white"/></button><h1 className="text-4xl font-black text-white">Mi Carrito</h1></div>
                        {cart.length === 0 ? <EmptyState icon={ShoppingCart} title="Carrito vacío" action={()=>setView('store')} actionText="Ir a la Tienda"/> : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex gap-6 items-center">
                                            <img src={item.product.image} className="w-24 h-24 object-contain bg-white rounded-xl p-2"/>
                                            <div className="flex-1"><h3 className="font-bold text-white">{item.product.name}</h3><p className="text-cyan-400 font-bold">${calculatePrice(item.product.basePrice, item.product.discount).toLocaleString()}</p></div>
                                            <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1"><button onClick={()=>manageCart(item.product, -1)} className="p-2 text-white"><Minus className="w-4 h-4"/></button><span className="text-white font-bold w-4 text-center">{item.quantity}</span><button onClick={()=>manageCart(item.product, 1)} className="p-2 text-white"><Plus className="w-4 h-4"/></button></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28">
                                    <h3 className="text-xl font-black text-white mb-6">Resumen</h3>
                                    {appliedCoupon ? (
                                        <div className="bg-purple-900/20 p-4 rounded-xl flex justify-between items-center mb-6"><span className="text-purple-300 font-bold">{appliedCoupon.code}</span><button onClick={()=>setAppliedCoupon(null)}><X className="w-4 h-4 text-purple-300"/></button></div>
                                    ) : (
                                        <button onClick={()=>setShowCouponModal(true)} className="w-full py-3 mb-6 bg-slate-900 text-slate-400 rounded-xl font-bold flex justify-center gap-2"><Ticket className="w-4 h-4"/> Aplicar Cupón</button>
                                    )}
                                    <div className="space-y-2 mb-6 text-sm"><div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${cartTotal.toLocaleString()}</span></div><div className="flex justify-between text-slate-400"><span>Envío</span><span className="text-green-400">Gratis</span></div>{discountAmt > 0 && <div className="flex justify-between text-purple-400 font-bold"><span>Descuento</span><span>-${discountAmt.toLocaleString()}</span></div>}</div>
                                    <div className="flex justify-between items-end mb-8"><span className="text-white font-bold">Total</span><span className="text-3xl font-black text-white">${finalTotal.toLocaleString()}</span></div>
                                    <button onClick={()=>setView('checkout')} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold">Iniciar Compra</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'checkout' && (
                    <div className="max-w-4xl mx-auto pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-6 text-slate-400 hover:text-white flex items-center gap-2 font-bold"><ArrowLeft className="w-4 h-4"/> Volver</button>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                    <h2 className="text-xl font-black text-white mb-4">Envío</h2>
                                    <input className="input-cyber w-full p-4 mb-3" placeholder="Dirección" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                                    <div className="grid grid-cols-2 gap-3"><input className="input-cyber w-full p-4" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/><input className="input-cyber w-full p-4" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/></div>
                                    <input className="input-cyber w-full p-4 mt-3" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem]">
                                    <h2 className="text-xl font-black text-white mb-4">Pago</h2>
                                    <div className="grid grid-cols-2 gap-3">{['Transferencia', 'Efectivo'].map(m=><button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-4 rounded-xl border font-bold ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/20 text-cyan-400':'border-slate-700 text-slate-500'}`}>{m}</button>)}</div>
                                </div>
                            </div>
                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] h-fit">
                                <h3 className="font-black text-white mb-6 text-xl">Confirmar</h3>
                                <div className="flex justify-between items-end mb-6"><span className="text-white font-bold">Total a Pagar</span><span className="text-3xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span></div>
                                <button onClick={confirmOrder} disabled={isProcessingOrder} className="w-full bg-green-600 hover:bg-green-500 py-4 text-white font-bold rounded-xl flex justify-center items-center gap-2">{isProcessingOrder ? <Loader2 className="animate-spin"/> : 'Confirmar Pedido'}</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* VISTA PERFIL (Con Favoritos y Pedidos) */}
                {view === 'profile' && currentUser && (
                    <div className="max-w-6xl mx-auto pt-4 animate-fade-up px-6 pb-20">
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl z-10">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="text-center md:text-left z-10 flex-1">
                                <h2 className="text-4xl font-black text-white mb-2">{currentUser.name}</h2>
                                <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2"><Mail className="w-4 h-4"/> {currentUser.email}</p>
                                <div className="mt-2 flex gap-4 justify-center md:justify-start text-xs text-slate-500 font-mono">
                                    <span>ID: {currentUser.dni || '-'}</span>
                                    <span>Tel: {currentUser.phone || '-'}</span>
                                </div>
                            </div>
                            <div className="flex gap-4 z-10">
                                {hasAccess(currentUser.email) && (
                                    <button onClick={()=>setView('admin')} className="px-6 py-3 bg-slate-900 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/20 rounded-xl font-bold transition flex items-center gap-2"><Shield className="w-5 h-5"/> Admin</button>
                                )}
                                <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="px-6 py-3 bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 rounded-xl font-bold transition flex items-center gap-2"><LogOut className="w-5 h-5"/> Salir</button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-10">
                            {/* Historial Pedidos */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3"><Package className="text-cyan-400"/> Mis Pedidos</h3>
                                {orders.filter(o => o.userId === currentUser.id).length === 0 ? (
                                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">No has realizado compras aún.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {orders.filter(o => o.userId === currentUser.id).map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl flex justify-between items-center cursor-pointer transition group">
                                                <div>
                                                    <p className="font-bold text-white text-lg group-hover:text-cyan-400 transition mb-1">Pedido #{o.orderId}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3"/> {new Date(o.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-white text-xl mb-2">${o.total.toLocaleString()}</p>
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${o.status==='Realizado'?'bg-green-900/20 text-green-400 border-green-900/50':'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'}`}>{o.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Favoritos */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3"><Heart className="text-red-400"/> Mis Favoritos</h3>
                                {!currentUser.favorites || currentUser.favorites.length === 0 ? (
                                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">Aún no tienes favoritos guardados.</div>
                                ) : (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                        {currentUser.favorites.map(fid => {
                                            const p = products.find(prod => prod.id === fid);
                                            if(!p) return null;
                                            return (
                                                <div key={fid} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative group">
                                                    <img src={p.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1"/>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-white line-clamp-1">{p.name}</p>
                                                        <p className="text-cyan-400 font-bold text-sm">${p.basePrice.toLocaleString()}</p>
                                                    </div>
                                                    <button onClick={()=>toggleFavorite(p)} className="p-2 bg-slate-900 text-red-400 hover:bg-red-900/20 rounded-lg transition"><Trash2 className="w-4 h-4"/></button>
                                                    <button onClick={()=>manageCart(p, 1)} className="p-2 bg-slate-900 text-cyan-400 hover:bg-cyan-900/20 rounded-lg transition"><Plus className="w-4 h-4"/></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PANEL DE ADMINISTRACIÓN --- */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full font-sans">
                        {/* Sidebar */}
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static shadow-2xl`}>
                            <div className="p-8 border-b border-slate-900"><h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3"><Shield className="text-cyan-600"/> ADMIN</h2></div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='dashboard'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><LayoutDashboard className="w-5 h-5"/>Dashboard</button>
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='products'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Package className="w-5 h-5"/>Productos</button>
                                {isAdmin(currentUser?.email) && (
                                    <>
                                        <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='settings'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Settings className="w-5 h-5"/>Configuración</button>
                                        <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='suppliers'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Truck className="w-5 h-5"/>Proveedores</button>
                                        <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='coupons'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Ticket className="w-5 h-5"/>Cupones</button>
                                    </>
                                )}
                            </nav>
                            <div className="p-6 border-t border-slate-900"><button onClick={()=>setView('store')} className="w-full py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold text-sm flex items-center justify-center gap-2"><LogOut className="w-4 h-4"/> Volver a Tienda</button></div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800"><Menu className="w-6 h-6"/></button>
                            
                            {adminTab === 'dashboard' && (
                                <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8">
                                    <h1 className="text-4xl font-black text-white mb-8 neon-text">Dashboard</h1>
                                    
                                    {/* Métricas Principales */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]"><p className="text-slate-500 font-black text-[10px] tracking-widest mb-2">INGRESOS</p><p className="text-3xl font-black text-green-400">${dashboardMetrics.revenue.toLocaleString()}</p></div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]"><p className="text-slate-500 font-black text-[10px] tracking-widest mb-2">PEDIDOS</p><p className="text-3xl font-black text-white">{orders.length}</p></div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]"><p className="text-slate-500 font-black text-[10px] tracking-widest mb-2">CLIENTES</p><p className="text-3xl font-black text-white">{users.length}</p></div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]"><p className="text-slate-500 font-black text-[10px] tracking-widest mb-2">CARRITOS ACTIVOS</p><p className="text-3xl font-black text-blue-400">{liveCarts.length}</p></div>
                                    </div>

                                    <div className="grid lg:grid-cols-3 gap-8">
                                        {/* Top Demanda (Anónimo) */}
                                        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                <h3 className="text-xl font-black text-white flex items-center gap-2"><Flame className="text-orange-500"/> Tendencia de Demanda</h3>
                                                <span className="text-xs text-slate-500 font-bold bg-slate-900 px-3 py-1 rounded-full">En Vivo (Carritos + Favoritos)</span>
                                            </div>
                                            <div className="space-y-4 relative z-10">
                                                {dashboardMetrics.trendingProducts.length === 0 ? <p className="text-slate-500">Sin datos de actividad reciente.</p> : dashboardMetrics.trendingProducts.map((p, idx) => (
                                                    <div key={p.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <span className={`font-black text-lg w-8 ${idx===0?'text-yellow-400':'text-slate-600'}`}>#{idx+1}</span>
                                                            <img src={p.image} className="w-10 h-10 rounded-lg bg-white object-contain p-1"/>
                                                            <div><p className="font-bold text-white text-sm">{p.name}</p><p className="text-[10px] text-slate-500 uppercase font-bold">Stock: {p.stock}</p></div>
                                                        </div>
                                                        <div className="flex gap-4 text-xs font-bold">
                                                            <div className="text-center"><p className="text-slate-500">En Carrito</p><p className="text-blue-400">{p.stats.cartCount}</p></div>
                                                            <div className="text-center"><p className="text-slate-500">En Favoritos</p><p className="text-red-400">{p.stats.favCount}</p></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Producto Estrella (Ventas) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                                            <h3 className="text-xl font-black text-white mb-6 relative z-10 flex items-center gap-2"><Trophy className="text-yellow-400"/> Top Ventas</h3>
                                            {dashboardMetrics.starProduct ? (
                                                <div className="relative z-10 text-center">
                                                    <img src={dashboardMetrics.starProduct.image} className="w-32 h-32 mx-auto bg-white rounded-2xl object-contain p-2 shadow-xl mb-4"/>
                                                    <h4 className="text-white font-black text-xl mb-1">{dashboardMetrics.starProduct.name}</h4>
                                                    <p className="text-yellow-400 font-bold text-lg">{dashboardMetrics.salesCount[dashboardMetrics.starProduct.id]} Vendidos</p>
                                                </div>
                                            ) : <p className="text-slate-500 relative z-10">Esperando ventas...</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'settings' && (
                                <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Configuración</h1>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] space-y-10">
                                        
                                        {/* Categorías (Null Check Fix) */}
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-4">Categorías</h3>
                                            <div className="flex gap-4 mb-4">
                                                <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" placeholder="Nueva categoría" value={newCategory} onChange={e=>setNewCategory(e.target.value)}/>
                                                <button onClick={()=>{if(newCategory){setTempSettings({...tempSettings, categories:[...(tempSettings.categories||[]), newCategory]}); setNewCategory('');}}} className="bg-blue-600 px-6 rounded-xl text-white font-bold">Añadir</button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(tempSettings?.categories || []).map(c=>(
                                                    <span key={c} className="bg-slate-900 px-3 py-1 rounded-lg text-sm text-slate-300 border border-slate-700 flex items-center gap-2">
                                                        {c} <button onClick={()=>setTempSettings({...tempSettings, categories: tempSettings.categories.filter(x=>x!==c)})}><X className="w-3 h-3 text-red-500"/></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Equipo (Protección Admin) */}
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-4">Equipo</h3>
                                            <div className="flex gap-2 mb-4">
                                                <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" placeholder="Email" value={newTeamMember.email} onChange={e=>setNewTeamMember({...newTeamMember, email:e.target.value})}/>
                                                <select className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" value={newTeamMember.role} onChange={e=>setNewTeamMember({...newTeamMember, role:e.target.value})}><option value="employee">Empleado</option><option value="admin">Admin</option></select>
                                                <button onClick={addTeamMemberFn} className="bg-purple-600 px-4 rounded-xl text-white"><Plus/></button>
                                            </div>
                                            <div className="space-y-2">
                                                {(tempSettings?.team || []).map((m, idx) => (
                                                    <div key={idx} className="flex justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                                        <span className="text-white text-sm">{m.email} <span className="text-slate-500 text-xs">({m.role})</span></span>
                                                        {m.email !== SUPER_ADMIN_EMAIL && <button onClick={()=>{const nT = tempSettings.team.filter(x=>x.email!==m.email); setTempSettings({...tempSettings, team:nT});}} className="text-red-400"><Trash2 className="w-4 h-4"/></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" placeholder="Mensaje Marquesina" value={tempSettings?.announcementMessage || ''} onChange={e=>setTempSettings({...tempSettings, announcementMessage:e.target.value})}/>
                                            <textarea className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white resize-none" placeholder="Texto Sobre Nosotros" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
                                        </div>

                                        <button onClick={saveSettingsFn} className="w-full bg-cyan-600 py-4 rounded-xl text-white font-bold shadow-lg hover:bg-cyan-500 transition">Guardar Cambios</button>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'suppliers' && (
                                <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
                                    <div className="flex justify-between items-center"><h1 className="text-3xl font-black text-white">Proveedores</h1><button onClick={()=>setShowSupplierModal(true)} className="bg-cyan-600 px-6 py-2 rounded-xl font-bold text-white flex gap-2"><Plus className="w-5 h-5"/> Nuevo</button></div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {suppliers.map(s=>(
                                            <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] group hover:border-slate-600 transition">
                                                <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
                                                <div className="space-y-2 mb-4 text-sm text-slate-400">
                                                    <p className="flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p>
                                                    {s.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4"/> {s.phone}</p>}
                                                    {s.ig && <p className="flex items-center gap-2"><Instagram className="w-4 h-4"/> {s.ig}</p>}
                                                </div>
                                                <div className="pt-4 border-t border-slate-800">
                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Productos</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(s.associatedProducts || []).map(pid => {
                                                            const p = products.find(prod=>prod.id===pid);
                                                            if(!p) return null;
                                                            return <img key={pid} src={p.image} className="w-8 h-8 rounded bg-white object-contain p-0.5 border border-slate-600" title={p.name}/>
                                                        })}
                                                    </div>
                                                </div>
                                                <button onClick={async ()=>{await deleteDoc(doc(db,'artifacts',appId,'public','data','suppliers',s.id)); showToast("Eliminado","success")}} className="mt-4 w-full py-2 bg-slate-900 text-red-400 rounded-lg hover:bg-red-900/20 text-xs font-bold">Eliminar</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Otros Tabs simples para evitar errores de renderizado */}
                            {adminTab === 'products' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <div className="flex justify-between mb-6"><h1 className="text-3xl font-black text-white">Productos</h1><button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="bg-cyan-600 px-6 py-2 rounded-xl text-white font-bold">Nuevo</button></div>
                                    {showProductForm && (
                                        <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2rem] mb-8 grid gap-4">
                                            <input className="input-cyber p-3" placeholder="Nombre" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input className="input-cyber p-3" type="number" placeholder="Precio" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                <input className="input-cyber p-3" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                            </div>
                                            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl cursor-pointer" onClick={()=>fileInputRef.current.click()}>
                                                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center overflow-hidden">{newProduct.image?<img src={newProduct.image} className="w-full h-full object-cover"/>:<FolderPlus className="text-slate-500"/>}</div>
                                                <span className="text-slate-400 text-sm">Cargar Imagen</span>
                                                <input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="hidden"/>
                                            </div>
                                            <div className="flex gap-2 justify-end"><button onClick={()=>setShowProductForm(false)} className="text-slate-400 px-4">Cancelar</button><button onClick={saveProductFn} className="bg-cyan-600 px-6 py-2 rounded-xl text-white font-bold">Guardar</button></div>
                                        </div>
                                    )}
                                    <div className="grid gap-3">
                                        {products.map(p=>(
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                                <div className="flex items-center gap-4"><img src={p.image} className="w-10 h-10 bg-white rounded object-contain p-1"/><span className="text-white font-bold">{p.name}</span></div>
                                                <div className="flex gap-2"><button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-2 bg-slate-900 rounded text-cyan-400"><Edit className="w-4 h-4"/></button><button onClick={()=>deleteProductFn(p)} className="p-2 bg-slate-900 rounded text-red-400"><Trash2 className="w-4 h-4"/></button></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'coupons' && (
                                <div className="max-w-4xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-6">Cupones</h1>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] mb-8 grid gap-4">
                                        <div className="flex gap-4"><input className="input-cyber flex-1 p-3" placeholder="CÓDIGO" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon,code:e.target.value})}/><input className="input-cyber w-32 p-3" type="number" placeholder="Valor" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon,value:e.target.value})}/></div>
                                        <div className="flex gap-4">
                                            <select className="input-cyber flex-1 p-3" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon,type:e.target.value})}><option value="percentage">% Porcentaje</option><option value="fixed">$ Fijo</option></select>
                                            <input className="input-cyber flex-1 p-3" type="number" placeholder="Compra Min." value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon,minPurchase:e.target.value})}/>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-cyan-600 py-3 rounded-xl text-white font-bold">Crear Cupón</button>
                                    </div>
                                    <div className="space-y-3">
                                        {coupons.map(c=>(
                                            <div key={c.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                                <div><p className="text-white font-black">{c.code}</p><p className="text-slate-500 text-xs">{c.type==='fixed' ? `$${c.value}` : `${c.value}%`} OFF</p></div>
                                                <button onClick={()=>deleteCouponFn(c.id)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Proveedores (Corrección Visual) */}
                        {showSupplierModal && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                                <div className="bg-[#0a0a0a] border border-slate-700 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                                    <h3 className="text-2xl font-black text-white mb-6">Nuevo Proveedor</h3>
                                    <div className="space-y-4 mb-6">
                                        <input className="input-cyber w-full p-3" placeholder="Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name:e.target.value})}/>
                                        <input className="input-cyber w-full p-3" placeholder="Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier, contact:e.target.value})}/>
                                        <div className="grid grid-cols-2 gap-4"><input className="input-cyber w-full p-3" placeholder="Teléfono" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier, phone:e.target.value})}/><input className="input-cyber w-full p-3" placeholder="Instagram" value={newSupplier.ig} onChange={e=>setNewSupplier({...newSupplier, ig:e.target.value})}/></div>
                                        <div>
                                            <p className="text-slate-500 text-xs font-bold mb-2 uppercase">Asignar Productos</p>
                                            <div className="h-40 overflow-y-auto bg-slate-900 rounded-xl p-2 border border-slate-800">
                                                {products.map(p => (
                                                    <div key={p.id} onClick={()=>{const prev=newSupplier.associatedProducts||[]; setNewSupplier({...newSupplier, associatedProducts: prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id]})}} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer mb-1 ${newSupplier.associatedProducts?.includes(p.id)?'bg-cyan-900/30 border border-cyan-500/30':'hover:bg-slate-800 border border-transparent'}`}>
                                                        <img src={p.image} className="w-6 h-6 bg-white rounded object-contain"/>
                                                        <span className="text-xs text-white truncate flex-1">{p.name}</span>
                                                        {newSupplier.associatedProducts?.includes(p.id) && <CheckCircle className="w-3 h-3 text-cyan-400"/>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4"><button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-3 text-slate-400 bg-slate-900 rounded-xl font-bold">Cancelar</button><button onClick={saveSupplierFn} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold">Guardar</button></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LOGIN / REGISTER (Con DNI/Phone) */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 animate-fade-up backdrop-blur-xl">
                        <button onClick={()=>setView('store')} className="absolute top-8 right-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><X className="w-6 h-6"/></button>
                        <div className="bg-[#0a0a0a] p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800">
                            <h2 className="text-4xl font-black text-white mb-8 text-center">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-4">
                                {!loginMode && (
                                    <>
                                        <input className="input-cyber w-full p-3" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})}/>
                                        <input className="input-cyber w-full p-3" placeholder="Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})}/>
                                        <div className="grid grid-cols-2 gap-4"><input className="input-cyber p-3" placeholder="DNI" value={authData.dni} onChange={e=>setAuthData({...authData, dni:e.target.value})}/><input className="input-cyber p-3" placeholder="Teléfono" value={authData.phone} onChange={e=>setAuthData({...authData, phone:e.target.value})}/></div>
                                    </>
                                )}
                                <input className="input-cyber w-full p-3" placeholder="Email" value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})}/>
                                <input className="input-cyber w-full p-3" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})}/>
                                <button type="submit" className="w-full bg-cyan-600 py-4 text-white rounded-xl font-bold mt-6 hover:bg-cyan-500 transition">{isLoading?<Loader2 className="animate-spin mx-auto"/>:(loginMode?'INGRESAR':'REGISTRARSE')}</button>
                            </form>
                            <button onClick={()=>setLoginMode(!loginMode)} className="w-full text-center text-slate-500 text-sm mt-6 font-bold hover:text-white">{loginMode ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}</button>
                        </div>
                    </div>
                )}

                {/* ABOUT & GUIDE */}
                {view === 'about' && (
                    <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                        <button onClick={()=>setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400"><ArrowLeft/></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text"><Info className="text-cyan-400 w-12 h-12"/> Sobre Nosotros</h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] text-slate-300 text-xl leading-relaxed whitespace-pre-wrap">{settings.aboutUsText}</div>
                    </div>
                )}
                {view === 'guide' && (
                    <div className="max-w-4xl mx-auto pt-10 px-6 animate-fade-up pb-20">
                        <button onClick={()=>setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400"><ArrowLeft/></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text"><FileQuestion className="text-cyan-400 w-12 h-12"/> Cómo Comprar</h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] text-slate-300 text-lg space-y-6">
                            <p>1. Selecciona tus productos favoritos y agrégalos al carrito.</p>
                            <p>2. Ve al carrito y revisa tu pedido. Si tienes un cupón, ¡úsalo!</p>
                            <p>3. Completa tus datos de envío y elige el método de pago.</p>
                            <p>4. Confirma el pedido. Recibirás un email con los detalles.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
