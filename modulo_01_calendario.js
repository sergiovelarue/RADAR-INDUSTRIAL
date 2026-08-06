// ============================================================
// V107 — Calendario laboral colombiano (festivos + Semana Santa)
// ------------------------------------------------------------
// Base común para los Motores RTE, RED y EWS (ver documento
// "Radar_Comercial_B2B_Mejoras_Modelos.docx", sección 8).
// Cálculo algorítmico (Gauss/Meeus + Ley Emiliani), sin tabla
// estática que requiera mantenimiento anual. Sin dependencias
// externas: funciona en cualquier navegador sin librerías nuevas.
// ============================================================

// Algoritmo de Meeus/Jones/Butcher — Domingo de Pascua (calendario gregoriano).
// Validado contra fuentes oficiales colombianas: produce 2 de abril de 2026
// y 25 de marzo de 2027 para Jueves Santo (ver sección 8.1 del documento).
function domingoPascuaV107(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes - 1, dia);
}

function addDaysV107(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

// Ley 51 de 1983 (Ley Emiliani): traslada al lunes siguiente los
// festivos móviles que no caen ya en lunes.
function trasladarALunesV107(date) {
  const d = date.getDay();
  if (d === 1) return date;
  const suma = d === 0 ? 1 : 8 - d;
  return addDaysV107(date, suma);
}

// Cache simple por año: festivosColombiaV107 se llama muchas veces
// (una por día del mes en diasHabilesMesV107) y no cambia dentro
// de la misma sesión de navegador.
const _cacheFestivosV107 = {};

function festivosColombiaV107(year) {
  if (_cacheFestivosV107[year]) return _cacheFestivosV107[year];
  const pascua = domingoPascuaV107(year);

  // Festivos de fecha fija que NUNCA se trasladan.
  const fijos = [
    [0, 1],   // 1 enero - Año Nuevo
    [4, 1],   // 1 mayo - Día del Trabajo
    [6, 20],  // 20 julio - Independencia
    [7, 7],   // 7 agosto - Batalla de Boyacá
    [11, 8],  // 8 diciembre - Inmaculada Concepción
    [11, 25], // 25 diciembre - Navidad
  ].map(([m, d]) => new Date(year, m, d));

  // Festivos de fecha fija que SÍ se trasladan al lunes siguiente (Ley Emiliani).
  const moviles = [
    [0, 6],   // 6 enero - Reyes Magos
    [2, 19],  // 19 marzo - San José
    [5, 29],  // 29 junio - San Pedro y San Pablo
    [7, 15],  // 15 agosto - Asunción de la Virgen
    [9, 12],  // 12 octubre - Día de la Raza
    [10, 1],  // 1 noviembre - Todos los Santos
    [10, 11], // 11 noviembre - Independencia de Cartagena
  ].map(([m, d]) => trasladarALunesV107(new Date(year, m, d)));

  // Festivos ligados a la fecha de Pascua, también trasladables al lunes.
  const ligadosAPascua = [39, 60, 68] // Ascensión, Corpus Christi, Sagrado Corazón
    .map(n => trasladarALunesV107(addDaysV107(pascua, n)));

  // Jueves y Viernes Santo: festivos civiles móviles que NO se trasladan.
  const semanaSanta = [addDaysV107(pascua, -3), addDaysV107(pascua, -2)];

  const todos = [...fijos, ...moviles, ...ligadosAPascua, ...semanaSanta];
  // Deduplicar por fecha exacta: en años donde dos festivos móviles caen
  // en la misma fecha tras el traslado a lunes (coincidencia posible con
  // la Ley Emiliani), no deben contarse ni cruzarse dos veces en
  // diasHabilesMesV107 (restaría el mismo día hábil por duplicado).
  const vistos = new Set();
  const unicos = todos.filter(f => {
    const clave = `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  _cacheFestivosV107[year] = unicos;
  return unicos;
}

function esFestivoV107(date, festivosDelAno) {
  return festivosDelAno.some(f =>
    f.getFullYear() === date.getFullYear() &&
    f.getMonth() === date.getMonth() &&
    f.getDate() === date.getDate()
  );
}

// Total de días hábiles (L-V, sin festivos) de un mes. monthIndex: 0=enero.
function diasHabilesMesV107(year, monthIndex) {
  const festivos = festivosColombiaV107(year);
  const totalDias = new Date(year, monthIndex + 1, 0).getDate();
  let habiles = 0;
  for (let d = 1; d <= totalDias; d++) {
    const fecha = new Date(year, monthIndex, d);
    const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
    if (!esFinDeSemana && !esFestivoV107(fecha, festivos)) habiles++;
  }
  return habiles;
}

// Días hábiles transcurridos de un mes hasta una fecha dada (inclusive).
function diasHabilesTranscurridosV107(year, monthIndex, hastaFecha) {
  const festivos = festivosColombiaV107(year);
  let habiles = 0;
  for (let d = 1; d <= hastaFecha.getDate(); d++) {
    const fecha = new Date(year, monthIndex, d);
    const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
    if (!esFinDeSemana && !esFestivoV107(fecha, festivos)) habiles++;
  }
  return habiles;
}

// Días hábiles restantes del mes actual, contando desde hoy hasta fin de mes.
// Reemplaza a diasHabilesEntreV101/diasHabilesRestantesMesV101 (que hoy
// cuentan L-V calendario sin excluir festivos ni Semana Santa — ver
// comentario original en mejoras-v1.js: "No se descuentan festivos").
function diasHabilesRestantesMesV107() {
  const hoy = new Date();
  const year = hoy.getFullYear(), monthIndex = hoy.getMonth();
  const totalHabiles = diasHabilesMesV107(year, monthIndex);
  const transcurridosHastaAyer = diasHabilesTranscurridosV107(year, monthIndex, addDaysV107(hoy, -1));
  return Math.max(totalHabiles - transcurridosHastaAyer, 0);
}

// Índice de mes por nombre, consistente con monthsV812() de app.js.
function monthIndexV107(nombreMes) {
  const meses = typeof monthsV812 === "function"
    ? monthsV812()
    : ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  return meses.indexOf(nombreMes);
}
