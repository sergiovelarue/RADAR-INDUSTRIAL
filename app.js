
const DATA=window.RADAR_DATA;let state={businessView:"total",advisor:"todos",type:"todos",status:"todos",search:""};const $=id=>document.getElementById(id);const money=v=>"$"+Number(v||0).toLocaleString("es-CO",{maximumFractionDigits:1})+" MM";const pct=v=>`${Math.round(v||0)}%`;const cleanNit=v=>String(v||"").replace(/\s+/g,"").trim();
function init(){restoreLocal();fillAdvisorFilter();bindEvents();render()}
function fillAdvisorFilter(){const s=$("advisorFilter");s.innerHTML=`<option value="todos">Todos</option><option value="SIN ASIGNACION">Sin asignación</option>`;DATA.meta.asesores.forEach(a=>{const o=document.createElement("option");o.value=a;o.textContent=a;s.appendChild(o)})}
function saleCurrent(c){return state.businessView==="espumas"?Number(c.ventaEspumasActual||0):state.businessView==="colchones"?Number(c.ventaColchonesActual||0):Number(c.ventaMesActual||0)}
function salePrev(c){return state.businessView==="espumas"?Number(c.ventaEspumas2025Mes||0):state.businessView==="colchones"?Number(c.ventaColchones2025Mes||0):Number(c.ventaMismoMesAnterior||0)}
function typeBelongs(c){if(state.businessView==="total")return true;if(state.businessView==="espumas")return c.tipoCliente==="Espumas"||c.tipoCliente==="Mixto"||Number(c.ventaEspumasActual||0)>0||Number(c.totalEspumas2025||0)>0;if(state.businessView==="colchones")return c.tipoCliente==="Colchones"||c.tipoCliente==="Mixto"||Number(c.ventaColchonesActual||0)>0||Number(c.totalColchones2025||0)>0;return true}
function goal(c){return Number(c.metaAsesor||c.metaSugerida||0)}function compliance(c){return goal(c)?saleCurrent(c)/goal(c)*100:0}function missing(c){return Math.max(goal(c)-saleCurrent(c),0)}function sem(c){let x=compliance(c);return x>=100?"green":(x>=80||(salePrev(c)>0&&saleCurrent(c)>=salePrev(c)))?"yellow":"red"}function tClass(t){return t==="Espumas"?"espumas":t==="Colchones"?"colchones":t==="Mixto"?"mixto":"nuevo"}function tIcon(t){return t==="Espumas"?"🟦":t==="Colchones"?"🟪":t==="Mixto"?"🟩":"⬜"}
function filteredBase(){const q=state.search.toLowerCase().trim();return DATA.clientes.filter(c=>{if(!typeBelongs(c))return false;if(state.advisor!=="todos"&&c.asesorAsignado!==state.advisor)return false;if(state.type!=="todos"&&c.tipoCliente!==state.type)return false;if(state.status!=="todos"&&c.estado!==state.status)return false;if(q&&![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente].join(" ").toLowerCase().includes(q))return false;return true})}
function businessLabel(){return state.businessView==="espumas"?"Solo Espumas":state.businessView==="colchones"?"Solo Colchones":"Total Radar"}
function render(){document.body.classList.toggle("view-espumas",state.businessView==="espumas");document.body.classList.toggle("view-colchones",state.businessView==="colchones");document.body.classList.toggle("view-total",state.businessView==="total");const arr=filteredBase();renderKpis(arr);renderTypeSummary();renderTable(arr);$("contextLabel").textContent=`Vista: ${businessLabel()} · Base maestra: ${DATA.meta.baseMaestraUpdatedAt} · Ventas: ${DATA.meta.ventasOperativasUpdatedAt}`}
function renderKpis(arr){const venta=arr.reduce((s,c)=>s+saleCurrent(c),0),prev=arr.reduce((s,c)=>s+salePrev(c),0),meta=arr.reduce((s,c)=>s+goal(c),0),falt=Math.max(meta-venta,0);$("kClients").textContent=arr.length.toLocaleString("es-CO");$("kCurrentSale").textContent=money(venta);$("kPrevSale").textContent=money(prev);$("kGoal").textContent=money(meta);$("kCompliance").textContent=meta?pct(venta/meta*100):"0%";$("kMissing").textContent=money(falt);$("kClientsSub").textContent=businessLabel();$("kCurrentSaleSub").textContent=DATA.meta.currentMonthName;const base=filteredBase();$("bEspActual").textContent=money(base.reduce((s,c)=>s+Number(c.ventaEspumasActual||0),0));$("bColActual").textContent=money(base.reduce((s,c)=>s+Number(c.ventaColchonesActual||0),0));$("bEsp2025").textContent="2025: "+money(base.reduce((s,c)=>s+Number(c.ventaEspumas2025Mes||0),0));$("bCol2025").textContent="2025: "+money(base.reduce((s,c)=>s+Number(c.ventaColchones2025Mes||0),0))}
function renderTypeSummary(){const base=DATA.clientes.filter(c=>typeBelongs(c)&&(state.advisor==="todos"||c.asesorAsignado===state.advisor));const count=t=>base.filter(c=>c.tipoCliente===t).length;$("tEspumas").textContent=count("Espumas");$("tColchones").textContent=count("Colchones");$("tMixto").textContent=count("Mixto");$("tNuevo").textContent=count("Nuevo");document.querySelectorAll("[data-type-card]").forEach(card=>card.classList.toggle("active",state.type===card.dataset.typeCard))}
function renderTable(arr){const tb=$("routeBody");tb.innerHTML="";$("rowCount").textContent=`${arr.length.toLocaleString("es-CO")} clientes`;arr.sort((a,b)=>salePrev(b)-salePrev(a));arr.forEach(c=>{const tr=document.createElement("tr");tr.className=sem(c);tr.innerHTML=`<td data-label="Cliente"><span class="client-main" title="${esc(c.cliente)}">${esc(c.cliente)}</span><span class="client-location">${esc([c.ciudad,c.departamento].filter(Boolean).join(" · "))}</span></td><td data-label="NIT" title="${esc(c.nit)}">${esc(c.nit)}</td><td data-label="Tipo"><span class="badge ${tClass(c.tipoCliente)}">${tIcon(c.tipoCliente)} ${c.tipoCliente}</span></td><td data-label="Asesor">${esc(c.asesorAsignado)}</td><td data-label="Estado"><span class="status">${esc(c.estado)}</span></td><td data-label="Venta 2025">${money(salePrev(c))}</td><td data-label="Venta actual">${money(saleCurrent(c))}</td><td data-label="Meta">${money(goal(c))}</td><td data-label="Cump.">${pct(compliance(c))}</td><td data-label="Faltante">${money(missing(c))}</td>`;tb.appendChild(tr)})}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function bindEvents(){$("businessView").onchange=e=>{state.businessView=e.target.value;render()};$("advisorFilter").onchange=e=>{state.advisor=e.target.value;render()};$("typeFilter").onchange=e=>{state.type=e.target.value;render()};$("statusFilter").onchange=e=>{state.status=e.target.value;render()};$("searchInput").oninput=e=>{state.search=e.target.value;render()};document.querySelectorAll("[data-type-card]").forEach(card=>card.onclick=()=>{state.type=state.type===card.dataset.typeCard?"todos":card.dataset.typeCard;$("typeFilter").value=state.type;render()});$("validateBtn").onclick=validateDailyFiles;$("applyBtn").onclick=applyDailyFiles;$("clearLocalBtn").onclick=()=>{localStorage.removeItem("radarV8Data");alert("Actualización local eliminada. Recarga la página para volver a la base inicial del ZIP.")};$("exportCsvBtn").onclick=exportCsv}
async function readWorkbook(id){const input=$(id);if(!input.files.length)return{rows:[],fileName:"No cargado"};const file=input.files[0],buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array"}),sh=wb.Sheets[wb.SheetNames[0]];return{rows:XLSX.utils.sheet_to_json(sh,{defval:0}),fileName:file.name}}
function parseSalesRows(rows){const map=new Map();rows.forEach(row=>{const keys=Object.keys(row),nitKey=keys.find(k=>{const x=String(k).toLowerCase().trim();return x==="nit"||x==="mes"||x==="unnamed: 0"||x==="__empty"||x.includes("nit")})||keys[0],nit=cleanNit(row[nitKey]);if(!nit||nit.toLowerCase()==="total")return;const months={};let total=0;["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].forEach(m=>{const key=keys.find(k=>String(k).trim().toLowerCase()===m.toLowerCase()),v=key?toNumber(row[key]):0;months[m]=v;total+=v});const tk=keys.find(k=>String(k).trim().toLowerCase()==="total");if(tk)total=toNumber(row[tk]);map.set(nit,{months,total})});return map}
function toNumber(v){if(v==null||v==="")return 0;if(typeof v==="number")return v;let s=String(v).replace(/\$/g,"").replace(/\s/g,"");if(s.includes(",")&&s.includes("."))s=s.lastIndexOf(",")>s.lastIndexOf(".")?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(s.includes(","))s=s.replace(",",".");const n=Number(s);return Number.isFinite(n)?n:0}
async function validateDailyFiles(){const r=$("updateResult");try{const esp=await readWorkbook("fileEspumas"),col=await readWorkbook("fileColchones"),em=parseSalesRows(esp.rows),cm=parseSalesRows(col.rows),month=DATA.meta.currentMonthName,ev=[...em.values()].reduce((s,x)=>s+(x.months[month]||0),0),cv=[...cm.values()].reduce((s,x)=>s+(x.months[month]||0),0);r.className="update-result ok";r.innerHTML=`<strong>Validación correcta:</strong><div class="summary-grid"><article><span>Registros Espumas</span><strong>${esp.rows.length}</strong></article><article><span>Registros Colchones</span><strong>${col.rows.length}</strong></article><article><span>Venta Espumas ${month}</span><strong>${money(ev)}</strong></article><article><span>Venta Colchones ${month}</span><strong>${money(cv)}</strong></article></div><p>${esp.fileName} · ${col.fileName}</p>`}catch(err){r.className="update-result error";r.innerHTML=`<strong>Error:</strong> ${err.message}`}}
async function applyDailyFiles(){const r=$("updateResult");try{const esp=await readWorkbook("fileEspumas"),col=await readWorkbook("fileColchones"),em=parseSalesRows(esp.rows),cm=parseSalesRows(col.rows),month=DATA.meta.currentMonthName;let updated=0;DATA.clientes.forEach(c=>{const nit=cleanNit(c.nit),ev=em.get(nit)||{months:{},total:0},cv=cm.get(nit)||{months:{},total:0};c.ventaEspumasActual=Number(ev.months[month]||0);c.ventaColchonesActual=Number(cv.months[month]||0);c.ventaMesActual=c.ventaEspumasActual+c.ventaColchonesActual;c.totalEspumas2026=Number(ev.total||0);c.totalColchones2026=Number(cv.total||0);c.total2026=c.totalEspumas2026+c.totalColchones2026;if(em.has(nit)||cm.has(nit))updated++});DATA.meta.ventasOperativasUpdatedAt=new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"});localStorage.setItem("radarV8Data",JSON.stringify(DATA));r.className="update-result ok";r.innerHTML=`<strong>Actualización aplicada:</strong> ${updated} clientes actualizados. La base maestra y el histórico 2025 no cambiaron.`;render()}catch(err){r.className="update-result error";r.innerHTML=`<strong>Error:</strong> ${err.message}`}}
function restoreLocal(){const saved=localStorage.getItem("radarV8Data");if(!saved)return;try{const p=JSON.parse(saved);DATA.clientes=p.clientes||DATA.clientes;DATA.meta=p.meta||DATA.meta}catch(e){}}
function exportCsv(){const arr=filteredBase(),rows=[["Cliente","NIT","Tipo","Asesor","Estado","Venta 2025","Venta actual","Meta","Cumplimiento","Faltante"]];arr.forEach(c=>rows.push([c.cliente,c.nit,c.tipoCliente,c.asesorAsignado,c.estado,salePrev(c),saleCurrent(c),goal(c),Math.round(compliance(c)),missing(c)]));const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"),blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="radar_v8_hoja_ruta.csv";document.body.appendChild(a);a.click();document.body.removeChild(a)}
document.addEventListener("DOMContentLoaded",init);


// ===============================
// V8.1 - Perfil, mes, orden y detalle
// ===============================
state.profile = "admin";
state.month = DATA.meta.currentMonthName || "Mayo";
state.sort = "venta2025";
let activeClientNit = null;

function fillProfileSelectV81(){
  const sel = $("profileSelect");
  if(!sel || sel.dataset.ready) return;
  DATA.meta.asesores.forEach(a => {
    const op = document.createElement("option");
    op.value = a;
    op.textContent = "Asesor · " + a;
    sel.appendChild(op);
  });
  sel.value = "admin";
  sel.dataset.ready = "true";
}

function saleCurrentMonthV81(c){
  if(state.businessView === "espumas") return Number(c.ventaEspumasActual || 0);
  if(state.businessView === "colchones") return Number(c.ventaColchonesActual || 0);
  return Number(c.ventaMesActual || 0);
}

function salePrevMonthV81(c){
  if(state.month !== DATA.meta.currentMonthName){
    if(state.businessView === "espumas") return Number(c.totalEspumas2025 || 0) / 12;
    if(state.businessView === "colchones") return Number(c.totalColchones2025 || 0) / 12;
    return Number(c.total2025 || 0) / 12;
  }

  if(state.businessView === "espumas") return Number(c.ventaEspumas2025Mes || 0);
  if(state.businessView === "colchones") return Number(c.ventaColchones2025Mes || 0);
  return Number(c.ventaMismoMesAnterior || 0);
}

saleCurrent = saleCurrentMonthV81;
salePrev = salePrevMonthV81;

filteredBase = function(){
  const q = state.search.toLowerCase().trim();
  return DATA.clientes.filter(c => {
    if(!typeBelongs(c)) return false;

    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;

    if(state.type !== "todos" && c.tipoCliente !== state.type) return false;
    if(state.status !== "todos" && c.estado !== state.status) return false;

    if(q && ![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
};

function sortRowsV81(arr){
  const sort = state.sort || "venta2025";
  return arr.sort((a,b)=>{
    if(sort === "faltante") return missing(b) - missing(a);
    if(sort === "ventaActual") return saleCurrent(b) - saleCurrent(a);
    if(sort === "cumplimientoAsc") return compliance(a) - compliance(b);
    if(sort === "cliente") return String(a.cliente).localeCompare(String(b.cliente));
    return salePrev(b) - salePrev(a);
  });
}

renderTable = function(arr){
  const tbody = $("routeBody");
  tbody.innerHTML = "";
  $("rowCount").textContent = `${arr.length.toLocaleString("es-CO")} clientes`;
  sortRowsV81(arr).forEach(c => {
    const tr = document.createElement("tr");
    tr.className = sem(c);
    tr.innerHTML = `
      <td data-label="Cliente">
        <span class="client-main" title="${esc(c.cliente)}">${esc(c.cliente)}</span>
        <span class="client-location">${esc([c.ciudad,c.departamento].filter(Boolean).join(" · "))}</span>
      </td>
      <td data-label="NIT" title="${esc(c.nit)}">${esc(c.nit)}</td>
      <td data-label="Tipo"><span class="badge ${tClass(c.tipoCliente)}">${tIcon(c.tipoCliente)} ${c.tipoCliente}</span></td>
      <td data-label="Asesor">${esc(c.asesorAsignado)}</td>
      <td data-label="Estado"><span class="status">${esc(c.estado)}</span></td>
      <td data-label="Venta 2025">${money(salePrev(c))}</td>
      <td data-label="Venta actual">${money(saleCurrent(c))}</td>
      <td data-label="Meta">${money(goal(c))}</td>
      <td data-label="Cump.">${pct(compliance(c))}</td>
      <td data-label="Faltante">${money(missing(c))}</td>
      <td data-label="Detalle"><button class="detail-btn" data-detail-nit="${esc(c.nit)}">Ver</button></td>
    `;
    tbody.appendChild(tr);
  });
};

function applyProfileUiV81(){
  const isAdmin = state.profile === "admin";
  const advisorWrapper = $("advisorFilter")?.closest("div");
  if(advisorWrapper) advisorWrapper.style.display = isAdmin ? "" : "none";
  const panel = $("dailyUpdatePanel");
  if(panel) panel.classList.toggle("hidden-by-profile", !isAdmin);
}

const previousRenderV81 = render;
render = function(){
  previousRenderV81();
  applyProfileUiV81();
  if($("monthSelect")) $("monthSelect").value = state.month;
  if($("sortSelect")) $("sortSelect").value = state.sort;
  if($("profileSelect")) $("profileSelect").value = state.profile;
};

function openClientDetailV81(nit){
  activeClientNit = cleanNit(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
  if(!c) return;

  $("modalClientName").textContent = c.cliente;
  $("modalClientMeta").textContent = `${c.nit} · ${[c.ciudad,c.departamento].filter(Boolean).join(" · ")}`;
  $("modalTipo").textContent = c.tipoCliente;
  $("modalAsesor").textContent = c.asesorAsignado;
  $("modalVenta2025").textContent = money(salePrev(c));
  $("modalVentaActual").textContent = money(saleCurrent(c));
  $("modalMeta").textContent = money(goal(c));
  $("modalCumplimiento").textContent = pct(compliance(c));
  $("modalMetaInput").value = Number(c.metaAsesor || c.metaSugerida || 0).toFixed(1);
  $("modalAccion").value = c.proximaAccion || "";
  $("modalFecha").value = c.fechaSeguimiento || "";
  $("modalComentario").value = c.comentario || "";
  $("clientModal").classList.add("open");
}

function closeClientDetailV81(){
  $("clientModal").classList.remove("open");
  activeClientNit = null;
}

function saveClientDetailV81(){
  if(!activeClientNit) return;
  const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
  if(!c) return;
  c.metaAsesor = Number($("modalMetaInput").value || c.metaSugerida || 0);
  c.proximaAccion = $("modalAccion").value;
  c.fechaSeguimiento = $("modalFecha").value;
  c.comentario = $("modalComentario").value;
  localStorage.setItem("radarV8Data", JSON.stringify(DATA));
  closeClientDetailV81();
  render();
}

const previousBindEventsV81 = bindEvents;
bindEvents = function(){
  previousBindEventsV81();
  fillProfileSelectV81();

  $("profileSelect").addEventListener("change", e => {
    state.profile = e.target.value;
    if(state.profile !== "admin") state.advisor = "todos";
    render();
  });

  $("monthSelect").addEventListener("change", e => {
    state.month = e.target.value;
    render();
  });

  $("sortSelect").addEventListener("change", e => {
    state.sort = e.target.value;
    render();
  });

  document.addEventListener("click", e => {
    if(e.target && e.target.dataset && e.target.dataset.detailNit){
      openClientDetailV81(e.target.dataset.detailNit);
    }
  });

  $("modalCloseBtn").addEventListener("click", closeClientDetailV81);
  $("clientModal").addEventListener("click", e => {
    if(e.target.id === "clientModal") closeClientDetailV81();
  });
  $("modalSaveBtn").addEventListener("click", saveClientDetailV81);
};


// ===============================
// V8.2 - Crecimiento por clasificación + detalle ampliado
// ===============================
function getGrowthConfigV82(){
  const saved = localStorage.getItem("radarGrowthConfigV82");
  if(saved){
    try { return JSON.parse(saved); } catch(e){}
  }
  return DATA.meta.growthByClass || {A:12,B:10,C:5,E:15,N:0};
}

function setGrowthInputsV82(){
  const cfg = getGrowthConfigV82();
  if($("growthA")) $("growthA").value = cfg.A ?? 12;
  if($("growthB")) $("growthB").value = cfg.B ?? 10;
  if($("growthC")) $("growthC").value = cfg.C ?? 5;
  if($("growthE")) $("growthE").value = cfg.E ?? 15;
  if($("growthN")) $("growthN").value = cfg.N ?? 0;
}

function recalcGoalsV82(){
  const cfg = getGrowthConfigV82();
  DATA.clientes.forEach(c => {
    const growth = Number(cfg[c.clasificacion] ?? 0);
    const base = Number(salePrev(c) || c.ventaMismoMesAnterior || 0);
    c.metaSugerida = base * (1 + growth/100);
    if(!c.metaAsesor || Number(c.metaAsesor) === 0) c.metaAsesor = c.metaSugerida;
  });
}

function applyGrowthConfigV82(){
  const cfg = {
    A: Number($("growthA").value || 0),
    B: Number($("growthB").value || 0),
    C: Number($("growthC").value || 0),
    E: Number($("growthE").value || 0),
    N: Number($("growthN").value || 0)
  };
  localStorage.setItem("radarGrowthConfigV82", JSON.stringify(cfg));
  DATA.meta.growthByClass = cfg;
  recalcGoalsV82();
  localStorage.setItem("radarV8Data", JSON.stringify(DATA));
  alert("Crecimientos aplicados y metas recalculadas.");
  render();
}

const previousApplyProfileUiV82 = applyProfileUiV81;
applyProfileUiV81 = function(){
  previousApplyProfileUiV82();
  const isAdmin = state.profile === "admin";
  const panel = $("growthConfigPanel");
  if(panel) panel.classList.toggle("hidden-by-profile", !isAdmin);
};

const previousOpenClientDetailV82 = openClientDetailV81;
openClientDetailV81 = function(nit){
  previousOpenClientDetailV82(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;
  if($("modalProm2025")) $("modalProm2025").textContent = money(c.promedioAnioAnterior || 0);
  if($("modalProm2026")) $("modalProm2026").textContent = money(c.promedioAnioActual || 0);
  if($("modalMeses2025")) $("modalMeses2025").textContent = `${c.mesesCompraAnioAnterior || c.mesesCompra2025 || 0} / 12`;
  if($("modalMeses2026")) $("modalMeses2026").textContent = `${c.mesesCompraAnioActual || 0} / ${c.mesesCorridosAnioActual || 5}`;
  if($("modalFaltante")) $("modalFaltante").textContent = money(missing(c));
  if($("modalClasificacion")) $("modalClasificacion").textContent = c.clasificacion || "";
  if($("modalEstado")) $("modalEstado").textContent = c.estado || "";
};

const previousBindEventsV82 = bindEvents;
bindEvents = function(){
  previousBindEventsV82();
  setGrowthInputsV82();
  if($("applyGrowthBtn")) $("applyGrowthBtn").addEventListener("click", applyGrowthConfigV82);
};

recalcGoalsV82();


// ===============================
// V8.3 - Cálculo mensual real por mes seleccionado
// ===============================
const RADAR_MONTHS_V83 = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function selectedMonthV83(){
  return state.month || DATA.meta.currentMonthName || "Mayo";
}

function monthIndexV83(month){
  return RADAR_MONTHS_V83.indexOf(month);
}

function latestOperationalMonthV83(){
  return DATA.meta.latestOperationalMonth2026 || DATA.meta.currentMonthName || "Mayo";
}

function isMonthAvailable2026V83(month){
  return monthIndexV83(month) <= monthIndexV83(latestOperationalMonthV83());
}

function monthValueV83(obj, month){
  return Number((obj && obj[month]) || 0);
}

saleCurrent = function(c){
  const month = selectedMonthV83();

  // Si el archivo operativo 2026 no trae ese mes todavía, venta actual debe ser cero.
  if(!isMonthAvailable2026V83(month)) return 0;

  if(state.businessView === "espumas") return monthValueV83(c.ventas2026EspumasPorMes, month);
  if(state.businessView === "colchones") return monthValueV83(c.ventas2026ColchonesPorMes, month);

  return monthValueV83(c.ventas2026EspumasPorMes, month) + monthValueV83(c.ventas2026ColchonesPorMes, month);
};

salePrev = function(c){
  const month = selectedMonthV83();

  if(state.businessView === "espumas") return monthValueV83(c.ventas2025EspumasPorMes, month);
  if(state.businessView === "colchones") return monthValueV83(c.ventas2025ColchonesPorMes, month);

  return monthValueV83(c.ventas2025EspumasPorMes, month) + monthValueV83(c.ventas2025ColchonesPorMes, month);
};

function suggestedGoalV83(c){
  const cfg = typeof getGrowthConfigV82 === "function"
    ? getGrowthConfigV82()
    : (DATA.meta.growthByClass || {A:12,B:10,C:5,E:15,N:0});

  const growth = Number(cfg[c.clasificacion] ?? 0);
  return salePrev(c) * (1 + growth / 100);
}

goal = function(c){
  const month = selectedMonthV83();
  if(c.metasAsesorPorMes && c.metasAsesorPorMes[month] !== undefined && c.metasAsesorPorMes[month] !== null && c.metasAsesorPorMes[month] !== ""){
    return Number(c.metasAsesorPorMes[month] || 0);
  }
  return suggestedGoalV83(c);
};

function updateMonthContextV83(){
  const month = selectedMonthV83();
  const help = $("monthHelpV83");
  if(help){
    help.textContent = isMonthAvailable2026V83(month)
      ? `Usando venta real 2026 de ${month}`
      : `${month} aún no existe en ventas 2026: venta actual = 0; base 2025 activa`;
  }
}

function availableMonthsCountV83(){
  return Math.max(1, monthIndexV83(latestOperationalMonthV83()) + 1);
}

function recalcClientAveragesV83(c){
  const lastIdx = monthIndexV83(latestOperationalMonthV83());
  let total2026 = 0;
  let mesesCompra2026 = 0;

  RADAR_MONTHS_V83.slice(0, lastIdx + 1).forEach(m => {
    const v = monthValueV83(c.ventas2026EspumasPorMes, m) + monthValueV83(c.ventas2026ColchonesPorMes, m);
    total2026 += v;
    if(Math.abs(v) > 0) mesesCompra2026++;
  });

  c.promedioAnioActual = total2026 / Math.max(1, lastIdx + 1);
  c.mesesCompraAnioActual = mesesCompra2026;
  c.mesesCorridosAnioActual = Math.max(1, lastIdx + 1);
}

const previousRenderV83 = render;
render = function(){
  DATA.clientes.forEach(recalcClientAveragesV83);
  previousRenderV83();
  updateMonthContextV83();

  const label = $("contextLabel");
  if(label){
    const month = selectedMonthV83();
    const note = isMonthAvailable2026V83(month) ? "" : " · Mes futuro sin venta 2026";
    label.textContent = `Vista: ${businessLabel()} · Mes: ${month}${note} · Ventas actualizadas hasta ${latestOperationalMonthV83()}`;
  }
};

const previousOpenClientDetailV83 = openClientDetailV81;
openClientDetailV81 = function(nit){
  previousOpenClientDetailV83(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;
  if($("modalVenta2025")) $("modalVenta2025").textContent = money(salePrev(c));
  if($("modalVentaActual")) $("modalVentaActual").textContent = money(saleCurrent(c));
  if($("modalMeta")) $("modalMeta").textContent = money(goal(c));
  if($("modalCumplimiento")) $("modalCumplimiento").textContent = pct(compliance(c));
  if($("modalFaltante")) $("modalFaltante").textContent = money(missing(c));
  if($("modalMetaInput")) $("modalMetaInput").value = Number(goal(c) || 0).toFixed(1);
};

const previousSaveClientDetailV83 = saveClientDetailV81;
saveClientDetailV81 = function(){
  if(!activeClientNit) return;
  const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
  if(!c) return;

  c.metasAsesorPorMes = c.metasAsesorPorMes || {};
  c.metasAsesorPorMes[selectedMonthV83()] = Number($("modalMetaInput").value || 0);
  c.proximaAccion = $("modalAccion").value;
  c.fechaSeguimiento = $("modalFecha").value;
  c.comentario = $("modalComentario").value;

  localStorage.setItem("radarV8Data", JSON.stringify(DATA));
  closeClientDetailV81();
  render();
};

function parseSalesRowsMonthlyV83(rows){
  const map = new Map();
  rows.forEach(row => {
    const keys = Object.keys(row);
    const nitKey = keys.find(k => {
      const x = String(k).toLowerCase().trim();
      return x === "nit" || x === "mes" || x === "unnamed: 0" || x === "__empty" || x.includes("nit");
    }) || keys[0];

    const nit = cleanNit(row[nitKey]);
    if(!nit || nit.toLowerCase() === "total") return;

    const months = {};
    RADAR_MONTHS_V83.forEach(m => {
      const key = keys.find(k => String(k).trim().toLowerCase() === m.toLowerCase());
      months[m] = key ? toNumber(row[key]) : 0;
    });
    map.set(nit, months);
  });
  return map;
}

// Sobrescribe actualización diaria para guardar valores por mes, no solo el mes actual.
applyDailyFiles = async function(){
  const r = $("updateResult");
  try{
    const esp = await readWorkbook("fileEspumas");
    const col = await readWorkbook("fileColchones");

    const em = parseSalesRowsMonthlyV83(esp.rows);
    const cm = parseSalesRowsMonthlyV83(col.rows);

    let updated = 0;
    let latestIdx = -1;

    DATA.clientes.forEach(c => {
      const nit = cleanNit(c.nit);
      const ev = em.get(nit) || {};
      const cv = cm.get(nit) || {};

      c.ventas2026EspumasPorMes = c.ventas2026EspumasPorMes || {};
      c.ventas2026ColchonesPorMes = c.ventas2026ColchonesPorMes || {};

      RADAR_MONTHS_V83.forEach((m, idx) => {
        c.ventas2026EspumasPorMes[m] = Number(ev[m] || 0);
        c.ventas2026ColchonesPorMes[m] = Number(cv[m] || 0);
        if(Math.abs(Number(ev[m] || 0)) > 0 || Math.abs(Number(cv[m] || 0)) > 0) latestIdx = Math.max(latestIdx, idx);
      });

      if(em.has(nit) || cm.has(nit)) updated++;
    });

    if(latestIdx >= 0){
      DATA.meta.latestOperationalMonth2026 = RADAR_MONTHS_V83[latestIdx];
      DATA.meta.currentMonthName = RADAR_MONTHS_V83[latestIdx];
      state.month = DATA.meta.currentMonthName;
    }

    DATA.meta.ventasOperativasUpdatedAt = new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"});
    localStorage.setItem("radarV8Data", JSON.stringify(DATA));

    r.className = "update-result ok";
    r.innerHTML = `<strong>Actualización aplicada:</strong> ${updated} clientes actualizados. Ventas disponibles hasta ${DATA.meta.latestOperationalMonth2026}. La base maestra y el histórico 2025 no cambiaron.`;

    render();
  }catch(err){
    r.className = "update-result error";
    r.innerHTML = `<strong>Error:</strong> ${err.message}`;
  }
};

// Validación también calcula el último mes disponible
validateDailyFiles = async function(){
  const r = $("updateResult");
  try{
    const esp = await readWorkbook("fileEspumas");
    const col = await readWorkbook("fileColchones");
    const em = parseSalesRowsMonthlyV83(esp.rows);
    const cm = parseSalesRowsMonthlyV83(col.rows);

    let latestIdx = -1;
    RADAR_MONTHS_V83.forEach((m, idx) => {
      const total = [...em.values()].reduce((s,x)=>s+Number(x[m]||0),0) + [...cm.values()].reduce((s,x)=>s+Number(x[m]||0),0);
      if(Math.abs(total) > 0) latestIdx = idx;
    });

    const latest = latestIdx >= 0 ? RADAR_MONTHS_V83[latestIdx] : "Sin ventas";
    const current = selectedMonthV83();
    const espCurrent = [...em.values()].reduce((s,x)=>s+Number(x[current]||0),0);
    const colCurrent = [...cm.values()].reduce((s,x)=>s+Number(x[current]||0),0);

    r.className = "update-result ok";
    r.innerHTML = `<strong>Validación correcta:</strong>
      <div class="summary-grid">
        <article><span>Registros Espumas</span><strong>${esp.rows.length}</strong></article>
        <article><span>Último mes con ventas</span><strong>${latest}</strong></article>
        <article><span>Venta Espumas ${current}</span><strong>${money(espCurrent)}</strong></article>
      </div>
      <p>${esp.fileName}</p>`;
  }catch(err){
    r.className = "update-result error";
    r.innerHTML = `<strong>Error:</strong> ${err.message}`;
  }
};


// ===============================
// V8.4 - Login, perfiles y log de acceso
// V9.2 - Acceso abierto por asesor (rebrand ConAccion)
// V1.1 - Tres perfiles: Asesor / Administrador / Super Administrador
// ===============================
const ADMIN_EMAIL_V92 = "sergiovelasquez@me.com"; // Super Administrador fijo
const BLOCKED_DOMAIN_V92 = "@comodisimos.com";

function advisorEmailMapV92Get(){
  try { return JSON.parse(localStorage.getItem("radarAdvisorEmailMapV92") || "{}"); }
  catch(e){ return {}; }
}
function advisorEmailMapV92Save(map){
  localStorage.setItem("radarAdvisorEmailMapV92", JSON.stringify(map));
}
function isBlockedDomainV92(email){
  return String(email || "").trim().toLowerCase().endsWith(BLOCKED_DOMAIN_V92);
}

// Resuelve el usuario a partir del correo y, si es primer ingreso, del rol elegido.
// - Bloquea el dominio @comodisimos.com.
// - sergiovelasquez@me.com es el único Super Administrador (fijo, no se puede elegir).
// - Cualquier otro correo, en su primer ingreso, elige "Asesor" (y a qué asesor
//   corresponde) o "Administrador". Esa elección queda guardada localmente para
//   los siguientes ingresos desde ese correo.
// tier: "superadmin" | "admin" | "advisor" — usado para permisos finos.
// profile: "admin" | "advisor" — se mantiene así por compatibilidad con la lógica
//   existente de visibilidad (Administrador y Super Administrador ven todo).
function resolveUserV93(email, chosenAdvisor, chosenRole){
  email = String(email || "").trim().toLowerCase();
  if(isBlockedDomainV92(email)) return { blocked: true };

  if(email === ADMIN_EMAIL_V92){
    return { user: { profile: "admin", tier: "superadmin", advisor: "SUPER ADMINISTRADOR", name: "SERGIO VELÁSQUEZ" } };
  }

  const map = advisorEmailMapV92Get();
  let entry = map[email];

  if(!entry){
    if(chosenRole === "administrador"){
      entry = { role: "administrador" };
      map[email] = entry;
      advisorEmailMapV92Save(map);
    } else if(chosenAdvisor){
      entry = { role: "advisor", advisor: chosenAdvisor };
      map[email] = entry;
      advisorEmailMapV92Save(map);
    }
  }

  if(!entry) return { needsSelection: true };

  if(entry.role === "administrador"){
    const label = email.split("@")[0].replace(/[._]+/g, " ").trim().toUpperCase();
    return { user: { profile: "admin", tier: "admin", advisor: "ADMINISTRADOR", name: label || "ADMINISTRADOR" } };
  }

  return { user: { profile: "advisor", tier: "advisor", advisor: entry.advisor, name: entry.advisor } };
}

function isSuperAdminV93(){
  return typeof currentUserV84 !== "undefined" && !!currentUserV84 && currentUserV84.tier === "superadmin";
}

let currentUserV84 = null;

function validEmailV84(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
}

function validPhoneV84(phone){
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length === 10;
}

function getAccessLogsV84(){
  try { return JSON.parse(localStorage.getItem("radarAccessLogsV84") || "[]"); }
  catch(e){ return []; }
}

function saveAccessLogsV84(logs){
  localStorage.setItem("radarAccessLogsV84", JSON.stringify(logs));
}

function logAccessV84(user, phone){
  const now = new Date();
  const logs = getAccessLogsV84();
  logs.push({
    timestamp: now.toISOString(),
    fecha: now.toLocaleDateString("es-CO"),
    hora: now.toLocaleTimeString("es-CO"),
    email: user.email,
    nombre: user.name,
    perfil: user.tier === "superadmin" ? "Super Administrador" : (user.profile === "admin" ? "Administrador" : "Asesor"),
    asesor: user.advisor,
    telefono: String(phone || "").replace(/\D/g, "")
  });
  saveAccessLogsV84(logs);
}

function setSessionV84(user, phone, remember){
  currentUserV84 = { ...user, phone: String(phone || "").replace(/\D/g, "") };
  if(remember){
    localStorage.setItem("radarSessionV84", JSON.stringify(currentUserV84));
  } else {
    sessionStorage.setItem("radarSessionV84", JSON.stringify(currentUserV84));
  }
}

function getSessionV84(){
  try {
    return JSON.parse(localStorage.getItem("radarSessionV84") || sessionStorage.getItem("radarSessionV84") || "null");
  } catch(e){ return null; }
}

function clearSessionV84(){
  localStorage.removeItem("radarSessionV84");
  sessionStorage.removeItem("radarSessionV84");
  currentUserV84 = null;
}

function applyUserProfileV84(){
  if(!currentUserV84) return;

  if(currentUserV84.profile === "admin"){
    state.profile = "admin";
    state.advisor = "todos";
  } else {
    state.profile = currentUserV84.advisor;
    state.advisor = "todos";
  }

  const profileSelect = $("profileSelect");
  if(profileSelect){
    profileSelect.value = state.profile;
    const wrapper = profileSelect.closest("div");
    if(wrapper) wrapper.classList.add("profile-hidden");
  }

  const advisorWrapper = $("advisorFilter")?.closest("div");
  if(advisorWrapper){
    advisorWrapper.style.display = currentUserV84.profile === "admin" ? "" : "none";
  }

  const login = $("loginOverlay");
  if(login) login.classList.add("hidden");
}

function attemptLoginV84(){
  const email = String($("loginEmail").value || "").trim().toLowerCase();
  const phone = String($("loginPhone").value || "").trim();
  const remember = $("rememberSession").checked;
  const error = $("loginError");
  error.textContent = "";

  if(!validEmailV84(email)){
    error.textContent = "Ingresa un correo válido.";
    return;
  }

  if(!validPhoneV84(phone)){
    error.textContent = "Ingresa un teléfono válido de 10 dígitos.";
    return;
  }

  const roleSelect = $("loginRoleSelect");
  const chosenRole = roleSelect ? roleSelect.value : "asesor";
  const advisorSelect = $("loginAdvisorSelect");
  const chosenAdvisor = advisorSelect ? advisorSelect.value : "";
  const resolved = resolveUserV93(email, chosenAdvisor, chosenRole);

  if(resolved.blocked){
    error.textContent = "Este dominio de correo ya no está autorizado para ingresar a Radar.";
    return;
  }
  if(resolved.needsSelection){
    error.textContent = "Primer ingreso: selecciona a qué asesor corresponde este correo, o elige \"Administrador\" si aplica.";
    return;
  }

  const fullUser = { ...resolved.user, email };
  setSessionV84(fullUser, phone, remember);
  logAccessV84(fullUser, phone);
  applyUserProfileV84();
  renderUsageDashboardV84();
  updateSessionRoleLabelV93();
  render();
}

function updateSessionRoleLabelV93(){
  const roleLabel = $("sessionRoleLabel");
  if(!roleLabel) return;
  if(!currentUserV84){ roleLabel.textContent = ""; return; }
  const label = currentUserV84.tier === "superadmin" ? "Super Administrador" :
    (currentUserV84.profile === "admin" ? "Administrador" : `Asesor · ${currentUserV84.advisor}`);
  roleLabel.textContent = `${currentUserV84.name} · ${label}`;
}

function logoutV84(){
  clearSessionV84();
  updateSessionRoleLabelV93();
  const login = $("loginOverlay");
  if(login) login.classList.remove("hidden");
  $("loginEmail").value = "";
  $("loginPhone").value = "";
}

function summarizeUsageV84(){
  const logs = getAccessLogsV84();
  const today = new Date().toLocaleDateString("es-CO");
  const byEmail = {};
  logs.forEach(l => {
    if(!byEmail[l.email]){
      byEmail[l.email] = {
        email: l.email,
        perfil: l.perfil,
        asesor: l.asesor,
        accesos: 0,
        ultimo: ""
      };
    }
    byEmail[l.email].accesos += 1;
    byEmail[l.email].ultimo = `${l.fecha} ${l.hora}`;
  });

  const followups = (DATA.clientes || []).filter(c =>
    (c.comentario && String(c.comentario).trim()) ||
    (c.proximaAccion && String(c.proximaAccion).trim()) ||
    (c.fechaSeguimiento && String(c.fechaSeguimiento).trim())
  ).length;

  return {
    logs,
    total: logs.length,
    unique: Object.keys(byEmail).length,
    today: logs.filter(l => l.fecha === today).length,
    byEmail: Object.values(byEmail).sort((a,b)=>b.accesos-a.accesos),
    followups
  };
}

function renderUsageDashboardV84(){
  const panel = $("usageAdminPanel");
  if(!panel) return;

  const isAdmin = isSuperAdminV93();
  panel.classList.toggle("hidden-by-profile", !isAdmin);

  if(!isAdmin) return;

  const s = summarizeUsageV84();
  if($("usageTotalAccess")) $("usageTotalAccess").textContent = s.total;
  if($("usageUniqueUsers")) $("usageUniqueUsers").textContent = s.unique;
  if($("usageTodayAccess")) $("usageTodayAccess").textContent = s.today;
  if($("usageFollowups")) $("usageFollowups").textContent = s.followups;

  const tbody = $("usageTableBody");
  if(tbody){
    tbody.innerHTML = "";
    s.byEmail.forEach(u => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.email}</td>
        <td>${u.perfil}</td>
        <td>${u.asesor}</td>
        <td>${u.accesos}</td>
        <td>${u.ultimo}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

function downloadAccessLogV84(){
  const logs = getAccessLogsV84();
  const rows = [["Fecha","Hora","Email","Nombre","Perfil","Asesor","Telefono"]];
  logs.forEach(l => rows.push([l.fecha,l.hora,l.email,l.nombre,l.perfil,l.asesor,l.telefono]));
  const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "radar_log_accesos.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const previousApplyProfileUiV84 = typeof applyProfileUiV81 === "function" ? applyProfileUiV81 : null;
if(previousApplyProfileUiV84){
  applyProfileUiV81 = function(){
    previousApplyProfileUiV84();
    if(currentUserV84){
      const panel = $("dailyUpdatePanel");
      const growth = $("growthConfigPanel");
      if(panel) panel.classList.toggle("hidden-by-profile", currentUserV84.profile !== "admin");
      if(growth) growth.classList.toggle("hidden-by-profile", !isSuperAdminV93());
      renderUsageDashboardV84();
    }
  };
}

const previousRenderV84 = render;
render = function(){
  previousRenderV84();
  if(currentUserV84) {
    applyUserProfileV84();
    renderUsageDashboardV84();
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = $("loginBtn");
  if(loginBtn) loginBtn.addEventListener("click", attemptLoginV84);

  const advisorSelect = $("loginAdvisorSelect");
  if(advisorSelect){
    advisorSelect.innerHTML = '<option value="">Selecciona tu asesor</option>' +
      (DATA.meta.asesores || []).map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  }

  const roleSelect = $("loginRoleSelect");
  const advisorWrapper = $("loginAdvisorWrapper");
  if(roleSelect && advisorWrapper){
    const syncAdvisorWrapper = () => {
      advisorWrapper.style.display = roleSelect.value === "administrador" ? "none" : "";
    };
    syncAdvisorWrapper();
    roleSelect.addEventListener("change", syncAdvisorWrapper);
  }

  ["loginEmail","loginPhone"].forEach(id => {
    const el = $(id);
    if(el){
      el.addEventListener("keydown", e => {
        if(e.key === "Enter") attemptLoginV84();
      });
    }
  });

  const saved = getSessionV84();
  const savedOk = saved && saved.email && !isBlockedDomainV92(saved.email) &&
    (saved.email === ADMIN_EMAIL_V92 ||
     saved.tier === "admin" ||
     (saved.advisor && (DATA.meta.asesores || []).includes(saved.advisor)));
  if(savedOk){
    currentUserV84 = saved;
    applyUserProfileV84();
    renderUsageDashboardV84();
    render();
  } else if(saved){
    clearSessionV84();
  }

  updateSessionRoleLabelV93();

  const logoutBtn = $("logoutBtn");
  if(logoutBtn) logoutBtn.addEventListener("click", logoutV84);

  const downloadBtn = $("downloadAccessLogBtn");
  if(downloadBtn) downloadBtn.addEventListener("click", downloadAccessLogV84);
});


// ===============================
// V8.5 - Vista Negocio como filtro único
// ===============================

function businessTypeMatchV85(c){
  if(state.businessView === "total") return true;
  if(state.businessView === "espumas") return c.tipoCliente === "Espumas";
  if(state.businessView === "colchones") return c.tipoCliente === "Colchones";
  if(state.businessView === "mixto") return c.tipoCliente === "Mixto";
  return true;
}

typeBelongs = businessTypeMatchV85;

businessLabel = function(){
  if(state.businessView === "espumas") return "Solo Espumas";
  if(state.businessView === "colchones") return "Solo Colchones";
  if(state.businessView === "mixto") return "Solo Mixto";
  return "Total Radar";
};

filteredBase = function(){
  const q = state.search.toLowerCase().trim();
  return DATA.clientes.filter(c => {
    if(!businessTypeMatchV85(c)) return false;

    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;

    if(state.status !== "todos" && c.estado !== state.status) return false;

    if(q && ![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
};

renderTypeSummary = function(){
  const base = DATA.clientes.filter(c => {
    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    return true;
  });

  const count = t => base.filter(c => c.tipoCliente === t).length;

  if($("tEspumas")) $("tEspumas").textContent = count("Espumas");
  if($("tColchones")) $("tColchones").textContent = count("Colchones");
  if($("tMixto")) $("tMixto").textContent = count("Mixto");
  if($("tNuevo")) $("tNuevo").textContent = count("Nuevo");

  document.querySelectorAll("[data-type-card]").forEach(card => {
    const map = {
      "Espumas": "espumas",
      "Colchones": "colchones",
      "Mixto": "mixto",
      "Nuevo": "total"
    };
    card.classList.toggle("active", state.businessView === map[card.dataset.typeCard]);
  });
};

function setupBusinessCardsV85(){
  document.querySelectorAll("[data-type-card]").forEach(card => {
    if(card.dataset.v85Ready) return;
    card.addEventListener("click", () => {
      const map = {
        "Espumas": "espumas",
        "Colchones": "colchones",
        "Mixto": "mixto",
        "Nuevo": "total"
      };
      const next = map[card.dataset.typeCard] || "total";
      state.businessView = state.businessView === next ? "total" : next;
      if($("businessView")) $("businessView").value = state.businessView;
      render();
    });
    card.dataset.v85Ready = "true";
  });
}

const previousBindEventsV85 = bindEvents;
bindEvents = function(){
  previousBindEventsV85();

  if($("typeFilter")){
    $("typeFilter").value = "todos";
    $("typeFilter").closest("div")?.classList.add("deprecated-type-filter");
  }

  setupBusinessCardsV85();
};

const previousRenderV85 = render;
render = function(){
  state.type = "todos";
  if($("typeFilter")) $("typeFilter").value = "todos";
  previousRenderV85();
  setupBusinessCardsV85();
  if($("businessView")) $("businessView").value = state.businessView;
};

// ===============================
// V8.6 - Base viva de clientes
// ===============================
function getMasterLogsV86(){try{return JSON.parse(localStorage.getItem("radarMasterLogsV86")||"[]")}catch(e){return[]}}
function saveMasterLogsV86(logs){localStorage.setItem("radarMasterLogsV86",JSON.stringify(logs))}
function currentUserLabelV86(){return (typeof currentUserV84!=="undefined"&&currentUserV84)?(currentUserV84.email||currentUserV84.name||"usuario"):"usuario"}
function isAdminV86(){return typeof currentUserV84!=="undefined"&&currentUserV84&&currentUserV84.profile==="admin"}
function isAdvisorAllowedToEditV86(c){if(isAdminV86())return true;if(typeof currentUserV84==="undefined"||!currentUserV84)return false;return c.asesorAsignado===currentUserV84.advisor}
function clientIncompleteV86(c){return !c.cliente||String(c.cliente).startsWith("Cliente ")||!c.ciudad||!c.departamento||!c.asesorAsignado||c.asesorAsignado==="SIN ASIGNACION"}
function fillAdvisorEditSelectV86(){const sel=$("modalAsesorEdit");if(!sel)return;sel.innerHTML="";["SIN ASIGNACION",...(DATA.meta.asesores||[])].forEach(a=>{const op=document.createElement("option");op.value=a;op.textContent=a;sel.appendChild(op)})}
function logMasterChangeV86(nit,cliente,field,oldValue,newValue){if(String(oldValue??"")===String(newValue??""))return;const now=new Date();const logs=getMasterLogsV86();logs.push({timestamp:now.toISOString(),fecha:now.toLocaleDateString("es-CO"),hora:now.toLocaleTimeString("es-CO"),usuario:currentUserLabelV86(),nit,cliente,campo:field,valorAnterior:oldValue??"",valorNuevo:newValue??""});saveMasterLogsV86(logs)}
const _openV86=openClientDetailV81;
openClientDetailV81=function(nit){_openV86(nit);const c=DATA.clientes.find(x=>cleanNit(x.nit)===cleanNit(nit));if(!c)return;fillAdvisorEditSelectV86();if($("modalClienteEdit"))$("modalClienteEdit").value=c.cliente||"";if($("modalNitEdit"))$("modalNitEdit").value=c.nit||"";if($("modalAsesorEdit"))$("modalAsesorEdit").value=c.asesorAsignado||"SIN ASIGNACION";if($("modalCiudadEdit"))$("modalCiudadEdit").value=c.ciudad||"";if($("modalDepartamentoEdit"))$("modalDepartamentoEdit").value=c.departamento||"";if($("modalCanalEdit"))$("modalCanalEdit").value=c.canal||"";if($("modalLineaBaseEdit"))$("modalLineaBaseEdit").value=c.lineaBase||"";const canEdit=isAdvisorAllowedToEditV86(c),canReassign=isSuperAdminV93();["modalClienteEdit","modalCanalEdit","modalLineaBaseEdit"].forEach(id=>{const el=$(id);if(el)el.disabled=!canEdit});if($("modalCiudadEdit"))$("modalCiudadEdit").disabled=true;if($("modalDepartamentoEdit"))$("modalDepartamentoEdit").disabled=true;if($("modalAsesorEdit"))$("modalAsesorEdit").disabled=!canReassign;if($("masterEditHelp"))$("masterEditHelp").textContent=(canReassign?"Super Administrador: puedes editar datos, reasignar asesor, bloquear y marcar VIP.":(isAdminV86()?"Administrador: puedes editar datos, sin reasignar asesor ni bloquear.":"Asesor: puedes completar datos de tus clientes; no puedes cambiar el asesor."))+" Departamento y Ciudad/Municipio solo se actualizan por carga masiva de Excel."}
const _saveV86=saveClientDetailV81;
saveClientDetailV81=function(){if(!activeClientNit)return;const c=DATA.clientes.find(x=>cleanNit(x.nit)===activeClientNit);if(!c)return;if(isAdvisorAllowedToEditV86(c)){const updates={cliente:$("modalClienteEdit")?.value?.trim(),ciudad:$("modalCiudadEdit")?.value?.trim(),departamento:$("modalDepartamentoEdit")?.value?.trim(),canal:$("modalCanalEdit")?.value?.trim(),lineaBase:$("modalLineaBaseEdit")?.value?.trim()};Object.entries(updates).forEach(([field,value])=>{if(value!==undefined&&String(c[field]??"")!==String(value??"")){logMasterChangeV86(c.nit,c.cliente,field,c[field],value);c[field]=value}});if(isSuperAdminV93()&&$("modalAsesorEdit")){const newAdvisor=$("modalAsesorEdit").value;if(String(c.asesorAsignado||"")!==String(newAdvisor||"")){if(typeof reassignClienteV93==="function"){reassignClienteV93(c,newAdvisor,{isNewAdvisor:!(DATA.meta.asesores||[]).includes(String(newAdvisor||"").trim().toUpperCase())})}else{logMasterChangeV86(c.nit,c.cliente,"asesorAsignado",c.asesorAsignado,newAdvisor);c.asesorAsignado=newAdvisor;if(newAdvisor&&newAdvisor!=="SIN ASIGNACION"&&!(DATA.meta.asesores||[]).includes(newAdvisor)){DATA.meta.asesores.push(newAdvisor);DATA.meta.asesores.sort()}}}}}_saveV86()}
const _renderTableV86=renderTable;
renderTable=function(arr){_renderTableV86(arr);document.querySelectorAll("#routeBody tr").forEach(row=>{const nitCell=row.querySelector('[data-label="NIT"]'),clientCell=row.querySelector('[data-label="Cliente"]');if(!nitCell||!clientCell)return;const c=DATA.clientes.find(x=>cleanNit(x.nit)===cleanNit(nitCell.textContent));if(c&&clientIncompleteV86(c)&&!clientCell.querySelector(".client-incomplete")){const badge=document.createElement("span");badge.className="client-incomplete";badge.textContent="Cliente incompleto";clientCell.appendChild(badge)}})}
function downloadMasterDataV86(){const rows=[["NIT","Cliente","Asesor Asignado","Ciudad","Departamento","Canal","Linea Base","Tipo Cliente","Estado","Clasificacion","Venta 2025","Venta 2026"]];DATA.clientes.forEach(c=>rows.push([c.nit,c.cliente,c.asesorAsignado,c.ciudad,c.departamento,c.canal,c.lineaBase,c.tipoCliente,c.estado,c.clasificacion,c.total2025||0,c.total2026||0]));downloadCsvV86(rows,"radar_asignacion_actualizada.csv")}
function downloadMasterLogV86(){const logs=getMasterLogsV86();const rows=[["Fecha","Hora","Usuario","NIT","Cliente","Campo","Valor Anterior","Valor Nuevo"]];logs.forEach(l=>rows.push([l.fecha,l.hora,l.usuario,l.nit,l.cliente,l.campo,l.valorAnterior,l.valorNuevo]));downloadCsvV86(rows,"radar_historial_cambios_maestros.csv")}
function downloadCsvV86(rows,filename){const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a)}
if(typeof applyProfileUiV81==="function"){const _profileV86=applyProfileUiV81;applyProfileUiV81=function(){_profileV86();const panel=$("masterDataAdminPanel");if(panel)panel.classList.toggle("hidden-by-profile",!isAdminV86())}}
document.addEventListener("DOMContentLoaded",()=>{const d1=$("downloadMasterDataBtn");if(d1)d1.addEventListener("click",downloadMasterDataV86);const d2=$("downloadMasterLogBtn");if(d2)d2.addEventListener("click",downloadMasterLogV86)})

// ===============================
// V8.7 - Departamento/Ciudad + Bloqueo clientes
// ===============================
function buildGeoCatalogV87(){
  const catalog = {};
  (DATA.clientes || []).forEach(c => {
    const dep = String(c.departamento || "").trim();
    const city = String(c.ciudad || "").trim();
    if(!dep) return;
    catalog[dep] = catalog[dep] || new Set();
    if(city) catalog[dep].add(city);
  });
  const out = {};
  Object.keys(catalog).sort().forEach(dep => out[dep] = Array.from(catalog[dep]).sort());
  return out;
}
let GEO_CATALOG_V87 = buildGeoCatalogV87();

function fillDepartmentSelectV87(selectedDep){
  const depSel = $("modalDepartamentoEdit");
  if(!depSel) return;
  depSel.innerHTML = '<option value="">Seleccionar departamento</option>';
  Object.keys(GEO_CATALOG_V87).sort().forEach(dep => {
    const op = document.createElement("option"); op.value = dep; op.textContent = dep; depSel.appendChild(op);
  });
  depSel.value = selectedDep || "";
}
function fillCitySelectV87(dep, selectedCity){
  const citySel = $("modalCiudadEdit");
  if(!citySel) return;
  citySel.innerHTML = '<option value="">Seleccionar ciudad / municipio</option>';
  (GEO_CATALOG_V87[dep] || []).forEach(city => {
    const op = document.createElement("option"); op.value = city; op.textContent = city; citySel.appendChild(op);
  });
  citySel.value = selectedCity || "";
}
function isBlockedV87(c){ return c.bloqueado === true || c.bloqueado === "true" || c.estado === "Bloqueado"; }
function canSeeBlockedV87(){ return typeof isAdminV86 === "function" && isAdminV86(); }

filteredBase = function(){
  const q = state.search.toLowerCase().trim();
  return DATA.clientes.filter(c => {
    const blocked = isBlockedV87(c);
    if(blocked){
      if(!canSeeBlockedV87()) return false;
      if(state.status !== "Bloqueado") return false;
    } else if(state.status === "Bloqueado") {
      return false;
    }

    if(!businessTypeMatchV85(c)) return false;
    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    if(state.status !== "todos" && state.status !== "Bloqueado" && c.estado !== state.status) return false;
    if(q && ![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
};

const _renderTypeSummaryV87 = renderTypeSummary;
renderTypeSummary = function(){
  const base = DATA.clientes.filter(c => {
    if(isBlockedV87(c)) return false;
    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    return true;
  });
  const count = t => base.filter(c => c.tipoCliente === t).length;
  if($("tEspumas")) $("tEspumas").textContent = count("Espumas");
  if($("tColchones")) $("tColchones").textContent = count("Colchones");
  if($("tMixto")) $("tMixto").textContent = count("Mixto");
  if($("tNuevo")) $("tNuevo").textContent = count("Nuevo");
  document.querySelectorAll("[data-type-card]").forEach(card => {
    const map = { "Espumas":"espumas", "Colchones":"colchones", "Mixto":"mixto", "Nuevo":"total" };
    card.classList.toggle("active", state.businessView === map[card.dataset.typeCard]);
  });
};

const _openV87 = openClientDetailV81;
openClientDetailV81 = function(nit){
  _openV87(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;
  GEO_CATALOG_V87 = buildGeoCatalogV87();
  fillDepartmentSelectV87(c.departamento || "");
  fillCitySelectV87(c.departamento || "", c.ciudad || "");
  if($("modalDepartamentoEdit")) $("modalDepartamentoEdit").onchange = e => fillCitySelectV87(e.target.value, "");
  if($("modalBloqueadoEdit")) $("modalBloqueadoEdit").value = isBlockedV87(c) ? "true" : "false";
  if($("modalMotivoBloqueoEdit")) $("modalMotivoBloqueoEdit").value = c.motivoBloqueo || "";
  const canEditBlock = isSuperAdminV93();
  if($("modalBloqueadoEdit")) $("modalBloqueadoEdit").disabled = !canEditBlock;
  if($("modalMotivoBloqueoEdit")) $("modalMotivoBloqueoEdit").disabled = !canEditBlock;
  const old = document.querySelector(".blocked-warning"); if(old) old.remove();
  if(isBlockedV87(c)){
    const box = document.querySelector(".master-edit-box");
    if(box){ const div = document.createElement("div"); div.className = "blocked-warning"; div.textContent = "Cliente bloqueado: no cuenta en hoja de ruta, metas ni cálculos comerciales."; box.appendChild(div); }
  }
};

const _saveV87 = saveClientDetailV81;
saveClientDetailV81 = function(){
  if(!activeClientNit) return;
  const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
  if(!c) return;

  if($("modalDepartamentoEdit")) c.departamento = $("modalDepartamentoEdit").value;
  if($("modalCiudadEdit")) c.ciudad = $("modalCiudadEdit").value;

  if(isSuperAdminV93()){
    const oldBlocked = isBlockedV87(c);
    const newBlocked = $("modalBloqueadoEdit")?.value === "true";
    const oldReason = c.motivoBloqueo || "";
    const newReason = $("modalMotivoBloqueoEdit")?.value || "";

    if(oldBlocked !== newBlocked){
      if(typeof logMasterChangeV86 === "function") logMasterChangeV86(c.nit, c.cliente, "bloqueado", oldBlocked ? "Sí" : "No", newBlocked ? "Sí" : "No");
      c.bloqueado = newBlocked;
      c.estado = newBlocked ? "Bloqueado" : (c.estado === "Bloqueado" ? "Activo" : c.estado);
      c.fechaBloqueo = newBlocked ? new Date().toLocaleDateString("es-CO") : "";
      c.usuarioBloqueo = newBlocked ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
    }
    if(oldReason !== newReason){
      if(typeof logMasterChangeV86 === "function") logMasterChangeV86(c.nit, c.cliente, "motivoBloqueo", oldReason, newReason);
      c.motivoBloqueo = newReason;
    }
  }
  _saveV87();
};

const _renderTableV87 = renderTable;
renderTable = function(arr){
  _renderTableV87(arr);
  document.querySelectorAll("#routeBody tr").forEach(row => {
    const nitCell = row.querySelector('[data-label="NIT"]');
    const clientCell = row.querySelector('[data-label="Cliente"]');
    if(!nitCell || !clientCell) return;
    const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nitCell.textContent));
    if(c && isBlockedV87(c)){
      row.classList.add("blocked-row");
      if(!clientCell.querySelector(".client-blocked")){
        const badge = document.createElement("span"); badge.className = "client-blocked"; badge.textContent = "Bloqueado"; clientCell.appendChild(badge);
      }
    }
  });
};

downloadMasterDataV86 = function(){
  const rows = [["NIT","Cliente","Asesor Asignado","Ciudad","Departamento","Canal","Linea Base","Tipo Cliente","Estado","Clasificacion","Bloqueado","Motivo Bloqueo","Fecha Bloqueo","Usuario Bloqueo","Venta 2025","Venta 2026"]];
  DATA.clientes.forEach(c => rows.push([c.nit,c.cliente,c.asesorAsignado,c.ciudad,c.departamento,c.canal,c.lineaBase,c.tipoCliente,c.estado,c.clasificacion,isBlockedV87(c)?"Sí":"No",c.motivoBloqueo||"",c.fechaBloqueo||"",c.usuarioBloqueo||"",c.total2025||0,c.total2026||0]));
  downloadCsvV86(rows,"radar_asignacion_actualizada.csv");
};

// ===============================
// V8.8 - VIP Gerencia + Canal controlado
// ===============================
state.vipFilter = "todos";

function isVipGerenciaV88(c){
  return c.vipGerencia === true || c.vipGerencia === "true";
}

function isAdminForVipV88(){
  return typeof isAdminV86 === "function" && isAdminV86();
}

// Reglas de visibilidad:
// - Asesor nunca ve VIP Gerencia.
// - Admin puede verlos y filtrarlos.
filteredBase = function(){
  const q = state.search.toLowerCase().trim();
  return DATA.clientes.filter(c => {
    const blocked = typeof isBlockedV87 === "function" ? isBlockedV87(c) : false;
    const vip = isVipGerenciaV88(c);

    if(blocked){
      if(!(typeof canSeeBlockedV87 === "function" && canSeeBlockedV87())) return false;
      if(state.status !== "Bloqueado") return false;
    } else if(state.status === "Bloqueado") {
      return false;
    }

    if(!isAdminForVipV88() && vip) return false;
    if(isAdminForVipV88()){
      if(state.vipFilter === "solo" && !vip) return false;
      if(state.vipFilter === "excluir" && vip) return false;
    }

    if(typeof businessTypeMatchV85 === "function" && !businessTypeMatchV85(c)) return false;

    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;

    if(state.status !== "todos" && state.status !== "Bloqueado" && c.estado !== state.status) return false;

    if(q && ![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente,c.canal].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
};

// Cards no cuentan bloqueados ni VIP para asesores.
// Admin puede contar según filtro VIP.
renderTypeSummary = function(){
  const base = DATA.clientes.filter(c => {
    if(typeof isBlockedV87 === "function" && isBlockedV87(c)) return false;
    if(!isAdminForVipV88() && isVipGerenciaV88(c)) return false;
    if(isAdminForVipV88()){
      if(state.vipFilter === "solo" && !isVipGerenciaV88(c)) return false;
      if(state.vipFilter === "excluir" && isVipGerenciaV88(c)) return false;
    }
    if(state.profile !== "admin" && c.asesorAsignado !== state.profile) return false;
    if(state.profile === "admin" && state.advisor !== "todos" && c.asesorAsignado !== state.advisor) return false;
    return true;
  });
  const count = t => base.filter(c => c.tipoCliente === t).length;
  if($("tEspumas")) $("tEspumas").textContent = count("Espumas");
  if($("tColchones")) $("tColchones").textContent = count("Colchones");
  if($("tMixto")) $("tMixto").textContent = count("Mixto");
  if($("tNuevo")) $("tNuevo").textContent = count("Nuevo");
  document.querySelectorAll("[data-type-card]").forEach(card => {
    const map = { "Espumas":"espumas", "Colchones":"colchones", "Mixto":"mixto", "Nuevo":"total" };
    card.classList.toggle("active", state.businessView === map[card.dataset.typeCard]);
  });
};

const _openV88 = openClientDetailV81;
openClientDetailV81 = function(nit){
  _openV88(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;

  // Canal controlado
  if($("modalCanalEdit")){
    const allowed = ["", "B2B", "B2P", "TIENDA", "INDUSTRIA"];
    if(!allowed.includes(c.canal || "")){
      const op = document.createElement("option");
      op.value = c.canal || "";
      op.textContent = c.canal || "";
      $("modalCanalEdit").appendChild(op);
    }
    $("modalCanalEdit").value = c.canal || "";
  }

  if($("modalVipGerenciaEdit")) $("modalVipGerenciaEdit").value = isVipGerenciaV88(c) ? "true" : "false";
  if($("modalMotivoVipEdit")) $("modalMotivoVipEdit").value = c.motivoVipGerencia || "";

  const canEditVip = isSuperAdminV93();
  if($("modalVipGerenciaEdit")) $("modalVipGerenciaEdit").disabled = !canEditVip;
  if($("modalMotivoVipEdit")) $("modalMotivoVipEdit").disabled = !canEditVip;

  const old = document.querySelector(".vip-warning");
  if(old) old.remove();

  if(isVipGerenciaV88(c)){
    const box = document.querySelector(".master-edit-box");
    if(box){
      const div = document.createElement("div");
      div.className = "vip-warning";
      div.textContent = "Cliente VIP Gerencia: solo visible para administración; no aparece en hoja de ruta de asesores.";
      box.appendChild(div);
    }
  }
};

const _saveV88 = saveClientDetailV81;
saveClientDetailV81 = function(){
  if(!activeClientNit) return;
  const c = DATA.clientes.find(x => cleanNit(x.nit) === activeClientNit);
  if(!c) return;

  if($("modalCanalEdit")) c.canal = $("modalCanalEdit").value;

  if(isSuperAdminV93()){
    const oldVip = isVipGerenciaV88(c);
    const newVip = $("modalVipGerenciaEdit")?.value === "true";
    const oldReason = c.motivoVipGerencia || "";
    const newReason = $("modalMotivoVipEdit")?.value || "";

    if(oldVip !== newVip){
      if(typeof logMasterChangeV86 === "function") logMasterChangeV86(c.nit, c.cliente, "vipGerencia", oldVip ? "Sí" : "No", newVip ? "Sí" : "No");
      c.vipGerencia = newVip;
      c.fechaVipGerencia = newVip ? new Date().toLocaleDateString("es-CO") : "";
      c.usuarioVipGerencia = newVip ? (typeof currentUserLabelV86 === "function" ? currentUserLabelV86() : "") : "";
    }

    if(oldReason !== newReason){
      if(typeof logMasterChangeV86 === "function") logMasterChangeV86(c.nit, c.cliente, "motivoVipGerencia", oldReason, newReason);
      c.motivoVipGerencia = newReason;
    }
  }

  _saveV88();
};

const _renderTableV88 = renderTable;
renderTable = function(arr){
  _renderTableV88(arr);
  document.querySelectorAll("#routeBody tr").forEach(row => {
    const nitCell = row.querySelector('[data-label="NIT"]');
    const clientCell = row.querySelector('[data-label="Cliente"]');
    if(!nitCell || !clientCell) return;
    const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nitCell.textContent));
    if(!c) return;
    if(isVipGerenciaV88(c)){
      row.classList.add("vip-row");
      if(!clientCell.querySelector(".vip-badge")){
        const badge = document.createElement("span");
        badge.className = "vip-badge";
        badge.textContent = "VIP Gerencia";
        clientCell.appendChild(badge);
      }
    }
  });
};

const _applyProfileV88 = typeof applyProfileUiV81 === "function" ? applyProfileUiV81 : null;
if(_applyProfileV88){
  applyProfileUiV81 = function(){
    _applyProfileV88();
    const vipWrapper = $("vipFilter")?.closest("div");
    if(vipWrapper) vipWrapper.classList.toggle("hidden-by-profile", !isAdminForVipV88());
  };
}

const _bindV88 = bindEvents;
bindEvents = function(){
  _bindV88();
  if($("vipFilter")){
    $("vipFilter").addEventListener("change", e => {
      state.vipFilter = e.target.value;
      render();
    });
  }
};

// Descarga ampliada
downloadMasterDataV86 = function(){
  const rows = [[
    "NIT","Cliente","Asesor Asignado","Ciudad","Departamento","Canal","Linea Base",
    "Tipo Cliente","Estado","Clasificacion","Bloqueado","Motivo Bloqueo","Fecha Bloqueo","Usuario Bloqueo",
    "VIP Gerencia","Motivo VIP","Fecha VIP","Usuario VIP","Venta 2025","Venta 2026"
  ]];

  DATA.clientes.forEach(c => rows.push([
    c.nit,c.cliente,c.asesorAsignado,c.ciudad,c.departamento,c.canal,c.lineaBase,
    c.tipoCliente,c.estado,c.clasificacion,
    (typeof isBlockedV87 === "function" && isBlockedV87(c)) ? "Sí" : "No",
    c.motivoBloqueo || "", c.fechaBloqueo || "", c.usuarioBloqueo || "",
    isVipGerenciaV88(c) ? "Sí" : "No", c.motivoVipGerencia || "", c.fechaVipGerencia || "", c.usuarioVipGerencia || "",
    c.total2025 || 0, c.total2026 || 0
  ]));

  downloadCsvV86(rows, "radar_asignacion_actualizada.csv");
};

// ===============================
// V8.9 - Fecha actual y mes inicial automático
// ===============================
function monthNameFromDateV89(date){
  return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][date.getMonth()];
}
function formatTodayV89(){
  return new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function setInitialMonthV89(){
  const currentRealMonth = monthNameFromDateV89(new Date());
  state.month = currentRealMonth;
  if($("monthSelect")){
    const exists = Array.from($("monthSelect").options).some(o => o.value === currentRealMonth);
    if(exists) $("monthSelect").value = currentRealMonth;
  }
}
function updateTodayBadgeV89(){
  if($("todayBadgeV89")) $("todayBadgeV89").textContent = "Fecha actual: " + formatTodayV89();
}
const previousInitV89 = init;
init = function(){
  previousInitV89();
  setInitialMonthV89();
  updateTodayBadgeV89();
  render();
};
const previousRenderV89 = render;
render = function(){
  previousRenderV89();
  updateTodayBadgeV89();
  if($("monthSelect")) $("monthSelect").value = state.month;
};

// ===============================
// V8.10 - Filtros estables + mes actual + KPIs consistentes
// ===============================
const MONTHS_V810=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
function realCurrentMonthV810(){return MONTHS_V810[new Date().getMonth()]}
function selectedMonthV810(){return state.month||realCurrentMonthV810()}
function monthIndexV810(m){return MONTHS_V810.indexOf(m)}
function latestOperationalMonthV810(){return DATA.meta.latestOperationalMonth2026||DATA.meta.currentMonthName||"Mayo"}
function monthIsAvailable2026V810(m){return monthIndexV810(m)>=0&&monthIndexV810(m)<=monthIndexV810(latestOperationalMonthV810())}
function monthValueV810(obj,m){return Number((obj&&obj[m])||0)}
function totalMonth2026V810(c,m,view){if(!monthIsAvailable2026V810(m))return 0;if(view==="espumas")return monthValueV810(c.ventas2026EspumasPorMes,m);if(view==="colchones")return monthValueV810(c.ventas2026ColchonesPorMes,m);return monthValueV810(c.ventas2026EspumasPorMes,m)+monthValueV810(c.ventas2026ColchonesPorMes,m)}
function totalMonth2025V810(c,m,view){if(view==="espumas")return monthValueV810(c.ventas2025EspumasPorMes,m);if(view==="colchones")return monthValueV810(c.ventas2025ColchonesPorMes,m);return monthValueV810(c.ventas2025EspumasPorMes,m)+monthValueV810(c.ventas2025ColchonesPorMes,m)}
function businessMatchV810(c){if(state.businessView==="total")return true;if(state.businessView==="espumas")return c.tipoCliente==="Espumas";if(state.businessView==="colchones")return c.tipoCliente==="Colchones";if(state.businessView==="mixto")return c.tipoCliente==="Mixto";return true}
typeBelongs=businessMatchV810;businessTypeMatchV85=businessMatchV810;
businessLabel=function(){if(state.businessView==="espumas")return"Solo Espumas";if(state.businessView==="colchones")return"Solo Colchones";if(state.businessView==="mixto")return"Solo Mixto";return"Total Radar"};
applyUserProfileV84=function(){if(!currentUserV84)return;if(currentUserV84.profile==="admin"){state.profile="admin"}else{state.profile=currentUserV84.advisor;state.advisor="todos"}const ps=$("profileSelect");if(ps){ps.value=state.profile;const w=ps.closest("div");if(w)w.classList.add("profile-hidden")}const aw=$("advisorFilter")?.closest("div");if(aw)aw.style.display=currentUserV84.profile==="admin"?"":"none";const login=$("loginOverlay");if(login)login.classList.add("hidden")};
saleCurrent=function(c){return totalMonth2026V810(c,selectedMonthV810(),state.businessView)};
salePrev=function(c){return totalMonth2025V810(c,selectedMonthV810(),state.businessView)};
function growthConfigV810(){if(typeof getGrowthConfigV82==="function")return getGrowthConfigV82();return DATA.meta.growthByClass||{A:12,B:10,C:5,E:15,N:0}}
goal=function(c){const m=selectedMonthV810();if(c.metasAsesorPorMes&&c.metasAsesorPorMes[m]!==undefined&&c.metasAsesorPorMes[m]!=="")return Number(c.metasAsesorPorMes[m]||0);const cfg=growthConfigV810();const g=Number(cfg[c.clasificacion]??0);return salePrev(c)*(1+g/100)};
compliance=function(c){const g=goal(c);return g?(saleCurrent(c)/g)*100:0};missing=function(c){return Math.max(goal(c)-saleCurrent(c),0)};
filteredBase=function(){const q=String(state.search||"").toLowerCase().trim();return DATA.clientes.filter(c=>{const blocked=typeof isBlockedV87==="function"?isBlockedV87(c):false;const vip=typeof isVipGerenciaV88==="function"?isVipGerenciaV88(c):false;if(blocked){if(!(typeof isAdminV86==="function"&&isAdminV86()))return false;if(state.status!=="Bloqueado")return false}else if(state.status==="Bloqueado")return false;if(state.profile!=="admin"&&vip)return false;if(!businessMatchV810(c))return false;if(state.profile==="admin"){if(state.advisor!=="todos"&&c.asesorAsignado!==state.advisor)return false}else{if(c.asesorAsignado!==state.profile)return false}if(state.status!=="todos"&&state.status!=="Bloqueado"&&c.estado!==state.status)return false;if(q&&![c.cliente,c.nit,c.asesorAsignado,c.ciudad,c.departamento,c.tipoCliente,c.canal].join(" ").toLowerCase().includes(q))return false;return true})};
function sortedRowsV810(arr){const copy=[...arr],sort=state.sort||"venta2025";copy.sort((a,b)=>{if(sort==="faltante")return missing(b)-missing(a);if(sort==="ventaActual")return saleCurrent(b)-saleCurrent(a);if(sort==="cumplimientoAsc")return compliance(a)-compliance(b);if(sort==="cliente")return String(a.cliente||"").localeCompare(String(b.cliente||""));return salePrev(b)-salePrev(a)});return copy}
renderTable=function(arr){const tbody=$("routeBody");tbody.innerHTML="";$("rowCount").textContent=`${arr.length.toLocaleString("es-CO")} clientes`;sortedRowsV810(arr).forEach(c=>{const tr=document.createElement("tr");tr.className=sem(c);tr.innerHTML=`<td data-label="Cliente"><span class="client-main" title="${esc(c.cliente)}">${esc(c.cliente)}</span><span class="client-location">${esc([c.ciudad,c.departamento].filter(Boolean).join(" · "))}</span></td><td data-label="NIT" title="${esc(c.nit)}">${esc(c.nit)}</td><td data-label="Asesor">${esc(c.asesorAsignado)}</td><td data-label="Estado"><span class="status">${esc(c.estado)}</span></td><td data-label="Venta 2025">${money(salePrev(c))}</td><td data-label="Venta actual">${money(saleCurrent(c))}</td><td data-label="Meta">${money(goal(c))}</td><td data-label="Cump.">${pct(compliance(c))}</td><td data-label="Faltante">${money(missing(c))}</td><td data-label="Detalle"><button class="detail-btn" data-detail-nit="${esc(c.nit)}">Ver</button></td>`;tbody.appendChild(tr)})};
renderKpis=function(arr){const venta=arr.reduce((s,c)=>s+saleCurrent(c),0),prev=arr.reduce((s,c)=>s+salePrev(c),0),meta=arr.reduce((s,c)=>s+goal(c),0),falt=Math.max(meta-venta,0);$("kClients").textContent=arr.length.toLocaleString("es-CO");$("kCurrentSale").textContent=money(venta);$("kPrevSale").textContent=money(prev);$("kGoal").textContent=money(meta);$("kCompliance").textContent=meta?pct(venta/meta*100):"0%";$("kMissing").textContent=money(falt);$("kClientsSub").textContent=businessLabel();$("kCurrentSaleSub").textContent=selectedMonthV810();const m=selectedMonthV810();$("bEspActual").textContent=money(arr.reduce((s,c)=>s+totalMonth2026V810(c,m,"espumas"),0));$("bColActual").textContent=money(arr.reduce((s,c)=>s+totalMonth2026V810(c,m,"colchones"),0));$("bEsp2025").textContent="2025: "+money(arr.reduce((s,c)=>s+totalMonth2025V810(c,m,"espumas"),0));$("bCol2025").textContent="2025: "+money(arr.reduce((s,c)=>s+totalMonth2025V810(c,m,"colchones"),0))};
renderTypeSummary=function(){const base=DATA.clientes.filter(c=>{const blocked=typeof isBlockedV87==="function"?isBlockedV87(c):false;const vip=typeof isVipGerenciaV88==="function"?isVipGerenciaV88(c):false;if(blocked)return false;if(state.profile!=="admin"&&vip)return false;if(state.profile==="admin"){if(state.advisor!=="todos"&&c.asesorAsignado!==state.advisor)return false}else{if(c.asesorAsignado!==state.profile)return false}if(state.status!=="todos"&&c.estado!==state.status)return false;return true});const count=t=>base.filter(c=>c.tipoCliente===t).length;if($("tEspumas"))$("tEspumas").textContent=count("Espumas");if($("tColchones"))$("tColchones").textContent=count("Colchones");if($("tMixto"))$("tMixto").textContent=count("Mixto");if($("tNuevo"))$("tNuevo").textContent=count("Nuevo");document.querySelectorAll("[data-type-card]").forEach(card=>{const map={Espumas:"espumas",Colchones:"colchones",Mixto:"mixto",Nuevo:"total"};card.classList.toggle("active",state.businessView===map[card.dataset.typeCard])})};
function updateFilterVisibilityV810(){const aw=$("advisorFilter")?.closest("div");if(aw)aw.style.display=state.profile==="admin"?"":"none";const tw=$("typeFilter")?.closest("div");if(tw)tw.style.display="none";const vw=$("vipFilter")?.closest("div");if(vw)vw.style.display="none"}
function updateMonthAndDateV810(){if(!state.month)state.month=realCurrentMonthV810();if($("monthSelect"))$("monthSelect").value=state.month;if($("todayBadgeV89"))$("todayBadgeV89").textContent="Fecha actual: "+new Date().toLocaleDateString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric"});if($("monthHelpV83"))$("monthHelpV83").textContent=monthIsAvailable2026V810(state.month)?`Usando venta real 2026 de ${state.month}`:`${state.month} aún no existe en ventas 2026: venta actual = 0; base 2025 activa`}
render=function(){state.type="todos";state.vipFilter="todos";document.body.classList.toggle("view-espumas",state.businessView==="espumas");document.body.classList.toggle("view-colchones",state.businessView==="colchones");document.body.classList.toggle("view-total",state.businessView==="total");updateFilterVisibilityV810();updateMonthAndDateV810();const arr=filteredBase();renderKpis(arr);renderTypeSummary();renderTable(arr);const label=$("contextLabel");if(label){const note=monthIsAvailable2026V810(state.month)?"":" · Mes futuro sin venta 2026";label.textContent=`Vista: ${businessLabel()} · Mes: ${state.month}${note} · Ventas actualizadas hasta ${latestOperationalMonthV810()}`}};
const previousInitV810=init;init=function(){state.month=realCurrentMonthV810();previousInitV810();state.month=realCurrentMonthV810();if($("monthSelect"))$("monthSelect").value=state.month;render()};
document.addEventListener("DOMContentLoaded",()=>{if($("monthSelect"))$("monthSelect").addEventListener("change",e=>{state.month=e.target.value;render()});if($("businessView"))$("businessView").addEventListener("change",e=>{state.businessView=e.target.value;render()});if($("advisorFilter"))$("advisorFilter").addEventListener("change",e=>{state.advisor=e.target.value;render()});if($("statusFilter"))$("statusFilter").addEventListener("change",e=>{state.status=e.target.value;render()});if($("searchInput"))$("searchInput").addEventListener("input",e=>{state.search=e.target.value;render()});if($("sortSelect"))$("sortSelect").addEventListener("change",e=>{state.sort=e.target.value;render()})});


// ===============================
// V8.11 - Ocultar funciones admin a asesores + respaldo
// ===============================
function isAdminProfileV811(){
  return typeof currentUserV84 !== "undefined" && currentUserV84 && currentUserV84.profile === "admin";
}

function applyAdminVisibilityV811(){
  const admin = isAdminProfileV811();
  const superAdmin = typeof isSuperAdminV93 === "function" && isSuperAdminV93();

  // Visible para Administrador y Super Administrador (exportaciones y carga operativa).
  [
    "dailyUpdatePanel",
    "masterDataAdminPanel",
    "syncAdminPanel"
  ].forEach(id => {
    const el = $(id);
    if(el) el.classList.toggle("admin-only-panel-hidden", !admin);
  });

  // Exclusivo Super Administrador: configuración de crecimiento y estadísticas de uso.
  ["growthConfigPanel", "usageAdminPanel"].forEach(id => {
    const el = $(id);
    if(el) el.classList.toggle("superadmin-only-hidden", !superAdmin);
  });

  const advisorWrapper = $("advisorFilter")?.closest("div");
  if(advisorWrapper) advisorWrapper.style.display = admin ? "" : "none";

  const profileWrapper = $("profileSelect")?.closest("div");
  if(profileWrapper) profileWrapper.classList.add("profile-hidden");
}

const previousRenderV811 = render;
render = function(){
  previousRenderV811();
  applyAdminVisibilityV811();
};

const previousApplyUserProfileV811 = typeof applyUserProfileV84 === "function" ? applyUserProfileV84 : null;
if(previousApplyUserProfileV811){
  applyUserProfileV84 = function(){
    previousApplyUserProfileV811();
    applyAdminVisibilityV811();
  };
}

function exportRadarBackupV811(){
  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: (typeof currentUserV84 !== "undefined" && currentUserV84) ? currentUserV84.email : "admin",
    data: DATA,
    accessLogs: (typeof getAccessLogsV84 === "function") ? getAccessLogsV84() : [],
    masterLogs: (typeof getMasterLogsV86 === "function") ? getMasterLogsV86() : []
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "radar_respaldo_sincronizacion.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

document.addEventListener("DOMContentLoaded", () => {
  const syncBtn = $("exportSyncBtn");
  if(syncBtn) syncBtn.addEventListener("click", exportRadarBackupV811);
  applyAdminVisibilityV811();
});

// ===============================
// V8.12 - Dashboard Director
// ===============================
let currentViewV812 = "route";
let dashboardChartsV812 = {};
function monthsV812(){return ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];}
function mvV812(obj,m){return Number((obj&&obj[m])||0);}
function latestIdxV812(){const months=monthsV812();const latest=DATA.meta.latestOperationalMonth2026||DATA.meta.currentMonthName||"Mayo";return Math.max(0,months.indexOf(latest));}
function availableMonthsV812(){return monthsV812().slice(0,latestIdxV812()+1);}
function saleMonthV812(c,year,m){if(year===2025)return mvV812(c.ventas2025EspumasPorMes,m)+mvV812(c.ventas2025ColchonesPorMes,m);return mvV812(c.ventas2026EspumasPorMes,m)+mvV812(c.ventas2026ColchonesPorMes,m);}
function totalYtdV812(c,year){return availableMonthsV812().reduce((s,m)=>s+saleMonthV812(c,year,m),0);}
function directorClientsV812(){return (DATA.clientes||[]).filter(c=>!(typeof isBlockedV87==="function"&&isBlockedV87(c)));}
function pctV812(v){return Number.isFinite(v)?Math.round(v)+"%":"0%";}
function setV812(id,v){const el=$(id);if(el)el.textContent=v;}
function destroyChartV812(id){if(dashboardChartsV812[id]){dashboardChartsV812[id].destroy();delete dashboardChartsV812[id];}}
function chartV812(id,config){
  const canvas=$(id);
  if(!canvas||typeof Chart==="undefined")return;
  destroyChartV812(id);
  config.options=config.options||{};
  if(config.options.aspectRatio===undefined){
    const w=window.innerWidth||1200;
    config.options.aspectRatio=w<480?1.05:(w<760?1.3:(w<1100?1.6:2));
  }
  dashboardChartsV812[id]=new Chart(canvas.getContext("2d"),config);
}
function renderDirectorDashboardV812(){
 const clients=directorClientsV812(), months=monthsV812();
 const total26=clients.reduce((s,c)=>s+totalYtdV812(c,2026),0), total25=clients.reduce((s,c)=>s+totalYtdV812(c,2025),0);
 const growth=total25?((total26/total25)-1)*100:0, withSale=clients.filter(c=>totalYtdV812(c,2026)>0).length, ticket=withSale?total26/withSale:0;
 const sorted=clients.map(c=>({...c,ventaDash:totalYtdV812(c,2026)})).filter(c=>c.ventaDash>0).sort((a,b)=>b.ventaDash-a.ventaDash);
 let acc=0,pareto=0;for(const c of sorted){acc+=c.ventaDash;pareto++;if(total26&&acc/total26>=.8)break;}
 setV812("dVenta2026",money(total26));setV812("dVenta2025",money(total25));setV812("dCrecimiento",pctV812(growth));setV812("dClientesVenta",withSale.toLocaleString("es-CO"));setV812("dParetoClientes",pareto.toLocaleString("es-CO"));setV812("dTicketPromedio",money(ticket));
 const m25=months.map(m=>clients.reduce((s,c)=>s+saleMonthV812(c,2025,m),0)), m26=months.map(m=>clients.reduce((s,c)=>s+saleMonthV812(c,2026,m),0));
 chartV812("monthlySalesChart",{type:"line",data:{labels:months,datasets:[{label:"2025",data:m25,tension:.25},{label:"2026",data:m26,tension:.25}]},options:{responsive:true,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
 const byAdvisor={};clients.forEach(c=>{const a=c.asesorAsignado||"SIN ASIGNACION";byAdvisor[a]=(byAdvisor[a]||0)+totalYtdV812(c,2026);});const advisorRows=Object.entries(byAdvisor).sort((a,b)=>b[1]-a[1]).slice(0,10);
 chartV812("advisorSalesChart",{type:"bar",data:{labels:advisorRows.map(x=>x[0]),datasets:[{label:"Venta 2026",data:advisorRows.map(x=>x[1])}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}});
 const byClass={};clients.forEach(c=>{const k=c.clasificacion||"N";byClass[k]=(byClass[k]||0)+totalYtdV812(c,2026);});const classRows=["A","B","C","E","N"].map(k=>({k,v:byClass[k]||0}));
 chartV812("classSalesChart",{type:"doughnut",data:{labels:classRows.map(x=>x.k),datasets:[{label:"Venta",data:classRows.map(x=>x.v)}]},options:{responsive:true,plugins:{legend:{position:"bottom"}}}});
 const byStatus={};clients.forEach(c=>{const k=c.estado||"Sin estado";byStatus[k]=(byStatus[k]||0)+1;});const statusRows=Object.entries(byStatus).sort((a,b)=>b[1]-a[1]);
 chartV812("statusChart",{type:"bar",data:{labels:statusRows.map(x=>x[0]),datasets:[{label:"Clientes",data:statusRows.map(x=>x[1])}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
 renderParetoV812(sorted,total26);renderInsightsV812({growth,pareto,withSale,advisorRows});
}
function renderParetoV812(sorted,total26){const body=$("paretoTableBody");if(body){body.innerHTML="";let acc=0;sorted.slice(0,15).forEach((c,i)=>{acc+=c.ventaDash;const tr=document.createElement("tr");tr.innerHTML=`<td>${i+1}</td><td>${esc(c.cliente)}</td><td>${esc(c.asesorAsignado)}</td><td>${esc(c.tipoCliente)}</td><td>${money(c.ventaDash)}</td><td>${total26?Math.round(acc/total26*100):0}%</td>`;body.appendChild(tr);});}const tb=$("advisorTopTableBody");if(tb){tb.innerHTML="";const by={};sorted.forEach(c=>{const a=c.asesorAsignado||"SIN ASIGNACION";by[a]=by[a]||[];by[a].push(c);});Object.keys(by).sort().forEach(a=>{by[a].slice(0,10).forEach((c,i)=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${esc(a)}</td><td>${i+1}</td><td>${esc(c.cliente)}</td><td>${money(c.ventaDash)}</td>`;tb.appendChild(tr);});});}}
function renderInsightsV812(d){const ul=$("directorInsights");if(!ul)return;ul.innerHTML="";const items=[];items.push(d.growth>=0?`La venta acumulada crece ${pctV812(d.growth)} frente al mismo periodo 2025.`:`La venta acumulada decrece ${pctV812(Math.abs(d.growth))} frente al mismo periodo 2025.`);items.push(`${d.pareto} clientes explican aproximadamente el 80% de la venta actual; conviene revisarlos semanalmente.`);if(d.advisorRows&&d.advisorRows.length)items.push(`El asesor con mayor venta acumulada es ${d.advisorRows[0][0]} con ${money(d.advisorRows[0][1])}.`);items.push(`${d.withSale} clientes tienen venta en el año actual; revisar clientes activos sin compra reciente puede generar recuperación rápida.`);items.forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});}
function showViewV812(view){currentViewV812=view;const showDash=view==="dashboard";const dash=$("directorDashboardView");if(dash)dash.classList.toggle("hidden-view",!showDash);document.querySelectorAll(".filters,.kpi-grid,.type-grid,.breakdown,.table-card").forEach(el=>el.classList.toggle("hidden-view",showDash));["dailyUpdatePanel","growthConfigPanel","usageAdminPanel","masterDataAdminPanel","syncAdminPanel"].forEach(id=>{const el=$(id);if(el)el.classList.toggle("hidden-view",showDash);});document.querySelectorAll(".sidebar nav a").forEach(a=>a.classList.remove("active"));if(showDash&&$("navDashboard"))$("navDashboard").classList.add("active");if(!showDash&&$("navRoute"))$("navRoute").classList.add("active");if(showDash)renderDirectorDashboardV812();}
function exportDashboardCsvV812(){const clients=directorClientsV812();const total26=clients.reduce((s,c)=>s+totalYtdV812(c,2026),0),total25=clients.reduce((s,c)=>s+totalYtdV812(c,2025),0);const rows=[["Indicador","Valor"],["Venta 2026",total26],["Venta 2025 comparable",total25],["Crecimiento %",total25?((total26/total25)-1)*100:0],["Clientes con venta",clients.filter(c=>totalYtdV812(c,2026)>0).length]];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="radar_dashboard_director_resumen.csv";document.body.appendChild(a);a.click();document.body.removeChild(a);}
document.addEventListener("DOMContentLoaded",()=>{if($("navDashboard"))$("navDashboard").addEventListener("click",()=>showViewV812("dashboard"));if($("navRoute"))$("navRoute").addEventListener("click",()=>showViewV812("route"));if($("navUpdate"))$("navUpdate").addEventListener("click",()=>showViewV812("route"));if($("exportDashboardBtn"))$("exportDashboardBtn").addEventListener("click",exportDashboardCsvV812);});

// ===============================
// V8.15 - Tendencia proyectada Dashboard Director (Método B: índice estacional 2025)
// ===============================
// Lógica: se ancla la proyección en el ÚLTIMO MES CON DATO REAL de 2026 (venta actual).
// Para cada mes futuro, se calcula cuánto varió ese mes en 2025 respecto al mes ancla de 2025
// (mismo mes que el mes actual, ej. Mayo) y se aplica esa misma variación porcentual sobre
// el valor real de 2026. Así la línea punteada "hereda" la forma/estacionalidad de 2025
// pero arranca siempre desde el dato real más reciente de 2026, no desde un promedio genérico.
// Fallback: si el mes ancla de 2025 fue 0 (o no hay dato), se usa el promedio de los meses
// transcurridos de 2025 como referencia, para evitar división por cero o distorsiones.
function tendenciaProyectadaV815(m25, m26){
  const anchorIdx = (typeof latestIdxV812 === "function") ? latestIdxV812() : (() => {
    let last = -1; m26.forEach((v,i)=>{ if(Number(v||0) > 0) last = i; }); return last;
  })();
  if(anchorIdx < 0 || anchorIdx >= m26.length) return m26.map(()=>null);
  const anchor = Number(m26[anchorIdx] || 0);
  const anchor25 = Number(m25[anchorIdx] || 0);
  const avg25Base = m25.slice(0, anchorIdx + 1).reduce((s,v)=>s + Number(v || 0), 0) / Math.max(1, anchorIdx + 1);
  const ref = anchor25 > 0 ? anchor25 : avg25Base;
  const trend = m26.map(()=>null);
  trend[anchorIdx] = anchor; // el punto de arranque coincide con el último dato real, para que la línea conecte visualmente
  for(let i = anchorIdx + 1; i < m25.length; i++){
    const mes25 = Number(m25[i] || 0);
    if(ref > 0){
      trend[i] = Math.max(0, anchor * (mes25 / ref));
    } else if(anchor > 0){
      trend[i] = anchor; // sin referencia histórica confiable: proyección plana sobre el último dato real
    } else {
      trend[i] = null; // sin dato real 2026 ni referencia 2025: no se proyecta (evita inventar cifras)
    }
  }
  return trend;
}

// ===============================
// V8.13 - Dashboard Director estratégico
// ===============================
let directorLineV813 = "espumas";
function lineSaleMonthV813(c, year, month){
  if(year === 2025) return directorLineV813 === "espumas" ? Number((c.ventas2025EspumasPorMes||{})[month]||0) : Number((c.ventas2025ColchonesPorMes||{})[month]||0);
  return directorLineV813 === "espumas" ? Number((c.ventas2026EspumasPorMes||{})[month]||0) : Number((c.ventas2026ColchonesPorMes||{})[month]||0);
}
function lineClientIncludedV813(c){
  if(directorLineV813 === "espumas") return c.tipoCliente==="Espumas"||c.tipoCliente==="Mixto"||Number(c.totalEspumas2025||0)>0||Number(c.totalEspumas2026||0)>0;
  return c.tipoCliente==="Colchones"||c.tipoCliente==="Mixto"||Number(c.totalColchones2025||0)>0||Number(c.totalColchones2026||0)>0;
}
function directorClientsV813(){
  return (DATA.clientes||[]).filter(c=>!(typeof isBlockedV87==="function"&&isBlockedV87(c))&&lineClientIncludedV813(c));
}
function dashMonthV813(){return (typeof selectedMonthV810==="function")?selectedMonthV810():(state.month||DATA.meta.currentMonthName||"Mayo")}
function totalYtdLineV813(c,year){
  const months = typeof availableMonthsV812==="function" ? availableMonthsV812() : ["Enero","Febrero","Marzo","Abril","Mayo"];
  return months.reduce((s,m)=>s+lineSaleMonthV813(c,year,m),0);
}
function renderDirectorDashboardV812(){
  const clients=directorClientsV813(), months=typeof monthsV812==="function"?monthsV812():["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"], mSel=dashMonthV813();
  const total26=clients.reduce((s,c)=>s+totalYtdLineV813(c,2026),0), total25=clients.reduce((s,c)=>s+totalYtdLineV813(c,2025),0);
  const month26=clients.reduce((s,c)=>s+lineSaleMonthV813(c,2026,mSel),0), month25=clients.reduce((s,c)=>s+lineSaleMonthV813(c,2025,mSel),0);
  const growth=total25?((total26/total25)-1)*100:0, monthGrowth=month25?((month26/month25)-1)*100:0;
  const withSale=clients.filter(c=>totalYtdLineV813(c,2026)>0).length, ticket=withSale?total26/withSale:0;
  const sorted=clients.map(c=>({...c,ventaDash:totalYtdLineV813(c,2026),ventaDash25:totalYtdLineV813(c,2025)})).filter(c=>c.ventaDash>0).sort((a,b)=>b.ventaDash-a.ventaDash);
  let acc=0, pareto=0; for(const c of sorted){acc+=c.ventaDash; pareto++; if(total26&&acc/total26>=.8) break;}
  setV812("dVenta2026",money(total26)); setV812("dVenta2025",money(total25)); setV812("dCrecimiento",pctV812(growth)); setV812("dClientesVenta",withSale.toLocaleString("es-CO")); setV812("dParetoClientes",pareto.toLocaleString("es-CO")); setV812("dTicketPromedio",money(ticket));
  const m25=months.map(m=>clients.reduce((s,c)=>s+lineSaleMonthV813(c,2025,m),0)), m26=months.map(m=>clients.reduce((s,c)=>s+lineSaleMonthV813(c,2026,m),0));
  const tendencia=tendenciaProyectadaV815(m25,m26);
  chartV812("monthlySalesChart",{type:"line",data:{labels:months,datasets:[{label:"2025",data:m25,tension:.25,borderColor:"#4dc9f6",backgroundColor:"rgba(77,201,246,0.12)",pointBackgroundColor:"#4dc9f6"},{label:"2026",data:m26,tension:.25,borderColor:"#f53794",backgroundColor:"rgba(245,55,148,0.12)",pointBackgroundColor:"#f53794"},{label:"Tendencia proyectada 2026",data:tendencia,tension:.25,borderDash:[6,4],borderColor:"#f59e0b",backgroundColor:"rgba(245,158,11,0.08)",pointRadius:2,pointStyle:"circle",pointBackgroundColor:"#f59e0b",fill:false}]},options:{responsive:true,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
  const adv={}; clients.forEach(c=>{const a=c.asesorAsignado||"SIN ASIGNACION"; adv[a]=adv[a]||{v26:0,v25:0}; adv[a].v26+=totalYtdLineV813(c,2026); adv[a].v25+=totalYtdLineV813(c,2025);});
  const advRows=Object.entries(adv).sort((a,b)=>b[1].v26-a[1].v26).slice(0,10);
  chartV812("advisorSalesChart",{type:"bar",data:{labels:advRows.map(x=>x[0]),datasets:[{label:"2025",data:advRows.map(x=>x[1].v25)},{label:"2026",data:advRows.map(x=>x[1].v26)}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{position:"bottom"}},scales:{x:{beginAtZero:true}}}});
  const classRows=["A","B","C","E","N"].map(k=>{const g=clients.filter(c=>(c.clasificacion||"N")===k); const v=g.reduce((s,c)=>s+lineSaleMonthV813(c,2026,mSel),0); return {k,count:g.length,ventaMes:v};});
  const totalClass=classRows.reduce((s,x)=>s+x.ventaMes,0);
  chartV812("classSalesChart",{type:"bar",data:{labels:classRows.map(x=>`${x.k} (${totalClass?Math.round(x.ventaMes/totalClass*100):0}%)`),datasets:[{label:"Clientes",data:classRows.map(x=>x.count)},{label:"Venta mes",data:classRows.map(x=>x.ventaMes)}]},options:{responsive:true,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
  const status={}; clients.forEach(c=>{const k=c.estado||"Sin estado"; status[k]=(status[k]||0)+1;});
  const statusRows=Object.entries(status).sort((a,b)=>b[1]-a[1]);
  chartV812("statusChart",{type:"bar",data:{labels:statusRows.map(x=>`${x[0]} (${x[1]})`),datasets:[{label:"Clientes",data:statusRows.map(x=>x[1])}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  const factClientes=months.map(m=>clients.filter(c=>lineSaleMonthV813(c,2026,m)>0).length), avgOrder=months.map((m,i)=>factClientes[i]?m26[i]/factClientes[i]:0);
  chartV812("monthlyCustomersChart",{type:"bar",data:{labels:months,datasets:[{label:"Clientes facturando",data:factClientes},{label:"Orden promedio",data:avgOrder}]},options:{responsive:true,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});
  renderParetoV813(sorted,total26); renderInsightsV813({growth,monthGrowth,pareto,withSale,advisorRows:advRows});
}
function renderParetoV813(sorted,total26){
  const body=$("paretoTableBody"); if(body){body.innerHTML=""; let acc=0; sorted.slice(0,15).forEach((c,i)=>{acc+=c.ventaDash; const tr=document.createElement("tr"); tr.innerHTML=`<td>${i+1}</td><td>${esc(c.cliente)}</td><td>${esc(c.asesorAsignado)}</td><td>${esc(c.tipoCliente)}</td><td>${money(c.ventaDash)}</td><td>${total26?Math.round(acc/total26*100):0}%</td>`; body.appendChild(tr);});}
  const tb=$("advisorTopTableBody"); if(tb){tb.innerHTML=""; const by={}; sorted.forEach(c=>{const a=c.asesorAsignado||"SIN ASIGNACION"; by[a]=by[a]||[]; by[a].push(c);}); Object.keys(by).sort().forEach(a=>{by[a].slice(0,10).forEach((c,i)=>{const g=c.ventaDash25?((c.ventaDash/c.ventaDash25)-1)*100:0; const tr=document.createElement("tr"); tr.innerHTML=`<td>${esc(a)}</td><td>${i+1}</td><td>${esc(c.cliente)}</td><td>${money(c.ventaDash)}</td><td>${money(c.ventaDash25)}</td><td>${pctV812(g)}</td>`; tb.appendChild(tr);});});}
}
function renderInsightsV813(d){
  const ul=$("directorInsights"); if(!ul)return; ul.innerHTML=""; const items=[];
  items.push(d.growth>=0?`La venta acumulada crece ${pctV812(d.growth)} frente al mismo periodo 2025.`:`La venta acumulada decrece ${pctV812(Math.abs(d.growth))} frente al mismo periodo 2025.`);
  items.push(d.monthGrowth>=0?`En el mes seleccionado la venta crece ${pctV812(d.monthGrowth)} vs el mismo mes 2025.`:`En el mes seleccionado la venta cae ${pctV812(Math.abs(d.monthGrowth))} vs el mismo mes 2025.`);
  items.push(`${d.pareto} clientes explican aproximadamente el 80% de la venta acumulada de la línea seleccionada.`);
  if(d.advisorRows&&d.advisorRows.length)items.push(`El asesor con mayor venta acumulada en la línea es ${d.advisorRows[0][0]} con ${money(d.advisorRows[0][1].v26)}.`);
  items.push(`${d.withSale} clientes tienen venta acumulada en 2026 para la línea seleccionada.`);
  items.forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});
}
document.addEventListener("DOMContentLoaded",()=>{const toggle=$("directorLineToggle"); if(toggle){toggle.value=directorLineV813; toggle.addEventListener("change",e=>{directorLineV813=e.target.value; renderDirectorDashboardV812();});}});

// ===============================
// V8.14 - Salud del Portafolio de Clientes + Glosario
// ===============================
function medianV814(values){const arr=values.filter(v=>Number(v)>0).sort((a,b)=>a-b);if(!arr.length)return 0;const mid=Math.floor(arr.length/2);return arr.length%2?arr[mid]:(arr[mid-1]+arr[mid])/2;}
function statusByMonthV814(c,year,monthIndex){const months=typeof monthsV812==="function"?monthsV812():["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];const m=months[monthIndex];const sale=lineSaleMonthV813(c,year,m);const prev=monthIndex>0?lineSaleMonthV813(c,year,months[monthIndex-1]):0;const first=months.findIndex(mm=>lineSaleMonthV813(c,year,mm)>0);if(first>=0&&monthIndex-first<3&&sale>0)return"Nuevo";if(sale>0&&monthIndex>0){let gap=true;for(let i=Math.max(0,monthIndex-4);i<monthIndex;i++){if(lineSaleMonthV813(c,year,months[i])>0)gap=false;}if(gap&&monthIndex>=4)return"Reingresado";}if(sale>0||prev>0)return"Activo";let last=-1;for(let i=0;i<=monthIndex;i++){if(lineSaleMonthV813(c,year,months[i])>0)last=i;}if(last<0)return"Baja";const g=monthIndex-last;if(g===2)return"Inactivo";if(g===3)return"PB";if(g>=4)return"Baja";return"Activo";}
function portfolioSummaryV814(year,monthIndex){const states={Activo:0,Nuevo:0,Inactivo:0,PB:0,Baja:0,Reingresado:0};directorClientsV813().forEach(c=>{const st=statusByMonthV814(c,year,monthIndex);states[st]=(states[st]||0)+1;});return states;}
function renderPortfolioHealthV814(){const months=typeof monthsV812==="function"?monthsV812():["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];const mSel=dashMonthV813();const idx=Math.max(0,months.indexOf(mSel));const clients=directorClientsV813();const current=portfolioSummaryV814(2026,idx),prevMonth=portfolioSummaryV814(2026,Math.max(0,idx-1)),prevYear=portfolioSummaryV814(2025,idx);const monthSales=clients.reduce((s,c)=>s+lineSaleMonthV813(c,2026,mSel),0);const monthSales25=clients.reduce((s,c)=>s+lineSaleMonthV813(c,2025,mSel),0);const activeClients=clients.filter(c=>lineSaleMonthV813(c,2026,mSel)>0).length;const orderAvg=activeClients?monthSales/activeClients:0;const meta=monthSales25?monthSales25*1.1:0;const cumplimiento=meta?(monthSales/meta)*100:0;const base=(current.Activo||0)+(current.Nuevo||0)+(current.PB||0);const indice=base?((current.Activo||0)/base)*100:0;const recPB=clients.filter(c=>statusByMonthV814(c,2026,Math.max(0,idx-1))==="PB"&&lineSaleMonthV813(c,2026,mSel)>0).length;const recB=clients.filter(c=>statusByMonthV814(c,2026,Math.max(0,idx-1))==="Baja"&&lineSaleMonthV813(c,2026,mSel)>0).length;const recovered=recPB+recB;const newBajas=clients.filter(c=>statusByMonthV814(c,2026,Math.max(0,idx-1))==="PB"&&statusByMonthV814(c,2026,idx)==="Baja").length;const prevPB=prevMonth.PB||0;if($("hCumplimientoMes"))$("hCumplimientoMes").textContent=pctV812(cumplimiento);if($("hActivos"))$("hActivos").textContent=((current.Activo||0)+(current.Reingresado||0)).toLocaleString("es-CO");if($("hOrdenPromedio"))$("hOrdenPromedio").textContent=money(orderAvg);if($("hIndiceActividad"))$("hIndiceActividad").textContent=pctV812(indice);if($("hRecuperacion"))$("hRecuperacion").textContent=prevPB?pctV812((recovered/prevPB)*100):"0%";if($("hPerdida"))$("hPerdida").textContent=prevPB?pctV812((newBajas/prevPB)*100):"0%";const evolution=months.map((m,i)=>portfolioSummaryV814(2026,i));chartV812("portfolioEvolutionChart",{type:"line",data:{labels:months,datasets:[{label:"Activos",data:evolution.map(x=>x.Activo||0),tension:.25},{label:"Nuevos",data:evolution.map(x=>x.Nuevo||0),tension:.25},{label:"PB",data:evolution.map(x=>x.PB||0),tension:.25},{label:"Baja",data:evolution.map(x=>x.Baja||0),tension:.25},{label:"Reingresados",data:evolution.map(x=>x.Reingresado||0),tension:.25}]},options:{responsive:true,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true}}}});renderClassificationEvolutionV814();renderStateEvolutionV814(prevYear,prevMonth,current);}
function renderClassificationEvolutionV814(){const clients=directorClientsV813();const body=$("classificationEvolutionBody");if(!body)return;body.innerHTML="";const med25=medianV814(clients.map(c=>totalYtdLineV813(c,2025)));const med26=medianV814(clients.map(c=>totalYtdLineV813(c,2026)));if($("median2025"))$("median2025").textContent=money(med25);if($("median2026"))$("median2026").textContent=money(med26);if($("medianGrowth"))$("medianGrowth").textContent=med25?pctV812(((med26/med25)-1)*100):"0%";["A","B","C","E","N"].forEach(k=>{const g=clients.filter(c=>(c.clasificacion||"N")===k);const c25=g.filter(c=>totalYtdLineV813(c,2025)>0).length;const c26=g.filter(c=>totalYtdLineV813(c,2026)>0).length;const v25=g.reduce((s,c)=>s+totalYtdLineV813(c,2025),0);const v26=g.reduce((s,c)=>s+totalYtdLineV813(c,2026),0);const tr=document.createElement("tr");tr.innerHTML=`<td>${k}</td><td>${c25}</td><td>${c26}</td><td>${c26-c25}</td><td>${money(v25)}</td><td>${money(v26)}</td><td>${v25?pctV812(((v26/v25)-1)*100):"0%"}</td>`;body.appendChild(tr);});}
function renderStateEvolutionV814(prevYear,prevMonth,current){const body=$("stateEvolutionBody");if(!body)return;body.innerHTML="";["Activo","Nuevo","Inactivo","PB","Baja","Reingresado"].forEach(st=>{const a=prevYear[st]||0,p=prevMonth[st]||0,c=current[st]||0;const lectura=c>p?"Sube vs mes anterior":c<p?"Baja vs mes anterior":"Estable";const tr=document.createElement("tr");tr.innerHTML=`<td>${st}</td><td>${a}</td><td>${p}</td><td>${c}</td><td>${lectura}</td>`;body.appendChild(tr);});}
const previousRenderDirectorV814=renderDirectorDashboardV812;renderDirectorDashboardV812=function(){previousRenderDirectorV814();renderPortfolioHealthV814();};
function showGlossaryV814(){const glossary=$("glossaryView"),dash=$("directorDashboardView");if(glossary)glossary.classList.remove("hidden-view");if(dash)dash.classList.add("hidden-view");document.querySelectorAll(".filters,.kpi-grid,.type-grid,.breakdown,.table-card").forEach(el=>el.classList.add("hidden-view"));["dailyUpdatePanel","growthConfigPanel","usageAdminPanel","masterDataAdminPanel","syncAdminPanel"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden-view");});document.querySelectorAll(".sidebar nav a").forEach(a=>a.classList.remove("active"));if($("navGlossary"))$("navGlossary").classList.add("active");}
const previousShowViewV814=showViewV812;showViewV812=function(view){const glossary=$("glossaryView");if(glossary)glossary.classList.add("hidden-view");previousShowViewV814(view);};
document.addEventListener("DOMContentLoaded",()=>{if($("navGlossary"))$("navGlossary").addEventListener("click",showGlossaryV814);});

// ===============================
// V9.0 - Dirección Comercial y S&OP
// ===============================
function getSopGoalsV90(){try{return JSON.parse(localStorage.getItem("radarSopGoalsV90")||"{}")}catch(e){return{}}}
function saveSopGoalsV90(g){localStorage.setItem("radarSopGoalsV90",JSON.stringify(g))}
function sopKeyV90(month,line){return `${month}_${line}`}
function fillSopMonthSelectV90(){const sel=$("sopMonthSelect");if(!sel||sel.dataset.ready)return;const months=typeof monthsV812==="function"?monthsV812():["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];sel.innerHTML="";months.forEach(m=>{const op=document.createElement("option");op.value=m;op.textContent=m;sel.appendChild(op)});sel.dataset.ready="true"}
function loadSopInputsV90(){fillSopMonthSelectV90();const month=(typeof dashMonthV813==="function")?dashMonthV813():(state.month||"Mayo");if($("sopMonthSelect"))$("sopMonthSelect").value=month;const goals=getSopGoalsV90();if($("sopMetaEspumas"))$("sopMetaEspumas").value=goals[sopKeyV90(month,"espumas")]||"";if($("sopMetaColchones"))$("sopMetaColchones").value=goals[sopKeyV90(month,"colchones")]||""}
function saveSopInputsV90(){const month=$("sopMonthSelect")?.value||((typeof dashMonthV813==="function")?dashMonthV813():"Mayo");const goals=getSopGoalsV90();goals[sopKeyV90(month,"espumas")]=Number($("sopMetaEspumas")?.value||0);goals[sopKeyV90(month,"colchones")]=Number($("sopMetaColchones")?.value||0);saveSopGoalsV90(goals);renderDirectorDashboardV812()}
function selectedSopGoalV90(){const month=$("sopMonthSelect")?.value||((typeof dashMonthV813==="function")?dashMonthV813():"Mayo");const line=typeof directorLineV813!=="undefined"?directorLineV813:"espumas";return Number(getSopGoalsV90()[sopKeyV90(month,line)]||0)}
function renderSopKpisV90(monthSales){const goal=selectedSopGoalV90();const gap=Math.max(goal-monthSales,0);const comp=goal?(monthSales/goal)*100:0;if($("sopCompliance"))$("sopCompliance").textContent=pctV812(comp);if($("sopGap"))$("sopGap").textContent=money(gap);if($("sopGoalShown"))$("sopGoalShown").textContent=money(goal);if($("sopRealSale"))$("sopRealSale").textContent=money(monthSales);if($("hCumplimientoMes")&&goal)$("hCumplimientoMes").textContent=pctV812(comp)}
function fillAdvisorTopSelectorV90(){const sel=$("advisorTopSelector");if(!sel||sel.dataset.ready)return;Array.from(new Set((DATA.clientes||[]).map(c=>c.asesorAsignado).filter(Boolean))).sort().forEach(a=>{const op=document.createElement("option");op.value=a;op.textContent=a;sel.appendChild(op)});sel.dataset.ready="true"}
function selectedAdvisorTopV90(){return $("advisorTopSelector")?.value||"todos"}
if(typeof renderParetoV813==="function"){renderParetoV813=function(sorted,total26){const body=$("paretoTableBody");if(body){body.innerHTML="";let acc=0;sorted.slice(0,15).forEach((c,i)=>{acc+=c.ventaDash;const tr=document.createElement("tr");tr.innerHTML=`<td>${i+1}</td><td>${esc(c.cliente)}</td><td>${esc(c.asesorAsignado)}</td><td>${esc(c.tipoCliente)}</td><td>${money(c.ventaDash)}</td><td>${total26?Math.round(acc/total26*100):0}%</td>`;body.appendChild(tr)})}fillAdvisorTopSelectorV90();const tb=$("advisorTopTableBody");if(tb){tb.innerHTML="";const chosen=selectedAdvisorTopV90();const by={};sorted.forEach(c=>{const a=c.asesorAsignado||"SIN ASIGNACION";if(chosen!=="todos"&&a!==chosen)return;by[a]=by[a]||[];by[a].push(c)});Object.keys(by).sort().forEach(a=>{by[a].slice(0,10).forEach((c,i)=>{const g=c.ventaDash25?((c.ventaDash/c.ventaDash25)-1)*100:0;const tr=document.createElement("tr");tr.innerHTML=`<td>${esc(a)}</td><td>${i+1}</td><td>${esc(c.cliente)}</td><td>${money(c.ventaDash)}</td><td>${money(c.ventaDash25)}</td><td>${pctV812(g)}</td>`;tb.appendChild(tr)})})}}}
function hasActivityInRollingWindowV90(c,year,monthIndex){const months=typeof monthsV812==="function"?monthsV812():["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];for(let i=Math.max(0,monthIndex-11);i<=monthIndex;i++){if(lineSaleMonthV813(c,year,months[i])>0)return true}return false}
if(typeof portfolioSummaryV814==="function"){portfolioSummaryV814=function(year,monthIndex){const states={Activo:0,Nuevo:0,Inactivo:0,PB:0,Baja:0,Reingresado:0};directorClientsV813().filter(c=>hasActivityInRollingWindowV90(c,year,monthIndex)).forEach(c=>{const st=statusByMonthV814(c,year,monthIndex);states[st]=(states[st]||0)+1});return states}}
const previousRenderDirectorV90=renderDirectorDashboardV812;renderDirectorDashboardV812=function(){previousRenderDirectorV90();loadSopInputsV90();const clients=directorClientsV813?directorClientsV813():[];const month=(typeof dashMonthV813==="function")?dashMonthV813():(state.month||"Mayo");const sales=clients.reduce((s,c)=>s+lineSaleMonthV813(c,2026,month),0);renderSopKpisV90(sales)}
document.addEventListener("DOMContentLoaded",()=>{fillSopMonthSelectV90();loadSopInputsV90();if($("saveSopGoalsBtn"))$("saveSopGoalsBtn").addEventListener("click",saveSopInputsV90);if($("sopMonthSelect"))$("sopMonthSelect").addEventListener("change",()=>{loadSopInputsV90();renderDirectorDashboardV812()});if($("advisorTopSelector"))$("advisorTopSelector").addEventListener("change",()=>renderDirectorDashboardV812())});

// ===============================
// V9.1 - Segmentos Comerciales
// ===============================
function normalizeAdvisorV91(name){
  return String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toUpperCase()
    .trim();
}

function commercialSegmentV91(c){
  const a = normalizeAdvisorV91(c.asesorAsignado);
  if(a.includes("HERCILIA") || a.includes("ALBEIRO")) return "Industria";
  if(a.includes("NATALIA")) return "B2P/B2C";
  if(a.includes("CRISTIAN") || a.includes("RUBEN") || a.includes("RUBÉN") || a.includes("YESICA") || a.includes("KATHERIN") || a.includes("KATHERINE")) return "B2B";
  return "Sin segmento";
}

function segmentRowsV91(){
  return ["Industria","B2B","B2P/B2C","Sin segmento"];
}

function clientsBySegmentV91(segment){
  const base = (typeof directorClientsV813 === "function") ? directorClientsV813() : (DATA.clientes || []);
  return base.filter(c => commercialSegmentV91(c) === segment);
}

function ytdSegmentV91(clients, year){
  if(typeof totalYtdLineV813 === "function"){
    return clients.reduce((s,c)=>s+totalYtdLineV813(c, year),0);
  }
  return 0;
}

function monthSegmentV91(clients, year, month){
  if(typeof lineSaleMonthV813 === "function"){
    return clients.reduce((s,c)=>s+lineSaleMonthV813(c, year, month),0);
  }
  return 0;
}

function renderCommercialSegmentsV91(){
  const months = typeof monthsV812 === "function" ? monthsV812() : ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const month = typeof dashMonthV813 === "function" ? dashMonthV813() : (state.month || "Mayo");
  const segments = segmentRowsV91();
  const rows = segments.map(seg => {
    const clients = clientsBySegmentV91(seg);
    const venta26 = ytdSegmentV91(clients, 2026);
    const venta25 = ytdSegmentV91(clients, 2025);
    const ventaMes = monthSegmentV91(clients, 2026, month);
    const clientesMes = clients.filter(c => lineSaleMonthV813(c, 2026, month) > 0).length;
    const ticketMes = clientesMes ? ventaMes / clientesMes : 0;
    const health = typeof statusByMonthV814 === "function"
      ? clients.reduce((acc,c)=>{
          const idx = months.indexOf(month);
          const st = statusByMonthV814(c, 2026, Math.max(0, idx));
          acc[st] = (acc[st] || 0) + 1;
          return acc;
        },{})
      : {};
    return {seg, clients, venta26, venta25, ventaMes, clientesMes, ticketMes, health};
  }).filter(r => r.clients.length || r.venta26 || r.venta25);

  const total26 = rows.reduce((s,r)=>s+r.venta26,0);

  if(typeof chartV812 === "function"){
    chartV812("segmentEvolutionChart", {
      type: "line",
      data: {
        labels: months,
        datasets: rows.filter(r=>r.seg!=="Sin segmento").map(r => ({
          label: r.seg,
          data: months.map(m => monthSegmentV91(r.clients, 2026, m)),
          tension: .25
        }))
      },
      options: { responsive:true, plugins:{legend:{position:"bottom"}}, scales:{y:{beginAtZero:true}} }
    });

    chartV812("segmentSalesChart", {
      type: "doughnut",
      data: {
        labels: rows.map(r=>r.seg),
        datasets: [{ label:"Venta 2026", data: rows.map(r=>r.venta26) }]
      },
      options: { responsive:true, plugins:{legend:{position:"bottom"}} }
    });

    chartV812("segmentActivationChart", {
      type: "bar",
      data: {
        labels: rows.map(r=>r.seg),
        datasets: [{
          label: "Activación %",
          data: rows.map(r => r.clients.length ? (r.clientesMes / r.clients.length) * 100 : 0)
        }]
      },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} }
    });
  }

  const body = $("segmentSummaryBody");
  if(body){
    body.innerHTML = "";
    rows.forEach(r => {
      const crec = r.venta25 ? ((r.venta26 / r.venta25) - 1) * 100 : 0;
      const part = total26 ? (r.venta26 / total26) * 100 : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.seg}</td><td>${money(r.venta26)}</td><td>${money(r.venta25)}</td><td>${typeof pctV812==="function"?pctV812(crec):Math.round(crec)+"%"}</td><td>${r.clientesMes}</td><td>${money(r.ticketMes)}</td><td>${typeof pctV812==="function"?pctV812(part):Math.round(part)+"%"}</td>`;
      body.appendChild(tr);
    });
  }

  const hbody = $("segmentHealthBody");
  if(hbody){
    hbody.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.seg}</td><td>${r.health.Activo||0}</td><td>${r.health.Nuevo||0}</td><td>${r.health.PB||0}</td><td>${r.health.Baja||0}</td><td>${r.health.Reingresado||0}</td>`;
      hbody.appendChild(tr);
    });
  }
}

const previousRenderDirectorV91 = typeof renderDirectorDashboardV812 === "function" ? renderDirectorDashboardV812 : null;
if(previousRenderDirectorV91){
  renderDirectorDashboardV812 = function(){
    previousRenderDirectorV91();
    renderCommercialSegmentsV91();
  }
}

// ===============================
// V9.3 / V1.2 - Gestión de Clientes y Gestión de Asesores
// Modelo de datos: perfiles de asesor, historial mensual, fecha de creación, transferido
// ===============================

function saveDataV93(){
  localStorage.setItem("radarV8Data", JSON.stringify(DATA));
}

function ensureAsesorPerfilesV93(){
  DATA.meta.asesorPerfiles = DATA.meta.asesorPerfiles || {};
  (DATA.meta.asesores || []).forEach(a => {
    if(!DATA.meta.asesorPerfiles[a]){
      DATA.meta.asesorPerfiles[a] = { correo:"", telefono:"", estado:"Activo", fechaNacimiento:"", municipio:"", canal:"", zona:"", pendienteAprobacion:false };
    }
  });
  // Compatibilidad hacia atrás: perfiles creados antes de agregar municipio/canal/zona.
  Object.keys(DATA.meta.asesorPerfiles).forEach(a => {
    const p = DATA.meta.asesorPerfiles[a];
    if(p.municipio === undefined) p.municipio = "";
    if(p.canal === undefined) p.canal = "";
    if(p.zona === undefined) p.zona = "";
  });
}

function registerAsesorIfNewV93(name, opts){
  opts = opts || {};
  const pending = opts.pending !== undefined ? opts.pending : true;
  ensureAsesorPerfilesV93();
  const clean = String(name || "").trim().toUpperCase();
  if(!clean) return clean;
  if(!(DATA.meta.asesores || []).includes(clean)){
    DATA.meta.asesores.push(clean);
    DATA.meta.asesores.sort();
  }
  if(!DATA.meta.asesorPerfiles[clean]){
    DATA.meta.asesorPerfiles[clean] = { correo:"", telefono:"", estado: pending ? "Pendiente" : "Activo", fechaNacimiento:"", municipio:"", canal:"", zona:"", pendienteAprobacion: !!pending };
  }
  return clean;
}

function approveAdvisorV93(name){
  ensureAsesorPerfilesV93();
  const perfil = DATA.meta.asesorPerfiles[name];
  if(!perfil) return;
  perfil.pendienteAprobacion = false;
  if(perfil.estado === "Pendiente") perfil.estado = "Activo";
  saveDataV93();
  if(typeof renderAdvisorsManagementV93 === "function") renderAdvisorsManagementV93();
  if(typeof renderClientsManagementV93 === "function") renderClientsManagementV93();
  fillAdvisorFilter();
  render();
}

function monthKeyV93(year, monthName){
  const idx = monthsV812().indexOf(monthName);
  return `${year}-${String(idx + 1).padStart(2, "0")}`;
}

function currentMonthKeyV93(){
  const months = monthsV812();
  const idx = latestIdxV812();
  return monthKeyV93(2026, months[idx]);
}

function previousMonthKeyV93(){
  const idx = latestIdxV812();
  if(idx === 0) return monthKeyV93(2025, monthsV812()[11]);
  return monthKeyV93(2026, monthsV812()[idx - 1]);
}

function sameMonthLastYearKeyV93(){
  const idx = latestIdxV812();
  return monthKeyV93(2025, monthsV812()[idx]);
}

function ensureHistorialAsesorV93(c){
  c.historialAsesorPorMes = c.historialAsesorPorMes || {};
}

function snapshotAsesorMesActualV93(c){
  ensureHistorialAsesorV93(c);
  const k = currentMonthKeyV93();
  if(!(k in c.historialAsesorPorMes)){
    c.historialAsesorPorMes[k] = c.asesorAsignado || "SIN ASIGNACION";
  }
}

function snapshotAllClientsCurrentMonthV93(){
  (DATA.clientes || []).forEach(snapshotAsesorMesActualV93);
}

function asesorMesPasadoV93(c){
  ensureHistorialAsesorV93(c);
  const k = previousMonthKeyV93();
  return c.historialAsesorPorMes[k] || "--------";
}

function asesorMismoMesAnioPasadoV93(c){
  ensureHistorialAsesorV93(c);
  const k = sameMonthLastYearKeyV93();
  return c.historialAsesorPorMes[k] || "--------";
}

function computeFechaCreacionV93(c){
  const months = monthsV812();
  for(const year of [2025, 2026]){
    for(let i = 0; i < months.length; i++){
      if(saleMonthV812(c, year, months[i]) > 0){
        return `${year}-${String(i + 1).padStart(2, "0")}-01`;
      }
    }
  }
  return "";
}

function ensureFechaCreacionV93(c){
  if(!c.fechaCreacion){
    const d = computeFechaCreacionV93(c);
    if(d) c.fechaCreacion = d;
  }
}

function ensureFechaCreacionAllV93(){
  (DATA.clientes || []).forEach(ensureFechaCreacionV93);
}

function isTransferidoRecienteV93(c){
  if(!c.fechaTransferencia) return false;
  const t = new Date(c.fechaTransferencia).getTime();
  if(Number.isNaN(t)) return false;
  const days = (Date.now() - t) / 86400000;
  return days >= 0 && days <= 92;
}

function reassignClienteV93(c, newAdvisorRaw, opts){
  opts = opts || {};
  const newAdvisor = String(newAdvisorRaw || "").trim().toUpperCase();
  if(!c || !newAdvisor) return false;
  const oldAdvisor = c.asesorAsignado || "SIN ASIGNACION";
  if(oldAdvisor === newAdvisor) return false;
  if(newAdvisor !== "SIN ASIGNACION"){
    registerAsesorIfNewV93(newAdvisor, { pending: !!opts.isNewAdvisor });
  }
  logMasterChangeV86(c.nit, c.cliente, "asesorAsignado", oldAdvisor, newAdvisor);
  c.asesorAsignado = newAdvisor;
  c.asesorAnterior = oldAdvisor;
  c.fechaTransferencia = new Date().toISOString();
  ensureHistorialAsesorV93(c);
  c.historialAsesorPorMes[currentMonthKeyV93()] = newAdvisor;
  saveDataV93();
  return true;
}

function nitsDuplicadosV93(){
  const counts = {};
  (DATA.clientes || []).forEach(c => {
    const n = cleanNit(c.nit);
    if(!n) return;
    counts[n] = (counts[n] || 0) + 1;
  });
  return new Set(Object.keys(counts).filter(n => counts[n] > 1));
}

function clientesSinAsignacionV93(){
  return (DATA.clientes || []).filter(c => !c.asesorAsignado || c.asesorAsignado === "SIN ASIGNACION");
}

function clientesSinNombreV93(){
  return (DATA.clientes || []).filter(c => !c.cliente || !String(c.cliente).trim() || String(c.cliente).startsWith("Cliente "));
}

function initV93(){
  ensureAsesorPerfilesV93();
  if(typeof ensureCanalCatalogV94 === "function") ensureCanalCatalogV94();
  (DATA.clientes || []).forEach(c => {
    ensureHistorialAsesorV93(c);
    snapshotAsesorMesActualV93(c);
    ensureFechaCreacionV93(c);
  });
  saveDataV93();
}

function fmtDateV93(iso){
  if(!iso) return "—";
  const parts = String(iso).split("-");
  if(parts.length < 3) return String(iso);
  return `${parts[2].slice(0,2)}/${parts[1]}/${parts[0]}`;
}

// -------- Navegación de las nuevas pestañas --------

function hideAllPrimaryViewsV93(){
  document.querySelectorAll(".filters,.kpi-grid,.type-grid,.breakdown,.table-card").forEach(el => el.classList.add("hidden-view"));
  ["dailyUpdatePanel","growthConfigPanel","usageAdminPanel","masterDataAdminPanel","syncAdminPanel"].forEach(id => {
    const el = $(id); if(el) el.classList.add("hidden-view");
  });
  const dash = $("directorDashboardView"); if(dash) dash.classList.add("hidden-view");
  const glossary = $("glossaryView"); if(glossary) glossary.classList.add("hidden-view");
  const cv = $("clientsManagementView"); if(cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if(av) av.classList.add("hidden-view");
  document.querySelectorAll(".sidebar nav a").forEach(a => a.classList.remove("active"));
}

function showClientsManagementV93(){
  if(!isAdminV86()) return;
  hideAllPrimaryViewsV93();
  const cv = $("clientsManagementView"); if(cv) cv.classList.remove("hidden-view");
  if($("navClients")) $("navClients").classList.add("active");
  renderClientsAlertsV93();
  renderClientsManagementV93();
}

function showAdvisorsManagementV93(){
  if(!isAdminV86()) return;
  hideAllPrimaryViewsV93();
  const av = $("advisorsManagementView"); if(av) av.classList.remove("hidden-view");
  if($("navAdvisors")) $("navAdvisors").classList.add("active");
  renderAdvisorsManagementV93();
}

const previousShowViewV93 = showViewV812;
showViewV812 = function(view){
  const cv = $("clientsManagementView"); if(cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if(av) av.classList.add("hidden-view");
  previousShowViewV93(view);
};

const previousShowGlossaryV93 = showGlossaryV814;
showGlossaryV814 = function(){
  const cv = $("clientsManagementView"); if(cv) cv.classList.add("hidden-view");
  const av = $("advisorsManagementView"); if(av) av.classList.add("hidden-view");
  previousShowGlossaryV93();
};

const previousApplyAdminVisibilityV93 = applyAdminVisibilityV811;
applyAdminVisibilityV811 = function(){
  previousApplyAdminVisibilityV93();
  const admin = isAdminProfileV811();
  ["navClients","navAdvisors"].forEach(id => {
    const el = $(id);
    if(el) el.style.display = admin ? "" : "none";
  });
};

// -------- Gestión de Clientes: estado, filtros, tabla y paginación --------

let clientsMgmtStateV93 = { search:"", filter:"todos", sort:"cliente", page:1 };

function setClientsFilterV93(f){
  clientsMgmtStateV93.filter = f;
  clientsMgmtStateV93.page = 1;
  const sel = $("clientsMgmtFilter");
  if(sel) sel.value = f;
  renderClientsManagementV93();
}

function filteredClientsMgmtV93(){
  const q = (clientsMgmtStateV93.search || "").toLowerCase().trim();
  const dupSet = nitsDuplicadosV93();
  let rows = (DATA.clientes || []).filter(c => {
    if(q && ![c.nit, c.cliente, c.asesorAsignado].join(" ").toLowerCase().includes(q)) return false;
    if(clientsMgmtStateV93.filter === "sinAsignacion" && c.asesorAsignado && c.asesorAsignado !== "SIN ASIGNACION") return false;
    if(clientsMgmtStateV93.filter === "duplicados" && !dupSet.has(cleanNit(c.nit))) return false;
    if(clientsMgmtStateV93.filter === "sinNombre" && !(!c.cliente || !String(c.cliente).trim() || String(c.cliente).startsWith("Cliente "))) return false;
    if(clientsMgmtStateV93.filter === "transferidos" && !isTransferidoRecienteV93(c)) return false;
    return true;
  });
  const sort = clientsMgmtStateV93.sort;
  rows = rows.slice().sort((a, b) => {
    if(sort === "nit") return String(a.nit || "").localeCompare(String(b.nit || ""));
    if(sort === "asesor") return String(a.asesorAsignado || "").localeCompare(String(b.asesorAsignado || ""));
    return String(a.cliente || "").localeCompare(String(b.cliente || ""));
  });
  return rows;
}

function renderClientsAlertsV93(){
  const bar = $("clientsAlertsBar");
  if(!bar) return;
  const sinAsig = clientesSinAsignacionV93().length;
  const dup = nitsDuplicadosV93().size;
  const sinNombre = clientesSinNombreV93().length;
  bar.innerHTML = `
    <button class="alert-chip-btn warn" data-set-filter="sinAsignacion">Sin asignación: ${sinAsig}</button>
    <button class="alert-chip-btn danger" data-set-filter="duplicados">NIT duplicado: ${dup}</button>
    <button class="alert-chip-btn warn" data-set-filter="sinNombre">Sin nombre: ${sinNombre}</button>
    <button class="alert-chip-btn ghost" data-set-filter="todos">Ver todos</button>
  `;
}

function renderClientsPaginationV93(totalPages){
  const wrap = $("clientsMgmtPagination");
  if(!wrap) return;
  wrap.innerHTML = "";
  const prev = document.createElement("button");
  prev.className = "btn ghost small-btn";
  prev.textContent = "Anterior";
  prev.disabled = clientsMgmtStateV93.page <= 1;
  prev.addEventListener("click", () => { clientsMgmtStateV93.page--; renderClientsManagementV93(); });
  const info = document.createElement("span");
  info.className = "pagination-info";
  info.textContent = `Página ${clientsMgmtStateV93.page} de ${totalPages}`;
  const next = document.createElement("button");
  next.className = "btn ghost small-btn";
  next.textContent = "Siguiente";
  next.disabled = clientsMgmtStateV93.page >= totalPages;
  next.addEventListener("click", () => { clientsMgmtStateV93.page++; renderClientsManagementV93(); });
  wrap.appendChild(prev); wrap.appendChild(info); wrap.appendChild(next);
}

function renderClientsManagementV93(){
  if(!isAdminV86()) return;
  const rows = filteredClientsMgmtV93();
  const dupSet = nitsDuplicadosV93();
  if($("clientsMgmtCount")) $("clientsMgmtCount").textContent = `${rows.length} clientes`;
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if(clientsMgmtStateV93.page > totalPages) clientsMgmtStateV93.page = totalPages;
  const start = (clientsMgmtStateV93.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);
  const body = $("clientsMgmtBody");
  if(!body) return;
  body.innerHTML = "";
  pageRows.forEach(c => {
    const alerts = [];
    if(!c.asesorAsignado || c.asesorAsignado === "SIN ASIGNACION") alerts.push('<span class="alert-chip warn">Sin asignación</span>');
    if(dupSet.has(cleanNit(c.nit))) alerts.push('<span class="alert-chip danger">NIT duplicado</span>');
    if(!c.cliente || !String(c.cliente).trim() || String(c.cliente).startsWith("Cliente ")) alerts.push('<span class="alert-chip warn">Sin nombre</span>');
    if(isTransferidoRecienteV93(c)) alerts.push('<span class="alert-chip info">Transferido</span>');
    const zonaAsesor = (typeof zonaOfAdvisorV94 === "function") ? zonaOfAdvisorV94(c.asesorAsignado) : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${esc(c.nit)}</td><td>${esc(c.cliente || "(sin nombre)")}</td><td>${esc(c.asesorAsignado || "SIN ASIGNACION")}</td><td>${esc(c.canal || "—")}</td><td>${esc(zonaAsesor)}</td><td>${esc(asesorMesPasadoV93(c))}</td><td>${esc(asesorMismoMesAnioPasadoV93(c))}</td><td>${fmtDateV93(c.fechaCreacion)}</td><td>${alerts.join(" ") || "—"}</td><td><button class="btn ghost small-btn" data-reassign-nit="${esc(c.nit)}">Reasignar</button></td>`;
    body.appendChild(tr);
  });
  renderClientsPaginationV93(totalPages);
  renderClientsAlertsV93();
}

// -------- Modal: confirmar reasignación de asesor --------

let reassignStateV93 = { nit: null };

function fillReassignSelectV93(current){
  const sel = $("reassignNewAdvisorSelect");
  if(!sel) return;
  sel.innerHTML = "";
  ["SIN ASIGNACION", ...(DATA.meta.asesores || [])].forEach(a => {
    const o = document.createElement("option");
    o.value = a; o.textContent = a;
    if(a === current) o.selected = true;
    sel.appendChild(o);
  });
}

function openReassignModalV93(nit){
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;
  reassignStateV93.nit = cleanNit(nit);
  if($("reassignModalMeta")) $("reassignModalMeta").textContent = `${c.cliente || "Cliente sin nombre"} · NIT ${c.nit}`;
  if($("reassignModalDetail")) $("reassignModalDetail").textContent = `Asesor actual: ${c.asesorAsignado || "SIN ASIGNACION"}`;
  fillReassignSelectV93(c.asesorAsignado);
  if($("reassignNewAdvisorIsNew")) $("reassignNewAdvisorIsNew").checked = false;
  if($("reassignNewAdvisorName")){ $("reassignNewAdvisorName").style.display = "none"; $("reassignNewAdvisorName").value = ""; }
  if($("reassignNewAdvisorSelect")) $("reassignNewAdvisorSelect").style.display = "";
  if($("reassignConfirmModal")) $("reassignConfirmModal").classList.add("open");
}

function closeReassignModalV93(){
  if($("reassignConfirmModal")) $("reassignConfirmModal").classList.remove("open");
  reassignStateV93.nit = null;
}

function confirmReassignV93(){
  if(!reassignStateV93.nit) return;
  const c = DATA.clientes.find(x => cleanNit(x.nit) === reassignStateV93.nit);
  if(!c){ closeReassignModalV93(); return; }
  const isNew = !!($("reassignNewAdvisorIsNew") && $("reassignNewAdvisorIsNew").checked);
  const newAdvisor = isNew ? ($("reassignNewAdvisorName")?.value || "").trim().toUpperCase() : ($("reassignNewAdvisorSelect")?.value || "");
  if(!newAdvisor){ alert("Selecciona o escribe un asesor."); return; }
  const changed = reassignClienteV93(c, newAdvisor, { isNewAdvisor: isNew });
  closeReassignModalV93();
  if(changed){
    renderClientsManagementV93();
    if(typeof renderAdvisorsManagementV93 === "function") renderAdvisorsManagementV93();
    fillAdvisorFilter();
    render();
  }
}

// -------- Carga masiva Excel: asignación de clientes --------

let clientsUploadValidatedV93 = [];

function lowerKeyRowV93(row){
  const out = {};
  Object.keys(row).forEach(k => { out[String(k).trim().toLowerCase()] = row[k]; });
  return out;
}

async function validateClientsUploadV93(){
  const { rows, fileName } = await readWorkbook("clientsUploadFile");
  if(!rows.length){
    if($("clientsUploadResult")) $("clientsUploadResult").innerHTML = `<strong>Estado:</strong> no se encontraron filas en ${esc(fileName)}.`;
    return;
  }
  clientsUploadValidatedV93 = rows.map(raw => {
    const row = lowerKeyRowV93(raw);
    const nit = cleanNit(row["nit"]);
    const asesorNuevo = String(row["asesor"] || "").trim().toUpperCase();
    const clienteNuevo = row["cliente"] !== undefined ? String(row["cliente"]).trim() : "";
    const deptoNuevo = row["departamento"] !== undefined ? String(row["departamento"]).trim() : "";
    const municipioNuevo = (row["municipio"] !== undefined ? row["municipio"] : row["ciudad"]) !== undefined ? String(row["municipio"] !== undefined ? row["municipio"] : row["ciudad"]).trim() : "";
    const c = DATA.clientes.find(x => cleanNit(x.nit) === nit);
    let status = "OK";
    let applicable = false;
    if(!nit) status = "Error: NIT vacío";
    else if(!c) status = "Error: NIT no encontrado";
    else {
      const willReassign = !!asesorNuevo && asesorNuevo !== String(c.asesorAsignado || "").toUpperCase();
      const isNewAdvisorName = willReassign && !(DATA.meta.asesores || []).includes(asesorNuevo);
      const clienteChanged = !!clienteNuevo && clienteNuevo !== c.cliente;
      const deptoChanged = !!deptoNuevo && deptoNuevo !== (c.departamento || "");
      const municipioChanged = !!municipioNuevo && municipioNuevo !== (c.ciudad || "");
      const actions = [];
      if(willReassign) actions.push(isNewAdvisorName ? "asesor (nuevo, pendiente)" : "asesor");
      if(clienteChanged) actions.push("cliente");
      if(deptoChanged) actions.push("departamento");
      if(municipioChanged) actions.push("municipio");
      status = actions.length ? ("OK: " + actions.join(", ")) : "Sin cambio";
      applicable = actions.length > 0;
    }
    return { nit, asesorNuevo, clienteNuevo, deptoNuevo, municipioNuevo, clienteActual: c ? c.cliente : "", asesorActual: c ? c.asesorAsignado : "", status, applicable };
  });
  const body = $("clientsUploadPreviewBody");
  if(body){
    body.innerHTML = "";
    clientsUploadValidatedV93.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(r.nit)}</td><td>${esc(r.clienteActual || "")}</td><td>${esc(r.asesorActual || "")}</td><td>${esc(r.asesorNuevo)}</td><td>${esc(r.deptoNuevo)}</td><td>${esc(r.municipioNuevo)}</td><td>${esc(r.status)}</td>`;
      body.appendChild(tr);
    });
  }
  if($("clientsUploadPreviewWrap")) $("clientsUploadPreviewWrap").style.display = "";
  const applicable = clientsUploadValidatedV93.filter(r => r.applicable).length;
  const errors = clientsUploadValidatedV93.filter(r => r.status.indexOf("Error") === 0).length;
  if($("clientsUploadResult")) $("clientsUploadResult").innerHTML = `<strong>Estado:</strong> ${clientsUploadValidatedV93.length} filas leídas de ${esc(fileName)}. ${applicable} aplicables, ${errors} con error.`;
  if($("clientsApplyBtn")) $("clientsApplyBtn").disabled = applicable === 0;
}

function applyClientsUploadV93(){
  let applied = 0;
  clientsUploadValidatedV93.forEach(r => {
    if(!r.applicable) return;
    const c = DATA.clientes.find(x => cleanNit(x.nit) === r.nit);
    if(!c) return;
    let changed = false;
    if(r.asesorNuevo && r.asesorNuevo !== String(c.asesorAsignado || "").toUpperCase()){
      const isNew = !(DATA.meta.asesores || []).includes(r.asesorNuevo);
      if(reassignClienteV93(c, r.asesorNuevo, { isNewAdvisor: isNew })) changed = true;
    }
    if(r.clienteNuevo && r.clienteNuevo !== c.cliente){
      logMasterChangeV86(c.nit, c.cliente, "cliente", c.cliente, r.clienteNuevo);
      c.cliente = r.clienteNuevo;
      changed = true;
    }
    if(r.deptoNuevo && r.deptoNuevo !== (c.departamento || "")){
      logMasterChangeV86(c.nit, c.cliente, "departamento", c.departamento, r.deptoNuevo);
      c.departamento = r.deptoNuevo;
      changed = true;
    }
    if(r.municipioNuevo && r.municipioNuevo !== (c.ciudad || "")){
      logMasterChangeV86(c.nit, c.cliente, "ciudad", c.ciudad, r.municipioNuevo);
      c.ciudad = r.municipioNuevo;
      changed = true;
    }
    if(changed) applied++;
  });
  if(typeof buildGeoCatalogV87 === "function") GEO_CATALOG_V87 = buildGeoCatalogV87();
  saveDataV93();
  if($("clientsUploadResult")) $("clientsUploadResult").innerHTML = `<strong>Estado:</strong> ${applied} clientes actualizados correctamente.`;
  if($("clientsApplyBtn")) $("clientsApplyBtn").disabled = true;
  clientsUploadValidatedV93 = [];
  if($("clientsUploadPreviewWrap")) $("clientsUploadPreviewWrap").style.display = "none";
  renderClientsManagementV93();
  if(typeof renderAdvisorsManagementV93 === "function") renderAdvisorsManagementV93();
  fillAdvisorFilter();
  render();
}

function downloadClientsTemplateV93(){
  downloadCsvV86([["NIT","Asesor (opcional)","Cliente (opcional)","Departamento (opcional)","Municipio (opcional)"]], "radar_plantilla_asignacion_clientes.csv");
}

// -------- Gestión de Asesores: tabla, aprobación y modal --------

let advisorsMgmtSearchV93 = "";

function renderAdvisorsPendingBarV93(){
  const bar = $("advisorsPendingBar");
  if(!bar) return;
  ensureAsesorPerfilesV93();
  const pending = (DATA.meta.asesores || []).filter(a => DATA.meta.asesorPerfiles[a] && DATA.meta.asesorPerfiles[a].pendienteAprobacion);
  if(!pending.length){
    bar.innerHTML = '<span class="alert-chip ok">Sin asesores pendientes de aprobación.</span>';
    return;
  }
  bar.innerHTML = pending.map(a => `<span class="alert-chip warn">Nuevo: ${esc(a)} <button class="btn small-btn" data-approve-advisor="${esc(a)}">Aprobar</button></span>`).join(" ");
}

function renderAdvisorsManagementV93(){
  if(!isAdminV86()) return;
  ensureAsesorPerfilesV93();
  const q = (advisorsMgmtSearchV93 || "").toLowerCase().trim();
  const names = (DATA.meta.asesores || []).filter(a => {
    if(!q) return true;
    const perfil = DATA.meta.asesorPerfiles[a] || {};
    return `${a} ${perfil.correo || ""}`.toLowerCase().includes(q);
  }).slice().sort();
  if($("advisorsMgmtCount")) $("advisorsMgmtCount").textContent = `${names.length} asesores`;
  const body = $("advisorsMgmtBody");
  if(body){
    body.innerHTML = "";
    names.forEach(a => {
      const perfil = DATA.meta.asesorPerfiles[a] || {};
      const count = (DATA.clientes || []).filter(c => c.asesorAsignado === a).length;
      const pendingBadge = perfil.pendienteAprobacion ? ' <span class="alert-chip warn">Pendiente</span>' : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(a)}${pendingBadge}</td><td>${esc(perfil.correo || "")}</td><td>${esc(perfil.telefono || "")}</td><td>${esc(perfil.estado || "Activo")}</td><td>${esc(perfil.municipio || "—")}</td><td>${esc(perfil.canal || "—")}</td><td>${esc(perfil.zona || "—")}</td><td>${count}</td><td><button class="btn ghost small-btn" data-edit-advisor="${esc(a)}">Editar</button></td>`;
      body.appendChild(tr);
    });
  }
  renderAdvisorsPendingBarV93();
}

function openAdvisorModalV93(name){
  ensureAsesorPerfilesV93();
  const perfil = name ? (DATA.meta.asesorPerfiles[name] || {}) : {};
  if($("advisorOriginalName")) $("advisorOriginalName").value = name || "";
  if($("advisorNameInput")){ $("advisorNameInput").value = name || ""; $("advisorNameInput").disabled = !!name; }
  if($("advisorEmailInput")) $("advisorEmailInput").value = perfil.correo || "";
  if($("advisorPhoneInput")) $("advisorPhoneInput").value = perfil.telefono || "";
  if($("advisorStatusInput")) $("advisorStatusInput").value = perfil.estado || "Activo";
  if($("advisorBirthdateInput")) $("advisorBirthdateInput").value = perfil.fechaNacimiento || "";
  if($("advisorMunicipioInput")) $("advisorMunicipioInput").value = perfil.municipio || "";
  if(typeof fillMunicipiosDatalistV94 === "function") fillMunicipiosDatalistV94();
  if(typeof fillAdvisorCanalSelectV94 === "function") fillAdvisorCanalSelectV94(perfil.canal || "");
  if(typeof fillAdvisorZonaSelectV94 === "function") fillAdvisorZonaSelectV94(perfil.canal || "", perfil.zona || "");
  if($("advisorModalTitle")) $("advisorModalTitle").textContent = name ? `Editar asesor: ${name}` : "Agregar asesor";
  if($("advisorEditModal")) $("advisorEditModal").classList.add("open");
}

function closeAdvisorModalV93(){
  if($("advisorEditModal")) $("advisorEditModal").classList.remove("open");
}

function saveAdvisorV93(){
  ensureAsesorPerfilesV93();
  const original = $("advisorOriginalName") ? $("advisorOriginalName").value : "";
  const name = String($("advisorNameInput") ? $("advisorNameInput").value : "").trim().toUpperCase();
  if(!name){ alert("El nombre del asesor es obligatorio."); return; }
  if(!original){
    if((DATA.meta.asesores || []).includes(name)){ alert("Ya existe un asesor con ese nombre."); return; }
    const correoNuevo = ($("advisorEmailInput")?.value || "").trim().toLowerCase();
    const telefonoNuevo = ($("advisorPhoneInput")?.value || "").trim();
    for(const [otroNombre, p] of Object.entries(DATA.meta.asesorPerfiles || {})){
      if(correoNuevo && String(p.correo || "").trim().toLowerCase() === correoNuevo){
        alert(`Ya existe un asesor con ese correo (${otroNombre}). Verifica que no sea un error de digitación.`);
        return;
      }
      if(telefonoNuevo && String(p.telefono || "").trim() === telefonoNuevo){
        alert(`Ya existe un asesor con ese teléfono (${otroNombre}). Verifica que no sea un error de digitación.`);
        return;
      }
    }
    registerAsesorIfNewV93(name, { pending: false });
  }
  const perfil = DATA.meta.asesorPerfiles[name] || { pendienteAprobacion:false };
  perfil.correo = ($("advisorEmailInput")?.value || "").trim();
  perfil.telefono = ($("advisorPhoneInput")?.value || "").trim();
  perfil.estado = $("advisorStatusInput")?.value || "Activo";
  perfil.fechaNacimiento = $("advisorBirthdateInput")?.value || "";
  perfil.municipio = ($("advisorMunicipioInput")?.value || "").trim();
  perfil.canal = $("advisorCanalInput")?.value || "";
  perfil.zona = $("advisorZonaInput")?.value || "";
  if(perfil.pendienteAprobacion === undefined) perfil.pendienteAprobacion = false;
  DATA.meta.asesorPerfiles[name] = perfil;
  saveDataV93();
  closeAdvisorModalV93();
  renderAdvisorsManagementV93();
  fillAdvisorFilter();
}

// -------- Carga masiva Excel: asesores --------

let advisorsUploadValidatedV93 = [];

async function validateAdvisorsUploadV93(){
  const { rows, fileName } = await readWorkbook("advisorsUploadFile");
  if(!rows.length){
    if($("advisorsUploadResult")) $("advisorsUploadResult").innerHTML = `<strong>Estado:</strong> no se encontraron filas en ${esc(fileName)}.`;
    return;
  }
  const correosExistentes = {};
  const telefonosExistentes = {};
  Object.entries(DATA.meta.asesorPerfiles || {}).forEach(([nombreExistente, p]) => {
    if(p.correo) correosExistentes[String(p.correo).trim().toLowerCase()] = nombreExistente;
    if(p.telefono) telefonosExistentes[String(p.telefono).trim()] = nombreExistente;
  });
  const correosEnEsteArchivo = {};
  const telefonosEnEsteArchivo = {};

  advisorsUploadValidatedV93 = rows.map(raw => {
    const row = lowerKeyRowV93(raw);
    const nombre = String(row["nombre"] || "").trim().toUpperCase();
    const correo = String(row["correo"] || "").trim();
    const telefono = String(row["telefono"] || row["teléfono"] || "").trim();
    const estado = String(row["estado"] || "Activo").trim();
    const municipio = String(row["municipio"] || "").trim();
    const canal = String(row["canal"] || "").trim();
    const zona = String(row["zona"] || "").trim();
    const exists = (DATA.meta.asesores || []).includes(nombre);
    let status, applicable;
    if(!nombre){
      status = "Error: Nombre vacío"; applicable = false;
    } else if(!exists){
      // Estas validaciones de duplicado SOLO aplican a asesores nuevos,
      // para evitar errores de digitación o registros falsos/mal creados.
      const correoKey = correo.toLowerCase();
      const dupCorreoExistente = correo && correosExistentes[correoKey] && correosExistentes[correoKey] !== nombre;
      const dupTelExistente = telefono && telefonosExistentes[telefono] && telefonosExistentes[telefono] !== nombre;
      const dupCorreoArchivo = correo && correosEnEsteArchivo[correoKey] && correosEnEsteArchivo[correoKey] !== nombre;
      const dupTelArchivo = telefono && telefonosEnEsteArchivo[telefono] && telefonosEnEsteArchivo[telefono] !== nombre;
      if(dupCorreoExistente){
        status = `Error: correo ya usado por ${correosExistentes[correoKey]}`; applicable = false;
      } else if(dupTelExistente){
        status = `Error: teléfono ya usado por ${telefonosExistentes[telefono]}`; applicable = false;
      } else if(dupCorreoArchivo){
        status = `Error: correo repetido en el archivo (fila de ${correosEnEsteArchivo[correoKey]})`; applicable = false;
      } else if(dupTelArchivo){
        status = `Error: teléfono repetido en el archivo (fila de ${telefonosEnEsteArchivo[telefono]})`; applicable = false;
      } else {
        status = "Nuevo (quedará pendiente de aprobación)"; applicable = true;
        if(correo) correosEnEsteArchivo[correoKey] = nombre;
        if(telefono) telefonosEnEsteArchivo[telefono] = nombre;
      }
    } else {
      status = "Actualiza datos existentes"; applicable = true;
    }
    return { nombre, correo, telefono, estado, municipio, canal, zona, status, applicable };
  });
  const body = $("advisorsUploadPreviewBody");
  if(body){
    body.innerHTML = "";
    advisorsUploadValidatedV93.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${esc(r.nombre)}</td><td>${esc(r.correo)}</td><td>${esc(r.telefono)}</td><td>${esc(r.estado)}</td><td>${esc(r.municipio)}</td><td>${esc(r.canal)}</td><td>${esc(r.zona)}</td><td>${esc(r.status)}</td>`;
      body.appendChild(tr);
    });
  }
  if($("advisorsUploadPreviewWrap")) $("advisorsUploadPreviewWrap").style.display = "";
  const applicable = advisorsUploadValidatedV93.filter(r => r.applicable).length;
  if($("advisorsUploadResult")) $("advisorsUploadResult").innerHTML = `<strong>Estado:</strong> ${advisorsUploadValidatedV93.length} filas leídas de ${esc(fileName)}. ${applicable} aplicables.`;
  if($("advisorsApplyBtn")) $("advisorsApplyBtn").disabled = applicable === 0;
}

function applyAdvisorsUploadV93(){
  let applied = 0;
  advisorsUploadValidatedV93.forEach(r => {
    if(!r.applicable) return;
    const exists = (DATA.meta.asesores || []).includes(r.nombre);
    registerAsesorIfNewV93(r.nombre, { pending: !exists });
    const perfil = DATA.meta.asesorPerfiles[r.nombre] || { pendienteAprobacion: !exists };
    if(r.correo) perfil.correo = r.correo;
    if(r.telefono) perfil.telefono = r.telefono;
    if(r.estado) perfil.estado = r.estado;
    if(r.municipio) perfil.municipio = r.municipio;
    if(r.canal) perfil.canal = r.canal;
    if(r.zona) perfil.zona = r.zona;
    DATA.meta.asesorPerfiles[r.nombre] = perfil;
    applied++;
  });
  saveDataV93();
  if($("advisorsUploadResult")) $("advisorsUploadResult").innerHTML = `<strong>Estado:</strong> ${applied} asesores actualizados correctamente.`;
  if($("advisorsApplyBtn")) $("advisorsApplyBtn").disabled = true;
  advisorsUploadValidatedV93 = [];
  if($("advisorsUploadPreviewWrap")) $("advisorsUploadPreviewWrap").style.display = "none";
  renderAdvisorsManagementV93();
  fillAdvisorFilter();
}

function downloadAdvisorsTemplateV93(){
  ensureAsesorPerfilesV93();
  const rows = [["Nombre","Correo","Telefono","Estado","Municipio","Canal","Zona"]];
  (DATA.meta.asesores || []).slice().sort().forEach(nombre => {
    const p = DATA.meta.asesorPerfiles[nombre] || {};
    rows.push([nombre, p.correo || "", p.telefono || "", p.estado || "Activo", p.municipio || "", p.canal || "", p.zona || ""]);
  });
  downloadCsvV86(rows, "radar_plantilla_asesores.csv");
}

// -------- Wiring de eventos V9.3 --------

document.addEventListener("DOMContentLoaded", () => {
  initV93();

  if($("navClients")) $("navClients").addEventListener("click", showClientsManagementV93);
  if($("navAdvisors")) $("navAdvisors").addEventListener("click", showAdvisorsManagementV93);

  if($("mgmtDownloadAssignBtn")) $("mgmtDownloadAssignBtn").addEventListener("click", downloadMasterDataV86);
  if($("mgmtDownloadLogBtn")) $("mgmtDownloadLogBtn").addEventListener("click", downloadMasterLogV86);

  if($("clientsMgmtSearch")) $("clientsMgmtSearch").addEventListener("input", e => { clientsMgmtStateV93.search = e.target.value; clientsMgmtStateV93.page = 1; renderClientsManagementV93(); });
  if($("clientsMgmtFilter")) $("clientsMgmtFilter").addEventListener("change", e => { setClientsFilterV93(e.target.value); });
  if($("clientsMgmtSort")) $("clientsMgmtSort").addEventListener("change", e => { clientsMgmtStateV93.sort = e.target.value; renderClientsManagementV93(); });
  if($("clientsMgmtUploadToggle")) $("clientsMgmtUploadToggle").addEventListener("click", () => { const p = $("clientsUploadPanel"); if(p) p.classList.toggle("hidden-view"); });
  if($("clientsValidateBtn")) $("clientsValidateBtn").addEventListener("click", validateClientsUploadV93);
  if($("clientsApplyBtn")) $("clientsApplyBtn").addEventListener("click", applyClientsUploadV93);
  if($("clientsDownloadTemplateBtn")) $("clientsDownloadTemplateBtn").addEventListener("click", downloadClientsTemplateV93);

  if($("advisorAddBtn")) $("advisorAddBtn").addEventListener("click", () => openAdvisorModalV93(null));
  if($("advisorsDownloadTemplateBtn")) $("advisorsDownloadTemplateBtn").addEventListener("click", downloadAdvisorsTemplateV93);
  if($("advisorsMgmtSearch")) $("advisorsMgmtSearch").addEventListener("input", e => { advisorsMgmtSearchV93 = e.target.value; renderAdvisorsManagementV93(); });
  if($("advisorsMgmtUploadToggle")) $("advisorsMgmtUploadToggle").addEventListener("click", () => { const p = $("advisorsUploadPanel"); if(p) p.classList.toggle("hidden-view"); });
  if($("advisorsValidateBtn")) $("advisorsValidateBtn").addEventListener("click", validateAdvisorsUploadV93);
  if($("advisorsApplyBtn")) $("advisorsApplyBtn").addEventListener("click", applyAdvisorsUploadV93);

  if($("reassignModalCloseBtn")) $("reassignModalCloseBtn").addEventListener("click", closeReassignModalV93);
  if($("reassignCancelBtn")) $("reassignCancelBtn").addEventListener("click", closeReassignModalV93);
  if($("reassignConfirmModal")) $("reassignConfirmModal").addEventListener("click", e => { if(e.target.id === "reassignConfirmModal") closeReassignModalV93(); });
  if($("reassignConfirmBtn")) $("reassignConfirmBtn").addEventListener("click", confirmReassignV93);
  if($("reassignNewAdvisorIsNew")) $("reassignNewAdvisorIsNew").addEventListener("change", e => {
    const isNew = e.target.checked;
    if($("reassignNewAdvisorName")) $("reassignNewAdvisorName").style.display = isNew ? "" : "none";
    if($("reassignNewAdvisorSelect")) $("reassignNewAdvisorSelect").style.display = isNew ? "none" : "";
  });

  if($("advisorModalCloseBtn")) $("advisorModalCloseBtn").addEventListener("click", closeAdvisorModalV93);
  if($("advisorModalCancelBtn")) $("advisorModalCancelBtn").addEventListener("click", closeAdvisorModalV93);
  if($("advisorEditModal")) $("advisorEditModal").addEventListener("click", e => { if(e.target.id === "advisorEditModal") closeAdvisorModalV93(); });
  if($("advisorSaveBtn")) $("advisorSaveBtn").addEventListener("click", saveAdvisorV93);

  document.addEventListener("click", e => {
    const t = e.target;
    if(!t || !t.dataset) return;
    if(t.dataset.reassignNit) openReassignModalV93(t.dataset.reassignNit);
    if(t.dataset.approveAdvisor) approveAdvisorV93(t.dataset.approveAdvisor);
    if(t.dataset.editAdvisor) openAdvisorModalV93(t.dataset.editAdvisor);
    if(t.dataset.setFilter) setClientsFilterV93(t.dataset.setFilter);
  });

  applyAdminVisibilityV811();
});

// ===============================
// V9.4 / V1.3 - Catálogo de Canales y Zonas, Municipio de asesor,
// bloqueo de edición individual de Departamento/Municipio del cliente
// ===============================

function ensureCanalCatalogV94(){
  if(!DATA.meta.canales){
    DATA.meta.canales = { "B2B": [], "B2P": [], "TIENDA": [], "INDUSTRIA": [] };
  }
}

function canalNamesV94(){
  ensureCanalCatalogV94();
  return Object.keys(DATA.meta.canales || {}).sort();
}

function zonasOfCanalV94(canal){
  ensureCanalCatalogV94();
  return ((DATA.meta.canales || {})[canal] || []).slice().sort();
}

function zonaOfAdvisorV94(advisorName){
  ensureAsesorPerfilesV93();
  const perfil = (DATA.meta.asesorPerfiles || {})[advisorName];
  return (perfil && perfil.zona) ? perfil.zona : "—";
}

function fillMunicipiosDatalistV94(){
  const list = $("municipiosDatalist");
  if(!list) return;
  const geo = (typeof buildGeoCatalogV87 === "function") ? buildGeoCatalogV87() : (typeof GEO_CATALOG_V87 !== "undefined" ? GEO_CATALOG_V87 : {});
  const all = new Set();
  Object.keys(geo).forEach(dep => (geo[dep] || []).forEach(city => all.add(city)));
  list.innerHTML = "";
  Array.from(all).sort().forEach(city => {
    const op = document.createElement("option");
    op.value = city;
    list.appendChild(op);
  });
}

function fillCanalSelectV94(selectedCanal){
  const sel = $("modalCanalEdit");
  if(!sel) return;
  sel.innerHTML = '<option value="">Seleccionar canal</option>';
  canalNamesV94().forEach(canal => {
    const op = document.createElement("option");
    op.value = canal; op.textContent = canal;
    if(canal === selectedCanal) op.selected = true;
    sel.appendChild(op);
  });
}

function fillAdvisorCanalSelectV94(selectedCanal){
  const sel = $("advisorCanalInput");
  if(!sel) return;
  sel.innerHTML = '<option value="">Sin canal</option>';
  canalNamesV94().forEach(canal => {
    const op = document.createElement("option");
    op.value = canal; op.textContent = canal;
    if(canal === selectedCanal) op.selected = true;
    sel.appendChild(op);
  });
}

function fillAdvisorZonaSelectV94(canal, selectedZona){
  const sel = $("advisorZonaInput");
  if(!sel) return;
  sel.innerHTML = '<option value="">Sin zona</option>';
  zonasOfCanalV94(canal).forEach(zona => {
    const op = document.createElement("option");
    op.value = zona; op.textContent = zona;
    if(zona === selectedZona) op.selected = true;
    sel.appendChild(op);
  });
}

function createCanalV94(name){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede crear canales."); return; }
  ensureCanalCatalogV94();
  const clean = String(name || "").trim().toUpperCase();
  if(!clean){ alert("Escribe el nombre del canal."); return; }
  if(DATA.meta.canales[clean]){ alert("Ya existe un canal con ese nombre."); return; }
  DATA.meta.canales[clean] = [];
  saveDataV93();
  renderCanalCatalogV94();
}

function renameCanalV94(oldName, newNameArg){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede renombrar canales."); return; }
  const raw = newNameArg !== undefined ? newNameArg : prompt(`Nuevo nombre para el canal "${oldName}":`, oldName);
  const newName = String(raw || "").trim().toUpperCase();
  if(!newName || newName === oldName) return;
  ensureCanalCatalogV94();
  if(DATA.meta.canales[newName]){ alert("Ya existe un canal con ese nombre."); return; }
  DATA.meta.canales[newName] = DATA.meta.canales[oldName] || [];
  delete DATA.meta.canales[oldName];
  ensureAsesorPerfilesV93();
  Object.keys(DATA.meta.asesorPerfiles).forEach(a => {
    if(DATA.meta.asesorPerfiles[a].canal === oldName) DATA.meta.asesorPerfiles[a].canal = newName;
  });
  (DATA.clientes || []).forEach(c => { if(c.canal === oldName) c.canal = newName; });
  saveDataV93();
  renderCanalCatalogV94();
  if(typeof renderAdvisorsManagementV93 === "function") renderAdvisorsManagementV93();
  if(typeof renderClientsManagementV93 === "function") renderClientsManagementV93();
}

function deleteCanalV94(name){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede eliminar canales."); return; }
  ensureAsesorPerfilesV93();
  const inUse = Object.keys(DATA.meta.asesorPerfiles).some(a => DATA.meta.asesorPerfiles[a].canal === name);
  if(inUse){ alert("No se puede eliminar: hay asesores asignados a este canal."); return; }
  if(!confirm(`¿Eliminar el canal "${name}" y todas sus zonas?`)) return;
  ensureCanalCatalogV94();
  delete DATA.meta.canales[name];
  saveDataV93();
  renderCanalCatalogV94();
}

function createZonaV94(canal, nameArg){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede crear zonas."); return; }
  ensureCanalCatalogV94();
  const raw = nameArg !== undefined ? nameArg : prompt(`Nueva zona dentro de "${canal}":`, "");
  const name = String(raw || "").trim().toUpperCase();
  if(!name){ if(nameArg !== undefined) alert("Escribe el nombre de la zona."); return; }
  DATA.meta.canales[canal] = DATA.meta.canales[canal] || [];
  if(DATA.meta.canales[canal].includes(name)){ alert("Ya existe una zona con ese nombre en este canal."); return; }
  DATA.meta.canales[canal].push(name);
  saveDataV93();
  renderCanalCatalogV94();
}

function renameZonaV94(canal, oldZona, newZonaArg){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede renombrar zonas."); return; }
  const raw = newZonaArg !== undefined ? newZonaArg : prompt(`Nuevo nombre para la zona "${oldZona}" (canal ${canal}):`, oldZona);
  const newZona = String(raw || "").trim().toUpperCase();
  if(!newZona || newZona === oldZona) return;
  ensureCanalCatalogV94();
  const zonas = DATA.meta.canales[canal] || [];
  if(zonas.includes(newZona)){ alert("Ya existe una zona con ese nombre en este canal."); return; }
  const idx = zonas.indexOf(oldZona);
  if(idx >= 0) zonas[idx] = newZona;
  ensureAsesorPerfilesV93();
  Object.keys(DATA.meta.asesorPerfiles).forEach(a => {
    const p = DATA.meta.asesorPerfiles[a];
    if(p.canal === canal && p.zona === oldZona) p.zona = newZona;
  });
  saveDataV93();
  renderCanalCatalogV94();
  if(typeof renderAdvisorsManagementV93 === "function") renderAdvisorsManagementV93();
  if(typeof renderClientsManagementV93 === "function") renderClientsManagementV93();
}

function deleteZonaV94(canal, zona){
  if(!isSuperAdminV93()){ alert("Solo Super Administrador puede eliminar zonas."); return; }
  ensureAsesorPerfilesV93();
  const inUse = Object.keys(DATA.meta.asesorPerfiles).some(a => {
    const p = DATA.meta.asesorPerfiles[a];
    return p.canal === canal && p.zona === zona;
  });
  if(inUse){ alert("No se puede eliminar: hay asesores asignados a esta zona."); return; }
  if(!confirm(`¿Eliminar la zona "${zona}" del canal "${canal}"?`)) return;
  ensureCanalCatalogV94();
  DATA.meta.canales[canal] = (DATA.meta.canales[canal] || []).filter(z => z !== zona);
  saveDataV93();
  renderCanalCatalogV94();
}

function renderCanalCatalogV94(){
  const body = $("canalCatalogBody");
  if(!body) return;
  ensureCanalCatalogV94();
  const superAdmin = isSuperAdminV93();
  const addRow = $("addCanalRow");
  if(addRow) addRow.style.display = superAdmin ? "" : "none";
  const canales = canalNamesV94();
  if(!canales.length){
    body.innerHTML = '<p class="field-help">Aún no hay canales definidos.</p>';
    return;
  }
  body.innerHTML = canales.map(canal => {
    const zonas = zonasOfCanalV94(canal);
    const zonaChips = zonas.length ? zonas.map(z => `
      <span class="zona-chip">${esc(z)}${superAdmin ? ` <button class="chip-btn" data-rename-zona="${esc(canal)}" data-zona="${esc(z)}" title="Renombrar zona">✎</button><button class="chip-btn" data-delete-zona="${esc(canal)}" data-zona="${esc(z)}" title="Eliminar zona">✕</button>` : ""}</span>
    `).join("") : '<span class="field-help">Sin zonas definidas.</span>';
    const canalActions = superAdmin ? `
      <button class="btn ghost small-btn" data-rename-canal="${esc(canal)}">Renombrar</button>
      <button class="btn ghost small-btn" data-delete-canal="${esc(canal)}">Eliminar</button>
    ` : "";
    const addZonaRow = superAdmin ? `
      <div class="add-zona-row">
        <input type="text" class="new-zona-input" data-canal-for-zona="${esc(canal)}" placeholder="Nueva zona"/>
        <button class="btn ghost small-btn" data-add-zona="${esc(canal)}">Agregar zona</button>
      </div>
    ` : "";
    return `
      <article class="canal-card">
        <div class="canal-card-header">
          <strong>${esc(canal)}</strong>
          <span>${canalActions}</span>
        </div>
        <div class="zona-chip-list">${zonaChips}</div>
        ${addZonaRow}
      </article>
    `;
  }).join("");
}

const previousShowAdvisorsV94 = showAdvisorsManagementV93;
showAdvisorsManagementV93 = function(){
  previousShowAdvisorsV94();
  renderCanalCatalogV94();
};

const previousOpenClientV94 = openClientDetailV81;
openClientDetailV81 = function(nit){
  previousOpenClientV94(nit);
  const c = DATA.clientes.find(x => cleanNit(x.nit) === cleanNit(nit));
  if(!c) return;
  fillCanalSelectV94(c.canal || "");
  if($("modalAsesorZonaInfo")){
    const zona = zonaOfAdvisorV94(c.asesorAsignado);
    $("modalAsesorZonaInfo").textContent = `Zona del asesor asignado: ${zona}`;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ensureCanalCatalogV94();
  saveDataV93();

  if($("addCanalBtn")) $("addCanalBtn").addEventListener("click", () => {
    createCanalV94($("newCanalNameInput")?.value || "");
    if($("newCanalNameInput")) $("newCanalNameInput").value = "";
  });

  if($("advisorCanalInput")) $("advisorCanalInput").addEventListener("change", e => {
    fillAdvisorZonaSelectV94(e.target.value, "");
  });

  document.addEventListener("click", e => {
    const t = e.target;
    if(!t || !t.dataset) return;
    if(t.dataset.renameCanal) renameCanalV94(t.dataset.renameCanal);
    if(t.dataset.deleteCanal) deleteCanalV94(t.dataset.deleteCanal);
    if(t.dataset.renameZona) renameZonaV94(t.dataset.renameZona, t.dataset.zona);
    if(t.dataset.deleteZona) deleteZonaV94(t.dataset.deleteZona, t.dataset.zona);
    if(t.dataset.addZona){
      const input = document.querySelector(`.new-zona-input[data-canal-for-zona="${t.dataset.addZona}"]`);
      createZonaV94(t.dataset.addZona, input ? input.value : "");
      if(input) input.value = "";
    }
  });
});
