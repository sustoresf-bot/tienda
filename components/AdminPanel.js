import React, { useState, useEffect, useMemo } from 'react';
import { 
    Shield, X, LayoutDashboard, ShoppingBag, Package, Tag, Ticket, Truck, 
    ShoppingCart, Wallet, Settings, Users, LogOut, Menu, Store, 
    DollarSign, TrendingUp, TrendingDown, BarChart, Loader2, 
    ChevronRight, Search, Plus, Filter, Download, MoreVertical,
    Clock, CheckCircle, AlertCircle, Trash2, Edit2, Copy, ExternalLink,
    ChevronLeft, Mail, Phone, MapPin, User, Calendar, CreditCard,
    ArrowUpRight, ArrowDownRight, Zap, Star, ShieldCheck, HelpCircle
} from 'lucide-react';

// Sub-componentes internos de Admin
const AdminHowToUse = ({ guideKey }) => {
    const [show, setShow] = useState(false);
    const guides = {
        dashboard: {
            title: "Dashboard de Control",
            steps: ["Analiza ingresos y gastos en tiempo real.", "Usa 'Venta Manual' para pedidos presenciales.", "Haz click en las tarjetas para ver detalles."]
        },
        orders: {
            title: "Gestión de Pedidos",
            steps: ["Cambia estados para notificar al cliente.", "Filtra por fecha o estado.", "Genera etiquetas de envío."]
        },
        products: {
            title: "Inventario Inteligente",
            steps: ["Sincroniza stock automáticamente.", "Usa IA para descripciones (Próximamente).", "Configura variantes de producto."]
        }
    };
    const guide = guides[guideKey];
    if (!guide) return null;
    return (
        <div className="relative inline-block">
            <button onClick={() => setShow(!show)} className="p-2 bg-slate-900/50 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition border border-slate-800">
                <HelpCircle className="w-4 h-4" />
            </button>
            {show && (
                <div className="absolute right-0 mt-2 w-64 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-fade-up">
                    <h4 className="text-sm font-black text-white mb-2">{guide.title}</h4>
                    <ul className="space-y-2">
                        {guide.steps.map((s, i) => (
                            <li key={i} className="text-[10px] text-slate-400 flex gap-2">
                                <span className="text-orange-500 font-bold">{i+1}.</span> {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const AdminPanel = ({ 
    view, setView, settings, settingsLoaded, currentUser, 
    isAdminMenuOpen, setIsAdminMenuOpen, adminTab, setAdminTab,
    isAdminUser, hasUnseenOrders, isRoleLoading, hasAccess, 
    isAdmin, isEditor, SecurityManager, dashboardMetrics,
    orders, handleNextOrders, handlePrevOrders, hasMoreOrders, loadingOrders,
    products, coupons, suppliers, purchases, finance, users,
    manageCart, setDarkMode, darkMode, showToast,
    showManualSaleModal, setShowManualSaleModal, saleData, setSaleData,
    metricsDetail, setMetricsDetail,
    // Firebase tools
    db, appId, collection, addDoc, updateDoc, doc, increment
}) => {

    // --- SUB-COMPONENTS ---
    const ManualSaleModal = () => {
        if (!showManualSaleModal) return null;
        const product = products.find(p => p.id === saleData.productId);

        const handleProductChange = (e) => {
            const pid = e.target.value;
            const prod = products.find(p => p.id === pid);
            setSaleData({
                ...saleData,
                productId: pid,
                price: prod ? Number(prod.basePrice) : 0
            });
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            if (!product) return showToast("Selecciona un producto.", "warning");
            if (saleData.quantity <= 0) return showToast("Cantidad inválida.", "warning");

            try {
                const currentStock = Number(product.stock) || 0;
                if (saleData.quantity > currentStock) {
                    return showToast(`Stock insuficiente (Disponible: ${currentStock}).`, "error");
                }

                const orderId = `man-${Date.now().toString().slice(-6)}`;
                const total = saleData.quantity * saleData.price;

                const newOrder = {
                    orderId: orderId,
                    userId: 'manual_admin',
                    customer: {
                        name: saleData.customerName || 'Cliente Mostrador',
                        email: 'offline@store.com',
                        phone: '-',
                        dni: '-'
                    },
                    items: [{
                        productId: product.id,
                        title: product.name,
                        quantity: Number(saleData.quantity),
                        unit_price: Number(saleData.price),
                        image: product.image
                    }],
                    subtotal: total,
                    discount: 0,
                    total: total,
                    status: 'Realizado',
                    date: new Date().toISOString(),
                    shippingAddress: 'Entrega Presencial (Offline)',
                    paymentMethod: saleData.paymentMethod,
                    source: 'manual_sale',
                    notes: saleData.notes
                };

                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), newOrder);
                await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', product.id), {
                    stock: increment(-Number(saleData.quantity))
                });

                showToast("Venta registrada correctamente.", "success");
                setShowManualSaleModal(false);
            } catch (err) {
                console.error(err);
                showToast("Error al registrar venta manual.", "error");
            }
        };

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-up" onClick={() => setShowManualSaleModal(false)}>
                <div className={`rounded-[2rem] w-full max-w-lg border shadow-2xl relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShowManualSaleModal(false)} className={`absolute top-6 right-6 p-2 rounded-full transition z-10 ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                        <X className="w-5 h-5" />
                    </button>
                    <div className={`p-8 border-b transition-colors duration-300 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <h3 className={`text-2xl font-black flex items-center gap-3 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Store className="w-6 h-6 text-green-400" /> Registrar Venta Manual
                        </h3>
                        <p className={`text-sm mt-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Para ventas fuera de la plataforma web.</p>
                    </div>
                    <form onSubmit={handleSubmit} className="p-8 space-y-4">
                        <div>
                            <label className={`text-xs font-bold uppercase tracking-widest block mb-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Producto</label>
                            <select
                                className={`w-full rounded-xl p-3 focus:border-green-500 outline-none transition-all duration-300 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
                                value={saleData.productId}
                                onChange={handleProductChange}
                            >
                                <option value="">-- Seleccionar Producto --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest block mb-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cantidad</label>
                                <input
                                    type="number" min="1"
                                    className={`w-full rounded-xl p-3 focus:border-green-500 outline-none transition-all duration-300 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
                                    value={saleData.quantity}
                                    onChange={e => setSaleData({ ...saleData, quantity: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className={`text-xs font-bold uppercase tracking-widest block mb-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Precio Unit. ($)</label>
                                <input
                                    type="number" min="0"
                                    className={`w-full rounded-xl p-3 focus:border-green-500 outline-none transition-all duration-300 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
                                    value={saleData.price}
                                    onChange={e => setSaleData({ ...saleData, price: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`text-xs font-bold uppercase tracking-widest block mb-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cliente / Notas</label>
                            <input
                                className={`w-full rounded-xl p-3 focus:border-green-500 outline-none transition-all duration-300 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
                                value={saleData.customerName}
                                onChange={e => setSaleData({ ...saleData, customerName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-bold uppercase tracking-widest block mb-1 transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Método de Pago</label>
                            <select
                                className={`w-full rounded-xl p-3 focus:border-green-500 outline-none transition-all duration-300 ${darkMode ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'}`}
                                value={saleData.paymentMethod}
                                onChange={e => setSaleData({ ...saleData, paymentMethod: e.target.value })}
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta (POS)</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/20 transition transform hover:-translate-y-1 mt-4">
                            REGISTRAR VENTA
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    const MetricsDetailModal = () => {
        const [timeframe, setTimeframe] = useState('monthly');
        if (!metricsDetail) return null;
        const data = dashboardMetrics.analytics[timeframe] || [];
        const title = metricsDetail.type === 'revenue' ? 'Ingresos Brutos' : 'Beneficio Neto';
        const colorClass = metricsDetail.type === 'revenue' ? 'text-green-400' : 'text-orange-400';
        const sortedByVal = [...data].sort((a, b) => b.revenue - a.revenue);
        const bestPeriod = sortedByVal[0];
        const worstPeriod = sortedByVal[sortedByVal.length - 1];

        return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-up" onClick={() => setMetricsDetail(null)}>
                <div className={`rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col border shadow-2xl relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-[#050505] border-slate-800' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                    <div className={`p-8 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-100 bg-slate-50/50'}`}>
                        <div>
                            <h3 className={`text-3xl font-black ${colorClass} flex items-center gap-3`}>
                                <BarChart className="w-8 h-8" /> {title} - Analítica
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">Desglose detallado de tu rendimiento.</p>
                        </div>
                        <button onClick={() => setMetricsDetail(null)} className={`p-3 rounded-full transition border ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white border-slate-700' : 'bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-200'}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className={`p-6 flex gap-4 border-b justify-center ${darkMode ? 'bg-slate-900/10 border-slate-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
                        {['daily', 'monthly', 'yearly'].map(t => (
                            <button key={t} onClick={() => setTimeframe(t)} className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition ${timeframe === t ? (darkMode ? 'bg-slate-100 text-black' : 'bg-slate-900 text-white') : (darkMode ? 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200')}`}>
                                {t === 'daily' ? 'Diario' : t === 'monthly' ? 'Mensual' : 'Anual'}
                            </button>
                        ))}
                    </div>
                    <div className={`grid grid-cols-2 gap-4 p-6 ${darkMode ? 'bg-slate-900/5' : 'bg-slate-50/30'}`}>
                        <div className={`border p-4 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-green-900/10 border-green-500/20' : 'bg-green-50 border-green-100'}`}>
                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mejor Periodo</p>
                                <p className={`${darkMode ? 'text-green-400' : 'text-green-600'} font-black text-lg`}>{bestPeriod ? `$${bestPeriod.revenue.toLocaleString()}` : '-'}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{bestPeriod?.date || '-'}</p>
                            </div>
                        </div>
                        <div className={`border p-4 rounded-2xl flex items-center gap-4 ${darkMode ? 'bg-red-900/10 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Peor Periodo</p>
                                <p className={`${darkMode ? 'text-red-400' : 'text-red-600'} font-black text-lg`}>{worstPeriod ? `$${worstPeriod.revenue.toLocaleString()}` : '-'}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{worstPeriod?.date || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-6 relative flex items-end justify-between gap-2 overflow-x-auto custom-scrollbar">
                        {data.length === 0 ? (
                            <div className={`w-full text-center my-auto transition-colors duration-300 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay datos para mostrar el gráfico.</div>
                        ) : (
                            (() => {
                                const maxVal = Math.max(...data.map(d => d.revenue), 1);
                                return data.slice().map((item, idx) => {
                                    const heightPct = (item.revenue / maxVal) * 100;
                                    return (
                                        <div key={idx} className={`flex flex-col items-center justify-end h-full gap-2 group min-w-[60px] cursor-pointer rounded-xl p-1 transition-all ${darkMode ? 'hover:bg-slate-900/30' : 'hover:bg-slate-100'}`}>
                                            <div className={`opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 border px-3 py-2 rounded-xl pointer-events-none transition z-50 shadow-xl max-w-[min(240px,70vw)] whitespace-normal break-words ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                                <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.date}</p>
                                                <p className={`font-black ${colorClass}`}>${item.revenue.toLocaleString()}</p>
                                                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.orders} Pedidos</p>
                                            </div>
                                            <div className={`w-4 bg-gradient-to-t rounded-t-full relative transition-all duration-500 group-hover:w-6 group-hover:brightness-125 ${metricsDetail.type === 'revenue' ? (darkMode ? 'from-green-900/50 to-green-500' : 'from-green-200 to-green-600') : (darkMode ? 'from-orange-900/50 to-orange-500' : 'from-orange-200 to-orange-600')}`} style={{ height: `${Math.max(heightPct, 5)}%` }}>
                                                <div className={`absolute top-0 left-0 right-0 h-4 rounded-full blur-md opacity-20 ${metricsDetail.type === 'revenue' ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                                            </div>
                                            <p className={`text-[10px] font-bold -rotate-45 group-hover:rotate-0 transition origin-center mt-2 truncate w-full text-center ${darkMode ? 'text-slate-600 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-900'}`}>
                                                {timeframe === 'monthly' ? item.date.slice(5) : timeframe === 'daily' ? item.date.slice(5) : item.date}
                                            </p>
                                        </div>
                                    );
                                })
                            })()
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER LOGIC ---

    if (view !== 'admin') return null;

    if (!settingsLoaded || isRoleLoading(currentUser?.email)) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-800 animate-spin" style={{ borderTopColor: '#f97316' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-orange-500 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-4 font-mono uppercase tracking-widest">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    if (!(hasAccess(currentUser?.email) && currentUser?.id && currentUser?.id.length >= 10 && !SecurityManager.detectManipulation())) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">Acceso Denegado</h2>
                    <p className="text-slate-500 text-sm mb-8">No tienes permisos para acceder a esta sección o tu sesión es inválida.</p>
                    <button onClick={() => setView('store')} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition border border-slate-800">
                        Volver a la Tienda
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen min-full-viewport bg-[#050505] overflow-hidden animate-fade-up relative w-full font-sans">
            {/* Overlay móvil */}
            {isAdminMenuOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in" onClick={() => setIsAdminMenuOpen(false)} />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ease-out ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static md:w-72 shadow-2xl`}>
                <div className="p-6 md:p-8 border-b border-slate-900 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
                                <Shield className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            ADMIN
                        </h2>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 font-mono ml-1">v3.0.0 PRO</p>
                    </div>
                    <button onClick={() => setIsAdminMenuOpen(false)} className="md:hidden p-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition border border-slate-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 p-3 md:p-4 space-y-1.5 md:space-y-2 overflow-y-auto custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-3 md:px-4 py-2 mt-1">Principal</p>
                    {[
                        { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
                        { id: 'orders', icon: ShoppingBag, label: 'Pedidos', badge: isAdminUser && hasUnseenOrders },
                        { id: 'products', icon: Package, label: 'Productos' }
                    ].map(item => (
                        <button key={item.id} onClick={() => { setAdminTab(item.id); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === item.id ? 'bg-orange-900/20 text-orange-400 border border-orange-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                            <item.icon className="w-5 h-5" /> {item.label}
                            {item.badge && <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-500/30 font-black uppercase tracking-widest">Nuevo</span>}
                        </button>
                    ))}

                    {(isAdmin(currentUser?.email) || isEditor(currentUser?.email)) && (
                        <button onClick={() => { setAdminTab('promos'); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === 'promos' ? 'bg-purple-900/20 text-purple-400 border border-purple-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                            <Tag className="w-5 h-5" /> Promos
                        </button>
                    )}

                    {isAdmin(currentUser?.email) && (
                        <>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-3 md:px-4 py-2 mt-4 md:mt-6">Gestión</p>
                            {[
                                { id: 'coupons', icon: Ticket, label: 'Cupones' },
                                { id: 'suppliers', icon: Truck, label: 'Proveedores' },
                                { id: 'purchases', icon: ShoppingCart, label: 'Compras' },
                                { id: 'finance', icon: Wallet, label: 'Finanzas' },
                                { id: 'settings', icon: Settings, label: 'Configuración' },
                                { id: 'users', icon: Users, label: 'Usuarios', color: 'pink' }
                            ].map(item => (
                                <button key={item.id} onClick={() => { setAdminTab(item.id); setIsAdminMenuOpen(false); }} className={`w-full text-left px-4 md:px-5 py-3 md:py-3.5 rounded-xl flex items-center gap-3 font-bold text-sm transition ${adminTab === item.id ? `bg-${item.color || 'orange'}-900/20 text-${item.color || 'orange'}-400 border border-${item.color || 'orange'}-900/30` : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
                                    <item.icon className="w-5 h-5" /> {item.label}
                                </button>
                            ))}
                        </>
                    )}
                </nav>

                <div className="p-4 md:p-6 border-t border-slate-900">
                    <button onClick={() => { setView('store'); setIsAdminMenuOpen(false); }} className="w-full py-3.5 md:py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-bold text-sm flex items-center justify-center gap-2 group border border-slate-800">
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition" /> Volver a Tienda
                    </button>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-4 md:p-10 custom-scrollbar">
                <button onClick={() => setIsAdminMenuOpen(true)} className="md:hidden mb-4 p-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-white border border-slate-800 flex items-center gap-2 font-bold text-sm transition">
                    <Menu className="w-5 h-5" /> Menú
                </button>

                {/* Modales */}
                <ManualSaleModal />
                <MetricsDetailModal />

                {/* Tab: Dashboard */}
                {adminTab === 'dashboard' && (
                    <div className="max-w-[1600px] mx-auto animate-fade-up space-y-8 pb-20">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
                            <div>
                                <h1 className="text-4xl font-black text-white neon-text">Panel de Control</h1>
                                <p className="text-slate-500 mt-2">Resumen administrativo y financiero.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <AdminHowToUse guideKey="dashboard" />
                                <div className="hidden md:block bg-slate-900 px-4 py-2 rounded-lg text-xs text-slate-400 font-mono border border-slate-800">
                                    {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Ingresos */}
                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-green-500/30 transition">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Ingresos Brutos</p>
                                        <h2 className="text-4xl font-black text-white tracking-tighter">${dashboardMetrics.revenue.toLocaleString()}</h2>
                                    </div>
                                    <div className="p-4 bg-green-900/20 text-green-400 rounded-2xl">
                                        <DollarSign className="w-8 h-8" />
                                    </div>
                                </div>
                                <div className="space-y-4 mt-8 border-t border-slate-800 pt-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Rendimiento Mensual</p>
                                    {dashboardMetrics.analytics.monthly.slice(-6).reverse().map((m, i) => {
                                        const maxRev = Math.max(...dashboardMetrics.analytics.monthly.map(x => x.revenue));
                                        const percentage = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
                                        return (
                                            <div key={i} className="group/item">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-400 font-mono">{m.date}</span>
                                                    <span className="text-white font-bold">${m.revenue.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-full">
                                                    <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-1000 group-hover/item:brightness-125" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {dashboardMetrics.analytics.monthly.length === 0 && <p className="text-slate-600 text-xs">Sin datos suficientes.</p>}
                                </div>
                            </div>

                            {/* Beneficio */}
                            <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-orange-500/30 transition">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <p className="text-slate-500 font-black text-xs tracking-widest uppercase mb-1">Beneficio Neto (Estimado)</p>
                                        <h2 className={`text-4xl font-black tracking-tighter ${dashboardMetrics.netIncome >= 0 ? 'text-orange-400' : 'text-red-500'}`}>
                                            ${dashboardMetrics.netIncome.toLocaleString()}
                                        </h2>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${dashboardMetrics.netIncome >= 0 ? 'bg-orange-900/20 text-orange-400' : 'bg-red-900/20 text-red-500'}`}>
                                        {dashboardMetrics.netIncome >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                                    </div>
                                </div>
                                <div className="space-y-4 mt-8 border-t border-slate-800 pt-6">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Ingresos vs Gastos (Últimos Meses)</p>
                                    {dashboardMetrics.analytics.monthly.slice(-6).reverse().map((m, i) => (
                                        <div key={i} className="group/item">
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <span className="text-slate-400 font-mono">{m.date}</span>
                                                <span className="text-white/50">Ingreso: <span className="text-white font-bold">${m.revenue.toLocaleString()}</span></span>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
                                                <div className="h-full bg-orange-500 rounded-full" style={{ width: '70%' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* El resto de tabs se manejarían igual o se pasarían como sub-componentes si son muy pesados */}
                        <div className="text-slate-600 text-xs text-center mt-20">Sustore Admin v3.0.0 - Todos los derechos reservados</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(AdminPanel);
