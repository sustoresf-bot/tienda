# Plan de Mejoras Visuales y Animaciones para Sustore

El objetivo es elevar la calidad visual de la tienda agregando animaciones profesionales, transiciones suaves y efectos atractivos, sin comprometer el rendimiento ni la estructura lógica de la aplicación React existente.

## 1. Estrategia de Animación CSS (styles.css)

Utilizaremos CSS puro para la mayoría de las animaciones para asegurar un alto rendimiento (60fps) y evitar la complejidad de librerías de JS externas.

### 1.1. Biblioteca de Animaciones Base
Agregaremos un set de keyframes reutilizables en `styles.css`:
- **Fade In Up**: Para la aparición de productos y secciones.
- **Scale In**: Para modales y badges.
- **Slide In**: Para menús laterales y notificaciones.
- **Shimmer/Shine**: Para efectos de carga y botones premium.
- **Float**: Para elementos destacados en el hero.
- **Pulse Glow**: Para elementos de llamada a la acción (CTA).

### 1.2. Animaciones de Entrada (Staggered)
Implementaremos animaciones secuenciales para la grilla de productos utilizando selectores `nth-child` para simular un efecto de cascada (stagger) sin necesidad de modificar el JavaScript.
- Los primeros 10-12 productos tendrán retrasos incrementales (0.1s, 0.2s, etc.).

### 1.3. Micro-interacciones y Hover
Mejoraremos la respuesta visual al interactuar con elementos:
- **Botones**: Efecto de brillo (shine) al pasar el mouse y escala al presionar.
- **Tarjetas de Producto**: Elevación suave (translateY), aumento de sombra y ligero zoom en la imagen.
- **Inputs**: Transición de borde y resplandor (glow) al enfocar.

## 2. Mejoras Específicas por Componente

### 2.1. Hero Section
- Animar la entrada del título y subtítulo.
- Agregar un efecto de "respiración" o flotación sutil a la imagen principal o fondo.
- Mejorar el botón de CTA principal con un efecto de atención.

### 2.2. Grilla de Productos
- Aplicar `animation-fill-mode: backwards` para que los elementos no sean visibles antes de animarse.
- Suavizar la transición de las imágenes al cargar.

### 2.3. Modales y Paneles (Carrito, Checkout)
- **Carrito**: Deslizar desde la derecha con una curva de Bezier suave.
- **Modales (Producto, Login)**: Aparecer con un efecto de escala (zoom out -> in) y opacidad.
- **Backdrop**: Fade in suave.

### 2.4. Navegación
- Hacer que la barra de navegación tenga una transición de fondo más suave al hacer scroll (glassmorphism dinámico).
- Animar los iconos del menú al interactuar.

## 3. Implementación

### Paso 1: Definir Keyframes y Clases de Utilidad
Editar `styles.css` para incluir las nuevas definiciones de animación.

### Paso 2: Aplicar Animaciones a Selectores Existentes
Actualizar las reglas CSS existentes para `.premium-product-card`, `.store-view`, `.modal-themed`, etc., para incluir las propiedades `animation`.

### Paso 3: Optimización Mobile
Asegurar que las animaciones sean sutiles o estén desactivadas en dispositivos móviles si afectan el rendimiento o la usabilidad (`prefers-reduced-motion`).

## 4. Archivos a Modificar
- `styles.css`: 99% de los cambios ocurrirán aquí.
- `index.html`: Verificación de clases base (si es necesario).

## 5. Verificación
- Comprobar que las animaciones no bloqueen la interacción.
- Verificar la fluidez en móviles.
- Asegurar que el layout no salte (CLS) durante las animaciones.
