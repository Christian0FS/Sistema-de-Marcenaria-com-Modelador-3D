// Cards de métrica e resumo executivo do orçamento (Fases 2.1 e 3.1).
import React from "react";
import { formatarBRL, distribuirPercentuais } from "../lib/formato";
import BarraCustos from "./BarraCustos";
import { PilulaStatusOrcamento, BotaoPrimario, BotaoSecundario } from "./ui";

export function CardMetrica({ rotulo, valor, legenda, destaque = false }) {
  return (
    <div className={`rounded-card border p-4 ${destaque ? "border-primario bg-primario-suave/40" : "border-app-borda bg-white"}`}>
      <p className="text-xs text-app-secundario">{rotulo}</p>
      <p className={`mt-1 font-semibold tabular-nums ${destaque ? "text-xl text-primario-escuro" : "text-lg text-app-texto"}`}>
        {valor}
      </p>
      {legenda && <p className="mt-0.5 text-xs text-app-secundario">{legenda}</p>}
    </div>
  );
}

/**
 * Resumo executivo a partir do orçamento salvo (detalhe = precificacao.py).
 * Nunca soma no frontend: exibe os campos do backend.
 */
export default function ResumoOrcamento({
  orcamento,
  nomeProjeto,
  nomeCliente,
  aoVerCompleto,
  aoGerarContrato,
}) {
  const detalhe = orcamento?.detalhe;
  if (!detalhe) {
    return (
      <div className="rounded-card border border-app-borda bg-white p-6 text-center shadow-card">
        <p className="text-sm text-app-secundario">
          Este projeto ainda não tem orçamento calculado. Recalcule na tela do orçamento.
        </p>
      </div>
    );
  }

  const custo = Number(detalhe.custoTotal) || 0;
  const preco = Number(orcamento.precoVenda) || 0;
  const margemValor = Math.max(preco - custo, 0);
  const margemPercentual = Number(orcamento.margemPercentual) || 0;

  const distribuicao = distribuirPercentuais([
    { rotulo: "MDF", valor: Number(detalhe.custoMdf) || 0 },
    { rotulo: "Fitas de borda", valor: Number(detalhe.custoFitas) || 0 },
    { rotulo: "Ferragens", valor: Number(detalhe.custoFerragens) || 0 },
    { rotulo: "Margem/outros", valor: margemValor },
  ]);

  return (
    <div className="rounded-card border border-app-borda bg-white p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-app-texto">{nomeProjeto}</h3>
          <p className="text-xs text-app-secundario">
            {nomeCliente || "Sem cliente"} ·{" "}
            {orcamento.calculadoEm
              ? `calculado em ${new Date(orcamento.calculadoEm).toLocaleString("pt-BR")}`
              : "sem cálculo"}
          </p>
        </div>
        <PilulaStatusOrcamento status={orcamento.statusOrcamento} />
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <CardMetrica rotulo="Custo de fabricação" valor={formatarBRL(custo)} legenda="MDF + fitas + ferragens + perda" />
        <CardMetrica rotulo="Margem" valor={formatarBRL(margemValor)} legenda={`${margemPercentual}% configurado`} />
        <CardMetrica rotulo="Preço de venda" valor={formatarBRL(preco)} destaque legenda="Sugerido pelo cálculo" />
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-app-secundario">Distribuição dos custos</p>
        <BarraCustos itens={distribuicao} compacta />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {aoVerCompleto && (
          <BotaoPrimario onClick={aoVerCompleto}>Ver orçamento completo</BotaoPrimario>
        )}
        {aoGerarContrato && (
          <BotaoSecundario onClick={aoGerarContrato}>Gerar contrato (PDF)</BotaoSecundario>
        )}
      </div>
    </div>
  );
}
