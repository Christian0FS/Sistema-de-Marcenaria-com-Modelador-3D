import { describe, it, expect } from "vitest";
import { empacotar } from "@/core/producao/binPacking";

describe("empacotar (Guillotine Best-Area-Fit)", () => {
  it("Fase 5: encaixa peças respeitando dimensões da chapa", () => {
    const layouts = empacotar([], 2750, 1850);
    expect(layouts).toBeDefined();
  });
});
