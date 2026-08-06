// ============================================================
// V107 — Motor EWS (Early Warning System) — Panel de alarmas
// ------------------------------------------------------------
// Ver documento "Radar_Comercial_B2B_Mejoras_Modelos.docx",
// sección 5. Seis categorías de alarma, cada una con severidad
// Alta/Media/Baja. No reemplaza ninguna función existente: lee
// datos de app.js y (cuando existe) de Motor RTE/RED.
//
// Requiere modulo_01_calendario.js y modulo_02_motor_RED.js
// cargados ANTES que este archivo.
// ============================================================

const EWS_SEVERIDAD_V107 = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

// ------------------------------------------------------------
// 5.1 — Cumplimiento y ritmo de venta
// Compara Ritmo_parcial del mes (venta acumulada / meta acumulada
// esperada a la fecha, según días hábiles reales transcurridos)
// contra el cumplimiento histórico del asesor.
// ------------------------------------------------------------
function alarmaRitmoVentaV107(nombreAsesor) {
  if (typeof monthsV812 !== "function" || typeof goal !== "function") return null;
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  const hoy = new Date();
  const year = hoy.getFullYear(), monthIndex = hoy.getMonth();
  const totalHabiles = diasHabilesMesV107(year, monthIndex);
  const transcurridosHabiles = diasHabilesTranscurridosV107(year, monthIndex, hoy);
  if (!totalHabiles) return null;

  const metaMes = clientes.reduce((s, c) => s + (goal(c) || 0), 0);
  const metaEsperadaHoy = metaMes * (transcurridosHabiles / totalHabiles);
  const mesActual = monthsV812()[monthIndex];
  const ventaHoy = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, year, mesActual) : 0), 0);

  const ritmo = metaEsperadaHoy > 0 ? ventaHoy / metaEsperadaHoy : null;
  if (ritmo === null) return null;

  let severidad = null;
  if (ritmo < 0.7) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (ritmo < 0.9) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (ritmo < 1.0) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Cumplimiento y ritmo de venta",
    severidad,
    detalle: `Ritmo actual ${(ritmo * 100).toFixed(0)}% de lo esperado a ${transcurridosHabiles}/${totalHabiles} días hábiles del mes.`,
    valor: ritmo,
  };
}

// ------------------------------------------------------------
// 5.2 — Salud de cartera (clientes en Posible Baja / Baja / Inactivo
// como % de la cartera activa del asesor)
// ------------------------------------------------------------
function alarmaSaludCarteraV107(nombreAsesor) {
  if (typeof statusByMonthV814 !== "function" || typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const idxActual = (typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses).length - 1;
  if (idxActual < 0) return null;

  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  if (!clientes.length) return null;

  const estados = clientes.map(c => statusByMonthV814(c, 2026, idxActual));
  const enRiesgo = estados.filter(e => e === "Posible Baja" || e === "Baja" || e === "Inactivo").length;
  const pctRiesgo = enRiesgo / clientes.length;

  let severidad = null;
  if (pctRiesgo >= 0.35) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (pctRiesgo >= 0.20) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (pctRiesgo >= 0.10) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Salud de cartera",
    severidad,
    detalle: `${enRiesgo} de ${clientes.length} clientes (${(pctRiesgo * 100).toFixed(0)}%) en Posible Baja, Baja o Inactivo.`,
    valor: pctRiesgo,
  };
}

// ------------------------------------------------------------
// 5.3 — Decrecimiento de OP (órdenes de pedido) o tiquete promedio
// Compara ticket promedio (venta / # OP) del mes actual vs. promedio
// de los 3 meses anteriores.
// ------------------------------------------------------------
function alarmaTicketPromedioV107(nombreAsesor) {
  if (typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const transcurridos = typeof availableMonthsV812 === "function" ? availableMonthsV812() : [];
  const idxActual = transcurridos.length - 1;
  if (idxActual < 3) return null; // requiere al menos 3 meses previos, sin inventar datos

  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const ticketMes = (mIdx) => {
    const m = meses[mIdx];
    const venta = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, m) : 0), 0);
    const ops = clientes.reduce((s, c) => s + (typeof opsMonthV812 === "function" ? opsMonthV812(c, 2026, m) : (venta > 0 ? 1 : 0)), 0);
    return ops > 0 ? venta / ops : null;
  };

  const actual = ticketMes(idxActual);
  const anteriores = [ticketMes(idxActual - 1), ticketMes(idxActual - 2), ticketMes(idxActual - 3)].filter(v => v !== null);
  if (actual === null || !anteriores.length) return null;

  const promedioAnterior = anteriores.reduce((s, v) => s + v, 0) / anteriores.length;
  if (!promedioAnterior) return null;
  const variacion = (actual / promedioAnterior) - 1;

  let severidad = null;
  if (variacion <= -0.25) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (variacion <= -0.15) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (variacion <= -0.08) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Decrecimiento de OP o tiquete",
    severidad,
    detalle: `Ticket promedio cayó ${Math.abs(variacion * 100).toFixed(0)}% vs. promedio de los 3 meses anteriores.`,
    valor: variacion,
  };
}

// ------------------------------------------------------------
// 5.4 — Decrecimiento de clientes activos (año contra año, mismo
// mes, usando el diagnóstico ya construido en Motor RED).
// ------------------------------------------------------------
function alarmaDecrecimientoClientesV107(nombreAsesor) {
  if (typeof diagnosticoClientesActivosV107 !== "function") return null;
  const diag = diagnosticoClientesActivosV107(nombreAsesor);
  if (!diag) return null;

  let severidad = null;
  const v = diag.variacionClientes;
  if (v <= -0.15) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (v <= -0.08) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (v < 0) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Decrecimiento de clientes activos",
    severidad,
    detalle: `Clientes activos ${diag.activos2026} vs. ${diag.activos2025} año anterior (${(v * 100).toFixed(0)}%). Diagnóstico: ${diag.diagnostico}.`,
    valor: v,
  };
}

// ------------------------------------------------------------
// 5.5 — Decrecimiento de venta total (mes actual vs. mismo mes
// año anterior, ajustado por día hábil para neutralizar el efecto
// calendario de Semana Santa entre años).
// ------------------------------------------------------------
function alarmaDecrecimientoVentaV107(nombreAsesor) {
  if (typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const idxActual = (typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses).length - 1;
  if (idxActual < 0) return null;
  const mesActual = meses[idxActual];

  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const venta26 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, mesActual) : 0), 0);
  const venta25 = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2025, mesActual) : 0), 0);
  if (!venta25) return null;

  const dh26 = diasHabilesMesV107(2026, idxActual);
  const dh25 = diasHabilesMesV107(2025, idxActual);
  const ventaDiaHabil26 = dh26 > 0 ? venta26 / dh26 : 0;
  const ventaDiaHabil25 = dh25 > 0 ? venta25 / dh25 : 0;
  if (!ventaDiaHabil25) return null;

  const variacion = (ventaDiaHabil26 / ventaDiaHabil25) - 1;

  let severidad = null;
  if (variacion <= -0.20) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (variacion <= -0.10) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (variacion < 0) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Decrecimiento de venta",
    severidad,
    detalle: `Venta por día hábil ${(variacion * 100).toFixed(0)}% vs. mismo mes año anterior (ajustado por días hábiles: ${dh26} vs ${dh25}).`,
    valor: variacion,
  };
}

// ------------------------------------------------------------
// 5.6 — Concentración de venta (índice Herfindahl-Hirschman
// simplificado: % de la venta del mes explicado por el top-3
// de clientes del asesor).
// ------------------------------------------------------------
function alarmaConcentracionVentaV107(nombreAsesor) {
  if (typeof monthsV812 !== "function") return null;
  const meses = monthsV812();
  const idxActual = (typeof availableMonthsV812 === "function" ? availableMonthsV812() : meses).length - 1;
  if (idxActual < 0) return null;
  const mesActual = meses[idxActual];

  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });

  const ventas = clientes
    .map(c => (typeof saleMonthV812 === "function" ? saleMonthV812(c, 2026, mesActual) : 0))
    .filter(v => v > 0)
    .sort((a, b) => b - a);
  const total = ventas.reduce((s, v) => s + v, 0);
  if (!total || ventas.length < 4) return null; // con <4 clientes con venta, "concentración" no es una alarma útil

  const top3 = ventas.slice(0, 3).reduce((s, v) => s + v, 0);
  const pctTop3 = top3 / total;

  let severidad = null;
  if (pctTop3 >= 0.70) severidad = EWS_SEVERIDAD_V107.ALTA;
  else if (pctTop3 >= 0.55) severidad = EWS_SEVERIDAD_V107.MEDIA;
  else if (pctTop3 >= 0.40) severidad = EWS_SEVERIDAD_V107.BAJA;

  if (!severidad) return null;
  return {
    categoria: "Concentración de venta",
    severidad,
    detalle: `Los 3 clientes más grandes explican ${(pctTop3 * 100).toFixed(0)}% de la venta del mes (${clientes.length} clientes con venta: ${ventas.length}).`,
    valor: pctTop3,
  };
}

// ------------------------------------------------------------
// Agregador: panel completo de un asesor. nombreAsesor = null
// para vista consolidada del administrador.
// ------------------------------------------------------------
function panelAlarmasV107(nombreAsesor) {
  const alarmas = [
    alarmaRitmoVentaV107(nombreAsesor),
    alarmaSaludCarteraV107(nombreAsesor),
    alarmaTicketPromedioV107(nombreAsesor),
    alarmaDecrecimientoClientesV107(nombreAsesor),
    alarmaDecrecimientoVentaV107(nombreAsesor),
    alarmaConcentracionVentaV107(nombreAsesor),
  ].filter(Boolean);

  const orden = { Alta: 0, Media: 1, Baja: 2 };
  alarmas.sort((a, b) => orden[a.severidad] - orden[b.severidad]);

  return {
    asesor: nombreAsesor || "TOTAL ORGANIZACIÓN",
    totalAlarmas: alarmas.length,
    alarmasAltas: alarmas.filter(a => a.severidad === "Alta").length,
    alarmas,
  };
}

// Panel consolidado del administrador: una fila por asesor, orden
// por # de alarmas altas (los asesores con más riesgo primero).
function panelAlarmasAdminV107() {
  if (typeof DATA === "undefined" || !Array.isArray(DATA.asesores)) return [];
  const nombres = DATA.asesores.map(a => a.nombre || a.email || a.id).filter(Boolean);
  const paneles = nombres.map(n => panelAlarmasV107(n));
  paneles.sort((a, b) => b.alarmasAltas - a.alarmasAltas || b.totalAlarmas - a.totalAlarmas);
  return paneles;
}
