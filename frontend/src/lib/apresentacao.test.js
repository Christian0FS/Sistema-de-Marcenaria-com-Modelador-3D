 import {
  formatarMedida,
  rotuloDivisoria,
  rotuloInterno,
  rotuloPorta,
  nomeDaDuplicata,
  posicaoDoVao,
} from "./apresentacao";

describe("formatarMedida", () => {
  test("máximo 1 casa decimal, sem zeros à direita", () => {
    expect(formatarMedida(1176.5)).toBe("1176.5");
    expect(formatarMedida(1003.52)).toBe("1003.5");
    expect(formatarMedida(900)).toBe("900");
    expect(formatarMedida(900.0)).toBe("900");
  });
  test("protege NaN e vazio", () => {
    expect(formatarMedida(NaN)).toBe("—");
    expect(formatarMedida(undefined)).toBe("—");
  });
});

describe("rotuloDivisoria", () => {
  test("usa ordem e eixo, nunca o id", () => {
    expect(rotuloDivisoria({ eixo: "vertical" }, 0)).toBe("Divisória 1 (vertical)");
    expect(rotuloDivisoria({ eixo: "horizontal" }, 1)).toBe("Divisória 2 (horizontal)");
  });
});

describe("rotuloInterno", () => {
  test("prateleira com posição do vão derivada do id", () => {
    expect(rotuloInterno({ tipo: "prateleira", vao_id: "div-abc-direita" }, 1))
      .toBe("Prateleira 2 · vão direito");
  });
  test("gaveteiro com número de gavetas", () => {
    expect(rotuloInterno({ tipo: "gaveteiro", vao_id: "raiz", num_gavetas: 3 }, 0))
      .toBe("Gaveteiro (3 gavetas)");
  });
  test("vão raiz não mostra sufixo", () => {
    expect(rotuloInterno({ tipo: "prateleira", vao_id: "raiz" }, 0)).toBe("Prateleira 1");
  });
});

describe("rotuloPorta", () => {
  test("tipo legível e posição", () => {
    expect(rotuloPorta({ tipo: "giro", vaoId: "div-x-esquerda" }, 0))
      .toBe("Porta de giro · vão esquerdo");
    expect(rotuloPorta({ tipo: "corredica", vaoId: "raiz" }, 0)).toBe("Porta de correr");
  });
});

describe("nomeDaDuplicata", () => {
  test("sequencial sem '(cópia)'", () => {
    expect(nomeDaDuplicata([{ nome: "Peça avulsa 1" }])).toBe("Peça avulsa 2");
    expect(nomeDaDuplicata([{ nome: "Peça avulsa 1" }, { nome: "Peça avulsa 2" }]))
      .toBe("Peça avulsa 3");
  });
  test("não repete nome existente", () => {
    const nomes = [{ nome: "Peça avulsa 1" }, { nome: "Peça avulsa 2" }, { nome: "Rodapé" }];
    const nome = nomeDaDuplicata(nomes);
    expect(nomes.map((n) => n.nome)).not.toContain(nome);
  });
});

describe("posicaoDoVao", () => {
  test("extrai o lado do id composto", () => {
    expect(posicaoDoVao("div-abc-superior")).toBe("vão superior");
    expect(posicaoDoVao("raiz")).toBeNull();
  });
});
