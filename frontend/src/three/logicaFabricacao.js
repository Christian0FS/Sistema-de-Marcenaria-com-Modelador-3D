import {
    gerarGavetas,
    gerarPaineisDivisorios,
    gerarPortas,
    gerarPrateleiras,
    gerarVaos,
} from "./logicaEstrutura";

export const DEFAULT_FURACAO_32 = {
    passo: 32,
    recuoFrontal: 37,
    recuoTraseiro: 37,
    inicioBase: 64,
    recuoTopo: 64,
    diametroPino: 5,
    profundidadePino: 10,
    diametroCaneco: 35,
    profundidadeCaneco: 12,
    recuoCanecoBorda: 21.5,
    distanciaDobradiçaExtremidade: 100,
};

function adicionarPeca(pecas, peca) {
    pecas.push({ ...peca, arestasFita: peca.arestasFita || [] });
}

function arestasPainelCasco(largura, profundidade, fitaCompleta) {
    if (!fitaCompleta) {
        return [{ nome: "frente", comprimentoMm: largura, grupo: "padrao" }];
    }
    return [
        { nome: "frente", comprimentoMm: largura, grupo: "padrao" },
        { nome: "traseira", comprimentoMm: largura, grupo: "padrao" },
        { nome: "esquerda", comprimentoMm: profundidade, grupo: "padrao" },
        { nome: "direita", comprimentoMm: profundidade, grupo: "padrao" },
    ];
}

export function gerarPecasModulo(dimensoes, estrutura) {
    const casco = estrutura.casco || {};
    const espessura = Number(casco.espessura) || 15;
    const espessuraFundo = casco.incluirFundo === false ? 0 : Number(casco.espessuraFundo) || 6;
    const profundidadeCasco = dimensoes.profundidade - espessuraFundo;
    const larguraInterna = Math.max(dimensoes.largura - espessura * 2, 0);
    const alturaInterna = Math.max(dimensoes.altura - espessura * 2, 0);
    const pecas = [];

    adicionarPeca(pecas, {
        id: "casco-lateral-esquerda",
        nome: "Lateral esquerda do casco",
        tipo: "lateral-casco",
        x: 0,
        y: 0,
        z: espessuraFundo,
        largura: espessura,
        altura: dimensoes.altura,
        profundidade: profundidadeCasco,
        espessura,
        chapaId: casco.chapaId || null,
        arestasFita: [
            { nome: "frente", comprimentoMm: dimensoes.altura, grupo: "padrao" },
            ...(casco.fitaCompleta ? [
                { nome: "traseira", comprimentoMm: dimensoes.altura, grupo: "padrao" },
                { nome: "base", comprimentoMm: profundidadeCasco, grupo: "padrao" },
                { nome: "topo", comprimentoMm: profundidadeCasco, grupo: "padrao" },
            ] : []),
        ],
    });
    adicionarPeca(pecas, {
        id: "casco-lateral-direita",
        nome: "Lateral direita do casco",
        tipo: "lateral-casco",
        x: dimensoes.largura - espessura,
        y: 0,
        z: espessuraFundo,
        largura: espessura,
        altura: dimensoes.altura,
        profundidade: profundidadeCasco,
        espessura,
        chapaId: casco.chapaId || null,
        arestasFita: [
            { nome: "frente", comprimentoMm: dimensoes.altura, grupo: "padrao" },
            ...(casco.fitaCompleta ? [
                { nome: "traseira", comprimentoMm: dimensoes.altura, grupo: "padrao" },
                { nome: "base", comprimentoMm: profundidadeCasco, grupo: "padrao" },
                { nome: "topo", comprimentoMm: profundidadeCasco, grupo: "padrao" },
            ] : []),
        ],
    });

    adicionarPeca(pecas, {
        id: "casco-base",
        nome: "Base do casco",
        tipo: "painel-casco",
        x: espessura,
        y: 0,
        z: espessuraFundo,
        largura: larguraInterna,
        altura: espessura,
        profundidade: profundidadeCasco,
        espessura,
        chapaId: casco.chapaId || null,
        arestasFita: arestasPainelCasco(larguraInterna, profundidadeCasco, casco.fitaCompleta),
    });
    adicionarPeca(pecas, {
        id: "casco-tampo",
        nome: "Tampo do casco",
        tipo: "painel-casco",
        x: espessura,
        y: dimensoes.altura - espessura,
        z: espessuraFundo,
        largura: larguraInterna,
        altura: espessura,
        profundidade: profundidadeCasco,
        espessura,
        chapaId: casco.chapaId || null,
        arestasFita: arestasPainelCasco(larguraInterna, profundidadeCasco, casco.fitaCompleta),
    });

    if (espessuraFundo > 0) {
        adicionarPeca(pecas, {
            id: "casco-fundo",
            nome: "Fundo do casco",
            tipo: "painel-fundo",
            x: espessura,
            y: espessura,
            z: 0,
            largura: larguraInterna,
            altura: alturaInterna,
            profundidade: espessuraFundo,
            espessura: espessuraFundo,
            chapaId: casco.chapaId || null,
        });
    }

    const vaos = gerarVaos(dimensoes, estrutura.divisoes || [], estrutura.casco);
    const paineis = gerarPaineisDivisorios(dimensoes, estrutura.divisoes || [], estrutura.casco);
    const divisaoPorId = new Map((estrutura.divisoes || []).map((divisao) => [divisao.id, divisao]));

    paineis.forEach((painel) => {
        const divisao = divisaoPorId.get(painel.id);
        const arestasFita = [{
            nome: "frente",
            comprimentoMm: divisao?.eixo === "vertical" ? painel.altura : painel.largura,
            grupo: "padrao",
        }];
        adicionarPeca(pecas, {
            id: painel.id,
            nome: `Divisória ${divisao?.eixo || ""}`,
            tipo: divisao?.eixo === "vertical" ? "divisoria-vertical" : "divisoria",
            eixo: divisao?.eixo,
            x: painel.x,
            y: painel.y,
            z: painel.z,
            largura: painel.largura,
            altura: painel.altura,
            profundidade: painel.profundidade,
            espessura: divisao?.espessura || 15,
            chapaId: divisao?.chapaId || casco.chapaId || null,
            arestasFita,
        });
    });

    gerarPrateleiras(vaos, estrutura.internos || [], estrutura.portas || []).forEach((prateleira) => {
        const interno = estrutura.internos?.find((item) => item.id === prateleira.id);
        adicionarPeca(pecas, {
            ...prateleira,
            nome: "Prateleira",
            tipo: "prateleira",
            espessura: prateleira.altura,
            chapaId: interno?.chapaId || casco.chapaId || null,
            arestasFita: [{ nome: "frente", comprimentoMm: prateleira.largura, grupo: "padrao" }],
        });
    });

    gerarGavetas(vaos, estrutura.internos || []).forEach((gaveta) => {
        const alturaCorpo = Math.max(gaveta.altura - 30, 40);
        const profundidadeCorpo = Math.max(gaveta.profundidade - 50, 50);
        const larguraInternaGaveta = Math.max(gaveta.largura - 50, 0);
        const zInicioCorpo = gaveta.z + gaveta.profundidade - 9 - profundidadeCorpo;
        const interno = estrutura.internos?.find((item) => gaveta.id.startsWith(`${item.id}-gaveta-`));
        const chapaId = interno?.chapaId || casco.chapaId || null;

        adicionarPeca(pecas, {
            id: `${gaveta.id}-frente`,
            nome: "Frente de gaveta",
            tipo: "frente-gaveta",
            x: gaveta.x,
            y: gaveta.y,
            z: gaveta.z + gaveta.profundidade - 9,
            largura: gaveta.largura,
            altura: gaveta.altura,
            profundidade: 18,
            espessura: 18,
            chapaId,
            arestasFita: [
                { nome: "topo", comprimentoMm: gaveta.largura, grupo: "frentes" },
                { nome: "base", comprimentoMm: gaveta.largura, grupo: "frentes" },
                { nome: "esquerda", comprimentoMm: gaveta.altura, grupo: "frentes" },
                { nome: "direita", comprimentoMm: gaveta.altura, grupo: "frentes" },
            ],
        });
        adicionarPeca(pecas, {
            id: `${gaveta.id}-lateral-esquerda`,
            nome: "Lateral esquerda da gaveta",
            tipo: "corpo-gaveta",
            x: gaveta.x + 10,
            y: gaveta.y + 10,
            z: zInicioCorpo,
            largura: 15,
            altura: alturaCorpo,
            profundidade: profundidadeCorpo,
            espessura: 15,
            chapaId,
            arestasFita: [{ nome: "topo", comprimentoMm: profundidadeCorpo, grupo: "padrao" }],
        });
        adicionarPeca(pecas, {
            id: `${gaveta.id}-lateral-direita`,
            nome: "Lateral direita da gaveta",
            tipo: "corpo-gaveta",
            x: gaveta.x + gaveta.largura - 25,
            y: gaveta.y + 10,
            z: zInicioCorpo,
            largura: 15,
            altura: alturaCorpo,
            profundidade: profundidadeCorpo,
            espessura: 15,
            chapaId,
            arestasFita: [{ nome: "topo", comprimentoMm: profundidadeCorpo, grupo: "padrao" }],
        });
        adicionarPeca(pecas, {
            id: `${gaveta.id}-traseira`,
            nome: "Traseira da gaveta",
            tipo: "corpo-gaveta",
            x: gaveta.x + 25,
            y: gaveta.y + 16,
            z: zInicioCorpo,
            largura: larguraInternaGaveta,
            altura: Math.max(alturaCorpo - 6, 0),
            profundidade: 15,
            espessura: 15,
            chapaId,
            arestasFita: [{ nome: "topo", comprimentoMm: larguraInternaGaveta, grupo: "padrao" }],
        });
        adicionarPeca(pecas, {
            id: `${gaveta.id}-fundo`,
            nome: "Fundo da gaveta",
            tipo: "fundo-gaveta",
            x: gaveta.x + 25,
            y: gaveta.y + 10,
            z: zInicioCorpo,
            largura: larguraInternaGaveta,
            altura: 6,
            profundidade: profundidadeCorpo,
            espessura: 6,
            chapaId,
        });
    });

    gerarPortas(vaos, estrutura.portas || []).forEach((porta) => {
        const origem = estrutura.portas?.find((item) => item.id === porta.portaId) || {};
        adicionarPeca(pecas, {
            id: porta.id,
            origemId: porta.portaId || porta.id,
            nome: "Porta",
            tipo: "porta",
            subtipo: porta.tipo,
            x: porta.x,
            y: porta.y,
            z: porta.zFace,
            largura: porta.largura,
            altura: porta.altura,
            profundidade: 18,
            espessura: 18,
            chapaId: origem.chapaId || casco.chapaId || null,
            arestasFita: [
                { nome: "topo", comprimentoMm: porta.largura, grupo: "frentes" },
                { nome: "base", comprimentoMm: porta.largura, grupo: "frentes" },
                { nome: "esquerda", comprimentoMm: porta.altura, grupo: "frentes" },
                { nome: "direita", comprimentoMm: porta.altura, grupo: "frentes" },
            ],
        });
    });

    return pecas;
}

function posicaoFaceVertical(vao, lado, paineis, larguraModulo, espessuraCasco) {
    const limite = lado === "esquerda" ? vao.x : vao.x + vao.largura;
    const painel = paineis.find((item) => {
        if (item.divisao?.eixo !== "vertical") return false;
        const borda = lado === "esquerda" ? item.x + item.largura : item.x;
        return Math.abs(borda - limite) < 0.1;
    });

    if (painel) {
        return lado === "esquerda"
            ? { x: painel.x + painel.largura, sentido: -1, espessura: painel.divisao?.espessura || 15 }
            : { x: painel.x, sentido: 1, espessura: painel.divisao?.espessura || 15 };
    }
    if (lado === "esquerda" && Math.abs(vao.x - espessuraCasco) < 0.1) {
        return { x: espessuraCasco, sentido: -1, espessura: espessuraCasco };
    }
    if (lado === "direita" && Math.abs(vao.x + vao.largura - larguraModulo + espessuraCasco) < 0.1) {
        return { x: larguraModulo - espessuraCasco, sentido: 1, espessura: espessuraCasco };
    }
    return null;
}

export function gerarPlanoDeFuracao(dimensoes, estrutura, opcoes = {}) {
    const config = {
        ...DEFAULT_FURACAO_32,
        ...(estrutura.fabricacao?.furacao32 || {}),
        ...opcoes,
    };
    const vaos = gerarVaos(dimensoes, estrutura.divisoes || [], estrutura.casco);
    const paineis = gerarPaineisDivisorios(dimensoes, estrutura.divisoes || [], estrutura.casco).map((painel) => ({
        ...painel,
        divisao: estrutura.divisoes?.find((item) => item.id === painel.id),
    }));
    const espessuraCasco = Number(estrutura.casco?.espessura) || 15;
    const furos = [];
    const avisos = [];

    vaos.forEach((vao) => {
        const primeiraAltura = vao.y + config.inicioBase;
        const limiteAltura = vao.y + vao.altura - config.recuoTopo;
        const alturas = [];
        for (let y = primeiraAltura; y <= limiteAltura; y += config.passo) alturas.push(y);

        const zFileiras = vao.profundidade >= config.recuoFrontal + config.recuoTraseiro
            ? [vao.z + config.recuoTraseiro, vao.z + vao.profundidade - config.recuoFrontal]
            : [vao.z + vao.profundidade / 2];
        const zUnicos = [...new Set(zFileiras.map((z) => Number(z.toFixed(3))))];

        ["esquerda", "direita"].forEach((lado) => {
            const face = posicaoFaceVertical(vao, lado, paineis, dimensoes.largura, espessuraCasco);
            if (!face) return;
            if (config.profundidadePino > face.espessura) {
                avisos.push(`Sem furos na face ${lado} do vão ${vao.id}: a peça tem ${face.espessura} mm, abaixo da profundidade configurada.`);
                return;
            }

            alturas.forEach((y) => {
                zUnicos.forEach((z) => {
                    furos.push({
                        id: `pino-${vao.id}-${lado}-${y}-${z}`,
                        tipo: "pino-prateleira",
                        vaoId: vao.id,
                        face: lado,
                        eixo: "x",
                        sentido: face.sentido,
                        normal: [face.sentido, 0, 0],
                        x: face.x,
                        y,
                        z,
                        diametro: config.diametroPino,
                        profundidade: config.profundidadePino,
                        unidade: "mm",
                    });
                });
            });
        });
    });

    gerarPortas(vaos, estrutura.portas || []).forEach((porta) => {
        if (porta.tipo !== "giro" && porta.tipo !== "bascula") return;
        const quantidade = porta.tipo === "giro" && porta.altura > 1600 ? 3 : 2;
        const margensY = quantidade === 2
            ? [config.distanciaDobradiçaExtremidade, porta.altura - config.distanciaDobradiçaExtremidade]
            : [config.distanciaDobradiçaExtremidade, porta.altura / 2, porta.altura - config.distanciaDobradiçaExtremidade];
        const x = porta.ladoDobradica === "direita"
            ? porta.x + porta.largura - config.recuoCanecoBorda
            : porta.x + config.recuoCanecoBorda;

        margensY.forEach((margem) => {
            furos.push({
                id: `caneco-${porta.id}-${margem}`,
                tipo: porta.tipo === "bascula" ? "caneco-basculante" : "caneco-dobradica",
                origemId: porta.portaId || porta.id,
                eixo: "z",
                face: "frontal",
                sentido: -1,
                normal: [0, 0, -1],
                x,
                y: porta.y + margem,
                z: porta.zFace,
                diametro: config.diametroCaneco,
                profundidade: config.profundidadeCaneco,
                unidade: "mm",
            });
        });
    });

    return {
        config,
        furos,
        avisos: [...new Set(avisos)],
        totalFuros: furos.length,
        porTipo: furos.reduce((totais, furo) => {
            totais[furo.tipo] = (totais[furo.tipo] || 0) + 1;
            return totais;
        }, {}),
    };
}

export function calcularPlanoDeFita(dimensoes, estrutura) {
    const config = estrutura.fabricacao?.fitaBorda || {};
    const pecas = gerarPecasModulo(dimensoes, estrutura);
    const arestas = pecas.flatMap((peca) => peca.arestasFita.map((aresta) => {
        const regra = config[aresta.grupo] || {};
        return {
            pecaId: peca.id,
            peca: peca.nome,
            aresta: aresta.nome,
            grupo: aresta.grupo,
            comprimentoMm: aresta.comprimentoMm,
            fitaId: regra.fitaId || null,
            espessuraMm: Number(regra.espessuraMm) || (aresta.grupo === "frentes" ? 2 : 1),
        };
    }));

    const resumoMap = new Map();
    arestas.forEach((aresta) => {
        const chave = `${aresta.grupo}:${aresta.fitaId || "sem-fita"}:${aresta.espessuraMm}`;
        const resumo = resumoMap.get(chave) || {
            grupo: aresta.grupo,
            fitaId: aresta.fitaId,
            espessuraMm: aresta.espessuraMm,
            comprimentoMm: 0,
        };
        resumo.comprimentoMm += aresta.comprimentoMm;
        resumoMap.set(chave, resumo);
    });

    const resumo = [...resumoMap.values()].map((item) => ({
        ...item,
        comprimentoMetros: item.comprimentoMm / 1000,
    }));

    return {
        pecas,
        arestas,
        resumo,
        totalMetros: arestas.reduce((total, aresta) => total + aresta.comprimentoMm, 0) / 1000,
    };
}

export function medidasDeCorte(peca) {
    const medidas = [peca.largura, peca.altura, peca.profundidade]
        .map((medida) => Number(medida) || 0)
        .sort((a, b) => b - a);
    return [medidas[0], medidas[1]];
}

export function gerarApoiosPrateleira(dimensoes, estrutura) {
    const plano = gerarPlanoDeFuracao(dimensoes, estrutura);
    const vaos = gerarVaos(dimensoes, estrutura.divisoes || [], estrutura.casco);
    const prateleiras = gerarPrateleiras(vaos, estrutura.internos || [], estrutura.portas || []);
    const prateleirasEstrutura = new Map((estrutura.internos || []).map((item) => [item.id, item]));
    const pinos = [];
    const ajustes = [];

    prateleiras.forEach((prateleira) => {
        const furosDoVao = plano.furos.filter((furo) => furo.vaoId === prateleirasEstrutura.get(prateleira.id)?.vao_id);
        const alturas = [...new Set(furosDoVao.map((furo) => furo.y))].sort((a, b) => a - b);
        const alturaApoio = alturas.find((altura) => Math.abs(altura - prateleira.y) <= 0.5);

        if (alturaApoio != null) {
            furosDoVao
                .filter((furo) => Math.abs(furo.y - alturaApoio) <= 0.5)
                .forEach((furo) => {
                    if (furo.tipo !== "pino-prateleira") return;
                    if (furo.z < prateleira.z || furo.z > prateleira.z + prateleira.profundidade) return;
                    pinos.push({
                        id: `apoio-${prateleira.id}-${furo.id}`,
                        tipo: "pino-apoio",
                        prateleiraId: prateleira.id,
                        x: furo.x,
                        y: prateleira.y,
                        z: furo.z,
                        diametro: furo.diametro,
                        normal: [furo.face === "esquerda" ? 1 : -1, 0, 0],
                    });
                });
            return;
        }

        const vao = vaos.find((item) => item.id === prateleirasEstrutura.get(prateleira.id)?.vao_id);
        if (alturas.length === 0 || !vao) {
            ajustes.push({
                prateleiraId: prateleira.id,
                rotulo: "Prateleira",
                motivo: "sem-furos",
            });
            return;
        }

        const alturaMaisProxima = alturas.reduce((maisProxima, altura) =>
            Math.abs(altura - prateleira.y) < Math.abs(maisProxima - prateleira.y) ? altura : maisProxima
        );
        ajustes.push({
            prateleiraId: prateleira.id,
            rotulo: "Prateleira",
            motivo: prateleira.y < alturas[0] ? "abaixo-do-primeiro-furo" : "no-ar",
            folgaMm: Math.abs(alturaMaisProxima - prateleira.y),
            posicaoMmSugerida: alturaMaisProxima - vao.y,
        });
    });

    return { pinos, ajustes };
}

export function gerarFerragensVisuais(dimensoes, estrutura) {
    const plano = gerarPlanoDeFuracao(dimensoes, estrutura);
    const apoios = gerarApoiosPrateleira(dimensoes, estrutura);
    const vaos = gerarVaos(dimensoes, estrutura.divisoes || [], estrutura.casco);
    const portas = gerarPortas(vaos, estrutura.portas || []);
    const config = plano.config;
    const itens = [...apoios.pinos];

    plano.furos
        .filter((furo) => furo.tipo === "caneco-dobradica" || furo.tipo === "caneco-basculante")
        .forEach((furo) => {
            const porta = portas.find((item) => item.id === furo.origemId || item.portaId === furo.origemId);
            if (!porta) return;
            const ladoDireito = porta.ladoDobradica === "direita";
            itens.push({
                id: `dobradica-${furo.id}`,
                tipo: "dobradica",
                x: furo.x,
                y: furo.y,
                z: furo.z,
                xLateral: ladoDireito ? porta.x + porta.largura : porta.x,
                diametro: furo.diametro,
                profundidade: furo.profundidade,
            });
        });

    portas.forEach((porta) => {
        if (porta.tipo === "corredica") return;
        const ladoDireito = porta.ladoDobradica !== "direita";
        itens.push({
            id: `puxador-${porta.id}`,
            tipo: "puxador",
            x: ladoDireito ? porta.x + porta.largura - 50 : porta.x + 50,
            y: porta.y + porta.altura / 2,
            z: porta.zFace,
            orientacao: "vertical",
            espacamento: config.entreFurosPuxador || 128,
        });
    });

    gerarGavetas(vaos, estrutura.internos || []).forEach((gaveta) => {
        const alturaTrilho = 12;
        const zTrilho = gaveta.z + Math.max(0, gaveta.profundidade - 450);
        [gaveta.x, gaveta.x + gaveta.largura - 12].forEach((x, indice) => {
            itens.push({
                id: `corredica-${gaveta.id}-${indice}`,
                tipo: "corredica-gaveta",
                x,
                y: gaveta.y + 10,
                z: zTrilho,
                largura: 12,
                altura: alturaTrilho,
                profundidade: Math.min(450, gaveta.profundidade),
            });
        });
        itens.push({
            id: `puxador-${gaveta.id}`,
            tipo: "puxador",
            x: gaveta.x + gaveta.largura / 2,
            y: gaveta.y + gaveta.altura / 2,
            z: gaveta.z + gaveta.profundidade,
            orientacao: "horizontal",
            espacamento: config.entreFurosPuxador || 128,
        });
    });

    portas
        .filter((porta) => porta.tipo === "corredica")
        .forEach((porta) => {
            [0, 1].forEach((indice) => {
                itens.push({
                    id: `trilho-${porta.id}-${indice}`,
                    tipo: "trilho-porta",
                    x: porta.x,
                    y: indice === 0 ? porta.y : porta.y + porta.altura - 8,
                    z: porta.zFace + porta.offsetZ,
                    largura: porta.largura,
                    altura: 8,
                    profundidade: 20,
                });
            });
        });

    return itens;
}
