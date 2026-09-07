# Mejoras_20260907_1631 — Meta Inicial 2026 y Presupuesto 2027 + fix "Metas y presupuestos" vacío

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.33 · 2026-09-07**

Esta entrega resuelve lo que reportaste al probar: la app cargaba bien el histórico y la venta actual, y mostraba la venta proyectada, pero **no aparecía la Meta Inicial ni la Meta Ajustada**.

## 1. Qué encontré

Eran dos problemas distintos, ambos con la misma consecuencia visible ("Metas y presupuestos" vacío o incompleto):

1. **Lista de asesores vacía.** La tabla de metas se arma recorriendo la lista de asesores de la organización — y esa lista se había quedado permanentemente vacía como efecto secundario de la corrección del bug de datos duplicados de la entrega anterior (V16.31/V16.32). Sin asesores en la lista, no se generaba ni una sola fila.
2. **La Meta Inicial nunca se calculaba realmente.** No existía ningún cálculo real de "cuánto debería vender cada cliente este mes" — el sistema mostraba en su lugar un valor histórico plano (la venta total del año anterior) que no correspondía a la fórmula que me indicaste.

## 2. Qué construí

Con base en la fórmula exacta que me diste:

> **Meta Inicial de un cliente en un mes = venta de ese cliente en el mismo mes de 2025 × (1 + % de crecimiento de su clasificación A/B/C/D)**

- **Corregí la lista de asesores**: ahora se trae siempre de la base de datos real, así que "Metas y presupuestos" vuelve a mostrar una fila por cada asesor.
- **Nueva tabla en la base de datos** (`metas_iniciales_v1`) que guarda la Meta Inicial de cada cliente, mes a mes, calculada con la fórmula exacta que definiste — separada de los demás datos, para mayor seguridad y trazabilidad (queda registro de qué venta de 2025 y qué % de crecimiento se usó en cada cálculo).
- **Nuevo Paso 4 en el wizard "Activación primera vez"**: *"Calcular Meta Inicial y Presupuesto"*, ubicado después de Clasificación (Paso 3) y antes de "Modo de operación diaria" (que pasa a ser Paso 5). Este paso queda bloqueado hasta que hayas calculado la Clasificación, porque la fórmula necesita saber si cada cliente es A, B, C o D.
- **Regla de "una sola vez"**: la Meta Inicial se fija la primera vez que corres este paso después de cargar un Histórico nuevo. Si vuelves a presionar el botón más adelante (sin haber cargado un Histórico nuevo), la Meta Inicial ya calculada NO se vuelve a mover — solo se actualiza el Presupuesto del año siguiente. Si cargas un Histórico nuevo (Paso 1), la próxima vez que uses este botón sí se vuelve a calcular todo desde cero, porque me indicaste que un histórico nuevo implica recalcular la meta sí o sí.
- **Orden de prioridad para la meta de un cliente en un mes** (tal como lo confirmaste): si existe un ajuste manual guardado para ese mes, se usa ese ajuste; si no hay ajuste, se usa la Meta Inicial recién calculada; y solo si ese cliente/mes todavía no tiene Meta Inicial calculada (por ejemplo, antes de correr el Paso 4 por primera vez), se usa el valor anterior como respaldo temporal.

El Presupuesto del año siguiente (2027) sigue usando el motor de proyección que ya tenías configurado (Super Administrador → modelo de presupuesto) — no lo dupliqué ni lo cambié, solo quedó conectado al nuevo Paso 4 para que sepas cuándo se actualizó por última vez.

## 3. Qué tienes que hacer ahora

1. Sube los 5 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. Ve a **Activación primera vez → Paso 4 · Calcular Meta Inicial y Presupuesto** (debe estar desbloqueado si ya calculaste Clasificación en el Paso 3; si no, corre primero el Paso 3).
4. Presiona **"Calcular Meta Inicial y Presupuesto"**.
5. Ve a la pestaña **Metas y presupuestos**: ahora debe verse una fila por cada asesor con Meta Inicial y Meta Ajustada calculadas, además de venta 2025, venta 2026 real, venta proyectada y presupuesto 2027.

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores en los 3 archivos JS modificados.
- HTML con etiquetas balanceadas (249 `<div>` abiertos/cerrados, 59 `<section>` abiertos/cerrados).
- Revisé el motor de proyección/presupuesto existente (`mejoras-v1.js`) para no duplicar su lógica — el Presupuesto 2027 sigue calculándose exactamente igual que antes, solo se conectó al nuevo paso.
- Confirmé en Supabase que la nueva tabla y las funciones de cálculo quedaron creadas y desplegadas correctamente.

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `app.js` | Reemplazar — `goal()` ahora prioriza la Meta Inicial calculada sobre el valor plano anterior. |
| `supabase-sync.js` | Reemplazar — corrige la lista de asesores vacía y agrega la carga de Meta Inicial desde la base de datos. |
| `modulo_18_procedimiento_cargue.js` | Reemplazar — agrega el nuevo Paso 4 del wizard. |
| `index.html` | Reemplazar — agrega el bloque visual del nuevo Paso 4 (y renumera "Modo de operación diaria" a Paso 5). |
| `version.js` | Reemplazar — sube a V16.33. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 5 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.33 · 2026-09-07" en el login.
- Ve a Activación primera vez: si el Paso 3 (Clasificación) ya está calculado, el nuevo Paso 4 debe verse desbloqueado.
- Presiona "Calcular Meta Inicial y Presupuesto": debe mostrar un mensaje de éxito con el total de clientes procesados.
- Ve a Metas y presupuestos: debe verse una fila por asesor con todos los valores, no solo ceros ni la tabla vacía.
- Presiona el botón de nuevo sin haber cargado un Histórico nuevo: debe indicar que la Meta Inicial ya estaba calculada y solo actualiza el Presupuesto.
- Si guardas un ajuste manual de meta para un asesor en un mes específico, ese ajuste debe seguir viéndose reflejado en "Meta Ajustada" con prioridad sobre la Meta Inicial.

## 8. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo de sesiones anteriores (`respaldo_lote_no_verificado_20260907`, `respaldo_clientes_bug_data_js_20260907`, `respaldo_lote_duplicado_20260904_1439`, `respaldo_residuos_demo_20260904`) se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
