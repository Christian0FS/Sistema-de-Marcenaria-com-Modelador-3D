// Mini visualizador somente leitura para o painel (Fase 2).
// Um único Canvas, sem interação no 3D, sempre no cenário Neutro.
import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import CaixaModulo from "../three/CaixaModulo";
import { classeInput } from "./ui";

// rotação lenta automática (sem orbit do usuário)
function GirarSozinho({ alvo = [0, 0.3, 0], distancia = 1.6 }) {
  const ref = useRef(null);
  useFrame((estado) => {
    const t = estado.clock.getElapsedTime();
    if (!ref.current) return;
    ref.current.target.set(alvo[0], alvo[1], alvo[2]);
    ref.current.object.position.set(
      Math.sin(t * 0.25) * distancia,
      0.9,
      Math.cos(t * 0.25) * distancia
    );
    ref.current.update();
  });
  return <OrbitControls ref={ref} enableZoom={false} enablePan={false} enableDamping={false} />;
}

export default function MiniVisualizador({ projetos, chapas }) {
  const [projetoId, setProjetoId] = useState("");
  const [moduloId, setModuloId] = useState("");

  const projeto = projetos.find((p) => p.id === projetoId) || null;
  const modulos = projeto?.modulos || [];
  const modulo = modulos.find((m) => m.modulo_id === moduloId) || modulos[0] || null;

  useEffect(() => {
    if (!projetoId && projetos.length) setProjetoId(projetos[0].id);
  }, [projetos, projetoId]);

  useEffect(() => {
    // quando muda o projeto (ou a lista), volta ao último módulo salvo do projeto
    if (projeto) {
      setModuloId(projeto.modulos?.length ? projeto.modulos[projeto.modulos.length - 1].modulo_id : "");
    }
  }, [projetoId]); // eslint-disable-line


  return (
    <section className="flex flex-col rounded-card border border-app-borda bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-app-texto">Editor 3D</h2>
        <span className="rounded-full bg-app-fundo px-2 py-0.5 text-[10px] text-app-secundario">Prévia</span>
      </header>

      {projetos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-app-secundario">Crie um projeto para ver a prévia aqui.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 grid gap-2">
            <select
              value={projetoId}
              onChange={(e) => setProjetoId(e.target.value)}
              aria-label="Projeto da prévia"
              className={classeInput}
            >
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
            <select
              value={modulo?.modulo_id || ""}
              onChange={(e) => setModuloId(e.target.value)}
              aria-label="Módulo da prévia"
              className={classeInput}
              disabled={modulos.length === 0}
            >
              {modulos.length === 0 && <option value="">Nenhum móvel neste projeto</option>}
              {modulos.map((m) => (
                <option key={m.modulo_id} value={m.modulo_id}>{m.nome || "Móvel"}</option>
              ))}
            </select>
          </div>

          <div
            className="relative h-[280px] w-full overflow-hidden rounded-lg border border-app-borda bg-app-fundo"
            style={{ pointerEvents: "none" }} // somente leitura: sem interação no 3D
          >
            {modulo?.dimensoes ? (
              <Canvas
                frameloop="always"
                dpr={[1, 1.5]}
                shadows={false}
                camera={{ position: [1.4, 1.0, 1.4], fov: 42 }}
              >
                <ambientLight intensity={0.85} />
                <directionalLight position={[2, 3, 2]} intensity={0.9} />
                <group position={[0, -0.2, 0]}>
                  <CaixaModulo
                    modulo={{
                      nome: modulo.nome,
                      dimensoes: modulo.dimensoes,
                      estrutura: modulo.estrutura || {},
                      aparencia: modulo.aparencia || { cor: "#e8e4d8", orientacao_fibra: "horizontal" },
                    }}
                    chapas={chapas}
                    somenteLeitura
                  />
                </group>
                <GirarSozinho />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-app-secundario">
                Nenhum móvel para mostrar.
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!modulo}
            onClick={() => {
              const destino = modulo
                ? `/editor/${projetoId}/${modulo.modulo_id}`
                : `/editor/${projetoId}`;
              window.location.assign(destino); // fora do canvas: navegação comum
            }}
            className="mt-3 self-start rounded-lg bg-primario px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primario-escuro disabled:cursor-not-allowed disabled:opacity-50"
          >
            Abrir no editor
          </button>
        </>
      )}
    </section>
  );
}
