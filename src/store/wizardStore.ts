import { create } from "zustand";

export type WizardPrefill = Record<string, unknown>;

type WizardState = {
  activeWizardId: string | null;
  prefill: WizardPrefill;
  open: (id: string, prefill?: WizardPrefill) => void;
  close: () => void;
};

export const useWizardStore = create<WizardState>((set) => ({
  activeWizardId: null,
  prefill: {},
  open: (id, prefill = {}) => set({ activeWizardId: id, prefill }),
  close: () => set({ activeWizardId: null, prefill: {} }),
}));
