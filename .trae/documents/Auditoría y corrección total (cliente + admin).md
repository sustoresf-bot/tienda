## Hallazgos (errores/riesgos reales en el código)
- **Secretos expuestos en el repo**: el archivo [.env](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/.env) contiene credenciales sensibles (Firebase Admin Private Key y MercadoPago Access Token). Esto es un problema crítico de seguridad y además puede romper producción si alguien las revoca/abusa.
- **Endpoints de admin sin autorización**: [/api/admin/delete-user.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/delete-user.js) y [/api/admin/update-user.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/update-user.js) permiten operaciones de Admin SDK sin verificar identidad/rol del caller.
- **Deep links pueden romperse**: en [vercel.json](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/vercel.json) no hay rewrite catch‑all a `index.html`, así que un refresh en una ruta “profunda” puede dar 404 (ej. `/admin` si alguien lo comparte).
- **Logs sensibles**: [/api/checkout.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/checkout.js) loguea prefijo del token y loguea el body del pago; [/api/payment.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/payment.js) loguea PII (email, etc.).
- **“Seguridad” de admin en cliente no es confiable**: el control en [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L41-L214) depende de `localStorage`/flags y de una “firma” con secreto hardcodeado; eso no protege nada contra un atacante (la seguridad real debe estar en reglas de Firestore y/o APIs con verificación server-side).

## Objetivo
Dejar la tienda **funcionando para clientes y administrador**, y subir el nivel de certeza al máximo posible con:
- validación estática (lint),
- validación de runtime (smoke tests de endpoints),
- y una ronda de QA manual guiada (flujos cliente/admin).

## Plan de correcciones (cambios de código)
1. **Secretos y configuración**
   - Eliminar `.env` del repo y agregar `.gitignore` para `.env*`.
   - Crear `.env.example` con variables esperadas (sin valores reales).
   - Agregar un validador de entorno (pequeño módulo compartido) para que las funciones `/api/*` fallen con error claro si falta una variable.
   - Recomendación operativa obligatoria: **rotar** (revocar/regenerar) las credenciales que estuvieron expuestas.

2. **Blindar endpoints `/api/admin/*`**
   - Implementar un helper `requireAdmin(req)` que:
     - lea `Authorization: Bearer <Firebase ID token>`,
     - haga `admin.auth().verifyIdToken(...)`,
     - y autorice solo si el email coincide con `SUPER_ADMIN_EMAIL` o una lista `ADMIN_EMAILS` en env (o custom claims, si ya existen).
   - Rechazar `POST` sin auth con `401/403`.
   - (Opcional recomendado) rate limit básico y validación estricta de body.

3. **Checkout / Payment: seguridad + robustez**
   - Quitar logs que incluyan token/payer/paymentBody.
   - Restringir CORS en `/api/checkout` a los dominios permitidos (env `ALLOWED_ORIGINS`).
   - Validar inputs: `payer.email`, `paymentData.token`, `payment_method_id`, etc.

4. **Ruteo SPA (Vercel) para evitar 404**
   - Agregar rewrite catch‑all a `/index.html` manteniendo `/api/*` intacto.
   - Verificar que assets estáticos sigan sirviéndose por filesystem antes del rewrite.

5. **Producción más estable (frontend)**
   - Cambiar importmap de React/ReactDOM a versión “prod” (sin `?dev`) en [index.html](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/index.html#L118-L131) para rendimiento y menos warnings.
   - (Opcional) cache-control coherente para `script.js`/SW.

## Plan de verificación (para estar “lo más cerca posible” de 100%)
1. **Checks automáticos**
   - Ejecutar `npm ci`.
   - Ejecutar `npm run lint` (usa los linters internos de JSX/estructura).
   - Agregar y ejecutar un smoke test Node para llamar handlers de `/api/checkout` y `/api/payment` con inputs inválidos y verificar códigos/respuestas.

2. **QA manual (flujos críticos)**
   - Cliente:
     - navegar catálogo, buscar, agregar/quitar carrito, checkout, pago, confirmación de email.
   - Admin:
     - login, acceso a panel, CRUD de productos/promos/cupones, ver/editar pedidos.
   - Validar en móvil/desktop y en modo incógnito.

## Limitación honesta
No existe manera seria de prometer “0 errores para todo el mundo” sin ejecutar el sistema en un entorno real y cubrir dependencias externas (Firebase/MercadoPago/Gmail). Este plan apunta a maximizar la certeza con pruebas y hardening.

Si confirmás este plan, paso a implementar los cambios en el repo y a dejarte una lista de verificación final (cliente/admin) con resultados.