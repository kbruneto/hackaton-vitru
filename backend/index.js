import express from "express";
import { createClient } from "@supabase/supabase-js";

/**
 * Configuracao
 * ---------------------------------------------------------------------------
 * A tabela do hackathon usa nomes de coluna com espaco e caixa alta, o que
 * exige cuidado no PostgREST. Centralizamos os nomes aqui para nao repetir
 * string solta pelas rotas.
 */
const TABLE = "hack_base";

const COL = {
  id: "ID_ALUNO",
  nome: "Nome",
  pontos: "PONTOS ACUMULADOS",
  curso: "NOME CURSO",
  polo: "NOME_POLO",
  codPolo: "COD_POLO",
};

/**
 * O select() do postgrest-js remove qualquer whitespace que nao esteja dentro
 * de aspas duplas. Sem as aspas, "PONTOS ACUMULADOS" chega no servidor como
 * "PONTOSACUMULADOS" e o PostgREST responde 400 (coluna inexistente).
 * Por isso todo nome com espaco entra citado, com um alias limpo na frente
 * para o JSON de resposta ficar utilizavel pelo front.
 */
const quoted = (column) => `"${column}"`;
const aliased = (alias, column) => `${alias}:${quoted(column)}`;

const SELECT_ALUNO = [
  aliased("id", COL.id),
  aliased("nome", COL.nome),
  aliased("pontos", COL.pontos),
  aliased("curso", COL.curso),
  aliased("polo", COL.polo),
  aliased("codPolo", COL.codPolo),
].join(",");

const PORT = Number(process.env.PORT ?? 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const RANKING_LIMIT = 10;

/**
 * Campos derivados
 * ---------------------------------------------------------------------------
 * A tabela do front pede Score, Regiao e Desconto, que NAO existem como coluna
 * na hack_base. O que existe e "PONTOS ACUMULADOS", NOME_POLO e COD_POLO.
 * As regras abaixo sao explicitas de proposito: se o produto definir outra
 * politica, muda aqui e o front acompanha sem alteracao.
 */

/**
 * Score de 0 a 100 a partir dos pontos acumulados.
 * O layout mostra "93/100" e o registro original tem 930 pontos, o que sugere
 * escala de 10x. INFERENCIA, vale confirmar com quem modelou a tabela.
 */
const calcularScore = (pontos) =>
  Math.max(0, Math.min(100, Math.round(pontos / 10)));

/**
 * UF do polo. A hack_base nao tem coluna de estado, so o nome do polo.
 * Mapa minimo para a demo; polo desconhecido volta null em vez de chutar.
 */
const UF_POR_POLO = {
  771: "PR",
};

const ufDoPolo = (codPolo) => UF_POR_POLO[String(codPolo)] ?? null;

/**
 * Faixa de desconto por score. Tambem nao existe no banco: e regra de negocio.
 * Os valores seguem os que aparecem no layout (20%, 10%, 5%).
 */
function calcularDesconto(score) {
  if (score >= 95) return 20;
  if (score >= 90) return 10;
  return 5;
}

/**
 * Validacao de ambiente
 * ---------------------------------------------------------------------------
 * Antes o boot passava sem env nenhuma e o erro so aparecia como falha
 * generica de query. Agora falha rapido e explica o que falta.
 */
function loadConfig() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  const errors = [];
  const warnings = [];

  if (!url) {
    errors.push("SUPABASE_URL nao definida");
  } else if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
    warnings.push(`SUPABASE_URL com formato inesperado: ${url}`);
  }

  // Placeholders do .env.example nao servem como chave.
  const isPlaceholder = (value) =>
    Boolean(value) && !/^sb_(secret|publishable)_/.test(value);

  if (secretKey && isPlaceholder(secretKey)) {
    warnings.push(
      "SUPABASE_SECRET_KEY parece ser um placeholder (nao comeca com sb_secret_)",
    );
  }
  if (publishableKey && isPlaceholder(publishableKey)) {
    warnings.push(
      "SUPABASE_PUBLISHABLE_KEY parece ser um placeholder (nao comeca com sb_publishable_)",
    );
  }

  const key = secretKey ?? publishableKey;
  if (!key) {
    errors.push(
      "defina SUPABASE_SECRET_KEY (preferido no servidor) ou SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return {
    url,
    key,
    usingSecretKey: Boolean(secretKey),
    errors,
    warnings,
  };
}

const config = loadConfig();

for (const warning of config.warnings) {
  console.warn(`[aviso] ${warning}`);
}

if (config.errors.length > 0) {
  console.error("Nao foi possivel iniciar o servidor:");
  for (const error of config.errors) {
    console.error(`  - ${error}`);
  }
  console.error("\nCopie backend/.env.example para backend/.env e preencha.");
  process.exit(1);
}

const supabase = createClient(config.url, config.key);

const app = express();
app.use(express.json());

/**
 * CORS restrito a uma origem conhecida.
 * Nao usamos "*" porque estas rotas leem dados de aluno; liberar qualquer
 * origem deixaria qualquer site ler a base via browser do usuario.
 */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

function falhou(res, erro, status = 500) {
  // Erro do PostgREST as vezes vem sem message (ex.: resposta HEAD sem body).
  // Nesse caso caimos para code/details para nao devolver detalhe vazio.
  const detalhe =
    erro?.message?.trim() ||
    erro?.details ||
    erro?.code ||
    String(erro) ||
    "erro desconhecido";
  console.error("[erro]", detalhe);
  res.status(status).json({ status: "erro", detalhe });
}

/**
 * 1. Health check — nao toca no banco.
 * Serve para saber se o processo esta de pe sem gastar query.
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    tabela: TABLE,
    usandoChaveSecreta: config.usingSecretKey,
  });
});

/**
 * 2. Teste de conexao com o banco.
 *
 * A versao anterior chamava supabase.auth.getSession(), que no servidor
 * sempre retorna sessao vazia SEM erro. Resultado: a rota respondia
 * "conectado com sucesso" mesmo com URL e chave completamente invalidas.
 * Agora faz um count real na tabela, que e o que de fato queremos provar.
 */
app.get("/teste-banco", async (req, res) => {
  try {
    // Nao usamos head:true aqui de proposito. Um HEAD nao traz body, e sem body
    // o erro do PostgREST chega com message vazia, o que dificulta o diagnostico
    // justamente na rota cujo unico trabalho e diagnosticar.
    const { count, error } = await supabase
      .from(TABLE)
      .select(quoted(COL.id), { count: "exact" })
      .limit(1);

    if (error) throw error;

    res.json({
      status: "ok",
      mensagem: `Conectado ao Supabase e a tabela ${TABLE} respondeu.`,
      totalRegistros: count ?? 0,
    });
  } catch (erro) {
    falhou(res, erro);
  }
});

/**
 * 3. Lista de alunos.
 *
 * ATENCAO: rota sem autenticacao. Como o servidor usa a chave secreta, ela
 * ignora RLS e devolve a base inteira para quem chamar. Aceitavel para a demo
 * do hackathon, mas precisa de auth antes de ir para qualquer ambiente real.
 */
app.get("/alunos", async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLE).select(SELECT_ALUNO);

    if (error) throw error;

    res.json(data ?? []);
  } catch (erro) {
    falhou(res, erro);
  }
});

/**
 * 4. Ranking do ciclo.
 *
 * A ordenacao acontece em JS, nao no banco. Motivo: o .order() do postgrest-js
 * monta o parametro via URLSearchParams, que codifica espaco como "+", e o
 * PostgREST espera "%20" para nome de coluna com espaco. Ordenar aqui evita
 * depender desse detalhe de encoding.
 *
 * Isso significa trazer a tabela inteira para memoria. Funciona bem no volume
 * do hackathon. Para escalar, o caminho e criar uma view no Postgres com
 * colunas em snake_case e ordenar/limitar no SQL.
 *
 * Query param opcional: ?alunoId=<id> marca qual aluno e o "voce".
 */
app.get("/dashboard/ranking", async (req, res) => {
  try {
    const { data, error } = await supabase.from(TABLE).select(SELECT_ALUNO);

    if (error) throw error;

    const alunoId = req.query.alunoId;

    const classificados = (data ?? [])
      .map((aluno) => ({
        ...aluno,
        pontos: Number(aluno.pontos ?? 0),
      }))
      .sort((a, b) => b.pontos - a.pontos)
      .map((aluno, indice) => {
        const score = calcularScore(aluno.pontos);

        return {
          ...aluno,
          posicao: indice + 1,
          // Derivados, nao vem do banco. Ver as regras no topo do arquivo.
          score,
          uf: ufDoPolo(aluno.codPolo),
          descontoPercentual: calcularDesconto(score),
        };
      });

    const me =
      alunoId === undefined
        ? null
        : (classificados.find(
            (aluno) => String(aluno.id) === String(alunoId),
          ) ?? null);

    res.json({
      atualizadoEm: new Date().toISOString(),
      total: classificados.length,
      ranking: classificados.slice(0, RANKING_LIMIT),
      me,
    });
  } catch (erro) {
    falhou(res, erro);
  }
});

app.use((req, res) => {
  res.status(404).json({ status: "erro", detalhe: `Rota ${req.path} nao existe` });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`CORS liberado para ${CORS_ORIGIN}`);
  if (!config.usingSecretKey) {
    console.log(
      "Usando chave publica: consultas respeitam RLS e podem vir vazias.",
    );
  }
});
