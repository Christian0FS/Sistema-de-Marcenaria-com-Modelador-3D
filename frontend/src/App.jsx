import React from "react";
import EditorModulo from "./pages/EditorModulo";

function App() {
  const projetoId = localStorage.getItem("projetoAtual") || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold p-4">Editor de Módulo — Fase 2.2</h1>
      <EditorModulo projetoId={projetoId} />
    </div>
  );
}

export default App;