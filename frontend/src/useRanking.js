import { useCallback, useEffect, useState } from "react";
import { buscarRanking } from "./api";

/**
 * Busca o ranking na API.
 *
 * Estados possiveis: "carregando" | "ok" | "erro".
 * Nao devolve dado falso em caso de falha: a tela mostra o erro e oferece
 * tentar de novo, para ninguem confundir mock com numero real.
 */
export function useRanking() {
  const [estado, setEstado] = useState({
    status: "carregando",
    dados: null,
    erro: null,
  });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    setEstado({ status: "carregando", dados: null, erro: null });

    buscarRanking({ signal: controller.signal })
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
  }, [tentativa]);

  const recarregar = useCallback(() => setTentativa((n) => n + 1), []);

  return { ...estado, recarregar };
}
