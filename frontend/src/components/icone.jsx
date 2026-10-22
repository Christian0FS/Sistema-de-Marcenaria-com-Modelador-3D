// Ícones de linha (SVG próprios, sem dependência externa) — Fase 1.
import React from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Icone({ children, tamanho = 18, ...props }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" {...base} {...props}>
      {children}
    </svg>
  );
}

export const IconeKanban = (props) => (
  <Icone {...props}>
    <rect x="3" y="4" width="5" height="16" rx="1" />
    <rect x="10" y="4" width="5" height="10" rx="1" />
    <rect x="17" y="4" width="4" height="13" rx="1" />
  </Icone>
);

export const IconeClientes = (props) => (
  <Icone {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M16 5.5a3 3 0 0 1 0 5.5" />
    <path d="M17.5 15.2c2 .8 3 2.5 3 4.8" />
  </Icone>
);

export const IconeProjetos = (props) => (
  <Icone {...props}>
    <path d="M3 8l4-4 4 4M5 5v14" transform="translate(1 1)" />
    <rect x="11" y="11" width="9" height="9" rx="1" />
  </Icone>
);

export const IconeEditor3D = (props) => (
  <Icone {...props}>
    <path d="M12 2.5 21 7.5v9L12 21.5 3 16.5v-9z" />
    <path d="M12 12 21 7.5M12 12v9.5M12 12 3 7.5" />
  </Icone>
);

export const IconeBiblioteca = (props) => (
  <Icone {...props}>
    <rect x="4" y="3" width="4.5" height="18" rx="1" />
    <rect x="10.5" y="3" width="4.5" height="18" rx="1" />
    <path d="M18 4.5c2 .5 3 2 2.5 4l-2 11" />
  </Icone>
);

export const IconeInsumos = (props) => (
  <Icone {...props}>
    <path d="M4 5h16v5H4z" />
    <path d="M4 14h16v5H4z" />
    <circle cx="7.5" cy="7.5" r="0.5" />
    <circle cx="7.5" cy="16.5" r="0.5" />
  </Icone>
);

export const IconeOrcamento = (props) => (
  <Icone {...props}>
    <path d="M6 3h9l4 4v14H6z" />
    <path d="M15 3v4h4" />
    <path d="M9.5 13h5M9.5 16.5h5" />
  </Icone>
);

export const IconeConfig = (props) => (
  <Icone {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3.4h-4L9.4 5.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.6 2.3h4l.6-2.3a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
  </Icone>
);

export const IconeSair = (props) => (
  <Icone {...props}>
    <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    <path d="M10 17l-5-5 5-5M5 12h11" />
  </Icone>
);

export const IconeBuscar = (props) => (
  <Icone {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Icone>
);

export const IconeSino = (props) => (
  <Icone {...props}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Icone>
);

export const IconeMais = (props) => (
  <Icone {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
);

export const IconeEditar = (props) => (
  <Icone {...props}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="M13.5 6.5l3 3" />
  </Icone>
);

export const IconeExcluir = (props) => (
  <Icone {...props}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Icone>
);

export const IconeUsuario = (props) => (
  <Icone {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.5-3.5 4-5 7.5-5s6 1.5 7.5 5" />
  </Icone>
);

export const IconeChevronBaixo = (props) => (
  <Icone {...props}>
    <path d="M6 9l6 6 6-6" />
  </Icone>
);

export const IconeMenu = (props) => (
  <Icone {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icone>
);
