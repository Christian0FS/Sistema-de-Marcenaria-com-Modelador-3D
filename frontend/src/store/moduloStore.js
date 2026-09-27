import create from "zustand";

function idCurto() {
    return Math.random().toString(36).slice(2, 10);
}

export const useModuloStore = create((set, get) => ({
    projetoId: null,
    modulo: {
        modulo_id: null,
        nome: "Novo Móvel",
        dimensoes: { largura: 1500, altura: 700, profundidade: 600 },
        estrutura: { divisoes: [], internos: [], portas: [] },
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

    carregarModulo: (modulo) => set({ modulo }),

    adicionarDivisao: (vaoPai, eixo, posicao) =>
        set((state) => {
            const novaDivisao = {
                id: `div-${idCurto()}`,
                vao_pai: vaoPai === "raiz" ? null : vaoPai,
                eixo,
                posicao,
            };
            return {
                modulo: {
                    ...state.modulo,
                    estrutura: {
                        ...state.modulo.estrutura,
                        divisoes: [...state.modulo.estrutura.divisoes, novaDivisao],
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
                ...(tipo === "prateleira" ? { posicao_relativa: opcoes.posicaoRelativa ?? 0.5 } : {}),
                ...(tipo === "gaveteiro" ? { num_gavetas: opcoes.numGavetas ?? 3 } : {}),
            };

            const internosSemEsseVao = state.modulo.estrutura.internos.filter(
                (i) => i.vao_id !== vaoId
            );

            return {
                modulo: {
                    ...state.modulo,
                    estrutura: {
                        ...state.modulo.estrutura,
                        internos: [...internosSemEsseVao, novoInterno],
                    },
                },
            };
        }),

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

    payloadParaApi: () => {
        const { nome, dimensoes, estrutura, aparencia } = get().modulo;
        return { nome, dimensoes, estrutura, aparencia };
    },
}));