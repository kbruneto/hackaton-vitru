/**
 * Modelo de impacto do Pay-to-Learn.
 *
 * Roda o mesmo modelo em duas bases independentes:
 *   A. os dados do desafio (base fornecida no hackathon)
 *   B. numeros publicos da Vitru + evasao setorial
 * e compara. Se as duas chegam na mesma conclusao, ela nao depende da premissa.
 */

const brl = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (v) => Math.round(v).toLocaleString("pt-BR");
const pct = (v, casas = 1) => (v * 100).toFixed(casas).replace(".", ",") + "%";

/**
 * Quem sai no mes 1 deixa de pagar 11 meses, quem sai no mes 2 deixa 10, e
 * assim por diante: 11+10+...+0 = 66 meses-aluno em uma janela de 12 meses.
 * E conservador, ignora o valor do aluno depois do 12o mes.
 */
const FATOR_12M = 66;

/** Desconto medio concedido ao grupo de risco. */
const DESCONTO = 0.1;

/** O grupo atendido e dimensionado em 2x o volume mensal de evasao. */
const MULTIPLICADOR_GRUPO = 2;

/** Converte evasao acumulada ao longo do curso em taxa mensal equivalente. */
const mensalizar = (acumulada, meses) =>
  1 - Math.pow(1 - acumulada, 1 / meses);

const cenarios = [
  {
    nome: "A. Base do desafio",
    fonte: "dados fornecidos no hackathon",
    base: 457427,
    ticket: 250,
    evasaoMes: 0.011,
    notaEvasao: "1,1% ao mes, informado na base",
  },
  {
    nome: "B. Numeros publicos",
    fonte: "resultados Vitru 1S26 + evasao setorial (CNN/relatorio)",
    base: 1000000,
    // R$ 1.240,6 mi de receita liquida em 6 meses / 1 mi de alunos.
    // E receita liquida por aluno, nao o ticket bruto reportado.
    ticket: 1240.6e6 / 6 / 1000000,
    // 55,5% ao longo de um curso de graduacao de ~48 meses.
    evasaoMes: mensalizar(0.555, 48),
    notaEvasao: "55,5% no curso, mensalizado em 48 meses",
  },
];

function calcular(c) {
  const saemMes = c.base * c.evasaoMes;
  const grupo = saemMes * MULTIPLICADOR_GRUPO;

  const custoMes = grupo * c.ticket * DESCONTO;
  const custoAno = custoMes * 12;

  /**
   * O aluno retido continua no programa, ou seja, continua com desconto.
   * Entao ele preserva ticket x (1 - desconto), nao o ticket cheio.
   * Contar a receita cheia aqui superestimaria o retorno.
   */
  const receitaPorRetidoAno = c.ticket * (1 - DESCONTO) * FATOR_12M;
  const retidosBreakEven = custoAno / receitaPorRetidoAno;

  return {
    ...c,
    saemMes,
    saemAno: saemMes * 12,
    evasaoAno: 1 - Math.pow(1 - c.evasaoMes, 12),
    mrrPerdido: saemMes * c.ticket,
    perdaAno: saemMes * c.ticket * FATOR_12M,
    grupo,
    custoMes,
    custoAno,
    receitaPorRetidoAno,
    retidosBreakEven,
    breakEvenPct: retidosBreakEven / saemMes,
  };
}

const out = [];
const p = (s = "") => out.push(s);

const resultados = cenarios.map(calcular);

for (const r of resultados) {
  p(`=== ${r.nome} ===`);
  p(`fonte: ${r.fonte}`);
  p(`base: ${num(r.base)} alunos | ticket: ${brl(r.ticket)}/mes | evasao: ${pct(r.evasaoMes, 2)}/mes (${r.notaEvasao})`);
  p();
  p(`  alunos que saem por mes:        ${num(r.saemMes)}`);
  p(`  alunos que saem por ano:        ${num(r.saemAno)}`);
  p(`  evasao anualizada:              ${pct(r.evasaoAno)}`);
  p(`  receita recorrente perdida/mes: ${brl(r.mrrPerdido)}`);
  p(`  RECEITA PERDIDA EM 12 MESES:    ${brl(r.perdaAno)}`);
  p();
  p(`  grupo de risco atendido:        ${num(r.grupo)} alunos (2x a evasao mensal)`);
  p(`  custo do desconto de ${pct(DESCONTO, 0)}/ano:   ${brl(r.custoAno)}`);
  p(`  retidos/mes para se pagar:      ${num(r.retidosBreakEven)}`);
  p(`  PONTO DE EQUILIBRIO:            evitar ${pct(r.breakEvenPct)} da evasao`);
  p();
}

// ------------------------------------------------------------------- media
const media = (campo) =>
  resultados.reduce((soma, r) => soma + r[campo], 0) / resultados.length;

p("=== MEDIA DOS DOIS CENARIOS ===");
p(`receita perdida em 12 meses:  ${brl(media("perdaAno"))}`);
p(`  faixa: ${brl(Math.min(...resultados.map((r) => r.perdaAno)))} a ${brl(Math.max(...resultados.map((r) => r.perdaAno)))}`);
p(`custo do programa/ano:        ${brl(media("custoAno"))}`);
p(`ponto de equilibrio:          evitar ${pct(media("breakEvenPct"))} da evasao`);
p();

p("Observacao: o ponto de equilibrio e o mesmo nos dois cenarios porque nao");
p("depende do ticket nem do tamanho da base. Ele sai de");
p("  (grupo / evasao) x desconto x 12 / ((1 - desconto) x 66)");
p("ou seja, so das regras do programa. A conclusao e estrutural.");
p();

/**
 * Pior caso: o programa nao retem ninguem.
 * O desconto pago a quem sai de qualquer forma e custo afundado, sem retorno.
 * O modelo ja cobra 100% desse custo, entao o ponto de equilibrio acima ja
 * assume que o desconto da maioria e desperdicado.
 */
p("=== PIOR CASO: RETENCAO ZERO ===");
for (const r of resultados) {
  p(`${r.nome}`);
  p(`  custo do programa/ano:        ${brl(r.custoAno)}`);
  p(`  receita ja perdida/ano:       ${brl(r.perdaAno)}`);
  p(`  custo como % da perda atual:  ${pct(r.custoAno / r.perdaAno)}`);
}
p();
p("Ou seja: a exposicao maxima do programa e conhecida e limitada. Mesmo");
p("retendo zero aluno, o gasto equivale a uma fracao pequena do que a");
p("evasao ja custa hoje.");
p();

// --------------------------------------------------------------- cenarios
p("=== RETORNO EM 12 MESES (media dos dois cenarios) ===");
p("evasao evitada | receita preservada | custo do programa | resultado liquido | retorno");
for (const taxa of [media("breakEvenPct"), 0.1, 0.2, 0.3]) {
  const preservada = media("saemMes") * taxa * media("receitaPorRetidoAno");
  const custo = media("custoAno");
  p(
    `${pct(taxa).padStart(14)} | ${brl(preservada).padStart(17)} | ${brl(custo).padStart(17)} | ${brl(preservada - custo).padStart(17)} | ${(preservada / custo).toFixed(1).replace(".", ",")}x`,
  );
}

console.log(out.join("\n"));
