import {
    calcularCentroPorta,
    calcularPainelDivisao,
    gerarPortas,
    gerarPrateleiras,
    gerarVaos,
    reescalarEstrutura,
} from "./logicaEstrutura";
import { calcularFerragensModulo } from "./logicaFerragens";
import {
    calcularPlanoDeFita,
    gerarPecasModulo,
    gerarApoiosPrateleira,
    gerarPlanoDeFuracao,
    medidasDeCorte,
} from "./logicaFabricacao";

const dimensoes = { largura: 900, altura: 800, profundidade: 600 };

test("a divisão frontal aplica a espessura e cria vãos de fundo e frente", () => {
    const divisao = {
        id: "div-frontal",
        eixo: "frontal",
        posicao: 100,
        espessura: 20,
    };
    const vaos = gerarVaos(dimensoes, [divisao]);
    const painel = calcularPainelDivisao(
        { ...dimensoes, x: 0, y: 0, z: 0 },
        divisao.eixo,
        divisao.posicao,
        divisao.espessura
    );

    expect(vaos.map((vao) => vao.id)).toEqual([
        "div-frontal-fundo",
        "div-frontal-frente",
    ]);
    expect(vaos[0].profundidade).toBe(90);
    expect(vaos[1]).toMatchObject({ z: 110, profundidade: 490 });
    expect(painel).toMatchObject({ z: 90, profundidade: 20 });
});

test("o vão raiz começa dentro do casco e do fundo", () => {
    const vao = gerarVaos(dimensoes, [], {
        espessura: 15,
        incluirFundo: true,
        espessuraFundo: 6,
    })[0];

    expect(vao).toMatchObject({
        x: 15,
        y: 15,
        z: 6,
        largura: 870,
        altura: 770,
        profundidade: 594,
    });
});

test("o reescalonamento ajusta a posição frontal pela profundidade", () => {
    const estrutura = {
        divisoes: [{ id: "div-frontal", eixo: "frontal", posicao: 150 }],
        internos: [],
        portas: [],
    };

    const resultado = reescalarEstrutura(
        estrutura,
        { largura: 900, altura: 800, profundidade: 600 },
        { largura: 900, altura: 800, profundidade: 400 }
    );

    expect(resultado.divisoes[0].posicao).toBe(100);
});

test("as necessidades de ferragens usam apenas tipos existentes e contam gavetas", () => {
    const resultado = calcularFerragensModulo(
        {
            portas: [{ id: "porta-1", tipo: "bascula", vaoId: "vao-1" }],
            internos: [{ id: "gaveteiro-1", tipo: "gaveteiro", num_gavetas: 3 }],
        },
        450,
        [{ id: "vao-1", altura: 1700 }]
    );

    expect(resultado.map((item) => item.tipoFerragem).sort()).toEqual([
        "corredica",
        "dobradica",
        "puxador",
        "puxador",
    ]);
    expect(resultado.find((item) => item.tipoFerragem === "corredica")).toMatchObject({
        quantidade: 3,
        especificacao: "par de corrediças de gaveta, 450 mm",
    });
    expect(resultado.filter((item) => item.tipoFerragem === "dobradica")[0].quantidade).toBe(2);
    expect(resultado.filter((item) => item.tipoFerragem === "puxador").map((item) => item.quantidade)).toEqual([1, 3]);
});

test("a furação 32 mm usa os recuos e o passo configurados", () => {
    const plano = gerarPlanoDeFuracao(dimensoes, {
        divisoes: [],
        internos: [],
        portas: [],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6 },
        fabricacao: {
            furacao32: {
                passo: 32,
                recuoFrontal: 37,
                recuoTraseiro: 37,
                inicioBase: 64,
                recuoTopo: 64,
            },
        },
    });

    const furosPrateleira = plano.furos.filter((furo) => furo.tipo === "pino-prateleira");
    expect(furosPrateleira.length).toBeGreaterThan(0);
    expect(new Set(furosPrateleira.map((furo) => furo.z))).toEqual(new Set([43, 563]));
    expect(new Set(furosPrateleira.map((furo) => furo.y))).toEqual(new Set([79, 111, 143, 175, 207, 239, 271, 303, 335, 367, 399, 431, 463, 495, 527, 559, 591, 623, 655, 687, 719]));
});

test("o plano de fita conta frente de prateleira e quatro arestas da porta", () => {
    const plano = calcularPlanoDeFita(dimensoes, {
        divisoes: [],
        internos: [{ id: "prat-1", tipo: "prateleira", vao_id: "raiz" }],
        portas: [{ id: "porta-1", tipo: "giro", vaoId: "raiz", folga: 3 }],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6 },
        fabricacao: { fitaBorda: { padrao: { fitaId: "fita-a", espessuraMm: 1 }, frentes: { fitaId: "fita-b", espessuraMm: 2 } } },
    });

    expect(plano.arestas.filter((aresta) => aresta.grupo === "padrao").some((aresta) => aresta.peca === "Prateleira" && aresta.aresta === "frente")).toBe(true);
    expect(plano.arestas.filter((aresta) => aresta.grupo === "frentes")).toHaveLength(4);
    expect(plano.resumo.find((item) => item.grupo === "frentes").comprimentoMetros).toBe(3.256);
});

test("divisória frontal tem fita na aresta frontal e furação orientada por face", () => {
    const estrutura = {
        divisoes: [{ id: "div-1", eixo: "frontal", posicao: 120, espessura: 15 }],
        internos: [],
        portas: [],
        casco: { espessura: 15 },
    };
    const fita = calcularPlanoDeFita(dimensoes, estrutura);
    const plano = gerarPlanoDeFuracao(dimensoes, estrutura);

    expect(fita.arestas).toContainEqual(expect.objectContaining({
        pecaId: "div-1",
        aresta: "frente",
        comprimentoMm: dimensoes.largura - 30,
    }));
    expect(plano.furos.every((furo) => furo.eixo === "x" && [-1, 1].includes(furo.sentido))).toBe(true);
    expect(plano.furos.find((furo) => furo.face === "esquerda").sentido).toBe(-1);
    expect(plano.furos.find((furo) => furo.face === "direita").sentido).toBe(1);
});

test("canecos de dobradiça respeitam diâmetro e recuos configurados", () => {
    const plano = gerarPlanoDeFuracao(dimensoes, {
        divisoes: [],
        internos: [],
        portas: [{ id: "porta-giro", tipo: "giro", vaoId: "raiz", ladoDobradica: "esquerda" }],
        casco: { espessura: 15 },
    });
    const canecos = plano.furos.filter((furo) => furo.tipo === "caneco-dobradica");

    expect(canecos).toHaveLength(2);
    expect(canecos[0]).toMatchObject({
        eixo: "z",
        sentido: -1,
        diametro: 35,
        profundidade: 12,
        x: 39.5,
        y: 118,
    });
});

test("porta basculante usa dois canecos mesmo acima de 1600 mm", () => {
    const plano = gerarPlanoDeFuracao(
        { largura: 900, altura: 1800, profundidade: 600 },
        {
            divisoes: [],
            internos: [],
            portas: [{ id: "porta-bascula", tipo: "bascula", vaoId: "raiz" }],
            casco: { espessura: 15 },
        }
    );

    expect(plano.furos.filter((furo) => furo.tipo === "caneco-basculante")).toHaveLength(2);
});

test("a divisória vertical recebe furos nas duas faces com sentidos opostos", () => {
    const plano = gerarPlanoDeFuracao(dimensoes, {
        divisoes: [{ id: "div-vertical", eixo: "vertical", posicao: 300, espessura: 15 }],
        internos: [],
        portas: [],
        casco: { espessura: 15 },
    });
    const furosDaDivisoria = plano.furos.filter((furo) =>
        furo.x > 250 && furo.x < 350
    );

    expect(furosDaDivisoria.some((furo) => furo.x === 307.5 && furo.sentido === 1)).toBe(true);
    expect(furosDaDivisoria.some((furo) => furo.x === 322.5 && furo.sentido === -1)).toBe(true);
});

test("vãos frontais rasos usam uma fileira central dentro do vão", () => {
    const plano = gerarPlanoDeFuracao(
        { largura: 900, altura: 800, profundidade: 300 },
        {
            divisoes: [{ id: "frontal", eixo: "frontal", posicao: 50, espessura: 15 }],
            internos: [],
            portas: [],
            casco: { espessura: 15 },
        }
    );
    const furosFundo = plano.furos.filter((furo) => furo.vaoId === "frontal-fundo");

    expect(furosFundo.length).toBeGreaterThan(0);
    expect(furosFundo.every((furo) => furo.z >= 0 && furo.z <= 42.5)).toBe(true);
});

test("lista de fabricação da gaveta corresponde às peças do render", () => {
    const pecas = gerarPecasModulo(dimensoes, {
        divisoes: [],
        internos: [{ id: "gaveteiro-1", tipo: "gaveteiro", vao_id: "raiz", num_gavetas: 1 }],
        portas: [],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6 },
    });
    const gaveta = pecas.filter((peca) => peca.id.startsWith("gaveteiro-1-gaveta-0"));

    expect(gaveta.map((peca) => peca.nome)).toEqual([
        "Frente de gaveta",
        "Lateral esquerda da gaveta",
        "Lateral direita da gaveta",
        "Traseira da gaveta",
        "Fundo da gaveta",
    ]);
    expect(gaveta.find((peca) => peca.nome === "Frente de gaveta")).toMatchObject({
        x: 18,
        y: 18,
        z: 591,
        largura: 864,
        profundidade: 18,
    });
    expect(gaveta.find((peca) => peca.nome === "Traseira da gaveta")).toMatchObject({
        x: 43,
        z: 47,
        largura: 814,
        profundidade: 15,
    });
});

test("peças do casco usam coordenadas medidas a partir do fundo", () => {
    const pecas = gerarPecasModulo(dimensoes, {
        divisoes: [],
        internos: [],
        portas: [],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6 },
    });
    const lateral = pecas.find((peca) => peca.id === "casco-lateral-esquerda");
    const fundo = pecas.find((peca) => peca.id === "casco-fundo");

    expect(lateral).toMatchObject({ z: 6, profundidade: dimensoes.profundidade - 6 });
    expect(fundo).toMatchObject({ z: 0, profundidade: 6 });
});

test("prateleira respeita posição e espessura individuais", () => {
    const prateleiras = gerarPrateleiras(
        [{ id: "vao-1", x: 0, y: 100, z: 0, largura: 600, altura: 400, profundidade: 500 }],
        [{ id: "prat-1", tipo: "prateleira", vao_id: "vao-1", posicaoMm: 173, espessuraMm: 22 }]
    );

    expect(prateleiras[0]).toMatchObject({ y: 273, posicaoMm: 173, altura: 22 });
});

test("porta fixa fica para fora do vão, sem invadir a profundidade útil", () => {
    const centro = calcularCentroPorta(600, 600, 18);

    expect(centro - 9).toBe(300);
    expect(centro + 9).toBe(318);
});

test("plano de fabricação posiciona a porta na frente externa do casco", () => {
    const pecas = gerarPecasModulo(dimensoes, {
        divisoes: [],
        internos: [],
        portas: [{ id: "porta-1", tipo: "giro", vaoId: "raiz" }],
        casco: { espessura: 15 },
    });

    expect(pecas.find((peca) => peca.id === "porta-1")).toMatchObject({
        z: dimensoes.profundidade,
        profundidade: 18,
    });
});

test("prateleira recua da pista traseira da porta de correr", () => {
    const vao = { id: "raiz", x: 0, y: 0, z: 0, largura: 900, altura: 800, profundidade: 600 };
    const portas = gerarPortas([vao], [{ id: "porta-1", vaoId: "raiz", tipo: "corredica" }]);
    const prateleira = gerarPrateleiras(
        [vao],
        [{ id: "prat-1", tipo: "prateleira", vao_id: "raiz" }],
        [{ id: "porta-1", vaoId: "raiz", tipo: "corredica" }]
    )[0];

    expect(portas.find((porta) => porta.offsetZ < 0).offsetZ).toBe(-20);
    expect(prateleira.z + prateleira.profundidade).toBe(578);
    expect(600 - (prateleira.z + prateleira.profundidade)).toBe(22);
});

test("medidas de corte retornam os dois maiores lados da peça", () => {
    expect(medidasDeCorte({ largura: 450, altura: 15, profundidade: 600 })).toEqual([600, 450]);
});

test("apoios de prateleira identificam furos alinhados e sugerem o primeiro nível", () => {
    const dimensoesModulo = { largura: 900, altura: 800, profundidade: 600 };
    const estrutura = {
        divisoes: [],
        internos: [{ id: "prat-1", tipo: "prateleira", vao_id: "raiz", posicaoMm: 64 }],
        portas: [],
        casco: { espessura: 15, incluirFundo: true, espessuraFundo: 6 },
    };
    const apoiosAlinhados = gerarApoiosPrateleira(dimensoesModulo, estrutura);

    expect(apoiosAlinhados.pinos).toHaveLength(4);
    expect(apoiosAlinhados.ajustes).toHaveLength(0);
    expect(apoiosAlinhados.pinos[0]).toMatchObject({
        tipo: "pino-apoio",
        prateleiraId: "prat-1",
        normal: [1, 0, 0],
    });

    const apoiosDesalinhados = gerarApoiosPrateleira(dimensoesModulo, {
        ...estrutura,
        internos: [{ ...estrutura.internos[0], posicaoMm: 65 }],
    });
    expect(apoiosDesalinhados.ajustes[0]).toMatchObject({
        prateleiraId: "prat-1",
        motivo: "no-ar",
        posicaoMmSugerida: 64,
    });
});
