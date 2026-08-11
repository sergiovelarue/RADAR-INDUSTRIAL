// ============================================================
// V107 — Motor RAC (Rendimiento · Actividad · Cumplimiento)
// Gamificación para asesores, inspirada en Strava.
// ------------------------------------------------------------
// Fórmula de puntaje (confirmada por Sergio):
//   Puntos = 70% × Cumplimiento_meta + 30% × Actividad_comercial
//
// Cumplimiento_meta = venta_real_período / meta_período (tope 100%
// para el cálculo del puntaje — superar la meta no debe romper la
// escala de 0-100 puntos de esa componente; el exceso se reconoce
// aparte con la insignia "Meta superada", no inflando el puntaje).
//
// Actividad_comercial = # clientes en estado Activo o Reingreso /
// # clientes totales asignados al asesor (sin ponderar por tamaño
// de cartera — decisión explícita de Sergio: "usar el % tal cual").
//
// Ranking: semanal (resetea lunes) + acumulado mensual. Ambos usan
// la misma fórmula, solo cambia la ventana de tiempo de la venta.
//
// Requiere: modulo_01_calendario.js, modulo_02_motor_RED.js (para
// factorCrecimientoSugeridoV107 no se usa aquí, pero comparte
// utilidades de fecha), y las funciones reales de app.js/mejoras-v1.js
// (goal, saleMonthV812, statusByMonthV814, monthsV812, DATA.asesores).
// No inventa datos: si una métrica no se puede calcular con datos
// reales, se omite (no se rellena con 0 disfrazado de resultado real).
// ============================================================

// ------------------------------------------------------------
// Niveles — umbrales de puntaje acumulado histórico (suma de
// puntos semanales desde que el asesor tiene datos). Igual que en
// Strava, el nivel es un logro de largo plazo, no del período actual.
// ------------------------------------------------------------
const RAC_NIVELES_V107 = [
  { nombre: "Bronce", minPuntos: 0 },
  { nombre: "Plata", minPuntos: 500 },
  { nombre: "Oro", minPuntos: 1500 },
  { nombre: "Platino", minPuntos: 3500 },
  { nombre: "Diamante", minPuntos: 7000 },
];

function nivelPorPuntosV107(puntosAcumulados) {
  let actual = RAC_NIVELES_V107[0];
  for (const n of RAC_NIVELES_V107) {
    if (puntosAcumulados >= n.minPuntos) actual = n;
  }
  const idx = RAC_NIVELES_V107.indexOf(actual);
  const siguiente = RAC_NIVELES_V107[idx + 1] || null;
  return {
    nivel: actual.nombre,
    siguienteNivel: siguiente ? siguiente.nombre : null,
    puntosParaSiguiente: siguiente ? Math.max(0, siguiente.minPuntos - puntosAcumulados) : 0,
  };
}

// ------------------------------------------------------------
// Cumplimiento de meta por semana o por mes, acotado a [0, 1] para
// el cálculo del puntaje (ver nota arriba sobre por qué se tope
// aquí y no en el dato crudo).
// ------------------------------------------------------------
function cumplimientoMetaPeriodoV107(nombreAsesor, year, mesIndex, diasDelPeriodo) {
  if (typeof goal !== "function" || typeof monthsV812 !== "function") return null;
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  if (!clientes.length) return null;

  const metaMes = clientes.reduce((s, c) => s + (goal(c) || 0), 0);
  if (!metaMes) return null;

  const diasHabilesMes = diasHabilesMesV107(year, mesIndex);
  const metaDelPeriodo = diasDelPeriodo && diasHabilesMes
    ? metaMes * (diasDelPeriodo / diasHabilesMes)
    : metaMes;

  const mesNombre = monthsV812()[mesIndex];
  const ventaMes = clientes.reduce((s, c) => s + (typeof saleMonthV812 === "function" ? saleMonthV812(c, year, mesNombre) : 0), 0);
  // Aproximación de venta del período: si se pide semana, se prorratea
  // la venta del mes por proporción de días hábiles transcurridos en
  // esa semana. Es una aproximación explícita — no hay tabla de venta
  // diaria real en el proyecto, solo mensual (saleMonthV812).
  const ventaDelPeriodo = diasDelPeriodo && diasHabilesMes
    ? ventaMes * (diasDelPeriodo / diasHabilesMes)
    : ventaMes;

  if (!metaDelPeriodo) return null;
  return Math.max(0, Math.min(1, ventaDelPeriodo / metaDelPeriodo));
}

// ------------------------------------------------------------
// Actividad comercial: %clientes activos/reingreso sobre el total
// asignado. Tal cual, sin ponderar por tamaño de cartera (decisión
// explícita de Sergio).
// ------------------------------------------------------------
function actividadComercialV107(nombreAsesor, year, mesIndex) {
  if (typeof statusByMonthV814 !== "function") return null;
  const clientes = (DATA.clientes || []).filter(c => {
    if (typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if (nombreAsesor && c.asesorAsignado !== nombreAsesor) return false;
    return true;
  });
  if (!clientes.length) return null;

  const activos = clientes.filter(c => {
    const st = statusByMonthV814(c, year, mesIndex);
    return st === "Activo" || st === "Reingreso";
  }).length;

  return activos / clientes.length;
}

// ------------------------------------------------------------
// Puntaje del período (0-100): 70% cumplimiento + 30% actividad.
// ------------------------------------------------------------
function puntajePeriodoV107(nombreAsesor, year, mesIndex, diasDelPeriodo) {
  const cumplimiento = cumplimientoMetaPeriodoV107(nombreAsesor, year, mesIndex, diasDelPeriodo);
  const actividad = actividadComercialV107(nombreAsesor, year, mesIndex);

  if (cumplimiento === null && actividad === null) return null;
  const cumplimientoUsado = cumplimiento === null ? 0 : cumplimiento;
  const actividadUsada = actividad === null ? 0 : actividad;

  const puntaje = (cumplimientoUsado * 0.7 + actividadUsada * 0.3) * 100;
  return {
    puntaje: Math.round(puntaje * 10) / 10,
    cumplimiento: cumplimiento,
    actividad: actividad,
    metaSuperada: cumplimiento !== null && cumplimiento >= 1,
  };
}

// ------------------------------------------------------------
// Utilidad: días hábiles transcurridos de la semana ISO actual
// dentro del mes en curso (para el prorrateo semanal de meta).
// ------------------------------------------------------------
function diasHabilesSemanaActualV107() {
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=domingo
  const lunes = addDaysV107(hoy, diaSemana === 0 ? -6 : 1 - diaSemana);
  let habiles = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDaysV107(lunes, i);
    if (d > hoy) break;
    const festivos = festivosColombiaV107(d.getFullYear());
    const esFinDeSemana = d.getDay() === 0 || d.getDay() === 6;
    if (!esFinDeSemana && !esFestivoV107(d, festivos)) habiles++;
  }
  return habiles;
}

// ------------------------------------------------------------
// Leaderboard semanal (resetea cada lunes) — usa el mes/año actual
// como ventana de meta, prorrateada por días hábiles de la semana
// transcurrida.
// ------------------------------------------------------------
function leaderboardSemanalV107() {
  if (typeof DATA === "undefined" || !Array.isArray(DATA.asesores)) return [];
  const hoy = new Date();
  const diasSemana = diasHabilesSemanaActualV107();

  const filas = DATA.asesores.map(nombreAsesor => {
    const r = puntajePeriodoV107(nombreAsesor, hoy.getFullYear(), hoy.getMonth(), diasSemana);
    return { asesor: nombreAsesor, ...(r || { puntaje: 0, cumplimiento: null, actividad: null, metaSuperada: false }) };
  });

  filas.sort((a, b) => b.puntaje - a.puntaje);
  filas.forEach((f, i) => { f.posicion = i + 1; });
  return filas;
}

// ------------------------------------------------------------
// Leaderboard mensual acumulado — venta/meta del mes completo
// transcurrido, sin prorrateo semanal.
// ------------------------------------------------------------
function leaderboardMensualV107() {
  if (typeof DATA === "undefined" || !Array.isArray(DATA.asesores)) return [];
  const hoy = new Date();

  const filas = DATA.asesores.map(nombreAsesor => {
    const r = puntajePeriodoV107(nombreAsesor, hoy.getFullYear(), hoy.getMonth(), null);
    return { asesor: nombreAsesor, ...(r || { puntaje: 0, cumplimiento: null, actividad: null, metaSuperada: false }) };
  });

  filas.sort((a, b) => b.puntaje - a.puntaje);
  filas.forEach((f, i) => { f.posicion = i + 1; });
  return filas;
}

// ------------------------------------------------------------
// Racha (streak): número de semanas consecutivas, hasta la actual,
// en las que el asesor quedó en el TOP 50% del leaderboard semanal
// de esa semana. Requiere histórico — ver nota de persistencia
// abajo. Si no hay histórico guardado, retorna 0 (no inventa racha).
// ------------------------------------------------------------
function calcularRachaV107(nombreAsesor, historicoSemanal) {
  // historicoSemanal: array ordenado de más reciente a más antiguo,
  // cada elemento { semanaIso, top50: boolean } — ya calculado y
  // guardado por guardarSnapshotSemanalRacV107 (ver abajo).
  if (!Array.isArray(historicoSemanal)) return 0;
  let racha = 0;
  for (const semana of historicoSemanal) {
    const entrada = semana.filas.find(f => f.asesor === nombreAsesor);
    if (!entrada) break;
    const enTop50 = entrada.posicion <= Math.ceil(semana.filas.length / 2);
    if (!enTop50) break;
    racha++;
  }
  return racha;
}

// ------------------------------------------------------------
// Insignias (badges) — logros puntuales, no acumulativos como el
// nivel. Se evalúan sobre el período mensual actual.
// ------------------------------------------------------------
function calcularInsigniasV107(nombreAsesor, resultadoMensual) {
  const insignias = [];
  if (!resultadoMensual) return insignias;

  if (resultadoMensual.metaSuperada) {
    insignias.push({ id: "meta_superada", nombre: "Meta superada", icono: "🏆" });
  }
  if (resultadoMensual.actividad !== null && resultadoMensual.actividad >= 0.9) {
    insignias.push({ id: "cartera_sana", nombre: "Cartera sana (90%+ activos)", icono: "💚" });
  }
  if (resultadoMensual.puntaje >= 90) {
    insignias.push({ id: "elite", nombre: "Rendimiento élite", icono: "⭐" });
  }
  return insignias;
}

// ------------------------------------------------------------
// Persistencia de snapshots semanales — NECESARIA para que la
// racha funcione a través del tiempo. Guarda en la tabla
// "historial_metas_mensuales"... NO, esa tabla es de otro motor.
// Se usa una tabla propia: rac_snapshots_semanales. Ver
// 03_rac_snapshots_semanales.sql. Debe llamarse UNA vez por semana
// (ideal: automatizado con un cron/Edge Function; mientras tanto,
// botón manual de administrador "Cerrar semana" en la UI, mismo
// criterio que cerrarMesHistoricoRTEV107).
// ------------------------------------------------------------
async function guardarSnapshotSemanalRacV107(emailAdmin) {
  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) {
    throw new Error("Cliente Supabase no disponible.");
  }
  if (typeof isAdminV86 === "function" && !isAdminV86()) {
    throw new Error("Solo un administrador puede cerrar la semana del ranking.");
  }
  const filas = leaderboardSemanalV107();
  const hoy = new Date();
  const semanaIso = `${hoy.getFullYear()}-W${String(getSemanaIsoV107(hoy)).padStart(2, "0")}`;

  const { error } = await supabaseClientV94.from("rac_snapshots_semanales").insert([{
    semana_iso: semanaIso,
    filas: filas,
    cerrado_por: emailAdmin || null,
  }]);
  if (error) {
    throw new Error(`Error al guardar snapshot semanal: ${error.message}. Si ya se cerró esta semana, revisa la restricción UNIQUE(semana_iso).`);
  }
  return { semanaIso, asesoresEvaluados: filas.length };
}

async function cargarHistoricoSemanalRacV107(limiteSemanas) {
  if (typeof supabaseClientV94 === "undefined" || !supabaseClientV94) return [];
  const { data, error } = await supabaseClientV94
    .from("rac_snapshots_semanales")
    .select("semana_iso, filas")
    .order("semana_iso", { ascending: false })
    .limit(limiteSemanas || 12);
  if (error || !data) return [];
  return data.map(r => ({ semanaIso: r.semana_iso, filas: r.filas }));
}

function getSemanaIsoV107(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ------------------------------------------------------------
// Perfil RAC completo de un asesor: puntaje semanal, mensual,
// nivel (con histórico si existe), racha e insignias. Punto de
// entrada único que usa la UI.
// ------------------------------------------------------------
async function perfilRacAsesorV107(nombreAsesor) {
  const semanal = leaderboardSemanalV107().find(f => f.asesor === nombreAsesor) || null;
  const mensual = leaderboardMensualV107().find(f => f.asesor === nombreAsesor) || null;
  const historico = await cargarHistoricoSemanalRacV107(12);
  const racha = calcularRachaV107(nombreAsesor, historico);

  // Puntos acumulados históricos = suma de puntajes semanales
  // guardados. Si no hay histórico (primera semana usando el
  // módulo), el nivel arranca en Bronce con 0 puntos — no se infla.
  const puntosAcumulados = historico.reduce((s, semana) => {
    const f = semana.filas.find(x => x.asesor === nombreAsesor);
    return s + (f ? f.puntaje : 0);
  }, semanal ? semanal.puntaje : 0);

  const nivelInfo = nivelPorPuntosV107(puntosAcumulados);
  const insignias = calcularInsigniasV107(nombreAsesor, mensual);

  return {
    asesor: nombreAsesor,
    puntajeSemanal: semanal ? semanal.puntaje : 0,
    posicionSemanal: semanal ? semanal.posicion : null,
    puntajeMensual: mensual ? mensual.puntaje : 0,
    posicionMensual: mensual ? mensual.posicion : null,
    puntosAcumulados: Math.round(puntosAcumulados * 10) / 10,
    nivel: nivelInfo.nivel,
    siguienteNivel: nivelInfo.siguienteNivel,
    puntosParaSiguiente: nivelInfo.puntosParaSiguiente,
    racha,
    insignias,
    semanasConHistorico: historico.length,
  };
}
