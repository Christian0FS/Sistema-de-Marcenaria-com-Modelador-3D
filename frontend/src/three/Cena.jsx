import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CaixaModulo from "./CaixaModulo";
import { api } from "../lib/api";

export default function Cena({ vaoSelecionado, onSelecionarVao }) {
  // Fase 5: chapas do estoque dão cor/veio por peça (carregadas uma vez)
  const [chapas, setChapas] = useState(null);

  useEffect(() => {
    let ativo = true;
    api.listarChapas()
      .then((lista) => { if (ativo) setChapas(lista); })
      .catch(() => { if (ativo) setChapas([]); });
    return () => { ativo = false; };
  }, []);

  return (
    <div className="w-full h-full bg-app-fundo rounded-lg overflow-hidden">
      <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <gridHelper args={[10, 10, "#9a9a9a", "#c9c9c9"]} />
        <CaixaModulo
          vaoSelecionado={vaoSelecionado}
          onSelecionarVao={onSelecionarVao}
          chapas={chapas}
        />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}