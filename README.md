# Mejoras_20260907_1721 — Corrección: Dashboard en $0 (filtro obsoleto de línea de negocio)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.38 · 2026-09-07**

Corrige lo que confirmaste: la gráfica "Venta mensual comparada" de "Metas y presupuestos" ya está bien, pero el Dashboard sigue mostrando $0 en Venta 2026, Venta 2025, Crecimiento, Clientes con venta, Pareto y Ticket promedio.

## 1. La causa (confirmada con datos, no supuesta)

El Dashboard tenía un filtro heredado de una versión muy anterior de la app, de cuando existían dos líneas de negocio distintas (Espumas y Colchones) y el usuario podía elegir cuál ver. Ese filtro exigía que cada cliente tuviera marcado `tipoCliente = "Espumas"` o algún campo de "total Espumas" mayor a cero.

El problema: esos campos **nunca se generan** al cargar tu Histórico o Venta actual reales — confirmé directamente en la base de datos que tus 566 clientes tienen ese campo vacío. El filtro llevaba tiempo excluyendo silenciosamente a absolutamente todos los clientes del Dashboard, mientras el resto de la app (Hoja de ruta, Metas y presupuestos) sí funcionaba porque usa otro camino de cálculo que no depende de ese filtro.

Como ya no existe ningún selector de línea de negocio en la app (Colchones se retiró hace tiempo, y el código ya lo dice explícitamente en un comentario: "la línea de negocio del panel Director queda fija en 'espumas'"), no tiene sentido mantener un filtro que excluye clientes por un campo que ya nadie llena — todos tus clientes cargados pertenecen, por definición, a esa única línea.

## 2. Qué corregí

- Eliminé el filtro obsoleto: ahora el Dashboard incluye a todos los clientes de tu base, igual que el resto de la app.

## 3. Qué tienes que hacer ahora

1. Sube estos 2 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. Ve al Dashboard: "Venta 2026", "Venta 2025 comparable", "Crecimiento", "Clientes con venta", "Pareto 80%" y "Ticket promedio" ya deben mostrar cifras reales, no $0.
4. La gráfica "Venta mensual 2025 vs 2026" del Dashboard también debe mostrar las líneas azul (2026) y celeste (2025) con datos, no en cero.

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores.
- Confirmé directamente en la base de datos que los 566 clientes reales tienen el campo `tipo_cliente` vacío y no tienen ningún campo de "total Espumas" — la causa exacta del filtro fallando, no una suposición.
- Revisé que este filtro solo se usa en un único lugar de todo el código (la función que arma la lista de clientes del Dashboard), así que el cambio no afecta ninguna otra vista de la app.

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `app.js` | Reemplazar — elimina el filtro obsoleto de línea de negocio en el Dashboard. |
| `version.js` | Reemplazar — sube a V16.38. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.38 · 2026-09-07" en el login.
- Ve al Dashboard: las 6 tarjetas de arriba deben mostrar cifras reales (no $0 ni 0 clientes).
- Revisa que las gráficas de abajo (Venta por asesor, Clasificación, Estado comercial, Clientes facturando) también muestren datos, ya que todas dependen de la misma lista de clientes que corregí.

## 8. Sobre el Paso 4 (semáforo y "566.0000000000001")

Esas dos correcciones ya quedaron aplicadas directamente en el servidor (Supabase) en el mensaje anterior — no requerían archivos nuevos para la app. Si aún no has vuelto a presionar "Calcular Meta Inicial y Presupuesto" desde entonces, hazlo ahora: debe mostrar "566 clientes" sin decimales y el semáforo debe encenderse en verde.

## 9. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo de sesiones anteriores se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
