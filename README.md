# Mejoras_20260903_1920 — Quita "ConAccion" junto a la versión (solo queda "V15.16")

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.16 · 2026-09-03**

Este paquete reemplaza al anterior (`Mejoras_20260903_1900`, V15.15), que aún no habías subido. Incluye TODO lo necesario en un solo paquete: la corrección de alineación de sesión + versión visible (V15.15) MÁS el ajuste que pediste ahora — quitar la palabra "ConAccion" de junto a la versión, dejando solo el número de versión.

## 1. Qué cambia respecto a lo que tenías antes de V15.14

- El bloque de sesión (nombre del asesor + cargo + "Cerrar sesión") queda en la misma línea del nombre de la app ("Radar Comercial B2B"), alineado al borde derecho de la pantalla en móvil.
- Junto a "Radar Comercial B2B" aparece únicamente el número de versión (por ejemplo "V15.16") — sin el texto "ConAccion ·" que llevaba antes.

## 2. Detalle técnico de este ajuste puntual

En `index.html`, dentro de `.brand`, el `<small>` que envuelve la versión decía `ConAccion · <span id="appVersionLabel">...</span>`. Se quitó el texto fijo `ConAccion · `, dejando el `<small>` con únicamente el `<span id="appVersionLabel">` adentro. No se tocó ningún script: ningún archivo `.js` del proyecto arma o depende de ese texto "ConAccion" en este punto (se verificó con búsqueda en todo el proyecto), así que el cambio es puramente de marcado HTML, sin riesgo de romper otra funcionalidad.

**Verificación realizada (antes de empaquetar, contra el sitio real en producción):** se inyectó el cambio en vivo y se confirmó visualmente que el `<small>` queda mostrando solo el número de versión, sin "ConAccion ·" ni ningún otro texto sobrante.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — se quita el texto "ConAccion · " fijo junto al `#appVersionLabel`, dentro de `.brand`. |
| `styles.css` | Reemplazar — incluye la corrección de V15.15: `.brand-row-v161` pasa a `flex:1 1 auto; width:100%` (para que el bloque de sesión se alinee al borde derecho real de la pantalla) y se revierte el `display:none` que ocultaba la versión en móvil. |
| `version.js` | Reemplazar — sube a V15.16. |

No se tocó `topbar-movil-v154.js` en esta entrega.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Prueba en modo incógnito o borrando caché.

## 5. Checklist de prueba

- **Celular**: "Radar Comercial B2B" + versión sola (sin "ConAccion") a la izquierda; nombre del asesor + cargo + "Cerrar sesión" pegados al borde derecho de la pantalla, misma línea.
- **Escritorio**: sin cambios visibles respecto a siempre, sin overflow.

## 6. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
