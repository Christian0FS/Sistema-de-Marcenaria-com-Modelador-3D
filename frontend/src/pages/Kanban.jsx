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
import { api } from "../lib/api";

const COLUNAS = [
    { id: "lead", titulo: "Leads" },
    { id: "orcamento", titulo: "Orçamentos" },
    { id: "producao", titulo: "Produção" },
    { id: "montagem", titulo: "Montagem" },
];

function CardProjeto({ projeto }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: projeto.id,
  });

  const style = transform 
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        opacity: isDragging ? 0.4 : 1,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white rounded-lg shadow p-3 mb-2 cursor-grab active:cursor-grabbing border border-gray-200">
            <p className="font-medium text-gray-800">{projeto.nome}</p>
            <p className="text-xs text-gray-500 mt-1">{projeto.modulos?.length || 0} móvel(is)</p>
        </div>
    );
}

function Coluna({ coluna, projetos }) {
    const { setNodeRef, isOver } = useDroppable({id: coluna.id});

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
    const [projetos, setProjetos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);
    const [ativoId, setAtivoId] = useState(null);

    const sensors = useSensors(useSensor (PointerSensor));
    
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
      <h1 className="text-xl font-bold mb-4">Kanban de Projetos</h1>
      {erro && (
        <div className="bg-red-100 text-red-700 rounded p-2 mb-3 text-sm">{erro}</div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
          {projetoAtivo ? <CardProjeto projeto={projetoAtivo} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}