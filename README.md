# Mejoras_20260903_0758 — Motor ARC (Agente de IA)

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.6 · 2026-09-03**

## 1. Qué trae este paquete

Estructura completa del **Motor ARC** (Análisis y Recomendación Comercial con IA): botón "Analizar con IA" por cliente para el asesor, análisis individual de asesor y análisis del negocio completo para el administrador/director comercial, y panel de control exclusivo del Super Administrador (activar/desactivar + límites diarios de uso) en la pestaña **Sistema**.

**⚠️ IMPORTANTE — sin conexión real a IA todavía.** Esta entrega conecta toda la interfaz, la configuración en Supabase y el historial auditable, pero la llamada a la API de Claude es un **placeholder simulado** (`llamarMotorArcV1` en `modulo_11_motor_arc.js`): responde con un texto de ejemplo tras ~1 segundo de espera, sin llamar a ningún servicio externo ni generar costo. Cuando tengas tu API key de Anthropic, se reemplaza únicamente esa función por la llamada real a una Supabase Edge Function — el resto del módulo (botones, permisos, historial) no necesita cambios.

La función queda **desactivada por defecto** tras ejecutar el SQL. Actívala desde Sistema → Motor ARC cuando quieras probarla.

## 2. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar el existente — agrega el `<link>` de `motor-arc-v1.css` y el `<script>` de `modulo_11_motor_arc.js` al final. |
| `version.js` | Reemplazar el existente — sube el número de versión visible en la app. |
| `modulo_11_motor_arc.js` | Archivo nuevo — subir a la raíz del sitio. |
| `motor-arc-v1.css` | Archivo nuevo — subir a la raíz del sitio. |
| `06_motor_arc.sql` | Ejecutar en Supabase (ver paso 4). |

## 3. Pasos para subir a GitHub

1. Entra a tu repositorio **RADAR-INDUSTRIAL** en GitHub, rama `main`.
2. Sube `modulo_11_motor_arc.js` y `motor-arc-v1.css` como archivos **nuevos** (Add file → Upload files, o crear cada uno y pegar el contenido).
3. Reemplaza `index.html` y `version.js` con el contenido de este paquete (edítalos, borra todo, pega el nuevo contenido, Commit changes).
4. Espera 1-2 minutos y verifica en tu sitio de Netlify.

## 4. Paso en Supabase (obligatorio para que funcione)

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard), proyecto **`ljztqfzykvuvopgqgxxf`** (Radar Comercial Industria).
2. SQL Editor → New query.
3. Copia y pega el contenido completo de `06_motor_arc.sql`, ejecuta (Run).
4. Debe decir "Success". Crea: tabla `configuracion_motor_arc` (fila única, `activo = false` por defecto), tabla `analisis_ia_log` (historial auditable), y 3 funciones (`actualizar_config_motor_arc_v1`, `registrar_analisis_ia_v1`, `contar_analisis_ia_hoy_v1`).

## 5. Cómo probarlo

1. Inicia sesión como Super Administrador (`sergiovelasquez@me.com`).
2. Ve a la pestaña **Sistema** → panel "Motor ARC — Agente de análisis y recomendación con IA" → activa el interruptor → Guardar configuración.
3. Ve a **Seguimiento diario** → "Acciones recomendadas": debe aparecer el botón "✨ Analizar con IA" junto a cada cliente sugerido.
4. En esa misma vista, si eres administrador y seleccionas un asesor específico (no "Todos"), aparece el botón "✨ Analizar asesor con IA".
5. Ve al **Dashboard**: junto a "Lectura estratégica sugerida" aparece "✨ Analizar negocio con IA".
6. Desactiva el interruptor en Sistema y vuelve a revisar esas tres pantallas: en vez del botón, debe verse el aviso "Análisis con IA — próximamente disponible".

## 6. Pendiente / próximos pasos

- Conectar la llamada real a la API de Claude (reemplazar `llamarMotorArcV1` por una Supabase Edge Function con la API key de Anthropic).
- Definir el límite diario real de uso por asesor/administrador según presupuesto (ya configurable desde el panel, valores por defecto: 15 y 10 análisis/día).

## 7. Hallazgo detectado durante esta entrega (no corregido, solo reportado)

`index.html` referencia `<script src="topbar-movil-v154.js">`, pero ese archivo **no existe** en ninguna carpeta del proyecto (ni en esta entrega ni en entregas anteriores) — es un enlace roto en producción (error 404 silencioso en consola, no rompe la app, pero esa mejora nunca llegó a aplicarse). El fix del header móvil (botón "Actualizar datos" / nombre del asesor / "Cerrar sesión" saliéndose de la pantalla) ya está resuelto por otra vía, con CSS embebido directamente en `index.html` — no depende de ese archivo faltante. Si tienes el archivo `topbar-movil-v154.js` guardado en otro lugar, avísame y lo integro; si no, se puede quitar esa línea del `<head>` para evitar el error en consola.
