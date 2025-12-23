import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, UserCheck, UserX, Link } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment, setDoc } from 'firebase/firestore';

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
    // Nuevo Estado: Carritos en vivo (para admin)
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
        // Super Admin check
        if (clean === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';
        // Settings Team check
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
    // Sincronizar Carrito Local y Firestore (Live Cart Feature)
    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));
        // Si el usuario está logueado, sincronizamos su carrito en DB para el Admin Panel
        if (currentUser && currentUser.id) {
            const syncCart = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        items: cart,
                        updatedAt: new Date().toISOString()
                    });
                } catch (e) { console.error("Error syncing cart", e); }
            };
            const debounce = setTimeout(syncCart, 1000);
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
                
                if (currentUser && currentUser.id) {
                    try {
                        const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id));
                        if (userDoc.exists()) {
                            const freshData = { ...userDoc.data(), id: userDoc.id };
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
            // Live Carts Subscription (Para Admin)
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), s => {
                setLiveCarts(s.docs.map(d=>({id:d.id, ...d.data()})).filter(c => c.items && c.items.length > 0));
            }),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => { 
                if(!s.empty) { 
                    const d = s.docs[0].data(); 
                    // Fusionar con defaults para evitar crashes si faltan campos
                    const merged = { ...defaultSettings, ...d, team: d.team || defaultSettings.team, categories: d.categories || defaultSettings.categories };
                    setSettings(merged); 
                    setTempSettings(merged); 
                    setAboutText(d.aboutUsText || defaultSettings.aboutUsText); 
                } else addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings); 
            })
        ];
        return () => subs.forEach(unsub => unsub());
    }, [systemUser]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa. Por favor escribe "continuar" para generar la siguiente parte.
    // --- LOGIC FUNCTIONS ---
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const uRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (isRegister) {
                // Validaciones estrictas
                if (!authData.name || !authData.username || !authData.email || !authData.password || !authData.dni || !authData.phone) 
                    throw new Error("Por favor completa todos los campos (incluyendo DNI y Teléfono)");
                
                // Validar duplicados (Email y Usuario)
                const qEmail = query(uRef, where("email", "==", authData.email));
                const sEmail = await getDocs(qEmail);
                if (!sEmail.empty) throw new Error("El email ya está registrado");
                
                const qUser = query(uRef, where("username", "==", authData.username));
                const sUser = await getDocs(qUser);
                if (!sUser.empty) throw new Error("El nombre de usuario no está disponible");

                const newUser = { ...authData, role: 'user', joinDate: new Date().toISOString(), points: 0 };
                const ref = await addDoc(uRef, newUser);
                setCurrentUser({ ...newUser, id: ref.id });
                showToast("¡Bienvenido a la familia Sustore!", "success");
            } else {
                if (!authData.email || !authData.password) throw new Error("Ingresa usuario y contraseña");
                // Login flexible: permite email o username
                let q = query(uRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let s = await getDocs(q);
                if (s.empty) { q = query(uRef, where("username", "==", authData.email), where("password", "==", authData.password)); s = await getDocs(q); }
                
                if (s.empty) throw new Error("Credenciales inválidas");
                setCurrentUser({ ...s.docs[0].data(), id: s.docs[0].id });
                showToast("¡Hola de nuevo!", "success");
            }
            setView('store');
        } catch (e) { showToast(e.message, "error"); }
        setIsLoading(false);
    };

    const manageCart = (prod, delta) => {
        if (!prod || !prod.id) return showToast("Error al agregar producto", "error");
        setCart(prevCart => {
            const exists = prevCart.find(i => i.product.id === prod.id);
            const currentQty = exists ? exists.quantity : 0;
            const newQty = currentQty + delta;
            
            if (newQty > Number(prod.stock)) { showToast(`Stock máximo disponible: ${prod.stock}`, "warning"); return prevCart; }
            if (newQty <= 0) { 
                if (exists) showToast("Producto eliminado del carrito", "info"); 
                return prevCart.filter(i => i.product.id !== prod.id); 
            }
            
            if (exists) { 
                return prevCart.map(i => i.product.id === prod.id ? { ...i, quantity: newQty } : i); 
            } else { 
                showToast("¡Producto agregado al carrito!", "success"); 
                return [...prevCart, { product: prod, quantity: 1 }]; 
            }
        });
    };

    const calculatePrice = (p, d) => d > 0 ? Math.ceil(Number(p) * (1 - d / 100)) : Number(p);
    const cartTotal = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);

    // --- LÓGICA DE CUPONES (Con tope de reintegro) ---
    const getDiscountValue = (total, coupon) => {
        if (!coupon) return 0;
        if (coupon.type === 'fixed') return Math.min(total, coupon.value);
        if (coupon.type === 'percentage') {
            const calculated = total * (coupon.value / 100);
            if (coupon.maxDiscount && coupon.maxDiscount > 0) {
                return Math.min(calculated, coupon.maxDiscount);
            }
            return Math.ceil(calculated);
        }
        return 0;
    };

    const discountAmt = appliedCoupon ? getDiscountValue(cartTotal, appliedCoupon) : 0;
    const finalTotal = Math.max(0, cartTotal - discountAmt);

    const selectCoupon = (c) => {
        if (new Date(c.expirationDate) < new Date()) return showToast("Este cupón ha vencido", "error");
        if (c.usageLimit && c.usedBy && c.usedBy.length >= c.usageLimit) return showToast("Este cupón ha agotado sus usos", "error");
        if (cartTotal < (c.minPurchase || 0)) return showToast(`Necesitas una compra mínima de $${c.minPurchase}`, "warning");
        if (c.targetUser && currentUser && c.targetUser !== currentUser.email) return showToast("Este cupón no es para ti", "error");

        setAppliedCoupon(c);
        setShowCouponModal(false);
        let msg = "Cupón aplicado correctamente.";
        if (c.type === 'percentage' && c.maxDiscount > 0) msg += ` (Tope de reintegro: $${c.maxDiscount})`;
        showToast(msg, "success");
    };

    const confirmOrder = async () => {
        if (isProcessingOrder) return;
        if(!currentUser) { setView('login'); return showToast("Inicia sesión para finalizar tu compra", "info"); }
        
        // Validación estricta de datos de envío
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province || !checkoutData.zipCode) 
            return showToast("Por favor completa TODOS los datos de envío", "warning");
        
        if(appliedCoupon && cartTotal < (appliedCoupon.minPurchase || 0)) return showToast(`Compra mínima para el cupón: $${appliedCoupon.minPurchase}`, "error");

        setIsProcessingOrder(true);
        showToast("Procesando tu pedido...", "info");

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
                discountCode: appliedCoupon ? appliedCoupon.code : null, 
                status: 'Pendiente', 
                date: new Date().toISOString(), 
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, 
                paymentMethod: checkoutData.paymentChoice,
                viewed: false 
            };
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode });
            
            // Vaciar carrito 'vivo' en DB
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), { userId: currentUser.id, items: [] });

            // Envío de email (backend)
            fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newOrder, shipping: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province}`, discountDetails: appliedCoupon ? { percentage: appliedCoupon.type === 'percentage' ? appliedCoupon.value : 0, amount: discountAmt } : null }) }).catch(err => console.log("Email skipped/error"));
            
            // Actualización de Stock
            const batch = writeBatch(db);
            cart.forEach(i => {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.product.id);
                batch.update(ref, { stock: increment(-i.quantity) });
            });

            // Registrar uso del cupón
            if(appliedCoupon) { 
                const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id); 
                const cSnap = await getDoc(cRef); 
                if(cSnap.exists()) {
                    const currentUses = cSnap.data().usedBy || [];
                    batch.update(cRef, { usedBy: [...currentUses, currentUser.id] });
                }
            }
            
            await batch.commit();

            setCart([]); 
            setAppliedCoupon(null); 
            setView('profile'); 
            showToast("¡Pedido realizado con éxito! Gracias por tu compra.", "success");
        } catch(e) { console.error(e); showToast("Ocurrió un error al procesar el pedido.", "error"); }
        setIsProcessingOrder(false);
    };

    // --- ADMIN FUNCTIONS ---
    const saveProductFn = async () => {
        if(!newProduct.name) return showToast("El nombre es obligatorio", "warning");
        if(Number(newProduct.basePrice) <= 0) return showToast("El precio debe ser mayor a 0", "warning");

        const d = {
            ...newProduct, 
            basePrice: Number(newProduct.basePrice), 
            stock: Number(newProduct.stock), 
            discount: Number(newProduct.discount), 
            image: newProduct.image || 'https://via.placeholder.com/150',
            lastUpdated: new Date().toISOString()
        };

        try {
            if(editingId) {
                await updateDoc(doc(db,'artifacts',appId,'public','data','products',editingId), d);
                showToast("Producto actualizado correctamente", "success");
            } else {
                await addDoc(collection(db,'artifacts',appId,'public','data','products'), d);
                showToast("Producto creado correctamente", "success");
            }
            setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0}); 
            setEditingId(null); 
            setShowProductForm(false);
        } catch(e) { showToast("Error al guardar producto", "error"); }
    };

    const deleteProductFn = (p) => confirmAction("Eliminar Producto", `¿Estás seguro de que deseas eliminar "${p.name}"? Esta acción no se puede deshacer.`, async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','products',p.id)); showToast("Producto eliminado", "success"); }, true);
    
    const saveCouponFn = async () => {
        if(!newCoupon.code) return showToast("Falta el código del cupón", "warning");
        if(newCoupon.type === 'percentage' && newCoupon.value > 100) return showToast("El porcentaje no puede ser mayor a 100", "warning");
        
        try {
            await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), { 
                ...newCoupon, 
                code: newCoupon.code.toUpperCase(), 
                value: Number(newCoupon.value), 
                minPurchase: Number(newCoupon.minPurchase || 0), 
                maxDiscount: Number(newCoupon.maxDiscount || 0), 
                usageLimit: Number(newCoupon.usageLimit || 0), 
                targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
                createdAt: new Date().toISOString()
            });
            setNewCoupon({code:'', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
            showToast("Cupón de descuento creado exitosamente", "success");
        } catch(e) { showToast("Error al crear cupón", "error"); }
    };

    const deleteCouponFn = (id) => confirmAction("Eliminar Cupón", "¿Deseas eliminar este beneficio permanentemente?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',id)); showToast("Cupón eliminado", "success"); }, true);
    
    // --- GESTIÓN DE EQUIPO (ADMINS) MEJORADA ---
    const addTeamMemberFn = async () => { 
        if(!newTeamMember.email.includes('@')) return showToast("Email inválido", "warning"); 
        if(!newTeamMember.name) return showToast("Nombre requerido", "warning");
        
        const updatedTeam = [...(settings.team || []), newTeamMember]; 
        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); 
        setNewTeamMember({email:'',role:'employee', name:''}); 
        showToast("Miembro del equipo agregado", "success"); 
    };

    const removeTeamMemberFn = async (email) => { 
        // PROTECCIÓN CRÍTICA: Impedir borrar al Super Admin
        if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            return showToast("No se puede eliminar al Administrador Principal.", "error");
        }

        const updatedTeam = (settings.team || []).filter(m => m.email !== email); 
        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); 
        showToast("Miembro eliminado", "success"); 
    };

    // --- PROVEEDORES MEJORADOS ---
    const saveSupplierFn = async () => { 
        if(!newSupplier.name) return showToast("Nombre requerido", "warning"); 
        
        // Asociamos IDs de productos seleccionados en el modal (implementación visual más adelante)
        const supplierData = {
            ...newSupplier,
            // debt: se puede calcular o dejar como campo manual si se prefiere
            associatedProducts: newSupplier.associatedProducts || []
        };

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), supplierData); 
        setNewSupplier({name:'', contact:'', phone:'', ig:'', associatedProducts: []}); 
        setShowSupplierModal(false); 
        showToast("Proveedor guardado", "success"); 
    };
    
    // --- COMPRAS Y GASTOS ---
    const confirmPurchaseFn = async () => {
        if(!purchaseCart.length) return; 
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const totalCost = purchaseCart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
            
            // Registrar Gasto
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { 
                description: `Compra Stock (${purchaseCart.length} items)`, 
                details: purchaseCart.map(i => `${i.quantity}x ${i.name}`).join(', '), 
                amount: totalCost, 
                date: new Date().toISOString().split('T')[0], 
                type: 'purchase' 
            });

            // Actualizar Productos
            purchaseCart.forEach(item => {
                if (item.existingId) {
                    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.existingId), { 
                        stock: increment(item.quantity), 
                        // Opcional: actualizar precio base si cambia
                    });
                } else {
                    batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'products')), { 
                        name: item.name, 
                        basePrice: item.salePrice, 
                        stock: item.quantity, 
                        category: item.category || 'Varios', 
                        image: item.image || '', 
                        description: 'Ingreso stock', 
                        discount: 0 
                    });
                }
            });
            
            await batch.commit(); 
            setPurchaseCart([]); 
            setExpenseModalMode('closed'); 
            showToast("Stock actualizado y gasto registrado", "success");
        } catch(e) { console.error(e); showToast("Error en la operación", "error"); } 
        setIsLoading(false);
    };

    const saveGeneralExpenseFn = async () => { 
        if(!newExpense.amount) return showToast("Monto requerido", "warning"); 
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {...newExpense, amount: Number(newExpense.amount), type: 'general'}); 
        setExpenseModalMode('closed'); 
        showToast("Gasto registrado", "success"); 
    };

    // --- SETTINGS (CATEGORIAS, ABOUT US, ETC) ---
    const saveSettingsFn = async () => { 
        // Recuperar el documento de settings (debería haber solo uno)
        const s = await getDocs(query(collection(db,'artifacts',appId,'public','data','settings'))); 
        const d = {...tempSettings, aboutUsText: aboutText}; 
        
        if(!s.empty) await updateDoc(doc(db,'artifacts',appId,'public','data','settings',s.docs[0].id), d); 
        else await addDoc(collection(db,'artifacts',appId,'public','data','settings'), d); 
        
        // Actualizar estado local inmediatamente
        setSettings(d);
        showToast("Configuración guardada correctamente", 'success'); 
    };
    
    // --- GESTIÓN DE PEDIDOS ---
    const toggleOrderFn = async (o) => { 
        try {
            const nextStatus = o.status === 'Pendiente' ? 'Realizado' : 'Pendiente';
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { status: nextStatus }); 
            showToast(`Pedido marcado como ${nextStatus}`, 'success'); 
        } catch(e) { showToast("Error al cambiar estado", "error"); }
    };

    const deleteOrderFn = async (o) => {
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id);
            batch.delete(orderRef);
            
            // Restaurar Stock
            o.items.forEach(item => {
                const prodRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.productId);
                batch.update(prodRef, { stock: increment(item.quantity) });
            });

            await batch.commit();
            setSelectedOrder(null);
            showToast("Pedido eliminado y stock restaurado", "success");
        } catch (e) { console.error(e); showToast("Error al eliminar pedido", "error"); }
        setIsLoading(false);
    };

    // POS Functions
    const addToPos = (p) => { const ex = posCart.find(i=>i.id===p.id); if(ex && ex.qty+1>p.stock) return showToast("Sin stock suficiente", "warning"); setPosCart(ex ? posCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...posCart,{...p,qty:1}]); };
    const confirmPosSale = async () => { 
        if(!posCart.length) return; 
        setIsLoading(true); 
        const batch = writeBatch(db); 
        const total = posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0); 
        const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); 
        batch.set(orderRef, { orderId: `POS-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: 'Mostrador', email: '-', phone: '-' }, items: posCart.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total, subtotal: total, discount: 0, status: 'Realizado', date: new Date().toISOString(), origin: 'store', paymentMethod: 'Efectivo' }); 
        posCart.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: increment(-i.qty) }); }); 
        await batch.commit(); 
        setPosCart([]); 
        setShowPosModal(false); 
        showToast("Venta registrada correctamente", "success"); 
        setIsLoading(false); 
    };
    
    // Quote Functions
    const addToQuote = (p) => { const ex = quoteCart.find(i=>i.id===p.id); setQuoteCart(ex ? quoteCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...quoteCart,{...p,qty:1}]); };
    const saveQuote = async () => { const total = quoteCart.reduce((a,i)=>a+(i.basePrice*i.qty),0) * (1 - quoteDiscount/100); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), { clientName: quoteClient.name || 'Cliente', clientPhone: quoteClient.phone, items: quoteCart, total, discount: quoteDiscount, date: new Date().toISOString(), status: 'Borrador' }); setQuoteCart([]); setQuoteClient({name:'',phone:''}); showToast("Presupuesto guardado", "success"); };
    const deleteQuoteFn = (id) => confirmAction("Eliminar Presupuesto", "¿Borrar historial?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','quotes',id)); showToast("Presupuesto eliminado", "success"); });
    const convertQuote = async (q) => { setIsLoading(true); const batch = writeBatch(db); const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); batch.set(orderRef, { orderId: `QUO-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: q.clientName, phone: q.clientPhone, email: '-' }, items: q.items.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total: q.total, status: 'Realizado', date: new Date().toISOString(), origin: 'quote', paymentMethod: 'Presupuesto' }); q.items.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: increment(-i.qty) }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'quotes', q.id), { status: 'Convertido' }); await batch.commit(); showToast("Convertido a venta", "success"); setIsLoading(false); };

    // Helpers
    const goWsp = () => window.open(settings.whatsappLink, '_blank');
    const goIg = () => window.open(`https://www.instagram.com/${settings.instagramUser}`, '_blank');
    const handleImage = (e, setter) => { const f=e.target.files[0]; if(f&&f.size<1000000){const r=new FileReader();r.onload=()=>setter(p=>({...p,image:r.result}));r.readAsDataURL(f);}else showToast("La imagen es muy pesada (Max 1MB)", 'error'); };
    const handlePurchaseImage = (e) => { const f=e.target.files[0]; if(f && f.size<1000000) { const r=new FileReader(); r.onload=()=>setNewPurchaseItem(p=>({...p, image: r.result})); r.readAsDataURL(f); } else showToast("Imagen muy pesada", 'error'); };
    const selectExistingProduct = (p) => { setNewPurchaseItem({ ...newPurchaseItem, name: p.name, salePrice: p.basePrice, category: p.category, image: p.image, existingId: p.id, quantity: '', costPrice: '' }); setProductSearchTerm(''); };
    const addPurchaseItemToCart = () => { if(!newPurchaseItem.name || !newPurchaseItem.costPrice || !newPurchaseItem.quantity) return; setPurchaseCart([...purchaseCart, { ...newPurchaseItem, id: Date.now(), costPrice: Number(newPurchaseItem.costPrice), salePrice: Number(newPurchaseItem.salePrice), quantity: Number(newPurchaseItem.quantity) }]); setNewPurchaseItem({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null }); };

    // --- FINANCIAL METRICS & DASHBOARD DATA (Mejorado con Top Ventas) ---
    const financialData = useMemo(() => {
        const revenue = (orders || []).reduce((acc, o) => acc + (o.total || 0), 0);
        const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);
        const netBalance = revenue - totalExpenses;
        const recoveryProgress = totalExpenses > 0 ? Math.min((revenue / totalExpenses) * 100, 100) : 100;
        const recentOrders = orders.slice(0, 5);
        
        // Calcular Top Products
        const productSales = {};
        orders.forEach(o => {
            o.items.forEach(i => {
                if(!productSales[i.productId]) productSales[i.productId] = { name: i.title, quantity: 0, revenue: 0 };
                productSales[i.productId].quantity += i.quantity;
                productSales[i.productId].revenue += (i.unit_price * i.quantity);
            });
        });
        const bestSellers = Object.values(productSales).sort((a,b) => b.quantity - a.quantity).slice(0, 5);
        
        // Estrellas del mes (Simulado por ahora con top global, podría filtrarse por fecha)
        const starProduct = bestSellers.length > 0 ? bestSellers[0] : null;

        return { revenue, totalExpenses, netBalance, recoveryProgress, recentOrders, bestSellers, starProduct };
    }, [orders, expenses, products]);

    // ⚠️ [PAUSA POR SEGURIDAD] - El código continúa. Por favor escribe "continuar" para generar la siguiente parte.
    // --- SUB-COMPONENTS ---
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-800">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="text-2xl font-black text-white flex items-center gap-2 neon-text">
                                PEDIDO <span className="text-cyan-400">#{order.orderId}</span>
                            </h3>
                            <p className="text-slate-400 text-xs mt-1 flex items-center gap-2 font-bold tracking-wider">
                                <Clock className="w-3 h-3"/> {new Date(order.date).toLocaleString()}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition"><X className="w-5 h-5 text-slate-400"/></button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {order.status === 'Realizado' ? <CheckCircle className="w-6 h-6"/> : <Clock className="w-6 h-6"/>}
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Estado del Pedido</p>
                                    <p className={`text-lg font-black ${order.status === 'Realizado' ? 'text-green-400' : 'text-yellow-400'}`}>{order.status}</p>
                                </div>
                            </div>
                            {hasAccess(currentUser?.email) && (
                                <button onClick={() => toggleOrderFn(order)} className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg ${order.status === 'Pendiente' ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/20' : 'bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-900/20'}`}>
                                    <RefreshCw className="w-4 h-4"/> {order.status === 'Pendiente' ? 'Marcar Entregado' : 'Revertir a Pendiente'}
                                </button>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                                <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><User className="w-4 h-4"/> Cliente</h4>
                                <div className="space-y-3">
                                    <p className="text-white font-bold text-lg">{order.customer.name}</p>
                                    <div className="space-y-1">
                                        <p className="text-slate-400 text-sm flex justify-between"><span>Email:</span> <span className="text-white">{order.customer.email}</span></p>
                                        <p className="text-slate-400 text-sm flex justify-between"><span>Tel:</span> <span className="text-white">{order.customer.phone || '-'}</span></p>
                                        <p className="text-slate-400 text-sm flex justify-between"><span>DNI:</span> <span className="text-white">{order.customer.dni || '-'}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                                <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Truck className="w-4 h-4"/> Envío y Pago</h4>
                                <div className="space-y-3">
                                    <p className="text-white font-medium text-sm leading-relaxed">{order.shippingAddress || 'Retiro en tienda'}</p>
                                    <div className="pt-4 border-t border-slate-800/50 mt-2">
                                        <p className="text-slate-400 text-xs uppercase font-bold mb-1">Método de Pago</p>
                                        <p className="text-cyan-400 font-black text-lg uppercase">{order.paymentMethod}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Package className="w-4 h-4"/> Productos</h4>
                            <div className="space-y-3">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-slate-800 text-white w-10 h-10 flex items-center justify-center rounded-lg font-black text-sm">{item.quantity}x</div> 
                                            <div>
                                                <p className="text-white font-bold text-sm">{item.title}</p>
                                                <p className="text-slate-500 text-xs">Unitario: ${item.unit_price}</p>
                                            </div>
                                        </div>
                                        <span className="text-white font-mono font-bold text-lg">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-3">
                            <div className="flex justify-between text-slate-400 text-sm"><span>Subtotal</span><span>${order.subtotal?.toLocaleString()}</span></div>
                            {order.discount > 0 && (
                                <div className="flex justify-between text-green-400 text-sm font-bold bg-green-900/10 p-2 rounded-lg border border-green-900/30">
                                    <span className="flex items-center gap-2"><Ticket className="w-3 h-3"/> Descuento ({order.discountCode})</span>
                                    <span>-${order.discount?.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800 border-dashed">
                                <span className="text-white font-bold text-lg">Total Pagado</span>
                                <span className="text-3xl font-black text-cyan-400 neon-text">${order.total.toLocaleString()}</span>
                            </div>
                        </div>

                        {isAdmin(currentUser?.email) && (
                            <button 
                                onClick={() => confirmAction(
                                    "Eliminar Pedido Definitivamente", 
                                    "IMPORTANTE: Esta acción eliminará el pedido y RESTAURARÁ EL STOCK. ¿Proceder?", 
                                    () => deleteOrderFn(order), 
                                    true
                                )} 
                                className="w-full py-4 bg-red-900/10 hover:bg-red-900/20 text-red-500 border border-red-900/30 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                            >
                                <Trash2 className="w-4 h-4"/> Eliminar Registro y Restaurar Stock
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        
        const availableCoupons = coupons.filter(c => {
            const isNotExpired = !c.expirationDate || new Date(c.expirationDate) > new Date();
            const isUserTarget = !c.targetUser || (currentUser && c.targetUser === currentUser.email);
            const isGlobal = c.targetType === 'global';
            const usedCount = c.usedBy ? c.usedBy.length : 0;
            const userUsed = currentUser && c.usedBy && c.usedBy.includes(currentUser.id);
            const notExhausted = !c.usageLimit || usedCount < c.usageLimit;
            return isNotExpired && (isUserTarget || isGlobal) && notExhausted && !userUsed;
        });

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-lg overflow-hidden relative shadow-2xl border border-purple-500/20">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><X className="w-5 h-5"/></button>
                    
                    <div className="p-8 bg-gradient-to-br from-slate-900 to-[#0a0a0a]">
                        <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
                            <Gift className="w-8 h-8 text-purple-400"/> Mis Beneficios
                        </h3>
                        <p className="text-slate-400 text-sm">Selecciona un cupón para aplicar a tu compra actual.</p>
                    </div>

                    <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-[#050505]">
                        {availableCoupons.length === 0 ? (
                            <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
                                <Ticket className="w-12 h-12 text-slate-700 mx-auto mb-3"/>
                                <p className="text-slate-500 font-bold">No tienes cupones disponibles.</p>
                            </div>
                        ) : availableCoupons.map(c => {
                            const canApply = cartTotal >= (c.minPurchase || 0);
                            return (
                                <div key={c.id} onClick={() => canApply && selectCoupon(c)} className={`relative overflow-hidden rounded-2xl border transition-all duration-300 group ${canApply ? 'bg-slate-900 border-slate-700 hover:border-purple-500 cursor-pointer hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'}`}>
                                    <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                                    <div className="p-5 pl-8 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="font-black text-xl text-white tracking-widest">{c.code}</span>
                                                <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 uppercase font-bold">
                                                    {c.type === 'fixed' ? '$ FIJO' : '% OFF'}
                                                </span>
                                            </div>
                                            <p className="text-purple-400 font-bold text-sm">
                                                {c.type === 'fixed' ? `Ahorra $${c.value}` : `${c.value}% de Descuento`}
                                                {c.maxDiscount > 0 && <span className="text-slate-500 text-xs ml-1">(Tope ${c.maxDiscount})</span>}
                                            </p>
                                            {c.minPurchase > 0 && (
                                                <p className={`text-xs mt-2 font-bold ${canApply ? 'text-slate-500' : 'text-red-400'}`}>
                                                    {canApply ? <CheckCircle className="w-3 h-3 inline mr-1"/> : <AlertCircle className="w-3 h-3 inline mr-1"/>}
                                                    Mínimo de compra: ${c.minPurchase}
                                                </p>
                                            )}
                                        </div>
                                        {canApply && <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition"><Plus className="w-6 h-6"/></div>}
                                    </div>
                                </div>
                            );
                        })}
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
                <p className="text-slate-500 text-sm mt-2 font-mono">Cargando sistema...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
            </div>

            {/* Global UI Elements */}
            <div className="fixed top-24 right-4 z-[9999] space-y-2">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} isDangerous={modalConfig.isDangerous} />
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- NAVBAR --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <button onClick={()=>setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50"><Menu className="w-6 h-6"/></button>
                        <div className="cursor-pointer group" onClick={()=>setView('store')}>
                            <span className="text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300">SUSTORE</span>
                            <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500"></div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-3 w-1/3 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition shadow-inner">
                        <Search className="w-5 h-5 text-slate-400 mr-3"/>
                        <input 
                            className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium" 
                            placeholder="Buscar productos (ej: iPhone, Gamer...)" 
                            value={searchQuery} 
                            onChange={e=>setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={goWsp} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm"><MessageCircle className="w-5 h-5"/> Soporte</button>
                        <button onClick={()=>setView('cart')} className="relative p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group">
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition"/>
                            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505]">{cart.length}</span>}
                        </button>
                        
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm">{currentUser.name.charAt(0)}</div>
                                <div className="text-left hidden md:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hola,</p>
                                    <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition">{currentUser.name.split(' ')[0]}</p>
                                </div>
                            </button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2">
                                <User className="w-5 h-5"/> INGRESAR
                            </button>
                        )}
                    </div>
                </nav>
            )}
            {view !== 'admin' && <div className="h-32"></div>}

            {/* --- MAIN CONTENT --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {/* VISTA TIENDA */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition duration-1000 z-0"></div>
                            {settings.heroUrl ? (
                                <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"/>
                            ) : (
                                <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070" className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-1000 group-hover:scale-105"/>
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <div className="max-w-3xl animate-fade-up space-y-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-cyan-500 text-black px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.4)]">Nuevo Ingreso</span>
                                        <span className="text-slate-300 text-sm font-bold tracking-widest uppercase border-l border-slate-600 pl-3">Sustore Official</span>
                                    </div>
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl">
                                        TECNOLOGÍA <br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">DEL FUTURO</span>
                                    </h1>
                                    <p className="text-slate-400 text-lg md:text-xl max-w-xl font-medium leading-relaxed">
                                        Encuentra los dispositivos más avanzados al mejor precio del mercado. Garantía oficial y soporte experto.
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-4">
                                        <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2 group/btn">
                                            VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition"/>
                                        </button>
                                        <button onClick={() => setView('guide')} className="px-8 py-4 glass text-white font-bold rounded-xl hover:bg-white/10 transition border border-white/10">Cómo Comprar</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Filtros:</span>
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===''?'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>Todos</button>
                            {settings.categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>{c}</button>)}
                        </div>

                        {products.length === 0 && !isLoading ? (
                            <EmptyState icon={Package} title="Catálogo Vacío" text="No hay productos disponibles en este momento. Vuelve pronto."/>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                    <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition duration-500 relative flex flex-col">
                                        <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"/>
                                            {p.discount > 0 && <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-20 shadow-red-600/20">-{p.discount}% OFF</span>}
                                            <button onClick={(e)=>{e.stopPropagation(); manageCart(p, 1)}} className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 hover:bg-cyan-400 hover:shadow-cyan-400/50 transition z-20 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300" title="Agregar al carrito"><Plus className="w-6 h-6"/></button>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">{p.category}</p>
                                                {p.stock <= 3 && p.stock > 0 && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Últimos {p.stock}</span>}
                                                {p.stock === 0 && <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded">AGOTADO</span>}
                                            </div>
                                            <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2">{p.name}</h3>
                                            <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    {p.discount > 0 && <span className="text-xs text-slate-500 line-through font-medium">${p.basePrice.toLocaleString()}</span>}
                                                    <span className="text-2xl font-black text-white tracking-tight">${calculatePrice(p.basePrice, p.discount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA CARRITO */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up">
                        <div className="flex items-center gap-4 mb-8">
                            <button onClick={()=>setView('store')} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft className="w-5 h-5"/></button>
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3"><ShoppingBag className="w-10 h-10 text-cyan-400"/> Mi Carrito</h1>
                        </div>
                        
                        {cart.length === 0 ? (
                            <EmptyState icon={ShoppingCart} title="Tu carrito está vacío" text="Parece que aún no has agregado productos." action={() => setView('store')} actionText="Ir a la Tienda"/>
                        ) : (
                            <div className="grid lg:grid-cols-3 gap-8 pb-20">
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex gap-6 items-center group relative overflow-hidden hover:border-cyan-900/50 transition duration-300">
                                            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0 shadow-lg">
                                                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain"/>
                                            </div>
                                            <div className="flex-1 min-w-0 z-10">
                                                <h3 className="font-bold text-white text-lg truncate mb-1">{item.product.name}</h3>
                                                <p className="text-cyan-400 font-bold text-sm mb-3">${calculatePrice(item.product.basePrice, item.product.discount).toLocaleString()} unitario</p>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1 border border-slate-700">
                                                        <button onClick={() => manageCart(item.product, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><Minus className="w-4 h-4"/></button>
                                                        <span className="text-sm font-bold w-4 text-center text-white">{item.quantity}</span>
                                                        <button onClick={() => manageCart(item.product, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><Plus className="w-4 h-4"/></button>
                                                    </div>
                                                    <button onClick={() => manageCart(item.product, -item.quantity)} className="text-slate-600 hover:text-red-500 transition p-2 bg-slate-900 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end justify-center h-full z-10 px-4">
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Subtotal</p>
                                                <p className="font-black text-2xl text-white neon-text">${(calculatePrice(item.product.basePrice, item.product.discount) * item.quantity).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8">Resumen de Compra</h3>
                                    <div className="mb-8">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Cupón de Descuento</label>
                                        {appliedCoupon ? (
                                            <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden group">
                                                <div>
                                                    <p className="font-black text-purple-300 text-lg tracking-widest">{appliedCoupon.code}</p>
                                                    <p className="text-xs text-purple-400 font-bold">{appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}</p>
                                                </div>
                                                <button onClick={() => setAppliedCoupon(null)} className="p-2 bg-slate-900/50 rounded-full text-purple-300 hover:text-red-400 hover:bg-red-900/30 transition relative z-10"><X className="w-4 h-4"/></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setShowCouponModal(true)} className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 hover:bg-purple-900/10 text-slate-400 hover:text-purple-300 rounded-2xl transition flex items-center justify-center gap-2 text-sm font-bold group">
                                                <Ticket className="w-5 h-5 group-hover:rotate-12 transition"/> Ver cupones disponibles
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="font-mono font-bold text-white">${cartTotal.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-slate-400 text-sm"><span>Envío</span><span className="text-cyan-400 font-bold">Gratis</span></div>
                                        {appliedCoupon && <div className="flex justify-between text-purple-400 font-bold text-sm animate-pulse"><span>Descuento aplicado</span><span>-${discountAmt.toLocaleString()}</span></div>}
                                    </div>
                                    <div className="flex justify-between items-end mb-8"><span className="text-white font-bold text-lg">Total Final</span><span className="text-4xl font-black text-white neon-text tracking-tighter">${finalTotal.toLocaleString()}</span></div>
                                    <button onClick={() => setView('checkout')} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-5 text-white font-bold text-lg rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1">
                                        Iniciar Compra <ArrowRight className="w-6 h-6"/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA CHECKOUT */}
                {view === 'checkout' && (
                    <div className="max-w-4xl mx-auto pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold"><ArrowLeft className="w-4 h-4"/> Volver al Carrito</button>
                        <div className="grid md:grid-cols-5 gap-8">
                            <div className="md:col-span-3 space-y-8">
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3"><MapPin className="text-cyan-400"/> Datos de Envío</h2>
                                    <div className="space-y-5">
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition" placeholder="Dirección Completa (Calle y Altura)" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                                        <div className="grid grid-cols-2 gap-5">
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/>
                                        </div>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                                    </div>
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                    <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3"><CreditCard className="text-cyan-400"/> Pago</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Transferencia', 'Efectivo'].map(m => (
                                            <button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]':'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500'}`}>
                                                {checkoutData.paymentChoice===m && <div className="absolute top-2 right-2 text-cyan-500"><CheckCircle className="w-5 h-5"/></div>}
                                                {m==='Transferencia' ? <RefreshCw className="w-8 h-8"/> : <DollarSign className="w-8 h-8"/>}
                                                <span className="text-sm font-black tracking-wider uppercase">{m}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {checkoutData.paymentChoice === 'Transferencia' && (
                                        <div className="mt-6 p-4 bg-cyan-900/10 border border-cyan-900/30 rounded-xl">
                                            <p className="text-cyan-200 text-sm">Al confirmar, recibirás los datos bancarios por email y WhatsApp para completar el pago.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <div className="bg-gradient-to-br from-slate-900 to-[#050505] border border-slate-800 p-8 rounded-[2.5rem] sticky top-28 shadow-2xl">
                                    <h3 className="font-black text-white mb-8 text-xl">Confirmación</h3>
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between text-slate-400"><span>Productos ({cart.length})</span><span>${cartTotal.toLocaleString()}</span></div>
                                        {discountAmt > 0 && <div className="flex justify-between text-purple-400 font-bold"><span>Descuento</span><span>-${discountAmt.toLocaleString()}</span></div>}
                                        <div className="h-px bg-slate-800 my-4"></div>
                                        <div className="flex justify-between items-end"><span className="text-white font-bold">Total a Pagar</span><span className="text-3xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span></div>
                                    </div>
                                    <button onClick={confirmOrder} disabled={isProcessingOrder} className={`w-full py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all ${isProcessingOrder ? 'bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-green-900/20 hover:scale-105'}`}>
                                        {isProcessingOrder ? <Loader2 className="w-6 h-6 animate-spin"/> : <CheckCircle className="w-6 h-6"/>}
                                        {isProcessingOrder ? 'Procesando...' : 'Confirmar Pedido'}
                                    </button>
                                    <p className="text-center text-slate-600 text-xs mt-4">Al confirmar, aceptas nuestros términos y condiciones.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA PERFIL */}
                {view === 'profile' && currentUser && (
                    <div className="max-w-6xl mx-auto pt-4 animate-fade-up">
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl z-10">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="text-center md:text-left z-10 flex-1">
                                <h2 className="text-4xl font-black text-white mb-2">{currentUser.name}</h2>
                                <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2"><Mail className="w-4 h-4"/> {currentUser.email}</p>
                            </div>
                            <div className="flex gap-4 z-10">
                                {hasAccess(currentUser.email) && (
                                    <button onClick={()=>setView('admin')} className="px-6 py-3 bg-slate-900 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/20 rounded-xl font-bold transition flex items-center gap-2"><Shield className="w-5 h-5"/> Admin Panel</button>
                                )}
                                <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="px-6 py-3 bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 rounded-xl font-bold transition flex items-center gap-2"><LogOut className="w-5 h-5"/> Cerrar Sesión</button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-6">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3"><Package className="text-cyan-400"/> Historial de Pedidos</h3>
                                {orders.filter(o => o.userId === currentUser.id).length === 0 ? (
                                    <EmptyState icon={ShoppingBag} title="Aún no tienes pedidos" text="Tus compras aparecerán aquí." action={()=>setView('store')} actionText="Ir a comprar"/>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.filter(o => o.userId === currentUser.id).map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl flex justify-between items-center cursor-pointer transition group relative overflow-hidden">
                                                <div className="absolute inset-0 bg-slate-800/20 opacity-0 group-hover:opacity-100 transition"></div>
                                                <div className="relative z-10">
                                                    <p className="font-bold text-white text-lg group-hover:text-cyan-400 transition mb-1">Pedido #{o.orderId}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-2"><Calendar className="w-3 h-3"/> {new Date(o.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right relative z-10">
                                                    <p className="font-black text-white text-xl mb-2">${o.total.toLocaleString()}</p>
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${o.status==='Realizado'?'bg-green-900/20 text-green-400 border-green-900/50':'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'}`}>{o.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* --- PANEL DE ADMINISTRACIÓN MEJORADO --- */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full font-sans">
                        {/* Sidebar Admin */}
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static shadow-2xl`}>
                            <div className="p-8 border-b border-slate-900">
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white"><Shield className="w-5 h-5"/></div>
                                    ADMIN
                                </h2>
                            </div>
                            
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-3 mt-2">Principal</p>
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='dashboard'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><LayoutDashboard className="w-5 h-5"/>Dashboard</button>
                                <button onClick={()=>setAdminTab('orders')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='orders'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><ShoppingBag className="w-5 h-5"/>Pedidos</button>
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='products'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Package className="w-5 h-5"/>Inventario</button>
                                
                                {isAdmin(currentUser?.email) && (
                                    <>
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-3 mt-6">Gestión</p>
                                        <button onClick={()=>setAdminTab('balance')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='balance'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Wallet className="w-5 h-5"/>Finanzas</button>
                                        <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='coupons'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Ticket className="w-5 h-5"/>Cupones</button>
                                        <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='suppliers'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Truck className="w-5 h-5"/>Proveedores</button>
                                        <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='settings'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><Settings className="w-5 h-5"/>Configuración</button>
                                    </>
                                )}
                            </nav>
                            <div className="p-6 border-t border-slate-900">
                                <button onClick={()=>setView('store')} className="w-full py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold text-sm flex items-center justify-center gap-2 group">
                                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition"/> Volver a Tienda
                                </button>
                            </div>
                        </div>

                        {/* ADMIN CONTENT */}
                        <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800"><Menu className="w-6 h-6"/></button>
                            
                            {adminTab === 'dashboard' && (
                                <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8">
                                    <h1 className="text-4xl font-black text-white mb-8 neon-text">Panel de Control Profesional</h1>
                                    
                                    {/* Producto Estrella y Top Ventas */}
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                            <div className="flex justify-between items-start relative z-10">
                                                <div>
                                                    <h3 className="text-2xl font-black text-white flex items-center gap-3"><Trophy className="text-yellow-400 w-8 h-8"/> Producto Estrella</h3>
                                                    <p className="text-slate-400 text-sm mt-1">El más vendido del periodo actual</p>
                                                </div>
                                                <div className="bg-yellow-900/20 px-4 py-2 rounded-xl border border-yellow-500/20 text-yellow-400 font-bold text-xs uppercase tracking-widest">
                                                    Top #1 Global
                                                </div>
                                            </div>
                                            
                                            {financialData.starProduct ? (
                                                <div className="mt-8 flex items-center gap-8">
                                                    <div className="w-32 h-32 bg-slate-900 rounded-2xl flex items-center justify-center p-2 shadow-2xl border border-slate-700">
                                                        {products.find(p=>p.id===financialData.starProduct.id)?.image ? (
                                                            <img src={products.find(p=>p.id===financialData.starProduct.id).image} className="max-h-full max-w-full object-contain"/>
                                                        ) : <Package className="w-12 h-12 text-slate-600"/>}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-3xl font-black text-white mb-2">{financialData.starProduct.name}</h4>
                                                        <div className="flex gap-6">
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase font-bold">Unidades</p>
                                                                <p className="text-2xl font-mono font-bold text-white">{financialData.starProduct.quantity}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase font-bold">Ingresos Gen.</p>
                                                                <p className="text-2xl font-mono font-bold text-green-400">${financialData.starProduct.revenue.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-8 text-slate-500">Esperando datos de ventas...</div>
                                            )}
                                        </div>

                                        {/* Live Carts Monitor (Nuevo Requerimiento) */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px]"></div>
                                            <h3 className="font-bold text-white text-xl mb-6 flex items-center gap-2"><Eye className="text-blue-400 animate-pulse"/> Carritos en Vivo</h3>
                                            
                                            <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar relative z-10">
                                                {liveCarts.length === 0 ? (
                                                    <p className="text-slate-500 text-sm">Ningún usuario comprando activamente.</p>
                                                ) : liveCarts.map(cart => (
                                                    <div key={cart.userId} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{cart.userName || 'Usuario'}</p>
                                                            <p className="text-xs text-slate-500">{cart.items.length} productos</p>
                                                        </div>
                                                        <div className="flex -space-x-2">
                                                            {cart.items.slice(0,3).map((i, idx) => (
                                                                <div key={idx} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a0a0a] flex items-center justify-center overflow-hidden" title={i.product.name}>
                                                                    <img src={i.product.image} className="w-full h-full object-cover"/>
                                                                </div>
                                                            ))}
                                                            {cart.items.length > 3 && <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white font-bold">+{cart.items.length-3}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-center text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-widest">{liveCarts.length} USUARIOS ACTIVOS AHORA</p>
                                        </div>
                                    </div>

                                    {/* Métricas Generales */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Ingresos Totales</p>
                                            <p className="text-3xl font-black text-white">${financialData.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Ventas Totales</p>
                                            <p className="text-3xl font-black text-white">{orders.length}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Alertas Stock</p>
                                            <p className="text-3xl font-black text-white">{products.filter(p=>p.stock<5).length}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Clientes</p>
                                            <p className="text-3xl font-black text-white">{users.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'settings' && (
                                <div className="max-w-5xl mx-auto space-y-8 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white neon-text">Configuración Global</h1>
                                    
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl space-y-12">
                                        
                                        {/* Gestión de Categorías */}
                                        <div className="border-b border-slate-800 pb-10">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Tag className="w-5 h-5 text-cyan-400"/> Categorías de Productos</h3>
                                            <div className="flex gap-4 mb-6">
                                                <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nueva categoría (ej: Tablets)" value={newCategory} onChange={e=>setNewCategory(e.target.value)}/>
                                                <button onClick={()=>{if(newCategory){setTempSettings({...tempSettings, categories:[...tempSettings.categories, newCategory]}); setNewCategory('');}}} className="bg-blue-600 px-8 rounded-xl text-white font-bold hover:bg-blue-500 transition shadow-lg">Añadir</button>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {tempSettings.categories.map(c=>(
                                                    <span key={c} className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300 flex items-center gap-3 font-bold group hover:border-red-500/50 hover:bg-red-900/10 transition">
                                                        {c} 
                                                        <button onClick={()=>setTempSettings({...tempSettings, categories: tempSettings.categories.filter(x=>x!==c)})} className="text-slate-500 group-hover:text-red-400 transition"><X className="w-3 h-3"/></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Gestión de Equipo (Admins) */}
                                        <div className="border-b border-slate-800 pb-10">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-purple-400"/> Equipo & Administradores</h3>
                                            <p className="text-sm text-slate-500 mb-6">Gestiona quién tiene acceso al panel de control. <span className="text-red-400 font-bold">El admin principal no puede ser eliminado.</span></p>
                                            
                                            <div className="flex gap-4 mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                                                <input className="flex-[2] bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none" placeholder="Nombre" value={newTeamMember.name} onChange={e=>setNewTeamMember({...newTeamMember, name:e.target.value})}/>
                                                <input className="flex-[3] bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none" placeholder="Email del usuario" value={newTeamMember.email} onChange={e=>setNewTeamMember({...newTeamMember, email:e.target.value})}/>
                                                <select className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none" value={newTeamMember.role} onChange={e=>setNewTeamMember({...newTeamMember, role:e.target.value})}>
                                                    <option value="employee">Empleado</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button onClick={addTeamMemberFn} className="bg-purple-600 px-6 rounded-xl text-white font-bold hover:bg-purple-500 transition shadow-lg"><Plus className="w-5 h-5"/></button>
                                            </div>

                                            <div className="space-y-3">
                                                {tempSettings.team.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-[#050505] p-4 rounded-xl border border-slate-800">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${m.role==='admin'?'bg-purple-900/30 text-purple-400':'bg-slate-800 text-slate-400'}`}>
                                                                {m.name ? m.name.charAt(0) : <User className="w-5 h-5"/>}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{m.name || 'Sin nombre'}</p>
                                                                <p className="text-xs text-slate-500">{m.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-900 px-2 py-1 rounded">{m.role}</span>
                                                            {/* Botón eliminar solo si NO es super admin */}
                                                            {m.email !== SUPER_ADMIN_EMAIL && (
                                                                <button onClick={()=>removeTeamMemberFn(m.email)} className="p-2 hover:bg-red-900/20 rounded-lg text-slate-600 hover:text-red-400 transition"><Trash2 className="w-4 h-4"/></button>
                                                            )}
                                                            {m.email === SUPER_ADMIN_EMAIL && <Lock className="w-4 h-4 text-slate-600" title="Super Admin Protegido"/>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* About Us & Anuncios */}
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block flex items-center gap-2"><Megaphone className="w-4 h-4"/> Anuncio Global (Marquesina)</label>
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Ej: 🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥" value={tempSettings.announcementMessage || ''} onChange={e=>setTempSettings({...tempSettings, announcementMessage:e.target.value})}/>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block flex items-center gap-2"><Info className="w-4 h-4"/> Texto "Sobre Nosotros"</label>
                                                <textarea className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition resize-none leading-relaxed" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
                                            </div>
                                        </div>

                                        <button onClick={saveSettingsFn} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-5 rounded-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition transform hover:-translate-y-1 text-lg flex justify-center gap-2 items-center">
                                            <Save className="w-6 h-6"/> Guardar Configuración
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* Renderizado de otras tabs (simplificado para ahorrar espacio pero funcional) */}
                            {adminTab === 'products' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <div className="flex justify-between mb-8">
                                        <h1 className="text-3xl font-black text-white">Inventario</h1>
                                        <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 items-center"><Plus className="w-5 h-5"/> Agregar</button>
                                    </div>
                                    {/* ... Formulario de productos (reutilizar lógica existente) ... */}
                                    {showProductForm && (
                                        <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2.5rem] mb-8">
                                            <h3 className="text-white font-bold mb-4">{editingId ? 'Editar' : 'Nuevo'} Producto</h3>
                                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                                <input className="input-cyber p-4" placeholder="Nombre" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                                <input className="input-cyber p-4" type="number" placeholder="Precio" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                <input className="input-cyber p-4" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                                <select className="input-cyber p-4" value={newProduct.category||''} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>
                                                    <option value="">Categoría...</option>
                                                    {settings.categories.map(c=><option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <input className="input-cyber p-4" type="number" placeholder="Descuento %" value={newProduct.discount||0} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/>
                                                <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700 cursor-pointer" onClick={()=>fileInputRef.current.click()}>
                                                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center overflow-hidden">{newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover"/> : <FolderPlus className="w-5 h-5 text-slate-500"/>}</div>
                                                    <span className="text-sm text-slate-400">Imagen</span>
                                                    <input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="hidden"/>
                                                </div>
                                            </div>
                                            <textarea className="input-cyber w-full h-24 p-4 mb-4" placeholder="Descripción" value={newProduct.description||''} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={()=>setShowProductForm(false)} className="px-4 py-2 text-slate-400">Cancelar</button>
                                                <button onClick={saveProductFn} className="px-6 py-2 bg-cyan-600 rounded-xl text-white font-bold">Guardar</button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid gap-4">
                                        {products.map(p=>(
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <img src={p.image} className="w-12 h-12 rounded-lg bg-white object-contain p-1"/>
                                                    <div>
                                                        <p className="font-bold text-white">{p.name}</p>
                                                        <p className="text-xs text-slate-500">Stock: {p.stock} | ${p.basePrice}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-2 bg-slate-900 rounded-lg text-cyan-400"><Edit className="w-4 h-4"/></button>
                                                    <button onClick={()=>deleteProductFn(p)} className="p-2 bg-slate-900 rounded-lg text-red-400"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'suppliers' && (
                                <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white neon-text">Gestión de Proveedores</h1>
                                        <button onClick={()=>setShowSupplierModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold flex gap-2 shadow-lg transition transform hover:-translate-y-1">
                                            <Plus className="w-5 h-5"/> Nuevo Proveedor
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {suppliers.map(s=>(
                                            <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] hover:border-slate-600 transition duration-300 group">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="p-4 bg-slate-900 rounded-xl text-slate-400 group-hover:text-white transition"><Truck className="w-8 h-8"/></div>
                                                    <button className="text-slate-600 hover:text-red-400"><Trash2 className="w-5 h-5"/></button>
                                                </div>
                                                <h3 className="text-2xl font-bold text-white mb-2">{s.name}</h3>
                                                <div className="space-y-3 mb-6">
                                                    <p className="text-slate-400 text-sm flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p>
                                                    <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4"/> {s.phone || '-'}</p>
                                                    <p className="text-slate-400 text-sm flex items-center gap-2"><Instagram className="w-4 h-4"/> {s.ig || '-'}</p>
                                                </div>
                                                <div className="pt-6 border-t border-slate-800">
                                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Productos Asociados</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {s.associatedProducts && s.associatedProducts.length > 0 ? (
                                                            s.associatedProducts.slice(0,3).map((pid, idx) => {
                                                                const prod = products.find(p=>p.id===pid);
                                                                return prod ? <span key={idx} className="text-[10px] bg-slate-900 px-2 py-1 rounded border border-slate-700 text-slate-300">{prod.name}</span> : null;
                                                            })
                                                        ) : <span className="text-[10px] text-slate-600">Sin productos asignados</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* MODALES ADMIN */}
                        {showSupplierModal && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
                                <div className="bg-[#0a0a0a] border border-slate-700 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-2xl font-black text-white mb-8 neon-text flex items-center gap-2"><Truck className="text-cyan-400"/> Nuevo Proveedor</h3>
                                    <div className="space-y-5 relative z-10">
                                        <input className="input-cyber w-full p-4" placeholder="Nombre Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name:e.target.value})}/>
                                        <input className="input-cyber w-full p-4" placeholder="Nombre Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier, contact:e.target.value})}/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="input-cyber w-full p-4" placeholder="Teléfono" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier, phone:e.target.value})}/>
                                            <input className="input-cyber w-full p-4" placeholder="Instagram (sin @)" value={newSupplier.ig} onChange={e=>setNewSupplier({...newSupplier, ig:e.target.value})}/>
                                        </div>
                                        
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Seleccionar Productos Suministrados</label>
                                            <div className="h-40 bg-slate-900/50 rounded-xl border border-slate-800 overflow-y-auto p-2 custom-scrollbar">
                                                {products.map(p => (
                                                    <div key={p.id} 
                                                        onClick={()=>{
                                                            const current = newSupplier.associatedProducts || [];
                                                            const exists = current.includes(p.id);
                                                            setNewSupplier({
                                                                ...newSupplier, 
                                                                associatedProducts: exists ? current.filter(id=>id!==p.id) : [...current, p.id]
                                                            });
                                                        }}
                                                        className={`p-2 mb-1 rounded-lg flex items-center justify-between cursor-pointer transition ${newSupplier.associatedProducts?.includes(p.id) ? 'bg-cyan-900/30 border border-cyan-500/30' : 'hover:bg-slate-800 border border-transparent'}`}
                                                    >
                                                        <span className="text-xs text-white truncate">{p.name}</span>
                                                        {newSupplier.associatedProducts?.includes(p.id) && <CheckCircle className="w-4 h-4 text-cyan-400"/>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-8 relative z-10">
                                        <button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition bg-slate-900 rounded-xl">Cancelar</button>
                                        <button onClick={saveSupplierFn} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- MENU DESPLEGABLE MÓVIL --- */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[9999] flex justify-start">
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={()=>setIsMenuOpen(false)}></div>
                        <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-up flex flex-col shadow-2xl z-[10000]">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-3xl font-black text-white neon-text">MENÚ</h2>
                                <button onClick={()=>setIsMenuOpen(false)} className="p-3 bg-slate-900 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                            </div>
                            <div className="space-y-4 flex-1">
                                <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><Home className="w-6 h-6"/> Inicio</button>
                                {currentUser && hasAccess(currentUser.email) && (
                                    <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-3 bg-cyan-900/10 rounded-xl"><Shield className="w-6 h-6"/> Admin Panel</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA LOGIN / REGISTER (MEJORADA CON DNI/PHONE) */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 animate-fade-up backdrop-blur-xl">
                        <button onClick={()=>setView('store')} className="absolute top-8 right-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><X className="w-6 h-6"/></button>
                        <div className="bg-[#0a0a0a] p-10 md:p-14 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800 relative overflow-hidden">
                            <div className="text-center mb-10">
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                                <p className="text-slate-500 text-sm">Ingresa tus datos para continuar.</p>
                            </div>

                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-4">
                                {!loginMode && (
                                    <>
                                        <input className="input-cyber w-full p-4" placeholder="Nombre Completo" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})} required/>
                                        <input className="input-cyber w-full p-4" placeholder="Usuario (Único)" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})} required/>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input className="input-cyber w-full p-4" placeholder="DNI" value={authData.dni} onChange={e=>setAuthData({...authData, dni:e.target.value})} required/>
                                            <input className="input-cyber w-full p-4" placeholder="Teléfono" value={authData.phone} onChange={e=>setAuthData({...authData, phone:e.target.value})} required/>
                                        </div>
                                    </>
                                )}
                                <input className="input-cyber w-full p-4" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} required/>
                                <input className="input-cyber w-full p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} required/>
                                
                                <button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-4 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] mt-6 flex items-center justify-center gap-2 transition transform hover:-translate-y-1">
                                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin"/> : (loginMode ? 'INGRESAR' : 'REGISTRARSE')}
                                </button>
                            </form>
                            
                            <button onClick={()=>{setLoginMode(!loginMode); setAuthData({email:'',password:'',name:'',username:'',dni:'',phone:''})}} className="w-full text-center text-slate-500 text-sm mt-8 hover:text-cyan-400 transition font-bold">
                                {loginMode ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Ingresa aquí'}
                            </button>
                        </div>
                    </div>
                )}

                {/* VISTAS PÚBLICAS EXTRA */}
                {view === 'about' && (
                    <div className="max-w-4xl mx-auto pt-10 animate-fade-up px-6 pb-20">
                        <button onClick={()=>setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft className="w-6 h-6"/></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text"><Info className="w-12 h-12 text-cyan-400"/> Sobre Nosotros</h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] shadow-2xl">
                            <p className="text-slate-300 text-xl leading-relaxed whitespace-pre-wrap font-medium">{settings.aboutUsText}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
