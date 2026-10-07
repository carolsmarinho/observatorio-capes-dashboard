const DATA_URL = "data/pilot-data.json";

const fallback = {
  overview: {
    areas: ["Psicologia", "Química", "Saúde Coletiva"],
    cycles: ["2017-2020", "2021-2024", "2025-2028"]
  }
};

let DATA = fallback;
let currentArea = "Psicologia";
let currentProgram = "academic";

const semanticColors = {
  reformulated: "#087e8b",
  retained: "#243b53",
  absorbed: "#d7a928",
  redistributed_below_top_level: "#d96c4d",
  split_reorganized: "#7868a6"
};

const semanticLabels = {
  reformulated: "Reformulado",
  retained: "Retido",
  absorbed: "Absorvido",
  redistributed_below_top_level: "Redistribuído abaixo do top-level",
  split_reorganized: "Dividido / reorganizado"
};

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Falha ao carregar dados");
    DATA = await response.json();
  } catch (error) {
    console.error(error);
    showDataError();
    return;
  }

  renderArchitecture();
  renderSemantic();
  renderArea();
  renderConsolidation();
  wireControls();
}

function showDataError() {
  const target = document.querySelector(".section-overview");
  if (!target) return;
  const note = document.createElement("p");
  note.className = "weight-note";
  note.textContent = "Não foi possível carregar a camada de dados do dashboard. Tente atualizar a página.";
  target.prepend(note);
}

function renderArchitecture() {
  const target = document.getElementById("architecture-chart");
  if (!target || !DATA.architectureByQuesito) return;

  const cycles = DATA.overview.cycles;
  target.innerHTML = cycles.map(function(cycle) {
    const rows = DATA.architectureByQuesito.filter(function(d) { return d.cycle === cycle; });
    const total = rows.reduce(function(sum, d) { return sum + d.n_items; }, 0);
    const segments = rows.map(function(d) {
      const pct = (d.n_items / 12) * 100;
      return '<div class="segment q' + d.quesito_id + '" style="height:' + pct + '%" title="Quesito ' +
        d.quesito_id + ': ' + d.n_items + ' itens">' + d.n_items + '</div>';
    }).join("");

    return '<div class="arch-cycle">' +
      '<div class="stack-bar">' + segments + '</div>' +
      '<strong>' + total + ' itens</strong>' +
      '<span>' + cycle.replace("-", "–") + '</span>' +
      '</div>';
  }).join("");
}

function renderSemantic() {
  if (!DATA.semanticClasses) return;
  const total = DATA.semanticClasses.reduce(function(sum, d) { return sum + d.count; }, 0);
  let cursor = 0;
  const stops = [];

  DATA.semanticClasses.forEach(function(d) {
    const start = cursor;
    cursor += (d.count / total) * 100;
    stops.push(semanticColors[d.key] + " " + start + "% " + cursor + "%");
  });

  const donut = document.getElementById("semantic-donut");
  if (donut) donut.style.background = "conic-gradient(" + stops.join(",") + ")";

  const list = document.getElementById("semantic-list");
  if (!list) return;
  list.innerHTML = DATA.semanticClasses.map(function(d) {
    const pct = Math.round((d.count / total) * 1000) / 10;
    return '<div class="semantic-item">' +
      '<span class="semantic-swatch" style="background:' + semanticColors[d.key] + '"></span>' +
      '<div><strong>' + semanticLabels[d.key] + '</strong><small>' + pct + '% dos itens históricos</small></div>' +
      '<span class="semantic-count">' + d.count + '</span>' +
      '</div>';
  }).join("");
}

function wireControls() {
  document.querySelectorAll(".area-tab").forEach(function(button) {
    button.addEventListener("click", function() {
      currentArea = button.dataset.area;
      document.querySelectorAll(".area-tab").forEach(function(b) {
        const active = b === button;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      renderArea();
    });
  });

  document.querySelectorAll("#program-toggle button").forEach(function(button) {
    button.addEventListener("click", function() {
      currentProgram = button.dataset.program;
      document.querySelectorAll("#program-toggle button").forEach(function(b) {
        b.classList.toggle("active", b === button);
      });
      renderArea();
    });
  });
}

function renderArea() {
  if (!DATA.areas || !DATA.areas[currentArea]) return;
  const area = DATA.areas[currentArea];

  document.getElementById("area-name").textContent = currentArea;
  document.getElementById("area-ap").textContent = area.ap_differences.join(" → ");
  document.getElementById("area-operator").textContent =
    area.current_operator === "minimum" ? "Limiar mínimo (≥)" : "Peso exato";
  document.getElementById("area-context").textContent = area.context;

  const chart = document.getElementById("weight-chart");
  const note = document.getElementById("weight-note");
  const toggle = document.getElementById("program-toggle");

  if (area.current_operator === "minimum") {
    toggle.style.visibility = "hidden";
    chart.innerHTML =
      '<div class="minimum-state">' +
      '<div><div class="symbol">≥</div><h4>Química muda a própria regra de ponderação</h4>' +
      '<p>Os pesos de 2025–2028 são limiares mínimos. Por isso, diferenças numéricas em relação ao ciclo anterior não são interpretadas como aumento, redução ou estabilidade de alocação.</p></div>' +
      '</div>';
    note.textContent = "Exemplo: 65% → ≥60% não é interpretado como redução de 5 pontos percentuais.";
    return;
  }

  toggle.style.visibility = "visible";
  const rows = area.safe_changes.filter(function(d) { return d.program_type === currentProgram; });
  const maxAbs = Math.max.apply(null, rows.map(function(d) { return Math.abs(d.delta); }).concat([1]));

  chart.innerHTML = rows.map(function(d) {
    const width = Math.max(2, (Math.abs(d.delta) / maxAbs) * 48);
    const cls = d.delta > 0 ? "pos" : d.delta < 0 ? "neg" : "zero";
    const display = d.delta > 0 ? "+" + d.delta : String(d.delta);
    return '<div class="weight-row">' +
      '<div class="weight-label">' + d.old_item + ' → ' + d.new_item + ' · ' + d.label + '</div>' +
      '<div class="delta-track"><span class="delta-bar ' + cls + '" style="width:' + width + '%"></span></div>' +
      '<div class="delta-value">' + display + ' pp</div>' +
      '</div>';
  }).join("");

  note.textContent = area.note;
}

function renderConsolidation() {
  const target = document.getElementById("consolidation-grid");
  if (!target || !DATA.consolidation) return;

  target.innerHTML = DATA.consolidation.map(function(d) {
    const newDisplay = d.new_operator === "minimum" ? "≥" + d.new_weight + "%" : d.new_weight + "%";
    const explanation = d.interpretable
      ? "Comparação direta válida: ambos os lados são pesos exatos."
      : "Comparação direcional não válida: o valor atual é um limiar mínimo.";
    return '<article class="consolidation-card">' +
      '<p class="mini-label">Consolidação 1.1 + 1.2 → novo 1.1</p>' +
      '<h4>' + d.area + '</h4>' +
      '<div class="weight-transition"><strong>' + d.old_weight + '%</strong><span>→</span><strong>' + newDisplay + '</strong></div>' +
      '<p>' + explanation + '</p>' +
      '</article>';
  }).join("");
}

init();
