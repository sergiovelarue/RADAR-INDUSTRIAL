// ============================================================
// V1 Metas — Ajuste de meta por asesor (Radar Comercial B2B)
// ------------------------------------------------------------
// Capa aditiva (2026-08-18, Etapa 5). Agrega, dentro de la vista
// existente "Metas y presupuestos" (metasView), un panel para que
// Administrador o Super Administrador suban o bajen la meta
// planeada de los PRÓXIMOS meses por asesor, sin editar cliente
// por cliente.
//
// Importante — alcance real de esta funcionalidad (léase antes de
// asumir que hace más de lo que hace):
// - NO modifica metaAsesor/metaSugerida por cliente. El sistema de
//   metas por cliente (editable uno por uno desde la ficha del
//   cliente) sigue funcionando exactamente igual que hoy.
// - Este panel guarda un AJUSTE separado (% o monto fijo) por
//   asesor y por mes, en una tabla nueva de Supabase
//   (ajustes_meta_asesor). Sirve para planeación/objetivo: muestra
//   cuál sería la meta ajustada de cada asesor en los próximos
//   meses, aplicando el ajuste sobre la suma de las metas actuales
//   de sus clientes.
// - No cambia el cálculo de "2026 planeado"/"cumplimiento" que ya
//   se ve en la tabla de resumen de esta misma vista (esos siguen
//   siendo sobre meses YA transcurridos). Este panel es sobre
//   meses FUTUROS, que hoy la vista no muestra en absoluto.
//
// Requiere las funciones SECURITY DEFINER de la migración
// etapa5_ajuste_meta_asesor_v1: listar_ajustes_meta_v1,
// guardar_ajuste_meta_v1, eliminar_ajuste_meta_v1.
// ============================================================

const METAS_MESES_V1 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function metasAjusteEsAdminV1() {
  return typeof isAdminV86 === "function" && isAdminV86();
}

function metasAjusteCredencialesV1() {
  const u = (typeof currentUserV84 !== "undefined") ? currentUserV84 : null;
  return { email: u ? (u.email || "") : "", telefono: u ? (u.phone || "") : "" };
}

// Los próximos 3 meses después del último mes con datos operativos
// cargados (availableMonthsV812, ya usado por el resto de Metas y
// presupuestos). Si quedan menos de 3 dentro del año, se muestran
// los que queden.
function metasProximosMesesV1() {
  const disponibles = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  const idxUltimo = disponibles.length ? METAS_MESES_V1.indexOf(disponibles[disponibles.length - 1]) : -1;
  const proximos = [];
  for (let i = idxUltimo + 1; i < METAS_MESES_V1.length && proximos.length < 3; i++) {
    proximos.push(METAS_MESES_V1[i]);
  }
  return proximos;
}

function metasAjusteAnioV1() {
  return 2026;
}

// Meta base de un asesor: suma de la meta actual (metaAsesor ||
// metaSugerida) de todos sus clientes no bloqueados. Es el mismo
// número para cualquier mes, porque el sistema actual no varía la
// meta por mes — es la base sobre la que se aplica el ajuste.
function metasBaseAsesorV1(nombreAsesor) {
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    return c.asesorAsignado === nombreAsesor;
  });
  return clientes.reduce((s, c) => s + (typeof goal === "function" ? goal(c) : 0), 0);
}

function metasAplicarAjusteV1(metaBase, ajuste) {
  if (!ajuste) return metaBase;
  if (ajuste.tipo_ajuste === "porcentaje") return metaBase * (1 + Number(ajuste.valor_ajuste || 0) / 100);
  return metaBase + Number(ajuste.valor_ajuste || 0);
}

let metasAjustesCacheV1 = [];

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
        <h3>Ajuste de meta por asesor — próximos meses</h3>
        <p>Administrador y Super Administrador. Sube o baja la meta planeada de un asesor para los próximos meses, sin editar cliente por cliente. No modifica la meta actual de cada cliente.</p>
      </div>
    </div>
    <div class="metas-ajuste-form">
      <label>Asesor
        <select id="metasAjusteAsesorSelect"></select>
      </label>
    </div>
    <div class="table-scroll">
      <table class="sistema-admin-table" id="metasAjusteTabla">
        <thead>
          <tr><th>Mes</th><th>Meta base actual</th><th>Tipo de ajuste</th><th>Valor</th><th>Meta ajustada</th><th>Acciones</th></tr>
        </thead>
        <tbody id="metasAjusteTablaBody"><tr><td colspan="6">Selecciona un asesor.</td></tr></tbody>
      </table>
    </div>
    <div id="metasAjusteMsg" class="sistema-msg"></div>
  `;
  referencia.parentNode.insertBefore(panel, referencia);
}

function metasAjusteLlenarSelectAsesorV1() {
  const sel = $("metasAjusteAsesorSelect");
  if (!sel) return;
  const asesores = (DATA.meta && DATA.meta.asesores) || [];
  const actual = sel.value;
  sel.innerHTML = '<option value="">Selecciona un asesor</option>' +
    asesores.slice().sort().map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  if (actual && asesores.includes(actual)) sel.value = actual;
}

async function metasAjusteCargarV1() {
  const cred = metasAjusteCredencialesV1();
  if (!cred.email || typeof supabaseClientV94 === "undefined") return;
  try {
    const { data, error } = await supabaseClientV94.rpc("listar_ajustes_meta_v1", {
      p_admin_email: cred.email, p_admin_telefono: cred.telefono || null
    });
    if (error) { console.error("[Radar-Metas] Error listando ajustes:", error); return; }
    metasAjustesCacheV1 = data || [];
    metasAjusteRenderTablaV1();
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión listando ajustes:", e);
  }
}

function metasAjusteRenderTablaV1() {
  const body = $("metasAjusteTablaBody");
  if (!body) return;
  const asesor = $("metasAjusteAsesorSelect")?.value || "";
  if (!asesor) { body.innerHTML = '<tr><td colspan="6">Selecciona un asesor.</td></tr>'; return; }

  const anio = metasAjusteAnioV1();
  const meses = metasProximosMesesV1();
  if (!meses.length) { body.innerHTML = '<tr><td colspan="6">No quedan meses disponibles en el año para ajustar.</td></tr>'; return; }

  const metaBase = metasBaseAsesorV1(asesor);

  body.innerHTML = meses.map(mes => {
    const ajuste = metasAjustesCacheV1.find(a => a.asesor === asesor && a.anio === anio && a.mes === mes);
    const tipo = ajuste ? ajuste.tipo_ajuste : "porcentaje";
    const valor = ajuste ? ajuste.valor_ajuste : 0;
    const metaAjustada = metasAplicarAjusteV1(metaBase, ajuste);
    return `<tr data-mes="${esc(mes)}">
      <td>${esc(mes)} ${anio}</td>
      <td>${money(metaBase)}</td>
      <td>
        <select class="metas-ajuste-tipo">
          <option value="porcentaje" ${tipo === "porcentaje" ? "selected" : ""}>% sobre meta base</option>
          <option value="monto" ${tipo === "monto" ? "selected" : ""}>Monto fijo (+/-)</option>
        </select>
      </td>
      <td><input type="number" class="metas-ajuste-valor" value="${Number(valor)}" step="any"/></td>
      <td class="metas-ajuste-resultado">${money(metaAjustada)}</td>
      <td>
        <button class="btn ghost small-btn" data-accion="guardar-ajuste-mes" data-mes="${esc(mes)}">Guardar</button>
        ${ajuste ? `<button class="btn ghost small-btn" data-accion="borrar-ajuste-mes" data-mes="${esc(mes)}">Quitar</button>` : ""}
      </td>
    </tr>`;
  }).join("");
}

async function metasAjusteGuardarMesV1(mes) {
  const msg = $("metasAjusteMsg");
  const cred = metasAjusteCredencialesV1();
  const asesor = $("metasAjusteAsesorSelect")?.value || "";
  if (!asesor || typeof supabaseClientV94 === "undefined") return;

  const fila = document.querySelector(`#metasAjusteTablaBody tr[data-mes="${CSS.escape(mes)}"]`);
  if (!fila) return;
  const tipo = fila.querySelector(".metas-ajuste-tipo")?.value || "porcentaje";
  const valor = Number(fila.querySelector(".metas-ajuste-valor")?.value || 0);

  try {
    const { error } = await supabaseClientV94.rpc("guardar_ajuste_meta_v1", {
      p_admin_email: cred.email,
      p_admin_telefono: cred.telefono || null,
      p_asesor: asesor,
      p_anio: metasAjusteAnioV1(),
      p_mes: mes,
      p_tipo_ajuste: tipo,
      p_valor_ajuste: valor
    });
    if (error) {
      console.error("[Radar-Metas] Error guardando ajuste:", error);
      if (msg) { msg.textContent = "No se pudo guardar: " + error.message; msg.className = "sistema-msg sistema-msg-error"; }
      return;
    }
    if (msg) { msg.textContent = `Ajuste guardado para ${asesor} · ${mes}.`; msg.className = "sistema-msg sistema-msg-ok"; }
    await metasAjusteCargarV1();
  } catch (e) {
    console.error("[Radar-Metas] Fallo de conexión guardando ajuste:", e);
    if (msg) { msg.textContent = "No se pudo conectar con el servidor."; msg.className = "sistema-msg sistema-msg-error"; }
  }
}

async function metasAjusteBorrarMesV1(mes) {
  const msg = $("metasAjusteMsg");
  const cred = metasAjusteCredencialesV1();
  const asesor = $("metasAjusteAsesorSelect")?.value || "";
  if (!asesor || typeof supabaseClientV94 === "undefined") return;
  if (!confirm(`¿Quitar el ajuste de ${asesor} para ${mes}? Volverá a usar la meta base sin ajuste.`)) return;

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

  if ($("metasAjusteAsesorSelect")) {
    $("metasAjusteAsesorSelect").addEventListener("change", metasAjusteRenderTablaV1);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-accion][data-mes]");
    if (!btn || !$("metasAjusteTablaBody") || !$("metasAjusteTablaBody").contains(btn)) return;
    const mes = btn.getAttribute("data-mes");
    const accion = btn.getAttribute("data-accion");
    if (accion === "guardar-ajuste-mes") metasAjusteGuardarMesV1(mes);
    if (accion === "borrar-ajuste-mes") metasAjusteBorrarMesV1(mes);
  });

  // showMetasViewV106 ya existe (mejoras-v1.js); se envuelve para
  // refrescar el selector de asesores y los ajustes cada vez que se
  // abre la vista, sin tocar el archivo original.
  if (typeof showMetasViewV106 === "function") {
    const _showMetasOriginalV1 = showMetasViewV106;
    showMetasViewV106 = function (...args) {
      const r = _showMetasOriginalV1.apply(this, args);
      if (metasAjusteEsAdminV1()) {
        metasAjusteLlenarSelectAsesorV1();
        metasAjusteCargarV1();
      }
      return r;
    };
  }
});
