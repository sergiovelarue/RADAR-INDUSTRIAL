// ============================================================
// V1 Usuarios — Radar Comercial B2B (RADAR-INDUSTRIAL)
// ------------------------------------------------------------
// Capa aditiva (2026-08-18, Etapa 3). Gestiona cuentas de acceso
// (login) con rol Asesor: crear, editar, eliminar.
//
// Mejoras (2026-08-19): esta funcionalidad dejó de ser una pestaña
// separada ("Usuarios") y ahora vive DENTRO de "Gestión de
// asesores" (advisorsManagementView), como panel adicional. No hay
// nav ni vista propia — se muestra siempre que se abre Gestión de
// asesores, con el mismo control de acceso (Administrador + Super
// Administrador) que ya tiene esa pestaña.
//
// Importante — separación de conceptos (sin cambios):
// - "Gestión de asesores" administra el equipo comercial (nombre,
//   municipio, canal, zona, clientes asignados) — información de
//   negocio, en DATA.meta.asesores.
// - Este panel administra las CUENTAS DE ACCESO a la app (login:
//   correo, rol) — vive en la tabla usuarios de Supabase. Un
//   asesor puede existir en "Gestión de asesores" sin tener
//   todavía una cuenta de acceso, y viceversa.
//
// No puede crear, editar ni eliminar cuentas Administrador o Super
// Administrador — eso sigue siendo exclusivo de Super Admin desde
// la pestaña Sistema (sistema-v1.js).
//
// Requiere las funciones SECURITY DEFINER de la migración
// etapa3_gestion_usuarios_asesor_v1: listar_usuarios_asesor_v1,
// crear_o_editar_usuario_asesor_v1, eliminar_usuario_asesor_v1.
// ============================================================

function usuariosEsAdminV1() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

function usuariosCredencialesV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "" };
}

function usuariosInsertarPanelV1() {
  if ($("usuariosAdminPanel")) return;
  const referencia = $("advisorsManagementView");
  if (!referencia) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "usuariosAdminPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Cuentas de acceso (Asesor)</h3>
        <p>Administrador y Super Administrador. Correo con el que el asesor ingresa a Radar. El nombre debe coincidir con el asesor de esta misma pestaña para que vea sus propios clientes. Las cuentas Administrador y Super Administrador se gestionan desde la pestaña Sistema.</p>
      </div>
    </div>
    <div class="usuarios-form">
      <label>Correo <input type="email" id="usuariosEmail" placeholder="correo@ejemplo.com"/></label>
      <label>Nombre del asesor <input type="text" id="usuariosNombre" placeholder="Como aparece arriba, en Asesores"/></label>
      <label>Teléfono <input type="tel" id="usuariosTelefono" placeholder="Opcional"/></label>
      <div class="actions">
        <button class="btn" id="usuariosCrearBtn" type="button">Crear / editar usuario</button>
      </div>
      <div id="usuariosMsg" class="sistema-msg"></div>
    </div>
    <div class="usuarios-toolbar">
      <input type="search" id="usuariosBuscar" placeholder="Buscar por correo o nombre…"/>
      <span id="usuariosCount" class="usuarios-count"></span>
    </div>
    <table class="sistema-admin-table">
      <thead>
        <tr><th>Correo</th><th>Nombre</th><th>Teléfono</th><th>Último ingreso</th><th>Acciones</th></tr>
      </thead>
      <tbody id="usuariosTableBody"><tr><td colspan="5">Cargando…</td></tr></tbody>
    </table>
  `;
  // Se ubica antes del catálogo de canales/zonas, al final de la vista.
  const canalPanel = $("canalCatalogPanel");
  if (canalPanel && canalPanel.parentNode === referencia) {
    referencia.insertBefore(panel, canalPanel);
  } else {
    referencia.appendChild(panel);
  }
}

let usuariosCacheV1 = [];
let usuariosBusquedaV1 = "";

async function usuariosCargarV1() {
  const body = $("usuariosTableBody");
  if (!body) return;
  const cred = usuariosCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") {
    body.innerHTML = '<tr><td colspan="5">No se pudo identificar tu sesión.</td></tr>';
    return;
  }
  try {
    const { data, error } = await supabaseClientV94.rpc("listar_usuarios_asesor_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Usuarios] Error listando usuarios:", error);
      body.innerHTML = '<tr><td colspan="5">No se pudieron cargar los usuarios.</td></tr>';
      return;
    }
    usuariosCacheV1 = data || [];
    usuariosRenderTablaV1();
  } catch (e) {
    console.error("[Radar-Usuarios] Fallo de conexión listando usuarios:", e);
    body.innerHTML = '<tr><td colspan="5">No se pudo conectar con el servidor.</td></tr>';
  }
}

function usuariosRenderTablaV1() {
  const body = $("usuariosTableBody");
  if (!body) return;
  const q = usuariosBusquedaV1.toLowerCase().trim();
  const rows = usuariosCacheV1.filter(r => {
    if (!q) return true;
    return `${r.email || ""} ${r.nombre || ""}`.toLowerCase().includes(q);
  });
  if ($("usuariosCount")) $("usuariosCount").textContent = `${rows.length} usuario(s)`;
  if (!rows.length) { body.innerHTML = '<tr><td colspan="5">Sin cuentas de asesor registradas.</td></tr>'; return; }
  body.innerHTML = rows.map(r => {
    const ultimo = r.ultimo_ingreso ? new Date(r.ultimo_ingreso).toLocaleString("es-CO") : "—";
    return `<tr>
      <td>${esc(r.email)}</td>
      <td>${esc(r.nombre || "")}</td>
      <td>${esc(r.telefono || "")}</td>
      <td>${ultimo}</td>
      <td class="sistema-admin-acciones">
        <button class="btn ghost small-btn" data-accion="editar" data-email="${esc(r.email)}">Editar</button>
        <button class="btn ghost small-btn" data-accion="eliminar" data-email="${esc(r.email)}">Eliminar</button>
      </td>
    </tr>`;
  }).join("");
}

async function usuariosGuardarV1() {
  const msg = $("usuariosMsg");
  const cred = usuariosCredencialesV1();
  const emailObjetivo = String($("usuariosEmail")?.value || "").trim().toLowerCase();
  const nombre = String($("usuariosNombre")?.value || "").trim();
  const telefono = String($("usuariosTelefono")?.value || "").trim();
  if (msg) msg.textContent = "";

  if (!emailObjetivo || (typeof validEmailV84 === "function" && !validEmailV84(emailObjetivo))) {
    if (msg) { msg.textContent = "Ingresa un correo válido."; msg.className = "sistema-msg sistema-msg-error"; }
    return;
  }
  if (typeof supabaseClientV94 === "undefined") return;

  try {
    const { error } = await supabaseClientV94.rpc("crear_o_editar_usuario_asesor_v1", {
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null,
      p_email_objetivo: emailObjetivo,
      p_nombre: nombre || null,
      p_telefono_objetivo: telefono || null,
      p_asesor_id: null
    });
    if (error) {
      console.error("[Radar-Usuarios] Error guardando usuario:", error);
      if (msg) { msg.textContent = "No se pudo guardar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Usuario guardado: ${emailObjetivo}`; msg.className = "sistema-msg sistema-msg-ok"; }
    if ($("usuariosEmail")) $("usuariosEmail").value = "";
    if ($("usuariosNombre")) $("usuariosNombre").value = "";
    if ($("usuariosTelefono")) $("usuariosTelefono").value = "";
    usuariosCargarV1();
  } catch (e) {
    console.error("[Radar-Usuarios] Fallo de conexión guardando usuario:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

function usuariosEditarV1(email) {
  const r = usuariosCacheV1.find(x => x.email === email);
  if (!r) return;
  if ($("usuariosEmail")) $("usuariosEmail").value = r.email || "";
  if ($("usuariosNombre")) $("usuariosNombre").value = r.nombre || "";
  if ($("usuariosTelefono")) $("usuariosTelefono").value = r.telefono || "";
  const panel = $("usuariosAdminPanel");
  if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function usuariosEliminarV1(email) {
  const msg = $("usuariosMsg");
  const cred = usuariosCredencialesV1();
  if (typeof supabaseClientV94 === "undefined") return;
  if (!confirm(`¿Eliminar la cuenta de acceso ${email}? El asesor ya no podrá ingresar con este correo.`)) return;

  try {
    const { error } = await supabaseClientV94.rpc("eliminar_usuario_asesor_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null, p_email_objetivo: email
    });
    if (error) {
      console.error("[Radar-Usuarios] Error eliminando usuario:", error);
      if (msg) { msg.textContent = "No se pudo eliminar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Usuario eliminado: ${email}`; msg.className = "sistema-msg sistema-msg-ok"; }
    usuariosCargarV1();
  } catch (e) {
    console.error("[Radar-Usuarios] Fallo de conexión eliminando usuario:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  usuariosInsertarPanelV1();

  if ($("usuariosCrearBtn")) $("usuariosCrearBtn").addEventListener("click", usuariosGuardarV1);
  if ($("usuariosBuscar")) $("usuariosBuscar").addEventListener("input", e => {
    usuariosBusquedaV1 = e.target.value || "";
    usuariosRenderTablaV1();
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion][data-email]");
    if (!btn || !$("usuariosTableBody") || !$("usuariosTableBody").contains(btn)) return;
    const accion = btn.getAttribute("data-accion");
    const email = btn.getAttribute("data-email");
    if (accion === "editar") usuariosEditarV1(email);
    if (accion === "eliminar") usuariosEliminarV1(email);
  });

  // showAdvisorsManagementV93 ya existe (app.js V9.3); se envuelve para
  // cargar las cuentas de acceso cada vez que se abre Gestión de
  // asesores, sin tocar el archivo original.
  if (typeof showAdvisorsManagementV93 === "function") {
    const _showAdvisorsOriginalV1 = showAdvisorsManagementV93;
    showAdvisorsManagementV93 = function (...args) {
      const r = _showAdvisorsOriginalV1.apply(this, args);
      if (usuariosEsAdminV1()) usuariosCargarV1();
      return r;
    };
  }
});
