// ============================================================
// V107 — Motor RTE (Ritmo · Tendencia · Estado) — Probabilidad
// de cumplimiento de la META (no del presupuesto).
// ------------------------------------------------------------
// Ver documento "Radar_Comercial_B2B_Mejoras_Modelos.docx",
// sección 3. Fórmula:
//   P(cumplir) = P_empírica_base(banda_temporal)
//                × Factor_ritmo × Factor_tendencia × Factor_estado
//
// P_empírica_base requiere historial_metas_mensuales con muestra
// suficiente (mínimo MUESTRA_MINIMA_V107 registros comparables).
// Mientras la tabla no tenga esa muestra, el motor devuelve
// confianza:"insuficiente" y un dato de referencia neutro (50%),
// NUNCA una cifra inventada como si fuera estadística real — ver
// sección 6.1 del documento, alerta explícita de Sergio: "no
// inventes cifras".
//
// Requiere modulo_01_calendario.js cargado ANTES que este archivo,
// y un cliente Supabase ya inicializado (supabaseClientV94, de
// supabase-sync.js) para leer/escribir historial_metas_mensuales.
// ============================================================

const RTE_MUESTRA_MINIMA_V107 = 20; // ver sección 3.7 del documento: mínimo estadístico para no reportar ruido como señal
const RTE_PROBABILIDAD_NEUTRA_V107 = 0.5; // fallback explícito, no calculado — punto medio, no una predicción

// ------------------------------------------------------------
// 3.1 — Factor de ritmo: venta acumulada del mes / meta esperada
// a la fecha según días hábiles reales transcurridos.
// ------------------------------------------------------------
function factorRitmoV107(c) {
  if (typeof goal !== "function") return 1;
  const hoy = new Date();
  const year = hoy.getFullYear(), monthIndex = hoy.getMonth();
  const totalHabiles = diasHabilesMesV107(year, monthIndex);
  const transcurridos = diasHabilesTranscurridosV107(year, monthIndex, hoy);
  if (!totalHabiles || !transcurridos) return 1;

  const metaMes = goal(c) || 0;
  if (!metaMes) return 1;
  const metaEsperadaHoy = metaMes * (transcurridos / totalHabiles);

  const mesActual = typeof monthsV812 === "function" ? monthsV812()[monthIndex] : null;
  const ventaHoy = mesActual && typeof saleMonthV812 === "function" ? saleMonthV812(c, year, mesActual) : 0;

  if (!metaEsperadaHoy) return 1;
  const ritmo = ventaHoy / metaEsperadaHoy;
  // Se acota [0.3, 1.7] para que un solo cliente con ritmo extremo
  // (ej. una OP grande el día 1) no distorsione la probabilidad final.
  return Math.max(0.3, Math.min(1.7, ritmo));
}

// ------------------------------------------------------------
// 3.2 — Factor de tendencia: compara venta mensual de los últimos
// 3 meses vs. los 3 meses anteriores a esos (reemplaza la variable
// "urgencia en días sin gestión" descartada por Sergio: no es
// controlable por el asesor y no predice cumplimiento).
// ------------------------------------------------------------
function factorTendenciaV107(c) {
  if (typeof monthsV812 !== "function") return 1;
  const meses = monthsV812();
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  const idxActual = transcurridos.length - 1;
  if (idxActual < 5) return 1; // requiere 6 meses de historia (3+3); si no hay, factor neutro

  const ventaMes = (mIdx) => {
    const m = meses[mIdx];
    return typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, m) : 0;
  };

  const ultimos3 = [ventaMes(idxActual), ventaMes(idxActual - 1), ventaMes(idxActual - 2)].reduce((s, v) => s + v, 0);
  const anteriores3 = [ventaMes(idxActual - 3), ventaMes(idxActual - 4), ventaMes(idxActual - 5)].reduce((s, v) => s + v, 0);

  if (!anteriores3) return 1;
  const tendencia = ultimos3 / anteriores3;
  return Math.max(0.5, Math.min(1.5, tendencia));
}

// ------------------------------------------------------------
// 3.3 — Factor de estado: multiplicador según estado comercial
// del cliente. Clientes "Archivado" (12+ meses sin comprar) quedan
// EXCLUIDOS del cálculo, no en 0% — ver corrección explícita de
// Sergio sobre el portafolio de clientes.
// ------------------------------------------------------------
const RTE_FACTOR_ESTADO_V107 = {
  Activo: 1.0,
  Reingreso: 0.9,
  "Posible Baja": 0.5,
  Inactivo: 0.3,
  Nuevo: 0.6,
  Baja: 0.15,
};

function factorEstadoV107(c) {
  if (typeof statusByMonthV814 !== "function" || typeof monthsV812 !== "function") return 1;
  const meses = monthsV812();
  const idxActual = (typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses).length - 1;
  if (idxActual < 0) return 1;
  const estado = statusByMonthV814(c, 2026, idxActual);
  return RTE_FACTOR_ESTADO_V107[estado] ?? 1;
}

// Cliente elegible para el cálculo de probabilidad: no bloqueado,
// no archivado (12+ meses sin comprar → tratado como "nuevo" si
// regresa, pero mientras tanto no cuenta en la probabilidad de
// cumplimiento de la meta vigente).
function esClienteElegibleRTEV107(c) {
  if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
  if (typeof mesesSinComprarV107 === "function" && mesesSinComprarV107(c) >= 12) return false;
  return true;
}

// ------------------------------------------------------------
// 3.4/3.7 — P_empírica_base: % histórico de meses en los que la
// ORGANIZACIÓN cumplió la meta, segmentado por banda temporal
// (día/semana/mes) y filtrado por muestra mínima. Lee de
// historial_metas_mensuales. Si no hay muestra suficiente,
// retorna confianza "insuficiente" y probabilidad neutra.
// ------------------------------------------------------------
async function probabilidadEmpiricaBaseV107(bandaTemporal) {
  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) {
    return { probabilidad: RTE_PROBABILIDAD_NEUTRA_V107, confianza: "insuficiente", muestra: 0, motivo: "Cliente Supabase no disponible" };
  }
  const { data, error } = await supabaseClientV94
    .from("historial_metas_mensuales")
    .select("meta_cerrada, venta_final");

  if (error || !data || data.length < RTE_MUESTRA_MINIMA_V107) {
    return {
      probabilidad: RTE_PROBABILIDAD_NEUTRA_V107,
      confianza: "insuficiente",
      muestra: data ? data.length : 0,
      motivo: `Muestra actual: ${data ? data.length : 0} de ${RTE_MUESTRA_MINIMA_V107} registros mínimos requeridos. El histórico se construye automáticamente cada vez que se cierra un mes (ver cerrarMesHistoricoRTEV107). Hasta alcanzar la muestra mínima, el motor opera en modo referencia neutra (50%), no estadística real.`,
    };
  }

  const cumplidos = data.filter(r => r.meta_cerrada > 0 && r.venta_final >= r.meta_cerrada).length;
  const probabilidad = cumplidos / data.length;
  return { probabilidad, confianza: "suficiente", muestra: data.length, motivo: null };
}

// ------------------------------------------------------------
// 3.6 — Probabilidad final por cliente. Combina P_empírica_base
// (organización, banda mensual) con los tres factores individuales.
// ------------------------------------------------------------
async function probabilidadCumplimientoClienteV107(c) {
  if (!esClienteElegibleRTEV107(c)) {
    return { cliente: c.nit || c.id, aplica: false, motivo: "Cliente archivado o bloqueado — excluido del cálculo." };
  }
  const base = await probabilidadEmpiricaBaseV107("mensual");
  const ritmo = factorRitmoV107(c);
  const tendencia = factorTendenciaV107(c);
  const estado = factorEstadoV107(c);

  const probabilidadCruda = base.probabilidad * ritmo * tendencia * estado;
  const probabilidadFinal = Math.max(0, Math.min(1, probabilidadCruda));

  return {
    cliente: c.nit || c.id,
    aplica: true,
    probabilidad: probabilidadFinal,
    confianza: base.confianza,
    muestra: base.muestra,
    motivoConfianza: base.motivo,
    factores: { probabilidadEmpiricaBase: base.probabilidad, ritmo, tendencia, estado },
  };
}

// Probabilidad agregada por asesor: promedio ponderado por meta
// de las probabilidades individuales de sus clientes elegibles.
async function probabilidadCumplimientoAsesorV107(nombreAsesor) {
  if (typeof goal !== "function") return null;
  const clientes = (DATA.clientes || []).filter(c => {
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return esClienteElegibleRTEV107(c);
  });
  if (!clientes.length) return { asesor: nombreAsesor || "TOTAL ORGANIZACIÓN", aplica: false, motivo: "Sin clientes elegibles." };

  const resultados = await Promise.all(clientes.map(c => probabilidadCumplimientoClienteV107(c)));
  const validos = resultados.filter(r => r.aplica);
  const metaTotal = clientes.reduce((s, c) => s + (goal(c) || 0), 0);

  let probabilidadPonderada;
  if (metaTotal > 0) {
    probabilidadPonderada = validos.reduce((s, r, i) => {
      const metaCliente = goal(clientes[i]) || 0;
      return s + r.probabilidad * (metaCliente / metaTotal);
    }, 0);
  } else {
    probabilidadPonderada = validos.length ? validos.reduce((s, r) => s + r.probabilidad, 0) / validos.length : RTE_PROBABILIDAD_NEUTRA_V107;
  }

  const confianzaGeneral = validos.some(r => r.confianza === "suficiente") ? "suficiente" : "insuficiente";

  return {
    asesor: nombreAsesor || "TOTAL ORGANIZACIÓN",
    aplica: true,
    probabilidad: probabilidadPonderada,
    confianza: confianzaGeneral,
    clientesEvaluados: validos.length,
    clientesExcluidos: resultados.length - validos.length,
  };
}

// ------------------------------------------------------------
// 6.1 — Cierre de mes histórico: inserta UNA fila por cliente en
// historial_metas_mensuales. Debe ejecutarse UNA vez por mes,
// disparado manualmente por el administrador (botón "Cerrar mes"
// en la UI), nunca automáticamente, para evitar cierres duplicados
// o accidentales. Es la única fuente que alimenta la muestra de
// probabilidadEmpiricaBaseV107 — sin este paso, el Motor RTE se
// queda en confianza "insuficiente" indefinidamente.
// ------------------------------------------------------------
async function cerrarMesHistoricoRTEV107(anio, mes, emailAdmin) {
  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) {
    throw new Error("Cliente Supabase no disponible — no se puede cerrar el mes histórico.");
  }
  if (typeof isAdminV86 === "function" && !isAdminV86()) {
    throw new Error("Solo un administrador puede cerrar el mes histórico del Motor RTE.");
  }

  const clientes = (DATA.clientes || []).filter(c => !(typeof isBlockedV87 === "function" && isBlockedV87(c)));
  const idxMes = typeof monthIndexV107 === "function" ? monthIndexV107(mes) : -1;

  const filas = clientes.map(c => ({
    cliente_nit: c.nit,
    cliente_nombre: c.nombre || c.razonSocial || null,
    anio,
    mes,
    meta_cerrada: (typeof goal === "function" ? goal(c) : 0) || 0,
    venta_final: (typeof saleMonthV812 === "function" ? saleMonthV812(c, anio, mes) : 0) || 0,
    estado_al_cierre: (typeof statusByMonthV814 === "function" && idxMes >= 0) ? statusByMonthV814(c, anio, idxMes) : null,
    clasificacion_al_cierre: c.clasificacion || null,
    cerrado_por: emailAdmin || null,
  }));

  // INSERT puro (nunca upsert): si el mes ya fue cerrado, la
  // restricción UNIQUE(cliente_nit, anio, mes) del script SQL
  // rechaza el duplicado y preserva la inmutabilidad del histórico.
  const { data, error } = await supabaseClientV94.from("historial_metas_mensuales").insert(filas).select();
  if (error) {
    throw new Error(`Error al cerrar el mes histórico: ${error.message}. Si el mensaje indica violación de la restricción UNIQUE, este mes ya fue cerrado antes.`);
  }
  return { filasInsertadas: data ? data.length : 0 };
}
