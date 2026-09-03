# Mejoras_20260903_1830 — Corrección definitiva de ubicación del header (móvil + verificación desktop)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.14 · 2026-09-03**

Continuación de `Mejoras_20260903_1730` (V15.13). Confirmaste con screenshot que la versión y el bloque de sesión (nombre + cargo + "Cerrar sesión") seguían mal ubicados: quedaban junto al título de la pestaña actual ("Hoja de Ruta del Mes", dentro de `.topbar`) en vez de junto al nombre de la app ("Radar Comercial B2B", dentro de `.brand`).

## 1. Causa del error (V15.12 y V15.13)

Ambas versiones anteriores resolvieron correctamente la MECÁNICA de flex (que no se encimaran o rompieran línea), pero colocaron el bloque de versión + sesión en el lugar CONCEPTUALMENTE INCORRECTO: la línea del título de la pestaña activa (`.topbar`), que cambia según la pantalla que se esté viendo (Hoja de Ruta, Dashboard, Prospección, etc.). Lo que se había aprobado en el mockup era que ese bloque quedara junto al nombre fijo de la aplicación ("Radar Comercial B2B"), que vive en `.brand`, dentro de `.sidebar`, arriba de las pestañas de navegación — una franja distinta y fija, no la del título de pestaña.

## 2. La corrección (V15.14)

- Se envolvió `.brand` en un nuevo contenedor `.brand-row-v161` (dentro de `.sidebar`).
- El bloque de sesión (`#topbarSessionSlotV160`, que recibe por reparenting el nodo real `.session-info-v159` con nombre/cargo/cerrar sesión) ahora vive dentro de `.brand-row-v161`, en la misma línea que "Radar Comercial B2B" y su versión — no dentro de `.topbar`.
- Se eliminó la versión duplicada que se había creado en V15.12/13 (`#appVersionLabelTopbarV160`) y la función que la sincronizaba (`sincronizarVersionTopbarV160`): ya no hace falta, porque el span real de versión (`#appVersionLabel`) vive naturalmente dentro de `.brand`, que es exactamente donde debía estar.
- `.topbar` quedó simplificado: solo contiene el título de la pestaña activa y el botón "Exportar CSV" — ya no compite por espacio con nada más.
- En escritorio (>1100px) el comportamiento es idéntico al original: el bloque de sesión permanece en el pie del menú lateral (`.sidebar-footer`), tal como siempre ha estado; `.brand-row-v161` no tiene efecto visual ahí.

**Verificación realizada (antes de empaquetar, contra el sitio real en producción):**
- Ancho 375px (celular estándar): "Radar Comercial B2B" + versión y "Hercilia · Asesor · Cerrar sesión" en la misma línea, arriba de las pestañas — confirmado por captura.
- Ancho 320px (celular angosto, iPhone SE): mismo layout, sin desbordes ni recortes — confirmado por captura.
- Ancho 1400px (escritorio): confirmado por inspección del DOM en vivo que:
  - El bloque de sesión NO está dentro de `.brand-row-v161` (0 hijos) — sigue en `.sidebar-footer`, como siempre.
  - `refreshDataBtn` sigue en `.sidebar-footer` (no flotante).
  - No hay desborde horizontal (`document.body.scrollWidth === window.innerWidth`).
  - El ancho del sidebar es el estándar de 260px, sin cambios.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — se agrega el wrapper `.brand-row-v161` alrededor de `.brand`, se mueve `#topbarSessionSlotV160` dentro de él, se retira el span de versión duplicado del `.topbar`. |
| `styles.css` | Reemplazar — nuevas reglas `.sidebar .brand-row-v161{...}` con el estilo del bloque de sesión en móvil; `.topbar-titulo-v160` simplificado (ya no necesita compartir fila con nada). |
| `topbar-movil-v154.js` | Reemplazar — se retira `sincronizarVersionTopbarV160()` (ya no aplica); comentarios actualizados explicando la corrección. La lógica de reparenting (`ajustarSessionSlotMovilV160`) no cambia en su cuerpo, solo el destino físico del contenedor al que apunta. |
| `version.js` | Reemplazar — sube a V15.14. |

No se tocó ningún otro archivo.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `topbar-movil-v154.js` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Prueba en modo incógnito o borrando caché del sitio.

## 5. Checklist de prueba

- **Celular** (ancho ≤1100px): "Radar Comercial B2B" + versión a la izquierda, "Hercilia · Asesor" + "Cerrar sesión" a la derecha, TODO en la misma línea, arriba de las pestañas de navegación. El título de la pestaña activa (ej. "Hoja de Ruta del Mes") aparece solo, debajo del menú, sin compartir línea con nada más.
- **Botón "Actualizar datos"** en móvil: flotante, circular, pequeño, apilado justo arriba del botón de soporte, esquina inferior derecha.
- **Escritorio** (ancho >1100px): todo debe verse exactamente igual que antes de este cambio — nombre/cargo/cerrar sesión y "Actualizar datos" en el pie del menú lateral, sin nada flotante, sin desbordes horizontales.
- Repetir la prueba de celular en al menos dos anchos (por ejemplo 375px y 320px) para confirmar que no hay recortes en pantallas más angostas.

## 6. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
