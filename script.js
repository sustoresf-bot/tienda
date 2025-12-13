import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN FIREBASE ---
// Nota: En un entorno real, estas keys no deberían estar hardcodeadas así, pero para este demo funcionan.
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
    storeName: "SUSTORE", primaryColor: "#06b6d4", currency: "$", 
    admins: "lautarocorazza63@gmail.com", 
    team: [{ email: "lautarocorazza63@gmail.com", role: "admin" }],
    sellerEmail: "sustoresf@gmail.com", instagramUser: "sustore_sf", whatsappLink: "https://wa.me/message/3MU36VTEKINKP1", 
    logoUrl: "", heroUrl: "", markupPercentage: 0, 
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"], 
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado."
};

// --- UTILS & COMPONENTS ---
const Toast = ({ message, type, onClose }) => {
    const colors = { success: 'border-green-500 text-green-400 bg-green-950/90', error: 'border-red-500 text-red-400 bg-red-950/90', info: 'border-cyan-500 text-cyan-400 bg-cyan-950/90', warning: 'border-yellow-500 text-yellow-400 bg-yellow-950/90' };
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (<div className={`fixed top-24 right-4 z-[9999] flex items-center gap-3 p-4 rounded-xl border-l-4 shadow-2xl backdrop-blur-md animate-fade-up ${colors[type] || colors.info}`}><p className="font-bold text-sm tracking-wide">{message}</p></div>);
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText="Confirmar", cancelText="Cancelar" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
            <div className="glass p-8 rounded-3xl max-w-sm w-full border border-slate-700 shadow-2xl shadow-cyan-900/20">
                <h3 className="text-xl font-bold text-white mb-2 neon-text">{title}</h3>
                <p className="text-slate-300 mb-6 text-sm">{message}</p>
                <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">{cancelText}</button><button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition shadow-lg shadow-red-600/30">{confirmText}</button></div>
            </div>
        </div>
    );
};

const EmptyState = ({ icon: Icon, title, text, action, actionText }) => (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 w-full animate-fade-up">
        <div className="p-5 bg-slate-800/50 rounded-full mb-4 shadow-[0_0_15px_rgba(0,0,0,0.5)]"><Icon className="w-12 h-12 text-slate-600"/></div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm max-w-xs mb-6">{text}</p>
        {action && <button onClick={action} className="px-8 py-3 neon-button text-white rounded-xl font-bold transition shadow-lg">{actionText}</button>}
    </div>
);

// --- MAIN APPLICATION ---
function App() {
    // --- ESTADOS GLOBALES ---
    const [view, setView] = useState('store');
    const [adminTab, setAdminTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('nexus_user_data')); } catch(e) { return null; } });
    const [systemUser, setSystemUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
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
    const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percentage', value: 0, minPurchase: 0, expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '' });
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
    const confirmAction = (title, message, action) => setModalConfig({ isOpen: true, title, message, onConfirm: () => { action(); setModalConfig({ ...modalConfig, isOpen: false }); } });
    const calculatePrice = (p, d) => d > 0 ? Math.ceil(Number(p) * (1 - d / 100)) : Number(p);
    
    // Roles
    const getRole = (email) => {
        if (!email) return null;
        const clean = email.trim().toLowerCase();
        if (clean === settings.admins?.toLowerCase()) return 'admin';
        const team = settings.team || [];
        const member = team.find(m => m.email.toLowerCase() === clean);
        return member ? member.role : null;
    };
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => isAdmin(email) || getRole(email) === 'employee';

    // --- EFFECTS ---
    useEffect(() => localStorage.setItem('nexus_cart', JSON.stringify(cart)), [cart]);
    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            setCheckoutData(prev => ({ ...prev, address: currentUser.address || '', city: currentUser.city || '', province: currentUser.province || '', zipCode: currentUser.zipCode || '' }));
        } else {
            localStorage.removeItem('nexus_user_data');
        }
    }, [currentUser]);

    useEffect(() => { 
        const init = async () => { 
            try {
                // Check if we have an initial token provided by the environment
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) {
                console.error("Auth init error:", e);
            }
        }; 
        init(); 
        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            // Si el sistema ha cargado usuario (anónimo o real), quitamos el loading a los pocos segundos si no hay datos
            setTimeout(() => setIsLoading(false), 2000);
        }); 
    }, []);
    
    useEffect(() => {
        if(!systemUser) return;
        const subs = [
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => {
                setProducts(s.docs.map(d=>({id:d.id, ...d.data()})));
                setIsLoading(false); // Datos cargados
            }),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), s => setQuotes(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => {
                if(!s.empty) { const d = s.docs[0].data(); setSettings({...defaultSettings, ...d}); setTempSettings({...defaultSettings, ...d}); setAboutText(d.aboutUsText || defaultSettings.aboutUsText); }
                else addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings);
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
                if (!authData.name || !authData.username || !authData.email || !authData.password) throw new Error("Faltan datos");
                const q = query(uRef, where("email", "==", authData.email));
                const s = await getDocs(q);
                if (!s.empty) throw new Error("Email ya registrado");
                const newUser = { ...authData, role: 'user', joinDate: new Date().toISOString() };
                const ref = await addDoc(uRef, newUser);
                setCurrentUser({ ...newUser, id: ref.id });
            } else {
                if (!authData.email || !authData.password) throw new Error("Ingresa usuario y contraseña");
                // Intento simple de login buscando en la colección 'users'
                let q = query(uRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let s = await getDocs(q);
                if (s.empty) { q = query(uRef, where("username", "==", authData.email), where("password", "==", authData.password)); s = await getDocs(q); }
                if (s.empty) throw new Error("Credenciales inválidas");
                setCurrentUser({ ...s.docs[0].data(), id: s.docs[0].id });
            }
            setView('store');
            showToast("¡Bienvenido!", "success");
        } catch (e) { showToast(e.message, "error"); }
        setIsLoading(false);
    };

    const manageCart = (prod, delta) => {
        if (!prod || !prod.id) return showToast("Error al agregar producto", "error");
        
        setCart(prevCart => {
            const exists = prevCart.find(i => i.product.id === prod.id);
            const currentQty = exists ? exists.quantity : 0;
            const newQty = currentQty + delta;

            if (newQty > Number(prod.stock)) {
                showToast("Stock máximo alcanzado", "warning");
                return prevCart;
            }

            if (newQty <= 0) {
                if (exists) showToast("Eliminado del carrito", "info");
                return prevCart.filter(i => i.product.id !== prod.id);
            }

            if (exists) {
                return prevCart.map(i => i.product.id === prod.id ? { ...i, quantity: newQty } : i);
            } else {
                showToast("¡Producto agregado!", "success");
                return [...prevCart, { product: prod, quantity: 1 }];
            }
        });
    };

    const cartTotal = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);
    const getDiscountValue = (total, coupon) => {
        if (!coupon) return 0;
        if (coupon.type === 'fixed') return Math.min(total, coupon.value);
        return Math.ceil(total * (coupon.value / 100));
    };
    const discountAmt = appliedCoupon ? getDiscountValue(cartTotal, appliedCoupon) : 0;
    const finalTotal = cartTotal - discountAmt;

    const selectCoupon = (c) => {
        if (new Date(c.expirationDate) < new Date()) return showToast("Cupón vencido", "warning");
        if (c.usageLimit && c.usedBy && c.usedBy.length >= c.usageLimit) return showToast("Cupón agotado", "warning");
        if (cartTotal < (c.minPurchase || 0)) return showToast(`Compra mínima de $${c.minPurchase}`, "warning");
        setAppliedCoupon(c);
        setShowCouponModal(false);
        showToast("Cupón aplicado", "success");
    };

    const confirmOrder = async () => {
        if(!currentUser) { setView('login'); return showToast("Inicia sesión para comprar", "info"); }
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Faltan datos de envío", "warning");
        if(appliedCoupon && cartTotal < (appliedCoupon.minPurchase || 0)) return showToast(`Compra mínima para el cupón: $${appliedCoupon.minPurchase}`, "error");

        setIsLoading(true);
        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;
            const newOrder = { 
                orderId, userId: currentUser.id, 
                customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, dni: currentUser.dni }, 
                items: cart.map(i => ({ productId: i.product.id, title: i.product.name, quantity: i.quantity, unit_price: calculatePrice(i.product.basePrice, i.product.discount) })), 
                total: finalTotal, subtotal: cartTotal, discount: discountAmt, 
                discountCode: appliedCoupon?.code || null, status: 'Pendiente', date: new Date().toISOString(), 
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, 
                paymentMethod: checkoutData.paymentChoice 
            };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode });
            fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newOrder, shipping: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province}`, discountDetails: appliedCoupon ? { percentage: appliedCoupon.type === 'percentage' ? appliedCoupon.value : 0, amount: discountAmt } : null }) }).catch(err => console.log("Email skipped"));
            for(const i of cart) { const r = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.product.id); const s = await getDoc(r); if(s.exists()) await updateDoc(r, { stock: Math.max(0, s.data().stock - i.quantity) }); }
            if(appliedCoupon) { const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id); const cSnap = await getDoc(cRef); if(cSnap.exists()) await updateDoc(cRef, { usedBy: [...(cSnap.data().usedBy || []), currentUser.id] }); }
            setCart([]); setView('profile'); setAppliedCoupon(null); showToast("¡Pedido Realizado!", "success");
        } catch(e) { console.error(e); showToast("Error al procesar", "error"); }
        setIsLoading(false);
    };

    // --- ADMIN FUNCTIONS ---
    const saveProductFn = async () => {
        if(!newProduct.name) return showToast("Faltan datos", "warning");
        const d = {...newProduct, basePrice: Number(newProduct.basePrice), stock: Number(newProduct.stock), discount: Number(newProduct.discount), image: newProduct.image || 'https://via.placeholder.com/150'};
        if(editingId) await updateDoc(doc(db,'artifacts',appId,'public','data','products',editingId), d);
        else await addDoc(collection(db,'artifacts',appId,'public','data','products'), d);
        setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0}); setEditingId(null); setShowProductForm(false); showToast("Guardado", "success");
    };
    const deleteProductFn = (p) => confirmAction("Eliminar", `¿Borrar ${p.name}?`, async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','products',p.id)); showToast("Borrado", "success"); });
    
    const saveCouponFn = async () => {
        if(!newCoupon.code) return showToast("Falta código", "warning");
        if(newCoupon.targetType === 'individual' && !newCoupon.targetUser) return showToast("Ingresa el email del usuario", "warning");
        await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), {
            ...newCoupon, code: newCoupon.code.toUpperCase(), value: Number(newCoupon.value),
            minPurchase: Number(newCoupon.minPurchase), usageLimit: Number(newCoupon.usageLimit),
            targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
        });
        setNewCoupon({code:'', type: 'percentage', value: 0, minPurchase: 0, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
        showToast("Cupón creado", "success");
    };
    const deleteCouponFn = (id) => confirmAction("Eliminar", "¿Borrar cupón?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',id)); showToast("Eliminado", "success"); });

    const addTeamMemberFn = async () => { if(!newTeamMember.email.includes('@')) return; const updatedTeam = [...(settings.team || []), newTeamMember]; await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); setNewTeamMember({email:'',role:'employee'}); showToast("Agregado", "success"); };
    const removeTeamMemberFn = async (email) => { const updatedTeam = (settings.team || []).filter(m => m.email !== email); await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { team: updatedTeam }); showToast("Eliminado", "success"); };
    const saveSupplierFn = async () => { if(!newSupplier.name) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), newSupplier); setNewSupplier({name:'',debt:0,contact:'',phone:''}); setShowSupplierModal(false); showToast("Guardado", "success"); };
    
    const confirmPurchaseFn = async () => {
        if(!purchaseCart.length) return; setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const totalCost = purchaseCart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
            batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses')), { description: `Compra Stock (${purchaseCart.length})`, details: purchaseCart.map(i => `${i.quantity}x ${i.name}`).join(', '), amount: totalCost, date: new Date().toISOString().split('T')[0], type: 'purchase' });
            purchaseCart.forEach(item => {
                if (item.existingId) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', item.existingId), { stock: Number(products.find(p=>p.id===item.existingId).stock) + Number(item.quantity), basePrice: Number(item.salePrice) });
                else batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'products')), { name: item.name, basePrice: item.salePrice, stock: item.quantity, category: item.category || 'Varios', image: item.image || '', description: 'Ingreso stock', discount: 0 });
            });
            await batch.commit(); setPurchaseCart([]); setExpenseModalMode('closed'); showToast("Stock actualizado", "success");
        } catch(e) { console.error(e); showToast("Error", "error"); } setIsLoading(false);
    };
    const saveGeneralExpenseFn = async () => { if(!newExpense.amount) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {...newExpense, amount: Number(newExpense.amount), type: 'general'}); setExpenseModalMode('closed'); showToast("Guardado", "success"); };
    
    const saveSettingsFn = async () => { const s=await getDocs(query(collection(db,'artifacts',appId,'public','data','settings'))); const d={...tempSettings, aboutUsText: aboutText}; if(!s.empty) await updateDoc(doc(db,'artifacts',appId,'public','data','settings',s.docs[0].id), d); else await addDoc(collection(db,'artifacts',appId,'public','data','settings'), d); showToast("Configuración guardada", 'success'); };
    const toggleOrderFn = async (o) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { status: o.status === 'Pendiente' ? 'Realizado' : 'Pendiente' }); showToast("Estado actualizado", 'info'); };
    
    // POS Functions
    const addToPos = (p) => { const ex = posCart.find(i=>i.id===p.id); if(ex && ex.qty+1>p.stock) return; setPosCart(ex ? posCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...posCart,{...p,qty:1}]); };
    const confirmPosSale = async () => { if(!posCart.length) return; setIsLoading(true); const batch = writeBatch(db); const total = posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0); const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); batch.set(orderRef, { orderId: `POS-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: 'Mostrador', email: '-', phone: '-' }, items: posCart.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total, subtotal: total, discount: 0, status: 'Realizado', date: new Date().toISOString(), origin: 'store', paymentMethod: 'Efectivo' }); posCart.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: Math.max(0, products.find(p=>p.id===i.id).stock - i.qty) }); }); await batch.commit(); setPosCart([]); setShowPosModal(false); showToast("Venta registrada", "success"); setIsLoading(false); };
    
    // Quote Functions
    const addToQuote = (p) => { const ex = quoteCart.find(i=>i.id===p.id); setQuoteCart(ex ? quoteCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...quoteCart,{...p,qty:1}]); };
    const saveQuote = async () => { const total = quoteCart.reduce((a,i)=>a+(i.basePrice*i.qty),0) * (1 - quoteDiscount/100); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), { clientName: quoteClient.name || 'Cliente', clientPhone: quoteClient.phone, items: quoteCart, total, discount: quoteDiscount, date: new Date().toISOString(), status: 'Borrador' }); setQuoteCart([]); setQuoteClient({name:'',phone:''}); showToast("Presupuesto guardado", "success"); };
    const deleteQuoteFn = (id) => confirmAction("Eliminar Presupuesto", "¿Borrar historial?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','quotes',id)); showToast("Presupuesto eliminado", "success"); });
    const convertQuote = async (q) => { setIsLoading(true); const batch = writeBatch(db); const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); batch.set(orderRef, { orderId: `QUO-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: q.clientName, phone: q.clientPhone, email: '-' }, items: q.items.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total: q.total, status: 'Realizado', date: new Date().toISOString(), origin: 'quote', paymentMethod: 'Presupuesto' }); q.items.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: Math.max(0, products.find(p=>p.id===i.id).stock - i.qty) }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'quotes', q.id), { status: 'Convertido' }); await batch.commit(); showToast("Convertido a venta", "success"); setIsLoading(false); };

    // Helpers
    const goWsp = () => window.open(settings.whatsappLink, '_blank');
    const goIg = () => window.open(`https://www.instagram.com/${settings.instagramUser}`, '_blank');
    const handleImage = (e, setter) => { const f=e.target.files[0]; if(f&&f.size<1000000){const r=new FileReader();r.onload=()=>setter(p=>({...p,image:r.result}));r.readAsDataURL(f);}else showToast("Imagen muy pesada (Max 1MB)", 'error'); };
    const handlePurchaseImage = (e) => { const f=e.target.files[0]; if(f && f.size<1000000) { const r=new FileReader(); r.onload=()=>setNewPurchaseItem(p=>({...p, image: r.result})); r.readAsDataURL(f); } else showToast("Imagen pesada", 'error'); };
    const selectExistingProduct = (p) => { setNewPurchaseItem({ ...newPurchaseItem, name: p.name, salePrice: p.basePrice, category: p.category, image: p.image, existingId: p.id, quantity: '', costPrice: '' }); setProductSearchTerm(''); };
    const addPurchaseItemToCart = () => { if(!newPurchaseItem.name || !newPurchaseItem.costPrice || !newPurchaseItem.quantity) return; setPurchaseCart([...purchaseCart, { ...newPurchaseItem, id: Date.now(), costPrice: Number(newPurchaseItem.costPrice), salePrice: Number(newPurchaseItem.salePrice), quantity: Number(newPurchaseItem.quantity) }]); setNewPurchaseItem({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null }); };

    // --- FINANCIAL METRICS (Dashboard Improved) ---
    const financialData = useMemo(() => {
        const revenue = (orders || []).reduce((acc, o) => acc + (o.total || 0), 0);
        const totalExpenses = (expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);
        const netBalance = revenue - totalExpenses;
        const recoveryProgress = totalExpenses > 0 ? Math.min((revenue / totalExpenses) * 100, 100) : 100;

        return { revenue, totalExpenses, netBalance, recoveryProgress };
    }, [orders, expenses]);

    // --- SUB-COMPONENTS ---
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        <div><h3 className="text-xl font-bold text-white flex items-center gap-2 neon-text">Pedido <span className="text-cyan-400">#{order.orderId}</span></h3><p className="text-slate-400 text-xs">{new Date(order.date).toLocaleString()}</p></div>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><X className="w-5 h-5 text-white"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="flex justify-between items-center bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span>
                            {isAdmin(currentUser?.email) && <button onClick={() => toggleOrderFn(order)} className="text-xs text-blue-400 font-bold hover:underline">Cambiar Estado</button>}
                        </div>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0">
                                    <div className="flex items-center gap-3"><span className="font-bold text-white text-sm">{item.quantity}x</span> <span className="text-slate-300 text-sm">{item.title}</span></div>
                                    <span className="text-white font-mono text-sm">${item.unit_price}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                            <span className="text-white font-bold">Total Pagado</span>
                            <span className="text-2xl font-black text-cyan-400 neon-text">${order.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        const availableCoupons = coupons.filter(c => !c.targetUser || c.targetUser === currentUser?.email);
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-3xl w-full max-w-md overflow-hidden relative">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                    <div className="p-8">
                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2"><Ticket className="w-6 h-6 text-purple-400"/> Mis Cupones</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {availableCoupons.length === 0 ? <p className="text-slate-500 text-center py-8">No hay cupones disponibles.</p> : availableCoupons.map(c => (
                                <div key={c.id} onClick={() => selectCoupon(c)} className="bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 p-4 rounded-xl cursor-pointer transition group">
                                    <div className="flex justify-between items-start">
                                        <div><p className="font-black text-white tracking-widest text-lg group-hover:text-purple-400 transition">{c.code}</p><p className="text-xs text-slate-400">{c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}</p></div>
                                        <div className="w-8 h-8 rounded-full bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-600 transition"><Plus className="w-4 h-4 text-purple-400 group-hover:text-white"/></div>
                                    </div>
                                    {c.minPurchase > 0 && <p className="text-[10px] text-slate-500 mt-2">Mínimo: ${c.minPurchase}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && view === 'store') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4"/>
                <p className="tracking-widest font-bold text-sm animate-pulse">CARGANDO SISTEMA...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid">
            <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse-slow"></div><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse-slow"></div></div>
            <div className="fixed top-24 right-4 z-[9999] space-y-2">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            
            <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} />
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- NAVBAR --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-20 glass z-50 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setIsMenuOpen(true)} className="p-2 text-slate-400 hover:text-white transition hover:scale-110"><Menu className="w-7 h-7"/></button>
                        <div className="flex items-center gap-2 cursor-pointer neon-box px-3 py-1 rounded-lg" onClick={()=>setView('store')}><span className="text-2xl font-black text-white tracking-tighter neon-text">SUSTORE</span></div>
                    </div>
                    <div className="hidden md:flex items-center bg-slate-900/50 border border-slate-700 rounded-full px-4 py-2.5 w-96 focus-within:border-cyan-500 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition">
                        <Search className="w-4 h-4 text-slate-400 mr-2"/>
                        <input className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500" placeholder="Buscar productos..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={goWsp} className="hidden md:block p-2 text-green-400 hover:text-green-300 transition hover:scale-110"><MessageCircle className="w-6 h-6"/></button>
                        <button onClick={goIg} className="hidden md:block p-2 text-pink-400 hover:text-pink-300 transition hover:scale-110"><Instagram className="w-6 h-6"/></button>
                        <button onClick={()=>setView('cart')} className="relative p-2 text-slate-400 hover:text-white transition">
                            <ShoppingBag className="w-6 h-6"/>
                            {cart.length > 0 && <span className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)]">{cart.length}</span>}
                        </button>
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="p-2 text-slate-400 hover:text-cyan-400 transition" title="Mi Perfil"><User className="w-6 h-6"/></button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-cyan-600 transition">Ingresar</button>
                        )}
                    </div>
                </nav>
            )}
            {view !== 'admin' && <div className="h-24"></div>}

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4'}`}>
                
                {/* VISTA TIENDA */}
                {view === 'store' && (
                    <div className="max-w-7xl mx-auto animate-fade-up">
                        <div className="relative w-full h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group neon-box">
                                <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"/>
                                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent flex flex-col justify-center px-12">
                                    <div className="max-w-2xl animate-fade-up">
                                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block shadow-[0_0_15px_rgba(6,182,212,0.2)]">Tecnología Premium</span>
                                        <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight neon-text">FUTURO <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">AHORA</span></h1>
                                        <div className="flex gap-4">
                                            <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="neon-button px-8 py-4 text-white font-bold rounded-xl flex gap-2 items-center">Ver Catálogo <ArrowRight className="w-4 h-4"/></button>
                                            <button onClick={() => setView('guide')} className="px-8 py-4 bg-slate-800/80 text-white border border-slate-600 font-bold rounded-xl hover:bg-slate-700 transition backdrop-blur-md">Cómo Comprar</button>
                                        </div>
                                    </div>
                                </div>
                        </div>

                        <div id="catalog" className="mb-8 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===''?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>Todos</button>
                            {settings.categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===c?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>)}
                        </div>

                        {products.length === 0 && !isLoading ? (
                            <div className="text-center py-20 animate-fade-up">
                                <Package className="w-20 h-20 text-slate-700 mx-auto mb-4"/>
                                <h3 className="text-2xl font-bold text-slate-500">Catálogo Vacío</h3>
                                <p className="text-slate-600">No hay productos disponibles en este momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                    <div key={p.id} className="neon-box rounded-2xl overflow-hidden group relative bg-[#0a0a0a]">
                                        <div className="h-64 bg-slate-950 p-6 flex items-center justify-center relative overflow-hidden">
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110"/>
                                            {p.discount > 0 && <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-20">-{p.discount}%</span>}
                                            <button onClick={()=>manageCart(p, 1)} className="absolute bottom-4 right-4 bg-cyan-500 text-white p-3 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-110 transition opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 z-20"><Plus className="w-5 h-5"/></button>
                                        </div>
                                        <div className="p-6 border-t border-slate-800">
                                            <p className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">{p.category}</p>
                                            <h3 className="text-white font-bold text-lg truncate mb-2 group-hover:text-cyan-300 transition">{p.name}</h3>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-white">${calculatePrice(p.basePrice, p.discount).toLocaleString()}</span>
                                                {p.discount > 0 && <span className="text-sm text-slate-500 line-through">${p.basePrice}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA CARRITO - IMPLEMENTADA Y CORREGIDA */}
                {view === 'cart' && (
                    <div className="max-w-5xl mx-auto animate-fade-up">
                         <h1 className="text-4xl font-black text-white mb-8 neon-text flex items-center gap-3">
                            <ShoppingBag className="w-10 h-10 text-cyan-400"/> Mi Carrito
                        </h1>
                        
                        {cart.length === 0 ? (
                            <EmptyState 
                                icon={ShoppingCart} 
                                title="Tu carrito está vacío" 
                                text="Parece que aún no has agregado productos. Explora nuestro catálogo y encuentra lo mejor en tecnología."
                                action={() => setView('store')}
                                actionText="Ir a la Tienda"
                            />
                        ) : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="glass p-4 rounded-2xl flex gap-4 items-center group relative overflow-hidden">
                                            <div className="w-24 h-24 bg-slate-900 rounded-xl flex items-center justify-center p-2 flex-shrink-0">
                                                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain"/>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white text-lg truncate mb-1">{item.product.name}</h3>
                                                <p className="text-cyan-400 font-bold text-sm mb-2">${calculatePrice(item.product.basePrice, item.product.discount).toLocaleString()}</p>
                                                <div className="flex items-center gap-3 bg-slate-900/50 w-fit rounded-lg p-1 border border-slate-700">
                                                    <button onClick={() => manageCart(item.product, -1)} className="p-1 hover:text-white text-slate-400 transition hover:bg-slate-800 rounded"><Minus className="w-4 h-4"/></button>
                                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                                    <button onClick={() => manageCart(item.product, 1)} className="p-1 hover:text-white text-slate-400 transition hover:bg-slate-800 rounded"><Plus className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end justify-between h-24 py-2">
                                                <button onClick={() => manageCart(item.product, -item.quantity)} className="text-slate-600 hover:text-red-500 transition p-2"><Trash2 className="w-5 h-5"/></button>
                                                <p className="font-black text-xl text-white neon-text">${(calculatePrice(item.product.basePrice, item.product.discount) * item.quantity).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="glass h-fit p-8 rounded-[2rem] border border-slate-700 sticky top-24">
                                    <h3 className="text-2xl font-bold text-white mb-6">Resumen</h3>
                                    <div className="space-y-4 border-b border-slate-700 pb-6 mb-6">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Subtotal</span>
                                            <span className="font-mono font-bold text-white">${cartTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 text-sm">
                                            <span>Envío</span>
                                            <span className="text-cyan-400 font-bold">A calcular</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mb-8">
                                        <span className="text-white font-bold text-lg">Total Estimado</span>
                                        <span className="text-4xl font-black text-white neon-text">${cartTotal.toLocaleString()}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setView('checkout')}
                                        className="w-full neon-button py-4 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg mb-4"
                                    >
                                        Iniciar Pago <ArrowRight className="w-5 h-5"/>
                                    </button>
                                    
                                    <button onClick={() => setView('store')} className="w-full py-3 text-slate-400 hover:text-white font-bold text-sm transition">
                                        Seguir Comprando
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* VISTA PERFIL - NUEVA Y MEJORADA */}
                {view === 'profile' && currentUser && (
                    <div className="max-w-5xl mx-auto pt-4 animate-fade-up">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">{currentUser.name.charAt(0)}</div>
                            <div><h2 className="text-4xl font-black text-white neon-text">{currentUser.name}</h2><p className="text-slate-400">{currentUser.email}</p></div>
                            <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="ml-auto px-6 py-2 border border-red-900/50 text-red-400 rounded-xl hover:bg-red-900/20 transition flex items-center gap-2"><LogOut className="w-4 h-4"/> Salir</button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="text-cyan-400"/> Mis Pedidos</h3>
                                {orders.filter(o => o.userId === currentUser.id).length === 0 ? <EmptyState icon={ShoppingBag} title="Sin compras" text="Aún no has realizado pedidos."/> : (
                                    <div className="space-y-4">
                                        {orders.filter(o => o.userId === currentUser.id).map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="glass p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition group">
                                                <div><p className="font-bold text-white group-hover:text-cyan-400 transition">Pedido #{o.orderId}</p><p className="text-xs text-slate-500">{new Date(o.date).toLocaleDateString()}</p></div>
                                                <div className="text-right"><p className="font-black text-white">${o.total.toLocaleString()}</p><span className={`text-[10px] px-2 py-0.5 rounded-full ${o.status==='Realizado'?'bg-green-900 text-green-400':'bg-yellow-900 text-yellow-400'}`}>{o.status}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Ticket className="text-purple-400"/> Mis Cupones</h3>
                                    <div className="space-y-3">
                                        {coupons.filter(c => !c.targetUser || c.targetUser === currentUser.email).map(c => (
                                            <div key={c.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                                                <div>
                                                    <p className="font-black text-white tracking-widest">{c.code}</p>
                                                    <p className="text-xs text-purple-400 font-bold">{c.type==='fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}</p>
                                                </div>
                                                {c.minPurchase > 0 && <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Min: ${c.minPurchase}</span>}
                                            </div>
                                        ))}
                                        {coupons.filter(c => !c.targetUser || c.targetUser === currentUser.email).length === 0 && <p className="text-slate-500 text-sm">No tienes cupones activos.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA CHECKOUT CON SELECTOR DE CUPONES */}
                {view === 'checkout' && (
                    <div className="max-w-5xl mx-auto pt-4 pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Volver</button>
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-8">Envío y Pago</h2>
                                <div className="space-y-6">
                                    <input className="w-full input-cyber p-5 text-lg" placeholder="Dirección Completa" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                                    <div className="grid grid-cols-2 gap-6"><input className="w-full input-cyber p-5" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/><input className="w-full input-cyber p-5" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/></div>
                                    <input className="w-full input-cyber p-5" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                                    <h3 className="font-bold text-white mt-8 mb-4 text-xl">Método de Pago</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Transferencia', 'Efectivo'].map(m => (
                                            <button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                                {m==='Transferencia' ? <RefreshCw className="w-8 h-8"/> : <DollarSign className="w-8 h-8"/>}<span className="text-sm font-bold tracking-wider uppercase">{m}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="glass p-10 rounded-[2rem] h-fit border border-slate-700">
                                <h3 className="font-black text-white mb-8 text-2xl">Resumen</h3>
                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 mb-8">
                                    <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">Descuentos</label>
                                    {appliedCoupon ? (
                                        <div className="flex justify-between items-center bg-green-900/20 p-3 rounded-xl border border-green-900/50">
                                            <div><p className="font-black text-green-400">{appliedCoupon.code}</p><p className="text-xs text-green-300">{appliedCoupon.type==='fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}</p></div>
                                            <button onClick={()=>{setAppliedCoupon(null)}} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-red-400"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <button onClick={()=>setShowCouponModal(true)} className="w-full py-3 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-cyan-500 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold"><Ticket className="w-4 h-4"/> Ver mis cupones disponibles</button>
                                    )}
                                </div>
                                <div className="space-y-4 mb-8 pb-8 border-b border-slate-700">
                                    <div className="flex justify-between text-slate-400 font-medium"><span>Subtotal</span><span>${cartTotal.toLocaleString()}</span></div>
                                    {appliedCoupon && <div className="flex justify-between text-green-400 font-bold"><span>Descuento</span><span>-${discountAmt.toLocaleString()}</span></div>}
                                </div>
                                <div className="flex justify-between items-end mb-10"><span className="text-slate-300 font-bold text-lg">Total Final</span><span className="text-5xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span></div>
                                <button onClick={confirmOrder} className="w-full neon-button py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3">Confirmar Compra <CheckCircle className="w-6 h-6"/></button>
                            </div>
                        </div>
                    </div>
                )}
                
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full">
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:w-80`}>
                            <div className="p-8 flex justify-between items-center"><h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-400"/> ADMIN<span className="text-cyan-500">PANEL</span></h2><button onClick={()=>setIsAdminMenuOpen(false)} className="md:hidden text-slate-400"><X className="w-6 h-6"/></button></div>
                            <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Operaciones</p>
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='dashboard'?'active bg-slate-900':''}`}><LayoutDashboard className="w-5 h-5"/>Dashboard</button>
                                <button onClick={()=>setAdminTab('orders')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='orders'?'active bg-slate-900':''}`}><ShoppingBag className="w-5 h-5"/>Pedidos</button>
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='products'?'active bg-slate-900':''}`}><Package className="w-5 h-5"/>Inventario</button>
                                {isAdmin(currentUser?.email) && (
                                    <>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Finanzas & Marketing</p>
                                        <button onClick={()=>setAdminTab('balance')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='balance'?'active bg-slate-900':''}`}><Wallet className="w-5 h-5"/>Finanzas</button>
                                        <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='coupons'?'active bg-slate-900':''}`}><Ticket className="w-5 h-5"/>Cupones</button>
                                        <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='suppliers'?'active bg-slate-900':''}`}><Truck className="w-5 h-5"/>Proveedores</button>
                                        <button onClick={()=>setAdminTab('budget')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='budget'?'active bg-slate-900':''}`}><FileText className="w-5 h-5"/>Presupuestos</button>
                                        <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='settings'?'active bg-slate-900':''}`}><Settings className="w-5 h-5"/>Configuración</button>
                                    </>
                                )}
                            </nav>
                            <div className="p-6 border-t border-slate-800"><button onClick={()=>setView('store')} className="w-full py-4 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition font-bold text-sm flex items-center justify-center gap-2 group"><LogOut className="w-4 h-4 group-hover:-translate-x-1 transition"/> Salir del Panel</button></div>
                        </div>

                        {/* ADMIN CONTENT */}
                        <div className="flex-1 bg-[#050505] p-6 md:p-10 overflow-y-auto relative w-full">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800"><Menu className="w-6 h-6"/></button>
                            
                            {adminTab === 'dashboard' && (
                                <div className="max-w-7xl mx-auto animate-fade-up space-y-8">
                                    <h1 className="text-4xl font-black text-white mb-8 neon-text">Dashboard General</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className={`glass p-6 rounded-[2rem] relative overflow-hidden group border-t-4 ${financialData.netBalance >= 0 ? 'border-green-500' : 'border-red-500'}`}><div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24"/></div><p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Ingresos</p><p className="text-4xl font-black text-white">${orders.reduce((a,o)=>a+(o.total||0),0).toLocaleString()}</p></div>
                                        <div className="glass p-6 rounded-[2rem] relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingBag className="w-24 h-24"/></div><p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Pedidos</p><p className="text-4xl font-black text-white">{orders.length}</p></div>
                                        <div className="glass p-6 rounded-[2rem] relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-24 h-24"/></div><p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Stock Bajo</p><p className="text-4xl font-black text-white">{products.filter(p=>p.stock<5).length}</p></div>
                                        <div className="glass p-6 rounded-[2rem] relative overflow-hidden group"><div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24"/></div><p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Clientes</p><p className="text-4xl font-black text-white">{users.length}</p></div>
                                    </div>
                                    <div className="glass p-8 rounded-[2rem] border border-slate-800">
                                        <div className="flex justify-between items-end mb-4"><h3 className="font-bold text-white text-xl flex items-center gap-2"><RefreshCw className="w-5 h-5 text-cyan-400"/> Recuperación de Inversión</h3><span className={`text-xl font-black ${financialData.recoveryProgress >= 100 ? 'text-green-400' : 'text-yellow-400'}`}>{financialData.recoveryProgress.toFixed(1)}%</span></div>
                                        <div className="w-full bg-slate-900 rounded-full h-6 overflow-hidden border border-slate-700 relative"><div className="bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 h-full transition-all duration-1000 ease-out relative" style={{width: `${financialData.recoveryProgress}%`}}><div className="absolute inset-0 bg-white/20 animate-pulse"></div></div></div>
                                        <p className="text-xs text-slate-500 mt-3 text-center">{financialData.netBalance < 0 ? `Faltan $${Math.abs(financialData.netBalance).toLocaleString()} para recuperar la inversión inicial.` : "¡Felicidades! Tu negocio ya es rentable."}</p>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'products' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <div className="flex justify-between items-center mb-8">
                                        <h1 className="text-3xl font-black text-white neon-text">Inventario</h1>
                                        <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="neon-button px-6 py-3 rounded-xl font-bold text-white flex gap-2 items-center"><Plus className="w-5 h-5"/> Agregar</button>
                                    </div>
                                    {showProductForm && (
                                        <div className="glass p-8 rounded-[2rem] mb-8 border border-cyan-500/30">
                                            <h3 className="text-xl font-bold text-white mb-6">Detalles del Producto</h3>
                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <div className="space-y-4">
                                                    <input className="w-full input-cyber p-4" placeholder="Nombre" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                                    <div className="flex gap-4"><input className="w-full input-cyber p-4" type="number" placeholder="Precio" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/><input className="w-full input-cyber p-4" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/></div>
                                                    <select className="w-full input-cyber p-4" value={newProduct.category||''} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}><option value="">Categoría...</option>{settings.categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800"><input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="text-xs text-slate-400"/></div>
                                                    <input className="w-full input-cyber p-4" type="number" placeholder="% Descuento" value={newProduct.discount||0} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/>
                                                    <textarea className="w-full input-cyber p-4 h-20 resize-none" placeholder="Descripción" value={newProduct.description||''} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4"><button onClick={()=>setShowProductForm(false)} className="px-6 py-3 text-slate-400 hover:text-white font-bold">Cancelar</button><button onClick={saveProductFn} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold hover:bg-cyan-500 transition">Guardar</button></div>
                                        </div>
                                    )}
                                    <div className="grid gap-4">
                                        {products.map(p=>(
                                            <div key={p.id} className="glass p-4 rounded-xl flex items-center justify-between hover:bg-slate-900/40 transition group">
                                                <div className="flex items-center gap-6"><img src={p.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1"/><div><p className="font-bold text-white text-lg">{p.name}</p><p className="text-xs text-slate-500">Stock: {p.stock} | {p.category}</p></div></div>
                                                <div className="flex items-center gap-8"><p className="font-mono text-xl font-bold text-white">${p.basePrice}</p><div className="flex gap-2"><button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-2 bg-slate-800 rounded-lg text-cyan-400 hover:bg-cyan-900/30"><Edit className="w-4 h-4"/></button><button onClick={()=>deleteProductFn(p)} className="p-2 bg-slate-800 rounded-lg text-red-400 hover:bg-red-900/30"><Trash2 className="w-4 h-4"/></button></div></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'coupons' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Gestión de Cupones</h1>
                                    <div className="glass p-8 rounded-[2rem] mb-10 border border-purple-500/30">
                                        <h3 className="font-bold text-white mb-6 text-xl">Crear Nuevo Beneficio</h3>
                                        <div className="grid md:grid-cols-2 gap-8 mb-6">
                                            <div className="space-y-4">
                                                <input className="w-full input-cyber p-4 uppercase font-black text-purple-400 tracking-widest text-lg" placeholder="CÓDIGO (EJ: SUPER10)" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code:e.target.value})}/>
                                                <div className="flex gap-4"><select className="input-cyber p-4 flex-1" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon, type:e.target.value})}><option value="percentage">Porcentaje (%)</option><option value="fixed">Monto Fijo ($)</option></select><input className="input-cyber p-4 flex-1" type="number" placeholder="Valor" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon, value:e.target.value})}/></div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex gap-4"><input className="input-cyber p-4 flex-1" type="number" placeholder="Compra Mínima ($)" value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon, minPurchase:e.target.value})}/><input className="input-cyber p-4 flex-1" type="number" placeholder="Límite Usos" value={newCoupon.usageLimit} onChange={e=>setNewCoupon({...newCoupon, usageLimit:e.target.value})}/></div>
                                                <div className="flex gap-4 items-center"><select className="input-cyber p-4 flex-1" value={newCoupon.targetType} onChange={e=>setNewCoupon({...newCoupon, targetType:e.target.value})}><option value="global">Para Todos</option><option value="individual">Usuario Específico</option></select>{newCoupon.targetType === 'individual' && <input className="flex-1 input-cyber p-4" placeholder="Email del usuario" value={newCoupon.targetUser} onChange={e=>setNewCoupon({...newCoupon, targetUser:e.target.value})}/>}</div>
                                            </div>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/30 transition text-lg flex justify-center gap-2 items-center"><Save className="w-5 h-5"/> Generar Cupón</button>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {coupons.map(c => (
                                            <div key={c.id} className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition">
                                                <div className="flex justify-between items-start mb-4"><span className="font-black text-2xl text-white tracking-widest">{c.code}</span><span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded border border-purple-500/30 uppercase font-bold">{c.type === 'percentage' ? '%' : '$'}</span></div>
                                                <p className="text-4xl font-black text-purple-400 mb-2">{c.type === 'fixed' ? `$${c.value}` : `${c.value}%`} <span className="text-sm text-slate-500 font-normal">OFF</span></p>
                                                {c.minPurchase > 0 && <p className="text-xs text-slate-400 mb-4 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Mínimo: ${c.minPurchase}</p>}
                                                <div className="border-t border-slate-700 pt-4 flex justify-between items-center"><span className="text-xs text-slate-500">{c.usedBy?.length || 0} / {c.usageLimit || '∞'} usos</span><button onClick={()=>deleteCouponFn(c.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-5 h-5"/></button></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'orders' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="glass p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition hover:bg-slate-900/50">
                                                <div className="flex items-center gap-6"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${o.status==='Realizado'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}><Package className="w-6 h-6"/></div><div><p className="font-bold text-white text-lg">{o.customer.name}</p><p className="text-sm text-slate-500 font-mono mt-1">{o.orderId}</p></div></div>
                                                <div className="text-right"><p className="font-black text-white text-xl">${o.total.toLocaleString()}</p><span className={`text-xs px-3 py-1 rounded-full mt-2 inline-block font-bold ${o.status==='Realizado'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{o.status}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}

                            {adminTab === 'suppliers' && (
                                <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
                                    <div className="flex justify-between items-center"><h1 className="text-3xl font-black text-white">Proveedores</h1><button onClick={()=>setShowSupplierModal(true)} className="neon-button text-white px-8 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus className="w-5 h-5"/> Nuevo Proveedor</button></div>
                                    {suppliers.length === 0 ? <EmptyState icon={Truck} title="Sin Proveedores" text="Gestiona tus proveedores y deudas aquí." action={()=>setShowSupplierModal(true)} actionText="Agregar Primero"/> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{suppliers.map(s=><div key={s.id} className="glass border border-slate-800 p-8 rounded-[2rem] hover:transform hover:-translate-y-1 transition duration-300"><h3 className="text-2xl font-bold text-white mb-1">{s.name}</h3><p className="text-slate-400 text-sm mb-6 flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p><div className="flex justify-between text-sm border-t border-slate-800 pt-6"><span className="text-red-400 font-black text-lg">Deuda: ${s.debt}</span></div></div>)}</div>}
                                </div>
                            )}

                            {adminTab === 'balance' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <div className="flex flex-col md:flex-row justify-between mb-8 gap-4"><h1 className="text-3xl font-black text-white neon-text">Finanzas</h1><div className="flex gap-4"><button onClick={()=>setShowPosModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-green-500 transition justify-center flex-1 md:flex-none"><Plus className="w-5 h-5"/> POS Venta</button><button onClick={()=>setExpenseModalMode('selection')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-red-500 transition justify-center flex-1 md:flex-none"><Minus className="w-5 h-5"/> Nuevo Gasto</button></div></div>
                                    <div className="glass border border-slate-800 rounded-[2rem] overflow-hidden">
                                        <div className="p-6 border-b border-slate-800"><h3 className="font-bold text-white text-lg">Historial de Movimientos</h3></div>
                                        {expenses.map(e=><div key={e.id} className="p-5 border-b border-slate-800 flex justify-between items-center hover:bg-slate-900/50 transition"><div><p className="font-bold text-white">{e.description}</p><p className="text-xs text-slate-500 mt-1 flex items-center gap-2">{e.date} {e.details && <span className="bg-slate-800 px-2 rounded-full text-[10px] text-slate-400 max-w-[200px] truncate block">{e.details}</span>}</p></div><span className="text-red-400 font-bold font-mono text-lg">-${e.amount.toLocaleString()}</span></div>)}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'budget' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8">Presupuestos</h1>
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 glass p-8 rounded-[2rem]">
                                            <h3 className="font-bold text-white mb-6 text-xl">Nueva Cotización</h3>
                                            <div className="flex gap-4 mb-6"><input className="flex-1 input-cyber p-4" placeholder="Cliente" value={quoteClient.name} onChange={e=>setQuoteClient({...quoteClient, name:e.target.value})}/><input className="flex-1 input-cyber p-4" placeholder="Teléfono" value={quoteClient.phone} onChange={e=>setQuoteClient({...quoteClient, phone:e.target.value})}/></div>
                                            <div className="mb-6"><input className="w-full input-cyber p-4 mb-3" placeholder="Buscar producto..." value={posSearch} onChange={e=>setPosSearch(e.target.value)}/><div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).slice(0,5).map(p=><button key={p.id} onClick={()=>addToQuote(p)} className="flex-shrink-0 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-xs text-white hover:bg-slate-800 transition font-bold">{p.name} ${p.basePrice}</button>)}</div></div>
                                            <div className="space-y-2 mb-6 bg-slate-900/50 p-4 rounded-2xl min-h-[120px] border border-slate-800/50">{quoteCart.map(i=><div key={i.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800"><span className="text-white font-bold text-sm">{i.name} <span className="text-slate-500 ml-2">x{i.qty}</span></span><span className="font-black text-cyan-400">${i.basePrice*i.qty}</span></div>)}</div>
                                            <div className="flex justify-end gap-6 items-center pt-6 border-t border-slate-700"><span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Descuento %</span><input className="w-20 input-cyber p-3 text-center font-bold" type="number" value={quoteDiscount} onChange={e=>setQuoteDiscount(Number(e.target.value))}/><button onClick={saveQuote} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition">Guardar</button></div>
                                        </div>
                                        <div className="glass p-6 rounded-[2rem] h-[600px] flex flex-col">
                                            <h3 className="font-bold text-white mb-6 text-xl">Historial</h3>
                                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">{quotes.map(q=><div key={q.id} className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition group"><div className="flex justify-between mb-2"><span className="font-bold text-white">{q.clientName}</span><span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${q.status==='Convertido'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{q.status}</span></div><div className="flex justify-between items-center"><span className="font-mono text-slate-300 font-bold">${q.total}</span><div className="flex gap-2">{q.status!=='Convertido'&&<button onClick={()=>convertQuote(q)} className="text-xs bg-green-600 px-3 py-1.5 rounded-lg text-white font-bold shadow-lg hover:bg-green-500 transition opacity-0 group-hover:opacity-100">VENDER</button>}<button onClick={()=>deleteQuoteFn(q.id)} className="text-slate-600 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button></div></div></div>)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {adminTab === 'settings' && (
                                <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
                                    <h1 className="text-3xl font-black text-white neon-text">Configuración Global</h1>
                                    <div className="glass p-10 rounded-[2rem] border border-slate-800">
                                        <label className="text-slate-400 font-bold mb-4 block uppercase tracking-wider text-xs">Categorías de Productos</label>
                                        <div className="flex gap-4 mb-6"><input className="flex-1 input-cyber p-4" placeholder="Nueva categoría..." value={newCategory} onChange={e=>setNewCategory(e.target.value)}/><button onClick={()=>{if(newCategory){setTempSettings({...tempSettings, categories:[...tempSettings.categories, newCategory]}); setNewCategory('');}}} className="bg-blue-600 px-8 rounded-xl text-white font-bold hover:bg-blue-500 transition">Añadir</button></div>
                                        <div className="flex flex-wrap gap-3 mb-8">{tempSettings.categories.map(c=><span key={c} className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300 flex items-center gap-3 font-bold">{c} <button onClick={()=>setTempSettings({...tempSettings, categories: tempSettings.categories.filter(x=>x!==c)})} className="hover:text-red-400 transition"><X className="w-4 h-4"/></button></span>)}</div>
                                        <label className="text-slate-400 font-bold mb-4 block uppercase tracking-wider text-xs">Texto "Sobre Nosotros"</label>
                                        <textarea className="w-full h-32 input-cyber p-4 resize-none mb-6" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
                                        <button onClick={saveSettingsFn} className="w-full bg-cyan-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-cyan-500 transition">Guardar Todos los Cambios</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- MODALES DE ADMIN EXTRA --- */}
                        {showSupplierModal && (<div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up"><div className="glass p-10 rounded-[2.5rem] w-full max-w-md border border-slate-700 shadow-2xl"><h3 className="text-2xl font-black text-white mb-8 neon-text">Nuevo Proveedor</h3><div className="space-y-5"><input className="w-full input-cyber p-4" placeholder="Nombre Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name:e.target.value})}/><input className="w-full input-cyber p-4" placeholder="Nombre Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier, contact:e.target.value})}/><input className="w-full input-cyber p-4" type="number" placeholder="Deuda Inicial ($)" value={newSupplier.debt} onChange={e=>setNewSupplier({...newSupplier, debt:Number(e.target.value)})}/></div><div className="flex gap-4 mt-8"><button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition">Cancelar</button><button onClick={saveSupplierFn} className="flex-1 py-4 neon-button rounded-xl font-bold text-white shadow-lg">Guardar</button></div></div></div>)}
                        
                        {expenseModalMode !== 'closed' && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-up">
                                {expenseModalMode === 'selection' && (
                                    <div className="glass p-10 rounded-[2.5rem] w-full max-w-2xl border border-slate-700 shadow-2xl text-center">
                                        <h3 className="text-3xl font-black text-white mb-8 neon-text">Selecciona Tipo de Gasto</h3>
                                        <div className="grid md:grid-cols-2 gap-6"><button onClick={()=>setExpenseModalMode('purchase')} className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-900/20 transition group"><div className="w-20 h-20 bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-400 group-hover:scale-110 transition"><Package className="w-10 h-10"/></div><h4 className="text-xl font-bold text-white mb-2">Compra de Mercadería</h4></button><button onClick={()=>setExpenseModalMode('general')} className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-red-500 hover:bg-red-900/20 transition group"><div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-400 group-hover:scale-110 transition"><Wallet className="w-10 h-10"/></div><h4 className="text-xl font-bold text-white mb-2">Otros Gastos</h4></button></div>
                                        <button onClick={()=>setExpenseModalMode('closed')} className="mt-8 text-slate-500 hover:text-white font-bold transition">Cancelar</button>
                                    </div>
                                )}
                                {expenseModalMode === 'general' && (<div className="glass p-10 rounded-[2.5rem] w-full max-w-md border border-slate-700 shadow-2xl"><h3 className="text-2xl font-black text-white mb-8 text-red-400">Registrar Gasto</h3><div className="space-y-5"><input className="w-full input-cyber p-4" placeholder="Descripción" value={newExpense.description} onChange={e=>setNewExpense({...newExpense, description:e.target.value})}/><input className="w-full input-cyber p-4" type="number" placeholder="Monto ($)" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})}/></div><div className="flex gap-4 mt-8"><button onClick={()=>setExpenseModalMode('selection')} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition">Volver</button><button onClick={saveGeneralExpenseFn} className="flex-1 py-4 bg-red-600 rounded-xl font-bold text-white shadow-lg">Registrar</button></div></div>)}
                                {expenseModalMode === 'purchase' && (
                                    <div className="bg-[#0a0a0a] w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-[2.5rem] border border-cyan-500/20 shadow-2xl flex flex-col overflow-hidden animate-fade-up">
                                        <div className="p-6 border-b border-slate-800 bg-[#050505] flex justify-between items-center"><h3 className="text-2xl font-black text-white flex items-center gap-3"><Package className="text-cyan-400"/> Compra de Stock</h3><button onClick={()=>{setExpenseModalMode('closed'); setPurchaseCart([])}} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="w-6 h-6"/></button></div>
                                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto border-r border-slate-800">
                                                <div className="mb-8 relative"><div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-3"><Search className="text-slate-500 w-5 h-5 mr-2"/><input className="bg-transparent text-white outline-none w-full text-sm font-bold" placeholder="Buscar producto existente..." value={productSearchTerm} onChange={e=>setProductSearchTerm(e.target.value)}/></div>{productSearchTerm.length > 0 && (<div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl mt-2 z-50 max-h-60 overflow-y-auto shadow-2xl">{products.filter(p=>p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (<div key={p.id} onClick={()=>selectExistingProduct(p)} className="p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50"><img src={p.image} className="w-8 h-8 rounded object-cover"/><div><p className="text-white text-xs font-bold">{p.name}</p><p className="text-[10px] text-slate-500">Stock actual: {p.stock}</p></div></div>))}</div>)}</div>
                                                <div className="space-y-5"><input className="w-full input-cyber p-4" placeholder="Nombre del Producto" value={newPurchaseItem.name} onChange={e=>setNewPurchaseItem({...newPurchaseItem, name:e.target.value})}/><div className="grid grid-cols-2 gap-4"><input className="w-full input-cyber p-4 border-l-4 border-l-red-500" type="number" placeholder="Costo Unitario" value={newPurchaseItem.costPrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, costPrice:e.target.value})}/><input className="w-full input-cyber p-4 border-l-4 border-l-green-500" type="number" placeholder="Precio Venta" value={newPurchaseItem.salePrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, salePrice:e.target.value})}/></div><div className="grid grid-cols-2 gap-4"><input className="w-full input-cyber p-4" type="number" placeholder="Cantidad" value={newPurchaseItem.quantity} onChange={e=>setNewPurchaseItem({...newPurchaseItem, quantity:e.target.value})}/><select className="flex-1 input-cyber p-4" value={newPurchaseItem.category} onChange={e=>setNewPurchaseItem({...newPurchaseItem, category:e.target.value})}><option value="">Categoría...</option>{settings.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4"><input className="text-xs text-slate-400 w-full" type="file" ref={purchaseFileInputRef} onChange={handlePurchaseImage}/></div><button onClick={addPurchaseItemToCart} className="w-full py-4 bg-slate-800 hover:bg-cyan-900/30 border border-slate-700 hover:border-cyan-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"><Plus className="w-5 h-5"/> Agregar a la Lista</button></div>
                                            </div>
                                            <div className="w-full md:w-1/2 flex flex-col bg-slate-900/10">
                                                <div className="flex-1 p-6 md:p-8 overflow-y-auto"><h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Detalle de Compra</h4><div className="space-y-3">{purchaseCart.map(item => (<div key={item.id} className="flex gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 items-center relative group"><div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center"><img src={item.image} className="max-h-full max-w-full"/></div><div className="flex-1"><p className="text-white font-bold text-sm truncate">{item.name}</p><div className="flex gap-3 text-xs text-slate-500 mt-1"><span className="text-green-400 font-bold">Venta: ${item.salePrice}</span><span>Stock: +{item.quantity}</span></div></div><div className="text-right"><p className="text-red-400 font-bold text-sm">-${(item.costPrice * item.quantity).toLocaleString()}</p></div></div>))}</div></div>
                                                <div className="p-8 bg-[#050505] border-t border-slate-800"><div className="flex justify-between items-end mb-6"><span className="text-slate-400 font-bold text-sm uppercase">Total Gasto</span><span className="text-4xl font-black text-red-500">-${purchaseCart.reduce((a,i)=>a+(i.costPrice*i.quantity),0).toLocaleString()}</span></div><button onClick={confirmPurchaseFn} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition">Confirmar Compra</button></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {showPosModal && (<div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-[#0a0a0a] w-full max-w-6xl h-[90vh] rounded-[3rem] border border-green-500/20 flex flex-col overflow-hidden animate-fade-up shadow-[0_0_50px_rgba(0,0,0,0.8)]"><div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#050505]"><h2 className="text-3xl font-black text-white flex items-center gap-3"><Zap className="text-green-500 w-8 h-8"/> Punto de Venta</h2><button onClick={()=>setShowPosModal(false)} className="p-3 bg-slate-900 rounded-full hover:bg-slate-800 transition"><X className="text-slate-400 w-6 h-6"/></button></div><div className="flex-1 flex overflow-hidden"><div className="w-3/4 p-8 border-r border-slate-800 overflow-y-auto"><input className="w-full input-cyber p-6 mb-8 text-xl font-bold" placeholder="🔍 Escanear o buscar producto..." autoFocus value={posSearch} onChange={e=>setPosSearch(e.target.value)}/><div className="grid grid-cols-4 gap-4">{products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())&&p.stock>0).slice(0,24).map(p=>(<div key={p.id} onClick={()=>addToPos(p)} className="bg-slate-900 p-4 rounded-2xl cursor-pointer hover:bg-slate-800 hover:border-green-500 border-2 border-transparent transition text-center group"><div className="h-28 w-full bg-white rounded-xl mb-3 overflow-hidden flex items-center justify-center p-2"><img src={p.image} className="max-h-full max-w-full object-contain"/></div><p className="font-bold text-white text-sm truncate group-hover:text-green-400 transition">{p.name}</p><p className="text-green-500 font-black text-lg">${p.basePrice}</p></div>))}</div></div><div className="w-1/4 p-8 bg-[#050505] flex flex-col border-l border-slate-800"><div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">{posCart.map(i=><div key={i.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800"><div><p className="text-white text-sm font-bold truncate w-32">{i.name}</p><p className="text-xs text-slate-500 mt-1">${i.basePrice} x {i.qty}</p></div><div className="flex items-center gap-3"><span className="text-green-400 font-bold">${i.basePrice*i.qty}</span><button onClick={()=>setPosCart(posCart.filter(x=>x.id!==i.id))} className="text-red-500 hover:text-red-400"><X className="w-5 h-5"/></button></div></div>)}</div><div className="border-t border-slate-800 pt-6"><div className="flex justify-between text-slate-400 mb-2 font-bold uppercase tracking-wider text-xs">Total a Cobrar</div><div className="flex justify-between text-4xl font-black text-white mb-8 neon-text"><span>Total</span><span>${posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0).toLocaleString()}</span></div><button onClick={confirmPosSale} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-xl shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-3">COBRAR <DollarSign className="w-6 h-6"/></button></div></div></div></div></div>)}
                    </div>
                )}

                {/* --- MENU DESPLEGABLE MÓVIL --- */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[9999] flex justify-start">
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={()=>setIsMenuOpen(false)}></div>
                        <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-up flex flex-col shadow-2xl z-[10000]">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-3xl font-black text-white neon-text">MENÚ</h2>
                                <button onClick={()=>setIsMenuOpen(false)} className="p-2 bg-slate-900 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                            </div>
                            <div className="space-y-6 flex-1">
                                <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Home className="w-6 h-6"/> Inicio</button>
                                <button onClick={()=>{setView('store'); document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'}); setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Search className="w-6 h-6"/> Catálogo</button>
                                {currentUser && <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><User className="w-6 h-6"/> Mi Perfil</button>}
                                <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><ShoppingBag className="w-6 h-6"/> Carrito</button>
                                <button onClick={()=>{setView('guide');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><FileQuestion className="w-6 h-6"/> Cómo Comprar</button>
                                <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                                {currentUser && hasAccess(currentUser.email) && <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-cyan-400 mt-4 pt-4 border-t border-slate-800 flex items-center gap-4"><Shield className="w-6 h-6"/> Admin Panel</button>}
                                {currentUser ? ( <button onClick={()=>{localStorage.removeItem('nexus_user_id'); localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store'); setIsMenuOpen(false);}} className="w-full text-left text-xl font-bold text-red-400 mt-4 flex items-center gap-4"><LogOut className="w-6 h-6"/> Cerrar Sesión</button> ) : ( <button onClick={()=>{setView('login');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-cyan-400 mt-4 flex items-center gap-4"><LogIn className="w-6 h-6"/> Iniciar Sesión</button> )}
                            </div>
                            <div className="border-t border-slate-800 pt-6 flex gap-4 justify-center">
                                <button onClick={goWsp} className="p-3 bg-slate-900 rounded-full text-green-400 hover:bg-slate-800 transition"><MessageCircle className="w-6 h-6"/></button>
                                <button onClick={goIg} className="p-3 bg-slate-900 rounded-full text-pink-400 hover:bg-slate-800 transition"><Instagram className="w-6 h-6"/></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* VISTA LOGIN / REGISTER REESTRUCTURADA */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] p-4 animate-fade-up">
                        <button onClick={()=>setView('store')} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X className="w-8 h-8"/></button>
                        <div className="glass p-12 rounded-[2.5rem] w-full max-w-md shadow-2xl border-t border-cyan-500/20 relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
                            <h2 className="text-4xl font-black text-center text-white mb-10 tracking-tight">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-6">
                                {!loginMode && (
                                    <>
                                        <input className="w-full input-cyber p-4" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})} required/>
                                        <input className="w-full input-cyber p-4" placeholder="Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})} required/>
                                    </>
                                )}
                                <input className="w-full input-cyber p-4" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} required/>
                                <input className="w-full input-cyber p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} required/>
                                <button type="submit" className="w-full neon-button py-4 text-white rounded-xl font-bold text-lg shadow-lg mt-4 flex items-center justify-center gap-2">
                                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : (loginMode ? 'INGRESAR' : 'REGISTRARSE')}
                                </button>
                            </form>
                            <button onClick={()=>{setLoginMode(!loginMode); setAuthData({email:'',password:'',name:'',username:'',dni:'',phone:''})}} className="w-full text-center text-slate-400 text-sm mt-8 hover:text-cyan-400 transition font-bold">
                                {loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
                            </button>
                        </div>
                    </div>
                )}

                {view === 'about' && (<div className="max-w-4xl mx-auto pt-10 animate-fade-up px-4"><h2 className="text-4xl font-black text-white mb-12 flex items-center gap-4 neon-text"><Info className="w-10 h-10 text-cyan-400"/> Sobre Nosotros</h2><div className="glass p-12 rounded-[3rem] relative overflow-hidden"><div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div><p className="text-slate-200 text-xl leading-relaxed whitespace-pre-wrap font-light relative z-10">{settings.aboutUsText || "Cargando información..."}</p><div className="mt-12 pt-8 border-t border-slate-700 flex gap-6"><button onClick={goWsp} className="flex items-center gap-3 text-green-400 font-bold hover:text-green-300 transition text-lg"><MessageCircle className="w-6 h-6"/> Contactar por WhatsApp</button></div></div></div>)}
                {view === 'guide' && (<div className="max-w-5xl mx-auto pt-10 animate-fade-up px-4"><h2 className="text-4xl font-black text-white text-center mb-16 neon-text">Cómo Comprar</h2><div className="grid md:grid-cols-3 gap-8 relative">{[ { icon: Search, title: "1. Elige", text: "Explora y selecciona tus productos favoritos." }, { icon: CreditCard, title: "2. Confirma", text: "Completa el pedido en el carrito." }, { icon: MessageCircle, title: "3. Recibe", text: "Coordinamos entrega y pago por WhatsApp." } ].map((step, i) => (<div key={i} className="glass p-10 rounded-[2.5rem] text-center hover:bg-slate-800/50 transition duration-500 group border-t border-slate-700"><div className="w-24 h-24 mx-auto bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition shadow-[0_0_30px_rgba(6,182,212,0.15)]"><step.icon className="w-10 h-10 text-cyan-400"/></div><h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3><p className="text-slate-400 leading-relaxed text-lg">{step.text}</p></div>))}</div><div className="mt-20 text-center"><button onClick={() => setView('store')} className="neon-button px-12 py-4 text-white font-bold rounded-full shadow-xl transition text-xl">Ir a la Tienda</button></div></div>)}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
