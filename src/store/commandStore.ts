import { create } from "zustand";

export type Command = {
  id: string;
  title: string;
  description?: string;
  /** Группа для визуальной сортировки в палитре. */
  group?: string;
  /** Дополнительный текст для поиска (не отображается). */
  keywords?: string[];
  /** Действие команды. */
  run: () => void;
  /** Хоткей в стиле Monaco (для отображения в UI). */
  keybindingLabel?: string;
};

export type CommandState = {
  commands: Command[];
  /** Открыта ли палитра. */
  open: boolean;
  /** Текущий поисковый запрос. */
  query: string;

  register: (command: Command) => void;
  registerMany: (commands: Command[]) => void;
  unregister: (id: string) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  /** Найти команду по id. */
  find: (id: string) => Command | undefined;
  /** Запустить команду по id. */
  run: (id: string) => void;
};

export const useCommandStore = create<CommandState>((set, get) => ({
  commands: [],
  open: false,
  query: "",

  register: (command) =>
    set((state) => {
      const existing = state.commands.findIndex((c) => c.id === command.id);
      if (existing >= 0) {
        const next = [...state.commands];
        next[existing] = command;
        return { commands: next };
      }
      return { commands: [...state.commands, command] };
    }),

  registerMany: (commands) =>
    set((state) => {
      const byId = new Map(state.commands.map((c) => [c.id, c]));
      for (const c of commands) byId.set(c.id, c);
      return { commands: Array.from(byId.values()) };
    }),

  unregister: (id) =>
    set((state) => ({
      commands: state.commands.filter((c) => c.id !== id),
    })),

  setOpen: (open) => set({ open, query: open ? "" : "" }),
  toggle: () => set((state) => ({ open: !state.open, query: "" })),
  setQuery: (query) => set({ query }),

  find: (id) => get().commands.find((c) => c.id === id),

  run: (id) => {
    const cmd = get().find(id);
    if (!cmd) return;
    // закрываем палитру перед запуском
    set({ open: false, query: "" });
    // запускаем на следующем тике, чтобы модалка успела закрыться
    setTimeout(() => cmd.run(), 0);
  },
}));
