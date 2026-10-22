# Orçamentos persistidos por projeto (Fase 5 do fluxo financeiro).
# Rotas finas: o cálculo real fica em precificacao.py/bin_packing.py; aqui só
# guardamos, devolvemos e validamos. Um orçamento por projeto (recalcular sobrescreve).
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.db.connection import get_client
from app.routes.auth import get_current_user

router = APIRouter()

STATUS_VALIDOS = {"rascunho", "enviado", "aprovado", "em_producao", "recusado"}
FORMAS_PAGAMENTO = {"avista", "cartao", "boleto", "pix"}
# mapeamento explícito para o status do Kanban (projetos.status), documentado no relatório
STATUS_ORCAMENTO_PARA_KANBAN = {
    "rascunho": "orcamento",
    "enviado": "orcamento",
    "aprovado": "orcamento",
    "em_producao": "producao",
    "recusado": "lead",
}


class OrcamentoPatch(BaseModel):
    margem_percentual: Optional[float] = Field(default=None, ge=0, le=500)
    modelo_margem: Optional[str] = None
    desconto: Optional[float] = Field(default=None, ge=0)
    entrada: Optional[float] = Field(default=None, ge=0)
    parcelas: Optional[int] = Field(default=None, ge=1, le=12)
    forma_pagamento: Optional[str] = None
    prazo_entrega_dias: Optional[int] = Field(default=None, ge=0, le=365)
    validade_dias: Optional[int] = Field(default=None, ge=0, le=365)
    status_orcamento: Optional[str] = None


def _agora_iso():
    return datetime.now(timezone.utc).isoformat()


def _row_para_dict(row):
    return {
        "projetoId": row[0],
        "margemPercentual": row[1],
        "modeloMargem": row[2],
        "desconto": row[3],
        "entrada": row[4],
        "parcelas": row[5],
        "formaPagamento": row[6],
        "prazoEntregaDias": row[7],
        "validadeDias": row[8],
        "statusOrcamento": row[9],
        "custoTotal": row[10],
        "precoVenda": row[11],
        "calculadoEm": row[12],
        "detalhe": json.loads(row[13]) if row[13] else None,
    }


def _carregar_orcamento(client, projeto_id, usuario_id):
    resultado = client.execute(
        "SELECT projeto_id, margem_percentual, modelo_margem, desconto, entrada, parcelas,"
        " forma_pagamento, prazo_entrega_dias, validade_dias, status_orcamento, custo_total,"
        " preco_venda, calculado_em, detalhe_json"
        " FROM orcamentos WHERE projeto_id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not resultado.rows:
        return None
    return _row_para_dict(resultado.rows[0])


def _garante_linha(client, projeto_id, usuario_id):
    existe = client.execute(
        "SELECT 1 FROM orcamentos WHERE projeto_id = ?", [projeto_id]
    )
    if not existe.rows:
        client.execute(
            "INSERT INTO orcamentos (projeto_id, usuario_id) VALUES (?, ?)",
            [projeto_id, usuario_id],
        )


def _validar_patch(dados):
    if dados.modelo_margem is not None and dados.modelo_margem not in {"markup_custo", "margem_preco"}:
        raise HTTPException(status_code=422, detail="Modelo de margem inválido.")
    if dados.forma_pagamento is not None and dados.forma_pagamento not in FORMAS_PAGAMENTO:
        raise HTTPException(status_code=422, detail="Forma de pagamento inválida.")
    if dados.status_orcamento is not None and dados.status_orcamento not in STATUS_VALIDOS:
        raise HTTPException(status_code=422, detail="Status de orçamento inválido.")


@router.get("/{projeto_id}")
def orcamento_do_projeto(projeto_id: str, usuario_id: str = Depends(get_current_user)):
    """Devolve o orçamento salvo (ou estrutura vazia se nunca calculado)."""
    client = get_client()
    existe = client.execute(
        "SELECT id, atualizado_em FROM projetos WHERE id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    atualizado_em = existe.rows[0][1]
    salvo = _carregar_orcamento(client, projeto_id, usuario_id)
    if salvo:
        salvo["desatualizado"] = _calcula_desatualizado(salvo["calculadoEm"], atualizado_em)
        return salvo
    return {"projetoId": projeto_id, "calculadoEm": None, "detalhe": None, "desatualizado": True}


@router.post("/{projeto_id}/recalcular")
def recalcular_orcamento(projeto_id: str, dados: dict, usuario_id: str = Depends(get_current_user)):
    """Recalcula (bin_packing + precificacao) sobre o payload atual do frontend e salva."""
    client = get_client()
    existe = client.execute(
        "SELECT id FROM projetos WHERE id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    # importa aqui para evitar dependência circular com orcamento.py
    from app.routes.orcamento import ProducaoInput, _calcular, _validar_payload
    from app.db.connection import get_client as _gc

    try:
        producao = ProducaoInput(**dados)
    except Exception as erro:
        raise HTTPException(status_code=422, detail=f"Payload de produção inválido: {erro}")

    _, _, modulos = None, None, None
    resultado_proj = client.execute(
        "SELECT modulos_json FROM projetos WHERE id = ?", [projeto_id]
    )
    modulos = json.loads(resultado_proj.rows[0][0]) if resultado_proj.rows[0][0] else []

    _validar_payload(producao, modulos)

    # --- persiste: parâmetros atuais do orçamento (margem/desconto) prevalecem
    salvo = _carregar_orcamento(client, projeto_id, usuario_id)
    margem = salvo["margemPercentual"] if salvo else 30
    modelo = salvo["modeloMargem"] if salvo else "markup_custo"
    desconto_salvo = salvo["desconto"] if salvo else 0

    # o desconto entra como parâmetro da precificação (mesma regra do backend)
    producao.parametros.desconto = float(desconto_salvo or 0)
    resultado = _calcular(client, producao)
    preco_final = float(resultado["precificacao"]["precoVenda"])

    _garante_linha(client, projeto_id, usuario_id)
    client.execute(
        "UPDATE orcamentos SET custo_total = ?, preco_venda = ?, calculado_em = ?,"
        " detalhe_json = ?, usuario_id = ? WHERE projeto_id = ?",
        [
            resultado["precificacao"]["custoTotal"],
            round(preco_final, 2),
            _agora_iso(),
            json.dumps(resultado["precificacao"]),
            usuario_id,
            projeto_id,
        ],
    )
    return {**_carregar_orcamento(client, projeto_id, usuario_id), "avisos": resultado.get("avisos", [])}


def _preco_com_margem(precificacao, lucro_percentual, modelo):
    """Mesma fórmula de precificacao.py: markup sobre custo ou margem sobre preço."""
    custo = float(precificacao["custoTotal"])
    if modelo == "margem_preco":
        if lucro_percentual >= 100:
            raise HTTPException(status_code=422, detail="Margem sobre o preço deve ser < 100%.")
        return custo / (1 - lucro_percentual / 100)
    return custo * (1 + lucro_percentual / 100)


@router.patch("/{projeto_id}")
def salvar_orcamento(projeto_id: str, dados: OrcamentoPatch, usuario_id: str = Depends(get_current_user)):
    client = get_client()
    existe = client.execute(
        "SELECT id FROM projetos WHERE id = ? AND usuario_id = ?",
        [projeto_id, usuario_id],
    )
    if not existe.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    _validar_patch(dados)
    _garante_linha(client, projeto_id, usuario_id)
    campos = dados.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=422, detail="Nenhum campo para atualizar")

    colunas = ", ".join(f"{k} = ?" for k in campos)
    valores = list(campos.values()) + [projeto_id]
    client.execute(f"UPDATE orcamentos SET {colunas} WHERE projeto_id = ?", valores)

    # sincroniza o status do Kanban (decisão documentada no relatório)
    if "status_orcamento" in campos:
        kanban = STATUS_ORCAMENTO_PARA_KANBAN.get(campos["status_orcamento"])
        if kanban:
            client.execute("UPDATE projetos SET status = ? WHERE id = ?", [kanban, projeto_id])

    return _carregar_orcamento(client, projeto_id, usuario_id)


def _calcula_desatualizado(calculado_em, atualizado_em):
    """Orçamento está desatualizado se o projeto/módulos mudaram depois do último cálculo."""
    if not calculado_em:
        return True  # nunca calculado
    if not atualizado_em:
        return False
    try:
        return str(atualizado_em) > str(calculado_em)
    except Exception:
        return False


@router.get("")
def listar_orcamentos(usuario_id: str = Depends(get_current_user)):
    """Resumo de todos os orçamentos do usuário (uma chamada só, sem recalcular)."""
    client = get_client()
    resultado = client.execute(
        "SELECT o.projeto_id, o.margem_percentual, o.modelo_margem, o.desconto, o.entrada,"
        " o.parcelas, o.forma_pagamento, o.prazo_entrega_dias, o.validade_dias,"
        " o.status_orcamento, o.custo_total, o.preco_venda, o.calculado_em, o.detalhe_json,"
        " p.nome, p.cliente_id, p.modulos_json, p.criado_em, c.nome, p.atualizado_em"
        " FROM orcamentos o"
        " JOIN projetos p ON p.id = o.projeto_id"
        " LEFT JOIN clientes c ON c.id = p.cliente_id"
        " WHERE o.usuario_id = ?"
        " ORDER BY p.criado_em DESC",
        [usuario_id],
    )
    lista = []
    for row in resultado.rows:
        modulos = json.loads(row[16]) if row[16] else []
        lista.append({
            **_row_para_dict(row[:14]),
            "projetoNome": row[14],
            "clienteNome": row[18],
            "quantidadeModulos": len(modulos),
            "criadoEm": row[17],
            "desatualizado": _calcula_desatualizado(row[12], row[19]),
        })
    return lista
