import { create } from "zustand";
import type * as monaco from "monaco-editor";

type EditorState = {
  editor: monaco.editor.IStandaloneCodeEditor | null;

  /** Колбэк, вызываемый перед reveal — позволяет переключить вкладку. */
  onBeforeReveal: (() => void) | null;

  setEditor: (e: monaco.editor.IStandaloneCodeEditor | null) => void;
  setOnBeforeReveal: (cb: (() => void) | null) => void;
  revealPosition: (line: number, column: number) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  onBeforeReveal: null,

  setEditor: (editor) => set({ editor }),
  setOnBeforeReveal: (cb) => set({ onBeforeReveal: cb }),

  revealPosition: (line, column) => {
    // 1) сначала переключаем вкладку
    get().onBeforeReveal?.();

    // 2) даём React время перерисоваться, потом фокусируем редактор
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const editor = get().editor;
        if (!editor) return;
        const position = { lineNumber: line, column };
        editor.revealPositionInCenter(position);
        editor.setPosition(position);
        editor.focus();
      });
    });
  },
}));
