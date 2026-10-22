// Seletor de cenário do visualizador (Fase 6): troca e salva por projeto.
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { LISTA_CENARIOS, idCenarioValido } from "../lib/cenarios";

export default function SeletorCenario({ projetoId, valor = "neutro", aoTrocar }) {
  const [cenario, setCenario] = useState(valor);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aoTrocar && idCenarioValido(valor)) setCenario(valor);
  }, [valor]); // eslint-disable-line

  async function trocar(id) {
    if (!idCenarioValido(id)) return;
    setCenario(id);
    if (aoTrocar) aoTrocar(id);
    if (!projetoId) return;
    setSalvando(true);
    try {
      await api.atualizarStatusProjeto(projetoId, undefined, id);
    } catch {
      /* a escolha visual fica mesmo se o salvar falhar */
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="mb-2 flex items-center gap-2 text-sm">
      <label htmlFor="seletor-cenario" className="font-medium text-app-texto">
        Cenário
      </label>
      <select
        id="seletor-cenario"
        value={cenario}
        onChange={(e) => trocar(e.target.value)}
        className="rounded-lg border border-app-borda bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primario/40"
      >
        {LISTA_CENARIOS.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>
      {salvando && <span className="text-xs text-app-secundario">salvando…</span>}
    </div>
  );
}
