import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN ---
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

// --- COMPONENTES UI ---
const Toast = ({ message, type, onClose }) => {
    const colors = { success: 'border-green-500 text-green-400 bg-green-950/30', error: 'border-red-500 text-red-400 bg-red-950/30', info: 'border-cyan-500 text-cyan-400 bg-cyan-950/30', warning: 'border-yellow-500 text-yellow-400 bg-yellow-950/30' };
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (<div className={`fixed top-24 right-4 z-[9999] flex items-center gap-3 p-4 rounded-xl border-l-4 shadow-2xl backdrop-blur-md animate-fade-up ${colors[type] || colors.info}`}><p className="font-bold text-sm tracking-wide">{message}</p></div>);
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText="Confirmar", cancelText="Cancelar" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
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

// --- APP MAIN ---
function App() {
    const [view, setView] = useState('store');
    const [adminTab, setAdminTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('nexus_user_data')); } catch(e) { return null; } });
    const [systemUser, setSystemUser] = useState(null);
    
    // Data State
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('nexus_cart')) || []; } catch(e) { return []; } });
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // UI State
    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    
    // Auth & Checkout
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
    const [loginMode, setLoginMode] = useState(true);
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', province: '', zipCode: '', paymentChoice: '' });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false); // New: Selector visual

    // Admin Forms
    const [newProduct, setNewProduct] = useState({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    
    // Cupones Mejorados
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', 
        type: 'percentage', // 'percentage' | 'fixed'
        value: 0, // replaces discountPercentage logic
        minPurchase: 0, // New field
        expirationDate: '', 
        targetType: 'global', 
        targetUser: '', 
        usageLimit: '' 
    });
    const [couponTab, setCouponTab] = useState('global');

    // Gastos, Proveedores, Equipo, POS
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', debt: 0 });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [expenseModalMode, setExpenseModalMode] = useState('closed'); 
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [purchaseCart, setPurchaseCart] = useState([]); 
    const [newPurchaseItem, setNewPurchaseItem] = useState({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null });
    const [productSearchTerm, setProductSearchTerm] = useState(''); 
    const [isAddingCategory, setIsAddingCategory] = useState(false); 
    const [quickCategoryName, setQuickCategoryName] = useState('');
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee' });
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

    // Refs & Utils
    const fileInputRef = useRef(null);
    const purchaseFileInputRef = useRef(null);
    const showToast = (msg, type = 'info') => { 
        const id = Date.now(); 
        setToasts(prev => { const filtered = prev.filter(t => Date.now() - t.id < 2000); return [...filtered, { id, message: msg, type }]; });
    };
    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
    const confirmAction = (title, message, action) => setModalConfig({ isOpen: true, title, message, onConfirm: () => { action(); setModalConfig({ ...modalConfig, isOpen: false }); } });
    
    // --- LÓGICA DE PRECIOS Y DESCUENTOS ---
    const calculatePrice = (p, d) => d > 0 ? Math.ceil(Number(p) * (1 - d / 100)) : Number(p);
    
    // Roles
    const getRole = (email) => {
        if (!email) return null;
        const clean = email.trim().toLowerCase();
        if (clean === settings.admins?.toLowerCase()) return 'admin'; // Legacy
        const team = settings.team || [];
        const member = team.find(m => m.email.toLowerCase() === clean);
        return member ? member.role : null;
    };
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => isAdmin(email) || getRole(email) === 'employee';

    // Effects
    useEffect(() => localStorage.setItem('nexus_cart', JSON.stringify(cart)), [cart]);
    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            setCheckoutData(prev => ({ ...prev, address: currentUser.address || '', city: currentUser.city || '', province: currentUser.province || '', zipCode: currentUser.zipCode || '' }));
        } else {
            localStorage.removeItem('nexus_user_data');
        }
    }, [currentUser]);

    useEffect(() => { const init = async () => { await signInAnonymously(auth); }; init(); return onAuthStateChanged(auth, setSystemUser); }, []);
    
    // Data Sync
    useEffect(() => {
        if(!systemUser) return;
        const subs = [
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => setProducts(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d=>({id:d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), s => setExpenses(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), s => setQuotes(s.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>new Date(b.date)-new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => {
                if(!s.empty) { const d = s.docs[0].data(); setSettings({...defaultSettings, ...d}); setTempSettings({...defaultSettings, ...d}); setAboutText(d.aboutUsText || defaultSettings.aboutUsText); }
                else addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings);
                setIsLoading(false);
            })
        ];
        return () => subs.forEach(unsub => unsub());
    }, [systemUser]);

    // Auth Actions
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

    // Cart Actions
    const manageCart = (prod, delta) => {
        const ex = cart.find(i => i.product.id === prod.id);
        const newQty = (ex ? ex.quantity : 0) + delta;
        if (newQty > Number(prod.stock)) return showToast("Stock insuficiente", "warning");
        if (newQty <= 0) setCart(cart.filter(i => i.product.id !== prod.id));
        else if (ex) setCart(cart.map(i => i.product.id === prod.id ? { ...i, quantity: newQty } : i));
        else { setCart([...cart, { product: prod, quantity: 1 }]); showToast("¡Agregado!", "success"); }
    };

    const cartTotal = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);
    
    // --- LÓGICA CUPONES (MEJORADA) ---
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

    const removeCoupon = () => { setAppliedCoupon(null); showToast("Cupón removido", "info"); };

    const confirmOrder = async () => {
        if(!currentUser) { setView('login'); return showToast("Inicia sesión", "info"); }
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Faltan datos de envío", "warning");
        if(appliedCoupon && cartTotal < (appliedCoupon.minPurchase || 0)) return showToast(`Compra mínima para el cupón: $${appliedCoupon.minPurchase}`, "error");

        setIsLoading(true);
        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;
            const newOrder = { 
                orderId, 
                userId: currentUser.id, 
                customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, dni: currentUser.dni }, 
                items: cart.map(i => ({ productId: i.product.id, title: i.product.name, quantity: i.quantity, unit_price: calculatePrice(i.product.basePrice, i.product.discount) })), 
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
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode });
            
            // Send Email
            fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newOrder, shipping: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province}`, discountDetails: appliedCoupon ? { percentage: appliedCoupon.type === 'percentage' ? appliedCoupon.value : 0, amount: discountAmt } : null }) }).catch(err => console.log("Email skipped in simulation"));
            
            // Stock Update
            for(const i of cart) { const r = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.product.id); const s = await getDoc(r); if(s.exists()) await updateDoc(r, { stock: Math.max(0, s.data().stock - i.quantity) }); }
            
            // Coupon Usage
            if(appliedCoupon) { const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id); const cSnap = await getDoc(cRef); if(cSnap.exists()) await updateDoc(cRef, { usedBy: [...(cSnap.data().usedBy || []), currentUser.id] }); }
            
            setCart([]); setView('profile'); setAppliedCoupon(null); showToast("¡Pedido Realizado!", "success");
        } catch(e) { console.error(e); showToast("Error al procesar", "error"); }
        setIsLoading(false);
    };

    // --- ADMIN ACTIONS ---
    const saveProductFn = async () => {
        if(!newProduct.name) return showToast("Faltan datos", "warning");
        const d = {...newProduct, basePrice: Number(newProduct.basePrice), stock: Number(newProduct.stock), discount: Number(newProduct.discount), image: newProduct.image || 'https://via.placeholder.com/150'};
        if(editingId) await updateDoc(doc(db,'artifacts',appId,'public','data','products',editingId), d);
        else await addDoc(collection(db,'artifacts',appId,'public','data','products'), d);
        setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0}); setEditingId(null); setShowProductForm(false); showToast("Guardado", "success");
    };
    const deleteProductFn = (p) => confirmAction("Eliminar", `¿Borrar ${p.name}?`, async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','products',p.id)); showToast("Borrado", "success"); });
    
    // SAVE COUPON UPGRADED
    const saveCouponFn = async () => {
        if(!newCoupon.code) return showToast("Falta código", "warning");
        if(newCoupon.targetType === 'individual' && !newCoupon.targetUser) return showToast("Ingresa el email del usuario", "warning");
        
        await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), {
            ...newCoupon, 
            code: newCoupon.code.toUpperCase(),
            value: Number(newCoupon.value), // Generic value (percent or money)
            minPurchase: Number(newCoupon.minPurchase),
            usageLimit: Number(newCoupon.usageLimit),
            targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
        });
        setNewCoupon({code:'', type: 'percentage', value: 0, minPurchase: 0, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
        showToast("Cupón creado", "success");
    };
    const deleteCouponFn = (id) => confirmAction("Eliminar", "¿Borrar cupón?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',id)); showToast("Eliminado", "success"); });

    // Other Admin Functions
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
    
    // Helpers
    const goWsp = () => window.open(settings.whatsappLink, '_blank');
    const goIg = () => window.open(`https://www.instagram.com/${settings.instagramUser}`, '_blank');
    const handleImage = (e, setter) => { const f=e.target.files[0]; if(f&&f.size<1000000){const r=new FileReader();r.onload=()=>setter(p=>({...p,image:r.result}));r.readAsDataURL(f);}else showToast("Imagen muy pesada (Max 1MB)", 'error'); };

    // --- COMPONENTES INTERNOS ---
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
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
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
                <div className="glass rounded-3xl w-full max-w-md overflow-hidden relative">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                    <div className="p-8">
                        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-2"><Ticket className="w-6 h-6 text-purple-400"/> Mis Cupones</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {availableCoupons.length === 0 ? <p className="text-slate-500 text-center py-8">No hay cupones disponibles.</p> : availableCoupons.map(c => (
                                <div key={c.id} onClick={() => selectCoupon(c)} className="bg-slate-900/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500 p-4 rounded-xl cursor-pointer transition group">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-black text-white tracking-widest text-lg group-hover:text-purple-400 transition">{c.code}</p>
                                            <p className="text-xs text-slate-400">{c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}</p>
                                        </div>
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
                    <div className="flex items-center gap-2 cursor-pointer neon-box px-3 py-1 rounded-lg" onClick={()=>setView('store')}>
                        <span className="text-2xl font-black text-white tracking-tighter neon-text">SUSTORE</span>
                    </div>
                    <div className="hidden md:flex items-center bg-slate-900/50 border border-slate-700 rounded-full px-4 py-2.5 w-96 focus-within:border-cyan-500 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition">
                        <Search className="w-4 h-4 text-slate-400 mr-2"/>
                        <input className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500" placeholder="Buscar productos..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={()=>setView('cart')} className="relative p-2 text-slate-400 hover:text-white transition">
                            <ShoppingBag className="w-6 h-6"/>
                            {cart.length > 0 && <span className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)]">{cart.length}</span>}
                        </button>
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="p-2 text-slate-400 hover:text-cyan-400 transition"><User className="w-6 h-6"/></button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-cyan-600 transition">Ingresar</button>
                        )}
                        <button onClick={()=>setIsMenuOpen(true)} className="p-2 text-slate-400 hover:text-white md:hidden"><Menu className="w-6 h-6"/></button>
                    </div>
                </nav>
            )}
            {view !== 'admin' && <div className="h-24"></div>}

            {/* --- CONTENIDO --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4'}`}>
                
                {/* STORE */}
                {view === 'store' && (
                    <div className="max-w-7xl mx-auto animate-fade-up">
                         <div className="relative w-full h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group neon-box">
                                <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"/>
                                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent flex flex-col justify-center px-12">
                                    <div className="max-w-2xl animate-fade-up">
                                        <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block shadow-[0_0_15px_rgba(6,182,212,0.2)]">Tecnología Premium</span>
                                        <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight neon-text">FUTURO <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">AHORA</span></h1>
                                        <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="neon-button px-8 py-4 text-white font-bold rounded-xl flex gap-2 items-center">Ver Catálogo <ArrowRight className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            </div>

                        <div id="catalog" className="mb-8 flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===''?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>Todos</button>
                            {settings.categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===c?'bg-cyan-600 border-cyan-500 text-white':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>)}
                        </div>

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
                    </div>
                )}

                {/* PROFILE VIEW - NEW! */}
                {view === 'profile' && currentUser && (
                    <div className="max-w-5xl mx-auto pt-4 animate-fade-up">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">{currentUser.name.charAt(0)}</div>
                            <div>
                                <h2 className="text-4xl font-black text-white neon-text">{currentUser.name}</h2>
                                <p className="text-slate-400">{currentUser.email}</p>
                            </div>
                            <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="ml-auto px-6 py-2 border border-red-900/50 text-red-400 rounded-xl hover:bg-red-900/20 transition flex items-center gap-2"><LogOut className="w-4 h-4"/> Salir</button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* MIS PEDIDOS */}
                            <div className="md:col-span-2 space-y-6">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="text-cyan-400"/> Mis Pedidos</h3>
                                {orders.filter(o => o.userId === currentUser.id).length === 0 ? <EmptyState icon={ShoppingBag} title="Sin compras" text="Aún no has realizado pedidos."/> : (
                                    <div className="space-y-4">
                                        {orders.filter(o => o.userId === currentUser.id).map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="glass p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition group">
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-cyan-400 transition">Pedido #{o.orderId}</p>
                                                    <p className="text-xs text-slate-500">{new Date(o.date).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-white">${o.total.toLocaleString()}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.status==='Realizado'?'bg-green-900 text-green-400':'bg-yellow-900 text-yellow-400'}`}>{o.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* MIS CUPONES Y DATOS */}
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
                                <div className="glass p-6 rounded-2xl">
                                    <h3 className="font-bold text-white mb-4">Datos de Envío</h3>
                                    <p className="text-slate-400 text-sm">{currentUser.address || 'No definido'}</p>
                                    <p className="text-slate-400 text-sm">{currentUser.city}, {currentUser.province}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CHECKOUT MEJORADO */}
                {view === 'checkout' && (
                    <div className="max-w-5xl mx-auto pt-4 pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Volver</button>
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-8">Envío y Pago</h2>
                                <div className="space-y-6">
                                    <input className="w-full input-cyber p-5 text-lg" placeholder="Dirección Completa" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                                    <div className="grid grid-cols-2 gap-6">
                                        <input className="w-full input-cyber p-5" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/>
                                        <input className="w-full input-cyber p-5" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/>
                                    </div>
                                    <input className="w-full input-cyber p-5" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                                    
                                    <h3 className="font-bold text-white mt-8 mb-4 text-xl">Método de Pago</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Transferencia', 'Efectivo'].map(m => (
                                            <button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'border-slate-700 text-slate-500 hover:border-slate-500'}`}>
                                                {m==='Transferencia' ? <RefreshCw className="w-8 h-8"/> : <DollarSign className="w-8 h-8"/>}
                                                <span className="text-sm font-bold tracking-wider uppercase">{m}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="glass p-10 rounded-[2rem] h-fit border border-slate-700">
                                <h3 className="font-black text-white mb-8 text-2xl">Resumen</h3>
                                
                                {/* SELECTOR DE CUPONES */}
                                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 mb-8">
                                    <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">Descuentos</label>
                                    {appliedCoupon ? (
                                        <div className="flex justify-between items-center bg-green-900/20 p-3 rounded-xl border border-green-900/50">
                                            <div>
                                                <p className="font-black text-green-400">{appliedCoupon.code}</p>
                                                <p className="text-xs text-green-300">
                                                    {appliedCoupon.type==='fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}
                                                </p>
                                            </div>
                                            <button onClick={removeCoupon} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-red-400"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <button onClick={()=>setShowCouponModal(true)} className="w-full py-3 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-cyan-500 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold">
                                            <Ticket className="w-4 h-4"/> Ver mis cupones disponibles
                                        </button>
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

                {/* ADMIN PANEL 2.0 */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative w-full">
                        {/* Sidebar */}
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:w-80`}>
                            <div className="p-8 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-400"/> ADMIN<span className="text-cyan-500">PANEL</span></h2>
                                <button onClick={()=>setIsAdminMenuOpen(false)} className="md:hidden text-slate-400"><X className="w-6 h-6"/></button>
                            </div>
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
                                        <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='settings'?'active bg-slate-900':''}`}><Settings className="w-5 h-5"/>Configuración</button>
                                    </>
                                )}
                            </nav>
                            <div className="p-6 border-t border-slate-800"><button onClick={()=>setView('store')} className="w-full py-4 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition font-bold text-sm flex items-center justify-center gap-2 group"><LogOut className="w-4 h-4 group-hover:-translate-x-1 transition"/> Salir del Panel</button></div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 bg-[#050505] p-6 md:p-10 overflow-y-auto relative w-full">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800"><Menu className="w-6 h-6"/></button>

                            {/* DASHBOARD MEJORADO */}
                            {adminTab === 'dashboard' && (
                                <div className="max-w-7xl mx-auto animate-fade-up space-y-8">
                                    <h1 className="text-4xl font-black text-white mb-8 neon-text">Dashboard General</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24"/></div>
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Ingresos Totales</p>
                                            <p className="text-4xl font-black text-white group-hover:scale-105 transition duration-500">${orders.reduce((a,o)=>a+(o.total||0),0).toLocaleString()}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><ShoppingBag className="w-24 h-24"/></div>
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Pedidos Realizados</p>
                                            <p className="text-4xl font-black text-white group-hover:scale-105 transition duration-500">{orders.length}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24"/></div>
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Clientes Activos</p>
                                            <p className="text-4xl font-black text-white group-hover:scale-105 transition duration-500">{users.length}</p>
                                        </div>
                                        <div className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><AlertCircle className="w-24 h-24"/></div>
                                            <p className="text-slate-400 font-bold uppercase text-xs tracking-wider mb-2">Stock Bajo</p>
                                            <p className="text-4xl font-black text-white group-hover:scale-105 transition duration-500">{products.filter(p=>p.stock<5).length}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Recent Activity Section */}
                                    <div className="grid lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 glass p-8 rounded-[2rem]">
                                            <h3 className="font-bold text-white mb-6 text-xl flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-400"/> Pedidos Recientes</h3>
                                            <div className="space-y-4">
                                                {orders.slice(0, 5).map(o => (
                                                    <div key={o.id} className="flex justify-between items-center border-b border-slate-800 pb-3 last:border-0">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-2 h-2 rounded-full ${o.status==='Realizado'?'bg-green-500':'bg-yellow-500'}`}></div>
                                                            <div>
                                                                <p className="text-white font-bold">{o.customer.name}</p>
                                                                <p className="text-xs text-slate-500">hace {Math.floor((new Date() - new Date(o.date))/(1000*60))} min</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-mono text-cyan-400 font-bold">${o.total}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="glass p-8 rounded-[2rem]">
                                            <h3 className="font-bold text-white mb-6 text-xl">Accesos Rápidos</h3>
                                            <div className="grid gap-4">
                                                <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true);setAdminTab('products')}} className="p-4 bg-slate-800/50 rounded-xl flex items-center gap-3 text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-400 transition font-bold"><Plus className="w-5 h-5"/> Nuevo Producto</button>
                                                <button onClick={()=>setAdminTab('coupons')} className="p-4 bg-slate-800/50 rounded-xl flex items-center gap-3 text-slate-300 hover:bg-purple-900/20 hover:text-purple-400 transition font-bold"><Ticket className="w-5 h-5"/> Crear Cupón</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CUPONES REDISEÑADO */}
                            {adminTab === 'coupons' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Gestión de Cupones</h1>
                                    <div className="glass p-8 rounded-[2rem] mb-10 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                        <h3 className="font-bold text-white mb-6 text-xl">Crear Nuevo Beneficio</h3>
                                        <div className="grid md:grid-cols-2 gap-8 mb-6">
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Configuración Principal</label>
                                                <input className="w-full input-cyber p-4 uppercase font-black text-purple-400 tracking-widest text-lg" placeholder="CÓDIGO (EJ: SUPER10)" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code:e.target.value})}/>
                                                <div className="flex gap-4">
                                                    <select className="input-cyber p-4 flex-1" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon, type:e.target.value})}>
                                                        <option value="percentage">Porcentaje (%)</option>
                                                        <option value="fixed">Monto Fijo ($)</option>
                                                    </select>
                                                    <input className="input-cyber p-4 flex-1" type="number" placeholder="Valor" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon, value:e.target.value})}/>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reglas de Uso</label>
                                                <div className="flex gap-4">
                                                    <input className="input-cyber p-4 flex-1" type="number" placeholder="Compra Mínima ($)" value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon, minPurchase:e.target.value})}/>
                                                    <input className="input-cyber p-4 flex-1" type="number" placeholder="Límite Usos" value={newCoupon.usageLimit} onChange={e=>setNewCoupon({...newCoupon, usageLimit:e.target.value})}/>
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <select className="input-cyber p-4 flex-1" value={newCoupon.targetType} onChange={e=>setNewCoupon({...newCoupon, targetType:e.target.value})}>
                                                        <option value="global">Para Todos</option>
                                                        <option value="individual">Usuario Específico</option>
                                                    </select>
                                                    {newCoupon.targetType === 'individual' && <input className="flex-1 input-cyber p-4" placeholder="Email del usuario" value={newCoupon.targetUser} onChange={e=>setNewCoupon({...newCoupon, targetUser:e.target.value})}/>}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/30 transition text-lg flex justify-center gap-2 items-center"><Save className="w-5 h-5"/> Generar Cupón</button>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {coupons.map(c => (
                                            <div key={c.id} className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="font-black text-2xl text-white tracking-widest">{c.code}</span>
                                                    <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded border border-purple-500/30 uppercase font-bold">{c.type === 'percentage' ? '%' : '$'}</span>
                                                </div>
                                                <p className="text-4xl font-black text-purple-400 mb-2">{c.type === 'fixed' ? `$${c.value}` : `${c.value}%`} <span className="text-sm text-slate-500 font-normal">OFF</span></p>
                                                {c.minPurchase > 0 && <p className="text-xs text-slate-400 mb-4 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Mínimo: ${c.minPurchase}</p>}
                                                <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
                                                    <span className="text-xs text-slate-500">{c.usedBy?.length || 0} / {c.usageLimit || '∞'} usos</span>
                                                    <button onClick={()=>deleteCouponFn(c.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* --- INVENTARIO --- */}
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
                                                    <div className="flex gap-4">
                                                        <input className="w-full input-cyber p-4" type="number" placeholder="Precio" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                        <input className="w-full input-cyber p-4" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                                    </div>
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
                                                <div className="flex items-center gap-6">
                                                    <img src={p.image} className="w-16 h-16 object-contain bg-white rounded-lg p-1"/>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{p.name}</p>
                                                        <p className="text-xs text-slate-500">Stock: {p.stock} | {p.category}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <p className="font-mono text-xl font-bold text-white">${p.basePrice}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-2 bg-slate-800 rounded-lg text-cyan-400 hover:bg-cyan-900/30"><Edit className="w-4 h-4"/></button>
                                                        <button onClick={()=>deleteProductFn(p)} className="p-2 bg-slate-800 rounded-lg text-red-400 hover:bg-red-900/30"><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* --- PEDIDOS --- */}
                             {adminTab === 'orders' && (
                                <div className="max-w-6xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} onClick={()=>setSelectedOrder(o)} className="glass p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition hover:bg-slate-900/50">
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${o.status==='Realizado'?'bg-green-500/20 text-green-400':'bg-yellow-500/20 text-yellow-400'}`}><Package className="w-6 h-6"/></div>
                                                    <div><p className="font-bold text-white text-lg">{o.customer.name}</p><p className="text-sm text-slate-500 font-mono mt-1">{o.orderId}</p></div>
                                                </div>
                                                <div className="text-right"><p className="font-black text-white text-xl">${o.total.toLocaleString()}</p><span className={`text-xs px-3 py-1 rounded-full mt-2 inline-block font-bold ${o.status==='Realizado'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{o.status}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             )}

                            {/* --- SETTINGS SIMPLIFICADO --- */}
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
                    </div>
                )}

                {/* --- CART / LOGIN / ETC VIEWS --- */}
                {view === 'cart' && (
                    <div className="max-w-4xl mx-auto pt-10 animate-fade-up">
                        <h2 className="text-4xl font-black text-white mb-8 neon-text">Tu Carrito</h2>
                        {cart.length === 0 ? <EmptyState icon={ShoppingBag} title="Carrito Vacío" text="Agrega productos para comenzar." action={()=>setView('store')} actionText="Ir al Catálogo"/> : (
                            <div className="space-y-4">
                                {cart.map(i => (
                                    <div key={i.product.id} className="neon-box p-4 rounded-2xl flex items-center gap-6 bg-[#0a0a0a]">
                                        <div className="w-24 h-24 bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-800"><img src={i.product.image} className="max-w-full max-h-full object-contain"/></div>
                                        <div className="flex-1"><h3 className="font-bold text-white text-lg">{i.product.name}</h3><p className="text-cyan-400 font-bold text-xl">${calculatePrice(i.product.basePrice, i.product.discount).toLocaleString()}</p></div>
                                        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><button onClick={()=>manageCart(i.product, -1)}><Minus className="w-5 h-5 text-slate-400 hover:text-white"/></button><span className="font-black text-white w-6 text-center text-lg">{i.quantity}</span><button onClick={()=>manageCart(i.product, 1)}><Plus className="w-5 h-5 text-slate-400 hover:text-white"/></button></div>
                                    </div>
                                ))}
                                <div className="flex justify-end mt-12 pt-8 border-t border-slate-800">
                                    <div className="text-right">
                                        <p className="text-slate-400 text-sm mb-1 uppercase tracking-widest">Total Estimado</p>
                                        <p className="text-5xl font-black text-white mb-8 neon-text">${cartTotal.toLocaleString()}</p>
                                        <button onClick={()=>setView('checkout')} className="neon-button px-12 py-4 text-white font-bold text-lg rounded-xl shadow-lg transition flex items-center gap-3">Confirmar Pedido <ArrowRight className="w-6 h-6"/></button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(view === 'login' || view === 'register') && (<div className="flex items-center justify-center min-h-[80vh] animate-fade-up"><div className="glass p-12 rounded-[2.5rem] w-full max-w-md shadow-2xl border-t border-cyan-500/20 relative overflow-hidden"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div><h2 className="text-4xl font-black text-center text-white mb-10 tracking-tight">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2><form onSubmit={(e)=>{e.preventDefault(); handleAuth(false)}} className="space-y-6">{!loginMode && <><input className="w-full input-cyber p-4" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})} required/><input className="w-full input-cyber p-4" placeholder="Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})} required/></>}<input className="w-full input-cyber p-4" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} required/><input className="w-full input-cyber p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} required/><button type="submit" className="w-full neon-button py-4 text-white rounded-xl font-bold text-lg shadow-lg mt-4">{loginMode ? 'INGRESAR' : 'REGISTRARSE'}</button></form><button onClick={()=>{setLoginMode(!loginMode); setAuthData({email:'',password:'',name:'',username:'',dni:'',phone:''})}} className="w-full text-center text-slate-400 text-sm mt-8 hover:text-cyan-400 transition font-bold">{loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button></div></div>)}
                
                {/* MENU MOVIL */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[100] flex">
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={()=>setIsMenuOpen(false)}></div>
                        <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-up flex flex-col shadow-2xl">
                            <h2 className="text-3xl font-black text-white mb-10 neon-text">MENÚ</h2>
                            <div className="space-y-6 flex-1">
                                <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Home className="w-6 h-6"/> Inicio</button>
                                <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><ShoppingBag className="w-6 h-6"/> Carrito</button>
                                {currentUser ? ( <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><User className="w-6 h-6"/> Mi Perfil</button> ) : null}
                                {currentUser && hasAccess(currentUser.email) && <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-cyan-400 mt-8 pt-8 border-t border-slate-800 flex items-center gap-4"><Shield className="w-6 h-6"/> Admin Panel</button>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
