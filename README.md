# Mejoras_20260903_2358 — Carga de histórico de ventas (año anterior)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.21 · 2026-09-03**

Nueva funcionalidad, exclusiva Super Administrador: un panel para cargar el histórico de ventas de un año anterior (base comparativa para Cumplimiento, Alarmas y Proyección) desde un archivo Excel/CSV, sin necesidad de intervención directa en la base de datos.

## 1. Dónde vive y cómo funciona

Vive dentro de la pestaña **Ajustes**, en el panel de datos maestros (visible solo para Super Administrador — Administrador no lo ve). Flujo:

1. Selecciona el año que se está cargando (2025, 2024...).
2. Sube el archivo (mismo formato que el de actualización diaria: primera columna NIT, columnas siguientes con nombre de mes Enero..Diciembre; columnas extra como Cliente/Asesor/Ciudad se ignoran).
3. **Validar archivo**: consulta contra la base real y muestra cuántos NIT del archivo coinciden con clientes existentes y cuántos no — sin escribir nada todavía.
4. Si hay NIT sin coincidencia, se pueden descargar para revisarlos antes de continuar.
5. **Procesar carga**: pide confirmación y aplica el histórico SOLO a los NIT coincidentes. Nunca crea clientes nuevos — ese sigue siendo un proceso aparte (Gestión de clientes).
6. Incluye un botón para descargar una plantilla en blanco con el formato exacto esperado.

## 2. Qué se construyó del lado del servidor (Supabase, proyecto RADAR-INDUSTRIAL)

- Edge Function `cargar-historico-ventas`: valida NIT contra la tabla `clientes` y, en modo procesar, actualiza `datos_venta.ventas<AÑO>EspumasPorMes` y `total_<AÑO>` (cuando el año es 2025 o 2026) por cliente, uno por uno vía `.update().eq("id", ...)` — no usa upsert masivo porque eso exigía repetir columnas `NOT NULL` de toda la tabla y fallaba.
- Función RPC `disparar_historico_ventas_v1` (dispara la Edge Function con el secreto server-side, el navegador nunca lo ve) y `leer_ultimo_resultado_historico_v1` (el frontend hace polling corto de esta función hasta obtener el resultado, hasta 60 segundos de margen para archivos grandes).
- Reutiliza el mismo secreto (`RADAR_CRON_SECRET`) que ya configuraste para la conexión ERP — no requiere ningún paso adicional de tu parte.

## 3. Verificado en vivo antes de empaquetar

- Probé el flujo completo (validar y procesar) directamente contra la base de datos real de Supabase, usando un cliente real (NIT 900116526) y un NIT inventado para confirmar que el conteo de "sin coincidencia" funciona.
- **Encontré y corregí un bug real durante la prueba**: el primer diseño (`upsert` masivo) fallaba con "null value in column nit violates not-null constraint" porque el patch no incluía todas las columnas obligatorias de la tabla. Se corrigió usando `update()` por `id`, que sí funciona sin necesidad de repetir columnas no modificadas — confirmado con una carga de prueba real (histórico 2024 aplicado y verificado, luego revertido para no dejar datos de prueba).
- También se detectó que el mecanismo de espera de la RPC original (con `pg_net` + polling dentro de la misma función SQL) tenía una condición de carrera bajo llamadas consecutivas rápidas — se rediseñó con un patrón más robusto (la Edge Function escribe su resultado en una tabla, y el frontend consulta esa tabla por separado), igual de seguro pero sin ese riesgo.
- Sintaxis validada: `node --check modulo_16_historico_ventas.js` sin errores; `styles.css` con llaves balanceadas (443/443); `index.html` sin tags huérfanos ni IDs duplicados.

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — agrega el bloque de carga de histórico dentro del panel de datos maestros, y el script `modulo_16_historico_ventas.js`. |
| `styles.css` | Reemplazar — estilos del nuevo panel. |
| `modulo_16_historico_ventas.js` | Nuevo — toda la lógica (wrapper, no toca app.js). |
| `version.js` | Reemplazar — sube a V16.21. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `version.js`.
3. Sube `modulo_16_historico_ventas.js` como archivo NUEVO.
4. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- **Sesión Super Administrador → Ajustes**: en la sección de datos maestros, debe verse el nuevo panel "Cargar histórico de ventas (año anterior)".
- **Sesión Administrador**: NO debe ver este panel (exclusivo Super Admin).
- **Descargar plantilla**: confirma que baja un Excel con encabezado NIT + los 12 meses.
- **Validar** con un archivo real: revisa que los conteos de coincidentes/no coincidentes sean correctos.
- **Procesar** solo después de validar y confirmar que los números tienen sentido — la acción pide confirmación antes de aplicar.

## 7. Nota sobre frecuencia de actualización (conexión ERP, recordatorio)

Confirmaste que la actualización de ventas vía conexión remota (ERP) debe poder refrescarse máximo una vez al día, reflejando el consolidado del día anterior. El diseño actual ya cumple esto: el cron revisa cada 15 minutos si ya llegó la hora programada, pero solo dispara una vez dentro de esa ventana — no hay riesgo de refrescos múltiples en el mismo día.

## 8. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Regenerar el simulador de Google Drive con los NIT reales (archivos `Ventas_2025_Historico.xlsx`/`Ventas_2026_Actual.xlsx` ya entregados) para poder probar la conexión ERP con coincidencias reales.
- Fase futura (mencionada pero no construida aún): proceso completo de activación de un cliente/empresa nueva desde cero, incluyendo carga de maestro de clientes — quedó explícitamente fuera de esta entrega por decisión tuya, se hace después de validar este flujo de histórico.
