import type { Peca } from "./pecas";
import type { ChapaLayout } from "./binPacking";

// Fase 3: cálculo simplificado (área total × preço/m² fixo).
export function calcularCustoSimplificado(pecas: Peca[], precoPorM2: number): number {
  const areaTotalM2 = pecas.reduce((soma, p) => soma + (p.largura * p.altura) / 1_000_000, 0);
  return areaTotalM2 * precoPorM2;
}

// Fase 5: substitui a função acima — chapas + ferragens + fita de borda.
export function calcularCustoReal(layouts: ChapaLayout[], ferragens: number, metrosFitaBorda: number, precoFitaBordaMetro: number) {
  // TODO: preço por chapa usada + ferragens + fita de borda
  return { chapas: 0, ferragens, fitaBorda: metrosFitaBorda * precoFitaBordaMetro, total: 0 };
}
