import create from "zustand";
import {
    gerarPrateleiras,
    gerarVaos,
    limitesDivisao,
    reescalarEstrutura,
} from "../three/logicaEstrutura";
import { DEFAULT_FURACAO_32 } from "../three/logicaFabricacao";

const FABRICACAO_INICIAL = {
    furacao32: { ...DEFAULT_FURACAO_32 },
    fitaBorda: {
        padrao: { fitaId: null, espessuraMm: 1 },
        frentes: { fitaId: null, espessuraMm: 2 },
    },
};

function idCurto() {
    return Math.random().toString(36).slice(2, 10);
}

function normalizarEstrutura(e = {}) {
    return {
        ...e,
        divisoes: e.divisoes ?? e["divisões"] ?? [],
        internos: e.internos ?? [],
        portas: e.portas ?? [],
        casco: {
            espessura: e.casco?.espessura ?? 15,
            incluirFundo: e.casco?.incluirFundo ?? true,
            espessuraFundo: e.casco?.espessuraFundo ?? 6,
            chapaId: e.casco?.chapaId ?? null,
            fitaCompleta: e.casco?.fitaCompleta ?? false,
        },
        fabricacao: {
            furacao32: { ...DEFAULT_FURACAO_32, ...(e.fabricacao?.furacao32 || {}) },
            fitaBorda: {
                padrao: { ...FABRICACAO_INICIAL.fitaBorda.padrao, ...(e.fabricacao?.fitaBorda?.padrao || {}) },
                frentes: { ...FABRICACAO_INICIAL.fitaBorda.frentes, ...(e.fabricacao?.fitaBorda?.frentes || {}) },
            },
        },
    };
}

const moduloInicial = () => ({
    modulo_id: null,
    nome: "Novo Móvel",
    dimensoes: { largura: 1500, altura: 700, profundidade: 600 },
    estrutura: {
        divisoes: [],
        internos: [],
        portas: [],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6, chapaId: null },
        fabricacao: FABRICACAO_INICIAL,
    },
    aparencia: { cor: "#e8e4d8", orientacao_fibra: "horizontal" },
});

export const useModuloStore = create((set, get) => ({
    projetoId: null,
    previaDivisao: null,
    setPreviaDivisao: (previaDivisao) => set({ previaDivisao }),
    modulo: {
        modulo_id: null,
        nome: "Novo Móvel",
        dimensoes: { largura: 1500, altura: 700, profundidade: 600 },
        estrutura: {
            divisoes: [],
            internos: [],
            portas: [],
            casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6, chapaId: null },
            fabricacao: FABRICACAO_INICIAL,
        },
        aparencia: { cor: "#e8e4d8", orientacao_fibra: "horizontal" },
    },
    salvando: false,
    ultimoSalvamento: null,
    erroSalvamento: null,

    setProjetoId: (projetoId) => set({ projetoId }),

    setDimensao: (chave, valor) =>
        set((state) => ({
            modulo: { ...state.modulo, dimensoes: { ...state.modulo.dimensoes, [chave]: valor } },
        })),

    setNome: (nome) => set((state) => ({ modulo: { ...state.modulo, nome } })),

    atualizarCasco: (chave, valor) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    casco: { ...state.modulo.estrutura.casco, [chave]: valor },
                },
            },
        })),

    atualizarConfigFabricacao: (secao, chave, valor) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    fabricacao: {
                        ...state.modulo.estrutura.fabricacao,
                        [secao]: {
                            ...state.modulo.estrutura.fabricacao[secao],
                            [chave]: valor,
                        },
                    },
                },
            },
        })),

    resetarModulo: () => set({ modulo: moduloInicial(), previaDivisao: null }),

    carregarModulo: (dados, dimensoesNovas) =>
        set((state) => {
            const dimOriginais = dados.dimensoes ?? null;
            const estruturaBase = normalizarEstrutura(dados.estrutura);
            const dimDestino = dimensoesNovas ?? dimOriginais ?? state.modulo.dimensoes;
            const estrutura =
                dimOriginais && dimensoesNovas
                    ? reescalarEstrutura(estruturaBase, dimOriginais, dimensoesNovas)
                    : estruturaBase;

            return {
                modulo: {
                    ...state.modulo,
                    modulo_id: dados.modulo_id ?? null,
                    nome: dados.nome ?? state.modulo.nome,
                    dimensoes: dimDestino,
                    estrutura,
                    aparencia: dados.aparencia ?? state.modulo.aparencia,
                },
            };
        }),

    adicionarDivisao: (vaoPai, eixo, posicao, espessura = 15) =>
        set((state) => {
            const divisaoId = `div-${idCurto()}`;
            const vaoId = vaoPai || "raiz";
            const dimensoes = state.modulo.dimensoes;
            const vaosAtuais = gerarVaos(
                dimensoes,
                state.modulo.estrutura.divisoes,
                state.modulo.estrutura.casco
            );
            const prateleirasAtuais = gerarPrateleiras(
                vaosAtuais,
                state.modulo.estrutura.internos,
                state.modulo.estrutura.portas
            );
            const vaoPaiAtual = vaosAtuais.find((vao) => vao.id === vaoId);
            const espessuraAtual = Number(espessura) || 15;
            const limites = vaoPaiAtual ? limitesDivisao(vaoPaiAtual, eixo, espessuraAtual) : null;
            const posicaoAtual = limites
                ? Math.min(limites.max, Math.max(limites.min, posicao))
                : posicao;
            const novaDivisao = {
                id: divisaoId,
                vao_pai: vaoPai === "raiz" ? null : vaoPai,
                eixo,
                posicao: posicaoAtual,
                espessura: espessuraAtual,
            };
            const vaosDepoisDaDivisao = gerarVaos(dimensoes, [
                ...state.modulo.estrutura.divisoes,
                novaDivisao,
            ], state.modulo.estrutura.casco);
            const internos = state.modulo.estrutura.internos.map((interno) => {
                if (interno.vao_id !== vaoId || interno.tipo !== "prateleira" || !vaoPaiAtual) {
                    return interno;
                }

                const prateleiraAtual = prateleirasAtuais.find((item) => item.id === interno.id);
                const coordenadaCentro = prateleiraAtual
                    ? eixo === "vertical"
                        ? prateleiraAtual.x + prateleiraAtual.largura / 2
                        : eixo === "horizontal"
                            ? prateleiraAtual.y + prateleiraAtual.altura / 2
                            : prateleiraAtual.z + prateleiraAtual.profundidade / 2
                    : eixo === "vertical"
                        ? vaoPaiAtual.x + vaoPaiAtual.largura / 2
                        : eixo === "horizontal"
                            ? vaoPaiAtual.y + vaoPaiAtual.altura / 2
                            : vaoPaiAtual.z + vaoPaiAtual.profundidade / 2;
                const origemEixo = eixo === "vertical"
                    ? vaoPaiAtual.x
                    : eixo === "horizontal"
                        ? vaoPaiAtual.y
                        : vaoPaiAtual.z;
                const sufixoAntes = eixo === "vertical"
                    ? "esquerda"
                    : eixo === "horizontal"
                        ? "inferior"
                        : "fundo";
                const sufixoDepois = eixo === "vertical"
                    ? "direita"
                    : eixo === "horizontal"
                        ? "superior"
                        : "frente";
                const sufixo = coordenadaCentro < origemEixo + posicaoAtual ? sufixoAntes : sufixoDepois;

                const vaoDestino = vaosDepoisDaDivisao.find((vao) => vao.id === `${divisaoId}-${sufixo}`);
                return {
                    ...interno,
                    vao_id: `${divisaoId}-${sufixo}`,
                    posicaoMm: vaoDestino ? prateleiraAtual.y - vaoDestino.y : interno.posicaoMm,
                };
            });

            return {
                modulo: {
                    ...state.modulo,
                    estrutura: {
                        ...state.modulo.estrutura,
                        divisoes: [...state.modulo.estrutura.divisoes, novaDivisao],
                        internos,
                    },
                },
            };
        }),

    removerDivisao: (divisaoId) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    divisoes: state.modulo.estrutura.divisoes.filter((d) => d.id !== divisaoId),
                },
            },
        })),

    adicionarInterno: (vaoId, tipo, opcoes = {}) =>
        set((state) => {
            const novoInterno = {
                id: `int-${idCurto()}`,
                vao_id: vaoId,
                tipo,
                ...(tipo === "prateleira" ? {
                    ...(opcoes.posicaoMm !== undefined ? { posicaoMm: opcoes.posicaoMm } : {}),
                    espessuraMm: Number(opcoes.espessuraMm) || 15,
                } : {}),
                ...(tipo === "gaveteiro" ? { num_gavetas: opcoes.numGavetas ?? 3 } : {}),
            };

            let internosAtualizados;

            if (tipo === "prateleira") {
                // mantém as prateleiras já existentes nesse vão, só remove gaveteiro se houver
                internosAtualizados = state.modulo.estrutura.internos.filter(
                    (i) => !(i.vao_id === vaoId && i.tipo === "gaveteiro")
                );
            } else {
                // gaveteiro continua exclusivo: substitui qualquer coisa que já exista nesse vão
                internosAtualizados = state.modulo.estrutura.internos.filter(
                    (i) => i.vao_id !== vaoId
                );
            }

            return {
                modulo: {
                    ...state.modulo,
                    estrutura: {
                        ...state.modulo.estrutura,
                        internos: [...internosAtualizados, novoInterno],
                    },
                },
            };
        }),

    atualizarInterno: (internoId, campos) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    internos: state.modulo.estrutura.internos.map((interno) =>
                        interno.id === internoId ? { ...interno, ...campos } : interno
                    ),
                },
            },
        })),

    removerInterno: (internoId) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    internos: state.modulo.estrutura.internos.filter((i) => i.id !== internoId),
                },
            },
        })),
    adicionarPorta: (vaoId, config) =>
        set((state) => {
            const novaPorta = {
                id: crypto.randomUUID(),
                vaoId,
                tipo: config.tipo, // 'giro' | 'corredica' | 'bascula'
                ladoDobradica: config.ladoDobradica ?? null, // 'esquerda' | 'direita' | null
                folga: config.folga ?? 3, // mm
            };

            return {
                modulo: {
                    ...state.modulo,
                    estrutura: {
                        ...state.modulo.estrutura,
                        portas: [...state.modulo.estrutura.portas, novaPorta],
                    },
                },
            };
        }),

    removerPorta: (portaId) =>
        set((state) => ({
            modulo: {
                ...state.modulo,
                estrutura: {
                    ...state.modulo.estrutura,
                    portas: state.modulo.estrutura.portas.filter((p) => p.id !== portaId),
                },
            },
        })),

    atualizarFerragemVinculada: (origemTipo, origemId, necessidade, ferragemId) =>
        set((state) => {
            const chaveColecao = origemTipo === "porta" ? "portas" : "internos";
            const itens = state.modulo.estrutura[chaveColecao].map((item) => {
                if (item.id !== origemId) return item;

                const chaveNecessidade = (ferragem) =>
                    `${ferragem.tipoFerragem}:${ferragem.especificacao || ""}`;
                const ferragensAtuais = (item.ferragens || []).filter(
                    (ferragem) => chaveNecessidade(ferragem) !== chaveNecessidade(necessidade)
                );

                return {
                    ...item,
                    ferragens: [...ferragensAtuais, { ...necessidade, ferragemId: ferragemId || null }],
                };
            });

            return {
                modulo: {
                    ...state.modulo,
                    estrutura: { ...state.modulo.estrutura, [chaveColecao]: itens },
                },
            };
        }),

    vaoTemPorta: (vaoId) => {
        const state = get();
        return state.modulo.estrutura.portas.some((p) => p.vaoId === vaoId);
    },

    payloadParaApi: () => {
        const state = get();
        return {
            nome: state.modulo.nome,
            dimensoes: state.modulo.dimensoes,
            estrutura: {
                ...state.modulo.estrutura,
            },
            aparencia: state.modulo.aparencia,
        };
    },

}));