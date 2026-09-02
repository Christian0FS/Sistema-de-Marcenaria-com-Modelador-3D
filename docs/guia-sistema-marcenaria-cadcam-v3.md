# Guia v3: Sistema Web CAD/CAM de Marcenaria Paramétrica e Gestão

> Baseado no texto de Descrição dos Serviços (5 módulos formais do contrato) + nos vídeos de referência. Reorganizado em **fases de construção** (mesmo formato do guia original), já considerando dois pontos novos: (1) o sistema precisa suportar **múltiplos móveis por projeto**, reutilizáveis como biblioteca/catálogo — não só um móvel avulso; (2) existem **dois painéis** separados: o **Painel de Insumos** (onde ele cadastra matéria-prima, ferragens e preços) e o **Painel de Projetos** (onde ele monta os móveis usando esses insumos).

## Os dois painéis, antes de tudo

| Painel | Quem usa | O que faz |
|---|---|---|
| **Painel de Insumos** | Marceneiro/admin | Cadastra chapas de MDF/MDP (dimensões padrão, preço/m²), fitas de borda (preço/metro), ferragens (dobradiças, corrediças, puxadores, minifix, cavilhas — com preço unitário e estoque) |
| **Painel de Projetos** | Marceneiro + cliente | Monta os móveis (CAD 3D), consome os insumos cadastrados no outro painel para calcular custo, corte e produção |

Essa separação é o que permite múltiplos móveis reaproveitarem os mesmos insumos sem recadastrar nada — e é a base de dados que precisa existir desde a Fase 1, mesmo que a interface de cada painel comece simples.

---

## Fase 1 — Fundação: Gestão, Kanban e Painel de Insumos
**O que fazer:**
1. Setup do repositório, ambiente e banco (PostgreSQL, com os insumos em tabelas próprias e os projetos em JSONB — projetos mudam de formato com frequência, insumos não).
2. CRUD de Usuários, Clientes e Projetos. Um Projeto passa a ser um **container de múltiplos móveis** (ex: projeto "Cozinha Dona Maria" contém 5 módulos: bancada, armário aéreo, torre de forno, etc.), não um móvel único.
3. **Painel de Insumos**: CRUD de chapas MDF/MDP (nome, espessura, dimensões da chapa, preço/m²), fitas de borda (cor, preço/m linear), ferragens (tipo, marca, preço unitário, estoque).
4. Kanban com as colunas do texto oficial: **Leads → Orçamentos → Produção → Montagem**.

**Entrega da fase:** login, projeto criado (ainda vazio de móveis), insumos cadastrados no painel próprio, card se move no Kanban.

---

## Fase 2 — Módulo 1: Modelagem 3D Paramétrica (CAD) + Biblioteca de Móveis
**O que fazer:**
1. Canvas 3D interativo no navegador (`@react-three/fiber`) — móvel criado por variáveis de Largura, Altura e Profundidade.
2. Lógica recursiva para divisórias, prateleiras, gaveteiros e portas, com **ajuste automático de vãos e folgas** (ex: ao adicionar uma divisória, os vãos vizinhos recalculam sozinhos, sem o usuário reajustar cada peça manualmente).
3. Mapeamento e aplicação de texturas digitais de padrões MDF/MDP com **controle de orientação da fibra** (importante para o corte depois — a fibra tem que bater na direção certa da chapa).
4. **Biblioteca de módulos**: cada móvel criado pode ser salvo como template reutilizável (ex: "Bancada 1500x700 com 3 gavetas") e reaproveitado em outros projetos, só ajustando dimensões. Um Projeto passa a ter uma lista de instâncias desses módulos.

**Entrega da fase:** o usuário monta vários móveis diferentes dentro do mesmo projeto, todos 3D, e pode salvar/reaproveitar módulos já feitos.

---

## Fase 3 — Módulo 2: Regras Construtivas e Vínculo de Insumos
**O que fazer:**
1. Vincular cada móvel aos insumos cadastrados no Painel de Insumos: dobradiças, corrediças, puxadores, minifix e cavilhas passam a ser **objetos posicionáveis** dentro do módulo 3D, não só texto de orçamento.
2. Marcação automática do **passo de furação de 32mm** (sistema padrão da marcenaria) — ao posicionar uma ferragem, o sistema já sugere os furos no padrão correto, sem cálculo manual.
3. Mapeamento automático das faces das peças que recebem **fita de borda**, com cálculo da metragem linear total consumida — isso alimenta direto a precificação da Fase 4.

**Entrega da fase:** cada móvel sabe exatamente quais ferragens usa (puxadas do Painel de Insumos, já com preço) e quantos metros de fita gasta.

---

## Fase 4 — Módulo 3 + Módulo 4: Plano de Corte, Produção e Precificação
**O que fazer:**
1. Algoritmo de otimização de corte 2D (Bin Packing/Nesting — Guillotine Best-Area-Fit) usando as dimensões reais das chapas cadastradas no Painel de Insumos, agrupando peças de **todos os móveis do projeto** na mesma chapa quando possível (aproveitamento entre móveis diferentes, não só dentro de um).
2. Exportação de arquivos vetoriais **.DXF** para centros de usinagem/CNC e listas **.XML/.CSV** para seccionadoras industriais (INMES, Giben, SCM — um adaptador por marca).
3. **Precificação automática em tempo real**: soma proporcional de MDF usado (via bin packing), fitas de borda (via Fase 3), ferragens (via Fase 3), + margem de perda configurável + margem de lucro configurável — tudo recalculando ao vivo conforme o projeto muda.

**Entrega da fase:** orçamento fiel ao custo real, plano de corte otimizado considerando o projeto inteiro (todos os móveis juntos), arquivos prontos para enviar à máquina.

---

## Fase 5 — Módulo 5: Gestão Comercial, Contratos e Rastreabilidade
**O que fazer:**
1. Gerador de contratos/orçamentos em **PDF** com campos editáveis + campo de **assinatura digital** (canvas de assinatura + hash do documento).
2. Impressão de **etiquetas com QR Code**, uma por peça, vinculadas a um visualizador mobile 3D do manual de montagem daquela peça específica (view explodida com slider, acessível pelo QR).
3. Ligação final do ciclo: ao mover o card no Kanban para "Produção", o sistema já disponibiliza plano de corte, contrato assinado e etiquetas prontas para impressão.

**Entrega da fase — sistema completo:** do lead ao móvel montado, com rastreabilidade peça a peça via QR Code.

---

## Resumo

| Fase | Módulo oficial | Entrega |
|---|---|---|
| 1 | Base (Gestão + Painel de Insumos) | Projeto multi-móvel + Kanban + insumos cadastrados |
| 2 | Módulo 1 — CAD Paramétrico | Vários móveis 3D reutilizáveis por projeto |
| 3 | Módulo 2 — Regras Construtivas | Ferragens e fita de borda vinculadas aos insumos reais |
| 4 | Módulo 3 + 4 — CAM e Precificação | Corte otimizado (projeto inteiro) + orçamento em tempo real |
| 5 | Módulo 5 — Comercial e Rastreabilidade | Contrato com assinatura + QR Code + manual de montagem |

**Por que essa ordem:** insumos e múltiplos móveis (Fase 1-2) precisam existir antes de qualquer cálculo fazer sentido; regras construtivas (Fase 3) são o elo que conecta o 3D ao custo real; produção/preço (Fase 4) só funciona depois que peça, ferragem e fita já "existem" no sistema; e o comercial (Fase 5) é a camada final que empacota tudo isso para o cliente.
