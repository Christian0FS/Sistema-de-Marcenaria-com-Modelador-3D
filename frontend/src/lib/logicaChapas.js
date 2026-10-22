// Funções puras de chapa (Fase 5): cor de veio derivada e resolução de chapaId.
// Não importam nada do React nem do Three — testáveis com Jest/node puro.

/** Escurece uma cor hex em `fator` (0–1). 0.2 = ~20% mais escura. */
export function escurecerCor(hex, fator = 0.2) {
  const limpo = String(hex || "").replace("#", "");
  const cheio = limpo.length === 3
    ? limpo.split("").map((c) => c + c).join("")
    : limpo.padEnd(6, "0");
  const canais = [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16) || 0);
  const escuros = canais.map((c) => Math.max(0, Math.round(c * (1 - fator))));
  return "#" + escuros.map((c) => c.toString(16).padStart(2, "0")).join("");
}

/** Mapa id -> chapa, para consulta O(1). */
export function indiceDeChapas(chapas = []) {
  return new Map((chapas || []).map((c) => [c.id, c]));
}

/** Cor + veio de uma peça dado seu chapaId, o chapaId do casco e o índice. */
export function corDaPeca(peca, chapaIdDoCasco, indice) {
  const chapa = indice.get(peca?.chapaId || chapaIdDoCasco);
  if (!chapa) {
    return { cor: null, veio: null, chapa: null }; // sem chapa: usa cor do módulo
  }
  const cor = chapa.cor || "#c8a882";
  return {
    cor,
    veio: escurecerCor(cor, 0.2),
    chapa,
  };
}

/**
 * Resolve o chapaId de um item com herança do casco.
 * Regra: chapaId próprio (não nulo/vazio) vence; senão herda do casco; senão null.
 */
export function resolverChapaId(chapaId, chapaIdDoCasco) {
  if (chapaId) return chapaId;
  if (chapaIdDoCasco) return chapaIdDoCasco;
  return null;
}

/** Aplica a herança do casco a todas as coleções de peças de um módulo. */
export function aplicarHerancaCasco(estrutura) {
  if (!estrutura) return estrutura;
  const doCasco = estrutura.casco?.chapaId || null;

  const herdar = (item) => ({
    ...item,
    chapaId: resolverChapaId(item?.chapaId, doCasco),
  });

  return {
    ...estrutura,
    divisoes: (estrutura.divisoes || []).map(herdar),
    internos: (estrutura.internos || []).map(herdar),
    portas: (estrutura.portas || []).map(herdar),
    pecas: (estrutura.pecas || []).map(herdar),
  };
}
