# Mejoras_20260904_1400 — Activación de cliente nuevo (reemplazo total de base)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.23 · 2026-09-04**

Nuevo panel, exclusivo Super Administrador, para reemplazar por completo la base de clientes a partir de dos archivos maestro — pensado para activar la app desde cero con los datos reales de un cliente nuevo (o para reiniciar la base actual con un nuevo maestro).

## 1. Por qué se construyó

El panel de histórico (V16.21) solo actualiza clientes que YA existen en la base — nunca crea clientes nuevos, por diseño. Al intentar cargar el maestro real de 566 clientes contra una base vacía o distinta, el resultado era siempre "0 coincidencias", porque ese panel no estaba pensado para esto. Este nuevo panel sí cubre el caso de activación completa: crea la base de clientes desde cero a partir de dos archivos.

## 2. Cómo funciona

Vive dentro de **Ajustes → Datos maestros**, arriba del panel de histórico existente (que sigue disponible sin cambios, para cargas de un solo año contra una base ya activa).

1. Sube el **maestro histórico** (año anterior) y el **maestro de venta actual** (año en curso). Mismo formato en ambos: `NIT, Cliente, Asesor, Ciudad, Departamento, Enero..Diciembre`.
2. **Validar archivos**: no escribe nada. Muestra cuántos clientes resultarían del reemplazo (unión de NIT de ambos archivos), cuántos son nuevos sin histórico previo (aparecen solo en el archivo de venta actual), y cuántos asesores del archivo coinciden exactamente con asesores ya registrados en el sistema.
3. Al validar aparece un campo de confirmación: hay que escribir **REEMPLAZAR** para habilitar el botón de procesar — más una ventana de confirmación adicional.
4. **Procesar reemplazo**: borra TODOS los clientes actuales y crea la base nueva completa.

## 3. Reglas de negocio aplicadas (confirmadas contigo)

- El asesor se asigna automáticamente solo si el nombre en el archivo coincide **exactamente** (sin distinguir mayúsculas/tildes en mayúsculas) con un asesor ya registrado en Gestión de asesores. Si no coincide, el cliente queda "SIN ASIGNACION" — no se crean asesores nuevos.
- La **meta de cada cliente inicia igual a su venta total del año anterior**, porque todavía no tiene clasificación (A/B/C/E/N) asignada. Esto es intencional — no es un placeholder en $0.
- Clasificación, ciudad/departamento faltante y asignación de asesor pendiente se completan después, uno por uno o por lote, desde Gestión de clientes — quedó así por tu decisión explícita.
- **Sin respaldo automático en esta versión** — lo pediste explícitamente fuera de alcance por ahora. La acción de "Procesar reemplazo" es irreversible tal como está hoy: no hay botón de deshacer.

## 4. Qué se construyó del lado del servidor (Supabase, proyecto RADAR-INDUSTRIAL)

- Edge Function `activar-cliente-nuevo`: recibe ambos archivos ya parseados, cruza NIT (unión 2025 ∪ 2026), cruza nombre de asesor contra la tabla `asesores`, calcula meta por defecto, y en modo procesar borra e inserta la base completa en bloques de 100 filas.
- RPC `disparar_activacion_cliente_nuevo_v1` (dispara la Edge Function con el secreto server-side ya existente, `RADAR_CRON_SECRET` — no requiere configuración adicional tuya) y `leer_ultimo_resultado_activacion_v1` (el frontend hace polling corto hasta 60 segundos).
- Nota técnica: también se creó una tabla de respaldo (`clientes_backup_v1`) y sus funciones de crear/restaurar, pero quedaron sin conectar al flujo por tu decisión de dejar el respaldo para una fase futura — están listas para activarse cuando lo pidas, sin trabajo adicional de esquema.

## 5. Verificado en vivo antes de empaquetar

- Probé el modo "validar" contra la base de datos real de Supabase con una muestra real de tus archivos (3 filas 2025 + 2 filas 2026, incluyendo un NIT nuevo sin histórico y asesores reales): resultado correcto — 4 clientes resultantes, 1 nuevo sin histórico, 3 asesores reconocidos, 0 sin reconocer.
- Probé también con un asesor inventado para confirmar que el conteo de "no reconocidos" funciona.
- Sintaxis validada: `node --check modulo_17_activacion_cliente.js` sin errores; `styles.css` con llaves balanceadas (476/476); `index.html` sin IDs duplicados.
- **No probé el modo "procesar" contra la base real** — evité borrar tus 566 clientes actuales como parte de esta verificación. Te recomiendo que la primera ejecución en modo procesar la hagas tú mismo, revisando con calma el resumen de validación antes de escribir "REEMPLAZAR".

## 6. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — agrega el bloque HTML del nuevo panel dentro de datos maestros. |
| `styles.css` | Reemplazar — estilos del nuevo panel (`.activ-*`). |
| `modulo_17_activacion_cliente.js` | Nuevo — toda la lógica (wrapper, no toca app.js). |
| `version.js` | Reemplazar — sube a V16.23. |

## 7. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `version.js`.
3. Sube `modulo_17_activacion_cliente.js` como archivo NUEVO.
4. Espera el deploy de Netlify y confirma "Published".

## 8. Checklist de prueba

- **Sesión Super Administrador → Ajustes**: debe verse el panel "Activación de cliente nuevo" arriba del panel de histórico existente.
- **Sesión Administrador**: NO debe ver este panel.
- Sube tus dos archivos reales (`Ventas_2025_Historico_Conaccion.xlsx`, `Ventas_2026_Actual_Conaccion.xlsx`) y presiona **Validar archivos** primero — revisa con calma los números antes de continuar.
- Solo si el resumen de validación tiene sentido, escribe **REEMPLAZAR** y presiona **Procesar reemplazo**.
- Después de procesar, confirma en Gestión de clientes que aparecen los ~596 clientes esperados, y que los asesores quedaron asignados donde correspondía.

## 9. Pendiente (sin tocar en esta entrega)

- **Motor de clasificación automática** (Simple / 2V / 3V, configurable por Super Administrador) — es la siguiente pieza que definimos juntos: calcula clasificación A/B/C/E/N al final del histórico y, con ella, la meta 2026 real (hoy la meta usa venta 2025 como valor por defecto mientras no hay clasificación). Pendiente de precisar contigo la definición exacta de "consecutividad" y "estado" para los modelos 2V y 3V antes de construirlo.
- **Respaldo automático + botón de restauración** — infraestructura ya lista en Supabase (`clientes_backup_v1`), pendiente de conectar al flujo cuando lo pidas.
- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Bug reportado en el proceso de ingreso a la app — sigue pendiente de que me compartas el detalle.
