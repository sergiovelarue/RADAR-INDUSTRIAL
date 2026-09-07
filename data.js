// ============================================================
// RADAR COMERCIAL B2B — Estado inicial local (vacío a propósito)
// ------------------------------------------------------------
// Hasta el 2026-09-07 este archivo contenía un dataset completo de
// 566 clientes embebido (legado de la versión V8.3, mayo 2026,
// previo a la migración a Supabase). Esa data quedó "congelada" en
// el deploy en vez de vivir solo en la base de datos real.
//
// Incidente causado por esto (documentado en Mejoras_20260907_1503
// y esta misma entrega): al cargar la app, `app.js` define
// `DATA = window.RADAR_DATA` de forma SÍNCRONA e INMEDIATA — antes
// de que `supabase-sync.js` termine de traer los clientes reales
// (operación asíncrona). En ese instante, otro código de arranque
// de `app.js` (`initV93` → `saveDataV93`) podía disparar una
// sincronización hacia Supabase usando el `DATA` de este archivo
// como si fuera el estado real, subiendo 566 clientes de ejemplo
// hacia la base de datos de producción — incluso después de haberla
// vaciado a propósito para cargar datos reales nuevos.
//
// Corrección de dos capas:
//  1) `supabase-sync.js` ahora tiene una guardia (`clientesListoV94`)
//     que bloquea cualquier sincronización hacia Supabase hasta que
//     la lectura inicial real haya terminado (mismo patrón que ya
//     existía para `configuracion`).
//  2) Este archivo ya NO contiene ningún cliente de ejemplo — solo
//     una estructura vacía, para que aunque algo intente sincronizar
//     antes de tiempo, no haya ningún dato falso que subir.
//
// La app siempre debe operar con los clientes reales que trae
// Supabase (`cargarClientesDesdeSupabaseV94`, en supabase-sync.js).
// ============================================================
window.RADAR_DATA = {"meta": {"version": "V8.3", "currentMonthName": "", "nextMonthName": "", "baseMaestraUpdatedAt": "", "ventasOperativasUpdatedAt": "", "fuentes": {}, "asesores": [], "totalClientes": 0, "resumenTipoCliente": {}, "resumenAsesor": {}, "promedioVenta2025": 0, "growthByClass": {"A": 15, "B": 10, "C": 5, "D": 0}, "latestOperationalMonth2026": null, "availableOperationalMonths2026": []}, "clientes": []};
