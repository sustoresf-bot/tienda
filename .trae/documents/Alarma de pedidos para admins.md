## Objetivo
- Cuando entra un pedido nuevo, que a cualquier admin (esté donde esté en la tienda) le suene una alarma repetitiva que **no para** hasta que alguien (cualquier admin) entra a **Admin → Pedidos**.
- Agregar opción para **mutear / desmutear** la alarma.

## Cómo lo voy a implementar (sin Push, solo “in-app”)
- Ya existe una suscripción en tiempo real a Firestore de `orders` para admins ([script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L2130-L2141)). Voy a usar esa data para detectar “pedido nuevo”.
- Voy a guardar un “marcador global de visto” en Firestore en `settings/config` (ya se escucha por `onSnapshot`): un campo nuevo `ordersLastSeenIso` (string ISO).
  - Los pedidos ya guardan `date` como ISO string ([confirm.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/api/orders/confirm.js#L313-L337)), así que comparar funciona bien.
  - Multi-admin: cuando **un** admin marca visto, se actualiza `settings/config`, y automáticamente a los demás se les corta la alarma (porque todos escuchan el mismo doc de settings).

## Lógica de detección
- Definir `latestOrderIso = orders[0]?.date` (la query ya viene ordenada por `date desc` para admin).
- `hasUnseen = latestOrderIso && (!settings.ordersLastSeenIso || latestOrderIso > settings.ordersLastSeenIso)`.
- La alarma se activa si:
  - usuario es admin,
  - `hasUnseen === true`,
  - y **no** está en `view==='admin' && adminTab==='orders'`.

## Reproducción de alarma (repetitiva)
- Implementar un “buzzer” con Web Audio API (sin archivo mp3, para evitar problemas de MIME/hosting): un beep corto que se repite cada ~2s mientras esté activa.
- Manejar bloqueo de autoplay:
  - Si el navegador no deja sonar hasta interacción, se muestra un toast/aviso para “habilitar sonido” (y la alarma empezará en cuanto el usuario haga click en algún botón).

## Marcar como visto (y cortar alarma)
- Agregar un `useEffect` que, cuando el admin entra a `adminTab==='orders'`, haga:
  - `updateDoc(settings/config, { ordersLastSeenIso: latestOrderIso || new Date().toISOString() })`
  - detener la alarma local.
- También inicializar `ordersLastSeenIso` si no existe, para evitar que al primer login te suene por pedidos viejos.

## Botón de mute
- Guardar preferencia en `localStorage` (por navegador): `adminOrderAlarmMuted=1|0`.
- Agregar un toggle visible en el sidebar del admin (cerca de “Pedidos”) con icono campana:
  - “Notificación pedidos: Activada / Muteada”.
  - Si está muteada, nunca reproduce sonido, pero igual muestra indicador visual.

## Indicadores visuales (para que sea tipo WhatsApp)
- Si hay pedido sin ver, mostrar un puntito/estado en el botón “Pedidos” del sidebar (y/o un badge).
- Al entrar a “Pedidos” desaparece (porque se actualiza `ordersLastSeenIso`).

## Archivos a tocar
- [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js): estado + efectos + UI del toggle + lógica de beep + update de visto.

## Verificación
- Con 2 sesiones (dos admins o admin + cliente):
  - Cliente crea pedido.
  - Admin escucha alarma continua en cualquier tab/vista.
  - Entra a Admin → Pedidos: alarma se corta y se limpia el indicador.
  - Segundo admin (en otra pestaña) también deja de sonar cuando el primero abre Pedidos.
  - Probar mute: se corta el sonido y queda solo indicador visual.

## Nota de alcance
- Esto funciona mientras el admin tenga la web abierta. Si querés que suene con el navegador cerrado, ahí sí habría que agregar Push Notifications (Firebase Cloud Messaging) u otro sistema.
