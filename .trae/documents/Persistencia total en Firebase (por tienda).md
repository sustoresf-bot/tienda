## Cómo detecta la tienda en Vercel
- En Vercel no hace falta “configurar la URL en el código”. La app se entera del dominio porque el navegador siempre expone `window.location.hostname`.
- Ejemplos reales:
  - Dominio Vercel: `mi-tienda.vercel.app`
  - Dominio propio: `cliente.com` (o `www.cliente.com`)
- La app usa ese hostname para buscar en Firestore un mapeo: `storesIndex/{hostname} → { storeId }`.
- Si existe el mapeo, listo: todo se lee/escribe en `artifacts/{storeId}/public/data/...`.

## Requisito
- Sin parámetros en URL y sin que vos tengas que acordarte de cambiar cosas por cliente.

## Plan técnico
### 1) Blindar que “todo queda en Firebase”
- Confirmar/ajustar que config, productos, usuarios, pedidos, promos, cupones, proveedores, compras y finanzas solo se persisten en Firestore.
- Dejar localStorage únicamente para preferencias de UI (modo oscuro, mute alarma, caches no críticos).
- Asegurar que los defaults nunca pisen datos existentes (solo crear si falta, o usando `merge`/transacciones).

### 2) Autodetección por hostname (Vercel-ready)
- Implementar resolución de `storeId` así:
  1) `hostname = window.location.hostname.toLowerCase()` (normaliza también `www.`).
  2) Leer `storesIndex/{hostname}`.
  3) Si no existe y el usuario es admin, mostrar un wizard: “Registrar este dominio”.
     - Botón 1: “Usar la tienda actual” (crea el mapeo para este hostname).
     - Botón 2: “Crear tienda nueva” (crea un `storeId` nuevo y lo vincula).
- Resultado: cuando desplegás en Vercel (vercel.app o dominio propio), la app detecta automáticamente el hostname; si es la primera vez, el admin lo registra desde el panel y no vuelve a tocar código.

### 3) Backend consistente por tienda
- Pasar `storeId` en requests críticos (confirmar pedido, admin ops) y validar permisos contra `settings/config` de esa tienda.

### 4) Reglas de seguridad
- Permitir lectura pública del índice `storesIndex/{hostname}`.
- Incluir colecciones consumidas por el cliente (ej. `homeBanners`) y mantener admin-only donde corresponde.

### 5) Backup/restore por tienda
- Exportación admin a JSON por `storeId` (config + colecciones principales) para no perder nada ante cambios grandes.

## Verificación
- Probar 2 hostnames (simulando 2 deploys Vercel) y verificar aislamiento total: productos/config/pedidos no se mezclan y no se pierden tras refresh/deploy.