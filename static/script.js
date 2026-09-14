const GERENCIA_DE_CONTAS = "GERENCIA DE CONTAS";

const STATUS_TABS = ["Pendente", "Aguardando solicitante", "Encerrado"];

const state = {
  view: "solicitante", // 'solicitante' (aberto pela GC) | 'responsavel' (aberto para a GC)
  statusTab: "Pendente",
  filters: {
    cliente: "",
    departamento: "",
    responsavel: "",
    coordenador: "",
    problema: "",
    dataDe: "",
    dataAte: "",
  },
  expandedId: null,
};

function situacaoPillClass(situacao) {
  if (situacao === "Encerrado") return "situacao-pill--encerrado";
  if (situacao === "Entregue Ao Solicitante" || situacao === "Devolvido para Solicitante") return "situacao-pill--aguardando";
  return "situacao-pill--pendente";
}

function formatDate(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatInt(n) {
  return (n || 0).toLocaleString("pt-BR");
}

function formatDias(n) {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " d";
}

function getViewData(view) {
  if (view === "solicitante") {
    return CHAMADOS_DATA.filter((c) => c.deptoSolicitante === GERENCIA_DE_CONTAS);
  }
  return CHAMADOS_DATA.filter((c) => c.deptoResponsavel === GERENCIA_DE_CONTAS);
}

function departamentoField(view) {
  // Coluna "Departamento" da tabela: no view solicitante mostramos quem está
  // atendendo (Depto. Responsavel); no view responsavel mostramos quem pediu
  // (Depto. Solicitante).
  return view === "solicitante" ? "deptoResponsavel" : "deptoSolicitante";
}

function departamentoLabel(view) {
  return view === "solicitante" ? "Departamento Responsável" : "Departamento Solicitante";
}

function uniqueSorted(list, field) {
  return [...new Set(list.map((c) => c[field]).filter((v) => v))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}

function populateSelect(select, values, placeholder) {
  const current = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
  if (values.includes(current)) select.value = current;
}

function refreshFilterOptions() {
  const viewData = getViewData(state.view);
  const depField = departamentoField(state.view);

  document.getElementById("labelDepartamento").textContent = departamentoLabel(state.view);
  populateSelect(document.getElementById("filtroDepartamento"), uniqueSorted(viewData, depField), "Todos");
  populateSelect(document.getElementById("filtroResponsavel"), uniqueSorted(viewData, "responsavel"), "Todos");
  populateSelect(document.getElementById("filtroCoordenador"), uniqueSorted(viewData, "coordenador"), "Todos");
  populateSelect(document.getElementById("filtroProblema"), uniqueSorted(viewData, "problema"), "Todos");
}

function applyFilters(list) {
  const f = state.filters;
  const depField = departamentoField(state.view);
  const clienteTerm = f.cliente.trim().toLowerCase();

  return list.filter((c) => {
    if (clienteTerm) {
      const alvo = `${c.idCliente ?? ""} ${c.cliente}`.toLowerCase();
      if (!alvo.includes(clienteTerm)) return false;
    }
    if (f.departamento && c[depField] !== f.departamento) return false;
    if (f.responsavel && c.responsavel !== f.responsavel) return false;
    if (f.coordenador && c.coordenador !== f.coordenador) return false;
    if (f.problema && c.problema !== f.problema) return false;
    if (f.dataDe && (!c.dataAbertura || c.dataAbertura < f.dataDe)) return false;
    if (f.dataAte && (!c.dataAbertura || c.dataAbertura > f.dataAte)) return false;
    return true;
  });
}

function isEntregue(c) {
  return !!c.dataEntrega;
}

function renderCards(filteredList) {
  const total = filteredList.length;
  const porStatus = { Pendente: 0, "Aguardando solicitante": 0, Encerrado: 0 };
  filteredList.forEach((c) => {
    if (porStatus[c.status] !== undefined) porStatus[c.status] += 1;
  });

  document.getElementById("cardTotal").textContent = formatInt(total);
  document.getElementById("cardPendente").textContent = formatInt(porStatus["Pendente"]);
  document.getElementById("cardAguardando").textContent = formatInt(porStatus["Aguardando solicitante"]);
  document.getElementById("cardEncerrado").textContent = formatInt(porStatus["Encerrado"]);

  const pct = (n) => (total ? `${((n / total) * 100).toFixed(0)}% do total` : "-");
  document.getElementById("cardPendentePct").textContent = pct(porStatus["Pendente"]);
  document.getElementById("cardAguardandoPct").textContent = pct(porStatus["Aguardando solicitante"]);
  document.getElementById("cardEncerradoPct").textContent = pct(porStatus["Encerrado"]);

  const entregues = filteredList.filter(isEntregue);
  if (entregues.length) {
    const media = entregues.reduce((s, c) => s + (c.tempoAtendimento || 0), 0) / entregues.length;
    document.getElementById("cardTempoMedio").textContent = formatDias(media);
  } else {
    document.getElementById("cardTempoMedio").textContent = "-";
  }
}

function renderTabs(filteredList) {
  const counts = { Pendente: 0, "Aguardando solicitante": 0, Encerrado: 0 };
  filteredList.forEach((c) => {
    if (counts[c.status] !== undefined) counts[c.status] += 1;
  });
  document.querySelector("#tabPendente .badge").textContent = formatInt(counts["Pendente"]);
  document.querySelector("#tabAguardando .badge").textContent = formatInt(counts["Aguardando solicitante"]);
  document.querySelector("#tabEncerrado .badge").textContent = formatInt(counts["Encerrado"]);
}

function getTableColumns() {
  const cols = [
    { key: "idCliente", label: "ID Cliente" },
    { key: "cliente", label: "Cliente" },
    { key: "problema", label: "Problema" },
    { key: "departamento", label: departamentoLabel(state.view) },
    { key: "responsavel", label: "Responsável" },
    { key: "situacao", label: "Situação" },
    { key: "dataAbertura", label: "Data Abertura" },
    { key: "dataPrevisao", label: "Previsão Atend." },
  ];
  if (state.statusTab === "Aguardando solicitante") {
    cols.push({ key: "entregueQuantosDias", label: "Entregue a quantos dias" });
  }
  if (state.statusTab === "Encerrado") {
    cols.push({ key: "dataEntrega", label: "Data de Entrega" });
    cols.push({ key: "tempoAtendimento", label: "Tempo de Atendimento" });
  }
  return cols;
}

function renderTableHead() {
  const cols = getTableColumns();
  const row = document.getElementById("tableHeadRow");
  row.innerHTML = cols.map((c) => `<th>${c.label}</th>`).join("");
}

function cellValue(c, key) {
  const depField = departamentoField(state.view);
  switch (key) {
    case "idCliente":
      return c.idCliente ?? "-";
    case "cliente":
      return c.cliente || "-";
    case "problema":
      return c.problema || "-";
    case "departamento":
      return c[depField] || "-";
    case "responsavel":
      return c.responsavel || "-";
    case "situacao":
      return `<span class="situacao-pill ${situacaoPillClass(c.situacao)}">${c.situacao || "-"}</span>`;
    case "dataAbertura":
      return formatDate(c.dataAbertura);
    case "dataPrevisao":
      return formatDate(c.dataPrevisao);
    case "dataEntrega":
      return formatDate(c.dataEntrega);
    case "entregueQuantosDias":
      return formatDias(c.entregueQuantosDias);
    case "tempoAtendimento":
      return formatDias(c.tempoAtendimento);
    default:
      return "-";
  }
}

function renderTableBody(tableData) {
  const cols = getTableColumns();
  const tbody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");

  if (!tableData.length) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  const rowsHtml = tableData.map((c) => {
    const isExpanded = state.expandedId === c.id;
    const mainCells = cols
      .map((col, i) => {
        const val = cellValue(c, col.key);
        if (i === 0) {
          return `<td><span class="row-caret">▶</span>${val}</td>`;
        }
        return `<td>${val}</td>`;
      })
      .join("");

    const mainRow = `<tr class="row-main${isExpanded ? " expanded" : ""}" data-id="${c.id}">${mainCells}</tr>`;

    let detailRow = "";
    if (isExpanded) {
      detailRow = `
        <tr class="row-detail">
          <td colspan="${cols.length}">
            <div class="detail-box">
              <div class="detail-box__top">
                <span class="detail-box__id">Chamado #${c.id}</span>
                <span class="detail-box__coord"><b>Coordenador Responsável</b>${c.coordenador || "-"}</span>
              </div>
              <div>
                <div class="detail-box__desc-label">Solicitação</div>
                <div class="detail-box__desc">${(c.descricao || "-").replace(/</g, "&lt;")}</div>
              </div>
            </div>
          </td>
        </tr>`;
    }
    return mainRow + detailRow;
  });

  tbody.innerHTML = rowsHtml.join("");

  tbody.querySelectorAll("tr.row-main").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = Number(tr.dataset.id);
      state.expandedId = state.expandedId === id ? null : id;
      renderTable(currentFullFilteredList);
    });
  });
}

let currentFullFilteredList = [];

function renderTable(filteredList) {
  currentFullFilteredList = filteredList;
  const tableData = filteredList
    .filter((c) => c.status === state.statusTab)
    .sort((a, b) => (b.dataAbertura || "").localeCompare(a.dataAbertura || ""));

  document.getElementById("tabTotalCount").textContent = formatInt(tableData.length);
  renderTableHead();
  renderTableBody(tableData);
}

function renderViewCounts() {
  document.getElementById("countViewSolicitante").textContent = formatInt(
    getViewData("solicitante").length
  );
  document.getElementById("countViewResponsavel").textContent = formatInt(
    getViewData("responsavel").length
  );
}

function renderAll() {
  const viewData = getViewData(state.view);
  const filteredList = applyFilters(viewData);
  renderCards(filteredList);
  renderTabs(filteredList);
  renderTable(filteredList);
}

function bindFilterEvents() {
  const map = [
    ["filtroCliente", "cliente"],
    ["filtroDepartamento", "departamento"],
    ["filtroResponsavel", "responsavel"],
    ["filtroCoordenador", "coordenador"],
    ["filtroProblema", "problema"],
    ["filtroDataDe", "dataDe"],
    ["filtroDataAte", "dataAte"],
  ];
  map.forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      state.filters[key] = el.value;
      state.expandedId = null;
      renderAll();
    });
  });

  document.getElementById("btnLimparFiltros").addEventListener("click", () => {
    Object.keys(state.filters).forEach((k) => (state.filters[k] = ""));
    map.forEach(([elId]) => (document.getElementById(elId).value = ""));
    state.expandedId = null;
    renderAll();
  });
}

function bindViewSwitch() {
  document.getElementById("btnViewSolicitante").addEventListener("click", () => {
    setView("solicitante");
  });
  document.getElementById("btnViewResponsavel").addEventListener("click", () => {
    setView("responsavel");
  });
}

function setView(view) {
  state.view = view;
  state.expandedId = null;
  Object.keys(state.filters).forEach((k) => (state.filters[k] = ""));
  ["filtroCliente", "filtroDepartamento", "filtroResponsavel", "filtroCoordenador", "filtroProblema", "filtroDataDe", "filtroDataAte"].forEach(
    (id) => (document.getElementById(id).value = "")
  );

  document.getElementById("btnViewSolicitante").classList.toggle("active", view === "solicitante");
  document.getElementById("btnViewResponsavel").classList.toggle("active", view === "responsavel");

  refreshFilterOptions();
  renderAll();
}

function bindTabs() {
  const tabButtons = {
    tabPendente: "Pendente",
    tabAguardando: "Aguardando solicitante",
    tabEncerrado: "Encerrado",
  };
  Object.entries(tabButtons).forEach(([elId, statusValue]) => {
    document.getElementById(elId).addEventListener("click", () => {
      state.statusTab = statusValue;
      state.expandedId = null;
      Object.values(tabButtons).forEach((s) => {
        const btnId = Object.keys(tabButtons).find((k) => tabButtons[k] === s);
        document.getElementById(btnId).classList.toggle("active", s === statusValue);
      });
      renderTable(currentFullFilteredList);
    });
  });
}

function init() {
  document.getElementById("dataAtualizacao").textContent = `Base atualizada em ${CHAMADOS_UPDATED_AT}`;
  renderViewCounts();
  refreshFilterOptions();
  bindFilterEvents();
  bindViewSwitch();
  bindTabs();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
