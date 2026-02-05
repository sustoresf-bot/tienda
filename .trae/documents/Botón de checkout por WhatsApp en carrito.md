## Objetivo
- Agregar en la vista del carrito un botón “Terminar compra por WhatsApp” que, al tocarlo, abra WhatsApp del dueño con un mensaje armado con: productos, cantidades, precios, subtotal, cupón (si aplica y sigue siendo válido), descuento y total estimado.
- Dejarlo **configurable** desde Admin → Configuración y **desactivado por defecto**.

## Dónde tocar el código
- UI carrito: [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L5943-L6076) (bloque `view === 'cart'`).
- Defaults de settings: [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L402-L445) (`defaultSettings`).
- Panel Admin → Social (WhatsApp): [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L9880-L9938).

## Implementación
1. **Nuevo flag de configuración (default OFF)**
   - Agregar en `defaultSettings` un boolean, por ejemplo: `showCartWhatsappCheckout: false`.
   - Eso hace que, si el doc de Firestore aún no tiene el campo, el merge use `false` (por defecto desactivado).

2. **Toggle en Admin → Configuración → Social (dentro de la card de WhatsApp)**
   - Agregar un switch “Botón en Carrito” que edite `settings.showCartWhatsappCheckout`.
   - Mantener el estilo de toggles ya usado en esa sección.

3. **Armar el mensaje para WhatsApp (solo frontend)**
   - Crear una función helper (en el mismo componente) que construya el texto:
     - Encabezado: “Hola, quiero terminar mi compra por WhatsApp” + nombre/email si existe.
     - Lista: `cantidad x nombre — $unitario — $subtotal_item`.
     - Totales: Subtotal.
     - Cupón: incluir **solo si** `appliedCoupon` sigue cumpliendo reglas mínimas (vencimiento, minPurchase, usageLimit, target) y el descuento resultante es > 0.
     - Total estimado: el mismo `finalTotal` actual (incluye envío según `checkoutData.shippingMethod`, que hoy arranca en Pickup).

4. **Construir el link correcto**
   - Reusar el WhatsApp del dueño existente: `settings.whatsappLink` (hoy se usa para los botones de WhatsApp del sitio).
   - Implementar un helper `buildWhatsappUrl(settings.whatsappLink, message)` que:
     - Agregue/actualice el parámetro `text` de forma segura (`?text=` o `&text=`).
     - Si el link no es válido o está vacío, mostrar un toast tipo “Configura el enlace de WhatsApp en Admin → Configuración → Social”.

5. **Botón en la cabecera del carrito**
   - En [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L5946-L5953), agregar el botón a la derecha (responsive) cuando:
     - `settings.showCartWhatsappCheckout === true`
     - y `settings.whatsappLink` tenga valor.
   - Al click: `window.open(buildWhatsappUrl(...), '_blank')`.

## Validación
- Con el toggle apagado (default): el botón no aparece.
- Activarlo en Admin → Social y guardar: el botón aparece en el carrito.
- Agregar 2–3 productos con distintas cantidades: el texto incluye items + totales.
- Aplicar un cupón válido: el texto incluye cupón y descuento.
- Si el cupón deja de aplicar (por ej. baja el subtotal por debajo de minPurchase): el texto no lo incluye.

Si confirmás este plan, hago los cambios en `script.js` y lo pruebo con el flujo real del carrito.