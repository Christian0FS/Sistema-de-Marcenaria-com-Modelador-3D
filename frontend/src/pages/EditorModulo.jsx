import React, { useEffect, useState } from "react";
import Cena from "../three/Cena";
import { useModuloStore } from "../store/moduloStore";
import { api } from "../lib/api";

function CampoDimensao({ label, chave }) {
  const valor = useModuloStore((state) => state.modulo.dimensoes[chave]);
  const setDimensao = useModuloStore((state) => state.setDimensao);

  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-600 mb-1">{label} (mm)</label>
      <input
        type="number"
        value={valor}
        min={50}
        max={4000}
        onChange={(e) => setDimensao(chave, Number(e.target.value))}
        className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function PainelVaoSelecionado({ vaoSelecionado }) {
  const adicionarDivisao = useModuloStore((state) => state.adicionarDivisao);
  const adicionarInterno = useModuloStore((state) => state.adicionarInterno);
  const removerDivisao = useModuloStore((state) => state.removerDivisao);
  const removerInterno = useModuloStore((state) => state.removerInterno);
  const divisoes = useModuloStore((state) => state.modulo.estrutura.divisoes);
  const internos = useModuloStore((state) => state.modulo.estrutura.internos);

  const [acao, setAcao] = useState("dividir");
  const [eixo, setEixo] = useState("vertical");
  const [posicao, setPosicao] = useState(300);
  const [numGavetas, setNumGavetas] = useState(3);

  function confirmar() {
    if (acao === "dividir") {
      adicionarDivisao(vaoSelecionado, eixo, posicao);
    } else if (acao === "prateleira") {
      adicionarInterno(vaoSelecionado, "prateleira", { posicaoRelativa: 0.5 });
    } else if (acao === "gaveteiro") {
      adicionarInterno(vaoSelecionado, "gaveteiro", { numGavetas });
    }
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
            <option value="dividir">Dividir em novos vãos</option>
            <option value="prateleira">Colocar prateleira</option>
            <option value="gaveteiro">Colocar gaveteiro</option>
          </select>

          {acao === "dividir" && (
            <>
              <label className="block text-xs text-gray-600 mb-1">Direção</label>
              <select
                value={eixo}
                onChange={(e) => setEixo(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
              >
                <option value="vertical">Vertical (divide largura)</option>
                <option value="horizontal">Horizontal (divide altura)</option>
              </select>

              <label className="block text-xs text-gray-600 mb-1">Posição (mm)</label>
              <input
                type="number"
                value={posicao}
                onChange={(e) => setPosicao(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
              />
            </>
          )}

          {acao === "gaveteiro" && (
            <>
              <label className="block text-xs text-gray-600 mb-1">Número de gavetas</label>
              <input
                type="number"
                min={1}
                max={8}
                value={numGavetas}
                onChange={(e) => setNumGavetas(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
              />
            </>
          )}

          <button
            onClick={confirmar}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded py-1.5 text-sm"
          >
            Confirmar
          </button>
        </div>
      )}

      {divisoes.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Divisões</p>
          <ul className="space-y-1">
            {divisoes.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <span>{d.eixo} @ {d.posicao}mm</span>
                <button onClick={() => removerDivisao(d.id)} className="text-red-500 hover:text-red-700">
                  remover
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {internos.length > 0 && (
        <>
          <p className="text-xs font-medium text-gray-500 mt-3 mb-1">Internos</p>
          <ul className="space-y-1">
            {internos.map((i) => (
              <li key={i.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                <span>
                  {i.tipo === "gaveteiro" ? `Gaveteiro (${i.num_gavetas}x)` : "Prateleira"} — {i.vao_id}
                </span>
                <button onClick={() => removerInterno(i.id)} className="text-red-500 hover:text-red-700">
                  remover
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function EditorModulo({ projetoId, moduloId }) {
  const nome = useModuloStore((state) => state.modulo.nome);
  const modulo = useModuloStore((state) => state.modulo);
  const setNome = useModuloStore((state) => state.setNome);
  const carregarModulo = useModuloStore((state) => state.carregarModulo);
  const payloadParaApi = useModuloStore((state) => state.payloadParaApi);

  const [carregando, setCarregando] = useState(!!moduloId);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [vaoSelecionado, setVaoSelecionado] = useState(null);

  useEffect(() => {
    if (!moduloId) return;
    setCarregando(true);
    api
      .buscarModulo(projetoId, moduloId)
      .then((dados) => carregarModulo(dados))
      .catch((e) => setMensagem({ tipo: "erro", texto: e.message }))
      .finally(() => setCarregando(false));
  }, [projetoId, moduloId, carregarModulo]);

  async function handleSalvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      if (modulo.modulo_id) {
        await api.atualizarModulo(projetoId, modulo.modulo_id, payloadParaApi());
      } else {
        const criado = await api.criarModulo(projetoId, payloadParaApi());
        carregarModulo(criado);
      }
      setMensagem({ tipo: "sucesso", texto: "Móvel salvo!" });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e.message });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="p-4">Carregando móvel...</p>;

  return (
    <div className="flex h-[700px] gap-4 p-4">
      <div className="w-72 bg-white rounded-lg shadow p-4 flex flex-col overflow-y-auto">
        <label className="block text-sm font-medium text-gray-600 mb-1">Nome do móvel</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <h3 className="font-semibold text-gray-700 mb-2">Dimensões</h3>
        <CampoDimensao label="Largura" chave="largura" />
        <CampoDimensao label="Altura" chave="altura" />
        <CampoDimensao label="Profundidade" chave="profundidade" />

        <PainelVaoSelecionado vaoSelecionado={vaoSelecionado} />

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded py-2 font-medium"
        >
          {salvando ? "Salvando..." : "Salvar móvel"}
        </button>

        {mensagem && (
          <p className={`text-sm mt-2 ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-600"}`}>
            {mensagem.texto}
          </p>
        )}
      </div>

      <div className="flex-1">
        <Cena vaoSelecionado={vaoSelecionado} onSelecionarVao={setVaoSelecionado} />
      </div>
    </div>
  );
}