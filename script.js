import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, ShoppingCart, Archive, Play, FolderPlus, Eye } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, updateDoc, doc, getDocs, deleteDoc, where, writeBatch, getDoc } from 'firebase/firestore';

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
    admins: "lautarocorazza63@gmail.com", // Legacy fallback
    team: [{ email: "lautarocorazza63@gmail.com", role: "admin" }], // New Role System
    sellerEmail: "sustoresf@gmail.com", instagramUser: "sustore_sf", whatsappLink: "https://wa.me/message/3MU36VTEKINKP1", 
    logoUrl: "", heroUrl: "", markupPercentage: 0, 
    categories: ["Celulares", "Accesorios", "Audio", "Computación", "Gaming"], 
    aboutUsText: "Somos una empresa dedicada a traer la mejor tecnología al mejor precio del mercado.\n\nContamos con garantía oficial en todos nuestros productos y soporte personalizado."
};

const Toast = ({ message, type, onClose }) => {
    const colors = { success: 'border-green-500 text-green-400 shadow-green-500/20', error: 'border-red-500 text-red-400 shadow-red-500/20', info: 'border-cyan-500 text-cyan-400 shadow-cyan-500/20', warning: 'border-yellow-500 text-yellow-400 shadow-yellow-500/20' };
    useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
    return (<div className={`fixed top-24 right-4 z-[9999] flex items-center gap-3 p-4 rounded-xl border-l-4 shadow-xl glass animate-fade-up ${colors[type] || colors.info}`}><p className="font-bold text-sm tracking-wide">{message}</p></div>);
};

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText="Confirmar", cancelText="Cancelar" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up">
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

function App() {
    const [view, setView] = useState('store');
    const [adminTab, setAdminTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false); // Mobile Admin Toggle
    const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('nexus_user_data')); } catch(e) { return null; } });
    const [systemUser, setSystemUser] = useState(null);
    
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('nexus_cart')) || []; } catch(e) { return []; } });
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    const [toasts, setToasts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
    const [loginMode, setLoginMode] = useState(true);
    
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', province: '', zipCode: '', paymentChoice: '' });
    const [checkoutCoupon, setCheckoutCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const [newProduct, setNewProduct] = useState({ name: '', basePrice: '', stock: '', category: '', image: '', description: '', discount: 0 });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', phone: '', debt: 0 });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    
    // --- GASTOS Y COMPRAS ---
    const [expenseModalMode, setExpenseModalMode] = useState('closed'); 
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [purchaseCart, setPurchaseCart] = useState([]); 
    const [newPurchaseItem, setNewPurchaseItem] = useState({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null });
    const [productSearchTerm, setProductSearchTerm] = useState(''); 
    const [isAddingCategory, setIsAddingCategory] = useState(false); 
    const [quickCategoryName, setQuickCategoryName] = useState('');
    const [showDraftPrompt, setShowDraftPrompt] = useState(false); 

    // --- CUPONES Y EQUIPO ---
    const [newCoupon, setNewCoupon] = useState({ code: '', discountPercentage: 10, expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '' });
    const [couponTab, setCouponTab] = useState('global');
    
    // Team Management
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

    const fileInputRef = useRef(null);
    const purchaseFileInputRef = useRef(null);

    const showToast = (msg, type = 'info') => { 
        const id = Date.now(); 
        setToasts(prev => { const filtered = prev.filter(t => Date.now() - t.id < 2000); return [...filtered, { id, message: msg, type }]; });
    };
    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));
    const confirmAction = (title, message, action) => setModalConfig({ isOpen: true, title, message, onConfirm: () => { action(); setModalConfig({ ...modalConfig, isOpen: false }); } });
    const calculatePrice = (p, d) => d > 0 ? Math.ceil(Number(p) * (1 - d / 100)) : Number(p);
    
    // --- NUEVO SISTEMA DE ROLES ---
    const getRole = (email) => {
        if (!email) return null;
        const clean = email.trim().toLowerCase();
        if (clean === 'lautarocorazza63@gmail.com') return 'admin'; // Superuser force
        const team = settings.team || [];
        const member = team.find(m => m.email.toLowerCase() === clean);
        return member ? member.role : null;
    };

    const isAdmin = (email) => getRole(email) === 'admin';
    const isEmployee = (email) => getRole(email) === 'employee';
    const hasAccess = (email) => isAdmin(email) || isEmployee(email);

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
    useEffect(() => { const t = setTimeout(() => { if(isLoading) setIsLoading(false); }, 4000); return () => clearTimeout(t); }, [isLoading]);

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

    const manageCart = (prod, delta) => {
        const ex = cart.find(i => i.product.id === prod.id);
        const newQty = (ex ? ex.quantity : 0) + delta;
        if (newQty > Number(prod.stock)) return showToast("Stock insuficiente", "warning");
        if (newQty <= 0) setCart(cart.filter(i => i.product.id !== prod.id));
        else if (ex) setCart(cart.map(i => i.product.id === prod.id ? { ...i, quantity: newQty } : i));
        else { setCart([...cart, { product: prod, quantity: 1 }]); showToast("¡Agregado!", "success"); }
    };

    const applyCoupon = () => {
        const c = coupons.find(x => x.code === checkoutCoupon.toUpperCase());
        if (!c) return showToast("Cupón inválido", "error");
        if (new Date(c.expirationDate) < new Date()) return showToast("Cupón vencido", "warning");
        if (c.usageLimit && c.usedBy && c.usedBy.length >= c.usageLimit) return showToast("Cupón agotado", "warning");
        if (c.targetUser && c.targetUser !== currentUser?.email) return showToast("No es para ti", "error");
        setAppliedCoupon(c); showToast("Aplicado", "success");
    };

    const confirmOrder = async () => {
        if(!currentUser) { setView('login'); return showToast("Inicia sesión", "info"); }
        if(!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Faltan datos de envío", "warning");
        setIsLoading(true);
        try {
            const totalBase = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);
            const discountVal = appliedCoupon ? Math.ceil(totalBase * (appliedCoupon.discountPercentage/100)) : 0;
            const finalTotal = totalBase - discountVal;
            const orderId = `ORD-${Date.now().toString().slice(-6)}`;
            const newOrder = { orderId, userId: currentUser.id, customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, dni: currentUser.dni }, items: cart.map(i => ({ productId: i.product.id, title: i.product.name, quantity: i.quantity, unit_price: calculatePrice(i.product.basePrice, i.product.discount) })), total: finalTotal, subtotal: totalBase, discount: discountVal, discountCode: appliedCoupon?.code || null, status: 'Pendiente', date: new Date().toISOString(), shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, paymentMethod: checkoutData.paymentChoice };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode });
            fetch('/api/payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newOrder, shipping: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province}`, discountDetails: appliedCoupon ? { percentage: appliedCoupon.discountPercentage, amount: discountVal } : null }) }).then(res => { if(!res.ok) console.log("Email API not ready (Local Env)"); }).catch(err => console.log("Email skipped in simulation"));
            for(const i of cart) { const r = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.product.id); const s = await getDoc(r); if(s.exists()) await updateDoc(r, { stock: Math.max(0, s.data().stock - i.quantity) }); }
            if(appliedCoupon) { const cRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id); const cSnap = await getDoc(cRef); if(cSnap.exists()) await updateDoc(cRef, { usedBy: [...(cSnap.data().usedBy || []), currentUser.id] }); }
            setCart([]); setView('store'); setAppliedCoupon(null); showToast("¡Pedido Realizado! Revisa tu Email", "success");
        } catch(e) { showToast("Error al procesar", "error"); }
        setIsLoading(false);
    };

    // FUNCIONES ADMIN MEJORADAS
    const saveProductFn = async () => {
        if(!newProduct.name) return showToast("Faltan datos", "warning");
        const d = {...newProduct, basePrice: Number(newProduct.basePrice), stock: Number(newProduct.stock), discount: Number(newProduct.discount), image: newProduct.image || 'https://via.placeholder.com/150'};
        if(editingId) await updateDoc(doc(db,'artifacts',appId,'public','data','products',editingId), d);
        else await addDoc(collection(db,'artifacts',appId,'public','data','products'), d);
        setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0}); setEditingId(null); setShowProductForm(false); showToast("Guardado", "success");
    };
    const deleteProductFn = (p) => confirmAction("Eliminar", `¿Borrar ${p.name}?`, async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','products',p.id)); showToast("Borrado", "success"); });
    
    // COUPON FUNCTION UPGRADE
    const saveCouponFn = async () => {
        if(!newCoupon.code) return;
        // Si es individual, verificar que haya usuario
        if(newCoupon.targetType === 'individual' && !newCoupon.targetUser) return showToast("Ingresa el email del usuario", "warning");
        
        await addDoc(collection(db,'artifacts',appId,'public','data','coupons'), {
            ...newCoupon, 
            targetUser: newCoupon.targetType === 'global' ? '' : newCoupon.targetUser,
            discountPercentage: Number(newCoupon.discountPercentage), 
            usageLimit: Number(newCoupon.usageLimit)
        });
        setNewCoupon({code:'', discountPercentage:10, expirationDate:'', targetType: 'global', targetUser: '', usageLimit: ''}); 
        showToast("Cupón creado", "success");
    };
    const deleteCouponFn = (id) => confirmAction("Eliminar", "¿Borrar cupón?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',id)); showToast("Eliminado", "success"); });
    
    // TEAM MANAGEMENT UPGRADE
    const addTeamMemberFn = async () => {
        if(!newTeamMember.email.includes('@')) return showToast("Email inválido", "warning");
        const currentTeam = settings.team || [];
        if(currentTeam.find(m => m.email === newTeamMember.email)) return showToast("Ya está en el equipo", "info");
        
        const updatedTeam = [...currentTeam, newTeamMember];
        // Update legacy string just in case
        const legacyAdmins = updatedTeam.map(m => m.email).join(',');

        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { 
            team: updatedTeam,
            admins: legacyAdmins 
        });
        setNewTeamMember({email: '', role: 'employee'}); 
        showToast("Miembro agregado", "success");
    };

    const removeTeamMemberFn = async (email) => {
        const updatedTeam = (settings.team || []).filter(m => m.email !== email);
        const legacyAdmins = updatedTeam.map(m => m.email).join(',');
        
        await updateDoc(doc(db,'artifacts',appId,'public','data','settings', settings.id || 'default'), { 
            team: updatedTeam,
            admins: legacyAdmins
        });
        showToast("Miembro eliminado", "success");
    };

    const saveSupplierFn = async () => { if(!newSupplier.name) return showToast("Faltan datos", "warning"); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), newSupplier); setNewSupplier({name:'',debt:0,expensesPending:0,totalPaid:0,phone:'',contact:''}); setShowSupplierModal(false); showToast("Guardado", "success"); };
    
    const handleCloseExpenseModal = () => {
        if (purchaseCart.length > 0 && expenseModalMode === 'purchase') {
            setShowDraftPrompt(true);
        } else {
            setExpenseModalMode('closed');
            setShowDraftPrompt(false);
        }
    };
    
    const selectExistingProduct = (p) => {
        setNewPurchaseItem({
            ...newPurchaseItem,
            name: p.name,
            salePrice: p.basePrice,
            category: p.category,
            image: p.image,
            existingId: p.id,
            quantity: '', // Reset cantidad y costo
            costPrice: ''
        });
        setProductSearchTerm(''); // Limpiar buscador
        showToast("Producto existente cargado", "info");
    };

    const createQuickCategory = async () => {
        if(!quickCategoryName) return;
        try {
            const updatedCats = [...settings.categories, quickCategoryName];
            const q = query(collection(db,'artifacts',appId,'public','data','settings')); 
            const s = await getDocs(q);
            if(!s.empty) {
                await updateDoc(doc(db,'artifacts',appId,'public','data','settings',s.docs[0].id), { categories: updatedCats });
                // Actualizar estado local inmediatamente para la UI
                setSettings(prev => ({ ...prev, categories: updatedCats }));
                setNewPurchaseItem(prev => ({ ...prev, category: quickCategoryName })); // Seleccionarla
                setIsAddingCategory(false);
                setQuickCategoryName('');
                showToast("Categoría creada", "success");
            }
        } catch(e) { showToast("Error al crear", "error"); }
    };

    const saveGeneralExpenseFn = async () => { if(!newExpense.amount || !newExpense.description) return showToast("Faltan datos", "warning"); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {...newExpense, amount: Number(newExpense.amount), type: 'general'}); setExpenseModalMode('closed'); showToast("Gasto registrado", "success"); };
    const handlePurchaseImage = (e) => { const f=e.target.files[0]; if(f && f.size<1000000) { const r=new FileReader(); r.onload=()=>setNewPurchaseItem(p=>({...p, image: r.result})); r.readAsDataURL(f); } else showToast("Imagen pesada", 'error'); };

    const addPurchaseItemToCart = () => {
        if(!newPurchaseItem.name || !newPurchaseItem.costPrice || !newPurchaseItem.salePrice || !newPurchaseItem.quantity) return showToast("Faltan datos del producto", "warning");
        const item = { ...newPurchaseItem, id: Date.now(), costPrice: Number(newPurchaseItem.costPrice), salePrice: Number(newPurchaseItem.salePrice), quantity: Number(newPurchaseItem.quantity) };
        setPurchaseCart([...purchaseCart, item]);
        setNewPurchaseItem({ name: '', costPrice: '', salePrice: '', quantity: '', category: '', image: '', existingId: null });
        if(purchaseFileInputRef.current) purchaseFileInputRef.current.value = "";
    };

    const confirmPurchaseFn = async () => {
        if(purchaseCart.length === 0) return showToast("La lista está vacía", "warning");
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const totalCost = purchaseCart.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);
            
            const expenseRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'));
            batch.set(expenseRef, { description: `Compra de Mercadería (${purchaseCart.length} items)`, details: purchaseCart.map(i => `${i.quantity}x ${i.name}`).join(', '), amount: totalCost, date: new Date().toISOString().split('T')[0], type: 'purchase' });

            purchaseCart.forEach(item => {
                if (item.existingId) {
                    const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.existingId);
                    const currentProd = products.find(p => p.id === item.existingId);
                    const currentStock = currentProd ? Number(currentProd.stock) : 0;
                    batch.update(productRef, {
                        stock: currentStock + Number(item.quantity),
                        basePrice: Number(item.salePrice)
                    });
                } else {
                    const productRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'products'));
                    batch.set(productRef, { name: item.name, basePrice: item.salePrice, stock: item.quantity, category: item.category || 'Varios', image: item.image || 'https://via.placeholder.com/150', description: 'Ingresado por compra de stock', discount: 0 });
                }
            });

            await batch.commit();
            setPurchaseCart([]);
            setExpenseModalMode('closed');
            showToast(`Compra registrada. Gasto: $${totalCost.toLocaleString()}`, "success");
        } catch (error) { console.error(error); showToast("Error al procesar la compra", "error"); }
        setIsLoading(false);
    };

    const removePurchaseItem = (id) => setPurchaseCart(purchaseCart.filter(i => i.id !== id));
    const saveSettingsFn = async () => { const q=query(collection(db,'artifacts',appId,'public','data','settings')); const s=await getDocs(q); const d={...tempSettings, aboutUsText: aboutText}; if(!s.empty) await updateDoc(doc(db,'artifacts',appId,'public','data','settings',s.docs[0].id), d); else await addDoc(collection(db,'artifacts',appId,'public','data','settings'), d); showToast("Configuración guardada", 'success'); };
    const addCategoryFn = () => { if(newCategory){setTempSettings({...tempSettings, categories:[...tempSettings.categories, newCategory]}); setNewCategory('');} };
    const removeCategoryFn = (c) => setTempSettings({...tempSettings, categories: tempSettings.categories.filter(x=>x!==c)});
    const handleImage = (e) => { const f=e.target.files[0]; if(f&&f.size<1000000){const r=new FileReader();r.onload=()=>setNewProduct(p=>({...p,image:r.result}));r.readAsDataURL(f);}else showToast("Imagen pesada", 'error'); };
    const toggleOrderFn = async (o) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', o.id), { status: o.status === 'Pendiente' ? 'Realizado' : 'Pendiente' }); showToast("Estado actualizado", 'info'); };
    const deleteOrderFn = (o) => confirmAction("Eliminar", "Borrar y restaurar stock?", async () => { for(const i of o.items){const r=doc(db,'artifacts',appId,'public','data','products',i.productId);const s=await getDoc(r);if(s.exists())await updateDoc(r,{stock:s.data().stock+i.quantity})} await deleteDoc(doc(db,'artifacts',appId,'public','data','orders',o.id)); setSelectedOrder(null); showToast("Eliminado", "success"); });
    const addToPos = (p) => { const ex = posCart.find(i=>i.id===p.id); if(ex && ex.qty+1>p.stock) return; setPosCart(ex ? posCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...posCart,{...p,qty:1}]); };
    const confirmPosSale = async () => { if(!posCart.length) return; setIsLoading(true); const batch = writeBatch(db); const total = posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0); const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); batch.set(orderRef, { orderId: `POS-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: 'Mostrador', email: '-', phone: '-' }, items: posCart.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total, subtotal: total, discount: 0, status: 'Realizado', date: new Date().toISOString(), origin: 'store', paymentMethod: 'Efectivo' }); posCart.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: Math.max(0, products.find(p=>p.id===i.id).stock - i.qty) }); }); await batch.commit(); setPosCart([]); setShowPosModal(false); showToast("Venta registrada", "success"); setIsLoading(false); };
    const addToQuote = (p) => { const ex = quoteCart.find(i=>i.id===p.id); setQuoteCart(ex ? quoteCart.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i) : [...quoteCart,{...p,qty:1}]); };
    const saveQuote = async () => { const total = quoteCart.reduce((a,i)=>a+(i.basePrice*i.qty),0) * (1 - quoteDiscount/100); await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'quotes'), { clientName: quoteClient.name || 'Cliente', clientPhone: quoteClient.phone, items: quoteCart, total, discount: quoteDiscount, date: new Date().toISOString(), status: 'Borrador' }); setQuoteCart([]); setQuoteClient({name:'',phone:''}); showToast("Presupuesto guardado", "success"); };
    const deleteQuoteFn = (id) => confirmAction("Eliminar Presupuesto", "¿Borrar historial?", async () => { await deleteDoc(doc(db,'artifacts',appId,'public','data','quotes',id)); showToast("Presupuesto eliminado", "success"); });
    const convertQuote = async (q) => { setIsLoading(true); const batch = writeBatch(db); const orderRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'orders')); batch.set(orderRef, { orderId: `QUO-${Date.now().toString().slice(-6)}`, userId: 'ADMIN', customer: { name: q.clientName, phone: q.clientPhone, email: '-' }, items: q.items.map(i=>({productId:i.id, title:i.name, quantity:i.qty, unit_price:i.basePrice})), total: q.total, status: 'Realizado', date: new Date().toISOString(), origin: 'quote', paymentMethod: 'Presupuesto' }); q.items.forEach(i => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', i.id); batch.update(ref, { stock: Math.max(0, products.find(p=>p.id===i.id).stock - i.qty) }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'quotes', q.id), { status: 'Convertido' }); await batch.commit(); showToast("Convertido a venta", "success"); setIsLoading(false); };

    const goWsp = () => window.open(settings.whatsappLink, '_blank');
    const goIg = () => window.open(`https://www.instagram.com/${settings.instagramUser}`, '_blank');

    const cartTotal = cart.reduce((a,i)=>a+(calculatePrice(i.product.basePrice, i.product.discount)*i.quantity),0);
    const discountAmt = appliedCoupon ? Math.ceil(cartTotal * (appliedCoupon.discountPercentage/100)) : 0;
    const revenue = orders.reduce((a,o)=>a+(o.total||0),0);
    const expensesTotal = expenses.reduce((a,e)=>a+(e.amount||0),0);

    // COMPONENTE: OrderDetailsModal
    const OrderDetailsModal = ({ order, onClose, onToggleStatus, onDelete }) => {
        if (!order) return null;
        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4 overflow-y-auto">
                <div className="glass rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        <div><h3 className="text-2xl font-bold text-white flex items-center gap-2 neon-text">Pedido <span className="text-cyan-400">#{order.orderId}</span></h3><p className="text-slate-400 text-sm">{new Date(order.date).toLocaleString()}</p></div>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6">
                        <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-3"><span className={`px-3 py-1 rounded-full text-sm font-bold ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span></div>
                            {/* Solo ADMIN puede editar estados */}
                            {isAdmin(currentUser?.email) && (
                                <div className="flex gap-2"><button onClick={() => onToggleStatus(order)} className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded-lg text-sm font-bold transition">Cambiar Estado</button><button onClick={() => onDelete(order)} className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-sm font-bold transition flex items-center gap-2"><Trash2 className="w-4 h-4"/> Eliminar</button></div>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4"><h4 className="text-cyan-400 font-bold uppercase text-xs tracking-wider border-b border-cyan-900/50 pb-2">Datos del Cliente</h4><div className="bg-slate-800/50 p-4 rounded-xl space-y-2 text-sm"><div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-500"/> <span className="text-white font-bold">{order.customer.name}</span></div><div className="flex items-center gap-3"><CreditCard className="w-4 h-4 text-slate-500"/> <span className="text-slate-300">DNI: {order.customer.dni}</span></div><div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-500"/> <span className="text-slate-300">{order.customer.phone}</span></div></div></div>
                            <div className="space-y-4"><h4 className="text-purple-400 font-bold uppercase text-xs tracking-wider border-b border-purple-900/50 pb-2">Envío y Pago</h4><div className="bg-slate-800/50 p-4 rounded-xl space-y-2 text-sm"><div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-slate-500 mt-1"/> <span className="text-slate-300">{order.shippingAddress || 'Retiro en Local'}</span></div><div className="flex items-center gap-3"><DollarSign className="w-4 h-4 text-slate-500"/> <span className="text-slate-300">Pago: <span className="font-bold text-white">{order.paymentMethod}</span></span></div></div></div>
                        </div>
                        <div><h4 className="text-white font-bold uppercase text-xs tracking-wider border-b border-slate-700 pb-2 mb-4">Productos</h4><div className="space-y-2">{order.items.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-xs font-bold text-white">{item.quantity}x</div><p className="text-white font-bold text-sm">{item.title}</p></div><p className="text-cyan-400 font-bold text-sm">${item.unit_price.toLocaleString()}</p></div>))}</div></div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-2"><div className="border-t border-slate-700 pt-2 mt-2 flex justify-between text-xl font-black text-white"><span>Total</span><span>${order.total.toLocaleString()}</span></div></div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid">
            <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse"></div><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px] animate-pulse"></div></div>
            <div className="fixed top-20 right-4 z-[9999] space-y-2">{toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}</div>
            
            <ConfirmModal isOpen={showDraftPrompt} title="¿Guardar Progreso?" message="Tienes productos en tu lista de compra. ¿Quieres guardar este borrador o descartarlo todo?" 
                confirmText="Guardar Borrador" cancelText="Descartar Todo"
                onConfirm={() => { setExpenseModalMode('closed'); setShowDraftPrompt(false); }}
                onCancel={() => { setPurchaseCart([]); setExpenseModalMode('closed'); setShowDraftPrompt(false); }}
            />

            <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} onConfirm={modalConfig.onConfirm} onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} />
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onToggleStatus={toggleOrderFn} onDelete={deleteOrderFn} />
            {isLoading && <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center"><RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mb-4"/><p className="text-cyan-400 font-bold tracking-widest animate-pulse">CARGANDO SISTEMA...</p></div>}

            {/* --- NAVBAR CLIENTE --- */}
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
                        <button onClick={goWsp} className="hidden md:block p-2 text-green-400 hover:text-green-300 transition hover:scale-110"><MessageCircle className="w-6 h-6"/></button>
                        <button onClick={goIg} className="hidden md:block p-2 text-pink-400 hover:text-pink-300 transition hover:scale-110"><Instagram className="w-6 h-6"/></button>
                        <button onClick={()=>setView('cart')} className="relative p-2 text-slate-400 hover:text-white transition">
                            <ShoppingBag className="w-6 h-6"/>
                            {cart.length > 0 && <span className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)]">{cart.length}</span>}
                        </button>
                        <button onClick={()=>setIsMenuOpen(true)} className="p-2 text-slate-400 hover:text-white"><Menu className="w-6 h-6"/></button>
                    </div>
                </nav>
            )}
            {view !== 'admin' && <div className="h-24"></div>}

            {/* --- MAIN CONTENT --- */}
            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4'}`}>
                
                {/* STORE FRONT */}
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
                                <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===''?'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>Todos</button>
                                {settings.categories.map(c=><button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2 rounded-full font-bold text-sm transition border ${selectedCategory===c?'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]':'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>{c}</button>)}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                    <div key={p.id} className="neon-box rounded-2xl overflow-hidden group relative bg-[#0a0a0a]">
                                        <div className="h-64 bg-slate-950 p-6 flex items-center justify-center relative overflow-hidden">
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110"/>
                                            {p.discount > 0 && <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg z-20">-{p.discount}%</span>}
                                            <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
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
                            
                            <footer className="mt-12 py-8 border-t border-slate-800 text-center bg-slate-900/50 backdrop-blur-sm"><div className="flex justify-center gap-6 mb-6"><button onClick={goWsp} className="p-4 bg-slate-800 rounded-full hover:bg-green-600 text-slate-400 hover:text-white transition shadow-lg hover:shadow-green-500/50"><MessageCircle className="w-6 h-6"/></button><button onClick={goIg} className="p-4 bg-slate-800 rounded-full hover:bg-pink-600 text-slate-400 hover:text-white transition shadow-lg hover:shadow-pink-500/50"><Instagram className="w-6 h-6"/></button></div><div className="flex justify-center gap-6 mb-4 text-sm text-slate-400 font-bold"><button onClick={() => setView('about')} className="hover:text-cyan-400 transition">Sobre Nosotros</button><span>•</span><button onClick={() => setView('guide')} className="hover:text-cyan-400 transition">Cómo Comprar</button></div><p className="text-slate-600 text-xs mt-4">© 2024 {settings.storeName}. Tecnología del Futuro.</p></footer>
                        </div>
                )}

                {view === 'cart' && (
                    <div className="max-w-4xl mx-auto pt-10 animate-fade-up">
                        <h2 className="text-4xl font-black text-white mb-8 neon-text">Tu Carrito</h2>
                        {cart.length === 0 ? <EmptyState icon={ShoppingBag} title="Carrito Vacío" text="Agrega productos para comenzar la experiencia." action={()=>setView('store')} actionText="Ir al Catálogo"/> : (
                            <div className="space-y-4">
                                {cart.map(i => (
                                    <div key={i.product.id} className="neon-box p-4 rounded-2xl flex items-center gap-6 bg-[#0a0a0a]">
                                        <div className="w-24 h-24 bg-slate-950 rounded-xl flex items-center justify-center p-2 border border-slate-800"><img src={i.product.image} className="max-w-full max-h-full object-contain"/></div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg">{i.product.name}</h3>
                                            <p className="text-cyan-400 font-bold text-xl">${calculatePrice(i.product.basePrice, i.product.discount).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                                            <button onClick={()=>manageCart(i.product, -1)}><Minus className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                                            <span className="font-black text-white w-6 text-center text-lg">{i.quantity}</span>
                                            <button onClick={()=>manageCart(i.product, 1)}><Plus className="w-5 h-5 text-slate-400 hover:text-white"/></button>
                                        </div>
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

                {/* ... (VIEWS: checkout, login, about, guide are identical) ... */}
                {view === 'checkout' && (<div className="max-w-5xl mx-auto pt-10 animate-fade-up pb-20"><button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Volver</button><div className="grid md:grid-cols-2 gap-12"><div><h2 className="text-3xl font-black text-white mb-8">Envío y Pago</h2><div className="space-y-6"><input className="w-full input-cyber p-5 text-lg" placeholder="Dirección Completa (Calle, Altura)" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/><div className="grid grid-cols-1 gap-6"><input className="w-full input-cyber p-5" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/></div><div className="grid grid-cols-2 gap-6"><input className="w-full input-cyber p-5" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/><input className="w-full input-cyber p-5" placeholder="CP" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/></div><h3 className="font-bold text-white mt-8 mb-4 text-xl">Método de Pago</h3><div className="grid grid-cols-2 gap-4"><button onClick={()=>setCheckoutData({...checkoutData, paymentChoice:'Transferencia'})} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 ${checkoutData.paymentChoice==='Transferencia'?'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'border-slate-700 text-slate-500 hover:border-slate-500'}`}><RefreshCw className="w-8 h-8"/><span className="text-sm font-bold tracking-wider">TRANSFERENCIA</span></button><button onClick={()=>setCheckoutData({...checkoutData, paymentChoice:'Efectivo'})} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 ${checkoutData.paymentChoice==='Efectivo'?'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]':'border-slate-700 text-slate-500 hover:border-slate-500'}`}><DollarSign className="w-8 h-8"/><span className="text-sm font-bold tracking-wider">EFECTIVO</span></button></div></div></div><div className="glass p-10 rounded-[2rem] h-fit border border-slate-700"><h3 className="font-black text-white mb-8 text-2xl">Resumen</h3><div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 mb-8"><label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-widest">Cupón de Descuento</label><div className="flex gap-3"><input className="flex-1 input-cyber p-3 text-sm uppercase font-bold text-cyan-300" placeholder="CÓDIGO" value={checkoutCoupon} onChange={e=>setCheckoutCoupon(e.target.value)}/><button onClick={applyCoupon} className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold text-xs transition shadow-lg shadow-purple-900/40">APLICAR</button></div>{appliedCoupon && <p className="text-green-400 text-xs mt-3 flex items-center gap-2 font-bold"><CheckCircle className="w-4 h-4"/> -{appliedCoupon.discountPercentage}% OFF APLICADO</p>}</div><div className="space-y-4 mb-8 pb-8 border-b border-slate-700"><div className="flex justify-between text-slate-400 font-medium"><span>Subtotal</span><span>${cartTotal.toLocaleString()}</span></div>{appliedCoupon && <div className="flex justify-between text-green-400 font-bold"><span>Descuento</span><span>-${discountAmt.toLocaleString()}</span></div>}</div><div className="flex justify-between items-end mb-10"><span className="text-slate-300 font-bold text-lg">Total Final</span><span className="text-5xl font-black text-white neon-text">${(cartTotal - discountAmt).toLocaleString()}</span></div><button onClick={confirmOrder} className="w-full neon-button py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3">Confirmar Compra <CheckCircle className="w-6 h-6"/></button></div></div></div>)}
                {(view === 'login' || view === 'register') && (<div className="flex items-center justify-center min-h-[80vh] animate-fade-up"><div className="glass p-12 rounded-[2.5rem] w-full max-w-md shadow-2xl border-t border-cyan-500/20 relative overflow-hidden"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div><h2 className="text-4xl font-black text-center text-white mb-10 tracking-tight">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2><form onSubmit={(e)=>{e.preventDefault(); handleAuth(false)}} className="space-y-6">{!loginMode && <><input className="w-full input-cyber p-4" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})} required/><input className="w-full input-cyber p-4" placeholder="Usuario" value={authData.username} onChange={e=>setAuthData({...authData, username:e.target.value})} required/></>}<input className="w-full input-cyber p-4" placeholder={loginMode ? "Email o Usuario" : "Email"} value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})} required/><input className="w-full input-cyber p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})} required/><button type="submit" className="w-full neon-button py-4 text-white rounded-xl font-bold text-lg shadow-lg mt-4">{loginMode ? 'INGRESAR' : 'REGISTRARSE'}</button></form><button onClick={()=>{setLoginMode(!loginMode); setAuthData({email:'',password:'',name:'',username:'',dni:'',phone:''})}} className="w-full text-center text-slate-400 text-sm mt-8 hover:text-cyan-400 transition font-bold">{loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button></div></div>)}
                {view === 'about' && (<div className="max-w-4xl mx-auto pt-10 animate-fade-up px-4"><h2 className="text-4xl font-black text-white mb-12 flex items-center gap-4 neon-text"><Info className="w-10 h-10 text-cyan-400"/> Sobre Nosotros</h2><div className="glass p-12 rounded-[3rem] relative overflow-hidden"><div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] -mr-20 -mt-20 pointer-events-none"></div><p className="text-slate-200 text-xl leading-relaxed whitespace-pre-wrap font-light relative z-10">{settings.aboutUsText || "Cargando información..."}</p><div className="mt-12 pt-8 border-t border-slate-700 flex gap-6"><button onClick={goWsp} className="flex items-center gap-3 text-green-400 font-bold hover:text-green-300 transition text-lg"><MessageCircle className="w-6 h-6"/> Contactar por WhatsApp</button></div></div></div>)}
                {view === 'guide' && (<div className="max-w-5xl mx-auto pt-10 animate-fade-up px-4"><h2 className="text-4xl font-black text-white text-center mb-16 neon-text">Cómo Comprar</h2><div className="grid md:grid-cols-3 gap-8 relative">{[ { icon: Search, title: "1. Elige", text: "Explora y selecciona tus productos favoritos." }, { icon: CreditCard, title: "2. Confirma", text: "Completa el pedido en el carrito." }, { icon: MessageCircle, title: "3. Recibe", text: "Coordinamos entrega y pago por WhatsApp." } ].map((step, i) => (<div key={i} className="glass p-10 rounded-[2.5rem] text-center hover:bg-slate-800/50 transition duration-500 group border-t border-slate-700"><div className="w-24 h-24 mx-auto bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mb-8 group-hover:scale-110 transition shadow-[0_0_30px_rgba(6,182,212,0.15)]"><step.icon className="w-10 h-10 text-cyan-400"/></div><h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3><p className="text-slate-400 leading-relaxed text-lg">{step.text}</p></div>))}</div><div className="mt-20 text-center"><button onClick={() => setView('store')} className="neon-button px-12 py-4 text-white font-bold rounded-full shadow-xl transition text-xl">Ir a la Tienda</button></div></div>)}
                
                {/* --- ADMIN PANEL RESPONSIVO --- */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden animate-fade-up relative">
                        
                        {/* Overlay móvil */}
                        {isAdminMenuOpen && (
                            <div className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsAdminMenuOpen(false)}></div>
                        )}

                        {/* Sidebar - Ahora responsivo */}
                        <div className={`
                            fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:w-80
                            ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                        `}>
                            <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2"><Shield className="w-6 h-6 text-cyan-400"/> ADMIN<span className="text-cyan-500">PANEL</span></h2>
                                <button onClick={()=>setIsAdminMenuOpen(false)} className="md:hidden text-slate-400"><X className="w-6 h-6"/></button>
                            </div>
                            <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Principal</p>
                                <button onClick={()=>{setAdminTab('dashboard'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='dashboard'?'active bg-slate-900':''}`}><LayoutDashboard className="w-5 h-5"/>Panel Principal</button>
                                <button onClick={()=>{setAdminTab('products'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='products'?'active bg-slate-900':''}`}><Package className="w-5 h-5"/>Inventario</button>
                                <button onClick={()=>{setAdminTab('orders'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='orders'?'active bg-slate-900':''}`}><ShoppingBag className="w-5 h-5"/>Pedidos</button>
                                
                                {/* Solo Admin ve estas secciones */}
                                {isAdmin(currentUser?.email) && (
                                    <>
                                        <button onClick={()=>{setAdminTab('balance'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='balance'?'active bg-slate-900':''}`}><Wallet className="w-5 h-5"/>Balance</button>
                                        <button onClick={()=>{setAdminTab('coupons'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='coupons'?'active bg-slate-900':''}`}><Ticket className="w-5 h-5"/>Cupones</button>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-6">Gestión</p>
                                        <button onClick={()=>{setAdminTab('suppliers'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='suppliers'?'active bg-slate-900':''}`}><Truck className="w-5 h-5"/>Proveedores</button>
                                        <button onClick={()=>{setAdminTab('employees'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='employees'?'active bg-slate-900':''}`}><Users className="w-5 h-5"/>Equipo</button>
                                        <button onClick={()=>{setAdminTab('stats'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='stats'?'active bg-slate-900':''}`}><PieChart className="w-5 h-5"/>Estadísticas</button>
                                        <button onClick={()=>{setAdminTab('budget'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='budget'?'active bg-slate-900':''}`}><FileText className="w-5 h-5"/>Presupuestos</button>
                                        <button onClick={()=>{setAdminTab('settings'); setIsAdminMenuOpen(false)}} className={`w-full text-left px-6 py-4 rounded-xl flex items-center gap-3 font-bold text-sm admin-item ${adminTab==='settings'?'active bg-slate-900':''}`}><Settings className="w-5 h-5"/>Configuración</button>
                                    </>
                                )}
                            </nav>
                            <div className="p-6 border-t border-slate-800"><button onClick={()=>setView('store')} className="w-full py-4 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition font-bold text-sm flex items-center justify-center gap-2 group"><LogOut className="w-4 h-4 group-hover:-translate-x-1 transition"/> Salir</button></div>
                        </div>

                        {/* Main Area */}
                        <div className="flex-1 bg-[#050505] p-6 md:p-10 overflow-y-auto relative bg-grid w-full">
                            {/* Botón menú móvil */}
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800"><Menu className="w-6 h-6"/></button>

                            {adminTab === 'dashboard' && (
                                <div className="max-w-7xl mx-auto animate-fade-up space-y-8">
                                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4 md:mb-8 neon-text">Panel de Control</h1>
                                    {/* Grilla responsiva */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                        <div className="glass p-6 md:p-8 rounded-[2rem] border-t-4 border-t-cyan-500"><p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Ingresos Totales</p><p className="text-3xl md:text-4xl font-black text-white">${revenue.toLocaleString()}</p></div>
                                        <div className="glass p-6 md:p-8 rounded-[2rem] border-t-4 border-t-purple-500"><p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Pedidos</p><p className="text-3xl md:text-4xl font-black text-white">{orders.length}</p></div>
                                        <div className="glass p-6 md:p-8 rounded-[2rem] border-t-4 border-t-green-500"><p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Clientes</p><p className="text-3xl md:text-4xl font-black text-white">{users.length}</p></div>
                                        <div className="glass p-6 md:p-8 rounded-[2rem] border-t-4 border-t-red-500"><p className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">Stock Crítico</p><p className="text-3xl md:text-4xl font-black text-white">{products.filter(p=>p.stock<5).length}</p></div>
                                    </div>
                                </div>
                            )}
                            
                            {adminTab === 'orders' && (<div className="max-w-7xl mx-auto animate-fade-up"><h1 className="text-4xl font-black text-white mb-8">Pedidos</h1>{orders.length === 0 ? <EmptyState icon={ShoppingBag} title="Sin Pedidos" text="Aún no hay ventas registradas."/> : (<div className="space-y-4">{orders.map(o => (<div key={o.id} onClick={()=>setSelectedOrder(o)} className="glass p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition hover:bg-slate-900/50"><div className="flex items-center gap-6"><div className={`w-12 h-12 rounded-full flex items-center justify-center ${o.status==='Realizado'?'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]':'bg-yellow-500/20 text-yellow-400'}`}><Package className="w-6 h-6"/></div><div><p className="font-bold text-white text-lg">{o.customer.name}</p><p className="text-sm text-slate-500 font-mono mt-1">{o.orderId} • {new Date(o.date).toLocaleDateString()}</p></div></div><div className="text-right"><p className="font-black text-white text-xl">${o.total.toLocaleString()}</p><span className={`text-xs px-3 py-1 rounded-full mt-2 inline-block font-bold ${o.status==='Realizado'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{o.status}</span></div></div>))}</div>)}</div>)}
                            {adminTab === 'suppliers' && (<div className="max-w-5xl mx-auto space-y-8 animate-fade-up"><div className="flex justify-between items-center"><h1 className="text-3xl font-black text-white">Proveedores</h1><button onClick={()=>setShowSupplierModal(true)} className="neon-button text-white px-8 py-3 rounded-xl font-bold flex gap-2 shadow-lg"><Plus className="w-5 h-5"/> Nuevo Proveedor</button></div>{suppliers.length === 0 ? <EmptyState icon={Truck} title="Sin Proveedores" text="Gestiona tus proveedores y deudas aquí." action={()=>setShowSupplierModal(true)} actionText="Agregar Primero"/> : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{suppliers.map(s=><div key={s.id} className="glass border border-slate-800 p-8 rounded-[2rem] hover:transform hover:-translate-y-1 transition duration-300"><h3 className="text-2xl font-bold text-white mb-1">{s.name}</h3><p className="text-slate-400 text-sm mb-6 flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p><div className="flex justify-between text-sm border-t border-slate-800 pt-6"><span className="text-red-400 font-black text-lg">Deuda: ${s.debt}</span></div></div>)}</div>}</div>)}
                            {adminTab === 'stats' && (<div className="max-w-6xl mx-auto space-y-8 animate-fade-up"><h1 className="text-3xl font-black text-white">Estadísticas</h1>{orders.length === 0 ? <EmptyState icon={PieChart} title="Sin Datos" text="Necesitas ventas para generar gráficos."/> : <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="glass p-8 rounded-[2rem]"><h3 className="font-bold text-white mb-8 text-xl">Ventas Semanales</h3><div className="flex items-end justify-between h-48 gap-3">{[45, 75, 35, 85, 55, 95, 65].map((h,i)=><div key={i} className="w-full bg-gradient-to-t from-cyan-900 to-cyan-500 rounded-t-lg bar hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{height:`${h}%`}}></div>)}</div></div><div className="glass p-8 rounded-[2rem]"><h3 className="font-bold text-white mb-6 text-xl">Top Productos</h3>{products.slice(0,3).map((p,i)=><div key={p.id} className="flex justify-between items-center mb-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800"><div className="flex items-center gap-4"><span className={`font-black text-lg w-8 ${i===0?'text-yellow-400':i===1?'text-slate-400':'text-orange-700'}`}>#{i+1}</span><span className="text-white font-bold">{p.name}</span></div><span className="text-cyan-400 font-bold">{12-i} ventas</span></div>)}</div></div>}</div>)}
                            
                            {/* --- EQUIPO MEJORADO --- */}
                            {adminTab === 'employees' && (
                                <div className="max-w-4xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8">Equipo</h1>
                                    <div className="glass p-8 md:p-10 rounded-[2rem] mb-8 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                                        <h3 className="font-bold text-white mb-6 text-xl">Agregar Miembro</h3>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <input className="flex-1 input-cyber p-4" placeholder="Email del usuario registrado" value={newTeamMember.email} onChange={e=>setNewTeamMember({...newTeamMember, email:e.target.value})}/>
                                            <select className="input-cyber p-4 md:w-48" value={newTeamMember.role} onChange={e=>setNewTeamMember({...newTeamMember, role:e.target.value})}>
                                                <option value="employee">Empleado (Solo Ver)</option>
                                                <option value="admin">Administrador (Total)</option>
                                            </select>
                                            <button onClick={addTeamMemberFn} className="px-8 py-4 md:py-0 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30 transition">Invitar</button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4">* El usuario debe estar registrado en la tienda primero.</p>
                                    </div>
                                    <div className="grid gap-4">
                                        {settings.team?.map((member, i) => (
                                            <div key={i} className={`glass p-6 rounded-2xl flex justify-between items-center border-l-4 ${member.role === 'admin' ? 'border-l-purple-500' : 'border-l-slate-500'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${member.role === 'admin' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                        {member.email[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-200 font-bold block">{member.email}</span>
                                                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">{member.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
                                                    </div>
                                                </div>
                                                {member.email !== 'lautarocorazza63@gmail.com' && <button onClick={()=>removeTeamMemberFn(member.email)} className="p-2 hover:bg-red-900/20 rounded-lg text-red-400 transition"><Trash2 className="w-5 h-5"/></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'budget' && (<div className="max-w-7xl mx-auto animate-fade-up"><div className="flex items-center gap-2 mb-8"><h1 className="text-3xl font-black text-white">Presupuestos</h1></div><div className="grid lg:grid-cols-3 gap-8"><div className="lg:col-span-2 glass p-8 rounded-[2rem]"><h3 className="font-bold text-white mb-6 text-xl">Nueva Cotización</h3><div className="flex gap-4 mb-6"><input className="flex-1 input-cyber p-4" placeholder="Cliente" value={quoteClient.name} onChange={e=>setQuoteClient({...quoteClient, name:e.target.value})}/><input className="flex-1 input-cyber p-4" placeholder="Teléfono" value={quoteClient.phone} onChange={e=>setQuoteClient({...quoteClient, phone:e.target.value})}/></div><div className="mb-6"><input className="w-full input-cyber p-4 mb-3" placeholder="Buscar producto..." value={posSearch} onChange={e=>setPosSearch(e.target.value)}/><div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">{products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).slice(0,5).map(p=><button key={p.id} onClick={()=>addToQuote(p)} className="flex-shrink-0 bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-xs text-white hover:bg-slate-800 transition font-bold">{p.name} ${p.basePrice}</button>)}</div></div><div className="space-y-2 mb-6 bg-slate-900/50 p-4 rounded-2xl min-h-[120px] border border-slate-800/50">{quoteCart.map(i=><div key={i.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800"><span className="text-white font-bold text-sm">{i.name} <span className="text-slate-500 ml-2">x{i.qty}</span></span><span className="font-black text-cyan-400">${i.basePrice*i.qty}</span></div>)}</div><div className="flex justify-end gap-6 items-center pt-6 border-t border-slate-700"><span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Descuento %</span><input className="w-20 input-cyber p-3 text-center font-bold" type="number" value={quoteDiscount} onChange={e=>setQuoteDiscount(Number(e.target.value))}/><button onClick={saveQuote} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition">Guardar</button></div></div><div className="glass p-6 rounded-[2rem] h-[600px] flex flex-col"><h3 className="font-bold text-white mb-6 text-xl">Historial</h3><div className="flex-1 overflow-y-auto space-y-4 pr-2">{quotes.length === 0 ? <p className="text-slate-500 text-sm text-center mt-20">Sin presupuestos guardados</p> : quotes.map(q=><div key={q.id} className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-blue-500/30 transition group"><div className="flex justify-between mb-2"><span className="font-bold text-white">{q.clientName}</span><span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${q.status==='Convertido'?'bg-green-900/30 text-green-400':'bg-yellow-900/30 text-yellow-400'}`}>{q.status}</span></div><div className="flex justify-between items-center"><span className="font-mono text-slate-300 font-bold">${q.total}</span><div className="flex gap-2">{q.status!=='Convertido'&&<button onClick={()=>convertQuote(q)} className="text-xs bg-green-600 px-3 py-1.5 rounded-lg text-white font-bold shadow-lg hover:bg-green-500 transition opacity-0 group-hover:opacity-100">VENDER</button>}<button onClick={()=>deleteQuoteFn(q.id)} className="text-slate-600 hover:text-red-500 transition"><Trash2 className="w-4 h-4"/></button></div></div></div>)}</div></div></div></div>)}
                            
                            {adminTab === 'products' && (
                                <div className="max-w-7xl mx-auto animate-fade-up">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                        <h1 className="text-4xl font-black text-white neon-text">Inventario</h1>
                                        {/* Solo ADMIN puede agregar productos */}
                                        {isAdmin(currentUser?.email) && (
                                            <button onClick={()=>{setNewProduct({name:'',basePrice:'',stock:'',category:'',image:'',description:'',discount:0});setEditingId(null);setShowProductForm(true)}} className="neon-button text-white px-8 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg w-full md:w-auto justify-center"><Plus className="w-5 h-5"/> Nuevo Producto</button>
                                        )}
                                    </div>
                                    {showProductForm && isAdmin(currentUser?.email) && (<div className="glass p-8 rounded-[2rem] mb-10 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]"><div className="grid md:grid-cols-2 gap-8 mb-6"><div className="space-y-4"><input className="w-full input-cyber p-4" placeholder="Nombre del Producto" value={newProduct.name} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/><div className="grid grid-cols-2 gap-4"><input className="w-full input-cyber p-4" type="number" placeholder="Precio ($)" value={newProduct.basePrice} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/><input className="w-full input-cyber p-4" type="number" placeholder="Stock" value={newProduct.stock} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/></div><select className="w-full input-cyber p-4" value={newProduct.category} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}><option value="">Categoría...</option>{settings.categories.map(c=><option key={c} value={c}>{c}</option>)}</select></div><div className="space-y-4"><input className="w-full input-cyber p-4 text-xs" type="file" ref={fileInputRef} onChange={handleImage}/><div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700"><Tag className="w-5 h-5 text-red-400"/><input className="bg-transparent text-white outline-none w-full font-bold" type="number" placeholder="% Descuento Oferta" value={newProduct.discount} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/></div><textarea className="w-full h-24 input-cyber p-4 resize-none" placeholder="Descripción breve..." value={newProduct.description} onChange={e=>setNewProduct({...newProduct,description:e.target.value})}/></div></div><div className="flex justify-end gap-4"><button onClick={()=>setShowProductForm(false)} className="text-slate-400 hover:text-white font-bold px-6 py-3">Cancelar</button><button onClick={saveProductFn} className="bg-cyan-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-cyan-500 transition">Guardar Producto</button></div></div>)}
                                    
                                    <div className="grid gap-4">
                                        {products.map(p => (
                                            <div key={p.id} className="glass p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between hover:border-cyan-500/50 hover:bg-slate-900/40 transition group gap-4">
                                                <div className="flex items-center gap-6 w-full md:w-auto">
                                                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg"><img src={p.image} className="max-h-full max-w-full object-contain"/></div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg group-hover:text-cyan-300 transition">{p.name}</p>
                                                        <p className="text-sm text-slate-500 font-medium bg-slate-900 px-2 py-0.5 rounded-md w-fit mt-1">{p.category} • Stock: {p.stock}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between w-full md:w-auto gap-8">
                                                    <span className="font-mono font-black text-white text-xl">${p.basePrice}</span>
                                                    {/* Solo ADMIN puede editar/borrar */}
                                                    {isAdmin(currentUser?.email) ? (
                                                        <div className="flex gap-3">
                                                            <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-3 bg-slate-800 rounded-xl text-cyan-400 hover:bg-cyan-900/30 transition border border-slate-700 hover:border-cyan-500/50"><Edit className="w-5 h-5"/></button>
                                                            <button onClick={()=>deleteProductFn(p)} className="p-3 bg-slate-800 rounded-xl text-red-400 hover:bg-red-900/30 transition border border-slate-700 hover:border-red-500/50"><Trash2 className="w-5 h-5"/></button>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-900 px-3 py-1 rounded text-xs text-slate-500 flex gap-1 items-center"><Eye className="w-3 h-3"/> Solo Lectura</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- CUPONES MEJORADO --- */}
                            {adminTab === 'coupons' && (
                                <div className="max-w-5xl mx-auto animate-fade-up">
                                    <h1 className="text-3xl font-black text-white mb-8 neon-text">Cupones</h1>
                                    <div className="glass p-8 rounded-[2rem] mb-10 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                        <h3 className="font-bold text-white mb-6 text-xl">Crear Nuevo Cupón</h3>
                                        <div className="grid md:grid-cols-4 gap-6 mb-6">
                                            <input className="input-cyber p-4 uppercase font-black text-purple-400 tracking-widest" placeholder="CÓDIGO (EJ: VIP)" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon, code:e.target.value.toUpperCase()})}/>
                                            <input className="input-cyber p-4" type="number" placeholder="% Desc" value={newCoupon.discountPercentage} onChange={e=>setNewCoupon({...newCoupon, discountPercentage:e.target.value})}/>
                                            <input className="input-cyber p-4" type="number" placeholder="Límite Usos" value={newCoupon.usageLimit} onChange={e=>setNewCoupon({...newCoupon, usageLimit:e.target.value})}/>
                                            <input className="input-cyber p-4 text-xs" type="date" value={newCoupon.expirationDate} onChange={e=>setNewCoupon({...newCoupon, expirationDate:e.target.value})}/>
                                        </div>
                                        <div className="mb-6">
                                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Destinatario</label>
                                            <div className="flex flex-col md:flex-row gap-4">
                                                <div className="flex gap-2">
                                                    <button onClick={()=>setNewCoupon({...newCoupon, targetType: 'global'})} className={`px-4 py-3 rounded-xl border font-bold transition flex-1 ${newCoupon.targetType === 'global' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>Global</button>
                                                    <button onClick={()=>setNewCoupon({...newCoupon, targetType: 'individual'})} className={`px-4 py-3 rounded-xl border font-bold transition flex-1 ${newCoupon.targetType === 'individual' ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>Individual</button>
                                                </div>
                                                {newCoupon.targetType === 'individual' && (
                                                    <input className="flex-1 input-cyber p-3 animate-fade-up" placeholder="Email del usuario específico..." value={newCoupon.targetUser} onChange={e=>setNewCoupon({...newCoupon, targetUser:e.target.value})}/>
                                                )}
                                            </div>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/30 transition text-lg">Generar Cupón</button>
                                    </div>
                                    <div className="flex gap-6 mb-8 border-b border-slate-800 pb-4 overflow-x-auto">
                                        <button onClick={()=>setCouponTab('global')} className={`font-bold pb-2 border-b-2 text-lg transition whitespace-nowrap ${couponTab==='global'?'text-white border-purple-500 neon-text':'text-slate-500 border-transparent'}`}>Globales</button>
                                        <button onClick={()=>setCouponTab('individual')} className={`font-bold pb-2 border-b-2 text-lg transition whitespace-nowrap ${couponTab==='individual'?'text-white border-purple-500 neon-text':'text-slate-500 border-transparent'}`}>Individuales</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {coupons.filter(c => couponTab === 'global' ? !c.targetUser : c.targetUser).map(c => (
                                            <div key={c.id} className="glass p-6 rounded-2xl flex flex-col justify-between group hover:border-purple-500/50 transition relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-black text-2xl text-white tracking-widest">{c.code}</p>
                                                        {c.targetUser && <span className="text-[10px] bg-purple-900/50 px-2 py-1 rounded text-purple-300 truncate max-w-[100px] block" title={c.targetUser}>{c.targetUser}</span>}
                                                    </div>
                                                    <p className="text-purple-400 font-bold text-lg mb-4">{c.discountPercentage}% OFF</p>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-slate-500 text-xs font-bold uppercase">{c.usedBy?.length || 0} / {c.usageLimit} Usos</p>
                                                        <button onClick={()=>deleteCouponFn(c.id)} className="p-2 bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition"><Trash2 className="w-5 h-5"/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {adminTab === 'balance' && (<div className="max-w-6xl mx-auto animate-fade-up"><div className="flex flex-col md:flex-row justify-between mb-8 gap-4"><h1 className="text-3xl font-black text-white neon-text">Balance Financiero</h1><div className="flex gap-4"><button onClick={()=>setShowPosModal(true)} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-green-500 transition justify-center flex-1 md:flex-none"><Plus className="w-5 h-5"/> Nueva Venta</button><button onClick={()=>setExpenseModalMode('selection')} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center shadow-lg hover:bg-red-500 transition justify-center flex-1 md:flex-none"><Minus className="w-5 h-5"/> Nuevo Gasto</button></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10"><div className="glass p-8 rounded-[2rem] text-center border-t-4 border-t-green-500"><p className="text-slate-400 text-sm font-bold uppercase mb-2 tracking-widest">Entradas Totales</p><p className="text-5xl font-black text-white neon-text">+${revenue.toLocaleString()}</p></div><div className="glass p-8 rounded-[2rem] text-center border-t-4 border-t-red-500"><p className="text-slate-400 text-sm font-bold uppercase mb-2 tracking-widest">Salidas Totales</p><p className="text-5xl font-black text-white">-${expensesTotal.toLocaleString()}</p></div></div><div className="glass border border-slate-800 rounded-[2rem] overflow-hidden"><div className="p-6 border-b border-slate-800"><h3 className="font-bold text-white text-lg">Historial de Movimientos</h3></div>{expenses.map(e=><div key={e.id} className="p-5 border-b border-slate-800 flex justify-between items-center hover:bg-slate-900/50 transition"><div><p className="font-bold text-white">{e.description}</p><p className="text-xs text-slate-500 mt-1 flex items-center gap-2">{e.date} {e.details && <span className="bg-slate-800 px-2 rounded-full text-[10px] text-slate-400 max-w-[200px] truncate block">{e.details}</span>}</p></div><span className="text-red-400 font-bold font-mono text-lg">-${e.amount.toLocaleString()}</span></div>)}</div></div>)}
                            {adminTab === 'settings' && (<div className="max-w-5xl mx-auto space-y-8 animate-fade-up"><h1 className="text-3xl font-black text-white neon-text">Configuración</h1><div className="glass p-10 rounded-[2rem] border border-slate-800"><label className="text-slate-400 font-bold mb-3 block uppercase tracking-wider text-sm">Información "Sobre Nosotros"</label><textarea className="w-full h-48 input-cyber p-5 resize-none leading-relaxed text-lg" value={aboutText} onChange={e=>setAboutText(e.target.value)}/><button onClick={saveSettingsFn} className="mt-6 bg-cyan-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-cyan-500 transition">Guardar Cambios</button></div><div className="glass p-10 rounded-[2rem] border border-slate-800"><label className="text-slate-400 font-bold mb-4 block uppercase tracking-wider text-sm">Categorías de Productos</label><div className="flex gap-4 mb-6"><input className="flex-1 input-cyber p-4" placeholder="Nueva categoría..." value={newCategory} onChange={e=>setNewCategory(e.target.value)}/><button onClick={addCategoryFn} className="bg-blue-600 px-8 rounded-xl text-white font-bold shadow-lg hover:bg-blue-500 transition">Añadir</button></div><div className="flex flex-wrap gap-3">{tempSettings.categories.map(c=><span key={c} className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-xl text-sm text-slate-300 flex items-center gap-3 font-bold">{c} <button onClick={()=>removeCategoryFn(c)} className="hover:text-red-400 transition"><X className="w-4 h-4"/></button></span>)}</div></div></div>)}
                        </div>
                        {/* Modales Admin Extra */}
                        {showSupplierModal && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-up"><div className="glass p-10 rounded-[2.5rem] w-full max-w-md border border-slate-700 shadow-2xl"><h3 className="text-2xl font-black text-white mb-8 neon-text">Nuevo Proveedor</h3><div className="space-y-5"><input className="w-full input-cyber p-4" placeholder="Nombre Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier, name:e.target.value})}/><input className="w-full input-cyber p-4" placeholder="Nombre Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier, contact:e.target.value})}/><input className="w-full input-cyber p-4" type="number" placeholder="Deuda Inicial ($)" value={newSupplier.debt} onChange={e=>setNewSupplier({...newSupplier, debt:Number(e.target.value)})}/></div><div className="flex gap-4 mt-8"><button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition">Cancelar</button><button onClick={saveSupplierFn} className="flex-1 py-4 neon-button rounded-xl font-bold text-white shadow-lg">Guardar</button></div></div></div>
                        )}
                        
                        {/* NUEVO SISTEMA MODAL DE GASTOS */}
                        {expenseModalMode !== 'closed' && (
                            <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-up">
                                
                                {/* MODAL 1: SELECCIÓN */}
                                {expenseModalMode === 'selection' && (
                                    <div className="glass p-10 rounded-[2.5rem] w-full max-w-2xl border border-slate-700 shadow-2xl text-center">
                                        <h3 className="text-3xl font-black text-white mb-8 neon-text">Selecciona Tipo de Gasto</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <button onClick={()=>setExpenseModalMode('purchase')} className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-900/20 transition group">
                                                <div className="w-20 h-20 bg-cyan-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-400 group-hover:scale-110 transition"><Package className="w-10 h-10"/></div>
                                                <h4 className="text-xl font-bold text-white mb-2">Compra de Mercadería</h4>
                                                <p className="text-slate-400 text-sm">Reponer stock, agregar productos nuevos e inventario.</p>
                                            </button>
                                            <button onClick={()=>setExpenseModalMode('general')} className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-red-500 hover:bg-red-900/20 transition group">
                                                <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-400 group-hover:scale-110 transition"><Wallet className="w-10 h-10"/></div>
                                                <h4 className="text-xl font-bold text-white mb-2">Otros Gastos</h4>
                                                <p className="text-slate-400 text-sm">Servicios, alquiler, mantenimiento y gastos generales.</p>
                                            </button>
                                        </div>
                                        <button onClick={()=>setExpenseModalMode('closed')} className="mt-8 text-slate-500 hover:text-white font-bold transition">Cancelar</button>
                                    </div>
                                )}

                                {/* MODAL 2: GASTO GENERAL (ANTIGUO) */}
                                {expenseModalMode === 'general' && (
                                    <div className="glass p-10 rounded-[2.5rem] w-full max-w-md border border-slate-700 shadow-2xl">
                                        <h3 className="text-2xl font-black text-white mb-8 text-red-400">Registrar Gasto General</h3>
                                        <div className="space-y-5">
                                            <input className="w-full input-cyber p-4" placeholder="Descripción (Ej: Alquiler, Luz)" value={newExpense.description} onChange={e=>setNewExpense({...newExpense, description:e.target.value})}/>
                                            <input className="w-full input-cyber p-4" type="number" placeholder="Monto Total ($)" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense, amount:e.target.value})}/>
                                        </div>
                                        <div className="flex gap-4 mt-8">
                                            <button onClick={()=>setExpenseModalMode('selection')} className="flex-1 py-4 text-slate-400 font-bold hover:text-white transition">Volver</button>
                                            <button onClick={saveGeneralExpenseFn} className="flex-1 py-4 bg-red-600 rounded-xl font-bold text-white shadow-lg hover:bg-red-500 transition">Registrar</button>
                                        </div>
                                    </div>
                                )}

                                {/* MODAL 3: COMPRA DE MERCADERÍA (MEJORADO) */}
                                {expenseModalMode === 'purchase' && (
                                    <div className="bg-[#0a0a0a] w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-[2.5rem] border border-cyan-500/20 shadow-2xl flex flex-col overflow-hidden animate-fade-up">
                                        <div className="p-6 border-b border-slate-800 bg-[#050505] flex justify-between items-center">
                                            <h3 className="text-2xl font-black text-white flex items-center gap-3"><Package className="text-cyan-400"/> Compra de Stock</h3>
                                            <button onClick={handleCloseExpenseModal} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="w-6 h-6"/></button>
                                        </div>
                                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                            {/* Lado Izquierdo: Formulario */}
                                            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto border-r border-slate-800">
                                                
                                                {/* BUSCADOR DE PRODUCTOS EXISTENTES */}
                                                <div className="mb-8 relative">
                                                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-3 focus-within:border-cyan-500 transition">
                                                        <Search className="text-slate-500 w-5 h-5 mr-2"/>
                                                        <input className="bg-transparent text-white outline-none w-full text-sm font-bold" placeholder="Buscar producto existente..." value={productSearchTerm} onChange={e=>setProductSearchTerm(e.target.value)}/>
                                                    </div>
                                                    {productSearchTerm.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl mt-2 z-50 max-h-60 overflow-y-auto shadow-2xl">
                                                            {products.filter(p=>p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                                                                <div key={p.id} onClick={()=>selectExistingProduct(p)} className="p-3 hover:bg-slate-800 cursor-pointer flex items-center gap-3 border-b border-slate-800/50">
                                                                    <img src={p.image} className="w-8 h-8 rounded object-cover"/>
                                                                    <div><p className="text-white text-xs font-bold">{p.name}</p><p className="text-[10px] text-slate-500">Stock actual: {p.stock}</p></div>
                                                                </div>
                                                            ))}
                                                            {products.filter(p=>p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).length === 0 && <div className="p-3 text-xs text-slate-500 text-center">No encontrado. Crea uno nuevo abajo.</div>}
                                                        </div>
                                                    )}
                                                </div>

                                                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Detalle del Item</h4>
                                                <div className="space-y-5">
                                                    {newPurchaseItem.existingId && <div className="bg-cyan-900/20 border border-cyan-500/30 p-3 rounded-xl flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-cyan-400"/><span className="text-xs text-cyan-400 font-bold">Editando Producto Existente</span></div>}
                                                    
                                                    <input className="w-full input-cyber p-4" placeholder="Nombre del Producto" value={newPurchaseItem.name} onChange={e=>setNewPurchaseItem({...newPurchaseItem, name:e.target.value})}/>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="text-xs text-slate-500 font-bold ml-1 mb-1 block">Costo Unitario ($)</label>
                                                            <input className="w-full input-cyber p-4 border-l-4 border-l-red-500" type="number" placeholder="Costo" value={newPurchaseItem.costPrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, costPrice:e.target.value})}/>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-slate-500 font-bold ml-1 mb-1 block">Precio Venta ($)</label>
                                                            <input className="w-full input-cyber p-4 border-l-4 border-l-green-500" type="number" placeholder="Venta" value={newPurchaseItem.salePrice} onChange={e=>setNewPurchaseItem({...newPurchaseItem, salePrice:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input className="w-full input-cyber p-4" type="number" placeholder="Cantidad" value={newPurchaseItem.quantity} onChange={e=>setNewPurchaseItem({...newPurchaseItem, quantity:e.target.value})}/>
                                                        <div className="flex gap-2">
                                                            {!isAddingCategory ? (
                                                                <>
                                                                    <select className="flex-1 input-cyber p-4" value={newPurchaseItem.category} onChange={e=>setNewPurchaseItem({...newPurchaseItem, category:e.target.value})}>
                                                                        <option value="">Categoría...</option>
                                                                        {settings.categories.map(c=><option key={c} value={c}>{c}</option>)}
                                                                    </select>
                                                                    <button onClick={()=>setIsAddingCategory(true)} className="px-3 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition"><Plus className="w-5 h-5 text-white"/></button>
                                                                </>
                                                            ) : (
                                                                <div className="flex gap-2 w-full">
                                                                    <input className="flex-1 input-cyber p-4 text-sm" placeholder="Nueva Categoría" autoFocus value={quickCategoryName} onChange={e=>setQuickCategoryName(e.target.value)}/>
                                                                    <button onClick={createQuickCategory} className="px-3 bg-green-600 rounded-xl hover:bg-green-500"><CheckCircle className="w-5 h-5 text-white"/></button>
                                                                    <button onClick={()=>setIsAddingCategory(false)} className="px-3 bg-red-600 rounded-xl hover:bg-red-500"><X className="w-5 h-5 text-white"/></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <input className="text-xs text-slate-400 w-full" type="file" ref={purchaseFileInputRef} onChange={handlePurchaseImage}/>
                                                        </div>
                                                        {newPurchaseItem.image && <img src={newPurchaseItem.image} className="h-16 w-16 object-contain rounded bg-white p-1 border border-slate-700"/>}
                                                    </div>
                                                    <button onClick={addPurchaseItemToCart} className="w-full py-4 bg-slate-800 hover:bg-cyan-900/30 border border-slate-700 hover:border-cyan-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                                                        <Plus className="w-5 h-5"/> Agregar a la Lista
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Lado Derecho: Lista de Items */}
                                            <div className="w-full md:w-1/2 flex flex-col bg-slate-900/10">
                                                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Detalle de Compra</h4>
                                                    {purchaseCart.length === 0 ? (
                                                        <div className="text-center text-slate-600 mt-20">
                                                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                                            <p>Agrega productos para registrar la compra.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {purchaseCart.map(item => (
                                                                <div key={item.id} className="flex gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 items-center relative group">
                                                                    <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center"><img src={item.image || 'https://via.placeholder.com/150'} className="max-h-full max-w-full"/></div>
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold text-sm truncate">{item.name}</p>
                                                                        <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                                            <span className="text-green-400 font-bold">Venta: ${item.salePrice}</span>
                                                                            <span>Stock: +{item.quantity}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-red-400 font-bold text-sm">-${(item.costPrice * item.quantity).toLocaleString()}</p>
                                                                        <button onClick={()=>removePurchaseItem(item.id)} className="text-[10px] text-slate-500 hover:text-red-500 underline mt-1">Quitar</button>
                                                                    </div>
                                                                    {item.existingId && <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" title="Producto Existente"></div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-8 bg-[#050505] border-t border-slate-800">
                                                    <div className="flex justify-between items-end mb-6">
                                                        <span className="text-slate-400 font-bold text-sm uppercase">Total Gasto</span>
                                                        <span className="text-4xl font-black text-red-500">-${purchaseCart.reduce((a,i)=>a+(i.costPrice*i.quantity),0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <button onClick={()=>setExpenseModalMode('selection')} className="px-6 py-4 text-slate-500 font-bold hover:text-white transition">Atrás</button>
                                                        <button onClick={confirmPurchaseFn} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition flex items-center justify-center gap-2">
                                                            <Save className="w-5 h-5"/> Confirmar Compra e Ingreso
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}

                        {showPosModal && (
                            <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md"><div className="bg-[#0a0a0a] w-full max-w-6xl h-[90vh] rounded-[3rem] border border-green-500/20 flex flex-col overflow-hidden animate-fade-up shadow-[0_0_50px_rgba(0,0,0,0.8)]"><div className="p-8 border-b border-slate-800 flex justify-between items-center bg-[#050505]"><h2 className="text-3xl font-black text-white flex items-center gap-3"><Zap className="text-green-500 w-8 h-8"/> Punto de Venta <span className="text-slate-500 text-sm font-normal ml-2 tracking-widest uppercase">Sistema Rápido</span></h2><button onClick={()=>setShowPosModal(false)} className="p-3 bg-slate-900 rounded-full hover:bg-slate-800 transition"><X className="text-slate-400 w-6 h-6"/></button></div><div className="flex-1 flex overflow-hidden"><div className="w-3/4 p-8 border-r border-slate-800 overflow-y-auto"><input className="w-full input-cyber p-6 mb-8 text-xl font-bold" placeholder="🔍 Escanear o buscar producto..." autoFocus value={posSearch} onChange={e=>setPosSearch(e.target.value)}/><div className="grid grid-cols-4 gap-4">{products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())&&p.stock>0).slice(0,24).map(p=>(<div key={p.id} onClick={()=>addToPos(p)} className="bg-slate-900 p-4 rounded-2xl cursor-pointer hover:bg-slate-800 hover:border-green-500 border-2 border-transparent transition text-center group"><div className="h-28 w-full bg-white rounded-xl mb-3 overflow-hidden flex items-center justify-center p-2"><img src={p.image} className="max-h-full max-w-full object-contain"/></div><p className="font-bold text-white text-sm truncate group-hover:text-green-400 transition">{p.name}</p><p className="text-green-500 font-black text-lg">${p.basePrice}</p></div>))}</div></div><div className="w-1/4 p-8 bg-[#050505] flex flex-col border-l border-slate-800"><div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">{posCart.map(i=><div key={i.id} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800"><div><p className="text-white text-sm font-bold truncate w-32">{i.name}</p><p className="text-xs text-slate-500 mt-1">${i.basePrice} x {i.qty}</p></div><div className="flex items-center gap-3"><span className="text-green-400 font-bold">${i.basePrice*i.qty}</span><button onClick={()=>setPosCart(posCart.filter(x=>x.id!==i.id))} className="text-red-500 hover:text-red-400"><X className="w-5 h-5"/></button></div></div>)}</div><div className="border-t border-slate-800 pt-6"><div className="flex justify-between text-slate-400 mb-2 font-bold uppercase tracking-wider text-xs">Total a Cobrar</div><div className="flex justify-between text-4xl font-black text-white mb-8 neon-text"><span>Total</span><span>${posCart.reduce((a,i)=>a+(i.basePrice*i.qty),0).toLocaleString()}</span></div><button onClick={confirmPosSale} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-xl shadow-lg shadow-green-900/20 transition flex items-center justify-center gap-3">COBRAR <DollarSign className="w-6 h-6"/></button></div></div></div></div></div>
                        )}
                    </div>
                )}

                {/* MENU MOVIL */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[100] flex">
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={()=>setIsMenuOpen(false)}></div>
                        <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-up flex flex-col shadow-2xl">
                            <h2 className="text-3xl font-black text-white mb-10 neon-text">MENÚ</h2>
                            <div className="space-y-6 flex-1">
                                <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Home className="w-6 h-6"/> Inicio</button>
                                <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><ShoppingBag className="w-6 h-6"/> Carrito</button>
                                <button onClick={()=>{setView('guide');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><FileQuestion className="w-6 h-6"/> Cómo Comprar</button>
                                <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                                {/* Solo mostrar botón admin si es admin o empleado */}
                                {currentUser && hasAccess(currentUser.email) && <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-cyan-400 mt-8 pt-8 border-t border-slate-800 flex items-center gap-4"><Shield className="w-6 h-6"/> Admin Panel</button>}
                                {currentUser ? ( <button onClick={()=>{localStorage.removeItem('nexus_user_id'); localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store'); setIsMenuOpen(false);}} className="w-full text-left text-xl font-bold text-red-400 mt-4 flex items-center gap-4"><LogOut className="w-6 h-6"/> Cerrar Sesión</button> ) : ( <button onClick={()=>{setView('login');setIsMenuOpen(false)}} className="w-full text-left text-xl font-bold text-cyan-400 mt-4 flex items-center gap-4"><LogIn className="w-6 h-6"/> Iniciar Sesión</button> )}
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
