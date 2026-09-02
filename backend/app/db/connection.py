import os
import asyncio
from threading import Lock

import aiohttp
import libsql_client


_client = None
_client_lock = Lock()


def _create_client(database_url, auth_token):
    return libsql_client.create_client_sync(
        url=database_url,
        auth_token=auth_token,
    )


class _ResilientClient:
    def __init__(self, database_url, auth_token):
        self._database_url = database_url
        self._auth_token = auth_token
        self._client = _create_client(database_url, auth_token)

    @property
    def closed(self):
        return self._client.closed

    def execute(self, stmt, args=None):
        try:
            return self._client.execute(stmt, args)
        except (aiohttp.ClientConnectionError, asyncio.TimeoutError):
            with _client_lock:
                if not self._client.closed:
                    self._client.close()
                self._client = _create_client(self._database_url, self._auth_token)
            return self._client.execute(stmt, args)

    def close(self):
        self._client.close()


def get_client():
    global _client

    if _client is not None and not _client.closed:
        return _client

    turso_database_url = os.getenv("TURSO_DATABASE_URL")
    turso_auth_token = os.getenv("TURSO_AUTH_TOKEN")

    if not turso_database_url or not turso_auth_token:
        raise RuntimeError(
            "TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN não encontrados. "
            "Confira se o .env existe na pasta backend/ e se load_dotenv() "
            "foi chamado antes desta função."
        )

    with _client_lock:
        if _client is None or _client.closed:
            _client = _ResilientClient(turso_database_url, turso_auth_token)
        return _client