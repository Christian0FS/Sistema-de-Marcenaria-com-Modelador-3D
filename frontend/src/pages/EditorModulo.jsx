import React, { useEffect, useRef, useState } from "react";
import Cena from "../three/Cena";
import { useModuloStore } from "../store/moduloStore";
import { api } from "../lib/api";
import { useHistory, useLocation } from "react-router-dom";
import { CATEGORIAS } from "../lib/categoria";
import SeletorCenario from "../components/SeletorCenario";
import { classeInput } from "../components/ui";
import {
  gerarPrateleiras,
  gerarVaos,
  geometriaPecaAvulsa,
  limitesDivisao,
  ORIENTACOES_PECA,
} from "../three/logicaEstrutura";
import { calcularFerragensModulo } from "../three/logicaFerragens";
import {
  calcularPlanoDeFita,
  gerarApoiosPrateleira,
  gerarPlanoDeFuracao,
  medidasDeCorte,
} from "../three/logicaFabricacao";



function CampoDeslizante({ label, valor, min, max, step = 1, unidade = "mm", onChange }) {
  const valorNaBarra = Math.min(Math.max(Number(valor) || 0, min), max);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={valor}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 border border-gray-300 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {unidade && <span className="text-xs text-gray-500">{unidade}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valorNaBarra}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600 cursor-pointer"
      />
    </div>
  );
}

function CampoDimensao({ label, chave }) {
  const valor = useModuloStore((state) => state.modulo.dimensoes[chave]);
  const setDimensao = useModuloStore((state) => state.setDimensao);

  return (
    <CampoDeslizante
      label={label}
      valor={valor}
      min={50}
      max={4000}
      step={10}
      onChange={(valorNovo) => setDimensao(chave, valorNovo)}
    />
  );
}

function PainelCasco({ casco, atualizarCasco, salvar, salvando }) {
  const [chapas, setChapas] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.listarChapas()
      .then(setChapas)
      .catch((erroRequisicao) => setErro(erroRequisicao.message));
  }, []);

  return (
    <section className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="mb-2 font-semibold text-gray-700">Peças estruturais</h3>
      <label className="mb-1 block text-xs text-gray-600" htmlFor="chapa-casco">Chapa MDF</label>
      <select
        id="chapa-casco"
        value={casco.chapaId || ""}
        onChange={(evento) => atualizarCasco("chapaId", evento.target.value || null)}
        className="mb-3 w-full rounded border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">Selecionar chapa do estoque</option>
        {chapas.map((chapa) => (
          <option key={chapa.id} value={chapa.id}>
            {chapa.nome} · {chapa.espessura_mm} mm
          </option>
        ))}
      </select>
      {erro && <p className="mb-2 text-xs text-red-700">{erro}</p>}
      <CampoDeslizante
        label="Espessura do casco"
        valor={casco.espessura}
        min={12}
        max={30}
        onChange={(valor) => atualizarCasco("espessura", valor)}
      />
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={casco.incluirFundo}
          onChange={(evento) => atualizarCasco("incluirFundo", evento.target.checked)}
        />
        Incluir fundo
      </label>
      <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(casco.fitaCompleta)}
          onChange={(evento) => atualizarCasco("fitaCompleta", evento.target.checked)}
        />
        Fitar quatro bordas do casco
      </label>
      {casco.incluirFundo && (
        <CampoDeslizante
          label="Espessura do fundo"
          valor={casco.espessuraFundo}
          min={3}
          max={6}
          onChange={(valor) => atualizarCasco("espessuraFundo", valor)}
        />
      )}
      <button
        type="button"
        onClick={() => salvar()}
        disabled={salvando}
        className="w-full rounded border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Salvar peças estruturais"}
      </button>
    </section>
  );
}

function PainelFabricacao({ modulo, atualizarConfig }) {
  const [fitas, setFitas] = useState([]);
  const [erroFitas, setErroFitas] = useState("");
  const configFuracao = modulo.estrutura.fabricacao.furacao32;
  const configFita = modulo.estrutura.fabricacao.fitaBorda;
  const planoFuracao = gerarPlanoDeFuracao(modulo.dimensoes, modulo.estrutura);
  const planoFita = calcularPlanoDeFita(modulo.dimensoes, modulo.estrutura);
  const visualizacao = useModuloStore((state) => state.visualizacao);
  const setVisualizacao = useModuloStore((state) => state.setVisualizacao);
  const atualizarInterno = useModuloStore((state) => state.atualizarInterno);
  const modoFabricacao = visualizacao.furos || visualizacao.ferragens;
  const apoios = modoFabricacao
    ? gerarApoiosPrateleira(modulo.dimensoes, modulo.estrutura)
    : { pinos: [], ajustes: [] };
  const ajustesComSugestao = apoios.ajustes.filter((ajuste) => ajuste.posicaoMmSugerida != null);

  function textoAjuste(ajuste) {
    if (ajuste.motivo === "no-ar") {
      return `${ajuste.folgaMm} mm acima do pino. Para apoiar direto: altura ${ajuste.posicaoMmSugerida} mm.`;
    }
    if (ajuste.motivo === "abaixo-do-primeiro-furo") {
      return `abaixo do primeiro furo. Menor altura com apoio: ${ajuste.posicaoMmSugerida} mm.`;
    }
    return "o vão não tem furos de pino (vão menor que os recuos da furação).";
  }

  useEffect(() => {
    api.listarFitas()
      .then(setFitas)
      .catch((erroRequisicao) => setErroFitas(erroRequisicao.message));
  }, []);

  function campoFuracao(chave, label, min, max, step = 1) {
    return (
      <CampoDeslizante
        key={chave}
        label={label}
        valor={configFuracao[chave]}
        min={min}
        max={max}
        step={step}
        onChange={(valor) => atualizarConfig("furacao32", chave, valor)}
      />
    );
  }

  function grupoFita(grupo, titulo) {
    const config = configFita[grupo];
    return (
      <div className="mb-3 rounded border border-gray-200 p-2">
        <p className="mb-2 text-xs font-medium text-gray-700">{titulo}</p>
        <label className="mb-1 block text-xs text-gray-600">Fita de borda</label>
        <select
          value={config.fitaId || ""}
          onChange={(evento) => atualizarConfig("fitaBorda", grupo, { ...config, fitaId: evento.target.value || null })}
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">Sem fita vinculada</option>
          {fitas.map((fita) => (
            <option key={fita.id} value={fita.id}>{fita.nome}</option>
          ))}
        </select>
        <CampoDeslizante
          label="Espessura da fita"
          valor={config.espessuraMm}
          min={0.45}
          max={2}
          step={0.05}
          onChange={(valor) => atualizarConfig("fitaBorda", grupo, { ...config, espessuraMm: valor })}
        />
      </div>
    );
  }

  return (
    <section className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="mb-2 font-semibold text-gray-700">Fabricação</h3>

      <div className="mb-3 rounded border border-gray-200 bg-gray-50 p-2">
        <p className="mb-2 text-xs font-medium text-gray-700">Ver no 3D</p>
        <label className="mb-1 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={visualizacao.furos}
            onChange={(evento) => setVisualizacao("furos", evento.target.checked)}
          />
          Furos
        </label>
        <label className="mb-1 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={visualizacao.ferragens}
            onChange={(evento) => setVisualizacao("ferragens", evento.target.checked)}
          />
          Ferragens (dobradiça, puxador, corrediça)
        </label>
        <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={visualizacao.ampliar}
            onChange={(evento) => setVisualizacao("ampliar", evento.target.checked)}
          />
          Ampliar os marcadores de furo
        </label>
        <ul className="space-y-0.5 text-xs text-gray-600">
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#111827" }} />Furo de pino de prateleira</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#dc2626" }} />Caneco da dobradiça</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#2563eb" }} />Puxador</li>
          <li><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: "#059669" }} />Corrediça de gaveta</li>
        </ul>
        {(visualizacao.furos || visualizacao.ferragens) && (
          <p className="mt-2 text-xs text-gray-500">
            As portas ficam translúcidas para mostrar o que há atrás. As ferragens são desenhadas de forma aproximada.
          </p>
        )}
      </div>

      {apoios.ajustes.length > 0 && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          <p className="mb-1 font-medium">Prateleiras fora dos furos ({apoios.ajustes.length})</p>
          <ul className="mb-2 space-y-1">
            {apoios.ajustes.map((ajuste) => (
              <li key={ajuste.prateleiraId}>
                {ajuste.rotulo}: {textoAjuste(ajuste)}
              </li>
            ))}
          </ul>
          {ajustesComSugestao.length > 0 && (
            <button
              type="button"
              onClick={() =>
                ajustesComSugestao.forEach((ajuste) =>
                  atualizarInterno(ajuste.prateleiraId, { posicaoMm: ajuste.posicaoMmSugerida })
                )
              }
              className="w-full rounded border border-amber-500 bg-white px-2 py-1 font-medium text-amber-800 hover:bg-amber-100"
            >
              Encaixar prateleiras nos furos
            </button>
          )}
        </div>
      )}

      <details className="mb-3 rounded border border-gray-200 p-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Furação: {planoFuracao.totalFuros} operações
        </summary>
        <div className="mt-3">
          {campoFuracao("passo", "Passo do sistema", 8, 128)}
          {campoFuracao("recuoFrontal", "Recuo da frente", 0, 150)}
          {campoFuracao("recuoTraseiro", "Recuo do fundo", 0, 150)}
          {campoFuracao("inicioBase", "Primeiro furo acima da base", 0, 300)}
          {campoFuracao("recuoTopo", "Recuo do topo", 0, 300)}
          {campoFuracao("diametroPino", "Diâmetro do furo de pino", 3, 12, 0.5)}
          {campoFuracao("profundidadePino", "Profundidade do furo de pino", 3, 30)}
          <p className="mb-2 text-xs font-medium text-gray-700">Dobradiças</p>
          {campoFuracao("diametroCaneco", "Diâmetro do caneco", 20, 50)}
          {campoFuracao("profundidadeCaneco", "Profundidade do caneco", 5, 20)}
          {campoFuracao("recuoCanecoBorda", "Centro do caneco à borda", 10, 40, 0.5)}
          {campoFuracao("distanciaDobradiçaExtremidade", "Caneco ao topo/base", 40, 200)}
          <p className="mb-2 text-xs font-medium text-gray-700">Puxadores</p>
          {campoFuracao("entreFurosPuxador", "Distância entre os furos", 32, 320, 32)}
          {campoFuracao("diametroPuxador", "Diâmetro do furo", 3, 10, 0.5)}
          <p className="mb-2 text-xs font-medium text-gray-700">Corrediça de gaveta</p>
          {campoFuracao("diametroParafuso", "Diâmetro do furo", 2, 8, 0.5)}
          {campoFuracao("recuoParafusoCorredica", "Primeiro furo (à frente do vão)", 10, 100)}
          {planoFuracao.avisos.length > 0 && (
            <ul className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
              {planoFuracao.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
            </ul>
          )}
          <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
            {Object.entries(planoFuracao.porTipo).map(([tipo, total]) => (
              <p key={tipo}>{tipo}: {total}</p>
            ))}
          </div>
        </div>
      </details>

      <details className="mb-3 rounded border border-gray-200 p-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Lista de peças: {planoFita.pecas.length}
        </summary>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-600">
          {planoFita.pecas.map((peca) => {
            const [comprimento, larguraCorte] = medidasDeCorte(peca);
            return (
              <li key={peca.id}>
                {peca.nome}: {comprimento} × {larguraCorte} mm · esp. {peca.espessura || "-"} mm
                {peca.chapaId ? "" : " · sem chapa"}
              </li>
            );
          })}
        </ul>
      </details>

      <details className="rounded border border-gray-200 p-2">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Fita de borda: {planoFita.totalMetros.toFixed(2)} m calculados
        </summary>
        <div className="mt-3">
          {erroFitas && <p className="mb-2 text-xs text-red-700">{erroFitas}</p>}
          {grupoFita("padrao", "Casco, divisórias e corpos de gaveta")}
          {grupoFita("frentes", "Portas e frentes de gaveta")}
          <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
            {planoFita.resumo.map((item) => (
              <p key={`${item.grupo}-${item.fitaId || "nenhuma"}-${item.espessuraMm}`}>
                {item.grupo}: {item.comprimentoMetros.toFixed(2)} m · {item.espessuraMm} mm
              </p>
            ))}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-600">Ver arestas por peça</summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600">
              {planoFita.arestas.map((aresta) => (
                <li key={`${aresta.pecaId}-${aresta.aresta}`}>
                  {aresta.peca} · {aresta.aresta}: {(aresta.comprimentoMm / 1000).toFixed(2)} m
                </li>
              ))}
            </ul>
          </details>
        </div>
      </details>
    </section>
  );
}

function PainelVaoSelecionado({ vaoSelecionado, salvarEstrutura, salvando }) {
  const adicionarDivisao = useModuloStore((state) => state.adicionarDivisao);
  const adicionarInterno = useModuloStore((state) => state.adicionarInterno);
  const atualizarInterno = useModuloStore((state) => state.atualizarInterno);
  const removerDivisao = useModuloStore((state) => state.removerDivisao);
  const removerInterno = useModuloStore((state) => state.removerInterno);
  const { adicionarPorta, removerPorta, atualizarPorta, vaoTemPorta } = useModuloStore();
  const divisoes = useModuloStore((state) => state.modulo.estrutura.divisoes);
  const internos = useModuloStore((state) => state.modulo.estrutura.internos);
  const portas = useModuloStore((state) => state.modulo.estrutura.portas);
  const casco = useModuloStore((state) => state.modulo.estrutura.casco);
  const dimensoes = useModuloStore((state) => state.modulo.dimensoes);
  const setPreviaDivisao = useModuloStore((state) => state.setPreviaDivisao);
  const atualizarDivisao = useModuloStore((state) => state.atualizarDivisao);
  const [chapas, setChapas] = useState([]);

  useEffect(() => {
    api.listarChapas().then(setChapas).catch(() => setChapas([]));
  }, []);
  const vaoTemDivisao = (vaoId) =>
    divisoes.some((divisao) => (divisao.vao_pai || "raiz") === vaoId);
  const internosDoVao = internos.filter((i) => i.vao_id === vaoSelecionado);
  const temItemQueImpedeDivisao = internosDoVao.some((i) => i.tipo !== "prateleira");
  const temPortaNoVao = vaoTemPorta(vaoSelecionado);
  const temPrateleiraNoVao = internosDoVao.some((i) => i.tipo === "prateleira");
  const vao = vaoSelecionado
    ? gerarVaos(dimensoes, divisoes, casco).find((v) => v.id === vaoSelecionado)
    : null;
  const prateleirasNoVao = vao
    ? gerarPrateleiras([vao], internosDoVao)
    : [];

  const [acao, setAcao] = useState("dividir");
  const [eixo, setEixo] = useState("vertical");
  const [posicao, setPosicao] = useState(300);
  const [espessuraDivisao, setEspessuraDivisao] = useState(15);
  const [numGavetas, setNumGavetas] = useState(3);
  const [mostrarFormPorta, setMostrarFormPorta] = useState(false);
  const [tipoPorta, setTipoPorta] = useState("giro");
  const [ladoDobradica, setLadoDobradica] = useState("esquerda");
  const [folgaPorta, setFolgaPorta] = useState(3);

  const limites = vao ? limitesDivisao(vao, eixo, espessuraDivisao) : { min: 0, max: 0 };

  useEffect(() => {
    if (!vao) return;
    const { min, max } = limitesDivisao(vao, eixo, espessuraDivisao);
    setPosicao(Math.round((min + max) / 2));
  }, [dimensoes, divisoes, vaoSelecionado, eixo, espessuraDivisao]);

  useEffect(() => {
    setPreviaDivisao(
      vaoSelecionado && acao === "dividir"
        ? { vaoId: vaoSelecionado, eixo, posicao, espessura: espessuraDivisao }
        : null
    );
  }, [vaoSelecionado, acao, eixo, posicao, espessuraDivisao, setPreviaDivisao]);

  useEffect(() => () => setPreviaDivisao(null), [setPreviaDivisao]);

  async function confirmar() {
    if (acao === "dividir") {
      adicionarDivisao(vaoSelecionado, eixo, posicao, espessuraDivisao);
      setPreviaDivisao(null);
    } else if (acao === "prateleira") {
      adicionarInterno(vaoSelecionado, "prateleira", { posicaoRelativa: 0.5 });
    } else if (acao === "gaveteiro") {
      adicionarInterno(vaoSelecionado, "gaveteiro", { numGavetas });
    }
    await salvarEstrutura();
  }

  async function confirmarAdicaoPorta() {
    if (!vaoSelecionado || vaoTemPorta(vaoSelecionado)) return;

    adicionarPorta(vaoSelecionado, {
      tipo: tipoPorta,
      ladoDobradica: tipoPorta === "giro" ? ladoDobradica : null,
      folga: Number(folgaPorta),
    });
    setMostrarFormPorta(false);
    await salvarEstrutura();
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="font-semibold text-gray-700 mb-2">Estrutura</h3>

      {!vaoSelecionado && (
        <p className="text-xs text-gray-500 mb-2">
          Clique em um vão vazio no móvel 3D para editá-lo.
        </p>
      )}

      {vaoSelecionado && (
        <div className="bg-blue-50 rounded p-2 mb-3">
          <p className="text-xs text-blue-700 mb-2">
            Vão selecionado: <strong>{vaoSelecionado}</strong>
          </p>

          <label className="block text-xs text-gray-600 mb-1">O que fazer com esse vão?</label>
          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
          >
            <option value="dividir" disabled={temItemQueImpedeDivisao || temPortaNoVao}>
              Dividir em novos vãos
            </option>
            <option value="prateleira">Colocar prateleira</option>
            <option value="gaveteiro" disabled={temPrateleiraNoVao}>
              Colocar gaveteiro
            </option>
          </select>

          {acao === "dividir" && (
            <>
              <label className="block text-xs text-gray-600 mb-1">Direção</label>
              <select
                value={eixo}
                onChange={(e) => setEixo(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
              >
                <option value="vertical">Vertical (divide a largura)</option>
                <option value="horizontal">Horizontal (divide a altura)</option>
                <option value="frontal">Frontal (divide a profundidade)</option>
              </select>

              <CampoDeslizante
                label={
                  eixo === "vertical"
                    ? "Largura do vão esquerdo"
                    : eixo === "horizontal"
                      ? "Altura do vão inferior"
                      : "Profundidade do vão de fundo"
                }
                valor={Math.max(0, Math.round(posicao - espessuraDivisao / 2))}
                min={Math.max(0, Math.ceil(limites.min - espessuraDivisao / 2))}
                max={Math.max(
                  Math.max(0, Math.ceil(limites.min - espessuraDivisao / 2)),
                  Math.floor(limites.max - espessuraDivisao / 2)
                )}
                onChange={(valor) => setPosicao(valor + espessuraDivisao / 2)}
              />
              <CampoDeslizante
                label="Espessura da divisória"
                valor={espessuraDivisao}
                min={3}
                max={50}
                onChange={setEspessuraDivisao}
              />
            </>
          )}

          {acao === "gaveteiro" && (
            <>
              <CampoDeslizante
                label="Número de gavetas"
                valor={numGavetas}
                min={1}
                max={8}
                unidade=""
                onChange={setNumGavetas}
              />
            </>
          )}

          <button
            onClick={confirmar}
            disabled={
              salvando ||
              (acao === "dividir" && (temItemQueImpedeDivisao || temPortaNoVao)) ||
              (acao === "gaveteiro" && temPrateleiraNoVao)
            }
            className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded py-1.5 text-sm"
          >
            {salvando ? "Salvando..." : "Confirmar e salvar"}
          </button>

          {!mostrarFormPorta && (
            <button
              onClick={() => setMostrarFormPorta(true)}
              disabled={vaoTemDivisao(vaoSelecionado) || vaoTemPorta(vaoSelecionado)}
              className="w-full mt-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded py-1.5 text-sm"
            >
              Porta
            </button>
          )}

          {mostrarFormPorta && (
            <div className="mt-3 p-3 border border-amber-300 rounded bg-amber-50 space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Tipo de abertura</label>
                <div className="flex gap-2">
                  {["giro", "corredica", "bascula"].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setTipoPorta(tipo)}
                      className={`px-2 py-1 text-sm rounded border ${
                        tipoPorta === tipo
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {tipo === "giro" ? "Giro" : tipo === "corredica" ? "Corrediça" : "Báscula"}
                    </button>
                  ))}
                </div>
              </div>

              {tipoPorta === "giro" && (
                <div>
                  <label className="text-sm font-medium block mb-1">Lado da dobradiça</label>
                  <div className="flex gap-2">
                    {["esquerda", "direita"].map((lado) => (
                      <button
                        key={lado}
                        onClick={() => setLadoDobradica(lado)}
                        className={`px-2 py-1 text-sm rounded border ${
                          ladoDobradica === lado
                            ? "bg-amber-600 text-white border-amber-600"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {lado === "esquerda" ? "Esquerda" : "Direita"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tipoPorta === "corredica" && (
                <p className="text-xs text-gray-600">
                  Serão criadas 2 portas deslizantes dividindo o vão.
                </p>
              )}

              <CampoDeslizante
                label="Folga"
                valor={folgaPorta}
                min={0}
                max={10}
                onChange={setFolgaPorta}
              />

              <div className="flex gap-2">
                <button
                  onClick={confirmarAdicaoPorta}
                  className="px-3 py-1 bg-amber-600 text-white rounded text-sm"
                >
                  Adicionar Porta
                </button>
                <button
                  onClick={() => setMostrarFormPorta(false)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {divisoes.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Divisões</p>
          <ul className="space-y-1">
            {divisoes.map((d) => (
              <li key={d.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                <div className="flex items-center justify-between">
                  <span>{d.eixo} @ {d.posicao}mm</span>
                  <button onClick={() => removerDivisao(d.id)} className="text-red-500 hover:text-red-700">
                    remover
                  </button>
                </div>
                {/* Fase 5: chapa da divisória */}
                <select
                  value={d.chapaId || ""}
                  onChange={(e) => atualizarDivisao(d.id, { chapaId: e.target.value || null })}
                  className="mt-1 w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                  aria-label={`Chapa da divisória ${d.id}`}
                >
                  <option value="">Herda a chapa do casco</option>
                  {chapas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} · {c.espessura_mm} mm</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </>
      )}

      {prateleirasNoVao.length > 0 && vao && (
        <div className="mt-3 rounded border border-gray-200 p-2">
          <p className="mb-2 text-xs font-medium text-gray-700">Medidas e posição das prateleiras</p>
          {prateleirasNoVao.map((prateleira, indice) => {
            const interno = internosDoVao.find((item) => item.id === prateleira.id);
            const espessura = Number(interno?.espessuraMm) || 15;
            const posicaoMm = interno?.posicaoMm ?? prateleira.posicaoMm;
            const alturaMaxima = Math.max(0, vao.altura - espessura);
            const portaDeCorrer = portas.some((porta) => porta.vaoId === vao.id && porta.tipo === "corredica");
            const recuoFrontal = portaDeCorrer ? 22 : 5;
            const largura = prateleira.largura;
            const profundidade = prateleira.profundidade;
            const xOffsetMm = prateleira.xOffsetMm ?? 0;
            const zOffsetMm = prateleira.zOffsetMm ?? 5;
            const deslocamentoXMaximo = Math.max(0, vao.largura - largura);
            const profundidadeMaxima = Math.max(10, vao.profundidade - recuoFrontal - 5);
            const deslocamentoZMaximo = Math.max(0, vao.profundidade - recuoFrontal - profundidade);

            return (
              <div key={prateleira.id} className="border-b border-gray-100 py-2 last:border-b-0">
                <p className="mb-1 text-xs text-gray-600">Prateleira {indice + 1}</p>
                <CampoDeslizante
                  label="Largura"
                  valor={largura}
                  min={10}
                  max={Math.max(10, vao.largura)}
                  onChange={(valor) => atualizarInterno(prateleira.id, { larguraMm: valor })}
                />
                <CampoDeslizante
                  label="Comprimento frente-trás"
                  valor={profundidade}
                  min={10}
                  max={profundidadeMaxima}
                  onChange={(valor) => atualizarInterno(prateleira.id, { profundidadeMm: valor })}
                />
                <CampoDeslizante
                  label="Deslocar da lateral esquerda"
                  valor={xOffsetMm}
                  min={0}
                  max={deslocamentoXMaximo}
                  onChange={(valor) => atualizarInterno(prateleira.id, { xOffsetMm: valor })}
                />
                <CampoDeslizante
                  label="Mover para frente/trás"
                  valor={zOffsetMm}
                  min={0}
                  max={deslocamentoZMaximo}
                  onChange={(valor) => atualizarInterno(prateleira.id, { zOffsetMm: valor })}
                />
                <CampoDeslizante
                  label="Altura desde a base do vão"
                  valor={Math.min(posicaoMm, alturaMaxima)}
                  min={0}
                  max={alturaMaxima}
                  step={1}
                  onChange={(valor) => atualizarInterno(prateleira.id, { posicaoMm: valor })}
                />
                <CampoDeslizante
                  label="Espessura"
                  valor={espessura}
                  min={3}
                  max={50}
                  onChange={(valor) => atualizarInterno(prateleira.id, {
                    espessuraMm: valor,
                    posicaoMm: Math.min(posicaoMm, Math.max(0, vao.altura - valor)),
                  })}
                />
                {/* Fase 5: chapa da prateleira */}
                <label className="mb-1 block text-xs text-gray-600" htmlFor={`chapa-${prateleira.id}`}>
                  Chapa da prateleira
                </label>
                <select
                  id={`chapa-${prateleira.id}`}
                  value={interno?.chapaId || ""}
                  onChange={(e) => atualizarInterno(prateleira.id, { chapaId: e.target.value || null })}
                  className="mb-2 w-full rounded border border-gray-300 px-1.5 py-1 text-xs"
                >
                  <option value="">Herda a chapa do casco</option>
                  {chapas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} · {c.espessura_mm} mm</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => salvarEstrutura()}
                  disabled={salvando}
                  className="w-full rounded border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar prateleira"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {internos.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Internos</p>
          <ul className="space-y-1">
            {internos.map((i) => (
              <li key={i.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                <div className="flex items-center justify-between">
                  <span>
                    {i.tipo === "gaveteiro" ? `Gaveteiro (${i.num_gavetas}x)` : "Prateleira"} — {i.vao_id}
                  </span>
                  <button onClick={() => removerInterno(i.id)} className="text-red-500 hover:text-red-700">
                    remover
                  </button>
                </div>
                {/* Fase 5: chapa do gaveteiro/prateleira (o gaveteiro usa para frente e corpo das gavetas) */}
                {i.tipo === "gaveteiro" && (
                  <select
                    value={i.chapaId || ""}
                    onChange={(e) => atualizarInterno(i.id, { chapaId: e.target.value || null })}
                    className="mt-1 w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                    aria-label={`Chapa do gaveteiro ${i.id}`}
                  >
                    <option value="">Herda a chapa do casco</option>
                    {chapas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome} · {c.espessura_mm} mm</option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {portas.filter((porta) => !vaoSelecionado || porta.vaoId === vaoSelecionado).length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Portas</p>
          <ul className="space-y-1">
            {portas
              .filter((porta) => !vaoSelecionado || porta.vaoId === vaoSelecionado)
              .map((porta) => (
              <li key={porta.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                <div className="flex items-center justify-between">
                  <span>{porta.tipo} — {porta.vaoId}</span>
                  <button onClick={() => removerPorta(porta.id)} className="text-red-500 hover:text-red-700">
                    remover
                  </button>
                </div>
                {/* Fase 5: chapa da porta */}
                <select
                  value={porta.chapaId || ""}
                  onChange={(e) => atualizarPorta(porta.id, { chapaId: e.target.value || null })}
                  className="mt-1 w-full rounded border border-gray-300 px-1.5 py-0.5 text-xs"
                  aria-label={`Chapa da porta ${porta.id}`}
                >
                  <option value="">Herda a chapa do casco</option>
                  {chapas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} · {c.espessura_mm} mm</option>
                  ))}
                </select>
              </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

const NOMES_ORIENTACAO = {
  horizontal: "Horizontal (tampo, prateleira)",
  vertical: "Vertical (lateral)",
  frontal: "Frontal (painel, fundo)",
};

function PainelPecasAvulsas({ salvarEstrutura, salvando }) {
  const pecas = useModuloStore((state) => state.modulo.estrutura.pecas) || [];
  const dimensoes = useModuloStore((state) => state.modulo.dimensoes);
  const selecionadaId = useModuloStore((state) => state.pecaAvulsaSelecionada);
  const setSelecionada = useModuloStore((state) => state.setPecaAvulsaSelecionada);
  const adicionarPeca = useModuloStore((state) => state.adicionarPecaAvulsa);
  const atualizarPeca = useModuloStore((state) => state.atualizarPecaAvulsa);
  const duplicarPeca = useModuloStore((state) => state.duplicarPecaAvulsa);
  const removerPeca = useModuloStore((state) => state.removerPecaAvulsa);
  const [chapas, setChapas] = useState([]);
  const secaoRef = useRef(null);

  useEffect(() => {
    api.listarChapas().then(setChapas).catch(() => setChapas([]));
  }, []);

  // ao clicar numa peça no 3D, o painel rola até o formulário dela
  useEffect(() => {
    if (selecionadaId && secaoRef.current && secaoRef.current.scrollIntoView) {
      secaoRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selecionadaId]);

  useEffect(() => {
    function excluirPecaSelecionada(evento) {
      const elementoAtivo = document.activeElement;
      const editandoCampo =
        elementoAtivo instanceof HTMLElement &&
        (elementoAtivo.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(elementoAtivo.tagName));

      if (evento.key !== "Delete" || !selecionadaId || editandoCampo) return;

      evento.preventDefault();
      removerPeca(selecionadaId);
    }

    window.addEventListener("keydown", excluirPecaSelecionada);
    return () => window.removeEventListener("keydown", excluirPecaSelecionada);
  }, [selecionadaId, removerPeca]);

  const peca = pecas.find((item) => item.id === selecionadaId) || null;
  const geo = peca ? geometriaPecaAvulsa(peca, dimensoes) : null;
  const rotulos = ORIENTACOES_PECA[geo?.orientacao || "horizontal"];

  // o maior valor possível de cada medida é o tamanho do módulo naquele sentido
  const limitePorOrientacao = {
    horizontal: [dimensoes.largura, dimensoes.profundidade],
    vertical: [dimensoes.profundidade, dimensoes.altura],
    frontal: [dimensoes.largura, dimensoes.altura],
  };
  const [maxA, maxB] = limitePorOrientacao[geo?.orientacao || "horizontal"];

  const atualizar = (campos) => atualizarPeca(peca.id, campos);

  return (
    <section ref={secaoRef} className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="mb-2 font-semibold text-gray-700">Peças avulsas ({pecas.length})</h3>
      <p className="mb-2 text-xs text-gray-500">
        Cadastre peças próprias (rodapé, tampo extra, ripado, painel). Elas entram na lista de peças,
        na fita de borda e aparecem no 3D. Clique numa peça no 3D para editá-la; com ela selecionada,
        pressione Delete para excluí-la.
      </p>

      {pecas.length > 0 && (
        <ul className="mb-2 space-y-1">
          {pecas.map((item) => {
            const g = geometriaPecaAvulsa(item, dimensoes);
            const ativa = item.id === selecionadaId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelecionada(ativa ? null : item.id)}
                  className={`w-full rounded border px-2 py-1 text-left text-xs ${
                    ativa
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <strong>{g.nome}</strong> · {g.medidaA} × {g.medidaB} mm · esp. {g.espessura} mm
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => adicionarPeca()}
        className="mb-3 w-full rounded bg-amber-600 py-1.5 text-sm text-white hover:bg-amber-700"
      >
        + Nova peça
      </button>

      {peca && geo && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2">
          <label className="mb-1 block text-xs text-gray-600">Nome da peça</label>
          <input
            type="text"
            value={peca.nome ?? ""}
            onChange={(evento) => atualizar({ nome: evento.target.value })}
            className="mb-3 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          <label className="mb-1 block text-xs text-gray-600">Como a peça fica no móvel</label>
          <div className="mb-3 flex flex-col gap-1">
            {Object.keys(NOMES_ORIENTACAO).map((chave) => (
              <button
                key={chave}
                type="button"
                onClick={() => atualizar({ orientacao: chave })}
                className={`rounded border px-2 py-1 text-left text-xs ${
                  geo.orientacao === chave
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {NOMES_ORIENTACAO[chave]}
              </button>
            ))}
          </div>

          <CampoDeslizante
            label={rotulos.rotuloA}
            valor={geo.medidaA}
            min={10}
            max={Math.max(10, maxA)}
            onChange={(valor) => atualizar({ medidaA: valor })}
          />
          <CampoDeslizante
            label={rotulos.rotuloB}
            valor={geo.medidaB}
            min={10}
            max={Math.max(10, maxB)}
            onChange={(valor) => atualizar({ medidaB: valor })}
          />
          <CampoDeslizante
            label="Espessura"
            valor={geo.espessura}
            min={3}
            max={50}
            onChange={(valor) => atualizar({ espessura: valor })}
          />

          <p className="mb-1 mt-2 text-xs font-medium text-gray-700">Posição no módulo</p>
          <CampoDeslizante
            label="A partir da esquerda"
            valor={Math.round(geo.x)}
            min={0}
            max={Math.max(0, dimensoes.largura - geo.largura)}
            onChange={(valor) => atualizar({ x: valor })}
          />
          <CampoDeslizante
            label="A partir da base"
            valor={Math.round(geo.y)}
            min={0}
            max={Math.max(0, dimensoes.altura - geo.altura)}
            onChange={(valor) => atualizar({ y: valor })}
          />
          <CampoDeslizante
            label="A partir do fundo"
            valor={Math.round(geo.z)}
            min={0}
            max={Math.max(0, dimensoes.profundidade - geo.profundidade)}
            onChange={(valor) => atualizar({ z: valor })}
          />
          <div className="mb-3 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => atualizar({ x: Math.max(0, Math.round((dimensoes.largura - geo.largura) / 2)) })}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              Centralizar na largura
            </button>
            <button
              type="button"
              onClick={() => atualizar({ z: 0 })}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              Encostar no fundo
            </button>
            <button
              type="button"
              onClick={() => atualizar({ y: 0 })}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              Apoiar na base
            </button>
          </div>

          <label className="mb-1 block text-xs text-gray-600">Chapa MDF</label>
          <select
            value={peca.chapaId || ""}
            onChange={(evento) => atualizar({ chapaId: evento.target.value || null })}
            className="mb-3 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Usar a chapa do casco</option>
            {chapas.map((chapa) => (
              <option key={chapa.id} value={chapa.id}>
                {chapa.nome} · {chapa.espessura_mm} mm
              </option>
            ))}
          </select>

          <p className="mb-1 text-xs font-medium text-gray-700">Fita de borda</p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Bordas de {geo.medidaA} mm</label>
              <select
                value={geo.fitaA}
                onChange={(evento) => atualizar({ fitaA: Number(evento.target.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value={0}>Nenhuma</option>
                <option value={1}>1 lado</option>
                <option value={2}>2 lados</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Bordas de {geo.medidaB} mm</label>
              <select
                value={geo.fitaB}
                onChange={(evento) => atualizar({ fitaB: Number(evento.target.value) })}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value={0}>Nenhuma</option>
                <option value={1}>1 lado</option>
                <option value={2}>2 lados</option>
              </select>
            </div>
          </div>
          <label className="mb-1 block text-xs text-gray-600">Tipo de fita</label>
          <select
            value={geo.grupoFita}
            onChange={(evento) => atualizar({ grupoFita: evento.target.value })}
            className="mb-3 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="padrao">Padrão (casco e divisórias)</option>
            <option value="frentes">Frentes (portas e gavetas)</option>
          </select>

          <p className="mb-2 text-xs text-gray-600">
            Medida de corte: {Math.max(geo.medidaA, geo.medidaB)} × {Math.min(geo.medidaA, geo.medidaB)} mm,
            espessura {geo.espessura} mm.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => salvarEstrutura("Peça salva no projeto.")}
              disabled={salvando}
              className="flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar peça"}
            </button>
            <button
              type="button"
              onClick={() => duplicarPeca(peca.id)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
            >
              Duplicar
            </button>
            <button
              type="button"
              onClick={() => removerPeca(peca.id)}
              className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600"
            >
              Excluir peça
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FerragensVinculadas({ modulo, atualizarFerragem }) {
  const [ferragens, setFerragens] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.listarFerragens()
      .then(setFerragens)
      .catch((erroRequisicao) => setErro(erroRequisicao.message));
  }, []);

  const vaos = gerarVaos(modulo.dimensoes, modulo.estrutura.divisoes, modulo.estrutura.casco);
  const necessidades = calcularFerragensModulo(
    modulo.estrutura,
    modulo.dimensoes.profundidade,
    vaos
  );

  function ferragemVinculada(necessidade) {
    const itens = necessidade.origemTipo === "porta"
      ? modulo.estrutura.portas
      : modulo.estrutura.internos;
    const item = itens.find((atual) => atual.id === necessidade.origemId);
    return item?.ferragens?.find((atual) =>
      atual.tipoFerragem === necessidade.tipoFerragem &&
      atual.especificacao === necessidade.especificacao
    )?.ferragemId || "";
  }

  return (
    <section className="mt-4 border-t border-gray-200 pt-4">
      <h3 className="font-semibold text-gray-700">Ferragens vinculadas</h3>
      {erro && <p className="mt-2 text-xs text-red-700">{erro}</p>}
      {necessidades.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">Adicione portas ou um gaveteiro para vincular ferragens.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {necessidades.map((necessidade, indice) => (
            <li
              key={`${necessidade.origemId}-${necessidade.tipoFerragem}-${necessidade.especificacao || ""}-${indice}`}
              className="border-b border-gray-100 pb-3"
            >
              <label className="mb-1 block text-xs text-gray-600">
                {necessidade.tipoFerragem} · {necessidade.quantidade} un.
                {necessidade.especificacao ? ` · ${necessidade.especificacao}` : ""}
              </label>
              <select
                value={ferragemVinculada(necessidade)}
                onChange={(evento) => atualizarFerragem(
                  necessidade.origemTipo,
                  necessidade.origemId,
                  necessidade,
                  evento.target.value
                )}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">Selecionar do estoque</option>
                {ferragens
                  .filter((ferragem) => ferragem.tipo === necessidade.tipoFerragem)
                  .map((ferragem) => (
                    <option key={ferragem.id} value={ferragem.id}>
                      {ferragem.nome} · estoque {ferragem.estoque}
                    </option>
                  ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function EditorModulo({ projetoId, moduloId }) {
  const nome = useModuloStore((state) => state.modulo.nome);
  const modulo = useModuloStore((state) => state.modulo);
  const setNome = useModuloStore((state) => state.setNome);
  const carregarModulo = useModuloStore((state) => state.carregarModulo);
  const payloadParaApi = useModuloStore((state) => state.payloadParaApi);
  const atualizarFerragem = useModuloStore((state) => state.atualizarFerragemVinculada);
  const atualizarCasco = useModuloStore((state) => state.atualizarCasco);
  const atualizarAparencia = useModuloStore((state) => state.atualizarAparencia);
  const atualizarConfigFabricacao = useModuloStore((state) => state.atualizarConfigFabricacao);
  const history = useHistory();
  const location = useLocation();
  const setProjetoId = useModuloStore((state) => state.setProjetoId);
  const resetarModulo = useModuloStore((state) => state.resetarModulo);
  const [carregando, setCarregando] = useState(!!moduloId);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [vaoSelecionado, setVaoSelecionado] = useState(null);
  const [mostrarSalvarModelo, setMostrarSalvarModelo] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [categoriaModelo, setCategoriaModelo] = useState("painel_tv");
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("estrutura");

  useEffect(() => {
    setProjetoId(projetoId);
    if (!moduloId) {
    if (!location.state?.deBiblioteca) resetarModulo(); // módulo novo começa limpo
    return;
    }
    setCarregando(true);
    api
     .buscarModulo(projetoId, moduloId)
     .then((dados) => carregarModulo(dados))
     .catch((e) => setMensagem({ tipo: "erro", texto: e.message }))
     .finally(() => setCarregando(false));
  },   [projetoId, moduloId, carregarModulo, setProjetoId, resetarModulo]); // eslint-disable-line



  async function salvarEstrutura(mensagemSucesso = "Estrutura salva no projeto.") {
    setSalvando(true);
    setMensagem(null);
    try {
      if (!projetoId) throw new Error("Abra um projeto antes de salvar a estrutura.");
      const estadoAtual = useModuloStore.getState();
      const moduloAtual = estadoAtual.modulo;
      const payloadAtual = estadoAtual.payloadParaApi();
      if (moduloAtual.modulo_id) {
        await api.atualizarModulo(projetoId, moduloAtual.modulo_id, payloadAtual);
      } else {
        const criado = await api.criarModulo(projetoId, payloadAtual);
        carregarModulo(criado);
      }
      setMensagem({ tipo: "sucesso", texto: mensagemSucesso });
      return true;
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e.message });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvar() {
    await salvarEstrutura("Móvel salvo!");
  }

  async function confirmarSalvarModelo() {
    setSalvandoModelo(true);
    try {
      const payload = payloadParaApi();
      await api.salvarModeloBiblioteca({
        nome: nomeModelo,
        categoria: categoriaModelo,
        estrutura: {
          dimensoes: payload.dimensoes,
          estrutura: payload.estrutura,
         aparencia: payload.aparencia,
        },
        thumbnail_base64: null,
      });
      setMostrarSalvarModelo(false);
      setNomeModelo("");
      alert("Modelo salvo na biblioteca!");
    } catch (erro) {
      alert("Erro ao salvar modelo: " + erro.message);
    } finally {
      setSalvandoModelo(false);
    }
  }

  if (carregando) return <p className="p-4">Carregando móvel...</p>;

  const ABAS = [
    { id: "estrutura", rotulo: "Estrutura" },
    { id: "internos", rotulo: "Internos" },
    { id: "portas", rotulo: "Portas" },
    { id: "aparencia", rotulo: "Aparência" },
    { id: "resumo", rotulo: "Resumo" },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4 p-4">
      <div className="w-72 bg-white rounded-card border border-app-borda shadow-card p-4 flex flex-col overflow-y-auto">
        <button
          type="button"
          onClick={() => projetoId ? history.push(`/projetos/${projetoId}`) : history.goBack()}
          className="mb-4 self-start text-sm font-medium text-primario hover:text-primario-escuro"
        >
          &larr; Voltar ao projeto
        </button>
        <label className="block text-sm font-medium text-app-secundario mb-1">Nome do móvel</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={`w-full ${classeInput} mb-4`}
        />

        {/* abas (Fase 7) */}
        <div className="mb-3 flex flex-wrap gap-1 border-b border-app-borda">
          {ABAS.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAbaAtiva(id)}
              aria-current={abaAtiva === id ? "page" : undefined}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                abaAtiva === id
                  ? "border-b-2 border-primario text-primario"
                  : "text-app-secundario hover:text-app-texto"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {abaAtiva === "estrutura" && (
          <>
            <h3 className="font-semibold text-gray-700 mb-2">Dimensões</h3>
            <CampoDimensao label="Largura" chave="largura" />
            <CampoDimensao label="Altura" chave="altura" />
            <CampoDimensao label="Profundidade" chave="profundidade" />

            <PainelCasco
              casco={modulo.estrutura.casco}
              atualizarCasco={atualizarCasco}
              salvar={salvarEstrutura}
              salvando={salvando}
            />

            <PainelVaoSelecionado
              vaoSelecionado={vaoSelecionado}
              salvarEstrutura={salvarEstrutura}
              salvando={salvando}
            />
          </>
        )}

        {abaAtiva === "internos" && (
          <>
            <PainelPecasAvulsas salvarEstrutura={salvarEstrutura} salvando={salvando} />
          </>
        )}

        {abaAtiva === "portas" && (
          <FerragensVinculadas modulo={modulo} atualizarFerragem={atualizarFerragem} />
        )}

        {abaAtiva === "aparencia" && (
          <PainelAparencia modulo={modulo} atualizarCasco={atualizarCasco} atualizarAparencia={atualizarAparencia} />
        )}

        {abaAtiva === "resumo" && (
          <PainelFabricacao modulo={modulo} atualizarConfig={atualizarConfigFabricacao} />
        )}

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="mt-4 bg-primario hover:bg-primario-escuro disabled:bg-primario-claro text-white rounded-lg py-2 font-medium"
        >
          {salvando ? "Salvando..." : "Salvar móvel"}
        </button>

        <button
          type="button"
          onClick={() => setMostrarSalvarModelo((prev) => !prev)}
          className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 font-medium"
        >
          {mostrarSalvarModelo ? "Fechar" : "Salvar na biblioteca"}
        </button>

        {mostrarSalvarModelo && (
          <div className="mt-3 border border-emerald-200 rounded bg-emerald-50 p-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do modelo</label>
              <input
                type="text"
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={categoriaModelo}
                onChange={(e) => setCategoriaModelo(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.label}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={confirmarSalvarModelo}
              disabled={salvandoModelo || !nomeModelo.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded py-2"
            >
              {salvandoModelo ? "Salvando..." : "Salvar modelo"}
            </button>
          </div>
        )}

        {mensagem && (
          <p className={`text-sm mt-2 ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-600"}`}>
            {mensagem.texto}
          </p>
        )}
      </div>

      <div className="flex-1">
        <SeletorCenario projetoId={projetoId} />
        <Cena vaoSelecionado={vaoSelecionado} onSelecionarVao={setVaoSelecionado} />
      </div>
    </div>
  );
}
// Aba Aparência (Fase 7): cor e veio do módulo + chapa do casco.
// A cor/veio por peça vem da chapa (Fase 5); aqui fica o padrão do módulo.
function PainelAparencia({ modulo, atualizarCasco, atualizarAparencia }) {
  const [chapas, setChapas] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api.listarChapas()
      .then(setChapas)
      .catch((e) => setErro(e.message));
  }, []);

  const casco = modulo.estrutura.casco;
  const chapaDoCasco = chapas.find((c) => c.id === casco.chapaId);

  return (
    <section>
      <h3 className="mb-2 font-semibold text-gray-700">Chapa do casco</h3>
      <select
        value={casco.chapaId || ""}
        onChange={(evento) => atualizarCasco("chapaId", evento.target.value || null)}
        className={`w-full ${classeInput}`}
      >
        <option value="">Sem chapa (usa a cor do módulo)</option>
        {chapas.map((chapa) => (
          <option key={chapa.id} value={chapa.id}>
            {chapa.nome} · {chapa.espessura_mm} mm
          </option>
        ))}
      </select>

      {chapaDoCasco?.cor && (
        <div className="mt-3 rounded-lg border border-app-borda p-3">
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 rounded border border-app-borda"
              style={{ backgroundColor: chapaDoCasco.cor }}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-app-texto">{chapaDoCasco.nome}</p>
              <p className="text-xs text-app-secundario">
                Cor <code>{chapaDoCasco.cor}</code> · veio derivado (~20% mais escuro)
              </p>
            </div>
          </div>
        </div>
      )}

      <h3 className="mb-2 mt-4 font-semibold text-gray-700">Cor de fallback do módulo</h3>
      <p className="mb-2 text-xs text-app-secundario">
        Usada só nas peças sem chapa vinculada.
      </p>
      <input
        type="color"
        value={modulo.aparencia.cor || "#e8e4d8"}
        onChange={(evento) => atualizarAparencia("cor", evento.target.value)}
        className="h-9 w-14 cursor-pointer rounded border border-app-borda bg-white p-1"
        aria-label="Cor do módulo"
      />
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
    </section>
  );
}
