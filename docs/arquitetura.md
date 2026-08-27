# Arquitetura

## Camadas

```
src/app/            → rotas (páginas + API routes do Next.js). Fino: só
                       recebe request, valida, chama src/core ou prisma,
                       devolve resposta. Nenhuma regra de negócio mora aqui.

src/components/      → componentes React de apresentação (Kanban, canvas 3D,
                       telas de orçamento/contrato). Consomem src/store e
                       chamam src/app/api via fetch.

src/core/            → NÚCLEO. TypeScript puro, zero dependência de React/Next/
                       Prisma. Cada subpasta corresponde a uma fase do guia:
                         core/modulo       → schema da árvore + gerarGeometria()      (Fase 2 → 4)
                         core/producao     → gerarPecas() + binPacking + custo        (Fase 3 → 5)
                         core/contrato     → template, hash SHA-256, assinatura       (Fase 3 → 5)
                         core/render-ia    → cliente da API de render, fila           (Fase 6)
                       Por ser puro, é testável sem subir banco nem servidor.

src/lib/             → integrações concretas: prisma client singleton, auth
                       (JWT/bcrypt), fila (BullMQ/Redis), storage de arquivos.

src/store/           → estado client-side (Zustand) do editor 3D e do projeto
                       ativo — não é persistência, é estado de UI em memória.

src/types/           → tipos compartilhados entre app/components/core.

prisma/schema.prisma → único ponto de verdade do banco. O campo `estrutura`
                       do model Modulo é Json (JSONB) desde a Fase 1.
```

## Fluxo de dados do módulo 3D

1. Usuário edita dimensões/estrutura no `components/modelador-3d`.
2. `store/moduloStore.ts` guarda o estado local (árvore JSON) e chama
   `core/modulo/geometria.ts::gerarGeometria(estrutura)` a cada mudança,
   que devolve `meshes[]` — o canvas re-renderiza só as peças que mudaram,
   nunca recria a cena inteira.
3. Ao salvar, o app envia a árvore para `app/api/modulos/[id]/estrutura`,
   que persiste no Postgres via Prisma (campo JSONB).
4. Para orçamento/corte, a API chama `core/producao/pecas.ts::gerarPecas(modulo)`
   e depois `core/producao/binPacking.ts` — mesma árvore, sem duplicar dado.

## Mapeamento fase → pasta

| Fase | Onde é implementada |
|---|---|
| 1. Fundação | `app/(dashboard)/kanban`, `app/api/clientes`, `app/api/projetos`, `lib/auth.ts` |
| 2. Modelador mínimo | `components/modelador-3d/canvas`, `core/modulo/schema.ts`, `core/modulo/geometria.ts` |
| 3. Orçamento simples | `core/producao/custo.ts` (versão simplificada), `core/contrato/template.ts`, `components/contrato` |
| 4. Estrutura + Aparência | `core/modulo/estrutura.ts` (divisões/internos/portas), `components/modelador-3d/pecas`, catálogo de materiais em `prisma/schema.prisma` |
| 5. Produção completa | `core/producao/pecas.ts`, `core/producao/binPacking.ts`, `core/producao/maquinas/*`, `app/api/exportacao/*` |
| 6. IA e exclusivos | `core/render-ia`, `components/modelador-3d/ambiente`, `components/manual-montagem`, `app/manual/[token]` |
