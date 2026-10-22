// Layout das rotas privadas: menu lateral recolhível + barra superior (Fase 1).
import React, { useEffect, useRef, useState } from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Logo, BotaoSecundario, classeInput } from "./ui";
import {
  IconeKanban, IconeClientes, IconeProjetos, IconeEditor3D, IconeBiblioteca,
  IconeInsumos, IconeOrcamento, IconeConfig, IconeSair, IconeBuscar,
  IconeSino, IconeMenu, IconeChevronBaixo,
} from "./icone";

const VERSAO = process.env.REACT_APP_VERSAO || "v1.0.0";

const ITENS_MENU = [
  { para: "/", rotas: ["/", "/kanban"], rotulo: "Kanban", Icone: IconeKanban },
  { para: "/clientes", rotas: ["/clientes"], rotulo: "Clientes", Icone: IconeClientes },
  { para: "/projetos", rotas: ["/projetos"], rotulo: "Projetos", Icone: IconeProjetos },
  { para: "/editor", rotas: ["/editor"], rotulo: "Editor 3D", Icone: IconeEditor3D },
  { para: "/biblioteca", rotas: ["/biblioteca"], rotulo: "Biblioteca", Icone: IconeBiblioteca },
  { para: "/insumos", rotas: ["/insumos"], rotulo: "Insumos", Icone: IconeInsumos },
  { para: "/orcamento", rotas: ["/orcamento"], rotulo: "Orçamento", Icone: IconeOrcamento },
];

function iniciais(nome) {
  const partes = String(nome || "").trim().split(/\s+/);
  if (!partes[0]) return "?";
  const primeiro = partes[0][0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeiro + ultimo).toUpperCase();
}

export default function Layout({ children }) {
  const location = useLocation();
  const history = useHistory();
  const [menuAberto, setMenuAberto] = useState(false); // gaveta em telas pequenas
  const [recolhido, setRecolhido] = useState(false);   // largura estreita em desktop
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState(null);
  const [sinoAberto, setSinoAberto] = useState(false);
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [listas, setListas] = useState({ projetos: [], clientes: [], carregadas: false });
  const refBusca = useRef(null);

  const nomeUsuario = localStorage.getItem("nomeUsuario") || "Usuário";

  useEffect(() => {
    // carrega listas uma vez para a busca global (filtro só no cliente)
    if (listas.carregadas) return;
    Promise.all([
      fetch(process.env.REACT_APP_API_URL || "http://localhost:8000" + "/projetos", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()).catch(() => []),
      fetch(process.env.REACT_APP_API_URL || "http://localhost:8000" + "/clientes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }).then((r) => r.json()).catch(() => []),
    ]).then(([projetos, clientes]) => {
      setListas({
        projetos: Array.isArray(projetos) ? projetos : [],
        clientes: Array.isArray(clientes) ? clientes : [],
        carregadas: true,
      });
    });
  }, [listas.carregadas]);

  // recarrega listas quando a rota muda (novos cadastros aparecem na busca)
  useEffect(() => {
    setListas((atual) => ({ ...atual, carregadas: false }));
    setMenuAberto(false);
    setResultados(null);
    setBusca("");
  }, [location.pathname]);

  useEffect(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) {
      setResultados(null);
      return;
    }
    const projetos = listas.projetos
      .filter((p) => (p.nome || "").toLowerCase().includes(termo))
      .slice(0, 4)
      .map((p) => ({ tipo: "Projeto", id: p.id, nome: p.nome, para: `/projetos/${p.id}` }));
    const clientes = listas.clientes
      .filter((c) => (c.nome || "").toLowerCase().includes(termo))
      .slice(0, 4)
      .map((c) => ({ tipo: "Cliente", id: c.id, nome: c.nome, para: `/clientes?selecionado=${c.id}` }));
    setResultados([...projetos, ...clientes]);
  }, [busca, listas]);

  useEffect(() => {
    function aoClicarFora(evento) {
      if (refBusca.current && !refBusca.current.contains(evento.target)) setResultados(null);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function sair() {
    localStorage.removeItem("token");
    localStorage.removeItem("nomeUsuario");
    history.replace("/login");
  }

  function itemAtivo(item) {
    if (item.rotas.includes(location.pathname)) return true;
    // rotas filhas: projeto/editor abertos pertencem ao item correspondente
    if (item.para === "/projetos" && location.pathname.startsWith("/projetos")) return true;
    if (item.para === "/editor" && location.pathname.startsWith("/editor")) return true;
    return false;
  }

  const menuLateral = (
    <nav className="flex h-full flex-col" aria-label="Menu principal">
      <div className="px-4 py-5">
        <Link to="/" aria-label="Início"><Logo compacto={recolhido} /></Link>
      </div>
      <ul className="flex-1 space-y-1 px-2">
        {ITENS_MENU.map(({ para, rotulo, Icone, emBreve }) => {
          const ativo = itemAtivo({ para, rotas: [para] });
          return (
            <li key={para}>
              <Link
                to={para}
                title={rotulo}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${ativo
                  ? "bg-primario text-white"
                  : "text-app-texto hover:bg-primario-suave"
                  }`}
              >
                <Icone tamanho={18} />
                {!recolhido && rotulo}
                {!recolhido && emBreve && (
                  <span className="ml-auto rounded bg-app-fundo px-1.5 py-0.5 text-[10px] text-app-secundario">breve</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-app-borda px-2 py-3">
        <button
          type="button"
          onClick={() => setRecolhido((v) => !v)}
          className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-app-texto hover:bg-primario-suave lg:flex"
          aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
        >
          <IconeMenu tamanho={18} />
          {!recolhido && "Recolher menu"}
        </button>
        <Link
          to="/configuracoes"
          title="Configurações"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${location.pathname === "/configuracoes" ? "bg-primario text-white" : "text-app-texto hover:bg-primario-suave"
            }`}
        >
          <IconeConfig tamanho={18} />
          {!recolhido && "Configurações"}
        </Link>
        {!recolhido && (
          <p className="px-3 pt-1 text-[11px] text-app-secundario">{VERSAO}</p>
        )}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-app-fundo text-app-texto">
      {/* menu lateral: fixo no desktop, gaveta no mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[190px] border-r border-app-borda bg-white transition-transform lg:static lg:translate-x-0 ${recolhido ? "lg:w-[64px]" : ""
          } ${menuAberto ? "translate-x-0" : "-translate-x-full"}`}
      >
        {menuLateral}
      </aside>
      {menuAberto && (
        <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMenuAberto(false)} aria-hidden="true" />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* barra superior */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-app-borda bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            className="rounded-lg p-1.5 text-app-secundario hover:bg-app-fundo lg:hidden"
            aria-label="Abrir menu"
          >
            <IconeMenu />
          </button>

          {/* busca global: filtra projetos e clientes já carregados */}
          <div ref={refBusca} className="relative w-full max-w-md">
            <div className="flex items-center gap-2 rounded-lg border border-app-borda bg-app-fundo px-3 py-2 focus-within:border-primario focus-within:ring-2 focus-within:ring-primario/30">
              <IconeBuscar tamanho={16} className="text-app-secundario" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar projetos, clientes, etc..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-app-secundario"
                aria-label="Busca global"
              />
            </div>
            {resultados && (
              <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-card border border-app-borda bg-white shadow-flutuante">
                {resultados.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-app-secundario">Nenhum resultado para “{busca}”.</p>
                ) : (
                  resultados.map((r) => (
                    <Link
                      key={`${r.tipo}-${r.id}`}
                      to={r.para}
                      onClick={() => { setResultados(null); setBusca(""); }}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-app-fundo"
                    >
                      <span className="truncate">{r.nome}</span>
                      <span className="ml-2 shrink-0 rounded bg-primario-suave px-1.5 py-0.5 text-[10px] font-medium text-primario-escuro">
                        {r.tipo}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* notificações: popover simples, sem backend */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSinoAberto((v) => !v)}
                className="rounded-lg p-2 text-app-secundario hover:bg-app-fundo"
                aria-label="Notificações"
              >
                <IconeSino />
              </button>
              {sinoAberto && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-card border border-app-borda bg-white p-3 shadow-flutuante">
                  <p className="text-sm text-app-secundario">Nenhuma notificação.</p>
                </div>
              )}
            </div>

            {/* menu do usuário */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuUsuarioAberto((v) => !v)}
                className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-app-fundo"
                aria-haspopup="menu"
                aria-expanded={menuUsuarioAberto}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primario text-xs font-bold text-white">
                  {iniciais(nomeUsuario)}
                </span>
                <span className="hidden text-sm font-medium sm:block">{nomeUsuario}</span>
                <IconeChevronBaixo tamanho={14} className="text-app-secundario" />
              </button>
              {menuUsuarioAberto && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 w-44 overflow-hidden rounded-card border border-app-borda bg-white py-1 shadow-flutuante"
                >
                  <Link
                    to="/configuracoes"
                    onClick={() => setMenuUsuarioAberto(false)}
                    className="block px-4 py-2 text-sm hover:bg-app-fundo"
                  >
                    Configurações
                  </Link>
                  <button
                    type="button"
                    onClick={sair}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    <IconeSair tamanho={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
