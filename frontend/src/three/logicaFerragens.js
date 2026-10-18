/**
 * @param {Object} porta - { tipo, largura, altura, ladoDobradica }
 * @returns {Array} lista de necessidades de ferragem
 */
export function calcularFerragensPorta(porta) {
    const necessidades = [];

    if (porta.tipo === 'giro') {
        // regra: 2 dobradiças até 1600mm de altura, 3 acima disso
        const quantidadeDobradicas = porta.altura > 1600 ? 3 : 2;
        necessidades.push({
            tipoFerragem: 'dobradica',
            quantidade: quantidadeDobradicas,
        });
        necessidades.push({
            tipoFerragem: 'puxador',
            quantidade: 1,
        });
    }

    if (porta.tipo === 'corredica') {
        // corrediça (porta deslizante) usa kit de trilho — 1 kit por par de folhas
        necessidades.push({
            tipoFerragem: 'corredica',
            quantidade: 1,
            especificacao: 'kit de trilho para portas de correr',
        });
        necessidades.push({
            tipoFerragem: 'puxador',
            quantidade: 2, // uma por folha
        });
    }

    if (porta.tipo === 'bascula') {
        necessidades.push({
            tipoFerragem: 'dobradica',
            quantidade: 2,
            especificacao: 'dobradiça para porta basculante',
        });
        necessidades.push({
            tipoFerragem: 'puxador',
            quantidade: 1,
        });
    }

    return necessidades;
}

/**
 * @param {Object} gaveta - { largura, profundidadeModulo }
 * @returns {Array}
 */
export function calcularFerragensGaveta(gaveta) {
    return [
        {
            tipoFerragem: 'corredica',
            quantidade: 1, // representa 1 par (a unidade de estoque já é o par)
            especificacao: `par de corrediças de gaveta, ${gaveta.profundidadeModulo} mm`,
        },
        {
            tipoFerragem: 'puxador',
            quantidade: 1,
        },
    ];
}

/**
 * @param {Object} estrutura - { divisoes, internos, portas }
 * @param {number} profundidadeModulo
 * @returns {Array} lista de { origemId, tipoFerragem, quantidade, especificacao? }
 */
export function calcularFerragensModulo(estrutura, profundidadeModulo, vaos = []) {
    const resultado = [];

    (estrutura.portas ?? []).forEach((porta) => {
        const vao = vaos.find((item) => item.id === porta.vaoId);
        const necessidades = calcularFerragensPorta({
            ...porta,
            altura: porta.altura ?? vao?.altura ?? 0,
        });
        necessidades.forEach((n) =>
            resultado.push({ origemId: porta.id, origemTipo: 'porta', ...n })
        );
    });

    (estrutura.internos ?? [])
        .filter((item) => item.tipo === 'gaveteiro')
        .forEach((gaveteiro) => {
            const quantidadeGavetas = Math.max(1, Number(gaveteiro.num_gavetas) || 1);
            const necessidades = calcularFerragensGaveta({ profundidadeModulo });
            necessidades.forEach((n) =>
                resultado.push({
                    origemId: gaveteiro.id,
                    origemTipo: 'interno',
                    ...n,
                    quantidade: n.quantidade * quantidadeGavetas,
                })
            );
        });

    return resultado;
}