## Estado Actual (lo que encontré)
- No hay ninguna ocurrencia literal de “Al doble” en el código; si lo ves en la UI, casi seguro viene de Firestore (banners/promos/settings). [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js)
- La “IA” existente es el chatbot SustIA (solo plan premium) y hoy es 100% local/rule-based (no usa modelos externos). [SustIABot](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js#L951-L1335)

## Objetivo
- Volver “Al doble / SustIA” mucho más inteligente e interactivo, manteniendo 0 errores de runtime y con fallback seguro si algo falla.

## Mejoras de Inteligencia (sin depender de servicios externos)
- Crear un “motor” de intents más completo: búsqueda, recomendaciones, cupones, envío, pagos, contacto humano, abrir carrito, modo claro/oscuro.
- Mejorar parsing de lenguaje natural:
  - Cantidades ("x3", "3 unidades"), rangos de precio ("menos de 20k", "entre 10 y 15"), categorías por fuzzy + sinónimos.
  - Recuperación contextual: “agregá el segundo”, “mostrame más”, “el más barato”.
- Mejorar ranking de productos:
  - Scoring por tokens + fuzzy + match de categoría + match de presupuesto.
  - Recomendaciones por destacados/descuento + diversidad (no repetir siempre lo mismo).
- Respuestas basadas en datos reales de la tienda:
  - Envío y retiro: usar `settings.shippingPickup` y `settings.shippingDelivery`.
  - Pagos: usar `settings.paymentMercadoPago`, `settings.paymentTransfer`, `settings.paymentCash`.

## Mejoras de Interactividad (UI)
- Agregar “chips” de acciones rápidas debajo de la bienvenida y después de cada respuesta (ej: “Ver ofertas”, “Buscar por categoría”, “¿Envío?”, “¿Pagos?”, “Hablar por WhatsApp”).
- Agregar botones contextuales cuando muestre productos: “Agregar 1”, “Agregar 2”, “Ver en tienda” (navegar/filtrar), “Más como este”.
- Persistencia opcional del chat (localStorage) + botón “Limpiar chat”.

## Robustez (cero errores)
- Encapsular `handleSend` con try/catch + timeout y fallback: si algo falla, responder con un mensaje útil y sugerir WhatsApp.
- Validaciones defensivas (productos/settings/coupons siempre como arrays/objetos seguros).
- Control de concurrencia: evitar dobles envíos mientras está “escribiendo”.
- Límite de historial y sanitización básica para evitar respuestas gigantes o loops.

## Extra (opcional): IA real con modelo externo, con fallback
- Crear endpoint serverless `api/ai/chat.js` que llame a un proveedor (por defecto OpenAI vía `fetch`) usando `OPENAI_API_KEY`.
- Prompt con “conocimiento de tienda” (pagos/envío/contacto + resumen compacto de productos relevantes) y reglas de seguridad (no inventar, si no sabe: preguntar o sugerir categorías).
- En el front: usar el LLM cuando esté configurado; si responde error/429/timeout, volver al “cerebro local” automáticamente.

## Pruebas/Verificación
- Extender Playwright:
  - Abrir el widget, enviar “modo oscuro”, “tengo cupones?”, “envío a domicilio?”, “agregá 2 coca” y validar que no haya `console.error`/`pageerror`.
  - Si se habilita endpoint IA: testea que responda 200 con payload válido y que falle “bien” sin key.

## Archivos a tocar
- [script.js](file:///c:/Users/Admin/Desktop/Tienda/CLIENTES/Sustore/script.js): refactor del bot + UI interactiva + robustez.
- `api/ai/chat.js` (nuevo): endpoint IA opcional.
- `.env.example`: agregar `OPENAI_API_KEY` (solo ejemplo, sin secretos).
- `tests/`: agregar/ajustar smoke test del bot.

## Resultado Esperado
- Bot más “inteligente” (entiende mejor intenciones, cantidades y presupuesto), más interactivo (chips/botones), y con manejo de errores/fallback para evitar roturas.
- Si aparece “Al doble” desde Firestore, lo conecto al bot para que lo pueda explicar/ofrecer como promo (según dónde esté guardado).
