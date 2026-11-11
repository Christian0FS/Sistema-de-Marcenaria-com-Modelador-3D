// Cena do editor: canvas full, enquadramento automático e chapas para cor por peça.
import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import CaixaModulo from "./CaixaModulo";
import CameraEditor from "./CameraEditor";
import { useModuloStore } from "../store/moduloStore";
import { api } from "../lib/api";

export default function Cena({ vaoSelecionado, onSelecionarVao, vista = "isometrica" }) {
  const [chapas, setChapas] = useState(null);
  const dimensoes = useModuloStore((state) => state.modulo.dimensoes);
  const [gatilho, setGatilho] = useState(0);
  const dimensoesChave = `${dimensoes?.largura}-${dimensoes?.altura}-${dimensoes?.profundidade}`;
  const anterior = useRef(dimensoesChave);

  useEffect(() => {
    let ativo = true;
    api.listarChapas()
      .then((lista) => { if (ativo) setChapas(lista); })
      .catch(() => { if (ativo) setChapas([]); });
    return () => { ativo = false; };
  }, []);

  // reenquadra quando as dimensões mudam
  useEffect(() => {
    if (anterior.current !== dimensoesChave) {
      anterior.current = dimensoesChave;
      setGatilho((g) => g + 1);
    }
  }, [dimensoesChave]);

  const dimensoesM = dimensoes
    ? [dimensoes.largura * 0.001, dimensoes.altura * 0.001, dimensoes.profundidade * 0.001]
    : null;

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border-app-borda bg-app-fundo">
      <Canvas shadows camera={{ fov: 45 }}>
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[3, 5, 2]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <gridHelper args={[10, 10, "#c9bfb4", "#ddd6cc"]} />
        <CaixaModulo
          vaoSelecionado={vaoSelecionado}
          onSelecionarVao={onSelecionarVao}
          chapas={chapas}
        />
        <CameraEditor
          dimensoesM={dimensoesM}
          vista={vista}
          gatilho={gatilho}
        />
      </Canvas>
    </div>
  );
}
