// ============================================================
// V1 Sistema — Radar Comercial B2B (RADAR-INDUSTRIAL)
// ------------------------------------------------------------
// Capa aditiva (2026-08-18) que:
//   1) Conecta el login a Supabase (usuarios), cerrando el
//      auto-alta de "Administrador" y usando el registro
//      autorizado en la nube en vez de localStorage.
//   2) Crea la pestaña "Sistema", exclusiva de Super
//      Administrador: Configuración comercial por clasificación,
//      Modelo de cálculo (Venta proyectada y Presupuesto) y
//      Ponderación del score (reubicados), panel de
//      administradores, y contador/reset del log de eventos.
//      (2026-08-20: modeloCalculoPanel se integró a
//      SISTEMA_PANEL_IDS_V1 — antes vivía huérfano en la Hoja de
//      Ruta con su propio mecanismo de visibilidad paralelo.)
//
// Requiere que ya se hayan aplicado, del lado de Supabase, las
// funciones SECURITY DEFINER de la migración
// cerrar_rls_historial_y_usuarios_v1 (es_superadmin_v1,
// es_admin_v1, obtener_usuario_v1, registrar_ingreso_v1,
// autoregistrar_asesor_v1, listar_administradores_v1,
// crear_o_editar_administrador_v1, revocar_administrador_v1,
// cambiar_rol_superadmin_v1, contar_eventos_historial_v1,
// resetear_historial_cambios_v1).
// ============================================================

// ------------------------------------------------------------
// 1) Login conectado a Supabase
// ------------------------------------------------------------

// Resuelve el usuario contra la tabla usuarios en Supabase.
// - sergiovelasquez@me.com sigue siendo el Super Administrador fijo,
//   como respaldo si Supabase no responde (mismo email que ya está
//   registrado con rol=superadmin en la base de datos).
// - Cualquier otro correo nuevo solo puede registrarse como Asesor
//   (autoservicio). Las cuentas Administrador y Super Administrador
//   las crea/otorga exclusivamente un Super Administrador desde la
//   pestaña Sistema.
async function resolveUserSupabaseV1(email, chosenAdvisor) {
  email = String(email || "").trim().toLowerCase();
  if (typeof isBlockedDomainV92 === "function" && isBlockedDomainV92(email)) return { blocked: true };

  if (typeof ADMIN_EMAIL_V92 !== "undefined" && email === ADMIN_EMAIL_V92) {
    return { user: { profile: "admin", tier: "superadmin", advisor: "SUPER ADMINISTRADOR", name: "SERGIO VELÁSQUEZ" } };
  }

  if (typeof supabaseClientV94 === "undefined") {
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo en unos segundos." };
  }

  let data, error;
  try {
    ({ data, error } = await supabaseClientV94.rpc("obtener_usuario_v1", { p_email: email }));
  } catch (e) {
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo en unos segundos." };
  }
  if (error) {
    console.error("[Radar-Sistema] Error consultando usuario:", error);
    return { error: "No se pudo verificar tu usuario. Intenta de nuevo." };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (row) {
    if (row.rol === "superadmin") {
      return { user: { profile: "admin", tier: "superadmin", advisor: "SUPER ADMINISTRADOR", name: row.nombre || email.split("@")[0].toUpperCase() } };
    }
    if (row.rol === "admin") {
      const label = row.nombre || email.split("@")[0].replace(/[._]+/g, " ").trim().toUpperCase();
      return { user: { profile: "admin", tier: "admin", advisor: "ADMINISTRADOR", name: label } };
    }
    const advisorName = row.nombre || chosenAdvisor || "";
    if (!advisorName) return { needsSelection: true };
    return { user: { profile: "advisor", tier: "advisor", advisor: advisorName, name: advisorName } };
  }

  // Usuario nuevo: autoservicio solo como Asesor.
  if (!chosenAdvisor) return { needsSelection: true };
  try {
    const { error: errReg } = await supabaseClientV94.rpc("autoregistrar_asesor_v1", {
      p_email: email, p_nombre: chosenAdvisor, p_asesor_id: null, p_telefono: null
    });
    if (errReg) {
      console.error("[Radar-Sistema] Error autoregistrando asesor:", errReg);
      return { error: "No se pudo registrar tu usuario. Intenta de nuevo." };
    }
  } catch (e) {
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo en unos segundos." };
  }
  return { user: { profile: "advisor", tier: "advisor", advisor: chosenAdvisor, name: chosenAdvisor } };
}

if (typeof attemptLoginV84 === "function") {
  attemptLoginV84 = async function () {
    const emailEl = $("loginEmail"), phoneEl = $("loginPhone"), rememberEl = $("rememberSession"), error = $("loginError");
    const email = String((emailEl && emailEl.value) || "").trim().toLowerCase();
    const phone = String((phoneEl && phoneEl.value) || "").trim();
    const remember = rememberEl ? rememberEl.checked : false;
    if (error) error.textContent = "";

    if (typeof validEmailV84 === "function" && !validEmailV84(email)) {
      if (error) error.textContent = "Ingresa un correo válido.";
      return;
    }
    if (typeof validPhoneV84 === "function" && !validPhoneV84(phone)) {
      if (error) error.textContent = "Ingresa un teléfono válido de 10 dígitos.";
      return;
    }

    const roleSelect = $("loginRoleSelect");
    const chosenRole = roleSelect ? roleSelect.value : "asesor";
    const advisorSelect = $("loginAdvisorSelect");
    const chosenAdvisor = advisorSelect ? advisorSelect.value : "";

    if (chosenRole === "administrador") {
      if (error) error.textContent = "Las cuentas Administrador ya no se auto-declaran aquí: pide a tu Super Administrador que te dé acceso desde la pestaña Sistema.";
      return;
    }

    const loginBtn = $("loginBtn");
    if (loginBtn) loginBtn.disabled = true;
    if (error) error.textContent = "Verificando…";

    let resolved;
    try {
      resolved = await resolveUserSupabaseV1(email, chosenAdvisor);
    } finally {
      if (loginBtn) loginBtn.disabled = false;
    }

    if (resolved.blocked) {
      if (error) error.textContent = "Este dominio de correo ya no está autorizado para ingresar a Radar.";
      return;
    }
    if (resolved.error) {
      if (error) error.textContent = resolved.error;
      return;
    }
    if (resolved.needsSelection) {
      if (error) error.textContent = "Primer ingreso: selecciona a qué asesor corresponde este correo.";
      return;
    }

    if (error) error.textContent = "";
    const fullUser = { ...resolved.user, email };
    setSessionV84(fullUser, phone, remember);
    logAccessV84(fullUser, phone); // ya dispara logEventoV98("acceso", ...) vía mejoras-v1.js
    if (typeof supabaseClientV94 !== "undefined") {
      supabaseClientV94.rpc("registrar_ingreso_v1", { p_email: email }).then(({ error: e2 }) => {
        if (e2) console.error("[Radar-Sistema] Error registrando último ingreso:", e2);
      });
    }
    applyUserProfileV84();
    if (typeof renderUsageDashboardV84 === "function") renderUsageDashboardV84();
    if (typeof updateSessionRoleLabelV93 === "function") updateSessionRoleLabelV93();
    render();
  };
}

// ------------------------------------------------------------
// 2) Pestaña "Sistema" — exclusiva Super Administrador
// ------------------------------------------------------------

const SISTEMA_PANEL_IDS_V1 = ["growthConfigPanel", "modeloCalculoPanel", "pesosScorePanel"];

function sistemaEsSuperAdminV1() {
  return typeof isSuperAdminV93 === "function" && isSuperAdminV93();
}

function sistemaCredencialesV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "" };
}

function sistemaInsertarNavV1() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || $("navSistema")) return;
  const navLog = $("navLog");
  const navAjustes = $("navAjustes");
  const a = document.createElement("a");
  a.id = "navSistema";
  a.textContent = "Sistema";
  const referencia = navLog || navAjustes;
  if (referencia && referencia.parentNode) {
    referencia.parentNode.insertBefore(a, referencia);
  } else {
    nav.appendChild(a);
  }
  a.addEventListener("click", showSistemaV1);
}

function sistemaInsertarVistaV1() {
  if ($("sistemaView")) return;
  const referencia = $("clientsManagementView") || $("ajustesView");
  if (!referencia || !referencia.parentNode) return;

  const section = document.createElement("section");
  section.className = "sistema-view hidden-view";
  section.id = "sistemaView";
  section.innerHTML = `
    <div class="dashboard-title">
      <div>
        <p>Exclusivo Super Administrador: configuración comercial, modelo de cálculo, ponderación del score, administradores y log de eventos.</p>
      </div>
    </div>
    <div class="sistema-panels" id="sistemaPanelsHost"></div>
  `;
  referencia.parentNode.insertBefore(section, referencia);
}

function sistemaReubicarPanelesV1() {
  const host = $("sistemaPanelsHost");
  if (!host) return;
  SISTEMA_PANEL_IDS_V1.forEach(id => {
    const el = $(id);
    if (el && el.parentNode !== host) host.appendChild(el);
  });
  if ($("sistemaAdminPanel") && $("sistemaAdminPanel").parentNode !== host) host.appendChild($("sistemaAdminPanel"));
  if ($("sistemaLogPanel") && $("sistemaLogPanel").parentNode !== host) host.appendChild($("sistemaLogPanel"));
}

function showSistemaV1() {
  if (!sistemaEsSuperAdminV1()) return;
  if (typeof hideAllPrimaryViewsV93 === "function") hideAllPrimaryViewsV93();
  // Oculta explícitamente las demás vistas propias/de otras capas (Ajustes,
  // Log, Seguimiento, Prospección, Alarmas, Ranking, Metas), ya que
  // hideAllPrimaryViewsV93() (app.js) no las conoce. "Usuarios" ya no es
  // una vista propia (Mejoras 2026-08-19): ahora vive dentro de
  // Gestión de asesores, que sí se oculta vía hideAllPrimaryViewsV93.
  ["ajustesView", "logView", "seguimientoView", "prospeccionView", "alarmasView", "rankingView", "metasView"].forEach(id => {
    const el = $(id); if (el) el.classList.add("hidden-view");
  });
  sistemaReubicarPanelesV1();
  const view = $("sistemaView");
  if (view) view.classList.remove("hidden-view");
  SISTEMA_PANEL_IDS_V1.forEach(id => {
    const el = $(id);
    if (el) { el.classList.remove("hidden-view", "superadmin-only-hidden"); el.style.display = ""; }
  });
  if ($("sistemaAdminPanel")) $("sistemaAdminPanel").classList.remove("hidden-view");
  if ($("sistemaLogPanel")) $("sistemaLogPanel").classList.remove("hidden-view");
  if ($("navSistema")) $("navSistema").classList.add("active");
  if (typeof setModeloProbabilidadCumplimientoInputV15 === "function") setModeloProbabilidadCumplimientoInputV15();
  sistemaCargarAdministradoresV1();
  sistemaCargarContadorLogV1();
}

// ------------------------------------------------------------
// 2a) Panel de administradores
// ------------------------------------------------------------

function sistemaInsertarPanelAdminV1() {
  if ($("sistemaAdminPanel")) return;
  const referencia = $("sistemaPanelsHost") || $("growthConfigPanel");
  if (!referencia) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "sistemaAdminPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Administradores</h3>
        <p>Solo Super Administrador. Crea, edita y revoca cuentas Administrador; otorga o revoca el rol Super Administrador.</p>
      </div>
    </div>
    <div class="sistema-admin-form">
      <label>Correo <input type="email" id="sistemaAdminEmail" placeholder="correo@ejemplo.com"/></label>
      <label>Nombre <input type="text" id="sistemaAdminNombre" placeholder="Nombre (opcional)"/></label>
      <label>Teléfono <input type="tel" id="sistemaAdminTelefono" placeholder="Opcional"/></label>
      <div class="actions">
        <button class="btn" id="sistemaCrearAdminBtn" type="button">Crear / editar administrador</button>
      </div>
      <div id="sistemaAdminMsg" class="sistema-msg"></div>
    </div>
    <div class="table-scroll">
      <table class="sistema-admin-table">
        <thead>
          <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Último ingreso</th><th>Acciones</th></tr>
        </thead>
        <tbody id="sistemaAdminTableBody"><tr><td colspan="5">Cargando…</td></tr></tbody>
      </table>
    </div>
  `;
  if (referencia.appendChild) referencia.appendChild(panel);
}

async function sistemaCargarAdministradoresV1() {
  const body = $("sistemaAdminTableBody");
  if (!body) return;
  const cred = sistemaCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") {
    body.innerHTML = '<tr><td colspan="5">No se pudo identificar tu sesión.</td></tr>';
    return;
  }
  try {
    const { data, error } = await supabaseClientV94.rpc("listar_administradores_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Sistema] Error listando administradores:", error);
      body.innerHTML = '<tr><td colspan="5">No se pudieron cargar los administradores.</td></tr>';
      return;
    }
    const rows = data || [];
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">Sin administradores registrados.</td></tr>'; return; }
    body.innerHTML = rows.map(r => {
      const rolLabel = r.rol === "superadmin" ? "Super Administrador" : "Administrador";
      const ultimo = r.ultimo_ingreso ? new Date(r.ultimo_ingreso).toLocaleString("es-CO") : "—";
      const esFijo = r.email === (typeof ADMIN_EMAIL_V92 !== "undefined" ? ADMIN_EMAIL_V92 : "");
      const acciones = esFijo
        ? '<span class="sistema-tag">Cuenta fija</span>'
        : (r.rol === "superadmin"
            ? `<button class="btn ghost small-btn" data-accion="revocar-super" data-email="${esc(r.email)}">Quitar Super Admin</button>`
            : `<button class="btn ghost small-btn" data-accion="otorgar-super" data-email="${esc(r.email)}">Hacer Super Admin</button>
               <button class="btn ghost small-btn" data-accion="revocar-admin" data-email="${esc(r.email)}">Revocar administrador</button>`);
      return `<tr>
        <td>${esc(r.email)}</td>
        <td>${esc(r.nombre || "")}</td>
        <td>${rolLabel}</td>
        <td>${ultimo}</td>
        <td class="sistema-admin-acciones">${acciones}</td>
      </tr>`;
    }).join("");
  } catch (e) {
    console.error("[Radar-Sistema] Fallo de conexión listando administradores:", e);
    body.innerHTML = '<tr><td colspan="5">No se pudo conectar con el servidor.</td></tr>';
  }
}

async function sistemaCrearAdminV1() {
  const msg = $("sistemaAdminMsg");
  const cred = sistemaCredencialesV1();
  const emailObjetivo = String($("sistemaAdminEmail")?.value || "").trim().toLowerCase();
  const nombre = String($("sistemaAdminNombre")?.value || "").trim();
  const telefono = String($("sistemaAdminTelefono")?.value || "").trim();
  if (msg) msg.textContent = "";

  if (!emailObjetivo || (typeof validEmailV84 === "function" && !validEmailV84(emailObjetivo))) {
    if (msg) { msg.textContent = "Ingresa un correo válido."; msg.className = "sistema-msg sistema-msg-error"; }
    return;
  }
  if (typeof supabaseClientV94 === "undefined") return;

  try {
    const { error } = await supabaseClientV94.rpc("crear_o_editar_administrador_v1", {
      p_super_email: cred.email,
      p_super_telefono: cred.telefono || null,
      p_email_objetivo: emailObjetivo,
      p_nombre: nombre || null,
      p_telefono_objetivo: telefono || null
    });
    if (error) {
      console.error("[Radar-Sistema] Error creando administrador:", error);
      if (msg) { msg.textContent = "No se pudo crear/editar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Administrador guardado: ${emailObjetivo}`; msg.className = "sistema-msg sistema-msg-ok"; }
    if ($("sistemaAdminEmail")) $("sistemaAdminEmail").value = "";
    if ($("sistemaAdminNombre")) $("sistemaAdminNombre").value = "";
    if ($("sistemaAdminTelefono")) $("sistemaAdminTelefono").value = "";
    sistemaCargarAdministradoresV1();
  } catch (e) {
    console.error("[Radar-Sistema] Fallo de conexión creando administrador:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

async function sistemaAccionAdminV1(accion, emailObjetivo) {
  const cred = sistemaCredencialesV1();
  const msg = $("sistemaAdminMsg");
  if (typeof supabaseClientV94 === "undefined") return;

  const confirmaciones = {
    "revocar-admin": `¿Revocar la cuenta Administrador de ${emailObjetivo}? Pasará a Asesor.`,
    "otorgar-super": `¿Otorgar el rol Super Administrador a ${emailObjetivo}? Tendrá control total del sistema.`,
    "revocar-super": `¿Quitar el rol Super Administrador a ${emailObjetivo}? Pasará a Administrador.`
  };
  if (!confirm(confirmaciones[accion] || "¿Confirmar acción?")) return;

  try {
    let error;
    if (accion === "revocar-admin") {
      ({ error } = await supabaseClientV94.rpc("revocar_administrador_v1", {
        p_super_email: cred.email, p_super_telefono: cred.telefono || null, p_email_objetivo: emailObjetivo
      }));
    } else if (accion === "otorgar-super") {
      ({ error } = await supabaseClientV94.rpc("cambiar_rol_superadmin_v1", {
        p_super_email: cred.email, p_super_telefono: cred.telefono || null, p_email_objetivo: emailObjetivo, p_otorgar: true
      }));
    } else if (accion === "revocar-super") {
      ({ error } = await supabaseClientV94.rpc("cambiar_rol_superadmin_v1", {
        p_super_email: cred.email, p_super_telefono: cred.telefono || null, p_email_objetivo: emailObjetivo, p_otorgar: false
      }));
    }
    if (error) {
      console.error("[Radar-Sistema] Error en acción de administrador:", error);
      if (msg) { msg.textContent = "No se pudo completar la acción: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = "Acción completada."; msg.className = "sistema-msg sistema-msg-ok"; }
    sistemaCargarAdministradoresV1();
  } catch (e) {
    console.error("[Radar-Sistema] Fallo de conexión en acción de administrador:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

// ------------------------------------------------------------
// 2b) Panel de log de eventos: contador + reset
// ------------------------------------------------------------

function sistemaInsertarPanelLogV1() {
  if ($("sistemaLogPanel")) return;
  const referencia = $("sistemaPanelsHost") || $("growthConfigPanel");
  if (!referencia) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "sistemaLogPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Log de eventos (historial_cambios)</h3>
        <p>Solo Super Administrador. Consulta cuántos eventos hay registrados y, si es necesario, resetea el historial.</p>
      </div>
    </div>
    <div class="usage-grid">
      <article><span>Eventos registrados</span><strong id="sistemaLogCount">—</strong></article>
    </div>
    <div class="actions">
      <button class="btn ghost small-btn" id="sistemaLogRefreshBtn" type="button">Actualizar conteo</button>
      <button class="btn danger small-btn" id="sistemaLogResetBtn" type="button">Resetear historial</button>
    </div>
    <div id="sistemaLogMsg" class="sistema-msg"></div>
  `;
  if (referencia.appendChild) referencia.appendChild(panel);
}

async function sistemaCargarContadorLogV1() {
  const el = $("sistemaLogCount");
  const cred = sistemaCredencialesV1();
  if (!el || !cred.email || typeof supabaseClientV94 === "undefined") return;
  try {
    const { data, error } = await supabaseClientV94.rpc("contar_eventos_historial_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) { console.error("[Radar-Sistema] Error contando eventos:", error); el.textContent = "Error"; return; }
    el.textContent = data ?? 0;
  } catch (e) {
    console.error("[Radar-Sistema] Fallo de conexión contando eventos:", e);
    el.textContent = "Error";
  }
}

async function sistemaResetearLogV1() {
  const msg = $("sistemaLogMsg");
  const cred = sistemaCredencialesV1();
  if (typeof supabaseClientV94 === "undefined") return;

  if (!confirm("¿Seguro que quieres borrar TODO el historial de eventos? Esta acción no se puede deshacer.")) return;
  if (!confirm("Confirmación final: se eliminarán todos los eventos registrados. ¿Continuar?")) return;

  try {
    const { data, error } = await supabaseClientV94.rpc("resetear_historial_cambios_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Sistema] Error reseteando historial:", error);
      if (msg) { msg.textContent = "No se pudo resetear: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Historial reseteado. Se eliminaron ${data ?? 0} eventos.`; msg.className = "sistema-msg sistema-msg-ok"; }
    sistemaCargarContadorLogV1();
  } catch (e) {
    console.error("[Radar-Sistema] Fallo de conexión reseteando historial:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

// ------------------------------------------------------------
// 3) Cableado inicial
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  sistemaInsertarNavV1();
  sistemaInsertarVistaV1();

  // V15.1: HALLAZGO reportado por el cliente (Ago 20) — growthConfigPanel
  // y modeloCalculoPanel viven en el HTML sueltos dentro de <main>, sin
  // estar anidados en ninguna vista de pestaña específica. Antes de esta
  // corrección, sistemaReubicarPanelesV1() SOLO se ejecutaba la primera
  // vez que el usuario entraba a "Sistema" (showSistemaV1() la llama) —
  // hasta ese momento, para el Super Administrador (con
  // superadmin-only-hidden ya desactivado por su rol), esos paneles
  // quedaban visibles en CUALQUIER pestaña, incluida Hoja de ruta. Se
  // reubican aquí, una sola vez, apenas se crea el DOM — antes de
  // sistemaInsertarPanelAdminV1()/sistemaInsertarPanelLogV1() para que
  // ambas usen sistemaPanelsHost (ya con los otros paneles dentro) como
  // referencia de inserción.
  if (typeof sistemaReubicarPanelesV1 === "function") {
    try { sistemaReubicarPanelesV1(); } catch (e) { console.error("[Radar-Sistema] Error reubicando paneles al iniciar:", e); }
  }

  sistemaInsertarPanelAdminV1();
  sistemaInsertarPanelLogV1();

  if ($("sistemaCrearAdminBtn")) $("sistemaCrearAdminBtn").addEventListener("click", sistemaCrearAdminV1);
  if ($("sistemaLogRefreshBtn")) $("sistemaLogRefreshBtn").addEventListener("click", sistemaCargarContadorLogV1);
  if ($("sistemaLogResetBtn")) $("sistemaLogResetBtn").addEventListener("click", sistemaResetearLogV1);

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion][data-email]");
    if (!btn || !$("sistemaAdminTableBody") || !$("sistemaAdminTableBody").contains(btn)) return;
    sistemaAccionAdminV1(btn.getAttribute("data-accion"), btn.getAttribute("data-email"));
  });

  const sistemaAjustarVisibilidadNavV1 = () => {
    const el = $("navSistema");
    if (el) el.style.display = sistemaEsSuperAdminV1() ? "" : "none";
  };
  sistemaAjustarVisibilidadNavV1();

  if (typeof applyAdminVisibilityV811 === "function") {
    const _applyAdminVisibilidadOriginalSistemaV1 = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _applyAdminVisibilidadOriginalSistemaV1();
      try { sistemaAjustarVisibilidadNavV1(); } catch (e) { console.error("[Radar-Sistema] Error aplicando visibilidad:", e); }
    };
  }

  ["showViewV812", "showGlossaryV814", "showClientsManagementV93", "showAdvisorsManagementV93", "showAjustesV1", "showLogViewV98", "showProspeccionViewV104"].forEach(fnName => {
    if (typeof window[fnName] === "function") {
      const _original = window[fnName];
      window[fnName] = function (...args) {
        const view = $("sistemaView");
        if (view) view.classList.add("hidden-view");
        return _original.apply(this, args);
      };
    }
  });
});
