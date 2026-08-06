// ============================================================
// V107 — Integración UI de los 3 motores (RTE, RED, EWS)
// ------------------------------------------------------------
// Debe cargarse DESPUÉS de modulo_01/02/03/04 y DESPUÉS de
// mejoras-v1.js. Sigue el mismo patrón de "wrapping" ya usado en
// mejoras-v1.js/app.js para hideAllPrimaryViewsV93/showViewV812:
// no reemplaza funciones, las envuelve.
//
// Requiere que index.html tenga los IDs de modulo_05_ui_alarmas.html
// (navAlarmas, alarmasView, alarmasResumenBar, alarmasAdminTableWrap,
// alarmasAdminBody, alarmasDetalleBody, rteBody, rteNota, etc.)
// ============================================================

function $V107(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// Navegación: envuelve hideAllPrimaryViewsV93 y showViewV812 sin
// tocarlas, exactamente como ya hace mejoras-v1.js con clientsManagementView.
// ------------------------------------------------------------
function showAlarmasViewV107() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const view = $V107("alarmasView");
  if (view) view.classList.remove("hidden-view");
  if ($V107("navAlarmas")) $V107("navAlarmas").classList.add("active");
  renderAlarmasViewV107();
}

if (typeof showViewV812 !== "undefined") {
  const previousShowViewV107 = showViewV812;
  showViewV812 = function (view) {
    const av = $V107("alarmasView"); if (av) av.classList.add("hidden-view");
    previousShowViewV107(view);
  };
}
if (typeof showClientsManagementV93 === "function") {
  const previousShowClientsV107 = showClientsManagementV93;
  showClientsManagementV93 = function () {
    const av = $V107("alarmasView"); if (av) av.classList.add("hidden-view");
    previousShowClientsV107();
  };
}
if (typeof showAdvisorsManagementV93 === "function") {
  const previousShowAdvisorsV107 = showAdvisorsManagementV93;
  showAdvisorsManagementV93 = function () {
    const av = $V107("alarmasView"); if (av) av.classList.add("hidden-view");
    previousShowAdvisorsV107();
  };
}

// ------------------------------------------------------------
// Render del panel EWS (síncrono — no depende de Supabase).
// ------------------------------------------------------------
function renderEwsPanelV107() {
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const selectEl = $V107("alarmasAsesorSelect");
  const wrapAdmin = $V107("alarmasAdminTableWrap");

  if (esAdmin) {
    if (wrapAdmin) wrapAdmin.style.display = "";
    if (selectEl) selectEl.style.display = "none";

    const paneles = typeof panelAlarmasAdminV107 === "function" ? panelAlarmasAdminV107() : [];
    const body = $V107("alarmasAdminBody");
    if (body) {
      body.innerHTML = paneles.map(p => `
        <tr>
          <td>${p.asesor}</td>
          <td>${p.alarmas.filter(a => a.severidad === "Alta").length}</td>
          <td>${p.alarmas.filter(a => a.severidad === "Media").length}</td>
          <td>${p.alarmas.filter(a => a.severidad === "Baja").length}</td>
          <td><strong>${p.totalAlarmas}</strong></td>
        </tr>`).join("");
    }
    if ($V107("alarmasAdminCount")) $V107("alarmasAdminCount").textContent = `${paneles.length} asesores`;

    const consolidado = typeof panelAlarmasV107 === "function" ? panelAlarmasV107(null) : { alarmas: [] };
    renderResumenBarV107(consolidado);
    renderDetalleAlarmasV107(consolidado, "Detalle — Total organización");
  } else {
    if (wrapAdmin) wrapAdmin.style.display = "none";
    if (selectEl) selectEl.style.display = "none";
    const nombreAsesor = (typeof currentUserV86 !== "undefined" && currentUserV86 && currentUserV86.nombre) || null;
    const panel = typeof panelAlarmasV107 === "function" ? panelAlarmasV107(nombreAsesor) : { alarmas: [] };
    renderResumenBarV107(panel);
    renderDetalleAlarmasV107(panel, `Detalle — ${panel.asesor}`);
  }
}

function renderResumenBarV107(panel) {
  const bar = $V107("alarmasResumenBar");
  if (!bar) return;
  const altas = panel.alarmas.filter(a => a.severidad === "Alta").length;
  const medias = panel.alarmas.filter(a => a.severidad === "Media").length;
  const bajas = panel.alarmas.filter(a => a.severidad === "Baja").length;

  if (!panel.alarmas.length) {
    bar.innerHTML = `<div class="ews-resumen-item"><span class="ews-badge ok">Sin alarmas activas</span></div>`;
    return;
  }
  bar.innerHTML = `
    <div class="ews-resumen-item"><span class="ews-badge alta">${altas}</span><span>Altas</span></div>
    <div class="ews-resumen-item"><span class="ews-badge media">${medias}</span><span>Medias</span></div>
    <div class="ews-resumen-item"><span class="ews-badge baja">${bajas}</span><span>Bajas</span></div>
  `;
}

function renderDetalleAlarmasV107(panel, titulo) {
  if ($V107("alarmasDetalleTitulo")) $V107("alarmasDetalleTitulo").textContent = titulo;
  if ($V107("alarmasDetalleCount")) $V107("alarmasDetalleCount").textContent = `${panel.alarmas.length} alarmas`;
  const body = $V107("alarmasDetalleBody");
  if (!body) return;
  if (!panel.alarmas.length) {
    body.innerHTML = `<tr><td colspan="3">Sin alarmas activas en este momento.</td></tr>`;
    return;
  }
  body.innerHTML = panel.alarmas.map(a => `
    <tr>
      <td><span class="ews-badge ${a.severidad.toLowerCase()}">${a.severidad}</span></td>
      <td>${a.categoria}</td>
      <td>${a.detalle}</td>
    </tr>`).join("");
}

// ------------------------------------------------------------
// Render del panel RTE (asíncrono — consulta Supabase).
// ------------------------------------------------------------
async function renderRtePanelV107() {
  const body = $V107("rteBody");
  const badge = $V107("rteConfianzaBadge");
  const nota = $V107("rteNota");
  if (!body) return;
  body.innerHTML = `<tr><td colspan="5">Calculando…</td></tr>`;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  let asesores;
  if (esAdmin && typeof DATA !== "undefined" && Array.isArray(DATA.asesores)) {
    asesores = DATA.asesores.map(a => a.nombre || a.email || a.id).filter(Boolean);
  } else {
    const nombreAsesor = (typeof currentUserV86 !== "undefined" && currentUserV86 && currentUserV86.nombre) || null;
    asesores = nombreAsesor ? [nombreAsesor] : [];
  }

  if (!asesores.length || typeof probabilidadCumplimientoAsesorV107 !== "function") {
    body.innerHTML = `<tr><td colspan="5">Motor RTE no disponible.</td></tr>`;
    return;
  }

  const resultados = await Promise.all(asesores.map(a => probabilidadCumplimientoAsesorV107(a)));
  const algunaSuficiente = resultados.some(r => r && r.confianza === "suficiente");

  if (badge) {
    badge.innerHTML = algunaSuficiente
      ? `<span class="ews-badge ok">Confianza suficiente</span>`
      : `<span class="ews-badge media">Confianza insuficiente</span>`;
  }
  if (nota) {
    nota.textContent = algunaSuficiente
      ? "La probabilidad usa el histórico real acumulado en historial_metas_mensuales."
      : "Aún no hay muestra histórica suficiente (mínimo 20 registros de meses cerrados). La probabilidad mostrada es una referencia neutra (50%), no una predicción estadística. Se activa automáticamente al cerrar meses con cerrarMesHistoricoRTEV107.";
  }

  body.innerHTML = resultados.map(r => {
    if (!r || !r.aplica) return `<tr><td>${r ? r.asesor : "—"}</td><td colspan="4">Sin clientes elegibles.</td></tr>`;
    return `
      <tr>
        <td>${r.asesor}</td>
        <td>${(r.probabilidad * 100).toFixed(0)}%</td>
        <td><span class="ews-badge ${r.confianza === "suficiente" ? "ok" : "media"}">${r.confianza}</span></td>
        <td>${r.clientesEvaluados}</td>
        <td>${r.clientesExcluidos}</td>
      </tr>`;
  }).join("");
}

function renderAlarmasViewV107() {
  renderEwsPanelV107();
  renderRtePanelV107();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($V107("navAlarmas")) $V107("navAlarmas").addEventListener("click", showAlarmasViewV107);
  if ($V107("alarmasRefreshBtn")) $V107("alarmasRefreshBtn").addEventListener("click", renderAlarmasViewV107);
});
