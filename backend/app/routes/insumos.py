import re
import unicodedata
import uuid
from typing import Optional 

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()

# Chapas MDF

class ChapaInput(BaseModel):
    nome: str
    espessura_mm: float
    largura_mm: float
    altura_mm: float
    preco_m2: float
    estoque_chapas: int = 0  # Estoque inicial de chapas

class ChapaUpdateInput(BaseModel):
    nome: Optional[str] = None
    espessura_mm: Optional[float] = None
    largura_mm: Optional[float] = None
    altura_mm: Optional[float] = None
    preco_m2: Optional[float] = None
    estoque_chapas: Optional[int] = None  # Estoque de chapas

def _chapa_to_dict(row):
    return {
        "id": row[0],
        "nome": row[1],
        "espessura_mm": row[2],
        "largura_mm": row[3],
        "altura_mm": row[4],
        "preco_m2": row[5],
        "estoque_chapas": row[6],
    }

@router.post("/chapas", status_code=201)
def criar_chapa(dados: ChapaInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    chapa_id = str(uuid.uuid4())
    client.execute(
        "INSERT INTO chapas_mdf (id, nome, espessura_mm, largura_mm, altura_mm, preco_m2, estoque_chapas) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [chapa_id, dados.nome, dados.espessura_mm, dados.largura_mm, dados.altura_mm, dados.preco_m2, dados.estoque_chapas],
    )
    return {"id": chapa_id, **dados.dict()}

@router.get("/chapas")
def listar_chapas(usuario_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.execute(
        "SELECT id, nome , espessura_mm, largura_mm, altura_mm, preco_m2, estoque_chapas FROM chapas_mdf ORDER BY nome"  
    )
    return [_chapa_to_dict(row) for row in result.rows]

@router.get("/chapas/{chapa_id}")
def buscar_chapa(chapa_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    result = client.execute(
        "SELECT id, nome , espessura_mm, largura_mm, altura_mm, preco_m2, estoque_chapas FROM chapas_mdf WHERE id = ?",
        [chapa_id],
    ) 
    if not result.rows:
        raise HTTPException(status_code=404, detail="Chapa não encontrada")
    return _chapa_to_dict(result.rows[0])

@router.patch("/chapas/{chapa_id}")
def atualizar_chapa(chapa_id: str, dados: ChapaUpdateInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute(
        "SELECT id FROM chapas_mdf WHERE id = ?",
        [chapa_id],
    )
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Chapa não encontrada")

    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [chapa_id]
    client.execute(f"UPDATE chapas_mdf SET {set_clause} WHERE id = ?", valores)
    return {"id": chapa_id, **campos}

@router.delete("/chapas/{chapa_id}", status_code=204)
def deletar_chapa(chapa_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM chapas_mdf WHERE id = ?", [chapa_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Chapa não encontrada")
    client.execute("DELETE FROM chapas_mdf WHERE id = ?", [chapa_id])
    return None

# Fitas de borda

class FitaInput(BaseModel):
    nome: str
    cor: Optional[str] = None
    preco_metro: float
    estoque_metros: float = 0
 
 
class FitaUpdate(BaseModel):
    nome: Optional[str] = None
    cor: Optional[str] = None
    preco_metro: Optional[float] = None
    estoque_metros: Optional[float] = None
 
 
def _fita_to_dict(row):
    return {
        "id": row[0],
        "nome": row[1],
        "cor": row[2],
        "preco_metro": row[3],
        "estoque_metros": row[4],
    }
 
 
@router.post("/fitas", status_code=201)
def criar_fita(dados: FitaInput, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    fita_id = str(uuid.uuid4())
    client.execute(
        "INSERT INTO fitas_borda (id, nome, cor, preco_metro, estoque_metros) VALUES (?, ?, ?, ?, ?)",
        [fita_id, dados.nome, dados.cor, dados.preco_metro, dados.estoque_metros],
    )
    return {"id": fita_id, **dados.model_dump()}
 
 
@router.get("/fitas")
def listar_fitas(usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, nome, cor, preco_metro, estoque_metros FROM fitas_borda ORDER BY nome"
    )
    return [_fita_to_dict(row) for row in resultado.rows]
 
 
@router.get("/fitas/{fita_id}")
def buscar_fita(fita_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, nome, cor, preco_metro, estoque_metros FROM fitas_borda WHERE id = ?",
        [fita_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Fita não encontrada")
    return _fita_to_dict(resultado.rows[0])
 
 
@router.patch("/fitas/{fita_id}")
def atualizar_fita(fita_id: str, dados: FitaUpdate, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM fitas_borda WHERE id = ?", [fita_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Fita não encontrada")
 
    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
 
    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [fita_id]
    client.execute(f"UPDATE fitas_borda SET {set_clause} WHERE id = ?", valores)
    return {"id": fita_id, **campos}
 
 
@router.delete("/fitas/{fita_id}", status_code=204)
def deletar_fita(fita_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM fitas_borda WHERE id = ?", [fita_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Fita não encontrada")
    client.execute("DELETE FROM fitas_borda WHERE id = ?", [fita_id])
    return None
 
 
# ---------------------------------------------------------------------------
# Ferragens (dobradiça, corrediça, puxador, minifix, cavilha)
# ---------------------------------------------------------------------------
 
TIPOS_FERRAGEM_VALIDOS = {"dobradica", "corredica", "puxador", "minifix", "cavilha"}
 
 
class FerragemInput(BaseModel):
    tipo: str
    nome: str
    preco_unitario: float
    estoque: int = 0
 
 
class FerragemUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    preco_unitario: Optional[float] = None
    estoque: Optional[int] = None
 
 
def _ferragem_to_dict(row):
    return {
        "id": row[0],
        "tipo": row[1],
        "nome": row[2],
        "preco_unitario": row[3],
        "estoque": row[4],
    }
 
 
def _validar_tipo(tipo: str):
    tipo_normalizado = _normalizar_tipo(tipo)
    if tipo_normalizado not in TIPOS_FERRAGEM_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo inválido. Use: dobradica, corredica, puxador, minifix ou cavilha",
        )
    return tipo_normalizado


def _normalizar_tipo(tipo: str):
    sem_acentos = unicodedata.normalize("NFKD", tipo)
    sem_acentos = "".join(caractere for caractere in sem_acentos if not unicodedata.combining(caractere))
    return re.sub(r"[\s-]+", "", sem_acentos.strip().lower())
 
 
@router.post("/ferragens", status_code=201)
def criar_ferragem(dados: FerragemInput, usuario_id: str = Depends(get_current_user)):
    tipo = _validar_tipo(dados.tipo)
    client = get_client()
    ferragem_id = str(uuid.uuid4())
    client.execute(
        "INSERT INTO ferragens (id, tipo, nome, preco_unitario, estoque) VALUES (?, ?, ?, ?, ?)",
        [ferragem_id, tipo, dados.nome, dados.preco_unitario, dados.estoque],
    )
    return {"id": ferragem_id, **dados.model_dump(), "tipo": tipo}
 
 
@router.get("/ferragens")
def listar_ferragens(tipo: Optional[str] = None, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    if tipo:
        tipo = _validar_tipo(tipo)
        resultado = client.execute(
            "SELECT id, tipo, nome, preco_unitario, estoque FROM ferragens WHERE tipo = ? ORDER BY nome",
            [tipo],
        )
    else:
        resultado = client.execute(
            "SELECT id, tipo, nome, preco_unitario, estoque FROM ferragens ORDER BY tipo, nome"
        )
    return [_ferragem_to_dict(row) for row in resultado.rows]
 
 
@router.get("/ferragens/{ferragem_id}")
def buscar_ferragem(ferragem_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    resultado = client.execute(
        "SELECT id, tipo, nome, preco_unitario, estoque FROM ferragens WHERE id = ?",
        [ferragem_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Ferragem não encontrada")
    return _ferragem_to_dict(resultado.rows[0])
 
 
@router.patch("/ferragens/{ferragem_id}")
def atualizar_ferragem(ferragem_id: str, dados: FerragemUpdate, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM ferragens WHERE id = ?", [ferragem_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Ferragem não encontrada")
 
    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    if "tipo" in campos:
        campos["tipo"] = _validar_tipo(campos["tipo"])
 
    set_clause = ", ".join(f"{campo} = ?" for campo in campos)
    valores = list(campos.values()) + [ferragem_id]
    client.execute(f"UPDATE ferragens SET {set_clause} WHERE id = ?", valores)
    return {"id": ferragem_id, **campos}
 
 
@router.delete("/ferragens/{ferragem_id}", status_code=204)
def deletar_ferragem(ferragem_id: str, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute("SELECT id FROM ferragens WHERE id = ?", [ferragem_id])
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Ferragem não encontrada")
    client.execute("DELETE FROM ferragens WHERE id = ?", [ferragem_id])
    return None
 