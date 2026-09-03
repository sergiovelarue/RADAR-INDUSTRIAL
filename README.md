# Mejoras_20260903_2000 — "Actualizar datos" flotante y sesión reubicada en escritorio

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.17 · 2026-09-03**

Extiende a escritorio (>1100px) el mismo tratamiento que ya existía solo para móvil desde V15.12/14, con el ajuste que aprobaste sobre el mockup interactivo antes de implementar.

## 1. Qué cambia en escritorio

- **"Actualizar datos"** deja de ser un botón de ancho completo en el pie del menú lateral y pasa a ser un círculo flotante pequeño, apilado justo arriba del botón de soporte, esquina inferior derecha de la pantalla — igual patrón que ya tenías en móvil.
- **Nombre del asesor + cargo + "Cerrar sesión"** se mueven del pie del menú lateral a justo debajo del logo, el nombre de la app y la versión — y arriba del menú de pestañas (Hoja de ruta, Seguimiento diario, etc). A diferencia de móvil (donde van en columna, alineados a la derecha), en escritorio "Cerrar sesión" queda AL LADO de nombre+cargo, no debajo — el sidebar vertical tiene ancho de sobra para eso, tal como pediste y se ajustó sobre el mockup.
- El pie del menú lateral queda vacío en todos los anchos de pantalla (ya lo estaba en móvil desde V15.14; ahora también en escritorio).

## 2. Detalle técnico

Se agregó un tercer contenedor fijo en `index.html`, `#sidebarSessionSlotV162`, ubicado dentro de `.sidebar`, debajo de `.brand-row-v161` (logo+nombre+versión) y arriba de `<nav>`. La función de reparenting en `topbar-movil-v154.js` (`ajustarSessionSlotMovilV160`, la misma que desde V15.14 mueve el bloque de sesión según el ancho de pantalla) ahora reconoce tres destinos: en móvil (`≤1100px`) sigue yendo a `#topbarSessionSlotV160` (dentro de `.brand-row-v161`, sin cambios respecto a lo que ya tenías); en escritorio (`>1100px`) va a `#sidebarSessionSlotV162`. El botón `#refreshDataBtn` ahora se reparenta a `document.body` con la clase flotante en ambos casos, no solo en móvil.

En `styles.css`, la definición base del botón flotante (tamaño, forma, posición fija) se movió fuera de cualquier `@media` para que aplique siempre; antes solo existía dentro de `@media(max-width:1100px)`. Se agregó el bloque `.sidebar-session-slot-v162` con el estilo del bloque de sesión en escritorio: `justify-content:space-between` separa nombre+cargo (con `text-overflow:ellipsis` para nombres largos, sin desbordar el sidebar) de "Cerrar sesión" (ancho fijo, nunca se corta), en la misma fila.

**Verificación realizada (antes de empaquetar, contra el sitio real en producción, con el cambio inyectado en vivo):**
- 1400px: bloque de sesión debajo de logo/nombre/versión, "Cerrar sesión" al lado (no debajo) de nombre+cargo. Botón "Actualizar datos" flotante, circular, apilado sobre soporte. Sin overflow horizontal.
- Se probó con un nombre de asesor largo simulado ("MARIAALEJANDRAFERNANDA · Super Administrador"): el nombre se recorta con "…" sin romper el layout ni empujar "Cerrar sesión" fuera de la pantalla.
- 1150px (dentro del rango desktop, cerca del breakpoint): layout desktop correcto.
- 1050px (justo debajo del breakpoint de 1100px): transición limpia a layout móvil, sin overflow.
- 375px (celular): confirmado que el comportamiento móvil de V15.14-16 sigue exactamente igual, sin cambios.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — se agrega el contenedor `#sidebarSessionSlotV162` dentro de `.sidebar`. |
| `styles.css` | Reemplazar — botón flotante ahora aplica siempre (no solo en móvil); nuevo bloque de estilos para `.sidebar-session-slot-v162`. |
| `topbar-movil-v154.js` | Reemplazar — `ajustarSessionSlotMovilV160` ahora reparenta a tres destinos según el ancho de pantalla en vez de dos. |
| `version.js` | Reemplazar — sube a V15.17. |

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `topbar-movil-v154.js` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Prueba en modo incógnito o borrando caché.

## 5. Checklist de prueba

- **Escritorio**: nombre del asesor + cargo debajo del nombre de la app, "Cerrar sesión" al lado (misma línea). Botón circular flotante de "Actualizar datos" sobre el botón de soporte, esquina inferior derecha.
- **Celular**: sin cambios respecto a lo que ya tenías — sesión en la línea del nombre de la app, "Actualizar datos" flotante sobre soporte.
- Redimensionar la ventana lentamente de escritorio a móvil (cruzando los 1100px) para confirmar que no hay una zona intermedia rota.

## 6. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
