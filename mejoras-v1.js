// ============================================================
// RADAR INDUSTRIAL — Mejoras V98
// ------------------------------------------------------------
// Este archivo se carga DESPUÉS de app.js y supabase-sync.js y
// NO modifica esos archivos. Sigue la misma convención del
// proyecto: envuelve funciones existentes en vez de borrarlas.
//
// Incluye:
//   1) Orden fijo de Estado (Activo, Inactivo, Posible Baja,
//      Baja, Reingreso, Nuevo, Bloqueado) en filtros y tarjetas.
//   2) Filtro de Clasificación + tarjetas de conteo.
//   3) Elimina Gestión especial / VIP Gerencia. Reemplaza
//      "Estado maestro" por un bloqueo con switch: cualquier
//      usuario puede bloquear, solo administrador desbloquea.
//   4) Canal en detalle de cliente pasa a solo lectura.
//   5) Corrige una condición de carrera que podía sobreescribir
//      en Supabase la configuración real de canales/zonas.
//   6) Pestaña "Log de cambios" (accesos, datos, canales/zonas,
//      transferencias, bloqueos, cargas de ventas) leída desde
//      Supabase, con vistas de 3/10/30 días y export a Excel.
// ============================================================

const ORDEN_ESTADOS_V98 = ["Activo", "Inactivo", "Posible Baja", "Baja", "Reingreso", "Nuevo", "Bloqueado"];

// ------------------------------------------------------------
// 5) FIX de condición de carrera Canal/Zona (Punto 5)
// ------------------------------------------------------------
// app.js llama ensureCanalCatalogV94() + saveDataV93() de forma
// SÍNCRONA en el DOMContentLoaded que él mismo registra. Eso
// dispara sincronizarConfiguracionV97() (definida en
// supabase-sync.js) ANTES de que termine de leerse la
// configuración real desde Supabase. Si en ese instante
// DATA.meta.canales todavía no existe, ensureCanalCatalogV94()
// le pone el catálogo por defecto y ese catálogo por defecto se
// sube a Supabase, pisando lo que el administrador ya había
// creado. Esta guardia bloquea la escritura de configuración
// hasta que la lectura inicial desde Supabase haya terminado.
let configListoV98 = false;
if (typeof cargarConfiguracionDesdeSupabaseV97 === "function") {
  const _cargarConfigOriginalV98 = cargarConfiguracionDesdeSupabaseV97;
  cargarConfiguracionDesdeSupabaseV97 = async function () {
    const r = await _cargarConfigOriginalV98();
    configListoV98 = true;
    return r;
  };
}
if (typeof sincronizarConfiguracionV97 === "function") {
  const _syncConfigOriginalV98 = sincronizarConfiguracionV97;
  let pendienteTrasCargaV98 = false;
  sincronizarConfiguracionV97 = async function () {
    if (!configListoV98) { pendienteTrasCargaV98 = true; return; }
    return _syncConfigOriginalV98();
  };
  const _chequeoListoV98 = setInterval(() => {
    if (configListoV98) {
      clearInterval(_chequeoListoV98);
      if (pendienteTrasCargaV98) { pendienteTrasCargaV98 = false; _syncConfigOriginalV98(); }
    }
  }, 300);
}

// ------------------------------------------------------------
// Utilidad: registrar un evento en el Log de cambios (Supabase)
// ------------------------------------------------------------
// Reutiliza la tabla historial_cambios ya existente (Fase 1).
// tipo: "acceso" | "dato" | "canal" | "transferencia" | "bloqueo" | "ventas"
function logEventoV98(tipo, nit, nombre, detalleAnterior, detalleNuevo) {
  const usuario = (typeof currentUserLabelV86 === "function") ? currentUserLabelV86() : "usuario";
  if (typeof supabaseClientV94 === "undefined") return;
  supabaseClientV94.from("historial_cambios").insert({
    cliente_nit: nit || "",
    cliente_nombre: nombre || "",
    campo: tipo,
    valor_anterior: String(detalleAnterior ?? ""),
    valor_nuevo: String(detalleNuevo ?? ""),
    usuario_email: usuario
  }).then(({ error }) => {
    if (error) console.error("[Radar-Log] Error registrando evento:", error);
  });
}

// ------------------------------------------------------------
// 1) y 2) Tarjetas de Estado y Clasificación + filtro de Clasificación
// ------------------------------------------------------------
// Base común de visibilidad (perfil/asesor/tipo/búsqueda), sin
// aplicar todavía Estado ni Clasificación — estos se aplican por
// separado en cada tarjeta para lograr el conteo cruzado: cada
// dimensión se cuenta respetando la OTRA dimensión ya elegida,
// pero no a sí misma (así el usuario ve "cuántos B hay dentro de
// los Activos ya filtrados", no el total global de B).
function baseVisibilidadV98() {
  const q = String(state.search || "").toLowerCase().trim();
  return (DATA.clientes || []).filter(c => {
    if (typeof typeBelongs === "function" && !typeBelongs(c)) return false;
    if (state.profile === "admin") {
      if (state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    } else if (state.profile) {
      if (c.asesorAsignado !== state.profile) return false;
    }
    if (q && ![c.cliente, c.nit, c.asesorAsignado, c.ciudad, c.departamento, c.tipoCliente, c.canal].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderStatusAndClassCardsV98() {
  const grid = $("statusCardsGrid");
  const gridClass = $("classCardsGrid");
  if (!grid && !gridClass) return;

  const blocked = c => (typeof isBlockedV87 === "function" ? isBlockedV87(c) : false);
  const base = baseVisibilidadV98();
  const claseActiva = state.classFilter && state.classFilter !== "todos" ? state.classFilter : null;
  const estadoActivo = state.status && state.status !== "todos" ? state.status : null;

  if (grid) {
    grid.innerHTML = "";
    // Las tarjetas de Estado respetan la Clasificación ya elegida (si hay).
    const baseParaEstado = base.filter(c => !claseActiva || (c.clasificacion || "N") === claseActiva);
    ORDEN_ESTADOS_V98.forEach(estado => {
      const count = baseParaEstado.filter(c => (estado === "Bloqueado" ? blocked(c) : (!blocked(c) && c.estado === estado))).length;
      const art = document.createElement("article");
      art.dataset.statusCard = estado;
      art.className = "status-card" + (state.status === estado ? " active" : "");
      art.innerHTML = `<span>${estado}</span><strong>${count}</strong>`;
      art.onclick = () => {
        state.status = (state.status === estado) ? "todos" : estado;
        if ($("statusFilter")) $("statusFilter").value = state.status;
        render();
      };
      grid.appendChild(art);
    });
  }

  if (gridClass) {
    gridClass.innerHTML = "";
    // Las tarjetas de Clasificación respetan el Estado ya elegido (si hay).
    // "N" (Nuevo) se excluye: ya está cubierto por el Estado "Nuevo".
    const baseParaClase = base.filter(c => !blocked(c) && (!estadoActivo || c.estado === estadoActivo));
    const clases = Array.from(new Set(base.map(c => c.clasificacion || "N"))).filter(k => k !== "N").sort();
    (clases.length ? clases : ["A", "B", "C", "E"]).forEach(k => {
      const count = baseParaClase.filter(c => (c.clasificacion || "N") === k).length;
      const art = document.createElement("article");
      art.dataset.classCard = k;
      art.className = "status-card" + (state.classFilter === k ? " active" : "");
      art.innerHTML = `<span>Clasificación ${k}</span><strong>${count}</strong>`;
      art.onclick = () => {
        state.classFilter = (state.classFilter === k) ? "todos" : k;
        if ($("classFilter")) $("classFilter").value = state.classFilter;
        render();
      };
      gridClass.appendChild(art);
    });
  }
}

function fillClassFilterV98() {
  const sel = $("classFilter");
  if (!sel) return;
  const current = sel.value || "todos";
  const clases = Array.from(new Set((DATA.clientes || []).map(c => c.clasificacion || "N"))).filter(k => k !== "N").sort();
  sel.innerHTML = '<option value="todos">Todas</option>' + clases.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("");
  sel.value = clases.includes(current) ? current : "todos";
}

if ($("classFilter")) {
  $("classFilter").addEventListener("change", e => {
    state.classFilter = e.target.value;
    render();
  });
}

// Envolvemos render() para: (a) aplicar el filtro de clasificación
// sobre filteredBase, y (b) pintar las tarjetas de Estado/Clasificación
// en el orden fijo, después de cada render normal de la app.
const _renderOriginalV98 = render;
render = function () {
  _renderOriginalV98();
  fillClassFilterV98();
  renderStatusAndClassCardsV98();
};

const _filteredBaseOriginalV98 = filteredBase;
filteredBase = function () {
  const arr = _filteredBaseOriginalV98();
  if (!state.classFilter || state.classFilter === "todos") return arr;
  return arr.filter(c => (c.clasificacion || "N") === state.classFilter);
};

// ------------------------------------------------------------
// 3) Quitar el filtrado por VIP Gerencia (la función se elimina
// del flujo de negocio; ya no oculta clientes a nadie).
// ------------------------------------------------------------
if (typeof isVipGerenciaV88 === "function") {
  isVipGerenciaV88 = function () { return false; };
}

// ------------------------------------------------------------
// 3) Bloqueo con switch: cualquier usuario bloquea, solo admin
// desbloquea. Reemplaza la lógica de modalBloqueadoEdit/VIP.
// ------------------------------------------------------------
const _openClientDetailOriginalV98 = openClientDetailV81;
openClientDetailV81 = function (nit) {
  _openClientDetailOriginalV98(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if (!c) return;

  // Canal: ahora es solo lectura
  if ($("modalCanalView")) $("modalCanalView").value = c.canal || "Sin canal asignado";

  const bloqueado = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;

  if ($("modalBloqueoSwitch")) {
    $("modalBloqueoSwitch").checked = bloqueado;
    // Si ya está bloqueado, solo un admin puede tocar el switch (para desbloquear).
    // Si NO está bloqueado, cualquier usuario puede tocarlo (para bloquear).
    $("modalBloqueoSwitch").disabled = bloqueado && !esAdmin;
  }
  if ($("modalMotivoBloqueoEdit")) {
    $("modalMotivoBloqueoEdit").value = c.motivoBloqueo || "";
    $("modalMotivoBloqueoEdit").disabled = bloqueado && !esAdmin;
  }
  if ($("blockSwitchLabel")) {
    $("blockSwitchLabel").textContent = bloqueado ? "Cliente bloqueado / no gestionable" : "Cliente activo (no bloqueado)";
  }
  if ($("blockHelp")) {
    $("blockHelp").textContent = bloqueado
      ? (esAdmin ? "Está bloqueado. Puedes desbloquearlo desde aquí." : "Está bloqueado. Solo un administrador puede desbloquearlo.")
      : "Cualquier usuario puede bloquear un cliente indicando el motivo. Solo un administrador puede desbloquearlo.";
  }
};

const _saveClientDetailOriginalV98 = saveClientDetailV81;
saveClientDetailV81 = function () {
  if (activeClientNit) {
    const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
    if (c) {
      const bloqueadoAntes = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
      const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
      const switchEl = $("modalBloqueoSwitch");
      if (switchEl && !switchEl.disabled) {
        const bloqueadoNuevo = switchEl.checked;
        // Reglas: cualquiera puede pasar de false->true (bloquear).
        // Solo admin puede pasar de true->false (desbloquear).
        const permitido = (!bloqueadoAntes && bloqueadoNuevo) || (bloqueadoAntes && bloqueadoNuevo === false && esAdmin) || (bloqueadoAntes === bloqueadoNuevo);
        if (permitido && bloqueadoAntes !== bloqueadoNuevo) {
          const motivo = $("modalMotivoBloqueoEdit") ? $("modalMotivoBloqueoEdit").value : "";
          c.bloqueado = bloqueadoNuevo;
          c.motivoBloqueo = bloqueadoNuevo ? motivo : "";
          c.estado = bloqueadoNuevo ? "Bloqueado" : (c.estado === "Bloqueado" ? "Activo" : c.estado);
          c.fechaBloqueo = bloqueadoNuevo ? new Date().toLocaleDateString("es-CO") : "";
          c.usuarioBloqueo = bloqueadoNuevo ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
          logEventoV98("bloqueo", c.nit, c.cliente, bloqueadoAntes ? "Bloqueado" : "Activo", bloqueadoNuevo ? `Bloqueado (${motivo || "sin motivo"})` : "Desbloqueado");
        }
      }
      // Canal ya NO se toma del modal (ahora es solo lectura).
    }
  }
  _saveClientDetailOriginalV98();
};

// ------------------------------------------------------------
// 4) Canal solo lectura: quitamos el intento de escritura que
// hacía app.js (modalCanalEdit ya no existe en el HTML nuevo,
// así que las referencias a él simplemente no encuentran el
// elemento y no hacen nada — no se requiere más ajuste aquí).
// ------------------------------------------------------------

// ------------------------------------------------------------
// 3) Bloqueo desde Gestión de clientes (admin)
// ------------------------------------------------------------
const _renderClientsManagementOriginalV98 = renderClientsManagementV93;
renderClientsManagementV93 = function () {
  _renderClientsManagementOriginalV98();
  const body = $("clientsMgmtBody");
  if (!body) return;
  Array.from(body.querySelectorAll("tr")).forEach(tr => {
    const btn = tr.querySelector("[data-reassign-nit]");
    if (!btn || tr.querySelector("[data-toggle-block-nit]")) return;
    const nit = btn.dataset.reassignNit;
    const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
    if (!c) return;
    const bloqueado = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
    const blockBtn = document.createElement("button");
    blockBtn.className = "btn ghost small-btn";
    blockBtn.dataset.toggleBlockNit = c.nit;
    blockBtn.textContent = bloqueado ? "Desbloquear" : "Bloquear";
    blockBtn.style.marginLeft = "6px";
    blockBtn.onclick = () => toggleBloqueoDesdeGestionV98(c.nit);
    btn.parentElement.appendChild(blockBtn);
  });
};

function toggleBloqueoDesdeGestionV98(nit) {
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if (!c) return;
  const bloqueadoAntes = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  if (bloqueadoAntes && !esAdmin) { alert("Solo un administrador puede desbloquear este cliente."); return; }
  let motivo = "";
  if (!bloqueadoAntes) {
    motivo = prompt("Motivo de bloqueo:") || "";
    if (motivo === "") { if (!confirm("¿Bloquear sin motivo especificado?")) return; }
  }
  c.bloqueado = !bloqueadoAntes;
  c.motivoBloqueo = !bloqueadoAntes ? motivo : "";
  c.estado = !bloqueadoAntes ? "Bloqueado" : (c.estado === "Bloqueado" ? "Activo" : c.estado);
  c.fechaBloqueo = !bloqueadoAntes ? new Date().toLocaleDateString("es-CO") : "";
  c.usuarioBloqueo = !bloqueadoAntes ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
  logEventoV98("bloqueo", c.nit, c.cliente, bloqueadoAntes ? "Bloqueado" : "Activo", !bloqueadoAntes ? `Bloqueado (${motivo || "sin motivo"})` : "Desbloqueado");
  saveDataV93();
  renderClientsManagementV93();
}

// ------------------------------------------------------------
// Registrar eventos adicionales: accesos, canales/zonas, ventas
// ------------------------------------------------------------
if (typeof logAccessV84 === "function") {
  const _logAccessOriginalV98 = logAccessV84;
  logAccessV84 = function (user, phone) {
    _logAccessOriginalV98(user, phone);
    logEventoV98("acceso", "", user.name || user.email, "", `Ingreso · ${user.email} · ${user.tier === "superadmin" ? "Super Administrador" : (user.profile === "admin" ? "Administrador" : "Asesor")}`);
  };
}

["createCanalV94", "renameCanalV94", "deleteCanalV94", "createZonaV94", "renameZonaV94", "deleteZonaV94"].forEach(fnName => {
  if (typeof window[fnName] !== "function") return;
  const original = window[fnName];
  window[fnName] = function (...args) {
    const r = original.apply(this, args);
    logEventoV98("canal", "", args[0] || "", "", `${fnName.replace("V94", "")} · ${JSON.stringify(args)}`);
    return r;
  };
});

const _applyDailyFilesOriginalV98 = applyDailyFiles;
applyDailyFiles = async function () {
  const r = await _applyDailyFilesOriginalV98();
  logEventoV98("ventas", "", "", "", `Carga de ventas del día aplicada · ${DATA.meta.ventasOperativasUpdatedAt || ""}`);
  return r;
};

// ------------------------------------------------------------
// 6) Pestaña Log de cambios
// ------------------------------------------------------------
const TIPO_LABELS_V98 = {
  acceso: "Acceso de usuario",
  canal: "Canal / zona",
  transferencia: "Transferencia de asesor",
  bloqueo: "Bloqueo / desbloqueo",
  ventas: "Carga de ventas",
  dato: "Cambio de dato de cliente"
};

function clasificarEventoV98(row) {
  if (["acceso", "canal", "transferencia", "bloqueo", "ventas"].includes(row.campo)) return row.campo;
  if (row.campo === "asesorAsignado") return "transferencia";
  return "dato";
}

// Nombre real de la columna de fecha en historial_cambios. Se
// detecta una sola vez (varía según cómo se creó la tabla en
// Supabase: puede ser "timestamp", "created_at", "inserted_at",
// "fecha", etc.). Si no se puede detectar, se usa null y el log
// se muestra sin filtro de rango ni orden por fecha (con aviso).
let COL_FECHA_LOG_V98 = undefined;

async function detectarColumnaFechaV98() {
  if (COL_FECHA_LOG_V98 !== undefined) return COL_FECHA_LOG_V98;
  const { data, error } = await supabaseClientV94.from("historial_cambios").select("*").limit(1);
  if (error || !data || !data.length) { COL_FECHA_LOG_V98 = null; return null; }
  const candidatos = ["timestamp", "created_at", "inserted_at", "fecha", "fecha_evento", "creado_en", "actualizado_en"];
  const columnas = Object.keys(data[0]);
  const encontrada = candidatos.find(c => columnas.includes(c));
  COL_FECHA_LOG_V98 = encontrada || null;
  return COL_FECHA_LOG_V98;
}

async function cargarLogEventosV98() {
  const dias = Number($("logRangeSelect")?.value || 10);
  const tipoSel = $("logTypeSelect")?.value || "todos";
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const feed = $("logFeed");
  if (feed) feed.innerHTML = '<p style="color:var(--muted)">Cargando eventos…</p>';
  if (typeof supabaseClientV94 === "undefined") {
    if (feed) feed.innerHTML = '<p style="color:var(--muted)">Supabase no está disponible en este momento.</p>';
    return;
  }
  const colFecha = await detectarColumnaFechaV98();
  let data, error, avisoSinFecha = false;
  if (colFecha) {
    ({ data, error } = await supabaseClientV94
      .from("historial_cambios")
      .select("*")
      .gte(colFecha, desde.toISOString())
      .order(colFecha, { ascending: false })
      .limit(1000));
  } else {
    avisoSinFecha = true;
    ({ data, error } = await supabaseClientV94
      .from("historial_cambios")
      .select("*")
      .limit(1000));
  }
  if (error) {
    if (feed) feed.innerHTML = `<p style="color:#dc2626">Error cargando el log: ${esc(error.message)}</p><p style="color:var(--muted);font-size:12px">Columna de fecha usada: ${esc(colFecha || "ninguna detectada")}. Revisa el nombre real de la columna en Supabase (tabla historial_cambios) y avísame para ajustarlo.</p>`;
    return;
  }
  let rows = data || [];
  rows = rows.map(r => ({ ...r, _tipo: clasificarEventoV98(r), _fecha: colFecha ? r[colFecha] : null }));
  if (tipoSel !== "todos") rows = rows.filter(r => r._tipo === tipoSel);
  window._logRowsV98 = rows;
  if ($("logCount")) $("logCount").textContent = `${rows.length} eventos` + (avisoSinFecha ? " · sin columna de fecha detectada, mostrando los más recientes disponibles sin filtrar por rango" : "");
  if (!feed) return;
  if (!rows.length) { feed.innerHTML = '<p style="color:var(--muted)">Sin eventos en el rango seleccionado.</p>'; return; }
  feed.innerHTML = rows.map(r => {
    const fecha = r._fecha ? new Date(r._fecha).toLocaleString("es-CO") : "(sin fecha)";
    const entidad = r.cliente_nombre ? ` · ${esc(r.cliente_nombre)}${r.cliente_nit ? " (" + esc(r.cliente_nit) + ")" : ""}` : "";
    const detalle = r.campo === r._tipo
      ? esc(r.valor_nuevo || "")
      : `${esc(r.campo)}: "${esc(r.valor_anterior || "")}" → "${esc(r.valor_nuevo || "")}"`;
    return `<div class="log-item tipo-${r._tipo}">
      <div class="log-meta">${fecha} · ${esc(TIPO_LABELS_V98[r._tipo] || r._tipo)} · ${esc(r.usuario_email || "usuario")}</div>
      <div>${detalle}${entidad}</div>
    </div>`;
  }).join("");
}

function exportarLogAExcelV98() {
  const rows = window._logRowsV98 || [];
  if (!rows.length) { alert("No hay eventos cargados para exportar."); return; }
  const data = rows.map(r => ({
    Fecha: r._fecha ? new Date(r._fecha).toLocaleString("es-CO") : "",
    Tipo: TIPO_LABELS_V98[r._tipo] || r._tipo,
    Usuario: r.usuario_email || "",
    Cliente: r.cliente_nombre || "",
    NIT: r.cliente_nit || "",
    Campo: r.campo || "",
    "Valor anterior": r.valor_anterior || "",
    "Valor nuevo": r.valor_nuevo || ""
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Log de cambios");
  XLSX.writeFile(wb, `log_cambios_radar_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function showLogViewV98() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const lv = $("logView");
  if (lv) lv.classList.remove("hidden-view");
  const cv = $("clientsManagementView"); if (cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if (av) av.classList.add("hidden-view");
  if ($("navLog")) $("navLog").classList.add("active");
  cargarLogEventosV98();
}

// Aseguramos que logView también se oculte cuando se navega a
// cualquier otra pestaña (Hoja de ruta, Dashboard, Glosario, etc.)
if (typeof hideAllPrimaryViewsV93 === "function") {
  const _hideAllOriginalV98 = hideAllPrimaryViewsV93;
  hideAllPrimaryViewsV93 = function () {
    _hideAllOriginalV98();
    const lv = $("logView"); if (lv) lv.classList.add("hidden-view");
  };
}
[
  ["navRoute", () => showViewV812 && showViewV812("route")],
  ["navUpdate", () => showViewV812 && showViewV812("route")],
  ["navDashboard", () => showViewV812 && showViewV812("dashboard")],
  ["navClients", () => showClientsManagementV93 && showClientsManagementV93()],
  ["navAdvisors", () => showAdvisorsManagementV93 && showAdvisorsManagementV93()],
  ["navGlossary", () => showGlossaryV814 && showGlossaryV814()]
].forEach(([id]) => {
  const el = $(id);
  if (el) el.addEventListener("click", () => { const lv = $("logView"); if (lv) lv.classList.add("hidden-view"); });
});

document.addEventListener("DOMContentLoaded", () => {
  if ($("navLog")) $("navLog").addEventListener("click", showLogViewV98);
  if ($("logRefreshBtn")) $("logRefreshBtn").addEventListener("click", cargarLogEventosV98);
  if ($("logRangeSelect")) $("logRangeSelect").addEventListener("change", cargarLogEventosV98);
  if ($("logTypeSelect")) $("logTypeSelect").addEventListener("change", cargarLogEventosV98);
  if ($("logExportBtn")) $("logExportBtn").addEventListener("click", exportarLogAExcelV98);

  // Solo administradores ven la pestaña de Log de cambios.
  const checarVisibilidadLog = () => {
    const el = $("navLog");
    if (el) el.style.display = (typeof isAdminV86 === "function" && isAdminV86()) ? "" : "none";
  };
  checarVisibilidadLog();
  const _applyUserProfileOriginalV98 = applyUserProfileV84;
  if (typeof _applyUserProfileOriginalV98 === "function") {
    applyUserProfileV84 = function () {
      _applyUserProfileOriginalV98();
      checarVisibilidadLog();
    };
  }
});
