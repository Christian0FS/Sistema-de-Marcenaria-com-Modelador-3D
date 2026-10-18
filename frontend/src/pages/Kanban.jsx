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

const COLUNAS = [
    { id: "lead", titulo: "Leads" },
    { id: "orcamento", titulo: "Orçamentos" },
    { id: "producao", titulo: "Produção" },
    { id: "montagem", titulo: "Montagem" },
];

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
      className={`bg-white rounded-lg shadow p-3 mb-2 border border-gray-200 ${isDragging ? "opacity-40" : ""}`}
    >
      <Link to={destino} className="block rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
        <p className="font-medium text-gray-800">{projeto.nome}</p>
        <p className="text-xs text-gray-500 mt-1">{projeto.modulos?.length || 0} móvel(is)</p>
        <span className="inline-block mt-3 text-sm font-medium text-blue-700 hover:text-blue-900">
          Abrir projeto <span aria-hidden="true">&rarr;</span>
        </span>
      </Link>
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Mover projeto ${projeto.nome}`}
        title="Arraste para mudar de etapa"
        className="mt-2 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
      >
        Mover
      </button>
    </article>
  );
}

function CardProjetoOverlay({ projeto }) {
  return (
    <article className="bg-white rounded-lg shadow p-3 mb-2 border border-gray-200">
      <Link to={`/projetos/${projeto.id}`} className="block rounded">
        <p className="font-medium text-gray-800">{projeto.nome}</p>
        <p className="text-xs text-gray-500 mt-1">{projeto.modulos?.length || 0} móvel(is)</p>
      </Link>
    </article>
  );
}

function Coluna({ coluna, projetos }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });

    return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] rounded-xl p-3 transition-colors ${
        isOver ? "bg-blue-50" : "bg-gray-100"
      }`}
    >
      <h2 className="font-semibold text-gray-700 mb-3 flex items-center justify-between">
        {coluna.titulo}
        <span className="text-xs bg-gray-300 text-gray-700 rounded-full px-2 py-0.5">
          {projetos.length}
        </span>
      </h2>
      <div className="min-h-[100px]">
        {projetos.map((p) => (
          <CardProjeto key={p.id} projeto={p} />
        ))}
      </div>
    </div>
  );
}

export default function Kanban(){
  const history = useHistory();
    const [projetos, setProjetos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [ativoId, setAtivoId] = useState(null);

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

    if (carregando) return <p className="p-4">Carregando projetos...</p>;

    const projetoAtivo = projetos.find((p) => p.id === ativoId);

  return (
    <div className="p-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Kanban de Projetos</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("nomeUsuario");
              history.replace("/login");
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>
      {erro && (
        <div className="bg-red-100 text-red-700 rounded p-2 mb-3 text-sm">{erro}</div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto">
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
    </div>
  );
}