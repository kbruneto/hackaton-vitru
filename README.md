# Vitru Pay-to-Learn — API do MVP

[![CI](https://github.com/kbruneto/hackaton-vitru/actions/workflows/ci.yml/badge.svg)](https://github.com/kbruneto/hackaton-vitru/actions/workflows/ci.yml)

Back-end que transforma engajamento acadêmico em desconto na mensalidade.

O aluno acumula um **Score Vitru** conforme acessa o AVA e entrega os MAPAs no prazo. Ao atingir o Score alvo, o Agentforce entra em cena: aplica o desconto no financeiro e manda um WhatsApp avisando.

## Rodando

Precisa de **Node 18 ou superior**. Nada mais — o projeto tem **zero dependências**, não existe `npm install`.

```bash
git clone <url-do-repo>
cd hackaton-vitru
node server.js
```

Sobe em `http://localhost:3333`. Para trocar a porta: `PORT=8080 node server.js`.

Para provar que está tudo funcionando:

```bash
node scripts/smoke.js
```

Ele sobe a API, roda o fluxo completo da demo e confere mais de 60 asserções, incluindo todos os Scores conferidos na mão. O mesmo teste roda no GitHub Actions a cada push, em Node 18, 20 e 22.

## Estrutura

```
server.js              Servidor HTTP + roteador + CORS
scripts/smoke.js       Teste ponta a ponta
src/
  database.json        O "banco": 5 alunos com dados de AVA, MAPAs e financeiro
  db.js                Acesso aos dados (troque por Postgres mexendo só aqui)
  scoreEngine.js       ALGORITMO CORE — pesos, faixas e fórmula do Score
  agentforce.js        Mock do Agentforce: aplica desconto e dispara WhatsApp
  handlers.js          Handlers dos endpoints
```

Quer mexer na fórmula, nos pesos ou nas faixas de desconto? É só em `src/scoreEngine.js`.

## Como o Score é calculado

```
Score = (AVA × 0,4) + (MAPAs × 0,4) + (Financeiro × 0,2)
```

Cada componente vai de 0 a 100:

| Componente | Composição |
|---|---|
| **AVA** | 60% frequência (dias acessados ÷ dias úteis) + 40% conclusão de materiais |
| **MAPAs** | 70% pontualidade + 30% desempenho (nota ÷ 10) |
| **Financeiro** | 50% adimplência histórica + 50% situação atual do pagamento |

Pontualidade por MAPA: no prazo = 1, com atraso = 0,5, pendente ou não entregue = 0. Um MAPA não entregue zera pontualidade **e** desempenho daquele MAPA — é por isso que entregar um pendente move o Score de forma visível.

Faixas de desconto:

| Score | Faixa | Desconto |
|---|---|---|
| 85+ | Excelência | 15% |
| 70–84 | Avançado | 10% |
| 50–69 | Consistente | 5% |
| 0–49 | Em construção | 0% |

O Agentforce dispara quando o Score chega a **85**.

## Endpoints

Base: `/api`

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | Status da API e mês de referência |
| GET | `/regras` | Pesos, faixas e fórmula (o front não precisa hardcodear nada) |
| GET | `/students` | Ranking dos alunos por Score |
| GET | `/students/:id` | Dados crus + Score calculado |
| GET | `/students/:id/raw` | Só os dados crus, sem cálculo |
| GET | `/students/:id/dashboard` | **Payload pronto para o painel** |
| POST | `/students/:id/mapas/:mapaId/entregar` | Simula entrega de MAPA e recalcula |
| POST | `/students/:id/ava/acesso` | Simula acesso ao AVA e recalcula |
| POST | `/students/:id/agentforce/disparar` | Força o disparo (para testar o front) |
| POST | `/webhook/agentforce` | Recebe o payload (finge ser o Salesforce) |
| GET | `/webhook/agentforce/logs` | Histórico de disparos e mensagens |
| POST | `/reset` | Devolve o banco ao estado inicial |

Todas as rotas GET aceitam `?data=YYYY-MM-DD` para simular outra data de referência.

### O que o dashboard devolve

`GET /api/students/STU-002/dashboard` entrega tudo que o painel precisa em uma chamada:

```json
{
  "aluno": { "id": "STU-002", "nome": "Carlos Eduardo Lima", "curso": "..." },
  "mesReferencia": "2026-08",
  "score": {
    "total": 79,
    "alvo": 85,
    "atingiuAlvo": false,
    "pontosParaAlvo": 6,
    "progressoPercentual": 92.9,
    "faixaAtual":   { "rotulo": "Avançado",   "descontoPercentual": 10 },
    "proximaFaixa": { "rotulo": "Excelência", "descontoPercentual": 15, "pontosFaltantes": 6 }
  },
  "componentes": [
    { "chave": "ava",        "rotulo": "Presença no AVA",       "score": 82.42, "peso": 0.4, "contribuicao": 32.97, "detalhe": {} },
    { "chave": "mapas",      "rotulo": "Entrega de MAPAs",      "score": 64.17, "peso": 0.4, "contribuicao": 25.67, "detalhe": {} },
    { "chave": "financeiro", "rotulo": "Engajamento financeiro","score": 100,   "peso": 0.2, "contribuicao": 20,    "detalhe": {} }
  ],
  "beneficio": {
    "descontoPercentual": 10,
    "mensalidadeCheia": 429.9,
    "valorDesconto": 42.99,
    "mensalidadeComDesconto": 386.91,
    "desbloqueado": false
  },
  "mapas": [],
  "historicoScore": []
}
```

`progressoPercentual` já vem pronto para a largura da barra. `componentes[].detalhe` traz os números por trás de cada nota, para o painel explicar ao aluno de onde veio o Score.

## O roteiro da demo

`STU-002` (Carlos) foi montado de propósito a 6 pontos do alvo, com um MAPA pendente.

```bash
# 1. Painel: 79 pontos, faixa Avançado, benefício bloqueado
curl http://localhost:3333/api/students/STU-002/dashboard

# 2. Entrega o MAPA pendente
curl -X POST http://localhost:3333/api/students/STU-002/mapas/MAPA-002-C/entregar \
  -H "Content-Type: application/json" -d '{"nota": 9}'

# 3. Score vai para 92, cruza o alvo, desconto de 15% aplicado,
#    Agentforce disparado com a mensagem de WhatsApp

# 4. Ver a mensagem que "foi enviada"
curl http://localhost:3333/api/webhook/agentforce/logs

# 5. Zerar tudo e apresentar de novo
curl -X POST http://localhost:3333/api/reset
```

No passo 3 a resposta traz `cruzouOAlvoAgora: true` e `pontosGanhos: 13` — bons ganchos para animação no front.

Os outros alunos cobrem os demais cenários: `STU-001` já está no topo (99), `STU-005` no meio (80), `STU-003` na faixa baixa (53) e `STU-004` em risco claro de evasão (9).

## Variáveis de ambiente

| Variável | Padrão | Para que serve |
|---|---|---|
| `PORT` | `3333` | Porta do servidor |
| `HOST` | `0.0.0.0` | Interface de escuta |
| `DATA_REFERENCIA` | `2026-08-15` | Data de referência dos cálculos. Use `hoje` para o relógio real |
| `AGENTFORCE_WEBHOOK_URL` | webhook interno | Aponte para um endpoint real ou para o webhook.site na apresentação |

A data de referência é fixa de propósito: o mock foi montado sobre agosto/2026, então a demo dá os mesmos números em qualquer máquina e em qualquer dia.

## Notas de implementação

**Sem persistência em disco.** O `database.json` é carregado em memória e as simulações mexem só na cópia. `POST /api/reset` recarrega o seed. A demo é repetível e é impossível corromper os dados.

**Status de MAPA é derivado, nunca armazenado.** Vem sempre da comparação entre `prazo` e `entregueEm`, então não existe risco de dado inconsistente.

**Notificação idempotente.** Cada aluno é notificado uma única vez por mês de referência. O disparo fica registrado no log mesmo se o POST do webhook falhar, então a demo nunca fica sem a mensagem por causa de rede.

## Segurança

Este é um mock de hackathon: **não tem autenticação, autorização nem rate limit**, e o CORS aceita qualquer origem. Todos os endpoints estão abertos, incluindo os que alteram dados financeiros.

Dados acadêmicos e financeiros de aluno são pessoais e sensíveis. Antes de qualquer uso além da demo, é necessário adicionar autenticação, restringir o CORS às origens conhecidas e proteger as rotas de escrita.

## Próximos passos

- Trocar o `db.js` por Postgres ou SQLite mantendo a mesma interface
- Autenticação por aluno (JWT) e CORS restrito
- Persistir o `historicoScore` de verdade, fechando o mês automaticamente
- Ligar o `AGENTFORCE_WEBHOOK_URL` no Agentforce real
