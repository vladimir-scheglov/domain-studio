import { create } from "zustand";

type MixinDiffState = {
  open: boolean;
  mixinId: string | null;
  show: (mixinId: string) => void;
  setOpen: (open: boolean) => void;
};

export const useMixinDiffStore = create<MixinDiffState>((set) => ({
  open: false,
  mixinId: null,
  show: (mixinId) => set({ open: true, mixinId }),
  setOpen: (open) => set({ open, mixinId: open ? undefined : null }),
}));
