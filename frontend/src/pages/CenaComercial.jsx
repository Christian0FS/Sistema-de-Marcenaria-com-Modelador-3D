// Cena comercial (5.4): visualização do projeto em ambiente/cenário com props e câmeras pré-definidas.
import React, { useCallback, useRef, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Carregando, Erro } from "../components/ui";
import { LISTA_CENARIOS, configDoCenario, idCenarioValido } from "../lib/cenarios";
import CenaComercial3D from "../three/CenaComercial3D";

const CAMERAS = [
    { id: "frontal", nome: "Frontal" },
    { id: "tres_quartos", nome: "3/4" },
    { id: "detalhe", nome: "Detalhe" },
    { id: "topo", nome: "Topo" },
];

const PAREDES = [
    { cor: "#efe9e0", nome: "Bege claro" },
    { cor: "#e4ded2", nome: "Areia" },
    { cor: "#dfe4e8", nome: "Azul acinzentado" },
    { cor: "#f2ede4", nome: "Off-white" },
];

const CHAOS = [
    { cor: "#c9b8a3", nome: "Madeira clara" },
    { cor: "#8d6e4c", nome: "Madeira escura" },
    { cor: "#b8b2a8", nome: "Cimento" },
    { cor: "#9aa3a8", nome: "Grafite" },
];

export default function CenaComercial() {
    const { projetoId } = useParams();
    const history = useHistory();
    const [projeto, setProjeto] = useState(null);
    const [erro, setErro] = useState("");
    const [camera, setCamera] = useState("tres_quartos");
    const [parede, setParede] = useState(PAREDES[0].cor);
    const [chao, setChao] = useState(CHAOS[0].cor);
    const [espacamento, setEspacamento] = useState(30);
    const [cenario, setCenario] = useState("neutro");
    const [props, setProps] = useState({ planta: true, cortina: true, tapete: true });
    const gatilhoCaptura = useRef(null);
    const [, forcarRender] = useState(0);

    React.useEffect(() => {
        let ativo = true;
        api.buscarProjeto(projetoId)
            .then((dados) => {
                if (!ativo) return;
                setProjeto(dados);
                const id = dados.cenario || "neutro";
                setCenario(id);
                const config = configDoCenario(id);
                setChao(config.chao);
                setParede(config.parede);
                setProps({ ...props, ...config.props });
            })
            .catch((e) => { if (ativo) setErro(e.message || "Falha ao carregar o projeto."); });
        return () => { ativo = false; };
    }, [projetoId]);

    async function trocarCenario(id) {
        if (!idCenarioValido(id)) return;
        setCenario(id);
        const config = configDoCenario(id);
        setChao(config.chao);
        setParede(config.parede);
        setProps({ ...props, ...config.props });
        try {
            await api.atualizarStatusProjeto(projetoId, undefined, id);
        } catch {
            /* a escolha visual fica mesmo se o salvar falhar */
        }
    }

    const capturar = useCallback(() => {
        gatilhoCaptura.current = { nomeArquivo: `cenario-${projetoId}-${Date.now()}.png`, quando: Date.now() };
        forcarRender((n) => n + 1);
    }, [projetoId]);

    if (erro) {
        return (
            <main className="p-4">
                <p role="alert" className="mb-3 text-sm text-red-700">{erro}</p>
                <button type="button" onClick={() => history.goBack()} className="text-sm text-blue-700">Voltar</button>
            </main>
        );
    }
    if (!projeto) return <p className="p-4 text-sm text-gray-500">Carregando cenário...</p>;

    const modulos = (projeto.modulos || []).filter((m) => m.dimensoes);

    return (
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <button type="button" onClick={() => history.push(`/projetos/${projetoId}`)}
                        className="text-sm font-medium text-blue-700 hover:text-blue-900">
                        ← Projeto
                    </button>
                    <h1 className="mt-2 text-2xl font-semibold text-gray-900">Visualização em cenário</h1>
                    <p className="mt-1 text-sm text-gray-500">{projeto.nome} · {modulos.length} módulo(s)</p>
                </div>
                <button type="button" onClick={capturar}
                    className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
                    Exportar imagem (PNG)
                </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                <div className="h-[420px] overflow-hidden rounded-lg border border-gray-200 bg-white sm:h-[560px]">
                    <CenaComercial3D
                        modulos={modulos}
                        espacamento={espacamento}
                        chao={chao}
                        parede={parede}
                        camera={camera}
                        props={props}
                        gatilhoCaptura={gatilhoCaptura.current}
                    />
                </div>

                <aside className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
                    <div>
                        <h2 className="mb-2 font-semibold text-gray-800">Câmeras</h2>
                        <div className="flex flex-wrap gap-2">
                            {CAMERAS.map((item) => (
                                <button key={item.id} type="button"
                                    onClick={() => setCamera(item.id)}
                                    className={`rounded border px-2 py-1 text-xs ${camera === item.id ? "border-blue-700 bg-blue-50 text-blue-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                                    {item.nome}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="block text-gray-700">
                        Cenário
                        <select
                            value={cenario}
                            onChange={(e) => trocarCenario(e.target.value)}
                            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5"
                        >
                            {LISTA_CENARIOS.map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-gray-700">
                        Parede
                        <select value={parede} onChange={(e) => setParede(e.target.value)}
                            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5">
                            {PAREDES.map((item) => (
                                <option key={item.cor} value={item.cor}>{item.nome}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-gray-700">
                        Chão
                        <select value={chao} onChange={(e) => setChao(e.target.value)}
                            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5">
                            {CHAOS.map((item) => (
                                <option key={item.cor} value={item.cor}>{item.nome}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-gray-700">
                        Espaçamento entre módulos (mm)
                        <input type="number" min="0" max="300" step="10" value={espacamento}
                            onChange={(e) => setEspacamento(Number(e.target.value) || 0)}
                            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1.5" />
                    </label>
                    <div>
                        <h2 className="mb-2 font-semibold text-gray-800">Props de escala</h2>
                        {[["planta", "Planta"], ["cortina", "Cortina"], ["tapete", "Tapete"]].map(([chave, nome]) => (
                            <label key={chave} className="flex items-center gap-2 text-gray-700">
                                <input type="checkbox" checked={props[chave]}
                                    onChange={(e) => setProps((atual) => ({ ...atual, [chave]: e.target.checked }))} />
                                {nome}
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500">
                        A iluminação usa HDRI (ambiente de apartamento) para reflexos e luz mais realistas.
                        A imagem exportada sai no ângulo da câmera selecionada.
                    </p>
                </aside>
            </div>
        </main>
    );
}
