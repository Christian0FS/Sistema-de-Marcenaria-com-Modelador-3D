from collections import defaultdict

from app.services.bin_packing import planejar_corte


def calcular_precificacao(
    pecas,
    chapas,
    fitas,
    ferragens,
    necessidades_ferragens,
    parametros,
    kerf_mm=3,
):
    plano = planejar_corte(pecas, chapas, kerf_mm)
    avisos = []
    chapas_por_id = {str(chapa["id"]): chapa for chapa in chapas}
    fitas_por_id = {str(fita["id"]): fita for fita in fitas}
    ferragens_por_id = {
        str(ferragem["id"]): ferragem for ferragem in ferragens
    }

    for item in plano["pecasNaoAlocadas"]:
        avisos.append(f'{item["nome"]}: {item["motivo"]}')

    chapas_precificadas = []
    custo_mdf = 0.0
    for folha in plano["chapas"]:
        chapa = chapas_por_id[folha["chapaId"]]
        area_m2 = (
            float(chapa["largura_mm"]) * float(chapa["altura_mm"]) / 1_000_000
        )
        preco_m2 = float(chapa["preco_m2"])
        custo = area_m2 * preco_m2
        custo_mdf += custo
        existente = next(
            (
                item
                for item in chapas_precificadas
                if item["chapaId"] == folha["chapaId"]
            ),
            None,
        )
        if existente:
            existente["quantidade"] += 1
            existente["custo"] += custo
        else:
            chapas_precificadas.append({
                "chapaId": folha["chapaId"],
                "nome": chapa["nome"],
                "quantidade": 1,
                "areaM2": area_m2,
                "precoM2": preco_m2,
                "custo": custo,
            })

    consumo_fitas = defaultdict(lambda: {"comprimentoMetros": 0.0, "custo": 0.0})
    for peca in pecas:
        for aresta in peca.get("arestasFita", []):
            fita_id = str(aresta.get("fitaId") or "")
            comprimento_mm = float(aresta.get("comprimentoMm") or 0)
            if comprimento_mm <= 0:
                continue
            if not fita_id or fita_id not in fitas_por_id:
                avisos.append(
                    f'{peca.get("nome", "Peça")}: fita de borda não vinculada '
                    f'para a aresta {aresta.get("nome", "sem nome")}.'
                )
                continue

            fita = fitas_por_id[fita_id]
            comprimento_m = comprimento_mm / 1000
            item = consumo_fitas[fita_id]
            item["nome"] = fita["nome"]
            item["precoMetro"] = float(fita["preco_metro"])
            item["comprimentoMetros"] += comprimento_m
            item["custo"] += comprimento_m * item["precoMetro"]

    itens_fita = [
        {"fitaId": fita_id, **item}
        for fita_id, item in consumo_fitas.items()
    ]
    custo_fitas = sum(item["custo"] for item in itens_fita)

    custo_ferragens = 0.0
    itens_ferragem = []
    ferragens_agrupadas = {}
    for necessidade in necessidades_ferragens:
        quantidade = float(necessidade.get("quantidade") or 0)
        if quantidade <= 0:
            continue

        ferragem_id = str(necessidade.get("ferragemId") or "")
        ferragem = ferragens_por_id.get(ferragem_id)
        if not ferragem:
            avisos.append(
                f'Ferragem "{necessidade.get("tipoFerragem", "sem tipo")}" '
                "sem item de estoque vinculado; custo não incluído."
            )
            continue

        preco_unitario = float(ferragem["preco_unitario"])
        custo = quantidade * preco_unitario
        custo_ferragens += custo
        existente = ferragens_agrupadas.get(ferragem_id)
        if existente:
            existente["quantidade"] += quantidade
            existente["custo"] += custo
        else:
            ferragens_agrupadas[ferragem_id] = {
                "ferragemId": ferragem_id,
                "nome": ferragem["nome"],
                "tipo": ferragem["tipo"],
                "quantidade": quantidade,
                "precoUnitario": preco_unitario,
                "custo": custo,
            }
    itens_ferragem = list(ferragens_agrupadas.values())

    perda_percentual = float(parametros["perda_percentual"])
    lucro_percentual = float(parametros["lucro_percentual"])
    modelo_lucro = parametros["modelo_lucro"]
    desconto = float(parametros.get("desconto") or 0)
    custo_base_materiais = custo_mdf + custo_fitas
    custo_perda = custo_base_materiais * perda_percentual / 100
    custo_total = custo_base_materiais + custo_perda + custo_ferragens

    if modelo_lucro == "margem_preco":
        preco_venda = custo_total / (1 - lucro_percentual / 100)
    else:
        preco_venda = custo_total * (1 + lucro_percentual / 100)

    # desconto em reais sobre o preço (não pode ficar negativo)
    preco_venda = max(preco_venda - desconto, 0)

    arredondar = lambda valor: round(valor, 2)
    return {
        "planoCorte": plano,
        "precificacao": {
            "parametros": {
                "perdaPercentual": perda_percentual,
                "lucroPercentual": lucro_percentual,
                "modeloLucro": modelo_lucro,
                "kerfMm": float(kerf_mm),
                "desconto": desconto,
            },
            "chapas": chapas_precificadas,
            "fitas": itens_fita,
            "ferragens": itens_ferragem,
            "custoMdf": arredondar(custo_mdf),
            "custoFitas": arredondar(custo_fitas),
            "custoPerda": arredondar(custo_perda),
            "custoFerragens": arredondar(custo_ferragens),
            "custoTotal": arredondar(custo_total),
            "precoVenda": arredondar(preco_venda),
            "lucroEstimado": arredondar(preco_venda - custo_total),
        },
        "avisos": list(dict.fromkeys(avisos)),
    }
