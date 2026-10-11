import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

type PanelId = "outline" | "inspector" | "problems";

type PanelLayoutState = {
  collapsed: Record<PanelId, boolean>;
  toggle: (id: PanelId) => void;
  setCollapsed: (id: PanelId, v: boolean) => void;
  isCollapsed: (id: PanelId) => boolean;
};

export type PersistedPanelLayoutState = {
  collapsed: Record<PanelId, boolean>;
};

const DEFAULTS: Record<PanelId, boolean> = {
  outline: false,
  inspector: false,
  problems: false,
};

export const usePanelLayoutStore = create<PanelLayoutState>()(
  persist<PanelLayoutState, [], [], PersistedPanelLayoutState>(
    (set, get) => ({
      collapsed: { ...DEFAULTS },

      toggle: (id) =>
        set((s) => ({
          collapsed: { ...s.collapsed, [id]: !s.collapsed[id] },
        })),

      setCollapsed: (id, v) =>
        set((s) => ({
          collapsed: { ...s.collapsed, [id]: v },
        })),

      isCollapsed: (id) => get().collapsed[id],
    }),
    {
      name: "domain-panel-layout",
      storage: idbStorage as PersistStorage<PersistedPanelLayoutState>,
      partialize: (state): PersistedPanelLayoutState => ({
        collapsed: state.collapsed,
      }),
      version: 1,
    },
  ),
);
