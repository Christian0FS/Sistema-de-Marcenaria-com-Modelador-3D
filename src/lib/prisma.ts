import { PrismaClient } from "@prisma/client";

// Singleton para evitar exaustão do connection pool em dev (hot reload do
// Next.js) — problema já enfrentado no Caderno de Estudos com Prisma + Neon.
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
