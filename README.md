# Mejoras_20260903_1200 — Título de app, causa raíz Hoja de Ruta, footer móvil, ícono de soporte

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.9 · 2026-09-03**

Continuación de `Mejoras_20260903_0952` (V15.8). Responde punto por punto al lote de 6 ajustes reportados tras probar esa entrega.

## 1. Qué cambió, punto por punto (tu reporte)

**1) Título de la app.** "Radar Comercial Industria" → "Radar Comercial B2B" en: el `<title>` de la pestaña del navegador, el encabezado de la pantalla de login, y el nombre junto al logo en el menú lateral. Se dejó **sin tocar a propósito** el texto legal del checkbox de autorización de datos personales (no se debe alterar contenido de consentimiento formal sin instrucción explícita).

**2) Fecha junto a la versión.** Antes se mostraba `V15.8 · 2026-09-03` completo junto al logo (desktop y móvil). Ahora solo se muestra `V15.9`, sin fecha — se recorta en el script que pinta `window.RADAR_VERSION` en pantalla, tomando solo la parte antes del primer " · ". La fecha completa se sigue guardando en `version.js` para control interno de versiones, pero ya no se le muestra al usuario.

**3) Ancho de Hoja de Ruta en móvil (causa raíz real encontrada).** Esta era la única pestaña que seguía desbordada tras V15.8 pese a que todas las demás quedaron bien. Se encontró la causa exacta: una regla CSS suelta y antigua (`.filters{grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) !important}`, agregada en una versión anterior — "V8.1" — para desktop) le ganaba, por el uso de `!important`, a la regla que colapsa los filtros a 1 columna en móvil. Como Hoja de Ruta es la única pestaña con 8 filtros simultáneos (Perfil, Mes, Ordenar, Asesor, Tipo cliente, Estado, Clasificación, Buscar), era la única donde ese grid alcanzaba a formar 2 columnas de 150px y desbordaba el ancho total de la pantalla. Se corrigió agregando el override correspondiente, también con `!important`, dentro del breakpoint móvil — sin tocar la regla original, que sigue funcionando igual en escritorio.

**4) Botón "Actualizar datos" en móvil.** Pasa de ocupar todo el ancho con texto, a un botón circular solo con el ícono ↻ (40×40px), sin texto visible. El texto se mantiene en el HTML oculto por CSS (no se borra) para no perder accesibilidad: el botón conserva `title` y `aria-label="Actualizar datos"` para lectores de pantalla y tooltip. No se hizo flotante junto al botón de soporte porque cumple una función distinta (refresca datos dentro del flujo normal de navegación, no es una acción global aislada); en su lugar se integró de forma compacta en la misma fila del footer del menú, sin ocupar espacio extra.

**5) Nombre del asesor + Cerrar sesión.** En el footer del menú (móvil), ambos se agrupan ahora en una columna alineada a la derecha: arriba el nombre corto + rol, abajo el enlace "Cerrar sesión" — quedando visualmente en la esquina superior derecha de esa franja, separados del botón de actualizar (que queda a la izquierda). Esto libera espacio horizontal y evita que los tres elementos compitan por ancho en una sola fila.

**6) Ícono de soporte (botón flotante).** Se reemplazó el emoji 💬 (que se veía borroso/genérico en varias plataformas) por un ícono SVG propio: una burbuja de chat con signo de interrogación, trazo limpio en blanco sobre el mismo fondo oscuro circular ya existente. Se mantiene exactamente el mismo tamaño (56×56px), la misma posición (`fixed`, esquina inferior derecha, con el ajuste a `right:14px;bottom:14px` en pantallas ≤760px) y la misma función (abre el modal de soporte) — solo cambia el gráfico.

## 2. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — título, footer móvil reestructurado (botón ícono + columna nombre/logout), script de versión sin fecha. |
| `styles.css` | Reemplazar — fix de causa raíz en Hoja de Ruta, nuevo layout del footer móvil. |
| `version.js` | Reemplazar — sube a V15.9. |
| `soporte-v1.js` | Reemplazar — ícono SVG del botón de soporte en vez de emoji. |

No hay cambios en Supabase en esta entrega.

## 3. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 4 archivos de la tabla con el contenido de este paquete (todos ya existían, ninguno es nuevo).
3. Espera 1-2 minutos a que Netlify redeploye y confirma en la pestaña "Deploys" que el más reciente quede "Published" sin errores.
4. **Importante — prueba en modo incógnito o borrando caché del sitio primero.** Los navegadores móviles (especialmente iOS Safari) cachean agresivamente `index.html` y los `.js`/`.css`; si pruebas sin limpiar caché puedes seguir viendo la versión anterior aunque el deploy ya esté actualizado.
5. Verifica en el celular: el título de la pestaña/login dice "Radar Comercial B2B", junto al logo solo aparece "V15.9" sin fecha, Hoja de Ruta ya no se desborda ni con los 8 filtros abiertos, "Actualizar datos" es un círculo con ícono sin texto, el nombre + "Cerrar sesión" aparecen agrupados a la derecha del footer, y el botón de soporte muestra el nuevo ícono de burbuja con "?".

## 4. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" en textos visibles al usuario (sigue pendiente, no aplicado — instrucción explícita de Sergio de dejarlo para un próximo cambio).
- Conexión real a la API de Claude para el Motor ARC.
