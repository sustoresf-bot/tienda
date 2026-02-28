import React from 'react';
import { 
    ShoppingBag, Trash2, Minus, Plus, Tag, Ticket, Truck, ArrowRight, 
    ArrowLeft, CheckCircle, Info, MapPin, ShoppingCart, 
    CreditCard, DollarSign, Wallet, Smartphone, Loader2, User, Phone, 
    Mail, CreditCard as CardIcon, Building
} from 'lucide-react';

const WhatsAppIcon = ({ className = '' }) => (
    <svg viewBox="0 0 448 512" className={className} fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-221.7 99.3-221.7 221.7 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 69 27 106.1 27h.1c122.3 0 221.7-99.3 221.7-221.7 0-59.3-23.1-115-64.7-157.3zM223.9 438.7h-.1c-33.1 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3 18.6-68-4.3-7c-18.5-29.4-28.2-63.4-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54 81.2 54 130.4-.1 101.8-82.9 184.6-184.5 184.6zm101.1-138.2c-5.5-2.8-32.8-16.1-37.9-17.9-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 17.9-17.5 21.6-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.7 35.2 15.2 49 16.5 66.6 14 10.7-1.6 32.8-13.4 37.4-26.3 4.6-12.9 4.6-23.9 3.2-26.3-1.3-2.4-5-3.7-10.5-6.5z" />
    </svg>
);

const CheckoutPanel = ({
    view, setView, cart, settings, darkMode, manageCart, 
    calculateItemPrice, appliedCoupon, setAppliedCoupon, 
    setShowCouponModal, cartSubtotal, shippingFee, 
    discountAmount, finalTotal, checkoutData, setCheckoutData,
    buildWhatsappUrl, buildWhatsappCartMessage, showToast,
    handleCheckoutSubmit, isProcessingCheckout
}) => {
    
    if (view !== 'cart' && view !== 'checkout') return null;

    if (view === 'cart') {
        return (
            <div className="max-w-6xl mx-auto animate-fade-up px-4 md:px-8 pb-20">
                <div className="flex flex-col gap-4 mb-8 pt-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('store')} className={`p-3 rounded-full transition group ${darkMode ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition" />
                        </button>
                        <h1 className={`text-4xl font-black flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <ShoppingBag className="w-10 h-10 text-orange-500" /> Mi Carrito
                        </h1>
                    </div>

                    {cart.length > 0 && settings?.showCartWhatsappCheckout === true && (
                        <button
                            onClick={() => {
                                const url = buildWhatsappUrl(settings?.whatsappLink, buildWhatsappCartMessage());
                                if (!url) {
                                    showToast('Configura el enlace de WhatsApp en Admin → Configuración → Social.', 'warning');
                                    return;
                                }
                                window.open(url, '_blank');
                            }}
                            className="w-full sm:w-auto px-5 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black transition shadow-lg hover:shadow-green-500/30 flex items-center justify-center gap-2"
                        >
                            <WhatsAppIcon className="w-5 h-5" /> Terminar compra por WhatsApp
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center p-16 text-center border-2 border-dashed rounded-[3rem] ${darkMode ? 'border-slate-800 bg-slate-950/30' : 'border-slate-200 bg-slate-50'}`}>
                        <div className={`p-8 rounded-full mb-6 shadow-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <ShoppingCart className={`w-16 h-16 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                        </div>
                        <h3 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tu carrito está vacío</h3>
                        <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">¡Es un buen momento para buscar ese producto que tanto quieres!</p>
                        <button onClick={() => setView('store')} className="px-8 py-4 bg-orange-600 text-white rounded-xl font-bold transition shadow-lg hover:bg-orange-500 hover:shadow-orange-500/30 flex items-center gap-2">
                            Ir a la Tienda <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            {cart.map((item) => (
                                <div key={item.product.id} className={`p-4 md:p-6 rounded-3xl border flex flex-col md:flex-row gap-6 items-center group relative overflow-hidden transition duration-300 ${darkMode ? 'bg-[#0a0a0a] border-slate-800 hover:border-orange-900/50' : 'bg-white border-slate-200 hover:border-orange-200 shadow-sm hover:shadow-md'}`}>
                                    <div className="w-full md:w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2 flex-shrink-0 shadow-lg border border-slate-100">
                                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left z-10">
                                        <div className="flex justify-between items-start w-full">
                                            <h3 className={`font-bold text-lg truncate mb-1 pr-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.product.name}</h3>
                                            <button onClick={() => manageCart(item.product, -item.quantity)} className={`p-2 rounded-lg transition ${darkMode ? 'text-slate-600 hover:text-red-500 bg-slate-900 hover:bg-red-900/20' : 'text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50'}`}>
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-orange-500 font-bold text-sm mb-4">
                                            ${calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0).toLocaleString()} <span className="text-slate-500 font-normal">unitario</span>
                                        </p>
                                        <div className="flex items-center justify-center md:justify-start gap-4">
                                            <div className={`flex items-center gap-3 rounded-xl p-1 border ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                <button onClick={() => manageCart(item.product, -1)} className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'}`}>
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className={`text-base font-bold w-8 text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.quantity}</span>
                                                <button onClick={() => manageCart(item.product, 1)} className={`w-10 h-10 flex items-center justify-center rounded-lg transition ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-white text-slate-500 hover:text-slate-900'}`}>
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className={`hidden md:block h-8 w-px mx-2 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                            <p className="text-xs text-slate-500 font-bold uppercase hidden md:block">
                                                Subtotal: <span className={`text-lg ml-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>${(calculateItemPrice(item.product?.basePrice ?? 0, item.product?.discount ?? 0) * (item.quantity || 0)).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={`border p-8 rounded-[2.5rem] h-fit sticky top-28 shadow-2xl transition-colors duration-300 ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h3 className={`text-2xl font-black mb-8 border-b pb-4 transition-colors duration-300 ${darkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}>Resumen de Compra</h3>
                            <div className="mb-8">
                                <label className={`text-xs font-bold uppercase tracking-widest mb-3 block flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <Tag className="w-4 h-4" /> Cupón de Descuento
                                </label>
                                {appliedCoupon ? (
                                    <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden group animate-fade-up">
                                        <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition"></div>
                                        <div className="relative z-10">
                                            <p className="font-black text-purple-300 text-lg tracking-widest">{appliedCoupon.code}</p>
                                            <p className="text-xs text-purple-400 font-bold">{appliedCoupon.type === 'fixed' ? `$${appliedCoupon.value} OFF` : `${appliedCoupon.value}% OFF`}</p>
                                        </div>
                                        <button onClick={() => setAppliedCoupon(null)} className={`p-2 rounded-full transition relative z-10 border border-transparent hover:border-red-500/30 ${darkMode ? 'bg-slate-900/50 text-purple-300 hover:text-red-400 hover:bg-red-900/30' : 'bg-white text-purple-600 hover:text-red-600 hover:bg-red-50'}`}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowCouponModal(true)} className={`w-full py-4 border border-dashed rounded-2xl transition flex items-center justify-center gap-2 text-sm font-bold group ${darkMode ? 'border-slate-700 hover:border-purple-500 bg-slate-900/30 hover:bg-purple-900/10 text-slate-400 hover:text-purple-300' : 'border-slate-300 hover:border-purple-500 bg-slate-50 hover:bg-purple-50 text-slate-500 hover:text-purple-600'}`}>
                                        <Ticket className="w-5 h-5 group-hover:rotate-12 transition" /> Ver cupones disponibles
                                    </button>
                                )}
                            </div>
                            <div className={`space-y-4 border-b pb-8 mb-8 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className={`flex justify-between font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <span>Subtotal</span>
                                    <span className={`font-mono font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>${cartSubtotal.toLocaleString()}</span>
                                </div>
                                <div className={`flex justify-between text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    <span>Envío {checkoutData.shippingMethod === 'Delivery' ? '(A domicilio)' : '(Retiro)'}</span>
                                    <span className="text-orange-500 font-bold flex items-center gap-1">
                                        <Truck className="w-3 h-3" />
                                        {shippingFee > 0 ? `$${shippingFee.toLocaleString()}` : (checkoutData.shippingMethod === 'Pickup' ? 'Gratis' : '¡Envío Gratis!')}
                                    </span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-purple-500 font-bold text-sm animate-pulse bg-purple-900/10 p-2 rounded-lg">
                                        <span>Descuento aplicado</span>
                                        <span>-${discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between items-end mb-8">
                                <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total Final</span>
                                <span className={`text-4xl font-black tracking-tighter ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>${finalTotal.toLocaleString()}</span>
                            </div>
                            <button onClick={() => setView('checkout')} className="w-full bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-500 hover:to-blue-500 py-5 text-white font-bold text-lg rounded-2xl shadow-[0_0_25px_rgba(249,115,22,0.3)] hover:shadow-[0_0_35px_rgba(249,115,22,0.5)] transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1">
                                Iniciar Compra <ArrowRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'checkout') {
        return (
            <div className="max-w-5xl mx-auto pb-20 animate-fade-up px-4 md:px-8">
                <button onClick={() => setView('cart')} className="mb-8 mt-8 text-slate-400 hover:text-white flex items-center gap-2 font-bold transition">
                    <ArrowLeft className="w-5 h-5" /> Volver al Carrito
                </button>

                <form onSubmit={handleCheckoutSubmit} className="grid md:grid-cols-5 gap-8">
                    <div className="md:col-span-3 space-y-8">
                        <div className={`border p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                <Truck className="text-orange-500 w-6 h-6" /> Método de Entrega
                            </h2>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {settings?.shippingPickup?.enabled && (
                                    <button type="button" onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Pickup' })} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Pickup' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}>
                                        {checkoutData.shippingMethod === 'Pickup' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-orange-500" />}
                                        <MapPin className="w-8 h-8 group-hover:scale-110 transition" />
                                        <span className="text-xs font-black uppercase">Retiro en Local</span>
                                    </button>
                                )}
                                {settings?.shippingDelivery?.enabled && (
                                    <button type="button" onClick={() => setCheckoutData({ ...checkoutData, shippingMethod: 'Delivery' })} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative overflow-hidden group ${checkoutData.shippingMethod === 'Delivery' ? 'border-orange-500 bg-orange-500/10 text-orange-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}>
                                        {checkoutData.shippingMethod === 'Delivery' && <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-orange-500" />}
                                        <Truck className="w-8 h-8 group-hover:scale-110 transition" />
                                        <span className="text-xs font-black uppercase">Envío a Domicilio</span>
                                    </button>
                                )}
                            </div>
                            {checkoutData.shippingMethod === 'Delivery' && (
                                <div className="space-y-4 animate-fade-up">
                                    <input required placeholder="Dirección y Altura" className={`w-full p-4 rounded-xl border outline-none focus:border-orange-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.address} onChange={e => setCheckoutData({...checkoutData, address: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input placeholder="Piso / Depto (Opcional)" className={`w-full p-4 rounded-xl border outline-none focus:border-orange-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.apartment} onChange={e => setCheckoutData({...checkoutData, apartment: e.target.value})} />
                                        <input required placeholder="Ciudad" className={`w-full p-4 rounded-xl border outline-none focus:border-orange-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.city} onChange={e => setCheckoutData({...checkoutData, city: e.target.value})} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`border p-8 rounded-[2.5rem] shadow-xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                <CardIcon className="text-blue-500 w-6 h-6" /> Método de Pago
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {settings?.paymentCash && (
                                    <button type="button" onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: 'Cash' })} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative ${checkoutData.paymentMethod === 'Cash' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}>
                                        <DollarSign className="w-8 h-8" />
                                        <span className="text-xs font-black uppercase">Efectivo</span>
                                    </button>
                                )}
                                {settings?.paymentTransfer?.enabled && (
                                    <button type="button" onClick={() => setCheckoutData({ ...checkoutData, paymentMethod: 'Transfer' })} className={`p-6 rounded-2xl border transition flex flex-col items-center gap-3 relative ${checkoutData.paymentMethod === 'Transfer' ? 'border-blue-500 bg-blue-500/10 text-blue-500' : darkMode ? 'border-slate-700 bg-slate-900/30 text-slate-500 hover:border-slate-500' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'}`}>
                                        <Building className="w-8 h-8" />
                                        <span className="text-xs font-black uppercase">Transferencia</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className={`border p-8 rounded-[2.5rem] shadow-xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h2 className={`text-2xl font-black mb-6 flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                <User className="text-purple-500 w-6 h-6" /> Tus Datos
                            </h2>
                            <div className="space-y-4">
                                <input required placeholder="Nombre Completo" className={`w-full p-4 rounded-xl border outline-none focus:border-purple-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.name} onChange={e => setCheckoutData({...checkoutData, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input required placeholder="Teléfono / WhatsApp" className={`w-full p-4 rounded-xl border outline-none focus:border-purple-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.phone} onChange={e => setCheckoutData({...checkoutData, phone: e.target.value})} />
                                    <input required placeholder="DNI / CUIL" className={`w-full p-4 rounded-xl border outline-none focus:border-purple-500 transition ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} value={checkoutData.dni} onChange={e => setCheckoutData({...checkoutData, dni: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className={`border p-8 rounded-[2.5rem] sticky top-28 shadow-2xl ${darkMode ? 'bg-[#0a0a0a] border-slate-800' : 'bg-white border-slate-200'}`}>
                            <h3 className={`text-xl font-black mb-6 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Finalizar Orden</h3>
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>${cartSubtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Envío</span>
                                    <span className="text-orange-500 font-bold">{shippingFee > 0 ? `$${shippingFee.toLocaleString()}` : 'Gratis'}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm text-purple-500 font-bold">
                                        <span>Descuento</span>
                                        <span>-${discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className={`pt-4 border-t flex justify-between items-end ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <span className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>TOTAL</span>
                                    <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white neon-text' : 'text-slate-900'}`}>${finalTotal.toLocaleString()}</span>
                                </div>
                            </div>
                            <button type="submit" disabled={isProcessingCheckout} className="w-full bg-orange-600 hover:bg-orange-500 py-5 text-white font-black text-xl rounded-2xl transition-all shadow-lg hover:shadow-orange-500/30 flex items-center justify-center gap-3 disabled:opacity-50">
                                {isProcessingCheckout ? <Loader2 className="w-6 h-6 animate-spin" /> : 'CONFIRMAR PEDIDO'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    return null;
};

export default React.memo(CheckoutPanel);
