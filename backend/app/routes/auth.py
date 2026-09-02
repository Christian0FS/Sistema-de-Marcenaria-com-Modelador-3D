import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import JWTError

from app.db.connection import get_client
from app.services.security import hash_senha, verificar_senha, criar_token, decodificar_token

router = APIRouter()
security_scheme = HTTPBearer()


class RegisterInput(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class LoginInput(BaseModel):
    email: EmailStr
    senha: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(dados: RegisterInput):
    client = get_client()

    existe = client.execute(
        "SELECT id FROM usuarios WHERE email = ?", [dados.email]
    )
    if existe.rows:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    usuario_id = str(uuid.uuid4())
    senha_hash = hash_senha(dados.senha)

    client.execute(
        "INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)",
        [usuario_id, dados.nome, dados.email, senha_hash],
    )

    return {"id": usuario_id, "nome": dados.nome, "email": dados.email}


@router.post("/login")
def login(dados: LoginInput):
    client = get_client()

    resultado = client.execute(
        "SELECT id, nome, senha_hash FROM usuarios WHERE email = ?", [dados.email]
    )
    if not resultado.rows:
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    usuario_id, nome, senha_hash = resultado.rows[0]

    if not verificar_senha(dados.senha, senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos")

    token = criar_token(usuario_id)
    return {"access_token": token, "token_type": "bearer", "nome": nome}


def get_current_user(
    credenciais: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> str:
    """Dependency para proteger rotas: valida o token e retorna o id do usuário."""
    try:
        usuario_id = decodificar_token(credenciais.credentials)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado") from exc
    return usuario_id