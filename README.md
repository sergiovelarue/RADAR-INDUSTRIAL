# Mejoras_20260904_1830 — Activación primera vez como wizard de 4 pasos

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.25 · 2026-09-04**

**Este paquete reemplaza por completo todas las entregas anteriores relacionadas con activación/histórico/ERP/carga manual (V16.20 a V16.24). Aplica solo este paquete — no apliques los anteriores.**

## 1. Por qué se reorganizó

Tenías razón: había campos redundantes y confusos — un lugar para cargar histórico, otro campo distinto para cargar histórico de nuevo dentro de "Activación", un lugar para venta actual y otro distinto para conexión ERP, sin que quedara claro cuál usar ni cómo se relacionaban entre sí.

## 2. Cómo quedó ahora

Un solo flujo, **Activación primera vez**, dentro de Ajustes → datos maestros, visible solo para Super Administrador, con 4 pasos secuenciales. Cada paso se bloquea hasta que el anterior esté completo:

**Paso 1 · Histórico del año anterior**
- Si no hay información de referencia: campo de carga vacío, semáforo rojo "Sin información de referencia".
- Si ya hay información: semáforo verde "Usando esta referencia", con el nombre del archivo, fecha de carga y cantidad de clientes.
- Si subes un archivo con el **mismo nombre** que la referencia actual: se trata como una actualización normal, sin fricción.
- Si subes un archivo con **nombre distinto**: la app avisa que vas a reemplazar la referencia completa del año anterior y pide escribir "REEMPLAZAR" para confirmar — acción irreversible sobre el histórico, pero que **nunca toca la venta del año en curso**.
- Crea clientes que no existan en la base; actualiza el histórico de los que ya existen, sin tocar ningún otro dato suyo.

**Paso 2 · Venta del año en curso**
- Bloqueado hasta completar el paso 1. Mismo mecanismo de semáforo, nombre de archivo y confirmación por reemplazo que el paso 1, pero aplicado a la venta actual — sin tocar el histórico.
- Esta es la única carga manual del año en curso — ya no hay un cajón "ERP" separado del cajón "manual": ambos casos comparten el mismo dato de referencia, y la app decide su origen en el paso 4.

**Paso 3 · Calcular clasificación y estado**
- Bloqueado hasta completar los pasos 1 y 2. Botón único, deshabilitado con nota "Disponible próximamente" — se conecta cuando definamos juntos el motor de clasificación (Simple/2V/3V).

**Paso 4 · Modo de operación diaria**
- Bloqueado hasta completar los pasos 1, 2 y 3. Aquí, una sola vez, decides cómo se actualiza la venta de aquí en adelante: manual (subir Excel cuando haga falta) o automática por link (conexión ERP diaria, con hora programada y URL). Y por separado, si la clasificación se recalcula manualmente o automáticamente cada día junto con la venta.
- Esta decisión reemplaza los antiguos cajones "Conexión ERP" y "Carga manual de ventas diarias" — ya no son dos lugares distintos, es una sola pregunta resuelta una vez.

## 3. Qué se construyó del lado del servidor (Supabase, proyecto RADAR-INDUSTRIAL)

- Tabla `metadata_activacion_v1`: guarda nombre de archivo, fecha y cantidad de clientes de la última carga de histórico y de venta actual (para los semáforos), más el modo de operación elegido.
- Edge Function nueva `cargar-historico-referencia` + RPC `disparar_carga_historico_referencia_v1`: motor dedicado del paso 1, distinto de los motores anteriores — crea clientes nuevos y actualiza histórico de los existentes, **verificado que nunca toca la venta del año en curso** (probado directamente contra un cliente real con venta 2026 ya cargada: el histórico cambió, la venta actual quedó intacta).
- RPCs nuevas: `leer_metadata_activacion_v1`, `registrar_carga_historico_v1`, `registrar_carga_venta_actual_v1`, `registrar_calculo_clasificacion_v1`, `guardar_modo_operacion_v1`.
- Reutiliza sin cambios: `disparar_historico_ventas_v1` (paso 2, ya probado en entregas anteriores) y `guardar_config_conexion_erp_v1` (paso 4, modo automático).

## 4. Verificado en vivo antes de empaquetar

- Probé la RPC de metadata contra producción — responde correctamente el estado inicial (todo en rojo, sin referencia).
- Probé el motor del paso 1 (`cargar-historico-referencia`) directamente contra la base real: con un cliente ya existente con venta 2026 cargada, actualicé su histórico 2025 y confirmé que `total_2026` y el detalle mes a mes de venta actual quedaron exactamente iguales — cero contaminación cruzada entre histórico y venta actual. También creé un cliente de prueba nuevo para confirmar que el motor crea correctamente, y revertí ambos cambios de prueba después.
- Probé la validación del paso 1 en vivo desde el navegador con un NIT real de la base — resultado correcto (0 nuevos, 1 actualizable, asesor reconocido).
- Sintaxis validada: `node --check modulo_18_procedimiento_cargue.js` sin errores; `styles.css` con llaves balanceadas (513/513); `index.html` sin IDs duplicados.

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — nuevo wizard de 4 pasos, quita los cajones antiguos. |
| `styles.css` | Reemplazar — estilos del wizard y semáforos. |
| `modulo_18_procedimiento_cargue.js` | Reemplazar por completo — toda la lógica del wizard (wrapper, no toca app.js). |
| `version.js` | Reemplazar — sube a V16.25. |

**Importante:** si en una entrega anterior subiste `modulo_17_activacion_cliente.js` a GitHub, elimínalo del repositorio — ya no se usa ni se referencia desde `index.html`, y dejarlo no rompe nada pero es un archivo huérfano.

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `version.js`.
3. Reemplaza (o sube nuevo) `modulo_18_procedimiento_cargue.js`.
4. Si existe `modulo_17_activacion_cliente.js` en el repositorio, elimínalo.
5. Espera el deploy de Netlify y confirma "Published".

## 7. Checklist de prueba

- **Sesión Super Administrador → Ajustes → datos maestros**: debe verse un solo bloque "Activación primera vez" con los 4 pasos, pasos 2, 3 y 4 visualmente atenuados/bloqueados al entrar (porque aún no hay histórico cargado con esta versión).
- **Paso 1**: sube un archivo histórico real, valida, procesa — confirma que el semáforo pasa a verde con el nombre del archivo.
- Sube el mismo archivo de nuevo: no debe pedir confirmación de reemplazo (mismo nombre).
- Sube un archivo con nombre distinto: debe avisar que reemplaza la referencia y pedir escribir "REEMPLAZAR".
- **Paso 2**: debe desbloquearse después del paso 1. Repite la prueba de semáforo y nombre de archivo con venta actual.
- **Paso 4**: debe desbloquearse después de completar 1 y 2. Prueba elegir "automática por link" y confirma que pide URL antes de guardar.
- **Sesión Administrador**: no debe ver este bloque.

## 8. Pendiente (sin tocar en esta entrega)

- **Motor de clasificación automática** (Simple/2V/3V) — pendiente de precisar contigo la definición de "consecutividad" y "estado". Se conecta al botón ya preparado en el paso 3, y a la opción "automática cada día" del paso 4.
- Respaldo automático + botón de restauración — pendiente de que lo pidas.
- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Bug reportado en el proceso de ingreso a la app — sigue pendiente de que me compartas el detalle.
