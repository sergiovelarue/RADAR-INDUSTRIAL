// ============================================================
// V107 — QR y link compartible para la landing de prospección
// ------------------------------------------------------------
// Genera un QR (client-side, sin backend) y un link con
// querystring hacia landing.html. Se integra en la vista
// "prospeccionView" ya existente (ver botón #leadShareBtn en el
// HTML de integración) mediante un panel/modal nuevo.
//
// Requiere:
// - qrcode.min.js (CDN, cargado en index.html) para dibujar el QR.
// - La constante LANDING_URL_V107 apuntando a la URL real donde
//   se publique landing.html (ajustar antes de desplegar).
// ============================================================

const LANDING_URL_V107 = "https://radar-com-conaccion-ind242f09.netlify.app/landing.html";

function $V107b(id) { return document.getElementById(id); }

// Construye la URL final con querystring según origen/asesor elegidos.
function construirLinkProspeccionV107(origen, nombreAsesor) {
  const url = new URL(LANDING_URL_V107);
  if (origen) url.searchParams.set("origen", origen);
  if (nombreAsesor) url.searchParams.set("asesor", nombreAsesor);
  return url.toString();
}

// Dibuja el QR dentro de #qrProspeccionCanvas usando la librería
// qrcode.min.js (window.QRCode). Si la librería no cargó, degrada
// a solo mostrar el link (nunca rompe la vista).
function renderQrProspeccionV107(link) {
  const cont = $V107b("qrProspeccionCanvas");
  if (!cont) return;
  cont.innerHTML = "";
  if (typeof QRCode === "undefined") {
    cont.innerHTML = `<p style="font-size:13px;color:#6B6B6B">No se pudo cargar el generador de QR. Usa el link de abajo.</p>`;
    return;
  }
  new QRCode(cont, {
    text: link,
    width: 220,
    height: 220,
    colorDark: "#01153F",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function actualizarPanelQrV107() {
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const selOrigen = $V107b("qrOrigenSelect");
  const selAsesor = $V107b("qrAsesorSelect");
  const linkInput = $V107b("qrLinkOutput");

  const origen = selOrigen ? selOrigen.value : "Web";
  let nombreAsesor = "";
  if (esAdmin && selAsesor) {
    nombreAsesor = selAsesor.value === "__general__" ? "" : selAsesor.value;
  } else if (!esAdmin && typeof currentUserV84 !== "undefined" && currentUserV84) {
    nombreAsesor = currentUserV84.advisor || "";
  }

  const link = construirLinkProspeccionV107(origen, nombreAsesor);
  if (linkInput) linkInput.value = link;
  renderQrProspeccionV107(link);
}

function poblarSelectAsesorQrV107() {
  const selAsesor = $V107b("qrAsesorSelect");
  if (!selAsesor) return;
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  const wrap = $V107b("qrAsesorSelectWrap");

  if (!esAdmin) {
    if (wrap) wrap.style.display = "none";
    return;
  }
  if (wrap) wrap.style.display = "";
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  selAsesor.innerHTML = `<option value="__general__">Link general (sin asesor específico)</option>` +
    asesores.map(a => `<option value="${a}">${a}</option>`).join("");
}

function abrirPanelQrProspeccionV107() {
  const panel = $V107b("qrProspeccionPanel");
  if (!panel) return;
  panel.classList.remove("hidden-view");
  poblarSelectAsesorQrV107();
  actualizarPanelQrV107();
}

function cerrarPanelQrProspeccionV107() {
  const panel = $V107b("qrProspeccionPanel");
  if (panel) panel.classList.add("hidden-view");
}

function copiarLinkProspeccionV107() {
  const linkInput = $V107b("qrLinkOutput");
  if (!linkInput || !linkInput.value) return;
  navigator.clipboard.writeText(linkInput.value).then(() => {
    const btn = $V107b("qrCopiarBtn");
    if (btn) {
      const textoOriginal = btn.textContent;
      btn.textContent = "¡Copiado!";
      setTimeout(() => { btn.textContent = textoOriginal; }, 1800);
    }
  }).catch(() => {
    linkInput.select();
    document.execCommand("copy");
  });
}

// Descarga el QR como imagen PNG (recorre el <canvas> o <img> que
// genera qrcode.min.js dentro de #qrProspeccionCanvas).
function descargarQrProspeccionV107() {
  const cont = $V107b("qrProspeccionCanvas");
  if (!cont) return;
  const canvas = cont.querySelector("canvas");
  const img = cont.querySelector("img");
  const dataUrl = canvas ? canvas.toDataURL("image/png") : (img ? img.src : null);
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "radar-qr-prospeccion.png";
  a.click();
}

document.addEventListener("DOMContentLoaded", () => {
  if ($V107b("leadShareBtn")) $V107b("leadShareBtn").addEventListener("click", abrirPanelQrProspeccionV107);
  if ($V107b("qrPanelCloseBtn")) $V107b("qrPanelCloseBtn").addEventListener("click", cerrarPanelQrProspeccionV107);
  if ($V107b("qrOrigenSelect")) $V107b("qrOrigenSelect").addEventListener("change", actualizarPanelQrV107);
  if ($V107b("qrAsesorSelect")) $V107b("qrAsesorSelect").addEventListener("change", actualizarPanelQrV107);
  if ($V107b("qrCopiarBtn")) $V107b("qrCopiarBtn").addEventListener("click", copiarLinkProspeccionV107);
  if ($V107b("qrDescargarBtn")) $V107b("qrDescargarBtn").addEventListener("click", descargarQrProspeccionV107);
});
