import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

type WizardTourState = {
  active: boolean;
  wizardId: string | null;
  stepIndex: number;
  seenWizardIds: string[];

  start: (wizardId: string) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  markSeen: (wizardId: string) => void;
  seen: (wizardId: string) => boolean;
  resetAll: () => void;
};

export type PersistedWizardTourState = {
  seenWizardIds: string[];
};

export const useWizardTourStore = create<WizardTourState>()(
  persist<WizardTourState, [], [], PersistedWizardTourState>(
    (set, get) => ({
      active: false,
      wizardId: null,
      stepIndex: 0,
      seenWizardIds: [],

      start: (wizardId) => set({ active: true, wizardId, stepIndex: 0 }),

      next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),

      prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

      stop: () => set({ active: false, wizardId: null, stepIndex: 0 }),

      markSeen: (wizardId) =>
        set((s) => ({
          seenWizardIds: Array.from(new Set([...s.seenWizardIds, wizardId])),
        })),

      seen: (wizardId) => get().seenWizardIds.includes(wizardId),

      resetAll: () => set({ seenWizardIds: [] }),
    }),
    {
      name: "domain-wizard-tours",
      storage: idbStorage as PersistStorage<PersistedWizardTourState>,
      partialize: (state): PersistedWizardTourState => ({
        seenWizardIds: state.seenWizardIds,
      }),
      version: 1,
    },
  ),
);
