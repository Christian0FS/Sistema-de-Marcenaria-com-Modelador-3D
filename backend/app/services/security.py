import os
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def hash_senha(senha: str) -> str:
    senha_bytes = senha.encode("utf-8")
    hash_bytes = bcrypt.hashpw(senha_bytes, bcrypt.gensalt())
    return hash_bytes.decode("utf-8")


def verificar_senha(senha_digitada: str, senha_hash: str) -> bool:
    return bcrypt.checkpw(senha_digitada.encode("utf-8"), senha_hash.encode("utf-8"))


def criar_token(usuario_id: str) -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET não encontrado no .env")

    expira_em = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": usuario_id, "exp": expira_em}
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def decodificar_token(token: str) -> str:
    """Retorna o id do usuário se o token for válido, senão levanta exceção."""
    secret = os.getenv("JWT_SECRET")
    payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
    return payload["sub"]