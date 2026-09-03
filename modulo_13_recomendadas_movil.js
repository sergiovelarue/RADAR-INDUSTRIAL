// ============================================================
// V1 — "Acciones recomendadas": simplificación de columnas +
// tarjeta compacta en celular
// ------------------------------------------------------------
// Pedido de Sergio (03-sep-2026):
//   1) Contraer la tabla de clientes sugeridos en celular igual que
//      ya se hizo en "Hoja de ruta" (ver hoja-ruta-v15.js + CSS
//      #routeTable en styles.css): tarjeta colapsada mostrando solo
//      la razón social, que se expande al tocar.
//   2) El nombre del asesor no se ve completo en la columna Asesor —
//      alcanza con el primer nombre, no hace falta nombre y apellido.
//   3) La columna Score no le aporta nada al asesor (es un dato para
//      priorizar, no para actuar) — se oculta quien NO es admin. Para
//      el administrador sí tiene valor real (comparar entre varios
//      asesores), así que se conserva para ese rol.
//
// Envuelve renderAccionesRecomendadasV102 (mejoras-v1.js) siguiendo el
// patrón wrapper del proyecto: no reemplaza su lógica, ajusta el HTML
// ya generado después de que corre. Requiere cargarse DESPUÉS de
// mejoras-v1.js.
// ============================================================

function $rm1(id) { return document.getElementById(id); }

if (typeof renderAccionesRecomendadasV102 === "function") {
  const _renderAccionesRecomendadasOriginalV1 = renderAccionesRecomendadasV102;
  renderAccionesRecomendadasV102 = function (...args) {
    const resultado = _renderAccionesRecomendadasOriginalV1.apply(this, args);
    ajustarRecomendadasV1();
    return resultado;
  };
}

function ajustarRecomendadasV1() {
  const body = $rm1("recomendadasBody");
  if (!body) return;
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();

  body.querySelectorAll("tr").forEach(tr => {
    // Asesor: primer nombre únicamente (columna 2, data-label="Asesor").
    const tdAsesor = tr.querySelector('td[data-label="Asesor"]');
    if (tdAsesor && !tdAsesor.dataset.acortado) {
      const nombreCompleto = tdAsesor.textContent.trim();
      if (nombreCompleto && nombreCompleto !== "SIN ASIGNACION") {
        tdAsesor.textContent = nombreCompleto.split(/\s+/)[0];
      }
      tdAsesor.dataset.acortado = "1";
    }

    // Score: solo tiene utilidad real para comparar entre asesores —
    // el asesor viendo su propia lista no necesita el número, solo el
    // orden ya resuelto de la tabla. Se oculta la celda completa (no
    // el <th>, que sigue siendo el mismo elemento para admin/asesor,
    // pero renderAccionesRecomendadasV102 no distingue columnas por
    // rol al armar el <thead> — este ajuste es suficiente porque solo
    // afecta las celdas del cuerpo, visualmente el <th> vacío de una
    // columna sin datos no genera confusión, y evita tocar el HTML
    // estático de index.html).
    const tdScore = tr.querySelector('td[data-label="Score"]');
    if (tdScore) tdScore.style.display = esAdmin ? "" : "none";
  });

  const thScore = document.querySelector('#recomendadasTable thead th:nth-child(7)');
  if (thScore) thScore.style.display = esAdmin ? "" : "none";
}

// ------------------------------------------------------------
// Tarjeta expandible en celular — mismo patrón que hoja-ruta-v15.js
// para #routeTable: tocar la fila expande/colapsa, tocar el botón de
// acción ("Definir acción" o el botón del Motor ARC) no interfiere
// con ese toggle.
// ------------------------------------------------------------
document.addEventListener("click", (e) => {
  if (e.target.closest("button")) return;
  const tr = e.target.closest && e.target.closest("#recomendadasBody tr");
  if (!tr) return;
  tr.classList.toggle("row-expanded");
});
