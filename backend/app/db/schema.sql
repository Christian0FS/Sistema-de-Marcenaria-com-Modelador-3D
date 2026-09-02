CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projetos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT REFERENCES clientes(id),
  nome TEXT NOT NULL,
  status TEXT DEFAULT 'lead',
  modulos_json TEXT DEFAULT '[]',
  criado_em TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chapas_mdf (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  espessura_mm REAL NOT NULL,
  largura_mm REAL NOT NULL,
  altura_mm REAL NOT NULL,
  preco_m2 REAL NOT NULL,
  estoque_chapas INTEGER DEFAULT 0
);

CREATE TABLE fitas_borda (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT,
  preco_metro REAL NOT NULL,
  estoque_metros REAL DEFAULT 0
);

CREATE TABLE ferragens (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  preco_unitario REAL NOT NULL,
  estoque INTEGER DEFAULT 0
);
