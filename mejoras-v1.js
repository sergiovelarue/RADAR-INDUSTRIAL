// ============================================================
// RADAR INDUSTRIAL — Mejoras funcionales (Fase 2, lote 1)
// ------------------------------------------------------------
// Igual que supabase-sync.js: este archivo se carga DESPUÉS de
// app.js y NO lo modifica. Amplía funciones existentes.
//
// Incluye:
//   2. Dashboard (antes "Dashboard Director") ahora es sensible
//      al rol: el administrador ve todo el negocio, el asesor
//      solo ve su propia información.
//   4. Clientes transferidos por el administrador: el asesor ve
//      un aviso en la Hoja de Ruta y en el detalle del cliente,
//      con un botón para "Aceptar cliente".
//   5. La pestaña "Actualización diaria" queda oculta para
//      asesores (solo administradores la ven).
//
// (El punto 1 — ocultar "Vista negocio" — y el punto 3 —
// quitar fecha de nacimiento — se resolvieron directamente en
// index.html / app.js por ser cambios simples de formulario.)
// ============================================================

// ------------------------------------------------------------
// 2. Dashboard sensible al rol
// ------------------------------------------------------------
const _directorClientsOriginalV95 = directorClientsV813;
directorClientsV813 = function () {
  const base = _directorClientsOriginalV95();
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  if (u && u.profile !== "admin") {
    // Un asesor solo ve su propio portafolio en el Dashboard.
    return base.filter(c => c.asesorAsignado === u.advisor);
  }
  return base; // Administrador y Super Administrador ven todo.
};

const _renderDirectorOriginalV95 = renderDirectorDashboardV812;
renderDirectorDashboardV812 = function () {
  _renderDirectorOriginalV95();
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  const esAdmin = !u || u.profile === "admin";

  const subtitle = document.getElementById("dashboardSubtitle");
  if (subtitle) {
    subtitle.textContent = esAdmin
      ? "Vista ejecutiva para analizar evolución, composición, asesores y clientes Pareto."
      : "Tu portafolio: evolución, cumplimiento y clientes de tu gestión.";
  }

  // El selector "Top por asesor" no aplica cuando un asesor ya
  // está viendo solo su propia información.
  const selectorWrap = document.getElementById("advisorTopSelector")?.closest("div");
  if (selectorWrap) selectorWrap.style.display = esAdmin ? "" : "none";
};

// ------------------------------------------------------------
// 5. "Actualización diaria" solo visible para administradores
// ------------------------------------------------------------
const _applyAdminVisibilityOriginalV95 = applyAdminVisibilityV811;
applyAdminVisibilityV811 = function () {
  _applyAdminVisibilityOriginalV95();
  const admin = (typeof isAdminProfileV811 === "function") && isAdminProfileV811();
  const navUpdate = document.getElementById("navUpdate");
  if (navUpdate) navUpdate.style.display = admin ? "" : "none";
};

// ------------------------------------------------------------
// 4. Clientes transferidos: aviso + botón "Aceptar cliente"
// ------------------------------------------------------------

// Al reasignar un cliente, queda marcado como "pendiente de
// aceptación" para el nuevo asesor.
const _reassignClienteOriginalV95 = reassignClienteV93;
reassignClienteV93 = function (c, newAdvisorRaw, opts) {
  const result = _reassignClienteOriginalV95(c, newAdvisorRaw, opts);
  if (result) {
    c.aceptadoPorAsesor = false;
    c.fechaAceptacion = "";
  }
  return result;
};

function esClienteTransferidoPendienteV95(c) {
  if (!c) return false;
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  if (!u || u.profile === "admin") return false; // el aviso es solo para el asesor receptor
  if (c.asesorAsignado !== u.advisor) return false;
  if (c.aceptadoPorAsesor) return false;
  return (typeof isTransferidoRecienteV93 === "function") && isTransferidoRecienteV93(c);
}

function aceptarClienteTransferidoV95(nit) {
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if (!c) return;
  c.aceptadoPorAsesor = true;
  c.fechaAceptacion = new Date().toISOString();
  if (typeof logMasterChangeV86 === "function") {
    logMasterChangeV86(c.nit, c.cliente, "aceptadoPorAsesor", "No", "Sí");
  }
  saveDataV93();
  const banner = document.getElementById("modalTransferBanner");
  if (banner) banner.style.display = "none";
  render();
  if (typeof marcarClientesTransferidosV95 === "function") marcarClientesTransferidosV95();
}

// Aviso dentro del modal de detalle del cliente
const _openClientDetailOriginalV95 = openClientDetailV81;
openClientDetailV81 = function (nit) {
  _openClientDetailOriginalV95(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  const banner = document.getElementById("modalTransferBanner");
  const text = document.getElementById("modalTransferText");
  const btn = document.getElementById("modalAcceptTransferBtn");
  if (!banner || !btn) return;

  if (c && esClienteTransferidoPendienteV95(c)) {
    if (text) text.textContent = "Revisa los datos y confírmalo para dejar registro de que ya lo tienes bajo tu gestión.";
    banner.style.display = "";
    btn.onclick = () => aceptarClienteTransferidoV95(c.nit);
  } else {
    banner.style.display = "none";
  }
};

// Aviso (insignia) en la tabla de la Hoja de Ruta
function marcarClientesTransferidosV95() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  if (!u || u.profile === "admin") return;
  document.querySelectorAll("#routeBody tr").forEach(row => {
    const nitCell = row.querySelector('[data-label="NIT"]');
    const clientCell = row.querySelector('[data-label="Cliente"]');
    if (!nitCell || !clientCell) return;
    const nit = cleanNit(nitCell.textContent);
    const c = DATA.clientes.find(x => cleanNit(x.nit) === nit);
    if (!c) return;
    if (esClienteTransferidoPendienteV95(c)) {
      if (!clientCell.querySelector(".transfer-badge-v95")) {
        const badge = document.createElement("span");
        badge.className = "transfer-badge-v95";
        badge.textContent = "🔄 Transferido · pendiente aceptar";
        badge.style.cssText = "display:block;font-size:11px;color:#a15c00;background:#fff3d6;border-radius:4px;padding:1px 6px;margin-top:2px;width:fit-content;";
        clientCell.appendChild(badge);
      }
    }
  });
}

const _renderTableOriginalV95 = renderTable;
renderTable = function (arr) {
  _renderTableOriginalV95(arr);
  marcarClientesTransferidosV95();
};

// ============================================================
// 6. Tarjetas de Estado (reemplazan las tarjetas fijas de Tipo)
// ------------------------------------------------------------
// Antes: tarjetas fijas "Espumas" / "Nuevo" (campo tipoCliente,
// ya no se usa). Ahora: una tarjeta por cada Estado real de los
// clientes (Activo, Baja, Nuevo, Posible Baja, etc. + Bloqueado),
// sincronizada con el filtro "Estado" de arriba.
// ============================================================
function renderStatusCardsV96() {
  const grid = document.getElementById("statusCardsGrid");
  if (!grid) return;

  const base = DATA.clientes.filter(c => {
    const vip = (typeof isVipGerenciaV88 === "function") && isVipGerenciaV88(c);
    if (state.profile !== "admin" && vip) return false;
    if (state.profile === "admin") {
      if (state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    } else {
      if (c.asesorAsignado !== state.profile) return false;
    }
    return true;
  });

  const isBlocked = c => (typeof isBlockedV87 === "function") && isBlockedV87(c);
  const blockedCount = base.filter(isBlocked).length;
  const counts = {};
  base.filter(c => !isBlocked(c)).forEach(c => {
    const e = c.estado || "Sin estado";
    counts[e] = (counts[e] || 0) + 1;
  });

  const estados = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (blockedCount > 0) { estados.push("Bloqueado"); counts["Bloqueado"] = blockedCount; }

  grid.style.gridTemplateColumns = `repeat(${Math.min(estados.length || 1, 6)}, 1fr)`;
  grid.innerHTML = "";
  estados.forEach(estado => {
    const card = document.createElement("article");
    card.dataset.statusCard = estado;
    card.className = state.status === estado ? "active" : "";
    card.style.cursor = "pointer";
    card.innerHTML = `<span>${estado}</span><strong>${counts[estado]}</strong>`;
    card.onclick = () => {
      state.status = (state.status === estado) ? "todos" : estado;
      const sel = document.getElementById("statusFilter");
      if (sel) sel.value = state.status;
      render();
    };
    grid.appendChild(card);
  });
}

renderTypeSummary = function () {
  renderStatusCardsV96();
};

