# Mejoras_20260903_0818 — Ajustes de estabilidad móvil

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V15.7 · 2026-09-03**

Continuación de `Mejoras_20260903_0758` (Motor ARC). Este paquete corrige lo que Sergio reportó tras probar esa entrega: el aviso "próximamente disponible" era demasiado grande (sobre todo en celular), y hay pantallas que se desbordan y no permiten scroll fluido en móvil.

## 1. Qué cambió

**Aviso "IA próximamente" simplificado.** Antes era una tarjeta grande (ícono circular + título + subtítulo). Ahora es un chip pequeño de una sola línea ("✨ IA próximamente"), con la explicación completa disponible solo como tooltip (al pasar el mouse en computador) — en celular el texto corto ya es suficiente, no hace falta el detalle largo ocupando espacio. Afecta `motor-arc-v1.css` y `modulo_11_motor_arc.js`.

**Tabla de administradores (pestaña Sistema) sin scroll horizontal — corregido.** La tabla de administradores (Correo/Nombre/Rol/Último ingreso/Acciones) no tenía el mismo wrapper de scroll horizontal que ya usan las demás tablas de la app (`.table-scroll`). En celular, esa tabla se salía de la pantalla sin forma de desplazarla. Ahora tiene scroll horizontal propio, controlado y fluido. Afecta `sistema-v1.js` y `sistema-v1.css`.

**Selector de mes en "Metas y presupuestos" con ancho mínimo fijo — corregido.** Tenía `min-width:220px`, que en celulares angostos (320-360px de ancho, ej. iPhone SE) podía forzar desborde horizontal. Ahora se ajusta al ancho disponible. Afecta `metas-v1.css`.

**Botón "Analizar con IA" en la tabla de clientes sugeridos — corregido.** La zona del botón tenía un ancho mínimo de 220px que, sumado a las otras 7 columnas de esa tabla, empeoraba el desborde en móvil. Se quitó ese mínimo — el botón se ajusta al espacio real disponible. Afecta `motor-arc-v1.css`.

## 2. Sobre "simplificar textos"

Revisé los textos de ayuda de la app (descripciones bajo cada panel, `field-help`, etc.). La mayoría explica reglas de negocio reales que el usuario necesita saber — quién ve qué panel, qué hace cada botón, qué modifica y qué no. No encontré texto incorrecto, engañoso o innecesario que debiera eliminarse: el problema de desborde no venía del contenido de los textos sino de tablas y selectores sin el tratamiento responsive correcto (detallado arriba). Si en el celular ves algún texto específico que sientas largo o redundante, dime cuál exactamente y lo ajustamos con precisión — prefiero no recortar contenido útil "a ciegas".

## 3. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar (sin cambios de contenido en esta entrega respecto a la anterior, pero se re-entrega completo por consistencia). |
| `version.js` | Reemplazar — sube el número de versión. |
| `modulo_11_motor_arc.js` | Reemplazar el de la entrega anterior. |
| `motor-arc-v1.css` | Reemplazar el de la entrega anterior. |
| `sistema-v1.js` | Reemplazar — agrega wrapper de scroll a la tabla de administradores. |
| `sistema-v1.css` | Reemplazar — agrega red de seguridad de scroll horizontal. |
| `metas-v1.css` | Reemplazar — corrige el selector de mes. |

No hay cambios en Supabase en esta entrega (el `06_motor_arc.sql` de la entrega anterior sigue siendo el vigente, no se repite aquí).

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza cada uno de los 7 archivos de este paquete con su versión anterior (editar, borrar todo, pegar el nuevo contenido, Commit changes).
3. Espera 1-2 minutos y verifica en tu celular: abre "Sistema" (si eres Super Administrador) y revisa la tabla de administradores con scroll horizontal; abre "Metas y presupuestos" y revisa el selector de mes; abre "Seguimiento diario" y revisa que el aviso "IA próximamente" (si el Motor ARC sigue desactivado) se vea como un chip pequeño, no una tarjeta grande.

## 5. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" en los textos visibles al usuario (pedido explícito de Sergio, guardado para un próximo cambio, no aplicado aquí).
- Conexión real a la API de Claude para el Motor ARC.
- El archivo `topbar-movil-v154.js` referenciado en `index.html` sigue sin existir en el proyecto (reportado en la entrega anterior, no corregido todavía).
