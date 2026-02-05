## Objetivo
- Reemplazar completamente el JSX actual por una app nueva, mínima y estable, que vuelva a cargar en Vercel sin errores de JSX.

## Estrategia (sin perder tu código actual)
- Renombrar el `script.js` actual a un backup (por ejemplo `script.legacy.js`) para no perder nada.
- Crear un `script.js` nuevo desde cero con una estructura corta, clara y fácil de mantener.

## App nueva (qué incluye desde el primer paso)
- **Firebase init** con el mismo `firebaseConfig`.
- **Lectura de settings** desde Firestore y aplicación de:
  - nombre de tienda y datos básicos
  - meta tags/SEO principales (title/description/theme-color)
- **Vista Tienda**: listado de productos (desde Firestore), búsqueda simple y filtro por categoría.
- **Carrito**: agregar/quitar, persistencia en `localStorage`, vista carrito.
- **Navegación por `view`** (store/cart/checkout/login/register/admin) pero implementada limpia (sin JSX anidado roto).

## Reconstrucción por etapas (para que “funcione ya” y luego recuperar todo)
1. **Etapa 1 (estabilidad)**
   - Tienda + carrito + layout base + settings/SEO.
   - Checkout solo como placeholder funcional (pantalla + botón volver), sin lógica compleja.
2. **Etapa 2 (checkout real)**
   - Form de checkout mínimo y creación de orden en Firestore.
   - Integración con endpoints existentes en `/api` si corresponde.
3. **Etapa 3 (auth y perfil)**
   - Login/register con Firebase Auth.
   - Perfil simple con historial de órdenes.
4. **Etapa 4 (admin mínimo)**
   - Acceso por email (super admin) y/o rol en Firestore.
   - CRUD básico de productos y ver órdenes.

## Verificación
- Correr `npm run lint` (ya existe en el repo) hasta que pase.
- Levantar `npm run serve` y validar que la home carga y que el carrito funciona.
- Si todo ok, listo para deploy.

## Resultado esperado
- Vercel vuelve a compilar (sin error de `</main>` / JSX) y la web vuelve a abrir.
- Después reponemos funcionalidades avanzadas con cambios controlados.
