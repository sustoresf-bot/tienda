## Diagnóstico (por qué hoy se siente lento)
- La app se transpila en el navegador: `index.html` carga Babel standalone y ejecuta `script.js` como `type="text/babel"` ([index.html](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/index.html#L117-L151)). Eso agrega mucho costo de descarga/parse/compile antes de que la UI sea interactiva.
- Tailwind se genera/inyecta en runtime desde CDN ([index.html](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/index.html#L117-L119)), sumando más ejecución y bloqueos de estilo.
- `script.js` es monolítico (muy grande) y concentra todo (cliente + admin + IA + checkout), por lo que se paga el costo completo siempre.
- Hay muchas suscripciones Firestore simultáneas (products/promos/banners/coupons/settings siempre + varias de admin), que disparan renders y lecturas ([script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L3312-L3484)).
- La validación del carrito hace búsquedas repetidas `products.find(...)` y además puede escribir a Firestore en un efecto que depende del propio `cart` (riesgo de trabajo extra/loops) ([script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L3486-L3568)).
- El Service Worker no precachea `script.js`, así que el “warm load” no mejora tanto como podría ([sw.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/sw.js#L4-L10)).

## Objetivos medibles
- Bajar “long tasks” y el tiempo hasta interacción (TTI).
- Reducir bytes/requests de la carga inicial (especialmente JS/CSS).
- Reducir listeners/lecturas Firestore, sobre todo para clientes.
- Mantener comportamiento actual (cliente + admin) y pasar tests.

## Plan de implementación (cambios concretos)
### 1) Medición base (antes/después)
- Perf profile (Chrome) para confirmar qué bloquea: Babel/Tailwind/runtime + renders por snapshots.
- Lighthouse (mobile) y comparación posterior: FCP/LCP/TTI/TBT.

### 2) Eliminar Babel en runtime (mayor impacto inmediato)
- Agregar un build simple (esbuild) que precompile/minifique `script.js` (JSX incluido) a un archivo estático (ej. `assets/app.js`).
- Cambiar `index.html` para cargar ese bundle como `type="module"` y quitar Babel.
- Mantener inicialmente las dependencias por importmap/CDN (para no hacer un refactor enorme), y en una segunda etapa moverlas a dependencias npm si conviene.

### 3) Dejar de usar Tailwind CDN
- Pasar a Tailwind “build-time”: generar un CSS estático (purgeado por contenido) y servirlo como archivo (sin ejecución en cliente).
- Integrar con el `styles.css` existente.

### 4) Reducir trabajo de Firestore y renders
- Separar “datos públicos” vs “datos admin” y suscribirse solo cuando corresponde (ej. no abrir listeners de admin si el usuario no está en Admin).
- Para órdenes admin: suscribir solo “últimos N” y paginar histórico (no 200 siempre).
- Para colecciones pesadas: preferir `getDocs` + cache local + refresco manual/intervalo, y reservar `onSnapshot` solo donde realmente aporta.

### 5) Optimizar carrito (CPU + lecturas/escrituras)
- Crear un índice `productsById` (Map) con `useMemo` para evitar `find` repetidos.
- Evitar que la validación escriba a Firestore en un efecto acoplado al `cart`; separar “sanitizado local” de “sync remoto” y escribir solo si hay diff real (con guardas via `useRef`).

### 6) Code splitting y lazy-load (para que el cliente no pague el Admin)
- Partir el monolito en módulos: core tienda, panel admin, SustIA, MercadoPago.
- Cargar admin/IA/checkout con `import()` cuando se navega a esas secciones.

### 7) Mejoras de cache offline
- Extender el precache del SW a `script` bundle, `manifest`, íconos y assets críticos.
- Aplicar estrategia `stale-while-revalidate` para JS/CSS, y evitar cachear `/api/*`.

### 8) Validación
- Correr Playwright (`tests/*.spec.js`) y agregar un smoke de “carga inicial rápida” si hace falta.
- Repetir Lighthouse y confirmar mejoras.

## Entregables
- App cargando sin Babel ni Tailwind runtime.
- Menos listeners Firestore y menos renders innecesarios.
- Carrito más eficiente y sin escrituras redundantes.
- SW con cache real de assets críticos.

Si confirmás este plan, lo implemento en ese orden y dejo benchmarks (antes/después) y links a los cambios en los archivos clave.