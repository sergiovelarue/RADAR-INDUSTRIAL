# Mejoras_20260904_2000 — Fix: semáforo del paso 2 en rojo + nombre de archivo "perdido" al refrescar

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.27 · 2026-09-04**

Corrige los dos problemas reportados después de V16.26: el paso 2 procesó la venta actual (608 clientes actualizados, confirmado en base de datos) pero el semáforo se quedó en rojo, y al refrescar la página el nombre del archivo del paso 1 parecía desaparecer.

## 1. Causa raíz (una sola causa para los dos síntomas)

`wizPintarSemaforosV1625()` — la función que pinta los semáforos y desbloquea pasos — leía dos elementos del formulario (`wizWarning1V1625`, `wizWarning2V1625`) sin verificar antes que existieran en la página:

```js
$w18("wizWarning1V1625").style.display = tieneHistorico ? "block" : "none";
```

Si en el momento en que esta función se ejecuta ese elemento todavía no está en la página (por ejemplo justo después de refrescar, antes de que termine de cargar la sesión), esa línea lanza un error de JavaScript que **corta la función a la mitad** — sin llegar a pintar el semáforo del paso 2 ni a desbloquear el paso 3, aunque los datos en la base estén correctos. Por eso viste el paso 2 con datos "cargados" pero el semáforo en rojo: la función se rompió antes de llegar a pintarlo, no porque el registro fallara.

Esto también explica el problema del nombre "perdido" al refrescar: no es un problema de que el dato se borre de la base (lo verifiqué directamente contra producción — el nombre del archivo del paso 1 sigue guardado sin ningún cambio), sino que la misma función se rompía antes de pintarlo en pantalla en algunos momentos del refresco.

Adicionalmente, en la corrección anterior (V16.26) quedó un problema secundario relacionado: el registro del nombre de archivo del paso 2 usaba un dato (`data.coincidentes`) que no existe en el modo en que se llama ("procesar" solo devuelve `data.actualizados`). Ya estaba corregido en el código que revisé, pero no se había confirmado en vivo — lo verifiqué directamente contra la base de datos real: el registro con el valor correcto (608 clientes) se guarda sin problema.

## 2. Qué se corrigió

- `modulo_18_procedimiento_cargue.js`:
  - Nueva función `wizMostrarSiExisteV1625(id, mostrar)` que verifica que el elemento exista antes de tocarlo — reemplaza los dos accesos sin verificación.
  - `wizPintarSemaforosV1625()` ahora empieza con una verificación: si el panel del wizard todavía no está en la página, sale sin hacer nada (se vuelve a llamar automáticamente en el próximo evento relevante — login, cambio de perfil, entrar a Ajustes) en vez de arriesgarse a romperse a la mitad.
  - Se blindaron también los accesos a `wizDetalle3V1625` y `wizErpConfigV1625` con el mismo criterio, por consistencia y para prevenir el mismo tipo de falla en el futuro.

## 3. Verificado antes de empaquetar

- Sintaxis validada: `node --check modulo_18_procedimiento_cargue.js` sin errores.
- Confirmé directamente contra la base de datos de producción que el histórico del paso 1 (`Ventas_2025_Historico_Conaccion.xlsx`, 566 clientes) sigue guardado exactamente igual — nunca se perdió.
- Confirmé directamente contra la base de datos de producción que el registro de la venta actual del paso 2 con el valor real (608 clientes actualizados) se guarda correctamente. En este momento tu base ya tiene ambos pasos marcados como completos con datos reales:
  - Paso 1: `Ventas_2025_Historico_Conaccion.xlsx` · 566 clientes.
  - Paso 2: `Ventas_2026_Actual_Conaccion.xlsx` · 608 clientes.
- **Pendiente de tu confirmación visual**: no pude probar el semáforo en pantalla porque producción todavía tiene el código anterior (sin este fix) — necesito que subas este paquete primero.

## 4. Archivos de este paquete

Solo dos archivos.

| Archivo | Acción |
|---|---|
| `modulo_18_procedimiento_cargue.js` | Reemplazar. |
| `version.js` | Reemplazar — sube a V16.27. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `modulo_18_procedimiento_cargue.js` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- Entra como Super Administrador → Ajustes → datos maestros → Activación primera vez.
- **Deberías ver de entrada, sin hacer nada**: paso 1 en verde con `Ventas_2025_Historico_Conaccion.xlsx` (566 clientes) y paso 2 en verde con `Ventas_2026_Actual_Conaccion.xlsx` (608 clientes) — ya quedaron registrados en la base de datos durante esta verificación.
- Refresca la página varias veces seguidas (F5) y confirma que ambos semáforos se mantienen en verde con los nombres de archivo visibles cada vez — este es el problema #1.
- Si necesitas repetir la prueba desde cero con tus propios archivos, puedes volver a subirlos en los pasos 1 y 2 normalmente.

## 7. Pendiente (sin tocar en esta entrega)

- **Motor de clasificación automática** (Simple/2V/3V) — sigue pendiente de precisar contigo la definición de "consecutividad" y "estado".
- Respaldo automático + botón de restauración — pendiente de que lo pidas.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Bug reportado en el proceso de ingreso a la app — pendiente de que compartas el detalle, según lo acordado (primero datos, luego ingreso).
