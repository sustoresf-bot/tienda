# Plan de Implementación: Botón de Compartir Producto

Este plan describe los pasos para agregar un botón de "Compartir" a las tarjetas de producto y manejar la redirección directa al producto compartido.

## Objetivo
Permitir a los usuarios compartir un enlace directo a un producto específico. Cuando alguien accede a ese enlace, el sitio debe abrir automáticamente el detalle de ese producto.

## Pasos de Implementación

1.  **Modificar `ProductCard` en `script.js`**
    *   Agregar un botón con el icono `Share2` en la tarjeta del producto (cerca del botón de favoritos o en una posición visible).
    *   Implementar la lógica `handleShare` que:
        *   Genera la URL del producto: `window.location.origin + window.location.pathname + '?product=' + p.id`.
        *   Copia la URL al portapapeles usando `navigator.clipboard.writeText`.
        *   Muestra un mensaje (toast) confirmando que el enlace fue copiado.

2.  **Modificar `App` en `script.js`**
    *   Agregar un `useEffect` que se ejecute cuando `products` cambie o al montar el componente.
    *   Leer el parámetro `product` de la URL (`window.location.search`).
    *   Si el parámetro existe y el producto se encuentra en la lista `products`, establecerlo como `selectedProduct` para abrir su modal/detalle.
    *   Opcional: Limpiar la URL después de abrir el producto para evitar que se reabra al recargar la página (usando `window.history.replaceState`).

## Detalles Técnicos

*   **Archivo:** `script.js`
*   **Componentes afectados:** `ProductCard`, `App`
*   **Librerías/Iconos:** Usar `Share2` de `lucide-react` (ya importado).

## Verificación
*   Verificar que el botón de compartir aparezca en las tarjetas de producto.
*   Verificar que al hacer clic se copie la URL correcta.
*   Verificar que al abrir la URL copiada en una nueva pestaña, se abra automáticamente el detalle del producto correspondiente.
