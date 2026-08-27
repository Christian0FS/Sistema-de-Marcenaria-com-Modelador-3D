// Fase 3: template fixo (nome, valor, forma de pagamento) → HTML → PDF.
// Fase 5: campos editáveis destacados.
export function renderizarContratoHtml(dados: { nomeCliente: string; valor: number; formaPagamento: string }): string {
  return `<html><body><h1>Contrato</h1>...</body></html>`;
}
