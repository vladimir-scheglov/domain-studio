import { create } from "zustand";

export type CursorPath = (string | number)[];

export type SelectionState = {
  cursorPath: CursorPath;
  cursorLine: number;
  cursorColumn: number;

  /** Активная сущность на графе (id сущности). */
  activeEntityId: string | null;
  /** Активная связь на графе (id связи). */
  activeLinkageId: string | null;

  setCursorPath: (path: CursorPath) => void;
  setCursor: (line: number, column: number) => void;
  setActiveEntity: (id: string | null) => void;
  setActiveLinkage: (id: string | null) => void;
  reset: () => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  cursorPath: [],
  cursorLine: 1,
  cursorColumn: 1,
  activeEntityId: null,
  activeLinkageId: null,

  setCursorPath: (cursorPath) => set({ cursorPath }),
  setCursor: (cursorLine, cursorColumn) => set({ cursorLine, cursorColumn }),

  setActiveEntity: (activeEntityId) =>
    set({ activeEntityId, activeLinkageId: null }),
  setActiveLinkage: (activeLinkageId) =>
    set({ activeLinkageId, activeEntityId: null }),

  reset: () =>
    set({
      cursorPath: [],
      cursorLine: 1,
      cursorColumn: 1,
      activeEntityId: null,
      activeLinkageId: null,
    }),
}));
