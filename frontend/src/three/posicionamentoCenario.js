// Funções puras de posicionamento do cenário comercial (Fase 5.4).
// Trabalham em milímetros, no plano XZ (y é a altura). Todos os módulos do
// cenário têm a base em y = 0, então a colisão só depende do retângulo XZ.
//
// Convenção de caixa: { minX, maxX, minZ, maxZ } em mm.

const FOLGA_PAREDE_MM = 50;      // cortina atrás do fundo dos móveis
const ELEVAO_TAPETE_M = 0.001;   // 1 mm acima do piso, evita z-fighting
const MARGEM_TAPETE_MM = 300;    // tapete maior que a área dos móveis

/**
 * Caixa XZ (em mm) de um módulo posicionado com o CENTRO em (centroX, centroZ).
 * CaixaModulo é centrado em X e Z, então o cenário também deve usar o centro.
 */
export function caixaDoModulo(modulo, centroX, centroZ = 0) {
  const largura = Number(modulo?.dimensoes?.largura) || 0;
  const profundidade = Number(modulo?.dimensoes?.profundidade) || 0;
  return {
    minX: centroX - largura / 2,
    maxX: centroX + largura / 2,
    minZ: centroZ - profundidade / 2,
    maxZ: centroZ + profundidade / 2,
  };
}

/** Interceptação AABB em XZ (bordas encostadas NÃO contam como sobreposição). */
export function caixasSeInterceptam(a, b) {
  return (
    a.minX < b.maxX && b.minX < a.maxX &&
    a.minZ < b.maxZ && b.minZ < a.maxZ
  );
}

/** Caixa que contém todas as caixas (área total ocupada). */
export function caixaEnvolvente(caixas) {
  if (!caixas.length) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  }
  return {
    minX: Math.min(...caixas.map((c) => c.minX)),
    maxX: Math.max(...caixas.map((c) => c.maxX)),
    minZ: Math.min(...caixas.map((c) => c.minZ)),
    maxZ: Math.max(...caixas.map((c) => c.maxZ)),
  };
}

/**
 * Enfileira os módulos lado a lado ao longo de X, encostados (folga configurável).
 * Retorna as posições de CENTRO de cada módulo; a fileira inteira fica centrada em X = 0.
 * Garante que nenhuma caixa se intercepta: se a posição pedida colide com os já
 * posicionados, o módulo é empurrado para o lado livre mais próximo.
 */
export function enfileirarModulos(modulos, folgaMm = 0) {
  const folga = Math.max(0, Number(folgaMm) || 0);
  const posicionados = []; // { modulo, centroX, caixa }

  for (const modulo of modulos || []) {
    const largura = Number(modulo?.dimensoes?.largura) || 0;
    const meiaLargura = largura / 2;

    // posição candidata: borda direita do módulo mais à direita até agora
    let centroX;
    if (posicionados.length === 0) {
      centroX = 0;
    } else {
      const ultima = posicionados[posicionados.length - 1];
      centroX = ultima.caixa.maxX + meiaLargura + folga;
    }

    const caixa = caixaDoModulo(modulo, centroX, 0);

    // resolve colisão: empurra para o lado livre mais próximo
    let caixaFinal = caixa;
    let centroFinal = centroX;
    if (posicionados.some((p) => caixasSeInterceptam(p.caixa, caixa))) {
      const env = caixaEnvolvente(posicionados.map((p) => p.caixa));
      // ambos os lados já deslocados pela folga
      const candidatoEsquerda = env.minX - meiaLargura - folga;
      const candidatoDireita = env.maxX + meiaLargura + folga;
      if (Math.abs(candidatoEsquerda) <= Math.abs(candidatoDireita)) {
        centroFinal = candidatoEsquerda;
      } else {
        centroFinal = candidatoDireita;
      }
      caixaFinal = caixaDoModulo(modulo, centroFinal, 0);
    }

    posicionados.push({ modulo, centroX: centroFinal, caixa: caixaFinal });
  }

  // centraliza a fileira inteira em X = 0
  if (posicionados.length) {
    const env = caixaEnvolvente(posicionados.map((p) => p.caixa));
    const deslocamento = -(env.minX + env.maxX) / 2;
    for (const p of posicionados) {
      p.centroX += deslocamento;
      p.caixa = caixaDoModulo(p.modulo, p.centroX, 0);
    }
  }

  return posicionados;
}

/**
 * Posição e dimensões (em mm; a conversão para metros fica no componente) dos adereços.
 * A parede de fundo fica em z = -profundidadeParedeMm (cenário aponta o fundo para -Z).
 */
export function posicionarAderecos(caixasModulos, { paredeZ = -2000 } = {}) {
  const area = caixaEnvolvente(caixasModulos);
  const larguraFileira = area.maxX - area.minX;
  const profundidadeMaxima = area.maxZ - area.minZ;
  const centroX = (area.minX + area.maxX) / 2;
  const centroZ = (area.minZ + area.maxZ) / 2;
  const larguraSala = Math.max(larguraFileira + 2000, 4000); // pelo menos 2 m de cada lado

  // ---- Cortina: plano vertical paralelo à parede de fundo, atrás dos móveis,
  //      100 mm mais estreita que a parede para nunca “sair” por trás dela ----
  const fundoMaisSaliente = area.minZ; // menor z = mais para trás
  const cortinaZ = Math.min(paredeZ + FOLGA_PAREDE_MM, fundoMaisSaliente - FOLGA_PAREDE_MM);
  const cortina = {
    x: centroX,
    z: cortinaZ,
    largura: Math.max(Math.min(larguraFileira + 800, larguraSala - 200), 600),
  };

  // ---- Tapete: deitado no piso, sob os móveis, maior que a fileira com margem ----
  const tapete = {
    x: centroX,
    z: centroZ,
    largura: larguraFileira + 2 * MARGEM_TAPETE_MM,
    profundidade: profundidadeMaxima + 2 * MARGEM_TAPETE_MM,
    y: ELEVAO_TAPETE_M, // 1 mm acima do piso
  };

  // ---- Planta: fora da área dos módulos, à direita da fileira ----
  const planta = {
    x: area.maxX + 500, // 500 mm de folga da borda da fileira
    z: centroZ,
  };

  return { cortina, tapete, planta, area, larguraSala };
}
