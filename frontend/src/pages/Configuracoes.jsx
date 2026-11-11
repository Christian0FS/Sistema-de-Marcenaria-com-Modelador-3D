// Configurações: dados da marcenaria (usados no contrato), cenário padrão e sessão.
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { api } from "../lib/api";
import { BotaoPrimario, classeInput } from "../components/ui";
import { LISTA_CENARIOS, idCenarioValido } from "../lib/cenarios";

export default function Configuracoes() {
  const history = useHistory();
  const [dados, setDados] = useState({
    nomeMarcenaria: "", cnpj: "", telefone: "", email: "", endereco: "", cenarioPadrao: "neutro",
  });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    api.lerConfiguracoes()
      .then((config) => { if (ativo) setDados((atual) => ({ ...atual, ...config })); })
      .catch((e) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, []);

  function campo(chave) {
    return {
      value: dados[chave] || "",
      onChange: (e) => setDados((atual) => ({ ...atual, [chave]: e.target.value })),
    };
  }

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const salvo2 = await api.salvarConfiguracoes(dados);
      setDados((atual) => ({ ...atual, ...salvo2 }));
      // cenário padrão também fica no localStorage como fallback imediato
      localStorage.setItem("cenarioPadrao", salvo2.cenarioPadrao || "neutro");
      setSalvo(true);
      window.setTimeout(() => setSalvo(false), 2500);
    } catch (e) {
      setErro(e.message || "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const nomeUsuario = localStorage.getItem("nomeUsuario") || "Usuário";

  return (
    <div className="max-w-2xl">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-app-secundario">Dados da marcenaria e preferências.</p>
      </header>

      <section className="rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="font-semibold">Marcenaria (usados no contrato)</h2>
        {carregando ? (
          <p className="mt-3 text-sm text-app-secundario">Carregando...</p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-app-texto sm:col-span-2">
                Nome da marcenaria
                <input className={`mt-1 ${classeInput}`} placeholder="Ex.: Marcenaria Silva" {...campo("nomeMarcenaria")} />
              </label>
              <label className="block text-sm font-medium text-app-texto">
                CNPJ (opcional)
                <input className={`mt-1 ${classeInput}`} {...campo("cnpj")} />
              </label>
              <label className="block text-sm font-medium text-app-texto">
                Telefone
                <input className={`mt-1 ${classeInput}`} {...campo("telefone")} />
              </label>
              <label className="block text-sm font-medium text-app-texto">
                E-mail
                <input className={`mt-1 ${classeInput}`} {...campo("email")} />
              </label>
              <label className="block text-sm font-medium text-app-texto">
                Endereço
                <input className={`mt-1 ${classeInput}`} {...campo("endereco")} />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-app-texto">
              Cenário padrão dos projetos
              <select {...campo("cenarioPadrao")} className={`mt-1 ${classeInput}`}>
                {LISTA_CENARIOS.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-app-secundario">
              Novos projetos começam neste cenário. O cenário de cada projeto pode ser trocado
              no editor e na página do projeto.
            </p>

            {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}
            <div className="mt-3 flex items-center gap-3">
              <BotaoPrimario onClick={salvar} disabled={salvando || !idCenarioValido(dados.cenarioPadrao)}>
                {salvando ? "Salvando..." : "Salvar"}
              </BotaoPrimario>
              {salvo && <span className="text-sm text-emerald-700">Configurações salvas.</span>}
            </div>
          </>
        )}
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
