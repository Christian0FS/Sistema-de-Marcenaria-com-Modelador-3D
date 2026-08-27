# Marcenaria 3D — Sistema de Orçamento e Produção

Sistema web para marcenaria: cadastro de clientes/projetos, modelador 3D de móveis,
orçamento, plano de corte e contrato. Construído em 2 etapas / 6 fases (ver `docs/guia-fases.md`).

## Stack
- Next.js 14+ (App Router, TypeScript) — front-end e API routes no mesmo app
- PostgreSQL + Prisma — persistência, módulo salvo como JSONB
- @react-three/fiber + drei — modelador 3D
- dnd-kit — Kanban
- Zustand — estado do editor 3D no client
- BullMQ + Redis (Fase 6) — fila para render com IA

## Princípio arquitetural
Toda a lógica que NÃO depende de UI, banco ou Next fica em `src/core/`:
geração de geometria 3D, geração de peças, bin packing, cálculo de custo,
exportação DXF/Excel, hash/assinatura de contrato. São funções puras,
testadas isoladamente em `tests/core/`, chamadas tanto pelas API routes
quanto (futuramente) por scripts de exportação em lote.

Isso é o que permite a Etapa 2 evoluir a Etapa 1 sem reescrever nada:
o schema do módulo (JSONB) nasce completo na Fase 1, só a interface
que é simples no começo.

## Pastas
Ver `docs/arquitetura.md` para o detalhamento de cada camada.
