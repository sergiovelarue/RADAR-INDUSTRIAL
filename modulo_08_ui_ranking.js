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

// ============================================================
// V16.44 — Ranking de puntos (RAC) visible en la pestaña, KPI de
// cumplimiento de meta con mensaje motivacional, vitrina de trofeos
// del asesor, matriz de cumplimiento mensual + felicitación de
// equipo para el administrador. Requerido y aprobado por Sergio
// (2026-09-08), mockup previo aprobado antes de escribir código.
//
// El cumplimiento y el puntaje se calculan en el navegador con el
// MISMO criterio ya usado por la Edge Function cerrar-semana-rac:
// cumplimiento a nivel asesor (venta total del asesor / meta total
// del asesor, con ajuste vigente si existe, si no suma de Meta
// Inicial de sus clientes), evaluado sobre el mes operativo vigente
// (no requiere ir a Supabase para esto — usa DATA.clientes, igual
// que el ranking de ventas).
//
// La vitrina de trofeos y la matriz de cumplimiento SÍ leen de
// Supabase (tabla rac_cumplimiento_mensual_v1), porque son datos
// históricos cerrados mes a mes por la Edge Function
// cerrar-mes-cumplimiento (cron el día 1 de cada mes) — no se
// recalculan en el cliente.
// ============================================================

const RAC_MESES_NOMBRE_CORTO_V1644 = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// Meta del asesor en el mes vigente: Meta Inicial (suma de goal(c) de
// sus clientes, con state.month fijado temporalmente al mes vigente —
// mismo patrón de metaInicialAsesorMesV2 en mejoras-v1.js) sobre-escrita
// por el ajuste manual vigente si existe (metaVigenteAsesorMesV2, ya
// definida en mejoras-v1.js y usada en el módulo de Metas).
function metaDelAsesorMesVigenteV1644(nombreAsesor) {
  const misClientes = (DATA.clientes || []).filter(c => c.asesorAsignado === nombreAsesor);
  const mesVigente = typeof latestOperationalMonthV810 === "function" ? latestOperationalMonthV810() : null;
  if (!mesVigente) return { venta: 0, meta: 0, cumplimientoPct: 0 };

  const venta = misClientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, mesVigente) : 0), 0);

  const metaInicial = typeof metaInicialAsesorMesV2 === "function" ? metaInicialAsesorMesV2(misClientes, mesVigente) : 0;
  const meta = typeof metaVigenteAsesorMesV2 === "function" ? metaVigenteAsesorMesV2(nombreAsesor, 2026, mesVigente, metaInicial) : metaInicial;

  const cumplimientoPct = meta > 0 ? Math.round((venta / meta) * 1000) / 10 : 0;
  return { venta, meta, cumplimientoPct };
}

function rankingPuntosCalcularV1644() {
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const mesVigente = typeof latestOperationalMonthV810 === "function" ? latestOperationalMonthV810() : null;

  const filas = asesores.map(nombreAsesor => {
    const misClientes = (DATA.clientes || []).filter(c => {
      if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
      return c.asesorAsignado === nombreAsesor;
    });
    const { cumplimientoPct } = metaDelAsesorMesVigenteV1644(nombreAsesor);
    const cumplimientoFrac = Math.max(0, Math.min(1, cumplimientoPct / 100));

    const activos = misClientes.filter(c => {
      const st = typeof estadoAutomaticoV1642 === "function" ? estadoAutomaticoV1642(c) : c.estado;
      return st === "Activo" || st === "Reingreso";
    }).length;
    const actividad = misClientes.length ? activos / misClientes.length : 0;

    const puntaje = Math.round((cumplimientoFrac * 0.7 + actividad * 0.3) * 1000) / 10;
    return { asesor: nombreAsesor, puntaje, mesVigente };
  });

  filas.sort((a, b) => b.puntaje - a.puntaje);
  filas.forEach((f, i) => { f.posicion = i + 1; });
  return filas;
}

function rankingPuntosFilaHtmlV1644(f, esAdmin, nombreUsuario, nivelPorAsesor) {
  const medalla = f.posicion <= 3 ? RAC_MEDALLAS_V107[f.posicion - 1] : null;
  const esPropia = !esAdmin && f.asesor === nombreUsuario;
  const debeOcultar = !esAdmin && !esPropia;

  const claseFila = ["ranking-ventas-row"];
  if (f.posicion === 1) claseFila.push("top1");
  if (esPropia) claseFila.push("propia");

  const nivel = nivelPorAsesor ? nivelPorAsesor.get(f.asesor) : null;
  const sufijoNivel = esPropia && nivel ? ` · ${esc(nivel)}` : "";

  const nombreHtml = debeOcultar
    ? `<span class="ranking-ventas-nombre ranking-ventas-blur">${esc(f.asesor)}</span>`
    : `<span class="ranking-ventas-nombre${esPropia ? " propia" : ""}">${esc(f.asesor)}${esPropia ? " (tú)" : ""}</span>`;
  const valorHtml = debeOcultar
    ? `<span class="ranking-ventas-valor ranking-ventas-blur">${f.puntaje.toFixed(1)} pts</span>`
    : `<span class="ranking-ventas-valor">${f.puntaje.toFixed(1)} pts${sufijoNivel}</span>`;

  return `
    <div class="${claseFila.join(" ")}">
      ${medalla ? `<span class="ranking-ventas-medalla">${medalla}</span>` : `<span class="ranking-ventas-pos">${f.posicion}</span>`}
      ${nombreHtml}
      ${valorHtml}
    </div>`;
}

async function renderRankingPuntosV1644() {
  const cont = $V107c("rankingPuntosLista");
  const card = $V107c("rankingPuntosCard");
  if (!cont || !card) return;
  card.classList.remove("hidden-view");

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreUsuario = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;
  const titulo = $V107c("rankingPuntosTitulo");
  if (titulo) titulo.textContent = esAdmin ? "Ranking de puntos" : "Tu ranking de puntos — entre tus compañeros";

  const filas = rankingPuntosCalcularV1644();

  let nivelPorAsesor = null;
  if (esAdmin && typeof supabaseClientV94 !== "undefined" && supabaseClientV94) {
    const { data } = await supabaseClientV94.from("rac_logro_estado_asesor_v1").select("asesor, nivel");
    nivelPorAsesor = new Map((data || []).map(r => [r.asesor, r.nivel]));
  } else if (!esAdmin && nombreUsuario) {
    const logro = typeof rankingLeerLogroAsesorV1642 === "function" ? await rankingLeerLogroAsesorV1642(nombreUsuario) : null;
    nivelPorAsesor = new Map(logro ? [[nombreUsuario, logro.nivel]] : []);
  }

  cont.innerHTML = filas.length
    ? filas.map(f => rankingPuntosFilaHtmlV1644(f, esAdmin, nombreUsuario, nivelPorAsesor)).join("")
    : `<p class="ranking-ventas-vacio">No hay asesores registrados todavía.</p>`;
}

// ------------------------------------------------------------
// KPI de cumplimiento de meta — solo asesor. Mensaje motivacional
// por rango, calculado en vivo sobre el mes vigente.
// ------------------------------------------------------------
function rankingMensajeMotivacionalV1644(pct) {
  if (pct >= 110) return { texto: "¡Wow, la sacaste del estadio!", clase: "excelente" };
  if (pct >= 100) return { texto: "¡Felicitaciones, lo lograste!", clase: "cumplido" };
  if (pct >= 90) return { texto: "¡Ya casi estás a un paso!", clase: "cerca" };
  if (pct >= 80) return { texto: "Estás cerca, ¡vamos!", clase: "avanzando" };
  return null;
}

function renderKpiCumplimientoV1644() {
  const card = $V107c("rankingCumplimientoCard");
  const cont = $V107c("rankingCumplimientoKpi");
  if (!card || !cont) return;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreUsuario = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;
  if (esAdmin || !nombreUsuario) { card.classList.add("hidden-view"); return; }
  card.classList.remove("hidden-view");

  const { cumplimientoPct } = metaDelAsesorMesVigenteV1644(nombreUsuario);
  const mensaje = rankingMensajeMotivacionalV1644(cumplimientoPct);

  cont.innerHTML = `
    <div class="ranking-kpi-cumplimiento ${mensaje ? "ranking-kpi-" + mensaje.clase : ""}">
      <div class="ranking-kpi-valor">${cumplimientoPct.toFixed(0)}%</div>
      ${mensaje ? `<div class="ranking-kpi-mensaje">${esc(mensaje.texto)}</div>` : `<div class="ranking-kpi-mensaje ranking-kpi-neutro">Sigue así, cada venta suma.</div>`}
      <div class="ranking-kpi-barra"><div class="ranking-kpi-barra-fill" style="width:${Math.max(0, Math.min(100, cumplimientoPct))}%"></div></div>
    </div>`;
}

// ------------------------------------------------------------
// Vitrina de trofeos del asesor — histórico leído de
// rac_cumplimiento_mensual_v1 (poblada por el cierre mensual
// automático y por la reconstrucción histórica 2026).
// ------------------------------------------------------------
async function renderVitrinaTrofeosV1644() {
  const card = $V107c("rankingVitrinaCard");
  const grid = $V107c("rankingVitrinaGrid");
  const vacio = $V107c("rankingVitrinaVacio");
  if (!card || !grid) return;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const nombreUsuario = (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.advisor : null;
  if (esAdmin || !nombreUsuario) { card.classList.add("hidden-view"); return; }
  card.classList.remove("hidden-view");

  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) return;
  const { data, error } = await supabaseClientV94
    .from("rac_cumplimiento_mensual_v1")
    .select("anio, mes, cumplimiento, trofeo")
    .eq("asesor", nombreUsuario)
    .neq("trofeo", "ninguno")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  if (error) { console.error("[Radar-Ranking] Error leyendo vitrina de trofeos:", error); return; }

  const trofeos = data || [];
  if (!trofeos.length) {
    grid.innerHTML = "";
    if (vacio) vacio.style.display = "";
    return;
  }
  if (vacio) vacio.style.display = "none";

  grid.innerHTML = trofeos.map(t => {
    const icono = t.trofeo === "trofeo_destacado" ? "🏆✨" : "🏆";
    const claseDestacado = t.trofeo === "trofeo_destacado" ? " destacado" : "";
    return `
      <div class="ranking-trofeo-item${claseDestacado}">
        <div class="ranking-trofeo-icono">${icono}</div>
        <div class="ranking-trofeo-pct">${Number(t.cumplimiento).toFixed(0)}%</div>
        <div class="ranking-trofeo-mes">${esc(RAC_MESES_NOMBRE_CORTO_V1644[t.mes - 1] || t.mes)} ${t.anio}</div>
      </div>`;
  }).join("");
}

// ------------------------------------------------------------
// Matriz de cumplimiento mensual (admin) + felicitación de equipo.
// ------------------------------------------------------------
async function renderMatrizCumplimientoV1644() {
  const cardMatriz = $V107c("rankingMatrizCard");
  const tablaCont = $V107c("rankingMatrizTabla");
  const cardFelicitacion = $V107c("rankingFelicitacionEquipoCard");
  const felicitacionCont = $V107c("rankingFelicitacionEquipoContenido");
  if (!cardMatriz || !tablaCont) return;

  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  if (!esAdmin) { cardMatriz.classList.add("hidden-view"); if (cardFelicitacion) cardFelicitacion.classList.add("hidden-view"); return; }
  cardMatriz.classList.remove("hidden-view");

  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) return;
  const { data, error } = await supabaseClientV94
    .from("rac_cumplimiento_mensual_v1")
    .select("asesor, anio, mes, cumplimiento, trofeo")
    .order("anio", { ascending: true })
    .order("mes", { ascending: true });
  if (error) { console.error("[Radar-Ranking] Error leyendo matriz de cumplimiento:", error); return; }

  const filas = data || [];
  if (!filas.length) { tablaCont.innerHTML = `<p class="ranking-ventas-vacio">Todavía no hay meses cerrados.</p>`; if (cardFelicitacion) cardFelicitacion.classList.add("hidden-view"); return; }

  const clavesMes = Array.from(new Set(filas.map(f => `${f.anio}-${f.mes}`)))
    .sort((a, b) => { const [ay, am] = a.split("-").map(Number); const [by, bm] = b.split("-").map(Number); return ay === by ? am - bm : ay - by; })
    .slice(-6); // últimos 6 meses cerrados, para no saturar la tabla

  const asesoresLista = Array.from(new Set(filas.filter(f => f.asesor !== "__EQUIPO__").map(f => f.asesor))).sort();
  const porClave = new Map(filas.map(f => [`${f.asesor}|${f.anio}-${f.mes}`, f]));

  function celdaHtml(fila) {
    if (!fila) return `<td style="text-align:center;padding:8px;color:var(--muted)">—</td>`;
    const pct = Number(fila.cumplimiento).toFixed(0);
    if (fila.trofeo === "trofeo_destacado") return `<td style="text-align:center;padding:8px">🏆✨<br><span style="font-size:10px;color:var(--muted)">${pct}%</span></td>`;
    if (fila.trofeo === "trofeo") return `<td style="text-align:center;padding:8px">🏆<br><span style="font-size:10px;color:var(--muted)">${pct}%</span></td>`;
    return `<td style="text-align:center;padding:8px;color:var(--muted)">${pct}%</td>`;
  }

  const encabezado = clavesMes.map(c => { const [anio, mes] = c.split("-").map(Number); return `<th style="padding:6px 8px;color:var(--muted);font-weight:500">${esc(RAC_MESES_NOMBRE_CORTO_V1644[mes - 1])}</th>`; }).join("");

  const filasAsesores = asesoresLista.map(nombreAsesor => {
    const celdas = clavesMes.map(c => celdaHtml(porClave.get(`${nombreAsesor}|${c}`))).join("");
    return `<tr style="border-top:0.5px solid var(--line)"><td style="padding:8px 8px 8px 0;font-weight:500">${esc(nombreAsesor)}</td>${celdas}</tr>`;
  }).join("");

  const filaEquipo = clavesMes.map(c => celdaHtml(porClave.get(`__EQUIPO__|${c}`))).join("");

  tablaCont.innerHTML = `
    <table style="width:100%;font-size:12px;border-collapse:collapse">
      <thead><tr><th style="text-align:left;padding:6px 8px 8px 0;color:var(--muted);font-weight:500">Asesor</th>${encabezado}</tr></thead>
      <tbody>
        ${filasAsesores}
        <tr style="border-top:1.5px solid var(--dark);background:var(--card2,#f5f5f7)">
          <td style="padding:8px 8px 8px 0;font-weight:700">Total equipo</td>${filaEquipo}
        </tr>
      </tbody>
    </table>`;

  // Felicitación de equipo — mes vigente (el más reciente cerrado con datos).
  if (cardFelicitacion && felicitacionCont) {
    const claveActual = clavesMes[clavesMes.length - 1];
    const filaEquipoActual = claveActual ? porClave.get(`__EQUIPO__|${claveActual}`) : null;
    if (filaEquipoActual && filaEquipoActual.trofeo !== "ninguno") {
      const [anio, mes] = claveActual.split("-").map(Number);
      const pct = Number(filaEquipoActual.cumplimiento).toFixed(0);
      cardFelicitacion.classList.remove("hidden-view");
      felicitacionCont.innerHTML = `
        <div class="ranking-felicitacion-equipo">
          <div class="ranking-felicitacion-icono">🏆🎉</div>
          <div class="ranking-felicitacion-titulo">¡El equipo cumplió la meta de ${esc(RAC_MESES_NOMBRE_CORTO_V1644[mes - 1])}!</div>
          <div class="ranking-felicitacion-detalle">${pct}% de cumplimiento total del equipo.</div>
        </div>`;
    } else {
      cardFelicitacion.classList.add("hidden-view");
      felicitacionCont.innerHTML = "";
    }
  }
}

function renderRankingViewV107() {
  renderRankingVentasV1642();
  renderPerfilRacV107();
  renderKpiCumplimientoV1644();
  renderRankingPuntosV1644();
  renderVitrinaTrofeosV1644();
  renderMatrizCumplimientoV1644();
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
