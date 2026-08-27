// Fase 1: JWT + bcrypt, mesmo padrão usado no Caderno de Estudos.
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function hashSenha(senha: string) {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(senha: string, hash: string) {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}
