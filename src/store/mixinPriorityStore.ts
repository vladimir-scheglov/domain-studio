import { create } from "zustand";

type MixinPriorityState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useMixinPriorityStore = create<MixinPriorityState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
