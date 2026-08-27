import { create } from "zustand";
import type { Modulo } from "@/core/modulo/schema";
import { gerarGeometria, type MeshDescriptor } from "@/core/modulo/geometria";

interface ModuloStore {
  modulo: Modulo | null;
  meshes: MeshDescriptor[];
  setModulo: (modulo: Modulo) => void;
}

// Estado do editor 3D em memória. Toda alteração na árvore recalcula
// meshes via gerarGeometria (core/, função pura) — o canvas só re-renderiza.
export const useModuloStore = create<ModuloStore>((set) => ({
  modulo: null,
  meshes: [],
  setModulo: (modulo) => set({ modulo, meshes: gerarGeometria(modulo) }),
}));
