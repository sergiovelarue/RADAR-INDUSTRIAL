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
//
// V15.12 - Pedido de Sergio (03-sep-2026), aprobado sobre mockup
// interactivo antes de aplicarlo: en móvil, "Actualizar datos" pasa
// de estar en el footer del menú a ser un botón flotante circular
// (40px) apilado justo ARRIBA del botón de soporte (56px), esquina
// inferior derecha — ver soporte-v1.css/.soporte-fab para la
// posición de referencia. El nombre del asesor + su cargo/rol +
// "Cerrar sesión" se mueven del footer del menú a la línea del
// encabezado superior (mismo renglón que el título de la pestaña y
// la versión), alineados a la derecha, sobre las pestañas — para
// liberar el footer del menú por completo en móvil.
//
// Técnica: no se duplican los IDs reales (sessionRoleLabel,
// logoutBtn, refreshDataBtn) porque app.js/mejoras-v1.js ya tienen
// listeners y lógica enganchados a esos IDs exactos — duplicar el ID
// rompería esa lógica o dejaría un elemto "fantasma" sin
// funcionalidad. En su lugar, se REPARENTA el nodo real
// (.session-info-v159, que contiene sessionRoleLabel y logoutBtn) y
// el botón real refreshDataBtn hacia sus nuevas ubicaciones en móvil,
// y de vuelta a sus ubicaciones originales en desktop — el mismo
// elemento del DOM, con toda su funcionalidad intacta, solo cambia de
// posición visual según el ancho de pantalla.
// ============================================================

function $tbm(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// 1) V15.4/V15.14 - Aplica la clase que oculta/ordena el pie de la
//    barra lateral en móvil.
//    V15.17 - desde este cambio, .sidebar-footer queda SIEMPRE sin
//    contenido visible (tanto refreshDataBtn como .session-info-v159
//    se reparentan fuera de él en todos los anchos de pantalla, ver
//    ajustarSessionSlotMovilV160 más abajo) — se le aplica la misma
//    clase de "oculto" también en desktop, para no dejar un
//    contenedor vacío con padding ocupando espacio en el pie del
//    menú lateral.
// ------------------------------------------------------------
function ajustarSidebarFooterMovilV154() {
  const footer = document.querySelector(".sidebar-footer");
  if (!footer) return;
  footer.classList.add("sidebar-footer-mobile-v154");
}

// ------------------------------------------------------------
// 1b) V15.14 - Reparenta sessionInfo (nombre+cargo+cerrar sesión) y
//     refreshDataBtn (Actualizar datos) a sus posiciones móviles:
//     - .session-info-v159 → dentro de #topbarSessionSlotV160, que en
//       móvil vive dentro de .brand-row-v161 (la misma línea que el
//       nombre de la app "Radar Comercial B2B" y su versión, ARRIBA
//       de las pestañas de navegación) — no dentro de .topbar, que es
//       la línea del título de la pestaña actual ("Hoja de Ruta del
//       Mes"). Son dos franjas distintas: V15.12/V15.13 las habían
//       confundido (corregido aquí tras evidencia real de Sergio).
//     - #refreshDataBtn → se reparenta a document.body. Es necesario
//       moverlo de contenedor de verdad (no solo darle
//       position:fixed vía clase): su padre real,
//       .sidebar-footer.sidebar-footer-mobile-v154, pasó a
//       display:none en móvil (ver styles.css) para que el footer no
//       deje un hueco vacío en el menú lateral — pero un hijo con
//       position:fixed dentro de un ancestro con display:none NO SE
//       RENDERIZA (mide 0x0), sin importar el position:fixed. Se
//       confirmó este comportamiento probando en vivo contra el sitio
//       real antes de escribir este fix. Moviéndolo a document.body
//       (fuera del árbol oculto) se resuelve de raíz.
//
// V15.17 - Pedido de Sergio (03-sep-2026), aprobado sobre mockup
// interactivo antes de aplicarlo: el mismo tratamiento de V15.12/14
// (botón flotante + bloque de sesión reubicado) se extiende ahora a
// ESCRITORIO (>1100px), no solo a móvil. Se agrega un tercer destino
// fijo, #sidebarSessionSlotV162 (ver index.html: vive dentro de
// .sidebar, debajo de .brand-row-v161 y arriba de <nav>) — el bloque
// de sesión ya no vuelve a .sidebar-footer en ningún ancho de
// pantalla; .sidebar-footer queda sin contenido visible siempre
// (oculto por CSS, ver styles.css). "Actualizar datos" pasa a ser
// flotante en desktop también, apilado sobre el botón de soporte,
// igual que en móvil.
// ------------------------------------------------------------
function ajustarSessionSlotMovilV160() {
  const sessionInfo = document.querySelector(".session-info-v159");
  const topbarSlot = $tbm("topbarSessionSlotV160");
  const sidebarSlot = $tbm("sidebarSessionSlotV162");
  const refreshBtn = $tbm("refreshDataBtn");
  if (!sessionInfo || !topbarSlot || !sidebarSlot) return;

  const esMovil = window.matchMedia("(max-width:1100px)").matches;
  const destinoSesion = esMovil ? topbarSlot : sidebarSlot;

  if (sessionInfo.parentElement !== destinoSesion) destinoSesion.appendChild(sessionInfo);
  if (refreshBtn && refreshBtn.parentElement !== document.body) document.body.appendChild(refreshBtn);
  if (refreshBtn) refreshBtn.classList.add("refresh-btn-floating-v160");
}

// ------------------------------------------------------------
// V15.14 - corrige V15.12/V15.13: la versión y el bloque de sesión
// debían quedar en la línea del NOMBRE DE LA APP ("Radar Comercial
// B2B", dentro de .brand), no en la línea del título de la pestaña
// actual ("Hoja de Ruta del Mes", dentro de .topbar) — eran dos
// franjas distintas y se habían confundido en V15.12/V15.13
// (confirmado con screenshot real de Sergio). Ya no hace falta
// duplicar/sincronizar la versión: el span #appVersionLabel real
// vive dentro de .brand, que es exactamente donde ahora se necesita.
// Se retiró la función sincronizarVersionTopbarV160 (ya no aplica) y
// el elemento #appVersionLabelTopbarV160 que sincronizaba.
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
    // V15.12 - nombre y cargo en líneas separadas (aprobado sobre
    // mockup): se arma con innerHTML en vez de textContent para
    // poder partir en dos renglones dentro del mismo <small>.
    roleLabel.innerHTML = `<span class="session-nombre-v160">${nombreCorto}</span><span class="session-cargo-v160">${rolCorto}</span>`;
  };
}

// ------------------------------------------------------------
// 3) Cableado: aplicar al cargar, al cambiar de perfil de usuario, y
//    al redimensionar/rotar el celular (con debounce simple).
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  ajustarSidebarFooterMovilV154();
  ajustarSessionSlotMovilV160();
  if (typeof updateSessionRoleLabelV93 === "function") updateSessionRoleLabelV93();

  if (typeof applyUserProfileV84 === "function") {
    const _applyUserProfileOriginalV154 = applyUserProfileV84;
    applyUserProfileV84 = function (...args) {
      const resultado = _applyUserProfileOriginalV154.apply(this, args);
      ajustarSidebarFooterMovilV154();
      ajustarSessionSlotMovilV160();
      return resultado;
    };
  }

  let resizeTimeoutV154 = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeoutV154);
    resizeTimeoutV154 = setTimeout(() => {
      ajustarSidebarFooterMovilV154();
      ajustarSessionSlotMovilV160();
    }, 150);
  });
});
