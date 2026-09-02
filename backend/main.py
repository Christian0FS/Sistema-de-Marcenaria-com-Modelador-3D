from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from app.routes import auth, clientes, projetos, insumos

app = FastAPI(title="Marcenaria CAD/CAM API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clientes.router, prefix="/clientes", tags=["clientes"])
app.include_router(projetos.router, prefix="/projetos", tags=["projetos"])
app.include_router(insumos.router, prefix="/insumos", tags=["insumos"])

@app.get("/health")
def health():
    return {"status": "ok"}


# Rotas a incluir nas próximas fases:
# from app.routes import insumos, kanban, orcamento, contratos
# app.include_router(insumos.router, prefix="/insumos")