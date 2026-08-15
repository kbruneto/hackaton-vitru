/**
 * VITRU PAY-TO-LEARN — API do MVP
 *
 * Node puro (modulo http nativo), ZERO dependencias. Nao existe npm install:
 * clonou, rodou `node server.js`, funcionou.
 *
 * ATENCAO — SEGURANCA: esta API e um mock de hackathon e NAO tem autenticacao,
 * autorizacao nem rate limit. Todos os endpoints sao abertos e o CORS aceita
 * qualquer origem. Nao suba isso em ambiente exposto com dado real de aluno:
 * dados academicos e financeiros sao pessoais e sensiveis. Antes de qualquer
 * uso serio, coloque autenticacao (JWT/OAuth) e restrinja o CORS.
 */

import { createServer } from 'node:http';
import * as h from './src/handlers.js';
import { ErroHttp } from './src/handlers.js';

const PORTA = Number(process.env.PORT) || 3333;
const HOST = process.env.HOST || '0.0.0.0';
const LIMITE_BODY = 1_000_000; // 1 MB

// ---------------------------------------------------------------------------
// TABELA DE ROTAS
// ---------------------------------------------------------------------------

const rotas = [
  ['GET', '/api/health', h.health],
  ['GET', '/api/regras', h.regras],

  ['GET', '/api/students', h.listarAlunos],
  ['GET', '/api/students/:id', h.obterAluno],
  ['GET', '/api/students/:id/raw', h.obterAlunoBruto],
  ['GET', '/api/students/:id/dashboard', h.obterDashboard],

  ['POST', '/api/students/:id/mapas/:mapaId/entregar', h.entregarMapa],
  ['POST', '/api/students/:id/ava/acesso', h.registrarAcessoAva],
  ['POST', '/api/students/:id/agentforce/disparar', h.forcarDisparo],

  ['POST', '/api/webhook/agentforce', h.receberWebhookAgentforce],
  ['GET', '/api/webhook/agentforce/logs', h.logsAgentforce],

  ['POST', '/api/reset', h.resetar],
];

/**
 * Casa um padrao de rota com o caminho pedido.
 * Comparacao por segmentos, entao '/api/students' nunca colide com
 * '/api/students/:id'.
 * @returns {object|null} params quando casa, null quando nao casa
 */
function casarRota(padrao, caminho) {
  const p = padrao.split('/').filter(Boolean);
  const c = caminho.split('/').filter(Boolean);
  if (p.length !== c.length) return null;

  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      params[p[i].slice(1)] = decodeURIComponent(c[i]);
    } else if (p[i] !== c[i]) {
      return null;
    }
  }
  return params;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function responder(res, status, corpo) {
  const json = JSON.stringify(corpo, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(json);
}

function lerBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') return resolve(null);

    const pedacos = [];
    let tamanho = 0;

    req.on('data', (pedaco) => {
      tamanho += pedaco.length;
      if (tamanho > LIMITE_BODY) {
        reject(new ErroHttp(413, 'Corpo da requisição maior que 1 MB.'));
        req.destroy();
        return;
      }
      pedacos.push(pedaco);
    });

    req.on('end', () => {
      const cru = Buffer.concat(pedacos).toString('utf8').trim();
      if (!cru) return resolve(null);
      try {
        resolve(JSON.parse(cru));
      } catch {
        reject(new ErroHttp(400, 'Corpo da requisição não é um JSON válido.'));
      }
    });

    req.on('error', reject);
  });
}

const servidor = createServer(async (req, res) => {
  // Preflight de CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const caminho = url.pathname.replace(/\/+$/, '') || '/';

  // Raiz: indice dos endpoints
  if (caminho === '/' || caminho === '/api') {
    return responder(res, 200, {
      servico: 'Vitru Pay-to-Learn API',
      documentacao: 'ver README.md do repositório',
      endpoints: rotas.map(([metodo, padrao]) => `${metodo} ${padrao}`),
      alunosDeExemplo: ['STU-001', 'STU-002', 'STU-003', 'STU-004', 'STU-005'],
      dicaDemo:
        'STU-002 está a poucos pontos do alvo. Entregue o MAPA-002-C e veja o Agentforce disparar.',
    });
  }

  try {
    for (const [metodo, padrao, handler] of rotas) {
      const params = casarRota(padrao, caminho);
      if (!params) continue;

      if (metodo !== req.method) {
        return responder(res, 405, {
          erro: `Método ${req.method} não permitido em ${caminho}.`,
          metodoEsperado: metodo,
        });
      }

      const ctx = {
        params,
        query: Object.fromEntries(url.searchParams),
        body: await lerBody(req),
      };

      const resultado = await handler(ctx);

      // Handler pode devolver { status, body } quando precisa de outro status
      if (
        resultado &&
        typeof resultado === 'object' &&
        typeof resultado.status === 'number' &&
        'body' in resultado
      ) {
        return responder(res, resultado.status, resultado.body);
      }
      return responder(res, 200, resultado);
    }

    return responder(res, 404, {
      erro: `Rota não encontrada: ${req.method} ${caminho}`,
      endpoints: rotas.map(([m, p]) => `${m} ${p}`),
    });
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      return responder(res, erro.status, {
        erro: erro.message,
        ...(erro.detalhe ? { detalhe: erro.detalhe } : {}),
      });
    }
    console.error('[erro-interno]', erro);
    return responder(res, 500, {
      erro: 'Erro interno no servidor.',
      mensagem: erro?.message ?? String(erro),
    });
  }
});

servidor.listen(PORTA, HOST, () => {
  console.log('');
  console.log('  Vitru Pay-to-Learn API');
  console.log(`  http://localhost:${PORTA}`);
  console.log('');
  console.log(`  Painel do aluno   GET  /api/students/STU-002/dashboard`);
  console.log(`  Entregar MAPA     POST /api/students/STU-002/mapas/MAPA-002-C/entregar`);
  console.log(`  Logs Agentforce   GET  /api/webhook/agentforce/logs`);
  console.log('');
  console.log('  Mock sem autenticação — não use com dados reais de aluno.');
  console.log('');
});

export { servidor, casarRota };
