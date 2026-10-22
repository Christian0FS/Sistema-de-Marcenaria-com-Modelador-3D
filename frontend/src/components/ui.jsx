// Componentes compartilhados de identidade visual (Fase 1).
import React from "react";

// ---- Pílulas de status do projeto (Kanban/tabelas) ----
export const CORES_STATUS = {
  lead: { fundo: "bg-gray-100", texto: "text-gray-700", nome: "Lead" },
  orcamento: { fundo: "bg-sky-100", texto: "text-sky-800", nome: "Orçamento" },
  producao: { fundo: "bg-amber-100", texto: "text-amber-800", nome: "Produção" },
  montagem: { fundo: "bg-emerald-100", texto: "text-emerald-800", nome: "Montagem" },
};

// ---- Pílulas de status do ORÇAMENTO (fluxo financeiro, Fase 1) ----
export const CORES_STATUS_ORCAMENTO = {
  rascunho: { fundo: "bg-[#EFECE8]", texto: "text-app-secundario", nome: "Rascunho" },
  enviado: { fundo: "bg-sky-100", texto: "text-sky-800", nome: "Enviado" },
  aprovado: { fundo: "bg-emerald-100", texto: "text-emerald-800", nome: "Aprovado" },
  em_producao: { fundo: "bg-amber-100", texto: "text-amber-800", nome: "Em produção" },
  recusado: { fundo: "bg-red-50", texto: "text-red-700", nome: "Recusado" },
};

export function PilulaStatusOrcamento({ status }) {
  const config = CORES_STATUS_ORCAMENTO[status] || CORES_STATUS_ORCAMENTO.rascunho;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.fundo} ${config.texto}`}>
      {config.nome}
    </span>
  );
}

export function PilulaStatus({ status }) {
  const config = CORES_STATUS[status] || CORES_STATUS.lead;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.fundo} ${config.texto}`}>
      {config.nome}
    </span>
  );
}

// ---- Logo com monograma "M" em SVG próprio ----
export function Logo({ compacto = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="8" fill="#A9743F" />
        {/* M em traço de marcenaria */}
        <path
          d="M8 25 V10 L17 19 L26 10 V25"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compacto && (
        <div className="leading-tight">
          <div className="text-[13px] font-bold tracking-wide text-app-texto">MARCENARIA</div>
          <div className="text-[11px] font-semibold tracking-widest text-primario">CAD/CAM</div>
        </div>
      )}
    </div>
  );
}

// ---- Estados compartilhados ----
export function Vazio({ titulo, descricao, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-app-borda bg-white px-6 py-10 text-center">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#c9bfb4" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 7v13h18V7H3zm0 0l2-4h14l2 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-3 text-sm font-medium text-app-texto">{titulo}</p>
      {descricao && <p className="mt-1 text-xs text-app-secundario">{descricao}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }) {
  return <p className="p-4 text-sm text-app-secundario">{texto}</p>;
}

export function Erro({ mensagem, aoVoltar }) {
  return (
    <div className="rounded-card border border-red-200 bg-red-50 p-4">
      <p role="alert" className="text-sm text-red-700">{mensagem}</p>
      {aoVoltar && (
        <button type="button" onClick={aoVoltar} className="mt-2 text-sm font-medium text-red-800 underline">
          Voltar
        </button>
      )}
    </div>
  );
}

// ---- Formulários ----
export const classeInput =
  "w-full rounded-lg border border-app-borda bg-white px-3 py-2 text-sm text-app-texto focus:outline-none focus:ring-2 focus:ring-primario/50 focus:border-primario";

export function BotaoPrimario({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-primario-escuro focus:outline-none focus:ring-2 focus:ring-primario/60 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({ children, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border border-app-borda bg-white px-4 py-2 text-sm font-medium text-app-texto transition-colors hover:bg-app-fundo focus:outline-none focus:ring-2 focus:ring-primario/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
