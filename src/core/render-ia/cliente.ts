// Fase 6: cliente da API de render fotorrealista. Recebe a captura da cena
// WebGL (dataURL/base64) e dispara o job assíncrono (fila + polling/webhook).
export async function solicitarRender(imagemBase64: string): Promise<{ jobId: string }> {
  // TODO
  return { jobId: crypto.randomUUID() };
}
