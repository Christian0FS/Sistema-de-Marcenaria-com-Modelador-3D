

const ESPESSURA_PAINEL_MM = 15;
const FOLGA_GAVETA_MM = 3;

function clamp(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
}

function vaoRaiz(dimensoes, casco = {}) {
    const espessuraLateral = Math.max(0, Number(casco.espessura) || 0);
    const espessuraFundo = casco.incluirFundo === false
        ? 0
        : Math.max(0, Number(casco.espessuraFundo) || 0);
    return {
        id: "raiz",
        x: espessuraLateral,
        y: espessuraLateral,
        z: espessuraFundo,
        largura: Math.max(0, dimensoes.largura - espessuraLateral * 2),
        altura: Math.max(0, dimensoes.altura - espessuraLateral * 2),
        profundidade: Math.max(0, dimensoes.profundidade - espessuraFundo),
    };
}

export function limitesDivisao(vao, eixo, espessura = ESPESSURA_PAINEL_MM) {
    const tamanho = eixo === "vertical"
        ? vao.largura
        : eixo === "horizontal"
            ? vao.altura
            : vao.profundidade;
    const margem = eixo === "frontal" ? 20 : 50;
    const metade = espessura / 2;
    const min = Math.min(margem, metade + 20);
    const max = Math.max(min, tamanho - metade - 20);
    return { min, max };
}

export function calcularPainelDivisao(vao, eixo, posicaoBruta, espessura = ESPESSURA_PAINEL_MM) {
    const { min, max } = limitesDivisao(vao, eixo, espessura);
    const posicao = clamp(posicaoBruta, min, max);
    const metade = espessura / 2;

    if (eixo === "vertical") {
        return {
            x: vao.x + posicao - metade,
            y: vao.y,
            z: vao.z,
            largura: espessura,
            altura: vao.altura,
            profundidade: vao.profundidade,
        };
    }

    if (eixo === "horizontal") {
        return {
            x: vao.x,
            y: vao.y + posicao - metade,
            z: vao.z,
            largura: vao.largura,
            altura: espessura,
            profundidade: vao.profundidade,
        };
    }

    return {
        x: vao.x,
        y: vao.y,
        z: vao.z + posicao - metade,
        largura: vao.largura,
        altura: vao.altura,
        profundidade: espessura,
    };
}

export function gerarVaos(dimensoes, divisoes, casco) {
    const vaosAtuais = [vaoRaiz(dimensoes, casco)];

    for (const divisao of divisoes) {
        const alvoId = divisao.vao_pai || "raiz";
        const indiceAlvo = vaosAtuais.findIndex((v) => v.id === alvoId);
        if (indiceAlvo === -1) continue;

        vaosAtuais.splice(indiceAlvo, 1, ...dividirVao(vaosAtuais[indiceAlvo], divisao));
    }

    return vaosAtuais;
}

function dividirVao(vao, divisao) {
    const espessura = Math.max(1, Number(divisao.espessura) || ESPESSURA_PAINEL_MM);
    const metade = espessura / 2;
    const { min, max } = limitesDivisao(vao, divisao.eixo, espessura);
    const posicao = clamp(divisao.posicao, min, max);

    if (divisao.eixo === "vertical") {
        return [
            {
                id: `${divisao.id}-esquerda`,
                x: vao.x,
                y: vao.y,
                z: vao.z,
                largura: posicao - metade,
                altura: vao.altura,
                profundidade: vao.profundidade,
            },
            {
                id: `${divisao.id}-direita`,
                x: vao.x + posicao + metade,
                y: vao.y,
                z: vao.z,
                largura: vao.largura - posicao - metade,
                altura: vao.altura,
                profundidade: vao.profundidade,
            },
        ];
    }

    if (divisao.eixo === "horizontal") {
        return [
            {
                id: `${divisao.id}-inferior`,
                x: vao.x,
                y: vao.y,
                z: vao.z,
                largura: vao.largura,
                altura: posicao - metade,
                profundidade: vao.profundidade,
            },
            {
                id: `${divisao.id}-superior`,
                x: vao.x,
                y: vao.y + posicao + metade,
                z: vao.z,
                largura: vao.largura,
                altura: vao.altura - posicao - metade,
                profundidade: vao.profundidade,
            },
        ];
    }

    return [
        {
            id: `${divisao.id}-fundo`,
            x: vao.x,
            y: vao.y,
            z: vao.z,
            largura: vao.largura,
            altura: vao.altura,
            profundidade: posicao - metade,
        },
        {
            id: `${divisao.id}-frente`,
            x: vao.x,
            y: vao.y,
            z: vao.z + posicao + metade,
            largura: vao.largura,
            altura: vao.altura,
            profundidade: vao.profundidade - posicao - metade,
        },
    ];
}

export function gerarPaineisDivisorios(dimensoes, divisoes, casco) {
    const paineis = [];
    const vaosAtuais = [vaoRaiz(dimensoes, casco)];

    for (const divisao of divisoes) {
        const alvoId = divisao.vao_pai || "raiz";
        const indiceAlvo = vaosAtuais.findIndex((v) => v.id === alvoId);
        if (indiceAlvo === -1) continue;

        const vaoAlvo = vaosAtuais[indiceAlvo];
        paineis.push({
            id: divisao.id,
            ...calcularPainelDivisao(vaoAlvo, divisao.eixo, divisao.posicao, divisao.espessura),
        });
        vaosAtuais.splice(indiceAlvo, 1, ...dividirVao(vaoAlvo, divisao));
    }

    return paineis;
}

export function gerarPrateleiras(vaos, internos, portas = []) {
    const porVao = {};
    internos
        .filter((i) => i.tipo === "prateleira")
        .forEach((interno) => {
            if (!porVao[interno.vao_id]) porVao[interno.vao_id] = [];
            porVao[interno.vao_id].push(interno);
        });

    const prateleiras = [];

    Object.entries(porVao).forEach(([vaoId, lista]) => {
        const vao = vaos.find((v) => v.id === vaoId);
        if (!vao) return;

        const quantidade = lista.length;
        const portaDeCorrer = portas.some((porta) => porta.vaoId === vaoId && porta.tipo === "corredica");
        const recuoFrontal = portaDeCorrer ? 22 : 5;

        lista.forEach((interno, indice) => {
            const espessura = Math.max(1, Number(interno.espessuraMm) || ESPESSURA_PAINEL_MM);
            const largura = clamp(Number(interno.larguraMm) || vao.largura, 1, vao.largura);
            const profundidadeMaxima = Math.max(vao.profundidade - recuoFrontal - 5, 10);
            const profundidade = clamp(
                Number(interno.profundidadeMm) || profundidadeMaxima,
                10,
                Math.max(profundidadeMaxima, 10)
            );
            const xOffsetMaximo = Math.max(vao.largura - largura, 0);
            const xOffset = clamp(Number(interno.xOffsetMm) || 0, 0, xOffsetMaximo);
            const zOffsetMaximo = Math.max(vao.profundidade - recuoFrontal - profundidade, 0);
            const zOffset = clamp(
                interno.zOffsetMm == null ? 5 : Number(interno.zOffsetMm),
                0,
                zOffsetMaximo
            );
            const posicaoRelativa = (indice + 1) / (quantidade + 1);
            const yAutomatico = vao.y + vao.altura * posicaoRelativa - espessura / 2;
            const yConfigurado = interno.posicaoMm == null
                ? yAutomatico
                : vao.y + Number(interno.posicaoMm);
            const y = clamp(yConfigurado, vao.y, vao.y + vao.altura - espessura);

            prateleiras.push({
                id: interno.id,
                x: vao.x + xOffset,
                y,
                z: vao.z + zOffset,
                largura,
                altura: espessura,
                profundidade,
                posicaoMm: y - vao.y,
                xOffsetMm: xOffset,
                zOffsetMm: zOffset,
            });
        });
    });

    return prateleiras;
}


export function gerarGavetas(vaos, internos) {
    const gaveteiros = internos.filter((i) => i.tipo === "gaveteiro");
    const gavetas = [];

    for (const interno of gaveteiros) {
        const vao = vaos.find((v) => v.id === interno.vao_id);
        if (!vao) continue;

        const numGavetas = Math.max(1, interno.num_gavetas || 1);
        const alturaTotalFolgas = FOLGA_GAVETA_MM * (numGavetas + 1);
        const alturaCadaGaveta = (vao.altura - alturaTotalFolgas) / numGavetas;

        for (let i = 0; i < numGavetas; i++) {
            const y = vao.y + FOLGA_GAVETA_MM + i * (alturaCadaGaveta + FOLGA_GAVETA_MM);
            gavetas.push({
                id: `${interno.id}-gaveta-${i}`,
                x: vao.x + FOLGA_GAVETA_MM,
                y,
                z: vao.z,
                largura: vao.largura - FOLGA_GAVETA_MM * 2,
                altura: alturaCadaGaveta,
                profundidade: vao.profundidade,
            });
        }
    }

    return gavetas;
}

/**
 * @param {Array} vaos 
 * @param {Array} portas 
 * @returns {Array} 
 */

export function gerarPortas(vaos, portas) {
    const resultado = [];

    portas.forEach((porta) => {
        const vao = vaos.find((v) => v.id === porta.vaoId);
        if (!vao) return; // vão não existe mais (foi removido/dividido)

        const folga = porta.folga ?? 3;

        if (porta.tipo === 'corredica') {
            // corrediça vem em par, cada folha cobre metade da largura
            // com uma pequena sobreposição central de 15mm (padrão de trilho duplo)
            const sobreposicao = 15;
            const larguraFolha = vao.largura / 2 + sobreposicao / 2;

            resultado.push({
                id: `${porta.id}-esquerda`,
                portaId: porta.id,
                tipo: 'corredica',
                x: vao.x + folga,
                y: vao.y + folga,
                zFace: vao.z + vao.profundidade,
                largura: larguraFolha - folga,
                altura: vao.altura - folga * 2,
                offsetZ: -20, // trilho traseiro com 2 mm de folga entre folhas
            });

            resultado.push({
                id: `${porta.id}-direita`,
                portaId: porta.id,
                tipo: 'corredica',
                x: vao.x + vao.largura / 2 - sobreposicao / 2,
                y: vao.y + folga,
                zFace: vao.z + vao.profundidade,
                largura: larguraFolha - folga,
                altura: vao.altura - folga * 2,
                offsetZ: 0, // fica na frente (trilho dianteiro)
            });
        } else {
            // giro ou báscula: uma folha única, centralizada com folga em todo o contorno
            resultado.push({
                id: porta.id,
                portaId: porta.id,
                tipo: porta.tipo,
                ladoDobradica: porta.ladoDobradica,
                zFace: vao.z + vao.profundidade,
                x: vao.x + folga,
                y: vao.y + folga,
                largura: vao.largura - folga * 2,
                altura: vao.altura - folga * 2,
                offsetZ: 0,
            });
        }
    });

    return resultado;
}

export function calcularCentroPorta(zFace, profundidadeModulo, espessura, offsetZ = 0) {
    return zFace - profundidadeModulo / 2 + espessura / 2 + offsetZ;
}

/**
 * @param {Object} estrutura - { divisoes, internos, portas }
 * @param {Object} dimensoesAntigas - { largura, altura, profundidade }
 * @param {Object} dimensoesNovas - { largura, altura, profundidade }
 * @returns {Object} nova estrutura com posições/tamanhos recalculados
 */
export function reescalarEstrutura(estrutura, dimensoesAntigas, dimensoesNovas) {
    const fator = (antiga, nova) => (antiga && nova ? nova / antiga : 1);
    const fatorPorEixo = {
        vertical: fator(dimensoesAntigas?.largura, dimensoesNovas?.largura),
        horizontal: fator(dimensoesAntigas?.altura, dimensoesNovas?.altura),
        frontal: fator(dimensoesAntigas?.profundidade, dimensoesNovas?.profundidade),
    };

    return {
        divisoes: (estrutura.divisoes ?? []).map((divisao) => ({
            ...divisao,
            posicao: divisao.posicao * (fatorPorEixo[divisao.eixo] ?? 1),
        })),
        internos: [...(estrutura.internos ?? [])],
        portas: [...(estrutura.portas ?? [])],
    };
}