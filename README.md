# Mejoras_20260903_1730 — Corrección real del encabezado superior (móvil)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.13 · 2026-09-03**

Continuación de `Mejoras_20260903_1630` (V15.12). Confirmaste con screenshot que el nombre/cargo/cerrar sesión quedaron apilados a la izquierda, en su propia línea, empujando "Exportar CSV" hacia abajo — no en la misma línea que el título, a la derecha, como se había aprobado sobre el mockup.

## 1. Causa del error

En V15.12, `.topbar-titulo-v160` tenía `flex:1 1 auto`, lo que le hacía reclamar todo el ancho disponible de la fila. Además, el badge de fecha y el párrafo de contexto estaban forzados con `flex-basis:100%` dentro de ese mismo contenedor, haciendo que el bloque del título creciera a 3 líneas de alto. El resultado: no quedaba espacio horizontal para el bloque de sesión en esa primera línea, así que el `flex-wrap` del contenedor padre lo empujaba a una línea propia, alineado a la izquierda por defecto.

## 2. La corrección

Se separó la fila superior en su propio contenedor, `.topbar-fila1-v160` (`display:flex; justify-content:space-between`), que contiene ÚNICAMENTE el título+versión (izquierda) y el bloque de sesión (derecha) — ninguno de los dos reclama espacio de más, así que cada uno ocupa solo lo que su contenido necesita y quedan correctamente en los extremos de la misma línea. El badge de fecha y el párrafo de contexto pasaron a ser hermanos de esa fila, en su propia línea completa debajo — ya no compiten por espacio con la sesión.

**Verificación:** se probó el fix inyectado en vivo sobre el sitio real en producción (sesión iniciada, viewport 375px) antes de empaquetar — se confirmó visualmente que el título queda a la izquierda y el nombre+cargo+"Cerrar sesión" a la derecha, en la misma línea, tal como se aprobó en el mockup original.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — se reestructura el encabezado en 2 wrappers (`topbar-info-v160` > `topbar-fila1-v160`) para que el layout en escritorio no cambie y el de móvil quede correcto. |
| `styles.css` | Reemplazar — corrige el `flex` del título y separa la fila de sesión de los elementos que antes competían por el mismo espacio. |
| `version.js` | Reemplazar — sube a V15.13. |

No se tocó ningún otro archivo.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Prueba en modo incógnito o borrando caché del sitio.
5. Verifica en el celular: título + versión a la izquierda, nombre + cargo + "Cerrar sesión" a la derecha, en la misma línea, arriba del badge de fecha — igual que en el mockup aprobado.

## 5. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente.
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
