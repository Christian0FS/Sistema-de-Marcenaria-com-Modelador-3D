// Helper único de formatação monetária (Fase 5: usado por todas as telas).
export function formatarBRL(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

/** Percentual protegido: devolve "—" quando a base é 0 ou o valor não é finito. */
export function formatarPercentual(parte, base, casas = 1) {
  const b = Number(base);
  const p = Number(parte);
  if (!Number.isFinite(p) || !Number.isFinite(b) || b === 0) return "—";
  return `${((p / b) * 100).toFixed(casas)}%`;
}

/** Divide percentualmente os custos para a barra empilhada; o último item absorve o arredondamento. */
export function distribuirPercentuais(itens) {
  const total = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  if (total <= 0) return itens.map((i) => ({ ...i, percentual: 0 }));
  const comPercentual = itens.map((i) => ({
    ...i,
    percentual: ((Number(i.valor) || 0) / total) * 100,
  }));
  const soma = comPercentual.reduce((s, i) => s + i.percentual, 0);
  if (comPercentual.length) {
    comPercentual[comPercentual.length - 1].percentual += 100 - soma;
  }
  return comPercentual;
}
