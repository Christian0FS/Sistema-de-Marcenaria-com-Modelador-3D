"""Endpoints públicos (sem autenticação) para o manual de montagem acessado pelo QR Code.

O QR impresso na etiqueta aponta para:
  {FRONTEND_URL}/manual/{projeto_id}/{peca_id}
A página busca os dados aqui e renderiza a vista explodida 3D da peça.
"""
import json
import urllib.parse

from fastapi import APIRouter, HTTPException

from app.db.connection import get_client

router = APIRouter()


def _montar_url_manual(request_url_base: str, projeto_id: str, peca_id: str) -> str:
    return urllib.parse.urljoin(
        f"{request_url_base.rstrip('/')}/",
        f"/manual/{projeto_id}/{peca_id}",
    )


def _localizar_peca(modulos, peca_id):
    """Encontra a peça (com o módulo pai) buscando pelo id composto `modulo:peca` ou por sufixo."""
    if ":" in peca_id:
        modulo_id, id_peca = peca_id.split(":", 1)
        modulo = next((m for m in modulos if m.get("modulo_id") == modulo_id), None)
        if not modulo:
            return None, None
        peca = next(
            (
                p
                for p in json.loads(json.dumps(modulo.get("estrutura") or {})).get("_pecas", [])
                if p.get("id") == id_peca
            ),
            None,
        )
        return modulo, peca
    return None, None


@router.get("/manual/{projeto_id}/{peca_id}")
def manual_peca(projeto_id: str, peca_id: str, baseUrl: str = None):
    """Retorna os dados da peça para o visualizador 3D do manual (rota pública do QR)."""
    client = get_client()
    resultado = client.execute(
        "SELECT nome, modulos_json FROM projetos WHERE id = ?",
        [projeto_id],
    )
    if not resultado.rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    projeto_nome, modulos_json = resultado.rows[0]
    modulos = json.loads(modulos_json) if modulos_json else []

    # O QR carrega o id composto `modulo_id:peca_id`; se vier só o sufixo,
    # procura a peça em todos os módulos.
    if ":" in peca_id:
        modulo_id, id_peca = peca_id.split(":", 1)
        modulo = next((m for m in modulos if m.get("modulo_id") == modulo_id), None)
        peca = None
        if modulo:
            # a peça foi enviada pelo plano de corte (tem os dados de corte)
            peca = _localizar_peca_corte(modulo, id_peca)
        if not modulo or peca is None:
            raise HTTPException(status_code=404, detail="Peça não encontrada")
    else:
        modulo, peca = _procurar_em_todos(modulos, peca_id)
        if peca is None:
            raise HTTPException(status_code=404, detail="Peça não encontrada")

    base = _montar_url_manual(baseUrl or "", projeto_id, peca_id)

    return {
        "projeto": {"id": projeto_id, "nome": projeto_nome},
        "modulo": {"id": modulo.get("modulo_id"), "nome": modulo.get("nome")},
        "peca": peca,
        "urlManual": base,
    }


def _localizar_peca_corte(modulo, id_peca):
    """Procura a peça em qualquer lista do módulo (peças avulsas, pecas do corte)."""
    estrutura = modulo.get("estrutura") or {}
    for colecao in ("pecas",):
        for peca in (estrutura.get(colecao) or []):
            if peca.get("id") == id_peca:
                return {**peca, "moduloId": modulo.get("modulo_id")}
    return None


def _procurar_em_todos(modulos, id_peca):
    for modulo in modulos:
        peca = _localizar_peca_corte(modulo, id_peca)
        if peca:
            return modulo, peca
    return None, None
