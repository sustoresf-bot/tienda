import React from 'react';
import { User, Mail, Phone, Shield, LogOut, Package, Calendar, ShoppingBag, Heart, Trash2, Plus } from 'lucide-react';

export const Profile = ({ currentUser, orders, products, setView, logout, hasAccess, toggleFavorite, manageCart }) => {
    if (!currentUser) return null;

    const userOrders = orders.filter(o => o.userId === currentUser.id || o.customerEmail === currentUser.email);

    return (
        <div className="max-w-6xl mx-auto pt-8 animate-fade-up px-4 md:px-8 pb-20">
            <div className="bg-[#0a0a0a] border border-slate-800 p-8 md:p-12 rounded-[3rem] mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden shadow-2xl">
                <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl z-10 transform rotate-3 border-4 border-[#0a0a0a]">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="text-center md:text-left z-10 flex-1">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{currentUser.name}</h2>
                    <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2 font-medium mb-4">
                        <Mail className="w-4 h-4 text-cyan-500" /> {currentUser.email}
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                        <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-500 font-mono flex items-center gap-2">
                            <User className="w-3 h-3" /> {currentUser.dni || 'Sin DNI'}
                        </span>
                        <span className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-500 font-mono flex items-center gap-2">
                            <Phone className="w-3 h-3" /> {currentUser.phone || 'Sin Teléfono'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 z-10 w-full md:w-auto">
                    {hasAccess && (
                        <button onClick={() => setView('admin')} className="px-6 py-4 bg-slate-900 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20 rounded-2xl font-bold transition flex items-center justify-center gap-2 shadow-lg">
                            <Shield className="w-5 h-5" /> Panel Admin
                        </button>
                    )}
                    <button onClick={logout} className="px-6 py-4 bg-red-900/10 border border-red-500/20 text-red-500 hover:bg-red-900/20 rounded-2xl font-bold transition flex items-center justify-center gap-2">
                        <LogOut className="w-5 h-5" /> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                        <Package className="text-cyan-400 w-6 h-6" /> Mis Pedidos
                    </h3>
                    {userOrders.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-500 bg-slate-900/20">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-bold">Aún no has realizado compras.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {userOrders.map(o => (
                                <div key={o.id} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-2xl flex justify-between items-center transition group relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="font-bold text-white text-lg"># {o.orderId || o.id.slice(0, 6)}</p>
                                        <p className="text-xs text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> {new Date(o.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right relative z-10">
                                        <p className="font-black text-white text-xl mb-2">${o.total.toLocaleString()}</p>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider border ${o.status === 'Realizado' ? 'bg-green-900/20 text-green-400 border-green-500/30' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30'}`}>
                                            {o.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                        <Heart className="text-red-500 w-6 h-6 fill-current" /> Mis Favoritos
                    </h3>
                    {!currentUser.favorites || currentUser.favorites.length === 0 ? (
                        <div className="p-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-500 bg-slate-900/20">
                            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-bold">Tu lista de deseos está vacía.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {currentUser.favorites.map(fid => {
                                const p = products.find(prod => prod.id === fid);
                                if (!p) return null;
                                return (
                                    <div key={fid} className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-2xl flex items-center gap-4 relative group">
                                        <div className="w-16 h-16 bg-white rounded-xl p-1 flex-shrink-0">
                                            <img src={p.image} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white line-clamp-1">{p.name}</p>
                                            <p className="text-cyan-400 font-bold text-sm mt-1">${p.basePrice.toLocaleString()}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleFavorite(p)} className="p-3 bg-slate-900 text-red-400 hover:bg-red-900/20 rounded-xl border border-slate-800"><Trash2 className="w-4 h-4" /></button>
                                            <button onClick={() => manageCart(p, 1)} className="p-3 bg-slate-900 text-cyan-400 hover:bg-cyan-900/20 rounded-xl border border-slate-800"><Plus className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
