# Mejoras_20260907_2037 — Corrección urgente: el botón "Cargar histórico" no se activaba

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.32 · 2026-09-07**

Corrige el bug que reportaste al probar: escribías REEMPLAZAR y presionabas "Cargar histórico", pero no pasaba nada — ni éxito ni error.

## 1. Qué pasó

Al construir el reemplazo total del Paso 1 en la entrega anterior (V16.31), dejé el botón "Cargar histórico" deshabilitado después de validar el archivo, pero **nunca agregué el código que lo vuelve a habilitar** cuando escribes la palabra REEMPLAZAR correctamente. El botón se veía azul y con apariencia de estar activo, pero seguía bloqueado internamente — por eso el clic no hacía nada. Verifiqué directamente en la base de datos: tu archivo nunca llegó a cargarse, la base seguía en 0 clientes.

## 2. Qué corregí

- El botón "Cargar histórico" ahora se habilita automáticamente en cuanto escribes **REEMPLAZAR** (y se vuelve a bloquear si borras o cambias el texto).
- Mientras procesa, el botón ahora dice "Procesando…" y el mensaje de estado te pide no cerrar ni recargar la pantalla.
- Al terminar, el mensaje de éxito ahora es más visible (con ✔) y te indica explícitamente que continúes con el Paso 2, más abajo en la misma pantalla.
- Si algo falla, el mensaje de error ahora aclara si la base quedó sin modificar o si pudo quedar a medio reemplazar, para que sepas cómo proceder.
- Corregí el mismo problema latente en el Paso 2 (Venta actual) para que no te pase lo mismo ahí, aunque no fue el caso que reportaste.

## 3. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores.
- Confirmé en Supabase que la base sigue en 0 clientes (tu intento anterior no alcanzó a cargar nada, así que no hay nada que limpiar).

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `modulo_18_procedimiento_cargue.js` | Reemplazar — corrige el botón que no se activaba. |
| `version.js` | Reemplazar — sube a V16.32. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 2 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 6. Checklist de prueba

- Ve a Activación primera vez → Paso 1, carga tu archivo de histórico real, valida.
- Escribe REEMPLAZAR en el campo de confirmación: el botón "Cargar histórico" debe pasar de gris/inactivo a activo apenas termines de escribir la palabra correctamente.
- Presiona el botón: debe decir "Procesando…" brevemente y luego mostrar el mensaje verde de éxito con el conteo final.
- Continúa con el Paso 2 (Venta actual) como te indica el mensaje.
