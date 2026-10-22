// Hook do orçamento persistido, com cache em sessionStorage (Fase 5.3).
// Uma requisição por tela; recusar respostas atrasadas ao trocar de projeto.
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const chaveCache = (projetoId) => `orcamento:${projetoId}`;

export function lerCacheOrcamento(projetoId) {
  try {
    const bruto = sessionStorage.getItem(chaveCache(projetoId));
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function gravarCacheOrcamento(projetoId, orcamento) {
  try {
    sessionStorage.setItem(chaveCache(projetoId), JSON.stringify(orcamento));
  } catch {
    /* storage pode falhar; segue sem cache */
  }
}

export function limparCacheOrcamento(projetoId) {
  try {
    sessionStorage.removeItem(chaveCache(projetoId));
  } catch {
    /* ignora */
  }
}

export function useOrcamento(projetoId) {
  const [estado, setEstado] = useState({
    carregando: true,
    erro: null,
    orcamento: null,
  });

  useEffect(() => {
    if (!projetoId) return undefined;
    let ativo = true; // ignora resposta atrasada do projeto anterior

    const cache = lerCacheOrcamento(projetoId);
    if (cache) {
      setEstado({ carregando: false, erro: null, orcamento: cache });
    } else {
      setEstado((s) => ({ ...s, carregando: true, erro: null }));
    }

    api
      .orcamentoDoProjeto(projetoId)
      .then((dados) => {
        if (!ativo) return;
        gravarCacheOrcamento(projetoId, dados);
        setEstado({ carregando: false, erro: null, orcamento: dados });
      })
      .catch((erro) => {
        if (!ativo) return;
        // sem cache e sem rede: erro; com cache, mantém o cache e avisa
        setEstado((s) => ({
          ...s,
          carregando: false,
          erro: s.orcamento ? null : erro.message || "Falha ao carregar o orçamento.",
        }));
      });

    return () => {
      ativo = false;
    };
  }, [projetoId]);

  const aplicar = useCallback((novoOrcamento) => {
    gravarCacheOrcamento(projetoId, novoOrcamento);
    setEstado({ carregando: false, erro: null, orcamento: novoOrcamento });
  }, [projetoId]);

  return { ...estado, aplicar };
}
