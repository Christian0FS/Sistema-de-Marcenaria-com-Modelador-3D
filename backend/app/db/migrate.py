from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from app.db.connection import get_client


# Colunas acrescentadas depois da criação inicial das tabelas.
# Cada tupla: (tabela, coluna, definição SQL).
COLUNAS_NOVAS = [
    ("clientes", "usuario_id", "TEXT"),
    ("projetos", "usuario_id", "TEXT"),
    ("projetos", "cenario", "TEXT DEFAULT 'neutro'"),
    ("projetos", "atualizado_em", "TEXT"),
    ("chapas_mdf", "usuario_id", "TEXT"),
    ("chapas_mdf", "cor", "TEXT"),
    ("fitas_borda", "usuario_id", "TEXT"),
    ("ferragens", "usuario_id", "TEXT"),
]


def colunas_existentes(client, tabela):
    """Lista de nomes de colunas. O Turso (HTTP) não executa PRAGMA de forma
    confiável, então tentamos PRAGMA e caímos para um SELECT que falha rápido."""
    try:
        resposta = client.execute(f"PRAGMA table_info({tabela})")
        linhas = getattr(resposta, "rows", resposta) or []
        nomes = [linha[1] for linha in linhas]
        if nomes:
            return nomes
    except Exception:
        pass
    # fallback: SELECT limitado — se falhar com erro de coluna, a tabela tem a coluna
    return None


def usuario_unico_ou_none(client):
    """Se houver exatamente 1 usuário, registros antigos sem dono vão para ele.
    Com 0 ou vários usuários, ficam sem dono (visíveis só por quem já as via)."""
    resposta = client.execute("SELECT id FROM usuarios")
    linhas = getattr(resposta, "rows", resposta) or []
    return linhas[0][0] if len(linhas) == 1 else None


def run_migration():
    # 1) tabelas novas/alteradas do schema.sql (CREATE IF NOT EXISTS é idempotente)
    schema_path = Path(__file__).parent / "schema.sql"
    sql_script = schema_path.read_text(encoding="utf-8")
    # remove linhas de comentário antes do split (comentários entre ';' geram
    # statements "vazios" que o Turso rejeita com SQL_PARSE_ERROR)
    linhas = [ln for ln in sql_script.splitlines() if not ln.strip().startswith("--")]
    statements = [s.strip() for s in "\n".join(linhas).split(";") if s.strip()]
    client = get_client()
    # batch = uma única requisição HTTP com todos os statements (muito mais
    # rápido no Turso do que execute() 1 a 1)
    client.batch(statements)
    print(f"OK: {len(statements)} statements do schema.sql executados (batch)")

    # 2) colunas acrescentadas: idempotente — se já existir, erro de duplicado
    # é ignorado (não dependemos de PRAGMA, que o Turso HTTP não executa bem)
    for tabela, coluna, definicao in COLUNAS_NOVAS:
        try:
            client.execute(f"ALTER TABLE {tabela} ADD COLUMN {coluna} {definicao}")
            print(f"OK: coluna {tabela}.{coluna} adicionada")
        except Exception as erro:
            texto = str(erro).lower()
            if "duplicate" in texto or "exists" in texto or "oculto" in texto:
                print(f"--: coluna {tabela}.{coluna} provavelmente já existe (aviso ignorado)")
            else:
                raise

    # 3) registros antigos sem dono: se houver um único usuário, atribui a ele
    dono_padrao = usuario_unico_ou_none(client)
    if dono_padrao:
        for tabela in ("clientes", "projetos", "chapas_mdf", "fitas_borda", "ferragens"):
            atualizados = client.execute(
                f"UPDATE {tabela} SET usuario_id = ? WHERE usuario_id IS NULL",
                [dono_padrao],
            )
            print(f"--: {tabela}: registros antigos atribuídos ao usuário único")

    # 4) vínculo do orçamento existente ao dono do projeto (se houver)
    client.execute(
        "UPDATE orcamentos SET usuario_id = ("
        " SELECT usuario_id FROM projetos WHERE projetos.id = orcamentos.projeto_id)"
        " WHERE usuario_id IS NULL"
    )

    print("Migração concluída.")


if __name__ == "__main__":
    run_migration()