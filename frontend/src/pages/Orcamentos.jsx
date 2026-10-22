// Tela de orçamentos: tabela de todos os projetos do usuário (Fase 3.2).
import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { api } from "../lib/api";
import { formatarBRL } from "../lib/formato";
import {
  Carregando, Erro, Vazio, BotaoPrimario, classeInput, PilulaStatusOrcamento,
} from "../components/ui";
import { IconeExcluir, IconeUsuario } from "../components/icone";

const STATUS = ["rascunho", "enviado", "aprovado", "em_producao", "recusado"];

export default function Orcamentos() {
  const history = useHistory();
  const [orcamentos, setOrcamentos] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [ordem, setOrdem] = useState({ coluna: "criadoEm", asc: false });
  const [recalculando, setRecalculando] = useState(null);

  useEffect(() => {
    api.listarOrcamentos()
      .then(setOrcamentos)
      .catch((e) => setErro(e.message));
  }, []);

  const filtrados = useMemo(() => {
    const lista = orcamentos || [];
    const t = busca.trim().toLowerCase();
    const base = lista.filter((o) => {
      const casaBusca = !t ||
        (o.projetoNome || "").toLowerCase().includes(t) ||
        (o.clienteNome || "").toLowerCase().includes(t);
      const casaStatus = !filtroStatus || o.statusOrcamento === filtroStatus;
      return casaBusca && casaStatus;
    });
    const dir = ordem.asc ? 1 : -1;
    return [...base].sort((a, b) => {
      const va = a[ordem.coluna] ?? "";
      const vb = b[ordem.coluna] ?? "";
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [orcamentos, busca, filtroStatus, ordem]);

  function alternarOrdem(coluna) {
    setOrdem((atual) => ({ coluna, asc: atual.coluna === coluna ? !atual.asc : true }));
  }

  function cabecalho(coluna, rotulo) {
    const seta = ordem.coluna === coluna ? (ordem.asc ? " ↑" : " ↓") : "";
    return (
      <th className="px-4 py-2.5 font-medium">
        <button type="button" onClick={() => alternarOrdem(coluna)} className="hover:text-app-texto">
          {rotulo}{seta}
        </button>
      </th>
    );
  }

  async function recalcular(o) {
    // o recálculo completo depende do cache de produção por projeto; aqui
    // direcionamos para a tela do orçamento, que tem o fluxo completo
    history.push(`/projetos/${o.projetoId}/orcamento`);
  }

  if (erro) return <Erro mensagem={erro} />;
  if (orcamentos === null) return <Carregando texto="Carregando orçamentos..." />;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-app-secundario">{filtrados.length} projeto(s) com orçamento</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar projeto ou cliente..." aria-label="Buscar orçamentos"
            className={classeInput}
          />
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} aria-label="Filtrar por status" className={classeInput}>
            <option value="">Todos os status</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>{({ rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", em_producao: "Em produção", recusado: "Recusado" })[s]}</option>
            ))}
          </select>
        </div>
      </header>

      {filtrados.length === 0 ? (
        <Vazio
          titulo={orcamentos.length === 0 ? "Nenhum orçamento ainda" : "Nenhum orçamento encontrado"}
          descricao={orcamentos.length === 0 ? "Abra um projeto e calcule o orçamento para vê-lo aqui." : "Ajuste a busca ou o filtro."}
        >
          <BotaoPrimario onClick={() => history.push("/")}>Ir ao painel</BotaoPrimario>
        </Vazio>
      ) : (
        <section className="overflow-hidden rounded-card border border-app-borda bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  {cabecalho("projetoNome", "Projeto")}
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Módulos</th>
                  {cabecalho("calculadoEm", "Última atualização")}
                  {cabecalho("custoTotal", "Custo estimado")}
                  {cabecalho("precoVenda", "Preço de venda")}
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((o) => {
                  const desatualizado = Boolean(o.desatualizado);
                  return (
                    <tr
                      key={o.projetoId}
                      onClick={() => history.push(`/projetos/${o.projetoId}/orcamento`)}
                      className="cursor-pointer border-b border-app-borda/60 transition-colors hover:bg-app-fundo"
                    >
                      <td className="px-4 py-2.5 font-medium text-app-texto">
                        {o.projetoNome}
                        {desatualizado && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            Preço desatualizado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-app-secundario">
                        <span className="flex items-center gap-1.5">
                          <IconeUsuario tamanho={14} />{o.clienteNome || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-app-secundario">{o.quantidadeModulos}</td>
                      <td className="px-4 py-2.5 text-app-secundario">
                        {o.calculadoEm ? new Date(o.calculadoEm).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatarBRL(o.custoTotal)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-primario-escuro">
                        {formatarBRL(o.precoVenda)}
                      </td>
                      <td className="px-4 py-2.5"><PilulaStatusOrcamento status={o.statusOrcamento} /></td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); history.push(`/projetos/${o.projetoId}/orcamento`); }}
                          className="rounded p-1.5 text-app-secundario hover:bg-app-fundo hover:text-app-texto"
                          aria-label={`Abrir orçamento de ${o.projetoNome}`}
                          title="Abrir detalhe"
                        >
                          <IconeExcluir tamanho={0} />
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-app-borda px-4 py-2 text-xs text-app-secundario">
            Mostrando 1 a {filtrados.length} de {filtrados.length} orçamento(s)
          </div>
        </section>
      )}
    </div>
  );
}
