"""Verificação rápida e idempotente: a tabela orcamentos existe e aceita insert duplo?"""

import asyncio
import os
from dotenv import load_dotenv
from libsql_client import create_client

load_dotenv()


async def main():
    cliente = create_client(
        url=os.getenv("TURSO_DATABASE_URL"),
        auth_token=os.getenv("TURSO_AUTH_TOKEN"),
    )
    # CREATE TABLE IF NOT EXISTS roda duas vezes sem erro
    await cliente.batch(
        [
            "CREATE TABLE IF NOT EXISTS orcamentos (projeto_id TEXT PRIMARY KEY, usuario_id TEXT)",
        ]
    )
    await cliente.batch(
        [
            "CREATE TABLE IF NOT EXISTS orcamentos (projeto_id TEXT PRIMARY KEY, usuario_id TEXT)",
        ]
    )
    r = await cliente.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='orcamentos'"
    )
    print("idempotente OK, tabela presente:", bool(r.rows))
    await cliente.close()


asyncio.run(main())
