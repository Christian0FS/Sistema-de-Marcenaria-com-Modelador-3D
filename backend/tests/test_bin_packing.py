import unittest

from app.services.bin_packing import planejar_corte


class BinPackingTests(unittest.TestCase):
    def setUp(self):
        self.chapas = [{
            "id": "mdf-15",
            "nome": "MDF branco",
            "espessura_mm": 15,
            "largura_mm": 1200,
            "altura_mm": 800,
            "preco_m2": 100,
        }]

    def peca(self, identificador, largura, altura, **campos):
        return {
            "id": identificador,
            "nome": identificador,
            "espessura": 15,
            "largura_corte": largura,
            "altura_corte": altura,
            "chapaId": "mdf-15",
            **campos,
        }

    def test_packs_parts_together_using_guillotine_splits(self):
        resultado = planejar_corte(
            [self.peca("a", 700, 400), self.peca("b", 700, 400)],
            self.chapas,
            kerf_mm=0,
        )

        self.assertEqual(resultado["chapasUtilizadas"], 1)
        self.assertEqual(resultado["pecasAlocadas"], 2)
        self.assertEqual(len(resultado["chapas"][0]["pecas"]), 2)
        self.assertEqual(resultado["chapas"][0]["aproveitamentoPercent"], 58.33)
        self.assertEqual(resultado["aproveitamentoPercent"], 58.33)

    def test_rotates_part_only_when_allowed(self):
        chapa = [{**self.chapas[0], "largura_mm": 1000, "altura_mm": 500}]
        giravel = self.peca("gira", 480, 950, permiteRotacao=True)
        fixada = self.peca("fixa", 480, 950, permiteRotacao=False)

        giravel_resultado = planejar_corte([giravel], chapa, kerf_mm=0)
        fixada_resultado = planejar_corte([fixada], chapa, kerf_mm=0)

        self.assertTrue(giravel_resultado["chapas"][0]["pecas"][0]["rotacionada"])
        self.assertEqual(len(fixada_resultado["pecasNaoAlocadas"]), 1)

    def test_reports_missing_sheet_and_thickness_mismatch(self):
        pecas = [
            self.peca("sem-chapa", 100, 100, chapaId=None),
            self.peca("espessura-errada", 100, 100, espessura=18),
        ]

        resultado = planejar_corte(pecas, self.chapas, kerf_mm=0)

        self.assertEqual(resultado["pecasAlocadas"], 0)
        self.assertEqual(len(resultado["pecasNaoAlocadas"]), 2)

    def test_rejects_invalid_kerf(self):
        with self.assertRaises(ValueError):
            planejar_corte([], self.chapas, kerf_mm=21)


if __name__ == "__main__":
    unittest.main()
