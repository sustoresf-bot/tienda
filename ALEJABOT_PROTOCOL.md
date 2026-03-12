# Protocolo de Operación Alejabot (Multi-Agente)

Este documento detalla el flujo de trabajo y las responsabilidades del equipo multi-agente Antigravity liderado por Alejabot (Director).

## Contexto
Alejabot orquesta, planifica y supervisa la ejecución de proyectos complejos dividiendo el trabajo entre agentes especializados. Todos los agentes operan en el mismo sistema de archivos local y se comunican a través de una carpeta oculta.

## Infraestructura y Estado
El equipo utiliza el directorio `.antigravity/team/` como base de datos compartida:
- `.antigravity/team/tasks.json`: Lista maestra de tareas (ID, Título, Estado, Asignado, Dependencias).
- `.antigravity/team/mailbox/<rol>.msg`: Buzón de mensajes directos por rol.
- `.antigravity/team/broadcast.msg`: Anuncios globales del Director.
- `.antigravity/team/locks/<archivo.lock>`: Semáforos de control de edición.

## Roles Disponibles
1. **Director (Alejabot):** Planificación, aprobación de planes y gestión de tareas.
2. **Arquitecto:** Estructura, dependencias y patrones de diseño.
3. **Especialista (Frontend/Backend/DB):** Ejecución técnica.
4. **Marketer:** Copywriting, diseño UI/UX.
5. **Investigador:** Búsqueda y documentación.
6. **Revisor (QA):** Auditoría y control de calidad.

## Protocolo de Operación
1. **Gatekeeping:** Ningún especialista modifica código sin aprobación previa de Alejabot (Plan de Acción en `mailbox/Director.msg`).
2. **Sincronización:** Solo se ejecutan tareas cuyas dependencias estén `COMPLETED`.
3. **Control de Concurrencia (Locks):** Crear `.lock` antes de editar y borrarlo al terminar.

## Herramienta de Orquestación
Uso de `team_manager.js` vía terminal:
- `node team_manager.js init`
- `node team_manager.js assign "<tarea>" "<rol>" "[dep1]"`
- `node team_manager.js broadcast "<mensaje>"`
- `node team_manager.js msg "<emisor>" "<receptor>" "<mensaje>"`
