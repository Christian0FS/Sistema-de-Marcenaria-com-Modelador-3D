import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CaixaModulo from "./CaixaModulo";

export default function Cena({ vaoSelecionado, onSelecionarVao }) {
  return (
    <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden">
      <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
        <gridHelper args={[10, 10, "#9a9a9a", "#c9c9c9"]} />
        <CaixaModulo vaoSelecionado={vaoSelecionado} onSelecionarVao={onSelecionarVao} />
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}