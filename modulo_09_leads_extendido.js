// ============================================================
// V107 — Extensión de leads: NIT, contacto, cargo, sector
// ------------------------------------------------------------
// Ver documento: Sergio pidió (11-ago-2026) agregar al formulario
// público "Cuéntanos de tu empresa" (landing.html) y a la gestión
// de leads: NIT opcional (para detectar si la empresa ya es
// cliente), nombre de la persona de contacto (separado del nombre
// de la empresa), cargo del contacto, y sector/actividad económica.
//
// Decisión de almacenamiento: estos 4 campos NO requieren una
// migración de la tabla "leads" — ya existe la columna "detalle"
// (jsonb) diseñada exactamente para esto (ver crear_tabla_leads.sql,
// comentario original: "columna JSON (detalle) para el resto").
// Se guardan ahí como { nit, contacto, cargo, sector }.
//
// Este módulo sigue el patrón wrapper ya establecido en todo el
// proyecto: envuelve openLeadModalV104, guardarLeadV104,
// filaSupabaseALeadV104 y leadALaFilaSupabaseV104 SIN reemplazar
// su lógica original — solo agrega lo nuevo antes/después.
//
// Requiere cargarse DESPUÉS de mejoras-v1.js.
// ============================================================

function $V107d(id) { return document.getElementById(id); }

// ------------------------------------------------------------
// Lectura desde Supabase: agrega nit/contacto/cargo/sector desde
// la columna "detalle" al objeto lead en memoria (DATA.leads).
// ------------------------------------------------------------
if (typeof filaSupabaseALeadV104 === "function") {
  const _filaSupabaseALeadV104Original = filaSupabaseALeadV104;
  filaSupabaseALeadV104 = function (row) {
    const lead = _filaSupabaseALeadV104Original(row);
    const detalle = row.detalle || {};
    lead.nit = detalle.nit || "";
    lead.contacto = detalle.contacto || "";
    lead.cargo = detalle.cargo || "";
    lead.sector = detalle.sector || "";
    return lead;
  };
}

// ------------------------------------------------------------
// Escritura a Supabase: agrega los 4 campos dentro de "detalle".
// ------------------------------------------------------------
if (typeof leadALaFilaSupabaseV104 === "function") {
  const _leadALaFilaSupabaseV104Original = leadALaFilaSupabaseV104;
  leadALaFilaSupabaseV104 = function (l) {
    const fila = _leadALaFilaSupabaseV104Original(l);
    fila.detalle = {
      nit: l.nit || "",
      contacto: l.contacto || "",
      cargo: l.cargo || "",
      sector: l.sector || "",
    };
    return fila;
  };
}

// ------------------------------------------------------------
// Modal de edición: al abrir un lead existente, rellena también
// los 4 campos nuevos (openLeadModalV104 original no los conoce).
// ------------------------------------------------------------
if (typeof openLeadModalV104 === "function") {
  const _openLeadModalV104Original = openLeadModalV104;
  openLeadModalV104 = function (id) {
    _openLeadModalV104Original(id);
    const l = id ? (DATA.leads || []).find(x => x.id === id) : null;
    if ($V107d("leadNitInput")) $V107d("leadNitInput").value = l ? (l.nit || "") : "";
    if ($V107d("leadContactoInput")) $V107d("leadContactoInput").value = l ? (l.contacto || "") : "";
    if ($V107d("leadCargoInput")) $V107d("leadCargoInput").value = l ? (l.cargo || "") : "";
    if ($V107d("leadSectorInput")) $V107d("leadSectorInput").value = l ? (l.sector || "") : "";
    const aviso = $V107d("leadNitClienteAviso");
    if (aviso) aviso.style.display = "none";
    verificarNitClienteV107(l ? (l.nit || "") : "");
  };
}

// ------------------------------------------------------------
// Guardado: después de que guardarLeadV104 termine (ya creó/
// actualizó el objeto "l" dentro de DATA.leads), se le agregan los
// 4 campos nuevos al MISMO objeto antes de que se sincronice a
// Supabase. Por eso el orden importa: hay que copiar los valores
// de los inputs ANTES de llamar a la función original (que ya
// dispara guardarLeadsLocalV104/sincronizarLeadsV104 al final), así
// que se guardan en el objeto antes de que se guarde/sincronice.
// ------------------------------------------------------------
if (typeof guardarLeadV104 === "function") {
  const _guardarLeadV104Original = guardarLeadV104;
  guardarLeadV104 = function () {
    const id = $V107d("leadIdInput")?.value || "";
    const nit = ($V107d("leadNitInput")?.value || "").trim();
    const contacto = ($V107d("leadContactoInput")?.value || "").trim();
    const cargo = ($V107d("leadCargoInput")?.value || "").trim();
    const sector = ($V107d("leadSectorInput")?.value || "").trim();

    // Si es un lead nuevo, el objeto todavía no existe en DATA.leads
    // — hay que dejar los valores en un "buzón" temporal y aplicarlos
    // justo después de que la función original cree el objeto.
    const idsAntes = new Set((DATA.leads || []).map(l => l.id));

    _guardarLeadV104Original();

    // Después de guardarLeadV104Original, el lead (nuevo o editado)
    // ya está en DATA.leads con el id correcto.
    let l = id ? (DATA.leads || []).find(x => x.id === id) : null;
    if (!l) {
      // Era un lead nuevo: el id se generó dentro de la función
      // original (uuidV104()), lo identificamos como el único id
      // que no estaba antes de guardar.
      l = (DATA.leads || []).find(x => !idsAntes.has(x.id));
    }
    if (l) {
      l.nit = nit;
      l.contacto = contacto;
      l.cargo = cargo;
      l.sector = sector;
      if (typeof guardarLeadsLocalV104 === "function") guardarLeadsLocalV104();
      if (typeof sincronizarLeadsV104 === "function") sincronizarLeadsV104();
    }
  };
}

// ------------------------------------------------------------
// Verificación de NIT contra la tabla "clientes": si el NIT ya
// existe, muestra un aviso con el asesor que ya lo atiende (según
// decisión de Sergio: se sugiere asignar al mismo asesor, pero la
// decisión final la toma el admin al guardar — no se fuerza).
// ------------------------------------------------------------
async function verificarNitClienteV107(nit) {
  const aviso = $V107d("leadNitClienteAviso");
  if (!aviso) return;
  if (!nit || nit.trim().length < 3) { aviso.style.display = "none"; return; }
  if (typeof DATA === "undefined" || !Array.isArray(DATA.clientes)) { aviso.style.display = "none"; return; }

  const clienteExistente = DATA.clientes.find(c => String(c.nit || "").trim() === nit.trim());
  if (!clienteExistente) {
    aviso.style.display = "none";
    return;
  }

  aviso.style.display = "";
  aviso.innerHTML = `<strong>⚠️ Este NIT ya está registrado como cliente:</strong> ${clienteExistente.cliente || "(sin nombre)"} — atendido por <strong>${clienteExistente.asesorAsignado || "sin asesor"}</strong>. Sugerencia: asigna este lead al mismo asesor para no duplicar el contacto.`;

  // Autoselecciona el mismo asesor del cliente existente, si el
  // usuario es admin (puede elegir cualquiera) y el campo está vacío.
  const selAsesor = $V107d("leadAsesorInput");
  const esAdmin = typeof isAdminV86 === "function" && isAdminV86();
  if (selAsesor && esAdmin && clienteExistente.asesorAsignado && !selAsesor.value) {
    selAsesor.value = clienteExistente.asesorAsignado;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if ($V107d("leadNitInput")) {
    $V107d("leadNitInput").addEventListener("blur", (e) => verificarNitClienteV107(e.target.value));
  }
});

// ------------------------------------------------------------
// Tabla de leads: agrega la columna NIT (ver index.html, columna
// nueva <th>NIT</th> después de "Nombre / Empresa"). Envuelve
// renderLeadsV104 para regenerar las filas con esa columna extra,
// en vez de duplicar toda la lógica de filtros/orden ya existente.
// ------------------------------------------------------------
if (typeof renderLeadsV104 === "function") {
  const _renderLeadsV104Original = renderLeadsV104;
  renderLeadsV104 = function () {
    _renderLeadsV104Original();
    const body = $V107d("leadsBody");
    if (!body) return;
    const filas = Array.from(body.querySelectorAll("tr"));
    filas.forEach(tr => {
      const btn = tr.querySelector("[data-edit-lead-id]");
      if (!btn) return; // fila de "no hay leads" u otra sin botón de acción
      const id = btn.getAttribute("data-edit-lead-id");
      const lead = (DATA.leads || []).find(l => l.id === id);
      const tdNombre = tr.children[0];
      if (tdNombre && !tr.dataset.nitInsertado) {
        const tdNit = document.createElement("td");
        tdNit.textContent = (lead && lead.nit) ? lead.nit : "—";
        tdNombre.after(tdNit);
        tr.dataset.nitInsertado = "1";
      }
    });
  };
}
