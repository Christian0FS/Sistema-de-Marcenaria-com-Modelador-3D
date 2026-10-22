// Barra empilhada de distribuição de custos (Fase 4.4): CSS puro, acessível.
import { formatarBRL } from "../lib/formato";

export const CORES_DISTRIBUICAO = {
  MDF: "bg-primario",            // bronze
  "Fitas de borda": "bg-[#C89565]", // bronze claro
  Ferragens: "bg-[#8A817A]",     // cinza quente
  "Margem/outros": "bg-[#2B2623]", // texto escuro
};

export default function BarraCustos({ itens, compacta = false }) {
  const validos = (itens || []).filter((i) => (Number(i.valor) || 0) > 0);
  const total = validos.reduce((s, i) => s + i.valor, 0);

  return (
    <div>
      <div
        role="img"
        aria-label={
          total > 0
            ? `Distribuição de custos: ${validos
              .map((i) => `${i.rotulo} ${i.percentual.toFixed(1)}%`)
              .join(", ")}`
            : "Sem custos calculados"
        }
        className={`flex w-full overflow-hidden rounded-full bg-app-fundo ${compacta ? "h-2.5" : "h-4"
          }`}
      >
        {total === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-app-secundario">
            Sem custos
          </div>
        ) : (
          validos.map((item) => (
            <div
              key={item.rotulo}
              className={`${CORES_DISTRIBUICAO[item.rotulo] || "bg-app-secundario"}`}
              style={{ width: `${Math.max(item.percentual, 0)}%` }}
              title={`${item.rotulo}: ${item.percentual.toFixed(1)}%`}
            />
          ))
        )}
      </div>

      {/* legenda textual: não depende só de cor */}
      {!compacta && (
        <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {validos.map((item) => (
            <li key={item.rotulo} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-app-texto">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${CORES_DISTRIBUICAO[item.rotulo] || "bg-app-secundario"}`}
                  aria-hidden="true"
                />
                {item.rotulo}
              </span>
              <span className="text-right tabular-nums text-app-secundario">
                {formatarBRL(item.valor)} · {item.percentual.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
