CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projetos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT REFERENCES clientes(id),
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'lead',
  modulos_json TEXT DEFAULT '[]',
  cenario TEXT DEFAULT 'neutro',
  atualizado_em TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Orçamento salvo por projeto (um por projeto; recalcular sobrescreve).
-- Tabela própria (e não colunas em projetos): o JSON do cálculo é grande.
CREATE TABLE IF NOT EXISTS orcamentos (
  projeto_id TEXT PRIMARY KEY REFERENCES projetos(id),
  usuario_id TEXT,
  margem_percentual REAL DEFAULT 30,
  modelo_margem TEXT DEFAULT 'markup_custo',
  desconto REAL DEFAULT 0,
  entrada REAL DEFAULT 0,
  parcelas INTEGER DEFAULT 1,
  forma_pagamento TEXT DEFAULT 'pix',
  prazo_entrega_dias INTEGER DEFAULT 45,
  validade_dias INTEGER DEFAULT 15,
  status_orcamento TEXT DEFAULT 'rascunho',
  custo_total REAL DEFAULT 0,
  preco_venda REAL DEFAULT 0,
  calculado_em TEXT,
  detalhe_json TEXT
);

CREATE TABLE IF NOT EXISTS chapas_mdf (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  nome TEXT NOT NULL,
  espessura_mm REAL NOT NULL,
  largura_mm REAL NOT NULL,
  altura_mm REAL NOT NULL,
  preco_m2 REAL NOT NULL,
  estoque_chapas INTEGER DEFAULT 0,
  cor TEXT
);

CREATE TABLE IF NOT EXISTS fitas_borda (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  nome TEXT NOT NULL,
  cor TEXT,
  preco_metro REAL NOT NULL,
  estoque_metros REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ferragens (
  id TEXT PRIMARY KEY,
  usuario_id TEXT,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  estoque INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biblioteca_modulos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  estrutura_json TEXT NOT NULL,
  thumbnail_base64 TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);