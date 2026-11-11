import { distanciaParaEnquadrar } from "./enquadramento";

describe("distanciaParaEnquadrar (Fase 2.2 / V4-11)", () => {
  test("módulo de 1,5 m com FOV 45 fica a ~2,1 m", () => {
    // (1.5/2) × 1.15 / tan(22.5°) ≈ 2.08
    const d = distanciaParaEnquadrar(1.5, 1.5, 45);
    expect(d).toBeGreaterThan(1.9);
    expect(d).toBeLessThan(2.3);
  });
  test("módulo maior precisa de mais distância", () => {
    const pequeno = distanciaParaEnquadrar(0.8, 0.8, 45);
    const grande = distanciaParaEnquadrar(2.4, 2.4, 45);
    expect(grande).toBeGreaterThan(pequeno);
  });
  test("dimensões zero devolvem distância mínima segura", () => {
    expect(distanciaParaEnquadrar(0, 0, 45)).toBe(2);
  });
  test("usa a maior dimensão (altura manda num roupeiro alto)", () => {
    const baixo = distanciaParaEnquadrar(1.0, 1.0, 45);
    const alto = distanciaParaEnquadrar(1.0, 2.2, 45);
    expect(alto).toBeGreaterThan(baixo);
  });
});
