// ============================================================
// V16.42 — Ranking de ventas (reemplaza el ranking de puntaje RAC
// visible en esta pestaña) + perfil individual RAC leído desde
// Supabase (ya no se calcula en el navegador ni depende del botón
// manual "Cerrar semana" — ver Edge Function cerrar-semana-rac y
// tabla rac_logro_estado_asesor_v1, cron semanal automático).
// ------------------------------------------------------------
// Debe cargarse DESPUÉS de app.js, supabase-sync.js y
// modulo_06_motor_RAC.js. Sigue el mismo patrón de wrapping de
// navegación ya usado en modulo_05_ui_motores.js (no reemplaza
// hideAllPrimaryViewsV93 ni showViewV812, los envuelve).
//
// Ranking de ventas — reglas acordadas con Sergio (2026-09-08):
// - Ordenado por venta real ($) de cada asesor, no por puntaje.
// - Switch "Ventas del mes" (mes operativo vigente, igual que el
//   resto de la app — sin selector adicional) / "Acumulado del año".
// - Medallas 🥇🥈🥉 para el top 3.
// - Vista admin: ve todos los nombres y cifras.
// - Vista asesor: ve su propia fila nítida y resaltada; el resto
//   difuminado (blur + sin selección de texto) — no puede leer
//   quién es quién ni sus cifras.
// ============================================================

function $V107c(id) { return document.getElementById(id); }

// FIX mismo bug de modulo_05_ui_motores.js: se oculta explícitamente
// el set completo de vistas hermanas (no solo hideAllPrimaryViewsV93,
// que no cubre prospeccionView/metasView/logView/seguimientoView), y
// se envuelven TODAS las funciones show* reales (antes solo 3 de 8).
function showRankingViewV107() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  if (typeof ocultarVistasHermanasV107 === "function") ocultarVistasHermanasV107();
  const av = $V107c("alarmasView"); if (av) av.classList.add("hidden-view");
  const view = $V107c("rankingView");
  if (view) view.classList.remove("hidden-view");
  if ($V107c("navRanking")) $V107c("navRanking").classList.add("active");
  renderRankingViewV107();
}

["showViewV812", "showGlossaryV814", "showClientsManagementV93",
 "showAdvisorsManagementV93", "showLogViewV98", "showSeguimientoViewV100",
 "showMetasViewV106", "showProspeccionViewV104", "showAlarmasViewV107"].forEach(nombreFn => {
  if (typeof window[nombreFn] === "function") {
    const original = window[nombreFn];
    window[nombreFn] = function (...args) {
      const rv = $V107c("rankingView"); if (rv) rv.classList.add("hidden-view");
      return original.apply(this, args);
    };
  }
});

const RAC_MEDALLAS_V107 = ["🥇", "🥈", "🥉"];

// ------------------------------------------------------------
// Ranking de ventas — cálculo en el cliente (dato real, ya
// disponible en DATA.clientes, sin necesidad de ir a Supabase).
// ------------------------------------------------------------
const rankingVentasStateV1642 = { periodo: "mes" };

function rankingVentasCalcularV1642(periodo) {
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const mesVigente = typeof latestOperationalMonthV810 === "function" ? latestOperationalMonthV810() : null;

  const filas = asesores.map(nombreAsesor => {
    const misClientes = (DATA.clientes || []).filter(c => {
      if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
      return c.asesorAsignado === nombreAsesor;
    });
    const venta = periodo === "anio"
      ? misClientes.reduce((s, c) => s + (typeof totalYtdV812 === "function" ? totalYtdV812(c, 2026) : 0), 0)
      : misClientes.reduce((s, c) => s + (mesVigente && typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, mesVigente) : 0), 0);
    return { asesor: nombreAsesor, venta };
  });

  filas.sort((a, b) => b.venta - a.venta);
  filas.forEach((f, i) => { f.posicion = i + 1; });
  return filas;
}

function rankingVentasFilaHtmlV1642(f, esAdmin, nombreUsuario) {
  const medalla = f.posicion <= 3 ? RAC_MEDALLAS_V107[f.posicion - 1] : null;
  const esPropia = !esAdmin && f.asesor === nombreUsuario;
  const debeOcultar = !esAdmin && !esPropia;

  const claseFila = ["ranking-ventas-row"];
  if (f.posicion === 1) claseFila.push("top1");
  if (esPropia) claseFila.push("propia");

  const nombreHtml = debeOcultar
    ? `<span class="ranking-ventas-nombre ranking-ventas-blur">${esc(f.asesor)}</span>`
    : `<span class="ranking-ventas-nombre${esPropia ? " propia" : ""}">${esc(f.asesor)}${esPropia ? " (tú)" : ""}</span>`;
  const valorHtml = debeOcultar
    ? `<span class="ranking-ventas-valor ranking-ventas-blur">${money(f.venta)}</span>`
    : `<span class="ranking-ventas-valor">${money(f.venta)}</span>`;

  return `
    <div class="${claseFila.join(" ")}">
      ${medalla ? `<span class="ranking-ventas-medalla">${medalla}</span>` : `<span class="ranking-ventas-pos">${f.posicion}</span>`}
      ${nombreHtml}
      ${valorHtml}
    </div>`;
}

function renderRankingVentasV1642() {
  const cont = $V107c("rankingVentasLista");
  if (!cont) return;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreUsuario = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;

  const filas = rankingVentasCalcularV1642(rankingVentasStateV1642.periodo);
  cont.innerHTML = filas.length
    ? filas.map(f => rankingVentasFilaHtmlV1642(f, esAdmin, nombreUsuario)).join("")
    : `<p class="ranking-ventas-vacio">No hay asesores registrados todavía.</p>`;
}

function rankingVentasCambiarPeriodoV1642(periodo) {
  rankingVentasStateV1642.periodo = periodo;
  const btnMes = $V107c("rankingVentasSwitchMes");
  const btnAnio = $V107c("rankingVentasSwitchAnio");
  if (btnMes) btnMes.classList.toggle("active", periodo === "mes");
  if (btnAnio) btnAnio.classList.toggle("active", periodo === "anio");
  renderRankingVentasV1642();
}

// ------------------------------------------------------------
// Perfil RAC individual — leído desde Supabase
// (rac_logro_estado_asesor_v1), actualizado por el cron semanal.
// Ya no se calcula en el navegador ni hay botón "Cerrar semana".
// ------------------------------------------------------------
async function rankingLeerLogroAsesorV1642(nombreAsesor) {
  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94 || !nombreAsesor) return null;
  const { data, error } = await supabaseClientV94
    .from("rac_logro_estado_asesor_v1")
    .select("*")
    .eq("asesor", nombreAsesor)
    .maybeSingle();
  if (error) { console.error("[Radar-Ranking] Error leyendo logro RAC:", error); return null; }
  return data;
}

async function renderPerfilRacV107() {
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const cont = $V107c("rankingPerfilCard");
  if (!cont) return;

  let nombreAsesor;
  const sel = $V107c("rankingAsesorSelect");
  if (esAdmin) {
    if (sel) {
      sel.style.display = "";
      if (!sel.dataset.poblado) {
        const asesores = (DATA.meta && DATA.meta.asesores) || [];
        sel.innerHTML = asesores.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
        sel.dataset.poblado = "1";
      }
    }
    nombreAsesor = sel ? sel.value : null;
  } else {
    if (sel) sel.style.display = "none";
    nombreAsesor = (typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;
  }
  if (!nombreAsesor) { cont.innerHTML = "Selecciona un asesor."; return; }

  cont.innerHTML = "Cargando perfil…";
  const logro = await rankingLeerLogroAsesorV1642(nombreAsesor);
  if (!logro) {
    cont.innerHTML = `<p style="color:#6B6B6B;font-size:13px">Todavía no hay datos de rendimiento para ${esc(nombreAsesor)} — se actualizan automáticamente cada lunes.</p>`;
    return;
  }

  const nombresInsignia = { meta_superada: { nombre: "Meta superada", icono: "🏆" }, cartera_sana: { nombre: "Cartera sana (90%+ activos)", icono: "💚" }, elite: { nombre: "Rendimiento élite", icono: "⭐" } };
  const insignias = Array.isArray(logro.insignias) ? logro.insignias : [];
  const insigniasHtml = insignias.length
    ? insignias.map(id => {
        const info = nombresInsignia[id] || { nombre: id, icono: "🏅" };
        return `<span class="ews-badge ok" title="${esc(info.nombre)}">${info.icono} ${esc(info.nombre)}</span>`;
      }).join(" ")
    : `<span style="color:#6B6B6B;font-size:13px">Sin insignias este mes todavía.</span>`;

  cont.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div>
        <h3 style="margin:0 0 4px">${esc(logro.asesor)}</h3>
        <p style="margin:0;color:#6B6B6B;font-size:13px">Nivel <strong>${esc(logro.nivel)}</strong></p>
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:800">🔥 ${Number(logro.racha || 0)}</div>
        <div style="font-size:12px;color:#6B6B6B">semanas de racha</div>
      </div>
    </div>
    <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap">
      <div><div style="font-size:22px;font-weight:700">${Number(logro.puntos_acumulados || 0).toFixed(0)}</div><div style="font-size:12px;color:#6B6B6B">Puntos acumulados (nivel)</div></div>
      <div><div style="font-size:22px;font-weight:700">${Number(logro.racha_record || 0)}</div><div style="font-size:12px;color:#6B6B6B">Racha récord</div></div>
    </div>
    <div style="margin-top:14px">${insigniasHtml}</div>
    <p class="ews-nota">Se actualiza automáticamente cada lunes a medianoche (hora Colombia). Última actualización: ${logro.actualizado_en ? new Date(logro.actualizado_en).toLocaleString("es-CO") : "—"}.</p>
  `;
}

function renderRankingViewV107() {
  renderRankingVentasV1642();
  renderPerfilRacV107();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($V107c("navRanking")) $V107c("navRanking").addEventListener("click", showRankingViewV107);
  if ($V107c("rankingRefreshBtn")) $V107c("rankingRefreshBtn").addEventListener("click", renderRankingViewV107);
  if ($V107c("rankingAsesorSelect")) $V107c("rankingAsesorSelect").addEventListener("change", renderPerfilRacV107);
  if ($V107c("rankingVentasSwitchMes")) $V107c("rankingVentasSwitchMes").addEventListener("click", () => rankingVentasCambiarPeriodoV1642("mes"));
  if ($V107c("rankingVentasSwitchAnio")) $V107c("rankingVentasSwitchAnio").addEventListener("click", () => rankingVentasCambiarPeriodoV1642("anio"));
});

// ============================================================
// Insignia sin texto junto al nombre del asesor — visible en toda
// la app (se pinta en updateSessionRoleLabelV93, que ya corre en
// cada login y aparece en el sidebar desde la Hoja de Ruta hasta
// cualquier otra pestaña). Solo para perfil asesor, nunca admin.
// Muestra un ícono por cada logro nuevo de la semana (subida de
// nivel, racha récord, insignia nueva), con tooltip al pasar el
// cursor. Permanece visible mientras la condición siga vigente esa
// semana (no se oculta al verla, a diferencia del aviso de "Nueva
// meta del mes") — decisión explícita de Sergio (2026-09-08).
// ============================================================
const RAC_INSIGNIA_ICONOS_V1642 = {
  nivel: { Plata: "🥈", Oro: "🥇", Platino: "💠", Diamante: "💎" },
  racha: "🔥",
  meta_superada: "🏆",
  cartera_sana: "💚",
  elite: "⭐",
};
const RAC_INSIGNIA_NOMBRES_V1642 = {
  meta_superada: "Meta superada",
  cartera_sana: "Cartera sana (90%+ activos)",
  elite: "Rendimiento élite",
};

async function pintarInsigniaLogroSesionV1642() {
  const roleLabel = $V107c("sessionRoleLabel");
  if (!roleLabel) return;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreAsesor = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;

  const existente = roleLabel.parentElement ? roleLabel.parentElement.querySelectorAll(".rac-insignia-logro") : [];
  existente.forEach(el => el.remove());
  if (!nombreAsesor) return;

  const logro = typeof rankingLeerLogroAsesorV1642 === "function" ? await rankingLeerLogroAsesorV1642(nombreAsesor) : null;
  if (!logro) return;

  const iconos = [];
  if (logro.nivel_subio_esta_semana && RAC_INSIGNIA_ICONOS_V1642.nivel[logro.nivel]) {
    iconos.push({ icono: RAC_INSIGNIA_ICONOS_V1642.nivel[logro.nivel], titulo: `Subiste a nivel ${logro.nivel}` });
  }
  if (logro.racha_record_esta_semana) {
    iconos.push({ icono: RAC_INSIGNIA_ICONOS_V1642.racha, titulo: `Nueva racha récord: ${logro.racha} semanas` });
  }
  const insigniasNuevas = Array.isArray(logro.insignias_nuevas_esta_semana) ? logro.insignias_nuevas_esta_semana : [];
  insigniasNuevas.forEach(id => {
    if (RAC_INSIGNIA_ICONOS_V1642[id]) {
      iconos.push({ icono: RAC_INSIGNIA_ICONOS_V1642[id], titulo: RAC_INSIGNIA_NOMBRES_V1642[id] || id });
    }
  });

  if (!iconos.length || !roleLabel.parentElement) return;
  iconos.forEach(({ icono, titulo }) => {
    const span = document.createElement("span");
    span.className = "rac-insignia-logro";
    span.title = titulo;
    span.setAttribute("aria-label", titulo);
    span.textContent = icono;
    roleLabel.insertAdjacentElement("afterend", span);
  });
}

if (typeof updateSessionRoleLabelV93 === "function") {
  const _updateSessionRoleLabelOriginalV1642 = updateSessionRoleLabelV93;
  updateSessionRoleLabelV93 = function () {
    _updateSessionRoleLabelOriginalV1642();
    pintarInsigniaLogroSesionV1642();
  };
}
