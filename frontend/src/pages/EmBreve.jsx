// Página "Em breve" para recursos sem tela real ainda (Fase 1/8).
import React from "react";
import { useHistory } from "react-router-dom";
import { Vazio } from "../components/ui";

export default function EmBreve({ titulo = "Esta página" }) {
  const history = useHistory();
  return (
    <Vazio
      titulo={`${titulo} — em breve`}
      descricao="Este recurso ainda não está disponível nesta versão."
    >
      <button
        type="button"
        onClick={() => history.push("/")}
        className="rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white hover:bg-primario-escuro"
      >
        Voltar ao painel
      </button>
    </Vazio>
  );
}
