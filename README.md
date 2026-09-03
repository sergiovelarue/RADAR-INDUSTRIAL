# Mejoras_20260903_1330 — Fix definitivo del ancho en Hoja de Ruta (móvil)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.10 · 2026-09-03**

Continuación de `Mejoras_20260903_1200` (V15.9). Confirmaste que tras subir V15.9 el título ya cambió correctamente, pero Hoja de Ruta seguía desbordada en móvil. Esta entrega corrige la causa exacta de por qué el fix de V15.9 no alcanzó.

## 1. Por qué el fix anterior (V15.9) no funcionó

En V15.9 agregué `.filters{grid-template-columns:1fr!important}` dentro del bloque `@media(max-width:760px)`, asumiendo que el `!important` sería suficiente para ganarle a la regla vieja (`.filters{grid-template-columns:repeat(auto-fit,minmax(150px,1fr)) !important}`, agregada en una versión antigua — "V8.1" — para desktop).

Verifiqué el CSS real servido en producción (no solo el archivo local) y until confirmé que el deploy sí tomó el cambio de V15.9 correctamente — no era un problema de caché ni de deploy. El problema es una regla de CSS más sutil: **cuando dos reglas con el mismo selector (`.filters`) y ambas con `!important` compiten, no gana la que está "dentro de un media query"** — en igualdad de especificidad, gana la que aparece **más abajo en el archivo**. La regla vieja "V8.1" está físicamente después del bloque `@media(max-width:760px)` en `styles.css`, así que seguía ganando ella pese al `!important` que agregué.

## 2. La corrección real (V15.10)

En vez de competir en "quién tiene `!important`" (que ya estaba empatado), se sube la **especificidad** real del selector dentro del breakpoint móvil: `html body .filters{grid-template-columns:1fr!important}`. Con tres partes en el selector en vez de una, esta regla gana sin importar en qué orden aparezcan las reglas en el archivo. Verificado matemáticamente contra las reglas de especificidad CSS (no es una suposición): un selector con 3 elementos de especificidad (aunque sean etiquetas genéricas `html`, `body`) siempre le gana a uno con 1 clase (`.filters`), sin importar el orden de aparición, mientras ambos tengan `!important`.

No se tocó la regla original de "V8.1" — sigue funcionando igual en escritorio, donde sí tiene sentido repartir los filtros en varias columnas.

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `styles.css` | Reemplazar — único cambio real: la regla de especificidad para `.filters` en móvil. |
| `version.js` | Reemplazar — sube a V15.10. |

No se tocó `index.html`, `soporte-v1.js` ni ningún otro archivo — este paquete es exclusivamente el fix de Hoja de Ruta, para no mezclar cambios mientras confirmas que este quedó resuelto (como pediste).

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `styles.css` y `version.js` con el contenido de este paquete.
3. Espera 1-2 minutos y confirma en la pestaña "Deploys" de Netlify que el más reciente quede "Published".
4. **Prueba en modo incógnito o borrando caché del sitio** (no solo cerrar y volver a abrir la pestaña) — así se descarta cualquier duda de caché del navegador móvil.
5. Verifica en el celular: entra a Hoja de Ruta con los 8 filtros visibles (Perfil, Mes, Ordenar, Asesor, Tipo cliente, Estado, Clasificación, Buscar) y confirma que el layout se ve igual de estable que las demás pestañas, sin desbordar el ancho de la pantalla ni cortar el nav.

## 5. Pendiente (sin tocar en esta entrega, a la espera de tu confirmación)

- Nada más se toca hasta que confirmes que Hoja de Ruta quedó igual que las demás pestañas, según tu instrucción explícita.
- Renombrar "Super Administrador" a "Administrador" sigue pendiente (instrucción explícita de dejarlo para un próximo cambio).
- Conexión real a la API de Claude para el Motor ARC — sigue pendiente.
