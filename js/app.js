/* ============================================================
   Retail Service KPIs v2.0 — Dr. Batalhão
   Framework: Harvard Business School · MIT Sloan · LBS
   Inclui: Service–Profit Chain · NPV-based LTV · Sensibilidade · Comparação
   Fontes: Farris et al. (2010) "Marketing Metrics" (endossada pela MASB);
           Reichheld (HBR 2003, 2011); Heskett/Sasser/Schlesinger (HBR 1994).
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
    if (target === 'sensibilidade') atualizarSensibilidade();
    if (target === 'comparar') renderComparacao();
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Utilitários de formatação ---------- */
const fmtNumber = (n, d = 2) => isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtBRL = (n) => isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }) : '—';
const fmtPct = (n, d = 1) => isFinite(n) ? fmtNumber(n, d) + '%' : '—';
const fmtYears = (n, d = 1) => isFinite(n) ? fmtNumber(n, d) + ' anos' : '—';
const fmtMeses = (n, d = 1) => isFinite(n) ? fmtNumber(n, d) + ' meses' : '—';

function safeDiv(a, b) {
  const x = Number(a), y = Number(b);
  if (!isFinite(x) || !isFinite(y) || y === 0) return NaN;
  return x / y;
}

/* ============================================================
   FÓRMULAS — embasamento em Farris, Bendle, Pfeifer & Reibstein (2010)
   "Marketing Metrics", endossado pela Marketing Accountability
   Standards Board (MASB).
   ============================================================ */
function calcular(data) {
  const r = {};

  // ---------- Camada Cliente ----------
  // NPS (Reichheld, HBR 2003) — expresso como inteiro, não %
  const totalNps = (data.promotores || 0) + (data.neutros || 0) + (data.detratores || 0);
  r.nps = totalNps > 0
    ? ((data.promotores / totalNps) - (data.detratores / totalNps)) * 100
    : NaN;

  // CSAT — padrão ACSI
  r.csat = safeDiv(data.csatSatisfeitos, data.csatTotal) * 100;

  // Retenção (Farris et al.): (Clientes finais − novos) / iniciais
  r.retention = safeDiv((data.clientesFinais - data.novosClientes), data.clientesIniciais) * 100;

  // Churn (clientes) — método padrão: perdidos / base média
  // Usa média (inicial + final)/2 quando ambos disponíveis; senão inicial
  let baseChurn = data.clientesIniciais;
  if (data.clientesIniciais > 0 && data.clientesFinais > 0) {
    baseChurn = (data.clientesIniciais + data.clientesFinais) / 2;
  }
  r.churn = safeDiv(data.clientesPerdidos, baseChurn) * 100;

  // Tempo médio de vida do cliente = 1 / churn (Wikipedia/Farris)
  r.lifespan = isFinite(r.churn) && r.churn > 0 ? 100 / r.churn : NaN;

  // ---------- Camada Funcionário ----------
  const totalEnps = (data.empPromotores || 0) + (data.empNeutros || 0) + (data.empDetratores || 0);
  r.enps = totalEnps > 0
    ? ((data.empPromotores / totalEnps) - (data.empDetratores / totalEnps)) * 100
    : NaN;

  // ---------- Camada Financeira ----------
  r.ticket = safeDiv(data.receita, data.vendas);

  // ARPU — Average Revenue per User (base média)
  const baseClientes = baseChurn;
  r.arpu = safeDiv(data.receita, baseClientes);

  // Gross Margin % — prefere COGS quando disponível; senão usa campo margem
  if (data.cogs > 0 && data.receita > 0) {
    r.gm = ((data.receita - data.cogs) / data.receita) * 100;
  } else if (data.margem > 0) {
    r.gm = data.margem;
  } else {
    r.gm = NaN;
  }

  // LTV (NPV-based) — Farris/MASB: LTV = ARPU × Margem × [ r / (1 + d − r) ]
  // r = retenção (fração), d = taxa de desconto (fração)
  const margemDec = (r.gm || 0) / 100;
  const retDec = (r.retention || 0) / 100;
  const descDec = (data.desconto || 10) / 100;
  if (isFinite(r.arpu) && margemDec > 0 && retDec > 0 && (1 + descDec - retDec) > 0) {
    r.ltv = r.arpu * margemDec * (retDec / (1 + descDec - retDec));
  } else if (isFinite(r.arpu) && margemDec > 0 && r.churn > 0) {
    // Fallback versão simplificada (comércio): (ARPU × Margem) / Churn
    r.ltv = (r.arpu * margemDec) / (r.churn / 100);
  } else {
    r.ltv = NaN;
  }

  // CAC = Marketing+Vendas / Novos clientes adquiridos
  r.cac = safeDiv(data.marketing, data.clientesAdquiridos);

  // LTV/CAC
  r.ltvcac = isFinite(r.ltv) && isFinite(r.cac) && r.cac > 0 ? r.ltv / r.cac : NaN;

  // CAC Payback (meses) = CAC / (ARPU mensal × Margem)
  // Como o período de referência pode variar, assumimos dados anuais e convertemos para mensal
  const arpuMensal = r.arpu / 12;
  if (isFinite(r.cac) && isFinite(arpuMensal) && margemDec > 0 && arpuMensal > 0) {
    r.payback = r.cac / (arpuMensal * margemDec);
  } else {
    r.payback = NaN;
  }

  // Produtividade = Receita / Funcionários
  r.produtividade = safeDiv(data.receita, data.funcionarios);

  // NRR & Revenue Churn
  if (data.receitaAnterior > 0) {
    r.nrr = (data.receita / data.receitaAnterior) * 100;
    r.revchurn = r.nrr < 100 ? 100 - r.nrr : 0;
  } else {
    r.nrr = NaN;
    r.revchurn = NaN;
  }

  // ---------- Camada Operacional ----------
  r.tempoMedio = safeDiv(data.tempoTotal, data.atendimentos);
  r.fcr = safeDiv(data.fcrResolvidos, data.fcrTotal) * 100;
  r.conversao = safeDiv(data.vendas, data.atendimentos) * 100;

  return r;
}

/* ============================================================
   CLASSIFICAÇÃO — benchmarks publicados
   Fontes: Bain & Co. (NPS); ACSI (CSAT); HBS/Bessemer (LTV/CAC);
           SQM Group (FCR); ContactBabel (tempo médio).
   ============================================================ */
function classify(kpi, v) {
  if (!isFinite(v)) return 'na';
  switch (kpi) {
    case 'nps':        return v >= 50 ? 'ok' : v >= 30 ? 'warn' : v < 0 ? 'bad' : 'warn';
    case 'enps':       return v >= 30 ? 'ok' : v >= 10 ? 'warn' : 'bad';
    case 'csat':       return v >= 85 ? 'ok' : v >= 75 ? 'warn' : 'bad';
    case 'retention':  return v >= 85 ? 'ok' : v >= 70 ? 'warn' : 'bad';
    case 'churn':      return v <= 5  ? 'ok' : v <= 10 ? 'warn' : 'bad';
    case 'lifespan':   return v >= 5  ? 'ok' : v >= 2  ? 'warn' : 'bad';
    case 'ltvcac':     return v >= 3  ? 'ok' : v >= 1  ? 'warn' : 'bad';
    case 'payback':    return v <= 12 ? 'ok' : v <= 18 ? 'warn' : 'bad';
    case 'gm':         return v >= 40 ? 'ok' : v >= 20 ? 'warn' : 'bad';
    case 'nrr':        return v >= 110 ? 'ok' : v >= 100 ? 'warn' : 'bad';
    case 'revchurn':   return v <= 5  ? 'ok' : v <= 10 ? 'warn' : 'bad';
    case 'fcr':        return v >= 75 ? 'ok' : v >= 65 ? 'warn' : 'bad';
    case 'conv':       return v >= 25 ? 'ok' : v >= 15 ? 'warn' : 'bad';
    default:           return 'ok';
  }
}
const statusLabel = { ok: 'Excelente', warn: 'Alerta', bad: 'Crítico', na: 'Sem dados' };

/* ---------- Renderização KPIs ---------- */
function setKpi(id, value, formatted, kpiKey) {
  const card = document.querySelector(`.kpi[data-kpi="${kpiKey}"]`);
  const el = document.getElementById('kpi-' + id);
  const st = document.getElementById('status-' + id);
  if (!card || !el || !st) return;
  el.textContent = formatted;
  const cls = classify(kpiKey, value);
  card.classList.remove('ok', 'warn', 'bad');
  if (cls !== 'na') card.classList.add(cls);
  st.textContent = statusLabel[cls];
}

function renderDashboard(r) {
  setKpi('enps',       r.enps,       fmtNumber(r.enps, 0),       'enps');
  setKpi('prod',       r.produtividade, fmtBRL(r.produtividade), 'prod');
  setKpi('nps',        r.nps,        fmtNumber(r.nps, 0),        'nps');
  setKpi('csat',       r.csat,       fmtPct(r.csat),             'csat');
  setKpi('retention',  r.retention,  fmtPct(r.retention),        'retention');
  setKpi('churn',      r.churn,      fmtPct(r.churn),            'churn');
  setKpi('lifespan',   r.lifespan,   fmtYears(r.lifespan),       'lifespan');
  setKpi('ltv',        r.ltv,        fmtBRL(r.ltv),              'ltv');
  setKpi('cac',        r.cac,        fmtBRL(r.cac),              'cac');
  setKpi('ltvcac',     r.ltvcac,     fmtNumber(r.ltvcac, 2),     'ltvcac');
  setKpi('payback',    r.payback,    fmtMeses(r.payback),        'payback');
  setKpi('arpu',       r.arpu,       fmtBRL(r.arpu),             'arpu');
  setKpi('ticket',     r.ticket,     fmtBRL(r.ticket),           'ticket');
  setKpi('gm',         r.gm,         fmtPct(r.gm),               'gm');
  setKpi('nrr',        r.nrr,        fmtPct(r.nrr),              'nrr');
  setKpi('revchurn',   r.revchurn,   fmtPct(r.revchurn),         'revchurn');
  setKpi('conv',       r.conversao,  fmtPct(r.conversao),        'conv');
  setKpi('fcr',        r.fcr,        fmtPct(r.fcr),              'fcr');
  setKpi('tempo',      r.tempoMedio, isFinite(r.tempoMedio) ? fmtNumber(r.tempoMedio, 1) + ' min' : '—', 'tempo');
}

/* ---------- Tabela ---------- */
const linhasTabela = [
  { k: 'enps',      nome: 'eNPS',          form: '%Promot. − %Detrat. (func.)', bench: 'Excelente ≥ 30 · Bain',              fmt: v => fmtNumber(v, 0) },
  { k: 'nps',       nome: 'NPS',           form: '%Promot. − %Detrat.',         bench: 'Excelente ≥ 50 · Bain/Reichheld',    fmt: v => fmtNumber(v, 0) },
  { k: 'csat',      nome: 'CSAT',          form: 'satisfeitos / total × 100',   bench: 'Excelente ≥ 85 · ACSI',              fmt: fmtPct },
  { k: 'retention', nome: 'Retenção',      form: '(Finais − Novos) / Iniciais', bench: 'Varejo saudável ≥ 85% · Farris',     fmt: fmtPct },
  { k: 'churn',     nome: 'Churn',         form: 'Perdidos / Base × 100',       bench: 'Alvo ≤ 5%/ano',                       fmt: fmtPct },
  { k: 'lifespan',  nome: 'Vida média',    form: '1 / Churn anual',             bench: 'Saudável ≥ 5 anos',                   fmt: v => isFinite(v) ? fmtNumber(v, 1) + ' a' : '—' },
  { k: 'ltv',       nome: 'LTV (NPV)',     form: 'ARPU × Margem × r/(1+d−r)',   bench: 'Farris/MASB (2010)',                  fmt: fmtBRL },
  { k: 'cac',       nome: 'CAC',           form: 'Mkt+Vendas / Novos clientes', bench: 'Contexto-dependente',                 fmt: fmtBRL },
  { k: 'ltvcac',    nome: 'LTV/CAC',       form: 'LTV / CAC',                   bench: 'Ideal ≥ 3 · HBS/MIT',                 fmt: v => fmtNumber(v, 2) },
  { k: 'payback',   nome: 'CAC Payback',   form: 'CAC / (ARPU mensal × Margem)', bench: '≤ 12m (SaaS) / 18m (B2C)',           fmt: fmtMeses },
  { k: 'arpu',      nome: 'ARPU',          form: 'Receita / Base de clientes',  bench: '—',                                   fmt: fmtBRL },
  { k: 'ticket',    nome: 'Ticket médio',  form: 'Receita / Nº vendas',         bench: '—',                                   fmt: fmtBRL },
  { k: 'gm',        nome: 'Gross Margin',  form: '(Receita − COGS) / Receita',  bench: 'Serviços ≥ 40%',                      fmt: fmtPct },
  { k: 'nrr',       nome: 'NRR',           form: 'Receita atual / Anterior',    bench: 'Best-in-class ≥ 110%',                fmt: fmtPct },
  { k: 'revchurn',  nome: 'Revenue Churn', form: 'max(0, 1 − NRR/100)',         bench: '≤ 5%',                                fmt: fmtPct },
  { k: 'conv',      nome: 'Conversão',     form: 'Vendas / Atendimentos',       bench: 'Varejo serviços ≥ 25%',               fmt: fmtPct, map: 'conversao' },
  { k: 'fcr',       nome: 'FCR',           form: 'Resolvidos 1º contato',       bench: 'Excelente ≥ 75% · SQM',               fmt: fmtPct },
  { k: 'tempo',     nome: 'Tempo médio',   form: 'Σ tempo / atendimentos',      bench: 'Benchmark interno',                   fmt: v => isFinite(v) ? fmtNumber(v, 1) + ' min' : '—', map: 'tempoMedio' },
  { k: 'prod',      nome: 'Produtividade', form: 'Receita / Funcionários',     bench: '—',                                   fmt: fmtBRL, map: 'produtividade' },
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
      <td><span class="bench">${l.bench}</span></td>
      <td><span class="badge ${cls}">${statusLabel[cls]}</span></td>`;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   DIAGNÓSTICO INTELIGENTE — segue o encadeamento da
   Service–Profit Chain: funcionário → cliente → lucro.
   ============================================================ */
function diagnosticar(r) {
  const out = [];
  const push = (level, titulo, texto) => out.push({ level, titulo, texto });

  // --- 1. Funcionário (início da cadeia) ---
  if (isFinite(r.enps)) {
    if (r.enps < 10) push('bad', '🧑‍💼 eNPS crítico — elo inicial da Service–Profit Chain rompido',
      'Funcionários insatisfeitos reduzem qualidade do serviço e, em cadeia, a satisfação do cliente. Priorize cultura, treinamento e reconhecimento antes de outras ações.');
    else if (r.enps < 30) push('warn', '🧑‍💼 eNPS em alerta',
      'Pesquise drivers internos (Gallup Q12): clareza de expectativas, recursos, feedback, oportunidade de crescimento.');
    else push('ok', '🧑‍💼 eNPS excelente',
      'Equipe engajada — base sólida para valor percebido pelo cliente (Heskett, HBR 1994).');
  }

  // --- 2. Cliente ---
  if (isFinite(r.nps)) {
    if (r.nps < 0) push('bad', 'NPS negativo',
      'Mais detratores que promotores. Segmente detratores e aplique "close the loop" em 48h (prática Bain).');
    else if (r.nps < 30) push('warn', 'NPS baixo',
      'Há espaço para transformar neutros em promotores. Identifique "momentos da verdade" na jornada.');
    else if (r.nps < 50) push('warn', 'NPS mediano',
      'Pesquise drivers (Why? qualitativo). Meta: aumentar top-box (9–10).');
    else push('ok', 'NPS excelente',
      'Use promotores como canal de aquisição (referral program) — reduz CAC.');
  }

  if (isFinite(r.churn)) {
    if (r.churn > 10) push('bad', '🚨 Churn crítico',
      `Com churn de ${r.churn.toFixed(1)}%, vida média ≈ ${(100/r.churn).toFixed(1)} anos. Revise CX, pós-venda e programa de lealdade.`);
    else if (r.churn > 5) push('warn', 'Churn em alerta',
      'Monitore causas de cancelamento (exit survey) e implemente ações de winback.');
    else push('ok', 'Churn sob controle',
      'Estabilidade da base sinaliza valor percebido — terreno para cross-sell/upsell.');
  }

  // --- 3. Financeiro ---
  if (isFinite(r.ltvcac)) {
    if (r.ltvcac < 1) push('bad', '🔥 LTV/CAC insustentável',
      'Você gasta mais para adquirir do que ganha — modelo queima caixa. Reduza CAC ou aumente LTV antes de escalar.');
    else if (r.ltvcac < 3) push('warn', 'LTV/CAC abaixo do ideal',
      'Regra Harvard/MIT: ideal ≥ 3. Priorize retenção (maior alavanca de LTV) e eficiência de aquisição.');
    else if (r.ltvcac > 5) push('warn', 'LTV/CAC muito alto — possível subinvestimento em crescimento',
      'Ratio > 5 frequentemente indica que você poderia estar investindo mais em aquisição para acelerar crescimento.');
    else push('ok', 'LTV/CAC saudável',
      'Modelo economicamente eficiente para escalar aquisição.');
  }

  if (isFinite(r.payback)) {
    if (r.payback > 18) push('bad', 'CAC Payback longo demais',
      `Recuperar o CAC em ${r.payback.toFixed(0)} meses pressiona capital de giro. Reveja mix de canais e eficiência de funil.`);
    else if (r.payback > 12) push('warn', 'CAC Payback em alerta',
      'Aceitável para B2C com contrato recorrente; ruim para SaaS puro.');
    else push('ok', 'CAC Payback rápido',
      'Recuperação de caixa veloz — libera capital para reinvestir em aquisição.');
  }

  if (isFinite(r.nrr)) {
    if (r.nrr >= 110) push('ok', 'NRR best-in-class',
      'Expansão líquida (upsell/cross-sell) supera churn. Sinal clássico de "negative churn".');
    else if (r.nrr < 100) push('warn', 'NRR abaixo de 100%',
      'Base existente está encolhendo em receita — revise pricing, upsell e retenção.');
  }

  if (isFinite(r.gm) && r.gm < 20) push('bad', 'Margem bruta baixa',
    'Dificulta LTV e investimento em serviço. Reveja pricing, mix e custo operacional.');

  // --- 4. Operacional ---
  if (isFinite(r.fcr)) {
    if (r.fcr < 65) push('bad', 'FCR baixo',
      'Muitos problemas não resolvidos no 1º contato. Impacto duplo: custo operacional ↑ e satisfação ↓.');
    else if (r.fcr < 75) push('warn', 'FCR mediano',
      'Benchmark SQM: excelente ≥ 75%. Treine equipe em resolução e dê autoridade para decidir.');
    else push('ok', 'FCR excelente',
      'Equipe resolutiva → CSAT alto + custo operacional baixo.');
  }

  if (isFinite(r.conversao)) {
    if (r.conversao < 15) push('bad', 'Conversão baixa',
      'Revise abordagem comercial, treinamento, funil e proposta de valor.');
    else if (r.conversao < 25) push('warn', 'Conversão mediana',
      'Teste cross-sell contextual e scripts consultivos.');
    else push('ok', 'Conversão forte',
      'Força comercial eficiente — escale com treinamento padronizado.');
  }

  // --- Insights cruzados (cadeia) ---
  if (isFinite(r.enps) && isFinite(r.nps) && r.enps < 10 && r.nps >= 50) {
    push('warn', '⚠️ Paradoxo: clientes felizes, funcionários infelizes',
      'Service–Profit Chain sugere que isso não se sustenta. Alto NPS pode estar sendo "empurrado" por esforço individual — risco de burnout e degradação futura.');
  }

  if (isFinite(r.ltv) && isFinite(r.ticket) && r.ltv < r.ticket * 3) {
    push('warn', 'LTV baixo em relação ao ticket',
      'Sinal de baixa frequência ou curta relação. Alavanca: programas de fidelidade.');
  }

  const lista = document.getElementById('diagnostico-lista');
  if (out.length === 0) {
    lista.innerHTML = `<div class="card muted">Preencha os dados e clique em <b>Calcular</b> para ver o diagnóstico.</div>`;
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
const charts = {};
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
      labels: ['LTV', 'CAC', 'Ticket', 'ARPU'],
      datasets: [{
        data: [r.ltv, r.cac, r.ticket, r.arpu].map(v => isFinite(v) ? +v.toFixed(2) : 0),
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
      labels: ['Tempo (min)', 'FCR (%)', 'Conversão (%)'],
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

function setFormData(data) {
  const f = document.getElementById('form-kpi');
  Object.entries(data).forEach(([k, v]) => {
    const el = f.elements.namedItem(k);
    if (el) el.value = v;
  });
}

let ultimoResultado = null;
document.getElementById('form-kpi').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = getFormData();
  const r = calcular(data);
  ultimoResultado = r;
  renderDashboard(r);
  renderTabela(r);
  diagnosticar(r);
  renderGraficos(r);

  // Sincroniza sliders da sensibilidade com dados reais
  if (isFinite(r.retention)) document.getElementById('s-ret').value = Math.round(r.retention);
  if (isFinite(r.gm))        document.getElementById('s-margem').value = Math.round(r.gm);
  if (isFinite(data.desconto)) document.getElementById('s-desc').value = data.desconto;
  if (isFinite(r.arpu))      document.getElementById('s-arpu').value = Math.round(r.arpu);
  atualizarSensibilidade();

  document.querySelector('.tab[data-tab="resultados"]').click();
});

/* ---------- Exemplo didático ---------- */
document.getElementById('btn-exemplo').addEventListener('click', () => {
  setFormData({
    clientesIniciais: 1000, clientesFinais: 1100, novosClientes: 250, clientesPerdidos: 150,
    receita: 500000, receitaAnterior: 450000, vendas: 2000, cogs: 300000, margem: 25, desconto: 10,
    marketing: 50000, clientesAdquiridos: 250, funcionarios: 20,
    atendimentos: 3000, tempoTotal: 18000, fcrResolvidos: 2100, fcrTotal: 3000,
    promotores: 120, neutros: 60, detratores: 20, csatSatisfeitos: 180, csatTotal: 200,
    empPromotores: 10, empNeutros: 7, empDetratores: 3
  });
});

/* ============================================================
   EXPORT CSV / JSON
   ============================================================ */
function exportarCSV() {
  if (!ultimoResultado) { alert('Calcule os indicadores primeiro.'); return; }
  const header = 'Indicador;Valor;Formula;Benchmark;Status\n';
  const rows = linhasTabela.map(l => {
    const v = ultimoResultado[l.map || l.k];
    const cls = classify(l.k, v);
    const valorStr = l.fmt(v).replace(/\./g, '').replace(',', '.');
    return `${l.nome};${valorStr};"${l.form}";"${l.bench}";${statusLabel[cls]}`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
  baixar(blob, `kpis-batalhao-${new Date().toISOString().slice(0,10)}.csv`);
}
function exportarJSON() {
  if (!ultimoResultado) { alert('Calcule os indicadores primeiro.'); return; }
  const payload = { geradoEm: new Date().toISOString(), entrada: getFormData(), resultados: ultimoResultado };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  baixar(blob, `kpis-batalhao-${new Date().toISOString().slice(0,10)}.json`);
}
function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}
document.getElementById('btn-export-csv').addEventListener('click', exportarCSV);
document.getElementById('btn-export-json').addEventListener('click', exportarJSON);

/* ============================================================
   ANÁLISE DE SENSIBILIDADE (what-if)
   LTV = ARPU × Margem × [ r / (1 + d − r) ]
   ============================================================ */
function calcularLTVSens(arpu, margemPct, retencaoPct, descontoPct) {
  const m = margemPct / 100;
  const r = retencaoPct / 100;
  const d = descontoPct / 100;
  if (!(m > 0) || !(r > 0) || (1 + d - r) <= 0) return NaN;
  return arpu * m * (r / (1 + d - r));
}

function atualizarSensibilidade() {
  const ret = +document.getElementById('s-ret').value;
  const margem = +document.getElementById('s-margem').value;
  const desc = +document.getElementById('s-desc').value;
  const arpu = +document.getElementById('s-arpu').value;

  document.getElementById('s-ret-v').textContent = ret;
  document.getElementById('s-margem-v').textContent = margem;
  document.getElementById('s-desc-v').textContent = desc;
  document.getElementById('s-arpu-v').textContent = arpu.toLocaleString('pt-BR');

  const ltv = calcularLTVSens(arpu, margem, ret, desc);
  const churn = 100 - ret;
  const life = churn > 0 ? 100 / churn : NaN;
  const mult = (arpu > 0 && isFinite(ltv)) ? ltv / arpu : NaN;

  document.getElementById('s-ltv').textContent = fmtBRL(ltv);
  document.getElementById('s-life').textContent = fmtYears(life);
  document.getElementById('s-mult').textContent = isFinite(mult) ? fmtNumber(mult, 2) + '×' : '—';

  // Curva LTV × Retenção
  const retencoes = [];
  const ltvs = [];
  for (let i = 50; i <= 99; i += 1) {
    retencoes.push(i);
    ltvs.push(calcularLTVSens(arpu, margem, i, desc));
  }
  destroyChart('sens');
  charts.sens = new Chart(document.getElementById('chart-sens'), {
    type: 'line',
    data: {
      labels: retencoes.map(v => v + '%'),
      datasets: [{
        label: 'LTV',
        data: ltvs,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, .12)',
        fill: true,
        tension: .3,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => 'LTV: ' + fmtBRL(ctx.parsed.y) } } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + Number(v).toLocaleString('pt-BR') } },
        x: { title: { display: true, text: 'Retenção anual (%)' } }
      }
    }
  });
}
['s-ret', 's-margem', 's-desc', 's-arpu'].forEach(id =>
  document.getElementById(id).addEventListener('input', atualizarSensibilidade)
);

/* ============================================================
   COMPARADOR DE CENÁRIOS A × B (localStorage)
   ============================================================ */
const STORAGE_KEY = 'batalhao-cenarios-v2';
function salvarCenario(nome) {
  const data = getFormData();
  const r = calcular(data);
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  s[nome] = { entrada: data, resultado: r, ts: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  alert(`Cenário "${nome}" salvo. Veja em "Comparar".`);
}
document.getElementById('btn-salvar-a').addEventListener('click', () => salvarCenario('A'));
document.getElementById('btn-salvar-b').addEventListener('click', () => salvarCenario('B'));
document.getElementById('btn-limpar-cenarios').addEventListener('click', () => {
  if (confirm('Limpar cenários salvos?')) { localStorage.removeItem(STORAGE_KEY); renderComparacao(); }
});

// Define quais KPIs são "maior é melhor" e quais "menor é melhor"
const SENTIDO = {
  enps: 1, nps: 1, csat: 1, retention: 1, lifespan: 1, ltv: 1, ltvcac: 1,
  arpu: 1, ticket: 1, gm: 1, nrr: 1, conv: 1, fcr: 1, produtividade: 1,
  churn: -1, cac: -1, payback: -1, revchurn: -1, tempoMedio: -1
};

function renderComparacao() {
  const tbody = document.querySelector('#tabela-compare tbody');
  tbody.innerHTML = '';
  const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (!s.A && !s.B) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">Nenhum cenário salvo ainda. Volte em "Dados" e use os botões 💾.</td></tr>';
    return;
  }
  linhasTabela.forEach(l => {
    const key = l.map || l.k;
    const a = s.A?.resultado?.[key];
    const b = s.B?.resultado?.[key];
    const sentido = SENTIDO[key] || 1;
    let vencedor = '—';
    let classeA = '', classeB = '';
    if (isFinite(a) && isFinite(b) && a !== b) {
      if ((a - b) * sentido > 0) { vencedor = 'A'; classeA = 'winner'; classeB = 'loser'; }
      else                        { vencedor = 'B'; classeB = 'winner'; classeA = 'loser'; }
    }
    const delta = (isFinite(a) && isFinite(b)) ? b - a : NaN;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${l.nome}</b></td>
      <td class="${classeA}">${l.fmt(a)}</td>
      <td class="${classeB}">${l.fmt(b)}</td>
      <td>${isFinite(delta) ? (delta > 0 ? '+' : '') + l.fmt(delta) : '—'}</td>
      <td>${vencedor}</td>`;
    tbody.appendChild(tr);
  });
}
