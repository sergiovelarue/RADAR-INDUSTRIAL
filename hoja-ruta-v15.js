// ============================================================
// V15.3 — Paginación de "Hoja de ruta" + tarjeta compacta en celular
// ------------------------------------------------------------
// Decisión del cliente (Ago 20):
// 1) Paginar la tabla "Hoja de ruta" (50 clientes por página), visible
//    y funcional tanto para Administrador/Super Administrador como
//    para Asesor.
// 2) En celular, cada cliente se muestra como una tarjeta compacta con
//    Cliente + Estado + Cumplimiento siempre visibles; al tocarla se
//    expande dentro de la misma tarjeta mostrando el resto de campos
//    (NIT, Asesor, Venta 2025, Venta actual, Meta, Faltante) y el botón
//    "Ver" que abre el modal de detalle completo/editable que ya existía.
//
// Este archivo se carga al final de index.html (después de metas-v1.js)
// para que su envoltura de renderTable() sea la última en aplicarse,
// siguiendo el mismo patrón "wrap-and-chain" usado en el resto de la
// app: no reemplaza el render existente, solo pagina lo que ya se
// renderizó y agrega el comportamiento de expandir/colapsar en celular.
// No modifica cálculos, permisos ni datos de clientes/ventas/metas.
// ============================================================

const ROUTE_PAGE_SIZE_V15 = 50;

// Firma de las filas realmente filtradas (antes de ordenar) — si el
// conjunto de clientes cambia (por filtro de mes, asesor, tipo, canal,
// búsqueda, etc.) se regresa a la página 1. Si solo cambia el orden
// (selector "Ordenar por"), la página actual se conserva.
let _rutaFirmaFiltroV15 = null;

function rutaTotalPaginasV15(total) {
  return Math.max(1, Math.ceil(total / ROUTE_PAGE_SIZE_V15));
}

function rutaPaginarV15() {
  const tbody = $("routeBody");
  const cont = $("routePaginationV15");
  if (!tbody || !cont) return;

  const filas = Array.from(tbody.querySelectorAll("tr"));
  const total = filas.length;

  if (total === 0) {
    cont.style.display = "none";
    cont.innerHTML = "";
    return;
  }

  const totalPaginas = rutaTotalPaginasV15(total);
  state.routePage = Math.min(Math.max(1, state.routePage || 1), totalPaginas);

  const inicio = (state.routePage - 1) * ROUTE_PAGE_SIZE_V15;
  const fin = Math.min(inicio + ROUTE_PAGE_SIZE_V15, total);

  filas.forEach((tr, i) => {
    tr.style.display = (i >= inicio && i < fin) ? "" : "none";
  });

  cont.style.display = "flex";
  cont.innerHTML = `
    <span class="pagination-info">Mostrando ${(inicio + 1).toLocaleString("es-CO")}–${fin.toLocaleString("es-CO")} de ${total.toLocaleString("es-CO")} clientes</span>
    <div class="pagination-controls">
      <button type="button" id="routePagPrevV15" ${state.routePage <= 1 ? "disabled" : ""}>&laquo; Anterior</button>
      <span class="pagination-page">Página ${state.routePage} de ${totalPaginas}</span>
      <button type="button" id="routePagNextV15" ${state.routePage >= totalPaginas ? "disabled" : ""}>Siguiente &raquo;</button>
    </div>
  `;

  const btnPrev = $("routePagPrevV15");
  const btnNext = $("routePagNextV15");
  if (btnPrev) btnPrev.addEventListener("click", () => {
    if (state.routePage > 1) {
      state.routePage -= 1;
      rutaPaginarV15();
      rutaScrollArribaTablaV15();
    }
  });
  if (btnNext) btnNext.addEventListener("click", () => {
    if (state.routePage < totalPaginas) {
      state.routePage += 1;
      rutaPaginarV15();
      rutaScrollArribaTablaV15();
    }
  });
}

function rutaScrollArribaTablaV15() {
  const card = document.querySelector(".table-card");
  if (card && card.scrollIntoView) card.scrollIntoView({ behavior: "smooth", block: "start" });
}

const _renderTableOriginalV15 = renderTable;
renderTable = function (arr) {
  const firma = (arr || []).map(c => c.nit).join("|");
  if (firma !== _rutaFirmaFiltroV15) {
    state.routePage = 1;
    _rutaFirmaFiltroV15 = firma;
  }
  _renderTableOriginalV15(arr);
  rutaPaginarV15();
};

// ------------------------------------------------------------
// Tarjeta expandible en celular: al tocar la fila se agrega/quita la
// clase "row-expanded" (el CSS decide qué se ve en cada ancho de
// pantalla — en escritorio esta clase no tiene efecto visual). Tocar
// el botón "Ver" no expande/colapsa: abre el modal existente, como
// ya lo maneja el listener de app.js sobre [data-detail-nit].
// ------------------------------------------------------------
document.addEventListener("click", (e) => {
  if (e.target.closest(".detail-btn")) return;
  const tr = e.target.closest && e.target.closest("#routeBody tr");
  if (!tr) return;
  tr.classList.toggle("row-expanded");
});
