import type { Peca } from "./pecas";

export interface ChapaLayout {
  chapaId: string;
  material: string;
  aproveitamentoPercentual: number;
  posicoes: Array<{ pecaId: string; x: number; y: number; rotacionado: boolean }>;
}

// Fase 5. Guillotine Best-Area-Fit — reaproveitar do projeto de carpintaria
// anterior. Recebe peças agrupadas por material e devolve o layout por chapa.
export function empacotar(pecas: Peca[], chapaLargura: number, chapaAltura: number): ChapaLayout[] {
  // TODO: portar algoritmo Guillotine BAF
  return [];
}
