// Lê a base de chamados diretamente do arquivo Excel (data/chamados/base.xlsx),
// sem backend: o .xlsx é buscado via fetch e interpretado no navegador com SheetJS.

const BASE_XLSX_PATH = "data/chamados/base.xlsx";

let CHAMADOS_DATA = [];
let CHAMADOS_UPDATED_AT = "";

const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);

const REQUIRED_COLUMNS = [
  "Id",
  "Problema",
  "Departamento Solicitante",
  "Descricao",
  "IdCliente",
  "Cliente",
  "Responsavel",
  "Coordenador",
  "Departamento Responsavel",
  "Data de abertura",
  "Data de Entrega",
  "Tempo de atendimento",
  "Entregue a quantos dias",
  "Situacao",
  "Status",
  "Solicitante",
  "DataPrevisaoAtendimento",
];

function excelSerialToISODate(serial) {
  if (serial === null || serial === undefined || serial === "") return null;
  const n = Number(serial);
  if (Number.isNaN(n)) return null;
  const ms = EXCEL_EPOCH_UTC_MS + Math.round(n) * 86400000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toNumOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

function toStrOrEmpty(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function formatUpdatedAt(lastModifiedHeader) {
  if (!lastModifiedHeader) return "";
  const d = new Date(lastModifiedHeader);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

async function carregarBaseChamados() {
  const resp = await fetch(BASE_XLSX_PATH, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Não foi possível abrir "${BASE_XLSX_PATH}" (HTTP ${resp.status}).`);
  }

  const lastModified = resp.headers.get("Last-Modified");
  const buffer = await resp.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (!rows.length) {
    throw new Error(`A planilha "${BASE_XLSX_PATH}" está vazia.`);
  }

  const headers = rows[0].map((h) => (h === null ? "" : String(h).trim()));
  const idx = {};
  headers.forEach((h, i) => {
    idx[h] = i;
  });

  const missing = REQUIRED_COLUMNS.filter((h) => !(h in idx));
  if (missing.length) {
    throw new Error(`Colunas não encontradas em "${BASE_XLSX_PATH}": ${missing.join(", ")}`);
  }

  const col = (row, name) => (idx[name] !== undefined ? row[idx[name]] : undefined);

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawId = col(row, "Id");
    if (rawId === null || rawId === undefined || rawId === "") continue;

    out.push({
      id: Math.trunc(Number(rawId)),
      problema: toStrOrEmpty(col(row, "Problema")),
      deptoSolicitante: toStrOrEmpty(col(row, "Departamento Solicitante")),
      descricao: toStrOrEmpty(col(row, "Descricao")),
      idCliente: col(row, "IdCliente") ?? null,
      cliente: toStrOrEmpty(col(row, "Cliente")),
      responsavel: toStrOrEmpty(col(row, "Responsavel")),
      coordenador: toStrOrEmpty(col(row, "Coordenador")) || toStrOrEmpty(col(row, "Responsavel")),
      deptoResponsavel: toStrOrEmpty(col(row, "Departamento Responsavel")),
      dataAbertura: excelSerialToISODate(col(row, "Data de abertura")),
      dataEntrega: excelSerialToISODate(col(row, "Data de Entrega")),
      tempoAtendimento: toNumOrNull(col(row, "Tempo de atendimento")),
      entregueQuantosDias: toNumOrNull(col(row, "Entregue a quantos dias")),
      situacao: toStrOrEmpty(col(row, "Situacao")),
      status: toStrOrEmpty(col(row, "Status")),
      solicitante: toStrOrEmpty(col(row, "Solicitante")),
      dataPrevisao: excelSerialToISODate(col(row, "DataPrevisaoAtendimento")),
      responsavelConclusao: toStrOrEmpty(col(row, "Responsável Conclusão")),
    });
  }

  CHAMADOS_DATA = out;
  CHAMADOS_UPDATED_AT = formatUpdatedAt(lastModified) || "data não informada pelo servidor";
}
