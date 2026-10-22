const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function mensagemErro(erro, status) {
    const detalhe = erro?.detail;
    if (typeof detalhe === "string") return detalhe;
    if (Array.isArray(detalhe)) {
        return detalhe
            .map((item) => (typeof item === "string" ? item : item.msg || JSON.stringify(item)))
            .join(" ");
    }
    return `Erro ${status}`;
}

function getToken() {
    return localStorage.getItem("token");
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        // sessão expirada: limpa o token e volta ao login (uma vez só)
        if (res.status === 401 && !path.startsWith("/auth/")) {
            encerrarSessao();
        }
        const erro = await res.json().catch(() => ({}));
        throw new Error(mensagemErro(erro, res.status));
    }

    if (res.status === 204) return null;
    return res.json();
}

function encerrarSessao() {
    if (window.__sessaoEncerrada) return;
    window.__sessaoEncerrada = true;
    localStorage.removeItem("token");
    localStorage.removeItem("nomeUsuario");
    window.location.replace("/login?expirada=1");
}

async function download(path, body) {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        throw new Error(mensagemErro(erro, response.status));
    }

    const disposition = response.headers.get("Content-Disposition") || "";
    const nome = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "arquivo";
    return { blob: await response.blob(), nome };
}

export const api = {
    entrar: (credenciais) =>
        request("/auth/login", {
            method: "POST",
            body: JSON.stringify(credenciais),
        }),

    registrar: (dados) =>
        request("/auth/register", {
            method: "POST",
            body: JSON.stringify(dados),
        }),

    salvarModeloBiblioteca: async (dados) => {
        const response = await fetch(`${API_URL}/biblioteca/modulos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(dados),
        });
        if (!response.ok) throw new Error('Erro ao salvar modelo na biblioteca');
        return response.json();
    },

    listarModelosBiblioteca: async (categoria) => {
        const url = categoria
            ? `${API_URL}/biblioteca/modulos?categoria=${categoria}`
            : `${API_URL}/biblioteca/modulos`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao listar biblioteca');
        return response.json();
    },

    buscarModeloBiblioteca: async (id) => {
        const response = await fetch(`${API_URL}/biblioteca/modulos/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao buscar modelo');
        return response.json();
    },

    excluirModeloBiblioteca: async (id) => {
        const response = await fetch(`${API_URL}/biblioteca/modulos/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Erro ao excluir modelo');
    },

    listarProjetos: () => request("/projetos"),

    buscarProjeto: (id) => request(`/projetos/${id}`),

    listarClientes: () => request("/clientes"),

    listarFerragens: () => request("/insumos/ferragens"),

    listarChapas: () => request("/insumos/chapas"),

    listarFitas: () => request("/insumos/fitas"),

    calcularProducao: (projetoId, dados) =>
        request(`/orcamento/${projetoId}/calcular`, {
            method: "POST",
            body: JSON.stringify(dados),
        }),

    exportarProducao: (projetoId, destino, dados) =>
        download(`/orcamento/${projetoId}/${destino}`, dados),

    atualizarStatusProjeto: (id, status, cenario) =>
        request(`/projetos/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
                ...(status ? { status } : {}),
                ...(cenario ? { cenario } : {}),
            }),
        }),

    criarModulo: (projetoId, modulo) =>
        request(`/projetos/${projetoId}/modulos`, {
            method: "POST",
            body: JSON.stringify(modulo),
        }),

    buscarModulo: (projetoId, moduloId) =>
        request(`/projetos/${projetoId}/modulos/${moduloId}`),

    atualizarModulo: (projetoId, moduloId, modulo) =>
        request(`/projetos/${projetoId}/modulos/${moduloId}`, {
            method: "PATCH",
            body: JSON.stringify(modulo),
        }),

    excluirModulo: (projetoId, moduloId) =>
        request(`/projetos/${projetoId}/modulos/${moduloId}`, {
            method: "DELETE",
        }),

    // ---- clientes ----
    criarCliente: (dados) =>
        request("/clientes", { method: "POST", body: JSON.stringify(dados) }),

    atualizarCliente: (id, dados) =>
        request(`/clientes/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

    excluirCliente: (id) =>
        request(`/clientes/${id}`, { method: "DELETE" }),

    // ---- projetos ----
    criarProjeto: (dados) =>
        request("/projetos", { method: "POST", body: JSON.stringify(dados) }),

    excluirProjeto: (id) =>
        request(`/projetos/${id}`, { method: "DELETE" }),

    // ---- insumos: chapas, fitas, ferragens ----
    criarChapa: (dados) =>
        request("/insumos/chapas", { method: "POST", body: JSON.stringify(dados) }),

    atualizarChapa: (id, dados) =>
        request(`/insumos/chapas/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

    excluirChapa: (id) =>
        request(`/insumos/chapas/${id}`, { method: "DELETE" }),

    criarFita: (dados) =>
        request("/insumos/fitas", { method: "POST", body: JSON.stringify(dados) }),

    atualizarFita: (id, dados) =>
        request(`/insumos/fitas/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

    excluirFita: (id) =>
        request(`/insumos/fitas/${id}`, { method: "DELETE" }),

    criarFerragem: (dados) =>
        request("/insumos/ferragens", { method: "POST", body: JSON.stringify(dados) }),

    atualizarFerragemEstoque: (id, dados) =>
        request(`/insumos/ferragens/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

    excluirFerragem: (id) =>
        request(`/insumos/ferragens/${id}`, { method: "DELETE" }),

    // ---- orçamentos persistidos (fluxo financeiro) ----
    orcamentoDoProjeto: (projetoId) =>
        request(`/orcamentos/${projetoId}`),

    recalcularOrcamento: (projetoId, dadosProducao) =>
        request(`/orcamentos/${projetoId}/recalcular`, {
            method: "POST",
            body: JSON.stringify(dadosProducao),
        }),

    salvarOrcamento: (projetoId, campos) =>
        request(`/orcamentos/${projetoId}`, {
            method: "PATCH",
            body: JSON.stringify(campos),
        }),

    listarOrcamentos: () => request("/orcamentos"),
};
