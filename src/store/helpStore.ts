import { create } from "zustand";

type HelpState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useHelpStore = create<HelpState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
