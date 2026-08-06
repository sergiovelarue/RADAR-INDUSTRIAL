// ============================================================
// V107 — Motor RED (Regresión · Estacionalidad · Días hábiles)
// ------------------------------------------------------------
// Ver documento "Radar_Comercial_B2B_Mejoras_Modelos.docx",
// sección 4. Extiende proyeccionRestoAnioClienteV106 /
// serieMensual2026ClienteV106 / resumenMetasAsesorV106 SIN
// reemplazarlas: si por algún motivo esas funciones no están
// disponibles (versión desalineada de app.js), el Motor RED
// falla de forma silenciosa y la app sigue funcionando con el
// método V106 original.
//
// Requiere modulo_01_calendario.js cargado ANTES que este archivo.
// ============================================================

// ------------------------------------------------------------
// 4.2 — Regresión lineal simple por mínimos cuadrados ordinarios
// ------------------------------------------------------------
function linearRegressionV107(monthlyValues) {
  const n = monthlyValues.length;
  if (n === 0) return { beta0: 0, beta1: 0, r2: 0, n: 0, predictNext: () => 0 };
  const tAvg = (n + 1) / 2;
  const vAvg = monthlyValues.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  monthlyValues.forEach((v, i) => {
    const t = i + 1;
    num += (t - tAvg) * (v - vAvg);
    den += (t - tAvg) ** 2;
  });
  const beta1 = den ? num / den : 0;
  const beta0 = vAvg - beta1 * tAvg;
  const predicted = monthlyValues.map((v, i) => beta0 + beta1 * (i + 1));
  const ssRes = monthlyValues.reduce((s, v, i) => s + (v - predicted[i]) ** 2, 0);
  const ssTot = monthlyValues.reduce((s, v) => s + (v - vAvg) ** 2, 0);
  const r2 = ssTot ? 1 - (ssRes / ssTot) : 0;
  return { beta0, beta1, r2, n, predictNext: (t) => beta0 + beta1 * t };
}

function desviacionEstandarV107(valores) {
  const n = valores.length;
  if (n < 2) return 0;
  const avg = valores.reduce((s, v) => s + v, 0) / n;
  const varianza = valores.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1);
  return Math.sqrt(varianza);
}

// ------------------------------------------------------------
// 4.3 — Serie mensual combinada (regresión + estacionalidad V106)
// para UN cliente. Envuelve serieMensual2026ClienteV106 en vez
// de reemplazarla.
// ------------------------------------------------------------
function serieMensualCombinadaClienteV107(c) {
  if (typeof serieMensual2026ClienteV106 !== "function" || typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses;
  const estacional = serieMensual2026ClienteV106(c); // función V106 existente, sin modificar
  const real26 = transcurridos.map((m, i) => estacional[i]);
  const reg = linearRegressionV107(real26);
  const pesoTendencia = real26.length >= 4 ? Math.min(0.6, Math.max(0, reg.r2)) : 0;

  return meses.map((m, i) => {
    if (transcurridos.includes(m)) return estacional[i]; // meses reales, sin tocar
    const t = i + 1;
    const tendenciaLineal = Math.max(0, reg.predictNext(t));
    return pesoTendencia * tendenciaLineal + (1 - pesoTendencia) * Math.max(0, estacional[i] || 0);
  });
}

// ------------------------------------------------------------
// 4.4 — Bandas de confianza (optimista/base/pesimista) sobre el
// cierre de año proyectado de la organización o un asesor.
// ------------------------------------------------------------
function bandasConfianzaRedV107(nombreAsesor) {
  if (typeof serieMensualOrganizacionV106 !== "function") return null;
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  const series = clientes.map(c => serieMensualCombinadaClienteV107(c)).filter(Boolean);
  if (!series.length) return { base: 0, optimista: 0, pesimista: 0 };

  const meses = monthsV812();
  const totalPorMes = meses.map((m, i) => series.reduce((s, serie) => s + (serie[i] || 0), 0));
  const base = totalPorMes.reduce((s, v) => s + v, 0);

  // Volatilidad histórica: desviación estándar de los meses reales
  // de 2025 (mismo criterio del documento, sección 4.4).
  const historico2025 = clientes.reduce((acc, c) => {
    const s25 = meses.map(m => (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2025, m) : 0));
    s25.forEach((v, i) => { acc[i] = (acc[i] || 0) + v; });
    return acc;
  }, []);
  const desviacion = desviacionEstandarV107(historico2025);

  return {
    base,
    optimista: base + desviacion,
    pesimista: Math.max(0, base - desviacion),
  };
}

// ------------------------------------------------------------
// 4.6.1 — Reparto del presupuesto por peso estacional AJUSTADO
// POR DÍA HÁBIL REAL, en vez del reparto ingenuo por mes calendario.
// ------------------------------------------------------------
function pesosEstacionalesPorDiaHabilV107(nombreAsesor, anioHistorico) {
  if (typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const ventaPorMes = meses.map(m =>
    clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, anioHistorico, m) : 0), 0)
  );
  const ventaPorDiaHabil = ventaPorMes.map((v, i) => {
    const dh = diasHabilesMesV107(anioHistorico, i);
    return dh > 0 ? v / dh : 0;
  });
  const totalPorDiaHabil = ventaPorDiaHabil.reduce((s, v) => s + v, 0);
  if (!totalPorDiaHabil) return meses.map(() => 1 / 12); // sin histórico: reparto uniforme, nunca inventado con sesgo

  return ventaPorDiaHabil.map(v => v / totalPorDiaHabil);
}

// Distribuye el presupuesto anual sugerido mes a mes, usando los
// pesos estacionales por día hábil y los días hábiles REALES del
// año siguiente (no los del año histórico).
function distribuirPresupuestoMensualV107(presupuestoAnual, nombreAsesor, anioHistorico, anioSiguiente) {
  const meses = monthsV812();
  const pesos = pesosEstacionalesPorDiaHabilV107(nombreAsesor, anioHistorico);
  if (!pesos) return meses.map(() => 0);

  const diasHabilesSiguiente = meses.map((m, i) => diasHabilesMesV107(anioSiguiente, i));
  const pesoXdias = pesos.map((p, i) => p * diasHabilesSiguiente[i]);
  const totalPesoXdias = pesoXdias.reduce((s, v) => s + v, 0);
  if (!totalPesoXdias) return meses.map(() => presupuestoAnual / 12);

  return pesoXdias.map(v => (v / totalPesoXdias) * presupuestoAnual);
}

// ------------------------------------------------------------
// 4.6.2 — Diagnóstico de clientes activos año contra año, para
// contextualizar el Factor_crecimiento_sugerido antes de fijar
// presupuesto (no reemplaza el criterio del administrador).
// ------------------------------------------------------------
function diagnosticoClientesActivosV107(nombreAsesor) {
  if (typeof statusByMonthV814 !== "function" || typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const idxActual = (typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses).length - 1;
  if (idxActual < 0) return null;

  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const activosV = (year) => clientes.filter(c => {
    const st = statusByMonthV814(c, year, idxActual);
    return st === "Activo" || st === "Reingreso";
  }).length;

  const activos2026 = activosV(2026);
  const activos2025 = activosV(2025);
  const variacionClientes = activos2025 ? (activos2026 / activos2025) - 1 : 0;

  const venta2026 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, meses[idxActual]) : 0), 0);
  const venta2025 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2025, meses[idxActual]) : 0), 0);
  const variacionVenta = venta2025 ? (venta2026 / venta2025) - 1 : 0;

  let diagnostico;
  if (variacionVenta >= 0 && variacionClientes >= 0) diagnostico = "Crecimiento sano";
  else if (variacionVenta >= 0 && variacionClientes < 0) diagnostico = "Crecimiento concentrado en menos clientes";
  else if (variacionVenta < 0 && variacionClientes >= 0) diagnostico = "Base en expansión, ticket a la baja";
  else diagnostico = "Riesgo estructural — venta y clientes activos caen juntos";

  return { activos2026, activos2025, variacionClientes, variacionVenta, diagnostico };
}

// ------------------------------------------------------------
// 4.6 — Factor de crecimiento sugerido (calculado, no inventado)
// y presupuesto del año siguiente por asesor.
// ------------------------------------------------------------
function factorCrecimientoSugeridoV107(nombreAsesor) {
  if (typeof monthsV812 !== "function") return 0;
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  if (!transcurridos.length) return 0;
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  const crecimientos = transcurridos.map(m => {
    const v26 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, m) : 0), 0);
    const v25 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2025, m) : 0), 0);
    return v25 > 0 ? (v26 / v25) - 1 : null;
  }).filter(v => v !== null);
  if (!crecimientos.length) return 0;
  return crecimientos.reduce((s, v) => s + v, 0) / crecimientos.length;
}

// resumenMetasAsesorV107: envuelve resumenMetasAsesorV106 y agrega
// las columnas nuevas del Motor RED (bandas de confianza, factor de
// crecimiento sugerido calculado, diagnóstico de clientes activos).
// El presupuesto propuesto2027 de V106 (% manual por clasificación)
// se conserva sin tocar; Motor RED entrega un SEGUNDO número
// (propuestoRED2027) como sugerencia adicional, no como reemplazo,
// para que el administrador compare ambos antes de decidir.
function resumenMetasAsesorRedV107(nombreAsesor) {
  const base = (typeof resumenMetasAsesorV106 === "function") ? resumenMetasAsesorV106(nombreAsesor) : null;
  const bandas = bandasConfianzaRedV107(nombreAsesor);
  const factorSugerido = factorCrecimientoSugeridoV107(nombreAsesor);
  const diagnostico = diagnosticoClientesActivosV107(nombreAsesor);
  const cierreProyectadoRED = bandas ? bandas.base : (base ? base.proyectado2026 : 0);
  const propuestoRED2027 = cierreProyectadoRED * (1 + factorSugerido);

  return {
    ...(base || { asesor: nombreAsesor || "TOTAL ORGANIZACIÓN" }),
    bandaOptimista: bandas ? bandas.optimista : null,
    bandaPesimista: bandas ? bandas.pesimista : null,
    factorCrecimientoSugerido: factorSugerido,
    propuestoRED2027,
    diagnosticoClientesActivos: diagnostico,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  // El Motor RED se calcula bajo demanda (no en cada render) porque
  // recorre todos los clientes con serieMensual2026ClienteV106 por
  // cliente — costoso si se ejecutara en cada refresco de pantalla.
  // Se expone como función global para que la UI (modulo_04_ui.js)
  // la invoque solo cuando el usuario abre la vista "Metas y presupuestos".
});
