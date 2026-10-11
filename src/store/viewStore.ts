import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

export type ViewMode = "editor" | "graph";

type ViewState = {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
};

export type PersistedViewState = { viewMode: ViewMode };

export const useViewStore = create<ViewState>()(
  persist<ViewState, [], [], PersistedViewState>(
    (set) => ({
      viewMode: "editor",
      setViewMode: (viewMode) => set({ viewMode }),
    }),
    {
      name: "domain-view-mode",
      storage: idbStorage as PersistStorage<PersistedViewState>,
      partialize: (state): PersistedViewState => ({
        viewMode: state.viewMode,
      }),
      version: 1,
    },
  ),
);
