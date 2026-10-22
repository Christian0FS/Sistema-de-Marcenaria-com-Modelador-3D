// Cenário comercial (Fase 5.4): chão/parede configuráveis, vários módulos lado a lado,
// câmeras pré-definidas, props de escala (planta, cortina, tapete), HDRI e exportação de imagem.
import React, { useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { enfileirarModulos, posicionarAderecos } from "./posicionamentoCenario";

// Parede de fundo: 0,7 m atrás da ORIGEM (frente dos módulos). Como os
// módulos têm ~600 mm de profundidade, sobra 100 mm entre o fundo do móvel e
// a parede — showroom real, sem vão gigante.
const PROFUNDIDADE_SALA_MM = 700;
const ALTURA_TETO_M = 2.7;

const MM = 0.001;
const m = (mm) => mm * MM;

// ---------- Ambiente (chão + parede) ----------
// O chão vai da parede de fundo até à frente da câmera: a parede fica na
// BORDA de trás do chão (não atravessa ele) e o corte é a sonda vertical a
// paredeZ, do piso ao teto.
function Ambiente({ chaoLargura, chaoProfundidade, paredeAltura, corChao, corParede, paredeZ }) {
  const chaoCentroZ = paredeZ + chaoProfundidade / 2;
  return (
    <group>
      {/* chão: deitado, cobre da parede até bem além da frente da câmera */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, chaoCentroZ]}
        receiveShadow
      >
        <planeGeometry args={[chaoLargura, chaoProfundidade]} />
        <meshStandardMaterial color={corChao} roughness={0.9} />
      </mesh>
      {/* parede: em plano vertical, 1 mm à frente do fim do chão para evitar
          qualquer z-fighting na junção (a “linha” do meio da parede) */}
      <mesh position={[0, paredeAltura / 2, paredeZ + 0.001]} receiveShadow>
        <planeGeometry args={[chaoLargura, paredeAltura]} />
        <meshStandardMaterial color={corParede} roughness={0.95} />
      </mesh>
      {/* rodapé: cobre visualmente a junção chão-parede */}
      <mesh position={[0, 0.05, paredeZ + 0.002]} receiveShadow>
        <boxGeometry args={[chaoLargura, 0.1, 0.012]} />
        <meshStandardMaterial color="#e8e2d8" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ---------- Módulo simplificado (casco + portas/prateleiras) ----------
function ModuloSimples({ modulo, texturaCor }) {
  const dimensoes = modulo.dimensoes;
  const estrutura = modulo.estrutura || {};
  const espessura = Number(estrutura.casco?.espessura) || 15;
  const espessuraFundo = estrutura.casco?.incluirFundo === false ? 0 : Number(estrutura.casco?.espessuraFundo) || 6;

  const profundidadeCasco = dimensoes.profundidade - espessuraFundo;

  const pecasCorpo = [
    { pos: [espessura / 2, dimensoes.altura / 2, 0], tam: [espessura, dimensoes.altura, profundidadeCasco] },
    { pos: [dimensoes.largura - espessura / 2, dimensoes.altura / 2, 0], tam: [espessura, dimensoes.altura, profundidadeCasco] },
    { pos: [dimensoes.largura / 2, espessura / 2, 0], tam: [dimensoes.largura - espessura * 2, espessura, profundidadeCasco] },
    { pos: [dimensoes.largura / 2, dimensoes.altura - espessura / 2, 0], tam: [dimensoes.largura - espessura * 2, espessura, profundidadeCasco] },
    // fundo: fecha a parte de trás do módulo (vista 3/4 não vê mais através)
    ...(espessuraFundo > 0
      ? [{
        pos: [dimensoes.largura / 2, dimensoes.altura / 2, -dimensoes.profundidade / 2 + espessuraFundo / 2],
        tam: [dimensoes.largura - espessura * 2, dimensoes.altura - espessura * 2, espessuraFundo],
      }]
      : []),
  ];

  return (
    <group>
      {pecasCorpo.map((peca, i) => (
        <mesh key={i} position={peca.pos.map((v) => m(v))} castShadow receiveShadow>
          <boxGeometry args={peca.tam.map((v) => m(v))} />
          <meshStandardMaterial color={texturaCor} roughness={0.75} />
        </mesh>
      ))}
      {estrutura.portas?.length > 0 && (
        <mesh
          position={[
            m(dimensoes.largura / 2),
            m(dimensoes.altura / 2),
            m(dimensoes.profundidade / 2 + 9),
          ]}
          castShadow
        >
          <boxGeometry args={[m(dimensoes.largura), m(dimensoes.altura), 0.018]} />
          <meshStandardMaterial color={texturaCor} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// ---------- Props de escala: planta, cortina, tapete ----------
function Planta({ posicao }) {
  // vaso de planta de chão: ~1,3 m de altura total (referência de escala humana)
  return (
    <group position={[posicao.x * MM, 0, posicao.z * MM]}>
      {/* vaso */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.44, 24]} />
        <meshStandardMaterial color="#b8643c" roughness={0.9} />
      </mesh>
      {/* folhagem: três esferas empilhadas */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial color="#2f7d32" roughness={0.9} />
      </mesh>
      <mesh position={[0.14, 1.05, 0.06]} castShadow>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#3a8f3a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 1.02, -0.04]} castShadow>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshStandardMaterial color="#276b27" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Cortina vertical: plano paralelo à parede de fundo, pendurada ATRÁS dos
// móveis, do piso até pouco antes do teto (nunca cruza o volume dos módulos —
// o z vem de posicionarAderecos).
function Cortina({ posicao, alturaTeto }) {
  const alturaCortina = alturaTeto - 0.05;
  const centroY = alturaCortina / 2;
  return (
    <group position={[posicao.x * MM, centroY, posicao.z * MM]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[posicao.largura * MM, alturaCortina, 0.02]} />
        <meshStandardMaterial color="#8d7b68" roughness={1} />
      </mesh>
    </group>
  );
}

// Tapete: retângulo deitado no piso, sob os móveis, maior que a fileira com margem.
function Tapete({ posicao }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[posicao.x * MM, posicao.y, posicao.z * MM]}
      receiveShadow
    >
      <planeGeometry args={[posicao.largura * MM, posicao.profundidade * MM]} />
      <meshStandardMaterial color="#a25b4b" roughness={1} />
    </mesh>
  );
}

// ---------- Câmeras pré-definidas (ângulos fixos; distância escala com a fileira) ----------
// direcaoXZ é a direção horizontal; alturaM fixa a câmera na altura dos olhos
// (não escala com a distância). No topo, altura = distância (quase zênite).
const CAMERAS = {
  frontal: { direcaoXZ: [0, 1], alturaM: 1.6, alvoY: 1.0, fov: 40 },
  tres_quartos: { direcaoXZ: [0.75, 1], alturaM: 2.0, alvoY: 1.0, fov: 45 },
  detalhe: { direcaoXZ: [0.35, 0.65], alturaM: 1.3, alvoY: 0.8, fov: 38 },
  topo: { direcaoXZ: [0, 0.12], alturaM: null, alvoY: 0.6, fov: 45 },
};

function ControleCamera({ camera, larguraFileiraM }) {
  const controle = useRef(null);
  const { camera: threeCamera } = useThree();
  React.useEffect(() => {
    const c = CAMERAS[camera] || CAMERAS.frontal;
    // distância horizontal proporcional à largura da fileira, mantendo o ângulo
    const distancia = Math.max(2.2, larguraFileiraM * 1.05 + 1.5);
    const dir = new THREE.Vector3(c.direcaoXZ[0], 0, c.direcaoXZ[1]).normalize();
    threeCamera.position.set(dir.x * distancia, c.alturaM ?? distancia, dir.z * distancia);
    threeCamera.fov = c.fov;
    threeCamera.updateProjectionMatrix();
    if (controle.current) {
      controle.current.target.set(0, c.alvoY, 0);
      controle.current.update();
    }
  }, [camera, larguraFileiraM, threeCamera]);
  return (
    <OrbitControls
      ref={controle}
      makeDefault
      enablePan
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

// ---------- Exportação de imagem (gl.domElement.toDataURL) ----------
function CapturaImagem({ gatilho }) {
  const { gl, scene, camera } = useThree();
  React.useEffect(() => {
    if (!gatilho) return;
    gl.render(scene, camera);
    const url = gl.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = gatilho.nomeArquivo || "cenario.png";
    link.click();
  }, [gatilho, gl, scene, camera]);
  return null;
}

// ---------- Cena principal ----------
export default function CenaComercial3D({
  modulos, espacamento = 30, chao = "#c9b8a3", parede = "#efe9e0",
  camera = "tres_quartos", props = { planta: true, cortina: true, tapete: true },
  gatilhoCaptura = null, usarHdri = true,
}) {
  const { posicoes, aderecos } = useMemo(() => {
    const enfileirados = enfileirarModulos(modulos, espacamento);
    const caixas = enfileirados.map((p) => p.caixa);
    return {
      posicoes: enfileirados,
      aderecos: posicionarAderecos(caixas, {
        paredeZ: -PROFUNDIDADE_SALA_MM,
      }),
    };
  }, [modulos, espacamento]);

  const larguraTotal = aderecos.area.maxX - aderecos.area.minX;
  // sala = fileira + 2 m de cada lado; chão se estende da parede até bem
  // além da câmera (a câmera nunca vê o fim do chão)
  const larguraSala = aderecos.larguraSala;
  const ambienteLargura = Math.max(larguraSala * MM, 4);
  const chaoZFrontal = 12000; // 12 m para além da parede: câmera nunca vê a borda
  const ambienteProfundidade = (PROFUNDIDADE_SALA_MM + chaoZFrontal) * MM;

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }}>
      {/* HDRI + luz de preenchimento para iluminação mais realista */}
      {usarHdri && <Environment preset="apartment" background={false} />}
      <color attach="background" args={["#f4f1ec"]} />
      <fog attach="fog" args={["#f4f1ec", 25, 60]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[2.5, 3.2, 1.6]}
        intensity={0.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Ambiente
        chaoLargura={ambienteLargura}
        chaoProfundidade={ambienteProfundidade}
        paredeAltura={ALTURA_TETO_M}
        corChao={chao}
        corParede={parede}
        paredeZ={-PROFUNDIDADE_SALA_MM * MM}
      />
      {/* A fileira já é posicionada e centrada em X = 0 pelas funções puras;
          o centro de cada módulo já vem pronto — sem duplo deslocamento. */}
      {/* ModuloSimples desenha a partir da borda esquerda local (x = 0..largura);
          subtraímos metade da largura para alinhar com a caixa centrada em centroX. */}
      {posicoes.map(({ modulo, centroX }) => (
        <group
          key={modulo.modulo_id}
          position={[(centroX - (modulo.dimensoes?.largura || 0) / 2) * MM, 0, 0]}
        >
          <ModuloSimples modulo={modulo} texturaCor={modulo.aparencia?.cor || "#e8e4d8"} />
        </group>
      ))}
      {props.tapete && <Tapete posicao={aderecos.tapete} />}
      {props.planta && <Planta posicao={aderecos.planta} />}
      {props.cortina && <Cortina posicao={aderecos.cortina} alturaTeto={ALTURA_TETO_M} />}
      <ControleCamera camera={camera} larguraFileiraM={larguraTotal * MM} />
      <CapturaImagem gatilho={gatilhoCaptura} />
    </Canvas>
  );
}
