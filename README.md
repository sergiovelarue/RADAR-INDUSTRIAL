# Mejoras_20260908_1600 — Estado del cliente calculado automáticamente por ventas

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.42 · 2026-09-08**

Corrige el reporte "los estados están en ceros" en la Hoja de Ruta: las tarjetas de Estado y el filtro de Estado ahora calculan el valor en vivo a partir de las ventas reales de cada cliente, en vez de leer un campo de Supabase que llegaba vacío.

## 1. Qué se hizo

### El problema real
Las tarjetas de Estado (Activo, Inactivo, Posible Baja, Baja, Reingreso, Nuevo, Bloqueado) y el filtro de Estado de la Hoja de Ruta leían el campo `estado` guardado en Supabase. Ese campo nunca se llenó automáticamente para la cartera real de clientes — no existe (ni existió) un proceso que lo calculara y guardara — así que quedaba vacío y ninguna tarjeta coincidía con nada: todo en cero.

Mientras tanto, el Dashboard Director → "Salud del Portafolio de Clientes" sí mostraba números correctos, porque usa un motor de cálculo distinto (`statusByMonthV814`) que sí analiza las ventas mes a mes de cada cliente. Ese motor nunca estuvo conectado a la Hoja de Ruta.

### La solución
Se conectó ese mismo motor probado a las tarjetas de Estado y al filtro de la Hoja de Ruta. Ahora, cada vez que se abre o recarga la Hoja de Ruta, el estado de cada cliente se recalcula en vivo según su historial real de ventas del año, usando el mes operativo vigente (el mismo que usa el resto de la app):

- **Activo**: vendió este mes o el mes anterior.
- **Nuevo**: su primera venta del año fue hace menos de 3 meses.
- **Reingreso**: volvió a vender después de un hueco de 4+ meses sin ventas.
- **Inactivo**: lleva exactamente 2 meses sin vender.
- **Posible Baja**: lleva exactamente 3 meses sin vender.
- **Baja**: lleva 4+ meses sin vender, o nunca ha vendido en el año.
- **Bloqueado**: se mantiene exactamente igual que antes — sigue siendo una decisión manual del administrador (switch de bloqueo), no depende de ventas.

**Cambio importante: ya no existe edición manual del estado.** Antes no había ningún control visible para editarlo a mano (no se perdió ninguna función que estuvieras usando), pero se deja documentado: de aquí en adelante el estado siempre refleja las ventas reales, sin excepción salvo Bloqueado.

También se corrigió un detalle de nombres: el motor interno usaba la abreviatura "PB", ahora se traduce a "Posible Baja" en toda la Hoja de Ruta para que coincida con las tarjetas y el filtro (el Dashboard Director, que ya mostraba "PB" en su propia tabla resumen, no se tocó — sigue igual).

### Qué NO cambió
- El Dashboard Director → Salud del Portafolio sigue funcionando exactamente igual (ya estaba correcto).
- El bloqueo/desbloqueo de clientes sigue funcionando igual, con los mismos permisos (cualquiera bloquea, solo administrador desbloquea).
- El aviso "Nueva meta del mes" se revisó y confirmó que funciona como debe: aparece solo los primeros minutos tras un ajuste de meta hecho por el administrador, y no vuelve a aparecer hasta el siguiente ajuste. No requirió ningún cambio.

## 2. Qué tienes que hacer ahora

1. Sube el archivo `mejoras-v1.js` (y `version.js`) a GitHub — ver sección 4.
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. Entra a la Hoja de Ruta y confirma que las tarjetas de Estado ya muestran números reales, no ceros.

## 3. Verificado antes de empaquetar

- Sintaxis validada con `node --check` en `mejoras-v1.js` y `version.js`: sin errores.
- Simulé el cálculo con 9 casos de prueba representando cada estado posible (Activo, Nuevo, Inactivo, Posible Baja, Baja por vencimiento, Baja por nunca haber vendido, Reingreso, Bloqueado explícito, Bloqueado vía campo estado): los 9 casos calcularon el estado correcto.
- Revisé cada punto del código que antes leía el campo plano `c.estado` (tarjetas de Estado, tarjetas de Clasificación cruzadas con Estado, filtro de la tabla, columna "Estado" de la tabla, motor de recomendaciones CFE, exclusión de clientes en Baja) y confirmé que todos ahora usan el cálculo automático.
- Confirmé que no existía ningún control de edición manual del campo estado en la interfaz (solo el switch de Bloqueo, que se conserva intacto).

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos: `mejoras-v1.js`, `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 5. Checklist de prueba

- Entra a la Hoja de Ruta: las tarjetas de Estado (Activo, Inactivo, Posible Baja, Baja, Reingreso, Nuevo, Bloqueado) deben mostrar conteos reales, no ceros.
- Haz clic en la tarjeta "Activo": la tabla debe filtrarse mostrando solo clientes que vendieron este mes o el anterior.
- Revisa la columna "Estado" en la tabla de clientes: debe mostrar un valor coherente con las ventas recientes de cada cliente, no vacío.
- Bloquea un cliente de prueba: debe aparecer en la tarjeta "Bloqueado" y desaparecer de su estado anterior.
- Verifica que "ConAccion · V16.42 · 2026-09-08" aparece en el pie del login.
