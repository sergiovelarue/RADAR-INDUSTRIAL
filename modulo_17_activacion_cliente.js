// ============================================================
// V16.23 — Activación de cliente nuevo (reemplazo total de base)
// ------------------------------------------------------------
// Capa aditiva dentro de masterDataAdminPanel (ver index.html): no
// toca app.js. Permite a Super Administrador reemplazar por completo
// la base de clientes a partir de dos archivos maestro (histórico
// del año anterior + venta del año en curso), pensado para activar
// la app desde cero con los datos reales de un cliente nuevo.
//
// Backend: Edge Function activar-cliente-nuevo + RPC
// disparar_activacion_cliente_nuevo_v1 / leer_ultimo_resultado_activacion_v1
// (proyecto Supabase RADAR-INDUSTRIAL), mismo patrón fire-and-forget +
// tabla de resultado que modulo_16_historico_ventas.js.
//
// Formato esperado de ambos archivos: columnas NIT, Cliente, Asesor,
// Ciudad, Departamento, Enero..Diciembre (Total se ignora si viene).
// El asesor se auto-asigna solo si el nombre coincide EXACTAMENTE
// (sin distinguir mayúsculas) con un asesor ya registrado.
//
// Nota de alcance (decisión explícita del cliente, 2026-09-04): esta
// versión NO hace respaldo automático antes de reemplazar — se deja
// para una fase futura. La acción es irreversible tal como está hoy.
// ============================================================

const ACTIV_MESES_V1623 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function $a17(id) { return document.getElementById(id); }

let activFilas2025V1623 = null;
let activFilas2026V1623 = null;
let activUltimaValidacionV1623 = null;

function activEsSuperAdminV1623() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}

function activToNumberV1623(v) {
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

function activPintarVisibilidadV1623() {
  const panel = $a17("activPanelV1623");
  if (!panel) return;
  panel.style.display = activEsSuperAdminV1623() ? "block" : "none";
}

async function activLeerArchivoV1623(inputId) {
  const input = $a17(inputId);
  if (!input || !input.files.length) return { rows: [], fileName: "No cargado" };
  const file = input.files[0];
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sh = wb.Sheets[wb.SheetNames[0]];
  return { rows: XLSX.utils.sheet_to_json(sh, { defval: "" }), fileName: file.name };
}

function activNormalizarFilasV1623(rows) {
  return rows.map(row => {
    const keys = Object.keys(row);
    const buscar = (nombre) => keys.find(k => String(k).trim().toLowerCase() === nombre.toLowerCase());
    const kNit = buscar("nit") || keys[0];
    const kCliente = buscar("cliente");
    const kAsesor = buscar("asesor");
    const kCiudad = buscar("ciudad");
    const kDepto = buscar("departamento");
    const fila = {
      NIT: row[kNit],
      Cliente: kCliente ? row[kCliente] : "",
      Asesor: kAsesor ? row[kAsesor] : "SIN ASIGNACION",
      Ciudad: kCiudad ? row[kCiudad] : "",
      Departamento: kDepto ? row[kDepto] : ""
    };
    ACTIV_MESES_V1623.forEach(m => {
      const key = keys.find(k => String(k).trim().toLowerCase() === m.toLowerCase());
      fila[m] = key ? activToNumberV1623(row[key]) : 0;
    });
    return fila;
  }).filter(f => f.NIT !== "" && f.NIT != null && String(f.NIT).trim().toLowerCase() !== "total");
}

function activSetEstadoV1623(clase, html) {
  const el = $a17("activEstadoV1623");
  if (!el) return;
  el.className = "activ-estado-v1623" + (clase ? " " + clase : "");
  el.innerHTML = html;
}

function activEsperarMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function activEsperarResultadoV1623(maxIntentos = 60, esperaMs = 1000) {
  for (let i = 0; i < maxIntentos; i++) {
    await activEsperarMs(esperaMs);
    const { data, error } = await supabaseClientV94.rpc("leer_ultimo_resultado_activacion_v1");
    if (error) throw error;
    if (data) return data;
  }
  throw new Error("La operación sigue en curso del lado del servidor (puede tardar más con archivos grandes). Espera un momento y vuelve a intentar.");
}

async function activValidarV1623() {
  activSetEstadoV1623("", "<strong>Estado:</strong> leyendo archivos…");
  $a17("activProcesarBtnV1623").disabled = true;
  $a17("activResultadoV1623").style.display = "none";
  $a17("activConfirmacionV1623").style.display = "none";

  try {
    const [r2025, r2026] = await Promise.all([
      activLeerArchivoV1623("activArchivo2025V1623"),
      activLeerArchivoV1623("activArchivo2026V1623")
    ]);
    if (!r2025.rows.length || !r2026.rows.length) {
      activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> sube ambos archivos (histórico y venta actual) antes de validar.");
      return;
    }

    const filas2025 = activNormalizarFilasV1623(r2025.rows);
    const filas2026 = activNormalizarFilasV1623(r2026.rows);
    activFilas2025V1623 = filas2025;
    activFilas2026V1623 = filas2026;

    activSetEstadoV1623("", "<strong>Estado:</strong> validando contra la tabla de asesores…");
    const { error: errorDisparo } = await supabaseClientV94.rpc("disparar_activacion_cliente_nuevo_v1", {
      p_modo: "validar", p_filas_2025: filas2025, p_filas_2026: filas2026, p_usuario_email: (currentUserV84 && currentUserV84.email) || ""
    });
    if (errorDisparo) throw errorDisparo;

    const data = await activEsperarResultadoV1623();
    if (!data || data.ok === false) {
      activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo validar."));
      return;
    }

    activUltimaValidacionV1623 = data;
    $a17("activStatTotalV1623").textContent = data.totalClientesResultantes;
    $a17("activStatNuevosV1623").textContent = data.nuevosSinHistorico;
    $a17("activStatAsesorOkV1623").textContent = data.asesoresReconocidos;
    $a17("activStatAsesorErrorV1623").textContent = data.asesoresNoReconocidos;
    $a17("activResultadoV1623").style.display = "block";

    const nota = $a17("activNotaAsesoresV1623");
    if (data.asesoresNoReconocidos > 0) {
      nota.textContent = "Asesores en el archivo sin coincidencia exacta (quedarán SIN ASIGNACION): " + data.asesoresNoReconocidosLista.join(", ");
    } else {
      nota.textContent = "Todos los asesores del archivo coinciden con asesores ya registrados.";
    }

    $a17("activConfirmacionV1623").style.display = "block";
    $a17("activConfirmTextoV1623").value = "";
    $a17("activProcesarBtnV1623").disabled = true;

    activSetEstadoV1623("activ-estado-ok-v1623", `<strong>Validación correcta:</strong> el reemplazo crearía ${data.totalClientesResultantes} clientes (${data.nuevosSinHistorico} nuevos sin histórico). Revisa el resumen antes de procesar.`);
  } catch (e) {
    console.error("[Radar-Activacion] Error validando:", e);
    activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> " + (e.message || "no se pudo validar los archivos."));
  }
}

async function activProcesarV1623() {
  if (!activFilas2025V1623 || !activFilas2026V1623) return;
  const texto = ($a17("activConfirmTextoV1623").value || "").trim().toUpperCase();
  if (texto !== "REEMPLAZAR") {
    activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> escribe exactamente REEMPLAZAR en el campo de confirmación para continuar.");
    return;
  }
  const confirmado = confirm("Esta acción BORRARÁ TODOS los clientes actuales y los reemplazará por el nuevo maestro. No hay respaldo automático. ¿Continuar?");
  if (!confirmado) return;

  const btn = $a17("activProcesarBtnV1623");
  btn.disabled = true;
  activSetEstadoV1623("", "<strong>Estado:</strong> procesando reemplazo total de la base…");

  try {
    const { error: errorDisparo } = await supabaseClientV94.rpc("disparar_activacion_cliente_nuevo_v1", {
      p_modo: "procesar", p_filas_2025: activFilas2025V1623, p_filas_2026: activFilas2026V1623, p_usuario_email: (currentUserV84 && currentUserV84.email) || ""
    });
    if (errorDisparo) throw errorDisparo;

    const data = await activEsperarResultadoV1623();
    if (!data || data.ok === false) {
      activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo procesar el reemplazo."));
      btn.disabled = false;
      return;
    }
    activSetEstadoV1623("activ-estado-ok-v1623", "<strong>Reemplazo completado:</strong> " + data.mensaje);
    $a17("activConfirmacionV1623").style.display = "none";
    if (typeof cargarClientesDesdeSupabaseV94 === "function") await cargarClientesDesdeSupabaseV94();
    if (typeof render === "function") render();
  } catch (e) {
    console.error("[Radar-Activacion] Error procesando:", e);
    activSetEstadoV1623("activ-estado-error-v1623", "<strong>Error:</strong> " + (e.message || "no se pudo procesar el reemplazo."));
  } finally {
    btn.disabled = false;
  }
}

function activDescargarPlantillaV1623() {
  const encabezados = ["NIT", "Cliente", "Asesor", "Ciudad", "Departamento", ...ACTIV_MESES_V1623];
  const filaEjemplo = ["900123456", "Cliente de ejemplo SAS", "SIN ASIGNACION", "Bogotá", "Bogotá", 12.5, 10.2, 0, 8.4, 0, 0, 0, 0, 0, 0, 0, 0];
  const ws = XLSX.utils.aoa_to_sheet([encabezados, filaEjemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Maestro");
  XLSX.writeFile(wb, "plantilla_activacion_cliente.xlsx");
}

document.addEventListener("DOMContentLoaded", () => {
  if ($a17("activValidarBtnV1623")) $a17("activValidarBtnV1623").addEventListener("click", activValidarV1623);
  if ($a17("activProcesarBtnV1623")) $a17("activProcesarBtnV1623").addEventListener("click", activProcesarV1623);
  if ($a17("activPlantillaBtnV1623")) $a17("activPlantillaBtnV1623").addEventListener("click", activDescargarPlantillaV1623);
  if ($a17("activConfirmTextoV1623")) {
    $a17("activConfirmTextoV1623").addEventListener("input", () => {
      const texto = $a17("activConfirmTextoV1623").value.trim().toUpperCase();
      $a17("activProcesarBtnV1623").disabled = texto !== "REEMPLAZAR";
    });
  }

  if (typeof applyUserProfileV84 === "function") {
    const _original = applyUserProfileV84;
    applyUserProfileV84 = function () {
      _original();
      activPintarVisibilidadV1623();
    };
  }
  if (typeof applyAdminVisibilityV811 === "function") {
    const _originalVis = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _originalVis();
      activPintarVisibilidadV1623();
    };
  }

  activPintarVisibilidadV1623();
});
