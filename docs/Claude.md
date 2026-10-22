# Claude.md — Histórico e contexto do projeto Marcenaria CAD/CAM

Registro de tudo que já foi feito e de todas as alterações, por arquivo. Serve de contexto para retomar o trabalho em qualquer sessão.

Projeto: Sistema Web CAD/CAM de Marcenaria Paramétrica e Gestão
Repositório: github.com/Christian0FS/Sistema-de-Marcenaria-com-Modelador-3D
Pasta local: `C:\Users\usuario\OneDrive\Desktop\Projetos\Mateus` (`frontend/` e `backend/`)
Escopo e fases: ver `FDD Mateus.md`

Nota sobre status: "aplicado" = o arquivo enviado na conversa já mostrava a mudança. "Fornecido" = o código foi entregue, mas a aplicação ainda não foi confirmada pelo usuário.

---

## 1. Como rodar

Dois terminais separados.

Backend (porta 8000):
```powershell
cd C:\Users\usuario\OneDrive\Desktop\Projetos\Mateus\backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```
Swagger em `http://127.0.0.1:8000/docs`.

Migração (rodar de dentro de `backend/`, com o venv ativo):
```powershell
python -m app.db.migrate
```
O comando precisa ser como módulo (`-m`); rodar `python app\db\migrate.py` dá `No module named 'app'`.

Frontend (porta 3000):
```powershell
cd C:\Users\usuario\OneDrive\Desktop\Projetos\Mateus\frontend
npm start
```

## 2. Convenções do código

- IDs: UUID em texto (`str(uuid.uuid4())`) no backend; no store do frontend, `id-curto` aleatório para divisões e internos e `crypto.randomUUID()` para portas.
- `get_current_user` devolve uma **string** (o id do usuário), não um dict. Usar `usuario_id: str = Depends(get_current_user)`. Em `clientes.py` e `projetos.py` a maioria das rotas só valida o token (`dependencies=[Depends(get_current_user)]`); só `biblioteca.py` filtra por dono.
- Rotas do backend são funções síncronas (`def`), sem `await`, no padrão de `clientes.py`.
- Store Zustand: o estado fica aninhado em `state.modulo` (`state.modulo.estrutura.portas`, nunca `state.estrutura`).
- Coordenadas em mm; conversão para metros no 3D com `MM_PARA_M = 0.001`.
- Três.js: `boxGeometry` é centrada, então a posição de uma peça é sempre o **centro** (`x + largura / 2`), nunca a borda.
- `logicaEstrutura.js` é só de funções puras; novas funções entram como adição, sem reescrever o arquivo.
- Import da API no frontend: `import { api } from "../lib/api"` (export nomeado, como em `Kanban.jsx` e `EditorModulo.jsx`).

## 3. O que já foi feito

### Fase 1 — Fundação (concluída)
- Setup, banco Turso e `migrate.py` com 6 tabelas iniciais (hoje 7).
- Auth JWT: `POST /auth/register`, `POST /auth/login`, dependency `get_current_user`.
- CRUD de clientes e projetos; CRUD de insumos (`/insumos/chapas`, `/insumos/fitas`, `/insumos/ferragens`).
- Kanban com 4 colunas e drag-and-drop (`@dnd-kit/core`).
- CRUD de módulos aninhados no projeto: `POST/GET/PATCH/DELETE /projetos/{id}/modulos/{modulo_id}` (guardados em `modulos_json`).

### Fase 2 — CAD paramétrico
- 2.1 Canvas 3D e caixa paramétrica. 2.2 Persistência dos módulos. 2.3 Divisórias recursivas. 2.4 Prateleiras e gaveteiros. 2.5 Portas (giro, corrediça, báscula) com folga.
- 2.6 Textura procedural de veio MDF criada em `three/materiais/texturaMDF.js` e aplicada ao casco, divisórias, prateleiras e gavetas; ainda não é um `ShaderMaterial` dedicado.
- 2.7 Biblioteca de módulos: tabela, rotas, métodos de API, tela de galeria, botão "Salvar na biblioteca". Testada no Swagger (POST funcionando).
- 2.9 parcial: laterais, tampo, base e fundo reais no visualizador; casco configurável (espessura 12–30 mm, fundo opcional de 3–6 mm), referência de chapa no casco e textura de veio. O vão raiz agora é calculado dentro das faces internas do casco. Atribuição de `chapaId` por peça e inspeção visual ainda pendentes.
- Divisão frontal, prévia visual, espessura de divisória configurável e reescala da posição da divisão implementadas; build de produção passou.
- Fase 3 — regras construtivas implementadas no código: 3.1 calcula e vincula ferragens sem substituir escolhas manuais; 3.2 gera plano de furos do sistema 32 com parâmetros editáveis e canecos; 3.3 calcula fita por peça/aresta, espessura e fita de estoque. Testes automatizados cobrem as regras; falta validação visual/operacional no navegador e CNC.
- Telas de login/cadastro e detalhe do projeto implementadas; Kanban abre o detalhe e o detalhe lista módulos e permite criar/abrir móveis.
- Decisão para 3.2: prateleiras ajustáveis, com pinos no sistema 32 mm.
- Prateleiras agora guardam altura, espessura, largura, profundidade e offsets X/Z individuais; controles de slider/número movem cada peça dentro do vão.
- Confirmações de divisões, prateleiras, gaveteiros e portas salvam imediatamente o módulo; medidas individuais da prateleira e casco têm comandos de salvar próprios.
- Frontend otimizado com `React.lazy` por rota; cadastro retorna JWT para evitar segundo request; Uvicorn documentado com `--reload-dir app` para não vigiar `venv`.

### Documentos gerados antes
`roteiro-fases-marcenaria.pdf`, `guia-sistema-marcenaria-cadcam-v3.md`, `guia-sistema-marcenaria-3d.md`, `README.md`, `marcenaria-cadcam.zip` (em `/mnt/user-data/outputs/`).

## 4. Log de alterações por arquivo

### Backend

| Arquivo | Alteração |
|---|---|
| `main.py` | `load_dotenv()` no topo, antes dos outros imports; routers auth/clientes/projetos/insumos; `biblioteca.router` registrado |
| `app/db/connection.py` | `get_client()` lê as variáveis de ambiente dentro da função (não no import). O `print` de debug de `execute` foi removido pelo usuário |
| `app/db/schema.sql` | Tabela `biblioteca_modulos` (`id TEXT PRIMARY KEY`, `usuario_id TEXT`, `nome`, `categoria`, `estrutura_json`, `thumbnail_base64`, `criado_em`) |
| `app/services/security.py` | `bcrypt` direto no lugar de `passlib` (incompatibilidade com bcrypt 5.0.0: "password cannot be longer than 72 bytes") |
| `app/routes/projetos.py` | CRUD de módulos aninhados; rota `POST /{projeto_id}/modulos/{modulo_id}/calcular-ferragens` (3.1) |
| `app/routes/biblioteca.py` (novo) | `POST/GET /biblioteca/modulos`, `GET/DELETE /biblioteca/modulos/{id}`, filtro opcional por categoria, tudo filtrado por `usuario_id` |
| `requirements.txt` | fastapi 0.110.0, uvicorn 0.27.1, libsql-client 0.3.1, pydantic 2.6.1, python-dotenv, reportlab, ezdxf, qrcode, python-jose, passlib[bcrypt], email-validator |

Foi criado e depois descartado um script de uso único (`drop_biblioteca.py`) para dropar a tabela errada.

### Frontend

| Arquivo | Alteração | Status |
|---|---|---|
| `package.json` | `overrides` fixando `webpack-dev-server` em 4.15.1 | aplicado |
| `lib/api.js` | Métodos da biblioteca: `salvarModeloBiblioteca`, `listarModelosBiblioteca`, `buscarModeloBiblioteca`, `excluirModeloBiblioteca` | aplicado |
| `lib/api.js` | Login/cadastro, busca de projeto, lista de clientes, chapas e ferragens | aplicado e build validado |
| `lib/api.js` | `listarFitas` para vincular fitas cadastradas ao plano de borda | aplicado e build validado |
| `store/moduloStore.js` | `portas` em `estrutura`; `adicionarPorta`, `removerPorta`, `vaoTemPorta`; `payloadParaApi` inclui portas; `carregarModulo` com fallback de dimensões e reescala | aplicado |
| `store/moduloStore.js` | `adicionarInterno`: várias prateleiras por vão; ao dividir um vão com prateleiras, remapeia cada uma ao filho que contém seu centro | aplicado e build validado |
| `store/moduloStore.js` | Estado `previaDivisao` e ação `setPreviaDivisao`; mantém import de `reescalarEstrutura` | aplicado e build validado |
| `store/moduloStore.js` | `adicionarDivisao` aceita espessura e limita posição; preservar prateleiras ao dividir | aplicado e build validado |
| `store/moduloStore.js` | Configuração persistida de furação 32 mm e fita de borda no JSON do módulo | aplicado e build validado |
| `store/moduloStore.js` | Armazena posição, espessura, largura, profundidade e offsets da prateleira; preserva a altura ao dividir o vão | aplicado e build validado |
| `three/logicaEstrutura.js` | `gerarPortas`, `reescalarEstrutura` por eixo da divisão | aplicado |
| `three/logicaEstrutura.js` | Vãos recursivos 3D com `x/y/z` e largura/altura/profundidade; divisão vertical, horizontal e frontal | aplicado e build validado |
| `three/logicaEstrutura.js` | Espessura de painel configurável (padrão 15 mm), prévia e limites dos dois compartimentos | aplicado e build validado |
| `three/logicaEstrutura.js` | Prateleiras, gavetas e portas acompanham a profundidade e a face frontal do vão | aplicado e build validado |
| `three/logicaEstrutura.js` | Vão raiz começa depois das laterais/base e à frente do fundo; divisórias e internos ficam contidos no casco | aplicado e build validado |
| `three/logicaEstrutura.js` | Portas fixas posicionadas fora do vão; prateleira recuada para a pista traseira em vãos com porta de correr | aplicado; testes de geometria passaram |
| `three/logicaEstrutura.js` | `gerarPrateleiras` aceita espessura/posição/dimensões/offsets individuais e recuos de porta deslizante | aplicado; build validado |
| `three/logicaEstrutura.js` | Geometria frontal/espessura, limites por eixo e reescala por eixo cobertos por testes | 3 testes passaram |
| `three/logicaFabricacao.js` (novo) | Gera peças do módulo, posições de pinos/canecos, contagem por tipo, arestas com fita e metragem agrupada | aplicado; 12 testes passaram |
| `three/CaixaModulo.jsx` | Gaveta composta por frente, laterais, traseira e base; componentes posicionados em 3D por vão | aplicado e build validado |
| `three/CaixaModulo.jsx` | Casco com laterais, tampo, base e fundo; faces externas semitransparentes (45%) e materiais visíveis dos dois lados | aplicado e build validado; sem teste visual compartilhado |
| `three/CaixaModulo.jsx` | Prévia laranja de divisória; seleção azul com menor opacidade | aplicado e build validado |
| `three/CaixaModulo.jsx` | Casco com espessura configurável, fundo opcional de 3–6 mm e associação de chapa | aplicado e build validado |
| `three/materiais/texturaMDF.js` (novo) | Textura procedural de veio via CanvasTexture, aplicada nas superfícies de MDF | aplicado; usa `meshStandardMaterial`, não `ShaderMaterial` |
| `three/logicaFerragens.js` (novo) | `calcularFerragensPorta`, `calcularFerragensGaveta`, `calcularFerragensModulo` | entregue |
| `three/logicaFerragens.js` | Mapeia para tipos cadastrados (`dobradica`, `corredica`, `puxador`) e reconhece gaveteiros | aplicado; testes de lógica passaram |
| `backend/app/routes/projetos.py` | Endpoint de cálculo de ferragens preserva `ferragemId` escolhido no editor e só preenche ausentes | aplicado; `py_compile` passou |
| `pages/EditorModulo.jsx` | Formulário de porta, lista de portas, botão e formulário "Salvar na biblioteca" | aplicado |
| `pages/EditorModulo.jsx` | Campos de número + slider para dimensões, medida de um lado do vão, espessura da divisória, número de gavetas e folga da porta | aplicado e build validado |
| `pages/EditorModulo.jsx` | Direção frontal; centraliza o valor ao trocar vão/eixo; mostra prévia durante o ajuste | aplicado e build validado |
| `pages/EditorModulo.jsx` | O quadro-resumo "Medidas dos vãos" não está no código atual; bundle de produção recompilado após a solicitação de removê-lo | confirmado |
| `pages/EditorModulo.jsx` | Permite dividir vão que contém apenas prateleiras; outras combinações incompatíveis continuam bloqueadas | aplicado e build validado |
| `pages/EditorModulo.jsx` | Seleção de ferragens por dropdown e configuração das peças estruturais/chapa | aplicado e build validado |
| `pages/EditorModulo.jsx` | Painel de fabricação com parâmetros do grid 32, dobradiças, seleção de fita/espessura, relatório de furos e metragem por aresta | aplicado e build validado |
| `pages/EditorModulo.jsx` | Controles individuais de altura, largura, profundidade, offsets X/Z e espessura das prateleiras | aplicado e build validado |
| `pages/EditorModulo.jsx` | Confirmar estrutura salva imediatamente; salvar casco e ajustes individuais de prateleira; callbacks de salvar não renderizam evento React | aplicado e build validado |
| `pages/BibliotecaModulos.jsx` | Imports React corrigidos, projeto ativo lido do store, retorno ao projeto | aplicado e build validado |
| `pages/Login.jsx` (novo) | Login e cadastro usando `/auth/login` e `/auth/register`; token salvo em `localStorage` | aplicado e build validado; sem teste de API real |
| `pages/DetalheProjeto.jsx` (novo) | Lista módulos, dimensões e ações "Abrir"/"Novo módulo" | aplicado e build validado; sem teste de API real |
| `pages/Kanban.jsx` | Abre detalhe do projeto; controle de mover separado do link e ativação de drag após 8 px | aplicado e build validado |
| `App.jsx` | Rotas privadas com token, `/login`, detalhe, editor e biblioteca | aplicado e build validado |
| `App.jsx` | Páginas carregadas sob demanda; chunk inicial do frontend reduzido de ~269 kB para ~53 kB gzip | aplicado e build validado |
| `backend/app/routes/auth.py` | Cadastro emite token JWT na resposta para login automático em uma só ida HTTP | aplicado; `py_compile` passou |
| `README.md` | Instrução de dev usa `uvicorn main:app --reload --reload-dir app` para evitar watcher no `venv` | aplicado |

#### Fase 5 — Comercial (arquivos novos e alterados)

| Arquivo | Alteração | Status |
|---|---|---|
| `backend/app/services/pdf_contrato.py` | Gerador de contrato/orçamento PDF (ReportLab platypus): seções de partes, objeto, valores e prazo; assinatura em imagem base64 opcional; hash SHA-256 do documento impresso no rodapé; nome de arquivo sanitizado | novo, aplicado; `py_compile` passou |
| `backend/app/routes/contratos.py` | `POST /contratos/{projeto_id}` (autenticado): recebe precoVenda, custoTotal, campos editáveis e assinaturaBase64; busca projeto + cliente no Turso; devolve PDF com header `X-Document-Hash` | novo, aplicado; `py_compile` passou |
| `backend/app/routes/manual.py` | Endpoint público `GET /publico/manual/{projeto_id}/{peca_id}` sem token (usado pelo QR das etiquetas): localiza módulo e peça (id composto `modulo_id:peca_id`), devolve projeto/módulo/peça e URL do manual | novo, aplicado; `py_compile` passou |
| `backend/app/services/exportadores.py` | `exportar_etiquetas_pdf` agora recebe `base_url_manual` e o payload do QR inclui campo `url` apontando para `/manual/{projeto_id}/{peca_id}` | alterado, aplicado; `py_compile` passou |
| `backend/app/routes/orcamento.py` | Rota de etiquetas aceita query `baseUrl` para montar a URL do manual no QR | alterado, aplicado; `py_compile` passou |
| `backend/main.py` | Routers `contratos` (prefixo `/contratos`) e `manual` (prefixo `/publico`, sem auth) registrados; 47 rotas no total | alterado, aplicado; app carrega no venv |
| `frontend/src/pages/ContratoProjeto.jsx` (novo) | Formulário de contrato (marcenaria, condições, entrada, parcelas, prazo, observações), preço em cache de `sessionStorage` da página de produção, geração do PDF com assinatura e leitura do hash do header | novo, aplicado; build validado |
| `frontend/src/three/VistaExplodida.jsx` (novo) | Vista explodida 3D de peças do módulo com slider de montagem (0% explodido → 100% montado), direção de explosão radial a partir do centro | novo, aplicado; build validado |
| `frontend/src/pages/ManualMontagem.jsx` (novo) | Página pública do manual (acessada pelo QR): busca `GET /publico/manual/...` e renderiza a vista explodida da peça | novo, aplicado; build validado |
| `frontend/src/three/CenaComercial3D.jsx` (novo) | Cenário comercial: chão/parede configuráveis, módulos lado a lado com espaçamento, câmeras pré-definidas (frontal/3/4/detalhe/topo), props de escala (planta, cortina, tapete), HDRI (`Environment preset="apartment"`) e captura de PNG via `toDataURL` | novo, aplicado; build validado |
| `frontend/src/pages/CenaComercial.jsx` (novo) | Tela do cenário: seleção de câmera, cores de chão/parede, espaçamento, toggles de props e botão "Exportar imagem (PNG)" | novo, aplicado; build validado |
| `frontend/src/App.jsx` | Rotas `/projetos/:id/contrato` e `/projetos/:id/cena` (autenticadas) e `/manual/:projetoId/:pecaId` pública (fora do guard de login); páginas carregadas com `React.lazy` | alterado, aplicado; build validado |
| `frontend/src/pages/DetalheProjeto.jsx` | Botões "Ver em cenário" e "Contrato e assinatura" no cabeçalho do projeto | alterado, aplicado; build validado |
| `frontend/src/three/posicionamentoCenario.js` (novo) | Funções puras de posicionamento do cenário (em mm, plano XZ): `caixaDoModulo`, `caixasSeInterceptam` (AABB; bordas encostadas não colidem), `caixaEnvolvente`, `enfileirarModulos` (encosta lado a lado, resolve colisão empurrando ao lado livre mais próximo, centraliza a fileira em X=0) e `posicionarAderecos` (cortina atrás do fundo mais saliente −50 mm, tapete sob a fileira com margem 300 mm e 1 mm acima do piso, planta 500 mm além da borda, largura de sala = fileira + 2 m por lado) | novo, aplicado; 10 testes passaram |
| `frontend/src/three/posicionamentoCenario.test.js` (novo) | Testes das funções puras: 2, 5 e 9 módulos sem sobreposição, bordas encostadas, fileira centrada, cortina atrás dos móveis, tapete cobrindo com margem, planta fora da área | novo, aplicado; 10/10 passaram |
| `frontend/src/pages/TesteCenario.jsx` (novo) | Página pública de teste (`/teste-cenario`, sem login): fileira fixa de 9 módulos de larguras diferentes, parâmetros `?camera=` e `?hdri=0`; serve para screenshots automatizados | novo, aplicado; build validado |
| `scripts/capturar-cenario.js` (novo) | Captura automatizada: abre `/teste-cenario` no Edge headless via `puppeteer-core`, espera 4 s e salva 3 PNGs em `docs/screenshots/fileira-9-modulos-{frontal,tres-quartos,topo}.png`; deps `puppeteer-core`/`ws` instaladas com `--no-save` | novo, aplicado; 3 screenshots gerados |
| `frontend/src/three/CenaComercial3D.jsx` | Correções iterativas da cena: parede na borda traseira do chão + rodapé (a "linha" do meio da parede era z-fighting e depois o varão da cortina); chão estendido 12 m além da parede; fileira a 0,7 m da parede (`PROFUNDIDADE_SALA_MM = 700`); fundo do móvel desenhado no `ModuloSimples` (não fica mais oco); posição das portas convertida para metros (estava em mm, invisível); cortina do piso ao teto sem varão; câmeras com altura fixa no nível dos olhos (1,3–2 m) e distância horizontal proporcional à fileira; planta maior (~1,3 m, vaso + 3 esferas); fundo `#f4f1ec` + névoa leve; HDRI opcional via prop `usarHdri` | alterado, aplicado; build validado |
| `frontend/src/pages/ProducaoProjeto.jsx` | Cache da precificação em `sessionStorage` (`preco-${projetoId}`) para a página de contrato ler o preço calculado | alterado, aplicado; build validado |

### Fase 4 — CAM e Precificação (concluída)
- 4.1 Plano de corte otimizado por chapa (bin packing com kerf) em `services/bin_packing.py`, consumido por `services/precificacao.py`.
- 4.2 Custo de MDF (chapas inteiras), fita de borda por metragem, ferragens por estoque, perda % e lucro (markup sobre custo ou margem sobre preço).
- 4.3 Exportação por perfil de máquina (INMES, Giben, SCM Cyflex, Corte Cloud): CSV e XML (`services/exportadores.py`) e DXF com ezdxf.
- 4.4 Etiquetas com QR Code por peça em PDF (`exportar_etiquetas_pdf`); página Produção (`pages/ProducaoProjeto.jsx`) com plano de corte visual, parâmetros de preço e downloads.

### Fase 5 — Módulo 5: Comercial e Rastreabilidade (concluída nesta conversa)
- 5.1 Contrato/orçamento em PDF com campos editáveis (marcenaria, condições, entrada, parcelas, prazo, observações), lista dos móveis do projeto e valores da precificação — `services/pdf_contrato.py` (ReportLab, platypus) + rota `POST /contratos/{projeto_id}`.
- 5.2 Assinatura digital: canvas de assinatura no frontend (`pages/ContratoProjeto.jsx`) que envia PNG base64; o PDF imprime a assinatura do contratante e um **hash SHA-256** do documento no rodapé (hash cobre campos + valores + assinatura), retornado também no header `X-Document-Hash`.
- 5.3 Manual de montagem por QR: as etiquetas QR agora carregam `url` apontando para `/manual/{projeto_id}/{peca_id}` (rota pública no frontend, fora do guard de login); endpoint público `GET /publico/manual/{projeto_id}/{peca_id}` (`routes/manual.py`) devolve projeto, módulo e peça; página `pages/ManualMontagem.jsx` renderiza a **vista explodida 3D com slider de montagem** (`three/VistaExplodida.jsx`, peças geradas por `gerarPecasModulo`).
- 5.4 Visualização em cenário: componente `three/CenaComercial3D.jsx` com chão e parede configuráveis, vários módulos lado a lado (com espaçamento ajustável), câmeras pré-definidas (frontal, 3/4, detalhe, topo), props de escala fixos (planta, cortina, tapete), iluminação com HDRI (`Environment preset="apartment"` do drei) e **exportação de imagem PNG** via `gl.domElement.toDataURL` (com `preserveDrawingBuffer: true`). Página `pages/CenaComercial.jsx` com os controles; acessível por botões "Ver em cenário" e "Contrato e assinatura" no detalhe do projeto.
- 5.4 revisado (segunda rodada): lógica de posicionamento extraída para `three/posicionamentoCenario.js` (funções puras, 10 testes); fileira sem sobreposição com resolução de colisão; cortina vertical atrás dos móveis; tapete no piso sob a fileira; planta fora da área; cena sem elementos do editor; 3 screenshots de 9 módulos gerados por `scripts/capturar-cenario.js` (Edge headless + puppeteer-core) em `docs/screenshots/`.
- Ciclo do Kanban mantido: mover para "Produção" continua disponibilizando plano de corte, contrato (rota nova) e etiquetas com QR para impressão.

Os itens abaixo merecem atenção antes de seguir. Itens marcados como corrigidos foram revistos no workspace.

1. **Corrigido — import de `reescalarEstrutura`**: `moduloStore.js` importa a função de `../three/logicaEstrutura`.
2. **Corrigido — fallback ao carregar módulo**: sem `dimensoesNovas`, `carregarModulo` usa as dimensões do módulo (ou as dimensões atuais como último fallback), sem acessar `dimensoesNovas.largura` indefinidamente.
3. **Corrigido — biblioteca**: usa `import { api }`, hooks React importados e `projetoId` lido do Zustand.
4. **Corrigido — dimensões na biblioteca**: o editor envia `{ dimensoes, estrutura, aparencia }` dentro de `estrutura`; o backend persiste esse JSON e a galeria reconhece o formato.
5. **Corrigido — categorias**: editor e biblioteca compartilham `lib/categoria.js`.
6. **Corrigido — default de `ModuloInput`**: o código atual usa `divisoes` sem acento.
7. **Parcial — materiais 2.6/2.9**: veio MDF procedural aplicado via CanvasTexture, ainda sem ShaderMaterial e sem escolha de cor derivada da chapa.
8. **Parcial — chapa por peça**: `estrutura.casco.chapaId` é persistido e a lista de fabricação propaga a referência; falta escolha individual de chapa por peça e conexão do plano a exportadores CNC.
9. **Implementado — autenticação frontend**: login/cadastro usa endpoints JWT; as rotas do app exigem token. A expiração ainda é apresentada como erro da API, sem redirecionamento automático.
10. **Implementado — detalhe do projeto**: o Kanban abre a lista de módulos, com ações para abrir ou criar módulo.
11. **Parcialmente corrigido — caixa externa**: casco e fundo são configuráveis e renderizados; faltam vínculo de chapa por peça e teste visual no navegador.
12. **Arquivos de scaffold — resolvido na Fase 5**: `routes/contratos.py`, `routes/manual.py`, `routes/orcamento.py`, `services/exportadores.py`, `pdf_contrato.py`, `precificacao.py` e `bin_packing.py` estão implementados e revisados nesta conversa (`py_compile` passou e o app carrega com 47 rotas). `routes/kanban.py` continua apenas como comentário — o Kanban usa diretamente `GET /projetos?status=`.

### Reforma visual e chapa por peça (neste bloco de trabalho)

## 5a. Auditoria da reforma (Fase 0)

| Item | Status na auditoria | Resultado |
|---|---|---|
| a) Login/cadastro + logout + redirecionamento 401 | PARCIAL (login ok; faltava 401/logout global) | FEITO — `lib/api.js` limpa token e redireciona em 401; logout no menu do usuário e em Configurações |
| b) Detalhe do projeto | FEITO | mantido |
| c) Card do Kanban abre projeto (drag após 8 px) | FEITO | mantido |
| d) Rotas privadas do App.jsx | FEITO | mantidas; novas telas entraram no mesmo guard |
| e) Cor da chapa + chapaId por peça | PARCIAL (sem `cor` no banco; seletor só no casco e peça avulsa) | FEITO — coluna `cor`, seletor em casco/divisão/prateleira/gaveteiro/porta/peça avulsa, cor no 3D com herança do casco |
| f) Telas de clientes/insumos/projetos | FALTAM (PainelProjetos/PainelInsumos eram comentários vazios) | FEITO — páginas novas Clientes, Projetos e Insumos usando a API |

## 5b. O que foi implementado na reforma visual

- **Fase 1 (identidade visual)**: `tailwind.config.js` com tokens (`primario` #A9743F, `app.*` bege/borda/texto, `shadow-card/flutuante`, `rounded-card`, fonte Inter); `components/ui.jsx` (Logo com monograma "M" em SVG, PilulaStatus com o mapa `CORES_STATUS`, Vazio/Carregando/Erro, BotaoPrimario/BotaoSecundario, classeInput); `components/icone.jsx` (ícones de linha em SVG próprio, sem dependência nova); `components/Layout.jsx` (menu lateral 190px recolhível, gaveta no mobile, busca global com dropdown filtrando projetos/clientes no cliente, sino "Nenhuma notificação", menu do usuário com logout, rodapé com Configurações e v1.0.0).
- **Fase 2 (painel `/`)**: `pages/Painel.jsx` com cards Kanban/Clientes/Insumos resumidos, Resumo de Custos e Plano de Corte como "Em breve" (sem dados fictícios) e o `components/MiniVisualizador.jsx` — canvas único, `somenteLeitura`, sempre Neutro, rotação automática, `pointer-events:none`, seletor projeto/módulo fora do canvas e botão "Abrir no editor". O `CaixaModulo.jsx` ganhou as props `modulo` (prioridade sobre o store) e `somenteLeitura` (ignora prévia/seleção/visualização, não renderiza vãos clicáveis, sem handlers).
- **Fase 3 (excluir módulo)**: `api.excluirModulo`; botão Excluir com modal de confirmação no DetalheProjeto; zona de perigo no editor pendente (o modal do detalhe já cobre o fluxo pedido).
- **Fase 4 (chapas do dono)**: colunas `cor` (chapas) e `usuario_id` (chapas, fitas, ferragens, clientes, projetos) via migração idempotente (`migrate.py` tolera coluna existente e atribui registros antigos ao usuário único — a base tinha 3 usuários, então os antigos ficaram sem dono e continuam visíveis a todos); `insumos.py` filtra tudo por `usuario_id` (com `OR usuario_id IS NULL` para os antigos); tela Insumos com abas e CRUD completo de chapas (com seletor de cor), fitas e ferragens.
- **Fase 5 (chapaId em todas as peças)**: `lib/logicaChapas.js` (funções puras: `escurecerCor`, `indiceDeChapas`, `corDaPeca`, `resolverChapaId`, `aplicarHerancaCasco` — 10 testes em `logicaChapas.test.js`, 10/10); ações novas no store (`atualizarDivisao`, `atualizarPorta`, `atualizarAparencia`); seletores de chapa no editor para casco, cada divisória, cada prateleira, gaveteiro, porta e peça avulsa (todas herdam do casco quando vazias); `Cena.jsx` carrega as chapas uma vez e repassa; `CaixaModulo.jsx` calcula cor/veio por peça com fallback para a cor do módulo.
- **Fase 6 (cenários)**: `lib/cenarios.js` (Neutro/Sala/Quarto/Cozinha/Escritório com cores e props); coluna `cenario` em `projetos` (migração idempotente); `PATCH /projetos/{id}` valida contra a lista e devolve 400 se inválido; `components/SeletorCenario.jsx` usado no editor e na tela de cenário (persistindo por projeto); Configurações guarda o cenário padrão no localStorage; o cenário aplica as funções de posicionamento sem sobreposição já existentes (`posicionamentoCenario.js`).
- **Fase 7 (editor)**: painel esquerdo com abas Estrutura/Internos/Portas/Aparência/Resumo, altura `calc(100vh-64px)`, visual novo (bronze/cards/bordas). A barra de passos no rodapé do viewport e o recolher do painel do editor ainda não foram feitos (ver pendências).
- **Fase 8**: Resumo de Custos e Plano de Corte ficaram como cards "Em breve" no painel (`EmBreve.jsx` também atende a rota /orcamento); nada do mockup foi copiado como dado fixo.

## 5c. Pendências da reforma

1. Zona de perigo "Excluir módulo" dentro do editor (o fluxo do detalhe do projeto já existe).
2. Barra de passos no rodapé do viewport do editor e botões flutuantes (zoom/recentralizar/furos-ferragens) — o seletor de cenário já está no topo do viewport.
3. Recolher a barra lateral do editor (o menu lateral do Layout já recolhe).
4. Usar o cálculo real de precificação/plano de corte nos cards "Em breve" (o backend já tem `bin_packing.py`/`precificacao.py`/`exportadores.py`; a página de Produção já usa, faltou ligar ao painel).
5. Migração não atribuiu `usuario_id` dos registros antigos (base com 3 usuários — decisão registrada na Fase 4).
6. Teste manual no browser do fluxo completo (login → cliente → projeto → módulo → prévia → cenário → excluir → chapa → logout) não foi executado nesta sessão; build e testes unitários passaram.

---

# FLUXO FINANCEIRO — Orçamento, Painel e Resumo de Custos (bloco seguinte)

## 6a. Relatório da auditoria (Fase 0)

| Item | Status | Evidência |
|---|---|---|
| a) Rota de precificação por projeto | FEITO (com ressalva) | `routes/orcamento.py:144-148` — `POST /orcamento/{id}/calcular`, corpo `ProducaoInput{pecas, necessidadesFerragens, parametros, kerfMm}`, resposta com planoCorte + precificacao (custoMdf, custoFitas, custoPerda, custoFerragens, custoTotal, precoVenda, lucroEstimado, avisos). Ressalva: o frontend envia as peças (geradas no client por `gerarPecasModulo`) — o backend não gera peças sozinho |
| b) bin_packing.py | FEITO | `planejar_corte(pecas, chapas, kerf)` agrupa por `chapaId`, valida espessura ±0,5 mm, guilhotina Best-Area-Fit, devolve folhas com posições, áreas e `aproveitamentoPercent`; separa por chapa (espessura/cor via id) |
| c) precificacao.py | FEITO | preços do banco (`chapas_mdf.preco_m2`, `fitas_borda.preco_metro`, `ferragens.preco_unitario`); peça sem chapa → aviso + sem custo; margem via `markup_custo`/`margem_preco`; SEM custos extras (mão de obra/frete) |
| d) Contrato usa o orçamento | PARCIAL | `contratos.py:18-20` recebe precoVenda/custoTotal do frontend (cache de sessionStorage); PDF + assinatura ok; não lê orçamento salvo nem condições |
| e) Persistência de orçamento | FALTA | `schema.sql` não tinha tabela `orcamentos` nem colunas de margem/condições → criado (ver 6b) |
| f) Metragem de fitas por cor/espessura | FEITO | `precificacao.py:57-83` agrupa por `fitaId` |
| g) Painel com custo real | FALTA | cards "Resumo de Custos"/"Plano de Corte" eram placeholders → substituídos (Fase 2) |
| h) Telas de Orçamento/Resumo de Custos | FALTA | não existiam → criadas (Fases 3 e 4) |
| i) Helper monetário | PARCIAL | `formatarMoeda` duplicado em 3+ arquivos → centralizado em `lib/formato.js` |
| j) Estados carregando/vazio/erro | FEITO | `components/ui.jsx` |

O layout (menu lateral, tokens, painel) já existia do bloco anterior — reaproveitado, não recriado.

## 6b. Arquivos criados e alterados

| Arquivo | Alteração |
|---|---|
| `backend/app/db/schema.sql` | Tabela `orcamentos` (projeto_id PK, usuario_id, margem_percentual, modelo_margem, desconto, entrada, parcelas, forma_pagamento, prazo_entrega_dias, validade_dias, status_orcamento, custo_total, preco_venda, calculado_em, detalhe_json) |
| `backend/app/db/migrate.py` | Filtro de linhas de comentário antes do split por `;` (Turso rejeitava statements vazios com SQL_PARSE_ERROR); UPDATE que vincula orçamentos órfãos ao dono do projeto |
| `backend/app/routes/orcamentos.py` (novo) | `GET /orcamentos/{id}`, `POST /orcamentos/{id}/recalcular`, `PATCH /orcamentos/{id}` (valida margem 0–500, parcelas 1–12, formas e status; 422), `GET /orcamentos` (lista resumida em 1 chamada, JOIN com projetos/clientes) |
| `backend/main.py` | Router `orcamentos` registrado (51 rotas) |
| `backend/tests/test_orcamentos.py` (novo) | 9 testes: status válidos, mapeamento para o Kanban, validações de margem/parcelas/status/forma, fórmula de preço nos dois modelos, margem 100% sobre preço inválida |
| `frontend/src/lib/formato.js` (novo) | `formatarBRL`, `formatarPercentual` (protegido contra ÷0/NaN), `distribuirPercentuais` (soma fecha em 100) |
| `frontend/src/lib/formato.test.js` (novo) | 6 testes de formatação e distribuição |
| `frontend/src/lib/useOrcamento.js` (novo) | Hook com cache em `sessionStorage` (`orcamento:{id}`), recusa resposta atrasada ao trocar de projeto, manter cache se a rede falhar |
| `frontend/src/lib/api.js` | `orcamentoDoProjeto`, `recalcularOrcamento`, `salvarOrcamento`, `listarOrcamentos` |
| `frontend/src/components/ui.jsx` | `PilulaStatusOrcamento` + mapa `CORES_STATUS_ORCAMENTO` (rascunho cinza, enviado azul, aprovado verde, em produção âmbar, recusado vermelho) |
| `frontend/src/components/BarraCustos.jsx` (novo) | Barra empilhada em CSS puro, com `role="img"`, aria-label com os percentuais e legenda textual (não depende só de cor) |
| `frontend/src/components/ResumoOrcamento.jsx` (novo) | Cards de métrica + resumo executivo (usado no painel) |
| `frontend/src/pages/Painel.jsx` | Card "Orçamento do projeto" (seletor, custo/margem/preço, botões) e "Projetos ativos" com preço — dados de `GET /orcamentos`; placeholders "Em breve" removidos |
| `frontend/src/pages/OrcamentoProjeto.jsx` (novo) | `/projetos/:id/orcamento`: resumo executivo, margem configurável com atalhos 30/50/100, desconto, condições de pagamento com simulação, status, recalcular e contrato |
| `frontend/src/pages/Orcamentos.jsx` (novo) | `/orcamento`: tabela com busca, filtro de status, ordenação por coluna, selo "Preço desatualizado" e rodapé de contagem |
| `frontend/src/pages/ResumoCustos.jsx` (novo) | `/projetos/:id/orcamento/resumo`: tabelas de chapas (com amostra de cor, chapas inteiras, área usada/sobra), fitas (metros por fita) e ferragens (qtd × preço), indicadores e barra de distribuição |
| `frontend/src/App.jsx` | Rotas `/orcamento`, `/projetos/:id/orcamento` e `/projetos/:id/orcamento/resumo` (com `key` para recarregar ao trocar de projeto) |
| `frontend/src/components/Layout.jsx` | Item "Orçamento" do menu deixou de ser "Em breve" |
| `frontend/src/pages/ProducaoProjeto.jsx` | Salva também o payload de produção em cache (`producao-${id}`) para o recalcular do orçamento |

## 6c. Decisões de arquitetura e de banco

1. **Tabela `orcamentos` (não colunas em `projetos`)**: o JSON do cálculo é grande e cada projeto tem exatamente um orçamento vivo (recalcular sobrescreve); histórico de versões não foi pedido — se for, uma coluna `versoes_json` pode ser acrescentada depois.
2. **Fórmula do preço (a mesma de `precificacao.py`, reutilizada)**: `custo_total = custoMdf + custoFitas + custoPerda + custoFerragens` (a perda é aplicada só a MDF+fitas); `markup_custo`: `preco = custo_total × (1 + margem/100)`; `margem_preco`: `preco = custo_total / (1 − margem/100)` (margem ≥ 100% é inválida). O recalcular do backend reusa `_calcular` de `routes/orcamento.py` — nenhuma regra duplicada.
3. **Chapas inteiras**: o custo cobra a chapa INTEIRA (é o que se compra). O Resumo de Custos mostra a área usada e a % de sobra por chapa, deixa explícito que o preço usa a chapa inteira.
4. **Arredondamento**: 2 casas no backend (`round`); total = campos somados pelo backend, nunca no frontend.
5. **Status do orçamento × status do Kanban**: mapeamento explícito em `STATUS_ORCAMENTO_PARA_KANBAN` — `em_producao → producao`, `recusado → lead`, os demais → `orcamento`. Um único lugar decide o status do projeto.
6. **Desconto e custos adicionais**: o campo `desconto` existe na tabela e na tela (prévia), mas `precificacao.py` NÃO aplica desconto nem mão de obra/frete — registrado como pendência; nada foi inventado.
7. **Recalcular depende do cache de produção**: a geração de peças vive no frontend (`gerarPecasModulo`), então o `POST /orcamentos/{id}/recalcular` consome o payload salvo em `sessionStorage` pela página de Produção. Limitação honesta: recalcular direto na tela de orçamento exige que a Produção tenha sido aberta antes (o botão orienta). A alternativa (portar `gerarPecasModulo` para Python) está nas pendências.
8. **Idempotência**: comentários `--` do schema.sql geravam statements vazios no split (SQL_PARSE_ERROR do Turso) — filtrados; `CREATE TABLE IF NOT EXISTS` verificado rodando 2×.

## 6d. Testes realizados

- **Backend: 9/9 pytest** (status válidos, mapeamento Kanban, margem/parcelas/status/forma inválidos rejeitados com 422, preço nos dois modelos, margem 100% sobre preço rejeitada, custo sem margem).
- **Frontend: 6/6 Jest** (formatarBRL com moeda/nulos/NaN, formatarPercentual protegido, soma dos percentuais = 100%, total zero → 0).
- **Migração**: tabela `orcamentos` criada no Turso; `CREATE TABLE IF NOT EXISTS` executado 2× sem erro.
- **Build**: `npx react-scripts build` sem erros.
- **NÃO testado nesta sessão** (pendências): teste manual no browser do fluxo completo com projeto real (a rede para o Turso estava lenta demais para criar dados); teste À MÃO de um projeto exemplo; screenshots em 1536×1024 comparados ao mockup; isolamento por usuário contra o banco real (a rota filtra por `usuario_id`, coberto por inspeção).

## 6e. Pendências do fluxo financeiro

1. Portar `gerarPecasModulo` para o backend (ou persistir o payload de peças ao salvar o módulo) para o recalcular funcionar sem depender do cache de sessão da página de Produção.
2. ~~Aplicar `desconto` em `precificacao.py`~~ — **FEITO** (desconto em reais sai do preço, sem ficar negativo; 2 testes novos; `ParametrosPreco.desconto`; o recalcular usa o desconto salvo no orçamento). Custos adicionais (mão de obra, frete, instalação) continuam pendentes.
3. ~~Selo "desatualizado" automático~~ — **FEITO** (coluna `atualizado_em` em `projetos`, atualizada em qualquer mudança de módulos; `GET /orcamentos/{id}` e `GET /orcamentos` devolvem `desatualizado` comparando `calculado_em` × `atualizado_em`; tabela e tela usam o campo real).
4. ~~Fluxo do contrato lendo o orçamento salvo~~ — **FEITO** (`ContratoProjeto` pré-preenche entrada/parcelas/prazo do orçamento e usa o preço salvo como fonte primária, com o cache de produção como fallback).
5. Screenshots e teste manual no browser (bloqueados pela lentidão do Turso nesta sessão).
6. Módulo sem `chapaId` nem chapa no casco: o bin packing rejeita a peça (aviso "Chapa MDF não vinculada") — o Resumo de Custos mostra o aviso, mas falta o link direto para o módulo corrigir.
7. Detalhe por módulo (4.5) na aba Resumo de Custos — o `detalhe_json` não guarda custo por módulo separadamente hoje.

## 6. Problemas de ambiente já resolvidos

| Problema | Solução |
|---|---|
| `pydantic-core` não compila (Python 3.14, sem `link.exe`/MSVC) | Usar Python 3.12 no venv |
| `ModuleNotFoundError: dotenv` / `libsql_client` | Ativar o venv antes de rodar; `pip install -r requirements.txt` |
| `TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN não encontrados` | `.env` na raiz **e** em `backend/`; `load_dotenv()` no topo do `main.py` |
| `password cannot be longer than 72 bytes` | `bcrypt` direto em vez de `passlib` |
| `Invalid options object ... onAfterSetupMiddleware` (webpack-dev-server) | `overrides` no `package.json` pinando 4.15.1, apagar `node_modules` e `package-lock.json`, `npm install` |
| `git push` non-fast-forward | `git pull origin main --allow-unrelated-histories` |
| DevTools bloqueando colar código | Digitar `allow pasting` |
| `KeyError: 'result'` ao inserir na biblioteca | A tabela `biblioteca_modulos` estava com `id INTEGER PRIMARY KEY` e o código inseria UUID (`SQLITE_MISMATCH`). Drop da tabela, schema com `id TEXT PRIMARY KEY`, nova migração |
| `TypeError: string indices must be integers` na biblioteca | `usuario["id"]` trocado por `usuario_id` direto |
| 403 no Swagger | Clicar em "Authorize" depois do login |
| "Failed to fetch" no Kanban | Backend parado; subir o `uvicorn` |
| 401 / "Token inválido ou expirado" | Gerar token novo e salvar no `localStorage` |
| Screenshots headless saindo em branco (cenário 5.4) | Edge headless com `--disable-gpu --use-angle=swiftshader` só renderiza WebGL parcialmente; solução foi `puppeteer-core` (`node scripts/capturar-cenario.js`) com espera de 4 s após `domcontentloaded`; `networkidle0` nunca dispara (HDRI/CDN) |
| `/teste-cenario` retornava 200 mas tela branca | Rota `React.lazy` sem `<Suspense>` no `App.jsx`; corrigido envolvendo as rotas públicas em `Suspense` |
| "Linha" no meio da parede | Primeiro z-fighting da junção chão-parede (resolvido com parede na borda traseira do chão + rodapé); depois era o varão da cortina desenhado vertical (resolvido removendo o varão) |
| Módulos "ocos" na vista 3/4 | `ModuloSimples` não desenhava o fundo; adicionado painel de fundo condicional (`espessuraFundo > 0`) |
| Portas invisíveis no cenário | Posição da porta em mm sem conversão (a 309 unidades da cena); corrigido com `m(...)` em x/y/z |
| Câmera "voando" sobre a fileira | `direcao.y` multiplicava a distância (fileira de 6,85 m = câmera a ~4,7 m de altura); corrigido com `direcaoXZ` horizontal + `alturaM` fixa |
| Módulos se interpenetravam no cenário | Posição usava a borda esquerda + deslocamento de centralização em dobro; resolvido com `enfileirarModulos` (posições de centro, fileira centrada em X=0, resolução de colisão) |

Dica de debug: para ver o erro real do Turso (o `libsql-client` só mostra `KeyError: 'result'`), imprimir `response` em `libsql_client/http.py` (alteração temporária, já revertida).

## 7. Bugs corrigidos ao longo do caminho

- **Prateleira fora da caixa**: `posX = prateleira.x * MM_PARA_M` usava a borda esquerda; correto é `(x + largura / 2)`.
- **Peças com espaço entre si**: o vão era dividido assumindo painel centralizado em `posicao`, mas o painel era desenhado a partir de `posicao`. Corrigido subtraindo metade da espessura.
- **Segunda prateleira "fecha o módulo"**: `adicionarInterno` apagava os internos do vão e `vaosLivres` removia da lista clicável qualquer vão com interno.
- **Estado aninhado**: ações de portas ajustadas para `state.modulo.estrutura`.

## 8. Decisões de design registradas

- Várias prateleiras no mesmo vão, redistribuídas igualmente (N+1 compartimentos); ao dividir esse vão, cada prateleira é remapeada para o compartimento que contém seu centro. Gaveteiro continua exclusivo por vão.
- A divisão aceita eixo frontal e espessura configurável; a posição define uma das dimensões resultantes.
- Furação ajustável: passo inicial 32 mm, linhas a 37 mm da frente/fundo, primeiro furo a 64 mm da base e recuo de topo 64 mm; usuário altera os parâmetros. Caneco default Ø35 × 12 mm, centro a 21,5 mm da borda e a 100 mm das extremidades. Porta basculante sempre 2 dobradiças; porta de giro 3 quando passa 1600 mm.
- Fita de borda: casco e painéis internos na frente por padrão, com opção de vedar as quatro bordas do casco; portas e frentes de gaveta nos quatro lados; corpos de gaveta no topo. Padrão 1 mm, frentes 2 mm, ambos ajustáveis e vinculáveis ao estoque de fitas.
- Prateleiras ajustáveis em furos do sistema 32 mm.
- Múltiplas chapas MDF: cor escolhida uma vez no cadastro da chapa; veio calculado automaticamente; peça referencia a chapa por `chapaId`. Implementar quando mexer no backend/frontend de chapas.
- Fase 6 (Ionic/Capacitor) é condicional ao cliente.
- Etapa 5.4 (cenário) foi aceita como etapa pesada; 2.8 (animação) continua proposta; 2.9 está em implementação parcial (casco, textura e fundo configurável já existem; falta chapa por peça e validação visual).
- Fase 5 — decisões da implementação: assinatura digital feita com canvas do frontend (PNG base64) + hash SHA-256 impresso no rodapé do PDF (não usa certificado ICP-Brasil); QR da etiqueta aponta para rota pública `/manual/{projeto_id}/{peca_id}` sem login; vista explodida reutiliza `gerarPecasModulo` e explode radialmente a partir do centro do módulo; cenário 5.4 usa HDRI de CDN (`preset="apartment"` do drei) e `preserveDrawingBuffer` para permitir a captura PNG; módulos no cenário são simplificados (casco + porta única) para performance.
- Fase 5.4 — decisões de posicionamento: todo o layout do cenário sai de funções puras em `posicionamentoCenario.js` (testáveis, em mm, plano XZ); a posição no cenário usa o CENTRO do módulo porque `CaixaModulo` é centrado em X e Z (mas `ModuloSimples` desenha a partir da borda esquerda local, então o grupo do cenário subtrai metade da largura); AABB considera bordas encostadas como não-colisão; cortina é `min(paredeZ + 50mm, fundoMaisSaliente − 50mm)`; tapete tem margem de 300 mm e fica 1 mm acima do piso; sala = fileira + 2 m por lado; câmeras têm altura fixa no nível dos olhos (1,6–2 m) e só a distância horizontal escala com a fileira; parede fica na borda traseira do chão com rodapé cobrindo a junção; chão estendido 12 m para a câmera nunca ver a borda.

## 9. Próximos passos sugeridos

1. Fazer teste manual no browser: login/cadastro, biblioteca, navegação do Kanban, projeto, editor e seleção de ferragens.
2. Completar a atribuição de `chapaId` por peça e confirmar a origem da cor/veio no cadastro de chapas.
3. Definir como persistir e exibir estoque/necessidades de ferragens calculadas ao salvar um módulo.
4. Integrar o plano 3.2/3.3 aos exportadores CAM e fazer validação de usinagem/CNC.
5. Rever a regra de remoção de divisão para não deixar itens internos apontando para vãos filhos inexistentes.
6. Revisar visualmente no navegador a interferência de portas/prateleiras e conferir o plano de furação com a máquina antes de produção.
7. Testar a Fase 5 no browser: gerar contrato com assinatura, escanear o QR da etiqueta (rota `/manual/...`) e navegar pelo cenário com exportação de PNG.
8. Validar a URL usada no QR das etiquetas em produção (hoje o padrão é `http://localhost:3000`; o frontend deve enviar `baseUrl` na chamada de etiquetas).
9. Retirar ou proteger a rota `/teste-cenario` antes do deploy (hoje é pública e serve para screenshots).
10. Regenerar os screenshots do cenário (`node scripts/capturar-cenario.js` com o `serve` rodando no build) sempre que o layout da cena mudar.
