# Mejoras_20260908_2300 — Ranking de ventas, cierre automático del RAC e insignias de logro

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.43 · 2026-09-08**

Rediseña por completo la pestaña Ranking: pasa de mostrar un puntaje compuesto a mostrar directamente quién vende más, con medallas y privacidad entre asesores. El cierre semanal que antes dependía de que tú entraras a la app y presionaras un botón ahora corre solo, en el servidor, cada lunes.

## 1. Qué se hizo

### a) Ranking de ventas — nuevo, es lo primero que se ve
Antes la pestaña Ranking mostraba un puntaje calculado (70% cumplimiento de meta + 30% actividad comercial). Ahora, arriba de todo, se ve un ranking simple ordenado por venta real en pesos, con un switch para alternar entre "Ventas del mes" (el mes vigente, igual que el resto de la app) y "Acumulado del año". Los primeros tres lugares llevan medalla de oro, plata y bronce.

**Privacidad entre asesores**: cuando un administrador entra, ve el ranking completo con todos los nombres y cifras. Cuando entra un asesor, se ve a sí mismo con su nombre y cifra nítidos y resaltados en azul (con la etiqueta "(tú)"), pero el resto de sus compañeros aparece con el nombre y la cifra difuminados — puede ver su propia posición en la lista, pero no puede leer quién es cada uno de los demás ni cuánto vende.

### b) Cierre semanal automático — ya no depende de que entres a la app
El panel de rendimiento (nivel, racha, insignias) seguía funcionando con la misma fórmula de siempre (70% cumplimiento + 30% actividad), pero dependía de que tú entraras cada lunes y presionaras "Cerrar semana" para que se guardara el registro de esa semana. Si algún lunes no entrabas, la racha de los asesores se rompía sin que fuera su culpa.

Ahora ese cierre corre solo: se programó un proceso automático en el servidor (Supabase) que se ejecuta cada lunes a las 12:05 a.m. hora Colombia, sin que nadie tenga que abrir la app. Ya no existe el botón "Cerrar semana" — no hace falta.

**Cambio importante en el cálculo**: antes el cumplimiento de meta se calculaba cliente por cliente y se promediaba. Ahora se calcula a nivel de todo el asesor: se suma la venta de todos sus clientes y se compara contra la meta total del asesor (usando el ajuste de meta por asesor si tú lo definiste ese mes, o si no, la suma de las metas iniciales de sus clientes). Esto lo acordamos juntos porque es más representativo del desempeño real del asesor y no depende de datos que solo viven en el navegador de quien los edita.

### c) Insignia de logro — aparece junto a tu nombre en toda la app
Cuando a un asesor le pasa algo positivo esa semana (sube de nivel, logra una racha récord, o gana una insignia nueva), aparece un pequeño ícono junto a su nombre en la parte superior de la app — sin texto, solo el ícono, con el detalle disponible al pasar el cursor o tocarlo. Por ejemplo: 💎 si sube a nivel Diamante, 🔥 si logra una racha récord, 🏆 si supera su meta.

Este ícono se queda visible toda la semana mientras el logro siga vigente — no desaparece al verlo una vez, para que el asesor pueda mostrarlo o recordarlo durante varios días. Solo aparece para asesores, nunca para el perfil de administrador.

### Qué NO cambió
- El cálculo de niveles (Bronce → Plata → Oro → Platino → Diamante), racha e insignias sigue usando exactamente las mismas reglas ya definidas contigo.
- El panel de perfil individual (nivel, racha, insignias) sigue estando disponible en la pestaña Ranking, debajo del nuevo ranking de ventas — solo que ahora lee el resultado ya calculado por el servidor en vez de calcularlo en el navegador cada vez.

## 2. Qué tienes que hacer ahora

1. Sube estos 4 archivos a GitHub: `index.html`, `styles.css`, `modulo_08_ui_ranking.js`, `modulo_06_motor_rac.js`, `version.js` (5 archivos en total — ver sección 4).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. **No necesitas hacer nada en Supabase** — la Edge Function, la tabla nueva y el cron automático ya están desplegados y funcionando en producción (lo hice directamente y lo probé en vivo antes de entregarte esto).
4. Entra a la pestaña Ranking y confirma que se ve el nuevo diseño con el switch "Ventas del mes / Acumulado del año".

## 3. Verificado antes de empaquetar

- Sintaxis validada con `node --check` en los 4 archivos JavaScript modificados: sin errores.
- Etiquetas `<div>` en `index.html` balanceadas (259 aperturas, 259 cierres) y llaves `{}` en `styles.css` balanceadas (557 y 557).
- Probé la Edge Function `cerrar-semana-rac` **en vivo, dos veces seguidas**, contra los datos reales de tus 7 asesores: calculó correctamente el ranking, guardó el snapshot semanal, y confirmé que ejecutarla dos veces la misma semana no duplica el registro (es segura de repetir).
- Confirmé que los indicadores de "logro nuevo esta semana" se apagan correctamente en la segunda ejecución (no se notifica el mismo logro dos veces).
- Simulé con casos de prueba en Node.js: el orden del ranking por venta, la asignación de medallas a los primeros 3 lugares, y el difuminado correcto según el perfil (administrador ve todo, asesor solo se ve a sí mismo) — todos los casos pasaron.
- Simulé los 5 escenarios de la insignia de logro (sin logro nuevo, subida de nivel, racha récord, insignias nuevas, y los tres combinados) — todos calcularon la cantidad correcta de íconos.
- Corregí en el camino un error de zona horaria en el cron: mi primer intento programó el cierre para la madrugada del domingo (hora Colombia) en vez del lunes — ya quedó corregido y confirmado contra la hora real del servidor antes de entregarte esto.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 5 archivos: `index.html`, `styles.css`, `modulo_08_ui_ranking.js`, `modulo_06_motor_rac.js`, `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 5. Checklist de prueba

- Entra a la pestaña Ranking como Super Administrador: debes ver el ranking de ventas con todos los nombres visibles, medallas en los primeros 3 lugares, y el switch para cambiar entre mes y acumulado del año.
- Cambia el switch a "Acumulado del año": los montos y el orden deben actualizarse.
- Si tienes a mano el correo/teléfono de un asesor de prueba, entra con esa cuenta y confirma que solo se ve a sí mismo nítido (con la etiqueta "(tú)"), y que el resto de sus compañeros aparece borroso, sin poder leerse.
- Revisa la parte superior de la app (donde dice tu nombre y rol): si algún asesor tuvo un logro esta semana, debe aparecer un ícono pequeño al lado de su nombre — puedes pasar el cursor sobre él para ver de qué logro se trata.
- Verifica que "ConAccion · V16.43 · 2026-09-08" aparece en el pie del login.

## 6. Nota técnica (para referencia futura, no requiere acción tuya)

Se desplegó una Edge Function nueva llamada `cerrar-semana-rac` en tu proyecto Supabase (RADAR-INDUSTRIAL), programada con `pg_cron` para ejecutarse todos los lunes a las 12:05 a.m. hora Colombia, siguiendo el mismo patrón de seguridad ya usado para la sincronización con el ERP (secreto compartido, sin depender de que un usuario esté logueado). También se creó la tabla `rac_logro_estado_asesor_v1` en Supabase, que guarda el nivel, racha e insignias vigentes de cada asesor, más los indicadores de "esto es nuevo esta semana" que usa la insignia junto al nombre.
