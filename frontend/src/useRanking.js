import { useCallback, useEffect, useState } from "react";
import { buscarPerfis, buscarRanking } from "./api";

const INICIAL = { status: "carregando", dados: null, erro: null };

/**
 * Wrapper generico de fetch com estados de carregando/ok/erro.
 *
 * Nao devolve dado falso em caso de falha: a tela mostra o erro e oferece
 * tentar de novo, para ninguem confundir mock com numero real.
 *
 * @param {(opcoes: {signal: AbortSignal}) => Promise<unknown>} buscar
 * @param {unknown[]} deps quando mudam, refaz a busca
 */
function useBusca(buscar, deps) {
  const [estado, setEstado] = useState(INICIAL);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    setEstado(INICIAL);

    buscar({ signal: controller.signal })
      .then((dados) => {
        if (ativo) setEstado({ status: "ok", dados, erro: null });
      })
      .catch((erro) => {
        if (!ativo || erro.name === "AbortError") return;
        setEstado({ status: "erro", dados: null, erro: erro.message });
      });

    return () => {
      ativo = false;
      controller.abort();
    };
    // buscar e recriado a cada render pelo caller, entao dependemos das deps
    // explicitas em vez da funcao.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  return { ...estado, recarregar };
}

/**
 * Ranking do ciclo para um aluno especifico.
 * Troca de alunoId refaz a busca, porque quem e o "voce" muda o que o backend
 * devolve: so o proprio nome vem real, os outros vem anonimizados.
 */
export function useRanking(alunoId) {
  return useBusca(
    (opcoes) => buscarRanking(alunoId, opcoes),
    [alunoId],
  );
}

/** Perfis disponiveis no seletor. Busca uma vez. */
export function usePerfis() {
  return useBusca((opcoes) => buscarPerfis(opcoes), []);
}
