# Vitru Pay-to-Learn

**Transformar engajamento acadêmico em desconto real na mensalidade.**

| | |
|---|---|
| Aplicação | https://hackaton-vitru.vercel.app |
| API | https://hackaton-vitru.onrender.com |
| Stack | React 19 + Vite · Node 20 + Express 5 · Supabase (Postgres) |

---

## O problema

A evasão no ensino superior brasileiro chega a **55,5%**: mais da metade dos alunos que entram não conclui o curso ([CNN Brasil](https://www.cnnbrasil.com.br/nacional/555-dos-alunos-desistem-antes-de-completar-ensino-superior-aponta-relatorio/)).

E o motivo principal não é acadêmico. Segundo a **PNAD 2024 do IBGE**, a razão que mais leva jovens brasileiros a abandonar os estudos é a **necessidade de trabalhar** ([Metrópoles](https://www.metropoles.com/brasil/trabalho-evasao-escolar-brasil-ibge)).

Ou seja: o aluno não sai porque perdeu interesse. Ele sai porque a conta não fecha.

> Conteúdo das fontes parafraseado para conformidade com licenciamento.

## Nossa hipótese: atacar a causa, não o sintoma

A maioria das iniciativas anti-evasão age sobre o **sintoma**: o aluno parou de acessar, então dispara e-mail, ligação, notificação. Isso trata o desengajamento depois que ele já aconteceu, e não muda a restrição que tirou o aluno da sala.

Se a causa é financeira, a resposta precisa ser financeira.

O Pay-to-Learn converte engajamento acadêmico em **desconto direto na mensalidade**. O aluno que estuda paga menos. Não é medalha, não é troféu, não é badge: é dinheiro no bolso de quem tem exatamente o problema que causa a evasão.

O incentivo fica alinhado nas duas pontas. O aluno ganha alívio no custo. A instituição ganha retenção, e paga por ela com desconto sobre uma receita que, sem o programa, ela perderia inteira.

## Como funciona

1. A base de engajamento (`hack_base`) já registra dias de acesso, atividades entregues, aulas assistidas, módulos finalizados e percentual de conclusão.
2. Esses sinais alimentam um **score de 0 a 100** por aluno.
3. O score define a faixa de desconto e a posição no ranking do polo.
4. O aluno vê seu score, sua posição e o desconto conquistado, atualizados a partir do banco.

| Score | Desconto na mensalidade |
|---|---|
| ≥ 95 | 20% |
| ≥ 90 | 10% |
| < 90 | 5% |

## Potencial de impacto

O modelo abaixo está em [`impacto.mjs`](./impacto.mjs) e pode ser rodado com `node impacto.mjs`. Ele calcula o mesmo cenário em duas bases independentes, para não depender de uma única premissa.

### O tamanho do problema

| | Base do desafio | Números públicos Vitru |
|---|---|---|
| Alunos | 457.427 | 1.000.000 (conservador) |
| Mensalidade média | R$ 250 | R$ 207 (derivado) |
| Evasão | 1,1% / mês | 1,67% / mês |
| Alunos perdidos por ano | 60.380 | 200.723 |
| Receita recorrente perdida por mês | R$ 1,26 mi | R$ 3,46 mi |
| **Receita perdida em 12 meses** | **R$ 83,0 mi** | **R$ 228,3 mi** |

Média das duas bases: **R$ 155,6 milhões por ano** deixados na mesa pela evasão.

Premissas: a mensalidade do cenário público é receita líquida por aluno, derivada de R$ 1.240,6 mi de receita líquida no 1S26 dividida por 6 meses e por 1 milhão de alunos ([Investing.com](https://www.investing.com/news/company-news/vitru-q2-2026-slides-record-cash-flow-drives-deleveraging-93CH-4855454), [StockAnalysis](https://stockanalysis.com/quote/bvmf/VTRU3/transcripts/)). A evasão do cenário público é a taxa setorial de 55,5% ao longo do curso ([CNN Brasil](https://www.cnnbrasil.com.br/nacional/555-dos-alunos-desistem-antes-de-completar-ensino-superior-aponta-relatorio/)), mensalizada em 48 meses. A receita perdida considera 66 meses-aluno em uma janela de 12 meses, e ignora o valor do aluno depois do 12º mês.

### Quanto custa e quando se paga

O programa oferece desconto médio de 10% ao grupo sinalizado como risco alto, dimensionado em 2× o volume mensal de evasão.

| | Base do desafio | Números públicos |
|---|---|---|
| Alunos atendidos | 10.063 | 33.454 |
| Custo do desconto por ano | R$ 3,02 mi | R$ 8,30 mi |
| Alunos retidos por mês para se pagar | 203 | 676 |
| **Ponto de equilíbrio** | **evitar 4,0% da evasão** | **evitar 4,0% da evasão** |

**O ponto de equilíbrio é idêntico nas duas bases, e isso não é coincidência.** Ele não depende do ticket nem do tamanho da base:

```
ponto de equilíbrio = (grupo / evasão) × desconto × 12 / ((1 − desconto) × 66)
                    = 2 × 10% × 12 / (90% × 66)
                    = 4,0%
```

Só as regras do programa entram na conta. A conclusão é estrutural: **se o programa evitar 1 em cada 25 evasões, ele se paga.** Acima disso, é lucro.

O aluno retido continua no programa, portanto continua com desconto: ele preserva 90% do ticket, não o ticket cheio. O modelo conta assim.

### O custo é cobrado inteiro, a retenção não é presumida

O desconto é pago a **todo** o grupo, independente de quantos ficam. O benefício conta apenas quem foi retido. Ou seja, o ponto de equilíbrio de 4% **já assume que 96% do desconto é gasto em alunos que saem de qualquer forma**.

O pior caso é conhecido e limitado:

| | Base do desafio | Números públicos |
|---|---|---|
| Custo do programa por ano | R$ 3,02 mi | R$ 8,30 mi |
| Receita já perdida por ano | R$ 83,02 mi | R$ 228,27 mi |
| **Custo como % da perda atual** | **3,6%** | **3,6%** |

Com retenção zero, o programa custa o equivalente a 3,6% do que a evasão já custa hoje. A exposição máxima é mensurável e pequena diante do problema.

### Retorno em 12 meses

Média dos dois cenários, custo do programa de R$ 5,66 mi/ano:

| Evasão evitada | Receita preservada | Resultado líquido | Retorno |
|---|---|---|---|
| 4,0% | R$ 5,96 mi | R$ 0,30 mi | 1,1x |
| 10% | R$ 14,76 mi | R$ 9,10 mi | 2,6x |
| 20% | R$ 29,52 mi | R$ 23,86 mi | 5,2x |
| 30% | R$ 44,28 mi | R$ 38,62 mi | 7,8x |

Conservador em dois pontos: o desconto é pago apenas enquanto o incentivo dura, e o valor do aluno retido a partir do 13º mês é ignorado.

### Limitação conhecida do desenho atual

No desenho atual a recompensa vai para o topo do ranking, ou seja, para os alunos mais engajados, que são os **menos propensos a evadir**. Parte do desconto vai para quem ficaria de qualquer forma.

É a principal razão para o modelo preditivo ser o próximo passo: ele desloca o incentivo de "premiar quem vai bem" para "resgatar quem está saindo", elevando o retorno por real investido. Mesmo com a mira atual, que é o pior caso, a conta fecha evitando 4% da evasão.

## Diferenciais

**Ataca a causa, não o sintoma.** A recompensa é financeira porque a causa da evasão é financeira. Gamificação com pontos sem valor real não muda a decisão de quem precisa escolher entre estudar e trabalhar.

**Ranking anonimizado por padrão.** O aluno vê a própria posição e o próprio nome; todos os outros aparecem como "Estudante". A anonimização acontece **no servidor**, não no CSS: o nome dos demais não chega ao navegador. Isso preserva a comparação social, que é o que motiva, sem o constrangimento público que faz o aluno de baixo desempenho se afastar ainda mais. Também nasce alinhado à LGPD, em vez de precisar de adequação depois.

**Usa o dado que a instituição já tem.** Nenhuma coleta nova, nenhum formulário, nenhum questionário. O score sai de colunas que já existem na base de engajamento.

**A conta fecha com margem folgada.** Basta evitar 1 em cada 25 evasões para o programa se pagar, e esse número não depende do ticket nem do tamanho da base. É um piso baixo para uma aposta que, no cenário intermediário, devolve 5,2x. E o cálculo já assume que o desconto da grande maioria é gasto em alunos que saem de qualquer forma.

## Arquitetura

```
frontend/          React 19 + Vite + Tailwind    → Vercel
backend/           Express 5 + @supabase/supabase-js → Render
                   Supabase Postgres (tabela hack_base)
```

### Endpoints

| Rota | Função |
|---|---|
| `GET /health` | Status do processo, sem tocar no banco |
| `GET /teste-banco` | Valida conexão com a tabela e retorna a contagem |
| `GET /alunos` | Lista os alunos da base |
| `GET /perfis` | `id` e `nome` para o seletor de perfil |
| `GET /dashboard/ranking?alunoId=X` | Ranking ordenado por pontos, com o nome real apenas de `X` |

### Decisões técnicas que valem nota de rodapé

**Anonimização no backend.** O `/dashboard/ranking` monta a resposta campo por campo e substitui o nome de todos, exceto o do `alunoId`, por `"Estudante"`. Nenhum nome de terceiro sai do servidor.

**Colunas com espaço no nome.** A `hack_base` usa nomes como `PONTOS ACUMULADOS`. O `select()` do `postgrest-js` remove whitespace fora de aspas, o que transformava a coluna em `PONTOSACUMULADOS` e retornava 400. Todo nome com espaço entra citado, com alias limpo para o JSON de resposta.

**Ordenação em JS, não no SQL.** O `.order()` do `postgrest-js` monta o parâmetro via `URLSearchParams`, que codifica espaço como `+`, enquanto o PostgREST espera `%20`. Ordenar em memória evita depender desse detalhe. Para escalar, o caminho é uma view com colunas em `snake_case`.

**CORS restrito por origem.** Sem `*`: as rotas leem dados de aluno, e liberar qualquer origem permitiria que qualquer site lesse a base pelo navegador do usuário.

## O que é dado real e o que é derivado

Transparência sobre a demo:

**Vem do banco:** posição no ranking (ordenada por `PONTOS ACUMULADOS`), nome, unidade (`NOME_POLO`), pontos.

**Derivado por regra explícita no código:** o score (`PONTOS ACUMULADOS / 10`), a UF (mapa de polo) e a faixa de desconto. As regras estão isoladas no topo do `backend/index.js` para trocar sem tocar no resto.

**Ainda mockado no front:** os números da Home e as telas de Atividades e Notificações. A tela de **Ranking de Classificação** é a que consome a API de verdade.

**Seletor de perfil no lugar de login.** O ícone de perfil no header troca qual aluno é o usuário da sessão, para demonstrar a experiência de diferentes perfis sem implementar autenticação. Com login real, essa identidade viria do token.

## Próximos passos

1. **Score de risco de evasão.** Hoje o score mede engajamento. O passo natural é cruzar os sinais da base (queda de acesso, atividades não entregues, módulos parados) com o modelo preditivo para classificar risco, e priorizar a oferta de desconto para quem está em risco alto, não apenas para quem já vai bem.
2. **Autenticação.** Supabase Auth com RLS, substituindo o seletor de perfil. As rotas hoje não têm autenticação e usam a chave secreta, o que é aceitável na demo e bloqueante em produção.
3. **Modelo de custo.** Calibrar as faixas de desconto contra o LTV do aluno retido, para o programa se pagar.
4. **View no Postgres** com colunas normalizadas, permitindo ordenação e paginação no banco.

## Rodando localmente

```bash
# backend
cd backend
npm install
cp .env.example .env    # preencha SUPABASE_URL e SUPABASE_SECRET_KEY
npm run dev             # http://localhost:3000

# frontend
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Variáveis do frontend (`frontend/.env`), sem segredo, embutidas no bundle:

```
VITE_API_URL=http://localhost:3000
VITE_ALUNO_ID=372383
```
