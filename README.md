# Mejoras_20260907_1710 — Corrección real (confirmada con video): bucle infinito en el Dashboard

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.37 · 2026-09-07**

Esta vez la corrección está verificada con evidencia directa: analicé el video que me compartiste, extraje varios fotogramas y comparé la gráfica "Venta mensual 2025 vs 2026" del Dashboard cuadro por cuadro. Confirmé que la línea naranja "Meta Ajustada" cambiaba de valor real en cada fotograma (0 → 8.000 → 2.000 → 7.000...) — no era un problema de tamaño ni de animación visual como pensé en las dos entregas anteriores.

## 1. La causa real (encontrada con certeza, no con suposición)

El Dashboard tiene un mecanismo que agrega la línea "Meta Ajustada" después de dibujar el resto de la gráfica: si todavía no tiene los datos de ajustes cargados, los pide al servidor, y cuando llegan, vuelve a dibujar todo el Dashboard. El problema es que ese mecanismo no sabía distinguir entre "todavía no he pedido los datos" y "ya los pedí y no hay ninguno" — y como *eliminé los 5 ajustes viejos* en una corrección anterior (V16.34), la tabla quedó en cero registros de forma permanente. Con cero registros, el sistema interpretaba SIEMPRE que "todavía no cargó", volvía a pedir los datos, volvía a redibujar el Dashboard, volvía a interpretar que no había cargado, y así sin parar — un ciclo que nunca se detenía. Cada vuelta del ciclo tardaba un poco distinto (según la velocidad de tu conexión en ese instante), por eso la línea "saltaba" a valores diferentes cada vez en vez de quedar fija.

Este ciclo lo activó, sin querer, mi propia corrección anterior (al vaciar la tabla de ajustes) — llevaba ahí desde antes, pero nunca se disparaba porque siempre había al menos un ajuste guardado.

## 2. Qué corregí

- Agregué una marca separada que indica "ya pregunté al servidor" (sin importar si la respuesta trajo datos o no), en vez de usar la cantidad de resultados para decidir si hace falta preguntar de nuevo. Con esto, el Dashboard pide los datos de ajustes **una sola vez** por cada vez que abres la app, nunca en bucle.

## 3. Qué tienes que hacer ahora

1. Sube estos 2 archivos a GitHub (ver sección 5).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. Ve al Dashboard y déjalo abierto sin tocar nada por 15-20 segundos: la línea "Meta Ajustada" debe quedar completamente fija, sin cambiar de valor.

## 4. Un hallazgo aparte que encontré de paso (no corregido en esta entrega)

Revisando el Dashboard noté que "Venta 2026" y "Venta 2025 comparable" aparecen en $0 en tus capturas — esto es un problema DISTINTO al del bucle infinito: el Dashboard filtra los clientes que cuentan para esas cifras usando un criterio (`tipoCliente = "Espumas"` o un campo `totalEspumas`) que no parece coincidir con la forma en que tus archivos reales cargan la información. No lo toqué en esta entrega para no mezclar dos correcciones distintas en el mismo paquete y arriesgar que una tape la verificación de la otra — pero es lo próximo que debería revisar si quieres que lo resuelva ahora que el bucle ya está cerrado.

## 5. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores.
- Analicé 5 fotogramas extraídos directamente del video que compartiste (a intervalos de ~2 segundos) y confirmé el patrón exacto de valores cambiando: esta es la primera corrección de este síntoma basada en observación directa del comportamiento, no en teoría.

## 6. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `metas-v1.js` | Reemplazar — corrige el ciclo infinito de carga/redibujado del Dashboard. |
| `version.js` | Reemplazar — sube a V16.37. |

## 7. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 8. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.37 · 2026-09-07" en el login.
- Ve al Dashboard: observa la gráfica "Venta mensual 2025 vs 2026" por 15-20 segundos sin tocar nada — la línea Meta Ajustada debe quedar fija en un solo valor por mes, sin cambiar.
- Si quieres, abre la consola técnica (F12 → Console) y confirma que no aparezcan mensajes repetidos de "[Radar-Metas] Error cargando ajustes" en bucle.

## 9. Pendiente (sin tocar en esta entrega)

- Investigar por qué "Venta 2026"/"Venta 2025 comparable" muestran $0 en el Dashboard (ver sección 4) — candidato para la próxima entrega si confirmas que quieres que lo resuelva.
- Confirmar si las tablas de respaldo de sesiones anteriores se pueden eliminar definitivamente.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Rediseño del login de Asesor — pendiente, decisión tuya de dejarlo para otra sesión.
