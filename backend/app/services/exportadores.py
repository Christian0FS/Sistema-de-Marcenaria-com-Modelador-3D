import csv
import io
import json
import re
import textwrap
import xml.etree.ElementTree as ET


MAQUINAS = {
    "inmes": "INMES",
    "giben": "Giben",
    "scm_cyflex": "SCM Cyflex",
    "corte_cloud": "Corte Cloud",
}


def _nome_arquivo(valor):
    nome = re.sub(r"[^a-zA-Z0-9_-]+", "-", str(valor or "projeto")).strip("-")
    return nome or "projeto"


def exportar_csv(resultado, maquina):
    if maquina not in MAQUINAS:
        raise ValueError("Máquina não suportada.")

    conteudo = io.StringIO(newline="")
    escritor = csv.writer(conteudo, delimiter=";", lineterminator="\r\n")
    escritor.writerow([
        "machine_profile",
        "sheet_number",
        "sheet_id",
        "sheet_width_mm",
        "sheet_height_mm",
        "part_id",
        "part_name",
        "module_name",
        "part_width_mm",
        "part_height_mm",
        "thickness_mm",
        "x_mm",
        "y_mm",
        "rotated",
        "edge_banding",
    ])

    for chapa in resultado["planoCorte"]["chapas"]:
        for peca in chapa["pecas"]:
            arestas = ",".join(
                str(aresta.get("nome", ""))
                for aresta in peca.get("arestasFita", [])
            )
            escritor.writerow([
                MAQUINAS[maquina],
                chapa["indice"],
                chapa["chapaId"],
                chapa["largura_mm"],
                chapa["altura_mm"],
                peca["id"],
                peca["nome"],
                peca.get("modulo", ""),
                peca["largura"],
                peca["altura"],
                peca["espessura"],
                peca["x"],
                peca["y"],
                "1" if peca["rotacionada"] else "0",
                arestas,
            ])

    return conteudo.getvalue().encode("utf-8-sig")


def exportar_xml(resultado, maquina):
    if maquina not in MAQUINAS:
        raise ValueError("Máquina não suportada.")

    raiz = ET.Element(
        "CuttingPlan",
        {
            "machineProfile": MAQUINAS[maquina],
            "schema": "common-v1",
            "nativeCompatibility": "not-validated",
            "algorithm": resultado["planoCorte"]["algoritmo"],
        },
    )
    folhas = ET.SubElement(raiz, "Sheets")

    for chapa in resultado["planoCorte"]["chapas"]:
        folha = ET.SubElement(
            folhas,
            "Sheet",
            {
                "number": str(chapa["indice"]),
                "materialId": chapa["chapaId"],
                "widthMm": str(chapa["largura_mm"]),
                "heightMm": str(chapa["altura_mm"]),
            },
        )
        for peca in chapa["pecas"]:
            ET.SubElement(
                folha,
                "Part",
                {
                    "id": str(peca["id"]),
                    "name": str(peca["nome"]),
                    "moduleId": str(peca.get("moduloId") or ""),
                    "module": str(peca.get("modulo") or ""),
                    "widthMm": str(peca["largura"]),
                    "heightMm": str(peca["altura"]),
                    "thicknessMm": str(peca["espessura"]),
                    "xMm": str(peca["x"]),
                    "yMm": str(peca["y"]),
                    "rotated": str(peca["rotacionada"]).lower(),
                    "type": str(peca.get("tipo") or ""),
                },
            )

    avisos = ET.SubElement(raiz, "UnallocatedParts")
    for item in resultado["planoCorte"]["pecasNaoAlocadas"]:
        ET.SubElement(
            avisos,
            "Part",
            {
                "id": str(item.get("pecaId") or ""),
                "name": str(item["nome"]),
                "reason": str(item["motivo"]),
            },
        )

    ET.indent(raiz, space="  ")
    return ET.tostring(raiz, encoding="utf-8", xml_declaration=True)


def exportar_dxf(resultado):
    import ezdxf

    desenho = ezdxf.new("R2010")
    desenho.header["$INSUNITS"] = 4
    desenho.layers.new("CHAPA", dxfattribs={"color": 8})
    desenho.layers.new("PECAS", dxfattribs={"color": 3})
    desenho.layers.new("IDENTIFICACAO", dxfattribs={"color": 5})
    espaco = desenho.modelspace()

    for indice, chapa in enumerate(resultado["planoCorte"]["chapas"]):
        deslocamento_x = indice * (chapa["largura_mm"] + 150)
        x0 = deslocamento_x
        y0 = 0
        espaco.add_lwpolyline(
            [
                (x0, y0),
                (x0 + chapa["largura_mm"], y0),
                (x0 + chapa["largura_mm"], y0 + chapa["altura_mm"]),
                (x0, y0 + chapa["altura_mm"]),
                (x0, y0),
            ],
            dxfattribs={"layer": "CHAPA"},
            close=True,
        )
        titulo = espaco.add_text(
            f'CHAPA {chapa["indice"]} - {chapa["chapaId"]}',
            dxfattribs={"layer": "IDENTIFICACAO", "height": 12},
        )
        titulo.set_placement((x0, y0 + chapa["altura_mm"] + 20))
        for peca in chapa["pecas"]:
            x = x0 + peca["x"]
            y = y0 + peca["y"]
            largura = peca["largura"]
            altura = peca["altura"]
            espaco.add_lwpolyline(
                [
                    (x, y),
                    (x + largura, y),
                    (x + largura, y + altura),
                    (x, y + altura),
                    (x, y),
                ],
                dxfattribs={"layer": "PECAS"},
                close=True,
            )
            etiqueta = espaco.add_text(
                str(peca["id"]),
                dxfattribs={
                    "layer": "IDENTIFICACAO",
                    "height": min(10, max(3, min(largura, altura) / 5)),
                },
            )
            etiqueta.set_placement((x + 2, y + 2))

    conteudo = io.StringIO()
    desenho.write(conteudo)
    return conteudo.getvalue().encode("utf-8")


def exportar_etiquetas_pdf(projeto_nome, pecas, base_url_manual="http://localhost:3000"):
    """Gera etiquetas com QR Code que apontam para o manual de montagem (5.3)."""
    import qrcode
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    arquivo = io.BytesIO()
    pagina = canvas.Canvas(arquivo, pagesize=A4)
    largura_pagina, altura_pagina = A4
    largura_etiqueta = 62 * 2.83464567
    altura_etiqueta = 34 * 2.83464567
    espacamento_x = 3 * 2.83464567
    espacamento_y = 2 * 2.83464567
    colunas = 3
    linhas = 8
    largura_grade = colunas * largura_etiqueta + (colunas - 1) * espacamento_x
    altura_grade = linhas * altura_etiqueta + (linhas - 1) * espacamento_y
    margem_x = (largura_pagina - largura_grade) / 2
    margem_y = (altura_pagina - altura_grade) / 2

    for indice, peca in enumerate(pecas):
        posicao_pagina = indice % (colunas * linhas)
        if indice and posicao_pagina == 0:
            pagina.showPage()

        coluna = posicao_pagina % colunas
        linha = posicao_pagina // colunas
        x = margem_x + coluna * (largura_etiqueta + espacamento_x)
        y = altura_pagina - margem_y - (linha + 1) * altura_etiqueta - linha * espacamento_y
        pagina.rect(x, y, largura_etiqueta, altura_etiqueta)

        codigo = json.dumps(
            {
                "tipo": "manual",
                "projeto": peca.get("projeto_nome") or projeto_nome,
                "projetoId": peca.get("projeto_id"),
                "moduloId": peca.get("modulo_id"),
                "modulo": peca.get("modulo_nome"),
                "pecaId": peca.get("id"),
                "peca": peca.get("nome"),
                "larguraMm": peca.get("largura_corte"),
                "alturaMm": peca.get("altura_corte"),
                "espessuraMm": peca.get("espessura"),
                "url": f"{base_url_manual}/manual/{peca.get('projeto_id')}/{peca.get('id')}",
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        qr = qrcode.QRCode(box_size=4, border=1)
        qr.add_data(codigo)
        qr.make(fit=True)
        imagem = qr.make_image(fill_color="black", back_color="white")
        imagem_buffer = io.BytesIO()
        imagem.save(imagem_buffer, format="PNG")
        imagem_buffer.seek(0)
        lado_qr = 25 * 2.83464567
        pagina.drawImage(
            ImageReader(imagem_buffer),
            x + 2 * 2.83464567,
            y + (altura_etiqueta - lado_qr) / 2,
            width=lado_qr,
            height=lado_qr,
        )

        texto_x = x + 29 * 2.83464567
        texto_y = y + altura_etiqueta - 5 * 2.83464567
        pagina.setFont("Helvetica-Bold", 7)
        pagina.drawString(texto_x, texto_y, "PECA")
        pagina.setFont("Helvetica", 6)
        pagina.drawString(
            texto_x,
            texto_y - 9,
            str(peca.get("projeto_nome") or projeto_nome)[:25],
        )
        pagina.drawString(
            texto_x,
            texto_y - 18,
            str(peca.get("modulo_nome") or "Modulo")[:25],
        )
        nome_linhas = textwrap.wrap(str(peca.get("nome") or "Peca"), width=22)[:2]
        for linha_nome, texto in enumerate(nome_linhas):
            pagina.drawString(texto_x, texto_y - 27 - linha_nome * 8, texto)
        pagina.drawString(
            texto_x,
            y + 3 * 2.83464567,
            (
                f'{peca.get("largura_corte", 0)} x {peca.get("altura_corte", 0)} '
                f'x {peca.get("espessura", 0)} mm'
            ),
        )

    pagina.save()
    return arquivo.getvalue()


def nome_arquivo_exportacao(projeto_nome, maquina, formato):
    projeto = _nome_arquivo(projeto_nome)
    perfil = _nome_arquivo(MAQUINAS.get(maquina, maquina))
    return f"{projeto}-plano-corte-{perfil}.{formato}"
