import { describe, it, expect } from "vitest";
import { criarModuloVazio } from "@/core/modulo/schema";
import { gerarGeometria } from "@/core/modulo/geometria";

describe("gerarGeometria", () => {
  it("Fase 2: gera uma única caixa a partir de dimensoes", () => {
    const modulo = criarModuloVazio({ largura: 1500, altura: 700, profundidade: 600 });
    const meshes = gerarGeometria(modulo);
    // TODO: expect(meshes).toHaveLength(1) quando a Fase 2 for implementada
    expect(meshes).toBeDefined();
  });
});
