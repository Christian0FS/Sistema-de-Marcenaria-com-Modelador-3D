from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, clientes, projetos, insumos, biblioteca

app = FastAPI(title="Marcenaria CAD/CAM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clientes.router, prefix="/clientes", tags=["clientes"])
app.include_router(projetos.router, prefix="/projetos", tags=["projetos"])
app.include_router(insumos.router, prefix="/insumos", tags=["insumos"])
app.include_router(biblioteca.router)

@app.get("/health")
def health():
    return {"status": "ok"}


# Rotas a incluir nas próximas fases:
# from app.routes import insumos, kanban, orcamento, contratos
# app.include_router(insumos.router, prefix="/insumos")