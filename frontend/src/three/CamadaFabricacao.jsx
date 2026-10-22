import React, { useMemo } from "react";
import * as THREE from "three";
import { gerarFerragensVisuais, gerarPlanoDeFuracao } from "./logicaFabricacao";

const MM_PARA_M = 0.001;
const m = (mm) => mm * MM_PARA_M;

// cor do marcador de cada tipo de furo
const COR_FURO = {
  "pino-prateleira": "#111827",
  "caneco-dobradica": "#dc2626",
  "caneco-basculante": "#dc2626",
  puxador: "#2563eb",
  "parafuso-corredica": "#059669",
};

const COR_METAL = "#9ca3af";
const COR_METAL_ESCURO = "#4b5563";

// módulo (x da esquerda, y da base, z do fundo, em mm) -> posição no 3D (metros, módulo centrado em z)
function posicao3D(x, y, z, profundidade) {
  return [m(x), m(y), m(z - profundidade / 2)];
}

const Z = new THREE.Vector3(0, 0, 1);

function Furo({ furo, profundidade, ampliar }) {
  const normal = useMemo(() => new THREE.Vector3(...(furo.normal || [0, 0, 1])).normalize(), [furo.normal]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z, normal), [normal]);

  // o disco fica 0,3 mm para fora da face para não "brigar" com a peça
  const recuo = 0.3;
  const posicao = posicao3D(
    furo.x + normal.x * recuo,
    furo.y + normal.y * recuo,
    furo.z + normal.z * recuo,
    profundidade
  );

  // furos de 4-5 mm somem na tela; ampliados ficam visíveis sem mudar nenhuma medida real
  const raio = (furo.diametro / 2) * (ampliar ? 2.5 : 1);

  return (
    <mesh position={posicao} quaternion={quaternion} renderOrder={5}>
      <circleGeometry args={[m(raio), 24]} />
      <meshBasicMaterial
        color={COR_FURO[furo.tipo] || "#111827"}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
}

function Caixa({ pos, tam, cor = COR_METAL }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={cor} metalness={0.5} roughness={0.4} />
    </mesh>
  );
}

// caneco na porta + braço e base presos na lateral
function Dobradica({ item, profundidade }) {
  const sinal = item.xLateral < item.x ? 1 : -1; // lado da lateral em relação ao caneco
  const comprimentoBraco = Math.abs(item.x - item.xLateral);
  const zBraco = item.z - 6;

  return (
    <group>
      <mesh
        position={posicao3D(item.x, item.y, item.z + item.profundidade / 2, profundidade)}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[m(item.diametro / 2), m(item.diametro / 2), m(item.profundidade), 28]} />
        <meshStandardMaterial color={COR_METAL} metalness={0.6} roughness={0.35} />
      </mesh>
      <Caixa
        pos={posicao3D(item.x - (sinal * comprimentoBraco) / 2, item.y, zBraco, profundidade)}
        tam={[m(comprimentoBraco), m(12), m(3)]}
      />
      <Caixa
        pos={posicao3D(item.xLateral + sinal * 1.5, item.y, zBraco, profundidade)}
        tam={[m(3), m(42), m(22)]}
        cor={COR_METAL_ESCURO}
      />
    </group>
  );
}

// puxador em barra: duas hastes + barra, afastado 22 mm da face
function Puxador({ item, profundidade }) {
  const vertical = item.orientacao === "vertical";
  const afastamento = 22;
  const comprimento = item.espacamento + 24;
  const [px, py, pz] = [item.x, item.y, item.z];

  const haste = (sinal) => (
    <Caixa
      key={sinal}
      pos={posicao3D(
        vertical ? px : px + (sinal * item.espacamento) / 2,
        vertical ? py + (sinal * item.espacamento) / 2 : py,
        pz + afastamento / 2,
        profundidade
      )}
      tam={[m(8), m(8), m(afastamento)]}
      cor={COR_METAL_ESCURO}
    />
  );

  return (
    <group>
      {haste(-1)}
      {haste(1)}
      <Caixa
        pos={posicao3D(px, py, pz + afastamento + 4, profundidade)}
        tam={vertical ? [m(10), m(comprimento), m(10)] : [m(comprimento), m(10), m(10)]}
        cor={COR_METAL_ESCURO}
      />
    </group>
  );
}

// pino de prateleira: haste que sai da lateral por baixo da prateleira
function PinoApoio({ item, profundidade, ampliar }) {
  const comprimento = 8;
  const normal = useMemo(() => new THREE.Vector3(...item.normal).normalize(), [item.normal]);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
    [normal]
  );
  const raio = (item.diametro / 2) * (ampliar ? 1.6 : 1);

  return (
    <mesh
      position={posicao3D(
        item.x + normal.x * (comprimento / 2),
        item.y,
        item.z + normal.z * (comprimento / 2),
        profundidade
      )}
      quaternion={quaternion}
    >
      <cylinderGeometry args={[m(raio), m(raio), m(comprimento), 16]} />
      <meshStandardMaterial color="#f3f4f6" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

function Trilho({ item, profundidade }) {
  return (
    <Caixa
      pos={posicao3D(item.x, item.y, item.z, profundidade)}
      tam={[m(item.largura), m(item.altura), m(item.profundidade)]}
      cor="#6b7280"
    />
  );
}

export default function CamadaFabricacao({
  dimensoes,
  estrutura,
  profundidade,
  mostrarFuros,
  mostrarFerragens,
  ampliar,
}) {
  const furos = useMemo(
    () => (mostrarFuros ? gerarPlanoDeFuracao(dimensoes, estrutura).furos : []),
    [mostrarFuros, dimensoes, estrutura]
  );
  const ferragens = useMemo(
    () => (mostrarFerragens ? gerarFerragensVisuais(dimensoes, estrutura) : []),
    [mostrarFerragens, dimensoes, estrutura]
  );

  return (
    <group>
      {furos.map((furo) => (
        <Furo key={furo.id} furo={furo} profundidade={profundidade} ampliar={ampliar} />
      ))}

      {ferragens.map((item) => {
        if (item.tipo === "dobradica") return <Dobradica key={item.id} item={item} profundidade={profundidade} />;
        if (item.tipo === "puxador") return <Puxador key={item.id} item={item} profundidade={profundidade} />;
        if (item.tipo === "pino-apoio") {
          return <PinoApoio key={item.id} item={item} profundidade={profundidade} ampliar={ampliar} />;
        }
        if (item.tipo === "corredica-gaveta" || item.tipo === "trilho-porta") {
          return <Trilho key={item.id} item={item} profundidade={profundidade} />;
        }
        return null;
      })}
    </group>
  );
}