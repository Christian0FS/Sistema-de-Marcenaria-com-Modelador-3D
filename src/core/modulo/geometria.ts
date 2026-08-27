import type { Modulo } from "./schema";

// Fase 2: devolve só a caixa (6 faces) a partir de dimensoes.
// Fase 4: passa a percorrer estrutura.divisoes/internos/portas e gerar
// uma mesh por peça derivada. Função pura — sem THREE.Scene, sem estado.
//
// Chamada pelo store do editor a cada mudança na árvore; o componente
// de canvas (components/modelador-3d/canvas) é quem decide o que
// re-renderizar a partir do retorno.

export interface MeshDescriptor {
  id: string;
  tipo: string;
  posicao: [number, number, number];
  dimensoes: [number, number, number];
  materialId?: string;
}

export function gerarGeometria(modulo: Modulo): MeshDescriptor[] {
  // TODO Fase 2: caixa única a partir de modulo.dimensoes
  // TODO Fase 4: iterar estrutura.divisoes/internos/portas
  return [];
}
