# Mejoras_20260904_1900 — Fix: Paso 2 (venta actual) no cargaba nada

Radar Comercial B2B (RADAR-INDUSTRIAL) · Versión app: **V16.26 · 2026-09-04**

Corrige el bug reportado: el paso 2 del wizard validaba el archivo sin error, pero al procesar no cargaba nada y el semáforo se quedaba en rojo.

## 1. Causa raíz

El paso 2 reutiliza la Edge Function `cargar-historico-ventas` (ya existente desde V16.21), que espera cada fila con la forma `{nit, meses: {Enero: ..., Febrero: ...}}`. El wizard nuevo, en cambio, arma las filas en formato plano `{NIT, Enero, Febrero, ...}` — el formato correcto para el paso 1, pero distinto al que espera esa función específica. Al enviar el formato equivocado, la función leía `nit` como vacío en las 608 filas, así que el conteo de coincidencias quedaba en cero sin lanzar ningún error — por eso la validación "parecía" completarse pero no cargaba nada.

## 2. Qué se corrigió

- `modulo_18_procedimiento_cargue.js`: se agregó una función de conversión (`wizAFormatoHistoricoVentasV1625`) que transforma las filas al formato exacto que espera `cargar-historico-ventas` justo antes de enviarlas, tanto en validar como en procesar. El paso 1 no se tocó — su formato ya era correcto.

## 3. Verificado en vivo antes de empaquetar

- Probé directamente contra la base real con un NIT existente: antes de la corrección, un archivo de 608 filas daba `totalNitsArchivo: 0`; después de la corrección, una prueba puntual con un NIT real dio `totalNitsArchivo: 1, coincidentes: 1` — el conteo ya refleja las coincidencias reales.
- Sintaxis validada: `node --check modulo_18_procedimiento_cargue.js` sin errores.

## 4. Archivos de este paquete

Solo dos archivos — no hace falta volver a subir `index.html` ni `styles.css`, no cambiaron.

| Archivo | Acción |
|---|---|
| `modulo_18_procedimiento_cargue.js` | Reemplazar. |
| `version.js` | Reemplazar — sube a V16.26. |

## 5. Pasos para subir a GitHub

1. Repositorio **RADAR-INDUSTRIAL**, rama `main`.
2. Reemplaza `modulo_18_procedimiento_cargue.js` y `version.js`.
3. Espera el deploy de Netlify y confirma "Published".

## 6. Checklist de prueba

- Con el histórico del paso 1 ya cargado (confirmaste que quedó en verde con 566 clientes), ve al paso 2, sube el archivo de venta actual, valida — ahora debe mostrar coincidencias reales (no cero).
- Procesa la carga y confirma que el semáforo del paso 2 pasa a verde con el nombre del archivo.
