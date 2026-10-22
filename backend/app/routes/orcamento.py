import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.db.connection import get_client
from app.routes.auth import get_current_user
from app.services.exportadores import (
    MAQUINAS,
    exportar_csv,
    exportar_dxf,
    exportar_etiquetas_pdf,
    exportar_xml,
    nome_arquivo_exportacao,
)
from app.services.precificacao import calcular_precificacao


router = APIRouter()


class ParametrosPreco(BaseModel):
    perda_percentual: float = Field(default=10, ge=0, le=100)
    lucro_percentual: float = Field(default=30, ge=0, le=1000)
    modelo_lucro: str = "markup_custo"
    desconto: float = Field(default=0, ge=0)


class ProducaoInput(BaseModel):
    pecas: list[dict] = Field(min_length=1)
    necessidadesFerragens: list[dict] = Field(default_factory=list)
    parametros: ParametrosPreco = Field(default_factory=ParametrosPreco)
    kerfMm: float = Field(default=3, ge=0, le=20)


def _carregar_projeto(projeto_id):
    client = get_client()
    resultado = client.execute(
        "SELECT nome, modulos_json FROM projetos WHERE id = ?",
        [projeto_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    nome, modulos_json = resultado.rows[0]
    return client, nome, json.loads(modulos_json) if modulos_json else []


def _validar_payload(dados, modulos):
    ids_modulos = {str(modulo.get("modulo_id")) for modulo in modulos}
    ids_pecas = set()
    for peca in dados.pecas:
        modulo_id = str(peca.get("modulo_id") or "")
        peca_id = str(peca.get("id") or "")
        if modulo_id not in ids_modulos:
            raise HTTPException(
                status_code=422,
                detail=f'Peça "{peca.get("nome", "sem nome")}" não pertence a um móvel do projeto.',
            )
        if not peca_id or peca_id in ids_pecas:
            raise HTTPException(
                status_code=422,
                detail="Cada peça precisa ter um identificador único.",
            )
        ids_pecas.add(peca_id)

    for necessidade in dados.necessidadesFerragens:
        if str(necessidade.get("modulo_id") or "") not in ids_modulos:
            raise HTTPException(
                status_code=422,
                detail="Uma necessidade de ferragem não pertence a um móvel do projeto.",
            )

    if dados.parametros.modelo_lucro not in {"markup_custo", "margem_preco"}:
        raise HTTPException(status_code=422, detail="Modelo de lucro inválido.")
    if (
        dados.parametros.modelo_lucro == "margem_preco"
        and dados.parametros.lucro_percentual >= 100
    ):
        raise HTTPException(
            status_code=422,
            detail="A margem sobre o preço final deve ser menor que 100%.",
        )


def _calcular(client, dados):
    chapas_resultado = client.execute(
        "SELECT id, nome, espessura_mm, largura_mm, altura_mm, preco_m2 "
        "FROM chapas_mdf ORDER BY nome"
    )
    fitas_resultado = client.execute(
        "SELECT id, nome, preco_metro FROM fitas_borda ORDER BY nome"
    )
    ferragens_resultado = client.execute(
        "SELECT id, tipo, nome, preco_unitario FROM ferragens ORDER BY nome"
    )
    chapas = [
        {
            "id": row[0],
            "nome": row[1],
            "espessura_mm": row[2],
            "largura_mm": row[3],
            "altura_mm": row[4],
            "preco_m2": row[5],
        }
        for row in chapas_resultado.rows
    ]
    fitas = [
        {"id": row[0], "nome": row[1], "preco_metro": row[2]}
        for row in fitas_resultado.rows
    ]
    ferragens = [
        {
            "id": row[0],
            "tipo": row[1],
            "nome": row[2],
            "preco_unitario": row[3],
        }
        for row in ferragens_resultado.rows
    ]

    parametros = dados.parametros.model_dump()
    try:
        return calcular_precificacao(
            dados.pecas,
            chapas,
            fitas,
            ferragens,
            dados.necessidadesFerragens,
            parametros,
            dados.kerfMm,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


def _resposta_arquivo(conteudo, tipo, nome):
    return Response(
        content=conteudo,
        media_type=tipo,
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


@router.post("/{projeto_id}/calcular", dependencies=[Depends(get_current_user)])
def calcular_orcamento(projeto_id: str, dados: ProducaoInput):
    client, _, modulos = _carregar_projeto(projeto_id)
    _validar_payload(dados, modulos)
    return _calcular(client, dados)


@router.post(
    "/{projeto_id}/exportar/{maquina}/{formato}",
    dependencies=[Depends(get_current_user)],
)
def exportar_plano(projeto_id: str, maquina: str, formato: str, dados: ProducaoInput):
    if maquina not in MAQUINAS:
        raise HTTPException(status_code=404, detail="Perfil de máquina não suportado.")
    if formato not in {"csv", "xml"}:
        raise HTTPException(status_code=404, detail="Formato de exportação não suportado.")

    client, projeto_nome, modulos = _carregar_projeto(projeto_id)
    _validar_payload(dados, modulos)
    resultado = _calcular(client, dados)
    if formato == "csv":
        conteudo = exportar_csv(resultado, maquina)
        tipo = "text/csv; charset=utf-8"
    else:
        conteudo = exportar_xml(resultado, maquina)
        tipo = "application/xml; charset=utf-8"

    nome = nome_arquivo_exportacao(projeto_nome, maquina, formato)
    return _resposta_arquivo(conteudo, tipo, nome)


@router.post(
    "/{projeto_id}/exportar/dxf",
    dependencies=[Depends(get_current_user)],
)
def exportar_plano_dxf(projeto_id: str, dados: ProducaoInput):
    client, projeto_nome, modulos = _carregar_projeto(projeto_id)
    _validar_payload(dados, modulos)
    resultado = _calcular(client, dados)
    conteudo = exportar_dxf(resultado)
    nome = nome_arquivo_exportacao(projeto_nome, "dxf", "dxf")
    return _resposta_arquivo(
        conteudo,
        "application/dxf",
        nome,
    )


@router.post(
    "/{projeto_id}/etiquetas",
    dependencies=[Depends(get_current_user)],
)
def exportar_etiquetas(projeto_id: str, dados: ProducaoInput, baseUrl: str = None):
    _, projeto_nome, modulos = _carregar_projeto(projeto_id)
    _validar_payload(dados, modulos)
    pecas_com_projeto = [
        {
            **peca,
            "projeto_id": projeto_id,
            "projeto_nome": projeto_nome,
        }
        for peca in dados.pecas
    ]
    # a URL do manual é a origem do frontend (o QR abre o visualizador 3D da peça)
    base_manual = (baseUrl or "http://localhost:3000").rstrip("/")
    conteudo = exportar_etiquetas_pdf(projeto_nome, pecas_com_projeto, base_url_manual=base_manual)
    nome = nome_arquivo_exportacao(projeto_nome, "etiquetas", "pdf")
    return _resposta_arquivo(conteudo, "application/pdf", nome)
