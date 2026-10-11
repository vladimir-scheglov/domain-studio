import { create } from "zustand";

export type HistoryEntry = {
  /** Метка операции — что было сделано. */
  label: string;
  /** YAML до операции. */
  before: string;
  /** YAML после операции. */
  after: string;
  /** Момент времени. */
  timestamp: number;
};

type HistoryState = {
  /** Стек выполненных операций (для undo). */
  past: HistoryEntry[];
  /** Стек отменённых операций (для redo). */
  future: HistoryEntry[];

  /** Максимальный размер стека. */
  maxSize: number;

  /** Записать операцию в историю. */
  push: (entry: Omit<HistoryEntry, "timestamp">) => void;

  /** Взять последнюю операцию для undo и переместить в future. */
  popUndo: () => HistoryEntry | null;

  /** Взять последнюю операцию для redo и вернуть в past. */
  popRedo: () => HistoryEntry | null;

  /** Есть ли что отменять/повторять. */
  canUndo: () => boolean;
  canRedo: () => boolean;

  /** Полная очистка. */
  clear: () => void;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxSize: 50,

  push: (entry) =>
    set((state) => {
      const next: HistoryEntry = { ...entry, timestamp: Date.now() };
      const past = [...state.past, next];
      // обрезаем стек по maxSize
      const trimmed = past.slice(-state.maxSize);
      return {
        past: trimmed,
        // при новой операции redo-стек обнуляем
        future: [],
      };
    }),

  popUndo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    const last = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [...get().future, last],
    });
    return last;
  },

  popRedo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    const last = future[future.length - 1];
    set({
      future: future.slice(0, -1),
      past: [...get().past, last],
    });
    return last;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
