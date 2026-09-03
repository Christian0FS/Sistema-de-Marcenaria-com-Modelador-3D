const API_URL = "http://127.0.0.1:8000";

function getToken() {
    return localStorage.getItem("token");
}

async function request(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...options.headers,
        },
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
};