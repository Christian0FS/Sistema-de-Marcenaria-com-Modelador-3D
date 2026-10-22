// Projetos: tabela com filtro de status + painel "Móveis do projeto" (Fase 2).
import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import {
  PilulaStatus, Carregando, Vazio, Erro, BotaoPrimario, BotaoSecundario, classeInput,
} from "../components/ui";
import { IconeExcluir } from "../components/icone";
import { NovoProjetoModal } from "./Kanban";

const STATUS = ["lead", "orcamento", "producao", "montagem"];
void STATUS; // usado apenas como referência dos valores válidos

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
}

export default function Projetos() {
  const history = useHistory();
  const location = useLocation();
  const clienteInicial = new URLSearchParams(location.search).get("cliente");

  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [selecionadoId, setSelecionadoId] = useState(clienteInicial ? null : null);
  const [mostrarNovo, setMostrarNovo] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  useEffect(() => {
    Promise.all([api.listarProjetos(), api.listarClientes()])
      .then(([listaProjetos, listaClientes]) => {
        setProjetos(listaProjetos);
        setClientes(listaClientes);
        // com ?cliente=..., abre o painel do primeiro projeto desse cliente
        if (clienteInicial) {
          const primeiro = listaProjetos.find((p) => p.cliente_id === clienteInicial);
          if (primeiro) setSelecionadoId(primeiro.id);
        }
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [clienteInicial]);

  const nomeCliente = useMemo(() => {
    const mapa = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
    return (id) => mapa[id] || "—";
  }, [clientes]);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return projetos.filter((p) => {
      const casaBusca = !t || (p.nome || "").toLowerCase().includes(t) ||
        nomeCliente(p.cliente_id).toLowerCase().includes(t);
      const casaStatus = !filtroStatus || p.status === filtroStatus;
      return casaBusca && casaStatus;
    });
  }, [projetos, busca, filtroStatus, nomeCliente]);

  const selecionado = projetos.find((p) => p.id === selecionadoId) || null;

  async function excluirProjeto() {
    if (!confirmarExclusao) return;
    setErro("");
    try {
      await api.excluirProjeto(confirmarExclusao.id);
      setProjetos((atual) => atual.filter((p) => p.id !== confirmarExclusao.id));
      if (selecionadoId === confirmarExclusao.id) setSelecionadoId(null);
      setConfirmarExclusao(null);
    } catch (e) {
      setErro(e.message);
      setConfirmarExclusao(null);
    }
  }

  if (carregando) return <Carregando texto="Carregando projetos..." />;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Projetos</h1>
          <p className="text-sm text-app-secundario">{projetos.length} projeto(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar projeto ou cliente..."
            aria-label="Buscar projetos"
            className={classeInput}
          />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            aria-label="Filtrar por status"
            className={classeInput}
          >
            <option value="">Todos os status</option>
            <option value="lead">Lead</option>
            <option value="orcamento">Orçamento</option>
            <option value="producao">Produção</option>
            <option value="montagem">Montagem</option>
          </select>
          <BotaoPrimario onClick={() => setMostrarNovo(true)}>+ Novo projeto</BotaoPrimario>
        </div>
      </header>

      {erro && <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-card border border-app-borda bg-white shadow-card">
          {filtrados.length === 0 ? (
            <div className="p-6">
              <Vazio
                titulo={projetos.length === 0 ? "Nenhum projeto" : "Nenhum projeto encontrado"}
                descricao={projetos.length === 0 ? "Crie o primeiro projeto no botão acima." : "Ajuste a busca ou o filtro."}
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  <th className="px-4 py-2.5 font-medium">Projeto</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Atualizado</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((projeto) => (
                  <tr
                    key={projeto.id}
                    onClick={() => setSelecionadoId(projeto.id)}
                    className={`cursor-pointer border-b border-app-borda/60 transition-colors hover:bg-app-fundo ${selecionadoId === projeto.id ? "bg-primario-suave/60" : ""
                      }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-app-texto">{projeto.nome}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{nomeCliente(projeto.cliente_id)}</td>
                    <td className="px-4 py-2.5"><PilulaStatus status={projeto.status} /></td>
                    <td className="px-4 py-2.5 text-app-secundario">{formatarData(projeto.criado_em)}</td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        aria-label={`Excluir ${projeto.nome}`}
                        onClick={(e) => { e.stopPropagation(); setConfirmarExclusao(projeto); }}
                        className="rounded p-1.5 text-app-secundario hover:bg-red-50 hover:text-red-700"
                      >
                        <IconeExcluir tamanho={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-app-borda px-4 py-2 text-xs text-app-secundario">
            Mostrando {filtrados.length} de {projetos.length} projeto(s)
          </div>
        </section>

        {/* painel: móveis do projeto selecionado */}
        <aside className="rounded-card border border-app-borda bg-white p-4 shadow-card">
          {selecionado ? (
            <>
              <h2 className="font-semibold">{selecionado.nome}</h2>
              <div className="mt-1 flex items-center gap-2">
                <PilulaStatus status={selecionado.status} />
                <span className="text-xs text-app-secundario">{nomeCliente(selecionado.cliente_id)}</span>
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-app-secundario">
                Móveis do projeto ({selecionado.modulos?.length || 0})
              </h3>
              {selecionado.modulos?.length ? (
                <ul className="mt-2 space-y-2">
                  {selecionado.modulos.map((modulo) => (
                    <li key={modulo.modulo_id} className="flex items-center gap-3 rounded-lg border border-app-borda p-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primario-suave text-xs text-primario-escuro">
                        3D
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{modulo.nome || "Móvel"}</p>
                        <p className="text-xs text-app-secundario">
                          {modulo.dimensoes
                            ? `${modulo.dimensoes.largura} × ${modulo.dimensoes.altura} × ${modulo.dimensoes.profundidade} mm`
                            : "Sem dimensões"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-app-secundario">Nenhum móvel neste projeto.</p>
              )}
              <div className="mt-4 space-y-2">
                <BotaoPrimario
                  className="w-full"
                  onClick={() => history.push(`/editor/${selecionado.id}`)}
                >
                  Adicionar móvel
                </BotaoPrimario>
                {selecionado.modulos?.length > 0 && (
                  <BotaoSecundario
                    className="w-full"
                    onClick={() => history.push(`/editor/${selecionado.id}/${selecionado.modulos[0].modulo_id}`)}
                  >
                    Ir para o Editor 3D
                  </BotaoSecundario>
                )}
                <BotaoSecundario className="w-full" onClick={() => history.push(`/projetos/${selecionado.id}`)}>
                  Abrir detalhe do projeto
                </BotaoSecundario>
              </div>
            </>
          ) : (
            <Vazio titulo="Selecione um projeto" descricao="Clique em uma linha da tabela para ver os móveis." />
          )}
        </aside>
      </div>

      {confirmarExclusao && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-flutuante">
            <h2 className="text-lg font-semibold">Excluir projeto</h2>
            <p className="mt-2 text-sm text-app-secundario">
              Excluir <strong>{confirmarExclusao.nome}</strong> e todos os móveis dele? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setConfirmarExclusao(null)}>Cancelar</BotaoSecundario>
              <button
                type="button"
                onClick={excluirProjeto}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarNovo && (
        <NovoProjetoModal
          aoFechar={() => setMostrarNovo(false)}
          aoCriar={(novo) => {
            setMostrarNovo(false);
            setProjetos((atual) => [novo, ...atual]);
            setSelecionadoId(novo.id);
          }}
        />
      )}
    </div>
  );
}
