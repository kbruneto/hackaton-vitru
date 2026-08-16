/**
 * Camada de acesso a API do backend.
 *
 * A base URL vem de VITE_API_URL para nao ficar hardcoded no componente.
 * Sem a variavel, cai no backend local da porta 3000.
 */
const BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/**
 * Qual aluno e o usuario logado. Enquanto nao existe autenticacao, isso vem
 * de env para a demo conseguir destacar uma linha no ranking.
 */
export const ALUNO_ID = import.meta.env.VITE_ALUNO_ID ?? null;

async function request(path, { signal } = {}) {
  let resposta;

  try {
    resposta = await fetch(`${BASE_URL}${path}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (erro) {
    // AbortError precisa subir intacto para o caller poder ignorar.
    if (erro.name === "AbortError") throw erro;
    throw new Error(
      `Nao foi possivel falar com a API em ${BASE_URL}. O backend esta rodando?`,
    );
  }

  if (!resposta.ok) {
    let detalhe = `HTTP ${resposta.status}`;
    try {
      const corpo = await resposta.json();
      if (corpo?.detalhe) detalhe = corpo.detalhe;
    } catch {
      // resposta sem JSON: mantem o status como detalhe
    }
    throw new Error(detalhe);
  }

  return resposta.json();
}

/**
 * Ranking do ciclo.
 * @returns {Promise<{atualizadoEm: string, total: number, ranking: Array, me: object|null}>}
 */
export function buscarRanking({ signal } = {}) {
  const query = ALUNO_ID
    ? `?alunoId=${encodeURIComponent(ALUNO_ID)}`
    : "";
  return request(`/dashboard/ranking${query}`, { signal });
}

export function buscarAlunos({ signal } = {}) {
  return request("/alunos", { signal });
}

export function checarSaude({ signal } = {}) {
  return request("/health", { signal });
}
