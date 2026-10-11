import { create } from "zustand";

export type RqlEditorRequest = {
  /** Текущее значение. */
  value: string;
  /** Заголовок модалки. */
  title?: string;
  /** Подсказка под полем. */
  help?: string;
  /** Колбэк при подтверждении. */
  onApply: (value: string) => void;
};

type RqlEditorState = {
  request: RqlEditorRequest | null;
  open: (req: RqlEditorRequest) => void;
  close: () => void;
};

export const useRqlEditorStore = create<RqlEditorState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
