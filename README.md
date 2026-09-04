# Mejoras_20260904_2245 — Login OTP para Administrador / Super Administrador

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.29 · 2026-09-04**

Este paquete **consolida** la entrega anterior pendiente (V16.28, motor de clasificación) **más** el rediseño del ingreso a la app para Administrador y Super Administrador. Sigue sin subirse el paquete de clasificación por separado — todo queda en una sola entrega, como pediste.

## 1. Qué cambia en el ingreso a la app

Antes, Administrador y Super Administrador entraban por el mismo formulario que un Asesor: correo + teléfono, sin ninguna verificación real (cualquiera podía escribir el correo de otra persona). Ahora:

- **Asesor**: sigue exactamente igual — correo + teléfono, sin ningún cambio de comportamiento.
- **Administrador / Super Administrador**: al escribir el correo, si está en la lista blanca autorizada (por ahora, solo `sergiovelasquez@me.com`), la pantalla cambia automáticamente y pide enviar un **enlace de acceso de un solo uso** al correo (magic link). No hay contraseña que recordar ni que se pueda filtrar — cada enlace sirve una sola vez y expira.
  - La primera vez, además del correo, se pide el teléfono una única vez (para el registro de acceso interno). Las siguientes veces ya no se vuelve a pedir.
  - Al hacer clic en el enlace del correo, la app reconoce automáticamente la sesión y entra directo — sin necesidad de digitar nada más.

## 2. Por qué este cambio

Nos basamos en que confirmaste que Resend + SMTP ya entrega correo correctamente en Supabase (lo probamos juntos con un envío real). Elegiste el enlace mágico (un clic) sobre el código de 6 dígitos, por simplicidad para el usuario.

## 3. Qué NO cambia

- El login de Asesor sigue siendo el mismo formulario de siempre — no toqué esa lógica.
- No se modificó `resolveUserV93` (la función que resuelve el rol de un Asesor o Administrador del esquema anterior). El nuevo flujo OTP es independiente y convive con él.
- El motor de clasificación (A/B/C/D) del paquete anterior sigue exactamente igual a como se entregó, solo consolidado en este mismo zip.

## 4. Cómo agregar más Administradores en el futuro

En `app.js`, busca la constante `ADMIN_WHITELIST_V1` (cerca de la línea 520) y agrega el correo nuevo en minúsculas:

```js
const ADMIN_WHITELIST_V1 = [
  "sergiovelasquez@me.com",
  "nuevo.administrador@tudominio.com"
];
```

Solo `sergiovelasquez@me.com` queda fijo como Super Administrador; cualquier otro correo de esta lista entra como Administrador normal.

## 5. Nuevo en Supabase

Se creó la tabla `admins_v1` (email, teléfono, fechas) — guarda únicamente el teléfono de Administrador/Super Administrador para el registro de acceso interno. No guarda contraseñas ni tokens de sesión; la autenticación real la maneja Supabase Auth con el magic link.

## 6. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores en `app.js`.
- HTML con etiquetas balanceadas (59 `<section>`, 244 `<div>` — abiertas y cerradas correctamente).
- Probé el envío real de un magic link contra tu correo — llegó correctamente y el log del servidor confirmó `status 200` sin errores.
- Verifiqué que el flujo de Asesor no cambió: mismo formulario, mismos campos, mismo comportamiento.

## 7. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `app.js` | Reemplazar — agrega el módulo de login OTP + incluye las correcciones del motor de clasificación (V16.28). |
| `index.html` | Reemplazar — nueva pantalla de login con detección automática de correo + panel del motor de clasificación (V16.28). |
| `mejoras-v1.js` | Reemplazar — sin cambios nuevos hoy, incluido tal cual venía de V16.28 (Acciones Recomendadas A/B/C/D). |
| `modulo_18_procedimiento_cargue.js` | Reemplazar — sin cambios nuevos hoy, incluido tal cual venía de V16.28 (Paso 3 del wizard). |
| `styles.css` | Reemplazar — agrega el estilo del aviso "enlace enviado" en el login. |
| `version.js` | Reemplazar — sube a V16.29. |

## 8. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 6 archivos.
3. Espera el deploy de Netlify y confirma "Published".

## 9. Checklist de prueba

- **Como Asesor**: entra con tu correo de asesor + teléfono de siempre — debe funcionar exactamente igual que antes.
- **Como Super Administrador**: escribe `sergiovelasquez@me.com` en el campo de correo — la pantalla debe cambiar automáticamente mostrando "Enviar enlace de acceso" (y, si es la primera vez desde este cambio, pedirá tu teléfono antes).
  - **Importante**: ya registré un teléfono de prueba (`3000000000`) para tu correo en la tabla `admins_v1`, para probar el flujo de "ya registrado" sin pedirte el teléfono de nuevo. Si quieres que quede tu teléfono real, dímelo y lo actualizo, o simplemente ingresa una vez más desde la tabla de Supabase.
  - Presiona "Enviar enlace de acceso", revisa tu correo (puede tardar 1-2 minutos, revisa spam) y haz clic en el enlace.
  - Debes entrar automáticamente a la app, ya identificado como Super Administrador (revisa la etiqueta de sesión en la barra superior).
- Prueba cerrar sesión y volver a entrar por el mismo método para confirmar que es repetible.

## 10. Pendiente (sin tocar en esta entrega)

- **Login de Asesor**: decidiste dejar su rediseño para otra sesión — hoy sigue exactamente igual (correo+teléfono sin verificación real).
- **Revisar y corregir `meta_asesor`** de los 566 clientes afectados por la versión defectuosa del motor de clasificación — pendiente de que lo hagamos juntos.
- Confirmar si los 608 registros de demo respaldados (`respaldo_residuos_demo_20260904`) se pueden eliminar definitivamente o se guardan por más tiempo.
- Confirmar si las funciones de prueba `exportar-ventas-csv-temp` y `diagnostico-drive-temp` en Supabase se pueden eliminar.
- Integración con cuenta de servicio de Google (archivos privados) — pendiente para producción real con clientes.
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
