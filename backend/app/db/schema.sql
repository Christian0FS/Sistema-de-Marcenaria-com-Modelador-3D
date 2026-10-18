CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
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
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapas_mdf (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  espessura_mm REAL NOT NULL,
  largura_mm REAL NOT NULL,
  altura_mm REAL NOT NULL,
  preco_m2 REAL NOT NULL,
  estoque_chapas INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fitas_borda (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT,
  preco_metro REAL NOT NULL,
  estoque_metros REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ferragens (
  id TEXT PRIMARY KEY,
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