import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

export type WarningCategory =
  "unknown_property" | "broken_ref" | "semver" | "duplicate_id" | "other";

export type ThemeMode = "dark" | "light";

export type SettingsState = {
  /* ---------- Внешний вид ---------- */
  theme: ThemeMode;
  editorFontSize: number;

  /* ---------- Редактор ---------- */
  showMinimap: boolean;
  tabSize: number;

  /* ---------- Валидация ---------- */
  warningsEnabled: boolean;
  hiddenCategories: string[];
  zodEnabled: boolean;
  validationDebounce: number; // ms

  /* ---------- Файлы ---------- */
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // ms
  defaultFileName: string;

  /* ---------- Уведомления ---------- */
  notificationsEnabled: boolean;
  notificationDuration: number; // ms

  /* ---------- Действия ---------- */
  setTheme: (t: ThemeMode) => void;
  setEditorFontSize: (n: number) => void;
  setShowMinimap: (b: boolean) => void;
  setTabSize: (n: number) => void;
  toggleWarnings: () => void;
  toggleCategory: (cat: WarningCategory) => void;
  setZodEnabled: (b: boolean) => void;
  setValidationDebounce: (n: number) => void;
  setAutoSaveEnabled: (b: boolean) => void;
  setAutoSaveInterval: (n: number) => void;
  setDefaultFileName: (n: string) => void;
  setNotificationsEnabled: (b: boolean) => void;
  setNotificationDuration: (n: number) => void;
  resetAll: () => void;
};

export type PersistedSettingsState = Omit<
  SettingsState,
  | "setTheme"
  | "setEditorFontSize"
  | "setShowMinimap"
  | "setTabSize"
  | "toggleWarnings"
  | "toggleCategory"
  | "setZodEnabled"
  | "setValidationDebounce"
  | "setAutoSaveEnabled"
  | "setAutoSaveInterval"
  | "setDefaultFileName"
  | "setNotificationsEnabled"
  | "setNotificationDuration"
  | "resetAll"
>;

const DEFAULTS: PersistedSettingsState = {
  theme: "dark",
  editorFontSize: 13,
  showMinimap: false,
  tabSize: 2,
  warningsEnabled: true,
  hiddenCategories: [],
  zodEnabled: true,
  validationDebounce: 300,
  autoSaveEnabled: false,
  autoSaveInterval: 60_000,
  defaultFileName: "domain.yaml",
  notificationsEnabled: true,
  notificationDuration: 3000,
};

export const useSettingsStore = create<SettingsState>()(
  persist<SettingsState, [], [], PersistedSettingsState>(
    (set) => ({
      ...DEFAULTS,

      setTheme: (theme) => set({ theme }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      setShowMinimap: (showMinimap) => set({ showMinimap }),
      setTabSize: (tabSize) => set({ tabSize }),

      toggleWarnings: () =>
        set((s) => ({ warningsEnabled: !s.warningsEnabled })),

      toggleCategory: (cat) =>
        set((s) => {
          const has = s.hiddenCategories.includes(cat);
          return {
            hiddenCategories: has
              ? s.hiddenCategories.filter((c) => c !== cat)
              : [...s.hiddenCategories, cat],
          };
        }),

      setZodEnabled: (zodEnabled) => set({ zodEnabled }),
      setValidationDebounce: (validationDebounce) =>
        set({ validationDebounce }),

      setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setDefaultFileName: (defaultFileName) => set({ defaultFileName }),

      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
      setNotificationDuration: (notificationDuration) =>
        set({ notificationDuration }),

      resetAll: () => set({ ...DEFAULTS }),
    }),
    {
      name: "domain-settings",
      storage: idbStorage as PersistStorage<PersistedSettingsState>,
      partialize: (state): PersistedSettingsState => ({
        theme: state.theme,
        editorFontSize: state.editorFontSize,
        showMinimap: state.showMinimap,
        tabSize: state.tabSize,
        warningsEnabled: state.warningsEnabled,
        hiddenCategories: state.hiddenCategories,
        zodEnabled: state.zodEnabled,
        validationDebounce: state.validationDebounce,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
        defaultFileName: state.defaultFileName,
        notificationsEnabled: state.notificationsEnabled,
        notificationDuration: state.notificationDuration,
      }),
      version: 1,
    },
  ),
);

/* ------------------------------------------------------------------ */
/*                       Определение категории                          */
/* ------------------------------------------------------------------ */

export function categorizeDiagnostic(code?: string): WarningCategory {
  if (!code) return "other";

  if (code.startsWith("zod:unknown_key")) return "unknown_property";
  if (code.startsWith("check:broken_")) return "broken_ref";
  if (code.startsWith("check:semver")) return "semver";
  if (
    code.startsWith("zod:duplicate_id") ||
    code.startsWith("check:duplicate_id")
  )
    return "duplicate_id";

  return "other";
}

// отладка
if (typeof window !== "undefined") {
  (window as any).__settingsStore = useSettingsStore;
}
