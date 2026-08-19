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
        <p>Administrador y Super Administrador. Escribe la nueva meta del mes para cada asesor, en pesos. La Meta Inicial (definida en el sistema) no se modifica ni se sobrescribe — el ajuste queda registrado aparte y es lo que se usa como meta vigente del mes elegido.</p>
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
            <th>Meta vigente del mes</th>
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
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión listando ajustes:", e);
  }
}

function metasAjusteRenderTablaV1() {
  const body = $("metasAjusteTablaBody");
  if (!body) return;

  const anio = metasAjusteAnioV1();
  const mes = $("metasAjusteMesSelect")?.value || metasMesActualV2();
  if (!mes) { body.innerHTML = '<tr><td colspan="6">No quedan meses disponibles en el año para ajustar.</td></tr>'; return; }

  const asesores = ((DATA.meta && DATA.meta.asesores) || []).slice().sort();
  if (!asesores.length) { body.innerHTML = '<tr><td colspan="6">No hay asesores registrados.</td></tr>'; return; }

  body.innerHTML = asesores.map(asesor => {
    const metaInicial = metasBaseAsesorV1(asesor);
    const acumuladoAnio = metasAcumuladoAnioAsesorV2(asesor);
    const ajuste = metasAjustesCacheV2.find(a => a.asesor === asesor && a.anio === anio && a.mes === mes);
    const metaVigente = ajuste ? Number(ajuste.meta_ajustada) : metaInicial;
    return `<tr data-asesor="${esc(asesor)}">
      <td data-label="Asesor">${esc(asesor)}</td>
      <td data-label="Meta Inicial (mes)">${money(metaInicial)}</td>
      <td data-label="Acumulado año"><strong class="metas-acumulado-valor">${money(acumuladoAnio)}</strong></td>
      <td data-label="Meta vigente del mes">${money(metaVigente)}${ajuste ? ' <span class="metas-badge-ajustada" title="Meta ajustada manualmente">Ajustada</span>' : ""}</td>
      <td data-label="Nueva meta del mes">
        <input type="number" class="metas-nueva-meta-input" placeholder="${Number(metaVigente).toFixed(0)}" step="any" min="0"/>
        <div class="metas-nueva-meta-preview" hidden></div>
      </td>
      <td data-label="Acciones">
        <button class="btn ghost small-btn" data-accion="guardar-meta-asesor" data-asesor="${esc(asesor)}">Guardar</button>
        ${ajuste ? `<button class="btn ghost small-btn" data-accion="quitar-meta-asesor" data-asesor="${esc(asesor)}">Quitar ajuste</button>` : ""}
      </td>
    </tr>`;
  }).join("");
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

document.addEventListener("DOMContentLoaded", () => {
  metasInsertarPanelV1();

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
