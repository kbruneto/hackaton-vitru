/**
 * ALGORITMO CORE — Score Pay-to-Learn
 *
 * Este arquivo e a UNICA fonte de verdade das regras de calculo.
 * Se voce quiser mexer nos pesos, nas faixas de desconto ou na formula,
 * e aqui (e so aqui) que voce mexe. O resto do projeto so consome.
 *
 * A formula em uma linha:
 *   Score = (AVA x 0.4) + (MAPAs x 0.4) + (Financeiro x 0.2)
 *
 * Cada componente vale de 0 a 100. O Score final tambem.
 */

// ---------------------------------------------------------------------------
// REGRAS / CONFIGURACAO
// ---------------------------------------------------------------------------

/** Peso de cada componente no Score final. A soma precisa dar 1. */
export const PESOS = Object.freeze({
  ava: 0.4,
  mapas: 0.4,
  financeiro: 0.2,
});

/** Peso dos sub-indicadores dentro de cada componente. Cada grupo soma 1. */
export const SUBPESOS = Object.freeze({
  ava: Object.freeze({ frequencia: 0.6, conclusaoMateriais: 0.4 }),
  mapas: Object.freeze({ pontualidade: 0.7, desempenho: 0.3 }),
  financeiro: Object.freeze({ adimplenciaHistorica: 0.5, statusAtual: 0.5 }),
});

/** Score que o aluno precisa atingir para o Agentforce ser disparado. */
export const SCORE_ALVO = 85;

/**
 * Faixas de desconto. SEMPRE em ordem decrescente de scoreMinimo:
 * a primeira faixa que o aluno alcancar e a dele.
 */
export const FAIXAS_DESCONTO = Object.freeze([
  Object.freeze({ rotulo: 'Excelência', scoreMinimo: 85, descontoPercentual: 15 }),
  Object.freeze({ rotulo: 'Avançado', scoreMinimo: 70, descontoPercentual: 10 }),
  Object.freeze({ rotulo: 'Consistente', scoreMinimo: 50, descontoPercentual: 5 }),
  Object.freeze({ rotulo: 'Em construção', scoreMinimo: 0, descontoPercentual: 0 }),
]);

/** Quanto cada situacao de pagamento vale (0 a 1). */
export const PESO_STATUS_PAGAMENTO = Object.freeze({
  em_dia: 1,
  atrasado: 0.5,
  inadimplente: 0,
});

/** Quanto cada situacao de entrega de MAPA vale (0 a 1). */
export const PESO_ENTREGA = Object.freeze({
  entregue_no_prazo: 1,
  entregue_com_atraso: 0.5,
  pendente: 0,
  nao_entregue: 0,
});

export const ROTULO_ENTREGA = Object.freeze({
  entregue_no_prazo: 'Entregue no prazo',
  entregue_com_atraso: 'Entregue com atraso',
  pendente: 'Pendente',
  nao_entregue: 'Não entregue',
});

// ---------------------------------------------------------------------------
// DATA DE REFERENCIA
// ---------------------------------------------------------------------------

/**
 * O mock foi montado em cima de agosto/2026. Para a demo ser reproduzivel em
 * qualquer maquina e em qualquer dia, a data de referencia e FIXA por padrao.
 *
 * Quer usar o relogio real? Rode com DATA_REFERENCIA=hoje
 * Quer testar outra data?      Rode com DATA_REFERENCIA=2026-08-29
 */
const DATA_REFERENCIA_PADRAO = '2026-08-15';

/** Converte um Date para 'YYYY-MM-DD' sem sofrer com fuso horario. */
function paraISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** 'YYYY-MM-DD' -> 'YYYY-MM' */
export function mesDe(dataISO) {
  return typeof dataISO === 'string' ? dataISO.slice(0, 7) : null;
}

/**
 * Monta o contexto temporal usado por todos os calculos.
 * @param {string} [dataISO] força uma data específica ('YYYY-MM-DD' | 'hoje')
 * @returns {{ hoje: string, mes: string }}
 */
export function referencia(dataISO) {
  const bruta = dataISO ?? process.env.DATA_REFERENCIA ?? DATA_REFERENCIA_PADRAO;
  const hoje =
    bruta === 'hoje' || bruta === 'now' || bruta === ''
      ? paraISO(new Date())
      : bruta;
  return { hoje, mes: mesDe(hoje) };
}

// ---------------------------------------------------------------------------
// HELPERS NUMERICOS
// ---------------------------------------------------------------------------

const limitar01 = (n) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

/** Divisao segura, resultado sempre entre 0 e 1. */
const razao = (numerador, denominador) =>
  denominador > 0 ? limitar01(numerador / denominador) : 0;

/** Arredonda evitando -0 e NaN vazando para o JSON. */
const arred = (n, casas = 2) => {
  if (!Number.isFinite(n)) return 0;
  const fator = 10 ** casas;
  return Math.round(n * fator) / fator || 0;
};

const media = (lista) =>
  lista.length > 0 ? lista.reduce((a, b) => a + b, 0) / lista.length : 0;

// ---------------------------------------------------------------------------
// STATUS DE MAPA
// ---------------------------------------------------------------------------

/**
 * Deriva o status do MAPA a partir das datas — nunca guardamos status no banco,
 * pra nao ter risco de dado inconsistente.
 * Comparacao de strings 'YYYY-MM-DD' e segura e imune a fuso horario.
 */
export function statusDoMapa(mapa, hoje) {
  if (mapa.entregueEm) {
    return mapa.entregueEm <= mapa.prazo
      ? 'entregue_no_prazo'
      : 'entregue_com_atraso';
  }
  return hoje <= mapa.prazo ? 'pendente' : 'nao_entregue';
}

// ---------------------------------------------------------------------------
// COMPONENTE 1 — AVA (peso 40%)
// ---------------------------------------------------------------------------

export function calcularScoreAva(ava) {
  const frequencia = razao(ava.diasAcessadosNoMes, ava.diasUteisNoMes);
  const conclusao = razao(ava.materiaisConcluidos, ava.materiaisDisponiveis);

  const score =
    (frequencia * SUBPESOS.ava.frequencia +
      conclusao * SUBPESOS.ava.conclusaoMateriais) *
    100;

  return {
    score: arred(score),
    detalhe: {
      frequenciaPercentual: arred(frequencia * 100, 1),
      diasAcessadosNoMes: ava.diasAcessadosNoMes,
      diasUteisNoMes: ava.diasUteisNoMes,
      conclusaoMateriaisPercentual: arred(conclusao * 100, 1),
      materiaisConcluidos: ava.materiaisConcluidos,
      materiaisDisponiveis: ava.materiaisDisponiveis,
      minutosTotaisNoMes: ava.minutosTotaisNoMes,
      ultimoAcesso: ava.ultimoAcesso,
    },
  };
}

// ---------------------------------------------------------------------------
// COMPONENTE 2 — MAPAs (peso 40%)
// ---------------------------------------------------------------------------

/**
 * Considera apenas os MAPAs cujo PRAZO cai no mes de referencia.
 * MAPA nao entregue zera tanto a pontualidade quanto o desempenho daquele MAPA
 * — e exatamente por isso que entregar um MAPA pendente move o Score pra cima.
 *
 * Observacao: se o aluno nao tiver nenhum MAPA no mes, o componente vale 0 e
 * vem marcado com semMapasNoMes = true (nao acontece com os dados do mock).
 */
export function calcularScoreMapas(mapas, ref) {
  const doMes = (mapas ?? []).filter((m) => mesDe(m.prazo) === ref.mes);

  const avaliados = doMes.map((m) => {
    const status = statusDoMapa(m, ref.hoje);
    return {
      id: m.id,
      disciplina: m.disciplina,
      prazo: m.prazo,
      entregueEm: m.entregueEm,
      nota: m.nota,
      status,
      statusRotulo: ROTULO_ENTREGA[status],
      pesoPontualidade: PESO_ENTREGA[status] ?? 0,
      pesoDesempenho: limitar01((m.nota ?? 0) / 10),
    };
  });

  const pontualidade = media(avaliados.map((m) => m.pesoPontualidade));
  const desempenho = media(avaliados.map((m) => m.pesoDesempenho));

  const score =
    (pontualidade * SUBPESOS.mapas.pontualidade +
      desempenho * SUBPESOS.mapas.desempenho) *
    100;

  return {
    score: arred(score),
    detalhe: {
      semMapasNoMes: avaliados.length === 0,
      mapasNoMes: avaliados.length,
      entreguesNoPrazo: avaliados.filter((m) => m.status === 'entregue_no_prazo')
        .length,
      entreguesComAtraso: avaliados.filter(
        (m) => m.status === 'entregue_com_atraso',
      ).length,
      pendentes: avaliados.filter((m) => m.status === 'pendente').length,
      naoEntregues: avaliados.filter((m) => m.status === 'nao_entregue').length,
      pontualidadePercentual: arred(pontualidade * 100, 1),
      desempenhoPercentual: arred(desempenho * 100, 1),
      itens: avaliados,
    },
  };
}

// ---------------------------------------------------------------------------
// COMPONENTE 3 — Engajamento financeiro (peso 20%)
// ---------------------------------------------------------------------------

export function calcularScoreFinanceiro(financeiro) {
  const adimplencia = razao(
    financeiro.faturasPagasEmDia,
    financeiro.faturasTotais,
  );
  const pesoStatus = PESO_STATUS_PAGAMENTO[financeiro.statusPagamento] ?? 0;

  const score =
    (adimplencia * SUBPESOS.financeiro.adimplenciaHistorica +
      pesoStatus * SUBPESOS.financeiro.statusAtual) *
    100;

  return {
    score: arred(score),
    detalhe: {
      statusPagamento: financeiro.statusPagamento,
      adimplenciaHistoricaPercentual: arred(adimplencia * 100, 1),
      faturasPagasEmDia: financeiro.faturasPagasEmDia,
      faturasTotais: financeiro.faturasTotais,
    },
  };
}

// ---------------------------------------------------------------------------
// FAIXAS DE DESCONTO
// ---------------------------------------------------------------------------

/** Faixa que o aluno JA conquistou com o score atual. */
export function faixaPara(score) {
  return (
    FAIXAS_DESCONTO.find((f) => score >= f.scoreMinimo) ??
    FAIXAS_DESCONTO[FAIXAS_DESCONTO.length - 1]
  );
}

/** Proxima faixa a ser desbloqueada, ou null se ja esta no topo. */
export function proximaFaixaPara(score) {
  const acima = FAIXAS_DESCONTO.filter((f) => f.scoreMinimo > score);
  if (acima.length === 0) return null;
  const proxima = acima.reduce((menor, f) =>
    f.scoreMinimo < menor.scoreMinimo ? f : menor,
  );
  return {
    ...proxima,
    pontosFaltantes: arred(proxima.scoreMinimo - score, 0),
  };
}

// ---------------------------------------------------------------------------
// CALCULO COMPLETO
// ---------------------------------------------------------------------------

/**
 * Calcula o Score Pay-to-Learn de um aluno e devolve o detalhamento inteiro.
 * @param {object} aluno registro do aluno vindo do banco
 * @param {{hoje:string, mes:string}} [ref] contexto temporal
 */
export function calcularScore(aluno, ref = referencia()) {
  const ava = calcularScoreAva(aluno.ava);
  const mapas = calcularScoreMapas(aluno.mapas, ref);
  const financeiro = calcularScoreFinanceiro(aluno.financeiro);

  const componentes = [
    {
      chave: 'ava',
      rotulo: 'Presença no AVA',
      score: ava.score,
      peso: PESOS.ava,
      contribuicao: arred(ava.score * PESOS.ava),
      detalhe: ava.detalhe,
    },
    {
      chave: 'mapas',
      rotulo: 'Entrega de MAPAs',
      score: mapas.score,
      peso: PESOS.mapas,
      contribuicao: arred(mapas.score * PESOS.mapas),
      detalhe: mapas.detalhe,
    },
    {
      chave: 'financeiro',
      rotulo: 'Engajamento financeiro',
      score: financeiro.score,
      peso: PESOS.financeiro,
      contribuicao: arred(financeiro.score * PESOS.financeiro),
      detalhe: financeiro.detalhe,
    },
  ];

  const bruto = componentes.reduce((soma, c) => soma + c.score * c.peso, 0);
  const total = Math.round(limitar01(bruto / 100) * 100);

  const faixa = faixaPara(total);
  const proxima = proximaFaixaPara(total);

  const mensalidade = aluno.financeiro.mensalidade;
  const valorDesconto = arred((mensalidade * faixa.descontoPercentual) / 100);

  return {
    mesReferencia: ref.mes,
    dataReferencia: ref.hoje,
    total,
    scoreExato: arred(bruto),
    alvo: SCORE_ALVO,
    atingiuAlvo: total >= SCORE_ALVO,
    pontosParaAlvo: Math.max(0, SCORE_ALVO - total),
    progressoPercentual: arred(Math.min(100, (total / SCORE_ALVO) * 100), 1),
    faixaAtual: { ...faixa },
    proximaFaixa: proxima,
    componentes,
    beneficio: {
      descontoPercentual: faixa.descontoPercentual,
      mensalidadeCheia: arred(mensalidade),
      valorDesconto,
      mensalidadeComDesconto: arred(mensalidade - valorDesconto),
      proximoVencimento: aluno.financeiro.proximoVencimento,
    },
  };
}

/** Snapshot enxuto, pra listagens. */
export function resumoScore(aluno, ref = referencia()) {
  const s = calcularScore(aluno, ref);
  return {
    id: aluno.id,
    nome: aluno.nome,
    curso: aluno.curso,
    score: s.total,
    faixa: s.faixaAtual.rotulo,
    descontoPercentual: s.faixaAtual.descontoPercentual,
    atingiuAlvo: s.atingiuAlvo,
  };
}

/** Tudo que o front precisa saber sobre as regras, sem hardcodear nada. */
export function regrasPublicas() {
  return {
    formula: 'Score = (AVA x 0.4) + (MAPAs x 0.4) + (Financeiro x 0.2)',
    pesos: PESOS,
    subpesos: SUBPESOS,
    scoreAlvo: SCORE_ALVO,
    faixasDesconto: FAIXAS_DESCONTO,
    pesoStatusPagamento: PESO_STATUS_PAGAMENTO,
    pesoEntrega: PESO_ENTREGA,
  };
}
