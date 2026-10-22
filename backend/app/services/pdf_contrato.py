# Geração de contrato PDF (template + campos editáveis + assinatura digital + hash SHA-256)
import base64
import hashlib
import io
import json
import re
from datetime import date


def _moeda(valor):
    return f"R$ {float(valor or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _limpar(valor):
    return re.sub(r"[<>:/\\|?*]+", "-", str(valor or "")).strip() or "contrato"


def gerar_pdf_contrato(projeto, cliente, campos, preco, assinatura_base64=None):
    """Gera o PDF do contrato/orçamento.

    Retorna (bytes_do_pdf, hash_sha256_do_documento, nome_arquivo).
    O hash SHA-256 cobre o conteúdo textual + assinatura e é impresso no rodapé,
    permitindo verificação de integridade após a assinatura.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    arquivo = io.BytesIO()
    doc = SimpleDocTemplate(
        arquivo, pagesize=A4,
        topMargin=18 * mm, bottomMargin=22 * mm,
        leftMargin=18 * mm, rightMargin=18 * mm,
        title=f"Contrato - {projeto.get('nome', '')}",
    )
    estilos = getSampleStyleSheet()
    estilo_titulo = ParagraphStyle("Titulo", parent=estilos["Title"], fontSize=16, spaceAfter=4)
    estilo_sub = ParagraphStyle("Subtitulo", parent=estilos["Normal"], fontSize=9, textColor="#555555")
    estilo_corpo = ParagraphStyle("Corpo", parent=estilos["Normal"], fontSize=9.5, leading=13)
    estilo_secao = ParagraphStyle("Secao", parent=estilos["Heading2"], fontSize=11, spaceBefore=10, spaceAfter=4)

    modulos = projeto.get("modulos") or []
    dados_cliente = campos.get("dados_cliente") or {}
    preco_venda = float((preco or {}).get("precoVenda") or 0)
    custo_total = float((preco or {}).get("custoTotal") or 0)

    def telefone_cliente():
        return (cliente.get("telefone") or "-") if cliente else (dados_cliente.get("telefone") or "-")

    def email_cliente():
        return (cliente.get("email") or "-") if cliente else (dados_cliente.get("email") or "-")

    def endereco_cliente():
        return (cliente.get("endereco") or "-") if cliente else (dados_cliente.get("endereco") or "-")

    secoes = [
        ("1. Partes do contrato", [
            f"<b>Contratada (marcenaria):</b> {dados_cliente.get('marcenaria') or 'Marcenaria'}",
            "<b>Contratante (cliente):</b> " + (
                cliente.get("nome", "-") if cliente else (dados_cliente.get("cliente") or "-")
            ),
            f"<b>Telefone:</b> {telefone_cliente()}",
            f"<b>E-mail:</b> {email_cliente()}",
            f"<b>Endereço de entrega:</b> {endereco_cliente()}",
        ]),
        ("2. Objeto: móveis do projeto", [
            f"{i + 1}. {m.get('nome', 'Móvel')} — "
            f"{(m.get('dimensoes') or {}).get('largura', '?')} × "
            f"{(m.get('dimensoes') or {}).get('altura', '?')} × "
            f"{(m.get('dimensoes') or {}).get('profundidade', '?')} mm"
            for i, m in enumerate(modulos)
        ] or ["Nenhum móvel cadastrado no projeto."]),
        ("3. Valores e pagamento", [
            f"Custo de materiais estimado: {_moeda(custo_total)}",
            f"<b>Valor total do contrato: {_moeda(preco_venda)}</b>",
            f"<b>Entrada:</b> {_moeda(campos.get('entrada') or 0)}",
            f"<b>Pagamento:</b> {campos.get('condicoes') or 'A combinar'}",
            f"<b>Parcelas:</b> {campos.get('parcelas') or '-'}",
        ]),
        ("4. Prazo, entrega e observações", [
            f"Prazo de entrega: {campos.get('prazo') or 'A combinar'}",
            f"Observações: {campos.get('observacoes') or '-'}",
            "O contratante declara ciência das dimensões, acabamentos e ferragens descritos no "
            "projeto 3D aprovado, e que pequenas variações de tonalidade do MDF são "
            "características do material.",
        ]),
    ]

    elementos = [
        Paragraph("Contrato de Fornecimento de Mobiliário Planejado", estilo_titulo),
        Paragraph(
            f"Projeto: {projeto.get('nome', '')} · Documento gerado em "
            f"{date.today().strftime('%d/%m/%Y')}",
            estilo_sub,
        ),
        Spacer(1, 6 * mm),
    ]
    for titulo_secao, linhas in secoes:
        elementos.append(Paragraph(titulo_secao, estilo_secao))
        for linha in linhas:
            elementos.append(Paragraph(linha, estilo_corpo))
    elementos.append(Spacer(1, 14 * mm))

    # ---- Assinaturas (imagem do canvas do frontend + linhas para física)
    meia_pagina = (A4[0] - 36 * mm) / 2
    if assinatura_base64:
        imagem = base64.b64decode(str(assinatura_base64).split(",")[-1])
        imagem_largura = min(meia_pagina - 10 * mm, 70 * mm)
        cedula_contratante = Table(
            [[Image(io.BytesIO(imagem), width=imagem_largura, height=imagem_largura / 2.5)],
             ["____________________________"],
             ["Assinatura digital do contratante"]],
            colWidths=[meia_pagina],
        )
    else:
        cedula_contratante = Table(
            [[Paragraph("<br/><br/><br/>", estilo_corpo)],
             ["____________________________"],
             ["Assinatura do contratante"]],
            colWidths=[meia_pagina],
        )
    cedula_marcenaria = Table(
        [[Paragraph("<br/><br/><br/>", estilo_corpo)],
         ["____________________________"],
         ["Assinatura da marcenaria"]],
        colWidths=[meia_pagina],
    )
    for celula in (cedula_contratante, cedula_marcenaria):
        celula.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, 0), "BOTTOM"),
        ]))
    elementos.append(Table([[cedula_contratante, cedula_marcenaria]]))

    # ---- Hash de integridade (conteúdo textual + assinatura)
    hash_base = json.dumps(
        {
            "projeto": projeto.get("nome"),
            "campos": {k: campos.get(k) for k in
                       ("dados_cliente", "condicoes", "parcelas", "entrada", "prazo", "observacoes")},
            "precoVenda": preco_venda,
            "modulos": [m.get("nome") for m in modulos],
            "assinatura_sha256": (
                hashlib.sha256(str(assinatura_base64).encode("utf-8")).hexdigest()
                if assinatura_base64 else None
            ),
        },
        ensure_ascii=False,
        sort_keys=True,
    ).encode("utf-8")
    hash_documento = hashlib.sha256(hash_base).hexdigest()

    def rodape(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColorRGB(0.4, 0.4, 0.4)
        canvas.drawString(18 * mm, 14 * mm, f"Hash SHA-256 do documento: {hash_documento}")
        canvas.drawRightString(
            A4[0] - 18 * mm, 14 * mm, "Documento gerado pelo sistema Marcenaria CAD/CAM"
        )
        canvas.restoreState()

    doc.build(elementos, onFirstPage=rodape, onLaterPages=rodape)

    nome = f"contrato-{_limpar(projeto.get('nome'))}.pdf"
    return arquivo.getvalue(), hash_documento, nome
