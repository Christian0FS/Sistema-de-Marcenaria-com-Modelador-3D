// Schema da árvore do módulo. Nasce assim na Fase 2 e GANHA campos nas
// fases seguintes — nunca muda de formato, só cresce. Isso é o contrato
// entre Etapa 1 e Etapa 2 mencionado no guia.

export interface Dimensoes {
  largura: number;
  altura: number;
  profundidade: number;
}

// Fase 2: vazio. Fase 4: preenchido.
export interface Divisao { id: string; posicao: number; eixo: "x" | "y" | "z"; }
export interface Interno { id: string; tipo: "gaveta" | "prateleira" | "aramado"; posicaoY: number; }
export interface Porta { id: string; tipo: "giro" | "corrediça" | "báscula"; largura: number; }

export interface Estrutura {
  divisoes: Divisao[];
  internos: Interno[];
  portas: Porta[];
}

// Fase 2: só cor_padrao. Fase 4: material_por_peca.
export interface Aparencia {
  cor_padrao: string;
  material_por_peca?: Record<string, { materialId: string; texturaUrl?: string }>;
}

export interface Modulo {
  modulo_id: string;
  dimensoes: Dimensoes;
  estrutura: Estrutura;
  aparencia: Aparencia;
}

export function criarModuloVazio(dimensoes: Dimensoes): Modulo {
  return {
    modulo_id: crypto.randomUUID(),
    dimensoes,
    estrutura: { divisoes: [], internos: [], portas: [] },
    aparencia: { cor_padrao: "branco" },
  };
}
