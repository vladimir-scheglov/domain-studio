import { create } from "zustand";

export type DiagnosticSeverity = "error" | "warning" | "info";

export type Diagnostic = {
  severity: DiagnosticSeverity;
  message: string;
  path: (string | number)[];
  /** 1-based позиция начала в тексте (для маркеров Monaco) */
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  code?: string;
};

export type ValidationState = {
  diagnostics: Diagnostic[];
  /** Включена ли строгая Zod-валидация. */
  zodEnabled: boolean;

  setDiagnostics: (d: Diagnostic[]) => void;
  setZodEnabled: (v: boolean) => void;
  clear: () => void;
};

export const useValidationStore = create<ValidationState>((set) => ({
  diagnostics: [],
  zodEnabled: true,

  setDiagnostics: (diagnostics) => set({ diagnostics }),
  setZodEnabled: (zodEnabled) => set({ zodEnabled }),
  clear: () => set({ diagnostics: [] }),
}));
