const PILOT_URL="data/pilot-data.json";
const EVIDENCE_URL="data/evidence-data.json";
const AUDIT_URL="data/dashboard_sync_audit.csv";

let DATA=null,EVIDENCE=null,currentCriteriaCycle="2021-2024",currentArea="Psicologia",currentProgram="academic",relationFilter="all";
const semColors={reformulated:"#0c7f86",retained:"#29435c",absorbed:"#c89b27",redistributed_below_top_level:"#c9684e",split_reorganized:"#74659b"};
const semLabels={reformulated:"Reformulado",retained:"Retido",absorbed:"Absorvido",redistributed_below_top_level:"Redistribuído",split_reorganized:"Dividido / reorganizado"};
const relationLabels={
  reformulated_expanded:"Reformulado e ampliado",absorbed_into_new_item:"Absorvido em novo item",
  reformulated_renumbered:"Reformulado / renumerado",retained_minor_rewording:"Retido, pequena redação",
  retained_renumbered:"Retido / renumerado",redistributed_below_top_level:"Redistribuído abaixo do top-level",
  split_reorganized_component:"Dividido / reorganizado",reformulated_generalized:"Reformulado / generalizado",
  reformulated_shifted_scope:"Reformulado / escopo deslocado"
};

async function init(){
  try{
    const [p,e,a]=await Promise.all([fetch(PILOT_URL,{cache:"no-store"}),fetch(EVIDENCE_URL,{cache:"no-store"}),fetch(AUDIT_URL,{cache:"no-store"})]);
    if(!p.ok||!e.ok) throw new Error("Falha ao carregar dados públicos.");
    DATA=await p.json();EVIDENCE=await e.json();
    const auditText=a.ok?await a.text():"";
    renderAudit(auditText);renderArchitecture();renderCriteria();renderSemantic();renderCrosswalk();renderArea();renderConsolidation();renderSources();renderClaims();wire();
  }catch(err){console.error(err);document.querySelector("main").insertAdjacentHTML("afterbegin",'<div class="notice" style="margin:20px">Não foi possível carregar a camada de dados. Atualize a página ou consulte o GitHub.</div>');}
}

function wire(){
  document.querySelectorAll("#criteria-cycle button").forEach(b=>b.onclick=()=>{currentCriteriaCycle=b.dataset.cycle;activate("#criteria-cycle button",b);renderCriteria();});
  document.querySelectorAll("#relation-filter button").forEach(b=>b.onclick=()=>{relationFilter=b.dataset.filter;activate("#relation-filter button",b);renderCrosswalk();});
  document.querySelectorAll("#area-tabs button").forEach(b=>b.onclick=()=>{currentArea=b.dataset.area;activate("#area-tabs button",b);renderArea();});
  document.querySelectorAll("#program-toggle button").forEach(b=>b.onclick=()=>{currentProgram=b.dataset.program;activate("#program-toggle button",b);renderArea();});
}
function activate(sel,current){document.querySelectorAll(sel).forEach(b=>b.classList.toggle("active",b===current));}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}

function renderAudit(text){
  if(!text)return;const lines=text.trim().split(/\r?\n/).slice(1).filter(Boolean);const passed=lines.filter(x=>x.split(",").pop()==="TRUE").length;
  document.getElementById("qa-status").textContent=passed+"/"+lines.length+" QA";
}
function renderArchitecture(){
  const target=document.getElementById("architecture-chart");const cycles=DATA.overview.cycles;
  target.innerHTML=cycles.map(c=>{const rows=DATA.architectureByQuesito.filter(d=>d.cycle===c);const total=rows.reduce((s,d)=>s+d.n_items,0);
    const seg=rows.map(d=>'<div class="segment q'+d.quesito_id+'" style="height:'+((d.n_items/12)*100)+'%">'+d.n_items+'</div>').join("");
    return '<div class="arch-cycle"><div class="stack-bar">'+seg+'</div><strong>'+total+' itens</strong><small>'+c.replace("-","–")+'</small></div>';
  }).join("");
}
function criteriaFor(cycle){
  if(cycle==="2021-2024"){
    const m=new Map();DATA.semanticRelations.forEach(r=>{if(!m.has(r.old_item_id))m.set(r.old_item_id,{id:r.old_item_id,q:r.quesito_id,text:r.old_item_text});});return [...m.values()].sort((a,b)=>a.id.localeCompare(b.id));
  }
  const m=new Map();DATA.semanticRelations.forEach(r=>{if(r.new_item_id&&!m.has(r.new_item_id))m.set(r.new_item_id,{id:r.new_item_id,q:r.new_item_id.split(".")[0],text:r.new_item_text});});return [...m.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function renderCriteria(){
  const titles=EVIDENCE.quesitoTitles[currentCriteriaCycle],rows=criteriaFor(currentCriteriaCycle),target=document.getElementById("criteria-browser");
  target.innerHTML=["1","2","3"].map(q=>{const items=rows.filter(r=>r.q===q);return '<section class="quesito-block"><div class="quesito-head"><span>QUESITO '+q+'</span><h3>'+esc(titles[q])+'</h3></div><div class="criteria-grid">'+items.map(i=>criterionHtml(i,currentCriteriaCycle)).join("")+'</div></section>';}).join("");
}
function criterionHtml(i,cycle){
  let meta="";
  if(cycle==="2021-2024"){
    const rels=DATA.semanticRelations.filter(r=>r.old_item_id===i.id);
    meta=rels.map(r=>'<span class="tag '+(r.safe_for_direct_weight_comparison?"safe":"")+'">'+esc(relationLabels[r.relation_category]||r.relation_category)+'</span>').join(" ");
  }else{
    const origins=[...new Set(DATA.semanticRelations.filter(r=>r.new_item_id===i.id).map(r=>r.old_item_id))];
    meta='<span class="criterion-meta">Vem de: '+origins.map(esc).join(" + ")+'</span>';
  }
  return '<article class="criterion"><span class="criterion-id">'+esc(i.id)+'</span><p>'+esc(i.text)+'</p><div class="criterion-meta">'+meta+'</div></article>';
}
function renderSemantic(){
  const total=DATA.semanticClasses.reduce((s,d)=>s+d.count,0);let c=0,stops=[];
  DATA.semanticClasses.forEach(d=>{const a=c;c+=d.count/total*100;stops.push(semColors[d.key]+" "+a+"% "+c+"%");});
  document.getElementById("semantic-donut").style.background="conic-gradient("+stops.join(",")+")";
  document.getElementById("semantic-list").innerHTML=DATA.semanticClasses.map(d=>'<div class="semantic-item"><i class="swatch" style="background:'+semColors[d.key]+'"></i><div><b>'+semLabels[d.key]+'</b><small>'+Math.round(d.count/total*1000)/10+'% dos 12 itens históricos</small></div><span class="count">'+d.count+'</span></div>').join("");
}
function renderCrosswalk(){
  let rows=DATA.semanticRelations;
  if(relationFilter==="safe")rows=rows.filter(r=>r.safe_for_direct_weight_comparison);
  if(relationFilter==="complex")rows=rows.filter(r=>!r.safe_for_direct_weight_comparison);
  document.getElementById("crosswalk").innerHTML=rows.map(r=>'<article class="relation-card"><div class="relation-side"><b>'+r.old_item_id+' · 2021–2024</b><p>'+esc(r.old_item_text)+'</p></div><div class="relation-arrow">→</div><div class="relation-side"><b>'+(r.new_item_id?esc(r.new_item_id):"sem sucessor top-level")+' · 2025–2028</b><p>'+(r.new_item_text?esc(r.new_item_text):"Conteúdo redistribuído abaixo do nível top-level.")+'</p></div><div class="relation-type"><span class="tag '+(r.safe_for_direct_weight_comparison?"safe":"")+'">'+esc(relationLabels[r.relation_category]||r.relation_category)+'</span><p class="help-text">'+(r.safe_for_direct_weight_comparison?"Comparação de peso 1:1 permitida.":"Não usar delta simples de peso.")+'</p></div></article>').join("");
}
function renderArea(){
  const area=DATA.areas[currentArea],pairs=EVIDENCE.exactAndMinimumWeightPairs.filter(d=>d.area===currentArea&&d.program_type===currentProgram);
  document.getElementById("area-name").textContent=currentArea;
  document.getElementById("area-ap").textContent=area.ap_differences.join(" → ");
  document.getElementById("area-operator").textContent=area.current_operator==="minimum"?"limiares mínimos (≥)":"pesos exatos";
  document.getElementById("area-context").textContent=area.context;
  document.getElementById("weight-table-body").innerHTML=pairs.map(p=>{
    const before=p.old_weight+"%";const now=(p.new_operator==="minimum"?"≥":"")+p.new_weight+"%";
    const reading=p.interpretable?(p.delta===0?"sem mudança":(p.delta>0?"+":"")+p.delta+" pp"):"operador mudou: não calcular delta";
    return '<tr><td><b>'+p.old_item_id+' → '+p.new_item_id+'</b><br><span class="help-text">'+esc(p.label)+'</span></td><td>'+before+'</td><td>'+now+'</td><td class="'+(p.interpretable?"read-ok":"read-caution")+'">'+reading+'</td></tr>';
  }).join("");
  document.getElementById("weight-note").innerHTML=area.current_operator==="minimum"
    ?'<b>Como ler Química:</b> o ciclo atual usa limiares mínimos. Assim, 20% → ≥20% não é “sem mudança”, e 15% → ≥20% não é tratado como +5 pp. A regra de ponderação mudou.'
    :'<b>Como ler:</b> como os dois lados são pesos exatos, o delta em pontos percentuais pode ser interpretado diretamente. '+esc(area.note);
}
function renderConsolidation(){
  document.getElementById("consolidation-grid").innerHTML=DATA.consolidation.map(d=>'<div class="consolidation-card"><b>'+esc(d.area)+'</b><div class="transition">'+d.old_weight+'% → '+(d.new_operator==="minimum"?"≥":"")+d.new_weight+'%</div><small>'+(d.interpretable?"Comparação direcional permitida: ambos são pesos exatos.":"Não interpretar como redução: o valor atual é um limiar mínimo.")+'</small></div>').join("");
}
function renderSources(){
  const target=document.getElementById("source-documents");
  target.innerHTML=EVIDENCE.sourceDocuments.map(s=>'<article class="source-card" data-area="'+esc(s.area)+'"><span class="area">'+esc(s.area)+'</span><span class="cycle">'+esc(s.cycle)+'</span><p><b>'+esc(s.document_title)+'</b><br><span class="help-text">'+esc(s.note)+'</span></p><a href="'+esc(s.url)+'" target="_blank" rel="noreferrer">Abrir fonte ↗</a></article>').join("");
}
function renderClaims(){
  document.getElementById("claims-list").innerHTML=DATA.claims.map((c,i)=>'<article class="claim"><button type="button"><b>'+esc(c.claim_id)+' · '+esc(c.claim)+'</b><span>+</span></button><div class="claim-body"><p><strong>Evidência</strong>'+esc(c.evidence)+'</p><p><strong>Limite</strong>'+esc(c.interpretation_limit)+'</p></div></article>').join("");
  document.querySelectorAll(".claim button").forEach(b=>b.onclick=()=>{const p=b.parentElement;p.classList.toggle("open");b.querySelector("span").textContent=p.classList.contains("open")?"−":"+";});
}
init();
