from collections import defaultdict
from math import isfinite


def _positive_number(value, label):
    try:
        number = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"{label} deve ser um número.") from error
    if not isfinite(number) or number <= 0:
        raise ValueError(f"{label} deve ser maior que zero.")
    return number


def _piece_dimensions(piece):
    width = _positive_number(piece.get("largura_corte"), "largura_corte")
    height = _positive_number(piece.get("altura_corte"), "altura_corte")
    return width, height


def _candidate(rect, width, height, rotated):
    if width > rect["largura"] or height > rect["altura"]:
        return None

    sobra_largura = rect["largura"] - width
    sobra_altura = rect["altura"] - height
    score = (
        sobra_largura * sobra_altura,
        min(sobra_largura, sobra_altura),
        max(sobra_largura, sobra_altura),
    )
    return score, width, height, rotated


def _split_rect(rect, width, height):
    sobra_largura = rect["largura"] - width
    sobra_altura = rect["altura"] - height
    novos = []

    if sobra_largura > 0 and sobra_altura > 0:
        if sobra_largura > sobra_altura:
            novos.append({
                "x": rect["x"] + width,
                "y": rect["y"],
                "largura": sobra_largura,
                "altura": rect["altura"],
            })
            novos.append({
                "x": rect["x"],
                "y": rect["y"] + height,
                "largura": width,
                "altura": sobra_altura,
            })
        else:
            novos.append({
                "x": rect["x"] + width,
                "y": rect["y"],
                "largura": sobra_largura,
                "altura": height,
            })
            novos.append({
                "x": rect["x"],
                "y": rect["y"] + height,
                "largura": rect["largura"],
                "altura": sobra_altura,
            })
    elif sobra_largura > 0:
        novos.append({
            "x": rect["x"] + width,
            "y": rect["y"],
            "largura": sobra_largura,
            "altura": rect["altura"],
        })
    elif sobra_altura > 0:
        novos.append({
            "x": rect["x"],
            "y": rect["y"] + height,
            "largura": rect["largura"],
            "altura": sobra_altura,
        })

    return novos


def planejar_corte(pecas, chapas, kerf_mm=3):
    """Places rectangular parts with guillotine Best-Area-Fit, grouped by sheet."""
    try:
        kerf = float(kerf_mm)
    except (TypeError, ValueError) as error:
        raise ValueError("kerf_mm deve ser um número.") from error
    if not isfinite(kerf) or kerf < 0 or kerf > 20:
        raise ValueError("kerf_mm deve estar entre 0 e 20 mm.")

    chapas_por_id = {str(chapa["id"]): chapa for chapa in chapas}
    pecas_por_chapa = defaultdict(list)
    nao_alocadas = []

    for peca in pecas:
        chapa_id = str(peca.get("chapaId") or "")
        if not chapa_id or chapa_id not in chapas_por_id:
            nao_alocadas.append({
                "pecaId": peca.get("id"),
                "nome": peca.get("nome", "Peça sem nome"),
                "motivo": "Chapa MDF não vinculada ou inexistente.",
            })
            continue

        chapa = chapas_por_id[chapa_id]
        espessura = _positive_number(peca.get("espessura"), "espessura")
        espessura_chapa = _positive_number(chapa.get("espessura_mm"), "espessura_mm")
        if abs(espessura - espessura_chapa) > 0.5:
            nao_alocadas.append({
                "pecaId": peca.get("id"),
                "nome": peca.get("nome", "Peça sem nome"),
                "motivo": (
                    f"Espessura da peça ({espessura:g} mm) não corresponde "
                    f"à chapa ({espessura_chapa:g} mm)."
                ),
            })
            continue

        try:
            largura, altura = _piece_dimensions(peca)
        except ValueError as error:
            nao_alocadas.append({
                "pecaId": peca.get("id"),
                "nome": peca.get("nome", "Peça sem nome"),
                "motivo": str(error),
            })
            continue

        pecas_por_chapa[chapa_id].append({
            **peca,
            "largura_corte": largura,
            "altura_corte": altura,
        })

    folhas = []
    for chapa_id, grupo in pecas_por_chapa.items():
        chapa = chapas_por_id[chapa_id]
        largura_chapa = _positive_number(chapa.get("largura_mm"), "largura_mm")
        altura_chapa = _positive_number(chapa.get("altura_mm"), "altura_mm")
        folhas_chapa = []
        ordenadas = sorted(
            grupo,
            key=lambda item: item["largura_corte"] * item["altura_corte"],
            reverse=True,
        )

        for peca in ordenadas:
            largura = peca["largura_corte"] + kerf
            altura = peca["altura_corte"] + kerf
            pode_girar = bool(peca.get("permiteRotacao", False))
            melhor = None

            for indice_folha, folha in enumerate(folhas_chapa):
                for indice_retangulo, retangulo in enumerate(folha["livres"]):
                    orientacoes = [(largura, altura, False)]
                    if pode_girar and largura != altura:
                        orientacoes.append((altura, largura, True))
                    for tamanho_largura, tamanho_altura, girada in orientacoes:
                        resultado = _candidate(
                            retangulo, tamanho_largura, tamanho_altura, girada
                        )
                        if resultado is None:
                            continue
                        score, _, _, _ = resultado
                        chave = (score, indice_folha, indice_retangulo)
                        if melhor is None or chave < melhor["chave"]:
                            melhor = {
                                "chave": chave,
                                "folha": folha,
                                "indice_folha": indice_folha,
                                "indice_retangulo": indice_retangulo,
                                "retangulo": retangulo,
                                "largura": tamanho_largura,
                                "altura": tamanho_altura,
                                "rotacionada": girada,
                            }

            if melhor is None:
                orientacoes = [(largura, altura, False)]
                if pode_girar and largura != altura:
                    orientacoes.append((altura, largura, True))
                cabiveis = [
                    (w, h, girada)
                    for w, h, girada in orientacoes
                    if w <= largura_chapa and h <= altura_chapa
                ]
                if not cabiveis:
                    nao_alocadas.append({
                        "pecaId": peca.get("id"),
                        "nome": peca.get("nome", "Peça sem nome"),
                        "motivo": "A peça não cabe nas dimensões da chapa selecionada.",
                    })
                    continue

                retangulo_chapa = {
                    "x": 0,
                    "y": 0,
                    "largura": largura_chapa,
                    "altura": altura_chapa,
                }
                orientacao = min(
                    cabiveis,
                    key=lambda item: _candidate(
                        retangulo_chapa, item[0], item[1], item[2]
                    )[0],
                )
                tamanho_largura, tamanho_altura, girada = orientacao
                folha = {
                    "chapaId": chapa_id,
                    "largura_mm": largura_chapa,
                    "altura_mm": altura_chapa,
                    "livres": [{
                        "x": 0,
                        "y": 0,
                        "largura": largura_chapa,
                        "altura": altura_chapa,
                    }],
                    "pecas": [],
                }
                folhas_chapa.append(folha)
                retangulo = folha["livres"].pop(0)
            else:
                folha = melhor["folha"]
                retangulo = folha["livres"].pop(melhor["indice_retangulo"])
                tamanho_largura = melhor["largura"]
                tamanho_altura = melhor["altura"]
                girada = melhor["rotacionada"]

            folha["pecas"].append({
                "id": peca.get("id"),
                "nome": peca.get("nome", "Peça sem nome"),
                "moduloId": peca.get("modulo_id"),
                "modulo": peca.get("modulo_nome", ""),
                "x": retangulo["x"],
                "y": retangulo["y"],
                "largura": peca["altura_corte"] if girada else peca["largura_corte"],
                "altura": peca["largura_corte"] if girada else peca["altura_corte"],
                "rotacionada": girada,
                "espessura": peca["espessura"],
                "tipo": peca.get("tipo", ""),
                "arestasFita": peca.get("arestasFita", []),
            })
            folha["livres"].extend(
                _split_rect(retangulo, tamanho_largura, tamanho_altura)
            )

        for indice, folha in enumerate(folhas_chapa, start=1):
            folha.pop("livres")
            folha["indice"] = indice
            area_chapa = largura_chapa * altura_chapa
            area_pecas = sum(
                item["largura"] * item["altura"] for item in folha["pecas"]
            )
            folha["areaChapaMm2"] = area_chapa
            folha["areaPecasMm2"] = area_pecas
            folha["aproveitamentoPercent"] = (
                round(100 * area_pecas / area_chapa, 2) if area_chapa else 0
            )
            folhas.append(folha)

    area_total_chapas = sum(folha["areaChapaMm2"] for folha in folhas)
    area_total_pecas = sum(folha["areaPecasMm2"] for folha in folhas)
    return {
        "chapas": folhas,
        "chapasUtilizadas": len(folhas),
        "pecasAlocadas": sum(len(folha["pecas"]) for folha in folhas),
        "pecasNaoAlocadas": nao_alocadas,
        "kerfMm": kerf,
        "algoritmo": "Guillotine Best-Area-Fit",
        "aproveitamentoPercent": (
            round(100 * area_total_pecas / area_total_chapas, 2)
            if area_total_chapas
            else 0
        ),
    }
