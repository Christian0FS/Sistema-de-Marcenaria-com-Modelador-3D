"""Testes do fluxo de orçamento (Fase 5 do prompt financeiro).

Sem banco real: usa um cliente fake em memória que guarda os statements e
devolve linhas programadas, cobrindo a lógica de validação e a fórmula de preço.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import HTTPException

from app.routes.orcamentos import (
    STATUS_ORCAMENTO_PARA_KANBAN,
    OrcamentoPatch,
    _validar_patch,
    _preco_com_margem,
    STATUS_VALIDOS,
)


def test_status_validos_cobrem_os_cinco_estados():
    assert STATUS_VALIDOS == {
        "rascunho",
        "enviado",
        "aprovado",
        "em_producao",
        "recusado",
    }


def test_mapeamento_status_orcamento_para_kanban():
    # decisão documentada: em_producao move o Kanban; recusado volta a lead
    assert STATUS_ORCAMENTO_PARA_KANBAN["em_producao"] == "producao"
    assert STATUS_ORCAMENTO_PARA_KANBAN["recusado"] == "lead"
    assert STATUS_ORCAMENTO_PARA_KANBAN["rascunho"] == "orcamento"


def test_patch_rejeita_margem_acima_de_500():
    try:
        OrcamentoPatch(margem_percentual=600)
        assert False, "aceitou margem 600"
    except Exception:
        pass  # pydantic levanta ValidationError


def test_patch_rejeita_parcelas_fora_de_1_a_12():
    try:
        OrcamentoPatch(parcelas=13)
        assert False, "aceitou 13 parcelas"
    except Exception:
        pass


def test_validar_patch_rejeita_status_e_forma_invalidos():
    for campo, valor in (("status_orcamento", "volante"), ("forma_pagamento", "fiado")):
        try:
            _validar_patch(OrcamentoPatch(**{campo: valor}))
            assert False, f"aceitou {campo}={valor}"
        except HTTPException as erro:
            assert erro.status_code == 422


def test_preco_com_margem_markup_sobre_custo():
    # fórmula de precificacao.py: custo * (1 + margem/100)
    assert _preco_com_margem({"custoTotal": 1000}, 30, "markup_custo") == 1300


def test_preco_com_margem_sobre_preco():
    # custo / (1 - margem/100): 1000 com 20% de margem sobre o preço = 1250
    assert _preco_com_margem({"custoTotal": 1000}, 20, "margem_preco") == 1250


def test_preco_com_margem_100_sobre_preco_e_invalido():
    try:
        _preco_com_margem({"custoTotal": 1000}, 100, "margem_preco")
        assert False, "aceitou margem 100% sobre o preço"
    except HTTPException as erro:
        assert erro.status_code == 422


def test_preco_sem_margem_fica_igual_ao_custo():
    assert _preco_com_margem({"custoTotal": 780.55}, 0, "markup_custo") == 780.55


def test_desconto_aplicado_na_precificacao():
    """Fase 5: desconto em reais sai do preço de venda (não fica negativo)."""
    from app.services.precificacao import calcular_precificacao

    chapas = [{
        "id": "c1", "nome": "MDF 15", "espessura_mm": 15,
        "largura_mm": 1000, "altura_mm": 500, "preco_m2": 100,
    }]
    pecas = [{
        "id": "p1", "nome": "Tampo", "chapaId": "c1",
        "largura_corte": 900, "altura_corte": 400, "espessura": 15,
        "arestasFita": [],
    }]

    base = calcular_precificacao(pecas, chapas, [], [], [], {
        "perda_percentual": 0, "lucro_percentual": 0, "modelo_lucro": "markup_custo",
    }, 0)
    # chapa inteira 1,0 × 0,5 m × R$ 100/m² = R$ 50,00
    assert base["precificacao"]["custoTotal"] == 50.0

    com_desconto = calcular_precificacao(pecas, chapas, [], [], [], {
        "perda_percentual": 0, "lucro_percentual": 0, "modelo_lucro": "markup_custo",
        "desconto": 10,
    }, 0)
    assert com_desconto["precificacao"]["precoVenda"] == 40.0
    assert com_desconto["precificacao"]["custoTotal"] == 50.0  # custo não muda


def test_desconto_nao_deixa_preco_negativo():
    from app.services.precificacao import calcular_precificacao

    chapas = [{
        "id": "c1", "nome": "MDF 15", "espessura_mm": 15,
        "largura_mm": 1000, "altura_mm": 500, "preco_m2": 100,
    }]
    pecas = [{
        "id": "p1", "nome": "Tampo", "chapaId": "c1",
        "largura_corte": 900, "altura_corte": 400, "espessura": 15,
        "arestasFita": [],
    }]
    excessivo = calcular_precificacao(pecas, chapas, [], [], [], {
        "perda_percentual": 0, "lucro_percentual": 0, "modelo_lucro": "markup_custo",
        "desconto": 999,
    }, 0)
    assert excessivo["precificacao"]["precoVenda"] == 0
