// ============================================================
// V2 Metas — Ajuste de meta por asesor, valor absoluto (Radar
// Comercial B2B)
// ------------------------------------------------------------
// Fase 1 de la mejora "Ajuste de metas por asesor" (2026-08-19).
// Reemplaza el panel de Etapa 5 (ajuste %/monto sobre una meta
// base) por una tabla directa: un renglón por asesor con su Meta
// Inicial (la meta base definida en el sistema, sin ajustes) y el
// acumulado del año, más un campo para escribir la Nueva Meta del
// mes seleccionado como VALOR ABSOLUTO en pesos — no un porcentaje.
//
// Importante — alcance real de esta funcionalidad:
// - NO modifica metaAsesor/metaSugerida por cliente. El sistema de
//   metas por cliente (editable uno por uno desde la ficha del
//   cliente) sigue funcionando exactamente igual que hoy. La "Meta
//   Inicial" que se muestra aquí es la suma de esas metas por
//   cliente — es de solo lectura en este panel.
// - Guarda un valor de meta ajustada por asesor/mes en Supabase
//   (ajustes_meta_asesor.meta_ajustada), junto con una foto de la
//   Meta Inicial en el momento de guardar (meta_inicial_snapshot),
//   que sirve de ancla estable para calcular el % de cambio.
// - El mes a ajustar puede ser el mes actual o cualquier mes que
//   falte del año en curso (no meses ya cerrados de años previos).
// - Si el valor nuevo se aleja más del 20% de la Meta Inicial, pide
//   confirmación en una ventana emergente antes de guardar.
//
// Requiere las funciones SECURITY DEFINER de la migración
// etapa6_meta_absoluta_ajuste_asesor_v1: listar_ajustes_meta_v1,
// guardar_ajuste_meta_v1 (firma nueva, valor absoluto),
// eliminar_ajuste_meta_v1, consultar_mi_ajuste_meta_v1,
// marcar_ajuste_meta_visto_v1.
// ============================================================

const METAS_MESES_V1 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const METAS_UMBRAL_CONFIRMACION_V2 = 0.20; // 20%

function metasAjusteEsAdminV1() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

function metasAjusteCredencialesV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "" };
}

function metasAjusteAnioV1() {
  return 2026;
}

// Mes actual + los meses que faltan del año en curso (no incluye
// meses ya pasados). Usa el mismo criterio que el resto de "Metas y
// presupuestos" (availableMonthsV812: meses con datos operativos
// cargados; su último elemento es el mes actual/más reciente).
function metasMesesEditablesV2() {
  const disponibles = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  const idxActual = disponibles.length ? METAS_MESES_V1.indexOf(disponibles[disponibles.length - 1]) : -1;
  if (idxActual < 0) return [];
  return METAS_MESES_V1.slice(idxActual);
}

function metasMesActualV2() {
  const meses = metasMesesEditablesV2();
  return meses.length ? meses[0] : null;
}

// Meta Inicial de un asesor: suma de la meta actual (metaAsesor ||
// metaSugerida) de todos sus clientes no bloqueados. Es la meta tal
// como está definida hoy en el sistema/cargada por el administrador,
// sin ningún ajuste de este panel.
function metasBaseAsesorV1(nombreAsesor) {
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    return c.asesorAsignado === nombreAsesor;
  });
  return clientes.reduce((s, c) => s + (typeof goal === "function" ? goal(c) : 0), 0);
}

// Acumulado del año en curso para un asesor: venta real de los
// meses ya transcurridos (mismo criterio que resumenMetasAsesorV106
// en mejoras-v1.js, pero solo la parte "real", sin proyección).
function metasAcumuladoAnioAsesorV2(nombreAsesor) {
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    return c.asesorAsignado === nombreAsesor;
  });
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  return clientes.reduce((s, c) => s + transcurridos.reduce((s2, m) => s2 + (typeof ventaMesClienteV106 === "function" ? ventaMesClienteV106(c, 2026, m) : 0), 0), 0);
}

let metasAjustesCacheV2 = [];

// ============================================================
// Fase 6 (2026-08-20) — Carga masiva de meta nueva por Excel.
// ------------------------------------------------------------
// Cada carga registra una nueva versión (Forecast N) para cada
// asesor/mes que traiga el archivo con datos (columnas en blanco/0 no
// tocan la versión existente de ese mes — carga parcial permitida).
// La primera vez que se guarda algo para un asesor/mes (por esta vía
// o por el ajuste manual de arriba) queda marcada version_tipo=inicial
// automáticamente por guardar_ajuste_meta_v1 (ver migración Supabase).
// Solo Administrador y Super Administrador (mismo permiso que el
// ajuste manual — es_admin_v1 en el backend).
// ============================================================

function metasCargaExcelInsertarPanelV1() {
  if ($("metasCargaExcelPanel")) return;
  const referencia = $("metasAjustePanel") || document.querySelector("#metasView .chart-grid") || $("metasView");
  if (!referencia || !referencia.parentNode) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "metasCargaExcelPanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Cargar meta nueva por Excel (masivo)</h3>
        <p>Administrador y Super Administrador. Sube un archivo con la meta de cada asesor por mes. Cada carga registra una nueva versión de meta (Meta Inicial la primera vez para cada asesor/mes; Forecast 1, 2, 3... las siguientes). Solo se actualizan los meses que traiga el archivo con un valor — los demás meses no se tocan.</p>
      </div>
    </div>
    <div class="upload-grid">
      <article>
        <h4>Meta nueva por asesor y mes</h4>
        <input type="file" id="metasCargaExcelFile" accept=".xlsx,.xls,.csv"/>
      </article>
    </div>
    <div class="actions">
      <button class="btn ghost" id="metasCargaExcelPlantillaBtn">Descargar plantilla vacía</button>
      <button class="btn ghost" id="metasCargaExcelValidarBtn">Validar archivo</button>
      <button class="btn" id="metasCargaExcelAplicarBtn">Cargar meta nueva</button>
    </div>
    <div class="update-result" id="metasCargaExcelResult"><strong>Estado:</strong> pendiente de carga.</div>
  `;
  referencia.parentNode.insertBefore(panel, referencia);
}

// Genera y descarga la plantilla vacía: una fila por asesor, columnas
// Enero-Diciembre, para que el administrador la diligencie y la vuelva
// a subir. Usa la librería XLSX (SheetJS) ya cargada en index.html.
function metasCargaExcelDescargarPlantillaV1() {
  if (typeof XLSX === "undefined") {
    alert("No se pudo cargar la librería de Excel (XLSX). Verifica tu conexión a internet e intenta de nuevo.");
    return;
  }
  const meses = METAS_MESES_V1;
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const filas = [["Asesor", ...meses]];
  asesores.forEach(a => filas.push([a, ...meses.map(() => "")]));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws["!cols"] = [{ wch: 26 }, ...meses.map(() => ({ wch: 12 }))];
  XLSX.utils.book_append_sheet(wb, ws, "Meta nueva");
  XLSX.writeFile(wb, "radar_plantilla_meta_nueva.xlsx");
}

// Lee el archivo cargado y devuelve { filas: [{asesor, valores:{mes:valor}}], nombreArchivo }.
// Solo cuenta como "valor a cargar" una celda numérica > 0 o un texto
// numérico; celdas vacías, "0" explícito o no numéricas se ignoran
// (carga parcial: ese mes no se toca para ese asesor).
async function metasCargaExcelLeerArchivoV1() {
  const input = $("metasCargaExcelFile");
  if (!input || !input.files.length) throw new Error("Selecciona un archivo primero.");
  const file = input.files[0];
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { defval: "" });

  const asesoresValidos = new Set((DATA.meta && DATA.meta.asesores) || []);
  const meses = METAS_MESES_V1;
  const filas = [];
  const asesoresNoReconocidos = [];

  rows.forEach(row => {
    const keys = Object.keys(row);
    const asesorKey = keys.find(k => String(k).trim().toLowerCase() === "asesor") || keys[0];
    const asesor = String(row[asesorKey] || "").trim().toUpperCase();
    if (!asesor) return;

    const valores = {};
    let algunValor = false;
    meses.forEach(m => {
      const key = keys.find(k => String(k).trim().toLowerCase() === m.toLowerCase());
      if (!key) return;
      const raw = row[key];
      if (raw === "" || raw === null || raw === undefined) return;
      const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n) || n <= 0) return;
      valores[m] = n;
      algunValor = true;
    });

    if (!algunValor) return;
    if (!asesoresValidos.has(asesor)) { asesoresNoReconocidos.push(asesor); return; }
    filas.push({ asesor, valores });
  });

  return { filas, nombreArchivo: file.name, asesoresNoReconocidos: [...new Set(asesoresNoReconocidos)] };
}

async function metasCargaExcelValidarV1() {
  const r = $("metasCargaExcelResult");
  if (!r) return;
  try {
    const { filas, nombreArchivo, asesoresNoReconocidos } = await metasCargaExcelLeerArchivoV1();
    const totalMeses = filas.reduce((s, f) => s + Object.keys(f.valores).length, 0);
    let aviso = "";
    if (asesoresNoReconocidos.length) {
      aviso = `<p style="color:#b45309"><strong>Atención:</strong> ${asesoresNoReconocidos.length} nombre(s) de asesor en el archivo no coinciden con ningún asesor registrado en el sistema y serán IGNORADOS: ${esc(asesoresNoReconocidos.join(", "))}. Revisa que el nombre esté escrito exactamente igual.</p>`;
    }
    r.className = "update-result " + (filas.length ? "ok" : "error");
    r.innerHTML = `<strong>Validación:</strong><div class="summary-grid"><article><span>Asesores con datos</span><strong>${filas.length}</strong></article><article><span>Meses a actualizar (total)</span><strong>${totalMeses}</strong></article></div><p>${esc(nombreArchivo)}</p>${aviso}${filas.length ? "" : "<p>No se encontraron valores válidos para cargar. Revisa el archivo.</p>"}`;
  } catch (err) {
    r.className = "update-result error";
    r.innerHTML = `<strong>Error:</strong> ${esc(err.message)}`;
  }
}

async function metasCargaExcelAplicarV1() {
  const r = $("metasCargaExcelResult");
  if (!r) return;
  const cred = metasAjusteCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") {
    r.className = "update-result error";
    r.innerHTML = "<strong>Error:</strong> no se pudo identificar el usuario o la conexión a la base de datos.";
    return;
  }

  let filas, nombreArchivo;
  try {
    ({ filas, nombreArchivo } = await metasCargaExcelLeerArchivoV1());
  } catch (err) {
    r.className = "update-result error";
    r.innerHTML = `<strong>Error:</strong> ${esc(err.message)}`;
    return;
  }

  if (!filas.length) {
    r.className = "update-result error";
    r.innerHTML = "<strong>Error:</strong> no hay valores válidos para cargar en este archivo.";
    return;
  }

  const totalOperaciones = filas.reduce((s, f) => s + Object.keys(f.valores).length, 0);
  const confirmado = confirm(`Vas a cargar meta nueva para ${filas.length} asesor(es), ${totalOperaciones} mes(es) en total. Cada mes con valor queda registrado como una nueva versión (Meta Inicial la primera vez, Forecast N las siguientes). ¿Confirmas?`);
  if (!confirmado) return;

  r.className = "update-result";
  r.innerHTML = "<strong>Cargando…</strong> por favor espera, esto puede tardar unos segundos.";

  const anio = metasAjusteAnioV1();
  let exitosos = 0;
  const errores = [];

  for (const fila of filas) {
    const metaInicial = metasBaseAsesorV1(fila.asesor);
    for (const mes of Object.keys(fila.valores)) {
      try {
        const { error } = await supabaseClientV94.rpc("guardar_ajuste_meta_v1", {
          p_admin_email: cred.email,
          p_admin_telefono: cred.telefono || null,
          p_asesor: fila.asesor,
          p_anio: anio,
          p_mes: mes,
          p_meta_ajustada: fila.valores[mes],
          p_meta_inicial_snapshot: metaInicial,
          p_origen: "carga_excel"
        });
        if (error) { errores.push(`${fila.asesor} / ${mes}: ${error.message}`); }
        else { exitosos++; }
      } catch (e) {
        errores.push(`${fila.asesor} / ${mes}: fallo de conexión (${e.message})`);
      }
    }
  }

  r.className = "update-result " + (errores.length ? "error" : "ok");
  r.innerHTML = `<strong>Carga aplicada:</strong> ${exitosos} versión(es) de meta guardadas correctamente.` +
    (errores.length ? `<p style="color:#b91c1c">${errores.length} error(es):<br>${errores.map(e => esc(e)).join("<br>")}</p>` : "") +
    `<p>${esc(nombreArchivo)}</p>`;

  await metasAjusteCargarV1();
}

function metasInsertarPanelV1() {
  if ($("metasAjustePanel")) return;
  // V1 Mejoras (2026-08-19): metasConfigPanel se eliminó (su contenido
  // pasó a ser una nota junto al gráfico de venta mensual comparada).
  // Ahora este panel se inserta al inicio de metasView, antes de la
  // sección de gráficos.
  const referencia = document.querySelector("#metasView .chart-grid") || $("metasView");
  if (!referencia || !referencia.parentNode) return;

  const panel = document.createElement("section");
  panel.className = "admin-panel";
  panel.id = "metasAjustePanel";
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h3>Ajuste de metas por asesor</h3>
        <p>Administrador y Super Administrador. Escribe la nueva meta del mes para cada asesor, en pesos. La Meta Inicial (definida en el sistema) no se modifica ni se sobrescribe — el ajuste queda registrado aparte y pasa a ser la Meta Ajustada (la meta vigente que ve el asesor) para el mes elegido.</p>
      </div>
      <div class="metas-ajuste-mes-selector">
        <label>Mes a ajustar
          <select id="metasAjusteMesSelect"></select>
        </label>
      </div>
    </div>
    <div class="table-scroll">
      <table class="sistema-admin-table" id="metasAjusteTabla">
        <thead>
          <tr>
            <th>Asesor</th>
            <th>Meta Inicial (mes)</th>
            <th>Acumulado año</th>
            <th>Meta Ajustada (mes)</th>
            <th>Nueva meta del mes</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="metasAjusteTablaBody"><tr><td colspan="6">Cargando…</td></tr></tbody>
      </table>
    </div>
    <div id="metasAjusteMsg" class="sistema-msg"></div>
  `;
  referencia.parentNode.insertBefore(panel, referencia);
}

function metasAjusteLlenarSelectMesV2() {
  const sel = $("metasAjusteMesSelect");
  if (!sel) return;
  const meses = metasMesesEditablesV2();
  const anio = metasAjusteAnioV1();
  const actual = sel.value;
  if (!meses.length) {
    sel.innerHTML = '<option value="">Sin meses disponibles</option>';
    return;
  }
  sel.innerHTML = meses.map((m, i) => `<option value="${esc(m)}">${esc(m)} ${anio}${i === 0 ? " (mes actual)" : ""}</option>`).join("");
  if (actual && meses.includes(actual)) sel.value = actual;
}

async function metasAjusteCargarV1() {
  const cred = metasAjusteCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") return;
  try {
    const { data, error } = await supabaseClientV94.rpc("listar_ajustes_meta_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) { console.error("[Radar-Metas] Error listando ajustes:", error); return; }
    metasAjustesCacheV2 = data || [];
    metasAjusteRenderTablaV1();
    // Fase 2 (2026-08-19): el resumen "Metas y presupuestos" (tabla y
    // gráficas metasChart/metasMensualChart de mejoras-v1.js) también
    // usa metasAjustesCacheV2 para calcular "Meta Ajustada". Como esa
    // vista se dibuja ANTES de que esta carga async termine (ver
    // showMetasViewV106 más abajo), se vuelve a renderizar aquí para
    // que quede con el dato correcto, sin necesidad de que el usuario
    // recargue la página o cambie de pestaña.
    if (typeof renderMetasViewV106 === "function" && $("metasView") && !$("metasView").classList.contains("hidden-view")) {
      renderMetasViewV106();
    }
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión listando ajustes:", e);
  }
}

function metasAjusteRenderTablaV1() {
  const body = $("metasAjusteTablaBody");
  if (!body) return;

  try {
    // Salvaguarda: si por algún motivo el selector de mes quedó sin
    // opciones (carrera de inicialización, u otra capa reordenó el
    // panel), se rellena aquí también antes de leer su valor — evita
    // que la tabla quede sin poder determinar el mes.
    const selMes = $("metasAjusteMesSelect");
    if (selMes && !selMes.options.length) metasAjusteLlenarSelectMesV2();

    const anio = metasAjusteAnioV1();
    const mes = $("metasAjusteMesSelect")?.value || metasMesActualV2();
    if (!mes) { body.innerHTML = '<tr><td colspan="6">No quedan meses disponibles en el año para ajustar.</td></tr>'; return; }

    const asesores = ((DATA.meta && DATA.meta.asesores) || []).slice().sort();
    if (!asesores.length) { body.innerHTML = '<tr><td colspan="6">No hay asesores registrados.</td></tr>'; return; }

    // Cada asesor se renderiza de forma aislada: si un dato puntual de
    // un asesor causa un error de cálculo, no debe tumbar la tabla
    // completa (antes, un error dentro del .map() dejaba body.innerHTML
    // sin asignar y la tabla se veía en blanco sin ningún aviso).
    const filas = asesores.map(asesor => {
      try {
        const metaInicial = metasBaseAsesorV1(asesor);
        const acumuladoAnio = metasAcumuladoAnioAsesorV2(asesor);
        const ajuste = metasAjustesCacheV2.find(a => a.asesor === asesor && a.anio === anio && a.mes === mes);
        const metaVigente = ajuste ? Number(ajuste.meta_ajustada) : metaInicial;
        return `<tr data-asesor="${esc(asesor)}">
          <td data-label="Asesor">${esc(asesor)}</td>
          <td data-label="Meta Inicial (mes)">${money(metaInicial)}</td>
          <td data-label="Acumulado año"><strong class="metas-acumulado-valor">${money(acumuladoAnio)}</strong></td>
          <td data-label="Meta Ajustada (mes)">${money(metaVigente)}${ajuste ? ' <span class="metas-badge-ajustada" title="Meta ajustada manualmente">Ajustada</span>' : ""}</td>
          <td data-label="Nueva meta del mes">
            <input type="number" class="metas-nueva-meta-input" placeholder="${Number(metaVigente).toFixed(0)}" step="any" min="0"/>
            <div class="metas-nueva-meta-preview" hidden></div>
          </td>
          <td data-label="Acciones">
            <button class="btn ghost small-btn" data-accion="guardar-meta-asesor" data-asesor="${esc(asesor)}">Guardar</button>
            ${ajuste ? `<button class="btn ghost small-btn" data-accion="quitar-meta-asesor" data-asesor="${esc(asesor)}">Quitar ajuste</button>` : ""}
            <button class="btn ghost small-btn" data-accion="ver-historial-meta-asesor" data-asesor="${esc(asesor)}">Ver historial</button>
          </td>
        </tr>`;
      } catch (eFila) {
        console.error(`[Radar-Metas] Error calculando la fila de "${asesor}":`, eFila);
        return `<tr data-asesor="${esc(asesor)}"><td colspan="6">No se pudo calcular la información de ${esc(asesor)} (ver consola).</td></tr>`;
      }
    });

    body.innerHTML = filas.join("");
  } catch (e) {
    console.error("[Radar-Metas] Error renderizando la tabla de ajuste de metas:", e);
    body.innerHTML = `<tr><td colspan="6">Ocurrió un error mostrando la tabla. Revisa la consola del navegador (F12) y comparte el mensaje de error para poder corregirlo. Detalle: ${esc(String(e && e.message || e))}</td></tr>`;
  }
}

// Vista previa en vivo: mientras el admin escribe en "Nueva meta del
// mes", se muestra debajo/al lado (según ancho de pantalla, vía CSS)
// un texto pequeño y claro con el valor nuevo, antes de guardar. El
// valor grande en negrilla (Acumulado año) no cambia hasta guardar.
function metasNuevaMetaPreviewV2(input) {
  const fila = input.closest("tr");
  if (!fila) return;
  const preview = fila.querySelector(".metas-nueva-meta-preview");
  if (!preview) return;
  const valor = input.value.trim();
  if (!valor || isNaN(Number(valor))) { preview.hidden = true; preview.textContent = ""; return; }
  preview.hidden = false;
  preview.textContent = `Nueva meta: ${money(Number(valor))}`;
}

// Efecto visual al confirmar el guardado: el valor de "Acumulado
// año" (que también refleja la meta vigente reconocida por el
// sistema) se infla suavemente y vuelve a su tamaño normal, con un
// ligero temblor de la letra al final. Se aplica vía clase CSS con
// animación (ver metas-v1.css) y se remueve sola al terminar.
function metasAnimarConfirmacionV2(fila) {
  const valorEl = fila?.querySelector(".metas-acumulado-valor");
  if (!valorEl) return;
  valorEl.classList.remove("metas-anim-confirmar");
  // Forzar reflow para poder re-disparar la animación si se guarda
  // dos veces seguidas.
  void valorEl.offsetWidth;
  valorEl.classList.add("metas-anim-confirmar");
  valorEl.addEventListener("animationend", () => valorEl.classList.remove("metas-anim-confirmar"), { once: true });
}

async function metasAjusteGuardarAsesorV2(asesor) {
  const msg = $("metasAjusteMsg");
  const cred = metasAjusteCredencialesV1();
  if (!asesor || typeof supabaseClientV94 === "undefined") return;

  const fila = document.querySelector(`#metasAjusteTablaBody tr[data-asesor="${CSS.escape(asesor)}"]`);
  if (!fila) return;
  const input = fila.querySelector(".metas-nueva-meta-input");
  const valorTexto = input?.value.trim();
  if (!valorTexto || isNaN(Number(valorTexto))) {
    if (msg) { msg.textContent = "Ingresa un valor numérico para la nueva meta."; msg.className = "sistema-msg sistema-msg-error"; }
    return;
  }
  const nuevaMeta = Number(valorTexto);
  if (nuevaMeta < 0) {
    if (msg) { msg.textContent = "La meta no puede ser negativa."; msg.className = "sistema-msg sistema-msg-error"; }
    return;
  }

  const metaInicial = metasBaseAsesorV1(asesor);
  const cambioAbsoluto = metaInicial > 0 ? Math.abs(nuevaMeta - metaInicial) / metaInicial : (nuevaMeta > 0 ? 1 : 0);

  if (cambioAbsoluto > METAS_UMBRAL_CONFIRMACION_V2) {
    const pctCambio = Math.round(cambioAbsoluto * 100);
    const confirmado = confirm(
      `La nueva meta de ${asesor} (${money(nuevaMeta)}) cambia ${pctCambio}% respecto a su Meta Inicial (${money(metaInicial)}).\n\n` +
      `Por ser un cambio mayor al 20%, confirma que deseas guardarlo.`
    );
    if (!confirmado) return;
  }

  const mes = $("metasAjusteMesSelect")?.value || metasMesActualV2();
  if (!mes) return;

  try {
    const { error } = await supabaseClientV94.rpc("guardar_ajuste_meta_v1", {
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null,
      p_asesor: asesor,
      p_anio: metasAjusteAnioV1(),
      p_mes: mes,
      p_meta_ajustada: nuevaMeta,
      p_meta_inicial_snapshot: metaInicial
    });
    if (error) {
      console.error("[Radar-Metas] Error guardando meta:", error);
      if (msg) { msg.textContent = "No se pudo guardar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Meta de ${asesor} actualizada para ${mes}: ${money(nuevaMeta)}.`; msg.className = "sistema-msg sistema-msg-ok"; }
    metasAnimarConfirmacionV2(fila);
    await metasAjusteCargarV1();
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión guardando meta:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

async function metasAjusteQuitarAsesorV2(asesor) {
  const msg = $("metasAjusteMsg");
  const cred = metasAjusteCredencialesV1();
  if (!asesor || typeof supabaseClientV94 === "undefined") return;
  const mes = $("metasAjusteMesSelect")?.value || metasMesActualV2();
  if (!mes) return;
  if (!confirm(`¿Quitar el ajuste de ${asesor} para ${mes}? Volverá a usar la Meta Inicial sin ajuste.`)) return;

  try {
    const { error } = await supabaseClientV94.rpc("eliminar_ajuste_meta_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null,
      p_asesor: asesor, p_anio: metasAjusteAnioV1(), p_mes: mes
    });
    if (error) {
      console.error("[Radar-Metas] Error eliminando ajuste:", error);
      if (msg) { msg.textContent = "No se pudo quitar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Ajuste eliminado para ${asesor} · ${mes}.`; msg.className = "sistema-msg sistema-msg-ok"; }
    await metasAjusteCargarV1();
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión eliminando ajuste:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

// Muestra el historial completo de versiones (Meta Inicial → Forecast
// 1, 2, 3...) de un asesor en el mes seleccionado, usando la función
// historial_ajuste_meta_v1 (Fase 6). Se muestra con alert() de texto
// formateado, igual patrón que el resto de confirmaciones del
// proyecto, para no introducir un componente de modal nuevo solo para
// esta consulta de solo lectura.
async function metasVerHistorialAsesorV1(asesor) {
  const cred = metasAjusteCredencialesV1();
  if (!asesor || typeof supabaseClientV94 === "undefined") return;
  const mes = $("metasAjusteMesSelect")?.value || metasMesActualV2();
  if (!mes) return;

  try {
    const { data, error } = await supabaseClientV94.rpc("historial_ajuste_meta_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null,
      p_asesor: asesor, p_anio: metasAjusteAnioV1(), p_mes: mes
    });
    if (error) { alert("No se pudo consultar el historial: " + error.message); return; }
    if (!data || !data.length) { alert(`${asesor} · ${mes}: no hay ninguna versión de meta guardada todavía (se está usando la Meta Inicial calculada del sistema).`); return; }

    const lineas = data.map((v, i) => {
      const etiqueta = v.version_tipo === "inicial" ? "Meta Inicial" : `Forecast ${v.version_numero}`;
      const origen = v.origen === "carga_excel" ? "carga masiva Excel" : "ajuste manual";
      const fecha = v.actualizado_en ? new Date(v.actualizado_en).toLocaleString("es-CO") : "";
      const vigente = i === data.length - 1 ? "  ← VIGENTE (Meta Ajustada)" : "";
      return `${etiqueta} — ${money(Number(v.meta_ajustada))} — ${origen} — ${v.creado_por || ""} — ${fecha}${vigente}`;
    });
    alert(`Historial de ${asesor} · ${mes} ${metasAjusteAnioV1()}:\n\n${lineas.join("\n")}`);
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión consultando historial:", e);
    alert("No se pudo conectar con el servidor para consultar el historial.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  metasInsertarPanelV1();
  metasCargaExcelInsertarPanelV1();

  if ($("metasCargaExcelPlantillaBtn")) $("metasCargaExcelPlantillaBtn").addEventListener("click", metasCargaExcelDescargarPlantillaV1);
  if ($("metasCargaExcelValidarBtn")) $("metasCargaExcelValidarBtn").addEventListener("click", metasCargaExcelValidarV1);
  if ($("metasCargaExcelAplicarBtn")) $("metasCargaExcelAplicarBtn").addEventListener("click", metasCargaExcelAplicarV1);

  if ($("metasAjusteMesSelect")) {
    $("metasAjusteMesSelect").addEventListener("change", metasAjusteRenderTablaV1);
  }

  document.addEventListener("input", (e) => {
    if (e.target.classList && e.target.classList.contains("metas-nueva-meta-input")) {
      metasNuevaMetaPreviewV2(e.target);
    }
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion][data-asesor]");
    if (!btn || !$("metasAjusteTablaBody") || !$("metasAjusteTablaBody").contains(btn)) return;
    const asesor = btn.getAttribute("data-asesor");
    const accion = btn.getAttribute("data-accion");
    if (accion === "guardar-meta-asesor") metasAjusteGuardarAsesorV2(asesor);
    if (accion === "quitar-meta-asesor") metasAjusteQuitarAsesorV2(asesor);
    if (accion === "ver-historial-meta-asesor") metasVerHistorialAsesorV1(asesor);
  });

  // showMetasViewV106 ya existe (mejoras-v1.js); se envuelve para
  // refrescar el selector de mes y los ajustes cada vez que se abre
  // la vista, sin tocar el archivo original.
  if (typeof showMetasViewV106 === "function") {
    const _showMetasOriginalV1 = showMetasViewV106;
    showMetasViewV106 = function (...args) {
      const r = _showMetasOriginalV1.apply(this, args);
      if (metasAjusteEsAdminV1()) {
        metasAjusteLlenarSelectMesV2();
        metasAjusteCargarV1();
      }
      return r;
    };
  }

  metasEtiquetaEngancharRenderV2();
});

// ============================================================
// Etiqueta "Nueva Meta del mes" para el asesor, en su Hoja de ruta.
// ------------------------------------------------------------
// Cuando el administrador guarda una meta ajustada para el mes
// actual de un asesor, este ve una etiqueta pequeña junto al KPI
// "Meta" al consultar su Hoja de ruta. La etiqueta desaparece sola
// después de unos segundos Y queda marcada como vista en Supabase
// (no vuelve a aparecer hasta que se guarde un nuevo ajuste, que
// resetea visto_por_asesor a false en el servidor).
// ============================================================

const METAS_ETIQUETA_DURACION_MS_V2 = 8000;
let metasEtiquetaYaConsultadaV2 = false;

function metasEtiquetaCredencialesV2() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "", advisor: u ? (u.advisor || "") : "" };
}

async function metasEtiquetaConsultarV2() {
  const badge = $("metasNuevaMetaBadge");
  if (!badge) return;
  const cred = metasEtiquetaCredencialesV2();
  // Solo aplica a usuarios con perfil asesor (no admin: el admin no
  // tiene un "asesor" propio en currentUserV84.advisor).
  if (!cred.email || !cred.advisor || typeof supabaseClientV94 === "undefined") return;

  const mes = metasMesActualV2();
  if (!mes) return;

  try {
    const { data, error } = await supabaseClientV94.rpc("consultar_mi_ajuste_meta_v1", {
      p_email: cred.email, p_telefono: cred.telefono || null,
      p_anio: metasAjusteAnioV1(), p_mes: mes
    });
    if (error) { console.error("[Radar-Metas] Error consultando mi ajuste:", error); return; }
    const ajuste = (data || [])[0];
    if (!ajuste || ajuste.visto_por_asesor) { badge.hidden = true; return; }

    badge.hidden = false;
    // Se marca como vista en el servidor de inmediato (el asesor ya
    // la está viendo en pantalla ahora), y se retira visualmente
    // tras unos segundos.
    supabaseClientV94.rpc("marcar_ajuste_meta_visto_v1", {
      p_email: cred.email, p_telefono: cred.telefono || null,
      p_anio: metasAjusteAnioV1(), p_mes: mes
    }).catch(e => console.error("[Radar-Metas] Error marcando ajuste como visto:", e));

    setTimeout(() => { badge.hidden = true; }, METAS_ETIQUETA_DURACION_MS_V2);
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión consultando mi ajuste:", e);
  }
}

// Se engancha a render() (app.js/mejoras-v1.js), que ya se ejecuta
// cada vez que el asesor entra o refresca su Hoja de ruta. Solo se
// consulta una vez por sesión de página (no en cada re-render) para
// no disparar la consulta a Supabase repetidamente.
function metasEtiquetaEngancharRenderV2() {
  if (typeof render !== "function") return;
  const _renderOriginalV2 = render;
  render = function (...args) {
    const r = _renderOriginalV2.apply(this, args);
    if (!metasEtiquetaYaConsultadaV2 && metasEtiquetaCredencialesV2().advisor) {
      metasEtiquetaYaConsultadaV2 = true;
      metasEtiquetaConsultarV2();
    }
    return r;
  };
}

// ============================================================
// Fase 2 (2026-08-19) — Meta Ajustada en el Dashboard general.
// ------------------------------------------------------------
// El Dashboard (monthlySalesChart) se dibuja en app.js sin conocer
// los ajustes de ajustes_meta_asesor (esa tabla y su cache
// metasAjustesCacheV2 son de este archivo). En vez de tocar app.js,
// se envuelve renderDirectorDashboardV812 una vez más: después de que
// dibuje el gráfico normalmente, se vuelve a llamar chartV812 sobre el
// mismo canvas agregando la serie "Meta Ajustada 2026" (organización
// completa, sin filtro de asesor — el Dashboard no filtra por asesor).
// Requiere que metasAjustesCacheV2 esté cargada; como el admin puede
// entrar directo al Dashboard sin pasar antes por "Metas y
// presupuestos", se dispara una carga propia aquí (independiente de
// metasAjusteCargarV1, que además pinta la tabla de ajuste).
async function metasCacheAjustesParaDashboardV1() {
  const cred = metasAjusteCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") return;
  try {
    const { data, error } = await supabaseClientV94.rpc("listar_ajustes_meta_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) { console.error("[Radar-Metas] Error cargando ajustes para el Dashboard:", error); return; }
    metasAjustesCacheV2 = data || [];
    if (typeof renderDirectorDashboardV812 === "function" && typeof currentViewV812 !== "undefined" && currentViewV812 === "dashboard") {
      renderDirectorDashboardV812();
    }
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión cargando ajustes para el Dashboard:", e);
  }
}

function metasDashboardAgregarSerieAjustadaV1() {
  if (typeof chartV812 !== "function" || typeof monthsV812 !== "function") return;
  const canvas = $("monthlySalesChart");
  if (!canvas) return;

  const meses = monthsV812();
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const anio = typeof metasAjusteAnioV1 === "function" ? metasAjusteAnioV1() : 2026;
  const serieMetaAjustada = new Array(meses.length).fill(0);

  asesores.forEach(asesor => {
    const clientesAsesor = (DATA.clientes || []).filter(c => {
      if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
      return c.asesorAsignado === asesor;
    });
    meses.forEach((m, i) => {
      const metaInicialMes = typeof metaInicialAsesorMesV2 === "function" ? metaInicialAsesorMesV2(clientesAsesor, m) : 0;
      serieMetaAjustada[i] += (typeof metaVigenteAsesorMesV2 === "function")
        ? metaVigenteAsesorMesV2(asesor, anio, m, metaInicialMes)
        : metaInicialMes;
    });
  });

  const chart = (typeof dashboardChartsV812 !== "undefined") ? dashboardChartsV812["monthlySalesChart"] : null;
  if (!chart) return;
  const yaExiste = chart.data.datasets.some(d => d.label === "Meta Ajustada");
  if (yaExiste) return;
  chart.data.datasets.push({
    label: "Meta Ajustada",
    data: serieMetaAjustada,
    tension: .25,
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245,158,11,0.08)",
    pointRadius: 2,
    pointBackgroundColor: "#f59e0b"
  });
  chart.update();
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof renderDirectorDashboardV812 === "function") {
    const _renderDashboardOriginalV1 = renderDirectorDashboardV812;
    renderDirectorDashboardV812 = function (...args) {
      const r = _renderDashboardOriginalV1.apply(this, args);
      if (metasAjusteEsAdminV1()) {
        if (!metasAjustesCacheV2 || !metasAjustesCacheV2.length) {
          metasCacheAjustesParaDashboardV1();
        }
        metasDashboardAgregarSerieAjustadaV1();
      }
      return r;
    };
  }
});
