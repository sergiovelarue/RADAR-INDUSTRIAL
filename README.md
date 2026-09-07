# Mejoras_20260907_1642 — Corrección urgente: Meta Inicial/Meta Ajustada no correspondían a los datos reales

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.34 · 2026-09-07**

Corrige lo que reportaste en la gráfica "Venta mensual comparada": Meta Inicial se veía como una línea plana (~24.000 todos los meses) y Meta Ajustada tenía un pico/caída extraña entre julio y septiembre, sin relación con tus datos reales.

## 1. Qué encontré

Eran dos causas independientes:

**A. Meta Inicial nunca llegaba al navegador.** El cálculo en el servidor SÍ se hizo correctamente (lo verifiqué directamente en la base de datos: 566 clientes, valores distintos y coherentes cada mes). El problema estaba en cómo el navegador iba a buscar esos datos: usaba una consulta que dependía de que el sistema detectara automáticamente la relación entre dos tablas, y esa detección fallaba de forma silenciosa — sin mostrarte ningún error, simplemente no traía nada. Como resultado, la app usaba en su lugar un valor antiguo (la venta total del año anterior, repetida igual los 12 meses) — de ahí la línea plana en ~24.000, que además coincide justo con la suma de ese valor antiguo en todos tus clientes.

**B. Meta Ajustada tenía 5 registros "fantasma".** Eran ajustes manuales que guardaste el 19, 20 y 27 de agosto — antes de que cargaras hoy tus archivos reales y se limpiara la base de datos que tenía información falsa (incidente que resolvimos en la entrega anterior). Esos 5 ajustes seguían aplicándose sobre la base nueva, aunque ya no correspondían a ella, y por eso la curva mostraba ese pico/caída sin sentido en agosto-septiembre. **Ya los eliminé de la base de datos**, con tu confirmación.

## 2. Qué corregí

- Reescribí la forma en que el navegador trae la Meta Inicial desde la base de datos, usando un método más simple y confiable en vez del que fallaba silenciosamente.
- Eliminé los 5 ajustes manuales obsoletos de la base de datos (quedó en 0 registros, confirmado).
- Agregué un mensaje en la consola técnica para poder confirmar rápidamente, la próxima vez, que la Meta Inicial sí se cargó bien (por si vuelve a fallar algo en el futuro no quedará en silencio).

## 3. Qué tienes que hacer ahora

1. Sube estos 2 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. Entra a la pestaña de venta mensual / Metas y presupuestos y revisa la gráfica "Venta mensual comparada": la línea de Meta Inicial ya no debe ser plana, y Meta Ajustada ya no debe tener ese pico extraño.
4. Si necesitas volver a registrar ajustes manuales de meta para algún asesor (los que eliminé), puedes volver a crearlos desde la app normalmente — ahora quedarán calculados sobre tu base de datos real.

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores.
- Confirmé directamente en la base de datos que la Meta Inicial calculada por cliente/mes tiene valores reales y variables (no planos), coherentes con tu histórico.
- Confirmé que la suma de los valores antiguos (`meta_sugerida`) en todos tus clientes es ≈25.397 — prácticamente idéntica a la línea plana que reportaste, lo que confirma la causa exacta del problema.
- Confirmé que los 5 ajustes manuales obsoletos quedaron eliminados (conteo en 0).

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `supabase-sync.js` | Reemplazar — corrige la carga de Meta Inicial desde la base de datos. |
| `version.js` | Reemplazar — sube a V16.34. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos (no toques los demás, no cambiaron en esta entrega).
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.34 · 2026-09-07" en el login.
- Ve a la gráfica "Venta mensual comparada": Meta Inicial debe variar mes a mes (no una línea recta), y Meta Ajustada no debe tener saltos bruscos sin explicación.
- Ve a "Metas y presupuestos": los valores de Meta Inicial por asesor deben verse distintos entre sí y coherentes con la venta real de 2025.

## 8. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo de sesiones anteriores se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
