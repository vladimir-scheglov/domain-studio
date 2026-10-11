import { create } from "zustand";

type PresetDialogState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const usePresetDialogStore = create<PresetDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
