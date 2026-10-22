// Clientes: tabela com busca, CRUD e painel lateral de detalhe (Fase 2).
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { api } from "../lib/api";
import {
  PilulaStatus, Carregando, Vazio, Erro, BotaoPrimario, BotaoSecundario, classeInput,
} from "../components/ui";
import { IconeEditar, IconeExcluir } from "../components/icone";

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("pt-BR");
}

function FormularioCliente({ inicial, aoSalvar, aoCancelar, salvando }) {
  const [nome, setNome] = useState(inicial?.nome || "");
  const [telefone, setTelefone] = useState(inicial?.telefone || "");
  const [email, setEmail] = useState(inicial?.email || "");
  const [endereco, setEndereco] = useState(inicial?.endereco || "");
  const [erro, setErro] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) { setErro("Informe o nome."); return; }
        aoSalvar({ nome: nome.trim(), telefone, email, endereco });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium text-app-texto">
        Nome
        <input required value={nome} onChange={(e) => setNome(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <label className="block text-sm font-medium text-app-texto">
        Telefone
        <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <label className="block text-sm font-medium text-app-texto">
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <label className="block text-sm font-medium text-app-texto">
        Endereço
        <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <BotaoSecundario onClick={aoCancelar}>Cancelar</BotaoSecundario>
        <BotaoPrimario type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </BotaoPrimario>
      </div>
    </form>
  );
}

export default function Clientes() {
  const history = useHistory();
  const location = useLocation();
  const [clientes, setClientes] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [selecionadoId, setSelecionadoId] = useState(new URLSearchParams(location.search).get("selecionado") || null);
  const [editando, setEditando] = useState(null); // null | {} (novo) | cliente
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);

  useEffect(() => {
    Promise.all([api.listarClientes(), api.listarProjetos()])
      .then(([listaClientes, listaProjetos]) => {
        setClientes(listaClientes);
        setProjetos(listaProjetos);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return clientes;
    return clientes.filter((c) => (c.nome || "").toLowerCase().includes(t));
  }, [clientes, busca]);

  const selecionado = clientes.find((c) => c.id === selecionadoId) || null;
  const projetosDoSelecionado = selecionado
    ? projetos.filter((p) => p.cliente_id === selecionado.id)
    : [];

  async function salvar(dados) {
    setSalvando(true);
    setErro("");
    try {
      if (editando?.id) {
        await api.atualizarCliente(editando.id, dados);
        setClientes((atual) => atual.map((c) => (c.id === editando.id ? { ...c, ...dados } : c)));
      } else {
        const criado = await api.criarCliente(dados);
        setClientes((atual) => [criado, ...atual]);
        setSelecionadoId(criado.id);
      }
      setEditando(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirmarExclusao) return;
    setErro("");
    try {
      await api.excluirCliente(confirmarExclusao.id);
      setClientes((atual) => atual.filter((c) => c.id !== confirmarExclusao.id));
      if (selecionadoId === confirmarExclusao.id) setSelecionadoId(null);
      setConfirmarExclusao(null);
    } catch (e) {
      setErro(e.message);
      setConfirmarExclusao(null);
    }
  }

  if (carregando) return <Carregando texto="Carregando clientes..." />;
  if (erro && clientes.length === 0) return <Erro mensagem={erro} />;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-app-secundario">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            aria-label="Buscar clientes"
            className={classeInput}
          />
          <BotaoPrimario onClick={() => setEditando({})}>+ Novo cliente</BotaoPrimario>
        </div>
      </header>

      {erro && <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-card border border-app-borda bg-white shadow-card">
          {filtrados.length === 0 ? (
            <div className="p-6">
              <Vazio
                titulo={clientes.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
                descricao={clientes.length === 0 ? "Cadastre o primeiro cliente." : "Tente outro termo de busca."}
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Telefone</th>
                  <th className="px-4 py-2.5 font-medium">E-mail</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => setSelecionadoId(cliente.id)}
                    className={`cursor-pointer border-b border-app-borda/60 transition-colors hover:bg-app-fundo ${selecionadoId === cliente.id ? "bg-primario-suave/60" : ""
                      }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-app-texto">{cliente.nome}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{cliente.telefone || "—"}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{cliente.email || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${cliente.nome}`}
                          onClick={(e) => { e.stopPropagation(); setEditando(cliente); }}
                          className="rounded p-1.5 text-app-secundario hover:bg-app-fundo hover:text-app-texto"
                        >
                          <IconeEditar tamanho={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${cliente.nome}`}
                          onClick={(e) => { e.stopPropagation(); setConfirmarExclusao(cliente); }}
                          className="rounded p-1.5 text-app-secundario hover:bg-red-50 hover:text-red-700"
                        >
                          <IconeExcluir tamanho={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-app-borda px-4 py-2 text-xs text-app-secundario">
            Mostrando {filtrados.length} de {clientes.length} cliente(s)
          </div>
        </section>

        {/* painel lateral de detalhe */}
        <aside className="rounded-card border border-app-borda bg-white p-4 shadow-card">
          {editando ? (
            <>
              <h2 className="mb-3 font-semibold">{editando.id ? "Editar cliente" : "Novo cliente"}</h2>
              <FormularioCliente
                inicial={editando}
                salvando={salvando}
                aoSalvar={salvar}
                aoCancelar={() => setEditando(null)}
              />
            </>
          ) : selecionado ? (
            <>
              <h2 className="font-semibold">{selecionado.nome}</h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div><dt className="text-xs text-app-secundario">Telefone</dt><dd>{selecionado.telefone || "—"}</dd></div>
                <div><dt className="text-xs text-app-secundario">E-mail</dt><dd>{selecionado.email || "—"}</dd></div>
                <div><dt className="text-xs text-app-secundario">Endereço</dt><dd>{selecionado.endereco || "—"}</dd></div>
              </dl>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-app-secundario">
                Projetos ({projetosDoSelecionado.length})
              </h3>
              {projetosDoSelecionado.length === 0 ? (
                <p className="mt-2 text-sm text-app-secundario">Nenhum projeto deste cliente.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {projetosDoSelecionado.map((p) => (
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
                onClick={() => history.push(`/projetos?cliente=${selecionado.id}`)}
                className="mt-4 text-sm font-medium text-primario hover:text-primario-escuro"
              >
                Ver todos os projetos →
              </button>
            </>
          ) : (
            <Vazio titulo="Selecione um cliente" descricao="Clique em uma linha da tabela para ver os detalhes." />
          )}
        </aside>
      </div>

      {/* confirmação de exclusão */}
      {confirmarExclusao && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-flutuante">
            <h2 className="text-lg font-semibold">Excluir cliente</h2>
            <p className="mt-2 text-sm text-app-secundario">
              Excluir <strong>{confirmarExclusao.nome}</strong>? Os projetos dele continuam salvos.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setConfirmarExclusao(null)}>Cancelar</BotaoSecundario>
              <button
                type="button"
                onClick={excluir}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
