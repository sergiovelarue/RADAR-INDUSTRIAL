# Mejoras_20260903_1500 — Causa raíz REAL y verificada del desborde en Hoja de Ruta

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.11 · 2026-09-03**

Continuación de `Mejoras_20260903_1330` (V15.10). Reportaste que el desborde seguía igual: el encabezado (franja azul oscuro superior) se veía más angosto que el contenido de abajo, generando movimiento lateral al hacer scroll. Esta vez el diagnóstico no se hizo por inspección de código sino midiendo el DOM real de la app en producción, con sesión iniciada, en viewport móvil (375px) — así se encontró y confirmó la causa exacta antes de escribir el fix.

## 1. Por qué V15.9 y V15.10 no fueron suficientes

Ambos intentos corrigieron correctamente el grid de `.filters` (el problema que yo había diagnosticado por lectura de código), y verificado en el DOM real, ese grid efectivamente ya queda contenido en 360px sin desbordar. El problema real nunca fue el grid de filtros — era otro elemento, más arriba en la jerarquía, que yo no había medido directamente.

## 2. Causa raíz real (confirmada midiendo el DOM en vivo)

El contenedor `.main` (que envuelve TODO el contenido de cada pestaña, incluida Hoja de Ruta) medía **388px de ancho real en un viewport de 375px** — un desborde de 13px — mientras `html`, `body`, `.app` y `.sidebar` medían correctamente 375px. Se aisló el problema probando en vivo: al quitarle a `.main` la propiedad `margin` (que en desktop es `margin:0 auto`, para centrar el contenido en pantallas anchas), su ancho volvió exactamente a 375px.

La explicación técnica: con `margin:auto` en un elemento de tipo `block` dentro de un contenedor flex con `flex-direction:column`, el navegador calcula el ancho "natural" de ese elemento usando su `max-width:1600px` casi como si tuviera espacio disponible ilimitado, en vez de limitarlo estrictamente al ancho real del padre. Es un comportamiento real de motor de renderizado, no una suposición — quedó verificado en el propio sitio en producción, no en una copia local.

**Por qué solo se notaba en Hoja de Ruta:** este bug de 13px afecta a `.main` en TODAS las pestañas por igual (es el contenedor de toda la app), pero en la mayoría de pestañas el contenido interno no tiene tanta variedad de elementos anchos como para hacer evidente el desborde. Hoja de Ruta, con 8 filtros simultáneos y una tabla de cientos de clientes, es donde el movimiento lateral se nota de forma clara al usuario.

## 3. La corrección

Se anula `margin` en `.main` dentro del breakpoint `@media(max-width:1100px)` (`.main{padding:14px;margin:0}`). En móvil no hace falta centrar nada — `.main` ya debe ocupar el 100% del ancho disponible. La regla original de desktop (`margin:0 auto`, para centrar contenido en pantallas anchas) no se toca, sigue funcionando igual ahí.

**Verificación en vivo, no solo en teoría:** se probó el fix inyectándolo directamente en el sitio real en producción (sesión con datos reales de Hoja de Ruta cargados) y se confirmó que tras el cambio, `.main` mide exactamente 375px = viewport, y `document.body.scrollWidth` también queda en 375px, sin ningún desborde.

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `styles.css` | Reemplazar — único cambio real: `margin:0` agregado a `.main` dentro del breakpoint móvil. |
| `version.js` | Reemplazar — sube a V15.11. |

No se tocó ningún otro archivo.

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `styles.css` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published" en la pestaña Deploys.
4. Prueba en modo incógnito o borrando caché del sitio.
5. Verifica en el celular: entra a Hoja de Ruta y confirma que el encabezado azul oscuro (arriba) y el contenido de abajo (filtros, KPIs, tabla) tienen exactamente el mismo ancho, sin ningún movimiento lateral al hacer scroll — igual que en las demás pestañas.

## 6. Pendiente (sin tocar, a la espera de tu confirmación)

- Nada más se toca hasta que confirmes que Hoja de Ruta quedó igual que las demás pestañas.
- Renombrar "Super Administrador" a "Administrador" sigue pendiente.
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
