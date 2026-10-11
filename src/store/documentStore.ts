import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import type { Document } from "yaml";
import { idbStorage } from "@/persistence/db";
import { parseYaml } from "@/services/yamlService";

export type DocState = {
  yaml: string;
  fileName: string | null;
  /** Хэндл файла, если открыт/сохранён через FS Access API. */
  fileHandle: FileSystemFileHandle | null;
  parsed: unknown | null;
  doc: Document.Parsed | null;
  dirty: boolean;

  setYaml: (
    yaml: string,
    parsed: unknown | null,
    doc: Document.Parsed | null,
  ) => void;
  setParsed: (parsed: unknown | null, doc: Document.Parsed | null) => void;
  loadFromString: (yaml: string, fileName?: string | null) => void;
  setFileName: (name: string | null) => void;
  setFileHandle: (handle: FileSystemFileHandle | null) => void;
  markSaved: () => void;
  reset: () => void;
  setYamlFormatted: (yaml: string) => void;
};

export type PersistedDocState = {
  yaml: string;
  fileName: string | null;
};

export const useDocumentStore = create<DocState>()(
  persist<DocState, [], [], PersistedDocState>(
    (set) => ({
      yaml: "",
      fileName: null,
      parsed: null,
      doc: null,
      dirty: false,
      fileHandle: null,

      setYaml: (yaml, parsed, doc) => set({ yaml, parsed, doc, dirty: true }),
      setParsed: (parsed, doc) => set({ parsed, doc }),
      setFileHandle: (fileHandle) => set({ fileHandle }),

      loadFromString: (yaml, fileName = null) => {
        const { parsed, doc } = parseYaml(yaml);
        set({ yaml, fileName, parsed, doc, dirty: false });
      },

      setFileName: (fileName) => set({ fileName }),
      markSaved: () => set({ dirty: false }),
      reset: () =>
        set({
          yaml: "",
          fileName: null,
          fileHandle: null,
          parsed: null,
          doc: null,
          dirty: false,
        }),

      setYamlFormatted: (yaml) => {
        const { parsed, doc } = parseYaml(yaml);
        set({ yaml, parsed, doc, dirty: true });
      },
    }),
    {
      name: "domain-document",
      storage: idbStorage as PersistStorage<PersistedDocState>,
      partialize: (state): PersistedDocState => ({
        yaml: state.yaml,
        fileName: state.fileName,
      }),
      version: 1,

      // 🔑 Восстанавливаем parsed/doc после гидратации
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.yaml) return;
        const { parsed, doc } = parseYaml(state.yaml);
        state.setParsed(parsed, doc);
      },
    },
  ),
);

if (typeof window !== "undefined") {
  (window as any).__domainStore = useDocumentStore;
}
