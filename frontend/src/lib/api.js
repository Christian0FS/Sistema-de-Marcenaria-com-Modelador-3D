const API_URL = "http://127.0.0.1:8000";

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
    listarProjetos: () => request("/projetos"),
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

