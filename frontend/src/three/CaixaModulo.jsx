import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useModuloStore } from "../store/moduloStore";
import { criarTexturaMDF } from "./materiais/texturaMDF";
import { indiceDeChapas, corDaPeca, aplicarHerancaCasco } from "../lib/logicaChapas";
import CamadaFabricacao from "./CamadaFabricacao";
import {
  gerarVaos,
  gerarPaineisDivisorios,
  gerarPrateleiras,
  gerarGavetas,
  gerarPortas,
  gerarPecasAvulsas,
  calcularPainelDivisao,
  calcularCentroPorta,
} from "./logicaEstrutura";

const MM_PARA_M = 0.001;
const ESPESSURA_PORTA_MM = 18;
const ESP_FRENTE_MM = 18;
const ESP_CORPO_MM = 15;        // laterais e traseira da gaveta
const ESP_FUNDO_MM = 6;         // base da gaveta
const FOLGA_CORREDICA_MM = 10;  // espaço da corrediça, de cada lado
const RECUO_TRASEIRO_MM = 50;   // sobra entre a traseira da gaveta e o fundo do módulo
const GAVETA_COM_TAMPA = false; // true fecha a gaveta em cima, como uma caixa

const m = (mm) => mm * MM_PARA_M;

function centro(item, profundidadeModulo) {
  return [
    m(item.x + item.largura / 2),
    m(item.y + item.altura / 2),
    m(item.z + item.profundidade / 2 - profundidadeModulo / 2),
  ];
}

function medidas(item) {
  return [m(item.largura), m(item.altura), m(item.profundidade)];
}

function VaoSelecionavel({ vao, profundidade, selecionado, onSelecionar, onSelecionarPeca }) {
  return (
    <mesh
      position={centro(vao, profundidade)}
      userData={{ tipo: "vao" }}
      onClick={(e) => {
        e.stopPropagation();
        // o vão transparente fica na frente das peças que estão dentro dele:
        // se a primeira coisa sólida sob o clique é uma peça avulsa, seleciona a peça
        const primeiroSolido = (e.intersections || []).find((hit) => hit.object?.userData?.solido);
        const pecaId = primeiroSolido?.object?.userData?.pecaAvulsaId;
        if (pecaId) {
          onSelecionarPeca(pecaId);
          return;
        }
        onSelecionar(vao.id);
      }}
    >
      <boxGeometry args={medidas(vao)} />
      <meshStandardMaterial
        color={selecionado ? "#3b82f6" : "#ffffff"}
        transparent
        opacity={selecionado ? 0.12 : 0.02}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PainelDivisorio({ painel, profundidade, textura }) {
  return (
    <mesh position={centro(painel, profundidade)} userData={{ solido: true }} castShadow receiveShadow>
      <boxGeometry args={medidas(painel)} />
      <meshStandardMaterial map={textura} color="#ffffff" roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PreviaDivisao({ vaos, previa, profundidade }) {
  const vao = vaos.find((v) => v.id === previa.vaoId);
  if (!vao) return null;

  const painel = calcularPainelDivisao(vao, previa.eixo, previa.posicao, previa.espessura);

  return (
    <mesh position={centro(painel, profundidade)}>
      <boxGeometry args={medidas(painel)} />
      <meshStandardMaterial
        color="#f59e0b"
        transparent
        opacity={0.6}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Peça cadastrada pelo criador; a selecionada na lista ganha destaque e contorno
function PecaAvulsa({ peca, profundidade, textura, selecionada, onSelecionar }) {
  const tam = medidas(peca);
  const contorno = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(...tam)),
    [tam[0], tam[1], tam[2]]
  );

  const handlers = onSelecionar
    ? {
        onClick: (e) => {
          e.stopPropagation();
          onSelecionar(peca.id);
        },
        onPointerOver: (e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          document.body.style.cursor = "auto";
        },
      }
    : {};

  return (
    <mesh
      position={centro(peca, profundidade)}
      userData={{ solido: true, pecaAvulsaId: peca.id }}
      {...handlers}
      castShadow
      receiveShadow
    >
      <boxGeometry args={tam} />
      <meshStandardMaterial
        map={textura}
        color={selecionada ? "#fde68a" : "#ffffff"}
        emissive={selecionada ? "#f59e0b" : "#000000"}
        emissiveIntensity={selecionada ? 0.25 : 0}
        roughness={0.8}
        side={THREE.DoubleSide}
      />
      {selecionada && (
        <lineSegments geometry={contorno} renderOrder={12}>
          <lineBasicMaterial color="#b45309" depthTest={false} transparent />
        </lineSegments>
      )}
    </mesh>
  );
}

function Prateleira({ prateleira, profundidade, textura }) {
  return (
    <mesh position={centro(prateleira, profundidade)} userData={{ solido: true }} castShadow receiveShadow>
      <boxGeometry args={medidas(prateleira)} />
      <meshStandardMaterial map={textura} color="#ffffff" roughness={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Gaveta({ gaveta, profundidade, textura, ocultarPuxadorSimulado }) {
  const corpoLargura = gaveta.largura - FOLGA_CORREDICA_MM * 2;
  const corpoAltura = Math.max(gaveta.altura - 30, 40);
  const corpoProf = Math.max(gaveta.profundidade - RECUO_TRASEIRO_MM, 50);
  const interna = corpoLargura - ESP_CORPO_MM * 2; // largura entre as laterais

  // posições locais (mm); z é relativo ao centro do módulo
  const zFace = gaveta.z + gaveta.profundidade - profundidade / 2;
  const yCorpo = -gaveta.altura / 2 + 10 + corpoAltura / 2;
  const zFrenteTras = zFace - ESP_FRENTE_MM / 2;
  const zCorpoCentro = zFrenteTras - corpoProf / 2;
  const zTraseira = zFrenteTras - corpoProf + ESP_CORPO_MM / 2;

  const pecas = [
    {
      id: "frente",
      tam: [gaveta.largura, gaveta.altura, ESP_FRENTE_MM],
      pos: [0, 0, zFace],
      cor: "#b8a888",
    },
    {
      id: "lateral-esquerda",
      tam: [ESP_CORPO_MM, corpoAltura, corpoProf],
      pos: [-(corpoLargura - ESP_CORPO_MM) / 2, yCorpo, zCorpoCentro],
      cor: "#d8cfc0",
    },
    {
      id: "lateral-direita",
      tam: [ESP_CORPO_MM, corpoAltura, corpoProf],
      pos: [(corpoLargura - ESP_CORPO_MM) / 2, yCorpo, zCorpoCentro],
      cor: "#d8cfc0",
    },
    {
      id: "traseira",
      tam: [interna, corpoAltura - ESP_FUNDO_MM, ESP_CORPO_MM],
      pos: [0, yCorpo + ESP_FUNDO_MM / 2, zTraseira],
      cor: "#d8cfc0",
    },
    {
      id: "base",
      tam: [interna, ESP_FUNDO_MM, corpoProf],
      pos: [0, yCorpo - corpoAltura / 2 + ESP_FUNDO_MM / 2, zCorpoCentro],
      cor: "#cfc4ae",
    },
  ];

  if (GAVETA_COM_TAMPA) {
    pecas.push({
      id: "tampa",
      tam: [interna, ESP_FUNDO_MM, corpoProf],
      pos: [0, yCorpo + corpoAltura / 2 - ESP_FUNDO_MM / 2, zCorpoCentro],
      cor: "#cfc4ae",
    });
  }

  return (
    <group position={[m(gaveta.x + gaveta.largura / 2), m(gaveta.y + gaveta.altura / 2), 0]}>
      {pecas.map((p) => (
        <mesh key={p.id} position={p.pos.map((v) => m(v))} userData={{ solido: true }} castShadow receiveShadow>
          <boxGeometry args={p.tam.map((v) => m(v))} />
          <meshStandardMaterial map={textura} color="#ffffff" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* puxador simulado (some quando as ferragens reais estão visíveis) */}
      {!ocultarPuxadorSimulado && (
        <mesh position={[0, m(gaveta.altura * 0.3), m(zFace + ESP_FRENTE_MM / 2 + 2)]}>
          <boxGeometry args={[m(gaveta.largura * 0.5), m(6), m(4)]} />
          <meshStandardMaterial color="#4a4a4a" />
        </mesh>
      )}
    </group>
  );
}

export default function CaixaModulo({ vaoSelecionado, onSelecionarVao, modulo, somenteLeitura = false, chapas = null }) {
  // Fase 2 (mini visualizador): a prop `modulo` (dimensoes/aparencia/estrutura)
  // tem prioridade sobre o store global; `somenteLeitura` desliga interações.
  // Fase 5: `chapas` (lista do estoque) dá cor por peça via chapaId, com herança do casco.
  const doStore = useModuloStore((state) => state.modulo);
  const fonte = modulo || doStore;
  const dimensoes = fonte.dimensoes;
  const corDoModulo = fonte.aparencia.cor;
  const orientacaoFibra = fonte.aparencia.orientacao_fibra;
  const casco = fonte.estrutura.casco;
  const divisoes = fonte.estrutura.divisoes;
  const internos = fonte.estrutura.internos;
  const portas = fonte.estrutura.portas;
  const previa = useModuloStore((state) => state.previaDivisao);
  const estrutura = fonte.estrutura;
  const pecasAvulsasBrutas = estrutura.pecas;
  const pecaAvulsaSelecionada = useModuloStore((state) => state.pecaAvulsaSelecionada);
  const visualizacao = useModuloStore((state) => state.visualizacao);
  const setPecaAvulsaSelecionada = useModuloStore((state) => state.setPecaAvulsaSelecionada);
  const previaAtiva = somenteLeitura ? null : previa;
  const pecaSelecionadaAtiva = somenteLeitura ? null : pecaAvulsaSelecionada;
  const modoFabricacaoAtivo = somenteLeitura
    ? { furos: false, ferragens: false, ampliar: true }
    : visualizacao;

  // Fase 5: cor por peça (com fallback para a cor do módulo)
  const indice = useMemo(() => indiceDeChapas(chapas || []), [chapas]);
  const corDaEstrutura = useMemo(() => {
    const comHeranca = aplicarHerancaCasco(estrutura);
    const corDe = (item) => corDaPeca(item, casco?.chapaId, indice);
    return {
      casco: corDe({ chapaId: casco?.chapaId }),
      divisoes: Object.fromEntries((comHeranca.divisoes || []).map((d) => [d.id, corDe(d)])),
      internos: Object.fromEntries((comHeranca.internos || []).map((i) => [i.id, corDe(i)])),
      portas: Object.fromEntries((comHeranca.portas || []).map((p) => [p.id, corDe(p)])),
      pecas: Object.fromEntries((comHeranca.pecas || []).map((p) => [p.id, corDe(p)])),
    };
  }, [estrutura, casco, indice]);

  const { largura, altura, profundidade } = dimensoes;
  // Fase 5: a textura base usa a cor da chapa do casco (ou a cor de fallback do módulo)
  const corBase = corDaEstrutura.casco?.cor || corDoModulo;
  const textura = useMemo(() => criarTexturaMDF(corBase, orientacaoFibra), [corBase, orientacaoFibra]);

  useEffect(() => () => textura.dispose(), [textura]);

  const tamanho = useMemo(
    () => [largura * MM_PARA_M, altura * MM_PARA_M, profundidade * MM_PARA_M],
    [largura, altura, profundidade]
  );

  const vaos = useMemo(() => gerarVaos(dimensoes, divisoes, casco), [dimensoes, divisoes, casco]);
  const paineis = useMemo(
    () => gerarPaineisDivisorios(dimensoes, divisoes, casco),
    [dimensoes, divisoes, casco]
  );
  
  const prateleiras = useMemo(() => gerarPrateleiras(vaos, internos, portas), [vaos, internos, portas]);
  const gavetas = useMemo(() => gerarGavetas(vaos, internos), [vaos, internos]);
  const pecasAvulsas = useMemo(
    () => gerarPecasAvulsas(pecasAvulsasBrutas || [], dimensoes),
    [pecasAvulsasBrutas, dimensoes]
  );
  // com furos ou ferragens ligados, as portas ficam translúcidas para deixar ver o que há atrás
  const modoFabricacao = Boolean(modoFabricacaoAtivo?.furos || modoFabricacaoAtivo?.ferragens);
  const portasRenderizaveis = useMemo(() => gerarPortas(vaos, portas), [vaos, portas]);
  const espessuraCorpo = casco.espessura;
  const incluirFundo = casco.incluirFundo;
  const espessuraFundo = incluirFundo ? casco.espessuraFundo : 0;
  const profundidadeCorpo = profundidade - espessuraFundo;
  const pecasCorpo = [
    {
      id: "lateral-esquerda",
      pos: [espessuraCorpo / 2, altura / 2, espessuraFundo / 2],
      tam: [espessuraCorpo, altura, profundidadeCorpo],
    },
    {
      id: "lateral-direita",
      pos: [largura - espessuraCorpo / 2, altura / 2, espessuraFundo / 2],
      tam: [espessuraCorpo, altura, profundidadeCorpo],
    },
    {
      id: "base",
      pos: [largura / 2, espessuraCorpo / 2, espessuraFundo / 2],
      tam: [largura - espessuraCorpo * 2, espessuraCorpo, profundidadeCorpo],
    },
    {
      id: "tampo",
      pos: [largura / 2, altura - espessuraCorpo / 2, espessuraFundo / 2],
      tam: [largura - espessuraCorpo * 2, espessuraCorpo, profundidadeCorpo],
    },
    ...(incluirFundo ? [{
      id: "fundo",
      pos: [largura / 2, altura / 2, -profundidade / 2 + espessuraFundo / 2],
      tam: [largura - espessuraCorpo * 2, altura - espessuraCorpo * 2, espessuraFundo],
    }] : []),
  ];
  const vaosComGaveteiro = new Set(
    internos.filter((i) => i.tipo === "gaveteiro").map((i) => i.vao_id)
  );
  const vaosLivres = vaos.filter((v) => !vaosComGaveteiro.has(v.id));

  const offsetX = -tamanho[0] / 2;

  return (
    <group position={[offsetX, 0, 0]}>
      <group position={[tamanho[0] / 2, tamanho[1] / 2, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...tamanho)]} />
          <lineBasicMaterial color="#333333" />
        </lineSegments>
      </group>

      {pecasCorpo.map((peca) => (
        <mesh key={peca.id} position={peca.pos.map((v) => m(v))} castShadow receiveShadow>
          <boxGeometry args={peca.tam.map((v) => m(v))} />
          <meshStandardMaterial
            map={textura}
            color="#ffffff"
            roughness={0.8}
            transparent
            opacity={0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {paineis.map((painel) => (
        <PainelDivisorio key={painel.id} painel={painel} profundidade={profundidade} textura={textura} />
      ))}

      {prateleiras.map((p) => (
        <Prateleira key={p.id} prateleira={p} profundidade={profundidade} textura={textura} />
      ))}

      {pecasAvulsas.map((peca) => (
        <PecaAvulsa
          key={peca.id}
          peca={peca}
          profundidade={profundidade}
          textura={textura}
          selecionada={pecaSelecionadaAtiva === peca.id}
          onSelecionar={somenteLeitura ? undefined : setPecaAvulsaSelecionada}
        />
      ))}

      {gavetas.map((g) => (
        <Gaveta
          key={g.id}
          gaveta={g}
          profundidade={profundidade}
          textura={textura}
          ocultarPuxadorSimulado={Boolean(modoFabricacaoAtivo?.ferragens)}
        />
      ))}

      {!somenteLeitura && vaosLivres.map((vao) => (
        <VaoSelecionavel
          key={vao.id}
          vao={vao}
          profundidade={profundidade}
          selecionado={vaoSelecionado === vao.id}
          onSelecionar={onSelecionarVao}
          onSelecionarPeca={setPecaAvulsaSelecionada}
        />
      ))}

      {portasRenderizaveis.map((porta) => (
        <Porta
          key={porta.id}
          porta={porta}
          profundidade={dimensoes.profundidade}
          translucida={modoFabricacao}
        />
      ))}

      <CamadaFabricacao
        dimensoes={dimensoes}
        estrutura={estrutura}
        profundidade={profundidade}
        mostrarFuros={Boolean(modoFabricacaoAtivo?.furos)}
        mostrarFerragens={Boolean(modoFabricacaoAtivo?.ferragens)}
        ampliar={modoFabricacaoAtivo?.ampliar !== false}
      />

      {previaAtiva && <PreviaDivisao vaos={vaos} previa={previaAtiva} profundidade={profundidade} />}
    </group>
  );
}

function Porta({ porta, profundidade, translucida = false }) {
  const largura = porta.largura * MM_PARA_M;
  const altura = porta.altura * MM_PARA_M;
  const espessura = ESPESSURA_PORTA_MM * MM_PARA_M;

  const posX = (porta.x + porta.largura / 2) * MM_PARA_M;
  const posY = (porta.y + porta.altura / 2) * MM_PARA_M;
  const posZ = calcularCentroPorta(
    porta.zFace,
    profundidade,
    ESPESSURA_PORTA_MM,
    porta.offsetZ ?? 0
  ) * MM_PARA_M;

  // leve inclinação visual só pra indicar o eixo de giro (estético, sem animação)
  const rotacaoY =
    porta.tipo === 'giro'
      ? porta.ladoDobradica === 'esquerda'
        ? -0.05
        : 0.05
      : 0;

  const cor = porta.tipo === "bascula" ? "#b8ac91" : "#d4c8ad";

  return (
    <mesh
      position={[posX, posY, posZ]}
      rotation={[0, rotacaoY, 0]}
      userData={{ solido: true }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[largura, altura, espessura]} />
      <meshStandardMaterial
        color={cor}
        roughness={0.6}
        side={THREE.DoubleSide}
        transparent={translucida}
        opacity={translucida ? 0.3 : 1}
        depthWrite={!translucida}
      />
    </mesh>
  );
}