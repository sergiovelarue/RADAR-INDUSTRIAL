// ============================================================
// V1 Ajustes — Radar Comercial B2B (RADAR-INDUSTRIAL)
// Capa aditiva: agrupa en una sola pestaña "Ajustes" los paneles que
// hoy están sueltos en la Hoja de ruta (Actualización diaria,
// Estadísticas de uso Radar, Sincronización de datos). No borra ni
// reescribe esos paneles: los
// reubica en el DOM dentro de una nueva vista, siguiendo el mismo
// patrón que showClientsManagementV93/showAdvisorsManagementV93
// (app.js V9.3).
//
// Nota de alcance (decisión explícita del cliente, Ago 18):
// - "Configuración comercial por clasificación" (growthConfigPanel)
//   NO se mueve aquí: sigue siendo exclusivo de Super Administrador
//   y se reubicará en la pestaña "Sistema" (Etapa 2).
// - "Estadísticas de uso Radar" (usageAdminPanel) SÍ se mueve aquí y
//   se relaja su visibilidad: pasa de "solo Super Administrador" a
//   "Administrador y Super Administrador", igual que el resto de
//   Ajustes.
//
// Mejoras (2026-08-19): "Soporte — reportes de usuarios" (soporteAdminPanel)
// SALE de Ajustes. Ahora vive exclusivamente dentro de "Gestión de
// asesores" (soporte-v1.js lo inserta allí directamente).
// ============================================================

const AJUSTES_PANEL_IDS_V1 = [
  "dailyUpdatePanel",
  "usageAdminPanel",
  "syncAdminPanel"
];

function ajustesEsAdminV1() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

function ajustesInsertarNavV1() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || $("navAjustes")) return;
  const navLog = $("navLog");
  const a = document.createElement("a");
  a.id = "navAjustes";
  a.textContent = "Ajustes";
  // Mismo criterio de orden que el resto de pestañas administrativas:
  // se ubica junto a Gestión de clientes/asesores/Log de cambios.
  if (navLog && navLog.parentNode) {
    navLog.parentNode.insertBefore(a, navLog);
  } else {
    nav.appendChild(a);
  }
  a.addEventListener("click", showAjustesV1);
}

function ajustesInsertarVistaV1() {
  if ($("ajustesView")) return;
  const referencia = $("clientsManagementView");
  if (!referencia || !referencia.parentNode) return;

  const section = document.createElement("section");
  section.className = "ajustes-view hidden-view";
  section.id = "ajustesView";
  section.innerHTML = `
    <div class="dashboard-title">
      <div>
        <p>Actualización de ventas, estadísticas de uso, soporte y sincronización de datos. Visible para Administrador y Super Administrador.</p>
      </div>
    </div>
    <div class="ajustes-panels" id="ajustesPanelsHost"></div>
  `;
  referencia.parentNode.insertBefore(section, referencia);
}

function ajustesReubicarPanelesV1() {
  const host = $("ajustesPanelsHost");
  if (!host) return;
  AJUSTES_PANEL_IDS_V1.forEach(id => {
    const el = $(id);
    if (el && el.parentNode !== host) {
      host.appendChild(el);
    }
  });
}

function showAjustesV1() {
  if (!ajustesEsAdminV1()) return;
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  ajustesReubicarPanelesV1();
  const view = $("ajustesView");
  if (view) view.classList.remove("hidden-view");
  // Los paneles reubicados tenían su propia visibilidad controlada por
  // applyAdminVisibilityV811 (admin-only-panel-hidden / superadmin-only-hidden)
  // y por showViewV812/showGlossaryV814 (hidden-view). Al entrar a Ajustes
  // se destapan explícitamente esas clases, dejando intacta la lógica que
  // decide SI cada panel debe mostrarse a este usuario.
  AJUSTES_PANEL_IDS_V1.forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("hidden-view");
  });
  if ($("navAjustes")) $("navAjustes").classList.add("active");
}

// ------------------------------------------------------------
// V15.0: "Estadísticas de uso Radar" ya queda unificada a Administrador +
// Super Administrador directamente en applyAdminVisibilityV811 (app.js,
// clase admin-only-panel-hidden) y en renderUsageDashboardV84 (app.js,
// clase hidden-by-profile) — decisión confirmada del cliente (Ago 20),
// que reemplaza el ajuste parcial hecho aquí el Ago 18 (que solo tocaba
// superadmin-only-hidden y dejaba la contradicción con hidden-by-profile).
// Esta función se conserva vacía y sin llamar activamente por
// retrocompatibilidad de nombre, pero applyAdminVisibilityV811 ya no
// necesita este parche: no se toca ninguna clase aquí para evitar
// pisar el criterio unificado de las dos piezas en app.js.
// ------------------------------------------------------------
function ajustesAjustarVisibilidadUsoV1() {
  // Sin acción — ver comentario arriba. No eliminada por completo para
  // no romper el listener que la invoca más abajo en este archivo.
}

document.addEventListener("DOMContentLoaded", () => {
  ajustesInsertarNavV1();
  ajustesInsertarVistaV1();

  if (typeof applyAdminVisibilityV811 === "function") {
    const _applyAdminVisibilidadOriginalAjustesV1 = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _applyAdminVisibilidadOriginalAjustesV1();
      try {
        ajustesAjustarVisibilidadUsoV1();
        if ($("navAjustes")) $("navAjustes").style.display = ajustesEsAdminV1() ? "" : "none";
      } catch (e) {
        console.error("[Radar-Ajustes] Error aplicando visibilidad:", e);
      }
    };
  }

  // Mismo criterio que showViewV812/showGlossaryV814/showClientsManagementV93:
  // ocultar ajustesView cuando se navega a cualquier otra pestaña.
  ["showViewV812", "showGlossaryV814", "showClientsManagementV93", "showAdvisorsManagementV93"].forEach(fnName => {
    if (typeof window[fnName] === "function") {
      const _original = window[fnName];
      window[fnName] = function (...args) {
        const view = $("ajustesView");
        if (view) view.classList.add("hidden-view");
        return _original.apply(this, args);
      };
    }
  });
});
