# Mejoras_20260907_2023 — Corrección del bug de datos duplicados + reemplazo total en carga de histórico

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.31 · 2026-09-07**

Esta entrega corrige la causa real de por qué seguían apareciendo clientes antiguos después de cargar tus archivos reales, y cambia el comportamiento del Paso 1 según tu instrucción.

## 1. La causa raíz del problema (encontrada y corregida)

Cuando cargaste tus dos archivos reales hoy (566 de histórico, 608 de venta actual), la base terminó con 1132 clientes que **no correspondían a ninguno de los dos archivos**. Investigué a fondo y encontré un archivo (`data.js`) que llevaba meses en el sistema: contenía un dataset completo de 566 clientes de una versión muy anterior de la app (antes de que existiera Supabase), que se quedó "congelado" dentro del paquete de la aplicación.

El problema: cada vez que se abre la app, existe una ventana de tiempo muy breve (fracciones de segundo) entre el momento en que arranca con esos datos viejos de `data.js` y el momento en que termina de traer los datos reales de Supabase. Si en esa ventana se disparaba cualquier acción de guardado, la app subía por error los 566 clientes viejos a la base de datos real — como si fueran datos nuevos. Esto es lo que repobló tu base después de que la vaciamos, y probablemente explica también el incidente de la sesión anterior.

**Corregido con dos capas de protección:**
1. `data.js` ya no contiene ningún cliente — ahora arranca completamente vacío, así que aunque se repita la condición de carrera, no hay nada real que pueda subirse por error.
2. Se agregó una "guardia" en el código (`supabase-sync.js`) que bloquea cualquier intento de subir clientes a Supabase hasta que la lectura real desde la base de datos haya terminado — el mismo mecanismo de seguridad que ya protegía la configuración general, ahora también protege los clientes.

## 2. Cargar Histórico (Paso 1) ahora es un reemplazo total, como pediste

Antes, cargar un archivo de Histórico agregaba los clientes nuevos y actualizaba los existentes, pero nunca eliminaba nada. Ahora, cada vez que proceses un archivo en el Paso 1:

- Se **eliminan todos los clientes actuales** (clasificación, metas ajustadas, estado, seguimientos comerciales — todo).
- Se **crean desde cero** únicamente los clientes del archivo que acabas de cargar.
- Si ya habías cargado Venta actual (Paso 2) antes, **deberás volver a cargarla después**, porque quedó asociada a los clientes que ya no existen.

Esto aplica siempre, sin excepción — ya no depende de si el nombre del archivo es el mismo o distinto al anterior. El wizard ahora siempre te pide escribir la palabra **REEMPLAZAR** y confirmar en un cuadro de diálogo antes de proceder, y te muestra cuántos clientes hay actualmente y cuántos traerá el archivo nuevo, para que decidas con esa información antes de confirmar.

También agregué una validación: si tu archivo tiene el mismo NIT repetido dos veces dentro de sí mismo, el sistema te avisa y no procesa nada, en vez de fallar a medias.

## 3. Qué tienes que hacer ahora

La base de clientes está en 0 (la vacié de nuevo, con la causa del bug ya corregida). Pasos:

1. **Activación primera vez → Paso 1**: carga tu archivo `Ventas_2025_Historico_Conaccion.xlsx` (el mismo que me compartiste, 566 filas). Debe decir "0 clientes actuales" antes de procesar, y "566 clientes en el archivo" — sin ninguna alerta de datos sospechosos.
2. Confirma escribiendo REEMPLAZAR.
3. **Paso 2**: carga tu archivo `Ventas_2026_Actual_Conaccion.xlsx` (608 filas).
4. Verifica en Dashboard/Hoja de ruta que ahora los nombres y cifras correspondan a tu archivo real (revisa, por ejemplo, que aparezca "Distribuciones La Frontera" o "Comercial Occidente" — nombres de tu archivo real — y no "3P Talabartería" o "Almacenes Andina", que eran del dataset viejo).

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores en los 3 archivos JS modificados, incluido `data.js`.
- Confirmé que `data.js` carga correctamente como una estructura vacía (`clientes: []`, `meta.totalClientes: 0`).
- HTML con etiquetas balanceadas (59 `<section>`, 244 `<div>`).
- Confirmé en Supabase que la tabla `clientes` está en 0 registros, con los datos anteriores respaldados en `respaldo_clientes_bug_data_js_20260907` (por si necesitas consultarlos — no se recomienda reutilizarlos, no corresponden a ningún archivo real tuyo).
- Verifiqué los NITs de tus dos archivos reales contra la base: cero coincidencias con lo que había — confirmando que ninguno de los datos anteriores venía de tus archivos.
- Probé la lógica de reemplazo total y de detección de NIT duplicado directamente contra el código del servidor (Edge Function actualizada a v2).

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `data.js` | Reemplazar — ya no contiene clientes de ejemplo, arranca vacío. |
| `supabase-sync.js` | Reemplazar — agrega la guardia que evita subir datos a Supabase antes de tiempo. |
| `modulo_18_procedimiento_cargue.js` | Reemplazar — Paso 1 ahora es reemplazo total con confirmación siempre requerida. |
| `index.html` | Reemplazar — aviso permanente de reemplazo total en el Paso 1. |
| `version.js` | Reemplazar — sube a V16.31. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 5 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Haz recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.31 · 2026-09-07" en el login.
- Ve a Activación primera vez → Paso 1: debe verse el aviso amarillo de reemplazo total, siempre visible.
- Carga tu archivo de Histórico real: confirma que muestra "0 clientes actuales" y "566 en el archivo" antes de procesar.
- Escribe REEMPLAZAR, confirma en el cuadro de diálogo, y verifica que el mensaje final diga "0 clientes anteriores eliminados, 566 clientes nuevos creados".
- Carga el archivo de Venta actual (Paso 2) con tus 608 filas.
- Revisa Dashboard/Hoja de ruta: los nombres de clientes deben coincidir con tu archivo real.
- Cierra la pestaña, vuelve a abrir la app, y confirma que los 566 clientes siguen ahí (esto prueba que la corrección de la condición de carrera funciona — antes esto era exactamente el momento en que se repoblaba con datos viejos).

## 8. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo (`respaldo_clientes_bug_data_js_20260907`, `respaldo_lote_no_verificado_20260907`, `respaldo_lote_duplicado_20260904_1439`, `respaldo_residuos_demo_20260904`) se pueden eliminar definitivamente o se guardan por más tiempo.
- Confirmar si las funciones de prueba `exportar-ventas-csv-temp` y `diagnostico-drive-temp` en Supabase se pueden eliminar.
- Integración con cuenta de servicio de Google (archivos privados) — pendiente para producción real con clientes.
- Login de Asesor — sigue pendiente su rediseño (decisión tuya de dejarlo para otra sesión).
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
