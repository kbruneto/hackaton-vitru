/**
 * SMOKE TEST — prova que a API funciona de ponta a ponta.
 *
 * Sobe o servidor num processo separado, exercita o fluxo inteiro da demo e
 * confere os numeros calculados a mao. Sai com codigo 1 se algo divergir, o
 * que faz o GitHub Actions falhar.
 *
 *   node scripts/smoke.js
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTA = 4545;
const BASE = `http://127.0.0.1:${PORTA}`;

let falhas = 0;
let sucessos = 0;

function checar(descricao, real, esperado) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (ok) {
    sucessos++;
    console.log(`  ok    ${descricao}`);
  } else {
    falhas++;
    console.log(`  FALHA ${descricao}`);
    console.log(`        esperado: ${JSON.stringify(esperado)}`);
    console.log(`        recebido: ${JSON.stringify(real)}`);
  }
}

function checarVerdadeiro(descricao, condicao) {
  checar(descricao, Boolean(condicao), true);
}

async function pedir(metodo, rota, corpo) {
  const resposta = await fetch(`${BASE}${rota}`, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, dados: await resposta.json() };
}

async function esperarServidor(tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// ---------------------------------------------------------------------------

const servidor = spawn(process.execPath, [join(raiz, 'server.js')], {
  cwd: raiz,
  env: { ...process.env, PORT: String(PORTA), DATA_REFERENCIA: '2026-08-15' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let logServidor = '';
servidor.stdout.on('data', (d) => (logServidor += d));
servidor.stderr.on('data', (d) => (logServidor += d));

function encerrar(codigo) {
  servidor.kill();
  process.exit(codigo);
}

try {
  const subiu = await esperarServidor();
  if (!subiu) {
    console.error('Servidor não subiu. Saída do processo:\n' + logServidor);
    encerrar(1);
  }

  console.log('\n1) Health e regras');
  {
    const { status, dados } = await pedir('GET', '/api/health');
    checar('health responde 200', status, 200);
    checar('mês de referência', dados.mesReferencia, '2026-08');
    checar('5 alunos carregados', dados.alunosCarregados, 5);

    const regras = await pedir('GET', '/api/regras');
    const somaPesos = Object.values(regras.dados.pesos).reduce((a, b) => a + b, 0);
    checar('pesos somam 1', Math.round(somaPesos * 1000) / 1000, 1);
    checar('score alvo', regras.dados.scoreAlvo, 85);
  }

  console.log('\n2) Score de cada aluno (conferido na mão)');
  {
    const esperados = {
      'STU-001': { score: 99, desconto: 15 },
      'STU-002': { score: 79, desconto: 10 },
      'STU-003': { score: 53, desconto: 5 },
      'STU-004': { score: 9, desconto: 0 },
      'STU-005': { score: 80, desconto: 10 },
    };

    const { dados } = await pedir('GET', '/api/students');
    checar('lista traz 5 alunos', dados.total, 5);
    checar('ranking ordenado por score', dados.alunos[0].id, 'STU-001');

    for (const [id, esperado] of Object.entries(esperados)) {
      const aluno = dados.alunos.find((a) => a.id === id);
      checar(`${id} score`, aluno?.score, esperado.score);
      checar(`${id} desconto`, aluno?.descontoPercentual, esperado.desconto);
    }
  }

  console.log('\n3) Dashboard do STU-002 (o caso da demo)');
  {
    const { dados } = await pedir('GET', '/api/students/STU-002/dashboard');
    checar('score total', dados.score.total, 79);
    checar('ainda não atingiu o alvo', dados.score.atingiuAlvo, false);
    checar('faltam 6 pontos', dados.score.pontosParaAlvo, 6);
    checar('progresso da barra', dados.score.progressoPercentual, 92.9);
    checar('componente AVA', dados.componentes.find((c) => c.chave === 'ava').score, 82.42);
    checar('componente MAPAs', dados.componentes.find((c) => c.chave === 'mapas').score, 64.17);
    checar('componente financeiro', dados.componentes.find((c) => c.chave === 'financeiro').score, 100);
    checar('3 MAPAs no mês', dados.mapas.length, 3);
    checar('1 MAPA pendente', dados.mapas.filter((m) => m.status === 'pendente').length, 1);
    checar('benefício ainda bloqueado', dados.beneficio.desbloqueado, false);
    checar('histórico com mês atual', dados.historicoScore.at(-1).atual, true);
    checar('próxima faixa é Excelência', dados.score.proximaFaixa.rotulo, 'Excelência');

    const minusculo = await pedir('GET', '/api/students/stu-002/dashboard');
    checar('id em minúsculo também resolve', minusculo.dados.aluno.id, 'STU-002');
  }

  console.log('\n4) Entrega do MAPA pendente -> cruza o alvo -> Agentforce');
  {
    const { status, dados } = await pedir(
      'POST',
      '/api/students/STU-002/mapas/MAPA-002-C/entregar',
      { nota: 9 },
    );
    checar('entrega aceita', status, 200);
    checar('MAPA entregue dentro do prazo', dados.mapa.dentroDoPrazo, true);
    checar('score subiu para 92', dados.score.total, 92);
    checar('ganhou 13 pontos', dados.pontosGanhos, 13);
    checar('cruzou o alvo agora', dados.cruzouOAlvoAgora, true);
    checar('faixa virou Excelência', dados.score.faixaAtual.rotulo, 'Excelência');
    checar('desconto de 15%', dados.score.beneficio.descontoPercentual, 15);
    checar('mensalidade cheia', dados.score.beneficio.mensalidadeCheia, 429.9);
    checar('valor do desconto', dados.score.beneficio.valorDesconto, 64.49);
    checar('mensalidade com desconto', dados.score.beneficio.mensalidadeComDesconto, 365.41);
    checar('Agentforce disparado', dados.agentforce.disparado, true);
    checar('webhook entregue', dados.agentforce.registro.entrega.status, 'entregue');
    checarVerdadeiro(
      'mensagem cita os 15%',
      dados.agentforce.registro.mensagemWhatsapp.includes('15% de desconto'),
    );
    checarVerdadeiro(
      'mensagem cita o valor final',
      dados.agentforce.registro.mensagemWhatsapp.includes('R$ 365,41'),
    );
  }

  console.log('\n5) Desconto aplicado no financeiro e log registrado');
  {
    const { dados } = await pedir('GET', '/api/students/STU-002/raw');
    checar('desconto gravado no cadastro', dados.financeiro.descontoAtualPercentual, 15);

    const logs = await pedir('GET', '/api/webhook/agentforce/logs');
    checar('1 disparo no log', logs.dados.total, 1);
    checar('log é do STU-002', logs.dados.logs[0].alunoId, 'STU-002');
    checar('desconto anterior era 0', logs.dados.logs[0].descontoAnteriorPercentual, 0);
  }

  console.log('\n6) Idempotência: não notifica duas vezes no mesmo mês');
  {
    const { dados } = await pedir('POST', '/api/students/STU-002/agentforce/disparar');
    checarVerdadeiro('disparo forçado funciona', dados.agentforce.disparado);

    const ava = await pedir('POST', '/api/students/STU-002/ava/acesso', { minutos: 30 });
    checar('novo acesso não redispara', ava.dados.agentforce.motivo, 'ja_notificado_neste_mes');
  }

  console.log('\n7) Simulação de acesso ao AVA sobe o score');
  {
    const antes = await pedir('GET', '/api/students/STU-003/dashboard');
    const { dados } = await pedir('POST', '/api/students/STU-003/ava/acesso', {
      minutos: 60,
      novosMateriais: 5,
    });
    checarVerdadeiro('score do STU-003 aumentou', dados.score.total > antes.dados.score.total);
    checar('dia de acesso contabilizado', dados.ava.diasAcessadosNoMes, 13);
    checar('materiais somados', dados.ava.materiaisConcluidos, 21);
  }

  console.log('\n8) Erros tratados');
  {
    const inexistente = await pedir('GET', '/api/students/STU-999/dashboard');
    checar('aluno inexistente -> 404', inexistente.status, 404);

    const jaEntregue = await pedir('POST', '/api/students/STU-002/mapas/MAPA-002-A/entregar');
    checar('MAPA já entregue -> 409', jaEntregue.status, 409);

    const mapaErrado = await pedir('POST', '/api/students/STU-001/mapas/NAO-EXISTE/entregar');
    checar('MAPA inexistente -> 404', mapaErrado.status, 404);

    const notaInvalida = await pedir('POST', '/api/students/STU-003/mapas/MAPA-003-C/entregar', {
      nota: 50,
    });
    checar('nota fora da faixa -> 400', notaInvalida.status, 400);

    const abaixoDoAlvo = await pedir('POST', '/api/students/STU-004/agentforce/disparar');
    checar('disparo com score baixo -> 422', abaixoDoAlvo.status, 422);

    const rotaErrada = await pedir('GET', '/api/naoexiste');
    checar('rota inexistente -> 404', rotaErrada.status, 404);

    const metodoErrado = await pedir('POST', '/api/students');
    checar('método errado -> 405', metodoErrado.status, 405);
  }

  console.log('\n9) Reset devolve tudo ao estado inicial');
  {
    const { dados } = await pedir('POST', '/api/reset');
    checar('reset confirmado', dados.resetado, true);

    const depois = await pedir('GET', '/api/students/STU-002/dashboard');
    checar('STU-002 voltou para 79', depois.dados.score.total, 79);
    checar('desconto voltou a 0', depois.dados.financeiro.descontoAtualPercentual, 0);

    const logs = await pedir('GET', '/api/webhook/agentforce/logs');
    checar('logs limpos', logs.dados.total, 0);
  }

  console.log('\n' + '-'.repeat(52));
  console.log(`  ${sucessos} passaram, ${falhas} falharam`);
  console.log('-'.repeat(52) + '\n');

  encerrar(falhas === 0 ? 0 : 1);
} catch (erro) {
  console.error('\nErro inesperado no smoke test:', erro);
  console.error('\nSaída do servidor:\n' + logServidor);
  encerrar(1);
}
