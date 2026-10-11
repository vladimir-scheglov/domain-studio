import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";
import { BUILTIN_PRESETS, PresetCategory, type DomainPreset } from "@/domain/builtinPresets";

export type UserPreset = DomainPreset & { createdAt: number };

type PresetState = {
  userPresets: UserPreset[];

  addPreset: (preset: {
    name: string;
    description?: string;
    yaml: string;
    tags?: string[];
    category?: PresetCategory;
  }) => UserPreset;

  updatePreset: (id: string, patch: Partial<UserPreset>) => void;
  removePreset: (id: string) => void;
  clearUserPresets: () => void;

  /** Все пресеты: пользовательские + встроенные. */
  listAll: () => DomainPreset[];
  /** Найти по id (в т.ч. встроенный). */
  find: (id: string) => DomainPreset | undefined;
};

export type PersistedPresetState = {
  userPresets: UserPreset[];
};

export const usePresetStore = create<PresetState>()(
  persist<PresetState, [], [], PersistedPresetState>(
    (set, get) => ({
      userPresets: [],

      addPreset: ({ name, description, yaml, tags, category }) => {
        const id = `user.preset.${Date.now().toString(36)}`;
        const preset: UserPreset = {
          id,
          name,
          description: description ?? "",
          yaml,
          source: "user",
          category: category ?? "utility",
          tags,
          createdAt: Date.now(),
        };
        set((s) => ({ userPresets: [...s.userPresets, preset] }));
        return preset;
      },

      updatePreset: (id, patch) =>
        set((s) => ({
          userPresets: s.userPresets.map((p) =>
            p.id === id ? { ...p, ...patch, id, source: "user" } : p,
          ),
        })),

      removePreset: (id) =>
        set((s) => ({
          userPresets: s.userPresets.filter((p) => p.id !== id),
        })),

      clearUserPresets: () => set({ userPresets: [] }),

      listAll: () => {
        const user = [...get().userPresets].sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        return [...user, ...BUILTIN_PRESETS];
      },

      find: (id) =>
        get().userPresets.find((p) => p.id === id) ??
        BUILTIN_PRESETS.find((p) => p.id === id),
    }),
    {
      name: "domain-presets",
      storage: idbStorage as PersistStorage<PersistedPresetState>,
      partialize: (state): PersistedPresetState => ({
        userPresets: state.userPresets,
      }),
      version: 1,
    },
  ),
);
