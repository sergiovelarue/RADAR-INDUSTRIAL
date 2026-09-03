# Mejoras_20260903_2130 — Dashboard móvil (tarjetas contraíbles) + íconos de "Actualizar datos" y "Soporte"

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.19 · 2026-09-03**

Este paquete reemplaza a `Mejoras_20260903_2100` (V15.18), que aún no habías subido. Incluye todo lo de V15.18 (Dashboard móvil) MÁS el ajuste de íconos que aprobaste sobre el mockup y pediste aplicar ahora.

## 1. Dashboard móvil — tarjetas contraíbles (igual que V15.18)

"Top 15 clientes Pareto general" y "Top 10 por asesor" ahora se contraen en celular igual que Hoja de ruta: solo # + cliente + dato principal visibles, el resto (Asesor, Tipo, Venta 2025, Crec.) aparece al tocar la tarjeta. De paso se corrigió que el nombre del cliente se cortaba a ~12 caracteres.

## 2. Íconos de "Actualizar datos" y "Soporte" (nuevo en este paquete)

- **"Actualizar datos"**: el carácter de texto "↻" (se veía desproporcionado y descentrado dentro del círculo flotante de 40px, evidencia real tuya en producción) se reemplaza por un SVG de flecha circular de refresco, trazo limpio, 18x18px.
- **Soporte**: la burbuja de chat con signo de interrogación (poco clara, según tu observación — ni en celular ni en escritorio) se reemplaza por una burbuja de chat con tres puntos suspensivos (patrón universal de "conversación en curso"), aumentada de 26x26 a 30x30px dentro del mismo botón circular de 56px, para más presencia sin perder discreción.

**Verificación realizada (antes de empaquetar, contra el sitio real en producción, con los cambios inyectados en vivo):**
- Escritorio (1400px): medí ambos íconos con `getBoundingClientRect()` — el centro exacto de cada ícono coincide matemáticamente con el centro de su botón contenedor (refresh: centro en x=1360/y=794 tanto para el botón de 40px como para el SVG de 18px; soporte: centro en x=1352/y=852 tanto para el botón de 56px como para el SVG de 30px).
- Celular (375px): confirmado visualmente que ambos íconos se ven proporcionados y centrados, sin cambios de tamaño ni posición de los botones contenedores.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — se agregan los IDs `paretoTable`/`advisorTopTable` (Dashboard), el script `modulo_14_dashboard_top_movil.js`, y el SVG de "Actualizar datos" reemplazando el carácter "↻". |
| `styles.css` | Reemplazar — tarjeta contraíble para las dos tablas del Dashboard, corrección del ancho del nombre de cliente, y regla de alineación defensiva para el nuevo ícono de "Actualizar datos". |
| `soporte-v1.css` | Reemplazar — se agrega centrado explícito (`align-items`/`justify-content`) al botón de soporte. |
| `soporte-v1.js` | Reemplazar — nuevo SVG de burbuja de chat con tres puntos, 30x30px. |
| `modulo_14_dashboard_top_movil.js` | Nuevo — mismo archivo de V15.18, sin cambios. |
| `version.js` | Reemplazar — sube a V15.19. |

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `soporte-v1.css`, `soporte-v1.js`, `version.js`.
3. Sube `modulo_14_dashboard_top_movil.js` como archivo NUEVO (si no lo subiste ya con el paquete anterior).
4. Espera el deploy de Netlify y confirma "Published".
5. Prueba en modo incógnito o borrando caché.

## 5. Checklist de prueba

- **Dashboard, celular**: tarjetas de "Top 15 clientes" y "Top 10 por asesor" contraídas, expandibles al tocar.
- **Botón "Actualizar datos"** (círculo pequeño, esquina inferior derecha): flecha de refresco SVG limpia y centrada, tanto en celular como en escritorio.
- **Botón de soporte** (círculo grande, esquina inferior derecha): burbuja de chat con tres puntos, centrada, tanto en celular como en escritorio.

## 6. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
