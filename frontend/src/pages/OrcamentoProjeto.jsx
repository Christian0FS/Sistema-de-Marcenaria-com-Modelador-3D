// Tela de orçamento do projeto (Fases 3.1–3.5): resumo, margem, condições e ações.
import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useOrcamento } from "../lib/useOrcamento";
import { formatarBRL, formatarPercentual } from "../lib/formato";
import {
  Carregando, Erro, Vazio, BotaoPrimario, BotaoSecundario, classeInput,
  PilulaStatusOrcamento, CORES_STATUS_ORCAMENTO,
} from "../components/ui";
import ResumoOrcamento, { CardMetrica } from "../components/ResumoOrcamento";

const STATUS_OPCOES = ["rascunho", "enviado", "aprovado", "em_producao", "recusado"];
const FORMAS = [
  { id: "pix", nome: "PIX" },
  { id: "cartao", nome: "Cartão" },
  { id: "boleto", nome: "Boleto" },
  { id: "avista", nome: "À vista" },
];

export default function OrcamentoProjeto() {
  const { projetoId } = useParams();
  const history = useHistory();
  const { carregando, erro, orcamento, aplicar } = useOrcamento(projetoId);

  const [projeto, setProjeto] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [erroLocal, setErroLocal] = useState("");
  const [recalculando, setRecalculando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const [margem, setMargem] = useState(30);
  const [modeloMargem, setModeloMargem] = useState("markup_custo");
  const [desconto, setDesconto] = useState(0);
  const [entrada, setEntrada] = useState(0);
  const [parcelas, setParcelas] = useState(1);
  const [forma, setForma] = useState("pix");
  const [prazo, setPrazo] = useState(45);
  const [validade, setValidade] = useState(15);
  const [status, setStatus] = useState("rascunho");

  // carrega projeto + cliente para o cabeçalho
  useEffect(() => {
    let ativo = true;
    Promise.all([api.buscarProjeto(projetoId), api.listarClientes()])
      .then(([p, cs]) => {
        if (!ativo) return;
        setProjeto(p);
        setClientes(cs);
      })
      .catch((e) => setErroLocal(e.message));
    return () => { ativo = false; };
  }, [projetoId]);

  // sincroniza os campos quando o orçamento chega
  useEffect(() => {
    if (!orcamento) return;
    if (orcamento.margemPercentual != null) setMargem(orcamento.margemPercentual);
    if (orcamento.modeloMargem) setModeloMargem(orcamento.modeloMargem);
    if (orcamento.desconto != null) setDesconto(orcamento.desconto);
    if (orcamento.entrada != null) setEntrada(orcamento.entrada);
    if (orcamento.parcelas != null) setParcelas(orcamento.parcelas);
    if (orcamento.formaPagamento) setForma(orcamento.formaPagamento);
    if (orcamento.prazoEntregaDias != null) setPrazo(orcamento.prazoEntregaDias);
    if (orcamento.validadeDias != null) setValidade(orcamento.validadeDias);
    if (orcamento.statusOrcamento) setStatus(orcamento.statusOrcamento);
  }, [orcamento]);

  const detalhe = orcamento?.detalhe;
  const custo = Number(detalhe?.custoTotal) || 0;
  const descontoValor = Number(desconto) || 0;
  const precoEstimado = useMemo(() => {
    // MESMA fórmula documentada do backend (precificacao.py); só para prévia ao digitar
    if (modeloMargem === "margem_preco") {
      if (margem >= 100) return null; // inválido
      return custo / (1 - margem / 100);
    }
    return custo * (1 + margem / 100);
  }, [custo, margem, modeloMargem]);
  const precoFinal = Number(orcamento?.precoVenda) || 0;
  const margemValor = Math.max(precoFinal - custo - descontoValor, 0);
  const desatualizado = Boolean(orcamento?.desatualizado) || !orcamento?.calculadoEm;
  const podeContrato = precoFinal > 0 && !desatualizado;

  async function recalcular() {
    if (!projeto) return;
    setRecalculando(true);
    setErroLocal("");
    try {
      // reusa o cálculo da página de produção (pecas + ferragens do projeto atual)
      const emCache = sessionStorage.getItem(`producao-${projetoId}`);
      let payload;
      if (emCache) {
        payload = JSON.parse(emCache);
      } else {
        // sem cache, abre a produção em nova aba é intrusivo: pedimos o cálculo
        // pela página de produção via link; aqui só avisamos
        setErroLocal(
          "Para recalcular, abra primeiro a página de produção deste projeto (o cálculo usa o plano de corte salvo em cache)."
        );
        setRecalculando(false);
        return;
      }
      const atualizado = await api.recalcularOrcamento(projetoId, payload);
      aplicar(atualizado);
      setMensagem({ tipo: "ok", texto: "Orçamento recalculado com os módulos atuais." });
    } catch (e) {
      setErroLocal(e.message || "Falha ao recalcular.");
    } finally {
      setRecalculando(false);
    }
  }

  async function salvar() {
    setSalvando(true);
    setErroLocal("");
    try {
      const atualizado = await api.salvarOrcamento(projetoId, {
        margem_percentual: Number(margem),
        modelo_margem: modeloMargem,
        desconto: Number(desconto),
        entrada: Number(entrada),
        parcelas: Number(parcelas),
        forma_pagamento: forma,
        prazo_entrega_dias: Number(prazo),
        validade_dias: Number(validade),
        status_orcamento: status,
      });
      aplicar(atualizado);
      setMensagem({ tipo: "ok", texto: "Orçamento salvo." });
    } catch (e) {
      setErroLocal(e.message || "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando texto="Carregando orçamento..." />;
  if (!projeto) return <Erro mensagem={erroLocal || "Projeto não encontrado."} />;

  const clienteNome = clientes.find((c) => c.id === projeto.cliente_id)?.nome || "Sem cliente";
  const simulacaoEntrada = precoFinal > 0 ? (precoFinal - descontoValor) * (Number(entrada) / 100 || 0) : 0;
  const restante = precoFinal - descontoValor - simulacaoEntrada;
  const valorParcela = parcelas > 0 ? restante / parcelas : 0;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => history.push(`/projetos/${projetoId}`)}
            className="text-sm font-medium text-primario hover:text-primario-escuro"
          >
            ← Projeto
          </button>
          <h1 className="mt-1 text-xl font-semibold">Orçamento — {projeto.nome}</h1>
          <p className="text-sm text-app-secundario">{clienteNome}</p>
        </div>
        <PilulaStatusOrcamento status={status} />
      </header>

      {erroLocal && <Erro mensagem={erroLocal} />}
      {erro && <Erro mensagem={erro} />}

      {/* abas: Resumo executivo | Resumo de custos (Fase 4) */}
      <div className="mb-4 flex gap-1 border-b border-app-borda">
        <button type="button" className="border-b-2 border-primario bg-white px-4 py-2 text-sm font-medium text-primario">
          Resumo executivo
        </button>
        <button
          type="button"
          onClick={() => history.push(`/projetos/${projetoId}/orcamento/resumo`)}
          className="rounded-t-lg px-4 py-2 text-sm font-medium text-app-secundario hover:bg-app-fundo"
        >
          Resumo de custos
        </button>
      </div>

      {/* 3.1 resumo executivo */}
      {detalhe ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <CardMetrica rotulo="Custo dos insumos" valor={formatarBRL(custo)} legenda="Materiais + perda" />
          <CardMetrica
            rotulo="Margem / lucro"
            valor={formatarBRL(margemValor)}
            legenda={`${margem}% configurado`}
          />
          <CardMetrica rotulo="Preço final de venda" valor={formatarBRL(precoFinal || precoEstimado || 0)} destaque />
          <CardMetrica rotulo="Lucro líquido estimado" valor={formatarBRL(margemValor)} legenda="preço − custo" />
        </div>
      ) : (
        <Vazio titulo="Orçamento não calculado" descricao="Recalcule para gerar o custo e o preço deste projeto.">
          <BotaoPrimario
            onClick={recalcular}
            disabled={recalculando}
            title="Precisa de um cálculo salvo em cache da página de produção"
          >
            {recalculando ? "Recalculando..." : "Recalcular orçamento"}
          </BotaoPrimario>
        </Vazio>
      )}

      {detalhe && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* margem configurável */}
          <section className="rounded-card border border-app-borda bg-white p-4 shadow-card">
            <h2 className="mb-3 font-semibold">Margem e desconto</h2>
            <label className="block text-sm font-medium text-app-texto">
              Margem (%)
              <input
                type="number" min="0" max="500" value={margem}
                onChange={(e) => setMargem(Number(e.target.value) || 0)}
                className={`mt-1 ${classeInput}`}
              />
            </label>
            <div className="mt-2 flex gap-2">
              {[30, 50, 100].map((atalho) => (
                <button
                  key={atalho} type="button" onClick={() => setMargem(atalho)}
                  className="rounded-lg border border-app-borda px-3 py-1 text-xs font-medium hover:bg-app-fundo"
                >
                  {atalho}%
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm font-medium text-app-texto">
              Modelo da margem
              <select value={modeloMargem} onChange={(e) => setModeloMargem(e.target.value)} className={`mt-1 ${classeInput}`}>
                <option value="markup_custo">Acréscimo sobre o custo</option>
                <option value="margem_preco">Margem sobre o preço</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium text-app-texto">
              Desconto (R$)
              <input type="number" min="0" value={desconto} onChange={(e) => setDesconto(Number(e.target.value) || 0)} className={`mt-1 ${classeInput}`} />
            </label>
            {precoEstimado != null && (
              <p className="mt-3 text-sm text-app-secundario">
                Preço de venda com esta margem:{" "}
                <strong className="tabular-nums text-app-texto">{formatarBRL(precoEstimado)}</strong>
              </p>
            )}
          </section>

          {/* 3.3 condições de pagamento */}
          <section className="rounded-card border border-app-borda bg-white p-4 shadow-card">
            <h2 className="mb-3 font-semibold">Condições de pagamento e prazo</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-app-texto">
                Entrada (%)
                <input type="number" min="0" max="100" value={entrada} onChange={(e) => setEntrada(Number(e.target.value) || 0)} className={`mt-1 ${classeInput}`} />
              </label>
              <label className="text-sm font-medium text-app-texto">
                Parcelas
                <input type="number" min="1" max="12" value={parcelas} onChange={(e) => setParcelas(Math.min(12, Math.max(1, Number(e.target.value) || 1)))} className={`mt-1 ${classeInput}`} />
              </label>
              <label className="text-sm font-medium text-app-texto">
                Forma
                <select value={forma} onChange={(e) => setForma(e.target.value)} className={`mt-1 ${classeInput}`}>
                  {FORMAS.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-app-texto">
                Prazo (dias úteis)
                <input type="number" min="0" max="365" value={prazo} onChange={(e) => setPrazo(Number(e.target.value) || 0)} className={`mt-1 ${classeInput}`} />
              </label>
              <label className="text-sm font-medium text-app-texto">
                Validade (dias)
                <input type="number" min="0" max="365" value={validade} onChange={(e) => setValidade(Number(e.target.value) || 0)} className={`mt-1 ${classeInput}`} />
              </label>
              <label className="text-sm font-medium text-app-texto">
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 ${classeInput}`}>
                  {STATUS_OPCOES.map((s) => (
                    <option key={s} value={s}>{CORES_STATUS_ORCAMENTO[s]?.nome || s}</option>
                  ))}
                </select>
              </label>
            </div>
            {precoFinal > 0 && (
              <dl className="mt-3 rounded-lg bg-app-fundo p-3 text-sm">
                <div className="flex justify-between"><dt className="text-app-secundario">Entrada</dt><dd className="tabular-nums">{formatarBRL(simulacaoEntrada)}</dd></div>
                <div className="flex justify-between"><dt className="text-app-secundario">{parcelas}× de</dt><dd className="tabular-nums">{formatarBRL(valorParcela)}</dd></div>
                <div className="flex justify-between font-medium"><dt>Total</dt><dd className="tabular-nums">{formatarBRL(precoFinal)}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}

      {/* ações */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <BotaoPrimario onClick={recalcular} disabled={recalculando}>
          {recalculando ? "Recalculando..." : "Recalcular preço"}
        </BotaoPrimario>
        <BotaoSecundario onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar orçamento"}
        </BotaoSecundario>
        <span
          title={podeContrato ? "" : "Recalcule o orçamento e salve para habilitar o contrato"}
          className="inline-block"
        >
          <BotaoSecundario
            onClick={() => history.push(`/projetos/${projetoId}/contrato`)}
            disabled={!podeContrato}
          >
            Gerar contrato (PDF)
          </BotaoSecundario>
        </span>
        {mensagem && (
          <span className={`text-sm ${mensagem.tipo === "ok" ? "text-emerald-700" : "text-red-700"}`}>
            {mensagem.texto}
          </span>
        )}
        {desatualizado && detalhe && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            Preço desatualizado
          </span>
        )}
      </div>
    </div>
  );
}
