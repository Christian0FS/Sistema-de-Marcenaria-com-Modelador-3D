// Fase 6 — POST: webhook chamado pela API de IA quando o render termina.
export async function GET() {
  return Response.json({ ok: true });
}
