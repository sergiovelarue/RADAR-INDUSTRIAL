// ============================================================
// V16.25 — Activación primera vez: wizard de 4 pasos
// ------------------------------------------------------------
// Reemplaza los cajones sueltos y redundantes (histórico separado,
// activación con sus propios campos, ERP y manual como opciones
// paralelas) por un único flujo secuencial dentro de
// masterDataAdminPanel: 1) histórico año anterior, 2) venta año en
// curso (manual o link ERP, decisión única), 3) clasificación y
// estado, 4) modo de operación diaria permanente.
//
// Cada paso muestra un semáforo (rojo = sin información de
// referencia, verde = usando información de referencia con nombre de
// archivo y fecha) leído de metadata_activacion_v1 (Supabase,
// proyecto RADAR-INDUSTRIAL). Los pasos 2, 3 y 4 quedan bloqueados
// hasta que el anterior tenga semáforo verde.
//
// Backend reutilizado sin cambios de contrato:
// - disparar_historico_ventas_v1 / leer_ultimo_resultado_historico_v1
//   (paso 1, mismo motor que la carga de histórico contra base
//   existente — aquí usado contra la base ya creada o vacía).
// - disparar_activacion_cliente_nuevo_v1 / leer_ultimo_resultado_activacion_v1
//   (usado en modo "solo 2026" para el paso 2, cuando aún no hay
//   base — internamente sigue funcionando como reemplazo total).
// - guardar_config_conexion_erp_v1 (paso 4, modo automático).
// Backend nuevo (V16.25): leer_metadata_activacion_v1,
// registrar_carga_historico_v1, registrar_carga_venta_actual_v1,
// registrar_calculo_clasificacion_v1, guardar_modo_operacion_v1.
// ============================================================

const WIZ_MESES_V1625 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function $w18(id) { return document.getElementById(id); }

let wizMetadataV1625 = null;
let wizFilasHistoricoV1625 = null;
let wizFilasVentaActualV1625 = null;

function wizEsSuperAdminV1625() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}

function wizToNumberV1625(v) {
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

async function wizLeerArchivoV1625(inputId) {
  const input = $w18(inputId);
  if (!input || !input.files.length) return { rows: [], fileName: null };
  const file = input.files[0];
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sh = wb.Sheets[wb.SheetNames[0]];
  return { rows: XLSX.utils.sheet_to_json(sh, { defval: "" }), fileName: file.name };
}

function wizNormalizarFilasV1625(rows) {
  return rows.map(row => {
    const keys = Object.keys(row);
    const buscar = (nombre) => keys.find(k => String(k).trim().toLowerCase() === nombre.toLowerCase());
    const kNit = buscar("nit") || keys[0];
    const kCliente = buscar("cliente");
    const kAsesor = buscar("asesor");
    const kCiudad = buscar("ciudad");
    const kDepto = buscar("departamento");
    const fila = {
      NIT: String(row[kNit] ?? "").replace(/\s+/g, "").trim(),
      Cliente: kCliente ? row[kCliente] : "",
      Asesor: kAsesor ? row[kAsesor] : "SIN ASIGNACION",
      Ciudad: kCiudad ? row[kCiudad] : "",
      Departamento: kDepto ? row[kDepto] : ""
    };
    WIZ_MESES_V1625.forEach(m => {
      const key = keys.find(k => String(k).trim().toLowerCase() === m.toLowerCase());
      fila[m] = key ? wizToNumberV1625(row[key]) : 0;
    });
    return fila;
  }).filter(f => f.NIT !== "" && f.NIT.toLowerCase() !== "total");
}

function wizEsperarMs(ms) { return new Promise(r => setTimeout(r, ms)); }

async function wizEsperarResultadoV1625(rpcNombre, maxIntentos = 60, esperaMs = 1000) {
  for (let i = 0; i < maxIntentos; i++) {
    await wizEsperarMs(esperaMs);
    const { data, error } = await supabaseClientV94.rpc(rpcNombre);
    if (error) throw error;
    if (data) return data;
  }
  throw new Error("La operación sigue en curso del lado del servidor. Espera un momento y vuelve a intentar.");
}

// ------------------------------------------------------------
// Semáforos: leen metadata_activacion_v1 y pintan cada paso.
// ------------------------------------------------------------

async function wizCargarMetadataV1625() {
  if (typeof supabaseClientV94 === "undefined") return;
  const { data, error } = await supabaseClientV94.rpc("leer_metadata_activacion_v1");
  if (error) { console.error("[Radar-Wizard] Error leyendo metadata:", error); return; }
  wizMetadataV1625 = data || {};
  wizPintarSemaforosV1625();
}

function wizFormatearFechaV1625(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }); } catch (e) { return iso; }
}

function wizPintarSemaforoV1625(semaforoId, detalleId, tieneReferencia, textoVerde, textoRojo) {
  const semaforo = $w18(semaforoId);
  const detalle = $w18(detalleId);
  if (semaforo) {
    semaforo.className = "wiz-semaforo-v1625 " + (tieneReferencia ? "wiz-semaforo-ok-v1625" : "wiz-semaforo-error-v1625");
    semaforo.querySelector(".wiz-semaforo-texto-v1625").textContent = tieneReferencia ? "Usando esta referencia" : "Sin información de referencia";
  }
  if (detalle) detalle.textContent = tieneReferencia ? textoVerde : textoRojo;
}

function wizPintarSemaforosV1625() {
  const m = wizMetadataV1625 || {};
  const tieneHistorico = !!m.historico_nombre_archivo;
  const tieneVentaActual = !!m.venta_actual_nombre_archivo;
  const tieneClasificacion = !!m.clasificacion_calculada_en;

  wizPintarSemaforoV1625(
    "wizSemaforo1V1625", "wizDetalle1V1625", tieneHistorico,
    `Archivo: ${m.historico_nombre_archivo} · cargado ${wizFormatearFechaV1625(m.historico_cargado_en)} · ${m.historico_total_clientes || 0} clientes.`,
    "Sin información de referencia todavía."
  );
  $w18("wizWarning1V1625").style.display = tieneHistorico ? "block" : "none";

  wizPintarSemaforoV1625(
    "wizSemaforo2V1625", "wizDetalle2V1625", tieneVentaActual,
    `Archivo: ${m.venta_actual_nombre_archivo} · cargado ${wizFormatearFechaV1625(m.venta_actual_cargado_en)} · ${m.venta_actual_total_clientes || 0} clientes.`,
    "Sin información de referencia todavía."
  );
  $w18("wizWarning2V1625").style.display = tieneVentaActual ? "block" : "none";

  // Bloqueo/desbloqueo secuencial
  wizAplicarBloqueoV1625("wizPaso2V1625", "wizBloqueo2V1625", "wizContenido2V1625", tieneHistorico);
  wizAplicarBloqueoV1625("wizPaso3V1625", "wizBloqueo3V1625", "wizContenido3V1625", tieneHistorico && tieneVentaActual);
  if (tieneHistorico && tieneVentaActual) {
    $w18("wizDetalle3V1625").textContent = tieneClasificacion
      ? `Último cálculo: ${wizFormatearFechaV1625(m.clasificacion_calculada_en)}.`
      : "Listo para calcular.";
  }
  wizAplicarBloqueoV1625("wizPaso4V1625", "wizBloqueo4V1625", "wizContenido4V1625", tieneHistorico && tieneVentaActual);

  if (tieneHistorico && tieneVentaActual) {
    const radiosVenta = document.getElementsByName("wizModoVentaV1625");
    radiosVenta.forEach(r => { r.checked = r.value === (m.modo_venta || "manual"); });
    $w18("wizErpConfigV1625").style.display = (m.modo_venta === "automatica_erp") ? "block" : "none";
    const radiosClasif = document.getElementsByName("wizModoClasificacionV1625");
    radiosClasif.forEach(r => { r.checked = r.value === (m.modo_clasificacion || "manual"); });
  }
}

function wizAplicarBloqueoV1625(pasoId, bloqueoId, contenidoId, desbloqueado) {
  const paso = $w18(pasoId);
  const bloqueo = $w18(bloqueoId);
  const contenido = $w18(contenidoId);
  if (paso) paso.classList.toggle("wiz-paso-bloqueado-v1625", !desbloqueado);
  if (bloqueo) bloqueo.style.display = desbloqueado ? "none" : "block";
  if (contenido) contenido.style.display = desbloqueado ? "block" : "none";
}

// ------------------------------------------------------------
// Paso 1: histórico
// ------------------------------------------------------------

function wizSetEstadoV1625(elId, clase, html) {
  const el = $w18(elId);
  if (!el) return;
  el.className = "wiz-estado-v1625" + (clase ? " " + clase : "");
  el.innerHTML = html;
}

async function wizValidarHistoricoV1625() {
  wizSetEstadoV1625("wizEstadoHistoricoV1625", "", "<strong>Estado:</strong> leyendo archivo…");
  $w18("wizProcesarHistoricoBtnV1625").disabled = true;
  $w18("wizResultadoHistoricoV1625").style.display = "none";
  $w18("wizConfirmHistoricoV1625").style.display = "none";

  try {
    const { rows, fileName } = await wizLeerArchivoV1625("wizArchivoHistoricoV1625");
    if (!rows.length) {
      wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> selecciona un archivo con datos.");
      return;
    }
    const filas = wizNormalizarFilasV1625(rows);
    wizFilasHistoricoV1625 = { filas, fileName };

    const { error: errDisparo } = await supabaseClientV94.rpc("disparar_carga_historico_referencia_v1", {
      p_modo: "validar", p_filas: filas, p_usuario_email: (currentUserV84 && currentUserV84.email) || ""
    });
    if (errDisparo) throw errDisparo;
    const data = await wizEsperarResultadoV1625("leer_ultimo_resultado_historico_referencia_v1");
    if (!data || data.ok === false) {
      wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo validar."));
      return;
    }

    $w18("wizResultadoHistoricoV1625").style.display = "block";
    $w18("wizResultadoHistoricoV1625").innerHTML = `<p><strong>${data.totalFilas}</strong> clientes en el archivo · <strong>${data.nuevos}</strong> nuevos · <strong>${data.actualizables}</strong> ya existentes (se actualiza su histórico, sin tocar venta actual)${data.asesoresNoReconocidos ? " · <strong>" + data.asesoresNoReconocidos + "</strong> asesores sin reconocer (" + data.asesoresNoReconocidosLista.join(", ") + ")" : ""}.</p>`;

    // Mismo nombre de archivo que la referencia actual = actualización
    // normal (sin fricción extra). Nombre distinto = reemplazo de la
    // referencia — pide confirmación explícita.
    const nombreAnterior = wizMetadataV1625 && wizMetadataV1625.historico_nombre_archivo;
    const esReemplazoDeReferencia = nombreAnterior && nombreAnterior !== fileName;
    if (esReemplazoDeReferencia) {
      $w18("wizConfirmHistoricoV1625").style.display = "block";
      $w18("wizConfirmHistoricoTextoV1625").value = "";
      $w18("wizProcesarHistoricoBtnV1625").disabled = true;
    } else {
      $w18("wizProcesarHistoricoBtnV1625").disabled = false;
    }

    wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-ok-v1625",
      (esReemplazoDeReferencia
        ? `<strong>Atención:</strong> este archivo (${fileName}) es distinto al usado como referencia (${nombreAnterior}) — al procesar, reemplaza la referencia del año anterior. `
        : "<strong>Validación correcta.</strong> ") + "Archivo: " + fileName + ".");
  } catch (e) {
    console.error("[Radar-Wizard] Error validando histórico:", e);
    wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + (e.message || "no se pudo validar."));
  }
}

async function wizProcesarHistoricoV1625() {
  if (!wizFilasHistoricoV1625) return;
  const nombreAnterior = wizMetadataV1625 && wizMetadataV1625.historico_nombre_archivo;
  const esReemplazoDeReferencia = nombreAnterior && nombreAnterior !== wizFilasHistoricoV1625.fileName;
  if (esReemplazoDeReferencia) {
    const texto = ($w18("wizConfirmHistoricoTextoV1625").value || "").trim().toUpperCase();
    if (texto !== "REEMPLAZAR") {
      wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> escribe REEMPLAZAR para confirmar.");
      return;
    }
    const confirmado = confirm("Vas a reemplazar la referencia del año anterior por un archivo distinto (" + wizFilasHistoricoV1625.fileName + "). Esto NO afecta la venta actual. ¿Continuar?");
    if (!confirmado) return;
  }

  const btn = $w18("wizProcesarHistoricoBtnV1625");
  btn.disabled = true;
  wizSetEstadoV1625("wizEstadoHistoricoV1625", "", "<strong>Estado:</strong> procesando…");

  try {
    const { filas, fileName } = wizFilasHistoricoV1625;
    const usuarioEmail = (currentUserV84 && currentUserV84.email) || "";
    const { error: errDisparo } = await supabaseClientV94.rpc("disparar_carga_historico_referencia_v1", {
      p_modo: "procesar", p_filas: filas, p_usuario_email: usuarioEmail
    });
    if (errDisparo) throw errDisparo;
    const data = await wizEsperarResultadoV1625("leer_ultimo_resultado_historico_referencia_v1");
    if (!data || data.ok === false) {
      wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo procesar."));
      btn.disabled = false;
      return;
    }

    await supabaseClientV94.rpc("registrar_carga_historico_v1", { p_nombre_archivo: fileName, p_total_clientes: data.totalFilas, p_usuario_email: usuarioEmail });

    wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-ok-v1625", "<strong>Histórico cargado.</strong> " + data.mensaje);
    $w18("wizConfirmHistoricoV1625").style.display = "none";
    if (typeof cargarClientesDesdeSupabaseV94 === "function") await cargarClientesDesdeSupabaseV94();
    if (typeof render === "function") render();
    await wizCargarMetadataV1625();
  } catch (e) {
    console.error("[Radar-Wizard] Error procesando histórico:", e);
    wizSetEstadoV1625("wizEstadoHistoricoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + (e.message || "no se pudo procesar."));
  } finally {
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// Paso 2: venta actual
// ------------------------------------------------------------

async function wizValidarVentaActualV1625() {
  wizSetEstadoV1625("wizEstadoVentaActualV1625", "", "<strong>Estado:</strong> leyendo archivo…");
  $w18("wizProcesarVentaActualBtnV1625").disabled = true;
  $w18("wizResultadoVentaActualV1625").style.display = "none";
  $w18("wizConfirmVentaActualV1625").style.display = "none";

  try {
    const { rows, fileName } = await wizLeerArchivoV1625("wizArchivoVentaActualV1625");
    if (!rows.length) {
      wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> selecciona un archivo con datos.");
      return;
    }
    const filas = wizNormalizarFilasV1625(rows);
    wizFilasVentaActualV1625 = { filas, fileName };

    const { error: errDisparo } = await supabaseClientV94.rpc("disparar_historico_ventas_v1", {
      p_anio: "2026", p_modo: "validar", p_filas: filas
    });
    if (errDisparo) throw errDisparo;
    const data = await wizEsperarResultadoV1625("leer_ultimo_resultado_historico_v1");
    if (!data || data.ok === false) {
      wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo validar."));
      return;
    }

    $w18("wizResultadoVentaActualV1625").style.display = "block";
    $w18("wizResultadoVentaActualV1625").innerHTML = `<p><strong>${data.coincidentes}</strong> de <strong>${data.totalNitsArchivo}</strong> NIT coinciden con clientes del histórico ya cargado.</p>`;

    const nombreAnterior = wizMetadataV1625 && wizMetadataV1625.venta_actual_nombre_archivo;
    const esReemplazoDeReferencia = nombreAnterior && nombreAnterior !== fileName;
    if (esReemplazoDeReferencia) {
      $w18("wizConfirmVentaActualV1625").style.display = "block";
      $w18("wizConfirmVentaActualTextoV1625").value = "";
      $w18("wizProcesarVentaActualBtnV1625").disabled = true;
    } else {
      $w18("wizProcesarVentaActualBtnV1625").disabled = data.coincidentes === 0;
    }

    wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-ok-v1625",
      (esReemplazoDeReferencia
        ? `<strong>Atención:</strong> este archivo (${fileName}) es distinto al usado como referencia (${nombreAnterior}) — al procesar, reemplaza la referencia de venta actual. `
        : "<strong>Validación correcta.</strong> ") + "Archivo: " + fileName + ".");
  } catch (e) {
    console.error("[Radar-Wizard] Error validando venta actual:", e);
    wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + (e.message || "no se pudo validar."));
  }
}

async function wizProcesarVentaActualV1625() {
  if (!wizFilasVentaActualV1625) return;
  const nombreAnterior = wizMetadataV1625 && wizMetadataV1625.venta_actual_nombre_archivo;
  const esReemplazoDeReferencia = nombreAnterior && nombreAnterior !== wizFilasVentaActualV1625.fileName;
  if (esReemplazoDeReferencia) {
    const texto = ($w18("wizConfirmVentaActualTextoV1625").value || "").trim().toUpperCase();
    if (texto !== "REEMPLAZAR") {
      wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> escribe REEMPLAZAR para confirmar.");
      return;
    }
  }
  const confirmado = confirm("Esto reemplaza la venta del año en curso de los clientes coincidentes. ¿Continuar?");
  if (!confirmado) return;

  const btn = $w18("wizProcesarVentaActualBtnV1625");
  btn.disabled = true;
  wizSetEstadoV1625("wizEstadoVentaActualV1625", "", "<strong>Estado:</strong> procesando…");

  try {
    const { filas, fileName } = wizFilasVentaActualV1625;
    const usuarioEmail = (currentUserV84 && currentUserV84.email) || "";
    const { error: errDisparo } = await supabaseClientV94.rpc("disparar_historico_ventas_v1", {
      p_anio: "2026", p_modo: "procesar", p_filas: filas
    });
    if (errDisparo) throw errDisparo;
    const data = await wizEsperarResultadoV1625("leer_ultimo_resultado_historico_v1");
    if (!data || data.ok === false) {
      wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + ((data && data.error) || "no se pudo procesar."));
      btn.disabled = false;
      return;
    }

    await supabaseClientV94.rpc("registrar_carga_venta_actual_v1", { p_nombre_archivo: fileName, p_total_clientes: data.coincidentes, p_usuario_email: usuarioEmail });

    wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-ok-v1625", "<strong>Venta actual cargada.</strong> " + data.mensaje);
    $w18("wizConfirmVentaActualV1625").style.display = "none";
    if (typeof cargarClientesDesdeSupabaseV94 === "function") await cargarClientesDesdeSupabaseV94();
    if (typeof render === "function") render();
    await wizCargarMetadataV1625();
  } catch (e) {
    console.error("[Radar-Wizard] Error procesando venta actual:", e);
    wizSetEstadoV1625("wizEstadoVentaActualV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + (e.message || "no se pudo procesar."));
  } finally {
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// Paso 3: clasificación (placeholder — motor pendiente)
// ------------------------------------------------------------

async function wizClasificarV1625() {
  // Placeholder: cuando el motor de clasificación esté definido, aquí
  // se dispara su RPC. Por ahora solo registra la marca de tiempo si
  // el botón llegara a habilitarse manualmente en pruebas.
  const usuarioEmail = (currentUserV84 && currentUserV84.email) || "";
  await supabaseClientV94.rpc("registrar_calculo_clasificacion_v1", { p_usuario_email: usuarioEmail });
  await wizCargarMetadataV1625();
}

// ------------------------------------------------------------
// Paso 4: modo de operación diaria
// ------------------------------------------------------------

function wizPintarModoVentaV1625() {
  const seleccionado = document.querySelector('input[name="wizModoVentaV1625"]:checked');
  $w18("wizErpConfigV1625").style.display = (seleccionado && seleccionado.value === "automatica_erp") ? "block" : "none";
}

async function wizGuardarModoV1625() {
  const modoVenta = document.querySelector('input[name="wizModoVentaV1625"]:checked');
  const modoClasificacion = document.querySelector('input[name="wizModoClasificacionV1625"]:checked');
  if (!modoVenta || !modoClasificacion) {
    wizSetEstadoV1625("wizEstadoModoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> selecciona una opción en ambos grupos.");
    return;
  }

  try {
    if (modoVenta.value === "automatica_erp") {
      const url = $w18("wizErpUrlV1625").value.trim();
      const hora = $w18("wizErpHoraV1625").value || "06:00";
      if (!url) {
        wizSetEstadoV1625("wizEstadoModoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> ingresa la URL de conexión antes de habilitar el modo automático.");
        return;
      }
      const usuarioEmail = (currentUserV84 && currentUserV84.email) || "";
      const { error: errErp } = await supabaseClientV94.rpc("guardar_config_conexion_erp_v1", {
        p_habilitado: true, p_sistema_origen: "Otro (link genérico)", p_url_conexion: url, p_hora_programada: hora + ":00", p_usuario_email: usuarioEmail
      });
      if (errErp) throw errErp;
    }

    const { error } = await supabaseClientV94.rpc("guardar_modo_operacion_v1", {
      p_modo_venta: modoVenta.value, p_modo_clasificacion: modoClasificacion.value
    });
    if (error) throw error;

    wizSetEstadoV1625("wizEstadoModoV1625", "wiz-estado-ok-v1625", "<strong>Modo de operación guardado.</strong>");
    await wizCargarMetadataV1625();
  } catch (e) {
    console.error("[Radar-Wizard] Error guardando modo de operación:", e);
    wizSetEstadoV1625("wizEstadoModoV1625", "wiz-estado-error-v1625", "<strong>Error:</strong> " + (e.message || "no se pudo guardar."));
  }
}

// ------------------------------------------------------------
// Plantillas
// ------------------------------------------------------------

function wizDescargarPlantillaV1625() {
  const encabezados = ["NIT", "Cliente", "Asesor", "Ciudad", "Departamento", ...WIZ_MESES_V1625];
  const filaEjemplo = ["900123456", "Cliente de ejemplo SAS", "SIN ASIGNACION", "Bogotá", "Bogotá", 12.5, 10.2, 0, 8.4, 0, 0, 0, 0, 0, 0, 0, 0];
  const ws = XLSX.utils.aoa_to_sheet([encabezados, filaEjemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, "plantilla_carga.xlsx");
}

function wizPintarVisibilidadV1625() {
  const panel = $w18("wizPanelV1625");
  if (!panel) return;
  panel.style.display = wizEsSuperAdminV1625() ? "block" : "none";
  if (wizEsSuperAdminV1625()) wizCargarMetadataV1625();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($w18("wizValidarHistoricoBtnV1625")) $w18("wizValidarHistoricoBtnV1625").addEventListener("click", wizValidarHistoricoV1625);
  if ($w18("wizProcesarHistoricoBtnV1625")) $w18("wizProcesarHistoricoBtnV1625").addEventListener("click", wizProcesarHistoricoV1625);
  if ($w18("wizPlantillaHistoricoBtnV1625")) $w18("wizPlantillaHistoricoBtnV1625").addEventListener("click", wizDescargarPlantillaV1625);

  if ($w18("wizValidarVentaActualBtnV1625")) $w18("wizValidarVentaActualBtnV1625").addEventListener("click", wizValidarVentaActualV1625);
  if ($w18("wizProcesarVentaActualBtnV1625")) $w18("wizProcesarVentaActualBtnV1625").addEventListener("click", wizProcesarVentaActualV1625);
  if ($w18("wizPlantillaVentaActualBtnV1625")) $w18("wizPlantillaVentaActualBtnV1625").addEventListener("click", wizDescargarPlantillaV1625);

  if ($w18("wizClasificarBtnV1625")) $w18("wizClasificarBtnV1625").addEventListener("click", wizClasificarV1625);

  document.getElementsByName("wizModoVentaV1625").forEach(r => r.addEventListener("change", wizPintarModoVentaV1625));
  if ($w18("wizGuardarModoBtnV1625")) $w18("wizGuardarModoBtnV1625").addEventListener("click", wizGuardarModoV1625);

  if (typeof applyUserProfileV84 === "function") {
    const _original = applyUserProfileV84;
    applyUserProfileV84 = function () {
      _original();
      wizPintarVisibilidadV1625();
    };
  }
  if (typeof applyAdminVisibilityV811 === "function") {
    const _originalVis = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _originalVis();
      wizPintarVisibilidadV1625();
    };
  }

  wizPintarVisibilidadV1625();
});
