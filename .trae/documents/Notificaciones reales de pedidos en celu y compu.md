# Plan: Notificaciones reales de pedidos en celu y compu

## Objetivo
Implementar notificaciones push reales cuando se confirma una compra/pedido, para que el admin reciba aviso en computadora (navegador) y en celular (navegador móvil instalado o abierto), manteniendo el aviso sonoro actual como respaldo.

## Estado actual detectado
- Ya existe detección de pedidos nuevos en tiempo real y badge visual en admin.
- Ya existe alarma sonora en el panel admin.
- No existe push notification web real vía Service Worker/Push API.
- Ya existe backend de confirmación de pedidos en `api/orders/confirm.js`.

## Suposiciones de implementación
- Se usará Web Push estándar (Service Worker + Push API + VAPID).
- El destinatario inicial será el usuario admin/editor autenticado con acceso al panel.
- Se notificará únicamente cuando el pedido queda creado en Firestore (éxito confirmado).
- Si el dispositivo no soporta push o no dio permiso, seguirá funcionando badge + sonido local.

## Diseño técnico

### 1) Modelo de suscripciones push
- Crear colección por tienda para guardar suscripciones web push, por ejemplo:
  - `artifacts/{storeId}/public/data/pushSubscriptions/{subscriptionId}`
- Guardar:
  - `endpoint`, `keys.p256dh`, `keys.auth`
  - `userId`, `role`, `userAgent`, `platform`
  - `createdAt`, `updatedAt`, `lastSuccessAt`, `lastErrorAt`, `disabled`
- Definir `subscriptionId` determinístico con hash de `endpoint` para evitar duplicados.

### 2) Endpoints API para suscripción
- Crear endpoint `POST /api/notifications/subscribe`:
  - Requiere token autenticado.
  - Valida formato PushSubscription.
  - Inserta/actualiza documento de suscripción.
- Crear endpoint `POST /api/notifications/unsubscribe`:
  - Requiere token autenticado.
  - Desactiva o elimina suscripción por endpoint/hash.
- Validar permisos para permitir solo roles de staff (admin/editor) si corresponde.

### 3) Emisor de notificaciones desde backend
- Integrar librería `web-push` en backend.
- Configurar variables de entorno:
  - `WEB_PUSH_PUBLIC_KEY`
  - `WEB_PUSH_PRIVATE_KEY`
  - `WEB_PUSH_SUBJECT` (mailto o URL)
- Extraer función reusable en `lib` para:
  - Cargar suscripciones activas de la tienda.
  - Enviar payload JSON con título, cuerpo, ícono, tag, url de destino.
  - Manejar errores por suscripción inválida y marcar `disabled`.
- Invocar envío en `api/orders/confirm.js` después de confirmar transacción de pedido.
- No bloquear respuesta al cliente por fallas de push (best effort con try/catch).

### 4) Service Worker: recepción y click
- Extender `sw.js` con listeners:
  - `push`: parsea payload y muestra `showNotification`.
  - `notificationclick`: enfoca pestaña existente o abre URL del panel de pedidos.
- Definir defaults visuales:
  - título: “Nuevo pedido”
  - body con monto e ID
  - ícono y badge del proyecto
  - `tag` para agrupar eventos por pedido

### 5) Frontend admin: alta/baja de suscripción
- En inicialización del admin:
  - Pedir permiso de notificaciones con acción explícita del usuario.
  - Registrar/usar Service Worker activo.
  - Obtener `PushSubscription` con VAPID public key.
  - Enviar a `/api/notifications/subscribe`.
- En configuración admin:
  - Mostrar estado: permitido/bloqueado/no soportado.
  - Botón activar/desactivar notificaciones push.
  - Al desactivar: llamar `/api/notifications/unsubscribe`.
- Mantener alarma sonora actual como fallback separado.

### 6) Reglas y seguridad
- Ajustar reglas Firestore para permitir escritura de suscripción solo al usuario dueño.
- Evitar exponer private key en frontend.
- Sanitizar payload y limitar tamaño.
- Evitar enviar datos sensibles en notificación (solo resumen operativo).

### 7) Estrategia de entrega y pruebas
- Pruebas funcionales:
  - Suscribir desde compu y celular.
  - Confirmar pedido y validar push recibido en ambos.
  - Click en notificación abre/dirige a pedidos.
- Pruebas de resiliencia:
  - Suscripción vencida/inválida se desactiva automáticamente.
  - Backend responde OK aunque falle push.
- Pruebas de compatibilidad:
  - Chrome desktop
  - Chrome Android
  - Safari iOS (si versión soporta web push para PWA instalada)
- Pruebas de regresión:
  - Flujo checkout y confirmación de pedido sin cambios funcionales.

### 8) Observabilidad mínima
- Registrar resultado de envío push por pedido:
  - enviados exitosos
  - fallidos
  - suscripciones deshabilitadas
- Agregar logs estructurados para diagnosticar permisos, endpoint inválido y errores de proveedor.

## Orden de implementación
1. Preparar configuración Web Push (dependencia + VAPID env).
2. Crear endpoints subscribe/unsubscribe.
3. Implementar módulo backend de envío push.
4. Integrar disparo de push en confirmación de pedido.
5. Ampliar `sw.js` para `push` y `notificationclick`.
6. Integrar UI/admin para activar/desactivar suscripción.
7. Ajustar reglas de seguridad y validaciones.
8. Ejecutar pruebas end-to-end en compu y celu.
9. Ajustar UX final y fallback con alarma actual.

## Criterios de aceptación
- Al confirmarse un pedido, llega notificación real push al navegador de compu suscripto.
- Al confirmarse un pedido, llega notificación real push al celu suscripto.
- Click en notificación lleva a la sección de pedidos del admin.
- Si push falla, la compra no se rompe y se mantiene fallback existente.
- Suscripciones inválidas no se reintentan indefinidamente.
