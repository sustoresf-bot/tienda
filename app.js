import React, { useState, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useStore } from 'hooks/useStore';
import { useCart } from 'hooks/useCart';
import { useAuth } from 'hooks/useAuth';
import { useAdminMetrics } from 'hooks/useAdminMetrics';
import { Store } from 'pages/Store';
import { Admin } from 'pages/Admin';
import { Auth } from 'pages/Auth';
import { Cart } from 'pages/Cart';
import { Checkout } from 'pages/Checkout';
import { Profile } from 'pages/Profile';
import { ErrorBoundary, Toast, ConfirmModal } from 'components/Common';
import { calculateItemPrice, hasAccess } from 'utils';
import {
    Menu, ShoppingBag, User, Home, Info, FileQuestion,
    Shield, Search, X, Heart, LogOut as LogOutIcon
} from 'lucide-react';

console.log("Nexus Store App Initializing...");

function App() {
    const [view, setView] = useState('store');
    const [adminTab, setAdminTab] = useState('dashboard');
    const [toasts, setToasts] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Page States
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isProcessingOrder, setIsProcessingOrder] = useState(false);
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [authMode, setAuthMode] = useState(true); // true = login, false = register
    const [authData, setAuthData] = useState({ email: '', password: '', name: '', username: '' });
    const [isAuthLoading, setIsAuthLoading] = useState(false);

    // Custom Hooks
    const { products, promos, orders, users, settings, loadMoreProducts, nexusHasMore, isLoading } = useStore();
    const { cart, addToCart, removeFromCart, clearCart, cartTotal } = useCart();
    const { currentUser, login, register, logout } = useAuth();

    // Filtered Products logic
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = !selectedCategory || p.category === selectedCategory;
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    // Metrics
    const metrics = useAdminMetrics(products, orders, [], [], settings);

    // Toast logic
    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const discountAmount = useMemo(() => {
        if (!appliedCoupon) return 0;
        return appliedCoupon.type === 'fixed'
            ? appliedCoupon.value
            : (cartTotal * (appliedCoupon.value / 100));
    }, [appliedCoupon, cartTotal]);

    const finalTotal = Math.max(0, cartTotal - discountAmount);

    useEffect(() => {
        console.log("App mounted. Current user:", currentUser?.email);
    }, [currentUser]);

    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans flex flex-col">
                {/* Toasts */}
                <div className="fixed top-24 right-8 z-[100] space-y-4">
                    {toasts.map(t => (
                        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                    ))}
                </div>

                {/* Main Navbar */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
                    <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-slate-900 rounded-lg transition"><Menu /></button>
                            <h1 onClick={() => setView('store')} className="text-2xl font-black cursor-pointer tracking-tighter neon-text">SUSTORE</h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <button onClick={() => setView('cart')} className="relative p-2 hover:bg-slate-900 rounded-lg transition">
                                <ShoppingBag />
                                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-cyan-500 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
                            </button>
                            {currentUser ? (
                                <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center font-bold">{currentUser.name?.charAt(0) || 'U'}</button>
                            ) : (
                                <button onClick={() => setView('login')} className="p-2 hover:bg-slate-900 rounded-lg transition"><User /></button>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Sidebar Drawer */}
                {isMenuOpen && (
                    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}>
                        <div className="fixed inset-y-0 left-0 w-80 bg-[#0a0a0a] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-12">
                                <h2 className="text-xl font-black tracking-widest text-slate-500">Nexus OS</h2>
                                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-900 rounded-full hover:bg-slate-800 transition"><X /></button>
                            </div>
                            <div className="space-y-4">
                                <MenuBtn icon={Home} label="Inicio" onClick={() => { setView('store'); setIsMenuOpen(false); }} />
                                <MenuBtn icon={ShoppingBag} label="Mi Carrito" onClick={() => { setView('cart'); setIsMenuOpen(false); }} />
                                {currentUser && <MenuBtn icon={User} label="Mi Perfil" onClick={() => { setView('profile'); setIsMenuOpen(false); }} />}
                                <div className="h-px bg-slate-800 my-8"></div>
                                {hasAccess(currentUser?.email, settings) && (
                                    <MenuBtn icon={Shield} label="Admin Panel" color="text-cyan-400" onClick={() => { setView('admin'); setIsMenuOpen(false); }} />
                                )}
                                {currentUser && (
                                    <MenuBtn icon={LogOutIcon} label="Cerrar Sesión" color="text-red-400" onClick={() => { logout(); setView('store'); setIsMenuOpen(false); }} />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-24"></div>

                <main className="flex-grow">
                    {view === 'store' && (
                        <Store
                            products={products} promos={promos} settings={settings}
                            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                            currentUser={currentUser} toggleFavorite={(p) => showToast("Guardado en favoritos", "success")}
                            manageCart={addToCart}
                            calculateItemPrice={calculateItemPrice} setView={setView}
                            filteredProducts={filteredProducts} nexusHasMore={nexusHasMore} loadMoreProducts={loadMoreProducts}
                            isLoading={isLoading} setPreviewImage={setPreviewImage}
                        />
                    )}
                    {view === 'cart' && (
                        <Cart
                            cart={cart} manageCart={addToCart} cartSubtotal={cartTotal}
                            finalTotal={finalTotal} setView={setView} discountAmount={discountAmount}
                            appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon}
                            setShowCouponModal={setShowCouponModal}
                        />
                    )}
                    {view === 'checkout' && (
                        <Checkout
                            cart={cart} cartSubtotal={cartTotal} finalTotal={finalTotal}
                            setView={setView} discountAmount={discountAmount}
                            isProcessingOrder={isProcessingOrder}
                            handleConfirmOrder={async (data) => {
                                setIsProcessingOrder(true);
                                try {
                                    await new Promise(r => setTimeout(r, 2000));
                                    showToast("Pedido enviado exitosamente", "success");
                                    clearCart();
                                    setAppliedCoupon(null);
                                    setView('store');
                                } finally {
                                    setIsProcessingOrder(false);
                                }
                            }}
                        />
                    )}
                    {view === 'profile' && (
                        <Profile
                            currentUser={currentUser} orders={orders} products={products}
                            setView={setView} logout={logout} hasAccess={hasAccess(currentUser?.email, settings)}
                            toggleFavorite={(p) => showToast("Función próximamente")} manageCart={addToCart}
                        />
                    )}
                    {view === 'admin' && (
                        <Admin
                            currentUser={currentUser} settings={settings}
                            adminTab={adminTab} setAdminTab={setAdminTab} setView={setView}
                            dashboardMetrics={metrics} liveCarts={[]} showToast={showToast}
                            products={products} orders={orders}
                        />
                    )}
                    {view === 'login' && (
                        <Auth
                            loginMode={authMode} setLoginMode={setAuthMode}
                            authData={authData} setAuthData={setAuthData}
                            isLoading={isAuthLoading}
                            handleAuth={async () => {
                                setIsAuthLoading(true);
                                try {
                                    if (authMode) {
                                        await login(authData.email, authData.password);
                                        showToast("¡Bienvenido de nuevo!", "success");
                                    } else {
                                        await register(authData);
                                        showToast("¡Cuenta creada con éxito!", "success");
                                    }
                                    setView('store');
                                } catch (e) {
                                    showToast(e.message, "error");
                                } finally {
                                    setIsAuthLoading(false);
                                }
                            }}
                        />
                    )}
                </main>

                <footer className="mt-auto bg-[#050505] border-t border-slate-800 py-12 px-8 text-center text-slate-600">
                    <p className="text-xs font-bold uppercase tracking-widest">{settings?.storeName || 'Nexus Store'} © {new Date().getFullYear()}</p>
                </footer>
            </div>

            {/* Common Modals */}
            {previewImage && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-zoom-in" />
                </div>
            )}
        </ErrorBoundary>
    );
}

const MenuBtn = ({ icon: Icon, label, onClick, color = "text-slate-300" }) => (
    <button onClick={onClick} className={`w-full text-left p-4 hover:bg-slate-900 rounded-xl flex items-center gap-4 transition font-bold group ${color}`}>
        <Icon className="w-5 h-5 group-hover:scale-110 transition" /> {label}
    </button>
);

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error("No root element found to mount React!");
}
