// Registro de cenários do visualizador (Fase 6).
// Cada cenário define piso, parede de fundo, adereços e luz.
// O "Neutro" é o padrão e o único usado pelo mini visualizador.

export const LISTA_CENARIOS = [
  { id: "neutro", nome: "Neutro (estúdio)" },
  { id: "sala", nome: "Sala" },
  { id: "quarto", nome: "Quarto" },
  { id: "cozinha", nome: "Cozinha" },
  { id: "escritorio", nome: "Escritório" },
];

const IDS = new Set(LISTA_CENARIOS.map((c) => c.id));

export function idCenarioValido(id) {
  return IDS.has(String(id || ""));
}

/** Configuração visual de cada cenário (cores hex, adereços e intensidade de luz). */
export const CENARIOS = {
  neutro: {
    cor: "#F6F4F1",
    chao: "#d9d2c7",
    parede: "#f0ece5",
    props: { planta: false, cortina: false, tapete: false },
    luz: 1.0,
  },
  sala: {
    cor: "#EFE9E0",
    chao: "#c9b8a3",
    parede: "#e8e1d5",
    props: { planta: true, cortina: true, tapete: true },
    luz: 1.1,
  },
  quarto: {
    cor: "#F1ECE9",
    chao: "#c8b4a4",
    parede: "#e9e0dd",
    props: { planta: true, cortina: true, tapete: true },
    luz: 0.9,
  },
  cozinha: {
    cor: "#F2F0EC",
    chao: "#b9b2a8",
    parede: "#eceae4",
    props: { planta: true, cortina: false, tapete: false },
    luz: 1.2,
  },
  escritorio: {
    cor: "#EEEDEA",
    chao: "#a8a29a",
    parede: "#e4e2dd",
    props: { planta: true, cortina: false, tapete: true },
    luz: 1.0,
  },
};

export function configDoCenario(id) {
  return CENARIOS[idCenarioValido(id) ? id : "neutro"];
}
