import React from 'react';
import { ArrowLeft, ShoppingBag, ShoppingCart, Trash2, Minus, Plus, Tag, Ticket, ArrowRight, Truck } from 'lucide-react';

export const Cart = ({
    cart, manageCart, cartSubtotal, finalTotal, discountAmount,
    appliedCoupon, setAppliedCoupon, setShowCouponModal, setView
}) => {
    return (
        <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
            <div className="flex items-center gap-4 mb-8 pt-8">
                <button onClick={() => setView('store')} className="p-3 bg-slate-900 rounded-full text-slate-400 hover:text-white transition hover:bg-slate-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-4xl font-black text-white neon-text flex items-center gap-3">
                    <ShoppingBag className="w-10 h-10 text-cyan-400" /> Mi Carrito
                </h1>
            </div>

            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-950/30 text-center">
                    <ShoppingCart className="w-16 h-16 text-slate-600 mb-6" />
                    <h3 className="text-2xl font-black text-white mb-2">Tu carrito está vacío</h3>
                    <button onClick={() => setView('store')} className="mt-8 px-8 py-4 bg-cyan-600 text-white rounded-xl font-bold flex items-center gap-2">
                        Ir a la Tienda <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {cart.map((item) => (
                            <div key={item.productId} className="bg-[#0a0a0a] border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0">
                                    <img src={item.image} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                        <button onClick={() => manageCart(item, -item.quantity)} className="text-slate-600 hover:text-red-500">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-cyan-400 font-bold text-sm mb-4">${item.price.toLocaleString()}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-1 border border-slate-700">
                                            <button onClick={() => manageCart(item, -1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 transition"><Minus className="w-4 h-4" /></button>
                                            <span className="text-base font-bold w-8 text-center text-white">{item.quantity}</span>
                                            <button onClick={() => manageCart(item, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 transition"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <p className="text-xs text-slate-500 font-bold uppercase">Subtotal: <span className="text-white text-lg ml-1">${(item.price * item.quantity).toLocaleString()}</span></p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-8 border-b border-slate-800 pb-4">Resumen de Compra</h3>
                        <div className="mb-8">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3"><Tag className="w-4 h-4" /> Cupón de Descuento</label>
                            {appliedCoupon ? (
                                <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center animate-fade-up">
                                    <div>
                                        <p className="font-black text-purple-300 text-lg">{appliedCoupon.code}</p>
                                        <p className="text-xs text-purple-400 font-bold">{appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}</p>
                                    </div>
                                    <button onClick={() => setAppliedCoupon(null)} className="p-2 text-purple-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <button onClick={() => setShowCouponModal(true)} className="w-full py-4 border border-dashed border-slate-700 hover:border-purple-500 bg-slate-900/30 text-slate-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
                                    <Ticket className="w-5 h-5" /> Ver cupones disponibles
                                </button>
                            )}
                        </div>
                        <div className="space-y-4 border-b border-slate-800 pb-8 mb-8">
                            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span className="font-bold text-white">${cartSubtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-slate-400 text-sm"><span>Envío</span><span className="text-cyan-400 font-bold">A coordinar</span></div>
                            {appliedCoupon && <div className="flex justify-between text-purple-400 font-bold"><span>Descuento</span><span>-${discountAmount.toLocaleString()}</span></div>}
                        </div>
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-white font-bold text-lg">Total Final</span>
                            <span className="text-4xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span>
                        </div>
                        <button onClick={() => setView('checkout')} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3">
                            Iniciar Compra <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
