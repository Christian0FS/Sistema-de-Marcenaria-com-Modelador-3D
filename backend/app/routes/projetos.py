
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()

STATUS_VALIDOS = {"lead", "orcamento", "producao", "montagem"}
# Fase 6: ids de cenário conhecidos (mesma lista de frontend/src/lib/cenarios.js)
CENARIOS_VALIDOS = {"neutro", "sala", "quarto", "cozinha", "escritorio"}


class ProjetoInput(BaseModel):
    nome: str
    cliente_id: str
    cenario: Optional[str] = None


class ProjetoUpdate(BaseModel):
    nome: Optional[str] = None
    status: Optional[str] = None
    cenario: Optional[str] = None


def _row_to_dict(row):
    return {
        "id": row[0],
        "cliente_id": row[1],
        "nome": row[2],
        "status": row[3],
        "modulos": json.loads(row[4]) if row[4] else [],
        "cenario": row[5] if len(row) > 5 and row[5] else "neutro",
        "criado_em": row[6] if len(row) > 6 else None,
    }


def _validar_cenario(cenario):
    if cenario is None:
        return None
    if cenario not in CENARIOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Cenário inválido. Use um de: {', '.join(sorted(CENARIOS_VALIDOS))}",
        )
    return cenario


@router.post("", status_code=201, dependencies=[Depends(get_current_user)])
def criar_projeto(dados: ProjetoInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    cliente_existe = client.execute("SELECT id FROM clientes WHERE id = ?", [dados.cliente_id])
    if not cliente_existe.rows:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    cenario = _validar_cenario(dados.cenario) or "neutro"
    projeto_id = str(uuid.uuid4())
    client.execute(
        "INSERT INTO projetos (id, usuario_id, cliente_id, nome, status, modulos_json, cenario) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [projeto_id, usuario_id, dados.cliente_id, dados.nome, "lead", "[]", cenario],
    )

    return {
        "id": projeto_id,
        "cliente_id": dados.cliente_id,
        "nome": dados.nome,
        "status": "lead",
        "modulos": [],
        "cenario": cenario,
    }


@router.get("", dependencies=[Depends(get_current_user)])
def listar_projetos(status: Optional[str] = None, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    if status:
        if status not in STATUS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Status inválido. Use um de: {STATUS_VALIDOS}")
        resultado = client.execute(
            "SELECT id, cliente_id, nome, status, modulos_json, cenario, criado_em FROM projetos WHERE usuario_id = ? AND status = ? ORDER BY criado_em DESC",
            [usuario_id, status],
        )
    else:
        resultado = client.execute(
            "SELECT id, cliente_id, nome, status, modulos_json, cenario, criado_em FROM projetos WHERE usuario_id = ? ORDER BY criado_em DESC",
            [usuario_id],
        )

    return [_row_to_dict(row) for row in resultado.rows]


@router.get("/{projeto_id}", dependencies=[Depends(get_current_user)])
def buscar_projeto(projeto_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, cliente_id, nome, status, modulos_json, cenario, criado_em FROM projetos WHERE id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _row_to_dict(resultado.rows[0])


@router.patch("/{projeto_id}", dependencies=[Depends(get_current_user)])
def atualizar_projeto(projeto_id: str, dados: ProjetoUpdate, usuario_id: str = Depends(get_current_user)):
    client = get_client()

    existe = client.execute(
        "SELECT id FROM projetos WHERE id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    if "status" in campos and campos["status"] not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use um de: {STATUS_VALIDOS}")

    if "cenario" in campos:
        _validar_cenario(campos["cenario"])

    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [projeto_id]

    client.execute(f"UPDATE projetos SET {set_clause} WHERE id = ?", valores)

    return {"id": projeto_id, **campos}


@router.delete("/{projeto_id}", status_code=204, dependencies=[Depends(get_current_user)])
def deletar_projeto(projeto_id: str):
    client = get_client()
    existe = client.execute("SELECT id FROM projetos WHERE id = ?", [projeto_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    client.execute("DELETE FROM projetos WHERE id = ?", [projeto_id])
    return None

class ModuloInput(BaseModel):
    nome: str
    dimensoes: dict
    estrutura: dict = {"divisoes": [], "internos": [], "portas": []}
    aparencia: dict = {}


def _agora_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _carregar_modulos(client, projeto_id: str):
    resultado = client.execute(
        "SELECT modulos_json FROM projetos WHERE id = ?", [projeto_id]
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return json.loads(resultado.rows[0][0]) if resultado.rows[0][0] else []

def _salvar_modulos(client, projeto_id: str, modulos: list):
    # qualquer mudança de módulos marca o projeto como atualizado (o orçamento
    # salvo vira "desatualizado" quando calculado_em < atualizado_em)
    client.execute(
        "UPDATE projetos SET modulos_json = ?, atualizado_em = ? WHERE id = ?",
        [json.dumps(modulos), _agora_iso(), projeto_id],
    )

@router.post("/{projeto_id}/modulos", status_code=201, dependencies=[Depends(get_current_user)])
def adicionar_modulo(projeto_id: str, dados: ModuloInput):
    client = get_client()
    modulos = _carregar_modulos(client, projeto_id)

    novo_modulo = {"modulo_id": str(uuid.uuid4()), **dados.model_dump()}
    modulos.append(novo_modulo)

    _salvar_modulos(client, projeto_id, modulos)
    return novo_modulo

@router.get("/{projeto_id}/modulos/{modulo_id}", dependencies=[Depends(get_current_user)])
def buscar_modulo(projeto_id: str, modulo_id: str):
    client = get_client()
    modulos = _carregar_modulos(client, projeto_id)

    modulo = next((m for m in modulos if m["modulo_id"] == modulo_id), None)
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return modulo

@router.patch("/{projeto_id}/modulos/{modulo_id}", dependencies=[Depends(get_current_user)])
def atualizar_modulo(projeto_id: str, modulo_id: str, dados: ModuloInput):
    client = get_client()
    modulos = _carregar_modulos(client, projeto_id)

    indice = next((i for i, m in enumerate(modulos) if m["modulo_id"] == modulo_id), None)
    if indice is None:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")

    modulos[indice] = {"modulo_id": modulo_id, **dados.model_dump()}
    _salvar_modulos(client, projeto_id, modulos)
    return modulos[indice]

@router.delete("/{projeto_id}/modulos/{modulo_id}", status_code=204, dependencies=[Depends(get_current_user)])
def deletar_modulo(projeto_id: str, modulo_id: str):
    client = get_client()
    modulos = _carregar_modulos(client, projeto_id)

    novos_modulos = [m for m in modulos if m["modulo_id"] != modulo_id]
    if len(novos_modulos) == len(modulos):
        raise HTTPException(status_code=404, detail="Módulo não encontrado")

    _salvar_modulos(client, projeto_id, novos_modulos)
    return None

@router.post("/{projeto_id}/modulos/{modulo_id}/calcular-ferragens", dependencies=[Depends(get_current_user)])
def calcular_ferragens_modulo(projeto_id: str, modulo_id: str):
    """
    Recebe o tipoFerragem necessário de cada peça (calculado no frontend)
    e tenta auto-vincular com o primeiro item compatível do cadastro de
    ferragens do usuário. Se não achar correspondência, deixa ferragemId
    como null para o usuário escolher manualmente depois.
    """
    client = get_client()
    modulos = _carregar_modulos(client, projeto_id)

    modulo = next((m for m in modulos if m["modulo_id"] == modulo_id), None)
    if not modulo:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")

    # busca ferragens cadastradas, agrupadas por tipo
    ferragens_cadastradas = client.execute(
        "SELECT id, tipo, nome FROM ferragens"
    ).rows

    def achar_ferragem_por_tipo(tipo_ferragem):
        correspondente = next(
            (f for f in ferragens_cadastradas if f[1] == tipo_ferragem), None
        )
        return correspondente[0] if correspondente else None

    # aplica a correspondência em cada porta
    for porta in modulo["estrutura"].get("portas", []):
        for necessidade in porta.get("ferragens", []):
            necessidade["ferragemId"] = necessidade.get("ferragemId") or achar_ferragem_por_tipo(
                necessidade.get("tipoFerragem")
            )

    # aplica a correspondência em cada gaveteiro (dentro de internos)
    for interno in modulo["estrutura"].get("internos", []):
        if interno.get("tipo") == "gaveteiro":
            for necessidade in interno.get("ferragens", []):
                necessidade["ferragemId"] = necessidade.get("ferragemId") or achar_ferragem_por_tipo(
                    necessidade.get("tipoFerragem")
                )

    _salvar_modulos(client, projeto_id, modulos)
    return modulo
