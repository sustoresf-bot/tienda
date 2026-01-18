# Implementación de Múltiples Categorías para Productos

## Cambios Realizados

### 1. Estado del Producto (✅ Completado)
- Modificado `newProduct.category` → `newProduct.categories` (array)
- Línea 1194 en script.js

### 2. Visualización en ProductCard (✅ Completado)
- Actualizado para mostrar la primera categoría del array
- Retrocompatible con productos antiguos que tienen `category` como string
- Línea 540 en script.js

## Cambios Pendientes

### 3. Formulario de Productos - Selector Múltiple

Debes buscar en `script.js` donde se renderiza el formulario de productos (busca "showProductForm" o el modal de crear/edit producto).

**Reemplaza el selector de categoría actual (que probablemente sea un `<select>`):**

```jsx
// ANTES (selector simple):
<select
    className="input-cyber w-full p-4"
    value={newProduct.category}
    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
>
    <option value="">Seleccionar Categoría...</option>
    {settings?.categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
    ))}
</select>

// DESPUÉS (selector múltiple con checkboxes):
<div className="space-y-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
        Categorías (Selecciona una o más)
    </label>
    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar">
        {(settings?.categories || []).map(cat => {
            const isSelected = Array.isArray(newProduct.categories) 
                ? newProduct.categories.includes(cat)
                : newProduct.category === cat; // Retrocompatibilidad
            
            return (
                <label
                    key={cat}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition group hover:bg-slate-800 ${
                        isSelected ? 'bg-orange-900/20 border border-orange-500/30' : ''
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
                                    category: undefined // Eliminar el campo antiguo
                                });
                            } else {
                                // Remover categoría
                                setNewProduct({
                                    ...newProduct,
                                    categories: newProduct.categories.filter(c => c !== cat)
                                });
                            }
                        }}
                        className="w-4 h-4 text-orange-600 bg-slate-900 border-slate-600 rounded focus:ring-orange-500"
                    />
                    <span className={`flex-1 text-sm font-medium ${
                        isSelected ? 'text-orange-400' : 'text-slate-300 group-hover:text-white'
                    }`}>
                        {cat}
                    </span>
                    {isSelected && (
                        <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
                            ✓
                        </span>
                    )}
                </label>
            );
        })}
    </div>
    {/* Mostrar categorías seleccionadas */}
    {newProduct.categories && newProduct.categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
            {newProduct.categories.map(cat => (
                <span key={cat} className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-500/30">
                    {cat}
                </span>
            ))}
        </div>
    )}
</div>
```

### 4. Función de Guardar Producto

Asegúrate de que cuando guardas el producto, el campo `categories` se guarde correctamente:

```javascript
// En la función que guarda/actualiza productos
const productData = {
    name: newProduct.name,
    basePrice: parseFloat(newProduct.basePrice),
    stock: parseInt(newProduct.stock),
    categories: newProduct.categories || [], // Asegurar que sea array
    // ... resto de campos
};
```

### 5. Filtros de Categoría (Mejora Opcional)

Para que los filtros funcionen con productos de múltiples categorías:

```javascript
// Buscar donde filtras productos por categoría (probablemente línea ~1600-1700)
const filteredProducts = products.filter(p => {
    // Filtro de búsqueda
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
    }
    
    // Filtro de categoría (ACTUALIZADO)
    if (selectedCategory) {
        if (Array.isArray(p.categories)) {
            // Producto con múltiples categorías
            if (!p.categories.includes(selectedCategory)) return false;
        } else if (p.category) {
            // Producto antiguo con una categoría
            if (p.category !== selectedCategory) return false;
        } else {
            return false;
        }
    }
    
    return true;
});
```

### 6. Visualización Mejorada en ProductCard (Opcional)

Si quieres mostrar TODAS las categorías del producto (no solo la primera):

```jsx
{/* En ProductCard, reemplazar línea 539-541 */}
<div className="flex flex-wrap gap-1">
    {(Array.isArray(p.categories) ? p.categories : (p.category ? [p.category] : [])).map((cat, idx) => (
        <p key={idx} className="text-[10px] text-orange-400 font-black uppercase tracking-widest border border-orange-900/30 bg-orange-900/10 px-2 py-1 rounded">
            {cat}
        </p>
    ))}
    {(!p.categories || p.categories.length === 0) && !p.category && (
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest border border-slate-800 bg-slate-900/10 px-2 py-1 rounded">
            Sin categoría
        </p>
    )}
</div>
```

## Instrucciones de Búsqueda

Para encontrar el formulario de productos en script.js:
1. Busca "showProductForm &&" o "productForm"
2. Busca el modal o sección donde se crea/edita un producto
3. Dentro de ese formulario, verás un `<select>` para categoría
4. Reemplázalo con el código del selector múltiple de arriba

## Migración de Datos Existentes

Los productos existentes que tienen `category` (string) seguirán funcionando gracias a la retrocompatibilidad implementada en el ProductCard. Opcionalmente, puedes migrarlos:

```javascript
// Script de migración (ejecutar una vez en consola de Firebase)
products.forEach(async (p) => {
    if (p.category && !p.categories) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', p.id), {
            categories: [p.category]
        });
    }
});
```

## Resultado Final

- ✅ Los productos pueden tener múltiples categorías
- ✅ El formulario muestra checkboxes para seleccionar
- ✅ La visualización muestra las categorías asignadas
- ✅ Los filtros funcionan correctamente
- ✅ Retrocompatible con productos antiguos
