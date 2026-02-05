## Objetivo
- Reemplazar la imagen hero (banner gigante) por un carrusel que cambie automáticamente cada 5s.
- Configurar desde Admin qué imágenes salen y a qué producto llevan.
- Al click del cliente en la imagen activa, abrir directamente el producto (modal actual).

## Estado Actual (lo que ya existe)
- El banner actual usa `settings.heroUrl` y se renderiza en Home dentro de [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L5393-L5450).
- La “navegación” a producto es por estado: `setSelectedProduct(product)` y muestra el modal premium ([script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L4273-L4442)).
- Admin ya puede subir `heroUrl`/`logoUrl` en Settings → Appearance → Imágenes ([script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L9025-L9062)).

## Modelo de Datos (config admin)
- Crear una nueva colección Firestore:
  - `artifacts/{appId}/public/data/homeBanners/{bannerId}`
  - Campos por banner: `imageUrl` (base64), `productId`, `enabled` (bool), `order` (number), `createdAt` (ISO).
- Mantener compatibilidad:
  - Si no hay banners habilitados, seguir mostrando `settings.heroUrl` como hoy.
- (Opcional) agregar en `settings` controles simples:
  - `homeBannerAutoplayMs` (default 5000), `showHomeBannerCarousel` (default true).

## Carga de Datos (storefront)
- Agregar un `onSnapshot` para `homeBanners` y guardar en estado `homeBanners`.
- Ordenar por `order` (y fallback por `createdAt`) para mostrar siempre en el orden que definís en Admin.

## UI Store: Carrusel en el Hero
- Reemplazar el `<img src={settings.heroUrl}>` del Hero por un carrusel que:
  - Auto-avanza cada 5000ms (configurable con `homeBannerAutoplayMs`).
  - Tiene transición suave (fade) y pre-carga la siguiente imagen para evitar parpadeos.
  - Tiene controles: dots (indicadores) + flechas (desktop) y swipe básico (mobile) si es simple.
  - Pausa en hover (desktop) para que el usuario pueda leer/interactuar.
- Click en el slide:
  - Resolver `productId → product` desde `products`.
  - Si existe: `setSelectedProduct(product)` (abre modal premium).
  - Si no existe: mostrar toast y scrollear a catálogo.
- Respetar los botones actuales (“VER CATÁLOGO”, “Ayuda”) sin que disparen el click del slide (usar `stopPropagation`).

## UI Admin: Gestión de slides
- En Settings → Appearance agregar un bloque “Carrusel Home” con:
  - Lista de banners (thumbnail + producto asignado + toggle enabled + orden).
  - “Agregar slide”: uploader de imagen (usa `handleImageUpload`), selector de producto (dropdown), guardar.
  - Editar: cambiar imagen/producto/orden/enabled.
  - Eliminar slide.
- Recomendación de performance:
  - Subidas con ancho máximo ~1200–1400 para evitar documentos grandes (Firestore limita 1MB por doc; regla ya lo valida).

## Reglas Firestore (necesario para que funcione)
- Actualizar el archivo de reglas [firestore-rules.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/firestore-rules.js) para incluir:
  - `allow read` para `collectionName == 'homeBanners'`.
  - `allow write` solo admin y con `isValidSize()`.
- Nota: además de cambiar el archivo, hay que publicarlas en Firebase Console.

## Verificación
- Validar en navegador:
  - Rota cada 5s.
  - Dots/flechas cambian slide.
  - Click abre el producto correcto.
  - Sin banners: usa el hero actual.
  - Cliente no ve controles admin.
  - Sin errores de permisos (si las reglas fueron publicadas).
