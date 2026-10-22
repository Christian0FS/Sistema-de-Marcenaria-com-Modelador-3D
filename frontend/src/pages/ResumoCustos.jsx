// Aba "Resumo de custos de materiais" do orçamento (Fase 4).
// Todos os números vêm do detalhe salvo pelo backend (precificacao.py) — nada calculado aqui.
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useOrcamento } from "../lib/useOrcamento";
import { formatarBRL, distribuirPercentuais, formatarPercentual } from "../lib/formato";
import {
  Carregando, Erro, Vazio, BotaoPrimario, classeInput,
} from "../components/ui";
import BarraCustos from "../components/BarraCustos";
import { CardMetrica } from "../components/ResumoOrcamento";

export default function ResumoCustos() {
  const { projetoId } = useParams();
  const history = useHistory();
  const { carregando, erro, orcamento } = useOrcamento(projetoId);
  const [chapas, setChapas] = useState([]);
  const [projeto, setProjeto] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.buscarProjeto(projetoId), api.listarChapas()])
      .then(([p, cs]) => { if (ativo) { setProjeto(p); setChapas(cs); } })
      .catch(() => { });
    return () => { ativo = false; };
  }, [projetoId]);

  if (carregando) return <Carregando texto="Carregando resumo de custos..." />;
  if (erro) return <Erro mensagem={erro} />;

  const detalhe = orcamento?.detalhe;
  if (!detalhe) {
    return (
      <Vazio titulo="Orçamento não calculado" descricao="Volte ao resumo executivo e recalcule o orçamento.">
        <BotaoPrimario onClick={() => history.push(`/projetos/${projetoId}/orcamento`)}>
          Voltar ao orçamento
        </BotaoPrimario>
      </Vazio>
    );
  }

  const custoMdf = Number(detalhe.custoMdf) || 0;
  const custoFitas = Number(detalhe.custoFitas) || 0;
  const custoFerragens = Number(detalhe.custoFerragens) || 0;
  const custoPerda = Number(detalhe.custoPerda) || 0;
  const custoTotal = Number(detalhe.custoTotal) || 0;
  const preco = Number(orcamento.precoVenda) || 0;
  const margemValor = Math.max(preco - custoTotal, 0);

  const distribuicao = distribuirPercentuais([
    { rotulo: "MDF", valor: custoMdf },
    { rotulo: "Fitas de borda", valor: custoFitas },
    { rotulo: "Ferragens", valor: custoFerragens },
    { rotulo: "Margem/outros", valor: margemValor + custoPerda },
  ]);

  // --- 4.1 chapas: agrupa folhas do plano por chapaId ---
  const folhasPorChapa = {};
  for (const folha of detalhe.planoCorte?.chapas || []) {
    const grupo = (folhasPorChapa[folha.chapaId] ||= { folhas: 0, areaPecas: 0, areaChapas: 0 });
    grupo.folhas += 1;
    grupo.areaPecas += folha.areaPecasMm2 || 0;
    grupo.areaChapas += folha.areaChapaMm2 || 0;
  }
  const indiceChapas = new Map((chapas || []).map((c) => [c.id, c]));
  const linhasChapas = Object.entries(folhasPorChapa).map(([chapaId, g]) => {
    const chapa = indiceChapas.get(chapaId);
    const areaUtilizadaM2 = g.areaPecas / 1_000_000;
    const areaTotalM2 = g.areaChapas / 1_000_000;
    const custo = chapa ? areaTotalM2 * Number(chapa.preco_m2 || 0) : 0;
    const sobra = areaTotalM2 > 0 ? 100 - (areaUtilizadaM2 / areaTotalM2) * 100 : 0;
    return { chapaId, chapa, folhas: g.folhas, areaUtilizadaM2, areaTotalM2, sobra, custo };
  });
  const totalChapas = linhasChapas.reduce((s, l) => s + l.folhas, 0);
  const custoMdfCalculado = linhasChapas.reduce((s, l) => s + l.custo, 0);

  const itensFita = detalhe.fitas || [];
  const itensFerragens = detalhe.ferragens || [];
  const totalMetrosFita = itensFita.reduce((s, f) => s + (Number(f.comprimentoMetros) || 0), 0);
  const quantidadeModulos = projeto?.modulos?.length || 0;
  const custoPorModulo = quantidadeModulos > 0 ? custoTotal / quantidadeModulos : null;
  const aproveitamentoMedio = detalhe.planoCorte?.aproveitamentoPercent ?? null;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-app-borda">
        <button
          type="button"
          onClick={() => history.push(`/projetos/${projetoId}/orcamento`)}
          className="rounded-t-lg px-4 py-2 text-sm font-medium text-app-secundario hover:bg-app-fundo"
        >
          Resumo executivo
        </button>
        <button type="button" className="border-b-2 border-primario bg-white px-4 py-2 text-sm font-medium text-primario">
          Resumo de custos
        </button>
      </div>

      {/* 4.4 indicadores */}
      <div className="grid gap-3 sm:grid-cols-3">
        <CardMetrica rotulo="Custo por módulo (média)" valor={custoPorModulo != null ? formatarBRL(custoPorModulo) : "—"} />
        <CardMetrica rotulo="Aproveitamento médio das chapas" valor={aproveitamentoMedio != null ? `${aproveitamentoMedio}%` : "—"} />
        <CardMetrica rotulo="Custo total do projeto" valor={formatarBRL(custoTotal)} destaque />
      </div>

      <section className="mt-4 rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="mb-3 font-semibold">Distribuição dos custos</h2>
        <BarraCustos itens={distribuicao} />
      </section>

      {/* 4.1 chapas de MDF */}
      <section className="mt-4 rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="mb-3 font-semibold">Chapas de MDF</h2>
        {linhasChapas.length === 0 ? (
          <p className="text-sm text-app-secundario">Nenhuma chapa alocada. Vincule chapas às peças no editor.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-borda text-xs uppercase text-app-secundario">
                <th className="py-2 pr-3 font-medium">Chapa</th>
                <th className="py-2 pr-3 font-medium">Cor</th>
                <th className="py-2 pr-3 font-medium">Chapas inteiras</th>
                <th className="py-2 pr-3 font-medium">Área usada</th>
                <th className="py-2 pr-3 font-medium">% sobra</th>
                <th className="py-2 pr-3 font-medium">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {linhasChapas.map((linha) => (
                <tr key={linha.chapaId} className="border-b border-app-borda/60">
                  <td className="py-2 pr-3">
                    {linha.chapa ? `${linha.chapa.nome} · ${linha.chapa.espessura_mm} mm` : <span className="text-amber-700">Sem chapa definida</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded border border-app-borda" style={{ backgroundColor: linha.chapa?.cor || "#ccc" }} aria-hidden="true" />
                      <code className="text-xs text-app-secundario">{linha.chapa?.cor || "—"}</code>
                    </span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{linha.folhas}</td>
                  <td className="py-2 pr-3 tabular-nums">{linha.areaUtilizadaM2.toFixed(2)} m²</td>
                  <td className="py-2 pr-3 tabular-nums">{linha.sobra.toFixed(1)}%</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(linha.custo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-app-borda font-medium">
                <td className="py-2 pr-3" colSpan={2}>Total: {totalChapas} chapa(s)</td>
                <td colSpan={3} />
                <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(custoMdfCalculado)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        <p className="mt-2 text-xs text-app-secundario">
          O preço compõe o custo das chapas INTEIRAS compradas (o que se compra), não só a área usada.
        </p>
      </section>

      {/* 4.2 fitas */}
      <section className="mt-4 rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="mb-3 font-semibold">Fitas de borda</h2>
        {itensFita.length === 0 ? (
          <p className="text-sm text-app-secundario">Nenhuma fita vinculada às arestas.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-borda text-xs uppercase text-app-secundario">
                <th className="py-2 pr-3 font-medium">Fita</th>
                <th className="py-2 pr-3 font-medium">Metros</th>
                <th className="py-2 pr-3 font-medium">Preço/m</th>
                <th className="py-2 pr-3 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {itensFita.map((f) => (
                <tr key={f.fitaId} className="border-b border-app-borda/60">
                  <td className="py-2 pr-3">{f.nome}</td>
                  <td className="py-2 pr-3 tabular-nums">{(Number(f.comprimentoMetros) || 0).toFixed(2)} m</td>
                  <td className="py-2 pr-3 tabular-nums">{formatarBRL(f.precoMetro)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(f.custo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-app-borda font-medium">
                <td className="py-2 pr-3">Total: {totalMetrosFita.toFixed(2)} m</td>
                <td colSpan={2} />
                <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(custoFitas)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {/* 4.3 ferragens */}
      <section className="mt-4 rounded-card border border-app-borda bg-white p-4 shadow-card">
        <h2 className="mb-3 font-semibold">Ferragens</h2>
        {itensFerragens.length === 0 ? (
          <p className="text-sm text-app-secundario">Nenhuma ferragem vinculada aos módulos.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app-borda text-xs uppercase text-app-secundario">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Qtd</th>
                <th className="py-2 pr-3 font-medium">Preço un.</th>
                <th className="py-2 pr-3 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {itensFerragens.map((f) => (
                <tr key={f.ferragemId} className="border-b border-app-borda/60">
                  <td className="py-2 pr-3">{f.nome}</td>
                  <td className="py-2 pr-3 text-app-secundario">{f.tipo}</td>
                  <td className="py-2 pr-3 tabular-nums">{f.quantidade}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatarBRL(f.precoUnitario)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(f.custo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-app-borda font-medium">
                <td className="py-2 pr-3" colSpan={4}>Total</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatarBRL(custoFerragens)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
