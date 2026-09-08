# Mejoras_20260908_1126 — Scroll horizontal en matriz y carrusel en vitrina de trofeos

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.46 · 2026-09-08**

Corrige el problema de espacio que se venía con la entrega anterior (V16.45): al mostrar el año completo, tanto la matriz de cumplimiento del administrador como la vitrina de trofeos del asesor se apretaban demasiado con muchos meses. Mockup revisado y aprobado por Sergio antes de este cambio.

## 1. Qué se hizo

### a) Matriz de cumplimiento — ahora se desliza en vez de apretarse
La tabla ya no reduce el tamaño de las celdas para que quepan todos los meses. En su lugar, la tabla se desliza horizontalmente (con el mouse, el trackpad, o arrastrando con el dedo en celular) mientras la columna "Asesor" se queda fija a la izquierda como referencia. Se agregó un aviso pequeño ("Desliza la tabla para ver todos los meses") debajo, para que sea obvio que hay más contenido a los lados.

### b) Vitrina de trofeos — carrusel deslizable
Igual que la matriz, la vitrina de trofeos ya no usa una cuadrícula que se aprieta con muchos trofeos. Ahora es un carrusel:
- **En computador**: se ven varios trofeos a la vez y se puede seguir deslizando con el mouse/trackpad.
- **En celular**: se fija a mostrar 3 trofeos por pantalla, y el asesor desliza con el dedo para ver los demás — con "snap" (se acomoda automáticamente en cada tarjeta, no queda a medias).

### Qué NO cambió
- Los datos y cálculos siguen siendo exactamente los mismos que en V16.45 (orden cronológico de la vitrina, año completo en la matriz).
- No hay cambios en Supabase.

## 2. Qué tienes que hacer ahora

1. Sube estos 2 archivos a GitHub: `modulo_08_ui_ranking.js`, `styles.css` (y `version.js` para el número de versión).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).

## 3. Verificado antes de empaquetar

- Sintaxis validada con `node --check` en `modulo_08_ui_ranking.js`: sin errores.
- Llaves `{}` en `styles.css` balanceadas (597/597).
- Revisé visualmente el mockup del comportamiento esperado antes de escribir el código (scroll horizontal con columna fija en la matriz, carrusel de 3 con snap en la vitrina para celular) y lo construí siguiendo exactamente esa referencia.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `modulo_08_ui_ranking.js`, `styles.css` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 5. Checklist de prueba

- Entra como Super Administrador desde computador: en la matriz de cumplimiento, confirma que puedes deslizar horizontalmente con el mouse/trackpad y que la columna "Asesor" se queda fija mientras se mueve el resto.
- Desde el celular, confirma que puedes arrastrar la matriz con el dedo de la misma forma.
- Entra como asesor con varios trofeos: en computador, confirma que puedes deslizar la vitrina; en celular, confirma que ves 3 trofeos por pantalla y que al deslizar se acomodan limpiamente (sin quedar cortados a la mitad).
- Verifica que "ConAccion · V16.46 · 2026-09-08" aparece en el pie del login.
