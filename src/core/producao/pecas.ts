import type { Modulo } from "../modulo/schema";

export interface Peca {
  id: string;
  tipo: string; // "lateral" | "prateleira" | "porta" | ...
  largura: number;
  altura: number;
  material: string;
}

// Fase 5. Deriva a lista de peças físicas a partir da árvore do módulo —
// mesma fonte de dados usada por gerarGeometria, mas para fins de produção
// (corte) em vez de renderização.
export function gerarPecas(modulo: Modulo): Peca[] {
  // TODO: percorrer estrutura + aparencia.material_por_peca
  return [];
}
