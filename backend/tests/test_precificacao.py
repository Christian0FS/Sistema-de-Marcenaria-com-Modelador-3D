import unittest

from app.services.exportadores import (
    exportar_csv,
    exportar_dxf,
    exportar_etiquetas_pdf,
    exportar_xml,
)
from app.services.precificacao import calcular_precificacao


class PrecificacaoTests(unittest.TestCase):
    def setUp(self):
        self.pecas = [
            {
                "id": "mod-1:painel-1",
                "modulo_id": "mod-1",
                "modulo_nome": "Armário",
                "nome": "Lateral",
                "tipo": "lateral",
                "chapaId": "mdf-15",
                "espessura": 15,
                "largura_corte": 500,
                "altura_corte": 300,
                "arestasFita": [
                    {
                        "nome": "frente",
                        "comprimentoMm": 1000,
                        "fitaId": "fita-1",
                    },
                ],
            },
            {
                "id": "mod-2:painel-2",
                "modulo_id": "mod-2",
                "modulo_nome": "Bancada",
                "nome": "Tampo",
                "tipo": "tampo",
                "chapaId": "mdf-15",
                "espessura": 15,
                "largura_corte": 500,
                "altura_corte": 300,
                "arestasFita": [
                    {
                        "nome": "frente",
                        "comprimentoMm": 1000,
                        "fitaId": "fita-1",
                    },
                ],
            },
        ]
        self.chapas = [{
            "id": "mdf-15",
            "nome": "MDF Branco",
            "espessura_mm": 15,
            "largura_mm": 1000,
            "altura_mm": 1000,
            "preco_m2": 100,
        }]
        self.fitas = [{"id": "fita-1", "nome": "Fita branca", "preco_metro": 2}]
        self.ferragens = [{
            "id": "dobradica-1",
            "tipo": "dobradica",
            "nome": "Dobradiça",
            "preco_unitario": 5,
        }]

    def test_calculates_all_project_modules_and_applies_loss_and_markup(self):
        resultado = calcular_precificacao(
            self.pecas,
            self.chapas,
            self.fitas,
            self.ferragens,
            [{
                "modulo_id": "mod-1",
                "tipoFerragem": "dobradica",
                "ferragemId": "dobradica-1",
                "quantidade": 2,
            }],
            {
                "perda_percentual": 10,
                "lucro_percentual": 30,
                "modelo_lucro": "markup_custo",
            },
            kerf_mm=0,
        )

        preco = resultado["precificacao"]
        self.assertEqual(resultado["planoCorte"]["chapasUtilizadas"], 1)
        self.assertEqual(preco["custoMdf"], 100)
        self.assertEqual(preco["custoFitas"], 4)
        self.assertEqual(preco["custoFerragens"], 10)
        self.assertEqual(preco["custoPerda"], 10.4)
        self.assertEqual(preco["custoTotal"], 124.4)
        self.assertEqual(preco["precoVenda"], 161.72)

    def test_margin_on_sale_price_is_supported(self):
        resultado = calcular_precificacao(
            self.pecas[:1],
            self.chapas,
            self.fitas,
            self.ferragens,
            [],
            {
                "perda_percentual": 0,
                "lucro_percentual": 25,
                "modelo_lucro": "margem_preco",
            },
            kerf_mm=0,
        )

        self.assertEqual(resultado["precificacao"]["precoVenda"], 136.0)

    def test_exports_csv_xml_and_dxf_for_machine_profiles(self):
        resultado = calcular_precificacao(
            self.pecas[:1],
            self.chapas,
            self.fitas,
            self.ferragens,
            [],
            {
                "perda_percentual": 0,
                "lucro_percentual": 0,
                "modelo_lucro": "markup_custo",
            },
            kerf_mm=0,
        )

        csv_bytes = exportar_csv(resultado, "inmes")
        xml_bytes = exportar_xml(resultado, "scm_cyflex")
        dxf_bytes = exportar_dxf(resultado)

        self.assertIn(b"INMES", csv_bytes)
        self.assertIn(b"nativeCompatibility", xml_bytes)
        self.assertIn(b"CHAPA", dxf_bytes)

    def test_labels_pdf_contains_one_page_for_few_parts(self):
        pdf_bytes = exportar_etiquetas_pdf("Cozinha", self.pecas)

        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 200)


if __name__ == "__main__":
    unittest.main()
