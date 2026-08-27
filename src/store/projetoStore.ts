import { create } from "zustand";

interface ProjetoStore {
  projetoAtivoId: string | null;
  setProjetoAtivo: (id: string) => void;
}

export const useProjetoStore = create<ProjetoStore>((set) => ({
  projetoAtivoId: null,
  setProjetoAtivo: (id) => set({ projetoAtivoId: id }),
}));
