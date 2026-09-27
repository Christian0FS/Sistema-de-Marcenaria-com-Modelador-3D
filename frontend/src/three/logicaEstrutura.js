

const ESPESSURA_PAINEL_MM = 15;
const FOLGA_GAVETA_MM = 3;

export function gerarVaos(dimensoes, divisoes) {
    let vaosAtuais = [
        { id: "raiz", x: 0, y: 0, largura: dimensoes.largura, altura: dimensoes.altura },
    ];

    for (const divisao of divisoes) {
        const alvoId = divisao.vao_pai || "raiz";
        const indiceAlvo = vaosAtuais.findIndex((v) => v.id === alvoId);
        if (indiceAlvo === -1) continue;

        const vaoAlvo = vaosAtuais[indiceAlvo];
        const [vaoA, vaoB] = dividirVao(vaoAlvo, divisao);

        vaosAtuais.splice(indiceAlvo, 1, vaoA, vaoB);
    }

    return vaosAtuais;
}

function dividirVao(vao, divisao) {
    const metade = ESPESSURA_PAINEL_MM / 2;

    if (divisao.eixo === "vertical") {
        const posicao = clamp(divisao.posicao, 50, vao.largura - 50);
        return [
            { id: `${divisao.id}-esquerda`, x: vao.x, y: vao.y, largura: posicao - metade, altura: vao.altura },
            { id: `${divisao.id}-direita`, x: vao.x + posicao + metade, y: vao.y, largura: vao.largura - posicao - metade, altura: vao.altura },
        ];
    }

    const posicao = clamp(divisao.posicao, 50, vao.altura - 50);
    return [
        { id: `${divisao.id}-inferior`, x: vao.x, y: vao.y, largura: vao.largura, altura: posicao - metade },
        { id: `${divisao.id}-superior`, x: vao.x, y: vao.y + posicao + metade, largura: vao.largura, altura: vao.altura - posicao - metade },
    ];
}

function clamp(valor, min, max) {
    return Math.max(min, Math.min(max, valor));
}

export function gerarPaineisDivisorios(dimensoes, divisoes) {
    const paineis = [];
    let vaosAtuais = [
        { id: "raiz", x: 0, y: 0, largura: dimensoes.largura, altura: dimensoes.altura },
    ];

    for (const divisao of divisoes) {
        const alvoId = divisao.vao_pai || "raiz";
        const indiceAlvo = vaosAtuais.findIndex((v) => v.id === alvoId);
        if (indiceAlvo === -1) continue;

        const vaoAlvo = vaosAtuais[indiceAlvo];

        if (divisao.eixo === "vertical") {
            paineis.push({
                id: divisao.id,
                x: vaoAlvo.x + clamp(divisao.posicao, 50, vaoAlvo.largura - 50),
                y: vaoAlvo.y,
                largura: ESPESSURA_PAINEL_MM,
                altura: vaoAlvo.altura,
                profundidade: dimensoes.profundidade,
            });
        } else {
            paineis.push({
                id: divisao.id,
                x: vaoAlvo.x,
                y: vaoAlvo.y + clamp(divisao.posicao, 50, vaoAlvo.altura - 50),
                largura: vaoAlvo.largura,
                altura: ESPESSURA_PAINEL_MM,
                profundidade: dimensoes.profundidade,
            });
        }

        const [vaoA, vaoB] = dividirVao(vaoAlvo, divisao);
        vaosAtuais.splice(indiceAlvo, 1, vaoA, vaoB);
    }

    return paineis;
}


export function gerarPrateleiras(vaos, internos) {
    const prateleiras = internos.filter((i) => i.tipo === "prateleira");

    return prateleiras
        .map((interno) => {
            const vao = vaos.find((v) => v.id === interno.vao_id);
            if (!vao) return null;

            const posicaoRelativa = interno.posicao_relativa ?? 0.5;
            const y = vao.y + vao.altura * posicaoRelativa - ESPESSURA_PAINEL_MM / 2;

            return {
                id: interno.id,
                x: vao.x,
                y: clamp(y, vao.y, vao.y + vao.altura - ESPESSURA_PAINEL_MM),
                largura: vao.largura,
                altura: ESPESSURA_PAINEL_MM,
            };
        })
        .filter(Boolean);
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
                largura: vao.largura - FOLGA_GAVETA_MM * 2,
                altura: alturaCadaGaveta,
            });
        }
    }

    return gavetas;
}