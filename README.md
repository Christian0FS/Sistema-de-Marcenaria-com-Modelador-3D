# Sistema Web CAD/CAM de Marcenaria Paramétrica e Gestão

Stack: React 16 + Tailwind CSS (frontend) · Python/FastAPI (backend) · SQLite via Turso (libSQL).

Estrutura:
- `frontend/` — Painel de Insumos, Painel de Projetos, editor 3D (@react-three/fiber), Kanban
- `backend/` — API REST, cálculo de corte/preço, exportadores DXF/XML, geração de contrato PDF
- `docs/` — roadmap completo em 5 fases

Veja `docs/guia-sistema-marcenaria-cadcam-v3.md` para o roadmap detalhado.

## Desenvolvimento local

Inicie o backend e o frontend em terminais separados. Limitar o watcher do Uvicorn a `app/` evita monitorar o ambiente virtual quando `venv/` está dentro de `backend/`:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --reload-dir app
```

```powershell
cd frontend
npm start
```

O editor 3D é carregado sob demanda ao abrir um módulo; login e Kanban não baixam o chunk do Three.js na carga inicial.
