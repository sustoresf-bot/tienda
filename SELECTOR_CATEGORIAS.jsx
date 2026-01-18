/* 
 * SELECTOR DE CATEGORÍAS MÚLTIPLES PARA PRODUCTOS
 * Instrucciones: Buscar en script.js la sección donde se editan/agregan productos
 * y reemplazar el <select> de categoría por este componente
 */

// En el lugar donde está el formulario de producto, reemplazar el select de categoría por:

<div className="mb-6">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">
        Categorías (Selecciona una o más)
    </label>
    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
        {(settings?.categories || []).length === 0 ? (
            <p className="text-center text-slate-600 py-4 text-sm">
                No hay categorías disponibles. Agrégalas en Configuración → Tienda.
            </p>
        ) : (
            (settings?.categories || []).map(cat => {
                // Soporte retrocompatible: verificar tanto categories (array) como category (string)
                const isSelected = Array.isArray(newProduct.categories)
                    ? newProduct.categories.includes(cat)
                    : (newProduct.category === cat); // Retrocompatibilidad

                return (
                    <label
                        key={cat}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all group hover:bg-slate-800 mb-2 last:mb-0 ${isSelected ? 'bg-orange-900/20 border border-orange-500/30' : 'border border-transparent'
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    // Agregar categoría
                                    const current = Array.isArray(newProduct.categories)
                                        ? newProduct.categories
                                        : (newProduct.category ? [newProduct.category] : []);
                                    setNewProduct({
                                        ...newProduct,
                                        categories: [...current, cat],
                                        category: undefined // Eliminar el campo antiguo si existe
                                    });
                                } else {
                                    // Remover categoría
                                    const updated = Array.isArray(newProduct.categories)
                                        ? newProduct.categories.filter(c => c !== cat)
                                        : [];
                                    setNewProduct({
                                        ...newProduct,
                                        categories: updated
                                    });
                                }
                            }}
                            className="w-4 h-4 text-orange-600 bg-slate-900 border-slate-600 rounded focus:ring-orange-500 focus:ring-2"
                        />
                        <span className={`flex-1 text-sm font-medium transition-colors ${isSelected ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'
                            }`}>
                            {cat}
                        </span>
                        {isSelected && (
                            <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </span>
                        )}
                    </label>
                );
            })
        )}
    </div>
    {/* Mostrar categorías seleccionadas como tags */}
    {newProduct.categories && newProduct.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
            {newProduct.categories.map(cat => (
                <span
                    key={cat}
                    className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-500/30 flex items-center gap-2"
                >
                    {cat}
                    <button
                        type="button"
                        onClick={() => {
                            setNewProduct({
                                ...newProduct,
                                categories: newProduct.categories.filter(c => c !== cat)
                            });
                        }}
                        className="hover:text-orange-300 transition"
                    >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </span>
            ))}
        </div>
    )}
</div>

/*
 * FUNCIÓN DE GUARDADO
 * Asegura que siempre se guarde categories como array
 */

// En la función donde guardas/actualizas productos, cambiar:

const productData = {
    name: newProduct.name,
    basePrice: parseFloat(newProduct.basePrice),
    stock: parseInt(newProduct.stock),
    categories: Array.isArray(newProduct.categories) ? newProduct.categories :
        (newProduct.category ? [newProduct.category] : []), // Migración automática
    image: newProduct.image,
    description: newProduct.description || '',
    discount: parseInt(newProduct.discount) || 0,
    purchasePrice: parseFloat(newProduct.purchasePrice) || 0,
    isFeatured: newProduct.isFeatured || false,
    salesCount: newProduct.salesCount || 0,
    isActive: true
};

// Si estás editando, NO incluir category en absoluto (solo categories)
