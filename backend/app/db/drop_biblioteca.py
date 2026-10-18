from dotenv import load_dotenv
load_dotenv()

from app.db.connection import get_client

client = get_client()
client.execute("DROP TABLE biblioteca_modulos")
print("Tabela biblioteca_modulos removida com sucesso.")