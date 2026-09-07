# Mejoras_20260907_1702 — Corrección: gráficas moviéndose sin parar (Dashboard y Metas)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.36 · 2026-09-07**

Corrige el problema que reportaste: la gráfica se mueve constantemente, sin parar, aunque no toques nada. Confirmaste que pasa en el Dashboard, y por el diseño del código, el mismo problema afectaba también a las dos gráficas de "Metas y presupuestos".

## 1. Qué encontré (esta vez con causa técnica verificada, no una cifra)

Este NO era un problema de datos — era un conflicto entre dos partes del código que llevaba tiempo ahí (no lo introduje en las entregas anteriores de esta semana): el estilo visual de las tarjetas de gráficas fijaba el ancho del gráfico con una regla de CSS muy estricta, mientras que el código que dibuja las gráficas (con la librería Chart.js) también intentaba controlar su propio tamaño usando una "relación de aspecto" (ancho/alto). Estas dos reglas competían entre sí: cada vez que una ajustaba el tamaño, la otra lo volvía a cambiar, y así indefinidamente — eso es exactamente lo que veías como "las líneas se mueven todo el tiempo, sin parar".

## 2. Qué corregí

- Le di a cada gráfica un espacio de tamaño fijo y estable en la pantalla, en vez de dejar que compita por su propio tamaño.
- Ajusté el código que dibuja las gráficas para que respete ese espacio fijo, en vez de intentar imponer su propia proporción.
- Apliqué esta corrección a **todas** las gráficas de la app (Dashboard, Metas y presupuestos, Segmentos comerciales, Salud del portafolio) — no solo a la que reportaste, para que no vuelva a pasar en otra pestaña.

## 3. Qué tienes que hacer ahora

1. Sube los 4 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R) — indispensable, si no lo haces seguirás viendo la versión anterior en caché.
3. Ve al Dashboard y a "Metas y presupuestos": las gráficas deben quedar completamente quietas después de cargar, sin ningún movimiento continuo.

## 4. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores en `app.js`.
- HTML con etiquetas balanceadas (260 `<div>` abiertos/cerrados) y confirmé que las 11 gráficas de la app quedaron correctamente envueltas con el nuevo contenedor de tamaño fijo.
- Revisé todo el código de generación de gráficas del proyecto (Dashboard, Metas, Segmentos, Salud del portafolio) para confirmar que todas pasan por la misma función central que corregí, así que la corrección aplica de forma uniforme.

## 5. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `app.js` | Reemplazar — corrige cómo Chart.js calcula el tamaño de cada gráfica. |
| `index.html` | Reemplazar — agrega un contenedor de tamaño fijo alrededor de cada gráfica. |
| `styles.css` | Reemplazar — nuevo estilo para ese contenedor, retira la regla de CSS que competía con Chart.js. |
| `version.js` | Reemplazar — sube a V16.36. |

## 6. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 4 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 7. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.36 · 2026-09-07" en el login.
- Ve al Dashboard: observa las gráficas por 15-20 segundos sin tocar nada — no deben moverse.
- Ve a "Metas y presupuestos": mismo chequeo en las dos gráficas de esa pestaña.
- Revisa también "Salud del Portafolio" y "Segmentos comerciales" si las usas — deben verse igual de estables.
- Confirma que las gráficas se sigan viendo bien en tamaño (ni muy chiquitas ni cortadas) en tu pantalla habitual.

## 8. Si algo sigue sin verse bien

Si después de esta entrega alguna gráfica sigue rara, la forma más rápida de que yo lo diagnostique con certeza (y no vuelva a fallar dos veces adivinando) es: una grabación corta de pantalla o video de 5-10 segundos mostrando el problema, más el mensaje que aparece en la consola técnica del navegador (F12 → pestaña Console) en ese momento.

## 9. Pendiente (sin tocar en esta entrega)

- Confirmar si las tablas de respaldo de sesiones anteriores se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
