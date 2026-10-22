// Script de captura (ferramenta interna): abre a página de teste do cenário no
// Edge headless via puppeteer-core, espera o WebGL carregar, coleta erros do
// console e salva screenshots nas 3 vistas.
const puppeteer = require('puppeteer-core');

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const ROTAS = [
  { nome: 'frontal', camera: 'frontal' },
  { nome: 'tres-quartos', camera: 'tres_quartos' },
  { nome: 'topo', camera: 'topo' },
];

(async () => {
  const executablePath = EDGE_PATHS.find((p) => {
    try { require('fs').accessSync(p); return true; } catch { return false; }
  });

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--disable-gpu', '--use-angle=swiftshader', '--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));

  for (const rota of ROTAS) {
    const url = `http://localhost:4173/teste-cenario?camera=${rota.camera}&hdri=0`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // dá tempo para o React, o bundle 3D e o primeiro render do WebGL
    await new Promise((r) => setTimeout(r, 4000));
    const arquivo = `c:/Users/usuario/OneDrive/Desktop/Projetos/Mateus/docs/screenshots/fileira-9-modulos-${rota.nome}.png`;
    await page.screenshot({ path: arquivo });
    console.log(`salvo: ${arquivo}`);
  }

  await browser.close();
})().catch((e) => { console.error('falhou:', e.message); process.exit(1); });
