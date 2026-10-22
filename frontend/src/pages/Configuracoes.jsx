// Configurações: cenário padrão (Fase 6) e informações da sessão.
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { BotaoPrimario, classeInput } from "../components/ui";
import { LISTA_CENARIOS, idCenarioValido } from "../lib/cenarios";

const CHAVE_CENARIO = "cenarioPadrao";

export default function Configuracoes() {
  const history = useHistory();
  const [cenarioPadrao, setCenarioPadrao] = useState(
    localStorage.getItem(CHAVE_CENARIO) || "neutro"
  );
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    if (!idCenarioValido(cenarioPadrao)) return;
    localStorage.setItem(CHAVE_CENARIO, cenarioPadrao);
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2500);
  }

  const nomeUsuario = localStorage.getItem("nomeUsuario") || "Usuário";

  return (
    <div className="max-w-2xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-app-secundario">Preferências do aplicativo.</p>
      </header>

      <section className="rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="font-semibold">Aparência</h2>
        <label className="mt-3 block text-sm font-medium text-app-texto">
          Cenário padrão dos projetos
          <select
            value={cenarioPadrao}
            onChange={(e) => setCenarioPadrao(e.target.value)}
            className={`mt-1 ${classeInput}`}
          >
            {LISTA_CENARIOS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-app-secundario">
          Novos projetos começam neste cenário. O cenário de cada projeto pode ser trocado
          no editor e na página do projeto.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <BotaoPrimario onClick={salvar}>Salvar</BotaoPrimario>
          {salvo && <span className="text-sm text-emerald-700">Preferência salva.</span>}
        </div>
      </section>

      <section className="mt-4 rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="font-semibold">Sessão</h2>
        <p className="mt-2 text-sm text-app-secundario">
          Conectado como <strong className="text-app-texto">{nomeUsuario}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("nomeUsuario");
            history.replace("/login");
          }}
          className="mt-3 text-sm font-medium text-red-700 hover:underline"
        >
          Encerrar sessão
        </button>
      </section>
    </div>
  );
}
