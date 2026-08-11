// ============================================================
// V107 — UI del Motor RAC (Ranking / gamificación)
// ------------------------------------------------------------
// Debe cargarse DESPUÉS de modulo_06_motor_RAC.js. Sigue el mismo
// patrón de wrapping de navegación ya usado en
// modulo_05_ui_motores.js (no reemplaza hideAllPrimaryViewsV93 ni
// showViewV812, los envuelve).
// ============================================================

function $V107c(id) { return document.getElementById(id); }

function showRankingViewV107() {
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  const view = $V107c("rankingView");
  if (view) view.classList.remove("hidden-view");
  if ($V107c("navRanking")) $V107c("navRanking").classList.add("active");
  renderRankingViewV107();
}

if (typeof showViewV812 !== "undefined") {
  const previousShowViewV107b = showViewV812;
  showViewV812 = function (view) {
    const rv = $V107c("rankingView"); if (rv) rv.classList.add("hidden-view");
    previousShowViewV107b(view);
  };
}
if (typeof showAlarmasViewV107 === "function") {
  const previousShowAlarmasV107b = showAlarmasViewV107;
  showAlarmasViewV107 = function () {
    const rv = $V107c("rankingView"); if (rv) rv.classList.add("hidden-view");
    previousShowAlarmasV107b();
  };
}
if (typeof showClientsManagementV93 === "function") {
  const previousShowClientsV107b = showClientsManagementV93;
  showClientsManagementV93 = function () {
    const rv = $V107c("rankingView"); if (rv) rv.classList.add("hidden-view");
    previousShowClientsV107b();
  };
}
if (typeof showAdvisorsManagementV93 === "function") {
  const previousShowAdvisorsV107b = showAdvisorsManagementV93;
  showAdvisorsManagementV93 = function () {
    const rv = $V107c("rankingView"); if (rv) rv.classList.add("hidden-view");
    previousShowAdvisorsV107b();
  };
}

const RAC_MEDALLAS_V107 = ["🥇", "🥈", "🥉"];

function filaLeaderboardHtmlV107(f, nombreUsuarioActual) {
  const medalla = f.posicion <= 3 ? RAC_MEDALLAS_V107[f.posicion - 1] : f.posicion;
  const destacar = f.asesor === nombreUsuarioActual ? "font-weight:700;background:#f5f5f7" : "";
  return `
    <tr style="${destacar}">
      <td>${medalla}</td>
      <td>${f.asesor}</td>
      <td>${f.puntaje.toFixed(1)}</td>
      <td>${f.cumplimiento !== null ? (f.cumplimiento * 100).toFixed(0) + "%" : "—"}</td>
      <td>${f.actividad !== null ? (f.actividad * 100).toFixed(0) + "%" : "—"}</td>
      <td>${f.metaSuperada ? "🏆" : ""}</td>
    </tr>`;
}

function renderLeaderboardsV107() {
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreUsuario = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;

  const semanal = typeof leaderboardSemanalV107 === "function" ? leaderboardSemanalV107() : [];
  const mensual = typeof leaderboardMensualV107 === "function" ? leaderboardMensualV107() : [];

  const bodySemanal = $V107c("rankingSemanalBody");
  if (bodySemanal) {
    bodySemanal.innerHTML = semanal.length
      ? semanal.map(f => filaLeaderboardHtmlV107(f, nombreUsuario)).join("")
      : `<tr><td colspan="6">Sin datos suficientes esta semana.</td></tr>`;
  }
  const bodyMensual = $V107c("rankingMensualBody");
  if (bodyMensual) {
    bodyMensual.innerHTML = mensual.length
      ? mensual.map(f => filaLeaderboardHtmlV107(f, nombreUsuario)).join("")
      : `<tr><td colspan="6">Sin datos suficientes este mes.</td></tr>`;
  }

  const wrapCerrar = $V107c("rankingCerrarSemanaWrap");
  if (wrapCerrar) wrapCerrar.style.display = esAdmin ? "" : "none";
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
        sel.innerHTML = asesores.map(a => `<option value="${a}">${a}</option>`).join("");
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
  const perfil = typeof perfilRacAsesorV107 === "function" ? await perfilRacAsesorV107(nombreAsesor) : null;
  if (!perfil) { cont.innerHTML = "Motor RAC no disponible."; return; }

  const insigniasHtml = perfil.insignias.length
    ? perfil.insignias.map(i => `<span class="ews-badge ok" title="${i.nombre}">${i.icono} ${i.nombre}</span>`).join(" ")
    : `<span style="color:#6B6B6B;font-size:13px">Sin insignias este mes todavía.</span>`;

  cont.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div>
        <h3 style="margin:0 0 4px">${perfil.asesor}</h3>
        <p style="margin:0;color:#6B6B6B;font-size:13px">Nivel <strong>${perfil.nivel}</strong>${perfil.siguienteNivel ? ` — faltan ${perfil.puntosParaSiguiente.toFixed(0)} pts para ${perfil.siguienteNivel}` : " — nivel máximo"}</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:800">🔥 ${perfil.racha}</div>
        <div style="font-size:12px;color:#6B6B6B">semanas de racha</div>
      </div>
    </div>
    <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap">
      <div><div style="font-size:22px;font-weight:700">${perfil.puntajeSemanal.toFixed(1)}</div><div style="font-size:12px;color:#6B6B6B">Puntos esta semana ${perfil.posicionSemanal ? `(#${perfil.posicionSemanal})` : ""}</div></div>
      <div><div style="font-size:22px;font-weight:700">${perfil.puntajeMensual.toFixed(1)}</div><div style="font-size:12px;color:#6B6B6B">Puntos este mes ${perfil.posicionMensual ? `(#${perfil.posicionMensual})` : ""}</div></div>
      <div><div style="font-size:22px;font-weight:700">${perfil.puntosAcumulados.toFixed(0)}</div><div style="font-size:12px;color:#6B6B6B">Puntos acumulados (nivel)</div></div>
    </div>
    <div style="margin-top:14px">${insigniasHtml}</div>
    ${perfil.semanasConHistorico === 0 ? '<p class="ews-nota">Aún no hay semanas cerradas en el histórico — la racha y el nivel se irán construyendo a partir del primer "Cerrar semana" del administrador.</p>' : ""}
  `;
}

async function cerrarSemanaRacV107() {
  const btn = $V107c("rankingCerrarSemanaBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Cerrando…"; }
  try {
    const emailAdmin = (typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.email : null;
    const resultado = await guardarSnapshotSemanalRacV107(emailAdmin);
    alert(`Semana ${resultado.semanaIso} cerrada. ${resultado.asesoresEvaluados} asesores evaluados.`);
    renderRankingViewV107();
  } catch (e) {
    alert(e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Cerrar semana"; }
  }
}

function renderRankingViewV107() {
  renderLeaderboardsV107();
  renderPerfilRacV107();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($V107c("navRanking")) $V107c("navRanking").addEventListener("click", showRankingViewV107);
  if ($V107c("rankingRefreshBtn")) $V107c("rankingRefreshBtn").addEventListener("click", renderRankingViewV107);
  if ($V107c("rankingAsesorSelect")) $V107c("rankingAsesorSelect").addEventListener("change", renderPerfilRacV107);
  if ($V107c("rankingCerrarSemanaBtn")) $V107c("rankingCerrarSemanaBtn").addEventListener("click", cerrarSemanaRacV107);
});
