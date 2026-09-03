// ============================================================
// V16.20 — Conexión remota (ERP) para Actualización diaria de ventas
// ------------------------------------------------------------
// Capa aditiva sobre dailyUpdatePanel (ver index.html/ajustes-v1.js):
// no borra ni reemplaza el flujo manual existente (fileEspumas /
// validateBtn / applyBtn), solo agrega:
//   - Bloque de configuración exclusivo Super Administrador
//     (sistema de origen, URL, hora programada, habilitar/deshabilitar).
//   - Selector Manual / Por link de conexión para el Administrador.
//   - Estado de la conexión + botón "Actualizar ahora desde ERP".
//
// Backend: tabla config_conexion_erp + funciones RPC
// (leer_config_conexion_erp_v1 / guardar_config_conexion_erp_v1 /
// disparar_sincronizacion_erp_manual_v1) y Edge Function
// sincronizar-ventas-erp, todo en el proyecto Supabase RADAR-INDUSTRIAL.
// El secreto de la conexión cron NUNCA vive en este archivo ni en
// el navegador: el disparo manual pasa por una función de Postgres
// (security definer) que ya tiene el secreto guardado del lado del
// servidor.
// ============================================================

function $erp15(id) { return document.getElementById(id); }

let erpConfigActualV1620 = null;

function erpEsSuperAdminV1620() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}
function erpEsAdminV1620() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

async function erpCargarConfigV1620() {
  if (typeof supabaseClientV94 === "undefined") return;
  try {
    const { data, error } = await supabaseClientV94.rpc("leer_config_conexion_erp_v1");
    if (error) { console.error("[Radar-ERP] Error leyendo configuración:", error); return; }
    erpConfigActualV1620 = (data && data[0]) || null;
    erpPintarUiV1620();
  } catch (e) {
    console.error("[Radar-ERP] Fallo de conexión leyendo configuración:", e);
  }
}

function erpFormatearFecha(iso) {
  if (!iso) return "sin sincronizar todavía";
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch (e) { return iso; }
}

function erpPintarUiV1620() {
  const bloqueConfig = $erp15("erpConfigBlockV1620");
  const bloqueSelector = $erp15("erpModeSelectorV1620");
  if (!bloqueConfig || !bloqueSelector) return;

  const esSuperAdmin = erpEsSuperAdminV1620();
  const esAdmin = erpEsAdminV1620();

  bloqueConfig.style.display = esSuperAdmin ? "block" : "none";
  bloqueSelector.style.display = esAdmin ? "block" : "none";

  const cfg = erpConfigActualV1620 || {};

  if (esSuperAdmin) {
    if ($erp15("erpSistemaOrigenV1620")) $erp15("erpSistemaOrigenV1620").value = cfg.sistema_origen || "Otro (link genérico)";
    if ($erp15("erpHoraProgramadaV1620")) $erp15("erpHoraProgramadaV1620").value = (cfg.hora_programada || "06:00:00").slice(0, 5);
    if ($erp15("erpUrlConexionV1620") && document.activeElement !== $erp15("erpUrlConexionV1620")) {
      $erp15("erpUrlConexionV1620").value = cfg.url_conexion || "";
    }
    if ($erp15("erpHabilitadoV1620")) $erp15("erpHabilitadoV1620").checked = !!cfg.habilitado;
  }

  const badge = $erp15("erpBadgeEstadoV1620");
  const detalle = $erp15("erpLinkDetalleV1620");
  if (badge) {
    if (cfg.habilitado) {
      badge.textContent = cfg.ultimo_estado === "error" ? "Con errores" : "Activa";
      badge.classList.toggle("erp-badge-ok-v1620", cfg.ultimo_estado !== "error");
      badge.classList.toggle("erp-badge-error-v1620", cfg.ultimo_estado === "error");
    } else {
      badge.textContent = "Deshabilitada";
      badge.classList.remove("erp-badge-ok-v1620");
      badge.classList.remove("erp-badge-error-v1620");
    }
  }
  if (detalle) {
    detalle.textContent = `${cfg.sistema_origen || "—"} · última sincronización: ${erpFormatearFecha(cfg.ultima_sincronizacion)}${cfg.ultimo_mensaje ? " — " + cfg.ultimo_mensaje : ""}`;
  }

  const linkPanel = $erp15("erpLinkPanelV1620");
  const manualUploadBlock = $erp15("dailyUpdateManualBlockV1620");
  const manualActionsBlock = $erp15("dailyUpdateManualActionsV1620");
  const modoActual = esAdmin && cfg.habilitado ? erpModoSeleccionadoV1620 : "manual";

  if (linkPanel) linkPanel.style.display = (modoActual === "link") ? "block" : "none";
  if (manualUploadBlock) manualUploadBlock.style.display = (modoActual === "link") ? "none" : "";
  if (manualActionsBlock) manualActionsBlock.style.display = (modoActual === "link") ? "none" : "";

  const btnManual = $erp15("erpModoManualBtnV1620");
  const btnLink = $erp15("erpModoLinkBtnV1620");
  if (btnManual && btnLink) {
    btnManual.classList.toggle("btn", true);
    btnManual.classList.toggle("secondary", modoActual !== "manual");
    btnLink.classList.toggle("btn", true);
    btnLink.classList.toggle("ghost", modoActual !== "link");
    btnLink.disabled = !cfg.habilitado;
    btnLink.title = cfg.habilitado ? "" : "Super Administrador no ha habilitado esta conexión todavía.";
  }
}

let erpModoSeleccionadoV1620 = "manual";

function erpSeleccionarModoV1620(modo) {
  erpModoSeleccionadoV1620 = modo;
  erpPintarUiV1620();
}

async function erpGuardarConfigV1620() {
  const estado = $erp15("erpConfigStatusV1620");
  if (typeof supabaseClientV94 === "undefined") return;
  const sistemaOrigen = $erp15("erpSistemaOrigenV1620").value;
  const urlConexion = $erp15("erpUrlConexionV1620").value.trim();
  const horaProgramada = $erp15("erpHoraProgramadaV1620").value || "06:00";
  const habilitado = $erp15("erpHabilitadoV1620").checked;

  if (habilitado && !urlConexion) {
    if (estado) { estado.className = "erp-config-status-v1620 erp-config-status-error-v1620"; estado.textContent = "Ingresa la URL de conexión antes de habilitar."; }
    return;
  }

  const usuarioEmail = (typeof currentUserV84 !== "undefined" && currentUserV84 && currentUserV84.email) || "super-admin";

  try {
    const { error } = await supabaseClientV94.rpc("guardar_config_conexion_erp_v1", {
      p_habilitado: habilitado,
      p_sistema_origen: sistemaOrigen,
      p_url_conexion: urlConexion || null,
      p_hora_programada: horaProgramada + ":00",
      p_usuario_email: usuarioEmail
    });
    if (error) throw error;
    if (estado) { estado.className = "erp-config-status-v1620 erp-config-status-ok-v1620"; estado.textContent = "Configuración guardada."; }
    await erpCargarConfigV1620();
  } catch (e) {
    console.error("[Radar-ERP] Error guardando configuración:", e);
    if (estado) { estado.className = "erp-config-status-v1620 erp-config-status-error-v1620"; estado.textContent = "No se pudo guardar. Intenta de nuevo."; }
  }
}

async function erpActualizarAhoraV1620() {
  const btn = $erp15("erpActualizarAhoraBtnV1620");
  if (!btn || typeof supabaseClientV94 === "undefined") return;
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Actualizando…";
  try {
    const { error } = await supabaseClientV94.rpc("disparar_sincronizacion_erp_manual_v1");
    if (error) throw error;
    // La sincronización corre del lado del servidor; se espera un
    // momento razonable y se refresca el estado + los datos visibles.
    setTimeout(async () => {
      await erpCargarConfigV1620();
      if (typeof cargarClientesDesdeSupabaseV94 === "function") await cargarClientesDesdeSupabaseV94();
      if (typeof cargarConfiguracionDesdeSupabaseV97 === "function") await cargarConfiguracionDesdeSupabaseV97();
      if (typeof render === "function") render();
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }, 4000);
  } catch (e) {
    console.error("[Radar-ERP] Error disparando actualización:", e);
    btn.textContent = "Error al actualizar";
    setTimeout(() => { btn.textContent = textoOriginal; btn.disabled = false; }, 2500);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ($erp15("erpGuardarConfigBtnV1620")) $erp15("erpGuardarConfigBtnV1620").addEventListener("click", erpGuardarConfigV1620);
  if ($erp15("erpActualizarAhoraBtnV1620")) $erp15("erpActualizarAhoraBtnV1620").addEventListener("click", erpActualizarAhoraV1620);
  if ($erp15("erpModoManualBtnV1620")) $erp15("erpModoManualBtnV1620").addEventListener("click", () => erpSeleccionarModoV1620("manual"));
  if ($erp15("erpModoLinkBtnV1620")) $erp15("erpModoLinkBtnV1620").addEventListener("click", () => {
    if (erpConfigActualV1620 && erpConfigActualV1620.habilitado) erpSeleccionarModoV1620("link");
  });

  // Se pinta cada vez que cambia la sesión/perfil (mismo criterio que
  // applyAdminVisibilityV811), y también al entrar a Ajustes.
  if (typeof applyUserProfileV84 === "function") {
    const _original = applyUserProfileV84;
    applyUserProfileV84 = function () {
      _original();
      erpCargarConfigV1620();
    };
  }
  if (typeof showAjustesV1 === "function") {
    const _originalAjustes = showAjustesV1;
    showAjustesV1 = function () {
      _originalAjustes();
      erpCargarConfigV1620();
    };
  }

  erpCargarConfigV1620();
});
