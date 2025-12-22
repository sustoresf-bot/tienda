import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc, increment } from 'firebase/firestore';

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

const defaultSettings = {
    storeName: "SUSTORE", 
    primaryColor: "#06b6d4", 
    currency: "$", 
    admins: "lautarocorazza63@gmail.com", 
    team: [{ email: "lautarocorazza63@gmail.com", role: "admin" }],
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
    
    // ESTADO DE CUPONES MEJORADO (Incluye maxDiscount)
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', 
        type: 'percentage', 
        value: 0, 
        minPurchase: 0, 
        maxDiscount: 0, // Nuevo campo: Tope de reintegro
        expirationDate: '', 
        targetType: 'global', 
        targetUser: '', 
        usageLimit: '' 
    });
    
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', debt: 0 });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [expenseModalMode, setExpenseModalMode] = useState('closed'); 
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [purchaseCart, setPurchaseCart] = useState([]); 
    const [newPurchaseItem, setNewPurchaseItem] = useState({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null });
    const [productSearchTerm, setProductSearchTerm] = useState(''); 
    const [posCart, setPosCart] = useState([]);
    const [posSearch, setPosSearch] = useState('');
    const [showPosModal, setShowPosModal] = useState(false);
    const [quoteCart, setQuoteCart] = useState([]);
    const [quoteClient, setQuoteClient] = useState({ name: '', phone: '' });
    const [quoteDiscount, setQuoteDiscount] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [aboutText, setAboutText] = useState('');
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee' });

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
        if (!email || !settings) return null;
        const clean = email.trim().toLowerCase();
        if (settings.admins && clean === settings.admins.toLowerCase()) return 'admin';
        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.toLowerCase() === clean);
        return member ? member.role : 'user';
    };
    
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => {
        const role = getRole(email);
        return role === 'admin' || role === 'employee';
    };

    // --- EFFECTS ---
    useEffect(() => localStorage.setItem('nexus_cart', JSON.stringify(cart)), [cart]);
    
    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            setCheckoutData(prev => ({ ...prev, address: currentUser.address || prev.address, city: currentUser.city || prev.city, province: currentUser.province || prev.province, zipCode: currentUser.zipCode || prev.zipCode }));
        }
    }, [currentUser]);

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
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => { 
                if(!s.empty) { 
                    const d = s.docs[0].data(); 
                    setSettings({...defaultSettings, ...d}); 
                    setTempSettings({...defaultSettings, ...d}); 
                    setAboutText(d.aboutUsText || defaultSettings.aboutUsText); 
                } else addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings); 
            })
        ];
        return () => subs.forEach(unsub => unsub());
    }, [systemUser]);
// --- LOGIC FUNCTIONS ---
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const uRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (isRegister) {
                if (!authData.name || !authData.username || !authData.email || !authData.password) throw new Error("Por favor completa todos los campos");
                
                // Validar duplicados
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

    // --- LÓGICA DE CUPONES MEJORADA (Tope de Reintegro) ---
    const getDiscountValue = (total, coupon) => {
        if (!coupon) return 0;
        if (coupon.type === 'fixed') return Math.min(total, coupon.value);
        if (coupon.type === 'percentage') {
            const calculated = total * (coupon.value / 100);
            // Si existe maxDiscount y es mayor a 0, aplicamos el tope
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
        // Validaciones
        if (new Date(c.expirationDate) < new Date()) return showToast("Este cupón ha vencido", "error");
        if (c.usageLimit && c.usedBy && c.usedBy.length >= c.usageLimit) return showToast("Este cupón ha agotado sus usos", "error");
        if (cartTotal < (c.minPurchase || 0)) return showToast(`Necesitas una compra mínima de $${c.minPurchase}`, "warning");
        if (c.targetUser && currentUser && c.targetUser !== currentUser.email) return showToast("Este cupón no es para ti", "error");

        setAppliedCoupon(c);
        setShowCouponModal(false);
        
        // Mensaje detallado del descuento
        let msg = "Cupón aplicado correctamente.";
        if (c.type === 'percentage' && c.maxDiscount > 0) {
            msg += ` (Tope de reintegro: $${c.maxDiscount})`;
        }
        showToast(msg, "success");
    };

    const confirmOrder = async () => {
        if (isProcessingOrder) return;
        if(!currentUser) { setView('login'); return showToast("Inicia sesión para finalizar tu compra", "info"); }
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Por favor completa los datos de envío", "warning");
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
                viewed: false // Para notificaciones admin
            };
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode });
            
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
                // Usamos arrayUnion si fuera posible, pero usamos lógica manual para asegurar consistencia
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
    
    // --- NUEVA FUNCIÓN DE CUPONES CON MAX DISCOUNT ---
    const saveCouponFn = async () => {
        if(!newCoupon.code) return showToast("Falta el código del cupón", "warning");
        if(newCoupon.type === 'percentage' && newCoupon.value > 100) return showToast("El porcentaje no puede ser mayor a 100", "warning");
        
        try {
            await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), { 
                ...newCoupon, 
                code: newCoupon.code.toUpperCase(), 
                value: Number(newCoupon.value), 
                minPurchase: Number(newCoupon.minPurchase || 0), 
                maxDiscount: Number(newCoupon.maxDiscount || 0), // Guardar tope
                usageLimit: Number(newCoupon.usageLimit || 0), 
                targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
                createdAt: new Date().toISOString()
            });
            setNewCoupon({code:'', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
            showToast("Cupón de descuento creado exitosamente", "success");
        } catch(e) { showToast("Error al crear cupón", "error"); }
    };

    const deleteCouponFn = (id) => confirmAction("Eliminar Cupón", "¿Deseas eliminar este beneficio permanentemente?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',id)); showToast("Cupón eliminado", "success"); }, true);
    
    const addTeamMemberFn = async () => { 
        if(!newTeamMember.email.includes('@')) return showToast("Email inválido", "warning"); 
        const updatedTeam = [...(settings.team || []), newTeamMember]; 
        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); 
        setNewTeamMember({email:'',role:'employee'}); 
        showToast("Miembro del equipo agregado", "success"); 
    };

    const removeTeamMemberFn = async (email) => { 
        const updatedTeam = (settings.team || []).filter(m => m.email !== email); 
        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); 
        showToast("Miembro eliminado", "success"); 
    };

    const saveSupplierFn = async () => { 
        if(!newSupplier.name) return showToast("Nombre requerido", "warning"); 
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), newSupplier); 
        setNewSupplier({name:'',debt:0,contact:'',phone:''}); 
        setShowSupplierModal(false); 
        showToast("Proveedor guardado", "success"); 
    };
    
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
                        basePrice: Number(item.salePrice) // Actualizar precio de venta si cambió
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

    const saveSettingsFn = async () => { 
        const s = await getDocs(query(collection(db,'artifacts',appId,'public','data','settings'))); 
        const d = {...tempSettings, aboutUsText: aboutText}; 
        if(!s.empty) await updateDoc(doc(db,'artifacts',appId,'public','data','settings',s.docs[0].id), d); 
        else await addDoc(collection(db,'artifacts',appId,'public','data','settings'), d); 
        showToast("Configuración guardada correctamente", 'success'); 
    };
    
    // --- GESTIÓN DE PEDIDOS AVANZADA ---
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
            
            // Restaurar Stock solo si el pedido no estaba cancelado (asumimos lógica simple aquí)
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

    // --- FINANCIAL METRICS (Dashboard Improved) ---
    const financialData = useMemo(() => {
        const revenue = (orders || []).reduce((acc, o) => acc + (o.total || 0), 0);
        const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);
        const netBalance = revenue - totalExpenses;
        const recoveryProgress = totalExpenses > 0 ? Math.min((revenue / totalExpenses) * 100, 100) : 100;
        const recentOrders = orders.slice(0, 5);
        const bestSellers = products.sort((a,b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);

        return { revenue, totalExpenses, netBalance, recoveryProgress, recentOrders, bestSellers };
    }, [orders, expenses, products]);
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
                        
                        {/* Estado y Acciones Admin */}
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
                            {isAdmin(currentUser?.email) && (
                                <button onClick={() => toggleOrderFn(order)} className={`px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 shadow-lg ${order.status === 'Pendiente' ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/20' : 'bg-yellow-600 text-white hover:bg-yellow-500 shadow-yellow-900/20'}`}>
                                    <RefreshCw className="w-4 h-4"/> {order.status === 'Pendiente' ? 'Marcar Entregado' : 'Revertir a Pendiente'}
                                </button>
                            )}
                        </div>

                        {/* Datos del Cliente y Envío */}
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

                        {/* Items */}
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

                        {/* Totales */}
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

                        {/* Botón de Eliminar (Admin Only) */}
                        {isAdmin(currentUser?.email) && (
                            <button 
                                onClick={() => confirmAction(
                                    "Eliminar Pedido Definitivamente", 
                                    "IMPORTANTE: Esta acción eliminará el pedido de la base de datos y RESTAURARÁ EL STOCK de los productos involucrados. ¿Proceder?", 
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

    // --- NUEVO COMPONENTE: SELECTOR VISUAL DE CUPONES ---
    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        
        // Filtramos cupones válidos: globales o específicos para el usuario
        const availableCoupons = coupons.filter(c => {
            const isNotExpired = !c.expirationDate || new Date(c.expirationDate) > new Date();
            const isUserTarget = !c.targetUser || (currentUser && c.targetUser === currentUser.email);
            const isGlobal = c.targetType === 'global';
            // Verificar si el usuario ya lo usó y si tiene límite
            const usedCount = c.usedBy ? c.usedBy.length : 0;
            const userUsed = currentUser && c.usedBy && c.usedBy.includes(currentUser.id);
            const notExhausted = !c.usageLimit || usedCount < c.usageLimit;
            // Permitir uso múltiple solo si no está especificado (asumimos uso único por usuario si es global con límite, o lógica simple)
            // Aquí asumimos: Si el usuario ya está en 'usedBy', ya lo gastó.
            const notUsedByUser = !userUsed;

            return isNotExpired && (isUserTarget || isGlobal) && notExhausted && notUsedByUser;
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
                                        {canApply && (
                                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition">
                                                <Plus className="w-6 h-6"/>
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

    if (isLoading && view === 'store') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <div className="relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                    <Loader2 className="w-16 h-16 text-cyan-400 animate-spin relative z-10"/>
                </div>
                <h1 className="mt-8 text-2xl font-black tracking-widest animate-pulse neon-text">SUSTORE</h1>
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
                        
                        <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block"></div>
                        
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

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {/* VISTA TIENDA */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        {/* Hero Banner */}
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
                                        <button onClick={() => setView('guide')} className="px-8 py-4 glass text-white font-bold rounded-xl hover:bg-white/10 transition border border-white/10">
                                            Cómo Comprar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Categorías */}
                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Filtros:</span>
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===''?'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>Todos</button>
                            {settings.categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'}`}>{c}</button>)}
                        </div>

                        {/* Grid de Productos */}
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
                                            
                                            {/* Quick Add Button */}
                                            <button 
                                                onClick={(e)=>{e.stopPropagation(); manageCart(p, 1)}} 
                                                className="absolute bottom-4 right-4 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-110 hover:bg-cyan-400 hover:shadow-cyan-400/50 transition z-20 translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 duration-300"
                                                title="Agregar al carrito"
                                            >
                                                <Plus className="w-6 h-6"/>
                                            </button>
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
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3">
                                <ShoppingBag className="w-10 h-10 text-cyan-400"/> Mi Carrito
                            </h1>
                        </div>
                        
                        {cart.length === 0 ? (
                            <EmptyState 
                                icon={ShoppingCart} 
                                title="Tu carrito está vacío" 
                                text="Parece que aún no has agregado productos. Explora nuestro catálogo y encuentra lo mejor en tecnología."
                                action={() => setView('store')}
                                actionText="Ir a la Tienda"
                            />
                        ) : (
                            <div className="grid lg:grid-cols-3 gap-8 pb-20">
                                {/* Lista de Items */}
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex gap-6 items-center group relative overflow-hidden hover:border-cyan-900/50 transition duration-300">
                                            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0 shadow-lg">
                                                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain"/>
                                            </div>
                                            <div className="flex-1 min-w-0 z-10">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{item.product.category}</p>
                                                <h3 className="font-bold text-white text-lg truncate mb-1">{item.product.name}</h3>
                                                <p className="text-cyan-400 font-bold text-sm mb-3">${calculatePrice(item.product.basePrice, item.product.discount).toLocaleString()} <span className="text-xs text-slate-500 font-normal">unitario</span></p>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1 border border-slate-700">
                                                        <button onClick={() => manageCart(item.product, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><Minus className="w-4 h-4"/></button>
                                                        <span className="text-sm font-bold w-4 text-center text-white">{item.quantity}</span>
                                                        <button onClick={() => manageCart(item.product, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"><Plus className="w-4 h-4"/></button>
                                                    </div>
                                                    <button onClick={() => manageCart(item.product, -item.quantity)} className="text-slate-600 hover:text-red-500 transition p-2 bg-slate-900 rounded-lg border border-slate-800 hover:bg-red-900/20 hover:border-red-900/30"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end justify-center h-full z-10 px-4">
                                                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Subtotal</p>
                                                <p className="font-black text-2xl text-white neon-text">${(calculatePrice(item.product.basePrice, item.product.discount) * item.quantity).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Resumen y Checkout */}
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8">Resumen de Compra</h3>
                                    
                                    {/* Cupón Selector Inline */}
                                    <div className="mb-8">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Cupón de Descuento</label>
                                        {appliedCoupon ? (
                                            <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition"></div>
                                                <div>
                                                    <p className="font-black text-purple-300 text-lg tracking-widest">{appliedCoupon.code}</p>
                                                    <p className="text-xs text-purple-400 font-bold">{appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}</p>
                                                </div>
                                                <button onClick={() => setAppliedCoupon(null)} className="p-2 bg-slate-900/50 rounded-full text-purple-300 hover:text-red-400 hover:bg-red-900/30 transition relative z-10"><X className="w-4 h-4"/></button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setShowCouponModal(true)} 
                                                className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 hover:bg-purple-900/10 text-slate-400 hover:text-purple-300 rounded-2xl transition flex items-center justify-center gap-2 text-sm font-bold group"
                                            >
                                                <Ticket className="w-5 h-5 group-hover:rotate-12 transition"/> Ver cupones disponibles
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Subtotal</span>
                                            <span className="font-mono font-bold text-white">${cartTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 text-sm">
                                            <span>Envío</span>
                                            <span className="text-cyan-400 font-bold">Gratis</span>
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex justify-between text-purple-400 font-bold text-sm animate-pulse">
                                                <span>Descuento aplicado</span>
                                                <span>-${discountAmt.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-end mb-8">
                                        <span className="text-white font-bold text-lg">Total Final</span>
                                        <span className="text-4xl font-black text-white neon-text tracking-tighter">${finalTotal.toLocaleString()}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setView('checkout')}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-5 text-white font-bold text-lg rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
                                    >
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
                                    
                                    <button 
                                        onClick={confirmOrder}
                                        disabled={isProcessingOrder} 
                                        className={`w-full py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all ${isProcessingOrder ? 'bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-green-900/20 hover:scale-105'}`}
                                    >
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
                        {/* Header Perfil */}
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl z-10">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="text-center md:text-left z-10 flex-1">
                                <h2 className="text-4xl font-black text-white mb-2">{currentUser.name}</h2>
                                <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2"><Mail className="w-4 h-4"/> {currentUser.email}</p>
                                <p className="text-slate-500 text-xs mt-2 font-mono uppercase tracking-widest">Miembro desde {new Date(currentUser.joinDate).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-4 z-10">
                                {hasAccess(currentUser.email) && (
                                    <button onClick={()=>setView('admin')} className="px-6 py-3 bg-slate-900 border border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/20 rounded-xl font-bold transition flex items-center gap-2">
                                        <Shield className="w-5 h-5"/> Admin Panel
                                    </button>
                                )}
                                <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="px-6 py-3 bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-900/20 rounded-xl font-bold transition flex items-center gap-2">
                                    <LogOut className="w-5 h-5"/> Cerrar Sesión
                                </button>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-10">
                            {/* Historial de Pedidos */}
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
                                                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase border ${o.status==='Realizado'?'bg-green-900/20 text-green-400 border-green-900/50':'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'}`}>
                                                        {o.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Mis Cupones Disponibles */}
                            <div className="space-y-6">
                                <h3 className="text-2xl font-black text-white flex items-center gap-3"><Ticket className="text-purple-400"/> Cupones Disponibles</h3>
                                <div className="space-y-4">
                                    {/* Filtrar y mostrar cupones válidos para el usuario */}
                                    {coupons.filter(c => 
                                        (!c.targetUser || c.targetUser === currentUser.email) && 
                                        (!c.usageLimit || !c.usedBy || c.usedBy.length < c.usageLimit) &&
                                        (!c.usedBy || !c.usedBy.includes(currentUser.id))
                                    ).map(c => (
                                        <div key={c.id} className="bg-gradient-to-br from-slate-900 to-[#0a0a0a] border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition">
                                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-purple-500"></div>
                                            <div className="pl-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-black text-white text-xl tracking-widest">{c.code}</span>
                                                    <button onClick={() => {navigator.clipboard.writeText(c.code); showToast("Código copiado", "success")}} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition" title="Copiar"><Copy className="w-4 h-4"/></button>
                                                </div>
                                                <p className="text-purple-400 font-bold mb-1">{c.type==='fixed' ? `$${c.value} DE REGALO` : `${c.value}% DE DESCUENTO`}</p>
                                                {c.minPurchase > 0 && <p className="text-[10px] text-slate-500 font-bold uppercase">Compra mínima: ${c.minPurchase}</p>}
                                                {c.maxDiscount > 0 && <p className="text-[10px] text-slate-500 font-bold uppercase">Tope reintegro: ${c.maxDiscount}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {coupons.filter(c => (!c.targetUser || c.targetUser === currentUser.email) && (!c.usedBy || !c.usedBy.includes(currentUser.id))).length === 0 && (
                                        <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                            <p className="text-slate-500 font-bold text-sm">No tienes cupones nuevos.</p>
                                        </div>
                                    )}
                                </div>
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
                                        <button onClick={()=>setAdminTab('budget')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab==='budget'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white hover:bg-slate-900'}`}><FileText className="w-5 h-5"/>Presupuestos</button>
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
                                    <h1 className="text-4xl font-black text-white mb-8 neon-text">Panel de Control</h1>
                                    
                                    {/* Métricas Principales */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-cyan-500/30 transition">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition"><DollarSign className="w-20 h-20"/></div>
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Ingresos Totales</p>
                                            <p className="text-3xl font-black text-white">${financialData.revenue.toLocaleString()}</p>
                                            <p className="text-green-500 text-xs font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% este mes</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-purple-500/30 transition">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition"><ShoppingBag className="w-20 h-20"/></div>
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Ventas Totales</p>
                                            <p className="text-3xl font-black text-white">{orders.length}</p>
                                            <p className="text-slate-400 text-xs font-bold mt-2">{orders.filter(o=>o.status==='Pendiente').length} pendientes</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-yellow-500/30 transition">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition"><AlertCircle className="w-20 h-20"/></div>
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Alertas de Stock</p>
                                            <p className="text-3xl font-black text-white">{products.filter(p=>p.stock<5).length}</p>
                                            <p className="text-yellow-500 text-xs font-bold mt-2">Productos críticos</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden group hover:border-blue-500/30 transition">
                                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition"><Users className="w-20 h-20"/></div>
                                            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Clientes</p>
                                            <p className="text-3xl font-black text-white">{users.length}</p>
                                            <p className="text-blue-500 text-xs font-bold mt-2">Registrados</p>
                                        </div>
                                    </div>

                                    <div className="grid lg:grid-cols-3 gap-8">
                                        {/* Gráfico CSS: Recuperación de Inversión */}
                                        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden">
                                            <h3 className="font-bold text-white text-xl mb-6 flex items-center gap-2"><PieChart className="w-5 h-5 text-cyan-400"/> Rentabilidad del Negocio</h3>
                                            
                                            <div className="space-y-6">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Balance Neto</p>
                                                        <p className={`text-4xl font-black ${financialData.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                            ${financialData.netBalance.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Gastos Totales</p>
                                                        <p className="text-xl font-bold text-white">${financialData.totalExpenses.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <div className="relative pt-4">
                                                    <div className="flex justify-between mb-2 text-xs font-bold text-slate-400">
                                                        <span>Progreso de Recuperación</span>
                                                        <span>{financialData.recoveryProgress.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800 relative shadow-inner">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                                                            style={{
                                                                width: `${Math.min(financialData.recoveryProgress, 100)}%`,
                                                                background: `linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%)`
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-3 text-center font-medium">
                                                        {financialData.netBalance < 0 
                                                            ? `Faltan $${Math.abs(financialData.netBalance).toLocaleString()} para el punto de equilibrio.` 
                                                            : "¡El negocio es rentable! Estás generando ganancias."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Últimas Ventas */}
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] flex flex-col h-full">
                                            <h3 className="font-bold text-white text-xl mb-6">Actividad Reciente</h3>
                                            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                                {financialData.recentOrders.length === 0 ? <p className="text-slate-500 text-sm">No hay actividad reciente.</p> : financialData.recentOrders.map(o => (
                                                    <div key={o.id} className="flex items-center gap-4 p-3 hover:bg-slate-900/50 rounded-xl transition cursor-pointer border border-transparent hover:border-slate-800" onClick={() => {setAdminTab('orders'); setSelectedOrder(o);}}>
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${o.status==='Realizado'?'bg-green-500/10 text-green-500':'bg-yellow-500/10 text-yellow-500'}`}>
                                                            {o.status==='Realizado' ? 'OK' : 'PD'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm font-bold truncate">{o.customer.name}</p>
                                                            <p className="text-slate-500 text-xs">#{o.orderId}</p>
                                                        </div>
                                                        <p className="text-white font-mono font-bold text-sm">${o.total.toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
{adminTab === 'products' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                        <div>
                                            <h1 className="text-3xl font-black text-white neon-text">Inventario</h1>
                                            <p className="text-slate-500 text-sm mt-1">Gestión total de {products.length} productos</p>
                                        </div>
                                        <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition transform hover:-translate-y-1">
                                            <Plus className="w-5 h-5"/> Nuevo Producto
                                        </button>
                                    </div>
                                    
                                    {showProductForm && (
                                        <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2.5rem] mb-8 shadow-2xl relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                {editingId ? <Edit className="w-5 h-5 text-cyan-400"/> : <Plus className="w-5 h-5 text-cyan-400"/>} 
                                                {editingId ? 'Editar Producto' : 'Crear Producto'}
                                            </h3>
                                            
                                            <div className="grid md:grid-cols-2 gap-8 mb-6">
                                                <div className="space-y-5">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Información Básica</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition mb-4" placeholder="Nombre del Producto" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-4 text-slate-500">$</span>
                                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-8 text-white focus:border-cyan-500 outline-none transition" type="number" placeholder="Precio" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                            </div>
                                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" type="number" placeholder="Stock Inicial" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categorización</label>
                                                        <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" value={newProduct.category||''} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>
                                                            <option value="">Seleccionar Categoría...</option>
                                                            {settings.categories.map(c=><option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="space-y-5">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Multimedia</label>
                                                        <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-700 border-dashed hover:border-cyan-500 transition cursor-pointer" onClick={()=>fileInputRef.current.click()}>
                                                            <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                                                                {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-cover"/> : <FolderPlus className="w-6 h-6 text-slate-500"/>}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-bold text-white">Cargar Imagen</p>
                                                                <p className="text-xs text-slate-500">Max 1MB (JPG, PNG)</p>
                                                            </div>
                                                            <input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="hidden"/>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Descuento (%)</label>
                                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" type="number" placeholder="0" value={newProduct.discount||0} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <textarea className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition resize-none" placeholder="Descripción detallada del producto..." value={newProduct.description||''} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4 border-t border-slate-800 pt-6">
                                                <button onClick={()=>setShowProductForm(false)} className="px-6 py-3 text-slate-400 hover:text-white font-bold transition">Cancelar</button>
                                                <button onClick={saveProductFn} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold hover:bg-cyan-500 transition shadow-lg">Guardar Producto</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-4">
                                        {products.map(p=>(
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between transition group">
                                                <div className="flex items-center gap-6 w-full md:w-auto">
                                                    <div className="w-16 h-16 bg-white rounded-xl p-1 flex-shrink-0">
                                                        <img src={p.image} className="w-full h-full object-contain"/>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg group-hover:text-cyan-400 transition">{p.name}</p>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                            <span className={`px-2 py-0.5 rounded ${p.stock < 5 ? 'bg-red-900/30 text-red-400' : 'bg-slate-800'}`}>Stock: {p.stock}</span>
                                                            <span className="bg-slate-800 px-2 py-0.5 rounded">{p.category}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full md:w-auto gap-8 mt-4 md:mt-0 pl-22 md:pl-0">
                                                    <div className="text-right">
                                                        <p className="font-mono text-xl font-bold text-white">${p.basePrice.toLocaleString()}</p>
                                                        {p.discount > 0 && <p className="text-xs text-green-400 font-bold">-{p.discount}% OFF</p>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-cyan-400 hover:bg-cyan-900/20 hover:border-cyan-500/50 transition"><Edit className="w-5 h-5"/></button>
                                                        <button onClick={()=>deleteProductFn(p)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-red-400 hover:bg-red-900/20 hover:border-red-500/50 transition"><Trash2 className="w-5 h-5"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'coupons' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Marketing & Cupones</h1>
                                    
                                    <div className="bg-[#0a0a0a] border border-purple-500/30 p-8 rounded-[2.5rem] mb-10 shadow-[0_0_30px_rgba(168,85,247,0.1)] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                                        <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2"><Ticket className="text-purple-400"/> Crear Nuevo Beneficio</h3>
                                        
                                        <div className="grid md:grid-cols-2 gap-8 mb-8 relative z-10">
                                            <div className="space-y-5">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código del Cupón</label>
                                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 uppercase font-black text-purple-400 tracking-widest text-lg placeholder-purple-900/50 focus:border-purple-500 outline-none transition" placeholder="EJ: OFERTA2024" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code:e.target.value})}/>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tipo</label>
                                                        <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon, type:e.target.value})}>
                                                            <option value="percentage">Porcentaje (%)</option>
                                                            <option value="fixed">Monto Fijo ($)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Valor</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" type="number" placeholder="Ej: 10 o 5000" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon, value:e.target.value})}/>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-5">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Compra Mínima ($)</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" type="number" placeholder="Opcional" value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon, minPurchase:e.target.value})}/>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Límite de Usos</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" type="number" placeholder="Ej: 100" value={newCoupon.usageLimit} onChange={e=>setNewCoupon({...newCoupon, usageLimit:e.target.value})}/>
                                                    </div>
                                                </div>
                                                
                                                {/* CAMPO NUEVO: TOPE DE REINTEGRO */}
                                                {newCoupon.type === 'percentage' && (
                                                    <div className="bg-purple-900/10 p-3 rounded-xl border border-purple-500/20">
                                                        <label className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 block flex items-center gap-2"><Shield className="w-3 h-3"/> Tope de Reintegro ($)</label>
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" type="number" placeholder="Máximo a descontar (Ej: 2000)" value={newCoupon.maxDiscount} onChange={e=>setNewCoupon({...newCoupon, maxDiscount:e.target.value})}/>
                                                        <p className="text-[10px] text-slate-500 mt-2">Si se deja en 0, no hay límite de descuento.</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-4 items-center">
                                                    <select className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition flex-1" value={newCoupon.targetType} onChange={e=>setNewCoupon({...newCoupon, targetType:e.target.value})}>
                                                        <option value="global">Para Todos</option>
                                                        <option value="individual">Usuario Específico</option>
                                                    </select>
                                                    {newCoupon.targetType === 'individual' && <input className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none transition" placeholder="Email del usuario" value={newCoupon.targetUser} onChange={e=>setNewCoupon({...newCoupon, targetUser:e.target.value})}/>}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button onClick={saveCouponFn} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] transition text-lg flex justify-center gap-2 items-center relative z-10 transform hover:-translate-y-1">
                                            <Save className="w-5 h-5"/> Generar Beneficio
                                        </button>
                                    </div>

                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {coupons.map(c => (
                                            <div key={c.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/50 transition duration-300">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-purple-500"><Tag className="w-24 h-24 transform rotate-12"/></div>
                                                
                                                <div className="flex justify-between items-start mb-4 relative z-10">
                                                    <span className="font-black text-2xl text-white tracking-widest">{c.code}</span>
                                                    <span className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-500/30 uppercase font-bold">
                                                        {c.type === 'percentage' ? 'CUPÓN %' : 'CUPÓN $'}
                                                    </span>
                                                </div>
                                                
                                                <div className="relative z-10 space-y-2 mb-6">
                                                    <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                                                        {c.type === 'fixed' ? `$${c.value}` : `${c.value}%`} <span className="text-lg text-slate-500 font-medium">OFF</span>
                                                    </p>
                                                    
                                                    {/* Mostrar detalles de condiciones */}
                                                    <div className="flex flex-col gap-1 text-xs text-slate-400 font-medium">
                                                        {c.minPurchase > 0 && <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-slate-600"/> Mín: ${c.minPurchase}</span>}
                                                        {c.maxDiscount > 0 && <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-slate-600"/> Tope: ${c.maxDiscount}</span>}
                                                        {c.targetUser && <span className="flex items-center gap-1 text-blue-400"><User className="w-3 h-3"/> Solo para: {c.targetUser}</span>}
                                                    </div>
                                                </div>
                                                
                                                <div className="border-t border-slate-800 pt-4 flex justify-between items-center relative z-10">
                                                    <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full font-bold">
                                                        Usados: {c.usedBy?.length || 0} / {c.usageLimit || '∞'}
                                                    </span>
                                                    <button onClick={()=>deleteCouponFn(c.id)} className="text-slate-600 hover:text-red-400 transition p-2 hover:bg-slate-900 rounded-lg">
                                                        <Trash2 className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'orders' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Gestión de Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 hover:border-cyan-500/40 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center cursor-pointer transition group hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                                                <div className="flex items-center gap-6 w-full md:w-auto mb-4 md:mb-0">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${o.status==='Realizado'?'bg-green-500/10 text-green-500 border border-green-500/20':'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                                                        {o.status==='Realizado' ? <CheckCircle className="w-6 h-6"/> : <Clock className="w-6 h-6"/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg group-hover:text-cyan-400 transition">{o.customer.name}</p>
                                                        <p className="text-sm text-slate-500 font-mono mt-1 flex items-center gap-2">
                                                            <span>{o.orderId}</span> • <span>{new Date(o.date).toLocaleDateString()}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center justify-between w-full md:w-auto gap-10 border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
                                                    <div className="text-right">
                                                        <p className="font-black text-white text-2xl">${o.total.toLocaleString()}</p>
                                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{o.paymentMethod}</p>
                                                    </div>
                                                    <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${o.status==='Realizado'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>
                                                        {o.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}

                            {adminTab === 'suppliers' && (
                                <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white neon-text">Proveedores</h1>
                                        <button onClick={()=>setShowSupplierModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold flex gap-2 shadow-lg transition transform hover:-translate-y-1">
                                            <Plus className="w-5 h-5"/> Nuevo Proveedor
                                        </button>
                                    </div>
                                    
                                    {suppliers.length === 0 ? (
                                        <EmptyState icon={Truck} title="Sin Proveedores" text="Gestiona tu cadena de suministro aquí." action={()=>setShowSupplierModal(true)} actionText="Agregar Primero"/>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {suppliers.map(s=>(
                                                <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] hover:border-slate-600 transition duration-300 group">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="p-4 bg-slate-900 rounded-xl text-slate-400 group-hover:text-white transition"><Truck className="w-8 h-8"/></div>
                                                        <button className="text-slate-600 hover:text-red-400"><Trash2 className="w-5 h-5"/></button>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">{s.name}</h3>
                                                    <div className="space-y-2 mb-6">
                                                        <p className="text-slate-400 text-sm flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p>
                                                        <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4"/> {s.phone || '-'}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deuda Actual</span>
                                                        <span className={`font-black text-xl ${s.debt > 0 ? 'text-red-400' : 'text-green-400'}`}>${s.debt.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {adminTab === 'balance' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <div className="flex flex-col md:flex-row justify-between mb-8 gap-4 items-center">
                                        <h1 className="text-3xl font-black text-white neon-text">Movimientos Financieros</h1>
                                        <div className="flex gap-4 w-full md:w-auto">
                                            <button onClick={()=>setShowPosModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-green-500 transition justify-center flex-1 md:flex-none transform hover:-translate-y-1">
                                                <Zap className="w-5 h-5"/> POS Venta Rápida
                                            </button>
                                            <button onClick={()=>setExpenseModalMode('selection')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-red-500 transition justify-center flex-1 md:flex-none transform hover:-translate-y-1">
                                                <Minus className="w-5 h-5"/> Registrar Gasto
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-[#0a0a0a] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
                                        <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                                            <h3 className="font-bold text-white text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-slate-400"/> Historial de Gastos</h3>
                                        </div>
                                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                            {expenses.length === 0 ? (
                                                <div className="p-12 text-center text-slate-500">No hay movimientos registrados.</div>
                                            ) : expenses.map(e=>(
                                                <div key={e.id} className="p-6 border-b border-slate-800/50 flex justify-between items-center hover:bg-slate-900/30 transition last:border-0">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${e.type==='purchase'?'bg-blue-900/20 text-blue-400':'bg-red-900/20 text-red-400'}`}>
                                                            {e.type==='purchase' ? <Package className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white text-lg">{e.description}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{e.date}</span>
                                                                {e.details && <span className="text-xs text-slate-400 truncate max-w-[200px]">{e.details}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-red-400 font-black font-mono text-xl">-${e.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'budget' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8">Presupuestos</h1>
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                            <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2"><Calculator className="text-cyan-400"/> Generar Cotización</h3>
                                            
                                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Nombre Cliente" value={quoteClient.name} onChange={e=>setQuoteClient({...quoteClient, name:e.target.value})}/>
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Teléfono / Email" value={quoteClient.phone} onChange={e=>setQuoteClient({...quoteClient, phone:e.target.value})}/>
                                            </div>
                                            
                                            <div className="mb-8">
                                                <div className="relative mb-3">
                                                    <Search className="absolute left-4 top-4 text-slate-500 w-5 h-5"/>
                                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition" placeholder="Buscar producto para agregar..." value={posSearch} onChange={e=>setPosSearch(e.target.value)}/>
                                                </div>
                                                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                                    {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase()) && posSearch.length > 0).slice(0,5).map(p=>(
                                                        <button key={p.id} onClick={()=>addToQuote(p)} className="flex-shrink-0 bg-slate-800 hover:bg-cyan-900/30 border border-slate-700 hover:border-cyan-500/50 px-4 py-3 rounded-xl text-xs text-white transition font-bold flex flex-col items-start min-w-[120px]">
                                                            <span className="truncate w-full text-left">{p.name}</span>
                                                            <span className="text-cyan-400 mt-1">${p.basePrice}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2 mb-6 bg-slate-900/30 p-4 rounded-2xl min-h-[200px] border border-slate-800">
                                                {quoteCart.length === 0 ? <p className="text-slate-600 text-center py-10 font-bold text-sm">El presupuesto está vacío.</p> : quoteCart.map(i=>(
                                                    <div key={i.id} className="flex justify-between items-center p-4 bg-[#050505] rounded-xl border border-slate-800">
                                                        <div>
                                                            <span className="text-white font-bold text-sm block">{i.name}</span>
                                                            <span className="text-slate-500 text-xs">Unitario: ${i.basePrice}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="bg-slate-800 px-2 py-1 rounded text-xs text-white">x{i.qty}</span>
                                                            <span className="font-black text-cyan-400 font-mono text-lg">${i.basePrice*i.qty}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="flex justify-end gap-6 items-center pt-6 border-t border-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Descuento Global %</span>
                                                    <input className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-2 text-center text-white font-bold focus:border-cyan-500 outline-none" type="number" value={quoteDiscount} onChange={e=>setQuoteDiscount(Number(e.target.value))}/>
                                                </div>
                                                <button onClick={saveQuote} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition transform hover:-translate-y-1">Guardar Presupuesto</button>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2.5rem] h-[600px] flex flex-col">
                                            <h3 className="font-bold text-white mb-6 text-xl">Historial</h3>
                                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                                {quotes.map(q=>(
                                                    <div key={q.id} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition group">
                                                        <div className="flex justify-between mb-2">
                                                            <span className="font-bold text-white text-lg">{q.clientName}</span>
                                                            <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${q.status==='Convertido'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{q.status}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-3">{new Date(q.date).toLocaleDateString()}</p>
                                                        <div className="flex justify-between items-end border-t border-slate-800/50 pt-3">
                                                            <span className="font-mono text-white font-black text-xl">${q.total.toLocaleString()}</span>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                                {q.status!=='Convertido'&& (
                                                                    <button onClick={()=>convertQuote(q)} className="text-xs bg-green-600 px-3 py-2 rounded-lg text-white font-bold shadow-lg hover:bg-green-500 transition">VENDER</button>
                                                                )}
                                                                <button onClick={()=>deleteQuoteFn(q.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'settings' && (
                                <div className="max-w-4xl mx-auto space-y-8 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white neon-text">Configuración Global</h1>
                                    
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl">
                                        {/* Categorías */}
                                        <div className="mb-10">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block flex items-center gap-2"><Tag className="w-4 h-4"/> Categorías de Productos</label>
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

                                        {/* Anuncios */}
                                        <div className="mb-10">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block flex items-center gap-2"><Megaphone className="w-4 h-4"/> Anuncio Global (Marquesina)</label>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Ej: 🔥 ENVÍOS GRATIS EN COMPRAS SUPERIORES A $50.000 🔥" value={tempSettings.announcementMessage || ''} onChange={e=>setTempSettings({...tempSettings, announcementMessage:e.target.value})}/>
                                        </div>
                                        
                                        {/* About Us */}
                                        <div className="mb-10">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 block flex items-center gap-2"><Info className="w-4 h-4"/> Texto "Sobre Nosotros"</label>
                                            <textarea className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition resize-none leading-relaxed" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
                                        </div>

                                        <button onClick={saveSettingsFn} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-5 rounded-2xl font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition transform hover:-translate-y-1 text-lg flex justify-center gap-2 items-center">
                                            <Save className="w-6 h-6"/> Guardar Todos los Cambios
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
{/* --- MODALES DE ADMIN EXTRA (FLOTANTES) --- */}
                        
                        {/* Modal Nuevo Proveedor */}
                        {showSupplierModal && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up">
                                <div className="bg-[#0a0a0a] border border-slate-700 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative overflow-hidden">
                                    <h3 className="text-2xl font-black text-white mb-8 neon-text flex items-center gap-2"><Truck className="text-cyan-400"/> Nuevo Proveedor</h3>
                                    <div className="space-y-5 relative z-10">
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nombre Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name:e.target.value})}/>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nombre Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier, contact:e.target.value})}/>
                                        <div className="relative">
                                            <span className="absolute left-4 top-4 text-slate-500">$</span>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-8 text-white focus:border-cyan-500 outline-none transition" type="number" placeholder="Deuda Inicial" value={newSupplier.debt} onChange={e=>setNewSupplier({...newSupplier, debt:Number(e.target.value)})}/>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-8 relative z-10">
                                        <button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition bg-slate-900 rounded-xl">Cancelar</button>
                                        <button onClick={saveSupplierFn} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg transition">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Modal Gestión de Gastos / Compras */}
                        {expenseModalMode !== 'closed' && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-up">
                                {expenseModalMode === 'selection' && (
                                    <div className="bg-[#0a0a0a] border border-slate-700 p-10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl text-center">
                                        <h3 className="text-3xl font-black text-white mb-8 neon-text">Selecciona Tipo de Movimiento</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <button onClick={()=>setExpenseModalMode('purchase')} className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800 hover:border-cyan-500 hover:bg-cyan-900/10 transition group flex flex-col items-center">
                                                <div className="w-24 h-24 bg-cyan-900/20 rounded-full flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition group-hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                                    <Package className="w-10 h-10"/>
                                                </div>
                                                <h4 className="text-xl font-bold text-white mb-2">Compra de Stock</h4>
                                                <p className="text-slate-500 text-sm">Ingreso de mercadería al inventario.</p>
                                            </button>
                                            <button onClick={()=>setExpenseModalMode('general')} className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800 hover:border-red-500 hover:bg-red-900/10 transition group flex flex-col items-center">
                                                <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-6 text-red-400 group-hover:scale-110 transition group-hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                                    <Wallet className="w-10 h-10"/>
                                                </div>
                                                <h4 className="text-xl font-bold text-white mb-2">Gasto General</h4>
                                                <p className="text-slate-500 text-sm">Pago de servicios, sueldos, alquiler, etc.</p>
                                            </button>
                                        </div>
                                        <button onClick={()=>setExpenseModalMode('closed')} className="mt-8 text-slate-500 hover:text-white font-bold transition px-6 py-2 rounded-lg hover:bg-slate-900">Cancelar</button>
                                    </div>
                                )}

                                {expenseModalMode === 'general' && (
                                    <div className="bg-[#0a0a0a] border border-red-500/30 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
                                        <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-2 text-red-400"><Minus className="w-6 h-6"/> Registrar Gasto</h3>
                                        <div className="space-y-5">
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-red-500 outline-none transition" placeholder="Descripción (Ej: Alquiler)" value={newExpense.description} onChange={e=>setNewExpense({...newExpense, description:e.target.value})}/>
                                            <div className="relative">
                                                <span className="absolute left-4 top-4 text-slate-500">$</span>
                                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-8 text-white focus:border-red-500 outline-none transition" type="number" placeholder="Monto" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})}/>
                                            </div>
                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 focus:border-red-500 outline-none transition" type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense, date:e.target.value})}/>
                                        </div>
                                        <div className="flex gap-4 mt-8">
                                            <button onClick={()=>setExpenseModalMode('selection')} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition bg-slate-900 rounded-xl">Volver</button>
                                            <button onClick={saveGeneralExpenseFn} className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition">Registrar</button>
                                        </div>
                                    </div>
                                )}

                                {expenseModalMode === 'purchase' && (
                                    <div className="bg-[#0a0a0a] w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-[3rem] border border-cyan-500/20 shadow-2xl flex flex-col overflow-hidden animate-fade-up">
                                        <div className="p-8 border-b border-slate-800 bg-[#050505] flex justify-between items-center">
                                            <h3 className="text-3xl font-black text-white flex items-center gap-3"><Package className="text-cyan-400"/> Compra de Stock</h3>
                                            <button onClick={()=>{setExpenseModalMode('closed'); setPurchaseCart([])}} className="p-3 hover:bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><X className="w-6 h-6"/></button>
                                        </div>
                                        
                                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                            {/* Panel Izquierdo: Formulario */}
                                            <div className="w-full md:w-1/2 p-8 overflow-y-auto border-r border-slate-800 custom-scrollbar">
                                                <div className="mb-8 relative">
                                                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-4 focus-within:border-cyan-500 transition">
                                                        <Search className="text-slate-500 w-5 h-5 mr-3"/>
                                                        <input className="bg-transparent text-white outline-none w-full font-bold placeholder-slate-500" placeholder="Buscar producto existente..." value={productSearchTerm} onChange={e=>setProductSearchTerm(e.target.value)}/>
                                                    </div>
                                                    {productSearchTerm.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 bg-[#0a0a0a] border border-slate-700 rounded-xl mt-2 z-50 max-h-60 overflow-y-auto shadow-2xl">
                                                            {products.filter(p=>p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                                                                <div key={p.id} onClick={()=>selectExistingProduct(p)} className="p-4 hover:bg-slate-900 cursor-pointer flex items-center gap-4 border-b border-slate-800/50 last:border-0">
                                                                    <img src={p.image} className="w-10 h-10 rounded object-cover bg-white p-1"/>
                                                                    <div>
                                                                        <p className="text-white text-sm font-bold">{p.name}</p>
                                                                        <p className="text-xs text-slate-500">Stock actual: {p.stock}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-6 bg-slate-900/20 p-6 rounded-3xl border border-slate-800">
                                                    <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nombre del Producto" value={newPurchaseItem.name} onChange={e=>setNewPurchaseItem({...newPurchaseItem, name:e.target.value})}/>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 w-1 bg-red-500 rounded-l-xl"></div>
                                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-6 text-white focus:border-red-500 outline-none transition placeholder-slate-500" type="number" placeholder="Costo Unitario" value={newPurchaseItem.costPrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, costPrice:e.target.value})}/>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 w-1 bg-green-500 rounded-l-xl"></div>
                                                            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-6 text-white focus:border-green-500 outline-none transition placeholder-slate-500" type="number" placeholder="Precio Venta" value={newPurchaseItem.salePrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, salePrice:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" type="number" placeholder="Cantidad" value={newPurchaseItem.quantity} onChange={e=>setNewPurchaseItem({...newPurchaseItem, quantity:e.target.value})}/>
                                                        <select className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" value={newPurchaseItem.category} onChange={e=>setNewPurchaseItem({...newPurchaseItem, category:e.target.value})}>
                                                            <option value="">Categoría...</option>
                                                            {settings.categories.map(c=><option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 border-dashed hover:border-cyan-500 transition cursor-pointer flex items-center gap-4" onClick={()=>purchaseFileInputRef.current.click()}>
                                                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                                                            {newPurchaseItem.image ? <img src={newPurchaseItem.image} className="w-full h-full object-cover rounded-lg"/> : <FolderPlus className="w-6 h-6"/>}
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-400">Seleccionar Imagen</span>
                                                        <input type="file" ref={purchaseFileInputRef} onChange={handlePurchaseImage} className="hidden"/>
                                                    </div>
                                                    
                                                    <button onClick={addPurchaseItemToCart} className="w-full py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition flex items-center justify-center gap-2 shadow-lg">
                                                        <Plus className="w-5 h-5"/> Agregar a la Lista
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Panel Derecho: Resumen */}
                                            <div className="w-full md:w-1/2 flex flex-col bg-[#080808]">
                                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                                    <h4 className="text-slate-500 text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Resumen de Compra</h4>
                                                    <div className="space-y-4">
                                                        {purchaseCart.map(item => (
                                                            <div key={item.id} className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 items-center relative group hover:bg-slate-900 transition">
                                                                <div className="w-16 h-16 bg-white rounded-xl p-1 flex items-center justify-center shadow-md">
                                                                    <img src={item.image} className="max-h-full max-w-full object-contain"/>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-white font-bold text-base truncate">{item.name}</p>
                                                                    <div className="flex gap-4 text-xs mt-1">
                                                                        <span className="text-green-400 font-bold bg-green-900/20 px-2 py-0.5 rounded">Venta: ${item.salePrice}</span>
                                                                        <span className="text-blue-400 font-bold bg-blue-900/20 px-2 py-0.5 rounded">Stock: +{item.quantity}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Costo Total</p>
                                                                    <p className="text-red-400 font-black text-lg">-${(item.costPrice * item.quantity).toLocaleString()}</p>
                                                                </div>
                                                                <button onClick={()=>setPurchaseCart(purchaseCart.filter(x=>x.id!==item.id))} className="absolute -top-2 -right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-red-500 shadow-lg opacity-0 group-hover:opacity-100 transition"><X className="w-4 h-4"/></button>
                                                            </div>
                                                        ))}
                                                        {purchaseCart.length === 0 && <p className="text-slate-600 text-center py-10 font-bold">Agrega productos para comenzar.</p>}
                                                    </div>
                                                </div>
                                                <div className="p-8 bg-[#050505] border-t border-slate-800">
                                                    <div className="flex justify-between items-end mb-6">
                                                        <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">Total Gasto</span>
                                                        <span className="text-5xl font-black text-red-500 tracking-tighter">-${purchaseCart.reduce((a,i)=>a+(i.costPrice*i.quantity),0).toLocaleString()}</span>
                                                    </div>
                                                    <button onClick={confirmPurchaseFn} disabled={purchaseCart.length === 0} className={`w-full py-5 rounded-2xl font-black text-xl shadow-lg transition flex justify-center items-center gap-2 ${purchaseCart.length===0 ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white hover:scale-105'}`}>
                                                        Confirmar Compra <ArrowRight className="w-6 h-6"/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Modal POS (Punto de Venta) */}
                        {showPosModal && (
                            <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-up">
                                <div className="bg-[#0a0a0a] w-full max-w-[1400px] h-[90vh] rounded-[3rem] border border-green-500/20 flex flex-col overflow-hidden shadow-[0_0_100px_rgba(34,197,94,0.1)]">
                                    <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#050505]">
                                        <h2 className="text-3xl font-black text-white flex items-center gap-3"><Zap className="text-green-500 w-8 h-8"/> Punto de Venta <span className="text-sm font-bold bg-slate-900 text-slate-500 px-3 py-1 rounded-full">BETA</span></h2>
                                        <button onClick={()=>setShowPosModal(false)} className="p-4 bg-slate-900 rounded-full hover:bg-slate-800 transition"><X className="text-slate-400 w-6 h-6"/></button>
                                    </div>
                                    <div className="flex-1 flex overflow-hidden">
                                        {/* Grid Productos */}
                                        <div className="w-3/4 p-8 border-r border-slate-800 overflow-y-auto custom-scrollbar bg-grid">
                                            <div className="sticky top-0 z-20 mb-8">
                                                <input className="w-full bg-slate-900/90 backdrop-blur border-2 border-slate-700 rounded-2xl p-6 text-xl font-bold text-white focus:border-green-500 outline-none transition shadow-xl placeholder-slate-500" placeholder="🔍 Escanear código o buscar producto..." autoFocus value={posSearch} onChange={e=>setPosSearch(e.target.value)}/>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                                                {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())&&p.stock>0).slice(0,30).map(p=>(
                                                    <div key={p.id} onClick={()=>addToPos(p)} className="bg-[#0f0f0f] p-4 rounded-[2rem] cursor-pointer hover:bg-slate-900 hover:border-green-500 border-2 border-transparent transition text-center group shadow-lg flex flex-col h-full">
                                                        <div className="h-32 w-full bg-white rounded-2xl mb-4 overflow-hidden flex items-center justify-center p-2 relative">
                                                            <img src={p.image} className="max-h-full max-w-full object-contain"/>
                                                            <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/10 transition flex items-center justify-center">
                                                                <Plus className="w-8 h-8 text-green-500 opacity-0 group-hover:opacity-100 transition transform scale-50 group-hover:scale-100"/>
                                                            </div>
                                                        </div>
                                                        <div className="mt-auto">
                                                            <p className="font-bold text-white text-sm truncate mb-1">{p.name}</p>
                                                            <p className="text-green-500 font-black text-xl">${p.basePrice.toLocaleString()}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Stock: {p.stock}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Ticket */}
                                        <div className="w-1/4 p-8 bg-[#050505] flex flex-col border-l border-slate-800 shadow-2xl relative z-10">
                                            <h3 className="text-slate-500 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><FileText className="w-4 h-4"/> Ticket Actual</h3>
                                            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                                                {posCart.length === 0 ? <div className="text-center py-20 text-slate-600 font-bold">Ticket vacío</div> : posCart.map(i=>(
                                                    <div key={i.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                                        <div className="min-w-0 flex-1 mr-3">
                                                            <p className="text-white text-sm font-bold truncate">{i.name}</p>
                                                            <p className="text-xs text-slate-500 mt-1">${i.basePrice} x {i.qty}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-green-400 font-bold">${(i.basePrice*i.qty).toLocaleString()}</span>
                                                            <button onClick={()=>setPosCart(posCart.filter(x=>x.id!==i.id))} className="text-slate-600 hover:text-red-500 transition"><X className="w-4 h-4"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="border-t border-slate-800 pt-6">
                                                <div className="flex justify-between text-slate-400 mb-2 font-bold uppercase tracking-wider text-xs">Total a Pagar</div>
                                                <div className="flex justify-between text-5xl font-black text-white mb-8 neon-text tracking-tighter">
                                                    <span>$</span><span>{posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0).toLocaleString()}</span>
                                                </div>
                                                <button onClick={confirmPosSale} className="w-full py-6 bg-green-600 hover:bg-green-500 text-white font-black rounded-3xl text-2xl shadow-[0_0_30px_rgba(34,197,94,0.4)] transition flex items-center justify-center gap-3 transform hover:-translate-y-1">
                                                    COBRAR <DollarSign className="w-8 h-8"/>
                                                </button>
                                            </div>
                                        </div>
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
                                <button onClick={()=>{setView('store'); document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'}); setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><Search className="w-6 h-6"/> Catálogo</button>
                                {currentUser && <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><User className="w-6 h-6"/> Mi Perfil</button>}
                                <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><ShoppingBag className="w-6 h-6"/> Carrito</button>
                                <button onClick={()=>{setView('guide');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><FileQuestion className="w-6 h-6"/> Cómo Comprar</button>
                                <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-3 hover:bg-slate-900 rounded-xl"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                                
                                {currentUser && hasAccess(currentUser.email) && (
                                    <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-3 bg-cyan-900/10 rounded-xl"><Shield className="w-6 h-6"/> Admin Panel</button>
                                )}
                                
                                {currentUser ? ( 
                                    <button onClick={()=>{localStorage.removeItem('nexus_user_id'); localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store'); setIsMenuOpen(false);}} className="w-full text-left text-lg font-bold text-red-400 mt-4 flex items-center gap-4 p-3 hover:bg-red-900/20 rounded-xl"><LogOut className="w-6 h-6"/> Cerrar Sesión</button> 
                                ) : ( 
                                    <button onClick={()=>{setView('login');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-4 flex items-center gap-4 p-3 border border-cyan-500/30 rounded-xl"><LogIn className="w-6 h-6"/> Iniciar Sesión</button> 
                                )}
                            </div>
                            <div className="border-t border-slate-800 pt-6 flex gap-4 justify-center">
                                <button onClick={goWsp} className="p-4 bg-slate-900 rounded-full text-green-400 hover:bg-green-900/30 transition"><MessageCircle className="w-6 h-6"/></button>
                                <button onClick={goIg} className="p-4 bg-slate-900 rounded-full text-pink-400 hover:bg-pink-900/30 transition"><Instagram className="w-6 h-6"/></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA LOGIN / REGISTER */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 animate-fade-up backdrop-blur-xl">
                        <button onClick={()=>setView('store')} className="absolute top-8 right-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><X className="w-6 h-6"/></button>
                        <div className="bg-[#0a0a0a] p-10 md:p-14 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800 relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_30px_rgba(6,182,212,0.8)]"></div>
                            
                            <div className="text-center mb-10">
                                <h2 className="text-4xl font-black text-white mb-2 tracking-tight">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                                <p className="text-slate-500 text-sm">Ingresa tus datos para continuar.</p>
                            </div>

                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-5">
                                {!loginMode && (
                                    <>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nombre Completo" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})} required/>
                                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder="Nombre de Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})} required/>
                                    </>
                                )}
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} required/>
                                <input className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 outline-none transition" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} required/>
                                
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

                {/* VISTA SOBRE NOSOTROS */}
                {view === 'about' && (
                    <div className="max-w-4xl mx-auto pt-10 animate-fade-up px-6 pb-20">
                        <button onClick={()=>setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft className="w-6 h-6"/></button>
                        <h2 className="text-5xl font-black text-white mb-12 flex items-center gap-4 neon-text"><Info className="w-12 h-12 text-cyan-400"/> Sobre Nosotros</h2>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-12 rounded-[3rem] relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div>
                            <p className="text-slate-300 text-xl leading-relaxed whitespace-pre-wrap font-medium relative z-10">
                                {settings.aboutUsText || "Cargando información..."}
                            </p>
                            <div className="mt-16 pt-10 border-t border-slate-800 flex flex-col md:flex-row gap-6">
                                <button onClick={goWsp} className="flex-1 py-4 bg-green-600/10 border border-green-500/30 text-green-400 font-bold rounded-2xl hover:bg-green-600/20 transition flex items-center justify-center gap-3">
                                    <MessageCircle className="w-6 h-6"/> Contactar por WhatsApp
                                </button>
                                <button onClick={goIg} className="flex-1 py-4 bg-pink-600/10 border border-pink-500/30 text-pink-400 font-bold rounded-2xl hover:bg-pink-600/20 transition flex items-center justify-center gap-3">
                                    <Instagram className="w-6 h-6"/> Ver en Instagram
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA CÓMO COMPRAR */}
                {view === 'guide' && (
                    <div className="max-w-6xl mx-auto pt-10 animate-fade-up px-6 pb-20">
                        <button onClick={()=>setView('store')} className="mb-8 p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft className="w-6 h-6"/></button>
                        <h2 className="text-5xl font-black text-white text-center mb-20 neon-text">Cómo Comprar</h2>
                        <div className="grid md:grid-cols-3 gap-10 relative">
                            {[ 
                                { icon: Search, title: "1. Elige", text: "Explora nuestro catálogo premium y selecciona tus productos favoritos." }, 
                                { icon: ShoppingBag, title: "2. Confirma", text: "Ve al carrito, aplica tus cupones y completa los datos de envío." }, 
                                { icon: Truck, title: "3. Recibe", text: "Coordinamos el pago y el envío llega directo a tu puerta." } 
                            ].map((step, i) => (
                                <div key={i} className="bg-[#0a0a0a] border border-slate-800 p-10 rounded-[3rem] text-center hover:bg-slate-900/50 hover:border-cyan-500/30 transition duration-500 group relative z-10">
                                    <div className="w-24 h-24 mx-auto bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:bg-cyan-900/20 group-hover:border-cyan-500/50">
                                        <step.icon className="w-10 h-10 text-slate-400 group-hover:text-cyan-400 transition"/>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-4">{step.title}</h3>
                                    <p className="text-slate-400 leading-relaxed text-lg font-medium">{step.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-24 text-center">
                            <button onClick={() => setView('store')} className="px-16 py-5 bg-white text-black font-black rounded-full shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(6,182,212,0.5)] hover:bg-cyan-400 transition text-xl transform hover:-translate-y-2">
                                Ir a la Tienda
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
