// ============================================================
// RADAR INDUSTRIAL — Canal de soporte integrado (V1 Soporte)
// ------------------------------------------------------------
// Este archivo se carga DESPUÉS de app.js, supabase-sync.js y
// mejoras-v1.js. Sigue la misma convención del proyecto: no
// modifica esos archivos, solo agrega funciones nuevas y
// engancha DOMContentLoaded para insertar su propio botón/modal.
//
// Qué hace:
//   - Botón flotante "Soporte" visible para cualquier usuario
//     logueado (asesor, admin o superadmin).
//   - Modal de 3 pasos: elegir tipo -> formulario -> confirmación.
//     Tipos: Reportar un problema / Sugerir una mejora /
//     Calificar la experiencia (1-5 estrellas).
//   - Autocompleta nombre/correo/rol/contexto desde la sesión
//     activa (currentUserV84), sin pedirle al usuario que los
//     vuelva a escribir.
//   - Envía el reporte llamando a la función RPC
//     enviar_reporte_soporte (Supabase), ya protegida por
//     validaciones en base de datos.
//   - Agrega una sección "Soporte" al panel de administración
//     (visible solo para Administrador y Super Administrador,
//     mismo criterio que el resto de paneles admin: isAdminV86()).
//     Permite filtrar, cambiar estado y eliminar reportes,
//     llamando a listar_reportes_soporte / actualizar_reporte_soporte /
//     eliminar_reporte_soporte.
//
// Nota de seguridad (deuda técnica documentada, ver migración SQL
// crear_reportes_soporte): esta app no usa Supabase Auth, por lo
// que la validación de "quién es admin" en las funciones de
// gestión se hace cruzando email+teléfono contra la tabla
// `usuarios`. Es una protección razonable contra un usuario
// casual, no contra un atacante que conozca ambos datos de un
// admin. La corrección definitiva (Supabase Auth real) quedó
// planeada como proyecto separado, por decisión del cliente.
// ============================================================

const SOPORTE_TIPOS_V1 = [
  {
    valor: "problema",
    icono: "⚠️",
    titulo: "Reportar un problema",
    descripcion: "Algo no funciona como debería."
  },
  {
    valor: "sugerencia",
    icono: "💡",
    titulo: "Sugerir una mejora",
    descripcion: "Tienes una idea para mejorar Radar."
  },
  {
    valor: "calificacion",
    icono: "⭐",
    titulo: "Calificar la experiencia",
    descripcion: "Cuéntanos qué tan bien te está funcionando."
  }
];

let soporteEstadoV1 = { paso: "selector", tipo: null, estrellas: 0 };

// ------------------------------------------------------------
// Datos de sesión: nombre / correo / rol / contexto, tal como
// los conoce la app (currentUserV84, ver app.js V8.4/V9.3).
// ------------------------------------------------------------
function soporteDatosSesionV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  if (!u) return { nombre: "", email: "", telefono: "", rol: "", contexto: "" };
  const rol = u.tier === "superadmin" ? "Super Administrador" : (u.profile === "admin" ? "Administrador" : "Asesor");
  return {
    nombre: u.name || "",
    email: u.email || "",
    telefono: u.phone || "",
    rol,
    contexto: (u.profile !== "admin" && u.advisor) ? `Asesor: ${u.advisor}` : ""
  };
}

function soportePantallaActualV1() {
  const activo = document.querySelector(".sidebar nav a.active");
  return activo ? activo.textContent.trim() : "Hoja de ruta";
}

// ------------------------------------------------------------
// Inserta el botón flotante y el modal en el DOM (una sola vez).
// ------------------------------------------------------------
function soporteInsertarUiV1() {
  if ($("soporteFab")) return;

  const fab = document.createElement("button");
  fab.id = "soporteFab";
  fab.className = "soporte-fab";
  fab.type = "button";
  fab.title = "Soporte";
  // Pedido de Sergio (03-sep-2026): el emoji 💬 se veía borroso/poco
  // claro en varias plataformas (Android/algunos navegadores lo
  // renderizan pequeño o con un estilo que no combina con el resto de
  // la app). Se reemplaza por un ícono SVG propio — burbuja de chat
  // con un signo de interrogación, línea limpia, mismo tamaño y
  // posición que antes, mismo color (blanco sobre el fondo oscuro ya
  // definido en .soporte-fab).
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      <path d="M9.1 9.5a2.9 2.9 0 0 1 5.6 1c0 1.9-2.6 1.9-2.6 3.6" stroke-width="1.8"/>
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none"/>
    </svg>
  `;
  document.body.appendChild(fab);

  const overlay = document.createElement("div");
  overlay.id = "soporteModal";
  overlay.className = "modal-overlay soporte-overlay";
  overlay.innerHTML = `
    <div class="modal-card soporte-modal-card">
      <div class="modal-header">
        <div>
          <h3>Soporte</h3>
          <p id="soporteModalSubtitle">¿En qué te podemos ayudar?</p>
        </div>
        <button class="modal-close" id="soporteCloseBtn" type="button">×</button>
      </div>
      <div id="soporteBody"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  fab.addEventListener("click", soporteAbrirV1);
  $("soporteCloseBtn").addEventListener("click", soporteCerrarV1);
  overlay.addEventListener("click", e => { if (e.target.id === "soporteModal") soporteCerrarV1(); });
}

function soporteAbrirV1() {
  soporteEstadoV1 = { paso: "selector", tipo: null, estrellas: 0 };
  soporteRenderV1();
  $("soporteModal").classList.add("open");
}

function soporteCerrarV1() {
  $("soporteModal").classList.remove("open");
}

// ------------------------------------------------------------
// Render de los 3 pasos.
// ------------------------------------------------------------
function soporteRenderV1() {
  const body = $("soporteBody");
  const subtitle = $("soporteModalSubtitle");
  if (!body) return;

  if (soporteEstadoV1.paso === "selector") {
    subtitle.textContent = "¿En qué te podemos ayudar?";
    body.innerHTML = `
      <div class="soporte-selector-grid">
        ${SOPORTE_TIPOS_V1.map(t => `
          <button type="button" class="soporte-opcion" data-soporte-tipo="${t.valor}">
            <span class="soporte-opcion-icono">${t.icono}</span>
            <span class="soporte-opcion-titulo">${t.titulo}</span>
            <span class="soporte-opcion-desc">${t.descripcion}</span>
          </button>
        `).join("")}
      </div>
    `;
    body.querySelectorAll("[data-soporte-tipo]").forEach(btn => {
      btn.addEventListener("click", () => {
        soporteEstadoV1.tipo = btn.dataset.soporteTipo;
        soporteEstadoV1.paso = "formulario";
        soporteRenderV1();
      });
    });
    return;
  }

  if (soporteEstadoV1.paso === "formulario") {
    const tipoInfo = SOPORTE_TIPOS_V1.find(t => t.valor === soporteEstadoV1.tipo);
    subtitle.textContent = tipoInfo ? tipoInfo.titulo : "";
    const esCalificacion = soporteEstadoV1.tipo === "calificacion";
    const sesion = soporteDatosSesionV1();

    body.innerHTML = `
      <form id="soporteForm" class="modal-form">
        ${esCalificacion ? `
          <label>Tu calificación</label>
          <div class="soporte-estrellas" id="soporteEstrellas">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="soporte-estrella" data-estrella="${n}" aria-label="${n} estrellas">★</button>`).join("")}
          </div>
          <label>Comentario adicional (opcional)</label>
          <textarea id="soporteMensaje" rows="3" placeholder="Cuéntanos más, si quieres"></textarea>
        ` : `
          <label>Cuéntanos con el mayor detalle posible</label>
          <textarea id="soporteMensaje" rows="5" placeholder="Describe el problema o la mejora que propones" required></textarea>
        `}
        <p class="soporte-error" id="soporteFormError"></p>
        <div class="actions">
          <button type="submit" class="btn" id="soporteEnviarBtn">Enviar</button>
          <button type="button" class="btn ghost" id="soporteVolverBtn">Volver</button>
        </div>
        <small class="field-help">
          Se enviará como ${esc(sesion.nombre || "usuario")} (${esc(sesion.email || "sin correo registrado")}).
        </small>
      </form>
    `;

    if (esCalificacion) {
      const estrellasWrap = $("soporteEstrellas");
      const pintarEstrellas = () => {
        estrellasWrap.querySelectorAll(".soporte-estrella").forEach(b => {
          b.classList.toggle("activa", Number(b.dataset.estrella) <= soporteEstadoV1.estrellas);
        });
      };
      estrellasWrap.querySelectorAll(".soporte-estrella").forEach(b => {
        b.addEventListener("click", () => {
          soporteEstadoV1.estrellas = Number(b.dataset.estrella);
          pintarEstrellas();
        });
      });
      pintarEstrellas();
    }

    $("soporteVolverBtn").addEventListener("click", () => {
      soporteEstadoV1.paso = "selector";
      soporteRenderV1();
    });

    $("soporteForm").addEventListener("submit", e => {
      e.preventDefault();
      soporteEnviarV1();
    });
    return;
  }

  if (soporteEstadoV1.paso === "confirmacion") {
    subtitle.textContent = "";
    body.innerHTML = `
      <div class="soporte-confirmacion">
        <span class="soporte-confirmacion-icono">✅</span>
        <h4>¡Gracias por tu mensaje!</h4>
        <p>Lo recibimos y el equipo de ConAccion le va a hacer seguimiento.</p>
        <button type="button" class="btn" id="soporteCerrarFinalBtn">Cerrar</button>
      </div>
    `;
    $("soporteCerrarFinalBtn").addEventListener("click", soporteCerrarV1);
    return;
  }
}

// ------------------------------------------------------------
// Envío: valida en el cliente (UX), pero la validación real y
// obligatoria vive en la función SQL enviar_reporte_soporte.
// ------------------------------------------------------------
async function soporteEnviarV1() {
  const errorEl = $("soporteFormError");
  const btn = $("soporteEnviarBtn");
  errorEl.textContent = "";

  const esCalificacion = soporteEstadoV1.tipo === "calificacion";
  const mensaje = ($("soporteMensaje")?.value || "").trim();

  if (!esCalificacion && !mensaje) {
    errorEl.textContent = "Por favor describe el problema o la sugerencia antes de enviar.";
    return;
  }
  if (esCalificacion && soporteEstadoV1.estrellas < 1) {
    errorEl.textContent = "Selecciona de 1 a 5 estrellas antes de enviar.";
    return;
  }

  if (typeof supabaseClientV94 === "undefined") {
    errorEl.textContent = "No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.";
    return;
  }

  const sesion = soporteDatosSesionV1();
  btn.disabled = true;
  btn.textContent = "Enviando…";

  try {
    const { error } = await supabaseClientV94.rpc("enviar_reporte_soporte", {
      p_tipo: soporteEstadoV1.tipo,
      p_nombre: sesion.nombre || null,
      p_email: sesion.email || null,
      p_telefono: sesion.telefono || null,
      p_rol: sesion.rol || null,
      p_contexto_adicional: sesion.contexto || null,
      p_pantalla_actual: soportePantallaActualV1(),
      p_mensaje: mensaje || null,
      p_calificacion: esCalificacion ? soporteEstadoV1.estrellas : null
    });

    if (error) {
      console.error("[Radar-Soporte] Error enviando reporte:", error);
      errorEl.textContent = "No se pudo enviar tu mensaje. Verifica tu conexión a internet e inténtalo de nuevo.";
      btn.disabled = false;
      btn.textContent = "Enviar";
      return;
    }

    soporteEstadoV1.paso = "confirmacion";
    soporteRenderV1();
  } catch (e) {
    console.error("[Radar-Soporte] Fallo de conexión:", e);
    errorEl.textContent = "No se pudo conectar con el servidor. Verifica tu conexión a internet e inténtalo de nuevo.";
    btn.disabled = false;
    btn.textContent = "Enviar";
  }
}

// ------------------------------------------------------------
// Panel de administración de reportes de soporte.
// Visible solo para Administrador y Super Administrador
// (mismo criterio que dailyUpdatePanel / masterDataAdminPanel:
// isAdminV86()).
// ------------------------------------------------------------
let soporteAdminStateV1 = { tipo: "todos", estado: "todos" };
let soporteAdminCacheV1 = [];

function soporteEsAdminV1() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

function soporteAdminCredencialesV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "" };
}

function soporteInsertarPanelAdminV1() {
  if ($("soporteAdminPanel")) return;
  // Mejoras (2026-08-19): el panel de Soporte se muestra solo dentro de
  // "Gestión de asesores" (antes vivía en la Hoja de ruta y luego se
  // reubicaba en "Ajustes"; ajustes-v1.js ya no lo mueve).
  const referencia = $("advisorsManagementView");
  if (!referencia) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "soporteAdminPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Soporte — reportes de usuarios</h3>
        <p>Problemas, sugerencias y calificaciones enviadas desde la app. Visible para Administrador y Super Administrador.</p>
      </div>
    </div>
    <div class="mgmt-toolbar" style="margin:16px 0">
      <select id="soporteFiltroTipo">
        <option value="todos">Todos los tipos</option>
        <option value="problema">Problemas</option>
        <option value="sugerencia">Sugerencias</option>
        <option value="calificacion">Calificaciones</option>
      </select>
      <select id="soporteFiltroEstado">
        <option value="todos">Todos los estados</option>
        <option value="nuevo">Nuevo</option>
        <option value="en_revision">En revisión</option>
        <option value="resuelto">Resuelto</option>
        <option value="descartado">Descartado</option>
      </select>
      <button class="btn ghost" id="soporteRefrescarBtn" type="button">Actualizar</button>
      <span id="soporteAdminCount" style="margin-left:auto;color:var(--muted);font-weight:800"></span>
    </div>
    <div class="table-scroll">
      <table class="usage-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Contenido</th>
            <th>Contacto</th>
            <th>Contexto</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody id="soporteAdminBody"></tbody>
      </table>
    </div>
  `;
  referencia.appendChild(panel);

  $("soporteFiltroTipo").addEventListener("change", e => { soporteAdminStateV1.tipo = e.target.value; soporteRenderAdminTablaV1(); });
  $("soporteFiltroEstado").addEventListener("change", e => { soporteAdminStateV1.estado = e.target.value; soporteRenderAdminTablaV1(); });
  $("soporteRefrescarBtn").addEventListener("click", soporteCargarAdminV1);
}

function soporteAplicarVisibilidadPanelV1() {
  const panel = $("soporteAdminPanel");
  if (!panel) return;
  const visible = soporteEsAdminV1();
  panel.classList.toggle("admin-only-panel-hidden", !visible);
  if (visible) soporteCargarAdminV1();
}

async function soporteCargarAdminV1() {
  if (!soporteEsAdminV1()) return;
  const body = $("soporteAdminBody");
  if (body) body.innerHTML = `<tr><td colspan="7">Cargando…</td></tr>`;

  const cred = soporteAdminCredencialesV1();
  if (!cred.email) {
    if (body) body.innerHTML = `<tr><td colspan="7">No se pudo identificar tu sesión. Vuelve a iniciar sesión.</td></tr>`;
    return;
  }

  if (typeof supabaseClientV94 === "undefined") {
    if (body) body.innerHTML = `<tr><td colspan="7">No se pudo conectar con el servidor.</td></tr>`;
    return;
  }

  try {
    const { data, error } = await supabaseClientV94.rpc("listar_reportes_soporte", {
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Soporte] Error listando reportes:", error);
      if (body) body.innerHTML = `<tr><td colspan="7">No se pudieron cargar los reportes. Verifica tu conexión.</td></tr>`;
      return;
    }
    soporteAdminCacheV1 = data || [];
    soporteRenderAdminTablaV1();
  } catch (e) {
    console.error("[Radar-Soporte] Fallo de conexión listando reportes:", e);
    if (body) body.innerHTML = `<tr><td colspan="7">No se pudo conectar con el servidor.</td></tr>`;
  }
}

const SOPORTE_ESTADO_LABEL_V1 = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  resuelto: "Resuelto",
  descartado: "Descartado"
};
const SOPORTE_TIPO_LABEL_V1 = {
  problema: "Problema",
  sugerencia: "Sugerencia",
  calificacion: "Calificación"
};

function soporteRenderAdminTablaV1() {
  const body = $("soporteAdminBody");
  if (!body) return;
  const filtrados = soporteAdminCacheV1.filter(r => {
    if (soporteAdminStateV1.tipo !== "todos" && r.tipo !== soporteAdminStateV1.tipo) return false;
    if (soporteAdminStateV1.estado !== "todos" && r.estado !== soporteAdminStateV1.estado) return false;
    return true;
  });

  if ($("soporteAdminCount")) $("soporteAdminCount").textContent = `${filtrados.length} reportes`;

  if (!filtrados.length) {
    body.innerHTML = `<tr><td colspan="7">Sin reportes para este filtro.</td></tr>`;
    return;
  }

  body.innerHTML = filtrados.map(r => {
    const fecha = r.created_at ? new Date(r.created_at).toLocaleString("es-CO") : "";
    const contenido = r.tipo === "calificacion"
      ? `${"★".repeat(r.calificacion || 0)}${"☆".repeat(5 - (r.calificacion || 0))}${r.mensaje ? `<br><span style="color:var(--muted)">${esc(r.mensaje)}</span>` : ""}`
      : esc(r.mensaje || "");
    const contacto = [r.nombre, r.email, r.telefono].filter(Boolean).map(esc).join("<br>") || "—";
    const contexto = [r.rol, r.contexto_adicional, r.pantalla_actual].filter(Boolean).map(esc).join("<br>") || "—";

    return `
      <tr>
        <td>${esc(fecha)}</td>
        <td>${esc(SOPORTE_TIPO_LABEL_V1[r.tipo] || r.tipo)}</td>
        <td>${contenido}</td>
        <td>${contacto}</td>
        <td>${contexto}</td>
        <td>
          <select data-soporte-estado="${esc(r.id)}">
            ${Object.keys(SOPORTE_ESTADO_LABEL_V1).map(k => `<option value="${k}" ${k === r.estado ? "selected" : ""}>${SOPORTE_ESTADO_LABEL_V1[k]}</option>`).join("")}
          </select>
        </td>
        <td><button class="btn ghost small-btn" data-soporte-eliminar="${esc(r.id)}" type="button">Eliminar</button></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-soporte-estado]").forEach(sel => {
    sel.addEventListener("change", () => soporteActualizarEstadoV1(sel.dataset.soporteEstado, sel.value));
  });
  body.querySelectorAll("[data-soporte-eliminar]").forEach(btn => {
    btn.addEventListener("click", () => soporteEliminarReporteV1(btn.dataset.soporteEliminar));
  });
}

async function soporteActualizarEstadoV1(id, nuevoEstado) {
  const cred = soporteAdminCredencialesV1();
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  try {
    const { error } = await supabaseClientV94.rpc("actualizar_reporte_soporte", {
      p_id: id,
      p_estado: nuevoEstado,
      p_respuesta: null,
      p_actualizado_por: u ? (u.email || u.name || "") : "",
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Soporte] Error actualizando estado:", error);
      alert("No se pudo actualizar el estado del reporte. Verifica tu conexión e inténtalo de nuevo.");
      soporteCargarAdminV1();
      return;
    }
    const fila = soporteAdminCacheV1.find(r => r.id === id);
    if (fila) fila.estado = nuevoEstado;
  } catch (e) {
    console.error("[Radar-Soporte] Fallo de conexión actualizando estado:", e);
    alert("No se pudo conectar con el servidor.");
    soporteCargarAdminV1();
  }
}

async function soporteEliminarReporteV1(id) {
  if (!confirm("¿Eliminar este reporte de soporte? Esta acción no se puede deshacer.")) return;
  const cred = soporteAdminCredencialesV1();
  try {
    const { error } = await supabaseClientV94.rpc("eliminar_reporte_soporte", {
      p_id: id,
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null
    });
    if (error) {
      console.error("[Radar-Soporte] Error eliminando reporte:", error);
      alert("No se pudo eliminar el reporte. Verifica tu conexión e inténtalo de nuevo.");
      return;
    }
    soporteAdminCacheV1 = soporteAdminCacheV1.filter(r => r.id !== id);
    soporteRenderAdminTablaV1();
  } catch (e) {
    console.error("[Radar-Soporte] Fallo de conexión eliminando reporte:", e);
    alert("No se pudo conectar con el servidor.");
  }
}

// ------------------------------------------------------------
// Arranque: inserta UI, engancha visibilidad al mismo ciclo de
// render que usa el resto de paneles admin (applyAdminVisibilityV811,
// definida en app.js V8.11), sin modificar esa función original.
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  soporteInsertarUiV1();
  soporteInsertarPanelAdminV1();
  soporteAplicarVisibilidadPanelV1();

  if (typeof applyAdminVisibilityV811 === "function") {
    const _applyAdminVisibilidadOriginalV1 = applyAdminVisibilityV811;
    applyAdminVisibilityV811 = function () {
      _applyAdminVisibilidadOriginalV1();
      // Nunca debe romper el resto del ciclo de render de la app si algo
      // falla aquí (ej. sin conexión a Supabase): el panel de soporte es
      // una capa adicional, no puede bloquear el resto de la aplicación.
      try {
        soporteAplicarVisibilidadPanelV1();
      } catch (e) {
        console.error("[Radar-Soporte] Error aplicando visibilidad del panel:", e);
      }
    };
  }

  // El botón de soporte solo tiene sentido con sesión iniciada.
  // La app ya oculta todo detrás de loginOverlay, así que basta con
  // ocultar/mostrar el FAB según haya sesión activa.
  const actualizarVisibilidadFab = () => {
    const fab = $("soporteFab");
    if (!fab) return;
    const haySesion = typeof currentUserV84 !== "undefined" && !!currentUserV84;
    fab.style.display = haySesion ? "flex" : "none";
  };
  actualizarVisibilidadFab();
  if (typeof applyUserProfileV84 === "function") {
    const _applyUserProfileOriginalSoporteV1 = applyUserProfileV84;
    applyUserProfileV84 = function () {
      // La función original (que incluye ocultar loginOverlay) debe
      // ejecutarse siempre, incluso si algo del panel de soporte falla
      // después. Se aísla en su propio try/catch para no bloquear el
      // login ni el resto de la app.
      _applyUserProfileOriginalSoporteV1();
      try {
        actualizarVisibilidadFab();
      } catch (e) {
        console.error("[Radar-Soporte] Error actualizando visibilidad del botón de soporte:", e);
      }
    };
  }
});
