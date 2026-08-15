/**
 * MOCK DO AGENTFORCE (Salesforce)
 *
 * Simula o "concierge de sucesso": quando o aluno bate o Score alvo, este
 * modulo (1) aplica o desconto no sistema financeiro e (2) dispara a mensagem
 * de WhatsApp.
 *
 * Em producao, o POST iria para o endpoint real do Agentforce. Aqui ele vai,
 * por padrao, para o proprio /api/webhook/agentforce — asssim o fluxo completo
 * fica visivel e testavel sem depender de nada externo.
 *
 * Quer apontar para um endpoint real (ou para o webhook.site pra mostrar na
 * apresentacao)? Basta definir AGENTFORCE_WEBHOOK_URL.
 */

// Historico de disparos, para o front conseguir exibir na demo.
const logs = [];
const LIMITE_LOGS = 100;

// Garante que o aluno nao seja notificado duas vezes no mesmo mes.
const jaNotificados = new Set();

function urlDoWebhook() {
  return (
    process.env.AGENTFORCE_WEBHOOK_URL ||
    `http://127.0.0.1:${process.env.PORT || 3333}/api/webhook/agentforce`
  );
}

// ---------------------------------------------------------------------------
// FORMATADORES (sem depender de ICU, pra rodar em qualquer build do Node)
// ---------------------------------------------------------------------------

function brl(valor) {
  const [inteiro, decimal] = Number(valor || 0).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${comMilhar},${decimal}`;
}

function dataBR(iso) {
  if (typeof iso !== 'string' || iso.length < 10) return '';
  return iso.slice(0, 10).split('-').reverse().join('/');
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function nomeDoMes(mesISO) {
  const indice = Number(String(mesISO).slice(5, 7)) - 1;
  return MESES[indice] ?? mesISO;
}

// ---------------------------------------------------------------------------
// MENSAGEM
// ---------------------------------------------------------------------------

export function montarMensagem(aluno, score) {
  const primeiroNome = String(aluno.nome).split(' ')[0];
  const b = score.beneficio;

  return [
    `Parabéns, ${primeiroNome}!`,
    `Você fechou ${nomeDoMes(score.mesReferencia)} com Score Vitru de ${score.total} pontos`,
    `e entrou na faixa ${score.faixaAtual.rotulo}.`,
    `Por isso a Vitru liberou ${b.descontoPercentual}% de desconto no seu boleto`,
    `de ${dataBR(b.proximoVencimento)}: de ${brl(b.mensalidadeCheia)}`,
    `por ${brl(b.mensalidadeComDesconto)}.`,
    `Seu esforço acadêmico virou alívio no bolso. Continue assim!`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
// PAYLOAD
// ---------------------------------------------------------------------------

export function montarPayload(aluno, score) {
  return {
    evento: 'score.meta_atingida',
    ocorridoEm: new Date().toISOString(),
    origem: 'vitru-pay-to-learn/mvp',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      telefone: aluno.telefone ?? null,
      curso: aluno.curso,
      polo: aluno.polo,
    },
    score: {
      mesReferencia: score.mesReferencia,
      total: score.total,
      alvo: score.alvo,
      faixa: score.faixaAtual.rotulo,
    },
    acoes: {
      aplicarDescontoFinanceiro: {
        descontoPercentual: score.beneficio.descontoPercentual,
        mensalidadeCheia: score.beneficio.mensalidadeCheia,
        mensalidadeComDesconto: score.beneficio.mensalidadeComDesconto,
        valorDesconto: score.beneficio.valorDesconto,
        vencimentoAlvo: score.beneficio.proximoVencimento,
      },
      enviarWhatsapp: {
        para: aluno.telefone ?? null,
        mensagem: montarMensagem(aluno, score),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// DISPARO
// ---------------------------------------------------------------------------

/**
 * Aplica o desconto e dispara o webhook do Agentforce.
 *
 * O registro no log acontece SEMPRE, mesmo que o POST falhe — a demo nunca
 * fica sem a mensagem por causa de um problema de rede.
 *
 * @param {object} aluno registro mutavel do aluno (o desconto e gravado nele)
 * @param {object} score retorno de calcularScore()
 * @param {{forcar?: boolean}} [opcoes]
 */
export async function dispararAgentforce(aluno, score, opcoes = {}) {
  const { forcar = false } = opcoes;
  const chave = `${aluno.id}:${score.mesReferencia}`;

  if (!score.atingiuAlvo) {
    return { disparado: false, motivo: 'score_abaixo_do_alvo' };
  }
  if (!forcar && jaNotificados.has(chave)) {
    return { disparado: false, motivo: 'ja_notificado_neste_mes' };
  }

  const payload = montarPayload(aluno, score);

  // (1) "Aplica o desconto no sistema financeiro"
  const descontoAnterior = aluno.financeiro.descontoAtualPercentual;
  aluno.financeiro.descontoAtualPercentual = score.beneficio.descontoPercentual;

  // (2) Chama o Agentforce
  const destino = urlDoWebhook();
  const entrega = { url: destino, status: 'pendente' };

  try {
    const resposta = await fetch(destino, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    entrega.status = resposta.ok ? 'entregue' : 'recusado';
    entrega.httpStatus = resposta.status;
  } catch (erro) {
    entrega.status = 'falhou';
    entrega.erro = erro?.message ?? String(erro);
  }

  jaNotificados.add(chave);

  const registro = {
    id: `LOG-${Date.now()}-${logs.length + 1}`,
    registradoEm: new Date().toISOString(),
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    mesReferencia: score.mesReferencia,
    scoreAtingido: score.total,
    descontoAnteriorPercentual: descontoAnterior,
    descontoAplicadoPercentual: score.beneficio.descontoPercentual,
    mensagemWhatsapp: payload.acoes.enviarWhatsapp.mensagem,
    entrega,
    payload,
  };

  logs.unshift(registro);
  if (logs.length > LIMITE_LOGS) logs.length = LIMITE_LOGS;

  console.log(
    `[agentforce] ${aluno.id} bateu ${score.total} pts -> desconto ${score.beneficio.descontoPercentual}% (webhook: ${entrega.status})`,
  );

  return { disparado: true, registro };
}

export function listarLogs() {
  return logs;
}

export function limparLogs() {
  logs.length = 0;
  jaNotificados.clear();
}
