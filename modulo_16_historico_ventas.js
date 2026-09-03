// ============================================================
// V16.21 — Carga de histórico de ventas (año anterior)
// ------------------------------------------------------------
// Capa aditiva dentro de masterDataAdminPanel (ver index.html):
// no toca app.js. Permite a Super Administrador cargar el
// histórico de un año anterior (base comparativa para
// Cumplimiento, Alarmas y Proyección) desde un archivo Excel/CSV
// con NIT + ventas mes a mes, sin crear clientes nuevos — solo
// actualiza los NIT que ya existen en la tabla clientes.
//
// Backend: Edge Function cargar-historico-ventas + función RPC
// procesar_historico_ventas_v1 (proyecto Supabase RADAR-INDUSTRIAL),
// mismo patrón de secreto server-side que modulo_15_conexion_erp.js
// (el navegador nunca ve el secreto).
//
// Formato esperado del archivo: primera columna NIT (o que
// contenga "nit" en el encabezado), columnas siguientes con
// nombres de mes (Enero..Diciembre) — incluso si hay columnas
// adicionales (Cliente, Asesor, Ciudad...), se ignoran salvo NIT
// y los 12 meses.
// ============================================================

const HIST_MESES_V1621 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function $h16(id) { return document.getElementById(id); }

let histFilasParsedV1621 = null;
let histUltimaValidacionV1621 = null;

function histEsSuperAdminV1621() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}

function histLimpiarNitV1621(v) {
  return String(v ?? "").replace(/\s+/g, "").trim();
}

function histToNumberV1621(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).replace(/\$/g, "").replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function histPintarVisibilidadV1621() {
  const panel = $h16("histPanelV1621");
  if (!panel) return;
  panel.style.display = histEsSuperAdminV1621() ? "block" : "none";
}

async function histLeerArchivoV1621() {
  const input = $h16("histArchivoV1621");
  if (!input || !input.files.length) return { rows: [], fileName: "No cargado" };
  const file = input.files[0];
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sh = wb.Sheets[wb.SheetNames[0]];
  return { rows: XLSX.utils.sheet_to_json(sh, { defval: 0 }), fileName: file.name };
}

function histParsearFilasV1621(rows) {
  return rows.map(row => {
    const keys = Object.keys(row);
    const nitKey = keys.find(k => {
      const x = String(k).toLowerCase().trim();
      return x === "nit" || x.includes("nit");
    }) || keys[0];
    const nit = histLimpiarNitV1621(row[nitKey]);
    const meses = {};
    HIST_MESES_V1621.forEach(m => {
      const key = keys.find(k => String(k).trim().toLowerCase() === m.toLowerCase());
      meses[m] = key ? histToNumberV1621(row[key]) : 0;
    });
    return { nit, meses };
  }).filter(f => f.nit && f.nit.toLowerCase() !== "total");
}

function histSetEstadoV1621(clase, html) {
  const el = $h16("histEstadoV1621");
  if (!el) return;
  el.className = "hist-estado-v1621" + (clase ? " " + clase : "");
  el.innerHTML = html;
}

function histEsperarMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function histEsperarResultadoV1621(maxIntentos = 60, esperaMs = 1000) {
  for (let i = 0; i < maxIntentos; i++) {
    await histEsperarMs(esperaMs);
    const { data, error } = await supabaseClientV94.rpc("leer_ultimo_resultado_historico_v1");
    if (error) throw error;
    if (data) return data;
  }
  throw new Error("La operación sigue en curso del lado del servidor (puede tardar más con archivos grandes). Espera un momento y vuelve a intentar validar/procesar.");
}

async function histValidarV1621() {
  const anio = $h16("histAnioV1621").value;
  histSetEstadoV1621("", "<strong>Estado:</strong> leyendo archivo…");
  $h16("histProcesarBtnV1621").disabled = true;
  $h16("histResultadoV1621").style.display = "none";

  try {
    const { rows, fileName } = await histLeerArchivoV1621();
    if (!rows.length) {
      histSetEstadoV1621("hist-estado-error-v1621", "<strong>Error:</strong> el archivo no tiene filas de datos.");
      return;
    }
    const filas = histParsearFilasV1621(rows);
    histFilasParsedV1621 = { anio, filas, fileName };

    histSetEstadoV1621("", "<strong>Estado:</strong> validando contra la base de clientes…");
    const { error: errorDisparo } = await supabaseClientV94.rpc("disparar_historico_ventas_v1", {
      p_anio: anio, p_modo: "validar", p_filas: filas
    });
    if (errorDisparo) throw errorDisparo;

    const data = await histEsperarResultadoV1621();
    if (!data || data.ok === false) {
      histSetEstadoV1621("hist-estado-error-v1621", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo validar."));
      return;
    }

    histUltimaValidacionV1621 = data;
    $h16("histStatFilasV1621").textContent = data.totalFilas;
    $h16("histStatOkV1621").textContent = data.coincidentes;
    $h16("histStatErrorV1621").textContent = data.noCoincidentes;
    $h16("histResultadoV1621").style.display = "block";

    const btnDescargar = $h16("histDescargarNoCoincidentesBtnV1621");
    if (data.noCoincidentes > 0) {
      btnDescargar.style.display = "inline-block";
    } else {
      btnDescargar.style.display = "none";
    }

    $h16("histProcesarBtnV1621").disabled = data.coincidentes === 0;
    histSetEstadoV1621("hist-estado-ok-v1621", `<strong>Validación correcta:</strong> ${data.coincidentes} de ${data.totalNitsArchivo} NIT coinciden con clientes existentes. Archivo: ${fileName}.`);
  } catch (e) {
    console.error("[Radar-Historico] Error validando:", e);
    histSetEstadoV1621("hist-estado-error-v1621", "<strong>Error:</strong> " + (e.message || "no se pudo validar el archivo."));
  }
}

async function histProcesarV1621() {
  if (!histFilasParsedV1621) return;
  const confirmado = confirm("Esta acción reemplazará el histórico " + histFilasParsedV1621.anio + " de los clientes coincidentes. ¿Continuar?");
  if (!confirmado) return;

  const btn = $h16("histProcesarBtnV1621");
  btn.disabled = true;
  histSetEstadoV1621("", "<strong>Estado:</strong> procesando carga…");

  try {
    const { error: errorDisparo } = await supabaseClientV94.rpc("disparar_historico_ventas_v1", {
      p_anio: histFilasParsedV1621.anio, p_modo: "procesar", p_filas: histFilasParsedV1621.filas
    });
    if (errorDisparo) throw errorDisparo;

    const data = await histEsperarResultadoV1621();
    if (!data || data.ok === false) {
      histSetEstadoV1621("hist-estado-error-v1621", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo procesar."));
      btn.disabled = false;
      return;
    }
    histSetEstadoV1621("hist-estado-ok-v1621", "<strong>Carga aplicada:</strong> " + data.mensaje);
    if (typeof cargarClientesDesdeSupabaseV94 === "function") await cargarClientesDesdeSupabaseV94();
    if (typeof render === "function") render();
  } catch (e) {
    console.error("[Radar-Historico] Error procesando:", e);
    histSetEstadoV1621("hist-estado-error-v1621", "<strong>Error:</strong> " + (e.message || "no se pudo procesar la carga."));
  } finally {
    btn.disabled = false;
  }
}

function histDescargarPlantillaV1621() {
  const encabezados = ["NIT", ...HIST_MESES_V1621];
  const filaEjemplo = ["900123456", 12.5, 10.2, 0, 8.4, 0, 0, 0, 0, 0, 0, 0, 0];
  const ws = XLSX.utils.aoa_to_sheet([encabezados, filaEjemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Historico");
  XLSX.writeFile(wb, "plantilla_historico_ventas.xlsx");
}

function histDescargarNoCoincidentesV1621() {
  if (!histUltimaValidacionV1621 || !histUltimaValidacionV1621.listaNoCoincidentes) return;
  const filas = [["NIT sin coincidencia"], ...histUltimaValidacionV1621.listaNoCoincidentes.map(n => [n])];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sin coincidencia");
  XLSX.writeFile(wb, "nits_sin_coincidencia.xlsx");
}

document.addEventListener("DOMContentLoaded", () => {
  if ($h16("histValidarBtnV1621")) $h16("histValidarBtnV1621").addEventListener("click", histValidarV1621);
  if ($h16("histProcesarBtnV1621")) $h16("histProcesarBtnV1621").addEventListener("click", histProcesarV1621);
  if ($h16("histPlantillaBtnV1621")) $h16("histPlantillaBtnV1621").addEventListener("click", histDescargarPlantillaV1621);
  if ($h16("histDescargarNoCoincidentesBtnV1621")) $h16("histDescargarNoCoincidentesBtnV1621").addEventListener("click", histDescargarNoCoincidentesV1621);

  if (typeof applyUserProfileV84 === "function") {
    const _original = applyUserProfileV84;
    applyUserProfileV84 = function () {
      _original();
      histPintarVisibilidadV1621();
    };
  }
  if (typeof applyAdminVisibilityV811 === "function") {
    const _originalVis = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _originalVis();
      histPintarVisibilidadV1621();
    };
  }

  histPintarVisibilidadV1621();
});
