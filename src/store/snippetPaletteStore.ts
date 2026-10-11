import { create } from "zustand";

type SnippetPaletteState = {
  open: boolean;
  /** Путь курсора в момент открытия — куда вставлять. */
  cursorPath: (string | number)[] | null;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setCursorPath: (path: (string | number)[] | null) => void;
};

export const useSnippetPaletteStore = create<SnippetPaletteState>((set) => ({
  open: false,
  cursorPath: null,
  setOpen: (open) => set({ open }),
  toggle: () =>
    set((s) => ({
      open: !s.open,
      cursorPath: s.open ? null : s.cursorPath,
    })),
  setCursorPath: (cursorPath) => set({ cursorPath }),
}));
