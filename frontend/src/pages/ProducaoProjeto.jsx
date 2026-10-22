import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { calcularFerragensModulo } from "../three/logicaFerragens";
import {
  gerarPecasModulo,
  medidasDeCorte,
} from "../three/logicaFabricacao";
import { gerarVaos } from "../three/logicaEstrutura";

const FORMATO_DINHEIRO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MAQUINAS = [
  { id: "inmes", nome: "INMES" },
  { id: "giben", nome: "Giben" },
  { id: "scm_cyflex", nome: "SCM Cyflex" },
  { id: "corte_cloud", nome: "Corte Cloud" },
];

function precosDeFerragens(modulo, chapasFerragens) {
  const estrutura = modulo.estrutura || {};
  const vaos = gerarVaos(
    modulo.dimensoes,
    estrutura.divisoes || [],
    estrutura.casco
  );
  return calcularFerragensModulo(
    estrutura,
    modulo.dimensoes.profundidade,
    vaos
  ).map((necessidade) => {
    const colecao = necessidade.origemTipo === "porta"
      ? estrutura.portas || []
      : estrutura.internos || [];
    const origem = colecao.find((item) => item.id === necessidade.origemId);
    const ferragemSalva = origem?.ferragens?.find(
      (item) => item.tipoFerragem === necessidade.tipoFerragem &&
        (item.especificacao || "") === (necessidade.especificacao || "")
    );
    const ferragemPadrao = chapasFerragens.find(
      (item) => item.tipo === necessidade.tipoFerragem
    );

    return {
      ...necessidade,
      modulo_id: modulo.modulo_id,
      ferragemId: ferragemSalva?.ferragemId || ferragemPadrao?.id || null,
    };
  });
}

const CORES_PECA = ["#bfdbfe", "#bbf7d0", "#fde68a", "#fecaca", "#ddd6fe", "#a5f3fc"];

function PlanoCorteVisual({ chapa, nomeChapa }) {
  const maxLargura = 520;
  const escala = Math.min(maxLargura / chapa.largura_mm, 280 / chapa.altura_mm);
  const larguraSvg = chapa.largura_mm * escala;
  const alturaSvg = chapa.altura_mm * escala;

  return (
    <div className="mt-3 overflow-x-auto">
      <svg
        width={larguraSvg}
        height={alturaSvg}
        viewBox={`0 0 ${chapa.largura_mm} ${chapa.altura_mm}`}
        className="rounded border border-gray-400 bg-gray-100"
        role="img"
        aria-label={`Plano de corte da ${nomeChapa}`}
      >
        {chapa.pecas.map((peca, indice) => (
          <g key={peca.id}>
            <rect
              x={peca.x}
              y={peca.y}
              width={peca.largura}
              height={peca.altura}
              fill={CORES_PECA[indice % CORES_PECA.length]}
              stroke="#1f2937"
              strokeWidth={Math.max(chapa.largura_mm / 400, 1)}
            />
            <text
              x={peca.x + peca.largura / 2}
              y={peca.y + peca.altura / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(Math.min(peca.largura, peca.altura) / 8, 18)}
              fill="#111827"
            >
              {peca.nome}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function BotaoDownload({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export default function ProducaoProjeto() {
  const { projetoId } = useParams();
  const history = useHistory();
  const [projeto, setProjeto] = useState(null);
  const [chapas, setChapas] = useState([]);
  const [fitas, setFitas] = useState([]);
  const [ferragens, setFerragens] = useState([]);
  const [chapasPadrao, setChapasPadrao] = useState({});
  const [rotacionar, setRotacionar] = useState({});
  const [perdaPercentual, setPerdaPercentual] = useState(10);
  const [lucroPercentual, setLucroPercentual] = useState(30);
  const [modeloLucro, setModeloLucro] = useState("markup_custo");
  const [kerfMm, setKerfMm] = useState(3);
  const [maquina, setMaquina] = useState("inmes");
  const [resultado, setResultado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");
  const [erroDownload, setErroDownload] = useState("");

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.buscarProjeto(projetoId),
      api.listarChapas(),
      api.listarFitas(),
      api.listarFerragens(),
    ])
      .then(([dadosProjeto, dadosChapas, dadosFitas, dadosFerragens]) => {
        if (!ativo) return;
        setProjeto(dadosProjeto);
        setChapas(dadosChapas);
        setFitas(dadosFitas);
        setFerragens(dadosFerragens);
        setChapasPadrao(
          Object.fromEntries(
            (dadosProjeto.modulos || [])
              .filter((modulo) => modulo.estrutura?.casco?.chapaId)
              .map((modulo) => [
                modulo.modulo_id,
                modulo.estrutura.casco.chapaId,
              ])
          )
        );
      })
      .catch((erroRequisicao) => {
        if (ativo) setErro(erroRequisicao.message || "Falha ao carregar o projeto.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [projetoId]);

  const dadosProducao = useMemo(() => {
    if (!projeto) return null;
    const modulos = projeto.modulos || [];
    const pecas = modulos.flatMap((modulo) => {
      if (!modulo.dimensoes || !modulo.modulo_id) return [];
      const estrutura = modulo.estrutura || {};
      const configFitas = estrutura.fabricacao?.fitaBorda || {};
      return gerarPecasModulo(modulo.dimensoes, estrutura).map((peca) => {
        const [larguraCorte, alturaCorte] = medidasDeCorte(peca);
        const arestasFita = (peca.arestasFita || []).map((aresta) => {
          const config = configFitas[aresta.grupo] || {};
          return {
            ...aresta,
            fitaId: config.fitaId || null,
            espessuraMm: Number(config.espessuraMm) || (
              aresta.grupo === "frentes" ? 2 : 1
            ),
          };
        });

        return {
          ...peca,
          id: `${modulo.modulo_id}:${peca.id}`,
          modulo_id: modulo.modulo_id,
          modulo_nome: modulo.nome || "Móvel sem nome",
          chapaId: peca.chapaId || chapasPadrao[modulo.modulo_id] || null,
          largura_corte: larguraCorte,
          altura_corte: alturaCorte,
          permiteRotacao: Boolean(rotacionar[modulo.modulo_id]),
          arestasFita,
        };
      });
    });
    const necessidadesFerragens = modulos.flatMap((modulo) =>
      modulo.dimensoes
        ? precosDeFerragens(modulo, ferragens)
        : []
    );

    return {
      pecas,
      necessidadesFerragens,
      parametros: {
        perda_percentual: Number(perdaPercentual),
        lucro_percentual: Number(lucroPercentual),
        modelo_lucro: modeloLucro,
      },
      kerfMm: Number(kerfMm),
    };
  }, [
    projeto,
    chapasPadrao,
    rotacionar,
    ferragens,
    perdaPercentual,
    lucroPercentual,
    modeloLucro,
    kerfMm,
  ]);

  useEffect(() => {
    if (!projeto || !dadosProducao?.pecas.length) {
      setResultado(null);
      return undefined;
    }

    let ativo = true;
    const timer = window.setTimeout(() => {
      setCalculando(true);
      setErro("");
      // cache do payload para o recalcular do orçamento usar os módulos atuais
      sessionStorage.setItem(`producao-${projetoId}`, JSON.stringify(dadosProducao));
      api.calcularProducao(projetoId, dadosProducao)
        .then((dados) => {
          if (ativo) {
            setResultado(dados);
            // cache para a página de contrato pegar o preço calculado
            sessionStorage.setItem(`preco-${projetoId}`, JSON.stringify(dados));
          }
        })
        .catch((erroRequisicao) => {
          if (ativo) {
            setResultado(null);
            setErro(erroRequisicao.message || "Não foi possível calcular o orçamento.");
          }
        })
        .finally(() => {
          if (ativo) setCalculando(false);
        });
    }, 250);

    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, [projeto, projetoId, dadosProducao]);

  async function baixar(destino) {
    if (!dadosProducao) return;
    setBaixando(true);
    setErroDownload("");
    try {
      const arquivo = await api.exportarProducao(projetoId, destino, dadosProducao);
      const url = URL.createObjectURL(arquivo.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (erroRequisicao) {
      setErroDownload(erroRequisicao.message || "Não foi possível gerar o arquivo.");
    } finally {
      setBaixando(false);
    }
  }

  if (carregando) return <p className="p-4 text-sm text-gray-500">Carregando produção...</p>;

  if (erro && !projeto) {
    return (
      <main className="p-4">
        <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>
        <button type="button" onClick={() => history.goBack()} className="text-sm text-blue-700">
          Voltar
        </button>
      </main>
    );
  }

  const modulos = projeto?.modulos || [];
  const resultadoPreco = resultado?.precificacao;
  const itensNaoAlocados = resultado?.planoCorte?.pecasNaoAlocadas || [];

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => history.push(`/projetos/${projetoId}`)}
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            ← Projeto
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Produção e orçamento
          </h1>
          <p className="mt-1 text-sm text-gray-500">{projeto?.nome}</p>
        </div>
        <span className="text-sm text-gray-500">
          {calculando ? "Atualizando cálculo..." : resultado ? "Cálculo atualizado" : ""}
        </span>
      </div>

      {erro && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Parâmetros de preço</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-gray-700">
            Perda de materiais (%)
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={perdaPercentual}
              onChange={(evento) => setPerdaPercentual(evento.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-gray-700">
            Lucro (%)
            <input
              type="number"
              min="0"
              max={modeloLucro === "margem_preco" ? "99.9" : "1000"}
              step="1"
              value={lucroPercentual}
              onChange={(evento) => setLucroPercentual(evento.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
          <label className="text-sm text-gray-700">
            Cálculo do lucro
            <select
              value={modeloLucro}
              onChange={(evento) => setModeloLucro(evento.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
            >
              <option value="markup_custo">Acréscimo sobre o custo</option>
              <option value="margem_preco">Margem sobre o preço final</option>
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Espessura de corte / kerf (mm)
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={kerfMm}
              onChange={(evento) => setKerfMm(evento.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
            />
          </label>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          A perda é aplicada ao custo de MDF e fita. Ferragens entram pelo preço do estoque.
          Os valores iniciais são sugestões e não são gravados no cadastro de insumos.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Material e fibra</h2>
        {modulos.length === 0 ? (
          <p className="text-sm text-gray-500">Este projeto ainda não tem móveis.</p>
        ) : (
          <div className="space-y-3">
            {modulos.map((modulo) => (
              <div key={modulo.modulo_id} className="rounded border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="text-sm text-gray-800">{modulo.nome || "Móvel sem nome"}</strong>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={Boolean(rotacionar[modulo.modulo_id])}
                      onChange={(evento) => setRotacionar((atual) => ({
                        ...atual,
                        [modulo.modulo_id]: evento.target.checked,
                      }))}
                    />
                    Permitir rotação (pode alterar o sentido da fibra)
                  </label>
                </div>
                <label className="mt-2 block max-w-xl text-sm text-gray-700">
                  Chapa padrão para peças sem chapa vinculada
                  <select
                    value={chapasPadrao[modulo.modulo_id] || ""}
                    onChange={(evento) => setChapasPadrao((atual) => ({
                      ...atual,
                      [modulo.modulo_id]: evento.target.value || null,
                    }))}
                    className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
                  >
                    <option value="">Selecione uma chapa</option>
                    {chapas.map((chapa) => (
                      <option key={chapa.id} value={chapa.id}>
                        {chapa.nome} · {chapa.espessura_mm} mm · {chapa.largura_mm} × {chapa.altura_mm} mm
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Plano de corte</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <BotaoDownload disabled={baixando || !resultado} onClick={() => baixar("exportar/dxf")}>
            Baixar DXF
          </BotaoDownload>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Perfil de máquina
            <select
              value={maquina}
              onChange={(evento) => setMaquina(evento.target.value)}
              className="rounded border border-gray-300 px-2 py-2"
            >
              {MAQUINAS.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          <BotaoDownload
            disabled={baixando || !resultado}
            onClick={() => baixar(`exportar/${maquina}/csv`)}
          >
            Baixar CSV
          </BotaoDownload>
          <BotaoDownload
            disabled={baixando || !resultado}
            onClick={() => baixar(`exportar/${maquina}/xml`)}
          >
            Baixar XML
          </BotaoDownload>
          <BotaoDownload
            disabled={baixando || !resultado}
            onClick={() => baixar("etiquetas")}
          >
            Etiquetas QR (PDF)
          </BotaoDownload>
        </div>
        <p className="mb-4 text-xs text-amber-800">
          CSV/XML usam um esquema comum identificado com o perfil escolhido; a compatibilidade
          nativa das máquinas ainda precisa ser validada com os fabricantes.
        </p>
        {baixando && <p className="mb-2 text-sm text-gray-500">Preparando arquivo...</p>}
        {erroDownload && <p role="alert" className="mb-2 text-sm text-red-700">{erroDownload}</p>}

        {resultado ? (
          <>
            <p className="mb-3 text-sm text-gray-600">
              {resultado.planoCorte.pecasAlocadas} peças alocadas em{" "}
              {resultado.planoCorte.chapasUtilizadas} chapa(s) · aproveitamento{" "}
              {resultado.planoCorte.aproveitamentoPercent}% · kerf{" "}
              {resultado.planoCorte.kerfMm} mm · {resultado.planoCorte.algoritmo}
            </p>
            <div className="space-y-3">
              {resultado.planoCorte.chapas.map((chapa, indice) => {
                const nomeChapa = chapas.find((item) => item.id === chapa.chapaId)?.nome || chapa.chapaId;
                return (
                <div key={`${chapa.chapaId}-${chapa.indice}`} className="rounded border border-gray-200 p-3">
                  <h3 className="font-medium text-gray-800">
                    Chapa {indice + 1}: {nomeChapa}
                    {" "}· {chapa.largura_mm} × {chapa.altura_mm} mm · {chapa.aproveitamentoPercent}% de aproveitamento
                  </h3>
                  <PlanoCorteVisual chapa={chapa} nomeChapa={nomeChapa} />
                  <ul className="mt-2 grid gap-x-6 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
                    {chapa.pecas.map((peca) => (
                      <li key={peca.id}>
                        {peca.modulo ? `${peca.modulo} · ` : ""}
                        {peca.nome}: {peca.largura} × {peca.altura} mm · posição {peca.x}, {peca.y} mm
                        {peca.rotacionada ? " · girada" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            {calculando ? "Calculando o plano..." : "Escolha uma chapa para cada peça não vinculada."}
          </p>
        )}
        {itensNaoAlocados.length > 0 && (
          <div className="mt-4 rounded bg-amber-50 p-3">
            <h3 className="font-medium text-amber-900">Peças não alocadas</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
              {itensNaoAlocados.map((item, indice) => (
                <li key={`${item.pecaId}-${indice}`}>{item.nome}: {item.motivo}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Resumo do orçamento</h2>
        {resultadoPreco ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div><dt className="text-sm text-gray-500">MDF (chapas inteiras)</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.custoMdf)}</dd></div>
              <div><dt className="text-sm text-gray-500">Fita de borda</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.custoFitas)}</dd></div>
              <div><dt className="text-sm text-gray-500">Ferragens</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.custoFerragens)}</dd></div>
              <div><dt className="text-sm text-gray-500">Perda estimada</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.custoPerda)}</dd></div>
              <div><dt className="text-sm text-gray-500">Custo total estimado</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.custoTotal)}</dd></div>
              <div><dt className="text-sm text-gray-500">Lucro estimado</dt><dd className="font-medium">{FORMATO_DINHEIRO.format(resultadoPreco.lucroEstimado)}</dd></div>
            </dl>
            <p className="mt-4 border-t border-gray-200 pt-3 text-xl font-semibold text-emerald-800">
              Preço sugerido: {FORMATO_DINHEIRO.format(resultadoPreco.precoVenda)}
            </p>
            {resultadoPreco.chapas?.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <h3 className="mb-2 text-sm font-medium text-gray-800">Chapas utilizadas</h3>
                <table className="min-w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1 pr-3">Chapa</th>
                      <th className="py-1 pr-3">Qtd</th>
                      <th className="py-1">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoPreco.chapas.map((item) => (
                      <tr key={item.chapaId} className="border-b border-gray-100">
                        <td className="py-1 pr-3">{item.nome}</td>
                        <td className="py-1 pr-3">{item.quantidade}</td>
                        <td className="py-1">{FORMATO_DINHEIRO.format(item.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {resultadoPreco.ferragens?.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <h3 className="mb-2 text-sm font-medium text-gray-800">Ferragens</h3>
                <table className="min-w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-1 pr-3">Item</th>
                      <th className="py-1 pr-3">Qtd</th>
                      <th className="py-1">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoPreco.ferragens.map((item) => (
                      <tr key={item.ferragemId} className="border-b border-gray-100">
                        <td className="py-1 pr-3">{item.nome}</td>
                        <td className="py-1 pr-3">{item.quantidade}</td>
                        <td className="py-1">{FORMATO_DINHEIRO.format(item.custo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">O resumo será exibido após o cálculo.</p>
        )}
        {resultado?.avisos?.length > 0 && (
          <div className="mt-4 rounded bg-amber-50 p-3">
            <h3 className="font-medium text-amber-900">Itens sem preço considerado</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
              {resultado.avisos.map((aviso, indice) => <li key={`${indice}-${aviso}`}>{aviso}</li>)}
            </ul>
          </div>
        )}
        {fitas.length === 0 && (
          <p className="mt-3 text-xs text-gray-500">Nenhuma fita foi cadastrada no estoque.</p>
        )}
      </section>
    </main>
  );
}
