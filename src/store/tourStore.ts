import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

type TourState = {
  /** Тур активен. */
  active: boolean;
  /** Текущий шаг (индекс). */
  stepIndex: number;
  /** Тур уже был пройден (не показывать автоматически). */
  completed: boolean;
  hydrated: boolean;

  start: (stepIndex?: number) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  markCompleted: () => void;
  reset: () => void;
  setHydrated: () => void;
};

export type PersistedTourState = {
  completed: boolean;
};

export const useTourStore = create<TourState>()(
  persist<TourState, [], [], PersistedTourState>(
    (set) => ({
      active: false,
      stepIndex: 0,
      completed: false,
      hydrated: false,

      start: (stepIndex = 0) =>
        set({ active: true, stepIndex, completed: false }),

      next: () => set((s) => ({ stepIndex: s.stepIndex + 1 })),

      prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

      stop: () => set({ active: false, stepIndex: 0, completed: true }),

      markCompleted: () =>
        set({ active: false, stepIndex: 0, completed: true }),

      reset: () => set({ active: false, stepIndex: 0, completed: false }),

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "domain-tour",
      storage: idbStorage as PersistStorage<PersistedTourState>,
      partialize: (state): PersistedTourState => ({
        completed: state.completed,
      }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        // вызывается после гидратации (успешной или неуспешной)
        state?.setHydrated();
      },
    },
  ),
);
