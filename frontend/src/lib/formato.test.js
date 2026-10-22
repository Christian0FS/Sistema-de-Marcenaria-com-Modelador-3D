import { formatarBRL, formatarPercentual, distribuirPercentuais } from "./formato";

describe("formatarBRL", () => {
  test("formata em real brasileiro", () => {
    expect(formatarBRL(1234.56)).toContain("1.234,56");
    expect(formatarBRL(1234.56)).toMatch(/R\$/);
  });
  test("zero e nulos viram R$ 0,00", () => {
    expect(formatarBRL(0)).toContain("0,00");
    expect(formatarBRL(null)).toContain("0,00");
    expect(formatarBRL(undefined)).toContain("0,00");
    expect(formatarBRL(NaN)).toContain("0,00");
  });
});

describe("formatarPercentual", () => {
  test("protege divisão por zero e NaN", () => {
    expect(formatarPercentual(10, 0)).toBe("—");
    expect(formatarPercentual(NaN, 100)).toBe("—");
  });
  test("calcula percentual simples", () => {
    expect(formatarPercentual(50, 200)).toBe("25.0%");
  });
});

describe("distribuirPercentuais", () => {
  test("a soma fecha em 100% (último item absorve o arredondamento)", () => {
    const itens = distribuirPercentuais([
      { rotulo: "A", valor: 1 },
      { rotulo: "B", valor: 1 },
      { rotulo: "C", valor: 1 },
    ]);
    const soma = itens.reduce((s, i) => s + i.percentual, 0);
    expect(soma).toBeCloseTo(100, 6);
  });
  test("total zero devolve percentuais 0", () => {
    const itens = distribuirPercentuais([{ rotulo: "A", valor: 0 }]);
    expect(itens[0].percentual).toBe(0);
  });
});
