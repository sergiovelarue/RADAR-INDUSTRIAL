# Mejoras_20260903_1630 — Reubicación de "Actualizar datos" y de nombre/cargo/cerrar sesión (móvil)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.12 · 2026-09-03**

Continuación de `Mejoras_20260903_1500` (V15.11). Se validó un mockup interactivo con Sergio antes de tocar código real, y se aplicó exactamente lo aprobado.

## 1. Qué cambió, punto por punto

**1) "Actualizar datos" ahora es un botón flotante.** En móvil, pasó de estar dentro del footer del menú lateral a ser un botón circular (40px) flotante en la esquina inferior derecha, apilado justo arriba del botón de soporte (56px) — mismo estilo visual, más pequeño, separado por un espacio de 10px. Se mueve junto con el botón de soporte cuando el breakpoint más angosto (≤760px) lo reposiciona más cerca del borde.

**2) Nombre + cargo + "Cerrar sesión" ahora viven en el encabezado superior.** En la misma línea que el título de la pestaña (ej. "Hoja de Ruta del Mes") y la versión de la app, alineados a la derecha, sobre las pestañas — antes vivían en el footer del menú lateral. El nombre y el cargo quedan en líneas separadas (aprobado sobre el mockup), con "Cerrar sesión" debajo.

## 2. Cómo se implementó (para que quede documentado)

Ninguno de los dos elementos se duplicó en el HTML — se reubicó el nodo real del DOM según el ancho de pantalla (técnica ya usada en el proyecto para el nombre de sesión). Esto es importante porque `app.js` y `mejoras-v1.js` ya tienen lógica y listeners enganchados a esos IDs exactos (`sessionRoleLabel`, `logoutBtn`, `refreshDataBtn`); duplicar el ID habría roto esa lógica o dejado un elemento sin funcionalidad. En vez de eso, el mismo botón/bloque se mueve de contenedor en el DOM según el tamaño de pantalla, conservando toda su funcionalidad.

**Bug encontrado y corregido durante la verificación en vivo (antes de entregar):** el primer intento le daba a "Actualizar datos" `position:fixed` sin sacarlo del `.sidebar-footer`, que en móvil pasó a `display:none` (porque ya no tiene contenido visible propio). Un elemento con `position:fixed` dentro de un ancestro con `display:none` no se renderiza — mide 0×0 — sin importar el `position:fixed`. Se confirmó esto probando en vivo contra el sitio real, y se corrigió reparentando el botón a `document.body` en móvil, igual que ya se hacía con el bloque de sesión.

**Verificación:** se probó el resultado completo inyectado en vivo sobre el sitio en producción (sesión real iniciada, viewport 375px) antes de empaquetar esta entrega — no se entregó a ciegas.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — nueva estructura del encabezado (`topbar-titulo-v160`, `topbar-session-slot-v160`). |
| `styles.css` | Reemplazar — estilos del nuevo encabezado y del botón flotante; se retira el diseño anterior del footer móvil (V15.9), que ya no aplica. |
| `topbar-movil-v154.js` | Reemplazar — lógica de reparenting de nombre/cargo/logout y del botón de actualizar según el ancho de pantalla. |
| `version.js` | Reemplazar — sube a V15.12. |

No hay cambios en Supabase en esta entrega.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 4 archivos de la tabla (todos ya existían, ninguno es nuevo).
3. Espera el deploy de Netlify y confirma "Published".
4. Prueba en modo incógnito o borrando caché del sitio.
5. Verifica en el celular: el título + versión están a la izquierda del encabezado superior, el nombre + cargo + "Cerrar sesión" están a la derecha en esa misma franja, y en la esquina inferior derecha aparecen dos botones circulares apilados — el de actualizar (más pequeño, arriba) y el de soporte (más grande, abajo).

## 5. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente, no aplicado.
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
