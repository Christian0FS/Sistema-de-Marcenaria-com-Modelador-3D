from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from app.db.connection import get_client


def run_migration():
    schema_path = Path(__file__).parent / "schema.sql"
    sql_script = schema_path.read_text(encoding="utf-8")

    statements = [s.strip() for s in sql_script.split(";") if s.strip()]

    client = get_client()
    for stmt in statements:
        client.execute(stmt)
        print(f"OK: {stmt[:50]}...")

    print("Migração concluída.")


if __name__ == "__main__":
    run_migration()