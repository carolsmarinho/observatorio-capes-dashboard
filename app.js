const PILOT_URL="data/pilot-data.json";
const EVIDENCE_URL="data/evidence-data.json";
const AUDIT_URL="data/dashboard_sync_audit.csv";

let DATA=null,EVIDENCE=null,currentCriteriaCycle="2021-2024",currentArea="Psicologia",currentProgram="academic",relationFilter="all";

const semColors={reformulated:"#0a7f86",retained:"#2e4962",absorbed:"#c79524",redistributed_below_top_level:"#c9654b",split_reorganized:"#7565a4"};
const semLabels={reformulated:"Reformulado",retained:"Retido",absorbed:"Absorvido",redistributed_below_top_level:"Redistribuído",split_reorganized:"Dividido / reorganizado"};
const relationLabels={reformulated_expanded:"Reformulado e ampliado",absorbed_into_new_item:"Absorvido em novo item",reformulated_renumbered:"Reformulado / renumerado",retained_minor_rewording:"Retido, pequena redação",retained_renumbered:"Retido / renumerado",redistributed_below_top_level:"Redistribuído abaixo do top-level",split_reorganized_component:"Dividido / reorganizado",reformulated_generalized:"Reformulado / generalizado",reformulated_shifted_scope:"Reformulado / escopo deslocado"};

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function activate(sel,current){document.querySelectorAll(sel).forEach(b=>b.classList.toggle("active",b===current));}

async function init(){
  try{
    const [p,e,a]=await Promise.all([fetch(PILOT_URL,{cache:"no-store"}),fetch(EVIDENCE_URL,{cache:"no-store"}),fetch(AUDIT_URL,{cache:"no-store"})]);
    if(!p.ok||!e.ok)throw new Error("Falha ao carregar dados.");
    DATA=await p.json();EVIDENCE=await e.json();
    renderHero();renderAudit(a.ok?await a.text():"");renderArchitecture();renderCriteria();renderSemantic();renderCrosswalk();renderArea();renderConsolidation();renderSources();renderClaims();wire();setupReveal();setupZoom();
  }catch(err){console.error(err);document.querySelector("main").insertAdjacentHTML("afterbegin",'<div class="notice" style="margin:20px">Não foi possível carregar os dados do dashboard. Atualize a página ou consulte o GitHub.</div>');}
}

function wire(){
  document.querySelectorAll("#criteria-cycle button").forEach(b=>b.onclick=()=>{currentCriteriaCycle=b.dataset.cycle;activate("#criteria-cycle button",b);renderCriteria();});
  document.querySelectorAll("#relation-filter button").forEach(b=>b.onclick=()=>{relationFilter=b.dataset.filter;activate("#relation-filter button",b);renderCrosswalk();});
  document.querySelectorAll("#area-tabs button").forEach(b=>b.onclick=()=>{currentArea=b.dataset.area;activate("#area-tabs button",b);renderArea();});
  document.querySelectorAll("#program-toggle button").forEach(b=>b.onclick=()=>{currentProgram=b.dataset.program;activate("#program-toggle button",b);renderArea();});
}

function setupReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("is-visible");}),{threshold:.08});
  document.querySelectorAll(".section-reveal").forEach(el=>obs.observe(el));
}

function setupZoom(){
  document.querySelectorAll(".expand-button").forEach(btn=>btn.onclick=()=>openZoom(btn.closest(".expandable-panel")));
  document.querySelectorAll("[data-close-modal]").forEach(el=>el.onclick=closeZoom);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeZoom();});
}
function openZoom(panel){
  if(!panel)return;
  const modal=document.getElementById("zoom-modal"),content=document.getElementById("zoom-content"),title=document.getElementById("zoom-title");
  title.textContent=panel.dataset.panelTitle||"Visualização ampliada";
  content.innerHTML="";
  const clone=panel.cloneNode(true);clone.querySelectorAll("[id]").forEach(el=>el.removeAttribute("id"));content.appendChild(clone);
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}
function closeZoom(){
  const modal=document.getElementById("zoom-modal");if(!modal)return;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";
}

function renderHero(){
  document.getElementById("metric-areas").textContent=Object.keys(DATA.areas).length;
  document.getElementById("metric-relations").textContent=DATA.semanticRelations.length;
  document.getElementById("metric-safe").textContent=DATA.semanticRelations.filter(d=>d.safe_for_direct_weight_comparison).length;
  document.getElementById("metric-stable").textContent=DATA.overview.stable_weight_pairs_2017_2021+"/"+DATA.overview.total_weight_pairs_2017_2021;
}
function renderAudit(text){
  if(!text)return;const rows=text.trim().split(/\r?\n/).slice(1).filter(Boolean),passed=rows.filter(r=>r.split(",").pop()==="TRUE").length;
  document.getElementById("qa-status").textContent=passed+"/"+rows.length+" QA";
}
function renderArchitecture(){
  const target=document.getElementById("architecture-chart");
  target.innerHTML=DATA.overview.cycles.map(c=>{const rows=DATA.architectureByQuesito.filter(d=>d.cycle===c),total=rows.reduce((s,d)=>s+d.n_items,0);
    return '<div class="arch-cycle"><div class="stack-bar">'+rows.map(d=>'<div class="segment q'+d.quesito_id+'" style="height:'+((d.n_items/12)*100)+'%" title="Quesito '+d.quesito_id+': '+d.n_items+' itens">'+d.n_items+'</div>').join("")+'</div><strong>'+total+' itens</strong><small>'+esc(c.replace("-","–"))+'</small></div>';
  }).join("");
}
function criteriaFor(cycle){
  const m=new Map();
  if(cycle==="2021-2024"){DATA.semanticRelations.forEach(r=>{if(!m.has(r.old_item_id))m.set(r.old_item_id,{id:r.old_item_id,q:String(r.quesito_id),text:r.old_item_text});});}
  else{DATA.semanticRelations.forEach(r=>{if(r.new_item_id&&!m.has(r.new_item_id))m.set(r.new_item_id,{id:r.new_item_id,q:String(r.new_item_id).split(".")[0],text:r.new_item_text});});}
  return [...m.values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
}
function renderCriteria(){
  const rows=criteriaFor(currentCriteriaCycle),titles=EVIDENCE.quesitoTitles[currentCriteriaCycle],target=document.getElementById("criteria-browser");
  target.innerHTML=["1","2","3"].map(q=>'<section class="quesito-block"><div class="quesito-head"><span>QUESITO '+q+'</span><h3>'+esc(titles[q])+'</h3></div><div class="criteria-grid">'+rows.filter(r=>r.q===q).map(i=>criterionHtml(i)).join("")+'</div></section>').join("");
  target.querySelectorAll(".criterion").forEach(card=>card.onclick=()=>openCriterion(card));
}
function criterionHtml(i){
  let meta="";
  if(currentCriteriaCycle==="2021-2024"){
    meta=DATA.semanticRelations.filter(r=>r.old_item_id===i.id).map(r=>'<span class="tag '+(r.safe_for_direct_weight_comparison?"safe":"")+'">'+esc(relationLabels[r.relation_category]||r.relation_category)+'</span>').join("");
  }else{
    const origins=[...new Set(DATA.semanticRelations.filter(r=>r.new_item_id===i.id).map(r=>r.old_item_id))];
    meta='<span class="tag">Vem de: '+origins.map(esc).join(" + ")+'</span>';
  }
  return '<article class="criterion" data-title="Critério '+esc(i.id)+'"><span class="criterion-id">'+esc(i.id)+'</span><p>'+esc(i.text)+'</p><div class="criterion-meta">'+meta+'</div></article>';
}
function openCriterion(card){
  const modal=document.getElementById("zoom-modal"),content=document.getElementById("zoom-content"),title=document.getElementById("zoom-title");
  title.textContent=card.dataset.title||"Critério";content.innerHTML='<div class="panel" style="padding:28px;max-width:900px;margin:auto">'+card.innerHTML+'</div>';
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}
function renderSemantic(){
  const total=DATA.semanticClasses.reduce((s,d)=>s+d.count,0);let cursor=0,stops=[];
  DATA.semanticClasses.forEach(d=>{const start=cursor;cursor+=d.count/total*100;stops.push(semColors[d.key]+" "+start+"% "+cursor+"%");});
  document.getElementById("semantic-donut").style.background="conic-gradient("+stops.join(",")+")";
  document.getElementById("semantic-list").innerHTML=DATA.semanticClasses.map(d=>'<div class="semantic-item"><i class="swatch" style="background:'+semColors[d.key]+'"></i><div><b>'+semLabels[d.key]+'</b><small>'+Math.round(d.count/total*1000)/10+'% dos 12 itens históricos</small></div><span class="count">'+d.count+'</span></div>').join("");
}
function renderCrosswalk(){
  let rows=DATA.semanticRelations;
  if(relationFilter==="safe")rows=rows.filter(r=>r.safe_for_direct_weight_comparison);
  if(relationFilter==="complex")rows=rows.filter(r=>!r.safe_for_direct_weight_comparison);
  document.getElementById("crosswalk").innerHTML=rows.map(r=>'<article class="relation-card"><div class="relation-side"><b>'+esc(r.old_item_id)+' · 2021–2024</b><p>'+esc(r.old_item_text)+'</p></div><div class="relation-arrow">→</div><div class="relation-side"><b>'+(r.new_item_id?esc(r.new_item_id):"sem sucessor top-level")+' · 2025–2028</b><p>'+(r.new_item_text?esc(r.new_item_text):"Conteúdo redistribuído abaixo do nível top-level.")+'</p></div><div class="relation-type"><span class="tag '+(r.safe_for_direct_weight_comparison?"safe":"")+'">'+esc(relationLabels[r.relation_category]||r.relation_category)+'</span><span class="relation-note">'+(r.safe_for_direct_weight_comparison?"Comparação 1:1 de peso permitida.":"Não usar delta simples de peso.")+'</span></div></article>').join("");
}
function selectedPairs(){return EVIDENCE.exactAndMinimumWeightPairs.filter(d=>d.area===currentArea&&d.program_type===currentProgram);}
function renderArea(){
  const area=DATA.areas[currentArea],pairs=selectedPairs();
  document.getElementById("area-name").textContent=currentArea;
  document.getElementById("area-ap").textContent=area.ap_differences.join(" → ");
  document.getElementById("area-operator").textContent=area.current_operator==="minimum"?"limiares mínimos (≥)":"pesos exatos";
  document.getElementById("area-context").textContent=area.context;
  renderAreaSources();renderWeightTable(pairs,area);renderImportance(pairs);
}
function renderAreaSources(){
  const docs=EVIDENCE.sourceDocuments.filter(d=>d.area===currentArea);
  document.getElementById("area-source-links").innerHTML=docs.map(d=>'<a href="'+esc(d.url)+'" target="_blank" rel="noreferrer">'+esc(d.cycle)+' · fonte oficial ↗</a>').join("");
}
function renderWeightTable(pairs,area){
  document.getElementById("weight-table-body").innerHTML=pairs.map(p=>{const now=(p.new_operator==="minimum"?"≥":"")+p.new_weight+"%";
    let read,cls="read-ok";if(!p.interpretable){read="operador mudou";cls="read-caution";}else if(p.delta===0)read="sem mudança";else if(p.delta>0)read="+"+p.delta+" pp";else{read=p.delta+" pp";cls="read-caution";}
    return '<tr><td><b>'+esc(p.old_item_id)+' → '+esc(p.new_item_id)+'</b><span class="help-text">'+esc(p.label)+'</span></td><td>'+p.old_weight+'%</td><td>'+now+'</td><td class="'+cls+'">'+read+'</td></tr>';
  }).join("");
  document.getElementById("weight-note").innerHTML=area.current_operator==="minimum"?'<b>Como ler Química:</b> o ciclo atual usa limiares mínimos. Por isso, uma transição como 65% → ≥60% não é interpretada como −5 pp.':'<b>Como ler:</b> os dois lados são pesos exatos; por isso, o delta em pontos percentuais pode ser interpretado diretamente. '+esc(area.note||"");
}
function renderImportance(pairs){
  const interp=pairs.filter(p=>p.interpretable),up=interp.filter(p=>p.delta>0),down=interp.filter(p=>p.delta<0),same=interp.filter(p=>p.delta===0),shift=pairs.filter(p=>!p.interpretable);
  let chips='<span class="chip up">↑ ganharam peso: '+up.length+'</span><span class="chip down">↓ perderam peso: '+down.length+'</span><span class="chip same">= estáveis: '+same.length+'</span>';
  if(shift.length)chips+='<span class="chip shift">≥ operador mudou: '+shift.length+'</span>';
  if(up.length){const x=[...up].sort((a,b)=>b.delta-a.delta)[0];chips+='<span class="chip up">maior ganho: '+esc(x.label)+' (+'+x.delta+' pp)</span>';}
  if(down.length){const x=[...down].sort((a,b)=>a.delta-b.delta)[0];chips+='<span class="chip down">maior queda: '+esc(x.label)+' ('+x.delta+' pp)</span>';}
  document.getElementById("importance-summary").innerHTML=chips;
  document.getElementById("importance-chart").innerHTML=pairs.map(shiftCard).join("");
}
function shiftCard(p){
  const max=60,oldPos=Math.min(100,p.old_weight/max*100),newPos=Math.min(100,p.new_weight/max*100);let klass="same",badge="estável",viz="",note="";
  if(!p.interpretable){klass="shift";badge="limiar ≥";viz='<div class="old-point" style="left:'+oldPos+'%"></div><div class="minimum-zone" style="left:'+newPos+'%;width:'+(100-newPos)+'%"></div><div class="new-point" style="left:'+newPos+'%"></div>';note="A regra mudou para limiar mínimo; não inferimos ganho ou perda de importância.";}
  else{if(p.delta>0){klass="up";badge="+"+p.delta+" pp";note="Ganhou peso relativo dentro do quesito.";}else if(p.delta<0){klass="down";badge=p.delta+" pp";note="Perdeu peso relativo dentro do quesito.";}else{note="Manteve o mesmo peso exato.";}const left=Math.min(oldPos,newPos),width=Math.abs(newPos-oldPos);viz='<div class="connector '+klass+'" style="left:'+left+'%;width:'+Math.max(width,.6)+'%"></div><div class="old-point" style="left:'+oldPos+'%"></div><div class="new-point" style="left:'+newPos+'%"></div>';}
  return '<article class="shift-card"><div class="shift-head"><div><b>'+esc(p.label)+'</b><small>'+esc(p.old_item_id)+' → '+esc(p.new_item_id)+'</small></div><span class="shift-badge '+klass+'">'+badge+'</span></div><div class="track-shell"><div class="scale"><div class="scale-line"></div><span class="scale-tick" style="left:0%">0</span><span class="scale-tick" style="left:33.33%">20</span><span class="scale-tick" style="left:66.66%">40</span><span class="scale-tick" style="left:100%">60</span>'+viz+'</div><div class="track-labels"><span>Antes: <b>'+p.old_weight+'%</b></span><span>Agora: <b>'+(p.new_operator==="minimum"?"≥":"")+p.new_weight+'%</b></span></div></div><div class="shift-note">'+esc(note)+'</div></article>';
}
function renderConsolidation(){
  document.getElementById("consolidation-grid").innerHTML=DATA.consolidation.map(d=>'<div class="consolidation-card"><b>'+esc(d.area)+'</b><div class="transition">'+d.old_weight+'% → '+(d.new_operator==="minimum"?"≥":"")+d.new_weight+'%</div><small>'+(d.interpretable?"Comparação direcional possível: ambos são pesos exatos.":"Não interpretar como redução simples: o valor atual é um limiar mínimo.")+'</small></div>').join("");
}
function renderSources(){
  document.getElementById("source-documents").innerHTML=EVIDENCE.sourceDocuments.map(d=>'<article class="source-card"><span class="area">'+esc(d.area)+'</span><span class="cycle">'+esc(d.cycle)+'</span><p><b>'+esc(d.document_title)+'</b><br><span class="help-text">'+esc(d.note)+'</span></p><a href="'+esc(d.url)+'" target="_blank" rel="noreferrer">Abrir fonte ↗</a></article>').join("");
}
function renderClaims(){
  document.getElementById("claims-list").innerHTML=DATA.claims.map(c=>'<article class="claim"><button type="button"><b>'+esc(c.claim_id)+' · '+esc(c.claim)+'</b><span>+</span></button><div class="claim-body"><p><strong>Evidência</strong>'+esc(c.evidence)+'</p><p><strong>Limite</strong>'+esc(c.interpretation_limit)+'</p></div></article>').join("");
  document.querySelectorAll(".claim button").forEach(b=>b.onclick=()=>{const c=b.parentElement;c.classList.toggle("open");b.querySelector("span").textContent=c.classList.contains("open")?"−":"+";});
}
init();