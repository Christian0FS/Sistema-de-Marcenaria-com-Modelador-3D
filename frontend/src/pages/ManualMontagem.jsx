// Manual de montagem de uma peça — página pública acessada pelo QR Code da etiqueta.
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import VistaExplodida from "../three/VistaExplodida";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function ManualMontagem() {
  const { projetoId, pecaId } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    fetch(`${API_URL}/publico/manual/${projetoId}/${pecaId}`)
      .then(async (resposta) => {
        if (!resposta.ok) {
          const corpo = await resposta.json().catch(() => ({}));
          throw new Error(corpo.detail || `Erro ${resposta.status}`);
        }
        return resposta.json();
      })
      .then((conteudo) => {
        if (ativo) setDados(conteudo);
      })
      .catch((e) => {
        if (ativo) setErro(e.message || "Não foi possível carregar o manual.");
      });
    return () => { ativo = false; };
  }, [projetoId, pecaId]);

  if (erro) {
    return (
      <main className="p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Manual de montagem</h1>
        <p role="alert" className="mt-3 text-sm text-red-700">{erro}</p>
      </main>
    );
  }
  if (!dados) {
    return <p className="p-6 text-sm text-gray-500">Carregando manual...</p>;
  }

  const { projeto, modulo, peca } = dados;
  const moduloPara3D = {
    nome: modulo.nome,
    dimensoes: {
      largura: peca.largura_corte || peca.largura || 600,
      altura: peca.altura_corte || peca.altura || 400,
      profundidade: peca.profundidade || peca.espessura || 18,
    },
    estrutura: {
      casco: { espessura: peca.espessura || 15, incluirFundo: false, espessuraFundo: 0 },
      divisoes: [], internos: [], portas: [], pecas: [],
      // única peça: a própria peça da etiqueta, como peça avulsa na origem
      pecas: [{
        id: "peca-manual",
        nome: peca.nome || "Peça",
        orientacao: "horizontal",
        medidaA: peca.largura_corte || peca.largura || 600,
        medidaB: peca.profundidade_corte || peca.profundidade || 400,
        espessura: peca.espessura || 15,
        x: 0, y: 0, z: 0,
      }],
    },
  };

  return (
    <main className="mx-auto max-w-2xl p-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Manual de montagem — {peca.nome || "Peça"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Projeto {projeto.nome} · Módulo {modulo.nome}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Corte: {peca.largura_corte || "?"} × {peca.altura_corte || "?"} × {peca.espessura || "?"} mm
        </p>
      </header>

      <VistaExplodida modulo={moduloPara3D} />

      <section className="mt-4 rounded border border-gray-200 bg-white p-3 text-sm text-gray-700">
        <h2 className="mb-2 font-medium">Como usar</h2>
        <ol className="list-inside list-decimal space-y-1 text-xs">
          <li>Gire a peça com o dedo/mouse e use o controle deslizante para ver a montagem passo a passo.</li>
          <li>Confira as medidas de corte antes de posicionar a peça no móvel.</li>
          <li>Dúvidas? Entre em contato com a marcenaria informando o código da peça na etiqueta.</li>
        </ol>
      </section>
    </main>
  );
}
