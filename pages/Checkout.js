import React, { useState } from 'react';
import { ArrowLeft, MapPin, CreditCard, CheckCircle, RefreshCw, Info, Loader2 } from 'lucide-react';

export const Checkout = ({
    cart, cartSubtotal, finalTotal, discountAmount,
    setView, isProcessingOrder, handleConfirmOrder
}) => {
    const [checkoutData, setCheckoutData] = useState({
        address: '',
        city: '',
        province: '',
        zipCode: '',
        paymentChoice: ''
    });

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-fade-up px-4 md:px-8">
            <button onClick={() => setView('cart')} className="mb-8 mt-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition">
                <ArrowLeft className="w-5 h-5" /> Volver al Carrito
            </button>

            <div className="grid md:grid-cols-5 gap-8">
                {/* Columna Izquierda: Formularios */}
                <div className="md:col-span-3 space-y-8">
                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <MapPin className="text-cyan-400 w-6 h-6" /> Datos de Envío
                        </h2>
                        <div className="space-y-5 relative z-10">
                            <CheckoutInput label="Dirección y Altura" placeholder="Ej: Av. Santa Fe 1234" value={checkoutData.address} onChange={v => setCheckoutData({ ...checkoutData, address: v })} />
                            <div className="grid grid-cols-2 gap-5">
                                <CheckoutInput label="Ciudad" placeholder="Ej: Rosario" value={checkoutData.city} onChange={v => setCheckoutData({ ...checkoutData, city: v })} />
                                <CheckoutInput label="Provincia" placeholder="Ej: Santa Fe" value={checkoutData.province} onChange={v => setCheckoutData({ ...checkoutData, province: v })} />
                            </div>
                            <CheckoutInput label="Código Postal" placeholder="Ej: 2000" value={checkoutData.zipCode} onChange={v => setCheckoutData({ ...checkoutData, zipCode: v })} />
                        </div>
                    </div>

                    <div className="bg-[#0a0a0a] border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <CreditCard className="text-cyan-400 w-6 h-6" /> Método de Pago
                        </h2>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {['Mercado Pago', 'Transferencia'].map(method => (
                                <button
                                    key={method}
                                    onClick={() => setCheckoutData({ ...checkoutData, paymentChoice: method })}
                                    className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.paymentChoice === method ? 'border-cyan-500 bg-cyan-900/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500 hover:bg-slate-800'}`}
                                >
                                    {checkoutData.paymentChoice === method && <CheckCircle className="absolute top-2 right-2 text-cyan-500 w-5 h-5" />}
                                    {method === 'Mercado Pago' ? <CreditCard className="w-8 h-8" /> : <RefreshCw className="w-8 h-8" />}
                                    <span className="text-sm font-black tracking-wider uppercase">{method}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Confirmación */}
                <div className="md:col-span-2">
                    <div className="bg-gradient-to-br from-slate-900 via-[#0a0a0a] to-[#050505] border border-slate-800 p-8 rounded-[2.5rem] sticky top-28 shadow-2xl">
                        <h3 className="font-black text-white mb-8 text-xl border-b border-slate-800 pb-4">Resumen Final</h3>
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-slate-400">
                                <span>Productos ({cart.length})</span>
                                <span className="font-bold text-white">${cartSubtotal.toLocaleString()}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-purple-400 font-bold">
                                    <span>Descuento</span>
                                    <span>-${discountAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end">
                                <span className="text-white font-bold">Total a Pagar</span>
                                <span className="text-3xl font-black text-white neon-text">${finalTotal.toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => handleConfirmOrder(checkoutData)}
                            disabled={isProcessingOrder}
                            className={`w-full py-5 text-white font-bold text-lg rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all ${isProcessingOrder ? 'bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 shadow-green-900/20 hover:scale-[1.02]'}`}
                        >
                            {isProcessingOrder ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                            {isProcessingOrder ? 'Procesando...' : 'Confirmar Pedido'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CheckoutInput = ({ label, placeholder, value, onChange }) => (
    <div>
        <label className="text-xs font-bold text-slate-500 uppercase ml-2 mb-1 block">{label}</label>
        <input
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition font-medium"
            placeholder={placeholder}
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);
