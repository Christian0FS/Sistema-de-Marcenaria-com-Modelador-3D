// Funções puras de apresentação do editor (Fase 3.2/3.3).
// Nada de React/Three: testável com Jest puro.

/** Número de apresentação: no máximo 1 casa decimal, sem zeros à direita. */
export function formatarMedida(valor, casas = 1) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  const arredondado = Math.round(n * 10 ** casas) / 10 ** casas;
  return String(arredondado);
}

/**
 * Rótulo legível de divisória a partir da ordem e do eixo.
 * "Divisória 1 (vertical)", "Divisória 2 (horizontal)"...
 */
export function rotuloDivisoria(divisao, indice) {
  const eixos = { vertical: "vertical", horizontal: "horizontal", frontal: "frontal" };
  const eixo = eixos[divisao?.eixo] || divisao?.eixo || "";
  return `Divisória ${indice + 1}${eixo ? ` (${eixo})` : ""}`;
}

const LADOS_VAO = {
  esquerda: "vão esquerdo",
  direita: "vão direito",
  superior: "vão superior",
  inferior: "vão inferior",
  frente: "vão frontal",
  fundo: "vão do fundo",
};

/** Extrai a posição do vão a partir do id composto `div-xxxx-superior`. */
export function posicaoDoVao(vaoId) {
  if (!vaoId || vaoId === "raiz") return null;
  const partes = String(vaoId).split("-");
  const ultimo = partes[partes.length - 1];
  return LADOS_VAO[ultimo] || null;
}

/**
 * Rótulo legível de interno (prateleira/gaveteiro).
 * "Prateleira 2 · vão direito", "Gaveteiro (3 gavetas) · vão superior".
 */
export function rotuloInterno(interno, indice, contexto = {}) {
  const posicao = posicaoDoVao(interno?.vao_id);
  const sufixo = posicao ? ` · ${posicao}` : "";
  if (interno?.tipo === "gaveteiro") {
    const n = Number(interno?.num_gavetas) || 0;
    return `Gaveteiro${n ? ` (${n} gavetas)` : ""}${sufixo}`;
  }
  return `Prateleira ${indice + 1}${sufixo}`;
}

/**
 * Rótulo legível de porta: "Porta de giro · vão direito" etc.
 */
export function rotuloPorta(porta, indice) {
  const tipos = { giro: "de giro", corredica: "de correr", bascula: "basculante" };
  const tipo = tipos[porta?.tipo] || porta?.tipo || "";
  const posicao = posicaoDoVao(porta?.vaoId);
  const sufixo = posicao ? ` · ${posicao}` : "";
  return `Porta ${tipo}${sufixo}`.trim();
}

/**
 * Nome de peça avulsa duplicada: sequencial, sem "(cópia)".
 * "Peça avulsa 2" quando já existe "Peça avulsa"/"Peça avulsa 1".
 */
export function nomeDaDuplicata(pecasExistentes) {
  const base = "Peça avulsa";
  const usados = new Set((pecasExistentes || []).map((p) => p?.nome));
  for (let n = (pecasExistentes || []).length + 1; n < 1000; n += 1) {
    const candidato = `${base} ${n}`;
    if (!usados.has(candidato)) return candidato;
  }
  return `${base} ${Date.now()}`;
}
