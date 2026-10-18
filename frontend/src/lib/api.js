const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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
        const erro = await res.json().catch(() => ({}));
        throw new Error(erro.detail || `Erro ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
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

    atualizarStatusProjeto: (id, status) =>
        request(`/projetos/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
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
};

