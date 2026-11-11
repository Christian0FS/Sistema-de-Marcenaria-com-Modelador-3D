// Câmera do editor com enquadramento automático e vistas predefinidas (Fase 2.2).
// A função pura de distância vive em lib/enquadramento.js (testável sem Three).
import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { distanciaParaEnquadrar } from "../lib/enquadramento";

export const VISTAS = {
  isometrica: { direcao: [1, 0.8, 1] },
  frontal: { direcao: [0, 0, 1] },
  lateral: { direcao: [1, 0, 0] },
  topo: { direcao: [0, 1, 0.0001] },
};

/**
 * Ajusta a câmera ao bounding box do módulo. Disparado via prop
 * `gatilho` (número que muda quando se deve enquadrar).
 */
export default function CameraEditor({ dimensoesM, vista = "isometrica", gatilho = 0 }) {
  const { camera } = useThree();
  const controle = useRef(null);

  useEffect(() => {
    if (!dimensoesM || !controle.current) return;
    const [l, a, p] = dimensoesM;
    const v = VISTAS[vista] || VISTAS.isometrica;
    const distancia = distanciaParaEnquadrar(Math.max(l, p), a, camera.fov || 45);
    const d = new THREE.Vector3(...v.direcao).normalize().multiplyScalar(distancia);
    camera.position.set(d.x, d.y, d.z);
    controle.current.target.set(0, a / 2, 0);
    controle.current.update();
  }, [gatilho, vista, dimensoesM, camera]);

  return (
    <OrbitControls
      ref={controle}
      makeDefault
      enablePan
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={0.5}
    />
  );
}
