/**
 * HANDLERS DOS ENDPOINTS
 *
 * Cada handler recebe um contexto { params, query, body } e devolve o corpo da
 * resposta (status 200) ou { status, body } quando precisa de outro status.
 * Para erro, joga um ErroHttp — o server.js traduz para JSON.
 */

import * as db from './db.js';
import {
  calcularScore,
  resumoScore,
  regrasPublicas,
  referencia,
  SCORE_ALVO,
} from './scoreEngine.js';
import {
  dispararAgentforce,
  listarLogs,
  limparLogs,
  montarMensagem,
} from './agentforce.js';

export class ErroHttp extends Error {
  constructor(status, mensagem, detalhe) {
    super(mensagem);
    this.status = status;
    this.detalhe = detalhe;
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/** Resolve o contexto temporal, aceitando ?data=YYYY-MM-DD para demos. */
function refDe(ctx) {
  const data = ctx.query?.data;
  return referencia(data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined);
}

function exigirAluno(ctx) {
  const aluno = db.buscarAluno(ctx.params.id);
  if (!aluno) {
    throw new ErroHttp(404, `Aluno "${ctx.params.id}" não encontrado.`, {
      alunosDisponiveis: db.listarAlunos().map((a) => a.id),
    });
  }
  return aluno;
}

/** Le um numero do body com valor padrao e limites. */
function numero(valor, { padrao, min, max, campo }) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    throw new ErroHttp(400, `O campo "${campo}" precisa ser numérico.`);
  }
  if (n < min || n > max) {
    throw new ErroHttp(400, `O campo "${campo}" deve estar entre ${min} e ${max}.`);
  }
  return n;
}

/**
 * Recalcula o Score depois de uma acao e, se o aluno tiver cruzado o alvo,
 * aciona o Agentforce. E o coracao do "ganho de pontos".
 */
async function aplicarAcao(aluno, ref, scoreAntes) {
  const scoreDepois = calcularScore(aluno, ref);

  let notificacao = { disparado: false, motivo: 'score_abaixo_do_alvo' };
  if (scoreDepois.atingiuAlvo) {
    notificacao = await dispararAgentforce(aluno, scoreDepois);
  }

  return {
    pontosGanhos: Number((scoreDepois.total - scoreAntes.total).toFixed(0)),
    cruzouOAlvoAgora: !scoreAntes.atingiuAlvo && scoreDepois.atingiuAlvo,
    scoreAntes: {
      total: scoreAntes.total,
      faixa: scoreAntes.faixaAtual.rotulo,
      descontoPercentual: scoreAntes.faixaAtual.descontoPercentual,
    },
    score: scoreDepois,
    agentforce: notificacao,
  };
}

// ---------------------------------------------------------------------------
// META
// ---------------------------------------------------------------------------

export function health() {
  const ref = referencia();
  return {
    ok: true,
    servico: 'vitru-pay-to-learn',
    versao: '1.0.0',
    dataReferencia: ref.hoje,
    mesReferencia: ref.mes,
    alunosCarregados: db.listarAlunos().length,
    scoreAlvo: SCORE_ALVO,
  };
}

export function regras() {
  return regrasPublicas();
}

// ---------------------------------------------------------------------------
// ALUNOS
// ---------------------------------------------------------------------------

/** Lista resumida — bom para um ranking / "Top Score". */
export function listarAlunos(ctx) {
  const ref = refDe(ctx);
  const alunos = db
    .listarAlunos()
    .map((a) => resumoScore(a, ref))
    .sort((a, b) => b.score - a.score)
    .map((a, indice) => ({ posicao: indice + 1, ...a }));

  return { mesReferencia: ref.mes, total: alunos.length, alunos };
}

/** Dados crus + score calculado. Use se quiser refazer a conta no front. */
export function obterAluno(ctx) {
  const aluno = exigirAluno(ctx);
  const ref = refDe(ctx);
  return { aluno, score: calcularScore(aluno, ref) };
}

/** Só os dados crus, sem nenhum cálculo aplicado. */
export function obterAlunoBruto(ctx) {
  const aluno = exigirAluno(ctx);
  return {
    id: aluno.id,
    nome: aluno.nome,
    ava: aluno.ava,
    mapas: aluno.mapas,
    financeiro: aluno.financeiro,
  };
}

/**
 * Payload pronto para o painel: score, barra de progresso, detalhamento por
 * componente, beneficio financeiro, lista de MAPAs e serie historica.
 */
export function obterDashboard(ctx) {
  const aluno = exigirAluno(ctx);
  const ref = refDe(ctx);
  const s = calcularScore(aluno, ref);

  const componenteMapas = s.componentes.find((c) => c.chave === 'mapas');

  return {
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      telefone: aluno.telefone ?? null,
      curso: aluno.curso,
      semestre: aluno.semestre,
      polo: aluno.polo,
    },
    mesReferencia: s.mesReferencia,
    dataReferencia: s.dataReferencia,
    score: {
      total: s.total,
      scoreExato: s.scoreExato,
      alvo: s.alvo,
      atingiuAlvo: s.atingiuAlvo,
      pontosParaAlvo: s.pontosParaAlvo,
      progressoPercentual: s.progressoPercentual,
      faixaAtual: s.faixaAtual,
      proximaFaixa: s.proximaFaixa,
    },
    componentes: s.componentes,
    beneficio: {
      ...s.beneficio,
      desbloqueado: s.atingiuAlvo,
      mensagemPrevia: s.atingiuAlvo ? montarMensagem(aluno, s) : null,
    },
    financeiro: aluno.financeiro,
    mapas: componenteMapas?.detalhe.itens ?? [],
    historicoScore: [
      ...aluno.historicoScore.map((h) => ({ ...h, atual: false })),
      {
        mes: s.mesReferencia,
        score: s.total,
        descontoPercentual: s.faixaAtual.descontoPercentual,
        atual: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// SIMULACOES (o "ganho de pontos")
// ---------------------------------------------------------------------------

/**
 * POST /api/students/:id/mapas/:mapaId/entregar
 * Body opcional: { nota?: 0..10, data?: 'YYYY-MM-DD' }
 */
export async function entregarMapa(ctx) {
  const aluno = exigirAluno(ctx);
  const ref = refDe(ctx);
  const mapa = db.buscarMapa(aluno, ctx.params.mapaId);

  if (!mapa) {
    throw new ErroHttp(404, `MAPA "${ctx.params.mapaId}" não encontrado para ${aluno.id}.`, {
      mapasDisponiveis: aluno.mapas.map((m) => m.id),
    });
  }
  if (mapa.entregueEm) {
    throw new ErroHttp(409, `O MAPA "${mapa.id}" já foi entregue em ${mapa.entregueEm}.`);
  }

  const nota = numero(ctx.body?.nota, { padrao: 9, min: 0, max: 10, campo: 'nota' });
  const dataEntrega =
    typeof ctx.body?.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ctx.body.data)
      ? ctx.body.data
      : ref.hoje;

  const scoreAntes = calcularScore(aluno, ref);

  mapa.entregueEm = dataEntrega;
  mapa.nota = nota;

  const resultado = await aplicarAcao(aluno, ref, scoreAntes);

  return {
    acao: 'mapa_entregue',
    mapa: {
      id: mapa.id,
      disciplina: mapa.disciplina,
      prazo: mapa.prazo,
      entregueEm: mapa.entregueEm,
      nota: mapa.nota,
      dentroDoPrazo: mapa.entregueEm <= mapa.prazo,
    },
    ...resultado,
  };
}

/**
 * POST /api/students/:id/ava/acesso
 * Body opcional: { minutos?: 0..600, novosMateriais?: 0..30, contarDia?: boolean }
 */
export async function registrarAcessoAva(ctx) {
  const aluno = exigirAluno(ctx);
  const ref = refDe(ctx);

  const minutos = numero(ctx.body?.minutos, { padrao: 45, min: 0, max: 600, campo: 'minutos' });
  const novosMateriais = numero(ctx.body?.novosMateriais, {
    padrao: 1,
    min: 0,
    max: 100,
    campo: 'novosMateriais',
  });
  const contarDia = ctx.body?.contarDia !== false;

  const scoreAntes = calcularScore(aluno, ref);
  const ava = aluno.ava;

  if (contarDia) {
    ava.diasAcessadosNoMes = Math.min(ava.diasAcessadosNoMes + 1, ava.diasUteisNoMes);
  }
  ava.minutosTotaisNoMes += minutos;
  ava.materiaisConcluidos = Math.min(
    ava.materiaisConcluidos + novosMateriais,
    ava.materiaisDisponiveis,
  );
  ava.ultimoAcesso = new Date().toISOString();

  const resultado = await aplicarAcao(aluno, ref, scoreAntes);

  return { acao: 'acesso_ava_registrado', ava, ...resultado };
}

// ---------------------------------------------------------------------------
// WEBHOOK AGENTFORCE
// ---------------------------------------------------------------------------

/**
 * Endpoint que FINGE ser o Agentforce. E aqui que o payload cai quando o aluno
 * bate a meta. Em producao, este endereco seria o do Salesforce.
 */
export function receberWebhookAgentforce(ctx) {
  const payload = ctx.body ?? {};
  console.log(
    `[webhook] recebido evento "${payload.evento ?? 'desconhecido'}" para ${payload.aluno?.id ?? '???'}`,
  );

  return {
    status: 202,
    body: {
      recebido: true,
      evento: payload.evento ?? null,
      alunoId: payload.aluno?.id ?? null,
      acoesReconhecidas: Object.keys(payload.acoes ?? {}),
      processadoEm: new Date().toISOString(),
    },
  };
}

/** Histórico de disparos — alimenta o "feed de notificações" da demo. */
export function logsAgentforce() {
  const logs = listarLogs();
  return { total: logs.length, logs };
}

/** Força um disparo, independente do score. Útil para testar o front. */
export async function forcarDisparo(ctx) {
  const aluno = exigirAluno(ctx);
  const ref = refDe(ctx);
  const score = calcularScore(aluno, ref);

  if (!score.atingiuAlvo) {
    throw new ErroHttp(
      422,
      `${aluno.nome} está com ${score.total} pontos e o alvo é ${score.alvo}. ` +
        `Use as rotas de simulação para subir o Score antes de disparar.`,
      { score: score.total, alvo: score.alvo, pontosParaAlvo: score.pontosParaAlvo },
    );
  }

  const notificacao = await dispararAgentforce(aluno, score, { forcar: true });
  return { acao: 'disparo_forcado', agentforce: notificacao };
}

// ---------------------------------------------------------------------------
// RESET
// ---------------------------------------------------------------------------

/** Volta o banco ao estado inicial e limpa os logs. Roda a demo de novo. */
export function resetar() {
  const total = db.resetar();
  limparLogs();
  return { resetado: true, alunosRecarregados: total };
}
