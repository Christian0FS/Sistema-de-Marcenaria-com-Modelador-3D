import React, { useMemo } from "react";
import * as THREE from "three";
import { useModuloStore } from "../store/moduloStore";
import {
  gerarVaos,
  gerarPaineisDivisorios,
  gerarPrateleiras,
  gerarGavetas,
} from "./logicaEstrutura";

const MM_PARA_M = 0.001;

function VaoSelecionavel({ vao, profundidade, selecionado, onSelecionar }) {
  const largura = vao.largura * MM_PARA_M;
  const altura = vao.altura * MM_PARA_M;
  const prof = profundidade * MM_PARA_M;

  const posX = (vao.x + vao.largura / 2) * MM_PARA_M;
  const posY = (vao.y + vao.altura / 2) * MM_PARA_M;

  return (
    <mesh
      position={[posX, posY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelecionar(vao.id);
      }}
    >
      <boxGeometry args={[largura, altura, prof]} />
      <meshStandardMaterial
        color={selecionado ? "#3b82f6" : "#ffffff"}
        transparent
        opacity={selecionado ? 0.35 : 0.02}
        depthWrite={false}
      />
    </mesh>
  );
}

function PainelDivisorio({ painel, profundidade }) {
  const largura = painel.largura * MM_PARA_M;
  const altura = painel.altura * MM_PARA_M;
  const prof = profundidade * MM_PARA_M;

  const posX = painel.x * MM_PARA_M;
  const posY = (painel.y + painel.altura / 2) * MM_PARA_M;

  return (
    <mesh position={[posX, posY, 0]} castShadow receiveShadow>
      <boxGeometry args={[largura, altura, prof]} />
      <meshStandardMaterial color="#d8cfc0" roughness={0.8} />
    </mesh>
  );
}

function Prateleira({ prateleira, profundidade }) {
  const largura = prateleira.largura * MM_PARA_M;
  const altura = prateleira.altura * MM_PARA_M;
  const prof = (profundidade - 10) * MM_PARA_M;

  const posX = prateleira.x * MM_PARA_M;
  const posY = (prateleira.y + prateleira.altura / 2) * MM_PARA_M;

  return (
    <mesh position={[posX, posY, 0]} castShadow receiveShadow>
      <boxGeometry args={[largura, altura, prof]} />
      <meshStandardMaterial color="#cfc4ae" roughness={0.8} />
    </mesh>
  );
}

function Gaveta({ gaveta, profundidade }) {
  const largura = gaveta.largura * MM_PARA_M;
  const altura = gaveta.altura * MM_PARA_M;
  const profFrente = 20 * MM_PARA_M;

  const posX = (gaveta.x + gaveta.largura / 2) * MM_PARA_M;
  const posY = (gaveta.y + gaveta.altura / 2) * MM_PARA_M;
  const posZFrente = (profundidade * MM_PARA_M) / 2 + 0.002;

  return (
    <group position={[posX, posY, posZFrente]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[largura, altura, profFrente]} />
        <meshStandardMaterial color="#b8a888" roughness={0.7} />
      </mesh>
      <mesh position={[0, altura * 0.3, profFrente / 2 + 0.001]}>
        <boxGeometry args={[largura * 0.5, 0.006, 0.004]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
    </group>
  );
}

export default function CaixaModulo({ vaoSelecionado, onSelecionarVao }) {
  const dimensoes = useModuloStore((state) => state.modulo.dimensoes);
  const cor = useModuloStore((state) => state.modulo.aparencia.cor);
  const divisoes = useModuloStore((state) => state.modulo.estrutura.divisoes);
  const internos = useModuloStore((state) => state.modulo.estrutura.internos);

  const { largura, altura, profundidade } = dimensoes;

  const tamanho = useMemo(
    () => [largura * MM_PARA_M, altura * MM_PARA_M, profundidade * MM_PARA_M],
    [largura, altura, profundidade]
  );

  const vaos = useMemo(() => gerarVaos(dimensoes, divisoes), [dimensoes, divisoes]);
  const paineis = useMemo(
    () => gerarPaineisDivisorios(dimensoes, divisoes),
    [dimensoes, divisoes]
  );
  const prateleiras = useMemo(() => gerarPrateleiras(vaos, internos), [vaos, internos]);
  const gavetas = useMemo(() => gerarGavetas(vaos, internos), [vaos, internos]);

  const vaosComInterno = new Set(internos.map((i) => i.vao_id));
  const vaosLivres = vaos.filter((v) => !vaosComInterno.has(v.id));

  const offsetX = -tamanho[0] / 2;

  return (
    <group position={[offsetX, 0, 0]}>
      <group position={[tamanho[0] / 2, tamanho[1] / 2, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...tamanho)]} />
          <lineBasicMaterial color="#333333" />
        </lineSegments>
        <mesh castShadow receiveShadow>
          <boxGeometry args={tamanho} />
          <meshStandardMaterial color={cor} roughness={0.8} transparent opacity={0.15} />
        </mesh>
      </group>

      {paineis.map((painel) => (
        <PainelDivisorio key={painel.id} painel={painel} profundidade={profundidade} />
      ))}

      {prateleiras.map((p) => (
        <Prateleira key={p.id} prateleira={p} profundidade={profundidade} />
      ))}

      {gavetas.map((g) => (
        <Gaveta key={g.id} gaveta={g} profundidade={profundidade} />
      ))}

      {vaosLivres.map((vao) => (
        <VaoSelecionavel
          key={vao.id}
          vao={vao}
          profundidade={profundidade}
          selecionado={vaoSelecionado === vao.id}
          onSelecionar={onSelecionarVao}
        />
      ))}
    </group>
  );
}