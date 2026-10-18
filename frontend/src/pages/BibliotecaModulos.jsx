import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { api } from '../lib/api';
import { useModuloStore } from '../store/moduloStore';
import { CATEGORIAS as CATEGORIAS_BASE } from '../lib/categoria';

const CATEGORIAS = [{ valor: '', label: 'Todas' }, ...CATEGORIAS_BASE];

export default function BibliotecaModulos() {
  const [modelos, setModelos] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const history = useHistory();
  const projetoId = useModuloStore((state) => state.projetoId);
  const { carregarModulo } = useModuloStore();

  useEffect(() => {
    carregarModelos();
  }, [categoriaFiltro]); 

  async function carregarModelos() {
    setCarregando(true);
    try {
      const dados = await api.listarModelosBiblioteca(categoriaFiltro || undefined);
      setModelos(dados);
    } catch (erro) {
      console.error('Erro ao carregar biblioteca:', erro);
    } finally {
      setCarregando(false);
    }
  }


  async function usarModelo(id) {
   if (!projetoId) {
    alert('Abra um projeto no Kanban antes de usar um modelo.');
    return;
   }
   try {
    const modelo = await api.buscarModeloBiblioteca(id);
    const c = modelo.estrutura;
    const formatoNovo = c.dimensoes && c.estrutura; // modelos antigos só têm a estrutura
    carregarModulo({
      nome: modelo.nome,
      dimensoes: formatoNovo ? c.dimensoes : undefined,
      estrutura: formatoNovo ? c.estrutura : c,
      aparencia: formatoNovo ? c.aparencia : undefined,
    });
    history.push(`/editor/${projetoId}`, { deBiblioteca: true });
   }  catch (erro) {
     alert('Erro ao carregar modelo: ' + erro.message);
   }
  }

  async function excluirModelo(id, evento) {
    evento.stopPropagation();
    if (!window.confirm('Excluir este modelo da biblioteca?')) return;
    try {
      await api.excluirModeloBiblioteca(id);
      setModelos((atuais) => atuais.filter((m) => m.id !== id));
    } catch (erro) {
      alert('Erro ao excluir: ' + erro.message);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Biblioteca de Módulos</h1>
        <Link
          to={projetoId ? `/projetos/${projetoId}` : "/"}
          className="text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          Voltar ao projeto
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.valor}
            onClick={() => setCategoriaFiltro(cat.valor)}
            className={`px-3 py-1 text-sm rounded border ${
              categoriaFiltro === cat.valor
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white border-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : modelos.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum modelo salvo ainda.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modelos.map((modelo) => (
            <div
              key={modelo.id}
              onClick={() => usarModelo(modelo.id)}
              className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-amber-400 hover:shadow-sm transition"
            >
              <div className="w-full h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                {modelo.thumbnail_base64 ? (
                  <img
                    src={modelo.thumbnail_base64}
                    alt={modelo.nome}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  'Sem preview'
                )}
              </div>
              <p className="text-sm font-medium truncate">{modelo.nome}</p>
              <p className="text-xs text-gray-500">{modelo.categoria}</p>
              <button
                onClick={(e) => excluirModelo(modelo.id, e)}
                className="text-xs text-red-600 hover:underline mt-1"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}