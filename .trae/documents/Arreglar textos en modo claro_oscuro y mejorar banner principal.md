## Diagnóstico
- Hay 2 sistemas de tema compitiendo: variables CSS con `.dark-mode` en [styles.css](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/styles.css) y un `<style id="light-mode-styles">` inyectado cuando `darkMode=false` en [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L1986-L2043).
- En modo claro, ese estilo fuerza `.text-white { color: #0f172a !important; }` y rompe el Hero, porque el banner está “diseñado oscuro fijo” (fondo/overlays oscuros) en [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L5141-L5199).
- La imagen del banner se “apaga” por capas (opacidad del `<img>` + noise + gradiente oscuro): `opacity-60` y overlays en [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L5142-L5158).

## Cambios (sin cambiar tu diseño general, solo hacerlo legible)
1. **Volver el banner sensible al tema (darkMode)**
   - En el Hero, hacer condicionales por `darkMode` para:
     - Fondo y borde del contenedor (oscuro en dark / claro en light).
     - Overlay (gradiente oscuro en dark / gradiente claro en light).
     - Tipografía del H1 (blanca en dark / oscura en light) y quitar/atenuar el efecto `neon-text` en light.
     - Botones (en light, evitar `text-white` sobre fondos claros).
   - Ajustar la imagen del banner para que en **modo claro quede ~40% de opacidad real** (lo que pedís de “40% transparente”) y evitar el “tinte” por overlay oscuro.

2. **Quitar inconsistencias del modo claro sin romper el resto**
   - Mantener el `light-mode-styles` (porque hoy es el que corrige muchas pantallas hechas en oscuro), pero refinarlo para que no degrade zonas que ya son temáticas.
   - En particular, dejar de depender de `.text-white` para el Hero: el Hero pasará a usar clases condicionales y colores correctos en light.

3. **Auditoría visual de textos en toda la tienda (claro y oscuro)**
   - Revisar secciones clave en `view='store'`: header/nav, cards de producto, modal carrito/checkout, formularios, footer.
   - Corregir casos típicos:
     - texto claro sobre fondo claro (por clases fijas)
     - texto oscuro sobre fondo oscuro (por overrides globales)
     - gradientes/transparentes que bajan legibilidad

## Verificación
- Levantar la app con el servidor local del repo y recorrer modo claro/oscuro.
- Ejecutar los smoke tests de Playwright para asegurar que no se rompe navegación/render.

## Archivos a tocar
- [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js) (Hero + ajustes de estilos de modo claro)
- [styles.css](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/styles.css) (solo si hace falta algún helper mínimo de tema)
