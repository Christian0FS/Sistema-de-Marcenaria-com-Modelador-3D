// Página de teste do cenário (ferramenta interna): fileira fixa de 9 módulos
// para validar o posicionamento, os adereços e capturar as 3 vistas.
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CenaComercial3D from "../three/CenaComercial3D";

const modulosTeste = [
    { largura: 1600 }, { largura: 450 }, { largura: 900 }, { largura: 600 },
    { largura: 300 }, { largura: 1200 }, { largura: 750 }, { largura: 450 },
    { largura: 600 },
].map((item, indice) => ({
    modulo_id: `teste-${indice}`,
    nome: `Módulo ${item.largura}`,
    dimensoes: { largura: item.largura, altura: indice % 3 === 0 ? 2200 : 800, profundidade: 600 },
    estrutura: { portas: indice % 2 === 0 ? [{ id: "p" }] : [] },
    aparencia: { cor: ["#e8e4d8", "#d6cfc0", "#e2d8c6"][indice % 3] },
}));

export default function TesteCenario() {
    const busca = new URLSearchParams(useLocation().search);
    const [camera, setCamera] = useState(busca.get("camera") || "frontal");

    useEffect(() => {
        const nova = busca.get("camera");
        if (nova) setCamera(nova);
    }, [busca]);

    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <CenaComercial3D
                modulos={modulosTeste}
                espacamento={0}
                camera={camera}
                usarHdri={busca.get("hdri") !== "0"}
            />
        </div>
    );
}
