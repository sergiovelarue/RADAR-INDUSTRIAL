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

// ------------------------------------------------------------
// Mejora: los clientes bloqueados ahora son visibles para
// cualquier perfil (asesor y administradores) como un estado más
// de la Hoja de Ruta — ya no se ocultan ni se restringen a un
// filtro especial solo-admin. En cambio, se excluyen de las
// cuentas de venta/meta/cumplimiento (KPIs), no de la visibilidad.
// Por eso se reemplaza filteredBase por completo en vez de
// envolver la versión anterior (que traía ese ocultamiento).
// ------------------------------------------------------------
filteredBase = function () {
  const q = String(state.search || "").toLowerCase().trim();
  return DATA.clientes.filter(c => {
    if (typeof businessMatchV810 === "function" && !businessMatchV810(c)) return false;
    if (state.profile === "admin") {
      if (state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    } else if (state.profile) {
      if (c.asesorAsignado !== state.profile) return false;
    }
    if (state.status !== "todos" && c.estado !== state.status) return false;
    if (state.classFilter && state.classFilter !== "todos" && (c.clasificacion || "N") !== state.classFilter) return false;
    if (q && ![c.cliente, c.nit, c.asesorAsignado, c.ciudad, c.departamento, c.tipoCliente, c.canal].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
};

// KPIs: excluyen del cálculo monetario (venta, meta, cumplimiento,
// faltante) a los clientes bloqueados. El conteo de "Clientes" sí
// incluye a los bloqueados, porque refleja lo que se ve en la tabla.
renderKpis = function (arr) {
  const blocked = c => (typeof isBlockedV87 === "function" ? isBlockedV87(c) : false);
  const arrPresupuesto = arr.filter(c => !blocked(c));
  const venta = arrPresupuesto.reduce((s, c) => s + saleCurrent(c), 0);
  const prev = arrPresupuesto.reduce((s, c) => s + salePrev(c), 0);
  const meta = arrPresupuesto.reduce((s, c) => s + goal(c), 0);
  const falt = Math.max(meta - venta, 0);
  if ($("kClients")) $("kClients").textContent = arr.length.toLocaleString("es-CO");
  if ($("kCurrentSale")) $("kCurrentSale").textContent = money(venta);
  if ($("kPrevSale")) $("kPrevSale").textContent = money(prev);
  if ($("kGoal")) $("kGoal").textContent = money(meta);
  if ($("kCompliance")) $("kCompliance").textContent = meta ? pct(venta / meta * 100) : "0%";
  if ($("kMissing")) $("kMissing").textContent = money(falt);
  if ($("kClientsSub")) $("kClientsSub").textContent = businessLabel();
  if ($("kCurrentSaleSub")) $("kCurrentSaleSub").textContent = (typeof selectedMonthV810 === "function") ? selectedMonthV810() : "";
  const m = (typeof selectedMonthV810 === "function") ? selectedMonthV810() : null;
  if (m && typeof totalMonth2026V810 === "function") {
    if ($("bEspActual")) $("bEspActual").textContent = money(arrPresupuesto.reduce((s, c) => s + totalMonth2026V810(c, m, "espumas"), 0));
    if ($("bColActual")) $("bColActual").textContent = money(arrPresupuesto.reduce((s, c) => s + totalMonth2026V810(c, m, "colchones"), 0));
    if ($("bEsp2025")) $("bEsp2025").textContent = "2025: " + money(arrPresupuesto.reduce((s, c) => s + totalMonth2025V810(c, m, "espumas"), 0));
    if ($("bCol2025")) $("bCol2025").textContent = "2025: " + money(arrPresupuesto.reduce((s, c) => s + totalMonth2025V810(c, m, "colchones"), 0));
  }
};

// ------------------------------------------------------------
// 3) Quitar el filtrado por VIP Gerencia (la función se elimina
// del flujo de negocio; ya no oculta clientes a nadie).
// ------------------------------------------------------------
if (typeof isVipGerenciaV88 === "function") {
  isVipGerenciaV88 = function () { return false; };
}

// ------------------------------------------------------------
// Helper de UI: pinta el pill Activo/Bloqueado y sincroniza el
// campo de motivo con el switch (obligatorio solo si se bloquea),
// tanto al abrir el modal como mientras el usuario mueve el switch.
// ------------------------------------------------------------
function actualizarUiBloqueoV99(prefijo, esAdmin, bloqueadoOriginal) {
  const switchEl = $(prefijo + "BloqueoSwitch");
  const pill = $(prefijo === "modal" ? "blockStatusPill" : "editBlockStatusPill");
  const motivoLabel = $(prefijo === "modal" ? "motivoBloqueoLabel" : "editMotivoBloqueoLabel");
  const motivoSelect = $(prefijo === "modal" ? "modalMotivoBloqueoEdit" : "editMotivoBloqueoSelect");
  if (!switchEl) return;
  const marcado = switchEl.checked;
  if (pill) {
    pill.textContent = marcado ? "Bloqueado" : "Activo";
    pill.classList.toggle("blocked", marcado);
  }
  if (motivoSelect) {
    // El motivo solo tiene sentido si el switch está marcado (bloqueando).
    motivoSelect.disabled = !marcado || (bloqueadoOriginal && !esAdmin);
  }
  if (motivoLabel) motivoLabel.classList.toggle("attention", marcado && motivoSelect && !motivoSelect.value);
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

  // Canal: solo lectura
  if ($("modalCanalView")) $("modalCanalView").value = c.canal || "Sin canal asignado";

  const bloqueado = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;

  if ($("modalBloqueoSwitch")) {
    $("modalBloqueoSwitch").checked = bloqueado;
    $("modalBloqueoSwitch").disabled = bloqueado && !esAdmin;
    $("modalBloqueoSwitch").onchange = () => actualizarUiBloqueoV99("modal", esAdmin, bloqueado);
  }
  if ($("modalMotivoBloqueoEdit")) {
    $("modalMotivoBloqueoEdit").value = c.motivoBloqueo || "";
  }
  actualizarUiBloqueoV99("modal", esAdmin, bloqueado);
  if ($("blockHelp")) {
    $("blockHelp").textContent = bloqueado
      ? (esAdmin ? "Está bloqueado. Puedes desbloquearlo desde aquí." : "Está bloqueado. Solo un administrador puede desbloquearlo.")
      : "Cualquier usuario puede bloquear un cliente indicando el motivo. Solo un administrador puede desbloquearlo.";
  }

  // ----------------------------------------------------------
  // Punto 1: Datos maestros de solo lectura en esta vista.
  // Única excepción (Punto 2): un asesor (no admin) puede escribir
  // la razón social UNA sola vez, si el cliente que tiene asignado
  // todavía no tiene nombre (típico de un cliente recién transferido).
  // ----------------------------------------------------------
  const sinNombre = !c.cliente || !String(c.cliente).trim() || String(c.cliente).startsWith("Cliente ");
  const esSuAsesor = typeof currentUserV84 !== "undefined" && currentUserV84 && c.asesorAsignado === currentUserV84.advisor;
  const puedeNombrarPorPrimeraVez = !esAdmin && esSuAsesor && sinNombre;

  if ($("modalClienteEdit")) $("modalClienteEdit").disabled = !puedeNombrarPorPrimeraVez;
  if ($("modalAsesorEdit")) $("modalAsesorEdit").disabled = true; // la reasignación ya no se hace desde aquí
  if ($("modalAsesorZonaInfo")) {
    const zona = (typeof zonaOfAdvisorV94 === "function") ? zonaOfAdvisorV94(c.asesorAsignado) : "";
    $("modalAsesorZonaInfo").textContent = zona ? `Zona del asesor asignado: ${zona}` : "";
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
        const permitido = (!bloqueadoAntes && bloqueadoNuevo) || (bloqueadoAntes && bloqueadoNuevo === false && esAdmin) || (bloqueadoAntes === bloqueadoNuevo);
        if (permitido && bloqueadoAntes !== bloqueadoNuevo) {
          const motivo = $("modalMotivoBloqueoEdit") ? $("modalMotivoBloqueoEdit").value : "";
          if (bloqueadoNuevo && !motivo) {
            alert("Para bloquear este cliente debes seleccionar un motivo de bloqueo.");
            return;
          }
          c.bloqueado = bloqueadoNuevo;
          c.motivoBloqueo = bloqueadoNuevo ? motivo : "";
          c.estado = bloqueadoNuevo ? "Bloqueado" : (c.estado === "Bloqueado" ? "Activo" : c.estado);
          c.fechaBloqueo = bloqueadoNuevo ? new Date().toLocaleDateString("es-CO") : "";
          c.usuarioBloqueo = bloqueadoNuevo ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
          logEventoV98("bloqueo", c.nit, c.cliente, bloqueadoAntes ? "Bloqueado" : "Activo", bloqueadoNuevo ? `Bloqueado (${motivo || "sin motivo"})` : "Desbloqueado");
        }
      }
      // Nota: el nombre SÍ puede guardarse aquí en el caso excepcional
      // (campo habilitado por openClientDetailV81 arriba); esa parte la
      // sigue manejando la capa original de app.js, que ya compara y
      // guarda modalClienteEdit cuando el campo no está deshabilitado.
      // Asesor y Canal ya no se leen ni se escriben desde este modal.
    }
  }
  _saveClientDetailOriginalV98();
};

// ------------------------------------------------------------
// Punto 2: en Gestión de clientes, "Reasignar" pasa a llamarse
// "Editar" y su modal ahora permite: razón social, asesor y
// bloqueo/desbloqueo (aquí siempre es un administrador, así que
// puede tanto bloquear como desbloquear).
// ------------------------------------------------------------
const _renderClientsManagementOriginalV98 = renderClientsManagementV93;
renderClientsManagementV93 = function () {
  _renderClientsManagementOriginalV98();
  const body = $("clientsMgmtBody");
  if (!body) return;
  body.querySelectorAll("[data-reassign-nit]").forEach(btn => { btn.textContent = "Editar"; });
};

const _openReassignModalOriginalV98 = openReassignModalV93;
openReassignModalV93 = function (nit) {
  _openReassignModalOriginalV98(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if (!c) return;
  if ($("editClienteNombreInput")) $("editClienteNombreInput").value = c.cliente || "";
  const bloqueado = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
  if ($("editBloqueoSwitch")) {
    $("editBloqueoSwitch").checked = bloqueado;
    $("editBloqueoSwitch").onchange = () => actualizarUiBloqueoV99("edit", true, bloqueado);
  }
  if ($("editMotivoBloqueoSelect")) $("editMotivoBloqueoSelect").value = c.motivoBloqueo || "";
  actualizarUiBloqueoV99("edit", true, bloqueado);
};

const _confirmReassignOriginalV98 = confirmReassignV93;
confirmReassignV93 = function () {
  if (!reassignStateV93.nit) { _confirmReassignOriginalV98(); return; }
  const c = DATA.clientes.find(x => cleanNit(x.nit) === reassignStateV93.nit);
  let huboCambioExtra = false;
  if (c) {
    const bloqueadoAntes = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
    const bloqueadoNuevo = !!$("editBloqueoSwitch")?.checked;
    const motivo = $("editMotivoBloqueoSelect")?.value || "";
    if (bloqueadoNuevo && !motivo) {
      alert("Para bloquear este cliente debes seleccionar un motivo de bloqueo.");
      return;
    }
    const nuevoNombre = ($("editClienteNombreInput")?.value || "").trim();
    if (nuevoNombre && nuevoNombre !== (c.cliente || "")) {
      if (typeof logMasterChangeV86 === "function") logMasterChangeV86(c.nit, c.cliente, "cliente", c.cliente, nuevoNombre);
      c.cliente = nuevoNombre;
      huboCambioExtra = true;
    }
    if (bloqueadoAntes !== bloqueadoNuevo) {
      c.bloqueado = bloqueadoNuevo;
      c.motivoBloqueo = bloqueadoNuevo ? motivo : "";
      c.estado = bloqueadoNuevo ? "Bloqueado" : (c.estado === "Bloqueado" ? "Activo" : c.estado);
      c.fechaBloqueo = bloqueadoNuevo ? new Date().toLocaleDateString("es-CO") : "";
      c.usuarioBloqueo = bloqueadoNuevo ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
      logEventoV98("bloqueo", c.nit, c.cliente, bloqueadoAntes ? "Bloqueado" : "Activo", bloqueadoNuevo ? `Bloqueado (${motivo || "sin motivo"})` : "Desbloqueado");
      huboCambioExtra = true;
    }
  }
  _confirmReassignOriginalV98(); // maneja reasignación de asesor (si cambió), cierre de modal y su propio refresco
  if (huboCambioExtra) {
    saveDataV93();
    renderClientsManagementV93();
    render();
  }
};

// ------------------------------------------------------------
// Punto 3: botón de actualización manual (sin salir/entrar),
// clave para uso desde celular.
// ------------------------------------------------------------
// Marca visualmente (opacidad + texto rojo) las filas de clientes
// bloqueados en la Hoja de Ruta, ya que ahora son visibles junto
// al resto en vez de estar ocultas.
const _renderTableOriginalV99 = renderTable;
renderTable = function (arr) {
  _renderTableOriginalV99(arr);
  const tbody = $("routeBody");
  if (!tbody) return;
  Array.from(tbody.querySelectorAll("tr")).forEach(tr => {
    const estadoCell = tr.querySelector('[data-label="Estado"]');
    if (estadoCell && estadoCell.textContent.trim() === "Bloqueado") tr.classList.add("blocked-row");
  });
};

async function actualizarDatosManualV98() {
  const btn = $("refreshDataBtn");
  if (!btn) return;
  const textoOriginal = "↻ Actualizar datos";
  btn.disabled = true;
  btn.textContent = "Actualizando…";
  try {
    const [okClientes, okConfig] = await Promise.all([
      typeof cargarClientesDesdeSupabaseV94 === "function" ? cargarClientesDesdeSupabaseV94() : Promise.resolve(false),
      typeof cargarConfiguracionDesdeSupabaseV97 === "function" ? cargarConfiguracionDesdeSupabaseV97() : Promise.resolve(false)
    ]);
    if (typeof ensureAsesorPerfilesV93 === "function") ensureAsesorPerfilesV93();
    if (typeof ensureCanalCatalogV94 === "function") ensureCanalCatalogV94();
    if (typeof fillAdvisorFilter === "function") fillAdvisorFilter();
    render();
    btn.textContent = (okClientes || okConfig) ? "✓ Datos actualizados" : "Sin datos nuevos";
  } catch (e) {
    console.error("[Radar] Error actualizando manualmente:", e);
    btn.textContent = "Error al actualizar";
  } finally {
    setTimeout(() => { btn.textContent = textoOriginal; btn.disabled = false; }, 1800);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("refreshDataBtn")) $("refreshDataBtn").addEventListener("click", actualizarDatosManualV98);
});

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
