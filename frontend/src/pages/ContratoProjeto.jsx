// Contrato/orçamento em PDF (5.1) com assinatura digital em canvas + hash SHA-256 (5.2).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";

const FORMATO_DINHEIRO = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function CanvasAssinatura({ onChange }) {
  const canvasRef = useRef(null);
  const desenhando = useRef(false);
  const [temAssinatura, setTemAssinatura] = useState(false);

  const posicaoDoEvento = (evento) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ponto = evento.touches ? evento.touches[0] : evento;
    return [ponto.clientX - rect.left, ponto.clientY - rect.top];
  };

  const iniciar = (evento) => {
    evento.preventDefault();
    desenhando.current = true;
    const contexto = canvasRef.current.getContext("2d");
    const [x, y] = posicaoDoEvento(evento);
    contexto.beginPath();
    contexto.moveTo(x, y);
  };
  const desenhar = (evento) => {
    if (!desenhando.current) return;
    evento.preventDefault();
    const contexto = canvasRef.current.getContext("2d");
    const [x, y] = posicaoDoEvento(evento);
    contexto.strokeStyle = "#1f2937";
    contexto.lineWidth = 2;
    contexto.lineCap = "round";
    contexto.lineTo(x, y);
    contexto.stroke();
    if (!temAssinatura) setTemAssinatura(true);
  };
  const terminar = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    onChange(canvasRef.current.toDataURL("image/png"));
  };
  const limpar = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setTemAssinatura(false);
    onChange(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={520}
        height={180}
        className="w-full max-w-xl cursor-crosshair rounded border border-gray-300 bg-gray-50 touch-none"
        onMouseDown={iniciar}
        onMouseMove={desenhar}
        onMouseUp={terminar}
        onMouseLeave={terminar}
        onTouchStart={iniciar}
        onTouchMove={desenhar}
        onTouchEnd={terminar}
        aria-label="Área de assinatura"
      />
      <button type="button" onClick={limpar}
        className="mt-2 text-xs text-gray-600 underline hover:text-gray-800">
        Limpar assinatura
      </button>
    </div>
  );
}

export default function ContratoProjeto({ projetoId }) {
  const history = useHistory();
  const [projeto, setProjeto] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState("");
  const [hashDocumento, setHashDocumento] = useState("");

  const [campos, setCampos] = useState({
    marcenaria: "",
    condicoes: "50% na aprovação e 50% na entrega",
    parcelas: "",
    entrada: "",
    prazo: "45 dias após aprovação",
    observacoes: "",
  });
  const [assinatura, setAssinatura] = useState(null);

  // Fase 3.5: pré-preenche as condições com o orçamento salvo (se houver)
  useEffect(() => {
    let ativo = true;
    api.orcamentoDoProjeto(projetoId)
      .then((orc) => {
        if (!ativo || !orc) return;
        setCampos((atual) => ({
          ...atual,
          entrada: orc.entrada != null && Number(orc.entrada) > 0
            ? String(orc.entrada)
            : atual.entrada,
          parcelas: orc.parcelas ? String(orc.parcelas) : atual.parcelas,
          prazo: orc.prazoEntregaDias ? `${orc.prazoEntregaDias} dias úteis` : atual.prazo,
        }));
      })
      .catch(() => { /* sem orçamento salvo: usa os padrões */ });
    return () => { ativo = false; };
  }, [projetoId]);

  useEffect(() => {
    let ativo = true;
    Promise.all([api.buscarProjeto(projetoId), api.listarClientes()])
      .then(([dadosProjeto, dadosClientes]) => {
        if (!ativo) return;
        setProjeto(dadosProjeto);
        setCliente(
          dadosClientes.find((c) => c.id === dadosProjeto.cliente_id) || null
        );
      })
      .catch((e) => { if (ativo) setErro(e.message || "Falha ao carregar o projeto."); });
    return () => { ativo = false; };
  }, [projetoId]);

  const atualizarCampo = (chave) => (evento) =>
    setCampos((atual) => ({ ...atual, [chave]: evento.target.value }));

  async function gerar() {
    setGerando(true);
    setErroGeracao("");
    try {
      const resposta = await fetch(`${API_URL}/contratos/${projetoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          precoVenda: resultado?.precificacao?.precoVenda || 0,
          custoTotal: resultado?.precificacao?.custoTotal || 0,
          campos: {
            dados_cliente: {
              marcenaria: campos.marcenaria,
              cliente: cliente?.nome || "",
              telefone: cliente?.telefone || "",
              email: cliente?.email || "",
              endereco: cliente?.endereco || "",
            },
            condicoes: campos.condicoes,
            parcelas: campos.parcelas,
            entrada: campos.entrada,
            prazo: campos.prazo,
            observacoes: campos.observacoes,
          },
          assinaturaBase64: assinatura,
        }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(
          typeof corpo.detail === "string" ? corpo.detail : `Erro ${resposta.status}`
        );
      }
      setHashDocumento(resposta.headers.get("X-Document-Hash") || "");
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${projeto.nome || "projeto"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setErroGeracao(e.message || "Não foi possível gerar o contrato.");
    } finally {
      setGerando(false);
    }
  }

  // Fase 3.5: preço vem do orçamento salvo; cache de produção como fallback
  const precoOrcamento = useRef(null);
  useEffect(() => {
    let ativo = true;
    api.orcamentoDoProjeto(projetoId)
      .then((orc) => {
        if (!ativo || !orc?.detalhe) return;
        precoOrcamento.current = {
          precoVenda: Number(orc.precoVenda) || 0,
          custoTotal: Number(orc.custoTotal) || 0,
        };
        setResultado((atual) => atual || { precificacao: precoOrcamento.current });
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [projetoId]);

  useEffect(() => {
    // tenta obter o preço do último cálculo salvo em cache local (se a página de produção rodou antes)
    const emCache = sessionStorage.getItem(`preco-${projetoId}`);
    if (emCache) {
      try { setResultado(JSON.parse(emCache)); } catch { /* ignora */ }
    }
  }, [projetoId]);

  if (erro) {
    return (
      <main className="p-4">
        <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>
        <button type="button" onClick={() => history.goBack()} className="text-sm text-blue-700">Voltar</button>
      </main>
    );
  }
  if (!projeto) return <p className="p-4 text-sm text-gray-500">Carregando contrato...</p>;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6">
        <button type="button" onClick={() => history.push(`/projetos/${projetoId}`)}
          className="text-sm font-medium text-blue-700 hover:text-blue-900">
          ← Projeto
        </button>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Contrato e orçamento</h1>
        <p className="mt-1 text-sm text-gray-500">
          {projeto.nome} · {(projeto.modulos || []).length} móvel(is)
          {cliente ? ` · Cliente: ${cliente.nome}` : ""}
        </p>
      </div>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Dados do contrato</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-gray-700">
            Nome da marcenaria
            <input value={campos.marcenaria} onChange={atualizarCampo("marcenaria")}
              placeholder="Marcenaria" className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm text-gray-700">
            Condições de pagamento
            <input value={campos.condicoes} onChange={atualizarCampo("condicoes")}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm text-gray-700">
            Entrada (R$)
            <input type="number" min="0" step="0.01" value={campos.entrada}
              onChange={atualizarCampo("entrada")}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm text-gray-700">
            Parcelas
            <input value={campos.parcelas} onChange={atualizarCampo("parcelas")}
              placeholder="ex.: 4x de R$ ... sem juros"
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm text-gray-700">
            Prazo de entrega
            <input value={campos.prazo} onChange={atualizarCampo("prazo")}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm text-gray-700 sm:col-span-2">
            Observações
            <textarea value={campos.observacoes} onChange={atualizarCampo("observacoes")}
              rows={3}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
          </label>
        </div>
        {resultado?.precificacao?.precoVenda ? (
          <p className="mt-3 text-sm text-emerald-800">
            Preço calculado na produção: {FORMATO_DINHEIRO.format(resultado.precificacao.precoVenda)}
          </p>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            Abra a página de <strong>Plano de corte e orçamento</strong> antes para que o preço
            calculado seja incluído no contrato.
          </p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Assinatura digital</h2>
        <p className="mb-3 text-xs text-gray-500">
          Assine com o mouse ou dedo. A assinatura vai junto no PDF e o documento recebe um hash
          SHA-256 de integridade impresso no rodapé.
        </p>
        <CanvasAssinatura onChange={setAssinatura} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={gerar} disabled={gerando}
          className="rounded bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {gerando ? "Gerando PDF..." : "Gerar contrato em PDF"}
        </button>
        {hashDocumento && (
          <span className="text-xs text-gray-500">
            Hash do último documento: <code className="break-all">{hashDocumento.slice(0, 24)}…</code>
          </span>
        )}
      </div>
      {erroGeracao && <p role="alert" className="mt-3 text-sm text-red-700">{erroGeracao}</p>}
    </main>
  );
}
