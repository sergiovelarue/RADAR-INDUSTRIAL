# Mejoras_20260904_1200 — Corrección: panel de datos maestros/histórico no visible

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.22 · 2026-09-04**

Corrige el bug reportado: tras subir V16.20/V16.21, el panel de datos maestros (que contiene la carga de histórico de ventas del año anterior, entregada en V16.21) no aparecía en la pestaña Ajustes, ni siquiera para Super Administrador.

## 1. Causa raíz (dos problemas independientes, ambos preexistentes)

1. **`masterDataAdminPanel` nunca estaba incluido en la lista de paneles que se reubican dentro de la pestaña Ajustes** (`AJUSTES_PANEL_IDS_V1` en `ajustes-v1.js`). Este es un bug que ya existía en el código antes de esta entrega — el panel de datos maestros (con los botones "Descargar asignación actualizada" / "Descargar historial de cambios") ya estaba mal ubicado desde antes; al construir el nuevo bloque de histórico *dentro* de ese panel en V16.21, heredó el mismo problema sin que fuera evidente hasta ahora.
2. **El `<section>` de ese panel tenía un `style="display:none"` escrito directamente en el HTML**, una segunda forma de ocultarlo que no tiene relación con el sistema de clases (`admin-only-panel-hidden`, `hidden-view`) que controla la visibilidad de todos los demás paneles administrativos de la app. Aunque se hubiera resuelto el punto 1, este estilo en línea seguía bloqueando el panel para cualquier usuario, sin excepción.

## 2. Qué se corrigió

- `ajustes-v1.js`: se agregó `"masterDataAdminPanel"` a `AJUSTES_PANEL_IDS_V1`.
- `index.html`: se quitó el `style="display:none"` del `<section id="masterDataAdminPanel">` y se reemplazó por la clase `hidden-view`, el mismo mecanismo que usan los otros tres paneles de Ajustes (`dailyUpdatePanel`, `usageAdminPanel`, `syncAdminPanel`). Esto deja la visibilidad gobernada exclusivamente por clases CSS, sin una fuente de verdad duplicada.

## 3. Verificado en vivo antes de empaquetar

- Se simuló sesión Super Administrador directamente sobre producción y se ejecutó el flujo real de navegación (`applyUserProfileV84` → `applyAdminVisibilityV811` → `showAjustesV1`), confirmando que el panel de datos maestros y, dentro de él, el panel de histórico de ventas (`histPanelV1621`, entregado en V16.21) quedan visibles (`display:block`) sin necesidad de manipulación manual del DOM.
- Sintaxis validada: `node --check ajustes-v1.js` y `node --check modulo_16_historico_ventas.js` sin errores; `styles.css` con llaves balanceadas (443/443); `index.html` sin IDs duplicados.

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — quita el `style="display:none"` inline del panel de datos maestros. |
| `ajustes-v1.js` | Reemplazar — agrega `masterDataAdminPanel` a la lista de paneles de Ajustes. |
| `version.js` | Reemplazar — sube a V16.22. |

No se modificaron `styles.css`, `modulo_16_historico_ventas.js` ni `modulo_15_conexion_erp.js` en esta entrega.

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `ajustes-v1.js`, `version.js`.
3. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- **Sesión Super Administrador → Ajustes**: debe verse el panel de datos maestros completo, incluyendo el bloque "Cargar histórico de ventas (año anterior)" (V16.21).
- **Sesión Administrador → Ajustes**: debe ver el panel de datos maestros (botones de descarga), pero NO el bloque de histórico (exclusivo Super Admin, sin cambios respecto a V16.21).
- Confirmar que el resto de pestañas (Hoja de ruta, Prospección, etc.) no muestran este panel fuera de Ajustes.

## 7. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- **Bug reportado por separado en el proceso de ingreso a la app** ("un error en el proceso de ingreso"): pendiente de detalle — se abordará en la próxima entrega, según lo acordado (primero datos, luego ingreso).
- Regenerar el simulador de Google Drive con NIT reales para probar la conexión ERP con coincidencias — sigue pendiente del lado del usuario.
