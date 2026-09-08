# Mejoras_20260908_0815 — Login simplificado, splash de bienvenida y sesión persistente

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.41 · 2026-09-08**

Implementa las 5 mejoras de acceso que revisamos con el mockup: login sin selección manual de rol, apariencia premium con logo animado, sesión que se recuerda hasta el día siguiente o una nueva actualización, versión y derechos de autor visibles, y el checkbox de tratamiento de datos personales conservado.

## 1. Qué se hizo

### a) Login simplificado — ya no pregunta "tipo de acceso" ni "asesor"
Antes, la primera vez que alguien entraba con un correo nuevo, tenía que elegir manualmente si era "Asesor" o "Administrador", y si era Asesor, elegir su nombre de una lista. Ahora eso desapareció: el sistema busca automáticamente el correo y el teléfono escritos contra los registros que el administrador ya carga en "Gestión de asesores" (los campos Correo y Teléfono de cada perfil). Si coinciden, entra directo. Si el correo pertenece a la lista de Administradores, sigue funcionando igual que antes (enlace de acceso por correo). Si el correo no está registrado en ningún lado, se muestra un mensaje claro: "Este correo y teléfono no están registrados. Contacta a tu administrador para que te dé de alta en Gestión de asesores" — sin ningún selector de respaldo, tal como lo pediste.

**Importante para que esto funcione con tu equipo de asesores actual**: cada asesor necesita tener su correo y teléfono cargados en su perfil (Gestión de asesores → Editar). Si algún asesor todavía no los tiene, no podrá entrar hasta que tú o un administrador se los agreguen — el resto de su información no se ve afectada.

### b) Apariencia premium con logo animado
Se cambió el fondo blanco genérico por un panel con degradado azul oscuro que hace juego con el fondo del acceso, inputs semitransparentes con acento azul al enfocar, y el logo real de la app (el ícono de radar/lupa con "$" y "B2B") con una animación de pulso suave, tanto en el login como en el nuevo splash de bienvenida.

### c) Splash de bienvenida — solo en teléfono
Al abrir la app desde un celular, aparece por 1.8-2.2 segundos una pantalla de bienvenida con el logo animado, "Radar Comercial B2B" y "Desarrollado por ConAccion BPS para Sergio Velásquez", con puntos de carga animados. En computador no aparece — ahí la carga es casi instantánea y un splash de pantalla completa se sentiría fuera de lugar.

### d) Sesión que se recuerda — hasta el día siguiente o una actualización
Con "Recordar sesión" marcado (como ya venía por defecto), ahora la sesión queda guardada y la persona no tiene que volver a escribir su correo y teléfono cada vez que abre la app — hasta que ocurra una de estas dos cosas: cambia el día calendario (pasa la medianoche) o tú subes una actualización nueva de la app. Cualquiera de las dos cierra la sesión automáticamente y pide iniciar sesión de nuevo, sin que tengas que hacer nada manual.

### e) Versión y derechos de autor visibles
Al pie del formulario de acceso ahora se ve la versión desplegada (ya existía) y se agregó "© 2026 ConAccion BPS. Todos los derechos reservados."

### f) Checkbox de tratamiento de datos personales — conservado
Ya existía una implementación completa y auditable (Ley 1581 de 2012, con registro en Supabase) — se conservó exactamente igual, solo se le dio mejor jerarquía visual dentro del nuevo diseño.

## 2. Qué tienes que hacer ahora

1. Sube estos 4 archivos a GitHub (ver sección 4).
2. Espera el deploy de Netlify y recarga forzada (Cmd+Shift+R).
3. **Revisa que tus asesores activos ya tengan correo y teléfono cargados** en Gestión de asesores — si alguno no los tiene, agrégaselos antes de avisarle que puede entrar con el nuevo login, o quedará bloqueado con el mensaje de "no registrado".
4. Prueba entrar con tu propio correo (Super Administrador) y, si tienes a mano el correo/teléfono de algún asesor de prueba, confirma que entra directo sin preguntas.

## 3. Verificado antes de empaquetar

- Sintaxis validada con `node --check` en `app.js`: sin errores.
- Simulé la carga completa del script en un entorno de pruebas (sin depender de Netlify) y probé 4 escenarios de login: asesor con correo+teléfono correctos (entra), asesor con teléfono incorrecto (rechaza), correo no registrado (rechaza con el mensaje correcto), y Super Administrador (sigue funcionando igual que siempre).
- Probé también la expiración de sesión: se guarda correctamente la fecha y versión, y se invalida tanto al simular un día distinto como una versión distinta.
- Verifiqué que las etiquetas `<div>` en `index.html` (261 aperturas, 261 cierres) y las llaves `{}` en `styles.css` (543 y 543) quedan balanceadas.
- Confirmé que ningún otro archivo (`modulo_10_datos_personales.js`, encargado del checkbox de datos personales) dependía de los campos que se eliminaron del login (`loginRoleSelect`, `loginAdvisorSelect`) — no se rompe nada ahí.

## 4. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 4 archivos: `app.js`, `index.html`, `styles.css`, `version.js`.
3. Espera el deploy de Netlify y confirma "Published".
4. Recarga forzada en tu navegador (Cmd+Shift+R) antes de probar.

## 5. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.41 · 2026-09-08" y "© 2026 ConAccion BPS. Todos los derechos reservados." al pie del login.
- Abre la app desde un celular: debe aparecer el splash de bienvenida por 2 segundos antes del login.
- Escribe tu correo (sergiovelasquez@me.com): debe seguir mostrando el bloque de enlace de acceso de Administrador, sin cambios.
- Escribe el correo y teléfono de un asesor con esos datos ya cargados: debe entrar directo, sin pedir elegir asesor.
- Escribe un correo que no exista en ningún registro: debe mostrar el mensaje de "no registrado, contacta a tu administrador".
- Cierra el navegador y vuelve a abrir la app el mismo día: si marcaste "Recordar sesión", debe entrar directo sin pedir login de nuevo.
