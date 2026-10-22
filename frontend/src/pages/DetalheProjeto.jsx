import React, { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useModuloStore } from "../store/moduloStore";

export default function DetalheProjeto() {
  const { projetoId } = useParams();
  const history = useHistory();
  const setProjetoId = useModuloStore((state) => state.setProjetoId);
  const [projeto, setProjeto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setProjetoId(projetoId);
    let ativo = true;

    api.buscarProjeto(projetoId)
      .then((dados) => {
        if (ativo) setProjeto(dados);
      })
      .catch((erroRequisicao) => {
        if (ativo) setErro(erroRequisicao.message || "Não foi possível carregar o projeto.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [projetoId, setProjetoId]);

  const [moduloParaExcluir, setModuloParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  async function confirmarExclusaoModulo() {
    if (!moduloParaExcluir) return;
    setExcluindo(true);
    setErro("");
    try {
      await api.excluirModulo(projetoId, moduloParaExcluir.modulo_id);
      setProjeto((atual) => ({
        ...atual,
        modulos: (atual.modulos || []).filter((m) => m.modulo_id !== moduloParaExcluir.modulo_id),
      }));
      setModuloParaExcluir(null);
    } catch (e) {
      setErro(e.message || "Não foi possível excluir o módulo.");
      setModuloParaExcluir(null);
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) return <p className="p-4 text-sm text-gray-500">Carregando projeto...</p>;

  if (erro || !projeto) {
    return (
      <main className="p-4">
        <p role="alert" className="mb-3 text-sm text-red-700">{erro || "Projeto não encontrado."}</p>
        <Link to="/" className="text-sm font-medium text-blue-700">Voltar ao Kanban</Link>
      </main>
    );
  }

  const modulos = projeto.modulos || [];

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/" className="text-sm font-medium text-blue-700 hover:text-blue-900">← Kanban</Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">{projeto.nome}</h1>
          <p className="mt-1 text-sm text-gray-500">{modulos.length} móvel(is) no projeto</p>
        </div>
        <button
          type="button"
          onClick={() => history.push(`/editor/${projeto.id}`)}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          + Novo módulo
        </button>
        <button
          type="button"
          onClick={() => history.push(`/projetos/${projeto.id}/producao`)}
          className="rounded border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Plano de corte e orçamento
        </button>
        <button
          type="button"
          onClick={() => history.push(`/projetos/${projeto.id}/cena`)}
          className="rounded border border-violet-700 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50"
        >
          Ver em cenário
        </button>
        <button
          type="button"
          onClick={() => history.push(`/projetos/${projeto.id}/contrato`)}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Contrato e assinatura
        </button>
      </div>
      <div className="mb-4">
        <Link to="/biblioteca" className="text-sm font-medium text-blue-700 hover:text-blue-900">
          Biblioteca de módulos
        </Link>
      </div>

      {erro && <p role="alert" className="mb-4 text-sm text-red-700">{erro}</p>}

      {modulos.length === 0 ? (
        <p className="border-t border-gray-200 py-5 text-sm text-gray-500">Este projeto ainda não tem móveis.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border-y border-gray-200">
          {modulos.map((modulo) => (
            <li key={modulo.modulo_id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{modulo.nome || "Móvel sem nome"}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {modulo.dimensoes
                    ? `${modulo.dimensoes.largura} × ${modulo.dimensoes.altura} × ${modulo.dimensoes.profundidade} mm`
                    : "Dimensões não informadas"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => history.push(`/editor/${projeto.id}/${modulo.modulo_id}`)}
                className="shrink-0 rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Abrir
              </button>
              <button
                type="button"
                onClick={() => setModuloParaExcluir(modulo)}
                className="shrink-0 rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* confirmação de exclusão de módulo (Fase 3) */}
      {moduloParaExcluir && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-flutuante">
            <h2 className="text-lg font-semibold">Excluir móvel</h2>
            <p className="mt-2 text-sm text-app-secundario">
              Excluir <strong>{moduloParaExcluir.nome || "Móvel sem nome"}</strong>?
              A peça sai do plano de corte e do orçamento. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModuloParaExcluir(null)}
                className="rounded-lg border border-app-borda bg-white px-4 py-2 text-sm font-medium text-app-texto hover:bg-app-fundo"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusaoModulo}
                disabled={excluindo}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {excluindo ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
