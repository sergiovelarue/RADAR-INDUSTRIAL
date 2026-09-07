# Mejoras_20260907_1503 — Correcciones críticas: panel repetido, login OTP, motor simplificado y limpieza de datos

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.30 · 2026-09-07**

Esta entrega corrige los cuatro problemas que reportaste hoy tras probar V16.29.

## 1. El panel "Motor de clasificación" ya no aparece en todas las pestañas

**Causa:** al construir ese panel la entrega anterior, faltó agregarlo a la lista interna que controla qué paneles pertenecen exclusivamente a la pestaña "Sistema". Por eso quedaba visible siempre, en cualquier pestaña, para cualquier Super Administrador.

**Corregido:** ahora vive únicamente dentro de Sistema, igual que el resto de paneles de configuración (crecimiento por clasificación, modelo de cálculo, etc.).

## 2. El login ya detecta tu correo y muestra el enlace de acceso

**Causa:** otro módulo de la app (el que gestiona el checkbox de autorización de datos personales) limpia y reconstruye el campo de correo al cargar la página, por una razón legítima (evitar que el botón de login se disparara dos veces). Ese proceso, sin querer, también borraba la conexión que detecta si tu correo es de Administrador/Super Administrador — por eso el formulario nunca cambiaba, sin importar cuántas veces recargaras.

**Corregido:** ahora esa conexión se reconstruye correctamente después del ajuste del otro módulo. Al escribir `sergiovelasquez@me.com` en el login, debe cambiar automáticamente a "Enviar enlace de acceso".

**Además:** agregué el número de versión (`ConAccion · V16.30 · 2026-09-07`) visible al final de la pantalla de login, para que puedas confirmar de un vistazo qué versión está desplegada sin necesidad de entrar primero.

## 3. Motor de clasificación simplificado — ya no existe la opción 3V

Por tu instrucción, eliminé el modelo "3V (volumen + consecutividad + estado)". Ahora el selector solo ofrece:
- **Simple** (por volumen de venta)
- **2V** (volumen + consecutividad)

Actualicé tanto la pantalla de configuración como el motor de cálculo real en el servidor (Supabase). La configuración actual ya estaba en "2V", así que no hay ningún cambio de comportamiento para ti — solo desaparece la opción 3V del menú.

## 4. Hallazgo crítico: la base de datos tenía el doble de clientes de los reales

Al investigar por qué las cifras de venta, proyección y presupuesto no cuadraban con tu archivo, encontré que la tabla de clientes tenía **1132 registros en vez de 566** — dos lotes completos, creados en momentos distintos, con NITs totalmente diferentes entre sí. Revisé el registro de auditoría de la app y **ninguno de los dos lotes tiene evidencia de haber sido cargado por ti desde un archivo real** — ambos parecen datos de prueba de sesiones de desarrollo anteriores que nunca se limpiaron del todo.

Como me indicaste, no usé ninguno de los dos como base: **respaldé ambos lotes en tablas aparte (por seguridad, nada se perdió) y vacié por completo la tabla de clientes.** Esto significa que ahora mismo la app **no tiene ningún cliente cargado** — es intencional, para que tu próxima carga desde el wizard "Activación primera vez" (Paso 1) sea la única fuente de datos, verificada y trazable.

**Acción que necesitas hacer tú:** volver a cargar tu archivo de histórico real desde **Activación primera vez → Paso 1**, y luego tu archivo de venta actual en el Paso 2.

### Salvaguarda nueva para que esto no se repita

Agregué una alerta en el Paso 1 del wizard: antes de procesar un archivo, ahora ves cuántos clientes tiene la base actualmente y, si el archivo generaría una cantidad sospechosamente alta de clientes "nuevos" (la mitad o más del archivo, sobre una base que ya tiene datos), aparece un aviso en amarillo pidiéndote confirmar que es el archivo correcto antes de continuar.

## 5. Verificado antes de empaquetar

- Sintaxis validada: `node --check` sin errores en los 5 archivos JS modificados.
- HTML con etiquetas balanceadas (59 `<section>`, 244 `<div>`, 44 `<select>` — todas abiertas y cerradas correctamente).
- Confirmé en Supabase que la tabla `clientes` quedó en 0 registros, con los dos lotes anteriores respaldados en `respaldo_lote_no_verificado_20260907` (por si necesitas consultarlos, aunque no se recomienda reutilizarlos).
- Verifiqué el código fuente de las funciones de carga (Paso 1 y Paso 2): no tienen ningún bug de duplicación — el problema fue que se procesaron archivos de prueba distintos contra la base real en sesiones de desarrollo pasadas, no un error del código en sí.

## 6. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — quita la opción 3V del selector, agrega versión visible en login. |
| `app.js` | Reemplazar — agrega versión visible en login. |
| `sistema-v1.js` | Reemplazar — corrige el panel de clasificación repetido en todas las pestañas. |
| `modulo_10_datos_personales.js` | Reemplazar — corrige el login OTP que no detectaba el correo. |
| `modulo_18_procedimiento_cargue.js` | Reemplazar — quita 3V del código del wizard, agrega alerta preventiva de conteo en Paso 1. |
| `styles.css` | Reemplazar — agrega el estilo de la alerta preventiva. |
| `version.js` | Reemplazar — sube a V16.30. |

## 7. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza los 7 archivos.
3. Espera el deploy de Netlify y confirma "Published".
4. **Haz recarga forzada** en tu navegador (Cmd+Shift+R en Mac) antes de probar, para evitar ver una versión en caché.

## 8. Checklist de prueba

- Entra a la app: debe verse "ConAccion · V16.30 · 2026-09-07" al final de la pantalla de login.
- Escribe `sergiovelasquez@me.com` en el correo: debe cambiar automáticamente a "Enviar enlace de acceso" (sin pedir teléfono, porque ya quedó registrado de la prueba anterior).
- Entra como Super Administrador y revisa varias pestañas (Hoja de ruta, Dashboard, Prospección, etc.): el panel "Motor de clasificación" solo debe aparecer en **Sistema**, no en las demás.
- En Sistema → Motor de clasificación: confirma que el selector solo muestra "Simple" y "2V" (sin 3V).
- Ve a **Activación primera vez → Paso 1** y carga tu archivo de histórico real. Debes ver el conteo actual de la base (0) antes de procesar.
- Una vez cargado el histórico, carga tu archivo de venta actual en el Paso 2.
- Revisa que las cifras de Dashboard, Metas y presupuestos, y Hoja de ruta ahora sí correspondan a tu archivo real.

## 9. Pendiente (sin tocar en esta entrega)

- **Revisar y corregir `meta_asesor`** de los clientes reales una vez recargados — el motor de clasificación defectuoso de una sesión anterior había corrompido esos valores en el lote que ya no existe; al recargar desde cero con el archivo real, este problema queda resuelto de raíz (no hay nada que corregir manualmente, porque partimos de datos limpios).
- Confirmar si las tablas de respaldo (`respaldo_lote_no_verificado_20260907`, `respaldo_lote_duplicado_20260904_1439`, `respaldo_residuos_demo_20260904`) se pueden eliminar definitivamente o se guardan por más tiempo.
- Confirmar si las funciones de prueba `exportar-ventas-csv-temp` y `diagnostico-drive-temp` en Supabase se pueden eliminar.
- Integración con cuenta de servicio de Google (archivos privados) — pendiente para producción real con clientes.
- Login de Asesor — sigue pendiente su rediseño (decisión tuya de dejarlo para otra sesión).
- Renombrar "Super Administrador" a "Administrador" — NO aplicar hasta nueva instrucción explícita (tarea #50).
