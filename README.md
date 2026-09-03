# Mejoras_20260903_2300 — Conexión remota (ERP) para Actualización diaria de ventas

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.20 · 2026-09-03**

Nueva funcionalidad: el panel "Actualización diaria de ventas" (pestaña Ajustes) ahora soporta, además de la carga manual de archivo (que se preserva 100% intacta), una actualización automática desde un archivo remoto tipo ERP (Siesa, Odoo, Siigo, Alegra, u otro link genérico). Hoy se prueba con un Google Sheet; el diseño queda listo para apuntar a cualquier archivo estático en URL fija que un cliente configure más adelante.

## 1. Cómo funciona (según el mockup que aprobaste)

- **Super Administrador** (bloque "Conexión remota (ERP)", solo visible para ese rol): configura sistema de origen, URL del archivo remoto, hora programada de sincronización diaria, y un interruptor para habilitar/deshabilitar la conexión.
- **Administrador**: ve un selector "Manual / Por link de conexión". Si Super Administrador no ha habilitado la conexión, solo ve la opción Manual (igual que hoy). Si está habilitada, puede elegir "Por link de conexión" y ver el estado de la fuente (activa/con errores, última sincronización) y un botón "Actualizar ahora desde ERP".
- El **flujo manual actual no cambia en nada**: mismo input de archivo, mismos botones Validar/Procesar/Limpiar.

## 2. Qué se construyó del lado del servidor (Supabase, proyecto RADAR-INDUSTRIAL)

- Tabla `config_conexion_erp`: guarda la configuración (habilitado, sistema, URL, hora programada, estado de la última corrida). RLS cerrado — solo accesible vía funciones `SECURITY DEFINER`, mismo criterio que el resto de tablas sensibles del proyecto (historial_cambios, ajustes_meta_asesor).
- Funciones RPC: `leer_config_conexion_erp_v1`, `guardar_config_conexion_erp_v1`, `disparar_sincronizacion_erp_manual_v1`.
- Edge Function `sincronizar-ventas-erp`: descarga el archivo remoto (CSV, o Google Sheet convertido automáticamente a su link de exportación CSV), lo interpreta con el mismo formato que hoy usa el archivo Excel manual (NIT + columnas de mes), y actualiza la tabla `clientes` — igual que hace hoy `applyDailyFiles` en el navegador.
- Cron job (`pg_cron` + `pg_net`, cada 15 minutos revisa si ya es la hora programada y, si la conexión está habilitada, dispara la sincronización): queda instalado y activo.

### Alerta de seguridad — acción tuya pendiente antes de que el cron/botón funcionen

La Edge Function está protegida con un secreto compartido (nunca vive en el navegador ni en este código). **Debes configurarlo manualmente en el dashboard de Supabase, en dos lugares, con el mismo valor exacto:**

```
a6bf55ed81d991bab8a16f39f3e51997eb3776d8bcefc0d5
```

1. **Supabase → Edge Functions → sincronizar-ventas-erp → Secrets**: agrega `RADAR_CRON_SECRET` = el valor de arriba.
2. **Supabase → SQL Editor**, ejecuta una sola vez:
   ```sql
   ALTER DATABASE postgres SET app.settings.radar_cron_secret = 'a6bf55ed81d991bab8a16f39f3e51997eb3776d8bcefc0d5';
   ```

Sin este paso, tanto el botón "Actualizar ahora" como el cron diario fallarán con error de autorización — es la protección esperada, no un bug.

## 3. Sobre el "simulador de ventas"

Revisé el código de la app: el simulador NO es una función activa dentro de `app.js`/`mejoras-v1.js` — son archivos Excel que yo generé en una sesión anterior para que subieras manualmente cada semana al panel de pruebas. No hay nada que "desaparecer" en el código de producción.

Según tu instrucción, tú vas a mantener por tu cuenta, en otro proyecto, un Google Sheet con las ventas simuladas actualizándose. **Aquí solo falta que me compartas el link de ese Sheet** para:
1. Configurarlo como prueba en el bloque Super Administrador.
2. Verificar en vivo que el botón "Actualizar ahora" y el cron diario leen y aplican los datos correctamente.
3. Asegurarme de que el Sheet tenga acceso de lectura público ("Cualquiera con el enlace puede ver") — si es privado, la Edge Function no podrá descargarlo.

## 4. Archivos de este paquete

| Archivo | Acción |
|---|---|
| `index.html` | Reemplazar — agrega el bloque "Conexión remota (ERP)" y el selector Manual/Link dentro de `dailyUpdatePanel`, y el script `modulo_15_conexion_erp.js`. |
| `styles.css` | Reemplazar — estilos del nuevo bloque, siguiendo el mismo sistema visual de la app. |
| `modulo_15_conexion_erp.js` | Nuevo — toda la lógica del nuevo panel (wrapper, no toca app.js). |
| `version.js` | Reemplazar — sube a V16.20. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `index.html`, `styles.css`, `version.js`.
3. Sube `modulo_15_conexion_erp.js` como archivo NUEVO.
4. Antes de probar, completa la sección 2 (secreto en Supabase) — si no, el botón "Actualizar ahora" mostrará error, lo cual es esperado hasta ese paso.
5. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- **Sesión Super Administrador → Ajustes**: ver el bloque "Conexión remota (ERP)", guardar una URL de prueba, confirmar que el checkbox y los campos persisten al recargar.
- **Sesión Administrador → Ajustes**: con la conexión deshabilitada, solo debe verse "Manual". Al habilitarla desde Super Administrador, debe aparecer "Por link de conexión" como opción.
- **Botón "Actualizar ahora desde ERP"**: solo tras completar el paso del secreto (sección 2) y con un Sheet real configurado (sección 3).
- **Flujo manual**: confirmar que sigue funcionando exactamente igual que antes (Validar archivos / Procesar actualización / Limpiar actualización local).

## 7. Verificado antes de empaquetar

- Sintaxis validada: `node --check modulo_15_conexion_erp.js` sin errores; `styles.css` con llaves balanceadas (413/413); `index.html` sin tags huérfanos ni IDs duplicados.
- Probado en vivo contra la base de datos real de Supabase (lectura y escritura de configuración vía RPC desde el navegador): funciona correctamente extremo a extremo.
- Render visual verificado en la app en producción (inyección en vivo): coincide con el mockup aprobado, en los estados "deshabilitado" y "habilitado + modo link".
- El disparo real de sincronización (descarga del Sheet + actualización de clientes) NO se pudo probar todavía — depende de que completes el paso del secreto y me compartas el link del Sheet.
- Los datos de prueba que usé durante la verificación (URL ficticia, habilitado=true) ya fueron limpiados de la base de datos real.

## 8. Pendiente (sin tocar en esta entrega)

- Renombrar "Super Administrador" a "Administrador" sigue pendiente — NO aplicar hasta nueva instrucción explícita (tarea #50).
- Link del Google Sheet real de pruebas — pendiente de que lo compartas.
- Configuración del secreto `RADAR_CRON_SECRET` en Supabase — pendiente de que la realices (sección 2).
