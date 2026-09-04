# Mejoras_20260904_1600 — Procedimiento de cargue de información inicial (reorganización)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.24 · 2026-09-04**

**Este paquete incluye tanto V16.23 (Activación primera vez) como V16.24 (reorganización), porque V16.23 aún no se había subido a producción.** Aplica este único paquete — no necesitas aplicar el anterior por separado.

## 1. Qué cambia

Reorganiza en un solo lugar todo lo que antes estaba disperso en varios paneles de Ajustes (conexión ERP, carga manual diaria, activación de cliente nuevo, histórico). Ahora todo vive dentro de un único cajón: **"Procedimiento de cargue de información inicial"**, visible solo para Super Administrador, con cinco secciones desplegables en el orden real de uso:

1. **Activación primera vez** (antes "Activación de cliente nuevo — reemplazo de base") — colapsada por defecto, con borde rojo. Hay que hacer clic para desplegarla — evita tocarla por error, ya que borra y reemplaza toda la base.
2. **Cargar histórico de ventas (año anterior)** — abierta por defecto.
3. **Calcular clasificación y estado** — botón nuevo, deshabilitado con nota "Disponible próximamente". Se conectará cuando definamos juntos el motor de clasificación (Simple/2V/3V).
4. **Conexión remota (ERP)** — colapsada por defecto.
5. **Carga manual de ventas diarias** — abierta por defecto.

## 2. Cómo se hizo (para que quede claro qué es seguro y qué no)

No se reescribió ni se recreó ningún panel — cada bloque (conexión ERP, carga manual, activación, histórico) sigue siendo exactamente el mismo código, con los mismos botones y la misma lógica interna que ya estaba probada. Lo único que cambió es *dónde* aparece cada uno en la pantalla: un módulo nuevo (`modulo_18_procedimiento_cargue.js`) mueve esos bloques, tal cual están, dentro del nuevo cajón — el mismo mecanismo que ya usa la pestaña "Ajustes" para agrupar sus paneles. No hay riesgo de que algo deje de funcionar por este cambio: es solo de ubicación visual.

## 3. Verificado en vivo antes de empaquetar

- Simulé sesión Super Administrador directamente sobre producción, ejecuté el flujo real de navegación a Ajustes, y confirmé que el cajón se crea con las 5 secciones desplegables, que cada panel original se reubica dentro de su sección correcta conservando sus botones y campos intactos, y que los contenedores originales (ahora vacíos) quedan ocultos sin dejar huecos en pantalla.
- Sintaxis validada: `node --check modulo_18_procedimiento_cargue.js` sin errores; `styles.css` con llaves balanceadas (493/493); `index.html` sin IDs duplicados.

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — renombra "Activación de cliente nuevo" a "Activación Primera vez", agrega el script nuevo. |
| `styles.css` | Reemplazar — estilos del cajón y las secciones desplegables. |
| `modulo_17_activacion_cliente.js` | Nuevo (si no lo subiste con V16.23) — lógica de activación primera vez. |
| `modulo_18_procedimiento_cargue.js` | Nuevo — reubica los paneles existentes dentro del cajón. |
| `version.js` | Reemplazar — sube a V16.24. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `version.js`.
3. Sube `modulo_17_activacion_cliente.js` y `modulo_18_procedimiento_cargue.js` como archivos nuevos (si `modulo_17` ya estaba de una subida anterior, solo confirma que coincide con este).
4. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- **Sesión Super Administrador → Ajustes**: debe verse un solo cajón "Procedimiento de cargue de información inicial" con 5 secciones desplegables, en vez de los paneles sueltos de antes.
- La sección "Activación primera vez" debe verse colapsada (con borde rojo) al entrar — hay que hacer clic para desplegarla.
- Las demás secciones (histórico, clasificación, ERP, manual) deben verse desplegadas por defecto.
- Confirma que los botones de cada sección siguen funcionando igual que antes (validar/procesar histórico, guardar configuración ERP, subir venta manual).
- **Sesión Administrador**: no debe ver este cajón.

## 7. Pendiente (sin tocar en esta entrega)

- **Motor de clasificación automática** (Simple/2V/3V) — pendiente de precisar contigo la definición de "consecutividad" y "estado" para los modelos 2V y 3V. En cuanto esté listo, se conecta al botón que ya quedó preparado en la sección 3.
- Respaldo automático + botón de restauración para "Activación primera vez" — pendiente de que lo pidas.
- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Bug reportado en el proceso de ingreso a la app — sigue pendiente de que me compartas el detalle.
