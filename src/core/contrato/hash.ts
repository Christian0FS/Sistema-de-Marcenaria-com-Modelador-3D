import { createHash } from "crypto";

// Fase 5: hash SHA-256 do PDF final, para integridade do contrato assinado.
export function hashSha256(bufferPdf: Buffer): string {
  return createHash("sha256").update(bufferPdf).digest("hex");
}
