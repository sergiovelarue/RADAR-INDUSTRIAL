// ============================================================
// RADAR COMERCIAL B2B — Conexión a Supabase (Fase 1)
// ------------------------------------------------------------
// Este archivo se carga DESPUÉS de app.js y NO modifica ese
// archivo. Sigue exactamente el mismo estilo que ya usa el
// proyecto (V81, V86, V93...): toma una función existente,
// guarda una referencia a la versión anterior, y la reemplaza
// por una nueva que hace lo mismo Y ADEMÁS sincroniza con
// Supabase. Si algo sale mal aquí, la app sigue funcionando
// igual que antes (con el respaldo local del navegador).
//
// FASE 1 — Lo que SÍ queda conectado a Supabase:
//   - Carga de clientes al abrir la app (todos ven lo mismo)
//   - Guardado del seguimiento comercial diario (modal cliente)
//   - Edición de datos maestros (nombre, ciudad, canal, etc.)
//   - Reasignación de asesor, bloqueo, VIP, cargas masivas
//     (todo lo que ya pasaba por saveDataV93)
//   - Historial de cambios (auditoría compartida)
//
// FASE 1.5 — Configuración compartida (agregado tras detectar
// que se perdía al recargar la app):
//   - Canales y zonas (crear, renombrar, eliminar)
//   - Perfiles de asesor (correo, teléfono, municipio, canal, zona)
//   - Metas de crecimiento por clasificación
//
// FASE 2 — Pendiente (sigue funcionando solo en este navegador):
//   - Metas SOP por asesor
//   - Registro de acceso / sesión de usuarios
// ============================================================

const SUPABASE_URL_V94 = "https://ljztqfzykvuvopgqgxxf.supabase.co";
const SUPABASE_ANON_KEY_V94 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqenRxZnp5a3Z1dm9wZ3FneHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDkwMTAsImV4cCI6MjEwMDI4NTAxMH0.THnp5ZOdSMO1qN2qfvWzpScDTpr6Mg7jjHGISOdZXbU";
const supabaseClientV94 = window.supabase.createClient(SUPABASE_URL_V94, SUPABASE_ANON_KEY_V94);

let ASESOR_ID_MAP_V94 = {};   // "CRISTIAN LONDOÑO" -> uuid
let ASESOR_NAME_MAP_V94 = {}; // uuid -> "CRISTIAN LONDOÑO"

// Campos que viven como columnas propias en Supabase.
// Todo lo demás (ventas mes a mes, promedios, consecutividad...)
// se guarda completo dentro de la columna datos_venta (JSON).
const CAMPOS_PRINCIPALES_V94 = new Set([
  'nit', 'cliente', 'asesorAsignado', 'ciudad', 'departamento', 'canal', 'lineaBase',
  'tipoCliente', 'clasificacion', 'estado', 'metaSugerida', 'metaAsesor',
  'total2025', 'total2026', 'proximaAccion', 'comentario', 'fechaSeguimiento'
]);

async function cargarAsesoresV94() {
  const { data, error } = await supabaseClientV94.from('asesores').select('id, nombre');
  if (error) { console.error('[Radar-Supabase] Error cargando asesores:', error); return; }
  ASESOR_ID_MAP_V94 = {};
  ASESOR_NAME_MAP_V94 = {};
  (data || []).forEach(a => {
    ASESOR_ID_MAP_V94[a.nombre] = a.id;
    ASESOR_NAME_MAP_V94[a.id] = a.nombre;
  });
}

// Convierte una fila de Supabase de vuelta a la forma exacta de
// "cliente" que usa el resto de app.js (mismos nombres de campo
// que tenía data.js), para no tener que tocar ninguna otra función.
function filaSupabaseAClienteV94(row) {
  return {
    nit: row.nit,
    cliente: row.cliente,
    asesorAsignado: row.asesor_id ? (ASESOR_NAME_MAP_V94[row.asesor_id] || "SIN ASIGNACION") : "SIN ASIGNACION",
    ciudad: row.ciudad || "",
    departamento: row.departamento || "",
    canal: row.canal || "",
    lineaBase: row.linea_base || "",
    tipoCliente: row.tipo_cliente || "",
    clasificacion: row.clasificacion || "",
    estado: row.estado || "",
    metaSugerida: Number(row.meta_sugerida || 0),
    metaAsesor: Number(row.meta_asesor || 0),
    total2025: Number(row.total_2025 || 0),
    total2026: Number(row.total_2026 || 0),
    proximaAccion: row.proxima_accion || "",
    comentario: row.comentario || "",
    fechaSeguimiento: row.fecha_seguimiento || "",
    ...(row.datos_venta || {})
  };
}

// Convierte un "cliente" interno de vuelta a fila de Supabase.
function clienteAFilaSupabaseV94(c) {
  const detalle = {};
  Object.keys(c).forEach(k => {
    if (!CAMPOS_PRINCIPALES_V94.has(k)) detalle[k] = c[k];
  });
  const asesor = c.asesorAsignado;
  return {
    nit: c.nit,
    cliente: c.cliente || null,
    asesor_id: (asesor && asesor !== 'SIN ASIGNACION') ? (ASESOR_ID_MAP_V94[asesor] || null) : null,
    ciudad: c.ciudad || null,
    departamento: c.departamento || null,
    canal: c.canal || null,
    linea_base: c.lineaBase || null,
    tipo_cliente: c.tipoCliente || null,
    clasificacion: c.clasificacion || null,
    estado: c.estado || null,
    meta_sugerida: Number(c.metaSugerida || 0),
    meta_asesor: Number(c.metaAsesor || 0),
    total_2025: Number(c.total2025 || 0),
    total_2026: Number(c.total2026 || 0),
    proxima_accion: c.proximaAccion || null,
    comentario: c.comentario || null,
    fecha_seguimiento: c.fechaSeguimiento || null,
    datos_venta: detalle,
    actualizado_en: new Date().toISOString()
  };
}

// ------------------------------------------------------------
// CARGA: trae los clientes reales desde Supabase
// ------------------------------------------------------------
async function cargarClientesDesdeSupabaseV94() {
  try {
    await cargarAsesoresV94();
    const { data, error } = await supabaseClientV94
      .from('clientes')
      .select('*')
      .range(0, 4999); // suficiente para varios miles de clientes

    if (error) {
      console.error('[Radar-Supabase] Error cargando clientes:', error);
      return false;
    }
    if (!data || data.length === 0) {
      console.warn('[Radar-Supabase] Supabase no devolvió clientes todavía.');
      return false;
    }
    DATA.clientes = data.map(filaSupabaseAClienteV94);
    DATA.meta.totalClientes = DATA.clientes.length;
    return true;
  } catch (e) {
    console.error('[Radar-Supabase] Fallo de conexión:', e);
    return false;
  }
}

// ------------------------------------------------------------
// GUARDADO: sube todos los clientes a Supabase
// (agrupa varias ediciones seguidas en una sola sincronización)
// ------------------------------------------------------------
let syncEnCursoV94 = false;
let syncPendienteV94 = false;

async function sincronizarTodosLosClientesV94() {
  if (syncEnCursoV94) { syncPendienteV94 = true; return; }
  syncEnCursoV94 = true;
  try {
    const filas = DATA.clientes.map(clienteAFilaSupabaseV94);
    const { error } = await supabaseClientV94.from('clientes').upsert(filas, { onConflict: 'nit' });
    if (error) {
      console.error('[Radar-Supabase] Error guardando clientes:', error);
      alert('Los cambios quedaron guardados en este equipo, pero no se pudieron enviar a Supabase. Revisa tu conexión a internet e inténtalo de nuevo.');
    }
  } catch (e) {
    console.error('[Radar-Supabase] Fallo de conexión al guardar:', e);
  } finally {
    syncEnCursoV94 = false;
    if (syncPendienteV94) { syncPendienteV94 = false; sincronizarTodosLosClientesV94(); }
  }
}

// ------------------------------------------------------------
// ENGANCHES: ampliamos las funciones existentes sin borrarlas
// ------------------------------------------------------------

// saveDataV93 es el punto central que ya usan reasignación de
// asesor, bloqueo, VIP y cargas masivas de clientes.
const _saveDataV93OriginalV94 = saveDataV93;
saveDataV93 = function () {
  _saveDataV93OriginalV94();
  sincronizarTodosLosClientesV94();
};

// El guardado del modal de seguimiento diario no pasa por
// saveDataV93, así que lo enganchamos aparte.
const _saveClientDetailOriginalV94 = saveClientDetailV81;
saveClientDetailV81 = function () {
  _saveClientDetailOriginalV94();
  sincronizarTodosLosClientesV94();
};

// Config de metas de crecimiento (recalcula metaSugerida de
// todos los clientes) — también debe reflejarse para todos.
const _applyGrowthConfigOriginalV94 = applyGrowthConfigV82;
applyGrowthConfigV82 = function () {
  _applyGrowthConfigOriginalV94();
  sincronizarTodosLosClientesV94();
};

// Carga mensual de ventas por Excel (Espumas/Colchones).
const _applyDailyFilesOriginalV94 = applyDailyFiles;
applyDailyFiles = async function () {
  await _applyDailyFilesOriginalV94();
  sincronizarTodosLosClientesV94();
};

// Historial de cambios compartido entre todos los usuarios.
const _logMasterChangeOriginalV94 = logMasterChangeV86;
logMasterChangeV86 = function (nit, cliente, field, oldValue, newValue) {
  _logMasterChangeOriginalV94(nit, cliente, field, oldValue, newValue);
  if (String(oldValue ?? "") === String(newValue ?? "")) return;
  supabaseClientV94.from('historial_cambios').insert({
    cliente_nit: nit,
    cliente_nombre: cliente,
    campo: field,
    valor_anterior: String(oldValue ?? ""),
    valor_nuevo: String(newValue ?? ""),
    usuario_email: (typeof currentUserLabelV86 === "function") ? currentUserLabelV86() : "usuario"
  }).then(({ error }) => {
    if (error) console.error('[Radar-Supabase] Error guardando historial:', error);
  });
};

// Ya no usamos el respaldo del navegador como fuente de datos:
// la fuente de verdad ahora es Supabase.
restoreLocal = function () {};

// ============================================================
// FASE 1.5 — Configuración compartida (canales/zonas, perfiles
// de asesor, metas de crecimiento). Antes solo vivía en el
// navegador y se perdía al recargar o actualizar la app. Ahora
// se guarda en la tabla "configuracion" de Supabase (clave/valor).
// ============================================================

async function cargarConfiguracionDesdeSupabaseV97() {
  try {
    const { data, error } = await supabaseClientV94.from('configuracion').select('clave, valor');
    if (error) { console.error('[Radar-Supabase] Error cargando configuración:', error); return false; }
    if (!data || data.length === 0) return false; // primera vez: no hay nada guardado todavía
    const porClave = {};
    data.forEach(row => { porClave[row.clave] = row.valor; });
    if (porClave.canales) DATA.meta.canales = porClave.canales;
    if (porClave.asesorPerfiles) DATA.meta.asesorPerfiles = porClave.asesorPerfiles;
    if (porClave.growthByClass) DATA.meta.growthByClass = porClave.growthByClass;
    return true;
  } catch (e) {
    console.error('[Radar-Supabase] Fallo de conexión al cargar configuración:', e);
    return false;
  }
}

let syncConfigEnCursoV97 = false;
let syncConfigPendienteV97 = false;

async function sincronizarConfiguracionV97() {
  if (syncConfigEnCursoV97) { syncConfigPendienteV97 = true; return; }
  syncConfigEnCursoV97 = true;
  try {
    const filas = [
      { clave: 'canales', valor: DATA.meta.canales || {} },
      { clave: 'asesorPerfiles', valor: DATA.meta.asesorPerfiles || {} },
      { clave: 'growthByClass', valor: DATA.meta.growthByClass || {} }
    ];
    const { error } = await supabaseClientV94.from('configuracion').upsert(filas, { onConflict: 'clave' });
    if (error) console.error('[Radar-Supabase] Error guardando configuración:', error);
  } catch (e) {
    console.error('[Radar-Supabase] Fallo de conexión al guardar configuración:', e);
  } finally {
    syncConfigEnCursoV97 = false;
    if (syncConfigPendienteV97) { syncConfigPendienteV97 = false; sincronizarConfiguracionV97(); }
  }
}

// saveDataV93 también es el punto central de canales/zonas y de
// edición de asesores (Gestión de Asesores), así que ampliamos
// el mismo enganche para que también sincronice esta configuración.
const _saveDataV93OriginalV97 = saveDataV93;
saveDataV93 = function () {
  _saveDataV93OriginalV97();
  sincronizarConfiguracionV97();
};

// ------------------------------------------------------------
// ARRANQUE: la app ya pintó la pantalla con data.js (rápido,
// sin esperar), y aquí la actualizamos con los datos reales y
// compartidos de Supabase apenas responden.
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const [okClientes, okConfig] = await Promise.all([
    cargarClientesDesdeSupabaseV94(),
    cargarConfiguracionDesdeSupabaseV97()
  ]);
  if (typeof ensureAsesorPerfilesV93 === "function") ensureAsesorPerfilesV93();
  if (typeof ensureCanalCatalogV94 === "function") ensureCanalCatalogV94();
  if (okClientes || okConfig) {
    fillAdvisorFilter();
    render();
    console.log('[Radar-Supabase] Datos actualizados desde Supabase:', DATA.clientes.length, 'clientes. Config compartida:', okConfig ? 'sí' : 'usando valores por defecto (primera vez)');
  } else {
    console.warn('[Radar-Supabase] Mostrando datos locales de respaldo (no se pudo conectar a Supabase).');
  }
});
