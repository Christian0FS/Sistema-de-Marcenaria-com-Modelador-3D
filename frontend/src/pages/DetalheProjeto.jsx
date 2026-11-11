// Detalhe do projeto: cabeçalho, ações ordenadas pelo fluxo e lista de módulos.
import React, { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useModuloStore } from "../store/moduloStore";
import {
  Carregando, Erro, Vazio, BotaoPrimario, BotaoSecundario, BotaoPerigo,
  BotaoFantasma, PilulaStatus, classeInput,
} from "../components/ui";
import { IconeEditar, IconeExcluir } from "../components/icone";

export default function DetalheProjeto() {
  const { projetoId } = useParams();
  const history = useHistory();
  const setProjetoId = useModuloStore((state) => state.setProjetoId);
  const [projeto, setProjeto] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [moduloParaExcluir, setModuloParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    setProjetoId(projetoId);
    let ativo = true;

    Promise.all([api.buscarProjeto(projetoId), api.listarClientes()])
      .then(([dados, cs]) => {
        if (!ativo) return;
        setProjeto(dados);
        setCliente(cs.find((c) => c.id === dados.cliente_id) || null);
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

  if (carregando) return <Carregando texto="Carregando projeto..." />;

  if (erro || !projeto) {
    return <Erro mensagem={erro || "Projeto não encontrado."} />;
  }

  const modulos = projeto.modulos || [];

  return (
    <div className="mx-auto max-w-4xl">
      {/* cabeçalho (Fase 1.4) */}
      <header className="mb-5">
        <Link to="/kanban" className="text-sm font-medium text-primario hover:text-primario-escuro">
          ← Kanban
        </Link>
        <div className="mt-2 flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-app-texto">{projeto.nome}</h1>
          <PilulaStatus status={projeto.status} />
        </div>
        <p className="mt-1 text-sm text-app-secundario">
          {cliente ? cliente.nome : "Sem cliente"} · {modulos.length} móvel(is)
        </p>
      </header>

      {/* ações agrupadas pelo fluxo: módulos → produção → orçamento → contrato */}
      <div className="mb-5 flex-wrap gap-2">
        <BotaoPrimario onClick={() => history.push(`/editor/${projeto.id}`)}>
          + Novo módulo
        </BotaoPrimario>
        <BotaoSecundario onClick={() => history.push(`/projetos/${projeto.id}/producao`)}>
          Produção
        </BotaoSecundario>
        <BotaoSecundario onClick={() => history.push(`/projetos/${projeto.id}/orcamento`)}>
          Orçamento
        </BotaoSecundario>
        <BotaoSecundario onClick={() => history.push(`/projetos/${projeto.id}/contrato`)}>
          Contrato
        </BotaoSecundario>
        <BotaoFantasma onClick={() => history.push(`/projetos/${projeto.id}/cena`)}>
          Ver em cenário
        </BotaoFantasma>
        <BotaoFantasma onClick={() => history.push("/biblioteca")}>
          Biblioteca
        </BotaoFantasma>
      </div>

      {erro && <div className="mb-4"><Erro mensagem={erro} /></div>}

      {modulos.length === 0 ? (
        <Vazio
          titulo="Este projeto ainda não tem móveis"
          descricao="Crie o primeiro módulo para começar o projeto 3D."
        >
          <BotaoPrimario onClick={() => history.push(`/editor/${projeto.id}`)}>
            + Novo módulo
          </BotaoPrimario>
        </Vazio>
      ) : (
        <section className="overflow-hidden rounded-card border-app-borda bg-white shadow-card">
          <ul className="divide-y divide-app-borda">
            {modulos.map((modulo) => (
              <li key={modulo.modulo_id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primario-suave text-xs text-primario-escuro">
                  3D
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-app-texto">{modulo.nome || "Móvel sem nome"}</p>
                  <p className="mt-0.5 text-xs text-app-secundario">
                    {modulo.dimensoes
                      ? `${modulo.dimensoes.largura} × ${modulo.dimensoes.altura} × ${modulo.dimensoes.profundidade} mm`
                      : "Dimensões não informadas"}
                  </p>
                </div>
                <BotaoFantasma
                  onClick={() => history.push(`/editor/${projeto.id}/${modulo.modulo_id}`)}
                  aria-label={`Abrir ${modulo.nome}`}
                >
                  Abrir
                </BotaoFantasma>
                <button
                  type="button"
                  aria-label={`Excluir ${modulo.nome}`}
                  onClick={() => setModuloParaExcluir(modulo)}
                  className="rounded-lg p-2 text-app-secundario transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                >
                  <IconeExcluir tamanho={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* confirmação de exclusão de módulo */}
      {moduloParaExcluir && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-flutuante">
            <h2 className="text-lg font-semibold text-app-texto">Excluir móvel</h2>
            <p className="mt-2 text-sm text-app-secundario">
              Excluir <strong className="text-app-texto">{moduloParaExcluir.nome || "Móvel sem nome"}</strong>?
              A peça sai do plano de corte e do orçamento. Esta ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setModuloParaExcluir(null)}>Cancelar</BotaoSecundario>
              <BotaoPerigo onClick={confirmarExclusaoModulo} disabled={excluindo}>
                {excluindo ? "Excluindo..." : "Excluir"}
              </BotaoPerigo>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
