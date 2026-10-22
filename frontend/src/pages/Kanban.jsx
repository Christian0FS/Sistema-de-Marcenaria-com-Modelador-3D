import React, { useEffect, useState } from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
} from "@dnd-kit/core";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Link, useHistory } from "react-router-dom";
import { api } from "../lib/api";
import { PilulaStatus, Vazio, Carregando, BotaoPrimario, BotaoSecundario, classeInput } from "../components/ui";
import { IconeUsuario } from "../components/icone";

const COLUNAS = [
    { id: "lead", titulo: "Leads" },
    { id: "orcamento", titulo: "Orçamentos" },
    { id: "producao", titulo: "Produção" },
    { id: "montagem", titulo: "Montagem" },
];

// barrinha colorida à esquerda do título da coluna (Fase 1)
const COR_BARRA = {
    lead: "bg-gray-400",
    orcamento: "bg-sky-500",
    producao: "bg-amber-500",
    montagem: "bg-emerald-500",
};

function CardProjeto({ projeto }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: projeto.id,
  });
  const destino = `/projetos/${projeto.id}`;
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`mb-2 rounded-card border border-app-borda bg-white p-3 shadow-card ${isDragging ? "opacity-40" : ""}`}
    >
      <Link to={destino} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primario">
        <p className="font-medium text-app-texto">{projeto.nome}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-app-secundario">
            <IconeUsuario tamanho={14} />
            {projeto.modulos?.length || 0} móveis
          </span>
          <PilulaStatus status={projeto.status} />
        </div>
      </Link>
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Mover projeto ${projeto.nome}`}
        title="Arraste para mudar de etapa"
        className="mt-2 rounded border border-app-borda px-2 py-1 text-xs text-app-secundario cursor-grab hover:bg-app-fundo active:cursor-grabbing"
      >
        Mover
      </button>
    </article>
  );
}

function CardProjetoOverlay({ projeto }) {
  return (
    <article className="mb-2 rounded-card border border-app-borda bg-white p-3 shadow-flutuante">
      <Link to={`/projetos/${projeto.id}`} className="block rounded-lg">
        <p className="font-medium text-app-texto">{projeto.nome}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-app-secundario">
            <IconeUsuario tamanho={14} />
            {projeto.modulos?.length || 0} móveis
          </span>
          <PilulaStatus status={projeto.status} />
        </div>
      </Link>
    </article>
  );
}

function Coluna({ coluna, projetos }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });

    return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] rounded-card border border-app-borda bg-white p-3 transition-colors ${
        isOver ? "bg-primario-suave" : ""
      }`}
    >
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-app-texto">
        <span className={`h-4 w-1 rounded-full ${COR_BARRA[coluna.id]}`} aria-hidden="true" />
        {coluna.titulo}
        <span className="ml-auto rounded-full bg-app-fundo px-2 py-0.5 text-xs text-app-secundario">
          {projetos.length}
        </span>
      </h2>
      <div className="min-h-[80px]">
        {projetos.map((p) => (
          <CardProjeto key={p.id} projeto={p} />
        ))}
        {projetos.length === 0 && (
          <p className="py-6 text-center text-xs text-app-secundario">Nenhum projeto aqui.</p>
        )}
      </div>
    </div>
  );
}

export default function Kanban() {
  const history = useHistory();
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [ativoId, setAtivoId] = useState(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    useEffect(() => {
        carregarProjetos();
    }, []);

    async function carregarProjetos() {
        setCarregando(true);
        try {
            const dados = await api.listarProjetos();
            setProjetos(dados);
            setErro(null);
        } catch (e) {
            setErro(e.message);
        } finally {
            setCarregando(false);
        }
    }

    function handleDragStart(event) {
        setAtivoId(event.active.id);
    }

    function handleDragCancel() {
      setAtivoId(null);
    }

    async function handleDragEnd(event) {
        const { active, over } = event;
        setAtivoId(null);
        if (!over) return;

        const novoStatus = over.id;
        const projeto = projetos.find((p) => p.id === active.id);
        if (!projeto || projeto.status === novoStatus) return;

        const anterior = projetos;
        setProjetos((prev) =>
            prev.map((p) => (p.id === projeto.id ? { ...p, status: novoStatus } : p))
        );
        try {
            await api.atualizarStatusProjeto(active.id, novoStatus);
        } catch (e) {
          setProjetos(anterior);
          setErro(`Falha ao mover: ${e.message}`);
        }
    }

    if (carregando) return <Carregando texto="Carregando projetos..." />;

    const projetoAtivo = projetos.find((p) => p.id === ativoId);

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Kanban de Projetos</h1>
          <p className="text-sm text-app-secundario">Arraste os cards para mudar a etapa.</p>
        </div>
        <BotaoPrimario onClick={() => setMostrarNovo(true)}>+ Novo projeto</BotaoPrimario>
      </header>
      {erro && (
        <div className="mb-3 rounded-card bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}
      {projetos.length === 0 ? (
        <Vazio titulo="Nenhum projeto ainda" descricao="Crie o primeiro projeto para começar a planejar os móveis.">
          <BotaoPrimario onClick={() => setMostrarNovo(true)}>+ Novo projeto</BotaoPrimario>
        </Vazio>
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map((coluna) => (
            <Coluna
              key={coluna.id}
              coluna={coluna}
              projetos={projetos.filter((p) => p.status === coluna.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {projetoAtivo ? <CardProjetoOverlay projeto={projetoAtivo} /> : null}
        </DragOverlay>
      </DndContext>
      )}
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

// Modal de novo projeto com opção de criar o cliente ali mesmo (Fase 2)
export function NovoProjetoModal({ aoFechar, aoCriar }) {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.listarClientes()
      .then((lista) => {
        setClientes(lista);
        if (lista.length) setClienteId(lista[0].id);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      let clienteFinal = clienteId;
      if (novoCliente.trim()) {
        const criado = await api.criarCliente({ nome: novoCliente.trim() });
        clienteFinal = criado.id;
      }
      if (!clienteFinal) throw new Error("Escolha um cliente ou crie um novo.");
      const projeto = await api.criarProjeto({ nome: nome.trim(), cliente_id: clienteFinal });
      aoCriar(projeto);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={salvar} className="w-full max-w-md rounded-card bg-white p-6 shadow-flutuante">
        <h2 className="text-lg font-semibold">Novo projeto</h2>
        {carregando ? (
          <p className="mt-4 text-sm text-app-secundario">Carregando clientes...</p>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-app-texto">
              Nome do projeto
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`mt-1 ${classeInput}`}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-app-texto">
              Cliente existente
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={Boolean(novoCliente.trim())}
                className={`mt-1 ${classeInput} disabled:opacity-50`}
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="mt-2 block text-sm font-medium text-app-texto">
              ...ou crie um cliente agora
              <input
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
                placeholder="Nome do novo cliente"
                className={`mt-1 ${classeInput}`}
              />
            </label>
            {erro && <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={aoFechar}>Cancelar</BotaoSecundario>
              <BotaoPrimario type="submit" disabled={salvando || !nome.trim()}>
                {salvando ? "Criando..." : "Criar projeto"}
              </BotaoPrimario>
            </div>
          </>
        )}
      </form>
    </div>
  );
}