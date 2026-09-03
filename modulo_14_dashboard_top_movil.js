// ============================================================
// V15.18 — Dashboard: tarjeta compacta en celular para "Top 15
// clientes Pareto general" y "Top 10 por asesor"
// ------------------------------------------------------------
// Pedido de Sergio (03-sep-2026), con evidencia de screenshot real:
// en celular, cada fila de estas dos tablas se veía como 5-6 líneas
// sueltas sin etiqueta (las celdas de renderParetoV813, en app.js, no
// traían data-label, a diferencia de #routeTable o #recomendadasTable
// que sí lo tenían desde antes) — 15 clientes generaban un scroll
// larguísimo. Se aplica el mismo patrón ya aprobado y en uso en
// #routeTable (hoja-ruta-v15.js) y #recomendadasTable
// (modulo_13_recomendadas_movil.js): tarjeta contraída mostrando solo
// # + Cliente + el dato principal de cada tabla (Venta 2026 + %
// acumulado en Pareto general; Venta 2026 en Top por asesor), que se
// expande al tocar para ver el resto de columnas.
//
// Envuelve renderParetoV813 (app.js) siguiendo el patrón wrapper del
// proyecto: no reemplaza su lógica de cálculo/orden, solo agrega
// data-label a las celdas ya generadas y aplica la clase de tarjeta
// contraíble. Requiere cargarse DESPUÉS de app.js.
//
// Nota para futuras pestañas: si otra tabla del Dashboard (o de
// cualquier otra pestaña) presenta el mismo problema en celular —
// filas largas sin etiqueta — el patrón a seguir es este mismo:
// agregar data-label a cada <td> según el <th> de su columna, envolver
// la función de render con el patrón wrapper, y reutilizar las mismas
// clases CSS de tarjeta contraíble (ver styles.css, bloque
// "V15.18 - tarjeta contraíble genérica").
// ============================================================

function $d14(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// Agrega data-label="<texto del th>" a cada <td> de una tabla, según
// la posición de columna — funciona para cualquier tabla con <thead>
// de una sola fila, sin necesidad de tocar la función que genera las
// filas.
// ------------------------------------------------------------
function etiquetarFilasV1014(tableId) {
  const table = $d14(tableId);
  if (!table) return;
  const ths = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent.trim());
  if (!ths.length) return;
  table.querySelectorAll("tbody tr").forEach(tr => {
    Array.from(tr.children).forEach((td, i) => {
      if (ths[i]) td.setAttribute("data-label", ths[i]);
    });
  });
}

function ajustarDashboardTopMovilV1014() {
  etiquetarFilasV1014("paretoTable");
  etiquetarFilasV1014("advisorTopTable");
}

if (typeof renderParetoV813 === "function") {
  const _renderParetoOriginalV1014 = renderParetoV813;
  renderParetoV813 = function (...args) {
    const resultado = _renderParetoOriginalV1014.apply(this, args);
    ajustarDashboardTopMovilV1014();
    return resultado;
  };
}

// ------------------------------------------------------------
// Tarjeta expandible en celular — mismo patrón que hoja-ruta-v15.js
// (#routeTable) y modulo_13_recomendadas_movil.js (#recomendadasTable):
// tocar la fila expande/colapsa (el CSS decide qué se ve en cada ancho
// de pantalla; en escritorio esta clase no tiene efecto visual).
// ------------------------------------------------------------
document.addEventListener("click", (e) => {
  const tr = e.target.closest && e.target.closest("#paretoTable tbody tr, #advisorTopTable tbody tr");
  if (!tr) return;
  tr.classList.toggle("row-expanded");
});
