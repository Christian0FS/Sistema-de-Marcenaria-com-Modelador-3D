// Painel inicial (/): grade de cards com Kanban, Clientes, Projetos, Insumos,
// mini visualizador 3D (somente leitura) e cards "Em breve" (Fases 2 e 8).
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { api } from "../lib/api";
import { PilulaStatus, Carregando, Erro, BotaoPrimario, BotaoSecundario, classeInput } from "../components/ui";
import ResumoOrcamento from "../components/ResumoOrcamento";
import { formatarBRL } from "../lib/formato";
import { IconeMais, IconeUsuario } from "../components/icone";
import { NovoProjetoModal } from "./Kanban";
import MiniVisualizador from "../components/MiniVisualizador";

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function CardPainel({ titulo, acao, children, className = "" }) {
  return (
    <section className={`flex flex-col rounded-card border border-app-borda bg-white p-4 shadow-card ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-app-texto">{titulo}</h2>
        {acao}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function CardEmBreve({ titulo, children }) {
  return (
    <section className="flex flex-col rounded-card border border-app-borda bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-app-texto">{titulo}</h2>
        <span className="rounded-full bg-app-fundo px-2 py-0.5 text-[10px] text-app-secundario">Em breve</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
        {children}
      </div>
    </section>
  );
}

export default function Painel() {
  const history = useHistory();
  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [chapas, setChapas] = useState([]);
  const [orcamentos, setOrcamentos] = useState(null);
  const [erroOrcamentos, setErroOrcamentos] = useState("");
  const [projetoSelecionado, setProjetoSelecionado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mostrarNovo, setMostrarNovo] = useState(false);

  useEffect(() => {
    Promise.all([api.listarProjetos(), api.listarClientes(), api.listarChapas()])
      .then(([ps, cs, chs]) => {
        setProjetos(ps);
        setClientes(cs);
        setChapas(chs);
        // padrão: o último projeto com módulos
        const comModulos = [...ps].reverse().find((p) => (p.modulos?.length || 0) > 0);
        if (comModulos) setProjetoSelecionado(comModulos.id);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  // lista de orçamentos numa chamada só (sem recalcular nada)
  useEffect(() => {
    api.listarOrcamentos()
      .then((lista) => setOrcamentos(lista))
      .catch((e) => setErroOrcamentos(e.message));
  }, []);

  if (carregando) return <Carregando texto="Carregando painel..." />;
  if (erro) return <Erro mensagem={erro} />;

  const totalMoveis = projetos.reduce((soma, p) => soma + (p.modulos?.length || 0), 0);
  const nomeCliente = (id) => (clientes.find((c) => c.id === id)?.nome) || "Sem cliente";
  const orcamentoPorProjeto = new Map((orcamentos || []).map((o) => [o.projetoId, o]));
  const projetoAtivo = projetos.find((p) => p.id === projetoSelecionado) || null;
  const orcamentoAtivo = orcamentoPorProjeto.get(projetoSelecionado) || null;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Painel</h1>
        <p className="text-sm text-app-secundario">Visão geral da marcenaria.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Kanban resumido */}
        <CardPainel
          titulo="Kanban de Projetos"
          acao={<BotaoPrimario onClick={() => setMostrarNovo(true)}><IconeMais tamanho={16} className="inline" /> Novo projeto</BotaoPrimario>}
        >
          {projetos.length === 0 ? (
            <p className="py-6 text-center text-sm text-app-secundario">Nenhum projeto ainda.</p>
          ) : (
            <ul className="space-y-2">
              {projetos.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => history.push(`/projetos/${p.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-app-borda px-3 py-2 text-left text-sm hover:bg-app-fundo"
                  >
                    <span className="truncate">{p.nome}</span>
                    <PilulaStatus status={p.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => history.push("/kanban")}
            className="mt-3 text-sm font-medium text-primario hover:text-primario-escuro"
          >
            Ver kanban completo →
          </button>
        </CardPainel>

        {/* Clientes resumido */}
        <CardPainel
          titulo="Clientes"
          acao={<BotaoSecundario onClick={() => history.push("/clientes")}>Abrir</BotaoSecundario>}
        >
          {clientes.length === 0 ? (
            <p className="py-6 text-center text-sm text-app-secundario">Nenhum cliente ainda.</p>
          ) : (
            <ul className="space-y-2">
              {clientes.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-2.5 rounded-lg border border-app-borda px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primario-suave text-[10px] font-bold text-primario-escuro">
                    {(c.nome || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-app-secundario">{c.telefone || "Sem telefone"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-app-secundario">{clientes.length} cliente(s) no total</p>
        </CardPainel>

        {/* Mini visualizador 3D (somente leitura, sempre cenário Neutro) */}
        <MiniVisualizador projetos={projetos} chapas={chapas} />

        {/* Insumos resumido */}
        <CardPainel
          titulo="Insumos"
          acao={<BotaoSecundario onClick={() => history.push("/insumos")}>Abrir</BotaoSecundario>}
        >
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-app-fundo px-2 py-3">
              <dt className="text-xs text-app-secundario">Chapas</dt>
              <dd className="text-lg font-semibold">{chapas.length}</dd>
            </div>
            <div className="rounded-lg bg-app-fundo px-2 py-3">
              <dt className="text-xs text-app-secundario">Móveis</dt>
              <dd className="text-lg font-semibold">{totalMoveis}</dd>
            </div>
            <div className="rounded-lg bg-app-fundo px-2 py-3">
              <dt className="text-xs text-app-secundario">Projetos</dt>
              <dd className="text-lg font-semibold">{projetos.length}</dd>
            </div>
          </dl>
        </CardPainel>

        {/* Fase 2.1 — Orçamento do projeto (dados reais do backend) */}
        <CardPainel
          titulo="Orçamento do projeto"
          acao={
            <select
              value={projetoSelecionado}
              onChange={(e) => setProjetoSelecionado(e.target.value)}
              aria-label="Projeto do orçamento"
              className={`max-w-[180px] ${classeInput}`}
            >
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          }
          className="xl:col-span-2"
        >
          {erroOrcamentos && <Erro mensagem={erroOrcamentos} />}
          {!projetoAtivo ? (
            <p className="py-6 text-center text-sm text-app-secundario">Nenhum projeto ainda.</p>
          ) : (projetoAtivo.modulos?.length || 0) === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-app-secundario">
                Adicione módulos ao projeto para calcular o orçamento.
              </p>
              <BotaoSecundario className="mt-3" onClick={() => history.push(`/projetos/${projetoAtivo.id}`)}>
                Abrir projeto
              </BotaoSecundario>
            </div>
          ) : orcamentoAtivo?.detalhe ? (
            <ResumoOrcamento
              orcamento={{
                ...orcamentoAtivo,
                statusOrcamento: orcamentoAtivo.statusOrcamento || "rascunho",
              }}
              nomeProjeto={projetoAtivo.nome}
              nomeCliente={nomeCliente(projetoAtivo.cliente_id)}
              aoVerCompleto={() => history.push(`/projetos/${projetoAtivo.id}/orcamento`)}
              aoGerarContrato={() => history.push(`/projetos/${projetoAtivo.id}/contrato`)}
            />
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-app-secundario">
                Orçamento ainda não calculado para este projeto.
              </p>
              <BotaoSecundario className="mt-3" onClick={() => history.push(`/projetos/${projetoAtivo.id}/orcamento`)}>
                Calcular agora
              </BotaoSecundario>
            </div>
          )}
        </CardPainel>

        {/* Fase 2.2 — Projetos ativos com custo (uma chamada: GET /orcamentos) */}
        <CardPainel titulo="Projetos ativos">
          {projetos.length === 0 ? (
            <p className="py-6 text-center text-sm text-app-secundario">Nenhum projeto ainda.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {projetos.slice(0, 8).map((p) => {
                const orc = orcamentoPorProjeto.get(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => history.push(`/projetos/${p.id}/orcamento`)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-app-borda px-3 py-2 text-left hover:bg-app-fundo"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.nome}</span>
                        <span className="block text-xs text-app-secundario">
                          {nomeCliente(p.cliente_id)} · {p.modulos?.length || 0} móveis
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold tabular-nums text-primario-escuro">
                          {orc?.precoVenda ? formatarBRL(orc.precoVenda) : "—"}
                        </span>
                        <PilulaStatus status={p.status} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardPainel>
      </div>

      {mostrarNovo && (
        <NovoProjetoModal
          aoFechar={() => setMostrarNovo(false)}
          aoCriar={(novo) => {
            setMostrarNovo(false);
            history.push(`/projetos/${novo.id}`);
          }}
        />
      )}
    </div>
  );
}
