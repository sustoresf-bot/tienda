import React from 'react';
import {
    Flame, ArrowRight, Info, Zap, Shield, Headphones, Filter,
    Sparkles, Percent, Tag, CheckCircle, ShoppingCart, X, Package,
    Search, ImageIcon, Heart, Star, AlertCircle, Plus
} from 'lucide-react';

export const Store = ({
    products, promos, settings, selectedCategory, setSelectedCategory,
    searchQuery, setSearchQuery, currentUser, toggleFavorite, manageCart,
    calculateItemPrice, setView, filteredProducts, setPreviewImage,
    nexusHasMore, loadMoreProducts, isLoading
}) => {
    return (
        <div className="max-w-[1400px] mx-auto pb-32 min-h-screen block">
            {/* Anuncio Global */}
            {settings?.announcementMessage && (
                <div className="w-full bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl p-3 mb-8 text-center animate-pulse relative overflow-hidden group">
                    <p className="text-cyan-300 font-black text-xs md:text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3">
                        <Flame className="w-4 h-4 text-orange-500" /> {settings.announcementMessage} <Flame className="w-4 h-4 text-orange-500" />
                    </p>
                </div>
            )}

            {/* Banner Hero */}
            <div className="relative w-full h-[400px] md:h-[550px] rounded-[3rem] overflow-hidden shadow-2xl mb-12 border border-slate-800 group bg-[#080808]">
                {settings?.heroUrl ? (
                    <img src={settings.heroUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" />
                ) : (
                    <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent flex flex-col justify-center px-8 md:px-20 z-10 p-12">
                    <div className="max-w-2xl animate-fade-up">
                        <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.9] drop-shadow-2xl mb-6 neon-text">
                            TECNOLOGÍA <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse-slow">
                                DEL FUTURO
                            </span>
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:bg-cyan-400 transition flex items-center justify-center gap-2 group/btn">
                                VER CATÁLOGO <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div id="catalog" className="sticky top-24 z-40 bg-[#050505]/80 backdrop-blur-xl py-4 mb-8 flex items-center gap-4 overflow-x-auto no-scrollbar">
                <Filter className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <button onClick={() => setSelectedCategory('')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory === '' ? 'bg-white text-black border-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                    Todos
                </button>
                {settings?.categories?.map(c => (
                    <button key={c} onClick={() => setSelectedCategory(c)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition border whitespace-nowrap ${selectedCategory === c ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                        {c}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map(p => (
                    <ProductCard key={p.id} product={p} manageCart={manageCart} toggleFavorite={toggleFavorite} isFavorite={currentUser?.favorites?.includes(p.id)} calculateItemPrice={calculateItemPrice} setPreviewImage={setPreviewImage} />
                ))}
            </div>

            {/* Load More Trigger */}
            {nexusHasMore && (
                <div className="mt-12 flex justify-center">
                    <button
                        onClick={loadMoreProducts}
                        disabled={isLoading}
                        className="px-8 py-4 bg-slate-900 border border-slate-800 text-white rounded-xl font-bold hover:bg-slate-800 transition"
                    >
                        {isLoading ? 'CARGANDO...' : 'CARGAR MÁS PRODUCTOS'}
                    </button>
                </div>
            )}
        </div>
    );
};

const ProductCard = ({ product, manageCart, toggleFavorite, isFavorite, calculateItemPrice, setPreviewImage }) => {
    const discountedPrice = calculateItemPrice(product.basePrice, product.discount);

    return (
        <div className="bg-[#0a0a0a] rounded-[2rem] border border-slate-800/50 overflow-hidden group hover:border-cyan-500/50 transition duration-500 relative flex flex-col h-full">
            <div className="h-72 bg-gradient-to-b from-slate-900 to-[#0a0a0a] p-8 flex items-center justify-center relative overflow-hidden" onClick={() => product.image && setPreviewImage(product.image)}>
                <img src={product.image} className={`w-full h-full object-contain drop-shadow-2xl z-10 transition-transform duration-500 group-hover:scale-110 ${product.stock <= 0 ? 'grayscale opacity-50' : ''}`} />
                {product.stock <= 0 && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <span className="text-red-500 font-black text-2xl uppercase border-4 border-red-500 p-2">AGOTADO</span>
                    </div>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(product) }}
                    className={`absolute top-4 right-4 p-3 rounded-full z-20 transition border ${isFavorite ? 'bg-red-500 text-white border-red-500' : 'bg-white/10 text-slate-300 border-white/10 hover:text-red-500'}`}
                >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-[#0a0a0a]">
                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">{product.category}</p>
                <h3 className="text-white font-bold text-lg leading-tight mb-4 line-clamp-2">{product.name}</h3>
                <div className="mt-auto flex items-end justify-between">
                    <div className="flex flex-col">
                        {product.discount > 0 && <span className="text-xs text-slate-500 line-through">${product.basePrice.toLocaleString()}</span>}
                        <span className="text-2xl font-black text-white">${discountedPrice.toLocaleString()}</span>
                    </div>
                    {product.stock > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); manageCart(product, 1) }} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-cyan-400 transition">
                            <Plus className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
