// ============================================================
// V107 — Autorización de tratamiento de datos personales
// ------------------------------------------------------------
// Pedido de Sergio (12-ago-2026): al registrar un correo por
// primera vez en el login de la app (asesor o administrador),
// debe aceptar el tratamiento de sus datos personales antes de
// poder continuar. No reemplaza attemptLoginV84 — lo envuelve
// (mismo patrón wrapper de todo el proyecto).
//
// ⚠️ TEXTO LEGAL GENÉRICO — debe personalizarse por negocio.
// Este texto (Ley 1581 de 2012, Colombia) es un punto de partida
// razonable, NO una asesoría legal. Antes de producción real,
// un abogado debe validar: razón social exacta del responsable,
// finalidad específica del tratamiento, mecanismos de consulta/
// reclamo/revocación (obligatorios por el Decreto 1377/2013), y
// datos de contacto reales del responsable del tratamiento.
// ------------------------------------------------------------

const TEXTO_CONSENTIMIENTO_V107 =
  "Autorizo el tratamiento de mis datos personales por parte de ConAccion BPS y/o Sergio Velásquez, " +
  "conforme a la Ley 1581 de 2012 (Colombia), para fines de gestión comercial, administración de la " +
  "plataforma y contacto relacionado con mi actividad como usuario de Radar Comercial Industria.";

function $V107e(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// Detecta si el correo escrito ya está registrado (ya aceptó
// datos antes) o si es un registro nuevo (debe aceptar ahora).
// Usa advisorEmailMapV92Get, ya existente en app.js.
// ------------------------------------------------------------
function esRegistroNuevoV107(email) {
  if (typeof advisorEmailMapV92Get !== "function") return false;
  const correo = String(email || "").trim().toLowerCase();
  if (!correo) return false;
  const map = advisorEmailMapV92Get();
  return !map[correo];
}

function actualizarVisibilidadConsentimientoV107() {
  const emailInput = $V107e("loginEmail");
  const wrap = $V107e("loginDatosPersonalesWrapper");
  if (!emailInput || !wrap) return;
  const esNuevo = esRegistroNuevoV107(emailInput.value);
  wrap.style.display = esNuevo ? "" : "none";
  if (!esNuevo) {
    const chk = $V107e("loginAceptoDatos");
    if (chk) chk.checked = false;
  }
}

// ------------------------------------------------------------
// Persistencia del consentimiento: Supabase (fuente auditable
// centralizada) + localStorage (respaldo, nunca bloquea el login
// si Supabase falla momentáneamente — mismo criterio de
// tolerancia a fallos usado en todo el proyecto).
// ------------------------------------------------------------
async function registrarConsentimientoV107(email, nombre, rol) {
  const registro = {
    email: String(email || "").trim().toLowerCase(),
    nombre: nombre || null,
    rol: rol || null,
    texto_aceptado: TEXTO_CONSENTIMIENTO_V107,
    origen: "login-app",
  };

  // Respaldo local — nunca falla, siempre se guarda primero.
  try {
    const historial = JSON.parse(localStorage.getItem("radarConsentimientosV107") || "[]");
    historial.push({ ...registro, aceptado_en: new Date().toISOString() });
    localStorage.setItem("radarConsentimientosV107", JSON.stringify(historial));
  } catch (e) { /* no bloquear el login por esto */ }

  // Registro centralizado en Supabase — ver 05_consentimientos_datos.sql.
  if (typeof supabaseClientV94 !== "undefined" && supabaseClientV94) {
    try {
      const { error } = await supabaseClientV94.from("consentimientos_datos").insert([registro]);
      if (error) {
        console.warn("[Radar-Consentimiento] No se pudo registrar en Supabase (¿falta crear la tabla? ver 05_consentimientos_datos.sql):", error.message);
      }
    } catch (e) {
      console.warn("[Radar-Consentimiento] Fallo de conexión registrando consentimiento:", e);
    }
  }
}

// ------------------------------------------------------------
// Envuelve attemptLoginV84: si el correo es un registro nuevo,
// exige el checkbox marcado ANTES de dejar pasar al login
// original. Si ya está registrado, no interviene en nada.
// ------------------------------------------------------------
if (typeof attemptLoginV84 === "function") {
  const _attemptLoginV84Original = attemptLoginV84;
  attemptLoginV84 = function () {
    const emailInput = $V107e("loginEmail");
    const errorBox = $V107e("loginError");
    const esNuevo = esRegistroNuevoV107(emailInput ? emailInput.value : "");

    if (esNuevo) {
      const chk = $V107e("loginAceptoDatos");
      if (!chk || !chk.checked) {
        if (errorBox) errorBox.textContent = "Debes autorizar el tratamiento de datos personales para continuar.";
        return;
      }
    }

    // Guarda cuántas entradas tenía el mapa ANTES de intentar login,
    // para saber después si attemptLoginV84Original efectivamente
    // creó un registro nuevo (solo entonces se guarda el consentimiento
    // — evita registrar un consentimiento si el login falló por otro
    // motivo, ej. teléfono inválido, dominio bloqueado, etc.).
    const emailAntes = emailInput ? emailInput.value.trim().toLowerCase() : "";
    const mapAntes = (typeof advisorEmailMapV92Get === "function") ? { ...advisorEmailMapV92Get() } : {};

    _attemptLoginV84Original();

    if (esNuevo && emailAntes && typeof advisorEmailMapV92Get === "function") {
      const mapDespues = advisorEmailMapV92Get();
      const seRegistroExitosamente = !mapAntes[emailAntes] && !!mapDespues[emailAntes];
      if (seRegistroExitosamente) {
        const entry = mapDespues[emailAntes];
        const rol = entry.role === "administrador" ? "administrador" : "asesor";
        const nombre = entry.advisor || null;
        registrarConsentimientoV107(emailAntes, nombre, rol);
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const emailInput = $V107e("loginEmail");
  if (emailInput) {
    emailInput.addEventListener("input", actualizarVisibilidadConsentimientoV107);
    emailInput.addEventListener("blur", actualizarVisibilidadConsentimientoV107);
  }

  // IMPORTANTE: app.js ya hizo loginBtn.addEventListener("click",
  // attemptLoginV84) en SU PROPIO DOMContentLoaded, capturando la
  // referencia de la función ORIGINAL (JS captura la función, no el
  // nombre — reasignar `attemptLoginV84 = ...` arriba no cambia a
  // qué función apunta ese listener ya registrado). Si aquí solo
  // agregáramos un segundo addEventListener, un clic dispararía
  // AMBOS listeners (login duplicado). Se clona el botón para
  // eliminar todos los listeners previos y se engancha uno solo,
  // limpio, apuntando a la función envuelta.
  const loginBtnOriginal = $V107e("loginBtn");
  if (loginBtnOriginal) {
    const loginBtnNuevo = loginBtnOriginal.cloneNode(true);
    loginBtnOriginal.replaceWith(loginBtnNuevo);
    loginBtnNuevo.addEventListener("click", () => attemptLoginV84());
  }

  // Mismo problema con el atajo de tecla Enter en loginEmail/loginPhone
  // (app.js línea ~868: el.addEventListener("keydown", ...) capturó
  // la función original). Se clonan también esos dos inputs para
  // limpiar sus listeners y reconectar Enter a la función envuelta.
  ["loginEmail", "loginPhone"].forEach(id => {
    const original = $V107e(id);
    if (!original) return;
    const nuevo = original.cloneNode(true);
    original.replaceWith(nuevo);
    nuevo.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attemptLoginV84();
    });
  });

  // El clonado de #loginEmail eliminó también el listener "input"/
  // "blur" que se enganchó arriba en este mismo bloque — hay que
  // volver a conectarlo sobre el input clonado.
  const emailInputFinal = $V107e("loginEmail");
  if (emailInputFinal) {
    emailInputFinal.addEventListener("input", actualizarVisibilidadConsentimientoV107);
    emailInputFinal.addEventListener("blur", actualizarVisibilidadConsentimientoV107);
  }
});
