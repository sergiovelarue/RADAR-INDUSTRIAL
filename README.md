# Mejoras_20260903_0952 — Estabilidad móvil real (header, navegación, tablas)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.8 · 2026-09-03**

Continuación de `Mejoras_20260903_0818`. Responde punto por punto a lo que Sergio reportó con evidencia de screenshot real tras subir esa entrega.

## 1. Causa raíz encontrada (importante)

El archivo `topbar-movil-v154.js`, referenciado en `index.html` desde hace semanas, **nunca existía en el proyecto** (confirmado: no está en ninguna carpeta de entrega anterior). `styles.css` ya tenía preparada la clase `.sidebar-footer-mobile-v154` para resolver exactamente el problema del encabezado móvil, pero como el JS que aplica esa clase nunca se subió, esa solución nunca entró en funcionamiento. Mientras tanto, mi corrección de la entrega pasada (`Mejoras_20260903_0758`) agregó un CSS embebido en `index.html` que competía con el sistema responsive real de `styles.css` (`@media max-width:1100px`, que convierte el menú lateral en barra horizontal con pestañas deslizables) — de ahí que el nav se viera cortado y el encabezado inestable.

**Esta entrega corrige la causa raíz**, no otro parche encima: se retira el CSS embebido que competía, y se recrea `topbar-movil-v154.js` siguiendo exactamente lo que ya estaba previsto en `styles.css`.

## 2. Qué cambió, punto por punto (tu reporte)

**1) Header y nav inestables en Hoja de ruta.** Resuelto por lo descrito arriba: `topbar-movil-v154.js` reactiva el comportamiento móvil correcto ya preparado en `styles.css`. El nav de pestañas ahora es deslizable horizontalmente sin cortarse, y el pie del menú (Actualizar datos / nombre / Cerrar sesión) pasa a ser una fila normal debajo del encabezado en vez de competir por espacio.

**2) Cajones grandes: Acciones recomendadas y Prospección.** La tabla de clientes sugeridos en "Seguimiento diario → Acciones recomendadas" ahora se contrae en celular igual que ya funcionaba en "Hoja de ruta": se ve solo la razón social, y al tocar la tarjeta se expande mostrando el resto de datos. Los cajones de filtro/búsqueda de Prospección se redujeron en alto (menos padding, etiquetas más pequeñas) sin tocar el tamaño de los campos de escritura (se mantiene 16px para que no dispare el zoom automático de iPhone).

**3) Nombre del asesor y Score en Acciones recomendadas.** El nombre del asesor ahora muestra solo el primer nombre, no nombre y apellido. La columna Score se oculta para el asesor (solo le sirve al administrador para comparar entre varios asesores, no le aporta nada a quien ya ve su propia lista ordenada).

**4) Nombre en el encabezado simplificado.** Se corrigió también un bug que no habías señalado directamente pero que se veía en tu captura: el nombre aparecía duplicado ("HERCILIA MUÑOZ · Asesor · HERCILIA MUÑOZ"), porque la función que arma ese texto usa el nombre dos veces cuando el usuario es asesor. Ahora muestra solo el primer nombre, una vez: "Hercilia · Asesor".

**5) Botón "Actualizar datos": ¿es necesario?** Sí cumple una función real — refresca los datos desde Supabase (clientes, configuración, y para administradores también usuarios/metas/soporte) sin tener que recargar toda la página. No se eliminó, pero se sacó del bloque fijo superior en móvil (mismo mecanismo del punto 1), para que no le quite espacio al nav ni al nombre de sesión.

**6) Bug de navegación: contenido de una pestaña visible en otra.** Encontrado y confirmado en el código: cada módulo nuevo (Ajustes, Sistema, Alarmas, Ranking) mantenía su propia lista fija de "qué otras vistas ocultar al entrar", y esas listas quedaron desactualizadas entre sí a medida que se agregaban pestañas nuevas — por ejemplo, si visitabas "Ajustes" y luego "Metas" o "Alarmas", la vista de Ajustes podía quedar visible por debajo. Se corrigió con un módulo nuevo (`modulo_12_navegacion_estable.js`) que reemplaza ese patrón frágil por una lista única y centralizada de las 12 pestañas reales, aplicada siempre, sin importar el orden en que se visiten.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — quita el CSS viejo que competía, agrega 2 `<link>` y 3 `<script>` nuevos. |
| `version.js` | Reemplazar — sube el número de versión. |
| `topbar-movil-v154.js` | **Archivo nuevo** — recreado, resuelve el header móvil de raíz. |
| `modulo_12_navegacion_estable.js` | **Archivo nuevo** — corrige el bug de navegación entre pestañas. |
| `modulo_13_recomendadas_movil.js` | **Archivo nuevo** — contrae tarjetas, acorta nombre de asesor, oculta Score. |
| `movil-v1.css` | **Archivo nuevo** — estilos de tarjeta contraída y filtros compactos de Prospección. |
| `usuarios-v1.js` | Reemplazar — se encontró y corrigió la misma tabla-sin-scroll-horizontal que ya se había corregido en Sistema (auditoría completa de todas las pestañas, tal como pediste). |

No hay cambios en Supabase en esta entrega.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Sube los 3 archivos nuevos (`topbar-movil-v154.js`, `modulo_12_navegacion_estable.js`, `modulo_13_recomendadas_movil.js`, `movil-v1.css` — son 4, no 3, revisa la tabla arriba) como archivos nuevos.
3. Reemplaza `index.html`, `version.js` y `usuarios-v1.js` con el contenido de este paquete.
4. Espera 1-2 minutos y prueba en tu celular: entra como asesor, revisa que el nav de pestañas se pueda deslizar sin cortarse, que tu nombre aparezca una sola vez y corto, que "Acciones recomendadas" se vea en tarjetas contraídas, y navega entre varias pestañas seguidas (Ajustes → Metas → Alarmas → Hoja de ruta) para confirmar que no queda nada de una pestaña anterior visible.

## 5. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" en textos visibles al usuario (sigue pendiente, no aplicado).
- Conexión real a la API de Claude para el Motor ARC.
