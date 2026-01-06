import React, { useState } from 'react';
import {
    Shield, LayoutDashboard, ShoppingBag, Package, Ticket, Truck,
    ShoppingCart as CartIcon, Tag, Wallet, Settings as SettingsIcon, LogOut, Menu,
    DollarSign, TrendingUp, TrendingDown, Eye, Flame, BarChart3, Plus, Search, Trash2,
    Palette, Share2, Globe, Cog, Users, Store as StoreIcon, Save, X
} from 'lucide-react';
import { isAdmin, hasAccess } from 'utils';
import { updateDocument } from 'services';

export const Admin = ({
    currentUser, settings, adminTab, setAdminTab, setView,
    dashboardMetrics, liveCarts, products, orders, showToast
}) => {
    const [settingsTab, setSettingsTab] = useState('store');
    const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);

    if (!hasAccess(currentUser?.email, settings)) {
        return <div className="p-20 text-center text-white font-black text-2xl">ACCESO DENEGADO</div>;
    }

    const saveSettings = async () => {
        try {
            await updateDocument('settings', 'config', localSettings);
            showToast("Configuración guardada", "success");
        } catch (e) {
            showToast("Error al guardar", "error");
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden w-full font-sans fixed inset-0 z-[100]">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a] border-r border-slate-800 flex flex-col transition-transform duration-300 ${isAdminMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:static shadow-2xl`}>
                <div className="p-8 border-b border-slate-900 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center text-white">
                            <Shield className="w-6 h-6" />
                        </div>
                        ADMIN
                    </h2>
                    <button onClick={() => setIsAdminMenuOpen(false)} className="md:hidden p-2 text-slate-500"><X /></button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <AdminNavLink icon={LayoutDashboard} label="Dashboard" active={adminTab === 'dashboard'} onClick={() => setAdminTab('dashboard')} />
                    <AdminNavLink icon={ShoppingBag} label="Pedidos" active={adminTab === 'orders'} onClick={() => setAdminTab('orders')} />
                    <AdminNavLink icon={Package} label="Productos" active={adminTab === 'products'} onClick={() => setAdminTab('products')} />

                    {isAdmin(currentUser?.email, settings) && (
                        <>
                            <div className="h-px bg-slate-800 my-4"></div>
                            <AdminNavLink icon={SettingsIcon} label="Configuración" active={adminTab === 'settings'} onClick={() => setAdminTab('settings')} />
                        </>
                    )}
                </nav>
                <div className="p-6 border-t border-slate-900">
                    <button onClick={() => setView('store')} className="w-full py-4 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition font-bold text-sm flex items-center justify-center gap-2 group border border-slate-800">
                        <LogOut className="w-4 h-4" /> Salir
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 bg-[#050505] overflow-y-auto relative w-full p-6 md:p-10">
                <button onClick={() => setIsAdminMenuOpen(true)} className="md:hidden mb-6 p-2 bg-slate-900 rounded-lg text-white border border-slate-800">
                    <Menu className="w-6 h-6" />
                </button>

                {adminTab === 'dashboard' && <DashboardView metrics={dashboardMetrics} liveCarts={liveCarts} />}

                {adminTab === 'settings' && (
                    <div className="animate-fade-up space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-black text-white neon-text">Configuración</h1>
                            <button onClick={saveSettings} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition">
                                <Save className="w-5 h-5" /> GUARDAR CAMBIOS
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
                            {[
                                { id: 'store', label: 'Tienda', icon: StoreIcon },
                                { id: 'appearance', label: 'Apariencia', icon: Palette },
                                { id: 'team', label: 'Equipo', icon: Users }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSettingsTab(t.id)}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition ${settingsTab === t.id ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <t.icon className="w-4 h-4" /> {t.label}
                                </button>
                            ))}
                        </div>

                        {settingsTab === 'store' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0a0a] p-8 rounded-[2rem] border border-slate-800">
                                <SettingsInput label="Nombre de la Tienda" value={localSettings.storeName} onChange={v => setLocalSettings({ ...localSettings, storeName: v })} />
                                <SettingsInput label="Email" value={localSettings.storeEmail} onChange={v => setLocalSettings({ ...localSettings, storeEmail: v })} />
                            </div>
                        )}
                        {/* More settings tabs... */}
                    </div>
                )}

                {adminTab !== 'dashboard' && adminTab !== 'settings' && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Cog className="w-12 h-12 mb-4 animate-spin-slow" />
                        <p className="font-bold">Vista en desarrollo para la estructura modular.</p>
                        <p className="text-xs">Usa script.js para funcionalidad completa de gestión mientras migramos.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

const AdminNavLink = ({ icon: Icon, label, active, onClick }) => (
    <button onClick={onClick} className={`w-full text-left px-5 py-3 rounded-xl flex items-center gap-3 font-bold text-sm transition ${active ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-900/30' : 'text-slate-400 hover:text-white hover:bg-slate-900'}`}>
        <Icon className="w-5 h-5" /> {label}
    </button>
);

const DashboardView = ({ metrics, liveCarts }) => (
    <div className="animate-fade-up space-y-8 pb-20">
        <h1 className="text-4xl font-black text-white neon-text">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="VENTAS" value={metrics.revenue} icon={DollarSign} color="emerald" />
            <MetricCard label="BENEFICIO" value={metrics.netIncome} icon={TrendingUp} color="cyan" />
            <MetricCard label="GASTOS" value={metrics.expensesTotal} icon={Wallet} color="rose" />
            <MetricCard label="VIVOS" value={liveCarts.length} icon={Eye} color="sky" pulse />
        </div>
    </div>
);

const MetricCard = ({ label, value, icon: Icon, color, pulse }) => (
    <div className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-[2rem] relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 bg-${color}-500/10 text-${color}-400 rounded-xl`}><Icon className={`w-6 h-6 ${pulse ? 'animate-pulse' : ''}`} /></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <p className="text-3xl font-black text-white">${Number(value).toLocaleString()}</p>
    </div>
);

const SettingsInput = ({ label, value, onChange }) => (
    <div>
        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{label}</label>
        <input className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-cyan-500 transition" value={value} onChange={e => onChange(e.target.value)} />
    </div>
);
