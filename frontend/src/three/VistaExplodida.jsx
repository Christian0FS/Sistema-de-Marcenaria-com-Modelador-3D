// Visualizador 3D do manual de montagem (vista explodida com slider), acessado pelo QR da etiqueta.
import React, { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { gerarPecasModulo } from "./logicaFabricacao";

const MM = 0.001;

function PecaExplodida({ peca, fator, centroModulo }) {
  // direção de explosão: peças afastam-se do centro do módulo
  const centro = [
    (peca.x + peca.largura / 2) * MM,
    (peca.y + peca.altura / 2) * MM,
    (peca.z + peca.profundidade / 2) * MM,
  ];
  const direcao = [
    centro[0] - centroModulo[0],
    centro[1] - centroModulo[1],
    centro[2] - centroModulo[2],
  ];
  const tamanho = Math.max(Math.abs(direcao[0]), Math.abs(direcao[1]), Math.abs(direcao[2]));
  const fatorEixo = tamanho === 0
    ? [0, 1, 0]
    : direcao.map((v) => v / tamanho);
  const posicao = centro.map(
    (v, i) => v + fatorEixo[i] * fator * (tamanho === 0 ? 0.3 : tamanho)
  );

  return (
    <group position={posicao}>
      <mesh castShadow>
        <boxGeometry args={[peca.largura * MM, peca.altura * MM, peca.profundidade * MM]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.8} />
      </mesh>
      {/* etiqueta da peça (nome) — sempre de frente para a câmera é caro; mantemos simples */}
    </group>
  );
}

export default function VistaExplodida({ modulo }) {
  const [fator, setFator] = useState(0.5);
  const dimensoes = modulo.dimensoes || { largura: 800, altura: 700, profundidade: 600 };
  const estrutura = modulo.estrutura || {};

  const pecas = useMemo(
    () => gerarPecasModulo(dimensoes, estrutura),
    [dimensoes, estrutura]
  );
  const centroModulo = useMemo(
    () => [(dimensoes.largura / 2) * MM, (dimensoes.altura / 2) * MM, 0],
    [dimensoes.largura, dimensoes.altura]
  );
  const alcance = Math.max(
    dimensoes.largura, dimensoes.altura, dimensoes.profundidade
  ) * MM;

  return (
    <div className="flex h-full flex-col">
      <div className="h-64 rounded-lg bg-gray-200 sm:h-96">
        <Canvas shadows camera={{ position: [1.5, 1.2, 1.8], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
          <group position={[0, -alcance * 0.5, 0]}>
            {pecas.map((peca) => (
              <PecaExplodida
                key={peca.id}
                peca={peca}
                fator={fator * alcance}
                centroModulo={centroModulo}
              />
            ))}
          </group>
          <OrbitControls makeDefault />
        </Canvas>
      </div>
      <label className="mt-2 block text-xs text-gray-600">
        Montagem: {Math.round(fator * 100)}% montado
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={1 - fator}
          onChange={(evento) => setFator(1 - Number(evento.target.value))}
          className="mt-1 w-full"
        />
      </label>
    </div>
  );
}
