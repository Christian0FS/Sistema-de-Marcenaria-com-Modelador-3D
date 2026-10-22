// Insumos: abas Chapas MDF / Fitas de Borda / Ferragens (Fases 2 e 4).
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import {
  Carregando, Vazio, Erro, BotaoPrimario, BotaoSecundario, classeInput,
} from "../components/ui";
import { IconeEditar, IconeExcluir } from "../components/icone";

const ABAS = [
  { id: "chapas", rotulo: "Chapas MDF" },
  { id: "fitas", rotulo: "Fitas de Borda" },
  { id: "ferragens", rotulo: "Ferragens" },
];

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

// ---------- Formulário de chapa (com cor, Fase 4) ----------
function FormularioChapa({ inicial, aoSalvar, aoCancelar, salvando }) {
  const [nome, setNome] = useState(inicial?.nome || "");
  const [espessura, setEspessura] = useState(inicial?.espessura_mm || 15);
  const [largura, setLargura] = useState(inicial?.largura_mm || 2750);
  const [altura, setAltura] = useState(inicial?.altura_mm || 1850);
  const [preco, setPreco] = useState(inicial?.preco_m2 || 0);
  const [estoque, setEstoque] = useState(inicial?.estoque_chapas || 0);
  const [cor, setCor] = useState(inicial?.cor || "#c8a882");
  const [erro, setErro] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) { setErro("Informe o nome."); return; }
        aoSalvar({
          nome: nome.trim(),
          espessura_mm: Number(espessura),
          largura_mm: Number(largura),
          altura_mm: Number(altura),
          preco_m2: Number(preco),
          estoque_chapas: Number(estoque),
          cor,
        });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium text-app-texto">
        Nome
        <input required value={nome} onChange={(e) => setNome(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-app-texto">
          Espessura (mm)
          <input type="number" min="3" max="50" value={espessura} onChange={(e) => setEspessura(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Estoque (chapas)
          <input type="number" min="0" value={estoque} onChange={(e) => setEstoque(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Largura (mm)
          <input type="number" min="100" value={largura} onChange={(e) => setLargura(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Altura (mm)
          <input type="number" min="100" value={altura} onChange={(e) => setAltura(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-app-texto">
          Preço (R$/m²)
          <input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Cor / Acabamento
          <span className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-app-borda bg-white p-1"
              aria-label="Cor da chapa"
            />
            <code className="text-xs text-app-secundario">{cor}</code>
          </span>
        </label>
      </div>
      <p className="text-xs text-app-secundario">O tom do veio é calculado automaticamente (~20% mais escuro).</p>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <BotaoSecundario onClick={aoCancelar}>Cancelar</BotaoSecundario>
        <BotaoPrimario type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </BotaoPrimario>
      </div>
    </form>
  );
}

// ---------- Formulário de fita ----------
function FormularioFita({ inicial, aoSalvar, aoCancelar, salvando }) {
  const [nome, setNome] = useState(inicial?.nome || "");
  const [cor, setCor] = useState(inicial?.cor || "");
  const [preco, setPreco] = useState(inicial?.preco_metro || 0);
  const [estoque, setEstoque] = useState(inicial?.estoque_metros || 0);
  const [erro, setErro] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) { setErro("Informe o nome."); return; }
        aoSalvar({ nome: nome.trim(), cor: cor || null, preco_metro: Number(preco), estoque_metros: Number(estoque) });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium text-app-texto">
        Nome
        <input required value={nome} onChange={(e) => setNome(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <label className="block text-sm font-medium text-app-texto">
        Cor
        <input value={cor} onChange={(e) => setCor(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-app-texto">
          Preço (R$/m)
          <input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Estoque (m)
          <input type="number" min="0" step="0.1" value={estoque} onChange={(e) => setEstoque(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
      </div>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <BotaoSecundario onClick={aoCancelar}>Cancelar</BotaoSecundario>
        <BotaoPrimario type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </BotaoPrimario>
      </div>
    </form>
  );
}

// ---------- Formulário de ferragem ----------
const TIPOS_FERRAGEM = ["dobradica", "corredica", "puxador", "minifix", "cavilha"];

function FormularioFerragem({ inicial, aoSalvar, aoCancelar, salvando }) {
  const [tipo, setTipo] = useState(inicial?.tipo || "dobradica");
  const [nome, setNome] = useState(inicial?.nome || "");
  const [preco, setPreco] = useState(inicial?.preco_unitario || 0);
  const [estoque, setEstoque] = useState(inicial?.estoque || 0);
  const [erro, setErro] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) { setErro("Informe o nome."); return; }
        aoSalvar({ tipo, nome: nome.trim(), preco_unitario: Number(preco), estoque: Number(estoque) });
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium text-app-texto">
        Tipo
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`mt-1 ${classeInput}`}>
          {TIPOS_FERRAGEM.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-app-texto">
        Nome
        <input required value={nome} onChange={(e) => setNome(e.target.value)} className={`mt-1 ${classeInput}`} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-app-texto">
          Preço (R$/un)
          <input type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
        <label className="block text-sm font-medium text-app-texto">
          Estoque
          <input type="number" min="0" value={estoque} onChange={(e) => setEstoque(e.target.value)} className={`mt-1 ${classeInput}`} />
        </label>
      </div>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <BotaoSecundario onClick={aoCancelar}>Cancelar</BotaoSecundario>
        <BotaoPrimario type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </BotaoPrimario>
      </div>
    </form>
  );
}

export default function Insumos() {
  const location = useLocation();
  const abaInicial = new URLSearchParams(location.search).get("aba");
  const [aba, setAba] = useState(ABAS.some((a) => a.id === abaInicial) ? abaInicial : "chapas");

  const [chapas, setChapas] = useState([]);
  const [fitas, setFitas] = useState([]);
  const [ferragens, setFerragens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(null); // { tipo: 'chapa'|'fita'|'ferragem', dados }
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // { tipo, item, emUso }

  function carregarTudo() {
    return Promise.all([api.listarChapas(), api.listarFitas(), api.listarFerragens()])
      .then(([cs, fs, fgs]) => {
        setChapas(cs);
        setFitas(fs);
        setFerragens(fgs);
      });
  }

  useEffect(() => {
    carregarTudo()
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const rotuloTipo = { chapa: "Chapa", fita: "Fita", ferragem: "Ferragem" };

  async function salvar(dados) {
    setSalvando(true);
    setErro("");
    try {
      const { tipo, dados: item } = editando;
      if (tipo === "chapa") {
        if (item?.id) {
          await api.atualizarChapa(item.id, dados);
          setChapas((atual) => atual.map((c) => (c.id === item.id ? { ...c, ...dados } : c)));
        } else {
          const criada = await api.criarChapa(dados);
          setChapas((atual) => [...atual, criada]);
        }
      } else if (tipo === "fita") {
        if (item?.id) {
          await api.atualizarFita(item.id, dados);
          setFitas((atual) => atual.map((f) => (f.id === item.id ? { ...f, ...dados } : f)));
        } else {
          const criada = await api.criarFita(dados);
          setFitas((atual) => [...atual, criada]);
        }
      } else {
        if (item?.id) {
          await api.atualizarFerragemEstoque(item.id, dados);
          setFerragens((atual) => atual.map((f) => (f.id === item.id ? { ...f, ...dados } : f)));
        } else {
          const criada = await api.criarFerragem(dados);
          setFerragens((atual) => [...atual, criada]);
        }
      }
      setEditando(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!confirmar) return;
    setErro("");
    try {
      const { tipo, item } = confirmar;
      if (tipo === "chapa") {
        await api.excluirChapa(item.id);
        setChapas((atual) => atual.filter((c) => c.id !== item.id));
      } else if (tipo === "fita") {
        await api.excluirFita(item.id);
        setFitas((atual) => atual.filter((f) => f.id !== item.id));
      } else {
        await api.excluirFerragem(item.id);
        setFerragens((atual) => atual.filter((f) => f.id !== item.id));
      }
      setConfirmar(null);
    } catch (e) {
      setErro(e.message);
      setConfirmar(null);
    }
  }

  const listaDaAba = aba === "chapas" ? chapas : aba === "fitas" ? fitas : ferragens;

  if (carregando) return <Carregando texto="Carregando insumos..." />;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Insumos</h1>
          <p className="text-sm text-app-secundario">Chapas, fitas e ferragens usados pelos móveis.</p>
        </div>
        <BotaoPrimario
          onClick={() => setEditando({ tipo: aba.slice(0, -1), dados: null })}
        >
          + Novo
        </BotaoPrimario>
      </header>

      {erro && <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>}

      {/* abas */}
      <div className="mb-4 flex gap-1 border-b border-app-borda">
        {ABAS.map(({ id, rotulo }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setAba(id); setEditando(null); }}
            aria-current={aba === id ? "page" : undefined}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${aba === id
              ? "border-b-2 border-primario bg-white text-primario"
              : "text-app-secundario hover:bg-app-fundo"
              }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-card border border-app-borda bg-white shadow-card">
          {listaDaAba.length === 0 ? (
            <div className="p-6">
              <Vazio titulo="Nenhum item nesta aba" descricao="Use o botão + Novo para cadastrar o primeiro." />
            </div>
          ) : aba === "chapas" ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Espessura</th>
                  <th className="px-4 py-2.5 font-medium">Cor / Acabamento</th>
                  <th className="px-4 py-2.5 font-medium">Preço</th>
                  <th className="px-4 py-2.5 font-medium">Estoque</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {chapas.map((chapa) => (
                  <tr key={chapa.id} className="border-b border-app-borda/60">
                    <td className="px-4 py-2.5 font-medium text-app-texto">{chapa.nome}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{chapa.espessura_mm} mm</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded border border-app-borda"
                          style={{ backgroundColor: chapa.cor || "#c8a882" }}
                          aria-hidden="true"
                        />
                        <code className="text-xs text-app-secundario">{chapa.cor || "—"}</code>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-app-secundario">{formatarMoeda(chapa.preco_m2)}/m²</td>
                    <td className="px-4 py-2.5 text-app-secundario">{chapa.estoque_chapas}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${chapa.nome}`}
                          onClick={() => setEditando({ tipo: "chapa", dados: chapa })}
                          className="rounded p-1.5 text-app-secundario hover:bg-app-fundo hover:text-app-texto"
                        >
                          <IconeEditar tamanho={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${chapa.nome}`}
                          onClick={() => setConfirmar({ tipo: "chapa", item: chapa })}
                          className="rounded p-1.5 text-app-secundario hover:bg-red-50 hover:text-red-700"
                        >
                          <IconeExcluir tamanho={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : aba === "fitas" ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Cor</th>
                  <th className="px-4 py-2.5 font-medium">Preço</th>
                  <th className="px-4 py-2.5 font-medium">Estoque</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fitas.map((fita) => (
                  <tr key={fita.id} className="border-b border-app-borda/60">
                    <td className="px-4 py-2.5 font-medium text-app-texto">{fita.nome}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{fita.cor || "—"}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{formatarMoeda(fita.preco_metro)}/m</td>
                    <td className="px-4 py-2.5 text-app-secundario">{fita.estoque_metros} m</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${fita.nome}`}
                          onClick={() => setEditando({ tipo: "fita", dados: fita })}
                          className="rounded p-1.5 text-app-secundario hover:bg-app-fundo hover:text-app-texto"
                        >
                          <IconeEditar tamanho={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${fita.nome}`}
                          onClick={() => setConfirmar({ tipo: "fita", item: fita })}
                          className="rounded p-1.5 text-app-secundario hover:bg-red-50 hover:text-red-700"
                        >
                          <IconeExcluir tamanho={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-app-borda bg-app-fundo/60 text-xs uppercase tracking-wide text-app-secundario">
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 font-medium">Preço</th>
                  <th className="px-4 py-2.5 font-medium">Estoque</th>
                  <th className="px-4 py-2.5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ferragens.map((ferragem) => (
                  <tr key={ferragem.id} className="border-b border-app-borda/60">
                    <td className="px-4 py-2.5 font-medium text-app-texto">{ferragem.nome}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{ferragem.tipo}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{formatarMoeda(ferragem.preco_unitario)}</td>
                    <td className="px-4 py-2.5 text-app-secundario">{ferragem.estoque}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Editar ${ferragem.nome}`}
                          onClick={() => setEditando({ tipo: "ferragem", dados: ferragem })}
                          className="rounded p-1.5 text-app-secundario hover:bg-app-fundo hover:text-app-texto"
                        >
                          <IconeEditar tamanho={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${ferragem.nome}`}
                          onClick={() => setConfirmar({ tipo: "ferragem", item: ferragem })}
                          className="rounded p-1.5 text-app-secundario hover:bg-red-50 hover:text-red-700"
                        >
                          <IconeExcluir tamanho={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-app-borda px-4 py-2 text-xs text-app-secundario">
            Mostrando {listaDaAba.length} de {listaDaAba.length} {ABAS.find((a) => a.id === aba)?.rotulo.toLowerCase()}
          </div>
        </section>

        {/* painel lateral: formulário */}
        <aside className="rounded-card border border-app-borda bg-white p-4 shadow-card">
          {editando ? (
            <>
              <h2 className="mb-3 font-semibold">
                {editando.dados?.id ? "Editar" : "Novo"} {rotuloTipo[editando.tipo]}
              </h2>
              {editando.tipo === "chapa" && (
                <FormularioChapa inicial={editando.dados} salvando={salvando} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
              )}
              {editando.tipo === "fita" && (
                <FormularioFita inicial={editando.dados} salvando={salvando} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
              )}
              {editando.tipo === "ferragem" && (
                <FormularioFerragem inicial={editando.dados} salvando={salvando} aoSalvar={salvar} aoCancelar={() => setEditando(null)} />
              )}
            </>
          ) : (
            <Vazio titulo="Selecione um item" descricao="Ou cadastre um novo com o botão + Novo." />
          )}
        </aside>
      </div>

      {/* confirmação de exclusão (com aviso de uso) */}
      {confirmar && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-flutuante">
            <h2 className="text-lg font-semibold">Excluir {rotuloTipo[confirmar.tipo].toLowerCase()}</h2>
            {confirmar.tipo === "chapa" && confirmar.emUso && (
              <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
                Esta chapa está em uso por um ou mais móveis. Os móveis continuarão com a referência, mas o item sai do cadastro.
              </p>
            )}
            <p className="mt-2 text-sm text-app-secundario">
              Excluir <strong>{confirmar.item.nome}</strong>?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <BotaoSecundario onClick={() => setConfirmar(null)}>Cancelar</BotaoSecundario>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
