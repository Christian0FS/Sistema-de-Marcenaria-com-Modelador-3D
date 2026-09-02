import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()


class ClienteInput(BaseModel):
    nome: str
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None


def _row_to_dict(row):
    return {
        "id": row[0],
        "nome": row[1],
        "telefone": row[2],
        "email": row[3],
        "endereco": row[4],
        "criado_em": row[5],
    }


@router.post("", status_code=201)
def criar_cliente(dados: ClienteInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    cliente_id = str(uuid.uuid4())

    client.execute(
        "INSERT INTO clientes (id, nome, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)",
        [cliente_id, dados.nome, dados.telefone, dados.email, dados.endereco],
    )

    return {"id": cliente_id, **dados.model_dump()}


@router.get("")
def listar_clientes(usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, nome, telefone, email, endereco, criado_em FROM clientes ORDER BY criado_em DESC"
    )
    return [_row_to_dict(row) for row in resultado.rows]


@router.get("/{cliente_id}")
def buscar_cliente(cliente_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, nome, telefone, email, endereco, criado_em FROM clientes WHERE id = ?",
        [cliente_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return _row_to_dict(resultado.rows[0])


@router.patch("/{cliente_id}")
def atualizar_cliente(cliente_id: str, dados: ClienteUpdate, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    existe = client.execute("SELECT id FROM clientes WHERE id = ?", [cliente_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [cliente_id]

    client.execute(f"UPDATE clientes SET {set_clause} WHERE id = ?", valores)

    return {"id": cliente_id, **campos}


@router.delete("/{cliente_id}", status_code=204)
def deletar_cliente(cliente_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM clientes WHERE id = ?", [cliente_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    client.execute("DELETE FROM clientes WHERE id = ?", [cliente_id])
    return None