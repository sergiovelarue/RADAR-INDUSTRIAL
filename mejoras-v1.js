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
// Dirección completa (departamento/ciudad/dirección), con enlaces
// directos a Google Maps y Waze; y hasta 5 contactos por cliente
// (nombre, cargo, teléfono, correo) con enlaces de llamar/escribir.
// ------------------------------------------------------------
function fillDeptSelectGenV103(selId, selectedDep) {
  const sel = $(selId);
  if (!sel || typeof GEO_CATALOG_V87 === "undefined") return;
  sel.innerHTML = '<option value="">Seleccionar departamento</option>';
  Object.keys(GEO_CATALOG_V87).sort().forEach(dep => {
    const op = document.createElement("option"); op.value = dep; op.textContent = dep; sel.appendChild(op);
  });
  sel.value = selectedDep || "";
}
function fillCitySelectGenV103(selId, dep, selectedCity) {
  const sel = $(selId);
  if (!sel || typeof GEO_CATALOG_V87 === "undefined") return;
  sel.innerHTML = '<option value="">Seleccionar ciudad / municipio</option>';
  (GEO_CATALOG_V87[dep] || []).forEach(city => {
    const op = document.createElement("option"); op.value = city; op.textContent = city; sel.appendChild(op);
  });
  sel.value = selectedCity || "";
}

function actualizarAccionesDireccionV103(c) {
  const wrap = $("modalDireccionAcciones");
  if (!wrap) return;
  const partes = [c.direccion, c.ciudad, c.departamento].filter(Boolean);
  if (!partes.length) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const q = encodeURIComponent(partes.join(", ") + ", Colombia");
  if ($("modalDireccionMaps")) $("modalDireccionMaps").href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if ($("modalDireccionWaze")) $("modalDireccionWaze").href = `https://waze.com/ul?q=${q}&navigate=yes`;
}

function contactoCardHtmlV103(ct, i, opts) {
  const tel = String(ct.telefono || "").replace(/[^\d+]/g, "");
  const mail = ct.correo || "";
  return `<div class="contact-card">
    <div class="contact-grid">
      <label>Nombre completo<input type="text" data-c-nombre value="${esc(ct.nombre || "")}"/></label>
      <label>Cargo<input type="text" data-c-cargo value="${esc(ct.cargo || "")}"/></label>
      <label>Teléfono<input type="text" data-c-telefono value="${esc(ct.telefono || "")}"/></label>
      <label>Correo<input type="email" data-c-correo value="${esc(ct.correo || "")}"/></label>
    </div>
    <div class="contact-actions">
      ${tel ? `<a href="tel:${esc(tel)}">📞 Llamar</a>` : ""}
      ${mail ? `<a href="mailto:${esc(mail)}">✉️ Correo</a>` : ""}
      ${opts.puedeEliminar ? `<button type="button" class="contact-remove" data-remove-contacto="${i}">Eliminar</button>` : ""}
    </div>
  </div>`;
}

function renderContactosV103(containerId, contactos, opts) {
  const cont = $(containerId);
  if (!cont) return;
  const lista = (contactos || []).slice(0, 5);
  cont.innerHTML = lista.length
    ? lista.map((ct, i) => contactoCardHtmlV103(ct, i, opts)).join("")
    : '<p class="contact-empty-msg">Sin contactos registrados.</p>';
  cont.querySelectorAll("[data-remove-contacto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeContacto);
      const actuales = leerContactosDesdeUIV103(containerId);
      actuales.splice(idx, 1);
      renderContactosV103(containerId, actuales, opts);
    });
  });
}

function leerContactosDesdeUIV103(containerId) {
  const cont = $(containerId);
  if (!cont) return [];
  return Array.from(cont.querySelectorAll(".contact-card")).map(card => ({
    nombre: card.querySelector("[data-c-nombre]")?.value.trim() || "",
    cargo: card.querySelector("[data-c-cargo]")?.value.trim() || "",
    telefono: card.querySelector("[data-c-telefono]")?.value.trim() || "",
    correo: card.querySelector("[data-c-correo]")?.value.trim() || ""
  })).filter(ct => ct.nombre || ct.cargo || ct.telefono || ct.correo);
}

function agregarContactoVacioV103(containerId, opts) {
  const actuales = leerContactosDesdeUIV103(containerId);
  if (actuales.length >= 5) { alert("Ya hay 5 contactos registrados — ese es el máximo permitido por cliente."); return; }
  actuales.push({ nombre: "", cargo: "", telefono: "", correo: "" });
  renderContactosV103(containerId, actuales, opts);
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("modalAddContactoBtn")) $("modalAddContactoBtn").addEventListener("click", () => agregarContactoVacioV103("modalContactosList", { puedeEliminar: false }));
  if ($("editAddContactoBtn")) $("editAddContactoBtn").addEventListener("click", () => agregarContactoVacioV103("editContactosList", { puedeEliminar: true }));
});

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

  // ----------------------------------------------------------
  // Mejora: Departamento, Ciudad y Dirección vienen normalmente
  // de los datos maestros (carga masiva). Si faltan, el asesor
  // asignado los puede completar aquí mismo (misma lógica que la
  // razón social: solo si está vacío, y solo su propio asesor).
  // ----------------------------------------------------------
  const puedeCompletarUbicacion = !esAdmin && esSuAsesor;
  if (typeof fillDepartmentSelectV87 === "function") fillDepartmentSelectV87(c.departamento || "");
  if (typeof fillCitySelectV87 === "function") fillCitySelectV87(c.departamento || "", c.ciudad || "");
  if ($("modalDepartamentoEdit")) {
    $("modalDepartamentoEdit").disabled = !(puedeCompletarUbicacion && !c.departamento);
    $("modalDepartamentoEdit").onchange = e => { if (typeof fillCitySelectV87 === "function") fillCitySelectV87(e.target.value, ""); };
  }
  if ($("modalCiudadEdit")) $("modalCiudadEdit").disabled = !(puedeCompletarUbicacion && !c.ciudad);
  if ($("modalDireccionEdit")) {
    $("modalDireccionEdit").value = c.direccion || "";
    $("modalDireccionEdit").disabled = !(puedeCompletarUbicacion && !c.direccion);
  }
  actualizarAccionesDireccionV103(c);

  // Contactos: el asesor puede agregar/editar (hasta 5), pero no eliminar.
  renderContactosV103("modalContactosList", c.contactos || [], { puedeEliminar: false });
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

      if ($("modalDepartamentoEdit") && !$("modalDepartamentoEdit").disabled) {
        const v = $("modalDepartamentoEdit").value.trim();
        if (v && v !== (c.departamento || "")) { logMasterChangeV86(c.nit, c.cliente, "departamento", c.departamento, v); c.departamento = v; }
      }
      if ($("modalCiudadEdit") && !$("modalCiudadEdit").disabled) {
        const v = $("modalCiudadEdit").value.trim();
        if (v && v !== (c.ciudad || "")) { logMasterChangeV86(c.nit, c.cliente, "ciudad", c.ciudad, v); c.ciudad = v; }
      }
      if ($("modalDireccionEdit") && !$("modalDireccionEdit").disabled) {
        const v = $("modalDireccionEdit").value.trim();
        if (v && v !== (c.direccion || "")) { logMasterChangeV86(c.nit, c.cliente, "direccion", c.direccion, v); c.direccion = v; }
      }
      const nuevosContactos = leerContactosDesdeUIV103("modalContactosList");
      if (JSON.stringify(nuevosContactos) !== JSON.stringify(c.contactos || [])) {
        c.contactos = nuevosContactos;
        logEventoV98("dato", c.nit, c.cliente, "", "Contactos actualizados");
      }
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

  // Departamento / Ciudad / Dirección / Contactos (admin: control total)
  fillDeptSelectGenV103("editDepartamentoSelect", c.departamento || "");
  fillCitySelectGenV103("editCiudadSelect", c.departamento || "", c.ciudad || "");
  if ($("editDepartamentoSelect")) $("editDepartamentoSelect").onchange = e => fillCitySelectGenV103("editCiudadSelect", e.target.value, "");
  if ($("editDireccionInput")) $("editDireccionInput").value = c.direccion || "";
  renderContactosV103("editContactosList", c.contactos || [], { puedeEliminar: true });
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

    const nuevoDep = $("editDepartamentoSelect")?.value.trim() || "";
    if (nuevoDep !== (c.departamento || "")) {
      logMasterChangeV86(c.nit, c.cliente, "departamento", c.departamento, nuevoDep);
      c.departamento = nuevoDep;
      huboCambioExtra = true;
    }
    const nuevaCiudad = $("editCiudadSelect")?.value.trim() || "";
    if (nuevaCiudad !== (c.ciudad || "")) {
      logMasterChangeV86(c.nit, c.cliente, "ciudad", c.ciudad, nuevaCiudad);
      c.ciudad = nuevaCiudad;
      huboCambioExtra = true;
    }
    const nuevaDireccion = $("editDireccionInput")?.value.trim() || "";
    if (nuevaDireccion !== (c.direccion || "")) {
      logMasterChangeV86(c.nit, c.cliente, "direccion", c.direccion, nuevaDireccion);
      c.direccion = nuevaDireccion;
      huboCambioExtra = true;
    }
    const nuevosContactos = leerContactosDesdeUIV103("editContactosList");
    if (JSON.stringify(nuevosContactos) !== JSON.stringify(c.contactos || [])) {
      c.contactos = nuevosContactos;
      logEventoV98("dato", c.nit, c.cliente, "", "Contactos actualizados (administrador)");
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

// ------------------------------------------------------------
// Lee la clave "mesOperativo" de la tabla configuracion (la
// escribe/actualiza el simulador diario en Supabase cada vez que
// corre) y la aplica a DATA.meta, para que la app reconozca que
// el mes en curso ya tiene ventas cargadas y deje de mostrarlo
// como "aún no existe".
const _cargarConfigOriginalV101 = cargarConfiguracionDesdeSupabaseV97;
cargarConfiguracionDesdeSupabaseV97 = async function () {
  const r = await _cargarConfigOriginalV101();
  try {
    const { data, error } = await supabaseClientV94.from("configuracion").select("clave, valor").eq("clave", "mesOperativo").maybeSingle();
    if (!error && data && data.valor) {
      if (data.valor.latestOperationalMonth2026) DATA.meta.latestOperationalMonth2026 = data.valor.latestOperationalMonth2026;
      if (data.valor.currentMonthName) DATA.meta.currentMonthName = data.valor.currentMonthName;
    }
  } catch (e) {
    console.error("[Radar] Error cargando mesOperativo:", e);
  }
  return r;
};

// ------------------------------------------------------------
// El Dashboard (Director/Gerencial) no filtraba por asesor: un
// asesor entrando ahí veía la venta y el ranking de TODA la
// empresa, incluyendo a los demás asesores. directorClientsV813()
// es la función base que alimenta todos los gráficos e insights
// del Dashboard (venta, pareto, ranking de asesores, salud de
// cartera, evolución por clasificación) — filtrándola aquí se
// corrige de una sola vez en todas partes.
const _directorClientsOriginalV102 = directorClientsV813;
directorClientsV813 = function () {
  const base = _directorClientsOriginalV102();
  if (state.profile === "admin") return base;
  if (!state.profile) return base;
  return base.filter(c => c.asesorAsignado === state.profile);
};

// El nav de "Actualización diaria", "Gestión de clientes" y
// "Gestión de asesores" son funciones exclusivas de administrador
// (ya estaban bloqueadas por código), pero el enlace seguía
// visible para asesores aunque no llevara a ningún lado. Se oculta
// para que la barra lateral solo muestre lo que sí pueden usar.
function ocultarNavAdminV102() {
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  ["navUpdate", "navClients", "navAdvisors"].forEach(id => {
    const el = $(id);
    if (el) el.style.display = esAdmin ? "" : "none";
  });
}
document.addEventListener("DOMContentLoaded", () => {
  ocultarNavAdminV102();
  const _applyUserProfileOriginalV102 = applyUserProfileV84;
  if (typeof _applyUserProfileOriginalV102 === "function") {
    applyUserProfileV84 = function () {
      _applyUserProfileOriginalV102();
      ocultarNavAdminV102();
    };
  }
});

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

  // Corrige un bug de app.js: el listener de arranque
  // (document.addEventListener("DOMContentLoaded", init)) capturó
  // la versión ORIGINAL de init() antes de que el resto del
  // archivo la fuera mejorando con "init = function(){...}".
  // Esas mejoras posteriores (que forzaban el mes real del
  // calendario) nunca se ejecutan. Lo forzamos aquí directamente.
  if (typeof realCurrentMonthV810 === "function") {
    state.month = realCurrentMonthV810();
    if ($("monthSelect")) $("monthSelect").value = state.month;
    render();
  }
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

// ------------------------------------------------------------
// Seguimiento diario / prioridades
// ------------------------------------------------------------
// Utilidades de fecha. Todo se calcula a partir de new Date()
// (fecha real del dispositivo/navegador), igual que el resto de
// la app (ver todayBadgeV89), para que "semana actual" siempre
// refleje el día real, sin depender de datos guardados.
function parseFechaLocalV100(str) {
  if (!str) return null;
  const partes = String(str).split("-");
  if (partes.length !== 3) return null;
  const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function inicioDelDiaV100(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function finDelDiaV100(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function lunesDeSemanaV100(d, offsetSemanas) {
  const x = inicioDelDiaV100(d);
  const dia = x.getDay(); // 0=domingo..6=sábado
  const diffALunes = (dia === 0 ? -6 : 1 - dia);
  x.setDate(x.getDate() + diffALunes + offsetSemanas * 7);
  return x;
}
function rangoSemanaV100(offsetSemanas) {
  const hoy = new Date();
  const inicio = lunesDeSemanaV100(hoy, offsetSemanas);
  const fin = finDelDiaV100(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6));
  return { inicio, fin };
}

// Genera y descarga un archivo .ics para una acción de seguimiento.
// El .ics es el formato universal de evento de calendario: en
// celular (iPhone/Android) el sistema lo reconoce al descargarlo y
// ofrece agregarlo directo al calendario nativo (Apple Calendar,
// Google Calendar, Samsung Calendar, etc.), sin depender de qué app
// tenga instalada el asesor ni de abrir el navegador. También
// funciona en Outlook/escritorio.
//
// La app no captura hora, así que se asume un horario genérico
// (9:00–10:00am, hora Colombia = UTC-5 fijo, sin horario de verano)
// para que la acción quede como una cita real y no de todo el día;
// el asesor la reubica en su calendario si necesita otro horario.
function icsEscapeV103(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function descargarICSAccionV103(c, fecha) {
  const HORA_INICIO_V103 = 9; // 9:00am hora Colombia
  const DURACION_HORAS_V103 = 1;
  const OFFSET_COLOMBIA_V103 = 5; // Colombia es UTC-5 todo el año (no aplica horario de verano)
  const pad = n => String(n).padStart(2, "0");

  // Convierte "fecha (día) + hora local Colombia" a UTC, restando el offset,
  // y lo formatea como YYYYMMDDTHHMMSSZ (formato .ics en UTC).
  const aUtcIcsV103 = (d, horaLocal) => {
    const utcMs = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), horaLocal + OFFSET_COLOMBIA_V103, 0, 0);
    const u = new Date(utcMs);
    return `${u.getUTCFullYear()}${pad(u.getUTCMonth() + 1)}${pad(u.getUTCDate())}T${pad(u.getUTCHours())}${pad(u.getUTCMinutes())}00Z`;
  };

  const dtStart = aUtcIcsV103(fecha, HORA_INICIO_V103);
  const dtEnd = aUtcIcsV103(fecha, HORA_INICIO_V103 + DURACION_HORAS_V103);
  const dtStamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const uid = `radar-${cleanNit(c.nit)}-${dtStart}@radarcomercial`;

  const titulo = `${c.proximaAccion || "Seguimiento"} - ${c.cliente || "Cliente sin nombre"}`;
  const detalles = [
    `Cliente: ${c.cliente || "—"} (NIT ${c.nit || "—"})`,
    `Asesor: ${c.asesorAsignado || "SIN ASIGNACION"}`,
    c.comentario ? `Comentario: ${c.comentario}` : null,
    "",
    "Hora sugerida automáticamente (9:00-10:00am). Ajusta el horario según tu disponibilidad real.",
    "Generado desde Radar Comercial Industria."
  ].filter(Boolean).join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Radar Comercial Industria//ConAccion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${icsEscapeV103(titulo)}`,
    `DESCRIPTION:${icsEscapeV103(detalles)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `seguimiento-${cleanNit(c.nit)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function seguimientosVisiblesV100() {
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  const asesorSel = $("seguimientoAsesorSelect")?.value || "todos";
  return (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false; // no aporta a la operación diaria
    if (!c.fechaSeguimiento) return false;
    if (esAdmin) {
      if (asesorSel !== "todos" && c.asesorAsignado !== asesorSel) return false;
    } else {
      if (typeof currentUserV84 === "undefined" || !currentUserV84 || c.asesorAsignado !== currentUserV84.advisor) return false;
    }
    return true;
  });
}

function renderSeguimientoView() {
  const feed = $("seguimientoFeed");
  if (!feed) return;
  const rango = $("seguimientoRangoSelect")?.value || "actual";
  const ocultarEjecutadas = !!$("seguimientoOcultarEjecutadas")?.checked;
  const hoy = inicioDelDiaV100(new Date());

  let desde, hasta, soloVencidasSinEjecutar = false;
  if (rango === "vencidas") {
    soloVencidasSinEjecutar = true;
    hasta = finDelDiaV100(new Date(lunesDeSemanaV100(new Date(), 0).getTime() - 1));
  } else if (rango === "pasada") {
    ({ inicio: desde, fin: hasta } = rangoSemanaV100(-1));
  } else if (rango === "siguiente") {
    ({ inicio: desde, fin: hasta } = rangoSemanaV100(1));
  } else if (rango === "todas") {
    desde = rangoSemanaV100(-1).inicio;
    hasta = rangoSemanaV100(1).fin;
  } else {
    ({ inicio: desde, fin: hasta } = rangoSemanaV100(0));
  }

  let items = seguimientosVisiblesV100().map(c => ({ c, fecha: parseFechaLocalV100(c.fechaSeguimiento) })).filter(x => x.fecha);
  if (soloVencidasSinEjecutar) {
    items = items.filter(x => x.fecha <= hasta && !x.c.seguimientoEjecutado);
  } else {
    items = items.filter(x => x.fecha >= desde && x.fecha <= hasta);
    if (ocultarEjecutadas) items = items.filter(x => !x.c.seguimientoEjecutado);
  }
  items.sort((a, b) => a.fecha - b.fecha);

  if ($("seguimientoCount")) $("seguimientoCount").textContent = `${items.length} acciones`;
  if (!items.length) { feed.innerHTML = '<p style="color:var(--muted)">No hay acciones en este rango.</p>'; return; }

  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  let ultimoDia = null;
  let html = "";
  items.forEach(({ c, fecha }) => {
    const diaKey = fecha.toDateString();
    if (diaKey !== ultimoDia) {
      html += `<div class="seg-day-heading">${fecha.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</div>`;
      ultimoDia = diaKey;
    }
    const vencida = fecha < hoy && !c.seguimientoEjecutado;
    const esHoy = fecha.toDateString() === hoy.toDateString();
    const clase = c.seguimientoEjecutado ? "ejecutada" : (vencida ? "vencida" : (esHoy ? "hoy" : "futura"));
    html += `<div class="seg-item ${clase}">
      <input type="checkbox" class="seg-check" data-seg-nit="${esc(c.nit)}" ${c.seguimientoEjecutado ? "checked" : ""}/>
      <div class="seg-body">
        <div class="seg-fecha">${fecha.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}${vencida ? " · VENCIDA" : ""}</div>
        <div class="seg-cliente">${esc(c.cliente || "Cliente sin nombre")} <span style="color:var(--muted);font-weight:400">· NIT ${esc(c.nit)}</span></div>
        <div class="seg-meta">${esc(c.proximaAccion || "Sin tipo de acción")}${esAdmin ? " · " + esc(c.asesorAsignado || "SIN ASIGNACION") : ""}</div>
        ${c.comentario ? `<div class="seg-meta">"${esc(c.comentario)}"</div>` : ""}
      </div>
      <button type="button" class="btn ghost small-btn" data-cal-nit="${esc(c.nit)}" data-cal-fecha="${fecha.toISOString()}" title="Descargar cita para el calendario del celular (iPhone/Android) o de escritorio">📅 Agregar a calendario</button>
    </div>`;
  });
  feed.innerHTML = html;

  feed.querySelectorAll("[data-seg-nit]").forEach(chk => {
    chk.addEventListener("change", () => {
      const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(chk.dataset.segNit));
      if (!c) return;
      c.seguimientoEjecutado = chk.checked;
      logEventoV98("dato", c.nit, c.cliente, chk.checked ? "Pendiente" : "Ejecutado", chk.checked ? "Ejecutado" : "Pendiente");
      saveDataV93();
      renderSeguimientoView();
    });
  });

  feed.querySelectorAll("[data-cal-nit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(btn.dataset.calNit));
      if (!c) return;
      const fecha = new Date(btn.dataset.calFecha);
      descargarICSAccionV103(c, fecha);
    });
  });
}

// ------------------------------------------------------------
// Venta diaria/semanal requerida para cumplir la meta del mes
// ------------------------------------------------------------
// Cuota dinámica: (meta - venta actual) / días hábiles restantes.
// Día hábil = lunes a viernes. No se descuentan festivos (no hay
// calendario de festivos colombianos cargado en la app).
function diasHabilesEntreV101(desde, hasta) {
  // Cuenta días L-V en el rango [desde, hasta], ambos inclusive (por día calendario).
  let count = 0;
  const cursor = inicioDelDiaV100(desde);
  const fin = inicioDelDiaV100(hasta);
  while (cursor.getTime() <= fin.getTime()) {
    const dia = cursor.getDay(); // 0=domingo..6=sábado
    if (dia !== 0 && dia !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
function diasHabilesRestantesMesV101() {
  const hoy = new Date();
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); // último día del mes actual
  return Math.max(diasHabilesEntreV101(hoy, finMes), 0);
}
// Días hábiles en una semana completa (L-V). Se usa como factor fijo
// para proyectar la cuota semanal a partir de la cuota diaria: si el
// asesor sostiene la venta diaria requerida, esto es lo que acumula
// en una semana estándar de 5 días hábiles.
const DIAS_HABILES_SEMANA_V101 = 5;

function clientesPorAsesorV101(nombreAsesor) {
  return (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    return c.asesorAsignado === nombreAsesor;
  });
}

function resumenMetaAsesorV101(nombreAsesor) {
  const clientes = clientesPorAsesorV101(nombreAsesor);
  const metaMes = clientes.reduce((s, c) => s + (typeof goal === "function" ? goal(c) : 0), 0);
  const ventaActual = clientes.reduce((s, c) => s + (typeof saleCurrent === "function" ? saleCurrent(c) : 0), 0);
  const faltante = Math.max(metaMes - ventaActual, 0);
  return { asesor: nombreAsesor, metaMes, ventaActual, faltante };
}

function renderMetaDiariaSeguimientoV101() {
  const panel = $("metaDiariaPanel");
  const body = $("metaDiariaBody");
  if (!panel || !body) return;

  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  const diasHabilesMes = diasHabilesRestantesMesV101();
  const diasHabilesSemana = DIAS_HABILES_SEMANA_V101;

  if ($("metaDiariaSubtitle")) {
    $("metaDiariaSubtitle").textContent = diasHabilesMes > 0
      ? `${diasHabilesMes} día(s) hábil(es) restantes en el mes`
      : "No quedan días hábiles en el mes";
  }

  const filaHtml = (r) => {
    const cumplimiento = r.metaMes ? (r.ventaActual / r.metaMes) * 100 : 0;
    const diaria = diasHabilesMes > 0 ? r.faltante / diasHabilesMes : 0;
    const semanal = diaria * diasHabilesSemana;
    return `<tr>
      <td data-label="Asesor">${esc(r.asesor)}</td>
      <td data-label="Meta del mes">${money(r.metaMes)}</td>
      <td data-label="Venta actual">${money(r.ventaActual)}</td>
      <td data-label="Cumplimiento">${pct(cumplimiento)}</td>
      <td data-label="Faltante">${money(r.faltante)}</td>
      <td data-label="Venta diaria requerida">${money(diaria)}</td>
      <td data-label="Venta semanal requerida">${money(semanal)}</td>
    </tr>`;
  };

  if (esAdmin) {
    const asesores = (DATA.meta && DATA.meta.asesores) || [];
    const resumenes = asesores.map(a => resumenMetaAsesorV101(a));
    const total = resumenes.reduce((acc, r) => ({
      asesor: "TOTAL ORGANIZACIÓN",
      metaMes: acc.metaMes + r.metaMes,
      ventaActual: acc.ventaActual + r.ventaActual,
      faltante: acc.faltante + r.faltante
    }), { asesor: "TOTAL ORGANIZACIÓN", metaMes: 0, ventaActual: 0, faltante: 0 });

    let html = `<tr style="font-weight:800;background:var(--panel-alt,#f4f6fb)">` +
      `<td data-label="Asesor">${esc(total.asesor)}</td>` +
      `<td data-label="Meta del mes">${money(total.metaMes)}</td>` +
      `<td data-label="Venta actual">${money(total.ventaActual)}</td>` +
      `<td data-label="Cumplimiento">${pct(total.metaMes ? (total.ventaActual / total.metaMes) * 100 : 0)}</td>` +
      `<td data-label="Faltante">${money(total.faltante)}</td>` +
      `<td data-label="Venta diaria requerida">${money(diasHabilesMes > 0 ? total.faltante / diasHabilesMes : 0)}</td>` +
      `<td data-label="Venta semanal requerida">${money((diasHabilesMes > 0 ? total.faltante / diasHabilesMes : 0) * diasHabilesSemana)}</td>` +
      `</tr>`;
    html += resumenes.map(filaHtml).join("");
    body.innerHTML = html;
  } else {
    if (typeof currentUserV84 === "undefined" || !currentUserV84 || !currentUserV84.advisor) {
      body.innerHTML = '<tr><td colspan="7" style="color:var(--muted)">Sin asesor asociado a esta sesión.</td></tr>';
      return;
    }
    const r = resumenMetaAsesorV101(currentUserV84.advisor);
    body.innerHTML = filaHtml(r);
  }
}

// ------------------------------------------------------------
// Acciones recomendadas: score de probabilidad de éxito por
// cliente, para sugerir a quién contactar y ayudar a cumplir el
// presupuesto diario/semanal. El asesor decide y planea la acción
// (fecha + tipo); solo al hacerlo el cliente pasa a "planeadas".
// ------------------------------------------------------------
const PESOS_SCORE_DEFAULT_V102 = { faltante: 25, clasificacion: 25, continuidad: 25, urgencia: 25 };

function getPesosScoreV102() {
  const saved = localStorage.getItem("radarPesosScoreV102");
  if (saved) {
    try { return { ...PESOS_SCORE_DEFAULT_V102, ...JSON.parse(saved) }; } catch (e) {}
  }
  return { ...PESOS_SCORE_DEFAULT_V102 };
}

function setPesosScoreInputsV102() {
  const p = getPesosScoreV102();
  if ($("pesoFaltante")) $("pesoFaltante").value = p.faltante;
  if ($("pesoClasificacion")) $("pesoClasificacion").value = p.clasificacion;
  if ($("pesoContinuidad")) $("pesoContinuidad").value = p.continuidad;
  if ($("pesoUrgencia")) $("pesoUrgencia").value = p.urgencia;
}

function aplicarPesosScoreV102() {
  const p = {
    faltante: Number($("pesoFaltante")?.value || 0),
    clasificacion: Number($("pesoClasificacion")?.value || 0),
    continuidad: Number($("pesoContinuidad")?.value || 0),
    urgencia: Number($("pesoUrgencia")?.value || 0)
  };
  const suma = p.faltante + p.clasificacion + p.continuidad + p.urgencia;
  const warn = $("pesosScoreSumaWarn");
  if (suma !== 100) {
    if (warn) warn.textContent = `La suma actual es ${suma}%. Debe ser 100% para guardar.`;
    return;
  }
  if (warn) warn.textContent = "";
  localStorage.setItem("radarPesosScoreV102", JSON.stringify(p));
  recomendadasStateV102.page = 1;
  renderAccionesRecomendadasV102();
}

// Puntaje 0-100 por clasificación A-B-C-E-N (alto valor pesa más que
// alta consecutividad, siguiendo el glosario comercial de la app).
const SCORE_CLASIFICACION_V102 = { A: 100, E: 75, B: 60, C: 35, N: 20 };
// Puntaje 0-100 por estado comercial del cliente.
const SCORE_ESTADO_V102 = { Activo: 100, Reingreso: 85, "Posible Baja": 50, Inactivo: 35, Nuevo: 25, Baja: 10 };

function diasSinGestionV102(c) {
  // Días desde el último seguimiento marcado como ejecutado (fechaSeguimiento
  // cuando seguimientoEjecutado=true). Si nunca se ha gestionado, se trata
  // como "máxima urgencia" dentro del grupo (se normaliza más abajo).
  if (!c.seguimientoEjecutado || !c.fechaSeguimiento) return null;
  const f = parseFechaLocalV100(c.fechaSeguimiento);
  if (!f) return null;
  const hoy = inicioDelDiaV100(new Date());
  return Math.max(Math.round((hoy - f) / 86400000), 0);
}

function tieneSeguimientoFuturoPendienteV102(c) {
  if (!c.fechaSeguimiento || c.seguimientoEjecutado) return false;
  const f = parseFechaLocalV100(c.fechaSeguimiento);
  if (!f) return false;
  return f.getTime() >= inicioDelDiaV100(new Date()).getTime();
}

function candidatosRecomendadosV102(nombreAsesor) {
  return (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    // Un cliente sin asesor asignado no puede sugerirse como acción de
    // ningún asesor ni del admin: la asignación es la base de la
    // trazabilidad comercial (ver Gestión de Clientes) y no debe
    // saltarse por una recomendación automática.
    if (!c.asesorAsignado || c.asesorAsignado === "SIN ASIGNACION") return false;
    if (c.estado === "Baja") return false; // recuperación de cartera es un flujo aparte, no compite por cierre de meta
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    if (typeof missing === "function" && missing(c) <= 0) return false; // ya cumplió su meta
    if (tieneSeguimientoFuturoPendienteV102(c)) return false; // ya tiene acción planeada vigente
    return true;
  });
}

function calcularScoresV102(clientes) {
  const p = getPesosScoreV102();
  const faltantes = clientes.map(c => (typeof missing === "function" ? missing(c) : 0));
  const maxFaltante = Math.max(...faltantes, 0);

  const dias = clientes.map(diasSinGestionV102);
  const diasValidos = dias.filter(d => d !== null);
  const maxDias = diasValidos.length ? Math.max(...diasValidos) : 0;

  return clientes.map((c, i) => {
    const faltanteNorm = maxFaltante > 0 ? (faltantes[i] / maxFaltante) * 100 : 0;
    const clasifNorm = SCORE_CLASIFICACION_V102[c.clasificacion] ?? 20;
    const estadoNorm = SCORE_ESTADO_V102[c.estado] ?? 35;
    const consecutividad = Math.min(Number(c.mesesCompraAnioActual || c.mesesCompraAnioAnterior || c.mesesCompra2025 || 0), 12) / 12 * 100;
    const continuidadNorm = estadoNorm * 0.7 + consecutividad * 0.3;
    // Sin historial de gestión = trato como máxima urgencia (100); si hay
    // fecha, entre más días sin gestión, más urgente (normalizado contra el peor caso del grupo).
    const urgenciaNorm = dias[i] === null ? 100 : (maxDias > 0 ? (dias[i] / maxDias) * 100 : 0);

    const score = (faltanteNorm * p.faltante + clasifNorm * p.clasificacion + continuidadNorm * p.continuidad + urgenciaNorm * p.urgencia) / 100;

    return { c, score, faltante: faltantes[i], dias: dias[i] };
  }).sort((a, b) => b.score - a.score);
}

const recomendadasStateV102 = { page: 1, pageSize: 10 };

// Clientes sin asesor asignado que, si tuvieran dueño, competirían por
// aparecer en recomendadas (tienen faltante pendiente y no están en
// Baja/bloqueados). Se usa solo para el aviso al admin, no participan
// del ranking de ningún asesor.
function clientesSinAsignarConFaltanteV102() {
  return (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (c.estado === "Baja") return false;
    if (c.asesorAsignado && c.asesorAsignado !== "SIN ASIGNACION") return false;
    if (typeof missing === "function" && missing(c) <= 0) return false;
    return true;
  });
}

function renderAccionesRecomendadasV102() {
  const body = $("recomendadasBody");
  if (!body) return;

  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  const pesosPanel = $("pesosScorePanel");
  if (pesosPanel) pesosPanel.style.display = esAdmin ? "" : "none";
  if (esAdmin) setPesosScoreInputsV102();

  const avisoBox = $("sinAsignarAvisoBox");
  if (avisoBox) {
    const sinAsignar = esAdmin ? clientesSinAsignarConFaltanteV102() : [];
    if (esAdmin && sinAsignar.length > 0) {
      avisoBox.style.display = "";
      const n = sinAsignar.length;
      if ($("sinAsignarAvisoTexto")) {
        $("sinAsignarAvisoTexto").textContent =
          `${n} cliente${n === 1 ? "" : "s"} sin asesor asignado ${n === 1 ? "tiene" : "tienen"} venta pendiente por cumplir.`;
      }
    } else {
      avisoBox.style.display = "none";
    }
  }

  let nombreAsesor = null;
  if (!esAdmin) {
    if (typeof currentUserV84 === "undefined" || !currentUserV84 || !currentUserV84.advisor) {
      body.innerHTML = '<tr><td colspan="8" style="color:var(--muted)">Sin asesor asociado a esta sesión.</td></tr>';
      if ($("recomendadasCount")) $("recomendadasCount").textContent = "";
      if ($("recomendadasPagination")) $("recomendadasPagination").innerHTML = "";
      return;
    }
    nombreAsesor = currentUserV84.advisor;
  } else {
    const asesorSel = $("seguimientoAsesorSelect")?.value || "todos";
    if (asesorSel !== "todos") nombreAsesor = asesorSel;
  }

  const candidatos = candidatosRecomendadosV102(nombreAsesor);
  const scored = calcularScoresV102(candidatos);

  if ($("recomendadasCount")) $("recomendadasCount").textContent = `${scored.length} cliente(s) sugerido(s)`;

  if (!scored.length) {
    body.innerHTML = '<tr><td colspan="8" style="color:var(--muted)">No hay clientes sugeridos en este momento.</td></tr>';
    if ($("recomendadasPagination")) $("recomendadasPagination").innerHTML = "";
    return;
  }

  const pageSize = recomendadasStateV102.pageSize;
  const totalPages = Math.max(Math.ceil(scored.length / pageSize), 1);
  if (recomendadasStateV102.page > totalPages) recomendadasStateV102.page = totalPages;
  if (recomendadasStateV102.page < 1) recomendadasStateV102.page = 1;
  const start = (recomendadasStateV102.page - 1) * pageSize;
  const pageItems = scored.slice(start, start + pageSize);

  body.innerHTML = pageItems.map(({ c, score, faltante, dias }) => `<tr>
    <td data-label="Cliente">${esc(c.cliente || "Cliente sin nombre")} <span style="color:var(--muted);font-weight:400">· NIT ${esc(c.nit)}</span></td>
    <td data-label="Asesor">${esc(c.asesorAsignado || "SIN ASIGNACION")}</td>
    <td data-label="Clasificación">${esc(c.clasificacion || "—")}</td>
    <td data-label="Estado">${esc(c.estado || "—")}</td>
    <td data-label="Faltante">${money(faltante)}</td>
    <td data-label="Días sin gestión">${dias === null ? "Sin gestión previa" : dias + " día(s)"}</td>
    <td data-label="Score"><strong>${Math.round(score)}</strong>/100</td>
    <td data-label=""><button class="btn ghost small-btn" data-detail-nit="${esc(c.nit)}" type="button">Definir acción</button></td>
  </tr>`).join("");

  const pagWrap = $("recomendadasPagination");
  if (pagWrap) {
    pagWrap.innerHTML = "";
    const prev = document.createElement("button");
    prev.className = "btn ghost small-btn";
    prev.textContent = "Anterior";
    prev.disabled = recomendadasStateV102.page <= 1;
    prev.addEventListener("click", () => { recomendadasStateV102.page--; renderAccionesRecomendadasV102(); });
    const info = document.createElement("span");
    info.className = "pagination-info";
    info.textContent = `Página ${recomendadasStateV102.page} de ${totalPages}`;
    const next = document.createElement("button");
    next.className = "btn ghost small-btn";
    next.textContent = "Siguiente";
    next.disabled = recomendadasStateV102.page >= totalPages;
    next.addEventListener("click", () => { recomendadasStateV102.page++; renderAccionesRecomendadasV102(); });
    pagWrap.appendChild(prev); pagWrap.appendChild(info); pagWrap.appendChild(next);
  }
}

function poblarAsesorFilterSeguimientoV100() {
  const sel = $("seguimientoAsesorSelect");
  const wrap = $("seguimientoAsesorFilterWrap");
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  if (wrap) wrap.style.display = esAdmin ? "" : "none";
  if (!sel || !esAdmin) return;
  const current = sel.value || "todos";
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  sel.innerHTML = '<option value="todos">Todos</option>' + asesores.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  sel.value = asesores.includes(current) ? current : "todos";
}

function showSeguimientoViewV100() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const sv = $("seguimientoView");
  if (sv) sv.classList.remove("hidden-view");
  // hideAllPrimaryViewsV93() oculta TODAS las .table-card de la app por
  // selector genérico (incluida la nuestra, aunque esté anidada dentro
  // de #seguimientoView), así que hay que volver a mostrarla aquí.
  const mdp = $("metaDiariaPanel"); if (mdp) mdp.classList.remove("hidden-view");
  const arp = $("accionesRecomendadasPanel"); if (arp) arp.classList.remove("hidden-view");
  const cv = $("clientsManagementView"); if (cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if (av) av.classList.add("hidden-view");
  if ($("navSeguimiento")) $("navSeguimiento").classList.add("active");
  if ($("seguimientoHoyLabel")) $("seguimientoHoyLabel").textContent = new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  poblarAsesorFilterSeguimientoV100();
  renderSeguimientoView();
  renderMetaDiariaSeguimientoV101();
  recomendadasStateV102.page = 1;
  renderAccionesRecomendadasV102();
}

// Si cambia la fecha de seguimiento o la próxima acción de un
// cliente, el check de "ejecutado" queda obsoleto: se reinicia.
const _saveClientDetailOriginalV100 = saveClientDetailV81;
saveClientDetailV81 = function () {
  let fechaAntes = null, accionAntes = null, c = null;
  if (activeClientNit) {
    c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
    if (c) { fechaAntes = c.fechaSeguimiento || ""; accionAntes = c.proximaAccion || ""; }
  }
  _saveClientDetailOriginalV100();
  if (c && ((c.fechaSeguimiento || "") !== fechaAntes || (c.proximaAccion || "") !== accionAntes)) {
    c.seguimientoEjecutado = false;
  }
  // Si el cliente editado acaba de recibir fecha+acción, sale de
  // "recomendadas" (ya no cumple el filtro de sin-plan-vigente) y debe
  // aparecer arriba en "planeadas". Refrescamos ambos paneles si la
  // vista de Seguimiento diario está abierta.
  const sv = $("seguimientoView");
  if (sv && !sv.classList.contains("hidden-view")) {
    if (typeof renderSeguimientoView === "function") renderSeguimientoView();
    if (typeof renderMetaDiariaSeguimientoV101 === "function") renderMetaDiariaSeguimientoV101();
    if (typeof renderAccionesRecomendadasV102 === "function") {
      recomendadasStateV102.page = 1;
      renderAccionesRecomendadasV102();
    }
  }
};

// Aseguramos que logView y seguimientoView también se oculten al
// navegar a cualquier otra pestaña (Hoja de ruta, Dashboard, etc.)
if (typeof hideAllPrimaryViewsV93 === "function") {
  const _hideAllOriginalV98 = hideAllPrimaryViewsV93;
  hideAllPrimaryViewsV93 = function () {
    _hideAllOriginalV98();
    const lv = $("logView"); if (lv) lv.classList.add("hidden-view");
    const sv = $("seguimientoView"); if (sv) sv.classList.add("hidden-view");
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
  if (el) el.addEventListener("click", () => {
    const lv = $("logView"); if (lv) lv.classList.add("hidden-view");
    const sv = $("seguimientoView"); if (sv) sv.classList.add("hidden-view");
    const pv = $("prospeccionView"); if (pv) pv.classList.add("hidden-view");
  });
});
// navSeguimiento, navClients y navAdvisors también deben ocultar
// Prospección al salir de ella (seguimos el mismo patrón anterior).
["navSeguimiento", "navClients", "navAdvisors"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("click", () => {
    const pv = $("prospeccionView"); if (pv) pv.classList.add("hidden-view");
  });
});

// ------------------------------------------------------------
// Módulo de Prospección: registro y gestión de leads comerciales.
// Mismo patrón de permisos que Hoja de Ruta: admin ve todos los
// leads, cada asesor ve solo los suyos. Se guarda en DATA.leads
// (persistido en localStorage) y, si existe tabla "leads" en
// Supabase, también se sincroniza para que todo el equipo vea lo
// mismo (ver sincronizarLeadsV104 más abajo).
// ------------------------------------------------------------
if (!Array.isArray(DATA.leads)) DATA.leads = [];

const leadsStateV104 = { search: "", estado: "todos", asesor: "todos" };
let activeLeadIdV104 = null;

function uuidV104() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "lead-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function poblarAsesorFilterLeadsV104() {
  const sel = $("leadsAsesorFilter");
  const wrap = $("leadsAsesorFilterWrap");
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  if (wrap) wrap.style.display = esAdmin ? "" : "none";
  if (!sel || !esAdmin) return;
  const current = sel.value || "todos";
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  sel.innerHTML = '<option value="todos">Todos</option>' + asesores.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  sel.value = asesores.includes(current) ? current : "todos";
}

function leadsVisiblesV104() {
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  return (DATA.leads || []).filter(l => {
    if (esAdmin) {
      if (leadsStateV104.asesor !== "todos" && l.asesorAsignado !== leadsStateV104.asesor) return false;
    } else {
      if (typeof currentUserV84 === "undefined" || !currentUserV84 || l.asesorAsignado !== currentUserV84.advisor) return false;
    }
    if (leadsStateV104.estado !== "todos" && l.estado !== leadsStateV104.estado) return false;
    if (leadsStateV104.search) {
      const q = leadsStateV104.search.toLowerCase();
      const campo = `${l.nombre || ""} ${l.telefono || ""} ${l.email || ""}`.toLowerCase();
      if (!campo.includes(q)) return false;
    }
    return true;
  });
}

function renderLeadsV104() {
  const body = $("leadsBody");
  if (!body) return;
  poblarAsesorFilterLeadsV104();
  const rows = leadsVisiblesV104().slice().sort((a, b) => new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0));
  if ($("leadsCount")) $("leadsCount").textContent = `${rows.length} lead(s)`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" style="color:var(--muted)">No hay leads registrados en este filtro.</td></tr>';
    return;
  }
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  body.innerHTML = rows.map(l => `<tr>
    <td>${esc(l.nombre || "—")}</td>
    <td>${esc(l.telefono || "")}${l.telefono && l.email ? " · " : ""}${esc(l.email || "")}</td>
    <td>${esc(l.origen || "—")}</td>
    <td>${esc(l.ciudad || "—")}</td>
    <td>${esc(l.asesorAsignado || "—")}</td>
    <td>${money(l.valorPotencial || 0)}</td>
    <td>${esc(l.estado || "Nuevo")}</td>
    <td><button class="btn ghost small-btn" data-edit-lead-id="${esc(l.id)}" type="button">${esAdmin ? "Ver / Editar" : "Gestionar"}</button></td>
  </tr>`).join("");
}

function openLeadModalV104(id) {
  activeLeadIdV104 = id;
  const esAdmin = typeof isAdminV86 === "function" ? isAdminV86() : false;
  const l = id ? (DATA.leads || []).find(x => x.id === id) : null;

  if ($("leadModalTitle")) $("leadModalTitle").textContent = l ? "Editar lead" : "Nuevo lead";
  if ($("leadIdInput")) $("leadIdInput").value = l ? l.id : "";
  if ($("leadNombreInput")) $("leadNombreInput").value = l ? (l.nombre || "") : "";
  if ($("leadTelefonoInput")) $("leadTelefonoInput").value = l ? (l.telefono || "") : "";
  if ($("leadEmailInput")) $("leadEmailInput").value = l ? (l.email || "") : "";
  if ($("leadOrigenInput")) $("leadOrigenInput").value = l ? (l.origen || "") : "";
  if ($("leadValorInput")) $("leadValorInput").value = l ? (l.valorPotencial || 0) : "";
  if ($("leadEstadoInput")) $("leadEstadoInput").value = l ? (l.estado || "Nuevo") : "Nuevo";
  if ($("leadComentarioInput")) $("leadComentarioInput").value = l ? (l.comentario || "") : "";

  // Asesor: admin puede elegir cualquiera; el asesor solo se asigna a sí mismo.
  const selAsesor = $("leadAsesorInput");
  if (selAsesor) {
    if (esAdmin) {
      const asesores = (DATA.meta && DATA.meta.asesores) || [];
      selAsesor.innerHTML = asesores.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
      selAsesor.disabled = false;
      selAsesor.value = l ? (l.asesorAsignado || "") : (asesores[0] || "");
    } else {
      const nombre = (typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : "";
      selAsesor.innerHTML = `<option value="${esc(nombre)}">${esc(nombre)}</option>`;
      selAsesor.disabled = true;
      selAsesor.value = nombre;
    }
  }

  fillDeptSelectGenV103("leadDepartamentoInput", l ? (l.departamento || "") : "");
  fillCitySelectGenV103("leadCiudadInput", l ? (l.departamento || "") : "", l ? (l.ciudad || "") : "");

  // Eliminar: solo visible editando un lead existente, y solo para admin
  // o el asesor dueño del lead (evita que un asesor borre leads ajenos).
  const btnEliminar = $("leadEliminarBtn");
  if (btnEliminar) {
    const puedeEliminar = !!l && (esAdmin || (typeof currentUserV84 !== "undefined" && currentUserV84 && l.asesorAsignado === currentUserV84.advisor));
    btnEliminar.style.display = puedeEliminar ? "" : "none";
  }

  const modal = $("leadModal");
  if (modal) modal.classList.add("open");
}

function closeLeadModalV104() {
  const modal = $("leadModal");
  if (modal) modal.classList.remove("open");
  activeLeadIdV104 = null;
}

function guardarLeadV104() {
  const nombre = ($("leadNombreInput")?.value || "").trim();
  const asesor = ($("leadAsesorInput")?.value || "").trim();
  if (!nombre) { alert("El nombre / empresa del lead es obligatorio."); return; }
  if (!asesor) { alert("Debes asignar un asesor responsable del lead."); return; }

  const id = $("leadIdInput")?.value || "";
  let l = id ? (DATA.leads || []).find(x => x.id === id) : null;
  const esNuevo = !l;
  if (!l) {
    l = { id: uuidV104(), creadoEn: new Date().toISOString(), creadoPor: (typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.email : "" };
    DATA.leads.push(l);
  }
  l.nombre = nombre;
  l.telefono = $("leadTelefonoInput")?.value || "";
  l.email = $("leadEmailInput")?.value || "";
  l.asesorAsignado = asesor;
  l.origen = $("leadOrigenInput")?.value || "";
  l.departamento = $("leadDepartamentoInput")?.value || "";
  l.ciudad = $("leadCiudadInput")?.value || "";
  l.valorPotencial = Number($("leadValorInput")?.value || 0);
  l.estado = $("leadEstadoInput")?.value || "Nuevo";
  l.comentario = $("leadComentarioInput")?.value || "";
  l.actualizadoEn = new Date().toISOString();

  if (typeof logEventoV98 === "function") {
    logEventoV98("dato", l.id, l.nombre, esNuevo ? "—" : "Editado", esNuevo ? "Lead creado" : "Lead actualizado");
  }

  guardarLeadsLocalV104();
  if (typeof sincronizarLeadsV104 === "function") sincronizarLeadsV104();
  closeLeadModalV104();
  renderLeadsV104();
}

function eliminarLeadV104() {
  const id = $("leadIdInput")?.value || "";
  if (!id) return;
  if (!confirm("¿Eliminar este lead? Esta acción no se puede deshacer.")) return;
  const l = (DATA.leads || []).find(x => x.id === id);
  DATA.leads = (DATA.leads || []).filter(x => x.id !== id);
  if (typeof logEventoV98 === "function" && l) {
    logEventoV98("dato", l.id, l.nombre, "Activo", "Lead eliminado");
  }
  guardarLeadsLocalV104();
  if (typeof sincronizarLeadsV104 === "function") sincronizarLeadsV104();
  closeLeadModalV104();
  renderLeadsV104();
}

function guardarLeadsLocalV104() {
  try { localStorage.setItem("radarLeadsV104", JSON.stringify(DATA.leads || [])); } catch (e) {}
}

function cargarLeadsLocalV104() {
  try {
    const saved = localStorage.getItem("radarLeadsV104");
    if (saved) DATA.leads = JSON.parse(saved);
  } catch (e) {}
}
cargarLeadsLocalV104();

// ------------------------------------------------------------
// Sincronización de leads con Supabase (compartido entre todo el
// equipo, igual que los clientes). Requiere la tabla "leads" —
// ver crear_tabla_leads.sql. Si la tabla todavía no existe, la app
// sigue funcionando normal con el respaldo local (localStorage);
// solo se ve una advertencia en consola.
// ------------------------------------------------------------
let leadsSupabaseDisponibleV104 = null; // null = aún no se sabe, true/false = ya se probó

function filaSupabaseALeadV104(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono || "",
    email: row.email || "",
    asesorAsignado: row.asesor_id ? (ASESOR_NAME_MAP_V94[row.asesor_id] || "") : "",
    origen: row.origen || "",
    ciudad: row.ciudad || "",
    departamento: row.departamento || "",
    valorPotencial: Number(row.valor_potencial || 0),
    estado: row.estado || "Nuevo",
    comentario: row.comentario || "",
    creadoPor: row.creado_por || "",
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en
  };
}

function leadALaFilaSupabaseV104(l) {
  return {
    id: l.id,
    nombre: l.nombre || null,
    telefono: l.telefono || null,
    email: l.email || null,
    asesor_id: (l.asesorAsignado && typeof ASESOR_ID_MAP_V94 !== "undefined") ? (ASESOR_ID_MAP_V94[l.asesorAsignado] || null) : null,
    origen: l.origen || null,
    ciudad: l.ciudad || null,
    departamento: l.departamento || null,
    valor_potencial: Number(l.valorPotencial || 0),
    estado: l.estado || "Nuevo",
    comentario: l.comentario || null,
    creado_por: l.creadoPor || null,
    actualizado_en: new Date().toISOString()
  };
}

async function cargarLeadsDesdeSupabaseV104() {
  if (typeof supabaseClientV94 === "undefined") return false;
  try {
    const { data, error } = await supabaseClientV94.from("leads").select("*").range(0, 4999);
    if (error) {
      // Tabla probablemente no existe todavía: seguimos con el respaldo local sin interrumpir la app.
      console.warn("[Radar-Leads] No se pudo leer la tabla 'leads' de Supabase (¿falta crearla? ver crear_tabla_leads.sql):", error.message);
      leadsSupabaseDisponibleV104 = false;
      return false;
    }
    leadsSupabaseDisponibleV104 = true;
    DATA.leads = (data || []).map(filaSupabaseALeadV104);
    guardarLeadsLocalV104();
    return true;
  } catch (e) {
    console.warn("[Radar-Leads] Fallo de conexión cargando leads:", e);
    leadsSupabaseDisponibleV104 = false;
    return false;
  }
}

let syncLeadsEnCursoV104 = false;
let syncLeadsPendienteV104 = false;
async function sincronizarLeadsV104() {
  if (leadsSupabaseDisponibleV104 === false) return; // ya sabemos que la tabla no existe; no reintentar en cada guardado
  if (typeof supabaseClientV94 === "undefined") return;
  if (syncLeadsEnCursoV104) { syncLeadsPendienteV104 = true; return; }
  syncLeadsEnCursoV104 = true;
  try {
    const filas = (DATA.leads || []).map(leadALaFilaSupabaseV104);
    if (filas.length) {
      const { error } = await supabaseClientV94.from("leads").upsert(filas, { onConflict: "id" });
      if (error) {
        console.warn("[Radar-Leads] No se pudo guardar en Supabase (¿falta crear la tabla 'leads'? ver crear_tabla_leads.sql):", error.message);
        leadsSupabaseDisponibleV104 = false;
      } else {
        leadsSupabaseDisponibleV104 = true;
      }
    }
  } catch (e) {
    console.warn("[Radar-Leads] Fallo de conexión guardando leads:", e);
  } finally {
    syncLeadsEnCursoV104 = false;
    if (syncLeadsPendienteV104) { syncLeadsPendienteV104 = false; sincronizarLeadsV104(); }
  }
}

// Al arrancar, intentamos traer los leads compartidos desde Supabase
// (si la tabla ya existe). No bloquea el resto de la carga de la app.
document.addEventListener("DOMContentLoaded", () => {
  cargarLeadsDesdeSupabaseV104().then(ok => {
    if (ok) {
      const pv = $("prospeccionView");
      if (pv && !pv.classList.contains("hidden-view")) renderLeadsV104();
    }
  });
});

// ------------------------------------------------------------
// Metas y presupuestos: ventas totales/por asesor/por mes de 2025
// real, 2026 real y planeado (Meta sugerida), proyección del resto
// de 2026 (promedio real transcurrido ajustado por estacionalidad
// 2025), y propuesta 2027 (2026 estimado × % de crecimiento por
// clasificación, tomado de Configuración comercial por clasificación).
// Reemplaza la antigua Meta S&OP (caso puntual de un solo cliente).
// ------------------------------------------------------------

// Suma de ambas líneas (Espumas + Colchones) para un cliente/año/mes.
// Usa las mismas funciones ya existentes en app.js (saleMonthV812),
// sin depender del filtro de línea del Dashboard (directorLineV813).
function ventaMesClienteV106(c, year, mes) {
  return typeof saleMonthV812 === "function" ? saleMonthV812(c, year, mes) : 0;
}

// Proyecta cada mes que falta de 2026 para UN cliente:
// proyección(mes) = promedio real 2026 transcurrido × factor de
// estacionalidad de ese mes en 2025 (venta 2025 del mes ÷ promedio
// 2025 de los mismos meses ya transcurridos en 2026).
function proyeccionRestoAnioClienteV106(c) {
  const meses = monthsV812();
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses;
  const restantes = meses.filter(m => !transcurridos.includes(m));

  const real2026Transcurrido = transcurridos.reduce((s, m) => s + ventaMesClienteV106(c, 2026, m), 0);
  const promedioReal2026 = transcurridos.length ? real2026Transcurrido / transcurridos.length : 0;

  const promedio2025Transcurrido = transcurridos.length
    ? transcurridos.reduce((s, m) => s + ventaMesClienteV106(c, 2025, m), 0) / transcurridos.length
    : 0;

  let proyeccionResto = 0;
  restantes.forEach(m => {
    const venta2025Mes = ventaMesClienteV106(c, 2025, m);
    const factorEstacional = promedio2025Transcurrido > 0 ? (venta2025Mes / promedio2025Transcurrido) : 1;
    proyeccionResto += promedioReal2026 * factorEstacional;
  });

  return { real2026Transcurrido, proyeccionResto, total2026Estimado: real2026Transcurrido + proyeccionResto };
}

// Resumen de metas por asesor (o total si nombreAsesor es null).
function resumenMetasAsesorV106(nombreAsesor) {
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const cfg = typeof growthConfigV810 === "function" ? growthConfigV810() : { A: 12, B: 10, C: 5, E: 15, N: 0 };

  let real2025 = 0, real2026 = 0, planeado2026 = 0, proyectado2026 = 0, propuesto2027 = 0;
  const meses = monthsV812();

  clientes.forEach(c => {
    real2025 += meses.reduce((s, m) => s + ventaMesClienteV106(c, 2025, m), 0);
    const { real2026Transcurrido, total2026Estimado } = proyeccionRestoAnioClienteV106(c);
    real2026 += real2026Transcurrido;
    proyectado2026 += total2026Estimado;

    // 2026 planeado: Meta sugerida ya existente, sumada mes a mes
    // sobre los mismos meses transcurridos (consistente con "real").
    const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses;
    const mesActualGuardado = state.month;
    transcurridos.forEach(m => {
      state.month = m;
      planeado2026 += (typeof goal === "function") ? goal(c) : 0;
    });
    state.month = mesActualGuardado;

    const g = Number(cfg[c.clasificacion] ?? 0);
    propuesto2027 += total2026Estimado * (1 + g / 100);
  });

  return { asesor: nombreAsesor || "TOTAL ORGANIZACIÓN", real2025, real2026, planeado2026, proyectado2026, propuesto2027 };
}

function renderMetasViewV106() {
  const body = $("metasBody");
  if (!body) return;

  const meses = monthsV812();
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses;
  if ($("metasMesesTranscurridos")) {
    $("metasMesesTranscurridos").value = transcurridos.length
      ? `${transcurridos[0]} a ${transcurridos[transcurridos.length - 1]} (${transcurridos.length} de 12 meses)`
      : "Sin datos operativos cargados";
  }

  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const resumenes = asesores.map(a => resumenMetasAsesorV106(a));
  const total = resumenes.reduce((acc, r) => ({
    asesor: "TOTAL ORGANIZACIÓN",
    real2025: acc.real2025 + r.real2025,
    real2026: acc.real2026 + r.real2026,
    planeado2026: acc.planeado2026 + r.planeado2026,
    proyectado2026: acc.proyectado2026 + r.proyectado2026,
    propuesto2027: acc.propuesto2027 + r.propuesto2027
  }), { real2025: 0, real2026: 0, planeado2026: 0, proyectado2026: 0, propuesto2027: 0 });

  if ($("metasCount")) $("metasCount").textContent = `${resumenes.length} asesor(es)`;

  const filaHtmlV106 = (r, resaltar) => {
    const cumplProyectado = r.planeado2026 ? (r.proyectado2026 / r.planeado2026) * 100 : 0;
    const estilo = resaltar ? ' style="font-weight:800;background:var(--panel-alt,#f4f6fb)"' : "";
    return `<tr${estilo}>
      <td data-label="Asesor">${esc(r.asesor)}</td>
      <td data-label="2025 real">${money(r.real2025)}</td>
      <td data-label="2026 real">${money(r.real2026)}</td>
      <td data-label="2026 planeado">${money(r.planeado2026)}</td>
      <td data-label="2026 proyectado">${money(r.proyectado2026)}</td>
      <td data-label="Cumplimiento proyectado">${pct(cumplProyectado)}</td>
      <td data-label="2027 propuesto">${money(r.propuesto2027)}</td>
    </tr>`;
  };

  body.innerHTML = filaHtmlV106(total, true) + resumenes.map(r => filaHtmlV106(r, false)).join("");

  if (typeof chartV812 === "function") {
    chartV812("metasChart", {
      type: "bar",
      data: {
        labels: asesores,
        datasets: [
          { label: "2025 real", data: resumenes.map(r => r.real2025) },
          { label: "2026 proyectado", data: resumenes.map(r => r.proyectado2026) },
          { label: "2027 propuesto", data: resumenes.map(r => r.propuesto2027) }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } }
    });
  }
}

function exportarMetasCSVV106() {
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const resumenes = asesores.map(a => resumenMetasAsesorV106(a));
  const total = resumenes.reduce((acc, r) => ({
    real2025: acc.real2025 + r.real2025, real2026: acc.real2026 + r.real2026,
    planeado2026: acc.planeado2026 + r.planeado2026, proyectado2026: acc.proyectado2026 + r.proyectado2026,
    propuesto2027: acc.propuesto2027 + r.propuesto2027
  }), { real2025: 0, real2026: 0, planeado2026: 0, proyectado2026: 0, propuesto2027: 0 });

  const rows = [["Asesor", "2025 real (MM)", "2026 real (MM)", "2026 planeado (MM)", "2026 proyectado (MM)", "2027 propuesto (MM)"]];
  rows.push(["TOTAL ORGANIZACIÓN", total.real2025.toFixed(1), total.real2026.toFixed(1), total.planeado2026.toFixed(1), total.proyectado2026.toFixed(1), total.propuesto2027.toFixed(1)]);
  resumenes.forEach(r => rows.push([r.asesor, r.real2025.toFixed(1), r.real2026.toFixed(1), r.planeado2026.toFixed(1), r.proyectado2026.toFixed(1), r.propuesto2027.toFixed(1)]));

  if (typeof downloadCsvV86 === "function") {
    downloadCsvV86(rows, "radar_metas_presupuestos.csv");
  }
}

function showMetasViewV106() {
  if (typeof isAdminV86 === "function" && !isAdminV86()) return;
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const lv = $("logView"); if (lv) lv.classList.add("hidden-view");
  const sv = $("seguimientoView"); if (sv) sv.classList.add("hidden-view");
  const cv = $("clientsManagementView"); if (cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if (av) av.classList.add("hidden-view");
  const pv = $("prospeccionView"); if (pv) pv.classList.add("hidden-view");
  const mv = $("metasView"); if (mv) mv.classList.remove("hidden-view");
  if ($("navMetas")) $("navMetas").classList.add("active");
  renderMetasViewV106();
}

// Solo administradores ven la pestaña "Metas y presupuestos".
document.addEventListener("DOMContentLoaded", () => {
  const checarVisibilidadMetas = () => {
    const el = $("navMetas");
    if (el) el.style.display = (typeof isAdminV86 === "function" && isAdminV86()) ? "" : "none";
  };
  checarVisibilidadMetas();
  const _applyUserProfileOriginalV106 = applyUserProfileV84;
  if (typeof _applyUserProfileOriginalV106 === "function") {
    applyUserProfileV84 = function () {
      _applyUserProfileOriginalV106();
      checarVisibilidadMetas();
    };
  }
});

// navMetas también debe ocultarse (dejar de estar activo visualmente)
// al salir hacia otras vistas, y metasView debe ocultarse desde ellas.
["navRoute", "navUpdate", "navDashboard", "navSeguimiento", "navProspeccion", "navClients", "navAdvisors", "navGlossary"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("click", () => {
    const mv = $("metasView"); if (mv) mv.classList.add("hidden-view");
  });
});

function showProspeccionViewV104() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const lv = $("logView"); if (lv) lv.classList.add("hidden-view");
  const sv = $("seguimientoView"); if (sv) sv.classList.add("hidden-view");
  const cv = $("clientsManagementView"); if (cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if (av) av.classList.add("hidden-view");
  const pv = $("prospeccionView"); if (pv) pv.classList.remove("hidden-view");
  if ($("navProspeccion")) $("navProspeccion").classList.add("active");
  renderLeadsV104();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($("navLog")) $("navLog").addEventListener("click", showLogViewV98);
  if ($("logRefreshBtn")) $("logRefreshBtn").addEventListener("click", cargarLogEventosV98);
  if ($("logRangeSelect")) $("logRangeSelect").addEventListener("change", cargarLogEventosV98);
  if ($("logTypeSelect")) $("logTypeSelect").addEventListener("change", cargarLogEventosV98);
  if ($("logExportBtn")) $("logExportBtn").addEventListener("click", exportarLogAExcelV98);

  if ($("navSeguimiento")) $("navSeguimiento").addEventListener("click", showSeguimientoViewV100);
  if ($("seguimientoRangoSelect")) $("seguimientoRangoSelect").addEventListener("change", renderSeguimientoView);
  if ($("seguimientoAsesorSelect")) $("seguimientoAsesorSelect").addEventListener("change", () => {
    renderSeguimientoView();
    recomendadasStateV102.page = 1;
    renderAccionesRecomendadasV102();
  });
  if ($("seguimientoOcultarEjecutadas")) $("seguimientoOcultarEjecutadas").addEventListener("change", renderSeguimientoView);
  if ($("aplicarPesosScoreBtn")) $("aplicarPesosScoreBtn").addEventListener("click", aplicarPesosScoreV102);
  if ($("irAsignarClientesBtn")) $("irAsignarClientesBtn").addEventListener("click", () => {
    if (typeof showClientsManagementV93 === "function") showClientsManagementV93();
    if (typeof setClientsFilterV93 === "function") setClientsFilterV93("sinAsignacion");
  });

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

  if ($("navProspeccion")) $("navProspeccion").addEventListener("click", showProspeccionViewV104);
  if ($("leadNuevoBtn")) $("leadNuevoBtn").addEventListener("click", () => openLeadModalV104(null));
  if ($("leadModalCloseBtn")) $("leadModalCloseBtn").addEventListener("click", closeLeadModalV104);
  if ($("leadModalCancelBtn")) $("leadModalCancelBtn").addEventListener("click", closeLeadModalV104);
  if ($("leadGuardarBtn")) $("leadGuardarBtn").addEventListener("click", guardarLeadV104);
  if ($("leadEliminarBtn")) $("leadEliminarBtn").addEventListener("click", eliminarLeadV104);
  if ($("leadDepartamentoInput")) $("leadDepartamentoInput").addEventListener("change", e => fillCitySelectGenV103("leadCiudadInput", e.target.value, ""));
  if ($("leadsSearch")) $("leadsSearch").addEventListener("input", e => { leadsStateV104.search = e.target.value; renderLeadsV104(); });
  if ($("leadsEstadoFilter")) $("leadsEstadoFilter").addEventListener("change", e => { leadsStateV104.estado = e.target.value; renderLeadsV104(); });
  if ($("leadsAsesorFilter")) $("leadsAsesorFilter").addEventListener("change", e => { leadsStateV104.asesor = e.target.value; renderLeadsV104(); });

  document.addEventListener("click", e => {
    if (e.target && e.target.dataset && e.target.dataset.editLeadId) {
      openLeadModalV104(e.target.dataset.editLeadId);
    }
  });

  if ($("navMetas")) $("navMetas").addEventListener("click", showMetasViewV106);
  if ($("metasExportBtn")) $("metasExportBtn").addEventListener("click", exportarMetasCSVV106);
});
