## Hallazgos críticos (hoy mismo impiden “100% funcional y seguro”)
- Credenciales y llaves expuestas: el repo incluye un `.env` con secretos (Firebase Admin / MercadoPago). Eso es una toma total del proyecto si se filtra.
- Backdoor de admin en el frontend: hay un “bypass admin de emergencia” con email y contraseña en claro en `script.js`.
- Endpoints admin sin protección: `/api/admin/update-user` y `/api/admin/delete-user` permiten borrar/editar usuarios sin verificar quién llama.
- Checkout incompatible con reglas seguras: el cliente intenta actualizar stock y cupones desde el navegador; con reglas correctas eso debe fallar (y hoy obliga a reglas laxas).
- Lecturas de Firestore sin filtros: `orders` (y partes de `users`) se leen “todas” desde el cliente, lo cual rompe permisos/privacidad.
- Logs sensibles: el endpoint de Mercado Pago loguea token de pago (dato altamente sensible).

## Objetivo de la corrección
- Que clientes puedan: navegar, registrarse/loguearse, carrito, checkout, ver sus pedidos, perfil.
- Que administradores puedan: ver/editar usuarios, ver pedidos, gestionar productos/config/cupones.
- Que la seguridad dependa de Firebase Auth + reglas/servidor (no de localStorage ni del JS del cliente).

## Plan de cambios (sin suposiciones, alineado a producción)
### 1) Seguridad inmediata
- Eliminar `.env` del repo y agregarlo a `.gitignore`.
- Rotar credenciales en servicios (Firebase service account / MercadoPago / Gmail/Nodemailer) y actualizar variables de entorno en Vercel.
- Quitar/máscara de logs sensibles en `/api/checkout` (no loguear `paymentData.token` ni datos de tarjeta).

### 2) Autenticación: unificar en Firebase Auth (sin passwords en Firestore)
- Remover el “bypass admin” hardcodeado del cliente.
- Registro/login solo con Firebase Auth (`createUserWithEmailAndPassword` / `signInWithEmailAndPassword`).
- Perfil de usuario en Firestore usando `uid` como ID del documento (`users/{uid}`), para que `isOwner(uid)` funcione.
- Migración segura para usuarios existentes:
  - Al loguearse, si no existe `users/{uid}`, crear el perfil mínimo.
  - Agregar un endpoint serverless de “claim legacy profile” que, con token válido, busque el viejo documento por email y lo migre al `uid` (sin exponer listados al cliente).

### 3) Checkout y pedidos: mover operaciones sensibles al servidor
- Crear un endpoint único (ej: `/api/orders/confirm`) que:
  - Verifique `Authorization: Bearer <Firebase ID token>`.
  - Calcule totales y valide stock en servidor.
  - Cree el pedido con `customerId: uid`.
  - Descuente stock y registre uso de cupón con Admin SDK (transacción/batch).
  - Dispare el email de confirmación.
- Dejar al cliente solo como UI (sin `batch.update` de stock/ cupones).

### 4) Endpoints admin protegidos
- En `/api/admin/*` exigir token Firebase y verificar rol admin (super admin por email + equipo en config, o custom claims).
- Actualizar el frontend para enviar `Authorization` en fetch.

### 5) Reglas Firestore consistentes con el modelo
- Corregir reglas propuestas para:
  - `isTeamAdmin`: evitar `hasAny` con objetos exactos; chequear por `email`/`role` de forma robusta.
  - Pedidos: usar `customerId` (no `userId`) para lectura de cliente.
  - Escrituras: clientes pueden crear pedidos y escribir su carrito/perfil; stock/cupones solo via Admin SDK (server).

### 6) Fixes funcionales y de performance
- Reemplazar `getDocs(usersRef)` (scans completos) por consultas específicas o endpoints server (username/email uniqueness, migración, etc.).
- Ajustar listeners:
  - `orders`: query filtrada por `customerId == uid` para cliente; vista admin separada.
  - `users`: solo admin lista; cliente solo su doc.

### 7) Verificación “alta confianza” (lo más cercano a 100%)
- Agregar pruebas automáticas de humo (Playwright) para:
  - Cliente: navegación, registro/login, carrito, checkout (modo transferencia/efectivo o mock), ver pedido.
  - Admin: login, panel, editar usuario, ver pedidos.
  - Seguridad: endpoints admin rechazan sin token y con usuario no-admin.
- Smoke test manual final en navegador móvil + desktop.

## Entregables
- Código corregido (frontend + endpoints) y endurecido (sin backdoor, sin secretos, sin logs sensibles).
- Reglas Firestore actualizadas para producción.
- Suite de tests de humo reproducible.

Si confirmás este plan, paso a implementar los cambios y a ejecutar/validar los tests hasta que quede estable para clientes y administradores.