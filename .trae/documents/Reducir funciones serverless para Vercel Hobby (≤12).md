## Qué significa el error
- En el plan Hobby, Vercel permite **máximo 12 Serverless Functions** por deployment.
- En tu proyecto, Vercel está contando **1 función por cada archivo dentro de `api/`**.
- Ahora mismo se generan **16 funciones**, por eso falla el deploy.

## Dónde se originan las 16 funciones
- La carpeta `api/` tiene 16 handlers (incluye utilidades que hoy también cuentan como función):
  - Helpers que no deberían ser rutas: [api/_authz.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/_authz.js), [api/_firebaseAdmin.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/_firebaseAdmin.js)
  - Admin (4): [import-store](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/import-store.js), [export-store](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/export-store.js), [delete-user](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/delete-user.js), [update-user](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/admin/update-user.js)
  - Auth (5): [legacy-login](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/auth/legacy-login.js), [username-lookup](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/auth/username-lookup.js), [claim-legacy-profile](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/auth/claim-legacy-profile.js), [setup-profile](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/auth/setup-profile.js), [bootstrap-super-admin](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/auth/bootstrap-super-admin.js)
  - Otras: [public-config](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/public-config.js), [checkout](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/checkout.js), [payment](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/payment.js), [ai/chat](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/ai/chat.js), [orders/confirm](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/orders/confirm.js)

## Plan para bajar a 12 (cambio mínimo y seguro)
1) **Dejar de desplegar helpers como funciones** (baja 2 funciones: 16 → 14)
   - Mover `api/_authz.js` y `api/_firebaseAdmin.js` fuera de `api/` (por ejemplo a `lib/`).
   - Actualizar imports en los demás handlers.

2) **Unificar endpoints de usuarios admin** (baja 1 función: 14 → 13)
   - Crear `api/admin/users.js` que maneje en un solo handler las acciones de “update” y “delete”.
   - Actualizar el frontend para llamar a `/api/admin/users`.
   - Eliminar `api/admin/delete-user.js` y `api/admin/update-user.js`.

3) **Hacer `public-config` estático** (baja 1 función: 13 → 12)
   - Si el contenido es público, moverlo a un JSON estático (por ejemplo `public/public-config.json`).
   - Actualizar el frontend para leer ese JSON estático.
   - Eliminar `api/public-config.js`.

## Verificación
- Ejecutar el proyecto localmente y probar:
  - Login y acciones de admin (update/delete user).
  - Checkout/pago, confirmación de pedido, y chat IA.
- Confirmar que la carpeta `api/` quedó con **≤ 12 archivos-handler**.

## Alternativa (más limpia, menos endpoints)
- En vez de `public-config` estático, unificar `auth` en 1–2 handlers (por ejemplo `api/auth/index.js` con `action`), para quedar con margen (10–11 funciones).

Si confirmas este plan, aplico los cambios directamente en el repo y dejo el proyecto listo para desplegar en Vercel Hobby sin superar el límite.