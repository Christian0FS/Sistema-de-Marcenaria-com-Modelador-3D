import {
    caixaDoModulo,
    caixasSeInterceptam,
    caixaEnvolvente,
    enfileirarModulos,
    posicionarAderecos,
} from "./posicionamentoCenario";

const modulo = (largura, altura = 800, profundidade = 600) => ({
    modulo_id: `m-${largura}-${Math.random().toString(36).slice(2, 6)}`,
    nome: `Módulo ${largura}`,
    dimensoes: { largura, altura, profundidade },
});

describe("caixaDoModulo", () => {
    test("usa o centro como origem (CaixaModulo é centrado em X e Z)", () => {
        const caixa = caixaDoModulo(modulo(900, 800, 600), 1000, -200);
        expect(caixa).toEqual({ minX: 550, maxX: 1450, minZ: -500, maxZ: 100 });
    });
});

describe("caixasSeInterceptam", () => {
    test("bordas encostadas não contam como sobreposição", () => {
        const a = { minX: 0, maxX: 900, minZ: 0, maxZ: 600 };
        const b = { minX: 900, maxX: 1800, minZ: 0, maxZ: 600 };
        expect(caixasSeInterceptam(a, b)).toBe(false);
    });
    test("sobreposição real é detectada", () => {
        const a = { minX: 0, maxX: 900, minZ: 0, maxZ: 600 };
        const b = { minX: 899, maxX: 1799, minZ: 0, maxZ: 600 };
        expect(caixasSeInterceptam(a, b)).toBe(true);
    });
});

describe("enfileirarModulos", () => {
    test("2 módulos encostados, sem sobreposição", () => {
        const resultado = enfileirarModulos([modulo(900), modulo(600)], 0);
        expect(resultado).toHaveLength(2);
        for (let i = 0; i < resultado.length; i++) {
            for (let j = i + 1; j < resultado.length; j++) {
                expect(caixasSeInterceptam(resultado[i].caixa, resultado[j].caixa)).toBe(false);
            }
        }
        const env = caixaEnvolvente(resultado.map((p) => p.caixa));
        expect(env.maxX - env.minX).toBe(900 + 600);
    });

    test("5 módulos de larguras diferentes, sem sobreposição e centrado", () => {
        const modulos = [modulo(1200), modulo(450), modulo(900), modulo(600), modulo(300)];
        const resultado = enfileirarModulos(modulos, 30);
        expect(resultado).toHaveLength(5);
        for (let i = 0; i < resultado.length; i++) {
            for (let j = i + 1; j < resultado.length; j++) {
                expect(caixasSeInterceptam(resultado[i].caixa, resultado[j].caixa)).toBe(false);
            }
        }
        const env = caixaEnvolvente(resultado.map((p) => p.caixa));
        const larguraTotalEsperada =
            1200 + 450 + 900 + 600 + 300 + 4 * 30;
        expect(env.maxX - env.minX).toBeCloseTo(larguraTotalEsperada, 6);
        // centrada em X = 0
        expect((env.minX + env.maxX) / 2).toBeCloseTo(0, 6);
    });

    test("9 módulos de larguras diferentes, sem sobreposição", () => {
        const modulos = [
            modulo(1600), modulo(450), modulo(900), modulo(600), modulo(300),
            modulo(1200), modulo(750), modulo(450), modulo(600),
        ];
        const resultado = enfileirarModulos(modulos, 0);
        expect(resultado).toHaveLength(9);
        for (let i = 0; i < resultado.length; i++) {
            for (let j = i + 1; j < resultado.length; j++) {
                expect(caixasSeInterceptam(resultado[i].caixa, resultado[j].caixa)).toBe(false);
            }
        }
        const env = caixaEnvolvente(resultado.map((p) => p.caixa));
        expect(env.maxX - env.minX).toBeCloseTo(1600 + 450 + 900 + 600 + 300 + 1200 + 750 + 450 + 600, 6);
    });

    test("módulo que colide é empurrado para o lado livre mais próximo", () => {
        // simula: primeiro módulo largo; segundo estreito colide ao ser enfileirado
        const resultado = enfileirarModulos([modulo(2000), modulo(500)], 0);
        const env = caixaEnvolvente(resultado.map((p) => p.caixa));
        expect(env.maxX - env.minX).toBe(2500);
    });
});

describe("posicionarAderecos", () => {
    const fileira = enfileirarModulos([modulo(900), modulo(600)], 0);
    const caixas = fileira.map((p) => p.caixa);

    test("cortina fica atrás do fundo do módulo mais saliente", () => {
        const { cortina, area } = posicionarAderecos(caixas, { paredeZ: -4000 });
        expect(cortina.z).toBeLessThan(area.minZ); // mais para trás que qualquer módulo
        expect(cortina.z).toBeLessThanOrEqual(area.minZ - 50); // folga mínima de 50 mm
        expect(cortina.largura).toBeGreaterThanOrEqual(area.maxX - area.minX);
    });

    test("tapete cobre a fileira com margem e fica no piso", () => {
        const { tapete, area } = posicionarAderecos(caixas);
        expect(tapete.largura).toBeGreaterThan(area.maxX - area.minX);
        expect(tapete.profundidade).toBeGreaterThan(area.maxZ - area.minZ);
        expect(tapete.y).toBeCloseTo(0.001, 6);
        // centrado na fileira
        expect(tapete.x).toBeCloseTo((area.minX + area.maxX) / 2, 6);
        expect(tapete.z).toBeCloseTo((area.minZ + area.maxZ) / 2, 6);
    });

    test("planta fica fora da área dos módulos", () => {
        const { planta, area } = posicionarAderecos(caixas);
        expect(planta.x).toBeGreaterThan(area.maxX);
    });
});
