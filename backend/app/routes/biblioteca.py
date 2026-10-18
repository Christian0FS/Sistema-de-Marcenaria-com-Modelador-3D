import uuid
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter(prefix="/biblioteca", tags=["biblioteca"])


class ModuloBiblioteca(BaseModel):
    nome: str
    categoria: Optional[str] = None
    estrutura: dict
    thumbnail_base64: Optional[str] = None


def _row_to_dict(row):
    return {
        "id": row[0],
        "nome": row[1],
        "categoria": row[2],
        "thumbnail_base64": row[3],
        "criado_em": row[4],
    }


@router.post("/modulos", status_code=201)
def salvar_modulo(dados: ModuloBiblioteca, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    modulo_id = str(uuid.uuid4())

    client.execute(
        """
        INSERT INTO biblioteca_modulos (id, usuario_id, nome, categoria, estrutura_json, thumbnail_base64)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        [modulo_id, usuario_id, dados.nome, dados.categoria, json.dumps(dados.estrutura), dados.thumbnail_base64],
    )

    return {"id": modulo_id, "mensagem": "Módulo salvo na biblioteca"}


@router.get("/modulos")
def listar_modulos(categoria: Optional[str] = None, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    if categoria:
        resultado = client.execute(
            "SELECT id, nome, categoria, thumbnail_base64, criado_em FROM biblioteca_modulos WHERE usuario_id = ? AND categoria = ? ORDER BY criado_em DESC",
            [usuario_id, categoria],
        )
    else:
        resultado = client.execute(
            "SELECT id, nome, categoria, thumbnail_base64, criado_em FROM biblioteca_modulos WHERE usuario_id = ? ORDER BY criado_em DESC",
            [usuario_id],
        )

    return [_row_to_dict(row) for row in resultado.rows]


@router.get("/modulos/{modulo_id}")
def buscar_modulo(modulo_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, nome, categoria, estrutura_json, thumbnail_base64 FROM biblioteca_modulos WHERE id = ? AND usuario_id = ?",
        [modulo_id, usuario_id],
    )

    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Módulo não encontrado na biblioteca")

    linha = resultado.rows[0]
    return {
        "id": linha[0],
        "nome": linha[1],
        "categoria": linha[2],
        "estrutura": json.loads(linha[3]),
        "thumbnail_base64": linha[4],
    }


@router.delete("/modulos/{modulo_id}", status_code=204)
def excluir_modulo(modulo_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id FROM biblioteca_modulos WHERE id = ? AND usuario_id = ?",
        [modulo_id, usuario_id],
    )

    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Módulo não encontrado na biblioteca")

    client.execute("DELETE FROM biblioteca_modulos WHERE id = ?", [modulo_id])
    return None