// ============================================================
// Motor ARC — Análisis y Recomendación Comercial con IA (V1)
// ------------------------------------------------------------
// Pedido de Sergio (03-sep-2026): agente de IA que da
// recomendaciones por cliente a cada asesor, un análisis
// individual profundo por asesor para el administrador/director
// comercial, y un análisis general del negocio (Dashboard).
//
// Administrable por el Super Administrador: activa, desactiva y
// configura límites de uso (ver panel en la pestaña Sistema, más
// abajo en este mismo archivo). Cuando está desactivado, el botón
// se muestra igual pero como aviso "próximamente disponible" — no
// se oculta, para generar la solicitud del servicio, pero no es
// clicable ni dispara ningún costo.
//
// ⚠️ ESTADO DE ESTA ENTREGA: esta versión conecta toda la interfaz,
// la configuración (Supabase) y el historial auditable, pero la
// llamada real a la API de Claude queda como función placeholder
// (llamarMotorArcV1) que hoy NO llama a ningún servicio de IA — solo
// simula una respuesta de ejemplo con un retraso, para que se pueda
// probar el flujo completo sin generar ningún costo. Cuando Sergio
// tenga su API key de Anthropic, se reemplaza únicamente esa función
// por la llamada real a la Supabase Edge Function correspondiente —
// nada más en este archivo debería requerir cambios.
//
// Requiere: supabase-sync.js (supabaseClientV94), app.js
// (isAdminV86, isSuperAdminV93, currentUserV84, esc, money),
// sistema-v1.js (SISTEMA_PANEL_IDS_V1, sistemaCredencialesV1),
// mejoras-v1.js (renderAccionesRecomendadasV102, recomendadasBody).
// Requiere cargarse DESPUÉS de todos esos archivos.
// ============================================================

// ------------------------------------------------------------
// 0) Configuración global — lectura y caché en memoria
// ------------------------------------------------------------
let configuracionMotorArcV1 = { activo: false, limite_diario_asesor: 15, limite_diario_admin: 10, modelo_ia: "claude-sonnet" };

function $arc(id) { return document.getElementById(id); }

async function cargarConfiguracionMotorArcV1() {
  if (typeof supabaseClientV94 === "undefined") return configuracionMotorArcV1;
  try {
    const { data, error } = await supabaseClientV94
      .from("configuracion_motor_arc")
      .select("activo, limite_diario_asesor, limite_diario_admin, modelo_ia")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.warn("[Radar-ARC] No se pudo leer configuracion_motor_arc (¿falta ejecutar 06_motor_arc.sql?):", error.message);
      return configuracionMotorArcV1;
    }
    if (data) configuracionMotorArcV1 = data;
  } catch (e) {
    console.warn("[Radar-ARC] Fallo de conexión leyendo configuración:", e);
  }
  return configuracionMotorArcV1;
}

function motorArcActivoV1() {
  return !!configuracionMotorArcV1.activo;
}

// ------------------------------------------------------------
// 1) Placeholder de la llamada a IA (SIN conexión real todavía)
// ------------------------------------------------------------
// Firma pensada para que, al conectar la API real, solo se
// reemplace el cuerpo de esta función por la llamada a la Supabase
// Edge Function (ej. supabaseClientV94.functions.invoke("analizar-cliente", {...})),
// sin tocar quién la llama ni cómo se pinta el resultado.
async function llamarMotorArcV1(tipo, payload) {
  await new Promise(r => setTimeout(r, 900)); // simula latencia real
  if (tipo === "cliente") {
    return `[Ejemplo sin conexión real a IA] Análisis pendiente de activar con la API de Claude. Cuando esté conectado, aquí aparecerá una recomendación concreta para ${esc(payload.cliente || "este cliente")} basada en su faltante ($${payload.faltante || 0}), clasificación (${payload.clasificacion || "—"}) y estado (${payload.estado || "—"}).`;
  }
  if (tipo === "asesor") {
    return `[Ejemplo sin conexión real a IA] Diagnóstico pendiente de activar con la API de Claude. Cuando esté conectado, aquí aparecerá un análisis del desempeño de ${esc(payload.asesor || "este asesor")} con sugerencias de coaching basadas en cumplimiento, tendencia y cartera en riesgo.`;
  }
  return `[Ejemplo sin conexión real a IA] Diagnóstico del negocio pendiente de activar con la API de Claude. Cuando esté conectado, aquí aparecerá una lectura general de ventas, cumplimiento y salud del portafolio para el periodo ${esc(payload.periodo || "seleccionado")}.`;
}

async function registrarAnalisisArcV1(tipo, referencia, resultado) {
  if (typeof supabaseClientV94 === "undefined" || typeof currentUserV84 === "undefined" || !currentUserV84) return;
  try {
    await supabaseClientV94.rpc("registrar_analisis_ia_v1", {
      p_tipo: tipo,
      p_solicitado_por: currentUserV84.email,
      p_rol_solicitante: currentUserV84.tier || (isAdminV86() ? "admin" : "advisor"),
      p_referencia: referencia,
      p_resultado: resultado
    });
  } catch (e) {
    console.warn("[Radar-ARC] No se pudo registrar el análisis en el historial:", e);
  }
}

// ------------------------------------------------------------
// 2) Panel Super Administrador (pestaña Sistema)
// ------------------------------------------------------------
function insertarPanelControlArcV1() {
  if ($arc("motorArcAdminPanel")) return;
  const referencia = $arc("sistemaPanelsHost") || $arc("growthConfigPanel");
  if (!referencia) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "motorArcAdminPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Motor ARC — Agente de análisis y recomendación con IA</h3>
        <p>Solo Super Administrador. Activa o desactiva el agente de IA para toda la organización y define límites diarios de uso.</p>
      </div>
    </div>
    <div class="motor-arc-toggle-row">
      <label class="motor-arc-switch">
        <input type="checkbox" id="motorArcToggleInput"/>
        <span class="motor-arc-track"></span>
      </label>
      <div>
        <strong id="motorArcEstadoTexto">Cargando estado…</strong>
        <small class="field-help">Este estado aplica de inmediato para todos los asesores y administradores.</small>
      </div>
    </div>
    <div class="growth-grid" id="motorArcConfigGrid">
      <label>Límite análisis/día (asesor) <input type="number" id="motorArcLimiteAsesor" min="1" max="100" value="15"/></label>
      <label>Límite análisis/día (admin) <input type="number" id="motorArcLimiteAdmin" min="1" max="100" value="10"/></label>
    </div>
    <div class="actions">
      <button class="btn" id="motorArcGuardarBtn" type="button">Guardar configuración</button>
      <span id="motorArcMsg" class="sistema-msg"></span>
    </div>
  `;
  referencia.appendChild(panel);
  if (typeof SISTEMA_PANEL_IDS_V1 !== "undefined" && !SISTEMA_PANEL_IDS_V1.includes("motorArcAdminPanel")) {
    SISTEMA_PANEL_IDS_V1.push("motorArcAdminPanel");
  }
}

function pintarPanelControlArcV1() {
  const toggle = $arc("motorArcToggleInput");
  const texto = $arc("motorArcEstadoTexto");
  const limAsesor = $arc("motorArcLimiteAsesor");
  const limAdmin = $arc("motorArcLimiteAdmin");
  if (!toggle) return;
  toggle.checked = motorArcActivoV1();
  if (texto) {
    texto.textContent = motorArcActivoV1()
      ? "Actualmente: ACTIVADO — visible y funcional para todos los asesores y administradores"
      : "Actualmente: DESACTIVADO — el resto de usuarios ve un aviso de \"próximamente disponible\"";
  }
  if (limAsesor) limAsesor.value = configuracionMotorArcV1.limite_diario_asesor || 15;
  if (limAdmin) limAdmin.value = configuracionMotorArcV1.limite_diario_admin || 10;
}

async function guardarConfiguracionArcV1() {
  const msg = $arc("motorArcMsg");
  if (msg) msg.textContent = "";
  if (typeof supabaseClientV94 === "undefined" || typeof sistemaCredencialesV1 !== "function") return;

  const cred = sistemaCredencialesV1();
  const activo = $arc("motorArcToggleInput") ? $arc("motorArcToggleInput").checked : false;
  const limAsesor = parseInt($arc("motorArcLimiteAsesor")?.value, 10) || 15;
  const limAdmin = parseInt($arc("motorArcLimiteAdmin")?.value, 10) || 10;

  try {
    const { error } = await supabaseClientV94.rpc("actualizar_config_motor_arc_v1", {
      p_super_email: cred.email,
      p_super_telefono: cred.telefono || null,
      p_activo: activo,
      p_limite_diario_asesor: limAsesor,
      p_limite_diario_admin: limAdmin,
      p_modelo_ia: configuracionMotorArcV1.modelo_ia || "claude-sonnet"
    });
    if (error) {
      console.error("[Radar-ARC] Error guardando configuración:", error);
      if (msg) { msg.textContent = "No se pudo guardar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    configuracionMotorArcV1 = { activo, limite_diario_asesor: limAsesor, limite_diario_admin: limAdmin, modelo_ia: configuracionMotorArcV1.modelo_ia };
    if (msg) { msg.textContent = "✓ Configuración guardada."; msg.className = "sistema-msg sistema-msg-ok"; }
    pintarPanelControlArcV1();
    // Refresca de inmediato los botones visibles en pantalla (si el
    // Super Admin está viendo Prospección/Dashboard en otra pestaña
    // del navegador esto no aplica, pero sí si cambia de vista aquí).
    if (typeof renderAccionesRecomendadasV102 === "function") renderAccionesRecomendadasV102();
    actualizarBotonNegocioArcV1();
  } catch (e) {
    console.error("[Radar-ARC] Fallo de conexión guardando configuración:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

// ------------------------------------------------------------
// 3) Botón "Analizar con IA" por cliente (vista Asesor/Admin —
//    tabla de Acciones recomendadas)
// ------------------------------------------------------------
// La tabla recomendadasBody se repinta por completo cada vez que
// renderAccionesRecomendadasV102() corre (paginación, filtros, etc.),
// así que en vez de intentar mantener listeners individuales por
// fila, se usa delegación de eventos sobre el body (ver cableado al
// final) y se inyecta la columna/celda de IA por fila con un wrapper
// después del render original — mismo patrón que
// modulo_09_leads_extendido.js usó para la columna NIT.
if (typeof renderAccionesRecomendadasV102 === "function") {
  const _renderAccionesRecomendadasOriginalV1 = renderAccionesRecomendadasV102;
  renderAccionesRecomendadasV102 = function (...args) {
    const resultado = _renderAccionesRecomendadasOriginalV1.apply(this, args);
    inyectarBotonesArcClienteV1();
    return resultado;
  };
}

function inyectarBotonesArcClienteV1() {
  const body = $arc("recomendadasBody");
  if (!body) return;
  const filas = Array.from(body.querySelectorAll("tr"));
  filas.forEach(tr => {
    const btnDetalle = tr.querySelector("[data-detail-nit]");
    if (!btnDetalle) return; // fila de "sin clientes sugeridos"
    const nit = btnDetalle.getAttribute("data-detail-nit");
    const celdaAccion = btnDetalle.closest("td");
    if (!celdaAccion || celdaAccion.querySelector(".motor-arc-zone")) return;

    const zona = document.createElement("div");
    zona.className = "motor-arc-zone";
    if (motorArcActivoV1()) {
      zona.innerHTML = `
        <button class="motor-arc-btn" data-arc-cliente-nit="${esc(nit)}" type="button">✨ Analizar con IA</button>
        <div class="motor-arc-loading"><span class="motor-arc-spinner"></span> Generando recomendación…</div>
        <div class="motor-arc-result"></div>
      `;
    } else {
      zona.innerHTML = `
        <div class="motor-arc-disabled">
          <span class="motor-arc-disabled-icon">✨</span>
          <div>
            <strong>Análisis con IA — próximamente disponible</strong>
            <span>Pídele a tu administrador que lo active.</span>
          </div>
        </div>
      `;
    }
    celdaAccion.appendChild(zona);
  });
}

async function analizarClienteArcV1(nit, btn) {
  const zona = btn.closest(".motor-arc-zone");
  const loading = zona.querySelector(".motor-arc-loading");
  const result = zona.querySelector(".motor-arc-result");
  const cliente = (DATA.clientes || []).find(c => cleanNit(c.nit) === cleanNit(nit));
  if (!cliente) return;

  btn.disabled = true;
  loading.classList.add("show");
  result.classList.remove("show");

  const payload = {
    cliente: cliente.cliente,
    faltante: typeof missing === "function" ? missing(cliente) : 0,
    clasificacion: cliente.clasificacion,
    estado: cliente.estado
  };

  try {
    const texto = await llamarMotorArcV1("cliente", payload);
    result.textContent = texto;
    result.classList.add("show");
    registrarAnalisisArcV1("cliente", nit, texto);
    btn.textContent = "↻ Regenerar análisis";
  } catch (e) {
    console.error("[Radar-ARC] Error generando análisis de cliente:", e);
    result.textContent = "No se pudo generar el análisis. Intenta de nuevo en unos segundos.";
    result.classList.add("show");
  } finally {
    loading.classList.remove("show");
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// 4) Análisis individual de asesor (vista Administrador)
// ------------------------------------------------------------
// Se inserta como panel adicional dentro de sistemaAdminPanel/host de
// Sistema NO — este análisis es para uso frecuente del admin, no una
// configuración: vive en la vista de Seguimiento diario, junto al
// selector de asesor ya existente (seguimientoAsesorSelect), que solo
// es visible para administradores (poblarAsesorFilterSeguimientoV100).
function insertarPanelArcAsesorV1() {
  if ($arc("motorArcAsesorPanel")) return;
  const wrap = $arc("seguimientoAsesorFilterWrap");
  if (!wrap || !wrap.parentNode) return;

  const panel = document.createElement("div");
  panel.id = "motorArcAsesorPanel";
  panel.className = "motor-arc-admin-block";
  panel.innerHTML = `
    <button class="motor-arc-btn" id="motorArcAnalizarAsesorBtn" type="button">✨ Analizar asesor con IA</button>
    <div class="motor-arc-loading" id="motorArcAsesorLoading"><span class="motor-arc-spinner"></span> Generando diagnóstico…</div>
    <div class="motor-arc-result motor-arc-result-block" id="motorArcAsesorResult"></div>
    <div class="motor-arc-disabled" id="motorArcAsesorDisabled" style="display:none">
      <span class="motor-arc-disabled-icon">✨</span>
      <div><strong>Análisis con IA — próximamente disponible</strong><span>Pídele a tu Super Administrador que lo active.</span></div>
    </div>
  `;
  wrap.parentNode.insertBefore(panel, wrap.nextSibling);
}

function actualizarPanelArcAsesorV1() {
  const btn = $arc("motorArcAnalizarAsesorBtn");
  const disabled = $arc("motorArcAsesorDisabled");
  if (!btn || !disabled) return;
  const activo = motorArcActivoV1();
  btn.style.display = activo ? "" : "none";
  disabled.style.display = activo ? "none" : "";
}

async function analizarAsesorArcV1() {
  const sel = $arc("seguimientoAsesorSelect");
  const nombreAsesor = sel ? sel.value : "todos";
  if (!nombreAsesor || nombreAsesor === "todos") {
    alert("Selecciona un asesor específico (no \"Todos\") para generar su análisis individual.");
    return;
  }
  const btn = $arc("motorArcAnalizarAsesorBtn");
  const loading = $arc("motorArcAsesorLoading");
  const result = $arc("motorArcAsesorResult");
  btn.disabled = true;
  loading.classList.add("show");
  result.classList.remove("show");

  const clientesAsesor = (DATA.clientes || []).filter(c => c.asesorAsignado === nombreAsesor);
  const payload = { asesor: nombreAsesor, cartera: clientesAsesor.length };

  try {
    const texto = await llamarMotorArcV1("asesor", payload);
    result.textContent = texto;
    result.classList.add("show");
    registrarAnalisisArcV1("asesor", nombreAsesor, texto);
  } catch (e) {
    console.error("[Radar-ARC] Error generando análisis de asesor:", e);
    result.textContent = "No se pudo generar el análisis. Intenta de nuevo en unos segundos.";
    result.classList.add("show");
  } finally {
    loading.classList.remove("show");
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// 5) Análisis del negocio completo (Dashboard)
// ------------------------------------------------------------
function insertarBotonArcNegocioV1() {
  if ($arc("motorArcNegocioPanel")) return;
  const insights = $arc("directorInsights");
  const seccion = insights ? insights.closest(".insight-card") : null;
  if (!seccion) return;

  const panel = document.createElement("div");
  panel.id = "motorArcNegocioPanel";
  panel.className = "motor-arc-admin-block";
  panel.innerHTML = `
    <button class="motor-arc-btn" id="motorArcAnalizarNegocioBtn" type="button">✨ Analizar negocio con IA</button>
    <div class="motor-arc-loading" id="motorArcNegocioLoading"><span class="motor-arc-spinner"></span> Generando diagnóstico del negocio…</div>
    <div class="motor-arc-result motor-arc-result-block" id="motorArcNegocioResult"></div>
    <div class="motor-arc-disabled" id="motorArcNegocioDisabled" style="display:none">
      <span class="motor-arc-disabled-icon">✨</span>
      <div><strong>Análisis con IA — próximamente disponible</strong><span>Pídele a tu Super Administrador que lo active.</span></div>
    </div>
  `;
  seccion.appendChild(panel);
}

function actualizarBotonNegocioArcV1() {
  const btn = $arc("motorArcAnalizarNegocioBtn");
  const disabled = $arc("motorArcNegocioDisabled");
  if (!btn || !disabled) return;
  const activo = motorArcActivoV1();
  btn.style.display = activo ? "" : "none";
  disabled.style.display = activo ? "none" : "";
  actualizarPanelArcAsesorV1();
}

async function analizarNegocioArcV1() {
  const btn = $arc("motorArcAnalizarNegocioBtn");
  const loading = $arc("motorArcNegocioLoading");
  const result = $arc("motorArcNegocioResult");
  btn.disabled = true;
  loading.classList.add("show");
  result.classList.remove("show");

  const periodo = (typeof dashMonthV813 === "function") ? dashMonthV813() : "mes actual";
  const payload = { periodo };

  try {
    const texto = await llamarMotorArcV1("negocio", payload);
    result.textContent = texto;
    result.classList.add("show");
    registrarAnalisisArcV1("negocio", periodo, texto);
  } catch (e) {
    console.error("[Radar-ARC] Error generando análisis de negocio:", e);
    result.textContent = "No se pudo generar el análisis. Intenta de nuevo en unos segundos.";
    result.classList.add("show");
  } finally {
    loading.classList.remove("show");
    btn.disabled = false;
  }
}

// ------------------------------------------------------------
// 6) Cableado inicial
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await cargarConfiguracionMotorArcV1();

  // Panel Super Admin en Sistema.
  insertarPanelControlArcV1();
  pintarPanelControlArcV1();
  if ($arc("motorArcToggleInput")) {
    $arc("motorArcToggleInput").addEventListener("change", pintarPanelControlArcV1);
  }
  if ($arc("motorArcGuardarBtn")) {
    $arc("motorArcGuardarBtn").addEventListener("click", guardarConfiguracionArcV1);
  }

  // Botón por cliente (delegación de eventos, la tabla se repinta seguido).
  const recomendadasBody = $arc("recomendadasBody");
  if (recomendadasBody) {
    recomendadasBody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-arc-cliente-nit]");
      if (!btn) return;
      analizarClienteArcV1(btn.getAttribute("data-arc-cliente-nit"), btn);
    });
  }

  // Panel de análisis de asesor (Seguimiento diario, solo admin).
  insertarPanelArcAsesorV1();
  actualizarPanelArcAsesorV1();
  if ($arc("motorArcAnalizarAsesorBtn")) {
    $arc("motorArcAnalizarAsesorBtn").addEventListener("click", analizarAsesorArcV1);
  }

  // Botón de análisis de negocio (Dashboard).
  insertarBotonArcNegocioV1();
  actualizarBotonNegocioArcV1();
  if ($arc("motorArcAnalizarNegocioBtn")) {
    $arc("motorArcAnalizarNegocioBtn").addEventListener("click", analizarNegocioArcV1);
  }
});
