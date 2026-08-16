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

## Diferenciais

**Ataca a causa, não o sintoma.** A recompensa é financeira porque a causa da evasão é financeira. Gamificação com pontos sem valor real não muda a decisão de quem precisa escolher entre estudar e trabalhar.

**Ranking anonimizado por padrão.** O aluno vê a própria posição e o próprio nome; todos os outros aparecem como "Estudante". A anonimização acontece **no servidor**, não no CSS: o nome dos demais não chega ao navegador. Isso preserva a comparação social, que é o que motiva, sem o constrangimento público que faz o aluno de baixo desempenho se afastar ainda mais. Também nasce alinhado à LGPD, em vez de precisar de adequação depois.

**Usa o dado que a instituição já tem.** Nenhuma coleta nova, nenhum formulário, nenhum questionário. O score sai de colunas que já existem na base de engajamento.

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
