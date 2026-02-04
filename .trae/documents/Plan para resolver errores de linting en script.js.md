## Contexto y objetivo
- Los errores reportados en `script.js` son de **parseo JSX/JS** (etiquetas sin cerrar y tokens inesperados). Estos errores son **cascada**: un desbalance de `() {}` o de JSX cerca de la mitad del archivo hace que el analizador “pierda el hilo” y luego reporte faltantes de `</main>` / `</React.Fragment>` aunque sí existan más abajo.
- El objetivo es **restaurar un árbol JSX y un balance de llaves/paréntesis correctos** para que el archivo vuelva a parsear completo y el panel `#problems_and_diagnostics` quede en 0.

## Priorización por severidad
### Críticos (bloquean parseo/compilación)
1) **Unexpected token / '}' expected / ')' expected**
   - `script.js:10006` (`)}`)
   - `script.js:10949` (`)}`)
   - `script.js:11014` (`)}`)
   - `script.js:11018` (`)`)
   - `script.js:11019` (`}`)
   - Impacto: al romper el parseo, generan el resto de falsos positivos.

2) **JSX sin cierre (probablemente derivado del punto 1)**
   - `script.js:5269` `<React.Fragment>`
   - `script.js:5279` `<div ...>`
   - `script.js:5496` `<main ...>`
   - `script.js:11199` `</main>` reportado como inconsistente
   - `script.js:11805-11807` cierre final fragment/return
   - `script.js:11818` `'</' expected`

### Medios (mejora de robustez / previene recaídas)
- Añadir una **rutina de “lint estructural” automática** (paréntesis/llaves + balance JSX básico) para evitar reintroducir desbalances en un archivo muy largo.
- Asegurar que los scripts de “reparación” por regex (p.ej. `repair_script.py`) no vuelvan a introducir desbalances o queden claramente documentados como “one-shot”.

### Bajos (calidad / proceso)
- Documentación de cambios (qué se tocó y por qué) y checklist de code review.
- (Opcional) Incorporar ESLint/Prettier si el proyecto lo desea; hoy no hay pipeline de lint en `package.json`.

## Asignación de tareas por tipo de error
### A) Tokens inesperados / llaves-paréntesis desbalanceados (Crítico)
**Objetivo**: recuperar la estructura correcta de expresiones JSX, ternarios y bloques `{cond && (...)}`.

- **A1. Corregir el cierre del bloque `settingsTab === 'content'` alrededor de `script.js:9513` → `script.js:10006`**
  - Hipótesis más probable: falta/sobra un `}` o `)` dentro del tab “content”, y el `)}` de la línea 10006 queda fuera de contexto.
  - Acción: reconstruir el esqueleto de tabs en Admin Settings para que quede:
    - `{settingsTab === 'content' && ( ... )}`
    - `{settingsTab === 'features' && ( ... )}`
    - `{settingsTab === 'legal' && ( ... )}`
    - `{settingsTab === 'advanced' && ( ... )}`
  - Resultado esperado: desaparece el `Unexpected token` de la línea 10006.

- **A2. Corregir el bloque del tab `settingsTab === 'team'` (abre en `script.js:10830`) y sus cierres alrededor de `script.js:10949`**
  - Hipótesis: un cierre `)}` está colocado antes/después de tiempo (o hay un `</div>` faltante) y parte del JSX (p.ej. modal de proveedores) quedó fuera del contenedor que debería.
  - Acción: delimitar con precisión dónde termina el tab “team” y dónde viven modales globales.
  - Resultado esperado: desaparece el `Unexpected token` de 10949.

- **A3. Corregir cierres extra/ausentes en el bloque que termina en `script.js:11014-11019`**
  - En el fragmento actual se observan cierres consecutivos `</div></div>)})...</div></div>) ) }` que son típicos de un pegado/regex o refactor incompleto.
  - Acción: identificar el bloque padre (probablemente el “switcher” de vistas dentro de `<main>`) y dejar una única forma consistente:
    - serie de `&&` independientes, o
    - un ternario encadenado, pero no una mezcla incoherente.
  - Resultado esperado: desaparecen `Unexpected token` (11014, 11019) y `'}` expected` (11018).

**Dependencias internas**: A3 depende de A2 si los cierres corresponden a tabs/admin; A1 puede resolverse en paralelo conceptual pero se aplica primero para reducir ruido.

**Estimación**: 60–120 min (por el tamaño del archivo y por ser errores estructurales).

### B) Etiquetas JSX sin cerrar (Crítico, pero normalmente derivado)
**Objetivo**: una vez que el parseo vuelva a ser estable, ajustar el árbol JSX para que los contenedores se cierren correctamente.

- **B1. Verificar el árbol desde `return (` en `script.js:5268-5283`**
  - Confirmar que:
    - `<React.Fragment>` cierra exactamente una vez al final.
    - El `<div className=...>` raíz cierra después del footer/modales.
    - `<main ...>` cierra antes del footer.
  - Resultado esperado: desaparecen los errores de `React.Fragment`, `div` y `main` reportados arriba.

- **B2. Corregir el cierre final alrededor de `script.js:11803-11807`**
  - Acción: asegurar que la clausura sea exactamente:
    - `</React.Fragment>`
    - `);`
    - `}` (fin del componente)
  - Resultado esperado: desaparecen `Expected corresponding JSX closing tag`, `')' expected`, y `Unexpected token` cerca del final.

**Dependencias**: B depende de A (si el archivo no parsea, estos errores son ruido).

**Estimación**: 30–60 min.

### C) Automatizar ejecución del “linter” tras cada fix (Medio)
Como hoy el proyecto no tiene ESLint configurado, propongo dos niveles:

- **C1. Lint estructural inmediato (sin agregar dependencias)**
  - Reutilizar scripts ya presentes:
    - `tools/find-unclosed-div.mjs` (balance de `<div>` dentro de `<main>`)
    - `check_braces.py` (balance de `(){}[]` ignorando strings/comentarios)
  - Convertirlos en comandos repetibles (idealmente scripts en `package.json`, sin cambiar la lógica).
  - Usarlos **después de cada corrección**: si un fix introduce un desbalance, se detecta al instante.

- **C2. Lint real con ESLint (opcional, recomendado si se busca “style guide” formal)**
  - Añadir ESLint + parser compatible con JSX en `.js` (p.ej. `@babel/eslint-parser`) y reglas básicas React.
  - Definir un `npm run lint` que falle en CI/local.
  - Nota: esto agrega dependencias y requiere una decisión de equipo sobre reglas (Prettier sí/no).

**Estimación**:
- C1: 15–25 min.
- C2 (opcional): 30–60 min (instalación, config, y ajuste de reglas iniciales).

### D) Validación post-corrección (Crítico)
**Criterios de validación**
- **Linting/diagnostics**:
  - `#problems_and_diagnostics`: **0 errores** en `script.js`.
  - Lint estructural (si se aplica C1): sin reportes de desbalance.
  - ESLint (si se aplica C2): `npm run lint` pasa.

- **Runtime (Babel en navegador)**:
  - Abrir `index.html` con el server local (`npm run serve`) y confirmar:
    - no aparece `Uncaught SyntaxError`.
    - render inicial ok.
    - navegación mínima: `store`, `privacy`, `terms`, y `admin` (si aplica) renderizan sin romper.

- **No regresiones**:
  - Repetir una pasada completa de diagnostics tras cada fix grande (A1/A2/A3/B).

**Estimación**: 20–40 min.

### E) Documentación y code review (Bajo)
- Documentar en un archivo breve:
  - lista de errores iniciales,
  - causa raíz (dónde estaba el desbalance),
  - qué se cambió (bloques/tab/vista afectados),
  - cómo se validó.
- Checklist de code review:
  - No se alteró lógica de negocio (salvo cierres/agrupaciones necesarias).
  - JSX balanceado y expresiones `{...}` consistentes.
  - `serve` + navegación mínima validada.

**Estimación**: 15–30 min.

## Dependencias entre correcciones (resumen)
- A (tokens/estructura) → habilita B (JSX sin cierre).
- A1 reduce ruido y facilita A2/A3.
- C1 puede ejecutarse desde el principio; C2 depende de decisión de incorporar ESLint.
- D depende de A+B.

## Loop operativo (cómo ejecutar el “linter” tras cada fix)
Para cada corrección incremental:
1) Aplicar el fix en el bloque más cercano al primer error crítico.
2) Re-ejecutar:
   - diagnostics del IDE (panel Problems) y
   - lint estructural (C1) si está disponible.
3) Si aparecen errores nuevos, revertir/ajustar inmediatamente antes de pasar al siguiente bloque.

## Métricas de éxito
- **0 errores** de linting/diagnostics en `script.js`.
- **Cumplimiento del style guide del proyecto**:
  - mínimo: consistencia con el estilo existente (patrones `{cond && (...)}`, ternarios claros, indentación coherente).
  - si se adopta C2: ESLint como fuente de verdad.
- **Aprobación en code review**:
  - cambios estructurales localizados, justificados y validados con navegación mínima.

Si confirmás este plan, el siguiente paso es ejecutar A1→A3 (corrigiendo primero los `Unexpected token`) y luego B, y cerrar con validación D y documentación E.