// ============================================================
// V16.24 — Procedimiento de cargue de información inicial
// ------------------------------------------------------------
// Capa aditiva de solo REUBICACIÓN: no borra ni recrea ningún panel
// existente, ni sus listeners. Toma los paneles ya construidos
// (erpConfigBlockV1620 + bloque manual dentro de dailyUpdatePanel,
// activPanelV1623, histPanelV1621) y los mueve, tal cual están en el
// DOM, dentro de un único cajón colapsable en Ajustes, en el orden de
// uso real: Activación primera vez (oculto por defecto) → Histórico →
// Clasificación y estado (placeholder hasta Fase 3) → Conexión ERP →
// Carga manual diaria.
//
// Solo Super Administrador ve este cajón completo. dailyUpdatePanel
// (el contenedor original) queda vacío de layout propio pero sigue
// existiendo en el DOM — su reubicación por ajustes-v1.js no se toca,
// simplemente ya no queda contenido visible suelto ahí porque todo su
// contenido interno fue trasladado a este cajón.
// ============================================================

function $c18(id) { return document.getElementById(id); }

function c18EsSuperAdminV1624() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}

function c18CrearCajonV1624() {
  if ($c18("cargueInicialPanelV1624")) return;

  // Se inserta como primer panel dentro de ajustesPanelsHost (creado
  // por ajustes-v1.js) — mismo host que usan dailyUpdatePanel,
  // usageAdminPanel, syncAdminPanel, masterDataAdminPanel.
  const host = $c18("ajustesPanelsHost");
  if (!host) return;

  const cajon = document.createElement("section");
  cajon.className = "admin-panel cargue-cajon-v1624";
  cajon.id = "cargueInicialPanelV1624";
  cajon.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Procedimiento de cargue de información inicial</h3>
        <p>Solo Super Administrador. Todo lo necesario para activar la app con los datos de un cliente y mantener la venta al día, en orden de uso.</p>
      </div>
    </div>
    <div id="cargueSeccionActivacionV1624"></div>
    <div id="cargueSeccionHistoricoV1624"></div>
    <div id="cargueSeccionClasificacionV1624"></div>
    <div id="cargueSeccionErpV1624"></div>
    <div id="cargueSeccionManualV1624"></div>
  `;
  host.insertBefore(cajon, host.firstChild);
}

function c18EnvolverDetailsV1624(contenedorId, opciones) {
  const contenedor = $c18(contenedorId);
  if (!contenedor || contenedor.dataset.envuelto === "1") return null;
  const details = document.createElement("details");
  details.className = "cargue-details-v1624" + (opciones.destacar ? " cargue-details-danger-v1624" : "");
  if (opciones.abiertoPorDefecto) details.setAttribute("open", "");
  const summary = document.createElement("summary");
  summary.className = "cargue-summary-v1624";
  summary.innerHTML = `<span class="cargue-summary-num-v1624">${opciones.numero}</span><span class="cargue-summary-texto-v1624">${opciones.titulo}</span>`;
  details.appendChild(summary);
  contenedor.appendChild(details);
  contenedor.dataset.envuelto = "1";
  return details;
}

function c18ReubicarV1624() {
  c18CrearCajonV1624();

  // --- 1. Activación primera vez (dentro de masterDataAdminPanel) ---
  const detailsActivacion = c18EnvolverDetailsV1624("cargueSeccionActivacionV1624", {
    numero: "1", titulo: "Activación primera vez (reemplazo total de base)", abiertoPorDefecto: false, destacar: true
  });
  const activPanel = $c18("activPanelV1623");
  if (detailsActivacion && activPanel && activPanel.parentNode !== detailsActivacion) {
    detailsActivacion.appendChild(activPanel);
  }

  // --- 2. Histórico de ventas (año anterior) ---
  const detailsHistorico = c18EnvolverDetailsV1624("cargueSeccionHistoricoV1624", {
    numero: "2", titulo: "Cargar histórico de ventas (año anterior)", abiertoPorDefecto: true, destacar: false
  });
  const histPanel = $c18("histPanelV1621");
  if (detailsHistorico && histPanel && histPanel.parentNode !== detailsHistorico) {
    detailsHistorico.appendChild(histPanel);
  }

  // --- 3. Clasificación y estado (placeholder — motor pendiente, Fase 3) ---
  const detailsClasificacion = c18EnvolverDetailsV1624("cargueSeccionClasificacionV1624", {
    numero: "3", titulo: "Calcular clasificación y estado", abiertoPorDefecto: true, destacar: false
  });
  if (detailsClasificacion && !$c18("cargueClasificacionBtnV1624")) {
    const bloque = document.createElement("div");
    bloque.className = "cargue-clasificacion-v1624";
    bloque.innerHTML = `
      <p>Calcula la clasificación (A/B/C/E/N) y el estado comercial de cada cliente a partir del histórico cargado. Se ejecuta una sola vez, justo después de cargar el histórico por primera vez.</p>
      <button class="btn" id="cargueClasificacionBtnV1624" disabled>Calcular clasificación y estado</button>
      <p class="cargue-clasificacion-nota-v1624">Disponible próximamente.</p>
    `;
    detailsClasificacion.appendChild(bloque);
  }

  // --- 4. Conexión remota ERP (dentro de dailyUpdatePanel) ---
  const detailsErp = c18EnvolverDetailsV1624("cargueSeccionErpV1624", {
    numero: "4", titulo: "Conexión remota (ERP)", abiertoPorDefecto: false, destacar: false
  });
  const erpBloque = $c18("erpConfigBlockV1620");
  const erpModoSelector = $c18("erpModeSelectorV1620");
  const erpLinkPanel = $c18("erpLinkPanelV1620");
  if (detailsErp) {
    if (erpBloque && erpBloque.parentNode !== detailsErp) detailsErp.appendChild(erpBloque);
    if (erpModoSelector && erpModoSelector.parentNode !== detailsErp) detailsErp.appendChild(erpModoSelector);
    if (erpLinkPanel && erpLinkPanel.parentNode !== detailsErp) detailsErp.appendChild(erpLinkPanel);
  }

  // --- 5. Carga manual de ventas diarias (resto de dailyUpdatePanel) ---
  const detailsManual = c18EnvolverDetailsV1624("cargueSeccionManualV1624", {
    numero: "5", titulo: "Carga manual de ventas diarias", abiertoPorDefecto: true, destacar: false
  });
  const manualBloque = $c18("dailyUpdateManualBlockV1620");
  const manualAcciones = $c18("dailyUpdateManualActionsV1620");
  const updateResult = $c18("updateResult");
  if (detailsManual) {
    if (manualBloque && manualBloque.parentNode !== detailsManual) detailsManual.appendChild(manualBloque);
    if (manualAcciones && manualAcciones.parentNode !== detailsManual) detailsManual.appendChild(manualAcciones);
    if (updateResult && updateResult.parentNode !== detailsManual) detailsManual.appendChild(updateResult);
  }

  // dailyUpdatePanel y masterDataAdminPanel quedan vacíos de contenido
  // propio (su título original ya no aplica) — se ocultan como
  // contenedores, sin afectar AJUSTES_PANEL_IDS_V1 ni su reubicación.
  const dailyUpdatePanel = $c18("dailyUpdatePanel");
  if (dailyUpdatePanel) dailyUpdatePanel.style.display = "none";
  const masterDataPanel = $c18("masterDataAdminPanel");
  if (masterDataPanel) {
    const encabezadoUsage = masterDataPanel.querySelector(".usage-actions");
    // Los botones de descarga (downloadMasterDataBtn/downloadMasterLogBtn)
    // se conservan visibles moviéndolos dentro del cajón, sección histórico,
    // ya que son "datos maestros" generales y no exclusivos de activación.
    const detailsHist = $c18("cargueSeccionHistoricoV1624") ? $c18("cargueSeccionHistoricoV1624").querySelector("details") : null;
    if (encabezadoUsage && detailsHist && encabezadoUsage.parentNode !== detailsHist) {
      detailsHist.insertBefore(encabezadoUsage, detailsHist.firstChild.nextSibling);
    }
    masterDataPanel.style.display = "none";
  }
}

function c18PintarVisibilidadV1624() {
  const cajon = $c18("cargueInicialPanelV1624");
  if (!cajon) return;
  cajon.style.display = c18EsSuperAdminV1624() ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  // Se ejecuta después de que ajustes-v1.js ya creó ajustesPanelsHost
  // y reubicó los paneles originales dentro de la vista Ajustes.
  setTimeout(() => {
    try {
      c18ReubicarV1624();
      c18PintarVisibilidadV1624();
    } catch (e) {
      console.error("[Radar-CargueInicial] Error reubicando:", e);
    }
  }, 0);

  if (typeof applyUserProfileV84 === "function") {
    const _original = applyUserProfileV84;
    applyUserProfileV84 = function () {
      _original();
      c18PintarVisibilidadV1624();
    };
  }
  if (typeof applyAdminVisibilityV811 === "function") {
    const _originalVis = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _originalVis();
      c18PintarVisibilidadV1624();
    };
  }
});
