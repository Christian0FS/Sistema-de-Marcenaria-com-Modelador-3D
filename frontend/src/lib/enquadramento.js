/**
 * Distância da câmera para enquadrar um bounding box (função pura, Fase 2.2).
 * Recebe dimensões em metros e o FOV vertical em graus.
 */
export function distanciaParaEnquadrar(larguraM, alturaM, fovGraus = 45, margem = 1.15) {
  const maiorDimensao = Math.max(larguraM, alturaM);
  if (!Number.isFinite(maiorDimensao) || maiorDimensao <= 0) return 2;
  const meiaAbertura = (fovGraus * Math.PI) / 180 / 2;
  return ((maiorDimensao / 2) * margem) / Math.tan(meiaAbertura);
}
