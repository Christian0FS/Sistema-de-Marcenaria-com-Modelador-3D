import {
  escurecerCor,
  indiceDeChapas,
  corDaPeca,
  resolverChapaId,
  aplicarHerancaCasco,
} from "./logicaChapas";

describe("escurecerCor", () => {
  test("escurece ~20% por padrão", () => {
    // #c8a882 = (200,168,130); 20% mais escuro = (160,134,104) = #a08668
    expect(escurecerCor("#c8a882")).toBe("#a08668");
  });
  test("aceita hex de 3 dígitos e fator customizado", () => {
    expect(escurecerCor("#fff", 0.5)).toBe("#808080");
  });
  test("não passa de preto", () => {
    expect(escurecerCor("#000000", 0.2)).toBe("#000000");
  });
});

describe("resolverChapaId (herança do casco)", () => {
  test("chapa própria vence", () => {
    expect(resolverChapaId("a", "b")).toBe("a");
  });
  test("herda do casco quando própria é vazia", () => {
    expect(resolverChapaId(null, "b")).toBe("b");
    expect(resolverChapaId("", "b")).toBe("b");
  });
  test("sem nenhuma, fica nulo", () => {
    expect(resolverChapaId(null, null)).toBeNull();
  });
});

describe("corDaPeca", () => {
  const chapas = [
    { id: "c1", nome: "Branco", cor: "#ffffff" },
    { id: "c2", nome: "Nogueira", cor: "#8b5a2b" },
  ];
  const indice = indiceDeChapas(chapas);

  test("usa a chapa da peça quando tem", () => {
    const r = corDaPeca({ chapaId: "c2" }, "c1", indice);
    expect(r.cor).toBe("#8b5a2b");
    expect(r.veio).toBe("#6f4822"); // 20% mais escuro (139 arredonda para baixo)
  });
  test("herda a do casco quando a peça não tem", () => {
    const r = corDaPeca({}, "c1", indice);
    expect(r.cor).toBe("#ffffff");
    expect(r.veio).toBe("#cccccc");
  });
  test("sem chapa em lugar nenhum devolve nulos (usa cor do módulo)", () => {
    const r = corDaPeca({}, null, indice);
    expect(r.cor).toBeNull();
    expect(r.chapa).toBeNull();
  });
});

describe("aplicarHerancaCasco", () => {
  test("propaga o chapaId do casco para divisões, internos, portas e peças", () => {
    const estrutura = {
      casco: { chapaId: "casco-1", espessura: 15 },
      divisoes: [{ id: "d1", chapaId: null }],
      internos: [{ id: "i1" }],
      portas: [{ id: "p1", chapaId: "porta-1" }],
      pecas: [{ id: "pa1", chapaId: "" }],
    };
    const resultado = aplicarHerancaCasco(estrutura);
    expect(resultado.divisoes[0].chapaId).toBe("casco-1");
    expect(resultado.internos[0].chapaId).toBe("casco-1");
    expect(resultado.portas[0].chapaId).toBe("porta-1"); // própria vence
    expect(resultado.pecas[0].chapaId).toBe("casco-1");
  });
});
