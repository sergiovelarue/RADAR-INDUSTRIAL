// ============================================================
// V1 — Estabilidad de navegación entre pestañas (fix definitivo)
// ------------------------------------------------------------
// Pedido de Sergio (03-sep-2026), con evidencia real: "a veces al
// abrir una pestaña se queda visible información de la pestaña
// anterior". Ya se había corregido una vez este mismo tipo de bug
// (ver modulo_05_ui_motores.js y modulo_08_ui_ranking.js, comentarios
// "FIX bug reportado por Sergio 11-ago-2026"), pero el patrón usado
// para corregirlo — cada módulo mantiene su PROPIA lista fija de
// "vistas hermanas" a ocultar y su PROPIA lista fija de funciones
// show* a envolver — es frágil: cada vez que se agrega una pestaña
// nueva (Ajustes, Sistema, y ahora el Motor ARC), hay que acordarse
// de actualizar las listas de TODOS los módulos anteriores, y eso no
// pasó. Resultado confirmado en el código real:
//   - modulo_05_ui_motores.js / modulo_08_ui_ranking.js: su lista
//     VISTAS_HERMANAS_V107 no incluye ajustesView ni sistemaView
//     (esos módulos se crearon después). Si el usuario visita Ajustes
//     o Sistema y luego entra a Alarmas o Ranking, la vista anterior
//     queda visible por debajo.
//   - ajustes-v1.js: su lista de funciones a envolver solo tiene 4
//     de las 12 reales (le faltan showLogViewV98,
//     showSeguimientoViewV100, showMetasViewV106,
//     showProspeccionViewV104, showAlarmasViewV107,
//     showRankingViewV107, showSistemaV1). Si el usuario visita
//     Ajustes y luego cualquiera de esas 7 pestañas, ajustesView
//     queda visible por debajo.
//
// Este módulo reemplaza ese patrón por una única lista maestra,
// mantenida en un solo lugar, y envuelve TODAS las funciones show*
// reales de una sola vez. Se carga AL FINAL de index.html (después
// de todos los demás módulos) para que su wrapping sea el último en
// aplicarse y quede como capa de seguridad definitiva — no reemplaza
// ni depende de que los wrappers anteriores estén bien o mal, los
// complementa: pase lo que pase en las capas anteriores, esta capa
// final garantiza que SIEMPRE se oculten TODAS las vistas antes de
// mostrar la que corresponde.
// ============================================================

// Lista maestra de IDs de vista de "pestaña" — si se agrega una
// pestaña nueva en el futuro, agregar su id aquí (único lugar que
// hay que actualizar).
const TODAS_LAS_VISTAS_V1 = [
  "directorDashboardView", "glossaryView", "clientsManagementView",
  "advisorsManagementView", "logView", "seguimientoView", "metasView",
  "prospeccionView", "alarmasView", "rankingView", "ajustesView",
  "sistemaView",
];

// Lista maestra de funciones de navegación reales — mismo criterio:
// único lugar a actualizar cuando se agregue una pestaña nueva.
const TODAS_LAS_FUNCIONES_NAV_V1 = [
  "showViewV812", "showGlossaryV814", "showClientsManagementV93",
  "showAdvisorsManagementV93", "showLogViewV98", "showSeguimientoViewV100",
  "showMetasViewV106", "showProspeccionViewV104", "showAlarmasViewV107",
  "showRankingViewV107", "showAjustesV1", "showSistemaV1",
];

function $nav1(id) { return document.getElementById(id); }

// Oculta TODAS las vistas conocidas, sin excepción. Se llama SIEMPRE
// antes de que cualquier función show* real haga su propio trabajo
// (mostrar la vista que corresponde) — por eso funciona como red de
// seguridad final, sin importar qué falte en las capas anteriores.
function ocultarTodasLasVistasV1() {
  TODAS_LAS_VISTAS_V1.forEach(id => {
    const el = $nav1(id);
    if (el) el.classList.add("hidden-view");
  });
}

TODAS_LAS_FUNCIONES_NAV_V1.forEach(nombreFn => {
  if (typeof window[nombreFn] !== "function") return;
  const original = window[nombreFn];
  window[nombreFn] = function (...args) {
    ocultarTodasLasVistasV1();
    return original.apply(this, args);
  };
});
