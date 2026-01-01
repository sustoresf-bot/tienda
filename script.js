import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    ShoppingBag, X, User, Search, Zap, CheckCircle, MessageCircle, Instagram, Minus, Heart, Tag, Plus, 
    Trash2, Edit, AlertTriangle, RefreshCw, Bot, Send, LogIn, LogOut, Mail, CreditCard, Menu, Home, 
    Info, FileQuestion, Users, Package, LayoutDashboard, Settings, Ticket, Truck, PieChart, Wallet, 
    FileText, ArrowRight, ArrowLeft, DollarSign, BarChart3, ChevronRight, TrendingUp, TrendingDown, 
    Briefcase, Calculator, Save, AlertCircle, Phone, MapPin, Copy, ExternalLink, Shield, Trophy, 
    ShoppingCart, Archive, Play, FolderPlus, Eye, Clock, Calendar, Gift, Lock, Loader2, Star, Percent, 
    Flame, Image as ImageIcon, Filter, ChevronDown, ChevronUp, CheckSquare, XCircle
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

// Configuración por defecto
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

// Toast Notification
const Toast = ({ message, type, onClose }) => {
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
        const t = setTimeout(onClose, 4000); 
        return () => clearTimeout(t); 
    }, [onClose]);
    
    return (
        <div className={containerClass}>
            <div className={iconContainerClass}>
                <IconComponent className="w-5 h-5"/>
            </div>
            <div>
                <p className="font-bold text-sm tracking-wide">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-white/50 hover:text-white transition">
                <X className="w-4 h-4"/>
            </button>
        </div>
    );
};

// Confirm Modal
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

// --- APLICACIÓN PRINCIPAL ---
function App() {
    // Estados Globales
    const [view, setView] = useState('store'); 
    const [adminTab, setAdminTab] = useState('dashboard');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    
    // Usuario
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

    // Datos
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState(() => { 
        try { 
            const saved = JSON.parse(localStorage.getItem('nexus_cart'));
            return Array.isArray(saved) ? saved : []; 
        } catch(e) { return []; } 
    });
    const [liveCarts, setLiveCarts] = useState([]); 
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // UI Store
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
    const [loginMode, setLoginMode] = useState(true);
    const [checkoutData, setCheckoutData] = useState({ address: '', city: '', province: '', zipCode: '', paymentChoice: '' });
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Estados Admin (Modificados para la petición)
    const [newProduct, setNewProduct] = useState({ 
        name: '', 
        basePrice: '', // Precio Venta
        costPrice: '', // Precio Compra (NUEVO)
        stock: '', 
        category: '', 
        image: '', 
        description: '', 
        discount: 0 
    });
    const [editingId, setEditingId] = useState(null);
    const [showProductForm, setShowProductForm] = useState(false);
    
    // Resto de estados Admin
    const [newCoupon, setNewCoupon] = useState({ 
        code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, 
        expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '', perUserLimit: 1, isActive: true
    });
    const [newSupplier, setNewSupplier] = useState({ 
        name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] 
    });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [aboutText, setAboutText] = useState('');
    const [tempSettings, setTempSettings] = useState(defaultSettings);
    const [newCategory, setNewCategory] = useState('');
    const [newTeamMember, setNewTeamMember] = useState({ email: '', role: 'employee', name: '' });
    const fileInputRef = useRef(null);

    // Helpers
    const showToast = (msg, type = 'info') => { 
        const id = Date.now(); 
        setToasts(prev => { 
            const filtered = prev.filter(t => Date.now() - t.id < 3000); 
            return [...filtered, { id, message: msg, type }]; 
        });
    };
    const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

    const getRole = (email) => {
        if (!email || !settings) return 'user';
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return 'admin';
        const team = settings.team || [];
        const member = team.find(m => m.email && m.email.trim().toLowerCase() === cleanEmail);
        return member ? member.role : 'user';
    };
    const isAdmin = (email) => getRole(email) === 'admin';
    const hasAccess = (email) => ['admin', 'employee'].includes(getRole(email));

    // Firebase Effects
    useEffect(() => {
        localStorage.setItem('nexus_cart', JSON.stringify(cart));
        if (currentUser?.id) {
            const syncCart = async () => {
                try {
                    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name,
                        items: cart.map(item => ({
                            productId: item.product.id,
                            quantity: item.quantity,
                            name: item.product.name,
                            price: item.product.basePrice
                        })),
                        lastUpdated: new Date().toISOString()
                    });
                } catch (e) { console.error(e); }
            };
            const t = setTimeout(syncCart, 1500);
            return () => clearTimeout(t);
        }
    }, [cart, currentUser]);

    useEffect(() => { 
        if(currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
            setCheckoutData(prev => ({ 
                ...prev, 
                address: currentUser.address || prev.address, 
                city: currentUser.city || prev.city, 
                province: currentUser.province || prev.province, 
                zipCode: currentUser.zipCode || prev.zipCode 
            }));
        }
    }, [currentUser]);

    useEffect(() => { 
        signInAnonymously(auth).then(() => {
            // Refrescar usuario
             if (currentUser?.id) {
                getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id))
                    .then(s => s.exists() && setCurrentUser({...s.data(), id: s.id}))
                    .catch(console.warn);
            }
        });
        return onAuthStateChanged(auth, (user) => {
            setSystemUser(user);
            setTimeout(() => setIsLoading(false), 1000);
        }); 
    }, []);
    
    useEffect(() => {
        if(!systemUser) return;
        const subs = [
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.date) - new Date(a.date)))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), s => setUsers(s.docs.map(d => ({id: d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), s => setCoupons(s.docs.map(d => ({id: d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), s => setSuppliers(s.docs.map(d => ({id: d.id, ...d.data()})))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'carts'), s => setLiveCarts(s.docs.map(d => ({id: d.id, ...d.data()})).filter(c => c.items?.length > 0))),
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), s => { 
                if(!s.empty) { 
                    const d = s.docs[0].data(); 
                    const merged = { ...defaultSettings, ...d, team: d.team || defaultSettings.team, categories: d.categories || defaultSettings.categories };
                    setSettings(merged); setTempSettings(merged); setAboutText(d.aboutUsText || defaultSettings.aboutUsText); 
                } else {
                    addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), defaultSettings); 
                }
            })
        ];
        return () => subs.forEach(u => u());
    }, [systemUser]);

    // Auth Logic
    const handleAuth = async (isRegister) => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            if (isRegister) {
                if (!authData.name || authData.name.length < 3) throw new Error("Nombre muy corto.");
                if (!authData.email.includes('@')) throw new Error("Email inválido.");
                if (authData.password.length < 6) throw new Error("Contraseña mín 6 caracteres.");
                
                const qEmail = query(usersRef, where("email", "==", authData.email));
                if (!(await getDocs(qEmail)).empty) throw new Error("Email ya registrado.");

                const newUser = { ...authData, role: 'user', joinDate: new Date().toISOString(), favorites: [], ordersCount: 0 };
                const ref = await addDoc(usersRef, newUser);
                setCurrentUser({ ...newUser, id: ref.id });
                showToast("Cuenta creada", "success");
            } else {
                let q = query(usersRef, where("email", "==", authData.email), where("password", "==", authData.password));
                let snap = await getDocs(q);
                if (snap.empty) {
                    q = query(usersRef, where("username", "==", authData.email), where("password", "==", authData.password));
                    snap = await getDocs(q);
                }
                if (snap.empty) throw new Error("Credenciales incorrectas.");
                setCurrentUser({ ...snap.docs[0].data(), id: snap.docs[0].id });
                showToast("Bienvenido", "success");
            }
            setView('store');
            setAuthData({ email: '', password: '', name: '', username: '', dni: '', phone: '' });
        } catch (error) { showToast(error.message, "error"); } 
        finally { setIsLoading(false); }
    };

    // Store Logic
    const toggleFavorite = async (product) => {
        if (!currentUser) return showToast("Inicia sesión para guardar.", "info");
        const currentFavs = currentUser.favorites || [];
        const isFav = currentFavs.includes(product.id);
        const newFavs = isFav ? currentFavs.filter(id => id !== product.id) : [...currentFavs, product.id];
        
        setCurrentUser(prev => ({ ...prev, favorites: newFavs }));
        try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { favorites: newFavs }); } catch(e){}
        showToast(isFav ? "Eliminado de favoritos" : "Guardado en favoritos", "info");
    };

    const manageCart = (product, quantityDelta) => {
        setCart(prev => {
            const idx = prev.findIndex(item => item.product.id === product.id);
            const currentQty = idx >= 0 ? prev[idx].quantity : 0;
            const newQty = currentQty + quantityDelta;
            
            if (newQty > Number(product.stock)) {
                showToast(`Stock limitado: solo quedan ${product.stock}`, "warning");
                return prev;
            }
            if (newQty <= 0) return prev.filter(item => item.product.id !== product.id);
            
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], quantity: newQty };
                return updated;
            }
            showToast("Agregado al carrito", "success");
            return [...prev, { product, quantity: 1 }];
        });
    };

    const calculateItemPrice = (basePrice, discount) => {
        if (!discount || discount <= 0) return Number(basePrice);
        return Math.ceil(Number(basePrice) * (1 - discount / 100));
    };

    // Cálculo Completo de Totales
    const cartSubtotal = useMemo(() => cart.reduce((total, item) => total + (calculateItemPrice(item.product.basePrice, item.product.discount) * item.quantity), 0), [cart]);
    
    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        let val = 0;
        if (appliedCoupon.type === 'fixed') val = appliedCoupon.value;
        else val = cartSubtotal * (appliedCoupon.value / 100);
        
        if (appliedCoupon.maxDiscount && val > appliedCoupon.maxDiscount) val = appliedCoupon.maxDiscount;
        return Math.min(val, cartSubtotal);
    }, [cartSubtotal, appliedCoupon]);

    const finalTotal = Math.max(0, cartSubtotal - discountAmount);
    // Selección de Cupón
    const selectCoupon = (coupon) => {
        if (new Date(coupon.expirationDate) < new Date()) return showToast("Cupón vencido.", "error");
        if (coupon.usageLimit && (coupon.usedBy?.length || 0) >= coupon.usageLimit) return showToast("Cupón agotado.", "error");
        if (cartSubtotal < (coupon.minPurchase || 0)) return showToast(`Compra mínima: $${coupon.minPurchase}.`, "warning");
        
        setAppliedCoupon(coupon);
        setShowCouponModal(false);
        showToast("Cupón aplicado", "success");
    };

    // 5. Confirmación de Pedido (Checkout)
    const confirmOrder = async () => {
        if (isProcessingOrder) return;
        if (!currentUser) { setView('login'); return showToast("Inicia sesión para comprar.", "info"); }
        if (!checkoutData.address || !checkoutData.city || !checkoutData.province) return showToast("Completa la dirección.", "warning");
        if (!checkoutData.paymentChoice) return showToast("Elige método de pago.", "warning");

        setIsProcessingOrder(true);
        showToast("Procesando...", "info");

        try {
            const orderId = `ORD-${Date.now().toString().slice(-6)}`; 
            const newOrder = { 
                orderId,
                userId: currentUser.id, 
                customer: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone || '', dni: currentUser.dni || '' }, 
                items: cart.map(i => ({ 
                    productId: i.product.id, 
                    title: i.product.name, 
                    quantity: i.quantity, 
                    unit_price: calculateItemPrice(i.product.basePrice, i.product.discount),
                    original_price: Number(i.product.basePrice),
                    cost_price: Number(i.product.costPrice || 0), // Guardar costo histórico
                    image: i.product.image 
                })), 
                subtotal: cartSubtotal, 
                discount: discountAmount,
                total: finalTotal, 
                discountCode: appliedCoupon?.code || null, 
                status: 'Pendiente', 
                date: new Date().toISOString(), 
                shippingAddress: `${checkoutData.address}, ${checkoutData.city}, ${checkoutData.province} (CP: ${checkoutData.zipCode})`, 
                paymentMethod: checkoutData.paymentChoice,
                lastUpdate: new Date().toISOString()
            };
            
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.id), { 
                address: checkoutData.address, city: checkoutData.city, province: checkoutData.province, zipCode: checkoutData.zipCode,
                ordersCount: increment(1)
            });
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'carts', currentUser.id), { userId: currentUser.id, items: [] });

            const batch = writeBatch(db);
            cart.forEach(item => {
                const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.product.id);
                batch.update(productRef, { stock: increment(-item.quantity) });
            });
            if (appliedCoupon) {
                const couponRef = doc(db, 'artifacts', appId, 'public', 'data', 'coupons', appliedCoupon.id);
                batch.update(couponRef, { usedBy: arrayUnion(currentUser.id) });
            }
            await batch.commit();

            setCart([]); setAppliedCoupon(null); setView('profile'); 
            showToast("¡Pedido exitoso!", "success");
        } catch(e) { 
            console.error(e); showToast("Error al procesar.", "error"); 
        } finally { setIsProcessingOrder(false); }
    };

    // --- FUNCIONES DE ADMINISTRACIÓN ---

    // [FIX] Guardar Producto (Con Costo y Validaciones)
    const saveProductFn = async () => {
        if (!newProduct.name) return showToast("Falta nombre.", "warning");
        if (!newProduct.basePrice || Number(newProduct.basePrice) <= 0) return showToast("Precio inválido.", "warning");
        if (!newProduct.category) return showToast("Elige categoría.", "warning");

        const productData = {
            ...newProduct, 
            basePrice: Number(newProduct.basePrice), 
            costPrice: Number(newProduct.costPrice || 0), // Nuevo campo Costo
            stock: Number(newProduct.stock), 
            discount: Number(newProduct.discount || 0), 
            image: newProduct.image || 'https://via.placeholder.com/150',
            lastUpdated: new Date().toISOString()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), productData);
                showToast("Producto actualizado.", "success");
            } else {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, createdAt: new Date().toISOString() });
                showToast("Producto creado.", "success");
            }
            setNewProduct({ name: '', basePrice: '', costPrice: '', stock: '', category: '', image: '', description: '', discount: 0 }); 
            setEditingId(null); setShowProductForm(false);
        } catch(e) { showToast("Error al guardar.", "error"); }
    };

    // [FIX] Eliminar Producto (Implementación Real)
    const deleteProductFn = async (product) => {
        if (!window.confirm(`¿Eliminar definitivamente "${product.name}"?`)) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id));
            showToast("Producto eliminado.", "success");
        } catch (e) { showToast("Error al eliminar.", "error"); }
    };

    // [FEAT] Venta Local / Manual (Descontar Stock Directo)
    const sellProductLocally = async (product) => {
        const qtyStr = window.prompt(`Venta Local de "${product.name}".\nIngrese cantidad a descontar del stock:`, "1");
        if (!qtyStr) return;
        const qty = parseInt(qtyStr);
        if (isNaN(qty) || qty <= 0) return showToast("Cantidad inválida.", "warning");
        if (qty > product.stock) return showToast("No hay suficiente stock.", "error");

        try {
            const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id);
            await updateDoc(productRef, { stock: increment(-qty) });
            showToast(`Venta registrada. Stock descontado: -${qty}`, "success");
        } catch (e) { showToast("Error al registrar venta.", "error"); }
    };

    // [FEAT] Gestión de Pedidos: Finalizar y Eliminar
    const finalizeOrder = async (orderId) => {
        if (!window.confirm("¿Marcar pedido como FINALIZADO/ENTREGADO?")) return;
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId), { 
                status: 'Realizado', lastUpdate: new Date().toISOString() 
            });
            showToast("Pedido finalizado.", "success");
        } catch(e) { showToast("Error al actualizar.", "error"); }
    };

    const deleteOrder = async (orderId) => {
        if (!window.confirm("¿ELIMINAR este pedido permanentemente? Esta acción no se puede deshacer.")) return;
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId));
            showToast("Pedido eliminado del historial.", "success");
            setSelectedOrder(null); // Cerrar modal si estaba abierto
        } catch(e) { showToast("Error al eliminar.", "error"); }
    };

    // Funciones Auxiliares Admin (Cupones, Proveedores, Settings)
    const saveCouponFn = async () => {
        if (!newCoupon.code || newCoupon.code.length < 3) return showToast("Código muy corto.", "warning");
        try {
            const data = { 
                ...newCoupon, code: newCoupon.code.toUpperCase().trim(), value: Number(newCoupon.value), 
                minPurchase: Number(newCoupon.minPurchase || 0), maxDiscount: Number(newCoupon.maxDiscount || 0), 
                usageLimit: Number(newCoupon.usageLimit || 0), createdAt: new Date().toISOString(), usedBy: [] 
            };
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'coupons'), data);
            setNewCoupon({ code: '', type: 'percentage', value: 0, minPurchase: 0, maxDiscount: 0, expirationDate: '', targetType: 'global', targetUser: '', usageLimit: '', perUserLimit: 1 }); 
            showToast("Cupón creado.", "success");
        } catch(e) { showToast("Error al crear cupón.", "error"); }
    };

    const saveSupplierFn = async () => { 
        if (!newSupplier.name) return showToast("Nombre obligatorio.", "warning");
        try {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'suppliers'), { ...newSupplier, createdAt: new Date().toISOString() }); 
            setNewSupplier({ name: '', contact: '', phone: '', ig: '', address: '', cuit: '', associatedProducts: [] }); 
            setShowSupplierModal(false); showToast("Proveedor guardado.", "success"); 
        } catch(e) { showToast("Error.", "error"); }
    };

    const saveSettingsFn = async () => { 
        if (!tempSettings) return;
        try {
            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
            const snap = await getDocs(q);
            const data = { ...tempSettings, aboutUsText: aboutText }; 
            if (!snap.empty) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', snap.docs[0].id), data); 
            else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), data); 
            setSettings(data); showToast("Configuración guardada.", 'success'); 
        } catch(e) { showToast("Error.", "error"); }
    };

    const addTeamMemberFn = () => { 
        if (!newTeamMember.email.includes('@')) return showToast("Email inválido.", "warning");
        if ((settings.team || []).some(m => m.email === newTeamMember.email)) return showToast("Ya existe.", "warning");
        setTempSettings(prev => ({ ...prev, team: [...(prev.team || []), newTeamMember] })); 
        setNewTeamMember({ email: '', role: 'employee', name: '' });
    };

    const removeTeamMemberFn = (email) => {
        if (email === SUPER_ADMIN_EMAIL) return showToast("No se puede eliminar al Super Admin.", "error");
        setTempSettings(prev => ({ ...prev, team: (prev.team || []).filter(m => m.email !== email) }));
    };

    const handleImage = (e, setter) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(prev => ({ ...prev, image: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    // --- DASHBOARD METRICS ---
    const dashboardMetrics = useMemo(() => {
        const productStats = {}; 
        
        // Live Carts Analysis
        (liveCarts || []).forEach(c => {
            if (Array.isArray(c.items)) {
                c.items.forEach(i => {
                    if (!productStats[i.productId]) productStats[i.productId] = { cart: 0, fav: 0, total: 0 };
                    productStats[i.productId].cart += 1;
                    productStats[i.productId].total += 1;
                });
            }
        });

        // Favorites Analysis
        (users || []).forEach(u => {
            if (Array.isArray(u.favorites)) {
                u.favorites.forEach(pid => {
                    if (!productStats[pid]) productStats[pid] = { cart: 0, fav: 0, total: 0 };
                    productStats[pid].fav += 1;
                    productStats[pid].total += 1;
                });
            }
        });

        const trendingProducts = Object.entries(productStats)
            .map(([id, stats]) => {
                const prod = products.find(p => p.id === id);
                return prod ? { ...prod, stats } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.stats.total - a.stats.total)
            .slice(0, 5);

        const revenue = orders.filter(o => o.status !== 'Cancelado').reduce((acc, o) => acc + (o.total || 0), 0);
        
        // Cálculo de Ganancia Real (Venta - Costo)
        const profit = orders.filter(o => o.status !== 'Cancelado').reduce((acc, o) => {
            const orderProfit = (o.items || []).reduce((itemAcc, item) => {
                const cost = item.cost_price || 0;
                const sale = item.unit_price || 0;
                return itemAcc + ((sale - cost) * item.quantity);
            }, 0);
            return acc + orderProfit;
        }, 0);

        const salesCount = {};
        orders.forEach(o => {
            if (o.status !== 'Cancelado') {
                (o.items || []).forEach(i => { salesCount[i.productId] = (salesCount[i.productId] || 0) + i.quantity; });
            }
        });
        
        let starProductId = null, maxSales = 0;
        Object.entries(salesCount).forEach(([id, count]) => { if (count > maxSales) { maxSales = count; starProductId = id; } });
        const starProduct = starProductId ? products.find(p => p.id === starProductId) : null;

        return { revenue, profit, trendingProducts, starProduct, salesCount, totalOrders: orders.length, totalUsers: users.length };
    }, [orders, products, liveCarts, users]);

    // --- MODALES UI ---
    
    // Modal Detalle Pedido
    const OrderDetailsModal = ({ order, onClose }) => {
        if (!order) return null;
        const canEdit = hasAccess(currentUser?.email); // Solo admins pueden ver controles

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl border border-slate-800 relative">
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2">PEDIDO <span className="text-cyan-400">#{order.orderId}</span></h3>
                            <p className="text-xs text-slate-400 font-mono mt-1">{new Date(order.date).toLocaleString()}</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 hover:text-white transition"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#050505]">
                        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-full ${order.status === 'Realizado' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {order.status === 'Realizado' ? <CheckCircle className="w-6 h-6"/> : <Clock className="w-6 h-6"/>}
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Estado</p>
                                    <p className={`text-lg font-black ${order.status === 'Realizado' ? 'text-green-400' : 'text-yellow-400'}`}>{order.status}</p>
                                </div>
                            </div>
                            
                            {/* [FEAT] Botones de Acción Admin en Modal */}
                            {canEdit && (
                                <div className="flex gap-2">
                                    {order.status !== 'Realizado' && (
                                        <button onClick={() => finalizeOrder(order.id)} className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3"/> Finalizar
                                        </button>
                                    )}
                                    <button onClick={() => deleteOrder(order.id)} className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-2">
                                        <Trash2 className="w-3 h-3"/> Eliminar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                                <h4 className="text-slate-500 text-[10px] font-black uppercase mb-3 flex gap-2"><User className="w-3 h-3"/> Cliente</h4>
                                <p className="text-white font-bold">{order.customer.name}</p>
                                <p className="text-slate-400 text-xs">{order.customer.email}</p>
                                <p className="text-slate-400 text-xs">{order.customer.phone}</p>
                            </div>
                            <div className="bg-slate-900/30 p-4 rounded-xl border border-slate-800">
                                <h4 className="text-slate-500 text-[10px] font-black uppercase mb-3 flex gap-2"><Truck className="w-3 h-3"/> Envío</h4>
                                <p className="text-white text-xs leading-relaxed">{order.shippingAddress}</p>
                                <p className="text-cyan-400 text-xs font-bold mt-2 uppercase">{order.paymentMethod}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-slate-500 text-[10px] font-black uppercase mb-3">Productos</h4>
                            <div className="space-y-2">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-900/20 p-3 rounded-lg border border-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded p-1"><img src={item.image} className="w-full h-full object-contain"/></div>
                                            <div>
                                                <p className="text-white text-sm font-bold">{item.title}</p>
                                                <p className="text-slate-500 text-xs">x{item.quantity}</p>
                                            </div>
                                        </div>
                                        <span className="text-white font-mono font-bold">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-right space-y-2">
                             <div className="flex justify-between text-slate-400 text-xs"><span>Subtotal</span><span>${order.subtotal?.toLocaleString()}</span></div>
                             {order.discount > 0 && <div className="flex justify-between text-green-400 text-xs font-bold"><span>Descuento</span><span>-${order.discount.toLocaleString()}</span></div>}
                             <div className="flex justify-between text-white font-black text-xl border-t border-slate-800 pt-2 mt-2"><span>Total</span><span>${order.total.toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Modal Selector de Cupones
    const CouponSelectorModal = () => {
        if (!showCouponModal) return null;
        const available = coupons.filter(c => 
            (!c.expirationDate || new Date(c.expirationDate) > new Date()) &&
            (!c.targetUser || c.targetUser === currentUser?.email) &&
            (!c.usageLimit || (c.usedBy?.length || 0) < c.usageLimit) &&
            (!currentUser || !(c.usedBy || []).includes(currentUser.id))
        );

        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up">
                <div className="glass rounded-[2rem] w-full max-w-lg overflow-hidden relative border border-purple-500/20 bg-[#050505]">
                    <button onClick={()=>setShowCouponModal(false)} className="absolute top-4 right-4 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                    <div className="p-6 bg-gradient-to-br from-slate-900 to-black border-b border-slate-800">
                        <h3 className="text-xl font-black text-white flex items-center gap-2"><Gift className="text-purple-400"/> Cupones</h3>
                    </div>
                    <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {available.length === 0 ? <p className="text-center text-slate-500 py-8">No hay cupones disponibles.</p> : available.map(c => {
                            const canApply = cartSubtotal >= (c.minPurchase || 0);
                            return (
                                <div key={c.id} onClick={() => canApply && selectCoupon(c)} className={`p-4 rounded-xl border flex justify-between items-center ${canApply ? 'bg-slate-900 border-slate-700 hover:border-purple-500 cursor-pointer' : 'opacity-50 grayscale cursor-not-allowed border-slate-800'}`}>
                                    <div>
                                        <p className="font-black text-white text-lg tracking-widest">{c.code}</p>
                                        <p className="text-purple-400 font-bold text-xs">{c.type === 'fixed' ? `$${c.value} OFF` : `${c.value}% OFF`}</p>
                                        {c.minPurchase > 0 && <p className="text-[10px] text-slate-500 mt-1">Mínimo: ${c.minPurchase}</p>}
                                    </div>
                                    {canApply && <div className="bg-purple-600 rounded-full p-2 text-white"><Plus className="w-4 h-4"/></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && view === 'store') return <div className="min-h-screen flex items-center justify-center bg-black text-white"><Loader2 className="w-10 h-10 animate-spin text-cyan-500"/></div>;
// --- RENDERIZADO PRINCIPAL (RETURN) ---
    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
            
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[150px] animate-pulse-slow"></div>
            </div>

            {/* Global Overlays */}
            <div className="fixed top-24 right-4 z-[9999] space-y-3 pointer-events-none">
                <div className="pointer-events-auto space-y-3">
                    {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={()=>removeToast(t.id)}/>)}
                </div>
            </div>
            
            <ConfirmModal 
                isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} 
                onConfirm={modalConfig.onConfirm} onCancel={()=>setModalConfig({...modalConfig, isOpen:false})} 
                confirmText={modalConfig.confirmText} cancelText={modalConfig.cancelText} isDangerous={modalConfig.isDangerous} 
            />
            
            <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <CouponSelectorModal />

            {/* --- NAVBAR --- */}
            {view !== 'admin' && (
                <nav className="fixed top-0 w-full h-24 glass z-50 px-6 md:px-12 flex items-center justify-between border-b border-slate-800/50 backdrop-blur-xl transition-all duration-300">
                    <div className="flex items-center gap-6">
                        <button onClick={()=>setIsMenuOpen(true)} className="p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition border border-slate-700/50">
                            <Menu className="w-6 h-6"/>
                        </button>
                        <div className="cursor-pointer group flex flex-col" onClick={()=>setView('store')}>
                            <span className="text-3xl font-black text-white tracking-tighter italic group-hover:neon-text transition-all duration-300">
                                {settings?.storeName || 'SUSTORE'}
                            </span>
                            <div className="h-1 w-1/2 bg-cyan-500 rounded-full group-hover:w-full transition-all duration-500"></div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center bg-slate-900/50 border border-slate-700/50 rounded-2xl px-6 py-3 w-1/3 focus-within:border-cyan-500/50 focus-within:bg-slate-900 transition shadow-inner group">
                        <Search className="w-5 h-5 text-slate-400 mr-3 group-focus-within:text-cyan-400 transition"/>
                        <input 
                            className="bg-transparent outline-none text-sm w-full text-white placeholder-slate-500 font-medium" 
                            placeholder="Buscar productos..." 
                            value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button onClick={()=>window.open(settings?.whatsappLink, '_blank')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/10 text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20 transition font-bold text-sm">
                            <MessageCircle className="w-5 h-5"/> Soporte
                        </button>
                        
                        <button onClick={()=>setView('cart')} className="relative p-3 bg-slate-900/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition group hover:border-cyan-500/30">
                            <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition"/>
                            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-[#050505] animate-bounce-short">{cart.length}</span>}
                        </button>
                        
                        {currentUser ? (
                            <button onClick={()=>setView('profile')} className="flex items-center gap-3 pl-2 pr-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm group-hover:scale-105 transition">
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="text-left hidden md:block">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hola,</p>
                                    <p className="text-sm font-bold text-white leading-none group-hover:text-cyan-400 transition">{currentUser.name.split(' ')[0]}</p>
                                </div>
                            </button>
                        ) : (
                            <button onClick={()=>setView('login')} className="px-6 py-3 bg-white text-black rounded-xl text-sm font-black hover:bg-cyan-400 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-2 transform hover:-translate-y-0.5">
                                <User className="w-5 h-5"/> INGRESAR
                            </button>
                        )}
                    </div>
                </nav>
            )}
            
            {/* --- MENÚ MÓVIL --- */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[10000] flex justify-start">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" onClick={()=>setIsMenuOpen(false)}></div>
                    <div className="relative w-80 bg-[#0a0a0a] h-full p-8 border-r border-slate-800 animate-fade-in-right flex flex-col shadow-2xl z-[10001]">
                        <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
                            <h2 className="text-3xl font-black text-white neon-text tracking-tight">MENÚ</h2>
                            <button onClick={()=>setIsMenuOpen(false)} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800 border border-slate-800">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>
                        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <button onClick={()=>{setView('store');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><Home className="w-6 h-6"/> Inicio</button>
                            <button onClick={()=>{setView('profile');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><User className="w-6 h-6"/> Mi Perfil</button>
                            <button onClick={()=>{setView('cart');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><ShoppingBag className="w-6 h-6"/> Mi Carrito</button>
                            <div className="h-px bg-slate-800 my-4 mx-4"></div>
                            <button onClick={()=>{setView('about');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><Info className="w-6 h-6"/> Sobre Nosotros</button>
                            <button onClick={()=>{setView('guide');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-slate-300 hover:text-cyan-400 transition flex items-center gap-4 p-4 hover:bg-slate-900/50 rounded-xl group border border-transparent hover:border-slate-800"><FileQuestion className="w-6 h-6"/> Cómo Comprar</button>
                            {hasAccess(currentUser?.email) && (
                                <button onClick={()=>{setView('admin');setIsMenuOpen(false)}} className="w-full text-left text-lg font-bold text-cyan-400 mt-6 pt-6 border-t border-slate-800 flex items-center gap-4 p-4 bg-cyan-900/10 rounded-xl hover:bg-cyan-900/20 transition border border-cyan-500/20"><Shield className="w-6 h-6"/> Admin Panel</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view !== 'admin' && <div className="h-32"></div>}

            <main className={`flex-grow relative z-10 ${view === 'admin' ? 'h-screen flex overflow-hidden' : 'p-4 md:p-8'}`}>
                
                {/* 1. VISTA TIENDA */}
                {view === 'store' && (
                    <div className="max-w-[1400px] mx-auto animate-fade-up">
                        {settings?.announcementMessage && (
                            <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                                <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3"><Flame className="w-4 h-4 text-orange-500"/> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500"/></p>
                            </div>
                        )}
                        <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group relative bg-[#080808]">
                            {settings?.heroUrl ? <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"/> : <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 to-purple-900 opacity-20"></div>}
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10">
                                <div className="max-w-2xl animate-fade-up">
                                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-6">TECNOLOGÍA <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">DEL FUTURO</span></h1>
                                    <p className="text-slate-400 text-lg mb-8 max-w-lg font-medium">Explora nuestra selección premium de dispositivos.</p>
                                    <button onClick={() => document.getElementById('catalog').scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-2 group/btn">VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition"/></button>
                                </div>
                            </div>
                        </div>

                        <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-y border-slate-800/50 flex items-center gap-4 overflow-x-auto no-scrollbar">
                            <Filter className="w-5 h-5 text-slate-500 flex-shrink-0"/>
                            <button onClick={()=>setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===''?'bg-white text-black border-white':'bg-slate-900 border-slate-800 text-slate-400'}`}>Todos</button>
                            {settings?.categories?.map(c => (
                                <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory===c?'bg-cyan-500 text-black border-cyan-500':'bg-slate-900 border-slate-800 text-slate-400'}`}>{c}</button>
                            ))}
                        </div>

                        {products.length === 0 ? <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl">Sin productos</div> : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-20">
                                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory === '' || p.category === selectedCategory)).map(p => (
                                    <div key={p.id} className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition duration-500 relative flex flex-col h-full">
                                        <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden">
                                            <img src={p.image} className="w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110"/>
                                            {p.discount > 0 && <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg z-20">-{p.discount}% OFF</span>}
                                            <button onClick={(e)=>{e.stopPropagation(); toggleFavorite(p)}} className={`absolute top-4 right-4 p-3 rounded-full z-20 transition shadow-lg backdrop-blur-sm border ${currentUser?.favorites?.includes(p.id) ? 'bg-red-500 text-white border-red-500' : 'bg-white/10 text-slate-300 border-white/10'}`}><Heart className={`w-5 h-5 ${currentUser?.favorites?.includes(p.id) ? 'fill-current' : ''}`}/></button>
                                        </div>
                                        <div className="p-6 flex-1 flex flex-col relative z-10 bg-[#0a0a0a]">
                                            <div className="flex justify-between items-start mb-3">
                                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border border-cyan-900/30 bg-cyan-900/10 px-2 py-1 rounded">{p.category}</p>
                                                {p.stock === 0 && <span className="text-[10px] text-slate-500 font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700">AGOTADO</span>}
                                            </div>
                                            <h3 className="text-white font-bold text-lg leading-tight mb-4 group-hover:text-cyan-200 transition line-clamp-2 min-h-[3rem]">{p.name}</h3>
                                            <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-end justify-between">
                                                <div className="flex flex-col">
                                                    {p.discount > 0 && <span className="text-xs text-slate-500 line-through font-medium mb-1">${p.basePrice.toLocaleString()}</span>}
                                                    <span className="text-2xl font-black text-white tracking-tight flex items-center gap-1">${calculateItemPrice(p.basePrice, p.discount).toLocaleString()}</span>
                                                </div>
                                                <button onClick={(e)=>{e.stopPropagation(); manageCart(p, 1)}} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-cyan-400 hover:scale-110 transition"><Plus/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                {/* 2. VISTA CARRITO */}
                {view === 'cart' && (
                    <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
                         <div className="flex items-center gap-4 mb-8 pt-8">
                            <button onClick={()=>setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white"><ArrowLeft/></button>
                            <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3"><ShoppingBag className="w-10 h-10 text-cyan-400"/> Mi Carrito</h1>
                        </div>
                        {cart.length === 0 ? <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800"><p className="text-slate-500">Carrito vacío.</p></div> : (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    {cart.map((item) => (
                                        <div key={item.product.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-3xl flex items-center gap-6">
                                            <img src={item.product.image} className="w-20 h-20 object-contain bg-white rounded-xl p-2"/>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-white">{item.product.name}</h3>
                                                <p className="text-cyan-400 font-bold">${calculateItemPrice(item.product.basePrice, item.product.discount).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1">
                                                <button onClick={() => manageCart(item.product, -1)} className="p-2 text-slate-400 hover:text-white"><Minus className="w-4 h-4"/></button>
                                                <span className="text-white font-bold">{item.quantity}</span>
                                                <button onClick={() => manageCart(item.product, 1)} className="p-2 text-slate-400 hover:text-white"><Plus className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                                    <h3 className="text-2xl font-black text-white mb-8">Resumen</h3>
                                    {appliedCoupon ? (
                                        <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center mb-6">
                                            <div><p className="font-black text-purple-300">{appliedCoupon.code}</p><p className="text-xs text-purple-400">{appliedCoupon.type==='fixed'?`$${appliedCoupon.value} OFF`:`${appliedCoupon.value}% OFF`}</p></div>
                                            <button onClick={()=>setAppliedCoupon(null)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>
                                        </div>
                                    ) : (
                                        <button onClick={()=>setShowCouponModal(true)} className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 text-slate-400 hover:text-purple-300 rounded-2xl mb-6 flex items-center justify-center gap-2">
                                            <Ticket className="w-4 h-4"/> Tengo un cupón
                                        </button>
                                    )}
                                    <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${cartSubtotal.toLocaleString()}</span></div>
                                        {discountAmount > 0 && <div className="flex justify-between text-purple-400 font-bold"><span>Descuento</span><span>-${discountAmount.toLocaleString()}</span></div>}
                                        <div className="flex justify-between items-end text-white font-bold text-xl pt-4"><span>Total</span><span className="text-3xl font-black text-cyan-400">${finalTotal.toLocaleString()}</span></div>
                                    </div>
                                    <button onClick={() => setView('checkout')} className="w-full bg-cyan-600 hover:bg-cyan-500 py-5 text-white font-bold text-lg rounded-2xl shadow-lg transition flex items-center justify-center gap-2">Iniciar Compra <ArrowRight/></button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. VISTA CHECKOUT */}
                {view === 'checkout' && (
                    <div className="max-w-xl mx-auto pb-20 animate-fade-up">
                        <button onClick={()=>setView('cart')} className="mb-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold"><ArrowLeft className="w-5 h-5"/> Volver</button>
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3"><MapPin className="text-cyan-400"/> Datos de Envío</h2>
                            <input className="input-cyber w-full p-4" placeholder="Dirección y Altura" value={checkoutData.address} onChange={e=>setCheckoutData({...checkoutData, address:e.target.value})}/>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="input-cyber p-4" placeholder="Ciudad" value={checkoutData.city} onChange={e=>setCheckoutData({...checkoutData, city:e.target.value})}/>
                                <input className="input-cyber p-4" placeholder="Provincia" value={checkoutData.province} onChange={e=>setCheckoutData({...checkoutData, province:e.target.value})}/>
                            </div>
                            <input className="input-cyber w-full p-4" placeholder="Código Postal" value={checkoutData.zipCode} onChange={e=>setCheckoutData({...checkoutData, zipCode:e.target.value})}/>
                            
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 pt-6"><CreditCard className="text-cyan-400"/> Pago</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {['Transferencia', 'Efectivo'].map(m => (
                                    <button key={m} onClick={()=>setCheckoutData({...checkoutData, paymentChoice:m})} className={`p-4 rounded-xl border font-bold ${checkoutData.paymentChoice===m?'border-cyan-500 bg-cyan-900/20 text-cyan-400':'border-slate-700 bg-slate-900/30 text-slate-500'}`}>{m}</button>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-slate-800">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-white font-bold text-lg">Total a Pagar</span>
                                    <span className="text-3xl font-black text-cyan-400">${finalTotal.toLocaleString()}</span>
                                </div>
                                <button onClick={confirmOrder} disabled={isProcessingOrder} className="w-full py-5 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3">
                                    {isProcessingOrder ? <Loader2 className="animate-spin"/> : <CheckCircle/>} Confirmar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. VISTAS AUTH & PROFILE */}
                {(view === 'login' || view === 'register') && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 p-4 animate-fade-up backdrop-blur-xl">
                        <div className="bg-[#0a0a0a] p-8 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-800 relative">
                            <button onClick={()=>setView('store')} className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white"><X/></button>
                            <h2 className="text-3xl font-black text-white mb-6 text-center">{loginMode ? 'Bienvenido' : 'Crear Cuenta'}</h2>
                            <form onSubmit={(e)=>{e.preventDefault(); handleAuth(!loginMode)}} className="space-y-4">
                                {!loginMode && <><input className="input-cyber w-full p-4" placeholder="Nombre" value={authData.name} onChange={e=>setAuthData({...authData, name:e.target.value})}/><input className="input-cyber w-full p-4" placeholder="DNI" value={authData.dni} onChange={e=>setAuthData({...authData, dni:e.target.value})}/><input className="input-cyber w-full p-4" placeholder="Teléfono" value={authData.phone} onChange={e=>setAuthData({...authData, phone:e.target.value})}/></>}
                                <input className="input-cyber w-full p-4" placeholder="Email" value={authData.email} onChange={e=>setAuthData({...authData, email:e.target.value})}/>
                                <input className="input-cyber w-full p-4" type="password" placeholder="Contraseña" value={authData.password} onChange={e=>setAuthData({...authData, password:e.target.value})}/>
                                <button type="submit" className="w-full bg-cyan-600 py-4 text-white rounded-xl font-bold mt-4">{isLoading?<Loader2 className="animate-spin mx-auto"/>:(loginMode?'INGRESAR':'REGISTRARSE')}</button>
                            </form>
                            <button onClick={()=>setLoginMode(!loginMode)} className="w-full text-center text-slate-500 text-sm mt-6 hover:text-cyan-400 font-bold">{loginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button>
                        </div>
                    </div>
                )}

                {view === 'profile' && currentUser && (
                    <div className="max-w-4xl mx-auto pt-8 px-4 pb-20">
                        <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[3rem] mb-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="w-24 h-24 rounded-full bg-cyan-600 flex items-center justify-center text-4xl font-black text-white">{currentUser.name.charAt(0)}</div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-3xl font-black text-white">{currentUser.name}</h2>
                                <p className="text-slate-400">{currentUser.email}</p>
                                <div className="mt-4 flex gap-4 justify-center md:justify-start">
                                    {hasAccess(currentUser.email) && <button onClick={()=>setView('admin')} className="px-4 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded-xl font-bold text-sm">Panel Admin</button>}
                                    <button onClick={()=>{localStorage.removeItem('nexus_user_data'); setCurrentUser(null); setView('store')}} className="px-4 py-2 bg-red-900/10 text-red-500 rounded-xl font-bold text-sm">Salir</button>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-6">Historial de Pedidos</h3>
                        <div className="space-y-4">
                            {orders.filter(o => o.userId === currentUser.id).map(o => (
                                <div key={o.id} onClick={()=>setSelectedOrder(o)} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex justify-between items-center cursor-pointer hover:border-cyan-500/50 transition">
                                    <div>
                                        <p className="font-bold text-white">Pedido #{o.orderId}</p>
                                        <p className="text-xs text-slate-500">{new Date(o.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-white">${o.total.toLocaleString()}</p>
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${o.status==='Realizado'?'bg-green-900/20 text-green-400':'bg-yellow-900/20 text-yellow-400'}`}>{o.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. ADMIN PANEL (RESTAURADO) */}
                {view === 'admin' && hasAccess(currentUser?.email) && (
                    <div className="flex h-screen bg-[#050505] overflow-hidden w-full font-sans">
                        <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static`}>
                            <div className="p-8 border-b border-slate-900"><h2 className="text-2xl font-black text-white flex items-center gap-2"><Shield className="text-cyan-400"/> ADMIN</h2></div>
                            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                                <button onClick={()=>setAdminTab('dashboard')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='dashboard'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><LayoutDashboard className="w-5 h-5"/> Dashboard</button>
                                <button onClick={()=>setAdminTab('orders')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='orders'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><ShoppingBag className="w-5 h-5"/> Pedidos</button>
                                <button onClick={()=>setAdminTab('products')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='products'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Package className="w-5 h-5"/> Productos</button>
                                {isAdmin(currentUser?.email) && <>
                                    <button onClick={()=>setAdminTab('coupons')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='coupons'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Ticket className="w-5 h-5"/> Cupones</button>
                                    <button onClick={()=>setAdminTab('suppliers')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='suppliers'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Truck className="w-5 h-5"/> Proveedores</button>
                                    <button onClick={()=>setAdminTab('settings')} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm ${adminTab==='settings'?'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30':'text-slate-400 hover:text-white'}`}><Settings className="w-5 h-5"/> Configuración</button>
                                </>}
                            </nav>
                            <div className="p-4"><button onClick={()=>setView('store')} className="w-full py-3 bg-slate-900 rounded-xl text-slate-400 font-bold text-sm hover:text-white">Volver a Tienda</button></div>
                        </div>

                        <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10 custom-scrollbar">
                            <button onClick={()=>setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white"><Menu/></button>
                            
                            {adminTab === 'dashboard' && (
                                <div className="space-y-8 animate-fade-up">
                                    <h1 className="text-3xl font-black text-white">Dashboard</h1>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Ingresos Brutos</p>
                                            <p className="text-3xl font-black text-white">${dashboardMetrics.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Ganancia Neta (Aprox)</p>
                                            <p className="text-3xl font-black text-green-400">${dashboardMetrics.profit.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Pedidos Totales</p>
                                            <p className="text-3xl font-black text-white">{dashboardMetrics.totalOrders}</p>
                                        </div>
                                        <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                            <p className="text-slate-500 font-bold text-xs uppercase">Carritos Activos</p>
                                            <p className="text-3xl font-black text-cyan-400 animate-pulse">{liveCarts.length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* [RESTORED] TAB: PEDIDOS (Con botones Finalizar/Eliminar) */}
                            {adminTab === 'orders' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Gestión de Pedidos</h1>
                                    <div className="space-y-4">
                                        {orders.map(o => (
                                            <div key={o.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
                                                <div className="flex items-center gap-4 cursor-pointer" onClick={()=>setSelectedOrder(o)}>
                                                    <div className={`p-4 rounded-xl ${o.status==='Realizado'?'bg-green-900/20 text-green-400':'bg-yellow-900/20 text-yellow-400'}`}>
                                                        {o.status==='Realizado' ? <CheckCircle/> : <Clock/>}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">#{o.orderId} - {o.customer.name}</p>
                                                        <p className="text-slate-500 text-sm">{new Date(o.date).toLocaleDateString()} - ${o.total.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={()=>setSelectedOrder(o)} className="px-4 py-2 bg-slate-900 text-slate-300 rounded-lg text-sm font-bold hover:text-white">Ver Detalle</button>
                                                    
                                                    {/* Botón Finalizar Restaurado */}
                                                    {o.status !== 'Realizado' && (
                                                        <button onClick={()=>finalizeOrder(o.id)} className="px-4 py-2 bg-green-900/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500 hover:text-white transition flex gap-2 items-center">
                                                            <CheckSquare className="w-4 h-4"/> Finalizar
                                                        </button>
                                                    )}
                                                    
                                                    {/* Botón Eliminar Restaurado */}
                                                    <button onClick={()=>deleteOrder(o.id)} className="px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition flex gap-2 items-center">
                                                        <Trash2 className="w-4 h-4"/> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* [RESTORED] TAB: PRODUCTOS (Con Costo, Venta Local y Eliminar) */}
                            {adminTab === 'products' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Inventario</h1>
                                        <button onClick={()=>{setNewProduct({});setEditingId(null);setShowProductForm(true)}} className="bg-cyan-600 px-6 py-3 rounded-xl font-bold text-white flex gap-2 shadow-lg"><Plus/> Nuevo</button>
                                    </div>

                                    {showProductForm && (
                                        <div className="bg-[#0a0a0a] border border-cyan-500/30 p-8 rounded-[2rem] relative">
                                            <h3 className="text-xl font-bold text-white mb-6">{editingId ? 'Editar' : 'Crear'} Producto</h3>
                                            <div className="grid md:grid-cols-2 gap-6 mb-4">
                                                <div className="space-y-4">
                                                    <input className="input-cyber w-full p-4" placeholder="Nombre" value={newProduct.name||''} onChange={e=>setNewProduct({...newProduct,name:e.target.value})}/>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 pl-2 mb-1 block">Precio Venta</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="$ Venta" value={newProduct.basePrice||''} onChange={e=>setNewProduct({...newProduct,basePrice:e.target.value})}/>
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[10px] uppercase font-bold text-slate-500 pl-2 mb-1 block">Costo (Compra)</label>
                                                            <input className="input-cyber w-full p-4" type="number" placeholder="$ Costo" value={newProduct.costPrice||''} onChange={e=>setNewProduct({...newProduct,costPrice:e.target.value})}/>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <input className="input-cyber w-full p-4" type="number" placeholder="Stock" value={newProduct.stock||''} onChange={e=>setNewProduct({...newProduct,stock:e.target.value})}/>
                                                        <input className="input-cyber w-full p-4" type="number" placeholder="Descuento %" value={newProduct.discount||0} onChange={e=>setNewProduct({...newProduct,discount:e.target.value})}/>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <select className="input-cyber w-full p-4" value={newProduct.category||''} onChange={e=>setNewProduct({...newProduct,category:e.target.value})}>
                                                        <option value="">Categoría...</option>
                                                        {settings?.categories?.map(c=><option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 cursor-pointer h-32 justify-center" onClick={()=>fileInputRef.current.click()}>
                                                        {newProduct.image ? <img src={newProduct.image} className="h-full object-contain"/> : <span className="text-slate-500 font-bold text-xs uppercase">Subir Imagen</span>}
                                                        <input type="file" ref={fileInputRef} onChange={(e)=>handleImage(e, setNewProduct)} className="hidden"/>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-4">
                                                <button onClick={()=>setShowProductForm(false)} className="px-6 py-3 text-slate-400 font-bold hover:text-white">Cancelar</button>
                                                <button onClick={saveProductFn} className="px-8 py-3 bg-cyan-600 rounded-xl text-white font-bold hover:bg-cyan-500 shadow-lg">Guardar</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-3">
                                        {products.map(p => (
                                            <div key={p.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center group hover:border-cyan-900/50 transition">
                                                <div className="flex items-center gap-6 w-full sm:w-auto">
                                                    <div className="w-16 h-16 bg-white rounded-lg p-2 flex-shrink-0"><img src={p.image} className="w-full h-full object-contain"/></div>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{p.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">Stock: <span className={p.stock < 5 ? 'text-red-400 font-bold' : 'text-slate-400'}>{p.stock}</span> | Venta: ${p.basePrice} | Costo: ${p.costPrice || 0}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
                                                    {/* Botón Venta Local (Manual) */}
                                                    <button onClick={()=>sellProductLocally(p)} className="p-3 bg-green-900/20 text-green-400 border border-green-500/30 rounded-xl hover:bg-green-500 hover:text-white transition" title="Venta Local Rápida (Descontar Stock)">
                                                        <Wallet className="w-5 h-5"/>
                                                    </button>
                                                    <button onClick={()=>{setNewProduct(p);setEditingId(p.id);setShowProductForm(true)}} className="p-3 bg-slate-900 rounded-xl text-cyan-400 hover:bg-cyan-900/20 transition border border-slate-800"><Edit className="w-5 h-5"/></button>
                                                    <button onClick={()=>deleteProductFn(p)} className="p-3 bg-slate-900 rounded-xl text-red-400 hover:bg-red-900/20 transition border border-slate-800"><Trash2 className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: CUPONES */}
                            {adminTab === 'coupons' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <h1 className="text-3xl font-black text-white">Cupones</h1>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2rem] mb-8">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <input className="input-cyber p-4" placeholder="CÓDIGO" value={newCoupon.code} onChange={e=>setNewCoupon({...newCoupon,code:e.target.value.toUpperCase()})}/>
                                            <div className="flex gap-4">
                                                <input className="input-cyber w-full p-4" type="number" placeholder="Valor" value={newCoupon.value} onChange={e=>setNewCoupon({...newCoupon,value:e.target.value})}/>
                                                <select className="input-cyber w-full p-4" value={newCoupon.type} onChange={e=>setNewCoupon({...newCoupon,type:e.target.value})}><option value="percentage">%</option><option value="fixed">$</option></select>
                                            </div>
                                            <input className="input-cyber p-4" type="number" placeholder="Mínimo Compra" value={newCoupon.minPurchase} onChange={e=>setNewCoupon({...newCoupon,minPurchase:e.target.value})}/>
                                            <input className="input-cyber p-4" type="date" value={newCoupon.expirationDate} onChange={e=>setNewCoupon({...newCoupon,expirationDate:e.target.value})}/>
                                        </div>
                                        <button onClick={saveCouponFn} className="w-full bg-purple-600 py-4 rounded-xl text-white font-bold hover:bg-purple-500">Crear Cupón</button>
                                    </div>
                                    <div className="grid gap-4">
                                        {coupons.map(c => (
                                            <div key={c.id} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                                                <div><p className="font-black text-white">{c.code}</p><p className="text-purple-400 text-sm font-bold">{c.value}{c.type==='percentage'?'%':'$'} OFF</p></div>
                                                <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','coupons',c.id))} className="text-red-400 hover:text-white p-2"><Trash2/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* TAB: PROVEEDORES */}
                            {adminTab === 'suppliers' && (
                                <div className="space-y-6 animate-fade-up pb-20">
                                    <div className="flex justify-between">
                                        <h1 className="text-3xl font-black text-white">Proveedores</h1>
                                        <button onClick={()=>setShowSupplierModal(true)} className="bg-cyan-600 px-6 py-2 rounded-xl text-white font-bold">Nuevo</button>
                                    </div>
                                    {showSupplierModal && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
                                            <div className="bg-[#0a0a0a] border border-slate-700 p-8 rounded-[2rem] w-full max-w-md">
                                                <h3 className="text-white font-bold text-xl mb-4">Nuevo Proveedor</h3>
                                                <div className="space-y-4 mb-6">
                                                    <input className="input-cyber w-full p-4" placeholder="Empresa" value={newSupplier.name} onChange={e=>setNewSupplier({...newSupplier,name:e.target.value})}/>
                                                    <input className="input-cyber w-full p-4" placeholder="Contacto" value={newSupplier.contact} onChange={e=>setNewSupplier({...newSupplier,contact:e.target.value})}/>
                                                    <input className="input-cyber w-full p-4" placeholder="Teléfono" value={newSupplier.phone} onChange={e=>setNewSupplier({...newSupplier,phone:e.target.value})}/>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button onClick={()=>setShowSupplierModal(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancelar</button>
                                                    <button onClick={saveSupplierFn} className="flex-1 py-3 bg-cyan-600 text-white rounded-xl font-bold">Guardar</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {suppliers.map(s => (
                                            <div key={s.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem]">
                                                <h3 className="font-bold text-white text-xl mb-2">{s.name}</h3>
                                                <p className="text-slate-400 text-sm flex items-center gap-2"><User className="w-4 h-4"/> {s.contact}</p>
                                                <p className="text-slate-400 text-sm flex items-center gap-2"><Phone className="w-4 h-4"/> {s.phone}</p>
                                                <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','suppliers',s.id))} className="mt-4 text-red-400 text-xs font-bold hover:text-white">ELIMINAR</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* TAB: CONFIGURACIÓN */}
                             {adminTab === 'settings' && (
                                <div className="space-y-8 animate-fade-up pb-20">
                                    <div className="flex justify-between items-center">
                                        <h1 className="text-3xl font-black text-white">Configuración</h1>
                                        <button onClick={saveSettingsFn} className="bg-cyan-600 px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2"><Save className="w-4 h-4"/> Guardar</button>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                        <h3 className="font-bold text-white mb-4">Equipo</h3>
                                        <div className="flex gap-4 mb-4">
                                            <input className="input-cyber flex-1 p-3" placeholder="Email" value={newTeamMember.email} onChange={e=>setNewTeamMember({...newTeamMember,email:e.target.value})}/>
                                            <select className="input-cyber p-3" value={newTeamMember.role} onChange={e=>setNewTeamMember({...newTeamMember,role:e.target.value})}><option value="employee">Empleado</option><option value="admin">Admin</option></select>
                                            <button onClick={addTeamMemberFn} className="bg-slate-800 p-3 rounded-xl text-white"><Plus/></button>
                                        </div>
                                        <div className="space-y-2">
                                            {(tempSettings.team||[]).map((m,i)=>(
                                                <div key={i} className="flex justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                                    <span className="text-white text-sm">{m.email} ({m.role})</span>
                                                    {m.email!==SUPER_ADMIN_EMAIL && <button onClick={()=>removeTeamMemberFn(m.email)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem]">
                                        <h3 className="font-bold text-white mb-4">Sobre Nosotros</h3>
                                        <textarea className="input-cyber w-full h-40 p-4 resize-none" value={aboutText} onChange={e=>setAboutText(e.target.value)}/>
                                    </div>
                                </div>
                             )}

                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
