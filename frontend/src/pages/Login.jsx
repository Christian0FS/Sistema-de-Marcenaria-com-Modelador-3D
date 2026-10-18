import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { api } from "../lib/api";

export default function Login() {
  const history = useHistory();
  const [modoCadastro, setModoCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const sessao = modoCadastro
        ? await api.registrar({ nome, email, senha })
        : await api.entrar({ email, senha });
      localStorage.setItem("token", sessao.access_token);
      localStorage.setItem("nomeUsuario", sessao.nome || nome);
      history.replace("/");
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message || "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <section className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Marcenaria CAD/CAM</h1>
        <p className="mt-1 text-sm text-gray-500">
          {modoCadastro ? "Criar acesso" : "Entre para acessar seus projetos"}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {modoCadastro && (
            <div>
              <label htmlFor="nome" className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                required
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete={modoCadastro ? "new-password" : "current-password"}
              required
              minLength={modoCadastro ? 8 : undefined}
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded bg-blue-700 px-3 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {enviando ? "Aguarde..." : modoCadastro ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setErro("");
            setModoCadastro((atual) => !atual);
          }}
          className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          {modoCadastro ? "Já tenho uma conta" : "Criar uma conta"}
        </button>
      </section>
    </main>
  );
}
