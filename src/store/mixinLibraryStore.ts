import { create } from "zustand";

type MixinLibraryState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useMixinLibraryStore = create<MixinLibraryState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
