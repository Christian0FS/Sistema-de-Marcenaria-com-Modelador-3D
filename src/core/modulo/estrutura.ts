import type { Estrutura, Divisao, Interno, Porta } from "./schema";

// Fase 4. Operações de edição da árvore (adicionar/remover divisão,
// interno, porta) e validação de consistência (ex: interno não pode
// ficar fora dos limites da divisão que o contém).

export function adicionarDivisao(estrutura: Estrutura, divisao: Divisao): Estrutura {
  return { ...estrutura, divisoes: [...estrutura.divisoes, divisao] };
}

export function adicionarInterno(estrutura: Estrutura, interno: Interno): Estrutura {
  return { ...estrutura, internos: [...estrutura.internos, interno] };
}

export function adicionarPorta(estrutura: Estrutura, porta: Porta): Estrutura {
  return { ...estrutura, portas: [...estrutura.portas, porta] };
}
