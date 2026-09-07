# Mejoras_20260907_1655 — Corrección: 4 de cada 5 clientes sin Meta Inicial + gráfica "saltando"

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.35 · 2026-09-07**

Corrige lo que reportaste después de subir V16.34: las gráficas de Metas seguían sin representar la realidad, y en el Dashboard las líneas se movían constantemente como si el dato cambiara todo el tiempo.

## 1. Qué encontré (con evidencia directa, no supuestos)

Entré a la app en producción y confirmé el problema con datos reales de tu base:

**A. Causa raíz real de "Metas no representa la realidad":** la corrección anterior (V16.34) sí funcionaba, pero descubrí que Supabase tiene un límite de seguridad que corta cualquier consulta a **máximo 1.000 filas por respuesta**, sin avisar ni dar error. Tu Meta Inicial 2026 tiene 566 clientes × 12 meses = **6.792 filas** — así que el navegador solo alcanzaba a traer las primeras 1.000 (menos de 1 de cada 5 clientes), y para el resto seguía usando el valor antiguo de respaldo. Confirmé el número exacto en la consola técnica de tu navegador: "Meta Inicial cargada: 1000 filas" en vez de 6.792.

**B. Causa de "las líneas se mueven constantemente" en el Dashboard:** no era un error de datos — era que la Meta Inicial se cargaba en un segundo plano *después* de que la pantalla ya se hubiera pintado una primera vez. Cuando esa segunda carga terminaba (1 a 3 segundos después), las gráficas se volvían a dibujar con los datos correctos, y ese cambio se veía como un "salto" o "movimiento" en las líneas — daba la sensación de que el dato cambiaba solo, cuando en realidad solo se estaba completando la carga inicial dos veces en vez de una.

## 2. Qué corregí

- Reescribí la carga de Meta Inicial para que **traiga los datos en bloques** (de a 1.000 en 1.000) hasta completar el total real, sin depender de ningún límite fijo — así queden 600, 6.000 o 20.000 filas, siempre trae todo.
- Hice que la app **espere a tener la Meta Inicial completa antes de dibujar la pantalla por primera vez**, en vez de dibujarla dos veces (una con datos incompletos y otra con los correctos). La pantalla tarda uno o dos segundos más en aparecer, pero ya no debería "saltar" ni "moverse sola".

## 3. Qué tienes que hacer ahora

1. Sube estos 2 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R) — **esto es más importante que nunca en esta entrega**, porque si tu navegador reutiliza la versión anterior en caché, vas a seguir viendo el mismo problema.
3. Revisa la pestaña "Metas y presupuestos": los valores de Meta Inicial ahora deben corresponder a los 566 clientes reales, no solo a una fracción.
4. Revisa el Dashboard: las gráficas deben aparecer una sola vez, sin moverse ni "saltar" después de cargar.

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores.
- Entré directamente a la app en producción (sin iniciar sesión, como visitante) y confirmé en la consola técnica que antes de esta corrección solo llegaban 1.000 de 6.792 filas — la causa exacta, no una suposición.
- Confirmé en la base de datos que sí existen las 6.792 filas completas y correctas (el cálculo del servidor nunca estuvo mal — el problema era 100% cómo el navegador las traía).

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `supabase-sync.js` | Reemplazar — pagina la carga de Meta Inicial y evita el doble render. |
| `version.js` | Reemplazar — sube a V16.35. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.35 · 2026-09-07" en el login.
- Abre la consola técnica del navegador (F12 → Console) y busca la línea "[Radar-Supabase] Meta Inicial cargada": debe decir 6792 filas de 6792 traídas (o el número correspondiente si cambiaste el histórico).
- Ve al Dashboard: las gráficas no deben moverse ni "saltar" después de la carga inicial.
- Ve a "Metas y presupuestos": revisa que los valores de Meta Inicial por asesor tengan sentido frente a la venta real de 2025 de sus clientes.

## 8. Si algo sigue sin verse bien

Si después de esta entrega el Dashboard o Metas siguen sin representar tu realidad, lo más útil que me puedes compartir es: (1) una captura de pantalla del problema exacto, y (2) el contenido de la consola técnica del navegador (F12 → Console) en ese momento — con eso puedo diagnosticar con certeza en vez de suponer causas.

## 9. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo de sesiones anteriores se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
