# Geração de contrato em PDF com assinatura digital
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.db.connection import get_client
from app.routes.auth import get_current_user
from app.services.pdf_contrato import gerar_pdf_contrato

router = APIRouter()


class ContratoInput(BaseModel):
    precoVenda: float = Field(default=0, ge=0)
    custoTotal: float = Field(default=0, ge=0)
    campos: dict = Field(default_factory=dict)
    assinaturaBase64: str | None = None


def _carregar_projeto_e_cliente(projeto_id):
    client = get_client()
    resultado = client.execute(
        "SELECT nome, cliente_id, modulos_json FROM projetos WHERE id = ?",
        [projeto_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    nome, cliente_id, modulos_json = resultado.rows[0]
    projeto = {
        "id": projeto_id,
        "nome": nome,
        "modulos": json.loads(modulos_json) if modulos_json else [],
    }
    cliente = None
    if cliente_id:
        cliente_row = client.execute(
            "SELECT nome, telefone, email, endereco FROM clientes WHERE id = ?",
            [cliente_id],
        )
        if cliente_row.rows:
            cliente = {
                "nome": cliente_row.rows[0][0],
                "telefone": cliente_row.rows[0][1],
                "email": cliente_row.rows[0][2],
                "endereco": cliente_row.rows[0][3],
            }
    return client, projeto, cliente


@router.post("/{projeto_id}", dependencies=[Depends(get_current_user)])
def gerar_contrato(projeto_id: str, dados: ContratoInput):
    """Gera o PDF do contrato (5.1 + 5.2).

    O frontend envia os campos editáveis e, opcionalmente, a assinatura em
    base64 desenhada no canvas; o PDF sai com o hash SHA-256 do documento no
    rodapé para verificação de integridade.
    """
    _, projeto, cliente = _carregar_projeto_e_cliente(projeto_id)
    preco = {
        "precoVenda": dados.precoVenda,
        "custoTotal": dados.custoTotal,
    }
    conteudo, hash_doc, nome = gerar_pdf_contrato(
        projeto, cliente, dados.campos, preco, dados.assinaturaBase64
    )
    return Response(
        content=conteudo,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{nome}"',
            "X-Document-Hash": hash_doc,
        },
    )
