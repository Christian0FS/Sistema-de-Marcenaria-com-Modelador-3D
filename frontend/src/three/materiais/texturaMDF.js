import * as THREE from "three";

export function criarTexturaMDF(corBase, orientacao = "horizontal") {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const contexto = canvas.getContext("2d");
    contexto.fillStyle = corBase;
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    const horizontal = orientacao !== "vertical";
    const comprimento = horizontal ? canvas.width : canvas.height;
    const largura = horizontal ? canvas.height : canvas.width;
    const gradiente = contexto.createLinearGradient(0, 0, horizontal ? 0 : canvas.width, horizontal ? canvas.height : 0);
    gradiente.addColorStop(0, "rgba(255,255,255,0.12)");
    gradiente.addColorStop(0.5, "rgba(255,255,255,0)");
    gradiente.addColorStop(1, "rgba(0,0,0,0.12)");
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    for (let faixa = 0; faixa < 42; faixa += 1) {
        const posicao = (faixa / 42) * largura;
        contexto.beginPath();
        contexto.moveTo(horizontal ? 0 : posicao, horizontal ? posicao : 0);
        contexto.lineTo(horizontal ? comprimento : posicao, horizontal ? posicao : comprimento);
        contexto.strokeStyle = faixa % 4 === 0 ? "rgba(50,35,20,0.11)" : "rgba(255,255,255,0.08)";
        contexto.lineWidth = faixa % 4 === 0 ? 1.2 : 0.6;
        contexto.stroke();
    }

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(2, 2);
    textura.encoding = THREE.sRGBEncoding;
    textura.needsUpdate = true;
    return textura;
}
