
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()

STATUS_VALIDOS = {"lead", "orcamento", "producao", "montagem"}


class ProjetoInput(BaseModel):
    nome: str
    cliente_id: str


class ProjetoUpdate(BaseModel):
    nome: Optional[str] = None
    status: Optional[str] = None


def _row_to_dict(row):
    return {
        "id": row[0],
        "cliente_id": row[1],
        "nome": row[2],
        "status": row[3],
        "modulos": json.loads(row[4]) if row[4] else [],
        "criado_em": row[5],
    }


@router.post("", status_code=201)
def criar_projeto(dados: ProjetoInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    cliente_existe = client.execute("SELECT id FROM clientes WHERE id = ?", [dados.cliente_id])
    if not cliente_existe.rows:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    projeto_id = str(uuid.uuid4())
    client.execute(
        "INSERT INTO projetos (id, cliente_id, nome, status, modulos_json) VALUES (?, ?, ?, ?, ?)",
        [projeto_id, dados.cliente_id, dados.nome, "lead", "[]"],
    )

    return {
        "id": projeto_id,
        "cliente_id": dados.cliente_id,
        "nome": dados.nome,
        "status": "lead",
        "modulos": [],
    }


@router.get("")
def listar_projetos(status: Optional[str] = None, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    if status:
        if status not in STATUS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Status inválido. Use um de: {STATUS_VALIDOS}")
        resultado = client.execute(
            "SELECT id, cliente_id, nome, status, modulos_json, criado_em FROM projetos WHERE status = ? ORDER BY criado_em DESC",
            [status],
        )
    else:
        resultado = client.execute(
            "SELECT id, cliente_id, nome, status, modulos_json, criado_em FROM projetos ORDER BY criado_em DESC"
        )

    return [_row_to_dict(row) for row in resultado.rows]


@router.get("/{projeto_id}")
def buscar_projeto(projeto_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, cliente_id, nome, status, modulos_json, criado_em FROM projetos WHERE id = ?",
        [projeto_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _row_to_dict(resultado.rows[0])


@router.patch("/{projeto_id}")
def atualizar_projeto(projeto_id: str, dados: ProjetoUpdate, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    existe = client.execute("SELECT id FROM projetos WHERE id = ?", [projeto_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    if "status" in campos and campos["status"] not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use um de: {STATUS_VALIDOS}")

    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [projeto_id]

    client.execute(f"UPDATE projetos SET {set_clause} WHERE id = ?", valores)

    return {"id": projeto_id, **campos}


@router.delete("/{projeto_id}", status_code=204)
def deletar_projeto(projeto_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM projetos WHERE id = ?", [projeto_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    client.execute("DELETE FROM projetos WHERE id = ?", [projeto_id])
    return None