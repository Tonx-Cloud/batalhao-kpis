/* ============================================================
   Retail Service KPIs – Dr. Batalhão
   Framework: Harvard Business School · MIT Sloan · LBS
   ============================================================ */

/* ---------- Navegação por abas ---------- */
const tabs = document.querySelectorAll('.tab');
const views = document.querySelectorAll('.view');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    views.forEach(v => v.classList.toggle('active', v.id === target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Utilitários ---------- */
const $ = (sel) => document.querySelector(sel);
const fmtNumber = (n, d = 2) =>
  isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtBRL = (n) =>
  isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtPct = (n, d = 1) => (isFinite(n) ? fmtNumber(n, d) + '%' : '—');

function safeDiv(a, b) {
  const x = Number(a), y = Number(b);
  if (!isFinite(x) || !isFinite(y) || y === 0) return NaN;
  return x / y;
}

/* ---------- Fórmulas (Harvard / MIT / LBS) ---------- */
function calcular(data) {
  const r = {};

  // Camada Cliente
  const totalNps = data.promotores + data.neutros + data.detratores;
  r.nps = totalNps > 0 ? (data.promotores / totalNps) * 100 - (data.detratores / totalNps) * 100 : NaN;
  r.csat = safeDiv(data.csatSatisfeitos, data.csatTotal) * 100;
  r.retention = safeDiv((data.clientesFinais - data.novosClientes), data.clientesIniciais) * 100;

  const baseClientes = data.clientesIniciais || data.clientesFinais;
  r.churn = safeDiv(data.clientesPerdidos, baseClientes) * 100;

  // Camada Financeira
  r.ticket = safeDiv(data.receita, data.vendas);
  const receitaMedia = safeDiv(data.receita, baseClientes);
  const margemDec = (data.margem || 0) / 100;
  const churnDec = (r.churn || 0) / 100;
  r.ltv = churnDec > 0 ? (receitaMedia * margemDec) / churnDec : NaN;
  r.cac = safeDiv(data.marketing, data.clientesAdquiridos);
  r.ltvcac = isFinite(r.ltv) && isFinite(r.cac) && r.cac > 0 ? r.ltv / r.cac : NaN;
  r.produtividade = safeDiv(data.receita, data.funcionarios);

  // Camada Operacional
  r.tempoMedio = safeDiv(data.tempoTotal, data.atendimentos);
  r.fcr = safeDiv(data.fcrResolvidos, data.fcrTotal) * 100;
  r.conversao = safeDiv(data.vendas, data.atendimentos) * 100;

  return r;
}

/* ---------- Classificação (semáforo) ---------- */
function classify(kpi, v) {
  if (!isFinite(v)) return 'na';
  switch (kpi) {
    case 'nps':        return v >= 50 ? 'ok' : v >= 0 ? 'warn' : 'bad';
    case 'csat':       return v >= 85 ? 'ok' : v >= 70 ? 'warn' : 'bad';
    case 'retention':  return v >= 80 ? 'ok' : v >= 60 ? 'warn' : 'bad';
    case 'churn':      return v <= 5  ? 'ok' : v <= 15 ? 'warn' : 'bad';
    case 'ltvcac':     return v >= 3  ? 'ok' : v >= 1  ? 'warn' : 'bad';
    case 'fcr':        return v >= 75 ? 'ok' : v >= 60 ? 'warn' : 'bad';
    case 'conv':       return v >= 30 ? 'ok' : v >= 15 ? 'warn' : 'bad';
    default:           return 'ok';
  }
}
const statusLabel = { ok: 'Excelente', warn: 'Alerta', bad: 'Crítico', na: 'Sem dados' };

/* ---------- Renderização KPIs ---------- */
function setKpi(id, value, formatted, kpiKey) {
  const card = document.querySelector(`.kpi[data-kpi="${kpiKey}"]`);
  const el = document.getElementById('kpi-' + id);
  const st = document.getElementById('status-' + id);
  el.textContent = formatted;
  const cls = classify(kpiKey, value);
  card.classList.remove('ok', 'warn', 'bad');
  if (cls !== 'na') card.classList.add(cls);
  st.textContent = statusLabel[cls];
}

function renderDashboard(r) {
  setKpi('nps',       r.nps,       fmtNumber(r.nps, 1),       'nps');
  setKpi('csat',      r.csat,      fmtPct(r.csat),            'csat');
  setKpi('retention', r.retention, fmtPct(r.retention),       'retention');
  setKpi('churn',     r.churn,     fmtPct(r.churn),           'churn');
  setKpi('ltv',       r.ltv,       fmtBRL(r.ltv),             'ltv');
  setKpi('cac',       r.cac,       fmtBRL(r.cac),             'cac');
  setKpi('ltvcac',    r.ltvcac,    fmtNumber(r.ltvcac, 2),    'ltvcac');
  setKpi('ticket',    r.ticket,    fmtBRL(r.ticket),          'ticket');
  setKpi('conv',      r.conversao, fmtPct(r.conversao),       'conv');
  setKpi('fcr',       r.fcr,       fmtPct(r.fcr),             'fcr');
  setKpi('tempo',     r.tempoMedio, isFinite(r.tempoMedio) ? fmtNumber(r.tempoMedio, 1) + ' min' : '—', 'tempo');
  setKpi('prod',      r.produtividade, fmtBRL(r.produtividade), 'prod');
}

/* ---------- Tabela ---------- */
const linhasTabela = [
  { k: 'nps',       nome: 'NPS',           form: '%Promotores − %Detratores', fmt: v => fmtNumber(v, 1) },
  { k: 'csat',      nome: 'CSAT',          form: '(satisfeitos / total) × 100', fmt: fmtPct },
  { k: 'retention', nome: 'Retenção',      form: '((Finais − Novos) / Iniciais) × 100', fmt: fmtPct },
  { k: 'churn',     nome: 'Churn',         form: '(Perdidos / Totais) × 100', fmt: fmtPct },
  { k: 'ltv',       nome: 'LTV',           form: '(Receita média × Margem) / Churn', fmt: fmtBRL },
  { k: 'cac',       nome: 'CAC',           form: 'Marketing / Clientes adquiridos', fmt: fmtBRL },
  { k: 'ltvcac',    nome: 'LTV / CAC',     form: 'LTV / CAC (ideal ≥ 3)', fmt: v => fmtNumber(v, 2) },
  { k: 'ticket',    nome: 'Ticket médio',  form: 'Receita / Nº vendas', fmt: fmtBRL },
  { k: 'conv',      nome: 'Conversão',     form: '(Vendas / Atendimentos) × 100', fmt: fmtPct, map: 'conversao' },
  { k: 'fcr',       nome: 'FCR',           form: 'Resolvidos 1º contato / Total', fmt: fmtPct },
  { k: 'tempo',     nome: 'Tempo médio',   form: 'Σ tempo / Nº atendimentos', fmt: v => isFinite(v) ? fmtNumber(v, 1) + ' min' : '—', map: 'tempoMedio' },
  { k: 'prod',      nome: 'Produtividade', form: 'Receita / Nº funcionários', fmt: fmtBRL, map: 'produtividade' },
];

function renderTabela(r) {
  const tbody = document.querySelector('#tabela-resultados tbody');
  tbody.innerHTML = '';
  linhasTabela.forEach(l => {
    const v = r[l.map || l.k];
    const cls = classify(l.k, v);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${l.nome}</b></td>
      <td>${l.fmt(v)}</td>
      <td><code>${l.form}</code></td>
      <td><span class="badge ${cls}">${statusLabel[cls]}</span></td>`;
    tbody.appendChild(tr);
  });
}

/* ---------- Diagnóstico inteligente ---------- */
function diagnosticar(r) {
  const out = [];
  const push = (level, titulo, texto) => out.push({ level, titulo, texto });

  if (isFinite(r.churn)) {
    if (r.churn > 15) push('bad', 'Churn crítico', 'A taxa de perda de clientes está muito alta. Revise a experiência do cliente (CX), pós-venda e programas de retenção.');
    else if (r.churn > 5) push('warn', 'Churn em alerta', 'Monitore causas de cancelamento e implemente ações de recuperação de clientes.');
    else push('ok', 'Churn sob controle', 'Base de clientes estável — excelente sinal de valor percebido.');
  }

  if (isFinite(r.nps)) {
    if (r.nps < 0) push('bad', 'NPS negativo', 'Há mais detratores que promotores. Priorize ações corretivas na jornada do cliente.');
    else if (r.nps < 50) push('warn', 'NPS mediano', 'Há espaço para transformar neutros em promotores — invista em encantamento.');
    else push('ok', 'NPS excelente', 'Alta lealdade: use promotores como canal de aquisição (referral).');
  }

  if (isFinite(r.ltvcac)) {
    if (r.ltvcac < 1) push('bad', 'LTV/CAC insustentável', 'Você gasta mais para adquirir do que ganha do cliente. Reduza CAC ou aumente LTV urgentemente.');
    else if (r.ltvcac < 3) push('warn', 'LTV/CAC abaixo do ideal', 'Regra Harvard/MIT: ideal ≥ 3. Trabalhe retenção, ticket e margem.');
    else push('ok', 'LTV/CAC saudável', 'Modelo economicamente eficiente para crescer.');
  }

  if (isFinite(r.ltv) && isFinite(r.ticket) && r.ltv < r.ticket * 3) {
    push('warn', 'LTV baixo vs. ticket médio', 'Aumente o ticket médio (upsell/cross-sell) ou a retenção para elevar o LTV.');
  }

  if (isFinite(r.fcr)) {
    if (r.fcr < 60) push('bad', 'FCR baixo', 'Muitos problemas não são resolvidos no primeiro contato. Treine equipe e revise processos.');
    else if (r.fcr < 75) push('warn', 'FCR mediano', 'Há oportunidade de melhorar resolução no 1º contato — impacto direto em satisfação e custo.');
    else push('ok', 'FCR excelente', 'Equipe resolutiva: reflete em CSAT e eficiência operacional.');
  }

  if (isFinite(r.conversao)) {
    if (r.conversao < 15) push('bad', 'Conversão baixa', 'Reveja abordagem de vendas, treinamento e mix de produtos/serviços.');
    else if (r.conversao < 30) push('warn', 'Conversão mediana', 'Experimente scripts, cross-sell e ofertas contextuais.');
    else push('ok', 'Conversão forte', 'Força comercial eficiente — mantenha e escale.');
  }

  if (isFinite(r.csat)) {
    if (r.csat < 70) push('bad', 'CSAT baixo', 'Satisfação transacional preocupante. Mapeie pontos de fricção.');
    else if (r.csat < 85) push('warn', 'CSAT em alerta', 'Busque excelência nos touchpoints críticos.');
  }

  const lista = document.getElementById('diagnostico-lista');
  if (out.length === 0) {
    lista.innerHTML = `<div class="card muted">Preencha os dados e clique em <b>Calcular indicadores</b> para ver o diagnóstico.</div>`;
    return;
  }
  const iconMap = { ok: '✅', warn: '⚠️', bad: '🚨' };
  lista.innerHTML = out.map(d => `
    <div class="diag-item ${d.level}">
      <div class="diag-icon">${iconMap[d.level]}</div>
      <div>
        <h4>${d.titulo}</h4>
        <p>${d.texto}</p>
      </div>
    </div>`).join('');
}

/* ---------- Gráficos (Chart.js) ---------- */
let charts = {};
function destroyChart(k) { if (charts[k]) { charts[k].destroy(); delete charts[k]; } }

function renderGraficos(r) {
  const common = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  destroyChart('customer');
  charts.customer = new Chart(document.getElementById('chart-customer'), {
    type: 'bar',
    data: {
      labels: ['NPS', 'CSAT (%)', 'Retenção (%)', 'Churn (%)'],
      datasets: [{
        data: [r.nps, r.csat, r.retention, r.churn].map(v => isFinite(v) ? +v.toFixed(2) : 0),
        backgroundColor: ['#2563eb', '#7c3aed', '#16a34a', '#dc2626'],
        borderRadius: 8
      }]
    },
    options: common
  });

  destroyChart('financial');
  charts.financial = new Chart(document.getElementById('chart-financial'), {
    type: 'bar',
    data: {
      labels: ['LTV', 'CAC', 'Ticket médio', 'Produtividade'],
      datasets: [{
        data: [r.ltv, r.cac, r.ticket, r.produtividade].map(v => isFinite(v) ? +v.toFixed(2) : 0),
        backgroundColor: ['#16a34a', '#d97706', '#2563eb', '#7c3aed'],
        borderRadius: 8
      }]
    },
    options: common
  });

  destroyChart('operational');
  charts.operational = new Chart(document.getElementById('chart-operational'), {
    type: 'bar',
    data: {
      labels: ['Tempo médio (min)', 'FCR (%)', 'Conversão (%)'],
      datasets: [{
        data: [r.tempoMedio, r.fcr, r.conversao].map(v => isFinite(v) ? +v.toFixed(2) : 0),
        backgroundColor: ['#0ea5e9', '#16a34a', '#7c3aed'],
        borderRadius: 8
      }]
    },
    options: common
  });

  const form = getFormData();
  destroyChart('nps');
  charts.nps = new Chart(document.getElementById('chart-nps'), {
    type: 'doughnut',
    data: {
      labels: ['Promotores', 'Neutros', 'Detratores'],
      datasets: [{
        data: [form.promotores || 0, form.neutros || 0, form.detratores || 0],
        backgroundColor: ['#16a34a', '#f59e0b', '#dc2626']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

/* ---------- Formulário ---------- */
function getFormData() {
  const f = document.getElementById('form-kpi');
  const fd = new FormData(f);
  const data = {};
  for (const [k, v] of fd.entries()) {
    data[k] = v === '' ? 0 : Number(v);
  }
  return data;
}

document.getElementById('form-kpi').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = getFormData();
  const r = calcular(data);
  renderDashboard(r);
  renderTabela(r);
  diagnosticar(r);
  renderGraficos(r);

  // Vai para resultados
  document.querySelector('.tab[data-tab="resultados"]').click();
});

/* ---------- Exemplo didático ---------- */
document.getElementById('btn-exemplo').addEventListener('click', () => {
  const exemplo = {
    clientesIniciais: 1000, clientesFinais: 1100, novosClientes: 250, clientesPerdidos: 150,
    receita: 500000, vendas: 2000, margem: 25, marketing: 50000, clientesAdquiridos: 250, funcionarios: 20,
    atendimentos: 3000, tempoTotal: 18000, fcrResolvidos: 2100, fcrTotal: 3000,
    promotores: 120, neutros: 60, detratores: 20, csatSatisfeitos: 180, csatTotal: 200
  };
  const form = document.getElementById('form-kpi');
  Object.entries(exemplo).forEach(([k, v]) => {
    const el = form.elements.namedItem(k);
    if (el) el.value = v;
  });
});

document.getElementById('btn-limpar').addEventListener('click', () => {
  // reset dispara naturalmente — nada extra aqui
});
