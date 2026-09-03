// ============================================================
// V154 — Estabilidad del encabezado en celular/tablet
// ------------------------------------------------------------
// Este archivo estaba referenciado en index.html (<script
// src="topbar-movil-v154.js">) y su clase objetivo
// (.sidebar-footer-mobile-v154) ya existía documentada en
// styles.css desde antes, pero el archivo en sí nunca se subió al
// proyecto — quedaba como un enlace roto (404 silencioso). Se
// recrea aquí siguiendo exactamente la intención ya documentada en
// styles.css: en pantallas ≤1100px, el pie de la barra lateral
// ("Actualizar datos" / nombre de sesión / "Cerrar sesión") deja de
// competir por espacio con el encabezado fijo (que solo debe tener
// logo + pestañas) y pasa a ser una fila normal debajo, que se
// desplaza con el resto de la página.
//
// Pedido de Sergio (03-sep-2026), con evidencia de screenshot real:
//   1) el nav de pestañas se corta (no se ve completo ni es
//      scrolleable de forma clara) — resuelto por styles.css
//      (@media max-width:1100px ya lo hace scrolleable), pero
//      competía con un parche CSS antiguo embebido en index.html
//      (V107, retirado en este mismo cambio).
//   2) el nombre de sesión se veía duplicado: "HERCILIA MUÑOZ ·
//      Asesor · HERCILIA MUÑOZ" — porque updateSessionRoleLabelV93
//      (app.js) arma el texto como "{name} · Asesor · {advisor}", y
//      para un asesor ambos valores son el mismo nombre. Se envuelve
//      esa función (patrón wrapper del proyecto) para mostrar solo
//      el primer nombre, sin duplicar.
//   3) se pidió evaluar si "Actualizar datos" es necesario en el
//      encabezado: sí cumple una función real (refresca datos de
//      Supabase sin recargar toda la página — ver
//      actualizarDatosManualV98 en mejoras-v1.js), así que no se
//      elimina, pero se saca del bloque fijo superior en móvil para
//      que no le quite espacio al nav ni al nombre de sesión.
// ============================================================

function $tbm(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// 1) Aplica la clase ya prevista en styles.css al pie de la barra
//    lateral, para que dependiendo del ancho de pantalla actual
//    tenga el comportamiento correcto (fijo en desktop, fila normal
//    debajo del encabezado en móvil/tablet).
// ------------------------------------------------------------
function ajustarSidebarFooterMovilV154() {
  const footer = document.querySelector(".sidebar-footer");
  if (!footer) return;
  const esMovil = window.matchMedia("(max-width:1100px)").matches;
  footer.classList.toggle("sidebar-footer-mobile-v154", esMovil);
}

// ------------------------------------------------------------
// 2) Nombre de sesión simplificado: solo el primer nombre, sin
//    duplicar "Nombre · Rol · Nombre" cuando nombre y asesor
//    coinciden (siempre coinciden para un Asesor).
// ------------------------------------------------------------
function primerNombreV154(nombreCompleto) {
  const limpio = String(nombreCompleto || "").trim();
  if (!limpio) return "";
  return limpio.split(/\s+/)[0];
}

if (typeof updateSessionRoleLabelV93 === "function") {
  const _updateSessionRoleLabelOriginalV154 = updateSessionRoleLabelV93;
  updateSessionRoleLabelV93 = function () {
    const roleLabel = $tbm("sessionRoleLabel");
    if (!roleLabel || typeof currentUserV84 === "undefined" || !currentUserV84) {
      return _updateSessionRoleLabelOriginalV154();
    }
    // NOTA: el texto de rol ("Super Administrador"/"Administrador"/
    // "Asesor") se deja exactamente como lo define app.js
    // (updateSessionRoleLabelV93 original) — Sergio pidió (03-sep-2026)
    // dejar pendiente para un próximo cambio el renombrar "Super
    // Administrador" a "Administrador" en textos visibles, así que
    // aquí NO se toca esa palabra, solo se acorta el nombre propio.
    const nombreCorto = primerNombreV154(currentUserV84.name);
    const rolCorto = currentUserV84.tier === "superadmin" ? "Super Administrador" :
      (currentUserV84.profile === "admin" ? "Administrador" : "Asesor");
    roleLabel.textContent = `${nombreCorto} · ${rolCorto}`;
  };
}

// ------------------------------------------------------------
// 3) Cableado: aplicar al cargar, al cambiar de perfil de usuario, y
//    al redimensionar/rotar el celular (con debounce simple).
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  ajustarSidebarFooterMovilV154();
  if (typeof updateSessionRoleLabelV93 === "function") updateSessionRoleLabelV93();

  if (typeof applyUserProfileV84 === "function") {
    const _applyUserProfileOriginalV154 = applyUserProfileV84;
    applyUserProfileV84 = function (...args) {
      const resultado = _applyUserProfileOriginalV154.apply(this, args);
      ajustarSidebarFooterMovilV154();
      return resultado;
    };
  }

  let resizeTimeoutV154 = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeoutV154);
    resizeTimeoutV154 = setTimeout(ajustarSidebarFooterMovilV154, 150);
  });
});
