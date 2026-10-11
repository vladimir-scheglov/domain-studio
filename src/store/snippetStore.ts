import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { idbStorage } from "@/persistence/db";

export type SnippetScope =
  | "root"
  | "entities"
  | "entity"
  | "attributes"
  | "linkages"
  | "views"
  | "widgets"
  | "groups"
  | "actions"
  | "menus"
  | "dataRules"
  | "uiRules"
  | "dataTypes"
  | "sequences"
  | "counterColorPattern";

export type SnippetSource = "builtin" | "user";

export type Snippet = {
  id?: string;
  prefix: string;
  body: string;
  description?: string;
  scope?: SnippetScope;
  source?: SnippetSource;
};

export type SnippetState = {
  userSnippets: Snippet[];
  disabledBuiltins: string[];
  addSnippet: (snippet: Snippet) => void;
  updateSnippet: (id: string, patch: Partial<Snippet>) => void;
  removeSnippet: (id: string) => void;
  toggleBuiltin: (prefix: string) => void;
  clearUserSnippets: () => void;
};

export type PersistedSnippetState = {
  userSnippets: Snippet[];
  disabledBuiltins: string[];
};

export const useSnippetStore = create<SnippetState>()(
  persist<SnippetState, [], [], PersistedSnippetState>(
    (set) => ({
      userSnippets: [],
      disabledBuiltins: [],

      addSnippet: (snippet) =>
        set((state) => {
          const id =
            snippet.id ?? `user:${snippet.prefix}:${Date.now().toString(36)}`;
          const withId: Snippet = { ...snippet, id, source: "user" };
          const filtered = state.userSnippets.filter(
            (s) => s.prefix !== snippet.prefix,
          );
          return { userSnippets: [...filtered, withId] };
        }),

      updateSnippet: (id, patch) =>
        set((state) => ({
          userSnippets: state.userSnippets.map((s) =>
            s.id === id ? { ...s, ...patch, id, source: "user" } : s,
          ),
        })),

      removeSnippet: (id) =>
        set((state) => ({
          userSnippets: state.userSnippets.filter((s) => s.id !== id),
        })),

      toggleBuiltin: (prefix) =>
        set((state) => {
          const has = state.disabledBuiltins.includes(prefix);
          return {
            disabledBuiltins: has
              ? state.disabledBuiltins.filter((p) => p !== prefix)
              : [...state.disabledBuiltins, prefix],
          };
        }),

      clearUserSnippets: () => set({ userSnippets: [] }),
    }),
    {
      name: "domain-snippets",
      storage: idbStorage as PersistStorage<PersistedSnippetState>,
      partialize: (state): PersistedSnippetState => ({
        userSnippets: state.userSnippets,
        disabledBuiltins: state.disabledBuiltins,
      }),
      version: 1,
    },
  ),
);
