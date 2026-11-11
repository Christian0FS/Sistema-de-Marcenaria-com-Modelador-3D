# Configurações do usuário (Fase 6.1 / V5-14): dados da marcenaria para o contrato
# e cenário padrão. Uma linha por usuário (PK = usuario_id).
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()


class ConfiguracoesInput(BaseModel):
    nome_marcenaria: Optional[str] = None
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cenario_padrao: Optional[str] = None


def _row_para_dict(row):
    return {
        "nomeMarcenaria": row[0],
        "cnpj": row[1],
        "telefone": row[2],
        "email": row[3],
        "endereco": row[4],
        "cenarioPadrao": row[5] or "neutro",
    }


@router.get("")
def ler_configuracoes(usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT nome_marcenaria, cnpj, telefone, email, endereco, cenario_padrao"
        " FROM configuracoes_usuario WHERE usuario_id = ?",
        [usuario_id],
    )
    if resultado.rows:
        return _row_para_dict(resultado.rows[0])
    # sem linha ainda: padrões vazios (o PUT cria)
    return {
        "nomeMarcenaria": "",
        "cnpj": "",
        "telefone": "",
        "email": "",
        "endereco": "",
        "cenarioPadrao": "neutro",
    }


@router.put("")
def salvar_configuracoes(dados: ConfiguracoesInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    campos = {k: v for k, v in dados.model_dump().items() if v is not None}
    if not campos:
        raise HTTPException(status_code=422, detail="Nenhum campo para salvar.")
    if "cenario_padrao" in campos and campos["cenario_padrao"] not in {
        "neutro", "sala", "quarto", "cozinha", "escritorio",
    }:
        raise HTTPException(status_code=422, detail="Cenário padrão inválido.")

    existe = client.execute(
        "SELECT 1 FROM configuracoes_usuario WHERE usuario_id = ?", [usuario_id]
    )
    if existe.rows:
        colunas = ", ".join(f"{k} = ?" for k in campos)
        client.execute(
            f"UPDATE configuracoes_usuario SET {colunas} WHERE usuario_id = ?",
            list(campos.values()) + [usuario_id],
        )
    else:
        colunas = ", ".join(["usuario_id"] + list(campos.keys()))
        marcas = ", ".join("?" for _ in campos)
        client.execute(
            f"INSERT INTO configuracoes_usuario ({colunas}) VALUES (?, {marcas})",
            [usuario_id] + list(campos.values()),
        )

    return ler_configuracoes(usuario_id)
