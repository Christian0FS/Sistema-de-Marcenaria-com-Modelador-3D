import { describe, it, expect } from "vitest";
import { hashSha256 } from "@/core/contrato/hash";

describe("hashSha256", () => {
  it("Fase 5: gera hash determinístico do PDF", () => {
    const hash1 = hashSha256(Buffer.from("teste"));
    const hash2 = hashSha256(Buffer.from("teste"));
    expect(hash1).toBe(hash2);
  });
});
