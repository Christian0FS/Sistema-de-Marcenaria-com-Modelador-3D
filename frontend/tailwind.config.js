/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Identidade visual Marcenaria CAD/CAM (mockup Fase 1)
      colors: {
        primario: {
          DEFAULT: "#A9743F", // bronze/madeira — botões primários, item ativo do menu
          escuro: "#8C5D30", // hover
          claro: "#C89565",  // detalhes
          suave: "#F3E8DC",  // fundo suave bronze (badges, seleção)
        },
        app: {
          fundo: "#F6F4F1", // bege muito claro — fundo do app
          card: "#FFFFFF",
          borda: "#EBE6DF", // borda fina de cards
          texto: "#2B2623", // escuro quente
          secundario: "#8A817A", // cinza quente
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(43, 38, 35, 0.08)", // sombra suave de cards
        flutuante: "0 8px 24px rgba(43, 38, 35, 0.14)",
      },
      borderRadius: {
        card: "12px", // raio de cards (12–16 px)
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
}
